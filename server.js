// Minimaler Dev-Server ohne Abhängigkeiten: liefert den Ordner `public/` aus.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const PORT = Number(process.argv[2] || process.env.PORT) || 4177;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let filePath = normalize(join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  if (urlPath.endsWith('/')) filePath = join(filePath, 'index.html');

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nicht gefunden');
  }
}).listen(PORT, () => {
  console.log(`gamehub läuft auf http://localhost:${PORT}`);
});
