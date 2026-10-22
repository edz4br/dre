const item = (label, value, effect = 'add') => ({ label, value, ...(effect === 'subtract' ? { effect } : {}) });

export const CASE = {
  sources: {
    operational: {
      revenue: [
        item('Venda de mercadorias — loja', 1765490.25),
        item('Venda de mercadorias — canal digital', 523199.31),
        item('Prestação de serviços', 346100.00)
      ],
      deductions: [
        item('Devoluções e abatimentos', 23520.00),
        item('Impostos sobre vendas e serviços', 161465.81)
      ],
      cost: [
        item('Custo das mercadorias vendidas', 180000.00),
        item('Custo dos serviços prestados', 105000.00),
        item('Materiais aplicados na produção', 42000.00),
        item('Mão de obra direta', 68000.00),
        item('Fretes sobre compras', 27890.78)
      ],
      otherRevenue: [
        item('Receita operacional acessória', 14800.00),
        item('Receita de serviços complementares', 11547.90)
      ],
      sales: [
        item('Publicidade e propaganda', 25000.00),
        item('Comissões sobre vendas', 38000.00),
        item('Fretes sobre vendas', 11568.76)
      ],
      research: [
        item('Pesquisa aplicada', 15000.00),
        item('Desenvolvimento de produto', 8713.11)
      ],
      admin: [
        item('Salários e ordenados administrativos', 15000.00),
        item('Pró-labore', 12000.00),
        item('Encargos trabalhistas', 4500.00),
        item('Benefícios aos colaboradores', 3212.93),
        item('Aluguel', 4800.00),
        item('Energia, água e esgoto', 2300.00),
        item('Telefonia, internet e material de escritório', 3000.00),
        item('Honorários contábeis e serviços de terceiros', 7000.00)
      ],
      goodwill: [item('Perda por redução ao valor recuperável do ágio', 13173.95)],
      otherExpense: [
        item('Taxas e emolumentos', 23000.00),
        item('Impostos não recuperáveis', 13874.30)
      ]
    },
    investment: {
      equity: [
        item('Equivalência patrimonial — Coligada A', 25000.00),
        item('Equivalência patrimonial — Coligada B', 16200.00)
      ],
      otherInvestment: [
        item('Receita de aluguel de propriedade de investimento', 14300.00),
        item('Rendimento de ativo financeiro', 6000.00),
        item('Perda na remensuração de investimento', 1550.00, 'subtract')
      ]
    },
    financing: {
      interest: [
        item('Juros de empréstimos', 620000.00),
        item('Juros de arrendamentos e leasings', 73900.00)
      ],
      benefit: [
        item('Juros sobre benefício pós-emprego', 6400.00),
        item('Juros sobre obrigação atuarial', 3020.00)
      ],
      discontinued: [
        item('Receita da unidade descontinuada', 87500.00),
        item('Despesas da unidade descontinuada', 70700.00, 'subtract')
      ]
    }
  },
  metadata: null
};

export const ROLES = [
  { id: 'operational', name: 'Operacional', people: '2 gerentes', number: '01' },
  { id: 'investment', name: 'Investimento', people: '1 gerente', number: '02' },
  { id: 'financing', name: 'Financiamento', people: '1 gerente', number: '03' },
  { id: 'controller', name: 'Controller', people: 'fechamento', number: '04' }
];

export const CONTROLLER_FIELDS = [
  { key: 'netRevenue', label: 'Receita líquida', formula: 'Receita bruta - deduções da receita bruta' },
  { key: 'gross', label: 'Lucro bruto', formula: 'Receita líquida - custo dos produtos e serviços vendidos' },
  { key: 'operating', label: 'Resultado operacional', formula: 'Lucro bruto + outras receitas - despesas operacionais' },
  { key: 'beforeFinance', label: 'Resultado antes de financiamento e tributos', formula: 'Resultado operacional + resultado de investimentos' },
  { key: 'beforeTax', label: 'Resultado antes do imposto de renda', formula: 'Resultado anterior - despesas de juros' },
  { key: 'final', label: 'Resultado do exercício', formula: 'Resultado anterior - tributos sobre o lucro + operações descontinuadas' }
];

export const FIELD_DEFINITIONS = {
  operational: [
    { key: 'revenue', label: 'Receita bruta', kind: 'plus', group: 'Receitas e custos', formula: 'Some as vendas de mercadorias e as receitas de prestação de serviços.' },
    { key: 'deductions', label: 'Deduções da receita bruta', kind: 'minus', group: 'Receitas e custos', formula: 'Some devoluções, abatimentos e impostos sobre vendas e serviços.' },
    { key: 'cost', label: 'Custos dos produtos e serviços vendidos', kind: 'minus', group: 'Receitas e custos', formula: 'Some os custos de mercadorias, serviços, produção, mão de obra direta e fretes sobre compras.' },
    { key: 'otherRevenue', label: 'Outras receitas operacionais', kind: 'plus', group: 'Despesas e resultado operacional', formula: 'Some as outras receitas da operação.' },
    { key: 'sales', label: 'Despesas de vendas', kind: 'minus', group: 'Despesas e resultado operacional', formula: 'Some publicidade, comissões e fretes sobre vendas.' },
    { key: 'research', label: 'Pesquisa e desenvolvimento', kind: 'minus', group: 'Despesas e resultado operacional', formula: 'Some os gastos de pesquisa e desenvolvimento.' },
    { key: 'admin', label: 'Despesas gerais e administrativas', kind: 'minus', group: 'Despesas e resultado operacional', formula: 'Some as contas administrativas.' },
    { key: 'goodwill', label: 'Perda por redução ao valor recuperável do ágio', kind: 'minus', group: 'Despesas e resultado operacional' },
    { key: 'otherExpense', label: 'Outras despesas operacionais', kind: 'minus', group: 'Despesas e resultado operacional', formula: 'Some taxas, emolumentos e impostos não recuperáveis.' }
  ],
  investment: [
    { key: 'equity', label: 'Resultado de equivalência patrimonial', kind: 'plus', formula: 'Some os resultados de equivalência patrimonial das coligadas.' },
    { key: 'otherInvestment', label: 'Outras receitas e despesas de investimentos', kind: 'variable', formula: 'Some as receitas e subtraia as despesas identificadas com (−).' }
  ],
  financing: [
    { key: 'interest', label: 'Despesas de juros com empréstimos e leasings', kind: 'minus', formula: 'Some os juros dos empréstimos e dos arrendamentos.' },
    { key: 'benefit', label: 'Despesas de juros com benefícios a empregados', kind: 'minus', formula: 'Some os juros das obrigações de benefícios aos empregados.' },
    { key: 'tax', label: 'Imposto de renda e contribuição social', kind: 'minus', formula: 'Calcule IRPJ de 15% + CSLL de 9% sobre o resultado antes do imposto.' },
    { key: 'discontinued', label: 'Resultado de operações descontinuadas', kind: 'variable', formula: 'Some a receita e subtraia as despesas identificadas com (−).' }
  ]
};

export const FIELDS = Object.fromEntries([...Object.entries(FIELD_DEFINITIONS), ['controller', CONTROLLER_FIELDS]]);
export const EMPTY = () => Object.fromEntries(ROLES.map(role => [role.id, Object.fromEntries(FIELDS[role.id].map(field => [field.key, '']))]));

const sourceCents = items => (items || []).reduce((total, entry) => total + (entry.effect === 'subtract' ? -1 : 1) * Math.round(Number(entry.value) * 100), 0);
const sourceTotal = (sources, role, key) => sourceCents(sources?.[role]?.[key]);
const cents = value => Math.round(Number(value) * 100);

function legacySourceGroup(role, key, legacy) {
  const template = CASE.sources[role][key] || [];
  const oldValue = legacy?.[role]?.find(field => field.key === key)?.value;
  if (!Number.isFinite(Number(oldValue)) || Number(oldValue) <= 0 || !template.length) return template.map(entry => ({ ...entry }));
  const expected = cents(oldValue);
  const templateTotal = sourceCents(template);
  if (!templateTotal) return template.map(entry => ({ ...entry }));
  const scale = expected / templateTotal;
  const result = template.map(entry => ({ ...entry, value: Math.max(1, Math.round(cents(entry.value) * scale)) / 100 }));
  const delta = expected - sourceCents(result);
  const adjustment = result.findLastIndex(entry => entry.effect !== 'subtract');
  const index = adjustment >= 0 ? adjustment : result.length - 1;
  result[index].value = Math.max(0.01, Math.round((cents(result[index].value) + delta) / 1) / 100);
  return result;
}

export function normalizeCaseData(data = CASE) {
  if (data?.sources && typeof data.sources === 'object') {
    const sources = Object.fromEntries(Object.entries(FIELD_DEFINITIONS).map(([role, fields]) => [role,
      Object.fromEntries(fields.filter(field => field.key !== 'tax').map(field => {
        const template = CASE.sources[role][field.key] || [];
        const received = data.sources?.[role]?.[field.key];
        const entries = Array.isArray(received) && received.length ? received : template;
        return [field.key, entries.map((entry, index) => ({
          label: String(entry?.label || template[index]?.label || `Conta ${index + 1}`).slice(0, 100),
          value: Number(entry?.value) > 0 ? Math.round(Number(entry.value) * 100) / 100 : Number(template[index]?.value || 0.01),
          ...(entry?.effect === 'subtract' ? { effect: 'subtract' } : {})
        }))];
      }))
    ]));
    return { sources, metadata: data.metadata || null };
  }
  const legacy = data || {};
  const sources = Object.fromEntries(Object.entries(FIELD_DEFINITIONS).map(([role, fields]) => [role,
    Object.fromEntries(fields.filter(field => field.key !== 'tax').map(field => [field.key, legacySourceGroup(role, field.key, legacy)]))
  ]));
  return { sources, metadata: legacy.metadata || null };
}

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

export const formatMoney = amount => amount === null || amount === undefined ? '-' : (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function answers(caseData = CASE) {
  const { sources } = normalizeCaseData(caseData);
  const operational = Object.fromEntries(FIELD_DEFINITIONS.operational.map(field => [field.key, sourceTotal(sources, 'operational', field.key)]));
  const investment = Object.fromEntries(FIELD_DEFINITIONS.investment.map(field => [field.key, sourceTotal(sources, 'investment', field.key)]));
  const financing = Object.fromEntries(FIELD_DEFINITIONS.financing.filter(field => field.key !== 'tax').map(field => [field.key, sourceTotal(sources, 'financing', field.key)]));
  const netRevenue = operational.revenue - operational.deductions;
  const gross = netRevenue - operational.cost;
  const operating = gross + operational.otherRevenue - operational.sales - operational.research - operational.admin - operational.goodwill - operational.otherExpense;
  const beforeFinance = operating + investment.equity + investment.otherInvestment;
  const beforeTax = beforeFinance - financing.interest - financing.benefit;
  financing.tax = Math.round(beforeTax * 24 / 100);
  const final = beforeTax - financing.tax + financing.discontinued;
  return { operational, investment, financing, controller: { netRevenue, gross, operating, beforeFinance, beforeTax, final } };
}

export function grade(role, fields, caseData = CASE) {
  const expected = answers(caseData)[role];
  if (!expected) throw new Error('Área inválida');
  const result = Object.fromEntries(Object.keys(expected).map(key => [key, normalizeMoney(fields?.[key]) === expected[key]]));
  return { fields: result, correct: Object.values(result).every(Boolean), count: Object.values(result).filter(Boolean).length, total: Object.keys(result).length };
}

