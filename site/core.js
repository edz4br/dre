export const CASE = {
  operational: [
    { key: 'revenue', label: 'Receita bruta', value: 2634789.56, kind: 'plus', group: 'Receitas e custos' },
    { key: 'cost', label: 'Custo dos produtos vendidos', value: 422890.78, kind: 'minus', group: 'Receitas e custos' },
    { key: 'otherRevenue', label: 'Outras receitas operacionais', value: 26347.90, kind: 'plus', group: 'Despesas e resultado operacional' },
    { key: 'sales', label: 'Despesas de vendas', value: 74568.76, kind: 'minus', group: 'Despesas e resultado operacional' },
    { key: 'research', label: 'Pesquisa e desenvolvimento', value: 23713.11, kind: 'minus', group: 'Despesas e resultado operacional' },
    { key: 'admin', label: 'Despesas gerais e administrativas', value: 51812.93, kind: 'minus', group: 'Despesas e resultado operacional' },
    { key: 'goodwill', label: 'Perda por redução do ágio', value: 13173.95, kind: 'minus', group: 'Despesas e resultado operacional' },
    { key: 'otherExpense', label: 'Outras despesas operacionais', value: 36874.30, kind: 'minus', group: 'Despesas e resultado operacional' }
  ],
  investment: [
    { key: 'equity', label: 'Resultado de equivalência patrimonial', value: 41200, kind: 'plus' },
    { key: 'otherInvestment', label: 'Outras receitas e despesas de investimentos', value: 18750, kind: 'plus' }
  ],
  financing: [
    { key: 'interest', label: 'Juros de empréstimos e arrendamentos', value: 693900, kind: 'minus' },
    { key: 'benefit', label: 'Juros de benefícios a empregados', value: 9420, kind: 'minus' },
    { key: 'tax', label: 'Imposto de renda e contribuição social', value: 325138.27, kind: 'minus' },
    { key: 'discontinued', label: 'Resultado de operações descontinuadas', value: 16800, kind: 'plus' }
  ]
};

export const ROLES = [
  { id: 'operational', name: 'Operacional', people: '2 gerentes', number: '01' },
  { id: 'investment', name: 'Investimento', people: '1 gerente', number: '02' },
  { id: 'financing', name: 'Financiamento', people: '1 gerente', number: '03' },
  { id: 'controller', name: 'Controller', people: 'fechamento', number: '04' }
];

export const CONTROLLER_FIELDS = [
  { key: 'gross', label: 'Lucro bruto', formula: 'Receita bruta − custo dos produtos vendidos' },
  { key: 'operating', label: 'Resultado operacional', formula: 'Lucro bruto + outras receitas − despesas operacionais' },
  { key: 'beforeFinance', label: 'Resultado antes de financiamento e tributos', formula: 'Resultado operacional + resultado de investimentos' },
  { key: 'beforeTax', label: 'Resultado antes do imposto de renda', formula: 'Resultado anterior − despesas de juros' },
  { key: 'final', label: 'Resultado do exercício', formula: 'Resultado anterior − tributos + operações descontinuadas' }
];

export const FIELDS = Object.fromEntries([...Object.entries(CASE).map(([role, fields]) => [role, fields]), ['controller', CONTROLLER_FIELDS]]);
export const EMPTY = () => Object.fromEntries(ROLES.map(role => [role.id, Object.fromEntries(FIELDS[role.id].map(field => [field.key, '']))]));
export const normalizeMoney = input => {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null;
  if (typeof input !== 'string') return null;
  const clean = input.trim().replace(/\s|R\$/gi, '');
  if (!clean || !/^-?[\d.,]+$/.test(clean)) return null;
  let normalized = clean;
  if (clean.includes(',') && clean.includes('.')) normalized = clean.replace(/\./g, '').replace(',', '.');
  else if (clean.includes(',')) normalized = clean.replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) normalized = clean.replace(/\./g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
};
export const formatMoney = cents => cents === null || cents === undefined ? '—' : (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function answers(caseData = CASE) {
  const v = Object.fromEntries(Object.values(caseData).filter(Array.isArray).flat().map(field => [field.key, Math.round(field.value * 100)]));
  const gross = v.revenue - v.cost;
  const operating = gross + v.otherRevenue - v.sales - v.research - v.admin - v.goodwill - v.otherExpense;
  const beforeFinance = operating + v.equity + v.otherInvestment;
  const beforeTax = beforeFinance - v.interest - v.benefit;
  const final = beforeTax - v.tax + v.discontinued;
  return { operational: Object.fromEntries(caseData.operational.map(f => [f.key, v[f.key]])), investment: Object.fromEntries(caseData.investment.map(f => [f.key, v[f.key]])), financing: Object.fromEntries(caseData.financing.map(f => [f.key, v[f.key]])), controller: { gross, operating, beforeFinance, beforeTax, final } };
}
export function grade(role, fields, caseData = CASE) {
  const expected = answers(caseData)[role];
  if (!expected) throw new Error('Área inválida');
  const result = Object.fromEntries(Object.keys(expected).map(key => [key, normalizeMoney(fields?.[key]) === expected[key]]));
  return { fields: result, correct: Object.values(result).every(Boolean), count: Object.values(result).filter(Boolean).length, total: Object.keys(result).length };
}
