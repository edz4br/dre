import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';

test('API grava uma área, corrige e só reinicia com a senha do servidor', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../worker/schema.sql', import.meta.url), 'utf8'));
  const DB = { prepare(sql) { const stmt = sqlite.prepare(sql); return { bind(...args) { return { run: async () => stmt.run(...args), first: async () => stmt.get(...args) }; } }; } };
  const generatedValues = { revenue: 1200000, cost: 500000, otherRevenue: 10000, sales: 45000, research: 0, admin: 80000, goodwill: 0, otherExpense: 15000, equity: 0, otherInvestment: 5000, interest: 30000, benefit: 0, tax: 100000, discontinued: 0 };
  let failAI = false;
  const env = { DB, ALLOWED_ORIGIN: 'https://edz4br.github.io', RESET_PASSWORD: 'senha-forte-para-o-teste', AI: { async run() { if (failAI) throw new Error('AI unavailable'); return { response: { company: 'Mercado Azul', sector: 'Varejo', context: 'A empresa vende produtos para o comércio local.', values: generatedValues } }; } } };
  const base = 'https://api.exemplo.com/api/rooms/ABCDEFGHDRE';
  const call = async (suffix = '', method = 'GET', data) => {
    const response = await worker.fetch(new Request(base + suffix, { method, headers: { Origin: env.ALLOWED_ORIGIN, ...(data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) }), env);
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await call()).data.fields.investment.equity, '');
  await call('/fields', 'PATCH', { role: 'investment', field: 'equity', value: '0' });
  await call('/fields', 'PATCH', { role: 'investment', field: 'otherInvestment', value: '0' });
  assert.equal((await call('/check', 'POST', { role: 'investment' })).data.result.correct, true);
  assert.equal((await call()).data.checked.investment.correct, true);
  assert.equal((await call('/reset', 'POST', { password: 'errada' })).status, 403);
  assert.equal((await call()).data.fields.investment.equity, '0');
  assert.equal((await call('/reset', 'POST', { password: env.RESET_PASSWORD })).status, 200);
  const room = (await call()).data;
  assert.equal(room.fields.investment.equity, '');
  assert.equal(room.caseData.operational.find(field => field.key === 'revenue').value, generatedValues.revenue);
  assert.equal(room.caseData.metadata.company, 'Mercado Azul');
  for (const key of ['revenue', 'cost', 'otherRevenue', 'sales', 'research', 'admin', 'goodwill', 'otherExpense']) {
    await call('/fields', 'PATCH', { role: 'operational', field: key, value: String(generatedValues[key]) });
  }
  assert.equal((await call('/check', 'POST', { role: 'operational' })).data.result.correct, true);
  await call('/fields', 'PATCH', { role: 'operational', field: 'revenue', value: '123' });
  failAI = true;
  assert.equal((await call('/reset', 'POST', { password: env.RESET_PASSWORD })).status, 503);
  assert.equal((await call()).data.fields.operational.revenue, '123');
  sqlite.close();
});
