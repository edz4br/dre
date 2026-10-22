import test from 'node:test';
import assert from 'node:assert/strict';
import { answers, EMPTY, grade, normalizeMoney } from '../site/core.js';

test('fecha a DRE com os valores do caso inicial', () => {
  const result = answers().controller;
  assert.deepEqual(result, { gross: 221189878, operating: 203810363, beforeFinance: 209805363, beforeTax: 139473363, final: 108639536 });
});
test('aceita valores monetários brasileiros, inclusive zero', () => {
  assert.equal(normalizeMoney('R$ 2.634.789,56'), 263478956);
  assert.equal(normalizeMoney('0'), 0);
  assert.equal(normalizeMoney('693900'), 69390000);
  assert.equal(normalizeMoney(''), null);
});
test('corrige cada área sem dar como certo um campo vazio', () => {
  const fields = EMPTY();
  assert.equal(grade('investment', fields.investment).correct, false);
  fields.investment.equity = '41.200,00';
  fields.investment.otherInvestment = '18.750,00';
  assert.equal(grade('investment', fields.investment).correct, true);
  fields.financing.interest = '693.900,00';
  assert.equal(grade('financing', fields.financing).correct, false);
});
