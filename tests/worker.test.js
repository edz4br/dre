import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { answers, FIELDS } from '../site/core.js';
import worker from '../worker/index.js';

test('API sincroniza apurações, corrige cada área e só gera outro caso com a senha do controller', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../worker/schema.sql', import.meta.url), 'utf8'));
  const DB = { prepare(sql) { const statement = sqlite.prepare(sql); return { bind(...args) { return { run: async () => statement.run(...args), first: async () => statement.get(...args) }; } }; } };
  const generatedScenario = { company: 'Mercado Azul', sector: 'Produção e serviços', context: 'A empresa vende produtos, presta serviços e encerrou uma unidade.' };
  let failAI = false;
  const testPassword = 'test-only-password';
  const env = { DB, ALLOWED_ORIGIN: 'https://edz4br.github.io', RESET_PASSWORD: testPassword, AI: { async run() { if (failAI) throw new Error('AI unavailable'); return { response: generatedScenario }; } } };
  const base = 'https://api.exemplo.com/api/rooms/ABCDEFGHDRE';
  const call = async (suffix = '', method = 'GET', data) => {
    const response = await worker.fetch(new Request(base + suffix, { method, headers: { Origin: env.ALLOWED_ORIGIN, ...(data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) }), env);
    return { status: response.status, data: await response.json() };
  };
  const allSourceEntries = caseData => Object.values(caseData.sources).flatMap(groups => Object.values(groups).flat());
  const allCalculatedValuesPositive = caseData => Object.values(answers(caseData)).every(area => Object.values(area).every(value => value > 0));
  const fillArea = async (caseData, role) => {
    const expected = answers(caseData)[role];
    for (const [field, value] of Object.entries(expected)) await call('/fields', 'PATCH', { role, field, value: (value / 100).toFixed(2) });
  };

  const initial = (await call()).data;
  assert.equal(initial.fields.investment.equity, '');
  assert.ok(allSourceEntries(initial.caseData).every(entry => entry.value > 0));
  assert.equal(initial.caseData.sources.operational.revenue.length, 3);
  assert.equal(initial.caseData.sources.operational.deductions, undefined);
  assert.ok(allCalculatedValuesPositive(initial.caseData));
  assert.deepEqual(Object.keys(initial.fields), Object.keys(FIELDS));

  await fillArea(initial.caseData, 'investment');
  assert.equal((await call('/check', 'POST', { role: 'investment' })).data.result.correct, true);
  assert.equal((await call()).data.checked.investment.correct, true);
  assert.equal((await call('/reset', 'POST', { password: 'errada' })).status, 403);
  assert.equal((await call()).data.fields.investment.equity, (answers(initial.caseData).investment.equity / 100).toFixed(2));

  assert.equal((await call('/reset', 'POST', { password: testPassword })).status, 200);
  const room = (await call()).data;
  assert.equal(room.fields.investment.equity, '');
  assert.notDeepEqual(room.caseData.sources, initial.caseData.sources);
  assert.equal(room.caseData.metadata.company, 'Mercado Azul');
  assert.equal(room.caseData.metadata.source, 'IA');
  assert.ok(allSourceEntries(room.caseData).every(entry => entry.value > 0));
  assert.ok(allCalculatedValuesPositive(room.caseData));
  for (const role of Object.keys(FIELDS)) {
    await fillArea(room.caseData, role);
    assert.equal((await call('/check', 'POST', { role })).data.result.correct, true, `área ${role}`);
  }

  await call('/fields', 'PATCH', { role: 'operational', field: 'revenue', value: '123' });
  failAI = true;
  assert.equal((await call('/reset', 'POST', { password: testPassword })).status, 200);
  const fallback = (await call()).data;
  assert.equal(fallback.fields.operational.revenue, '');
  assert.equal(fallback.caseData.metadata.source, 'automatico');
  assert.ok(allSourceEntries(fallback.caseData).every(entry => entry.value > 0));
  assert.ok(allCalculatedValuesPositive(fallback.caseData));
  assert.deepEqual(Object.keys(fallback.fields.operational), FIELDS.operational.map(field => field.key));
  sqlite.close();
});
