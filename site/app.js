import { CASE, ROLES, FIELDS, EMPTY, EMPTY_SCRATCH, formatMoney, normalizeMoney, normalizeCaseData, grade } from './core.js';

const api = String(window.DRE_API_URL || '').replace(/\/$/, '');
const requestedRoom = new URLSearchParams(location.search).get('sala');
const room = requestedRoom?.match(/^[A-Z0-9]{8,12}$/i)?.[0].toUpperCase() || makeRoom();
const roleFromUrl = location.hash.slice(1);
let active = ROLES.some(role => role.id === roleFromUrl) ? roleFromUrl : 'operational';
let state = { fields: EMPTY(), caseData: normalizeCaseData(CASE), scratch: EMPTY_SCRATCH(), checked: {}, updatedAt: null, revision: 0 };
const pendingFields = new Set();
const pendingScratch = new Set();
const fieldTimers = new Map();
const scratchTimers = new Map();
let saving = Promise.resolve();
let remoteError = false;
const channel = !api && 'BroadcastChannel' in window ? new BroadcastChannel(`dre-${room}`) : null;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const show = message => { $('toast').textContent = message; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 2800); };
const MANAGER_ROLES = ['operational', 'investment', 'financing'];

function makeRoom() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, byte => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte % 32]).join('') + 'DRE';
}
if (requestedRoom !== room) history.replaceState(null, '', `?sala=${room}${location.hash}`);
$('room-code').textContent = room;

const ROLE_GROUPS = {
  operational: [
    { title: 'Gerente operacional 1 · Receita, materiais e estoques', keys: ['grossRevenue', 'deductions', 'netRevenue', 'materialsConsumption', 'inventoryVariation'] },
    { title: 'Gerente operacional 2 · Demais gastos e lucro operacional', keys: ['otherOperatingRevenue', 'employeeExpenses', 'depreciation', 'amortization', 'researchDevelopment', 'marketing', 'impairment', 'otherOperatingExpenses', 'operatingProfit'] }
  ],
  investment: [{ title: 'Categoria de investimentos', keys: ['equity', 'otherInvestment', 'beforeFinancingTaxes'] }],
  financing: [
    { title: 'Categoria de financiamento', keys: ['interestBorrowingsLeases', 'interestEmployeeBenefits', 'fxFinancing', 'provisionExpense', 'beforeTax'] },
    { title: 'IR e CSLL das operações continuadas', keys: ['incomeTaxContinuing', 'socialContributionContinuing', 'taxContinuing', 'afterTaxContinuing'] },
    { title: 'IR e CSLL da operação descontinuada', keys: ['discontinuedBeforeTax', 'incomeTaxDiscontinued', 'socialContributionDiscontinued', 'taxDiscontinued'] }
  ],
  controller: [{ title: 'Operações descontinuadas e fechamento final', keys: ['discontinuedRevenue', 'discontinuedExpenses', 'discontinued', 'final'] }]
};

const DRE_LINES = [
  { label: 'Receita bruta de vendas e serviços', role: 'operational', key: 'grossRevenue', display: 'add' },
  { label: '(−) Deduções da receita bruta', role: 'operational', key: 'deductions', display: 'subtract' },
  { label: '= Receita líquida de vendas', role: 'operational', key: 'netRevenue', display: 'total' },
  { label: '(+) Outras receitas operacionais', role: 'operational', key: 'otherOperatingRevenue', display: 'add' },
  { label: '(−) Consumo de matérias-primas e materiais', role: 'operational', key: 'materialsConsumption', display: 'subtract' },
  { label: '(+/−) Variação nos estoques', role: 'operational', key: 'inventoryVariation', display: 'signed' },
  { label: '(−) Despesas com salários e benefícios', role: 'operational', key: 'employeeExpenses', display: 'subtract' },
  { label: '(−) Despesas de depreciação', role: 'operational', key: 'depreciation', display: 'subtract' },
  { label: '(−) Despesas de amortização', role: 'operational', key: 'amortization', display: 'subtract' },
  { label: '(−) Despesas de pesquisa e desenvolvimento', role: 'operational', key: 'researchDevelopment', display: 'subtract' },
  { label: '(−) Despesas de marketing e vendas', role: 'operational', key: 'marketing', display: 'subtract' },
  { label: '(+/−) Perdas por redução ao valor recuperável', role: 'operational', key: 'impairment', display: 'signedSubtract' },
  { label: '(−) Outras despesas operacionais', role: 'operational', key: 'otherOperatingExpenses', display: 'subtract' },
  { label: '= Lucro ou prejuízo operacional', role: 'operational', key: 'operatingProfit', display: 'total' },
  { label: '(+/−) Resultado de equivalência patrimonial', role: 'investment', key: 'equity', display: 'signed' },
  { label: '(+/−) Outras receitas e despesas de investimentos', role: 'investment', key: 'otherInvestment', display: 'signed' },
  { label: '= Resultado antes de financiamento e tributos sobre o lucro', role: 'investment', key: 'beforeFinancingTaxes', display: 'total' },
  { label: '(−) Juros de empréstimos, financiamentos e arrendamentos', role: 'financing', key: 'interestBorrowingsLeases', display: 'subtract' },
  { label: '(−) Juros de benefícios a empregados', role: 'financing', key: 'interestEmployeeBenefits', display: 'subtract' },
  { label: '(+/−) Variação cambial sobre financiamentos', role: 'financing', key: 'fxFinancing', display: 'signed' },
  { label: '(+/−) Despesas relacionadas a provisões', role: 'financing', key: 'provisionExpense', display: 'signedSubtract' },
  { label: '= Resultado antes do IR e da CSLL', role: 'financing', key: 'beforeTax', display: 'total' },
  { label: '(−) IR e CSLL das operações continuadas', role: 'financing', key: 'taxContinuing', display: 'subtract' },
  { label: '= Resultado líquido das operações continuadas', role: 'financing', key: 'afterTaxContinuing', display: 'total' },
  { label: '(+/−) Resultado líquido das operações descontinuadas', role: 'controller', key: 'discontinued', display: 'signed' },
  { label: '= Lucro líquido do exercício', role: 'controller', key: 'final', display: 'total', final: true }
];

const HELP = {
  operational: [
    ['Dividam a mesma folha operacional', 'Os dois gerentes compartilham esta aba e uma folha de rascunho. O gerente 1 apura receita bruta, deduções, receita líquida, consumo de materiais e variação nos estoques. O gerente 2 apura as demais receitas e despesas e fecha o lucro operacional. A área operacional vale 1 ponto.'],
    ['Apurem receita bruta e líquida', 'Somem cada conta de vendas e serviços para chegar à receita bruta. Depois somem tributos sobre vendas, devoluções e descontos e subtraiam esse total para encontrar a receita líquida. Nenhum subtotal vem pronto.'],
    ['Calculem consumo e variação de estoques', 'Consumo de materiais = estoque inicial + compras − estoque final. Variação nos estoques = estoque final − estoque inicial: aumento é positivo e redução é negativa.'],
    ['Separem gastos por natureza', 'Salários e benefícios, depreciação, amortização, pesquisa, marketing, impairment e demais gastos são linhas separadas. Gastos diretamente ligados à produção entram no consumo de materiais; administração e manutenção entram nas despesas operacionais.'],
    ['Fechem o lucro operacional', 'Partam da receita líquida, adicionem outras receitas, subtraiam gastos operacionais e adicionem a variação positiva dos estoques. Registre despesas como valores positivos; a DRE mostra as deduções entre parênteses.']
  ],
  investment: [
    ['Classifique os retornos de investimento', 'O caso considera uma empresa de comércio e manufatura, sem investimento ou financiamento a clientes como atividade principal. Ativos que geram retorno individual e em grande parte independente entram na categoria de investimentos.'],
    ['Some a equivalência patrimonial', 'Some os resultados das coligadas e joint ventures, mantendo o sinal de cada resultado. Ganho é positivo e perda é negativa.'],
    ['Apure as demais receitas e despesas', 'Some aluguel de propriedades para investimento, rendimentos de ativos financeiros e de caixa, dividendos e variações a valor justo. Subtraia perdas indicadas com (−).'],
    ['Calcule o resultado antes de financiamento e tributos', 'Some o lucro operacional aos resultados de equivalência patrimonial e às demais receitas e despesas de investimento.']
  ],
  financing: [
    ['Some os encargos de financiamento', 'Some juros de empréstimos, financiamentos e arrendamentos. Some à parte os juros de benefícios a empregados.'],
    ['Registre efeitos com o sinal correto', 'Ganho cambial é positivo e perda cambial é negativa. Despesa de provisão é positiva para ser subtraída; reversão é negativa.'],
    ['Calcule o resultado antes de IR e CSLL', 'Parta do resultado antes de financiamento e tributos. Subtraia os juros e as despesas de provisões e some ganhos cambiais (ou subtraia perdas).'],
    ['Calcule IR e CSLL das operações continuadas', 'Aplique a alíquota de IR e a alíquota de CSLL, cada uma em seu próprio campo, sobre o resultado antes dos tributos. Some os dois valores para preencher o total que aparece na DRE. O exercício usa uma premissa simplificada, sem ajustes fiscais.'],
    ['Calcule os tributos da operação descontinuada', 'Some as receitas da unidade encerrada e subtraia os custos e despesas para chegar ao resultado antes dos tributos. Calcule IR e CSLL separadamente sobre essa base e some os dois valores. Informe o total ao controller, que apresentará a operação líquida de tributos.']
  ],
  controller: [
    ['Feche a operação descontinuada', 'Some as receitas da unidade encerrada e suas despesas. Subtraia o IR e a CSLL atribuídos a ela, informados pelo gerente de financiamento.'],
    ['Some o resultado do exercício', 'Adicione o resultado líquido das operações continuadas informado pelo gerente de financiamento ao resultado líquido das operações descontinuadas.'],
    ['Não altere os relatórios dos gerentes', 'Use os valores que os gerentes registraram. O controller fecha a soma final, sem corrigir a apuração operacional, de investimento ou de financiamento.'],
    ['Acompanhe a avaliação', 'Cada área de gerente vale 1 ponto. A correção mostra a apuração do controller separada das três áreas dos gerentes.']
  ]
};

function sanitizeServer(data) {
  const fields = EMPTY();
  for (const role of ROLES) {
    for (const item of FIELDS[role.id]) fields[role.id][item.key] = String(data?.fields?.[role.id]?.[item.key] ?? '').slice(0, 32);
  }
  const scratch = EMPTY_SCRATCH();
  for (const role of Object.keys(scratch)) scratch[role] = String(data?.scratch?.[role] ?? '').slice(0, 4000);
  return {
    fields,
    caseData: normalizeCaseData(data?.caseData || CASE),
    scratch,
    checked: data?.checked || {},
    updatedAt: data?.updatedAt || null,
    revision: Number(data?.revision) || 0
  };
}

function localKey() { return `dre-simulado:${room}`; }
function persistLocal() {
  state.updatedAt = new Date().toISOString();
  state.revision++;
  localStorage.setItem(localKey(), JSON.stringify(state));
  channel?.postMessage(state);
  renderMeta(); renderTabs(); renderPreview(); renderScore();
}

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || `Erro ${response.status}`);
  return json;
}

function merge(data) {
  const incoming = sanitizeServer(data);
  if (incoming.revision < state.revision && !remoteError) return;
  for (const marker of pendingFields) {
    const [role, key] = marker.split('.');
    if (incoming.fields[role]?.[key] !== undefined) incoming.fields[role][key] = state.fields[role][key];
  }
  for (const role of pendingScratch) incoming.scratch[role] = state.scratch[role];
  state = incoming;
  remoteError = false;
  renderAll();
}

async function refresh() {
  if (!api) return;
  try { merge(await request(`/api/rooms/${room}`)); }
  catch { remoteError = true; renderMeta(); }
}

function renderMeta() {
  $('updated-at').textContent = state.updatedAt
    ? new Date(state.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Aguardando';
  const completed = MANAGER_ROLES.filter(role => state.checked[role]?.correct).length;
  $('progress').textContent = `${completed} de 3 áreas de gerentes`;
  $('connection').textContent = api ? (remoteError ? 'Servidor indisponível' : 'Sala sincronizada') : 'Modo local';
  $('connection').classList.toggle('offline', !api || remoteError);
}

function renderTabs() {
  $('tabs').innerHTML = ROLES.map(role => {
    const correct = state.checked[role.id]?.correct;
    const indicator = correct ? '<span class="tab-status good" aria-label="Área conferida">✓</span>' : '';
    return `<button class="tab ${active === role.id ? 'active' : ''}" data-role="${role.id}" aria-current="${active === role.id ? 'page' : 'false'}"><span class="tab-num">${role.number}</span><span class="tab-copy"><strong>${esc(role.name)}</strong><small>${esc(role.people)}</small></span>${indicator}</button>`;
  }).join('');
}

function displayFieldAmount(value, display) {
  if (value === null || value === undefined) return '—';
  if (display === 'subtract') return `(${formatMoney(Math.abs(value))})`;
  if (display === 'signedSubtract') return value < 0 ? `+${formatMoney(Math.abs(value))}` : `(${formatMoney(value)})`;
  if (display === 'signed') return value < 0 ? `(${formatMoney(Math.abs(value))})` : formatMoney(value);
  return formatMoney(value);
}

function renderPreview() {
  const rows = DRE_LINES.map(line => {
    const value = normalizeMoney(state.fields[line.role]?.[line.key]);
    const category = line.final ? ' final' : line.display === 'total' ? ' subtotal' : '';
    return `<div class="dre-row${category}"><span>${esc(line.label)}</span><strong>${displayFieldAmount(value, line.display)}</strong></div>`;
  });
  $('dre-preview').innerHTML = `${rows.join('')}<p class="live-note">As linhas ficam em branco até a área responsável registrar a apuração. As contas detalhadas permanecem no relatório do caso.</p>`;
}

function renderScore() {
  const points = MANAGER_ROLES.filter(role => state.checked[role]?.correct).length;
  const controller = state.checked.controller;
  $('score').innerHTML = `<span><strong>${points}/3</strong> pontos nas áreas dos gerentes</span><span>Fechamento do controller: <strong>${controller ? (controller.correct ? 'correto' : 'revise') : 'pendente'}</strong></span>`;
}

function renderField(role, item) {
  const result = state.checked[role]?.fields?.[item.key];
  const statusClass = result === true ? 'good' : result === false ? 'bad' : '';
  const status = result === true ? '<div class="feedback good">Correto</div>' : result === false ? '<div class="feedback bad">Confira esta apuração</div>' : '';
  return `<div class="field-row ${item.kind === 'subtotal' ? 'calculated-field' : ''} ${statusClass}"><div class="field-description"><label for="f-${item.key}">${esc(item.label)}</label><small>${esc(item.formula)}</small>${status}</div><div class="field-input"><span>R$</span><input id="f-${item.key}" data-field="${item.key}" inputmode="decimal" autocomplete="off" maxlength="32" placeholder="Valor apurado" value="${esc(state.fields[role][item.key])}" aria-label="${esc(item.label)} em reais"></div></div>`;
}

function renderScratch(role) {
  return `<section class="scratch-sheet"><div class="scratch-heading"><div><p class="eyebrow">FOLHA DE RASCUNHO</p><h3>Registre suas contas</h3></div><span>salva para o grupo</span></div><p>Use este espaço para anotar a fórmula e as somas antes de passar os valores para a DRE.</p><textarea data-scratch="${role}" maxlength="4000" rows="4" placeholder="Ex.: receita bruta = vendas do canal físico + vendas digitais + serviços…">${esc(state.scratch[role] || '')}</textarea></section>`;
}

function renderRole() {
  const info = ROLES.find(role => role.id === active);
  const subtitles = {
    operational: 'Dois gerentes compartilham esta área e apuram a categoria operacional em duas partes.',
    investment: 'Apure rendimentos de investimentos e o subtotal antes de financiamento e tributos.',
    financing: 'Apure custos de financiamento, resultado antes dos tributos e IR e CSLL.',
    controller: 'Some o resultado final com os valores recebidos dos gerentes, sem alterar suas apurações.'
  };
  const groups = ROLE_GROUPS[active].map(group => {
    const fields = group.keys.map(key => FIELDS[active].find(item => item.key === key)).filter(Boolean);
    return `<section class="field-group"><h3 class="section-title">${esc(group.title)}</h3>${fields.map(item => renderField(active, item)).join('')}</section>`;
  }).join('');
  const rates = state.caseData.taxRates;
  const taxNote = active === 'financing' ? `<div class="source-note"><strong>Alíquotas deste caso</strong><p>IR (${rates.ir}%) e CSLL (${rates.csll}%). Calcule os valores separadamente sobre o resultado antes dos tributos e sobre o resultado pré-tributos da unidade descontinuada.</p></div>` : '';
  const result = state.checked[active];
  const scoreLine = active === 'operational' ? 'Os dois gerentes compartilham 1 ponto da área operacional.' : active === 'controller' ? 'O fechamento do controller é acompanhado separadamente.' : 'Esta área vale 1 ponto.';
  const resultMessage = result ? `<div class="result ${result.correct ? 'success' : 'partial'}" role="status"><strong>${result.correct ? 'Apuração conferida.' : `${result.count} de ${result.total} cálculos corretos`}</strong><span>${result.correct ? 'Os valores desta área correspondem ao gabarito do caso.' : 'Revise os campos destacados e use a ajuda para conferir a ordem das contas.'}</span></div>` : '';
  $('role-content').innerHTML = `<div class="role-heading"><div><p class="eyebrow">ÁREA ${info.number} · ${esc(info.people.toUpperCase())}</p><h2>${esc(info.name)}</h2><p>${esc(subtitles[active])}</p></div><button class="help-button" id="help">ajuda?</button></div>${taxNote}${groups}${active !== 'controller' ? renderScratch(active) : ''}<div class="role-footer"><div><p>${esc(scoreLine)}</p><small>Os valores são digitados como cálculos: despesas positivas e variações com o sinal indicado.</small></div><button class="primary" id="correct">Corrigir minha parte</button></div>${resultMessage}`;
  $('help').onclick = openHelp;
  $('correct').onclick = correct;
  $('role-content').querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      state.fields[active][input.dataset.field] = input.value;
      delete state.checked[active];
      pendingFields.add(`${active}.${input.dataset.field}`);
      renderPreview(); renderMeta(); renderTabs(); renderScore();
      scheduleFieldSave(active, input.dataset.field);
    });
    input.addEventListener('change', () => saveField(active, input.dataset.field));
  });
  $('role-content').querySelectorAll('[data-scratch]').forEach(area => {
    area.addEventListener('input', () => {
      state.scratch[active] = area.value;
      pendingScratch.add(active);
      scheduleScratchSave(active);
    });
    area.addEventListener('blur', () => saveScratch(active));
  });
}

function renderFacts() {
  const parts = [['operational', 'Operacional'], ['investment', 'Investimento'], ['financing', 'Financiamento'], ['controller', 'Operações descontinuadas']];
  const metadata = state.caseData.metadata;
  const generatedAt = metadata?.generatedAt ? ` · ${new Date(metadata.generatedAt).toLocaleString('pt-BR')}` : '';
  $('case-origin').textContent = metadata?.source === 'IA' ? 'IA' : metadata?.source === 'automatico' ? 'AUTO' : 'DEMO';
  const sourceDescription = metadata?.source === 'IA'
    ? 'Contexto criado por IA; valores calculados pelo simulador'
    : metadata?.source === 'automatico'
      ? 'Contexto automático de reserva; valores calculados pelo simulador'
      : 'Caso fixo de demonstração';
  $('case-context').innerHTML = metadata ? `<div class="case-context"><strong>${esc(metadata.company)} · ${esc(metadata.sector)}</strong><p>${esc(metadata.context)}</p><small>${sourceDescription}${generatedAt}</small></div>` : '';
  $('case-facts').innerHTML = parts.map(([role, title]) => {
    const groups = Object.entries(state.caseData.sources?.[role] || {});
    const facts = groups.map(([key, items]) => {
      const item = FIELDS[role].find(candidate => candidate.key === key);
      if (!item || !items.length) return '';
      const values = items.map(source => `<div class="fact"><span><i class="fact-sign ${source.effect === 'subtract' ? 'minus' : ''}">${source.effect === 'subtract' ? '−' : '+'}</i>${esc(source.label)}</span><strong>${formatMoney(Math.round(source.value * 100))}</strong></div>`).join('');
      return `<div class="source-set"><strong>${esc(item.label)}</strong>${values}</div>`;
    }).join('');
    const taxNote = role === 'financing' ? `<div class="source-note"><strong>Premissa tributária do exercício</strong><p>Alíquotas: IR ${state.caseData.taxRates.ir}% e CSLL ${state.caseData.taxRates.csll}%. O caso simplifica a base para praticar a apuração.</p></div>` : '';
    const count = groups.reduce((sum, [, entries]) => sum + entries.length, 0);
    return `<details class="fact-group" ${active === role ? 'open' : ''}><summary>${title}<span>${count} contas de origem</span></summary>${facts}${taxNote}</details>`;
  }).join('');
}

function renderAll() {
  const focused = document.activeElement;
  const inWorkspace = $('role-content').contains(focused);
  const focusedField = focused?.dataset?.field;
  const focusedScratch = focused?.dataset?.scratch;
  renderMeta(); renderTabs(); renderPreview(); renderFacts(); renderScore();
  if (!inWorkspace) {
    renderRole();
    return;
  }
  $('role-content').querySelectorAll('[data-field]').forEach(input => {
    if (input.dataset.field !== focusedField) input.value = state.fields[active][input.dataset.field];
  });
  $('role-content').querySelectorAll('[data-scratch]').forEach(area => {
    if (area.dataset.scratch !== focusedScratch) area.value = state.scratch[area.dataset.scratch] || '';
  });
}

function scheduleFieldSave(role, key) {
  if (!api) { persistLocal(); return; }
  const marker = `${role}.${key}`;
  clearTimeout(fieldTimers.get(marker));
  fieldTimers.set(marker, setTimeout(() => saveField(role, key), 350));
}

function saveField(role, key) {
  if (!api) { pendingFields.delete(`${role}.${key}`); persistLocal(); return Promise.resolve(); }
  const marker = `${role}.${key}`;
  clearTimeout(fieldTimers.get(marker));
  const value = state.fields[role][key];
  saving = saving.catch(() => {}).then(async () => {
    try {
      const updated = await request(`/api/rooms/${room}/fields`, { method: 'PATCH', body: JSON.stringify({ role, field: key, value }) });
      if (state.fields[role][key] === value) pendingFields.delete(marker);
      merge(updated);
    } catch (error) {
      remoteError = true; renderMeta(); show(`Não foi possível salvar: ${error.message}`);
    }
  });
  return saving;
}

function scheduleScratchSave(role) {
  if (!api) { persistLocal(); return; }
  clearTimeout(scratchTimers.get(role));
  scratchTimers.set(role, setTimeout(() => saveScratch(role), 500));
}

function saveScratch(role) {
  if (!pendingScratch.has(role)) return Promise.resolve();
  if (!api) { pendingScratch.delete(role); persistLocal(); return Promise.resolve(); }
  clearTimeout(scratchTimers.get(role));
  const value = state.scratch[role];
  saving = saving.catch(() => {}).then(async () => {
    try {
      const updated = await request(`/api/rooms/${room}/scratch`, { method: 'PATCH', body: JSON.stringify({ role, value }) });
      if (state.scratch[role] === value) pendingScratch.delete(role);
      merge(updated);
    } catch (error) {
      remoteError = true; renderMeta(); show(`Não foi possível salvar o rascunho: ${error.message}`);
    }
  });
  return saving;
}

async function correct() {
  const role = active;
  for (const marker of pendingFields) {
    const [pendingRole, key] = marker.split('.');
    if (pendingRole === role) saveField(role, key);
  }
  if (role !== 'controller' && pendingScratch.has(role)) saveScratch(role);
  const button = $('correct');
  button.disabled = true;
  try {
    if (api) {
      await saving;
      const response = await request(`/api/rooms/${room}/check`, { method: 'POST', body: JSON.stringify({ role }) });
      state.checked[role] = response.result;
      merge(response.room);
    } else {
      state.checked[role] = grade(role, state.fields[role], state.caseData, state.fields);
      persistLocal(); renderRole();
    }
  } catch (error) {
    show(`Não foi possível corrigir: ${error.message}`);
    button.disabled = false;
  }
}

function openHelp() {
  $('help-title').textContent = `Como fazer: ${ROLES.find(role => role.id === active).name}`;
  $('help-body').innerHTML = HELP[active].map(([title, body], index) => `<div class="help-step"><strong>${index + 1}. ${esc(title)}</strong><p>${esc(body)}</p></div>`).join('');
  $('help-dialog').showModal();
}

async function reset(password) {
  if (!api) throw new Error('Conecte o servidor para gerar e compartilhar outra DRE.');
  const data = await request(`/api/rooms/${room}/reset`, { method: 'POST', body: JSON.stringify({ password }) });
  pendingFields.clear(); pendingScratch.clear();
  for (const timer of fieldTimers.values()) clearTimeout(timer);
  for (const timer of scratchTimers.values()) clearTimeout(timer);
  fieldTimers.clear(); scratchTimers.clear();
  merge(data);
}

$('tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-role]');
  if (!button) return;
  active = button.dataset.role;
  location.hash = active;
  renderTabs(); renderRole(); renderFacts();
});
$('share').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); show('Link da sala copiado.'); }
  catch { show(`Código da sala: ${room}`); }
};
$('reset').onclick = () => { $('reset-error').textContent = ''; $('reset-password').value = ''; $('reset-dialog').showModal(); };
$('reset-form').onsubmit = async event => {
  event.preventDefault();
  const button = $('reset-form').querySelector('[type=submit]');
  button.disabled = true; button.textContent = 'Gerando nova DRE…';
  try { await reset($('reset-password').value); $('reset-dialog').close(); show('Nova DRE criada para o grupo.'); }
  catch (error) { $('reset-error').textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Gerar outra DRE'; }
};
$('close-help').onclick = $('help-ok').onclick = () => $('help-dialog').close();
$('close-reset').onclick = $('cancel-reset').onclick = () => $('reset-dialog').close();
channel?.addEventListener('message', event => { if (event.data?.revision > state.revision) merge(event.data); });

renderAll();
if (api) { refresh(); setInterval(refresh, 2500); }
else {
  try {
    const saved = JSON.parse(localStorage.getItem(localKey()));
    if (saved) state = sanitizeServer(saved);
  } catch { /* Ignora apenas o rascunho local ilegível. */ }
  renderAll();
}
