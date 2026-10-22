import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const root = resolve('site');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

const server = createServer(async (request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (name === '/config.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }).end("window.DRE_API_URL = '';\n");
    return;
  }
  const path = resolve(join(root, name === '/' ? 'index.html' : name.slice(1)));
  if (!path.startsWith(root + '\\') && path !== root) { response.writeHead(403).end(); return; }
  try {
    const bytes = await readFile(path);
    response.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8` }).end(bytes);
  } catch { response.writeHead(404).end('Não encontrado'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Prévia local: http://127.0.0.1:${server.address().port}`));
