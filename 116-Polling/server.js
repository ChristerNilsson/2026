const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const port = Number(process.env.PORT || 8080);
const root = __dirname;

const types = {
  1: tournament => `https://chess-results.com/tnr${tournament}.aspx?lan=6&art=4&rd=-1`,
  2: tournament => `https://s1.chess-results.com/tnr${tournament}.aspx?lan=6&art=2&rd=-1`,
  3: tournament => `https://member.schack.se/ShowTournamentServlet?id=${tournament}`,
  4: tournament => `https://member.schack.se/ShowTournamentServlet?id=${tournament}`
};

function readRequired(searchParams, name) {
  const value = searchParams.get(name);

  if (!value) {
    throw Object.assign(new Error(`Saknar URL-parameter: ${name}`), { status: 400 });
  }

  return value;
}

function getSelected(searchParams) {
  const type = readRequired(searchParams, "type");
  const tournament = readRequired(searchParams, "tournament");
  const heightText = readRequired(searchParams, "height");
  const buildUrl = types[type];

  if (!buildUrl) {
    throw Object.assign(new Error(`Okand type: ${type}`), { status: 400 });
  }

  if (!/^\d+$/.test(tournament)) {
    throw Object.assign(new Error("tournament maste vara ett heltal"), { status: 400 });
  }

  if (!/^\d+$/.test(heightText)) {
    throw Object.assign(new Error("height maste vara ett heltal"), { status: 400 });
  }

  return {
    type,
    tournament: Number(tournament),
    height: Number(heightText),
    url: buildUrl(tournament)
  };
}

function send(res, status, headers, body) {
  res.writeHead(status, {
    "access-control-allow-origin": "*",
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }, JSON.stringify(data));
}

async function serveIndex(res) {
  const file = await fs.readFile(path.join(root, "index.html"));
  send(res, 200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  }, file);
}

async function fetchRemote(selected) {
  const response = await fetch(selected.url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Fetch failed with HTTP ${response.status}`);
  }

  return response.text();
}

async function serveSnapshot(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const selected = getSelected(requestUrl.searchParams);
  const content = await fetchRemote(selected);
  const hash = crypto.createHash("sha256").update(content).digest("hex");

  sendJson(res, 200, {
    ...selected,
    hash,
    fetchedAt: new Date().toLocaleTimeString("sv-SE")
  });
}

async function servePage(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const selected = getSelected(requestUrl.searchParams);
  const content = await fetchRemote(selected);
  const baseHref = selected.url.replace(/[^/]*$/, "");
  const page = /<head\b[^>]*>/i.test(content)
    ? content.replace(/<head\b[^>]*>/i, match => `${match}<base href="${baseHref}">`)
    : `<base href="${baseHref}">${content}`;

  send(res, 200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  }, page);
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "OPTIONS") {
      send(res, 204, {
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "content-type"
      }, "");
      return;
    }

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
      await serveIndex(res);
      return;
    }

    if (requestUrl.pathname === "/snapshot") {
      await serveSnapshot(req, res);
      return;
    }

    if (requestUrl.pathname === "/page") {
      await servePage(req, res);
      return;
    }

    send(res, 404, { "content-type": "text/plain; charset=utf-8" }, "Not found");
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
