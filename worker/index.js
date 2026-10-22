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
function money(value) { return Math.round(value * 100) / 100; }
function makeValues(seed) {
  let state = seed || 1;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const ratio = (base, min, max) => money(base * (min + random() * (max - min)));
  const positiveRatio = (base, chance, min, max) => ratio(base, min, max);
  const revenue = money(150_000 + random() * 4_850_000);
  const cost = ratio(revenue, 0.42, 0.70);
  const otherRevenue = positiveRatio(revenue, 0.45, 0.004, 0.025);
  const sales = ratio(revenue, 0.025, 0.055);
  const research = positiveRatio(revenue, 0.4, 0.004, 0.018);
  const admin = ratio(revenue, 0.035, 0.085);
  const goodwill = positiveRatio(revenue, 0.12, 0.002, 0.01);
  const otherExpense = ratio(revenue, 0.004, 0.018);
  const operating = revenue - cost + otherRevenue - sales - research - admin - goodwill - otherExpense;
  const equity = positiveRatio(operating, 0.3, 0.01, 0.07);
  const otherInvestment = positiveRatio(operating, 0.35, 0.005, 0.04);
  const beforeFinance = operating + equity + otherInvestment;
  const interest = ratio(beforeFinance, 0.025, 0.11);
  const benefit = positiveRatio(beforeFinance, 0.2, 0.003, 0.02);
  const beforeTax = beforeFinance - interest - benefit;
  const tax = ratio(beforeTax, 0.12, 0.32);
  const discontinued = positiveRatio(beforeTax, 0.12, 0.005, 0.025);
  return { revenue, cost, otherRevenue, sales, research, admin, goodwill, otherExpense, equity, otherInvestment, interest, benefit, tax, discontinued };
}
function makeCase(payload, seed, source = 'IA') {
  const values = makeValues(seed);
  const text = ['company', 'sector', 'context'].map(key => String(payload?.[key] || '').trim().slice(0, key === 'context' ? 220 : 70));
  if (source === 'IA' && text.some(value => !value)) throw new Error('Incomplete AI case');
  const metadata = { company: text[0], sector: text[1], context: text[2], source, generatedAt: now() };
  return {
    operational: CASE.operational.map(field => ({ ...field, value: values[field.key] })),
    investment: CASE.investment.map(field => ({ ...field, value: values[field.key] })),
    financing: CASE.financing.map(field => ({ ...field, value: values[field.key] })),
    metadata
  };
}
async function generateCase(env) {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
  try {
    if (!env.AI) throw new Error('AI binding unavailable');
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
      messages: [
        { role: 'system', content: 'Responda exclusivamente com um objeto JSON valido, sem markdown. Use exatamente as chaves company, sector e context, todas com texto curto em portugues brasileiro. Nao inclua valores financeiros.' },
        { role: 'user', content: 'Crie informacoes originais para um caso didatico de DRE: nome de uma empresa totalmente ficticia, setor e uma frase de contexto. Evite nomes e historias genericas.' }
      ],
      max_tokens: 220,
      temperature: 1.1,
      seed
    });
    const output = typeof response?.response === 'string' ? response.response : JSON.stringify(response?.response ?? '');
    const json = output.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error('AI did not return JSON');
    const payload = JSON.parse(json);
    return makeCase(payload, seed);
  } catch {
    const fallback = [
      { company: 'Comercial Horizonte', sector: 'Varejo de alimentos', context: 'A empresa ampliou as vendas apos abrir uma nova unidade.' },
      { company: 'Oficina Rota Norte', sector: 'Servicos automotivos', context: 'A oficina contratou novos servicos e reorganizou seus custos.' },
      { company: 'Verde Campo', sector: 'Agronegocio', context: 'A companhia vendeu uma safra e investiu em melhorias operacionais.' },
      { company: 'Nuvem Clara', sector: 'Tecnologia', context: 'A empresa lancou um servico por assinatura para pequenas empresas.' }
    ][seed % 4];
    return makeCase(fallback, seed, 'automatico');
  }
}async function readRoom(db, id) {
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
        catch { return json({ error: 'Nao foi possivel gerar uma nova DRE agora; as respostas foram preservadas.' }, 503, cors); }
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
