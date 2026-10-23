export const CASE_VERSION = 3;

export const ROLES = [
  { id: 'operational', name: 'Operacional', people: '2 gerentes', number: '01', points: '1 ponto da área' },
  { id: 'investment', name: 'Investimento', people: '1 gerente', number: '02', points: '1 ponto da área' },
  { id: 'financing', name: 'Financiamento e tributos', people: '1 gerente', number: '03', points: '1 ponto da área' },
  { id: 'controller', name: 'Controller', people: 'fechamento', number: '04', points: 'fecha a DRE' }
];

const field = (key, label, kind, formula, group, display = 'normal') => ({ key, label, kind, formula, group, display });

export const FIELD_DEFINITIONS = {
  operational: [
    field('grossRevenue', 'Receita bruta de vendas e serviços', 'input', 'Some as vendas de cada canal e as receitas de prestação de serviços.', 'Receita e formação do resultado operacional', 'add'),
    field('deductions', 'Deduções da receita bruta', 'input', 'Some os tributos sobre vendas, devoluções e descontos incondicionais. Registre o total positivo; a DRE o apresenta como dedução.', 'Receita e formação do resultado operacional', 'subtract'),
    field('netRevenue', 'Receita líquida de vendas', 'subtotal', 'Receita bruta − deduções.', 'Receita e formação do resultado operacional', 'total'),
    field('otherOperatingRevenue', 'Outras receitas operacionais', 'input', 'Some as receitas ligadas à operação que não são vendas principais.', 'Receita e formação do resultado operacional', 'add'),
    field('materialsConsumption', 'Consumo de matérias-primas e materiais', 'input', 'Estoque inicial + compras − estoque final. Some materiais e componentes usados na operação.', 'Gastos operacionais por natureza', 'subtract'),
    field('inventoryVariation', 'Variação positiva ou negativa nos estoques', 'input', 'Estoque final − estoque inicial. Aumento de estoque é positivo; redução é negativa.', 'Gastos operacionais por natureza', 'signed'),
    field('employeeExpenses', 'Despesas com salários e benefícios', 'input', 'Some salários, encargos e benefícios do período.', 'Gastos operacionais por natureza', 'subtract'),
    field('depreciation', 'Despesas de depreciação', 'input', 'Some a depreciação dos bens usados na operação.', 'Gastos operacionais por natureza', 'subtract'),
    field('amortization', 'Despesas de amortização', 'input', 'Some a amortização de licenças, sistemas e outros intangíveis.', 'Gastos operacionais por natureza', 'subtract'),
    field('researchDevelopment', 'Despesas de pesquisa e desenvolvimento', 'input', 'Some os gastos do período com pesquisa e desenvolvimento reconhecidos como despesa.', 'Gastos operacionais por natureza', 'subtract'),
    field('marketing', 'Despesas de marketing e vendas', 'input', 'Some propaganda, comissões e ações comerciais do período.', 'Gastos operacionais por natureza', 'subtract'),
    field('impairment', 'Perdas por redução ao valor recuperável', 'input', 'Some as perdas de impairment. Se houver reversão, considere-a como valor negativo.', 'Gastos operacionais por natureza', 'signedSubtract'),
    field('otherOperatingExpenses', 'Outras despesas operacionais', 'input', 'Some os demais gastos ligados à operação, sem repetir valores já classificados acima.', 'Gastos operacionais por natureza', 'subtract'),
    field('operatingProfit', 'Lucro ou prejuízo operacional', 'subtotal', 'Receita líquida + outras receitas − gastos operacionais + variação nos estoques.', 'Fechamento operacional', 'total')
  ],
  investment: [
    field('equity', 'Resultado de equivalência patrimonial', 'input', 'Some os resultados de coligadas e empreendimentos em conjunto (joint ventures), preservando os sinais.', 'Investimentos', 'signed'),
    field('otherInvestment', 'Outras receitas e despesas de investimentos', 'input', 'Some aluguéis de propriedades para investimento, rendimentos de ativos, dividendos e variações a valor justo; subtraia as perdas.', 'Investimentos', 'signed'),
    field('beforeFinancingTaxes', 'Resultado antes de financiamento e tributos sobre o lucro', 'subtotal', 'Resultado operacional + resultados de investimentos.', 'Fechamento de investimentos', 'total')
  ],
  financing: [
    field('interestBorrowingsLeases', 'Juros de empréstimos, financiamentos e arrendamentos', 'input', 'Some os juros dos passivos usados para captar recursos e dos arrendamentos.', 'Financiamento', 'subtract'),
    field('interestEmployeeBenefits', 'Juros de benefícios a empregados', 'input', 'Some os juros das obrigações de benefícios a empregados informados no relatório.', 'Financiamento', 'subtract'),
    field('fxFinancing', 'Variação cambial sobre financiamentos', 'input', 'Ganho cambial é positivo; perda cambial é negativa.', 'Financiamento', 'signed'),
    field('provisionExpense', 'Despesas relacionadas a provisões', 'input', 'Registre a despesa como positiva e uma reversão como negativa.', 'Financiamento', 'signedSubtract'),
    field('beforeTax', 'Resultado antes do IR e da CSLL', 'subtotal', 'Resultado antes de financiamento e tributos − juros + ganhos cambiais − despesas com provisões.', 'Fechamento do financiamento', 'total'),
    field('incomeTaxContinuing', 'IR das operações continuadas', 'input', 'Resultado antes dos tributos × alíquota de IR indicada no caso.', 'IR e CSLL das operações continuadas', 'subtract'),
    field('socialContributionContinuing', 'CSLL das operações continuadas', 'input', 'Resultado antes dos tributos × alíquota de CSLL indicada no caso.', 'IR e CSLL das operações continuadas', 'subtract'),
    field('taxContinuing', 'Total de IR e CSLL das operações continuadas', 'subtotal', 'Some o IR e a CSLL calculados separadamente acima; a DRE apresenta o total.', 'IR e CSLL das operações continuadas', 'subtract'),
    field('afterTaxContinuing', 'Resultado líquido das operações continuadas', 'subtotal', 'Resultado antes do IR e da CSLL − IR e CSLL das operações continuadas.', 'Tributos sobre o lucro', 'total'),
    field('discontinuedBeforeTax', 'Resultado antes dos tributos da unidade descontinuada', 'subtotal', 'Receitas da unidade descontinuada - despesas da unidade descontinuada.', 'IR e CSLL da operação descontinuada', 'total'),
    field('incomeTaxDiscontinued', 'IR da operação descontinuada', 'input', 'Resultado antes dos tributos da unidade × alíquota de IR indicada no caso.', 'IR e CSLL da operação descontinuada', 'subtract'),
    field('socialContributionDiscontinued', 'CSLL da operação descontinuada', 'input', 'Resultado antes dos tributos da unidade × alíquota de CSLL indicada no caso.', 'IR e CSLL da operação descontinuada', 'subtract'),
    field('taxDiscontinued', 'Total de IR e CSLL da operação descontinuada', 'subtotal', 'Some o IR e a CSLL calculados separadamente; informe o total ao controller.', 'IR e CSLL da operação descontinuada', 'subtract')
  ],
  controller: [
    field('discontinuedRevenue', 'Receitas da unidade descontinuada', 'input', 'Some as receitas detalhadas dessa unidade.', 'Operações descontinuadas', 'add'),
    field('discontinuedExpenses', 'Despesas da unidade descontinuada', 'input', 'Some os custos e despesas detalhados dessa unidade.', 'Operações descontinuadas', 'subtract'),
    field('discontinued', 'Resultado líquido das operações descontinuadas', 'subtotal', 'Receitas − despesas − IR e CSLL atribuídos à unidade, usando o valor informado pelo gerente de financiamento.', 'Operações descontinuadas', 'signed'),
    field('final', 'Lucro líquido do exercício', 'subtotal', 'Resultado líquido das operações continuadas + resultado líquido das operações descontinuadas.', 'Fechamento do controller', 'total')
  ]
};

export const FIELDS = FIELD_DEFINITIONS;

export const SOURCE_FIELDS = {
  operational: ['grossRevenue', 'deductions', 'otherOperatingRevenue', 'materialsConsumption', 'inventoryVariation', 'employeeExpenses', 'depreciation', 'amortization', 'researchDevelopment', 'marketing', 'impairment', 'otherOperatingExpenses'],
  investment: ['equity', 'otherInvestment'],
  financing: ['interestBorrowingsLeases', 'interestEmployeeBenefits', 'fxFinancing', 'provisionExpense'],
  controller: ['discontinuedRevenue', 'discontinuedExpenses']
};

export const EMPTY = () => Object.fromEntries(ROLES.map(role => [role.id, Object.fromEntries(FIELDS[role.id].map(item => [item.key, '']))]));
export const EMPTY_SCRATCH = () => ({ operational: '', investment: '', financing: '' });

const money = value => Math.round(Number(value) * 100) / 100;
const cents = value => Math.round(Number(value) * 100);
const groupCents = entries => (entries || []).reduce((total, entry) => total + (entry.effect === 'subtract' ? -1 : 1) * cents(entry.value), 0);
const groupTotal = (sources, role, key) => groupCents(sources?.[role]?.[key]);
const asMoney = value => value / 100;
const entry = (label, value, effect) => ({ label, value: Math.max(0.01, money(value)), ...(effect ? { effect } : {}) });

function split(total, labels, random) {
  const totalCents = Math.max(labels.length, cents(total));
  const weights = labels.map(() => 0.4 + random());
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  let allocated = 0;
  return labels.map((label, index) => {
    const left = labels.length - index - 1;
    const amount = index === labels.length - 1
      ? totalCents - allocated
      : Math.min(totalCents - allocated - left, Math.max(1, Math.round(totalCents * weights[index] / weightSum)));
    allocated += amount;
    return entry(label, amount / 100);
  });
}

function taxParts(baseCents, rates) {
  return {
    incomeTax: Math.round(baseCents * rates.ir / 100),
    socialContribution: Math.round(baseCents * rates.csll / 100)
  };
}

function calculatedTax(baseCents, rates) {
  const parts = taxParts(baseCents, rates);
  return parts.incomeTax + parts.socialContribution;
}

export function createPracticeCase(seed = Date.now(), metadata = null) {
  let state = (Number(seed) >>> 0) || 1;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const amount = (base, min, max) => money(base * (min + random() * (max - min)));
  const revenue = money(260_000 + random() * 3_740_000);
  const deductions = amount(revenue, 0.075, 0.13);
  const netRevenue = revenue - deductions;
  const materialUse = amount(netRevenue, 0.30, 0.38);
  const materialOpening = amount(netRevenue, 0.09, 0.14);
  const materialClosing = amount(netRevenue, 0.07, 0.12);
  const materialPurchases = money(materialUse - materialOpening + materialClosing);
  const stockChange = amount(netRevenue, 0.012, 0.032);
  const stockOpening = amount(netRevenue, 0.035, 0.06);
  const stockClosing = money(stockOpening + stockChange);

  const operational = {
    grossRevenue: split(revenue, ['Vendas de produtos no canal físico', 'Vendas no canal digital', 'Receitas de prestação de serviços'], random),
    deductions: split(deductions, ['Tributos incidentes sobre vendas', 'Devoluções de vendas', 'Descontos incondicionais concedidos'], random),
    otherOperatingRevenue: split(amount(netRevenue, 0.006, 0.018), ['Recuperação de crédito operacional', 'Receita acessória da operação'], random),
    materialsConsumption: [
      entry('Estoque inicial de matérias-primas e materiais', materialOpening),
      entry('Compras de matérias-primas e materiais', materialPurchases),
      entry('Estoque final de matérias-primas e materiais', materialClosing, 'subtract')
    ],
    inventoryVariation: [
      entry('Estoque final de produtos acabados e em elaboração', stockClosing),
      entry('Estoque inicial de produtos acabados e em elaboração', stockOpening, 'subtract')
    ],
    employeeExpenses: split(amount(netRevenue, 0.105, 0.155), ['Salários da equipe operacional', 'Encargos sociais', 'Benefícios dos colaboradores'], random),
    depreciation: split(amount(netRevenue, 0.014, 0.031), ['Depreciação de máquinas e equipamentos', 'Depreciação de veículos e instalações'], random),
    amortization: split(amount(netRevenue, 0.004, 0.013), ['Amortização de sistemas e licenças', 'Amortização de outros intangíveis'], random),
    researchDevelopment: split(amount(netRevenue, 0.008, 0.022), ['Pesquisa aplicada', 'Desenvolvimento de novos produtos'], random),
    marketing: split(amount(netRevenue, 0.021, 0.048), ['Publicidade e propaganda', 'Comissões e ações comerciais'], random),
    impairment: [entry('Perda por redução ao valor recuperável do ágio', amount(netRevenue, 0.003, 0.012))],
    otherOperatingExpenses: split(amount(netRevenue, 0.026, 0.052), ['Aluguel, energia e serviços da operação', 'Fretes e logística de vendas', 'Serviços profissionais e taxas operacionais'], random)
  };

  const preliminaryOperating = groupTotal({ operational }, 'operational', 'grossRevenue')
    - groupTotal({ operational }, 'operational', 'deductions')
    + groupTotal({ operational }, 'operational', 'otherOperatingRevenue')
    - groupTotal({ operational }, 'operational', 'materialsConsumption')
    + groupTotal({ operational }, 'operational', 'inventoryVariation')
    - groupTotal({ operational }, 'operational', 'employeeExpenses')
    - groupTotal({ operational }, 'operational', 'depreciation')
    - groupTotal({ operational }, 'operational', 'amortization')
    - groupTotal({ operational }, 'operational', 'researchDevelopment')
    - groupTotal({ operational }, 'operational', 'marketing')
    - groupTotal({ operational }, 'operational', 'impairment')
    - groupTotal({ operational }, 'operational', 'otherOperatingExpenses');
  const operatingCents = preliminaryOperating;
  const operating = asMoney(operatingCents);
  const investmentIncome = amount(operating, 0.035, 0.075);
  const investmentLoss = amount(investmentIncome, 0.08, 0.19);
  const investment = {
    equity: [
      entry('Resultado de equivalência patrimonial - coligada', amount(operating, 0.018, 0.045)),
      entry('Resultado de equivalência patrimonial - joint venture', amount(operating, 0.006, 0.025))
    ],
    otherInvestment: [
      entry('Receita de aluguel de propriedade para investimento', investmentIncome * 0.24),
      entry('Rendimentos de ativos financeiros', investmentIncome * 0.27),
      entry('Rendimentos de caixa e equivalentes de caixa', investmentIncome * 0.16),
      entry('Receita de dividendos', investmentIncome * 0.18),
      entry('Ganho em variação a valor justo de investimento', investmentIncome * 0.15),
      entry('Perda em variação a valor justo de investimento', investmentLoss, 'subtract')
    ]
  };
  const beforeFinancing = operatingCents + groupTotal({ investment }, 'investment', 'equity') + groupTotal({ investment }, 'investment', 'otherInvestment');
  const beforeFinancingAmount = asMoney(beforeFinancing);
  const fxValue = amount(beforeFinancingAmount, 0.004, 0.016);
  const fxIsLoss = random() < 0.5;
  const fxEntry = entry(fxIsLoss ? 'Perda cambial sobre financiamento' : 'Ganho cambial sobre financiamento', fxValue, fxIsLoss ? 'subtract' : undefined);
  const provisionExpense = amount(beforeFinancingAmount, 0.009, 0.024);
  const financing = {
    interestBorrowingsLeases: split(amount(beforeFinancingAmount, 0.075, 0.145), ['Juros de empréstimos e financiamentos', 'Juros de passivos de arrendamento'], random),
    interestEmployeeBenefits: split(amount(beforeFinancingAmount, 0.004, 0.016), ['Juros de benefícios pós-emprego', 'Atualização financeira de obrigação a empregados'], random),
    fxFinancing: [fxEntry],
    provisionExpense: [
      entry('Despesa de atualização de provisões', provisionExpense * 0.63),
      entry('Despesa de provisão para obrigação operacional', provisionExpense * 0.37)
    ]
  };
  const beforeTax = beforeFinancing
    - groupTotal({ financing }, 'financing', 'interestBorrowingsLeases')
    - groupTotal({ financing }, 'financing', 'interestEmployeeBenefits')
    + groupTotal({ financing }, 'financing', 'fxFinancing')
    - groupTotal({ financing }, 'financing', 'provisionExpense');
  const taxRates = seed % 2 ? { ir: 15, csll: 9 } : { ir: 11, csll: 8 };
  const taxContinuing = calculatedTax(beforeTax, taxRates);
  const discontinuedRevenue = amount(asMoney(beforeTax), 0.035, 0.07);
  const discontinuedExpenses = money(discontinuedRevenue * (0.48 + random() * 0.17));
  const discontinuedPreTax = cents(discontinuedRevenue) - cents(discontinuedExpenses);
  const taxDiscontinued = calculatedTax(discontinuedPreTax, taxRates);
  const controller = {
    discontinuedRevenue: split(discontinuedRevenue, ['Receita de vendas da unidade encerrada', 'Outras receitas da unidade encerrada'], random),
    discontinuedExpenses: split(discontinuedExpenses, ['Custos da unidade encerrada', 'Despesas de encerramento e operação'], random)
  };

  const defaultMetadata = { company: 'Companhia Horizonte', sector: 'Comércio e manufatura', context: 'A companhia vende produtos próprios em canais físico e digital, presta serviços complementares e encerrou uma linha de negócio no período.', source: 'automático' };
  return {
    schemaVersion: CASE_VERSION,
    sources: { operational, investment, financing, controller },
    taxRates,
    taxDiscontinuedCents: taxDiscontinued,
    metadata: { ...defaultMetadata, ...(metadata || {}), schemaVersion: CASE_VERSION }
  };
}

export const CASE = createPracticeCase(20261023, {
  company: 'Companhia Horizonte',
  sector: 'Comércio e manufatura',
  context: 'A companhia vende produtos próprios em canais físico e digital, presta serviços complementares e encerrou uma linha de negócio no período.',
  source: 'caso de demonstração'
});

function normalizedTaxRates(value) {
  const rate = (raw, fallback) => {
    const number = Number(raw);
    return Number.isFinite(number) && number >= 0 && number <= 40 ? Math.round(number * 100) / 100 : fallback;
  };
  return { ir: rate(value?.ir, CASE.taxRates.ir), csll: rate(value?.csll, CASE.taxRates.csll) };
}

export function normalizeCaseData(data = CASE) {
  if (!data || data.schemaVersion !== CASE_VERSION || !data.sources) return CASE;
  const sources = Object.fromEntries(Object.entries(SOURCE_FIELDS).map(([role, keys]) => [role,
    Object.fromEntries(keys.map(key => {
      const template = CASE.sources[role]?.[key] || [];
      const received = data.sources?.[role]?.[key];
      const items = Array.isArray(received) && received.length ? received : template;
      return [key, items.map((value, index) => {
        const amount = Number(value?.value);
        return {
          label: String(value?.label || template[index]?.label || `Conta ${index + 1}`).slice(0, 100),
          value: Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : Number(template[index]?.value || 0.01),
          ...(value?.effect === 'subtract' ? { effect: 'subtract' } : {})
        };
      })];
    }))
  ]));
  const rates = normalizedTaxRates(data.taxRates);
  const discontinuedBeforeTax = groupTotal(sources, 'controller', 'discontinuedRevenue') - groupTotal(sources, 'controller', 'discontinuedExpenses');
  const taxDiscontinuedCents = calculatedTax(discontinuedBeforeTax, rates);
  return { schemaVersion: CASE_VERSION, sources, taxRates: rates, taxDiscontinuedCents, metadata: data.metadata || null };
}

export const normalizeMoney = input => {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null;
  if (typeof input !== 'string') return null;
  const clean = input.trim().replace(/\s|R\$/gi, '');
  if (!clean || !/^-?[\d.,]+$/.test(clean)) return null;
  let normalized = clean;
  if (clean.includes(',') && clean.includes('.')) normalized = clean.replace(/\./g, '').replace(',', '.');
  else if (clean.includes(',')) normalized = clean.replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(clean)) normalized = clean.replace(/\./g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
};

export const formatMoney = amount => amount === null || amount === undefined
  ? '—'
  : (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function answers(caseData = CASE) {
  const normalized = normalizeCaseData(caseData);
  const { sources, taxRates } = normalized;
  const operational = Object.fromEntries(SOURCE_FIELDS.operational.map(key => [key, groupTotal(sources, 'operational', key)]));
  operational.netRevenue = operational.grossRevenue - operational.deductions;
  operational.operatingProfit = operational.netRevenue
    + operational.otherOperatingRevenue
    - operational.materialsConsumption
    + operational.inventoryVariation
    - operational.employeeExpenses
    - operational.depreciation
    - operational.amortization
    - operational.researchDevelopment
    - operational.marketing
    - operational.impairment
    - operational.otherOperatingExpenses;

  const investment = Object.fromEntries(SOURCE_FIELDS.investment.map(key => [key, groupTotal(sources, 'investment', key)]));
  investment.beforeFinancingTaxes = operational.operatingProfit + investment.equity + investment.otherInvestment;

  const financing = Object.fromEntries(SOURCE_FIELDS.financing.map(key => [key, groupTotal(sources, 'financing', key)]));
  financing.beforeTax = investment.beforeFinancingTaxes
    - financing.interestBorrowingsLeases
    - financing.interestEmployeeBenefits
    + financing.fxFinancing
    - financing.provisionExpense;
  const continuingTax = taxParts(financing.beforeTax, taxRates);
  financing.incomeTaxContinuing = continuingTax.incomeTax;
  financing.socialContributionContinuing = continuingTax.socialContribution;
  financing.taxContinuing = continuingTax.incomeTax + continuingTax.socialContribution;
  financing.afterTaxContinuing = financing.beforeTax - financing.taxContinuing;

  const controller = Object.fromEntries(SOURCE_FIELDS.controller.map(key => [key, groupTotal(sources, 'controller', key)]));
  financing.discontinuedBeforeTax = controller.discontinuedRevenue - controller.discontinuedExpenses;
  const discontinuedTax = taxParts(financing.discontinuedBeforeTax, taxRates);
  financing.incomeTaxDiscontinued = discontinuedTax.incomeTax;
  financing.socialContributionDiscontinued = discontinuedTax.socialContribution;
  financing.taxDiscontinued = discontinuedTax.incomeTax + discontinuedTax.socialContribution;
  controller.discontinued = controller.discontinuedRevenue - controller.discontinuedExpenses - financing.taxDiscontinued;
  controller.final = financing.afterTaxContinuing + controller.discontinued;
  return { operational, investment, financing, controller };
}

export function grade(role, values, caseData = CASE, reportedFields = null) {
  const solution = answers(caseData)[role];
  if (!solution) throw new Error('Área inválida');
  const expected = { ...solution };
  if (role === 'controller') {
    const reportedTax = normalizeMoney(reportedFields?.financing?.taxDiscontinued);
    const reportedContinuing = normalizeMoney(reportedFields?.financing?.afterTaxContinuing);
    expected.discontinued = reportedTax === null
      ? Number.NaN
      : solution.discontinuedRevenue - solution.discontinuedExpenses - reportedTax;
    expected.final = reportedContinuing === null
      ? Number.NaN
      : reportedContinuing + expected.discontinued;
  }
  const checked = Object.fromEntries(Object.keys(expected).map(key => [key, normalizeMoney(values?.[key]) === expected[key]]));
  return { fields: checked, correct: Object.values(checked).every(Boolean), count: Object.values(checked).filter(Boolean).length, total: Object.keys(checked).length };
}
