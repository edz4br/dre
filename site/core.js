const item = (label, value, effect = 'add') => ({ label, value, ...(effect === 'subtract' ? { effect } : {}) });

export const CASE = {
  sources: {
    operational: {
      revenue: [
        item('Venda de mercadorias - loja', 1765490.25),
        item('Venda de mercadorias - canal digital', 523199.31),
        item('Receita de prestação de serviços', 346100.00)
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
        item('Equivalência patrimonial - Coligada A', 25000.00),
        item('Equivalência patrimonial - Coligada B', 16200.00)
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
      ]
    },
    controller: {
      discontinued: [
        item('Receita da unidade descontinuada', 87500.00),
        item('Despesas da unidade descontinuada', 70700.00, 'subtract')
      ]
    }
  },
  taxRates: { ir: 15, csll: 9 },
  metadata: null
};

export const ROLES = [
  { id: 'operational', name: 'Operacional', people: '2 gerentes', number: '01' },
  { id: 'investment', name: 'Investimento', people: '1 gerente', number: '02' },
  { id: 'financing', name: 'Financiamento', people: '1 gerente', number: '03' },
  { id: 'controller', name: 'Controller', people: 'fechamento', number: '04' }
];

export const FIELD_DEFINITIONS = {
  operational: [
    { key: 'revenue', label: 'Receitas brutas', kind: 'plus', group: 'Receitas e custos', formula: 'Some as vendas de mercadorias e as receitas de prestação de serviços.' },
    { key: 'cost', label: 'Custos dos produtos e serviços vendidos', kind: 'minus', group: 'Receitas e custos', formula: 'Some mercadorias, serviços, materiais, mão de obra direta e fretes sobre compras.' },
    { key: 'gross', label: 'Lucro bruto', kind: 'subtotal', group: 'Receitas e custos', formula: 'Receitas brutas − custos dos produtos e serviços vendidos.' },
    { key: 'otherRevenue', label: 'Outras receitas operacionais', kind: 'plus', group: 'Despesas e resultado operacional', formula: 'Some as contas de outras receitas da operação.' },
    { key: 'sales', label: 'Despesas de vendas', kind: 'minus', group: 'Despesas e resultado operacional', formula: 'Some publicidade, comissões e fretes sobre vendas.' },
    { key: 'research', label: 'Despesas de pesquisa e desenvolvimento', kind: 'minus', group: 'Despesas e resultado operacional', formula: 'Some os gastos de pesquisa e desenvolvimento.' },
    { key: 'admin', label: 'Despesas gerais e administrativas', kind: 'minus', group: 'Despesas e resultado operacional', formula: 'Some as contas administrativas.' },
    { key: 'goodwill', label: 'Perda por redução ao valor recuperável do ágio', kind: 'variable', group: 'Despesas e resultado operacional', formula: 'A perda informada reduz o resultado operacional.' },
    { key: 'otherExpense', label: 'Outras despesas operacionais', kind: 'minus', group: 'Despesas e resultado operacional', formula: 'Some taxas, emolumentos e impostos não recuperáveis.' },
    { key: 'operating', label: 'Resultado operacional', kind: 'subtotal', group: 'Despesas e resultado operacional', formula: 'Lucro bruto + outras receitas − despesas operacionais.' }
  ],
  investment: [
    { key: 'equity', label: 'Resultado de equivalência patrimonial', kind: 'plus', formula: 'Some os resultados de equivalência patrimonial das coligadas.' },
    { key: 'otherInvestment', label: 'Outras receitas e despesas de investimentos', kind: 'variable', formula: 'Some as receitas e subtraia as despesas identificadas com (−).' },
    { key: 'beforeFinance', label: 'Resultado antes do financiamento e tributos', kind: 'subtotal', formula: 'Resultado operacional + resultados de investimentos.' }
  ],
  financing: [
    { key: 'interest', label: 'Despesas de juros com empréstimos e leasings', kind: 'minus', formula: 'Some os juros dos empréstimos e dos arrendamentos.' },
    { key: 'benefit', label: 'Despesas de juros com benefícios a empregados', kind: 'minus', formula: 'Some os juros das obrigações de benefícios aos empregados.' },
    { key: 'beforeTax', label: 'Resultado antes do imposto de renda', kind: 'subtotal', formula: 'Resultado anterior − despesas de juros.' },
    { key: 'tax', label: 'Imposto de renda e contribuição social', kind: 'minus', formula: 'Calcule IR e CSLL separadamente sobre o resultado antes do imposto e some os dois.' }
  ],
  controller: [
    { key: 'discontinued', label: 'Resultado de operações descontinuadas', kind: 'variable', formula: 'Some a receita e subtraia as despesas da unidade descontinuada.' },
    { key: 'final', label: 'Resultado do exercício', kind: 'subtotal', formula: 'Resultado antes do imposto − tributos + operações descontinuadas.' }
  ]
};

export const SOURCE_FIELDS = {
  operational: ['revenue', 'cost', 'otherRevenue', 'sales', 'research', 'admin', 'goodwill', 'otherExpense'],
  investment: ['equity', 'otherInvestment'],
  financing: ['interest', 'benefit'],
  controller: ['discontinued']
};

export const FIELDS = FIELD_DEFINITIONS;
export const EMPTY = () => Object.fromEntries(ROLES.map(role => [role.id, Object.fromEntries(FIELDS[role.id].map(field => [field.key, '']))]));

const sourceCents = items => (items || []).reduce((total, entry) => total + (entry.effect === 'subtract' ? -1 : 1) * Math.round(Number(entry.value) * 100), 0);
const sourceTotal = (sources, role, key) => sourceCents(sources?.[role]?.[key]);
const cents = value => Math.round(Number(value) * 100);

export function createPracticeCase(seed = Date.now(), metadata = null) {
  let state = Number(seed) >>> 0 || 1;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const money = value => Math.round(value * 100) / 100;
  const ratio = (base, min, max) => money(base * (min + random() * (max - min)));
  const one = (label, value, effect) => ({ label, value: Math.max(0.01, money(value)), ...(effect ? { effect } : {}) });
  const split = (total, labels) => {
    const totalCents = Math.max(labels.length, Math.round(total * 100));
    const weights = labels.map(() => 0.35 + random());
    const weightTotal = weights.reduce((sum, value) => sum + value, 0);
    let allocated = 0;
    return labels.map((label, index) => {
      const amount = index === labels.length - 1 ? totalCents - allocated : Math.max(1, Math.round(totalCents * weights[index] / weightTotal));
      allocated += amount;
      return one(label, amount / 100);
    });
  };

  const revenue = money(150_000 + random() * 4_850_000);
  const cost = ratio(revenue, 0.36, 0.56);
  const operational = {
    revenue: split(revenue, ['Venda de mercadorias - loja', 'Venda de mercadorias - canal digital', 'Receita de prestação de serviços']),
    cost: split(cost, ['Custo das mercadorias vendidas', 'Custo dos serviços prestados', 'Materiais aplicados na produção', 'Mão de obra direta', 'Fretes sobre compras']),
    otherRevenue: split(ratio(revenue, 0.004, 0.025), ['Receita operacional acessória', 'Receita de serviços complementares']),
    sales: split(ratio(revenue, 0.025, 0.055), ['Publicidade e propaganda', 'Comissões sobre vendas', 'Fretes sobre vendas']),
    research: split(ratio(revenue, 0.004, 0.018), ['Pesquisa aplicada', 'Desenvolvimento de produto']),
    admin: split(ratio(revenue, 0.035, 0.085), ['Salários e ordenados administrativos', 'Pró-labore', 'Encargos trabalhistas', 'Benefícios aos colaboradores', 'Aluguel', 'Energia, água e esgoto', 'Telefonia, internet e material de escritório', 'Honorários contábeis e serviços de terceiros']),
    goodwill: [one('Perda por redução ao valor recuperável do ágio', ratio(revenue, 0.002, 0.01))],
    otherExpense: split(ratio(revenue, 0.004, 0.018), ['Taxas e emolumentos', 'Impostos não recuperáveis'])
  };
  const operatingResult = sourceCents(operational.revenue) - sourceCents(operational.cost) + sourceCents(operational.otherRevenue) - sourceCents(operational.sales) - sourceCents(operational.research) - sourceCents(operational.admin) - sourceCents(operational.goodwill) - sourceCents(operational.otherExpense);
  const investmentBase = Math.max(1, operatingResult / 100);
  const equity = ratio(investmentBase, 0.01, 0.07);
  const investmentIncome = ratio(investmentBase, 0.01, 0.055);
  const investmentExpense = ratio(investmentIncome, 0.08, 0.28);
  const investment = {
    equity: split(equity, ['Equivalência patrimonial - Coligada A', 'Equivalência patrimonial - Coligada B']),
    otherInvestment: [
      one('Receita de aluguel de propriedade de investimento', investmentIncome * 0.62),
      one('Rendimento de ativo financeiro', investmentIncome * 0.38),
      one('Perda na remensuração de investimento', investmentExpense, 'subtract')
    ]
  };
  const beforeFinance = operatingResult + sourceCents(investment.equity) + sourceCents(investment.otherInvestment);
  const financing = {
    interest: split(ratio(beforeFinance / 100, 0.11, 0.25), ['Juros de empréstimos', 'Juros de arrendamentos e leasings']),
    benefit: split(ratio(beforeFinance / 100, 0.003, 0.02), ['Juros sobre benefício pós-emprego', 'Juros sobre obrigação atuarial'])
  };
  const beforeTax = beforeFinance - sourceCents(financing.interest) - sourceCents(financing.benefit);
  const discontinuedRevenue = ratio(beforeTax / 100, 0.01, 0.03);
  const discontinuedExpense = ratio(discontinuedRevenue, 0.35, 0.8);
  const controller = {
    discontinued: [
      one('Receita da unidade descontinuada', discontinuedRevenue),
      one('Despesas da unidade descontinuada', discontinuedExpense, 'subtract')
    ]
  };
  const taxRates = seed % 2 ? { ir: 15, csll: 9 } : { ir: 11, csll: 8 };
  return { sources: { operational, investment, financing, controller }, taxRates, metadata };
}

function normalizedTaxRates(value) {
  const rate = (raw, fallback) => {
    const number = Number(raw);
    return Number.isFinite(number) && number > 0 && number <= 40 ? Math.round(number * 100) / 100 : fallback;
  };
  return { ir: rate(value?.ir, CASE.taxRates.ir), csll: rate(value?.csll, CASE.taxRates.csll) };
}

function legacySourceGroup(role, key, legacy) {
  const template = CASE.sources[role]?.[key] || [];
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
  result[index].value = Math.max(0.01, Math.round(cents(result[index].value) + delta) / 100);
  return result;
}

export function normalizeCaseData(data = CASE) {
  if (data?.sources && typeof data.sources === 'object') {
    const sources = Object.fromEntries(Object.entries(SOURCE_FIELDS).map(([role, keys]) => [role,
      Object.fromEntries(keys.map(key => {
        const template = CASE.sources[role]?.[key] || [];
        const received = data.sources?.[role]?.[key];
        const entries = Array.isArray(received) && received.length ? received : template;
        return [key, entries.map((entry, index) => {
          const value = Number(entry?.value);
          return {
            label: String(entry?.label || template[index]?.label || `Conta ${index + 1}`).slice(0, 100),
            value: Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : Number(template[index]?.value || 0.01),
            ...(entry?.effect === 'subtract' ? { effect: 'subtract' } : {})
          };
        })];
      }))
    ]));
    return { sources, taxRates: normalizedTaxRates(data.taxRates), metadata: data.metadata || null };
  }
  const legacy = data || {};
  const sources = Object.fromEntries(Object.entries(SOURCE_FIELDS).map(([role, keys]) => [role,
    Object.fromEntries(keys.map(key => [key, legacySourceGroup(role, key, legacy)]))
  ]));
  return { sources, taxRates: normalizedTaxRates(legacy.taxRates), metadata: legacy.metadata || null };
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

export const formatMoney = amount => amount === null || amount === undefined ? '—' : (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function answers(caseData = CASE) {
  const normalized = normalizeCaseData(caseData);
  const { sources, taxRates } = normalized;
  const operational = Object.fromEntries(SOURCE_FIELDS.operational.map(key => [key, sourceTotal(sources, 'operational', key)]));
  operational.gross = operational.revenue - operational.cost;
  operational.operating = operational.gross + operational.otherRevenue - operational.sales - operational.research - operational.admin - operational.goodwill - operational.otherExpense;

  const investment = Object.fromEntries(SOURCE_FIELDS.investment.map(key => [key, sourceTotal(sources, 'investment', key)]));
  investment.beforeFinance = operational.operating + investment.equity + investment.otherInvestment;

  const financing = Object.fromEntries(SOURCE_FIELDS.financing.map(key => [key, sourceTotal(sources, 'financing', key)]));
  financing.beforeTax = investment.beforeFinance - financing.interest - financing.benefit;
  financing.tax = Math.round(financing.beforeTax * taxRates.ir / 100) + Math.round(financing.beforeTax * taxRates.csll / 100);

  const controller = { discontinued: sourceTotal(sources, 'controller', 'discontinued') };
  controller.final = financing.beforeTax - financing.tax + controller.discontinued;
  return { operational, investment, financing, controller };
}

export function grade(role, fields, caseData = CASE, reportedFields = null) {
  const sourceExpected = answers(caseData)[role];
  if (!sourceExpected) throw new Error('Área inválida');
  const expected = { ...sourceExpected };
  if (role === 'controller') {
    const beforeTax = normalizeMoney(reportedFields?.financing?.beforeTax);
    const tax = normalizeMoney(reportedFields?.financing?.tax);
    const discontinued = normalizeMoney(fields?.discontinued);
    expected.final = beforeTax === null || tax === null || discontinued === null ? Number.NaN : beforeTax - tax + discontinued;
  }
  const result = Object.fromEntries(Object.keys(expected).map(key => [key, normalizeMoney(fields?.[key]) === expected[key]]));
  return { fields: result, correct: Object.values(result).every(Boolean), count: Object.values(result).filter(Boolean).length, total: Object.keys(result).length };
}
