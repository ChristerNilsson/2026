(() => {
  "use strict";

  const APP_ID = "lotta-skriv";
  const PLAYER_COUNT = 4;

  document.getElementById(APP_ID)?.remove();

  const clean = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();

  const text = (node) => clean(node?.innerText || node?.textContent);

  const key = (value) =>
    clean(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const cells = (row) => [...row.children].filter((cell) => /^(TD|TH)$/.test(cell.tagName));

  const parseSsfId = (row, value) =>
    clean(value).match(/\b\d{4,}\b/)?.[0] ||
    row.innerHTML.match(/postshowindtournamentresultform\([^,]+,\s*['"](\d+)['"]\)/i)?.[1] ||
    "";

  const parseElo = (value) => clean(value).match(/\b\d{3,4}[A-Z]?\b/i)?.[0] || "";

  const findColumns = (row) => {
    const headers = cells(row).map(text).map(key);
    const find = (patterns) => headers.findIndex((header) => patterns.some((pattern) => header.includes(pattern)));
    const name = find(["namn", "name", "spelare", "deltagare"]);
    return name < 0
      ? null
      : {
          name,
          ssfId: find(["ssf-id", "ssfid", "medlems-id", "member id"]),
          elo: find(["elo", "ranking", "rankning", "rating", "rtg"]),
        };
  };

  const unique = (players) => {
    const found = new Set();
    return players.filter((player) => {
      const id = player.ssfId || key(player.name);
      if (found.has(id)) return false;
      found.add(id);
      return true;
    });
  };

  const readPlayers = () => {
    const players = [];
    for (const table of document.querySelectorAll("table.js-sort-table")) {
      let columns = null;
      for (const row of table.querySelectorAll("tr")) {
        const rowCells = cells(row);
        const foundColumns = findColumns(row);
        if (foundColumns) {
          columns = foundColumns;
          continue;
        }
        if (!columns || rowCells.length <= columns.name) continue;
        if (!/postshowindtournamentresultform/i.test(row.innerHTML)) continue;

        const name = text(rowCells[columns.name]);
        if (!name) continue;
        players.push({
          name,
          ssfId: parseSsfId(row, columns.ssfId >= 0 ? text(rowCells[columns.ssfId]) : ""),
          elo: columns.elo >= 0 ? parseElo(text(rowCells[columns.elo])) : "",
        });
      }
    }
    return unique(players);
  };

  const randomIndex = (max) => {
    if (max <= 1) return 0;
    if (!globalThis.crypto?.getRandomValues) return Math.floor(Math.random() * max);
    const limit = 0x100000000 - (0x100000000 % max);
    const value = new Uint32Array(1);
    do crypto.getRandomValues(value);
    while (value[0] >= limit);
    return value[0] % max;
  };

  const shuffled = (players) => {
    const result = [...players];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = randomIndex(index + 1);
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  };

  const pairs = (players) => [
    { white: players[0], black: players[3] },
    { white: players[1], black: players[2] },
  ];

  const appendCell = (row, value, className = "") => {
    const cell = document.createElement("td");
    cell.textContent = value ?? "";
    cell.className = className;
    row.append(cell);
  };

  const title = text(document.querySelector("#content h4.header, h4.header, h1, h2, title")) || "Bordslista";
  const sourcePlayers = readPlayers();
  let players = shuffled(sourcePlayers);

  const render = () => {
    document.getElementById(APP_ID)?.remove();
    const root = document.createElement("div");
    root.id = APP_ID;
    root.innerHTML = `
      <style>
        #${APP_ID}{position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#fff;color:#111;font:14px/1.4 Arial,sans-serif}
        #${APP_ID} .toolbar{position:sticky;top:0;display:flex;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid #bbb;background:#eee}
        #${APP_ID} .actions{display:flex;gap:8px}
        #${APP_ID} button{padding:5px 10px;border:1px solid #777;border-radius:3px;background:#fff;cursor:pointer;font:inherit}
        #${APP_ID} main{padding:16px}
        #${APP_ID} h1{margin:0 0 16px;font-size:22px}
        #${APP_ID} table{border-collapse:collapse;min-width:620px}
        #${APP_ID} td{border:1px solid #888;padding:4px 8px;text-align:left}
        #${APP_ID} .header td{background:#f0f0f0;font-weight:bold}
        #${APP_ID} .center{text-align:center;white-space:nowrap}
        #${APP_ID} .error{color:#900}
        @media print {
          body > :not(#${APP_ID}){display:none!important}
          #${APP_ID}{position:static}
          #${APP_ID} .toolbar{display:none}
          #${APP_ID} main{padding:0}
          #${APP_ID} table{min-width:0;width:100%}
        }
      </style>
      <div class="toolbar">
        <strong>Bordslista: ${players.length} deltagare</strong>
        <div class="actions">
          <button type="button" data-action="shuffle">Lotta om</button>
          <button type="button" data-action="print">Skriv ut</button>
          <button type="button" data-action="close">Stäng</button>
        </div>
      </div>
      <main></main>
    `;
    const main = root.querySelector("main");
    const heading = document.createElement("h1");
    heading.textContent = title;
    main.append(heading);

    if (players.length !== PLAYER_COUNT) {
      const error = document.createElement("p");
      error.className = "error";
      error.textContent = `Förväntade ${PLAYER_COUNT} deltagare men hittade ${players.length}.`;
      main.append(error);
    } else {
      const table = document.createElement("table");
      const header = document.createElement("tr");
      header.className = "header";
      ["Bord", "Vit", "Elo", "Resultat", "Elo", "Svart"].forEach((value) => appendCell(header, value));
      table.append(header);
      pairs(players).forEach((pair, index) => {
        const row = document.createElement("tr");
        appendCell(row, index + 1, "center");
        appendCell(row, pair.white.name);
        appendCell(row, pair.white.elo, "center");
        appendCell(row, "-", "center");
        appendCell(row, pair.black.elo, "center");
        appendCell(row, pair.black.name);
        table.append(row);
      });
      main.append(table);
    }

    root.addEventListener("click", (event) => {
      const action = event.target?.dataset?.action;
      if (action === "shuffle") {
        players = shuffled(sourcePlayers);
        render();
      }
      if (action === "print") window.print();
      if (action === "close") root.remove();
    });
    document.body.append(root);
  };

  render();
})();
