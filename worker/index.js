import { CASE, EMPTY, FIELDS, grade } from '../site/core.js';

const json = (body, status = 200, origin = '') => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
const fieldsOk = (role, field) => FIELDS[role]?.some(item => item.key === field);
const roomOk = value => /^[A-Z0-9]{8,12}$/.test(value);
const now = () => new Date().toISOString();
function parseRoom(row) {
  const stored = JSON.parse(row.state);
  const caseData = stored.__caseData || CASE;
  delete stored.__caseData;
  return { fields: stored, caseData, checked: JSON.parse(row.checked), revision: row.revision, updatedAt: row.updated_at };
}
const emptyRoomState = (caseData = CASE) => ({ ...EMPTY(), __caseData: caseData });
const caseKeys = Object.values(CASE).flat().map(field => field.key);
const caseSchema = {
  type: 'object', additionalProperties: false, required: ['company', 'sector', 'context', 'values'],
  properties: {
    company: { type: 'string' }, sector: { type: 'string' }, context: { type: 'string' },
    values: { type: 'object', additionalProperties: false, required: caseKeys, properties: Object.fromEntries(caseKeys.map(key => [key, { type: 'number', minimum: 0 }])) }
  }
};
function makeCase(data) {
  const payload = typeof data?.response === 'string' ? JSON.parse(data.response) : data?.response;
  const values = payload?.values;
  if (!values || caseKeys.some(key => !Number.isFinite(values[key]) || values[key] < 0 || values[key] > 100_000_000)) throw new Error('Invalid AI case');
  const rounded = Object.fromEntries(caseKeys.map(key => [key, Math.round(values[key] * 100) / 100]));
  const byKey = rounded;
  const operating = byKey.revenue - byKey.cost + byKey.otherRevenue - byKey.sales - byKey.research - byKey.admin - byKey.goodwill - byKey.otherExpense;
  const beforeFinance = operating + byKey.equity + byKey.otherInvestment;
  const beforeTax = beforeFinance - byKey.interest - byKey.benefit;
  if (byKey.revenue < 100_000 || byKey.revenue > 5_000_000 || byKey.revenue <= byKey.cost || operating <= 0 || beforeTax <= 0 || byKey.tax > beforeTax * 0.4) throw new Error('Incoherent AI case');
  const metadata = {
    company: String(payload.company || '').trim().slice(0, 70),
    sector: String(payload.sector || '').trim().slice(0, 70),
    context: String(payload.context || '').trim().slice(0, 220),
    generatedAt: now()
  };
  if (Object.values(metadata).slice(0, 3).some(value => !value)) throw new Error('Incomplete AI case');
  return {
    operational: CASE.operational.map(field => ({ ...field, value: byKey[field.key] })),
    investment: CASE.investment.map(field => ({ ...field, value: byKey[field.key] })),
    financing: CASE.financing.map(field => ({ ...field, value: byKey[field.key] })),
    metadata
  };
}
async function generateCase(env) {
  if (!env.AI) throw new Error('AI binding unavailable');
  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'Crie casos didáticos de DRE em português brasileiro. Gere apenas valores positivos para despesas. Respeite a matemática e os limites descritos. Não invente novos campos.' },
      { role: 'user', content: `Crie uma nova empresa fictícia e uma situação curta para exercício de DRE. Gere valores em reais, com até duas casas decimais, para estas chaves: ${caseKeys.join(', ')}. Receita entre R$ 100.000 e R$ 5.000.000; custo abaixo da receita; resultado operacional e resultado antes de tributos positivos; juros e demais despesas plausíveis; imposto de até 40% do resultado antes de tributos. Alguns itens podem valer zero quando não ocorreram. Contexto em uma frase. ` }
    ],
    response_format: { type: 'json_schema', json_schema: caseSchema },
    max_tokens: 600,
    temperature: 0.85,
    seed: crypto.getRandomValues(new Uint32Array(1))[0] || 1
  });
  return makeCase(response);
}
async function readRoom(db, id) {
  await db.prepare('INSERT OR IGNORE INTO rooms (id, state, checked, revision, updated_at) VALUES (?, ?, ?, 0, ?)').bind(id, JSON.stringify(emptyRoomState()), '{}', now()).run();
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
        const result = grade(role, existing.fields[role], existing.caseData);
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
        let caseData;
        try { caseData = await generateCase(env); }
        catch (error) { const diagnostic = url.searchParams.get('debug') === '1' ? String(error?.message || error).slice(0, 240) : undefined; return json({ error: 'A IA não conseguiu criar uma nova DRE agora. As respostas atuais foram preservadas; tente novamente.', ...(diagnostic ? { diagnostic } : {}) }, 503, cors); }
        await env.DB.prepare('UPDATE rooms SET state = ?, checked = ?, revision = revision + 1, updated_at = ?, failed_resets = 0, locked_until = NULL WHERE id = ?').bind(JSON.stringify(emptyRoomState(caseData)), '{}', now(), id).run();
        return json(parseRoom(await readRoom(env.DB, id)), 200, cors);
      }
      return json({ error: 'Método não permitido.' }, 405, cors);
    } catch (error) {
      if (error instanceof SyntaxError || error.message?.includes('JSON') || error.message?.includes('dados')) return json({ error: 'Dados inválidos.' }, 400, cors);
      return json({ error: 'O servidor não conseguiu processar a solicitação.' }, 500, cors);
    }
  }
};
