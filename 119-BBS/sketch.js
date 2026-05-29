(() => {
  "use strict";

  const APP_ID = "bbs-board-list";
  const DEFAULT_GROUP_SIZE = 6;

  const normalize = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();

  const normalizeKey = (value) =>
    normalize(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const parseElo = (value) => {
    const match = normalize(value).match(/\b([1-2]\d{3}|3[0-1]\d{2})\b/);
    return match ? Number(match[1]) : 0;
  };

  const getGroupSize = () => {
    const params = new URLSearchParams(location.search);
    const size = Number(params.get("gruppstorlek"));
    return Number.isInteger(size) && size > 1 ? size : DEFAULT_GROUP_SIZE;
  };

  const textFromCell = (cell) => normalize(cell.innerText || cell.textContent);

  const isLikelyHeader = (cells) =>
    cells.some((cell) => ["th"].includes(cell.tagName.toLowerCase())) ||
    cells.some((cell) => /namn|name|spelare|deltagare|elo|rating|rank/.test(normalizeKey(textFromCell(cell))));

  const findColumn = (headers, patterns) =>
    headers.findIndex((header) => patterns.some((pattern) => pattern.test(normalizeKey(header))));

  const nameScore = (value) => {
    const text = normalize(value);
    if (!/[A-Za-z\u00c0-\u024f]/.test(text)) return -100;
    if (/^\d+$/.test(text)) return -100;
    if (/^(ja|nej|yes|no|ok|betald|paid)$/i.test(text)) return -50;
    return text.length + (text.includes(" ") ? 20 : 0) - (/\d/.test(text) ? 15 : 0);
  };

  const participantKey = (participant) => `${normalizeKey(participant.name)}:${participant.elo}`;

  const readRowsWithHeaders = (table) => {
    const rows = [...table.querySelectorAll("tr")];
    let headers = [];
    let nameIndex = -1;
    let eloIndex = -1;
    const participants = [];

    for (const row of rows) {
      const cells = [...row.children].filter((cell) => /^(td|th)$/i.test(cell.tagName));
      if (cells.length < 2) continue;

      if (isLikelyHeader(cells)) {
        headers = cells.map(textFromCell);
        nameIndex = findColumn(headers, [/namn/, /name/, /spelare/, /deltagare/]);
        eloIndex = findColumn(headers, [/elo/, /rating/, /rtg/]);
        if (nameIndex >= 0 && eloIndex >= 0) continue;
      }

      if (nameIndex < 0 || eloIndex < 0) continue;

      const name = textFromCell(cells[nameIndex]);
      const elo = parseElo(textFromCell(cells[eloIndex]));
      if (name && elo) participants.push({ name, elo });
    }

    return participants;
  };

  const readRowsHeuristically = (table) => {
    const participants = [];

    for (const row of table.querySelectorAll("tr")) {
      const values = [...row.children]
        .filter((cell) => /^(td|th)$/i.test(cell.tagName))
        .map(textFromCell)
        .filter(Boolean);

      if (values.length < 2 || values.some((value) => /namn|spelare|deltagare/i.test(value))) continue;

      const eloCell = values.find((value) => parseElo(value));
      const elo = parseElo(eloCell);
      if (!elo) continue;

      const name = values
        .filter((value) => value !== eloCell)
        .sort((a, b) => nameScore(b) - nameScore(a))[0];

      if (name && nameScore(name) > 0) participants.push({ name, elo });
    }

    return participants;
  };

  const extractParticipants = () => {
    const found = [];

    for (const table of document.querySelectorAll("table")) {
      const fromHeaders = readRowsWithHeaders(table);
      found.push(...fromHeaders);
      if (!fromHeaders.length) found.push(...readRowsHeuristically(table));
    }

    const unique = new Map();
    for (const participant of found) {
      const clean = {
        name: normalize(participant.name).replace(/\s+\d{4}\s*$/, ""),
        elo: participant.elo,
      };
      if (clean.name && clean.elo) unique.set(participantKey(clean), clean);
    }

    return [...unique.values()].sort((a, b) => b.elo - a.elo || a.name.localeCompare(b.name, "sv"));
  };

  const randomInt = (max) => {
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0] % max;
    }
    return Math.floor(Math.random() * max);
  };

  const shuffle = (items) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  };

  const makeGroups = (participants, groupSize) => {
    const chunks = [];
    for (let index = 0; index < participants.length; index += groupSize) {
      chunks.push(participants.slice(index, index + groupSize));
    }

    if (chunks.length <= 1) {
      return chunks.map((players) => ({ type: "Schweizer", players: shuffle(players) }));
    }

    const berger = chunks.slice(0, -2).map((players) => ({ type: "Berger", players: shuffle(players) }));
    const swissPlayers = chunks.slice(-2).flat();
    return [...berger, { type: "Schweizer", players: shuffle(swissPlayers) }];
  };

  const pairGroup = (group, firstBoard) => {
    let board = firstBoard;
    let players = [...group.players];
    const pairings = [];
    let bye = null;

    if (group.type === "Schweizer" && players.length % 2 === 1) {
      bye = players.reduce((lowest, player) => (player.elo < lowest.elo ? player : lowest), players[0]);
      players = players.filter((player) => player !== bye);
    }

    for (let index = 0; index < players.length; index += 2) {
      pairings.push({
        board,
        white: players[index],
        black: players[index + 1],
      });
      board += 1;
    }

    if (bye) {
      pairings.push({
        board,
        white: bye,
        black: { name: "Frirond", elo: "" },
      });
      board += 1;
    }

    return { pairings, nextBoard: board };
  };

  const pad = (value, width, alignRight = false) => {
    const text = String(value ?? "");
    if (text.length >= width) return text;
    const padding = " ".repeat(width - text.length);
    return alignRight ? padding + text : text + padding;
  };

  const formatList = (groups) => {
    let board = 1;
    const lines = [];

    groups.forEach((group, index) => {
      const paired = pairGroup(group, board);
      board = paired.nextBoard;

      lines.push(`Grupp ${index + 1} (${group.type})`);
      lines.push(`${pad("Bord", 4, true)} ${pad("Vit", 24)} ${pad("Elo", 4, true)}  Resultat ${pad("Elo", 4, true)}  Svart`);

      for (const pairing of paired.pairings) {
        lines.push(
          `${pad(pairing.board, 4, true)} ${pad(pairing.white.name, 24)} ${pad(pairing.white.elo, 4, true)}     -    ${pad(pairing.black.elo, 4, true)}  ${pairing.black.name}`,
        );
      }

      lines.push("");
    });

    return lines.join("\n").trimEnd();
  };

  const render = (text, count, groupSize) => {
    document.getElementById(APP_ID)?.remove();

    const root = document.createElement("div");
    root.id = APP_ID;
    root.innerHTML = `
      <style>
        #${APP_ID} {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          background: #f6f6f2;
          color: #1d1d1b;
          font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow: auto;
        }
        #${APP_ID} .bbs-toolbar {
          position: sticky;
          top: 0;
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #d8d6cc;
          background: #ffffff;
        }
        #${APP_ID} .bbs-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        #${APP_ID} button {
          border: 1px solid #8a877d;
          border-radius: 4px;
          background: #ffffff;
          color: #1d1d1b;
          cursor: pointer;
          font: inherit;
          padding: 6px 10px;
        }
        #${APP_ID} button:hover {
          background: #ecebe5;
        }
        #${APP_ID} main {
          max-width: 960px;
          margin: 0 auto;
          padding: 20px 16px 48px;
        }
        #${APP_ID} pre {
          margin: 0;
          white-space: pre;
          font: 15px/1.45 Consolas, "Courier New", monospace;
        }
        @media print {
          body > :not(#${APP_ID}) {
            display: none !important;
          }
          #${APP_ID} {
            position: static;
            background: #ffffff;
          }
          #${APP_ID} .bbs-toolbar {
            display: none;
          }
          #${APP_ID} main {
            max-width: none;
            padding: 0;
          }
        }
      </style>
      <div class="bbs-toolbar">
        <strong>Bordslistor: ${count} deltagare, gruppstorlek ${groupSize}</strong>
        <div class="bbs-actions">
          <button type="button" data-action="copy">Kopiera</button>
          <button type="button" data-action="print">Skriv ut</button>
          <button type="button" data-action="rerun">Slumpa om</button>
          <button type="button" data-action="close">Stäng</button>
        </div>
      </div>
      <main><pre></pre></main>
    `;

    root.querySelector("pre").textContent = text;
    root.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (action === "close") root.remove();
      if (action === "print") window.print();
      if (action === "rerun") run();
      if (action === "copy") await navigator.clipboard?.writeText(text);
    });

    document.body.appendChild(root);
  };

  const renderError = (message) => {
    render(message, 0, getGroupSize());
  };

  const run = () => {
    const groupSize = getGroupSize();
    const participants = extractParticipants();

    if (!participants.length) {
      renderError("Inga deltagare med namn och elo hittades på sidan.");
      return;
    }

    const groups = makeGroups(participants, groupSize);
    render(formatList(groups), participants.length, groupSize);
  };

  run();
})();
