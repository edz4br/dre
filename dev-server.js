import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
const root = resolve('site');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
createServer(async (request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const path = resolve(join(root, name === '/' ? 'index.html' : name.slice(1)));
  if (!path.startsWith(root + '\\') && path !== root) { response.writeHead(403).end(); return; }
  try { const bytes = await readFile(path); response.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8` }).end(bytes); }
  catch { response.writeHead(404).end('Não encontrado'); }
}).listen(4173, '127.0.0.1', () => console.log('Prévia: http://127.0.0.1:4173'));
