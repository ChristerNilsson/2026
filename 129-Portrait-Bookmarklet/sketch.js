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
    columns: 1,
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
      .filter((table) => !isLinkTable(table))
      .map((table, index) => ({ table, index, rows: getDataRows(table).length }))
      .filter((item) => item.rows >= MIN_DATA_ROWS)
      .map((item, visibleIndex) => ({
        node: item.table,
        label: getTableLabel(item.table, visibleIndex),
      }));
  }

  function isLinkTable(table) {
    const links = Array.from(table.querySelectorAll("a"));
    if (links.length < 5) return false;

    const textLength = table.textContent.replace(/\s+/g, "").length;
    const linkTextLength = links
      .map((link) => link.textContent)
      .join("")
      .replace(/\s+/g, "").length;

    return linkTextLength > 0 && linkTextLength / Math.max(1, textLength) > 0.6;
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
      '  </div>',
      '  <div class="pb-controls">',
      '    <button type="button" data-action="prev">Up</button>',
      '    <button type="button" data-action="next">Down</button>',
      '    <button type="button" data-action="minus">-</button>',
      '    <span id="pb-columns"></span>',
      '    <button type="button" data-action="plus">+</button>',
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
    } else if (key === "+" || key === "=") {
      event.preventDefault();
      runAction("plus");
    } else if (key === "-") {
      event.preventDefault();
      runAction("minus");
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
      const rowCount = getDataRows(currentTable().node).length;
      state.columns = Math.min(rowCount, state.columns + 1);
    } else if (action === "minus") {
      state.columns = Math.max(1, state.columns - 1);
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

  function render() {
    const item = currentTable();
    const original = item.node;
    const headers = getHeaderRows(original);
    const dataRows = getDataRows(original);
    state.columns = Math.min(Math.max(1, state.columns), Math.max(1, dataRows.length));

    document.getElementById("pb-title").textContent = item.label;
    document.getElementById("pb-count").textContent =
      " (" + (state.selected + 1) + "/" + state.tables.length + ", " + dataRows.length + " rader)";
    document.getElementById("pb-columns").textContent = state.columns + " kol";

    const wrap = document.getElementById("pb-table-wrap");
    wrap.textContent = "";
    wrap.style.gridTemplateColumns = "repeat(" + state.columns + ", minmax(0, 1fr))";

    splitRows(dataRows, state.columns).forEach((rows) => {
      const table = document.createElement("table");
      table.className = "pb-table";

      if (headers.length) {
        const thead = document.createElement("thead");
        headers.forEach((row) => thead.appendChild(row.cloneNode(true)));
        table.appendChild(thead);
      }

      const tbody = document.createElement("tbody");
      rows.forEach((row) => tbody.appendChild(row.cloneNode(true)));
      table.appendChild(tbody);
      wrap.appendChild(table);
    });
  }

  function getHeaderRows(table) {
    const explicit = Array.from(table.tHead ? table.tHead.rows : []);
    if (explicit.length) return explicit;

    const firstRow = table.rows[0];
    if (!firstRow) return [];
    return firstRow.querySelector("th") ? [firstRow] : [];
  }

  function getDataRows(table) {
    const headerRows = new Set(getHeaderRows(table));
    const rows = Array.from(table.rows).filter((row) => !headerRows.has(row));
    return rows.filter((row) => row.cells.length > 0 && row.textContent.trim());
  }

  function splitRows(rows, columns) {
    const base = Math.floor(rows.length / columns);
    const result = [];
    let start = 0;

    for (let column = 0; column < columns; column += 1) {
      const count = column === columns - 1 ? rows.length - start : base;
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
        font: 13px/1.35 Arial, Helvetica, sans-serif;
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
      }

      #${APP_ID} .pb-controls {
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

      #pb-table-wrap {
        display: grid;
        gap: 12px;
        align-items: start;
      }

      #${APP_ID} .pb-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: auto;
        background: #fff;
      }

      #${APP_ID} .pb-table th,
      #${APP_ID} .pb-table td {
        padding: 2px 5px;
        border: 1px solid #ccc;
        vertical-align: top;
      }

      #${APP_ID} .pb-table th {
        background: #eee;
        font-weight: 700;
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
