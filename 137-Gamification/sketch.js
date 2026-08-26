const courseParameter = new URLSearchParams(window.location.search).get("bana");
const BANA = courseParameter === "romb.txt" ? "./romb.txt" : "./bana.txt";

const gameState = {
  position: null,
  target: null,
  levels: null,
  edges: null
};

function getValidMoves(node) {
  return gameState.edges?.[node] || [];
}

function parseCourse(text) {
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const expandedLine = line.replace(/\t/g, "  ");
      const content = expandedLine.trim();
      const nodes = [...content.matchAll(/\S+/g)].map((match, nodeIndex) => ({
        id: `node-${nodeIndex}`,
        label: match[0],
        center: expandedLine.indexOf(content) + match.index + match[0].length / 2
      }));
      return {
        indent: expandedLine.match(/^ */)[0].length,
        nodes,
        center: nodes.reduce((sum, node) => sum + node.center, 0) / nodes.length
      };
    });

  if (rows.length < 2 || rows.some((row) => row.nodes.length === 0)) {
    throw new Error("Ogiltig bana");
  }

  const widestRow = rows.reduce((widest, row) =>
    row.nodes.length > widest.nodes.length ? row : widest
  );
  const starts = widestRow.nodes.map((node) => node.center);
  const nodePitch = starts.length > 1 ? starts[1] - starts[0] : 1;

  return rows.map((row, levelIndex) => ({
    nodes: row.nodes.map((node, nodeIndex) => ({
      ...node,
      id: `node-${levelIndex}-${nodeIndex}`
    })),
    offset: row.nodes.length > 1 ? (row.center - widestRow.center) / nodePitch : 0
  }));
}

function buildEdgeMap(levels) {
  const edges = {};
  const nodeX = (level, index) =>
    index - (level.nodes.length - 1) / 2 + level.offset;

  levels.forEach((level) => {
    level.nodes.forEach((node) => { edges[node.id] = []; });
  });

  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex += 1) {
    const fromLevel = levels[levelIndex];
    const toLevel = levels[levelIndex + 1];

    if (fromLevel.nodes.length === 1) {
      edges[fromLevel.nodes[0].id] = toLevel.nodes.map((node) => node.id);
      continue;
    }

    if (toLevel.nodes.length === 1) {
      fromLevel.nodes.forEach((node) => {
        edges[node.id] = [toLevel.nodes[0].id];
      });
      continue;
    }

    fromLevel.nodes.forEach((node, fromIndex) => {
      const fromX = nodeX(fromLevel, fromIndex);
      edges[node.id] = toLevel.nodes.filter((_, toIndex) =>
        Math.abs(nodeX(toLevel, toIndex) - fromX) === 0.5
      ).map((target) => target.id);
    });
  }

  return edges;
}

function isMoveAllowed(from, to) {
  return getValidMoves(from).includes(to);
}

function moveTo(target) {
  if (!isMoveAllowed(gameState.position, target)) {
    return false;
  }
  gameState.position = target;
  return true;
}

function renderTree() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = "";

  const status = document.createElement("div");
  status.className = "status-bar";
  status.textContent = "Nuvarande position: " + getNode(gameState.position).label;
  app.appendChild(status);

  const tree = document.createElement("div");
  tree.className = "tree";

  const connections = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  connections.classList.add("connections");
  connections.setAttribute("aria-hidden", "true");
  tree.appendChild(connections);

  gameState.levels.forEach((level, index) => {
    const row = document.createElement("div");
    row.className = "level level-" + index;
    row.style.setProperty("--offset", level.offset);

    level.nodes.forEach((node) => {
      const box = document.createElement("button");
      box.type = "button";
      box.className = "node" + (node.id === gameState.position ? " current" : "");
      box.dataset.node = node.id;
      box.textContent = node.label;
      box.disabled = gameState.position === gameState.target;

      const isClickable = isMoveAllowed(gameState.position, node.id);
      if (isClickable) {
        box.title = "Klicka för att gå till " + node.label;
        box.setAttribute("aria-label", "Gå till " + node.label);
        box.addEventListener("click", () => {
          moveTo(node.id);
          renderTree();
        });
      } else {
        box.disabled = true;
        box.title = node.id === gameState.position
          ? "Din nuvarande position"
          : "Inte ett möjligt drag härifrån";
      }

      row.appendChild(box);
    });

    tree.appendChild(row);
  });

  app.appendChild(tree);
  drawConnections(tree, connections);

  if (gameState.position === gameState.target) {
    const message = document.createElement("p");
    message.className = "win-message";
    message.textContent = "Du har nått " + getNode(gameState.target).label + "! Grattis.";
    app.appendChild(message);
    return;
  }
}

function getNode(id) {
  return gameState.levels.flatMap((level) => level.nodes).find((node) => node.id === id);
}

function drawConnections(tree, svg) {
  const treeRect = tree.getBoundingClientRect();
  const nodes = [...tree.querySelectorAll(".node")];
  const findNode = (name) => nodes.find((node) => node.dataset.node === name);
  svg.setAttribute("viewBox", `0 0 ${treeRect.width} ${treeRect.height}`);

  Object.entries(gameState.edges).forEach(([from, targets]) => {
    const fromNode = findNode(from);
    if (!fromNode) return;

    targets.forEach((target) => {
      const toNode = findNode(target);
      if (!toNode) return;

      const fromRect = fromNode.getBoundingClientRect();
      const toRect = toNode.getBoundingClientRect();
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.classList.add("connection");
      line.setAttribute("x1", fromRect.left + fromRect.width / 2 - treeRect.left);
      line.setAttribute("y1", fromRect.bottom - treeRect.top);
      line.setAttribute("x2", toRect.left + toRect.width / 2 - treeRect.left);
      line.setAttribute("y2", toRect.top - treeRect.top);
      svg.appendChild(line);
    });
  });
}

async function loadTree() {
  try {
    const response = await fetch(BANA);
    if (!response.ok) throw new Error("Kunde inte läsa " + BANA);
    const courseText = await response.text();
    document.getElementById("course-text").value = courseText;
    updateCourse(courseText);
  } catch (error) {
    showError("Banan kunde inte läsas från " + BANA);
  }
}

function updateCourse(courseText) {
  try {
    const levels = parseCourse(courseText);
    const startLevel = levels[0];
    const targetLevel = levels[levels.length - 1];
    if (startLevel.nodes.length !== 1 || startLevel.nodes[0].label !== "START" ||
        targetLevel.nodes.length !== 1 || targetLevel.nodes[0].label !== "TARGET") {
      throw new Error("Banan måste börja med START och sluta med TARGET");
    }
    gameState.levels = levels;
    gameState.position = startLevel.nodes[0].id;
    gameState.target = targetLevel.nodes[0].id;
    gameState.edges = buildEdgeMap(levels);
    renderTree();
  } catch (error) {
    showError("Texten beskriver inte en giltig bana.");
  }
}

function showError(text) {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const message = document.createElement("p");
  message.className = "error-message";
  message.textContent = text;
  app.appendChild(message);
}

function setupCourseSelect() {
  const select = document.getElementById("course-select");
  if (!select) return;

  select.value = BANA.slice(2);
  select.addEventListener("change", () => {
    const url = new URL(window.location.href);
    if (select.value === "bana.txt") {
      url.searchParams.delete("bana");
    } else {
      url.searchParams.set("bana", select.value);
    }
    window.location.href = url;
  });
}

function setupCourseEditor() {
  const textarea = document.getElementById("course-text");
  const updateButton = document.getElementById("update-course");
  updateButton.addEventListener("click", () => updateCourse(textarea.value));
  textarea.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.setRangeText("  ", start, end, "end");
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    setupCourseSelect();
    setupCourseEditor();
    loadTree();
  });
}
