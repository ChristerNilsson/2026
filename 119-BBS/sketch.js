(() => {
  "use strict";

  const APP_ID = "bbs-board-list";
  const DEFAULT_GROUP_SIZE = 8;
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

  const getGroupSize = () => {
    const params = new URLSearchParams(location.search);
    const size = Number(params.get("n") || params.get("gruppstorlek"));
    return Number.isInteger(size) && size > 1 ? size : DEFAULT_GROUP_SIZE;
  };

  const getTournamentName = () => {
    const header = document.querySelector("#content h4.header, h4.header, h1, h2, title");
    const name = nodeText(header).replace(/\s+/g, " ");
    return name || "Bordslistor";
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

  const findColumns = (row) => {
    const headers = tableCells(row).map(nodeText).map(keyText);
    const nameIndex = headers.findIndex((header) => ["namn", "name", "spelare", "deltagare"].includes(header));
    const eloIndex = headers.findIndex((header) => /elo|rating|ranking|rankning|rank|rtg/.test(header));
    return nameIndex >= 0 && eloIndex >= 0 ? { nameIndex, eloIndex } : null;
  };

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

      const name = nodeText(cells[columns.nameIndex]);
      const elo = parseElo(nodeText(cells[columns.eloIndex]));

      if (name && elo) players.push({ name, elo });
    }

    return players;
  };

  const readParticipantsByKnownLayout = () =>
    [...document.querySelectorAll("tr")]
      .filter((row) => /postshowindtournamentresultform/i.test(row.innerHTML))
      .map((row) => {
        const cells = tableCells(row).map(nodeText);
        return {
          name: cells[3] || "",
          elo: parseElo(cells[7] || ""),
        };
      })
      .filter((player) => player.name && player.elo);

  const readParticipants = () => {
    const fromHeaders = [...document.querySelectorAll("table")].flatMap(readParticipantTable);
    const source = fromHeaders.length ? fromHeaders : readParticipantsByKnownLayout();
    const unique = new Map();

    for (const player of source) {
      const name = cleanText(player.name);
      const elo = Number(player.elo);
      if (name && elo) unique.set(`${keyText(name)}:${elo}`, { name, elo });
    }

    return [...unique.values()].sort((a, b) => b.elo - a.elo || a.name.localeCompare(b.name, "sv"));
  };

  const randomIndex = (max) => {
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
      const swapIndex = randomIndex(index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
  };

  const buildGroups = (players, size) => {
    const chunks = [];

    for (let index = 0; index < players.length; index += size) {
      chunks.push(players.slice(index, index + size));
    }

    if (chunks.length === 0) return [];
    if (chunks.length === 1) {
      return [{ name: "A", type: "Schweizer", players: shuffle(chunks[0]) }];
    }

    const bergerGroups = chunks.slice(0, -2).map((chunk, index) => ({
      name: groupName(index),
      type: "Berger",
      players: shuffle(chunk),
    }));

    return [
      ...bergerGroups,
      {
        name: groupName(bergerGroups.length),
        type: "Schweizer",
        players: shuffle(chunks.slice(-2).flat()),
      },
    ];
  };

  const pairGroup = (group, firstBoard) => {
    const rows = [];
    let board = firstBoard;
    let players = [...group.players];

    if (group.type === "Schweizer" && players.length % 2 === 1) {
      const bye = players.reduce((lowest, player) => (player.elo < lowest.elo ? player : lowest), players[0]);
      players = players.filter((player) => player !== bye);
      rows.push({ board: "", white: bye, black: { name: "Frirond", elo: "" } });
    }

    for (let index = 0; index < players.length; index += 2) {
      rows.push({ board, white: players[index], black: players[index + 1] });
      board += 1;
    }

    return { rows, nextBoard: board };
  };

  const pad = (value, width, right = false) => {
    const output = String(value ?? "");
    const spaces = " ".repeat(Math.max(0, width - output.length));
    return right ? spaces + output : output + spaces;
  };

  const formatGroupTitle = (group) => (group.type === "Schweizer" ? `Grupp ${group.name} Schweizer` : `Grupp ${group.name}`);

  const formatInstructionTitle = (group) => `Grupp ${group.name} ${group.type}`;

  const bergerInstructionPairs = (players) => {
    const pairs = [];
    let left = 0;
    let right = players.length - 1;
    let reverse = false;

    while (left <= right) {
      if (left === right) {
        pairs.push({ white: players[left], black: { name: "Frirond", elo: "" } });
      } else {
        const pair = { white: players[left], black: players[right] };
        pairs.push(reverse ? { white: pair.black, black: pair.white } : pair);
      }
      left += 1;
      right -= 1;
      reverse = !reverse;
    }

    return pairs;
  };

  const schweizerInstructionPairs = (players) => {
    let ordered = [...players].sort((a, b) => b.elo - a.elo || a.name.localeCompare(b.name, "sv"));

    if (ordered.length % 2 === 1) {
      const bye = ordered.reduce((lowest, player) => (player.elo < lowest.elo ? player : lowest), ordered[0]);
      ordered = ordered.filter((player) => player !== bye);
      ordered.push({ name: "Frirond", elo: "" });
    }

    const half = ordered.length / 2;
    return ordered.slice(0, half).map((player, index) => {
      const pair = { white: player, black: ordered[index + half] };
      return index % 2 === 0 ? pair : { white: pair.black, black: pair.white };
    });
  };

  const instructionPairs = (group) =>
    group.type === "Schweizer" ? schweizerInstructionPairs(group.players) : bergerInstructionPairs(group.players);

  const instructionPlayers = (group) => instructionPairs(group).flatMap((pair) => [pair.white, pair.black]);

  const textBoardList = (title, groups) => {
    let board = 1;
    const lines = [title, ""];

    for (const group of groups) {
      const paired = pairGroup(group, board);
      board = paired.nextBoard;

      lines.push(formatGroupTitle(group));
      lines.push(`${pad("Bord", 4, true)} ${pad("Vit", 24)} ${pad("Elo", 4, true)}  Resultat ${pad("Elo", 4, true)}  Svart`);

      for (const row of paired.rows) {
        lines.push(
          `${pad(row.board, 4, true)} ${pad(row.white.name, 24)} ${pad(row.white.elo, 4, true)}     -    ${pad(row.black.elo, 4, true)}  ${row.black.name}`,
        );
      }

      lines.push("");
    }

    lines.push("Instruktioner för att skapa grupperna i medlemssystemet.", "");

    for (const group of groups) {
      lines.push(formatInstructionTitle(group));
      instructionPlayers(group).forEach((player, index) => {
        lines.push(`${index + 1}. ${player.name}`);
      });
      lines.push("");
    }

    return lines.join("\n").trimEnd();
  };

  const appendCell = (row, value, className = "") => {
    const cell = document.createElement("td");
    cell.textContent = value ?? "";
    if (className) cell.className = className;
    row.append(cell);
  };

  const renderTables = (container, title, groups) => {
    let board = 1;
    const heading = document.createElement("h1");
    heading.textContent = title;
    container.append(heading);

    if (!groups.length) {
      const message = document.createElement("p");
      message.textContent = "Inga deltagare med namn och ranking hittades på sidan.";
      container.append(message);
      return;
    }

    for (const group of groups) {
      const paired = pairGroup(group, board);
      board = paired.nextBoard;

      const groupHeading = document.createElement("h2");
      groupHeading.textContent = formatGroupTitle(group);
      container.append(groupHeading);

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      const headerRow = document.createElement("tr");

      for (const header of ["Bord", "Vit", "Elo", "Resultat", "Elo", "Svart"]) {
        const cell = document.createElement("th");
        cell.textContent = header;
        if (["Bord", "Elo", "Resultat"].includes(header)) cell.className = "center";
        headerRow.append(cell);
      }

      thead.append(headerRow);
      table.append(thead, tbody);

      for (const pairing of paired.rows) {
        const row = document.createElement("tr");
        appendCell(row, pairing.board, "center");
        appendCell(row, pairing.white.name);
        appendCell(row, pairing.white.elo, "center");
        appendCell(row, "-", "center");
        appendCell(row, pairing.black.elo, "center");
        appendCell(row, pairing.black.name);
        tbody.append(row);
      }

      container.append(table);
    }
  };

  const renderInstructions = (container, groups) => {
    const heading = document.createElement("h1");
    heading.textContent = "Instruktioner för att skapa grupperna i medlemssystemet";
    container.append(heading);

    for (const group of groups) {
      const groupHeading = document.createElement("h2");
      groupHeading.textContent = formatInstructionTitle(group);
      container.append(groupHeading);

      const list = document.createElement("ol");
      for (const player of instructionPlayers(group)) {
        const item = document.createElement("li");
        item.textContent = player.name;
        list.append(item);
      }
      container.append(list);
    }
  };

  const render = (copyText, title, groups, count, size) => {
    document.getElementById(APP_ID)?.remove();

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
        #${APP_ID} table {
          border-collapse: collapse;
          margin: 0 0 18px;
          min-width: 720px;
        }
        #${APP_ID} ol {
          margin: 0 0 18px;
          padding-left: 28px;
        }
        #${APP_ID} li {
          padding: 2px 0;
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
      <main></main>
    `;

    renderTables(root.querySelector("main"), title, groups);
    if (groups.length) renderInstructions(root.querySelector("main"), groups);
    root.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (action === "copy") await navigator.clipboard?.writeText(copyText);
      if (action === "print") window.print();
      if (action === "rerun") run();
      if (action === "close") root.remove();
    });

    document.body.append(root);
  };

  const run = () => {
    const size = getGroupSize();
    const players = readParticipants();
    const title = getTournamentName();

    if (!players.length) {
      render(`${title}\n\nInga deltagare med namn och ranking hittades på sidan.`, title, [], 0, size);
      return;
    }

    const groups = buildGroups(players, size);
    render(textBoardList(title, groups), title, groups, players.length, size);
  };

  run();
})();
