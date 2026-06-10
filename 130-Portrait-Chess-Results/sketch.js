(function () {
  "use strict";

  const APP_ID = "portrait-chess-results";
  const STYLE_ID = "portrait-chess-results-style";
  const STORAGE_PREFIX = "portrait-chess-results:";
  const MIN_DATA_ROWS = 2;

  if (window.__portraitChessResultsCleanup) {
    window.__portraitChessResultsCleanup();
  }

  const existing = document.getElementById(APP_ID);
  if (existing) {
    existing.remove();
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    document.body.classList.remove("pcr-active");
  }

  const tournament = getTournamentContext();
  const state = {
    selected: getInitialViewIndex(),
    views: [
      createView("standings", "Ställning", 1),
      createView("boardlist", "Bordslista", 2),
    ],
  };

  installStyle();
  const app = buildShell();
  document.body.appendChild(app);
  document.body.classList.add("pcr-active");

  document.addEventListener("keydown", onKeyDown, true);
  window.__portraitChessResultsCleanup = close;
  render();

  function getTournamentContext() {
    const url = new URL(window.location.href);
    const tnrMatch = url.pathname.match(/(tnr\d+)\.aspx/i);
    const params = url.searchParams;
    const round = params.get("rd") || findLatestRound();

    return {
      id: tnrMatch ? tnrMatch[1].toLowerCase() : "unknown",
      round,
      url,
    };
  }

  function findLatestRound() {
    const rounds = Array.from(document.querySelectorAll("a[href]"))
      .map((link) => {
        try {
          return new URL(link.href, window.location.href);
        } catch (_error) {
          return null;
        }
      })
      .filter(Boolean)
      .filter((url) => /tnr\d+\.aspx/i.test(url.pathname))
      .map((url) => Number(url.searchParams.get("rd") || 0))
      .filter((round) => Number.isFinite(round) && round > 0);

    return rounds.length ? String(Math.max.apply(null, rounds)) : "";
  }

  function getInitialViewIndex() {
    const art = new URL(window.location.href).searchParams.get("art");
    if (art === "2") return 1;
    return 0;
  }

  function createView(key, label, art) {
    return {
      key,
      label,
      art,
      url: createChessResultsUrl(art),
      columns: loadColumns(key),
      status: "idle",
      error: "",
      item: null,
    };
  }

  function createChessResultsUrl(art) {
    const url = new URL(window.location.href);
    url.searchParams.set("art", String(art));
    if (tournament.round) url.searchParams.set("rd", tournament.round);
    if (art === 1 || art === 2) url.searchParams.set("turdet", "YES");
    return url.toString();
  }

  function storageKey(viewKey) {
    return STORAGE_PREFIX + tournament.id + ":" + viewKey + ":columns";
  }

  function loadColumns(viewKey) {
    const value = Number(localStorage.getItem(storageKey(viewKey)));
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  function saveColumns(view) {
    localStorage.setItem(storageKey(view.key), String(view.columns));
  }

  function buildShell() {
    const root = document.createElement("section");
    root.id = APP_ID;
    root.innerHTML = [
      '<div class="pcr-toolbar">',
      '  <div>',
      '    <strong id="pcr-title"></strong>',
      '    <span id="pcr-count"></span>',
      '  </div>',
      '  <div class="pcr-controls">',
      '    <button type="button" data-action="prev" title="Föregående tabell">&#8593;</button>',
      '    <button type="button" data-action="next" title="Nästa tabell">&#8595;</button>',
      '    <button type="button" data-action="minus" title="Färre kolumner">&#8592;</button>',
      '    <span id="pcr-columns"></span>',
      '    <button type="button" data-action="plus" title="Fler kolumner">&#8594;</button>',
      '    <button type="button" data-action="close" title="Stäng">x</button>',
      '  </div>',
      '</div>',
      '<div id="pcr-message"></div>',
      '<div id="pcr-table-wrap"></div>',
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
      runAction("minus");
    } else if (key === "ArrowRight" || key === "Right") {
      event.preventDefault();
      runAction("plus");
    } else if (key === "Escape") {
      event.preventDefault();
      runAction("close");
    }
  }

  function runAction(action) {
    const view = currentView();

    if (action === "prev") {
      state.selected = (state.selected + state.views.length - 1) % state.views.length;
    } else if (action === "next") {
      state.selected = (state.selected + 1) % state.views.length;
    } else if (action === "plus") {
      const rowCount = getCurrentDataRows().length;
      view.columns = Math.min(Math.max(1, rowCount), view.columns + 1);
      saveColumns(view);
    } else if (action === "minus") {
      view.columns = Math.max(1, view.columns - 1);
      saveColumns(view);
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
    document.body.classList.remove("pcr-active");
    document.removeEventListener("keydown", onKeyDown, true);
    if (window.__portraitChessResultsCleanup === close) {
      window.__portraitChessResultsCleanup = null;
    }
  }

  function currentView() {
    return state.views[state.selected];
  }

  function getCurrentDataRows() {
    const view = currentView();
    if (!view.item) return [];
    return getDisplayModel(getHeaderRows(view.item.node), getDataRows(view.item.node), view.item.visuals).dataRows;
  }

  async function render() {
    const view = currentView();
    updateToolbar(view, 0);
    clearMessage();

    if (!view.item && view.status !== "loading") {
      await loadView(view);
    }

    if (view.status === "loading") {
      showMessage("Hämtar " + view.label.toLowerCase() + "...");
      return;
    }

    if (view.error) {
      showMessage(view.error);
      return;
    }

    renderTable(view);
  }

  async function loadView(view) {
    view.status = "loading";
    showMessage("Hämtar " + view.label.toLowerCase() + "...");

    try {
      const sourceDocument = isCurrentDocument(view) ? document : await fetchDocument(view.url);
      const item = findMainTable(sourceDocument, view);
      if (!item) throw new Error("Hittade ingen tabell för " + view.label.toLowerCase() + ".");
      view.item = item;
      view.status = "ready";
      view.error = "";
    } catch (error) {
      view.status = "error";
      view.error = error.message || String(error);
    }
  }

  function isCurrentDocument(view) {
    if (window.location.protocol === "file:" || /\/index\.html?$/i.test(window.location.pathname)) return true;
    const art = new URL(window.location.href).searchParams.get("art");
    return art === String(view.art);
  }

  async function fetchDocument(url) {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error("Kunde inte hämta " + url + ".");

    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  function findMainTable(sourceDocument, view) {
    const candidates = Array.from(sourceDocument.querySelectorAll("table"))
      .filter((table) => !table.closest("#" + APP_ID))
      .filter((table) => !table.classList.contains("tournamentbottom"))
      .map((table) => ({
        node: table,
        rows: getDataRows(table).length,
        score: scoreTable(table, view),
      }))
      .filter((item) => item.rows >= MIN_DATA_ROWS)
      .sort((a, b) => b.score - a.score || b.rows - a.rows);

    return candidates[0] ? createTableItem(candidates[0].node) : null;
  }

  function createTableItem(table) {
    if (table.ownerDocument === document) {
      return {
        node: table,
        visuals: captureTableVisuals(table),
      };
    }

    const mount = document.createElement("div");
    mount.setAttribute("aria-hidden", "true");
    mount.style.cssText = [
      "position:absolute",
      "left:-10000px",
      "top:0",
      "visibility:hidden",
      "pointer-events:none",
    ].join(";");

    const imported = document.importNode(table, true);
    mount.appendChild(imported);
    document.body.appendChild(mount);
    const visuals = captureTableVisuals(imported);
    mount.remove();

    return {
      node: imported,
      visuals,
    };
  }

  function scoreTable(table, view) {
    const labels = getHeaderLabels(getHeaderRows(table)).map(normalizeText);
    let score = 0;
    if (table.classList.contains("greyproptable")) score += 20;
    if (table.classList.contains("js-sort-table")) score += 20;
    if (labels.some((label) => label === "NAMN" || label === "NAME")) score += 10;
    if (view.key === "standings") {
      if (labels.some((label) => label === "PL" || label === "RANK")) score += 20;
      if (labels.some((label) => label === "POANG" || label === "PTS." || label === "PUNKTE")) score += 20;
    }
    if (view.key === "boardlist") {
      if (labels.some((label) => label === "BORD" || label === "BO." || label === "BOARD")) score += 25;
      if (labels.some((label) => label === "VIT" || label === "WHITE")) score += 15;
      if (labels.some((label) => label === "SVART" || label === "BLACK")) score += 15;
      if (labels.some((label) => label === "RESULTAT" || label === "RESULT")) score += 10;
    }
    return score;
  }

  function updateToolbar(view, rowCount) {
    document.getElementById("pcr-title").textContent = view.label;
    document.getElementById("pcr-count").textContent =
      " (" + (state.selected + 1) + "/" + state.views.length + (rowCount ? ", " + rowCount + " rader" : "") + ")";
    document.getElementById("pcr-columns").textContent = view.columns + " kol";
  }

  function showMessage(text) {
    const message = document.getElementById("pcr-message");
    const wrap = document.getElementById("pcr-table-wrap");
    message.textContent = text;
    message.hidden = false;
    wrap.textContent = "";
  }

  function clearMessage() {
    const message = document.getElementById("pcr-message");
    message.textContent = "";
    message.hidden = true;
  }

  function renderTable(view) {
    const item = view.item;
    const original = item.node;
    const sourceHeaders = getHeaderRows(original);
    const sourceDataRows = getDataRows(original);
    const model = getDisplayModel(sourceHeaders, sourceDataRows, item.visuals);
    const headers = model.headers;
    const dataRows = model.dataRows;
    const tableWidth = model.tableWidth || item.visuals.tableWidth || 0;

    view.columns = Math.min(Math.max(1, view.columns), Math.max(1, dataRows.length));
    updateToolbar(view, dataRows.length);

    const wrap = document.getElementById("pcr-table-wrap");
    wrap.textContent = "";
    wrap.style.gridTemplateColumns = "repeat(" + view.columns + ", max-content)";
    const columnPlan = getColumnPlan(headers, dataRows, wrap, tableWidth, view.columns);

    splitRows(dataRows, view.columns).forEach((rows) => {
      const table = cloneElement(original, item.visuals);
      table.classList.add("pcr-table");
      table.textContent = "";
      table.removeAttribute("width");
      table.removeAttribute("height");
      table.style.width = "auto";
      table.style.height = "auto";
      if (tableWidth) table.style.maxWidth = Math.ceil(tableWidth) + "px";

      const sourceBody = rows[0] ? rows[0].parentElement : original.tBodies[0];
      const tbody = cloneElement(sourceBody, item.visuals) || document.createElement("tbody");
      tbody.textContent = "";
      headers.forEach((row) => tbody.appendChild(cloneTableRow(row, item.visuals, columnPlan, true)));
      rows.forEach((row) => tbody.appendChild(cloneTableRow(row, item.visuals, columnPlan, false)));
      table.appendChild(tbody);
      wrap.appendChild(table);
    });
  }

  function getColumnPlan(headerRows, dataRows, wrap, tableWidth, columns) {
    const headerLabels = getHeaderLabels(headerRows);
    const emptyColumns = getEmptyColumnIndexes(headerLabels, dataRows);
    const narrow = new Set(getFirstIndexesInRuns(emptyColumns));
    const hidden = new Set();
    const projectedWidth = tableWidth * columns + Math.max(0, columns - 1) * 12;
    const availableWidth = wrap.clientWidth || document.documentElement.clientWidth || window.innerWidth;

    getRemainingIndexesInRuns(emptyColumns).forEach((index) => hidden.add(index));

    if (projectedWidth > availableWidth) {
      hideOptionalColumns(headerLabels, dataRows, hidden, projectedWidth, availableWidth, tableWidth, columns);
    }

    return { hidden, narrow };
  }

  function hideOptionalColumns(headerLabels, dataRows, hidden, projectedWidth, availableWidth, tableWidth, columns) {
    const maxColumns = Math.max(
      headerLabels.length,
      dataRows.reduce((max, row) => Math.max(max, row.cells.length), 0)
    );
    const averageColumnWidth = maxColumns ? tableWidth / maxColumns : 0;
    let adjustedWidth = projectedWidth;

    getOptionalColumnIndexes(headerLabels, dataRows).forEach((index) => {
      if (adjustedWidth <= availableWidth || hidden.has(index)) return;

      hidden.add(index);
      adjustedWidth -= averageColumnWidth * columns;
    });
  }

  function getOptionalColumnIndexes(headerLabels, dataRows) {
    const priorities = [
      ["RP", "N", "W", "WE", "W-WE", "K", "TB3", "TB2", "TB1"],
      ["KLUBB", "CLUB", "FED", "LAND", "NATION", "COUNTRY", "FIDE-ID", "FIDEID", "ID"],
      ["TITLE", "TITEL", "TIT", "KON", "SEX", "GRUPP", "GROUP", "BIRTH", "FODD"],
      ["RANKING", "RATING", "ELO", "RTG", "RTGI", "RTGF", "INT.RTG", "NAT.RTG"],
    ];
    const indexes = [];
    const used = new Set();

    priorities.forEach((labels) => {
      headerLabels.forEach((label, index) => {
        const normalized = normalizeText(label).replace(/[:/].*$/, "");
        if (!used.has(index) && labels.includes(normalized)) {
          used.add(index);
          indexes.push(index);
        }
      });
    });

    getFlagColumnIndexes(dataRows).forEach((index) => {
      if (!used.has(index)) {
        used.add(index);
        indexes.push(index);
      }
    });

    return indexes;
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

  function isFlagCell(cell) {
    const text = cell.textContent.trim();
    const images = Array.from(cell.querySelectorAll("img"));
    if (images.some((image) => /flag|flagg|nation|country/i.test(image.src + " " + image.alt + " " + image.title))) {
      return true;
    }

    return /^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(text);
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

  function getFirstIndexesInRuns(indexes) {
    return indexes.filter((index, position) => position === 0 || indexes[position - 1] !== index - 1);
  }

  function getRemainingIndexesInRuns(indexes) {
    return indexes.filter((index, position) => position > 0 && indexes[position - 1] === index - 1);
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
    if (isHeader) clone.classList.add("pcr-repeated-header");

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
        const computed = getComputedStyleSafely(element);
        if (!computed) return;
        const css = properties
          .map((property) => property + ":" + computed.getPropertyValue(property))
          .join(";");
        visuals.set(element, css);
      });
    visuals.tableWidth = table.getBoundingClientRect ? table.getBoundingClientRect().width : 0;
    return visuals;
  }

  function getComputedStyleSafely(element) {
    try {
      const view = element.ownerDocument.defaultView || window;
      return view.getComputedStyle(element);
    } catch (_error) {
      return null;
    }
  }

  function cloneElement(element, visuals, deep) {
    if (!element) return null;

    const clone = document.importNode(element, Boolean(deep));
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
      "BO.",
      "ELO",
      "KLUBB",
      "NAMN",
      "NAME",
      "NR",
      "PL",
      "POANG",
      "PTS.",
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
      const count = base + (column >= columns - extra ? 1 : 0);
      result.push(rows.slice(start, start + count));
      start += count;
    }

    return result;
  }

  function installStyle() {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body.pcr-active > :not(#${APP_ID}) {
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

      #${APP_ID} .pcr-toolbar {
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

      #${APP_ID} .pcr-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
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

      #pcr-message {
        margin: 16px 0;
        font: 14px/1.4 Arial, Helvetica, sans-serif;
      }

      #pcr-table-wrap {
        display: grid;
        gap: 12px;
        align-items: start;
        align-content: start;
        justify-content: center;
        overflow-x: auto;
      }

      #${APP_ID} .pcr-table {
        justify-self: center;
        height: auto !important;
        max-width: 100%;
      }

      #${APP_ID} tr.pcr-repeated-header,
      #${APP_ID} .pcr-repeated-header th,
      #${APP_ID} .pcr-repeated-header td {
        visibility: visible !important;
      }

      #${APP_ID} tr.pcr-repeated-header {
        display: table-row !important;
      }

      #${APP_ID} .pcr-repeated-header th,
      #${APP_ID} .pcr-repeated-header td {
        display: table-cell !important;
      }

      @media (max-width: 700px) {
        #${APP_ID} {
          padding: 8px;
          font-size: 12px;
        }

        #${APP_ID} .pcr-toolbar {
          margin: -8px -8px 8px;
          padding: 8px;
          align-items: flex-start;
          flex-direction: column;
        }

        #pcr-table-wrap {
          gap: 8px;
        }
      }
    `;
    document.head.appendChild(style);
  }
})();
