(() => {
  "use strict";

  const APP_ID = "lotta-skriv-board-lists";
  const BYE = { name: "Frirond", ssfId: "", elo: "" };
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
    const match = cleanText(value).match(/\b\d{3,4}[A-Z]?\b/i);
    return match ? match[0] : "";
  };

  const parseSsfId = (row) => {
    const source = row.innerHTML;
    const match =
      source.match(/postshowindtournamentresultform\([^,]+,\s*['"](\d+)['"]\)/i) ||
      source.match(/[?&](?:person|member|id|ssf(?:id)?|ssf_id)=?(\d{4,})/i);
    return match ? match[1] : "";
  };

  const tableCells = (row) => [...row.children].filter((cell) => /^(td|th)$/i.test(cell.tagName));

  const findColumns = (row) => {
    const headers = tableCells(row).map(nodeText).map(keyText);
    const includes = (value, choices) => choices.some((choice) => value === choice || value.includes(choice));
    const nameIndex = headers.findIndex((header) => includes(header, ["namn", "name", "spelare", "deltagare"]));
    const ssfIdIndex = headers.findIndex((header) => includes(header, ["ssf-id", "ssfid", "medlems-id", "member id"]));
    const eloIndex = headers.findIndex((header) => includes(header, ["elo", "rating", "ranking", "rankning", "rtg"]));
    const groupIndex = headers.findIndex((header) => includes(header, ["grupp", "group", "klass"]));
    return nameIndex >= 0 ? { nameIndex, ssfIdIndex, eloIndex, groupIndex } : null;
  };

  const precedingLabel = (table, index) => {
    const caption = nodeText(table.querySelector("caption"));
    if (caption) return caption;

    let node = table.previousElementSibling;
    while (node) {
      const text = nodeText(node);
      if (text && text.length <= 80) return text;
      node = node.previousElementSibling;
    }

    return `Grupp ${index + 1}`;
  };

  const normalGroupName = (value, fallback) => {
    const text = cleanText(value);
    const match = text.match(/(?:grupp|group|klass)\s*[:#-]?\s*(.+)$/i);
    return cleanText(match?.[1] || text) || fallback;
  };

  const readTable = (table, tableIndex) => {
    const playersByGroup = new Map();
    let columns = null;
    const fallbackGroup = normalGroupName(precedingLabel(table, tableIndex), `Grupp ${tableIndex + 1}`);

    for (const row of table.querySelectorAll("tr")) {
      const cells = tableCells(row);
      if (!cells.length) continue;

      const foundColumns = findColumns(row);
      if (foundColumns) {
        columns = foundColumns;
        continue;
      }

      if (!columns || cells.length <= columns.nameIndex) continue;
      const name = nodeText(cells[columns.nameIndex]);
      if (!name || /^(namn|name|spelare|deltagare)$/i.test(name)) continue;

      const group =
        columns.groupIndex >= 0 && cells[columns.groupIndex]
          ? normalGroupName(nodeText(cells[columns.groupIndex]), fallbackGroup)
          : fallbackGroup;
      const player = {
        name,
        ssfId:
          columns.ssfIdIndex >= 0 && cells[columns.ssfIdIndex]
            ? cleanText(nodeText(cells[columns.ssfIdIndex])).match(/\d{4,}/)?.[0] || ""
            : parseSsfId(row),
        elo: columns.eloIndex >= 0 && cells[columns.eloIndex] ? parseElo(nodeText(cells[columns.eloIndex])) : "",
      };

      if (!playersByGroup.has(group)) playersByGroup.set(group, []);
      playersByGroup.get(group).push(player);
    }

    return [...playersByGroup].map(([name, players]) => ({ name, players }));
  };

  const uniquePlayers = (players) => {
    const seen = new Set();
    return players.filter((player) => {
      const key = `${player.ssfId || keyText(player.name)}:${player.elo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const readGroups = () => {
    const groups = [...document.querySelectorAll("table")]
      .flatMap(readTable)
      .map((group) => ({ ...group, players: uniquePlayers(group.players) }))
      .filter((group) => group.players.length);
    const merged = new Map();

    for (const group of groups) {
      if (!merged.has(group.name)) merged.set(group.name, []);
      merged.get(group.name).push(...group.players);
    }

    return [...merged].map(([name, players]) => ({ name, players: uniquePlayers(players) }));
  };

  const randomIndex = (max) => {
    if (max <= 1) return 0;
    if (!globalThis.crypto?.getRandomValues) return Math.floor(Math.random() * max);
    const range = 0x100000000;
    const limit = range - (range % max);
    const value = new Uint32Array(1);
    do {
      crypto.getRandomValues(value);
    } while (value[0] >= limit);
    return value[0] % max;
  };

  const shuffle = (players) => {
    const result = [...players];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = randomIndex(index + 1);
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  };

  const lottery = (groups) => groups.map((group) => ({ ...group, players: shuffle(group.players) }));

  const firstRoundPairs = (players) => {
    const pairs = [];
    let left = 0;
    let right = players.length - 1;
    while (left <= right) {
      pairs.push({ white: players[left], black: left === right ? BYE : players[right] });
      left += 1;
      right -= 1;
    }
    return pairs;
  };

  const boardRows = (groups) => {
    let board = 1;
    return groups.map((group) => ({
      group,
      rows: firstRoundPairs(group.players).map((pair) => {
        const row = { board, ...pair };
        if (pair.black !== BYE) board += 1;
        return row;
      }),
    }));
  };

  const tournamentName = () =>
    nodeText(document.querySelector("#content h4.header, h4.header, h1, h2, title")) || "Bordslistor";

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

  const renderLottery = (container, groups) => {
    appendHeading(container, "h2", "Lottning");
    for (const group of groups) {
      appendHeading(container, "h3", `Grupp ${group.name}`);
      const table = document.createElement("table");
      const header = document.createElement("tr");
      header.className = "header-row";
      ["Nr", "SSF-ID", "Namn", "Elo"].forEach((text) => appendCell(header, text));
      table.append(header);
      group.players.forEach((player, index) => {
        const row = document.createElement("tr");
        appendCell(row, index + 1, "center");
        appendCell(row, player.ssfId, "center");
        appendCell(row, player.name);
        appendCell(row, player.elo, "center");
        table.append(row);
      });
      container.append(table);
    }
  };

  const renderBoardLists = (container, groups) => {
    appendHeading(container, "h2", "Bordslistor");
    const table = document.createElement("table");
    const header = document.createElement("tr");
    header.className = "header-row";
    ["Grupp", "Bord", "Vit", "Elo", "Resultat", "Elo", "Svart"].forEach((text) => appendCell(header, text));
    table.append(header);
    for (const section of boardRows(groups)) {
      const body = document.createElement("tbody");
      body.className = "group-section";
      for (const pair of section.rows) {
        const row = document.createElement("tr");
        appendCell(row, section.group.name, "center");
        appendCell(row, pair.black === BYE ? "" : pair.board, "center");
        appendCell(row, pair.white.name);
        appendCell(row, pair.white.elo, "center");
        appendCell(row, "-", "center");
        appendCell(row, pair.black.elo, "center");
        appendCell(row, pair.black.name);
        body.append(row);
      }
      table.append(body);
    }
    container.append(table);
  };

  const textOutput = (title, groups) => {
    const lines = [title, "", "Lottning"];
    for (const group of groups) {
      lines.push("", `Grupp ${group.name}`, "Nr SSF-ID Namn Elo");
      group.players.forEach((player, index) => lines.push(`${index + 1} ${player.ssfId} ${player.name} ${player.elo}`));
    }
    lines.push("", "Bordslistor", "", "Grupp Bord Vit Elo Resultat Elo Svart");
    for (const section of boardRows(groups)) {
      for (const pair of section.rows) {
        lines.push(
          `${section.group.name} ${pair.black === BYE ? "" : pair.board} ${pair.white.name} ${pair.white.elo} - ${pair.black.elo} ${pair.black.name}`,
        );
      }
    }
    return lines.join("\n");
  };

  const sourceGroups = readGroups();
  const title = tournamentName();
  let groups = lottery(sourceGroups);

  const render = () => {
    document.getElementById(APP_ID)?.remove();
    const count = groups.reduce((sum, group) => sum + group.players.length, 0);
    const root = document.createElement("div");
    root.id = APP_ID;
    root.innerHTML = `
      <style>
        #${APP_ID}{position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#fff;color:#111;font:14px/1.4 Arial,sans-serif}
        #${APP_ID} .toolbar{position:sticky;top:0;display:flex;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid #bbb;background:#eee}
        #${APP_ID} .actions{display:flex;gap:8px;flex-wrap:wrap}
        #${APP_ID} button{padding:5px 10px;border:1px solid #777;border-radius:3px;background:#fff;cursor:pointer;font:inherit}
        #${APP_ID} main{padding:16px}
        #${APP_ID} h1{margin:0 0 8px;font-size:22px}
        #${APP_ID} h2{margin:24px 0 8px;font-size:18px}
        #${APP_ID} h3{margin:16px 0 4px;font-size:15px}
        #${APP_ID} table{border-collapse:collapse;margin:0 0 12px;min-width:620px}
        #${APP_ID} td{border:1px solid #888;padding:4px 8px;text-align:left}
        #${APP_ID} .header-row td{background:#f0f0f0;font-weight:bold}
        #${APP_ID} .center{text-align:center;white-space:nowrap}
        #${APP_ID} .group-section{break-inside:avoid;page-break-inside:avoid}
        @media print {
          body > :not(#${APP_ID}){display:none!important}
          #${APP_ID}{position:static}
          #${APP_ID} .toolbar{display:none}
          #${APP_ID} main{padding:0}
          #${APP_ID} table{min-width:0;width:100%}
          #${APP_ID} .board-page{break-before:page;page-break-before:always}
        }
      </style>
      <div class="toolbar">
        <strong>${count} deltagare i ${groups.length} grupper</strong>
        <div class="actions">
          <button type="button" data-action="shuffle">Lotta om</button>
          <button type="button" data-action="copy">Kopiera</button>
          <button type="button" data-action="print">Skriv ut</button>
          <button type="button" data-action="close">Stäng</button>
        </div>
      </div>
      <main></main>
    `;
    const main = root.querySelector("main");
    appendHeading(main, "h1", title);
    if (!groups.length) {
      const message = document.createElement("p");
      message.textContent = "Inga deltagargrupper hittades. Öppna turneringssidan med grupperna synliga och kör bokmärket igen.";
      main.append(message);
    } else {
      if (groups.length !== 5) {
        const warning = document.createElement("p");
        warning.textContent = `Observera: ${groups.length} grupper hittades, men specifikationen anger fem.`;
        main.append(warning);
      }
      renderLottery(main, groups);
      const boardPage = document.createElement("section");
      boardPage.className = "board-page";
      renderBoardLists(boardPage, groups);
      main.append(boardPage);
    }
    root.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (action === "shuffle") {
        groups = lottery(sourceGroups);
        render();
      }
      if (action === "copy") await navigator.clipboard?.writeText(textOutput(title, groups));
      if (action === "print") window.print();
      if (action === "close") {
        root.cleanup();
        root.remove();
      }
    });
    root.cleanup = () => {};
    document.body.append(root);
  };

  render();
})();
