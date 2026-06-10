(function () {
  "use strict";

  const APP_ID = "portrait-bookmarklet";
  const STYLE_ID = "portrait-bookmarklet-style";
  const MIN_DATA_ROWS = 2;

  if (window.__portraitBookmarkletCleanup) {
    window.__portraitBookmarkletCleanup();
  }

  const existing = document.getElementById(APP_ID);
  if (existing) {
    existing.remove();
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    document.body.classList.remove("pb-active");
  }

  const state = {
    selected: 0,
    tables: findCandidateTables(),
  };

  if (state.tables.length === 0) {
    alert("Hittade inga tabeller att visa.");
    return;
  }

  installStyle();
  const app = buildShell();
  document.body.appendChild(app);
  document.body.classList.add("pb-active");
  render();

  document.addEventListener("keydown", onKeyDown, true);
  window.__portraitBookmarkletCleanup = close;

  function findCandidateTables() {
    return Array.from(document.querySelectorAll("table"))
      .filter((table) => !table.closest("#" + APP_ID))
      .filter((table) => !table.classList.contains("tournamentbottom"))
      .map((table, index) => ({
        table,
        index,
        rows: getDataRows(table).length,
        visuals: captureTableVisuals(table),
      }))
      .filter((item) => item.rows >= MIN_DATA_ROWS)
      .map((item, visibleIndex) => ({
        node: item.table,
        label: getTableLabel(item.table, visibleIndex),
        visuals: item.visuals,
        columns: 1,
        roundIndex: 0,
      }));
  }

  function getTableLabel(table, index) {
    const caption = table.querySelector("caption");
    if (caption && caption.textContent.trim()) return caption.textContent.trim();

    let element = table.previousElementSibling;
    while (element) {
      if (/^H[1-6]$/.test(element.tagName) && element.textContent.trim()) {
        return element.textContent.trim();
      }
      element = element.previousElementSibling;
    }

    return "Tabell " + (index + 1);
  }

  function buildShell() {
    const root = document.createElement("section");
    root.id = APP_ID;
    root.innerHTML = [
      '<div class="pb-toolbar">',
      '  <div>',
      '    <strong id="pb-title"></strong>',
      '    <span id="pb-count"></span>',
      '    <span id="pb-class"></span>',
      '  </div>',
      '  <div class="pb-controls">',
      '    <button type="button" data-action="prev">Up</button>',
      '    <button type="button" data-action="next">Down</button>',
      '    <button type="button" data-action="minus">L</button>',
      '    <span id="pb-columns"></span>',
      '    <button type="button" data-action="plus">M</button>',
      '    <button type="button" data-action="close">x</button>',
      '  </div>',
      '</div>',
      '<div id="pb-table-wrap"></div>',
    ].join("");

    root.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      event.preventDefault();
      runAction(button.dataset.action);
    });

    return root;
  }

  function onKeyDown(event) {
    if (!document.getElementById(APP_ID)) {
      document.removeEventListener("keydown", onKeyDown, true);
      return;
    }

    const key = event.key;
    if (key === "ArrowUp" || key === "Up") {
      event.preventDefault();
      runAction("prev");
    } else if (key === "ArrowDown" || key === "Down") {
      event.preventDefault();
      runAction("next");
    } else if (key === "ArrowLeft" || key === "Left") {
      event.preventDefault();
      runAction("roundPrev");
    } else if (key === "ArrowRight" || key === "Right") {
      event.preventDefault();
      runAction("roundNext");
    } else if (key.toLowerCase() === "l") {
      event.preventDefault();
      runAction("minus");
    } else if (key.toLowerCase() === "m") {
      event.preventDefault();
      runAction("plus");
    } else if (key === "escape") {
      event.preventDefault();
      runAction("close");
    }
  }

  function runAction(action) {
    if (action === "prev") {
      state.selected = (state.selected + state.tables.length - 1) % state.tables.length;
    } else if (action === "next") {
      state.selected = (state.selected + 1) % state.tables.length;
    } else if (action === "plus") {
      const rowCount = getCurrentDataRows().length;
      currentTable().columns = Math.min(rowCount, currentTable().columns + 1);
    } else if (action === "minus") {
      currentTable().columns = Math.max(1, currentTable().columns - 1);
    } else if (action === "roundPrev") {
      changeRound(-1);
    } else if (action === "roundNext") {
      changeRound(1);
    } else if (action === "close") {
      close();
      return;
    }
    render();
  }

  function close() {
    const app = document.getElementById(APP_ID);
    const style = document.getElementById(STYLE_ID);
    if (app) app.remove();
    if (style) style.remove();
    document.body.classList.remove("pb-active");
    document.removeEventListener("keydown", onKeyDown, true);
    if (window.__portraitBookmarkletCleanup === close) {
      window.__portraitBookmarkletCleanup = null;
    }
  }

  function currentTable() {
    return state.tables[state.selected];
  }

  function getCurrentDataRows() {
    const item = currentTable();
    const headers = getHeaderRows(item.node);
    const dataRows = getRowsForSelectedRound(item, headers, getDataRows(item.node));
    return getDisplayModel(headers, dataRows, item.visuals).dataRows;
  }

  function changeRound(delta) {
    const item = currentTable();
    const rounds = getRoundValues(item, getHeaderRows(item.node), getDataRows(item.node));
    if (!rounds.length) return;

    item.roundIndex = (item.roundIndex + rounds.length + delta) % rounds.length;
  }

  function render() {
    const item = currentTable();
    const original = item.node;
    const sourceHeaders = getHeaderRows(original);
    const allDataRows = getDataRows(original);
    const rounds = getRoundValues(item, sourceHeaders, allDataRows);
    item.roundIndex = rounds.length ? Math.min(item.roundIndex, rounds.length - 1) : 0;
    const sourceDataRows = getRowsForSelectedRound(item, sourceHeaders, allDataRows);
    const model = getDisplayModel(sourceHeaders, sourceDataRows, item.visuals);
    const headers = model.headers;
    const dataRows = model.dataRows;
    const tableWidth = model.tableWidth || item.visuals.tableWidth;
    item.columns = Math.min(Math.max(1, item.columns), Math.max(1, dataRows.length));

    document.getElementById("pb-title").textContent = item.label;
    document.getElementById("pb-count").textContent =
      " (" + (state.selected + 1) + "/" + state.tables.length + getRoundLabel(rounds, item) +
      ", " + dataRows.length + " rader)";
    document.getElementById("pb-class").textContent = "class: " + (original.className || "-");
    document.getElementById("pb-columns").textContent = item.columns + " kol";

    const wrap = document.getElementById("pb-table-wrap");
    wrap.textContent = "";
    wrap.style.gridTemplateColumns = "repeat(" + item.columns + ", max-content)";
    const columnPlan = getColumnPlan(headers, dataRows, wrap, tableWidth);

    splitRows(dataRows, item.columns).forEach((rows) => {
      const table = cloneElement(original, item.visuals);
      table.classList.add("pb-table");
      table.textContent = "";
      table.removeAttribute("width");
      table.removeAttribute("height");
      table.style.width = "auto";
      table.style.height = "auto";
      table.style.maxWidth = Math.ceil(tableWidth) + "px";
      Array.from(original.children)
        .filter((child) => child.tagName === "COLGROUP")
        .forEach((child) => table.appendChild(cloneElement(child, item.visuals, true)));

      const sourceBody = rows[0] ? rows[0].parentElement : null;
      const tbody = cloneElement(sourceBody, item.visuals) || document.createElement("tbody");
      tbody.textContent = "";
      headers.forEach((row) => tbody.appendChild(cloneTableRow(row, item.visuals, columnPlan, true)));
      rows.forEach((row) => tbody.appendChild(cloneTableRow(row, item.visuals, columnPlan, false)));
      table.appendChild(tbody);
      wrap.appendChild(table);
    });
  }

  function getColumnPlan(headerRows, dataRows, wrap, tableWidth) {
    const headerLabels = getHeaderLabels(headerRows);
    const emptyColumns = getEmptyColumnIndexes(headerLabels, dataRows);
    const narrow = new Set(getFirstIndexesInRuns(emptyColumns));
    const hidden = new Set();
    const projectedWidth = tableWidth * currentTable().columns + Math.max(0, currentTable().columns - 1) * 12;
    const availableWidth = wrap.clientWidth || document.documentElement.clientWidth || window.innerWidth;

    getRemainingIndexesInRuns(emptyColumns).forEach((index) => hidden.add(index));
    getFlagColumnIndexes(dataRows).forEach((index) => hidden.add(index));

    if (projectedWidth > availableWidth) {
      headerLabels.forEach((label, index) => {
        if (normalizeText(label) === "KLUBB") hidden.add(index);
      });
    }

    return {
      hidden,
      narrow,
    };
  }

  function getRoundLabel(rounds, item) {
    if (!rounds.length) return "";
    return ", rond " + rounds[item.roundIndex];
  }

  function getRowsForSelectedRound(item, headerRows, dataRows) {
    const rounds = getRoundValues(item, headerRows, dataRows);
    if (!rounds.length) return dataRows;

    const roundColumn = getRoundColumnIndex(item, headerRows, dataRows);
    const selectedRound = rounds[item.roundIndex] || rounds[0];
    return dataRows.filter((row) => getCellText(row, roundColumn) === selectedRound);
  }

  function getRoundValues(item, headerRows, dataRows) {
    const roundColumn = getRoundColumnIndex(item, headerRows, dataRows);
    if (roundColumn < 0) return [];

    return Array.from(new Set(dataRows.map((row) => getCellText(row, roundColumn)).filter(Boolean)));
  }

  function getRoundColumnIndex(item, headerRows, dataRows) {
    const labels = getHeaderLabels(headerRows).map(normalizeText);
    const headerIndex = labels.findIndex((label) => label === "ROND" || label === "ROUND");
    if (headerIndex >= 0) return headerIndex;
    if (!isBoardTable(item, labels)) return -1;

    const maxColumns = dataRows.reduce((max, row) => Math.max(max, row.cells.length), 0);
    for (let index = 0; index < maxColumns; index += 1) {
      const values = dataRows.map((row) => getCellText(row, index)).filter(Boolean);
      const numericValues = values.filter((value) => /^\d+$/.test(value));
      const uniqueValues = new Set(numericValues);
      if (values.length >= 4 && numericValues.length / values.length >= 0.8 && uniqueValues.size > 1 && uniqueValues.size <= 20) {
        return index;
      }
    }

    return -1;
  }

  function isBoardTable(item, labels) {
    const text = normalizeText([item.label, item.node.className, labels.join(" ")].join(" "));
    return /\b(BORD|BOARD|LOTTNING|PAIRING|RONDER|ROND|ROUND)\b/.test(text);
  }

  function getCellText(row, index) {
    const cell = row.cells[index];
    return cell ? cell.textContent.trim() : "";
  }

  function getDisplayModel(headerRows, dataRows, visuals) {
    const groupSize = getRepeatedGroupSize(headerRows);
    if (!groupSize) return { headers: headerRows, dataRows, tableWidth: visuals.tableWidth };

    const headers = headerRows
      .map((row) => cloneRowColumns(row, visuals, 0, groupSize))
      .filter(Boolean);
    const collapsedRows = [];
    const groupCount = Math.max(1, Math.ceil(getHeaderLabels(headerRows).length / groupSize));

    dataRows.forEach((row) => {
      for (let start = 0; start < row.cells.length; start += groupSize) {
        const clone = cloneRowColumns(row, visuals, start, groupSize);
        if (clone && rowHasContent(clone)) collapsedRows.push(clone);
      }
    });

    return {
      headers,
      dataRows: collapsedRows.length ? collapsedRows : dataRows,
      tableWidth: visuals.tableWidth / groupCount,
    };
  }

  function getRepeatedGroupSize(headerRows) {
    const labels = getHeaderLabels(headerRows).map(normalizeText);
    const count = labels.length;
    if (count < 4) return 0;

    for (let size = 1; size <= Math.floor(count / 2); size += 1) {
      if (count % size !== 0) continue;

      const pattern = labels.slice(0, size);
      if (pattern.filter(Boolean).length < 2) continue;

      let repeated = true;
      for (let index = size; index < count; index += 1) {
        if (labels[index] !== pattern[index % size]) {
          repeated = false;
          break;
        }
      }

      if (repeated) return size;
    }

    return 0;
  }

  function cloneRowColumns(row, visuals, start, count) {
    const clone = cloneElement(row, visuals, false);
    if (!clone) return null;

    clone.textContent = "";
    Array.from(row.cells)
      .slice(start, start + count)
      .forEach((cell) => clone.appendChild(cloneElement(cell, visuals, true)));

    return clone.cells.length ? clone : null;
  }

  function rowHasContent(row) {
    return Array.from(row.cells).some((cell) => cell.textContent.trim() || cell.querySelector("img, svg"));
  }

  function getFlagColumnIndexes(dataRows) {
    const maxColumns = dataRows.reduce((max, row) => Math.max(max, row.cells.length), 0);
    const indexes = [];

    for (let index = 0; index < maxColumns; index += 1) {
      const cells = dataRows.map((row) => row.cells[index]).filter(Boolean);
      if (cells.length === 0) continue;

      const flagCells = cells.filter(isFlagCell).length;
      if (flagCells / cells.length >= 0.5) indexes.push(index);
    }

    return indexes;
  }

  function getFirstIndexesInRuns(indexes) {
    return indexes.filter((index, position) => position === 0 || indexes[position - 1] !== index - 1);
  }

  function getRemainingIndexesInRuns(indexes) {
    return indexes.filter((index, position) => position > 0 && indexes[position - 1] === index - 1);
  }

  function isFlagCell(cell) {
    const text = cell.textContent.trim();
    const images = Array.from(cell.querySelectorAll("img"));
    if (images.some((image) => /flag|flagg|nation|country/i.test(image.src + " " + image.alt + " " + image.title))) {
      return true;
    }

    return /^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(text);
  }

  function getHeaderLabels(headerRows) {
    const labels = [];
    headerRows.forEach((row) => {
      Array.from(row.cells).forEach((cell) => {
        const text = cell.textContent.trim();
        if (text) labels[cell.cellIndex] = text;
      });
    });
    return labels;
  }

  function getEmptyColumnIndexes(headerLabels, dataRows) {
    const maxColumns = Math.max(
      headerLabels.length,
      dataRows.reduce((max, row) => Math.max(max, row.cells.length), 0)
    );
    const indexes = [];

    for (let index = 0; index < maxColumns; index += 1) {
      const hasHeader = Boolean((headerLabels[index] || "").trim());
      const hasData = dataRows.some((row) => {
        const cell = row.cells[index];
        return cell && cell.textContent.trim();
      });

      if (!hasHeader && !hasData) indexes.push(index);
    }

    return indexes;
  }

  function cloneTableRow(row, visuals, columnPlan, isHeader) {
    const clone = cloneElement(row, visuals, true);
    if (isHeader) clone.classList.add("pb-repeated-header");
    Array.from(clone.cells).forEach((cell, index) => {
      if (cell.colSpan === 1 && columnPlan.hidden.has(index)) {
        cell.remove();
        return;
      }

      if (cell.colSpan === 1 && columnPlan.narrow.has(index)) makeNarrowCell(cell);
      if (isHeader) updateHeaderText(cell);
    });
    return clone;
  }

  function makeNarrowCell(cell) {
    cell.style.width = "5px";
    cell.style.minWidth = "5px";
    cell.style.maxWidth = "5px";
    cell.style.paddingLeft = "0";
    cell.style.paddingRight = "0";
  }

  function updateHeaderText(cell) {
    const key = normalizeText(cell.textContent);
    const replacement = getHeaderReplacement(key);
    if (!replacement) return;

    const textNode = Array.from(cell.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()
    );
    if (textNode) {
      textNode.nodeValue = replacement;
    } else {
      cell.textContent = replacement;
    }
  }

  function getHeaderReplacement(key) {
    if (key.startsWith("RANKING")) return "ELO";
    if (key === "POANG") return "P";
    return "";
  }

  function normalizeText(text) {
    return text
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function captureTableVisuals(table) {
    const properties = [
      "background-color",
      "border",
      "border-collapse",
      "border-spacing",
      "border-color",
      "border-style",
      "border-width",
      "color",
      "font",
      "font-family",
      "font-size",
      "font-style",
      "font-weight",
      "line-height",
      "margin",
      "padding",
      "text-align",
      "text-decoration",
      "vertical-align",
      "white-space",
    ];
    const visuals = new WeakMap();
    Array.from(table.querySelectorAll("caption, colgroup, col, thead, tbody, tfoot, tr, th, td"))
      .concat(table)
      .forEach((element) => {
        const computed = window.getComputedStyle(element);
        const css = properties
          .map((property) => property + ":" + computed.getPropertyValue(property))
          .join(";");
        visuals.set(element, css);
      });
    visuals.tableWidth = table.getBoundingClientRect().width;
    return visuals;
  }

  function cloneElement(element, visuals, deep) {
    if (!element) return null;

    const clone = element.cloneNode(Boolean(deep));
    applyCapturedStyle(element, clone, visuals);
    stripIds(clone);

    if (deep) {
      const sources = element.querySelectorAll("*");
      const targets = clone.querySelectorAll("*");
      sources.forEach((source, index) => applyCapturedStyle(source, targets[index], visuals));
    }

    return clone;
  }

  function applyCapturedStyle(source, target, visuals) {
    if (!source || !target) return;

    const css = visuals.get(source);
    if (css) target.setAttribute("style", css);
  }

  function stripIds(element) {
    if (element.nodeType !== 1) return;

    element.removeAttribute("id");
    element.querySelectorAll("[id]").forEach((child) => child.removeAttribute("id"));
  }

  function getHeaderRows(table) {
    const explicit = Array.from(table.tHead ? table.tHead.rows : []);
    if (explicit.length) return explicit;

    const firstRow = table.rows[0];
    if (!firstRow) return [];
    return isHeaderLikeRow(firstRow) ? [firstRow] : [];
  }

  function isHeaderLikeRow(row) {
    if (row.querySelector("th")) return true;

    const rowClass = row.className || "";
    const cells = Array.from(row.cells);
    if (/\b(head|header|rubrik|sort)\b/i.test(rowClass)) return true;
    if (cells.some((cell) => /\b(head|header|rubrik|sort)\b/i.test(cell.className || ""))) return true;

    const knownLabels = new Set([
      "BORD",
      "ELO",
      "KLUBB",
      "NAMN",
      "NR",
      "PL",
      "POANG",
      "RANKING",
      "RESULTAT",
      "ROND",
      "SPELARE",
      "SVART",
      "TB",
      "VIT",
    ]);
    const matchingLabels = cells.filter((cell) => {
      const label = normalizeText(cell.textContent).replace(/[:/].*$/, "");
      return knownLabels.has(label) || label.startsWith("RANKING");
    }).length;

    return cells.length > 1 && matchingLabels >= 2;
  }

  function getDataRows(table) {
    const headerRows = new Set(getHeaderRows(table));
    const rows = Array.from(table.rows).filter((row) => !headerRows.has(row));
    return rows.filter((row) => row.cells.length > 0 && row.textContent.trim());
  }

  function splitRows(rows, columns) {
    const base = Math.floor(rows.length / columns);
    const extra = rows.length % columns;
    const result = [];
    let start = 0;

    for (let column = 0; column < columns; column += 1) {
      const count = base + (column < extra ? 1 : 0);
      result.push(rows.slice(start, start + count));
      start += count;
    }

    return result;
  }

  function installStyle() {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body.pb-active > :not(#${APP_ID}) {
        display: none !important;
      }

      #${APP_ID} {
        box-sizing: border-box;
        min-height: 100vh;
        padding: 12px;
        color: #111;
        background: #fff;
      }

      #${APP_ID} * {
        box-sizing: border-box;
      }

      #${APP_ID} .pb-toolbar {
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: -12px -12px 12px;
        padding: 8px 12px;
        border-bottom: 1px solid #bbb;
        background: #f7f7f7;
        font: 13px/1.35 Arial, Helvetica, sans-serif;
      }

      #${APP_ID} .pb-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }

      #pb-class {
        display: block;
        margin-top: 2px;
        color: #555;
        font-size: 12px;
      }

      #${APP_ID} button {
        min-width: 32px;
        height: 28px;
        padding: 0 8px;
        border: 1px solid #888;
        border-radius: 4px;
        color: #111;
        background: #fff;
        font: inherit;
        cursor: pointer;
      }

      #pb-table-wrap {
        display: grid;
        gap: 12px;
        align-items: start;
        align-content: start;
        justify-content: center;
        overflow-x: auto;
      }

      #${APP_ID} .pb-table {
        justify-self: center;
        height: auto !important;
        max-width: 100%;
      }

      #${APP_ID} tr.pb-repeated-header,
      #${APP_ID} .pb-repeated-header th,
      #${APP_ID} .pb-repeated-header td {
        visibility: visible !important;
      }

      #${APP_ID} tr.pb-repeated-header {
        display: table-row !important;
      }

      #${APP_ID} .pb-repeated-header th,
      #${APP_ID} .pb-repeated-header td {
        display: table-cell !important;
      }

      @media (max-width: 700px) {
        #${APP_ID} {
          padding: 8px;
          font-size: 12px;
        }

        #${APP_ID} .pb-toolbar {
          margin: -8px -8px 8px;
          padding: 8px;
          align-items: flex-start;
          flex-direction: column;
        }

        #pb-table-wrap {
          gap: 8px;
        }
      }
    `;
    document.head.appendChild(style);
  }
})();
