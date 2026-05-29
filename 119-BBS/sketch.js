(() => {
  "use strict";

  const APP_ID = "bbs-board-list";
  const DEFAULT_GROUP_SIZE = 6;
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const text = (node) =>
    String(node?.innerText || node?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

  const key = (value) =>
    text({ textContent: value })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const parseElo = (value) => {
    const match = text({ textContent: value }).match(/\b\d{3,4}\b/);
    return match ? Number(match[0]) : 0;
  };

  const groupSize = () => {
    const value = Number(new URLSearchParams(location.search).get("gruppstorlek"));
    return Number.isInteger(value) && value > 1 ? value : DEFAULT_GROUP_SIZE;
  };

  const groupName = (index) => {
    let name = "";
    let value = index;
    do {
      name = LETTERS[value % LETTERS.length] + name;
      value = Math.floor(value / LETTERS.length) - 1;
    } while (value >= 0);
    return name;
  };

  const findHeaderIndexes = (row) => {
    const cells = [...row.children].filter((cell) => /^(td|th)$/i.test(cell.tagName));
    const headers = cells.map(text);
    const nameIndex = headers.findIndex((header) => /^(namn|name|spelare|deltagare)$/i.test(header));
    const eloIndex = headers.findIndex((header) => /elo|rating|ranking|rankning|rank|rtg/i.test(header));
    return nameIndex >= 0 && eloIndex >= 0 ? { nameIndex, eloIndex } : null;
  };

  const tableParticipants = (table) => {
    const rows = [...table.querySelectorAll("tr")];
    let indexes = null;
    const players = [];

    for (const row of rows) {
      const cells = [...row.children].filter((cell) => /^(td|th)$/i.test(cell.tagName));
      if (cells.length < 2) continue;

      const headerIndexes = findHeaderIndexes(row);
      if (headerIndexes) {
        indexes = headerIndexes;
        continue;
      }

      if (!indexes || cells.length <= Math.max(indexes.nameIndex, indexes.eloIndex)) continue;

      const name = text(cells[indexes.nameIndex]);
      const elo = parseElo(text(cells[indexes.eloIndex]));
      if (!name || !elo) continue;
      if (/^(namn|name|spelare|deltagare)$/i.test(name)) continue;

      players.push({ name, elo });
    }

    return players;
  };

  const fallbackParticipants = () => {
    const rows = [...document.querySelectorAll("tr")].filter((row) =>
      /postshowindtournamentresultform/i.test(row.getAttribute("onclick") || row.innerHTML),
    );

    return rows
      .map((row) => {
        const cells = [...row.children].map(text);
        return {
          name: cells[3] || "",
          elo: parseElo(cells[7] || ""),
        };
      })
      .filter((player) => player.name && player.elo);
  };

  const participants = () => {
    const found = document.querySelectorAll("table").length
      ? [...document.querySelectorAll("table")].flatMap(tableParticipants)
      : [];
    const source = found.length ? found : fallbackParticipants();
    const unique = new Map();

    for (const player of source) {
      const clean = { name: text({ textContent: player.name }), elo: Number(player.elo) };
      unique.set(`${key(clean.name)}:${clean.elo}`, clean);
    }

    return [...unique.values()].sort((a, b) => b.elo - a.elo || a.name.localeCompare(b.name, "sv"));
  };

  const randomInt = (max) => {
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] % max;
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

  const makeGroups = (players, size) => {
    const chunks = [];
    for (let index = 0; index < players.length; index += size) {
      chunks.push(players.slice(index, index + size));
    }

    if (chunks.length === 0) return [];
    if (chunks.length === 1) {
      return [{ name: "A", type: "Schweizer", players: shuffle(chunks[0]) }];
    }

    const berger = chunks.slice(0, -2).map((chunk, index) => ({
      name: groupName(index),
      type: "Berger",
      players: shuffle(chunk),
    }));

    return [
      ...berger,
      {
        name: groupName(berger.length),
        type: "Schweizer",
        players: shuffle(chunks.slice(-2).flat()),
      },
    ];
  };

  const pairings = (group, firstBoard) => {
    let board = firstBoard;
    let players = [...group.players];
    const result = [];

    if (group.type === "Schweizer" && players.length % 2 === 1) {
      const bye = players.reduce((lowest, player) => (player.elo < lowest.elo ? player : lowest), players[0]);
      players = players.filter((player) => player !== bye);
      result.push({ board: null, white: bye, black: { name: "Frirond", elo: "" } });
    }

    for (let index = 0; index < players.length; index += 2) {
      result.push({ board, white: players[index], black: players[index + 1] });
      board += 1;
    }

    return { rows: result, nextBoard: board };
  };

  const pad = (value, width, right = false) => {
    const output = String(value ?? "");
    const padding = " ".repeat(Math.max(0, width - output.length));
    return right ? padding + output : output + padding;
  };

  const boardList = (groups) => {
    let board = 1;
    const lines = [];

    for (const group of groups) {
      const paired = pairings(group, board);
      board = paired.nextBoard;

      lines.push(`Grupp ${group.name} (${group.type})`);
      lines.push(`${pad("Bord", 4, true)} ${pad("Vit", 24)} ${pad("Elo", 4, true)}  Resultat ${pad("Elo", 4, true)}  Svart`);

      for (const row of paired.rows) {
        const boardText = row.board === null ? "" : row.board;
        lines.push(
          `${pad(boardText, 4, true)} ${pad(row.white.name, 24)} ${pad(row.white.elo, 4, true)}     -    ${pad(row.black.elo, 4, true)}  ${row.black.name}`,
        );
      }

      lines.push("");
    }

    return lines.join("\n").trimEnd();
  };

  const render = (content, count, size) => {
    document.getElementById(APP_ID)?.remove();

    const root = document.createElement("div");
    root.id = APP_ID;
    root.innerHTML = `
      <style>
        #${APP_ID} {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          background: #fff;
          color: #111;
          font: 14px/1.4 Arial, sans-serif;
          overflow: auto;
        }
        #${APP_ID} .toolbar {
          position: sticky;
          top: 0;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          border-bottom: 1px solid #bbb;
          background: #eee;
        }
        #${APP_ID} .actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        #${APP_ID} button {
          padding: 5px 10px;
          border: 1px solid #777;
          border-radius: 3px;
          background: #fff;
          cursor: pointer;
          font: inherit;
        }
        #${APP_ID} main {
          padding: 16px;
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
          }
          #${APP_ID} .toolbar {
            display: none;
          }
          #${APP_ID} main {
            padding: 0;
          }
        }
      </style>
      <div class="toolbar">
        <strong>Bordslistor: ${count} deltagare, gruppstorlek ${size}</strong>
        <div class="actions">
          <button type="button" data-action="copy">Kopiera</button>
          <button type="button" data-action="print">Skriv ut</button>
          <button type="button" data-action="rerun">Slumpa om</button>
          <button type="button" data-action="close">Stäng</button>
        </div>
      </div>
      <main><pre></pre></main>
    `;

    root.querySelector("pre").textContent = content;
    root.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (action === "close") root.remove();
      if (action === "print") window.print();
      if (action === "rerun") run();
      if (action === "copy") await navigator.clipboard?.writeText(content);
    });

    document.body.append(root);
  };

  const run = () => {
    const size = groupSize();
    const players = participants();

    if (!players.length) {
      render("Inga deltagare med namn och ranking hittades på sidan.", 0, size);
      return;
    }

    render(boardList(makeGroups(players, size)), players.length, size);
  };

  run();
})();
