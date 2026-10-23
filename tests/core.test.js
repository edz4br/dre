import test from 'node:test';
import assert from 'node:assert/strict';
import { answers, CASE, EMPTY, FIELDS, createPracticeCase, grade, normalizeCaseData, normalizeMoney } from '../site/core.js';

const total = entries => entries.reduce((sum, entry) => sum + (entry.effect === 'subtract' ? -1 : 1) * Math.round(entry.value * 100), 0);
const fillRole = (role, solution, fields) => {
  for (const [key, value] of Object.entries(solution)) fields[role][key] = (value / 100).toFixed(2);
};

test('as abas refletem as quatro funções e a estrutura em cascata da IFRS 18', () => {
  assert.deepEqual(Object.keys(FIELDS), ['operational', 'investment', 'financing', 'controller']);
  assert.deepEqual(FIELDS.operational.map(item => item.key), [
    'grossRevenue', 'deductions', 'netRevenue', 'otherOperatingRevenue', 'materialsConsumption', 'inventoryVariation',
    'employeeExpenses', 'depreciation', 'amortization', 'researchDevelopment', 'marketing', 'impairment',
    'otherOperatingExpenses', 'operatingProfit'
  ]);
  assert.deepEqual(FIELDS.investment.map(item => item.key), ['equity', 'otherInvestment', 'beforeFinancingTaxes']);
  assert.deepEqual(FIELDS.financing.map(item => item.key), [
    'interestBorrowingsLeases', 'interestEmployeeBenefits', 'fxFinancing', 'provisionExpense', 'beforeTax',
    'incomeTaxContinuing', 'socialContributionContinuing', 'taxContinuing', 'afterTaxContinuing',
    'discontinuedBeforeTax', 'incomeTaxDiscontinued', 'socialContributionDiscontinued', 'taxDiscontinued'
  ]);
  assert.deepEqual(FIELDS.controller.map(item => item.key), ['discontinuedRevenue', 'discontinuedExpenses', 'discontinued', 'final']);
  assert.ok(FIELDS.operational.some(item => item.key === 'grossRevenue'));
  assert.ok(FIELDS.operational.some(item => item.key === 'netRevenue'));
  assert.ok(FIELDS.operational.every(item => item.key !== 'gross'));
});

test('o resultado é calculado a partir das contas de origem, incluindo consumo e variação de estoque', () => {
  const result = answers(CASE);
  const source = CASE.sources;
  assert.equal(result.operational.grossRevenue, total(source.operational.grossRevenue));
  assert.equal(result.operational.deductions, total(source.operational.deductions));
  assert.equal(result.operational.netRevenue, result.operational.grossRevenue - result.operational.deductions);
  assert.equal(result.operational.materialsConsumption, total(source.operational.materialsConsumption));
  assert.equal(result.operational.inventoryVariation, total(source.operational.inventoryVariation));
  assert.equal(result.operational.operatingProfit,
    result.operational.netRevenue + result.operational.otherOperatingRevenue - result.operational.materialsConsumption
    + result.operational.inventoryVariation - result.operational.employeeExpenses - result.operational.depreciation
    - result.operational.amortization - result.operational.researchDevelopment - result.operational.marketing
    - result.operational.impairment - result.operational.otherOperatingExpenses);
  assert.equal(result.investment.beforeFinancingTaxes, result.operational.operatingProfit + result.investment.equity + result.investment.otherInvestment);
  assert.equal(result.financing.incomeTaxContinuing, Math.round(result.financing.beforeTax * CASE.taxRates.ir / 100));
  assert.equal(result.financing.socialContributionContinuing, Math.round(result.financing.beforeTax * CASE.taxRates.csll / 100));
  assert.equal(result.financing.taxContinuing, result.financing.incomeTaxContinuing + result.financing.socialContributionContinuing);
  assert.equal(result.financing.afterTaxContinuing, result.financing.beforeTax - result.financing.taxContinuing);
  assert.equal(result.financing.discontinuedBeforeTax,
    result.controller.discontinuedRevenue - result.controller.discontinuedExpenses);
  assert.equal(result.financing.incomeTaxDiscontinued, Math.round(result.financing.discontinuedBeforeTax * CASE.taxRates.ir / 100));
  assert.equal(result.financing.socialContributionDiscontinued, Math.round(result.financing.discontinuedBeforeTax * CASE.taxRates.csll / 100));
  assert.equal(result.financing.taxDiscontinued,
    result.financing.incomeTaxDiscontinued + result.financing.socialContributionDiscontinued);
  assert.equal(result.controller.final, result.financing.afterTaxContinuing + result.controller.discontinued);
  assert.ok(Object.values(result).every(area => Object.values(area).every(value => Number.isInteger(value) && value !== 0)));
});

test('casos novos variam, usam apenas contas preenchidas e mantêm todos os subtotais diferentes de zero', () => {
  const first = createPracticeCase(101);
  const second = createPracticeCase(202);
  assert.notDeepEqual(first.sources, second.sources);
  assert.notDeepEqual(first.taxRates, second.taxRates);
  for (let seed = 1; seed <= 300; seed++) {
    const sample = createPracticeCase(seed);
    const calculated = answers(sample);
    const items = Object.values(sample.sources).flatMap(groups => Object.values(groups).flat());
    assert.ok(items.length > 0);
    assert.ok(items.every(item => Number.isFinite(item.value) && item.value > 0));
    assert.ok(Object.values(calculated).every(area => Object.values(area).every(value => Number.isInteger(value) && value !== 0)));
    assert.ok(calculated.operational.operatingProfit > 0);
    assert.ok(calculated.financing.beforeTax > 0);
    assert.ok(calculated.controller.final > 0);
  }
});

test('a correção confere cada área contra o gabarito do próprio caso', () => {
  const data = createPracticeCase(808);
  const fields = EMPTY();
  assert.equal(grade('operational', fields.operational, data).correct, false);
  for (const role of Object.keys(fields)) {
    fillRole(role, answers(data)[role], fields);
    assert.equal(grade(role, fields[role], data, fields).correct, true, `área ${role}`);
  }
  fields.operational.netRevenue = (answers(data).operational.grossRevenue / 100).toFixed(2);
  assert.equal(grade('operational', fields.operational, data).correct, false);
});

test('o controller soma os números informados pelo gerente e não corrige a área financeira', () => {
  const data = createPracticeCase(909);
  const solution = answers(data);
  const fields = EMPTY();
  fillRole('controller', solution.controller, fields);
  fillRole('financing', solution.financing, fields);
  fields.financing.afterTaxContinuing = ((solution.financing.afterTaxContinuing + 12345) / 100).toFixed(2);
  fields.controller.final = ((solution.controller.final + 12345) / 100).toFixed(2);
  assert.equal(grade('controller', fields.controller, data, fields).correct, true);
  assert.equal(grade('financing', fields.financing, data, fields).correct, false);
});

test('aceita dinheiro no formato brasileiro e não interpreta campo em branco como zero', () => {
  assert.equal(normalizeMoney('R$ 2.634.789,56'), 263478956);
  assert.equal(normalizeMoney('-1.234,56'), -123456);
  assert.equal(normalizeMoney('693900'), 69390000);
  assert.equal(normalizeMoney(''), null);
});

test('salas antigas sem a estrutura nova caem no caso didático atual', () => {
  const old = normalizeCaseData({
    operational: [{ key: 'revenue', value: 1000 }],
    metadata: { company: 'Sala antiga' }
  });
  assert.equal(old.schemaVersion, CASE.schemaVersion);
  assert.equal(old.metadata.company, CASE.metadata.company);
  assert.ok(old.sources.operational.grossRevenue.length > 1);
});
