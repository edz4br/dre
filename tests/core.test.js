import test from 'node:test';
import assert from 'node:assert/strict';
import { answers, CASE, EMPTY, FIELDS, createPracticeCase, grade, normalizeCaseData, normalizeMoney } from '../site/core.js';

test('a estrutura segue a DRE ensinada e cada gerente apura contas e subtotais da sua área', () => {
  assert.deepEqual(FIELDS.operational.map(field => field.key), ['revenue', 'cost', 'gross', 'otherRevenue', 'sales', 'research', 'admin', 'goodwill', 'otherExpense', 'operating']);
  assert.deepEqual(FIELDS.investment.map(field => field.key), ['equity', 'otherInvestment', 'beforeFinance']);
  assert.deepEqual(FIELDS.financing.map(field => field.key), ['interest', 'benefit', 'beforeTax', 'tax']);
  assert.deepEqual(FIELDS.controller.map(field => field.key), ['discontinued', 'final']);
  assert.equal(FIELDS.operational.some(field => field.key === 'deductions'), false);
  assert.equal(FIELDS.controller.some(field => ['gross', 'operating', 'beforeFinance', 'beforeTax'].includes(field.key)), false);
});

test('as respostas são somadas das contas de origem, sem entregar os subtotais', () => {
  const result = answers();
  assert.equal(result.operational.revenue, 263478956);
  assert.equal(result.operational.cost, 42289078);
  assert.equal(result.operational.gross, 221189878);
  assert.equal(result.operational.otherRevenue, 2634790);
  assert.equal(result.operational.operating, 203810363);
  assert.equal(result.investment.equity, 4120000);
  assert.equal(result.investment.otherInvestment, 1875000);
  assert.equal(result.investment.beforeFinance, 209805363);
  assert.equal(result.financing.beforeTax, 139473363);
  assert.equal(result.financing.tax, 33473607);
  assert.equal(result.controller.discontinued, 1680000);
  assert.equal(result.controller.final, 107679756);
  assert.notEqual(CASE.sources.operational.revenue[0].value, result.operational.revenue / 100);
  assert.ok(Object.values(CASE.sources).every(groups => Object.values(groups).flat().every(entry => entry.value > 0)));
});

test('cada novo caso varia as contas, mantém as alíquotas ensinadas e preenche todas as linhas', () => {
  const first = createPracticeCase(1);
  const second = createPracticeCase(2);
  assert.notDeepEqual(first.sources, second.sources);
  assert.deepEqual(first.taxRates, { ir: 15, csll: 9 });
  assert.deepEqual(second.taxRates, { ir: 11, csll: 8 });
  for (const sample of [first, second, ...Array.from({ length: 20 }, (_, index) => createPracticeCase(index + 10))]) {
    assert.ok(Object.values(sample.sources).every(groups => Object.values(groups).flat().every(entry => entry.value > 0)));
    assert.ok(Object.values(answers(sample)).every(area => Object.values(area).every(value => value > 0)));
    const computed = answers(sample);
    const beforeTax = computed.financing.beforeTax;
    const expectedTaxes = Math.round(beforeTax * sample.taxRates.ir / 100) + Math.round(beforeTax * sample.taxRates.csll / 100);
    assert.equal(computed.financing.tax, expectedTaxes);
  }
});

test('aceita formatos monetários brasileiros e não considera campo vazio como zero', () => {
  assert.equal(normalizeMoney('R$ 2.634.789,56'), 263478956);
  assert.equal(normalizeMoney('0'), 0);
  assert.equal(normalizeMoney('693900'), 69390000);
  assert.equal(normalizeMoney(''), null);
});

test('corrige cada área contra seus cálculos de origem e subtotal', () => {
  const fields = EMPTY();
  assert.equal(grade('operational', fields.operational).correct, false);
  for (const role of Object.keys(fields)) {
    for (const [key, value] of Object.entries(answers()[role])) fields[role][key] = (value / 100).toFixed(2);
    assert.equal(grade(role, fields[role], CASE, fields).correct, true, `área ${role}`);
  }
  fields.operational.gross = (answers().operational.revenue / 100).toFixed(2);
  assert.equal(grade('operational', fields.operational).correct, false);
});

test('controller confere a soma dos valores recebidos dos gerentes sem corrigir suas apurações', () => {
  const expected = answers();
  const submitted = EMPTY();
  submitted.financing.beforeTax = '100000,00';
  submitted.financing.tax = '10000,00';
  submitted.controller.discontinued = (expected.controller.discontinued / 100).toFixed(2);
  submitted.controller.final = ((10000000 - 1000000 + expected.controller.discontinued) / 100).toFixed(2);
  const checked = grade('controller', submitted.controller, CASE, submitted);
  assert.deepEqual(checked.fields, { discontinued: true, final: true });
  assert.notEqual(normalizeMoney(submitted.controller.final), expected.controller.final);
});

test('converte salas antigas mantendo valores informados nas categorias compatíveis', () => {
  const legacy = {
    operational: [
      { key: 'revenue', value: 2634789.56 },
      { key: 'cost', value: 422890.78 }
    ],
    investment: [{ key: 'equity', value: 41200 }, { key: 'otherInvestment', value: 18750 }],
    financing: [{ key: 'interest', value: 693900 }, { key: 'benefit', value: 9420 }],
    metadata: { company: 'Sala antiga' }
  };
  const converted = normalizeCaseData(legacy);
  assert.equal(converted.metadata.company, 'Sala antiga');
  assert.equal(answers(converted).operational.revenue, 263478956);
  assert.equal(answers(converted).operational.cost, 42289078);
  assert.equal(answers(converted).financing.tax, 33473607);
  assert.ok(converted.sources.operational.revenue.length > 1);
});
