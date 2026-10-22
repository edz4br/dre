import { EMPTY, FIELDS, grade } from '../site/core.js';

const json = (body, status = 200, origin = '') => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
const fieldsOk = (role, field) => FIELDS[role]?.some(item => item.key === field);
const roomOk = value => /^[A-Z0-9]{8,12}$/.test(value);
const now = () => new Date().toISOString();
const parseRoom = row => ({ fields: JSON.parse(row.state), checked: JSON.parse(row.checked), revision: row.revision, updatedAt: row.updated_at });
async function readRoom(db, id) {
  await db.prepare('INSERT OR IGNORE INTO rooms (id, state, checked, revision, updated_at) VALUES (?, ?, ?, 0, ?)').bind(id, JSON.stringify(EMPTY()), '{}', now()).run();
  return db.prepare('SELECT state, checked, revision, updated_at FROM rooms WHERE id = ?').bind(id).first();
}
async function bodyOf(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Envie dados em JSON.');
  const text = await request.text();
  if (text.length > 1000) throw new Error('Dados grandes demais.');
  return JSON.parse(text);
}
async function sameSecret(actual, supplied) {
  if (!actual || typeof supplied !== 'string') return false;
  const hash = text => crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const [a, b] = await Promise.all([hash(actual), hash(supplied)]);
  const aa = new Uint8Array(a), bb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || '';
    const cors = origin && origin === allowed ? origin : '';
    if (request.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors ? { 'Access-Control-Allow-Origin': cors, 'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {} });
    if (origin && !cors) return json({ error: 'Origem não autorizada.' }, 403);
    if (!env.DB) return json({ error: 'Banco de dados não configurado.' }, 503, cors);
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{8,12})(?:\/(fields|check|reset))?$/);
    if (!match || !roomOk(match[1])) return json({ error: 'Rota ou sala inválida.' }, 404, cors);
    const [, id, action] = match;
    try {
      if (request.method === 'GET' && !action) return json(parseRoom(await readRoom(env.DB, id)), 200, cors);
      if (request.method === 'PATCH' && action === 'fields') {
        const { role, field, value } = await bodyOf(request);
        if (!fieldsOk(role, field) || typeof value !== 'string' || value.length > 32 || !/^[\d.,\sR$r-]*$/i.test(value)) return json({ error: 'Campo ou valor inválido.' }, 400, cors);
        await readRoom(env.DB, id);
        const path = `$.${role}.${field}`;
        await env.DB.prepare('UPDATE rooms SET state = json_set(state, ?, ?), checked = json_remove(checked, ?), revision = revision + 1, updated_at = ? WHERE id = ?').bind(path, value, `$.${role}`, now(), id).run();
        return json(parseRoom(await readRoom(env.DB, id)), 200, cors);
      }
      if (request.method === 'POST' && action === 'check') {
        const { role } = await bodyOf(request);
        if (!FIELDS[role]) return json({ error: 'Área inválida.' }, 400, cors);
        const existing = parseRoom(await readRoom(env.DB, id));
        const result = grade(role, existing.fields[role]);
        await env.DB.prepare('UPDATE rooms SET checked = json_set(checked, ?, json(?)), revision = revision + 1, updated_at = ? WHERE id = ?').bind(`$.${role}`, JSON.stringify(result), now(), id).run();
        return json({ result, room: parseRoom(await readRoom(env.DB, id)) }, 200, cors);
      }
      if (request.method === 'POST' && action === 'reset') {
        const { password } = await bodyOf(request);
        await readRoom(env.DB, id);
        const guard = await env.DB.prepare('SELECT failed_resets, locked_until FROM rooms WHERE id = ?').bind(id).first();
        if (guard.locked_until && guard.locked_until > now()) return json({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, 429, cors);
        if (!await sameSecret(env.RESET_PASSWORD, password)) {
          const failures = (guard.locked_until ? 0 : guard.failed_resets) + 1;
          const locked = failures >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
          await env.DB.prepare('UPDATE rooms SET failed_resets = ?, locked_until = ? WHERE id = ?').bind(failures >= 5 ? 0 : failures, locked, id).run();
          return json({ error: locked ? 'Muitas tentativas. Aguarde 15 minutos.' : 'Senha incorreta.' }, locked ? 429 : 403, cors);
        }
        await env.DB.prepare('UPDATE rooms SET state = ?, checked = ?, revision = revision + 1, updated_at = ?, failed_resets = 0, locked_until = NULL WHERE id = ?').bind(JSON.stringify(EMPTY()), '{}', now(), id).run();
        return json(parseRoom(await readRoom(env.DB, id)), 200, cors);
      }
      return json({ error: 'Método não permitido.' }, 405, cors);
    } catch (error) {
      if (error instanceof SyntaxError || error.message?.includes('JSON') || error.message?.includes('dados')) return json({ error: 'Dados inválidos.' }, 400, cors);
      return json({ error: 'O servidor não conseguiu processar a solicitação.' }, 500, cors);
    }
  }
};
