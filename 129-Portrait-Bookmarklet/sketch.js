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
    wrap.style.gridTemplateColumns = "repeat(" + state.columns + ", max-content)";

    splitRows(dataRows, state.columns).forEach((rows) => {
      const table = cloneElement(original, item.visuals);
      table.classList.add("pb-table");
      table.textContent = "";
      table.removeAttribute("width");
      table.removeAttribute("height");
      table.style.width = "auto";
      table.style.height = "auto";
      table.style.maxWidth = Math.ceil(item.visuals.tableWidth) + "px";
      Array.from(original.children)
        .filter((child) => child.tagName === "COLGROUP")
        .forEach((child) => table.appendChild(cloneElement(child, item.visuals, true)));

      if (headers.length) {
        const thead = cloneElement(original.tHead, item.visuals) || document.createElement("thead");
        thead.textContent = "";
        headers.forEach((row) => thead.appendChild(cloneElement(row, item.visuals, true)));
        table.appendChild(thead);
      }

      const sourceBody = rows[0] ? rows[0].parentElement : null;
      const tbody = cloneElement(sourceBody, item.visuals) || document.createElement("tbody");
      tbody.textContent = "";
      rows.forEach((row) => tbody.appendChild(cloneElement(row, item.visuals, true)));
      table.appendChild(tbody);
      wrap.appendChild(table);
    });
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
