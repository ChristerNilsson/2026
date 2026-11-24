import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/engine.js', ['engine.js', 'text/javascript; charset=utf-8']],
  ['/vendor/chess.js', ['vendor/chess.js', 'text/javascript; charset=utf-8']],
  ['/vendor/brown.png', ['vendor/brown.png', 'image/png']],
  ['/vendor/stockfish-17.1-lite-single-03e3232.js', ['vendor/stockfish-17.1-lite-single-03e3232.js', 'text/javascript; charset=utf-8']],
  ['/vendor/stockfish-17.1-lite-single-03e3232.wasm', ['vendor/stockfish-17.1-lite-single-03e3232.wasm', 'application/wasm']],
]);

for (const color of ['w', 'b']) {
  for (const piece of 'KQRBNP') {
    const path = 'vendor/maestro/' + color + piece + '.svg';
    files.set('/' + path, [path, 'image/svg+xml']);
  }
}

const port = Number(process.env.PORT ?? 8080);
createServer(async (request, response) => {
  const file = files.get(request.url.split('?')[0]);
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  try {
    const [path, type] = file;
    const body = await readFile(new URL(path, import.meta.url));
    response.writeHead(200, { 'Content-Type': type }).end(body);
  } catch {
    response.writeHead(500).end();
  }
}).listen(port, '127.0.0.1', function () {
  console.log('http://127.0.0.1:' + this.address().port);
});
