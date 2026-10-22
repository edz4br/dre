import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';

test('API grava uma área, corrige e só reinicia com a senha do servidor', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../worker/schema.sql', import.meta.url), 'utf8'));
  const DB = { prepare(sql) { const stmt = sqlite.prepare(sql); return { bind(...args) { return { run: async () => stmt.run(...args), first: async () => stmt.get(...args) }; } }; } };
  const generatedScenario = { company: 'Mercado Azul', sector: 'Varejo', context: 'A empresa vende produtos para o comércio local.' };
  let failAI = false;
  const env = { DB, ALLOWED_ORIGIN: 'https://edz4br.github.io', RESET_PASSWORD: 'senha-forte-para-o-teste', AI: { async run() { if (failAI) throw new Error('AI unavailable'); return { response: generatedScenario }; } } };
  const base = 'https://api.exemplo.com/api/rooms/ABCDEFGHDRE';
  const call = async (suffix = '', method = 'GET', data) => {
    const response = await worker.fetch(new Request(base + suffix, { method, headers: { Origin: env.ALLOWED_ORIGIN, ...(data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) }), env);
    return { status: response.status, data: await response.json() };
  };
  const initial = (await call()).data; assert.equal(initial.fields.investment.equity, ''); assert.ok([...initial.caseData.operational, ...initial.caseData.investment, ...initial.caseData.financing].every(field => field.value > 0));
  await call('/fields', 'PATCH', { role: 'investment', field: 'equity', value: String(initial.caseData.investment.find(field => field.key === 'equity').value) });
  await call('/fields', 'PATCH', { role: 'investment', field: 'otherInvestment', value: String(initial.caseData.investment.find(field => field.key === 'otherInvestment').value) });
  assert.equal((await call('/check', 'POST', { role: 'investment' })).data.result.correct, true);
  assert.equal((await call()).data.checked.investment.correct, true);
  assert.equal((await call('/reset', 'POST', { password: 'errada' })).status, 403);
  assert.equal((await call()).data.fields.investment.equity, String(initial.caseData.investment.find(field => field.key === 'equity').value));
  assert.equal((await call('/reset', 'POST', { password: env.RESET_PASSWORD })).status, 200);
  const room = (await call()).data;
  assert.equal(room.fields.investment.equity, '');
  assert.ok(room.caseData.operational.find(field => field.key === 'revenue').value > 100_000);
  assert.equal(room.caseData.metadata.company, 'Mercado Azul');
  assert.equal(room.caseData.metadata.source, 'IA'); assert.ok([...room.caseData.operational, ...room.caseData.investment, ...room.caseData.financing].every(field => field.value > 0));
  for (const field of room.caseData.operational) {
    await call('/fields', 'PATCH', { role: 'operational', field: field.key, value: String(field.value) });
  }
  assert.equal((await call('/check', 'POST', { role: 'operational' })).data.result.correct, true);
  await call('/fields', 'PATCH', { role: 'operational', field: 'revenue', value: '123' });
  failAI = true;
  assert.equal((await call('/reset', 'POST', { password: env.RESET_PASSWORD })).status, 200);
  const fallback = (await call()).data;
  assert.equal(fallback.fields.operational.revenue, '');
  assert.equal(fallback.caseData.metadata.source, 'automatico'); assert.ok([...fallback.caseData.operational, ...fallback.caseData.investment, ...fallback.caseData.financing].every(field => field.value > 0));
  sqlite.close();
});
