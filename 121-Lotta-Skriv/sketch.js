(async () => {
  "use strict";

  const APP_ID = "lotta-skriv";
  const GROUP_SPECS = [
    { name: "S_1", type: "Berger", size: 4, fallbackId: 18772 },
    { name: "S_2", type: "Berger", size: 4, fallbackId: 18773 },
    { name: "S_3", type: "Berger", size: 4, fallbackId: 18774 },
    { name: "S_4", type: "Berger", size: 4, fallbackId: 18775 },
    { name: "S_5", type: "Schweizer", size: 6, fallbackId: 18776 },
  ];

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

  const parseSsfId = (row) =>
    row.innerHTML.match(/postshowindtournamentresultform\([^,]+,\s*['"](\d+)['"]\)/i)?.[1] ||
    row.innerHTML.match(/[?&](?:person|member|part|id|ssf(?:id)?|ssf_id)=?(\d{4,})/i)?.[1] ||
    "";

  const parseElo = (value) => Number(clean(value).match(/\b\d{3,4}\b/)?.[0] || 0);

  const findColumns = (row) => {
    const headers = cells(row).map(text).map(key);
    const find = (patterns) => headers.findIndex((header) => patterns.some((pattern) => header.includes(pattern)));
    const name = find(["namn", "name", "spelare", "deltagare"]);
    const elo = find(["elo", "ranking", "rankning", "rating", "rtg"]);
    return name >= 0 && elo >= 0 ? { name, elo } : null;
  };

  const readPlayers = (html) => {
    const page = new DOMParser().parseFromString(html, "text/html");
    const players = [];
    const found = new Set();

    const tables = page.querySelectorAll("table.js-sort-table");
    for (const table of tables.length ? tables : page.querySelectorAll("table")) {
      let columns = null;
      for (const row of table.querySelectorAll("tr")) {
        const rowCells = cells(row);
        const foundColumns = findColumns(row);
        if (foundColumns) {
          columns = foundColumns;
          continue;
        }
        if (!columns || rowCells.length <= Math.max(columns.name, columns.elo)) continue;
        const player = {
          name: text(rowCells[columns.name]),
          elo: parseElo(text(rowCells[columns.elo])),
          ssfId: parseSsfId(row),
        };
        const id = player.ssfId || key(player.name);
        if (!player.name || !player.elo || found.has(id)) continue;
        found.add(id);
        players.push(player);
      }
    }
    return players;
  };

  const groupId = (href) =>
    clean(href).match(/ViewTournamentClassGroupServlet\?(?:[^#]*&)?id=(\d+)/i)?.[1] || "";

  const discoverGroups = () => {
    const idsByName = new Map();
    for (const node of document.querySelectorAll("a[href], [onclick]")) {
      const id = groupId(node.getAttribute("href") || node.getAttribute("onclick") || "");
      const name = text(node).match(/\bS_[1-5]\b/i)?.[0]?.toUpperCase();
      if (id && name) idsByName.set(name, id);
    }

    return GROUP_SPECS.map((group) => ({
      ...group,
      id: idsByName.get(group.name) || group.fallbackId,
    }));
  };

  const fetchGroup = async (group) => {
    const response = await fetch(`./ViewTournamentClassGroupServlet?id=${group.id}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`${group.name}: HTTP ${response.status}`);
    const html = await response.text();
    if (/id=["']username["']|>\s*Logga in\s*</i.test(html)) throw new Error(`${group.name}: sessionen är inte inloggad`);
    return { ...group, players: readPlayers(html) };
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

  const comparePlayers = (a, b) => b.elo - a.elo || Number(a.ssfId) - Number(b.ssfId) || a.name.localeCompare(b.name, "sv");

  const bergerPairs = (players) => {
    const draw = shuffled(players);
    return [
      { white: draw[0], black: draw[3] },
      { white: draw[1], black: draw[2] },
    ];
  };

  const schweizerPairs = (players) => {
    const sorted = [...players].sort(comparePlayers);
    const half = sorted.length / 2;
    return sorted.slice(0, half).map((player, index) => {
      const pair = { white: player, black: sorted[index + half] };
      return index % 2 === 0 ? { white: pair.black, black: pair.white } : pair;
    });
  };

  const drawGroups = (groups) =>
    groups.map((group) => ({
      ...group,
      pairs: group.type === "Berger" ? bergerPairs(group.players) : schweizerPairs(group.players),
    }));

  const appendCell = (row, value, className = "") => {
    const cell = document.createElement("td");
    cell.textContent = value ?? "";
    cell.className = className;
    row.append(cell);
  };

  const appendHeading = (parent, level, value) => {
    const heading = document.createElement(level);
    heading.textContent = value;
    parent.append(heading);
  };

  const appendBoardList = (parent, group) => {
    appendHeading(parent, "h2", group.name);
    const table = document.createElement("table");
    const header = document.createElement("tr");
    header.className = "header";
    ["Bord", "Vit", "Elo", "Resultat", "Elo", "Svart"].forEach((value) => appendCell(header, value));
    table.append(header);
    group.pairs.forEach((pair, index) => {
      const row = document.createElement("tr");
      appendCell(row, index + 1, "center");
      appendCell(row, pair.white.name);
      appendCell(row, pair.white.elo, "center");
      appendCell(row, "-", "center");
      appendCell(row, pair.black.elo, "center");
      appendCell(row, pair.black.name);
      table.append(row);
    });
    parent.append(table);
  };

  const sourceGroups = await Promise.all(discoverGroups().map(fetchGroup));
  let groups = drawGroups(sourceGroups);

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
        #${APP_ID} h2{margin:18px 0 5px;font-size:16px}
        #${APP_ID} table{border-collapse:collapse;margin-bottom:14px;min-width:620px;break-inside:avoid;page-break-inside:avoid}
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
        <strong>Bordslistor</strong>
        <div class="actions">
          <button type="button" data-action="shuffle">Lotta om</button>
          <button type="button" data-action="print">Skriv ut</button>
          <button type="button" data-action="close">Stäng</button>
        </div>
      </div>
      <main></main>
    `;
    const main = root.querySelector("main");
    appendHeading(main, "h1", "SRS");
    const invalid = groups.filter((group) => group.players.length !== group.size);
    if (invalid.length) {
      const error = document.createElement("p");
      error.className = "error";
      error.textContent = invalid.map((group) => `${group.name}: förväntade ${group.size}, hittade ${group.players.length}`).join(". ");
      main.append(error);
    } else {
      groups.forEach((group) => appendBoardList(main, group));
    }
    root.addEventListener("click", (event) => {
      const action = event.target?.dataset?.action;
      if (action === "shuffle") {
        groups = drawGroups(sourceGroups);
        render();
      }
      if (action === "print") window.print();
      if (action === "close") root.remove();
    });
    document.body.append(root);
  };

  render();
})().catch((error) => {
  alert(`Lotta-Skriv: ${error.message}`);
});
