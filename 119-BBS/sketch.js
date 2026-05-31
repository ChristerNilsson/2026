(() => {
  "use strict";

  const APP_ID = "bbs-board-list";
  const GROUP_SIZES = [4, 6, 8, 10, 12];
  const DEFAULT_GROUP_SIZE = 6;
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const BYE = { name: "Frirond", elo: "", ssfId: "" };
  const previousRoot = document.getElementById(APP_ID);
  previousRoot?.cleanup?.();
  previousRoot?.remove();

  const cleanText = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();

  const nodeText = (node) => cleanText(node?.innerText || node?.textContent);

  const keyText = (value) =>
    cleanText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const parseElo = (value) => {
    const match = cleanText(value).match(/\b\d{3,4}\b/);
    return match ? Number(match[0]) : 0;
  };

  const parseSsfId = (value) => {
    const match =
      String(value || "").match(/postshowindtournamentresultform\([^,]+,\s*['"](\d+)['"]\)/i) ||
      String(value || "").match(/[?&](?:person|member|id|ssf(?:id)?|ssf_id)=?(\d{4,})/i);
    return match ? match[1] : "";
  };

  const enabledLabel = (enabled) => (enabled ? "YES" : "NO");

  const getTournamentName = () => {
    const header = document.querySelector("#content h4.header, h4.header, h1, h2, title");
    return nodeText(header) || "Bordslistor";
  };

  const groupName = (index) => {
    let result = "";
    let value = index;

    do {
      result = LETTERS[value % LETTERS.length] + result;
      value = Math.floor(value / LETTERS.length) - 1;
    } while (value >= 0);

    return result;
  };

  const tableCells = (row) => [...row.children].filter((cell) => /^(td|th)$/i.test(cell.tagName));

  const hasLetters = (value) => /[A-Za-zÅÄÖåäö]/.test(cleanText(value));

  const textFromParticipantLink = (row) => {
    const candidates = [...row.querySelectorAll("a, button, [onclick]")]
      .filter((node) => /postshowindtournamentresultform/i.test(node.getAttribute("onclick") || node.getAttribute("href") || ""))
      .map(nodeText);

    return candidates.find((value) => hasLetters(value)) || "";
  };

  const findColumns = (row) => {
    const headers = tableCells(row).map(nodeText).map(keyText);
    const nameIndex = headers.findIndex((header) => ["namn", "name", "spelare", "deltagare"].includes(header));
    const eloIndex = headers.findIndex((header) => /elo|rating|ranking|rankning|rank|rtg/.test(header));
    const paidIndex = headers.findIndex((header) => header === "betalt");
    const checkedIndex = headers.findIndex((header) => header === "avprickad");
    return nameIndex >= 0 && eloIndex >= 0 ? { nameIndex, eloIndex, paidIndex, checkedIndex } : null;
  };

  const isYes = (value) => ["ja", "yes", "x"].includes(keyText(value));

  const readParticipantTable = (table) => {
    const players = [];
    let columns = null;

    for (const row of table.querySelectorAll("tr")) {
      const cells = tableCells(row);
      if (cells.length < 2) continue;

      const foundColumns = findColumns(row);
      if (foundColumns) {
        columns = foundColumns;
        continue;
      }

      if (!columns || cells.length <= Math.max(columns.nameIndex, columns.eloIndex)) continue;

      const name = nodeText(cells[columns.nameIndex]) || textFromParticipantLink(row);
      const elo = parseElo(nodeText(cells[columns.eloIndex]));
      const ssfId = parseSsfId(row.innerHTML);
      const paid = columns.paidIndex >= 0 && isYes(nodeText(cells[columns.paidIndex]));
      const checked = columns.checkedIndex >= 0 && isYes(nodeText(cells[columns.checkedIndex]));
      if (name && elo) players.push({ name, elo, ssfId, paid, checked });
    }

    return players;
  };

  const readParticipantsByKnownLayout = () =>
    [...document.querySelectorAll("tr")]
      .filter((row) => /postshowindtournamentresultform/i.test(row.innerHTML))
      .map((row) => {
        const cells = tableCells(row).map(nodeText);
        const eloCells = cells.map(parseElo).filter(Boolean);
        return {
          name: cells[3] || textFromParticipantLink(row) || "",
          elo: parseElo(cells[7] || "") || eloCells[eloCells.length - 1] || 0,
          ssfId: parseSsfId(row.innerHTML),
          paid: false,
          checked: false,
        };
      })
      .filter((player) => player.name && player.elo);

  const matchesFilter = (player, state) => (!state.checkedOnly || player.checked) && (!state.paidOnly || player.paid);

  const readParticipants = () => {
    const fromHeaders = [...document.querySelectorAll("table")].flatMap(readParticipantTable);
    const source = fromHeaders.length ? fromHeaders : readParticipantsByKnownLayout();
    const unique = new Map();

    for (const player of source) {
      const name = cleanText(player.name);
      const elo = Number(player.elo);
      const ssfId = cleanText(player.ssfId);
      if (name && elo) unique.set(`${ssfId || keyText(name)}:${elo}`, { name, elo, ssfId, paid: player.paid, checked: player.checked });
    }

    return [...unique.values()].sort(compareByEloThenSsfId);
  };

  const compareByEloThenSsfId = (a, b) => {
    const ssfA = Number(a.ssfId) || Number.MAX_SAFE_INTEGER;
    const ssfB = Number(b.ssfId) || Number.MAX_SAFE_INTEGER;
    return b.elo - a.elo || ssfA - ssfB || a.name.localeCompare(b.name, "sv");
  };

  const buildGroups = (players, size) => {
    const chunks = [];

    for (let index = 0; index < players.length; index += size) {
      chunks.push(players.slice(index, index + size));
    }

    if (!chunks.length) return [];
    if (chunks.length === 1) {
      return [{ name: "A", type: "Schweizer", players: chunks[0] }];
    }

    const bergerGroups = chunks.slice(0, -2).map((chunk, index) => ({
      name: groupName(index),
      type: "Berger",
      players: chunk,
    }));

    return [
      ...bergerGroups,
      {
        name: groupName(bergerGroups.length),
        type: "Schweizer",
        players: chunks.slice(-2).flat(),
      },
    ];
  };

  const isByePair = (pair) => pair.white.name === "Frirond" || pair.black.name === "Frirond";

  const switchOddBoards = (pairs) =>
    pairs.map((pair, index) => (index % 2 === 0 && !isByePair(pair) ? { white: pair.black, black: pair.white } : pair));

  const bergerPairs = (players) => {
    const pairs = [];
    let left = 0;
    let right = players.length - 1;

    while (left <= right) {
      if (left === right) {
        pairs.push({ white: players[left], black: BYE });
      } else {
        pairs.push({ white: players[left], black: players[right] });
      }
      left += 1;
      right -= 1;
    }

    return pairs;
  };

  const schweizerPairs = (players) => {
    const sorted = [...players].sort(compareByEloThenSsfId);
    const byePlayer = sorted.length % 2 === 1 ? sorted.pop() : null;

    const half = sorted.length / 2;
    const pairs = sorted.slice(0, half).map((player, index) => ({
      white: player,
      black: sorted[index + half],
    }));

    if (byePlayer) pairs.push({ white: byePlayer, black: BYE });
    return switchOddBoards(pairs);
  };

  const groupPairs = (group) => (group.type === "Schweizer" ? schweizerPairs(group.players) : bergerPairs(group.players));

  const boardRows = (groups) => {
    let board = 1;

    return groups.map((group) => {
      const rows = groupPairs(group).map((pair) => {
        const row = { board, ...pair };
        board += isByePair(pair) ? 0 : 1;
        return row;
      });

      return { group, rows };
    });
  };

  const pad = (value, width, right = false) => {
    const output = String(value ?? "");
    const spaces = " ".repeat(Math.max(0, width - output.length));
    return right ? spaces + output : output + spaces;
  };

  const groupSizes = (groups) => {
    const sizes = groups.map((group) => group.players.length);
    const total = sizes.reduce((sum, size) => sum + size, 0);
    return `${sizes.join(" + ")} = ${total}`;
  };

  const textOutput = (title, groups, state) => {
    const lines = [
      title,
      `Betalt: ${enabledLabel(state.paidOnly)}`,
      `Avprickad: ${enabledLabel(state.checkedOnly)}`,
      `Gruppstorlek: ${state.size}`,
      `Storlekar: ${groupSizes(groups)}`,
      "",
      "Grupp Nr SSF-ID Namn Elo",
    ];

    for (const group of groups) {
      group.players.forEach((player, index) => {
        lines.push(`${group.name} ${index + 1} ${player.ssfId} ${player.name} ${player.elo}`);
      });
    }

    lines.push("", title, "", `Grupp ${pad("Bord", 4, true)} ${pad("Vit", 24)} ${pad("Elo", 4, true)}  Resultat ${pad("Elo", 4, true)}  Svart`);

    for (const section of boardRows(groups)) {
      for (const row of section.rows) {
        const board = row.black.name === "Frirond" ? "" : row.board;
        lines.push(
          `${pad(section.group.name, 5, true)} ${pad(board, 4, true)} ${pad(row.white.name, 24)} ${pad(row.white.elo, 4, true)}     -    ${pad(row.black.elo, 4, true)}  ${row.black.name}`,
        );
      }

    }

    return lines.join("\n").trimEnd();
  };

  const appendCell = (row, value, className = "") => {
    const cell = document.createElement("td");
    cell.textContent = value ?? "";
    if (className) cell.className = className;
    row.append(cell);
  };

  const appendHeading = (container, level, value) => {
    const heading = document.createElement(level);
    heading.textContent = value;
    container.append(heading);
  };

  const renderGroups = (container, groups) => {
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    const headerRow = document.createElement("tr");

    for (const header of ["Grupp", "Nr", "SSF-ID", "Namn", "Elo"]) {
      const cell = document.createElement("th");
      cell.textContent = header;
      if (header !== "Namn") cell.className = "center";
      headerRow.append(cell);
    }

    thead.append(headerRow);
    table.append(thead, tbody);

    for (const group of groups) {
      group.players.forEach((player, index) => {
        const row = document.createElement("tr");
        appendCell(row, group.name, "center");
        appendCell(row, index + 1, "center");
        appendCell(row, player.ssfId, "center");
        appendCell(row, player.name);
        appendCell(row, player.elo, "center");
        tbody.append(row);
      });
    }

    container.append(table);
  };

  const renderBoardLists = (container, groups) => {
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    for (const header of ["Grupp", "Bord", "Vit", "Elo", "Resultat", "Elo", "Svart"]) {
      const cell = document.createElement("th");
      cell.textContent = header;
      if (["Grupp", "Bord", "Elo", "Resultat"].includes(header)) cell.className = "center";
      headerRow.append(cell);
    }

    thead.append(headerRow);
    table.append(thead);

    for (const section of boardRows(groups)) {
      const tbody = document.createElement("tbody");
      tbody.className = "group-section";
      for (const pairing of section.rows) {
        const row = document.createElement("tr");
        appendCell(row, section.group.name, "center");
        appendCell(row, pairing.black.name === "Frirond" ? "" : pairing.board, "center");
        appendCell(row, pairing.white.name);
        appendCell(row, pairing.white.elo, "center");
        appendCell(row, "-", "center");
        appendCell(row, pairing.black.elo, "center");
        appendCell(row, pairing.black.name);
        tbody.append(row);
      }

      table.append(tbody);
    }

    container.append(table);
  };

  const appendPageBreak = (container) => {
    const breakElement = document.createElement("div");
    breakElement.className = "page-break";
    container.append(breakElement);
  };

  const render = (title, groups, count, state) => {
    document.getElementById(APP_ID)?.remove();

    const copyText = groups.length ? textOutput(title, groups, state) : `${title}\n\nInga deltagare med namn och ranking hittades på sidan.`;
    const root = document.createElement("div");
    root.id = APP_ID;
    root.innerHTML = `
      <style>
        #${APP_ID} {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          overflow: auto;
          background: white;
          color: #111;
          font: 14px/1.4 Arial, sans-serif;
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
          background: white;
          cursor: pointer;
          font: inherit;
        }
        #${APP_ID} main {
          padding: 16px;
        }
        #${APP_ID} h1 {
          margin: 0 0 18px;
          font-size: 22px;
        }
        #${APP_ID} h2 {
          margin: 22px 0 8px;
          font-size: 18px;
        }
        #${APP_ID} .group-section {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        #${APP_ID} table {
          border-collapse: collapse;
          margin: 0 0 18px;
          min-width: 720px;
        }
        #${APP_ID} th,
        #${APP_ID} td {
          border: 1px solid #888;
          padding: 4px 8px;
          text-align: left;
        }
        #${APP_ID} th {
          background: #f0f0f0;
        }
        #${APP_ID} .center {
          text-align: center;
          white-space: nowrap;
        }
        #${APP_ID} .page-break {
          break-before: page;
          page-break-before: always;
          height: 24px;
          border-top: 1px dashed #bbb;
          margin: 24px 0 0;
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
          #${APP_ID} table {
            min-width: 0;
            width: 100%;
          }
          #${APP_ID} .page-break {
            height: 0;
            border: 0;
            margin: 0;
          }
        }
      </style>
      <div class="toolbar">
        <strong>Bordslistor: ${count} deltagare, n=${state.size}</strong>
        <div class="actions">
          <button type="button" data-action="copy">Kopiera</button>
          <button type="button" data-action="print">Skriv ut</button>
          <button type="button" data-action="close">Stäng</button>
        </div>
      </div>
      <main></main>
    `;

    const main = root.querySelector("main");
    appendHeading(main, "h1", title);
    const info = document.createElement("p");
    info.textContent = `Betalt: ${enabledLabel(state.paidOnly)}. Avprickad: ${enabledLabel(state.checkedOnly)}. Gruppstorlek: ${state.size}. Storlekar: ${groupSizes(groups)}. Tangenter: +, -, A och B.`;
    main.append(info);

    if (groups.length) {
      renderGroups(main, groups);
      appendPageBreak(main);
      appendHeading(main, "h1", title);
      renderBoardLists(main, groups);
    } else {
      const message = document.createElement("p");
      message.textContent = "Inga deltagare med namn och ranking hittades på sidan.";
      main.append(message);
    }

    root.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (action === "copy") await navigator.clipboard?.writeText(copyText);
      if (action === "print") window.print();
      if (action === "close") {
        root.cleanup();
        root.remove();
      }
    });

    document.body.append(root);
  };

  const state = {
    size: DEFAULT_GROUP_SIZE,
    paidOnly: false,
    checkedOnly: false,
  };

  const title = getTournamentName();
  const allPlayers = readParticipants();

  const run = () => {
    const players = allPlayers.filter((player) => matchesFilter(player, state));
    render(title, buildGroups(players, state.size), players.length, state);
    document.getElementById(APP_ID).cleanup = () => document.removeEventListener("keydown", onKeyDown);
  };

  const onKeyDown = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName)) return;

    const key = event.key.toLowerCase();
    const sizeIndex = GROUP_SIZES.indexOf(state.size);
    if (key === "+" && sizeIndex < GROUP_SIZES.length - 1) state.size = GROUP_SIZES[sizeIndex + 1];
    else if (key === "-" && sizeIndex > 0) state.size = GROUP_SIZES[sizeIndex - 1];
    else if (key === "a") state.checkedOnly = !state.checkedOnly;
    else if (key === "b") state.paidOnly = !state.paidOnly;
    else return;

    event.preventDefault();
    run();
  };

  document.addEventListener("keydown", onKeyDown);
  run();
})();
