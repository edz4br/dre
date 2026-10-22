import test from 'node:test';
import assert from 'node:assert/strict';
import { answers, EMPTY, grade, normalizeMoney } from '../site/core.js';

test('fecha a DRE com os valores do caso dos slides', () => {
  const result = answers().controller;
  assert.deepEqual(result, { gross: 221189878, operating: 204864279, beforeFinance: 204864279, beforeTax: 135474279, final: 102960452 });
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
  fields.investment.equity = '0';
  fields.investment.otherInvestment = '0';
  assert.equal(grade('investment', fields.investment).correct, true);
  fields.financing.interest = '693.900,00';
  assert.equal(grade('financing', fields.financing).correct, false);
});
