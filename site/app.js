import { CASE, ROLES, FIELDS, EMPTY, formatMoney, normalizeMoney, normalizeCaseData, grade } from './core.js';

const api = String(window.DRE_API_URL || '').replace(/\/$/, '');
const requestedRoom = new URLSearchParams(location.search).get('sala');
const room = requestedRoom?.match(/^[A-Z0-9]{8,12}$/i)?.[0].toUpperCase() || makeRoom();
const roleFromUrl = location.hash.slice(1);
let active = ROLES.some(role => role.id === roleFromUrl) ? roleFromUrl : 'operational';
let state = { fields: EMPTY(), caseData: normalizeCaseData(CASE), checked: {}, updatedAt: null, revision: 0 };
let pending = new Set();
let saving = Promise.resolve();
let remoteError = false;
const channel = !api && 'BroadcastChannel' in window ? new BroadcastChannel(`dre-${room}`) : null;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const show = message => { $('toast').textContent = message; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 2800); };
function makeRoom() { const bytes = crypto.getRandomValues(new Uint8Array(8)); return Array.from(bytes, byte => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte % 32]).join('') + 'DRE'; }
if (requestedRoom !== room) history.replaceState(null, '', `?sala=${room}${location.hash}`);
$('room-code').textContent = room;

const HELP = {
  operational: [
    ['Dividam a apuração', 'Os dois gerentes compartilham esta aba. Um pode somar receitas e custos; o outro pode apurar as demais contas operacionais e revisar os subtotais.'],
    ['Somem as receitas brutas', 'Juntem os valores de venda de mercadorias e de prestação de serviços. O campo pede o total das contas de origem, não um valor já apurado.'],
    ['Somem os custos e calculem o lucro bruto', 'Juntem mercadorias vendidas, serviços prestados, materiais, mão de obra direta e fretes sobre compras. Depois subtraiam os custos das receitas brutas.'],
    ['Apurem cada conta operacional', 'Somem as contas de outras receitas, vendas, pesquisa e desenvolvimento, despesas administrativas, perda por redução do ágio e outras despesas operacionais. Fretes sobre compras ficam nos custos; fretes sobre vendas ficam nas despesas de vendas.'],
    ['Calculem o resultado operacional', 'Partam do lucro bruto, adicionem outras receitas operacionais e subtraiam as despesas operacionais. Digitem despesas como valores positivos; o sinal de subtração já aparece na DRE.']
  ],
  investment: [
    ['Apurem a equivalência patrimonial', 'Somem os resultados informados para cada empresa coligada. Essa conta pertence à categoria de investimentos.'],
    ['Apurem outras receitas e despesas de investimentos', 'Somem as receitas de investimento e subtraiam os valores marcados com (−), como a perda na remensuração. Registrem o resultado da soma.'],
    ['Calculem o resultado antes do financiamento e tributos', 'Adicionem o resultado operacional às duas apurações de investimento. Esse subtotal fecha a parte do gerente de investimento.']
  ],
  financing: [
    ['Somem os juros de financiamento', 'Juntem os juros de empréstimos e leasings. Em outro campo, juntem os juros das obrigações de benefícios aos empregados.'],
    ['Calculem o resultado antes do imposto', 'Subtraiam os dois grupos de juros do resultado antes do financiamento e tributos.'],
    ['Calculem IR e CSLL', 'Apliquem as duas alíquotas informadas no caso, separadamente, sobre o resultado antes do imposto de renda. Somem os dois tributos e registrem o total.'],
    ['Confiram os sinais', 'Digitem juros e tributos como valores positivos. A DRE mostra essas linhas como deduções.']
  ],
  controller: [
    ['Feche a operação descontinuada', 'Some a receita da unidade encerrada e subtraia as despesas identificadas com (−). Registre o resultado líquido.'],
    ['Feche o resultado do exercício', 'Use o resultado antes do imposto, subtraia IR e CSLL apurados pelo gerente de financiamento e adicione o resultado de operações descontinuadas.'],
    ['Confira as apurações do grupo', 'A DRE ao vivo reúne as contas e os subtotais informados por cada gerente. O controller conclui o fechamento final sem alterar os cálculos de cada área.'],
    ['Assine e entregue', 'No exercício presencial, o controller assina o relatório final e o entrega ao professor. Este simulado não envia o trabalho.']
  ]
};

function sanitizeServer(data) {
  const fields = EMPTY();
  for (const role of ROLES) for (const field of FIELDS[role.id]) fields[role.id][field.key] = String(data?.fields?.[role.id]?.[field.key] ?? '').slice(0, 32);
  return {
    fields,
    caseData: normalizeCaseData(data?.caseData || CASE),
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
  renderMeta(); renderTabs(); renderPreview();
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
  for (const key of pending) {
    const [role, field] = key.split('.');
    incoming.fields[role][field] = state.fields[role][field];
  }
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
  $('updated-at').textContent = state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Aguardando';
  $('progress').textContent = `${ROLES.filter(role => state.checked[role.id]?.correct).length} de 4 áreas`;
  $('connection').textContent = api ? remoteError ? 'Servidor indisponível' : 'Sala sincronizada' : 'Demonstração local';
  $('connection').classList.toggle('offline', !api || remoteError);
}
function renderTabs() {
  $('tabs').innerHTML = ROLES.map(role => `<button class="tab ${active === role.id ? 'active' : ''}" data-role="${role.id}" aria-current="${active === role.id ? 'page' : 'false'}"><span class="tab-num">${role.number}</span><span><strong>${role.name}</strong><small>${role.people}</small></span>${state.checked[role.id]?.correct ? '<span class="check">✓</span>' : ''}</button>`).join('');
}
function renderFields(role) {
  const groups = role === 'operational' ? ['Receitas e custos', 'Despesas e resultado operacional'] : [null];
  const rates = state.caseData.taxRates;
  return groups.map(group => `${group ? `<h3 class="section-title">${group}</h3>` : ''}${FIELDS[role].filter(field => !group || field.group === group).map(field => {
    const checked = state.checked[role]?.fields?.[field.key];
    const formula = field.key === 'tax' ? `Calcule IRPJ (${rates.ir}%) + CSLL (${rates.csll}%) separadamente sobre o resultado antes do imposto.` : field.formula;
    return `<div class="field-row ${field.kind === 'subtotal' ? 'calculated-field' : ''} ${checked === true ? 'good' : checked === false ? 'bad' : ''}"><div><label for="f-${field.key}">${esc(field.label)}</label>${formula ? `<small>${esc(formula)}</small>` : ''}${checked === false ? '<div class="feedback bad">Confira este valor</div>' : checked === true ? '<div class="feedback good">Correto</div>' : ''}</div><div class="field-input"><span>R$</span><input id="f-${field.key}" data-field="${field.key}" inputmode="decimal" autocomplete="off" placeholder="Total apurado" value="${esc(state.fields[role][field.key])}" aria-label="${esc(field.label)} em reais"></div></div>`;
  }).join('')}`).join('');
}
function renderRole() {
  const info = ROLES.find(role => role.id === active);
  const subtitles = {
    operational: 'Os dois gerentes compartilham esta aba e apuram as contas até o resultado operacional.',
    investment: 'Apure as contas de investimento e o resultado antes do financiamento e tributos.',
    financing: 'Apure as contas de financiamento, o resultado antes do imposto e IR e CSLL.',
    controller: 'Confira as apurações do grupo e faça o fechamento final da DRE.'
  };
  const result = state.checked[active];
  const footerPrompt = active === 'controller' ? 'Feche o resultado final depois das apurações dos gerentes.' : 'Some as contas de origem, calcule os subtotais da sua área e registre os valores.';
  $('role-content').innerHTML = `<div class="role-heading"><div><p class="eyebrow">ÁREA ${info.number} · ${info.people.toUpperCase()}</p><h2>${info.name}</h2><p>${subtitles[active]}</p></div><button class="help-button" id="help">ajuda?</button></div>${renderFields(active)}<div class="role-footer"><p>${footerPrompt}</p><button class="primary" id="correct">Corrigir minha parte</button></div>${result ? `<div class="result ${result.correct ? 'success' : 'partial'}" role="status"><strong>${result.correct ? 'Tudo certo nesta área!' : `${result.count} de ${result.total} campos corretos`}</strong>${result.correct ? 'Sua apuração foi conferida. O grupo já pode seguir com a DRE.' : 'Revise os campos destacados e tente novamente. A ajuda explica a ordem do cálculo.'}</div>` : ''}`;
  $('help').onclick = openHelp;
  $('correct').onclick = correct;
  $('role-content').querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      state.fields[active][input.dataset.field] = input.value;
      delete state.checked[active];
      pending.add(`${active}.${input.dataset.field}`);
      renderPreview(); renderMeta();
    });
    input.addEventListener('change', () => saveField(active, input.dataset.field, input.value));
  });
}
function renderFacts() {
  const parts = [['operational', 'Operacional'], ['investment', 'Investimento'], ['financing', 'Financiamento'], ['controller', 'Fechamento do controller']];
  const metadata = state.caseData.metadata;
  const generatedAt = metadata?.generatedAt ? ` · ${new Date(metadata.generatedAt).toLocaleString('pt-BR')}` : '';
  $('case-context').innerHTML = metadata ? `<div class="case-context"><strong>${esc(metadata.company)} · ${esc(metadata.sector)}</strong><p>${esc(metadata.context)}</p><small>${metadata.source === 'IA' ? 'Contexto criado por IA' : 'Caso criado automaticamente'}${generatedAt}</small></div>` : '';
  $('case-facts').innerHTML = parts.map(([role, title]) => {
    const groups = Object.entries(state.caseData.sources?.[role] || {});
    const facts = groups.map(([key, items]) => {
      const field = FIELDS[role].find(candidate => candidate.key === key);
      if (!field || !items.length) return '';
      return `<div class="source-set"><strong>${esc(field.label)}</strong>${items.map(entry => `<div class="fact"><span>${entry.effect === 'subtract' ? '(−) ' : '(+) '}${esc(entry.label)}</span><strong>${formatMoney(Math.round(entry.value * 100))}</strong></div>`).join('')}</div>`;
    }).join('');
    const taxNote = role === 'financing' ? `<div class="source-note"><strong>Alíquotas do caso</strong><p>Base: resultado antes do imposto de renda. Calcule IRPJ (${state.caseData.taxRates.ir}%) e CSLL (${state.caseData.taxRates.csll}%) separadamente e some os dois valores.</p></div>` : '';
    const accountCount = groups.reduce((total, [, items]) => total + items.length, 0) + (role === 'financing' ? 2 : 0);
    return `<details class="fact-group" ${active === role ? 'open' : ''}><summary>${title}<span>${accountCount} contas de origem</span></summary>${facts}${taxNote}</details>`;
  }).join('');
}
function renderPreview() {
  const rows = [];
  const add = (label, role, key, subtotal = false, final = false) => {
    const value = normalizeMoney(state.fields[role][key]);
    rows.push(`<div class="dre-row ${subtotal ? 'subtotal' : ''} ${final ? 'final' : ''}"><span>${esc(label)}</span><strong>${formatMoney(value)}</strong></div>`);
  };
  add('Receitas brutas', 'operational', 'revenue');
  add('(-) Custos dos produtos e serviços vendidos', 'operational', 'cost');
  add('= Lucro bruto', 'operational', 'gross', true);
  add('(+) Outras receitas operacionais', 'operational', 'otherRevenue');
  add('(-) Despesas de vendas', 'operational', 'sales');
  add('(-) Despesas de pesquisa e desenvolvimento', 'operational', 'research');
  add('(-) Despesas gerais e administrativas', 'operational', 'admin');
  add('(+/-) Perda por redução ao valor recuperável do ágio', 'operational', 'goodwill');
  add('(-) Outras despesas operacionais', 'operational', 'otherExpense');
  add('= Resultado operacional', 'operational', 'operating', true);
  add('Resultado de equivalência patrimonial', 'investment', 'equity');
  add('(+) Outras receitas e despesas de investimentos', 'investment', 'otherInvestment');
  add('= Resultado antes do financiamento e tributos', 'investment', 'beforeFinance', true);
  add('(-) Despesas de juros com empréstimos e leasings', 'financing', 'interest');
  add('(-) Despesas de juros com benefícios a empregados', 'financing', 'benefit');
  add('= Resultado antes do imposto de renda', 'financing', 'beforeTax', true);
  add('(-) Imposto de renda e contribuição social', 'financing', 'tax');
  add('(+) Resultado de operações descontinuadas', 'controller', 'discontinued');
  add('= Resultado do exercício', 'controller', 'final', true, true);
  $('dre-preview').innerHTML = rows.join('') + '<p class="live-note">As contas detalhadas ficam ao lado. Cada valor aparece quando a área responsável faz sua apuração.</p>';
}
function renderAll() {
  const focused = document.activeElement?.dataset?.field;
  renderMeta(); renderTabs(); renderPreview(); renderFacts();
  if (focused) {
    $('role-content').querySelectorAll('[data-field]').forEach(input => {
      if (input.dataset.field !== focused) input.value = state.fields[active][input.dataset.field];
    });
  } else renderRole();
}
function saveField(role, field, value) {
  if (!api) { pending.delete(`${role}.${field}`); persistLocal(); renderTabs(); return; }
  saving = saving.catch(() => {}).then(async () => {
    try {
      const updated = await request(`/api/rooms/${room}/fields`, { method: 'PATCH', body: JSON.stringify({ role, field, value }) });
      pending.delete(`${role}.${field}`); merge(updated);
    } catch (error) { remoteError = true; renderMeta(); show(`Não foi possível salvar: ${error.message}`); }
  });
}
async function correct() {
  const role = active;
  const inputFields = $('role-content').querySelectorAll('[data-field]');
  for (const input of inputFields) {
    if (state.fields[role][input.dataset.field] !== input.value) state.fields[role][input.dataset.field] = input.value;
    if (pending.has(`${role}.${input.dataset.field}`)) saveField(role, input.dataset.field, input.value);
  }
  const button = $('correct'); button.disabled = true;
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
  } catch (error) { show(`Não foi possível corrigir: ${error.message}`); button.disabled = false; }
}
function openHelp() {
  $('help-title').textContent = `Como fazer: ${ROLES.find(role => role.id === active).name}`;
  $('help-body').innerHTML = HELP[active].map(([title, body], index) => `<div class="help-step"><strong>${index + 1}. ${esc(title)}</strong><p>${esc(body)}</p></div>`).join('');
  $('help-dialog').showModal();
}
async function reset(password) {
  if (api) {
    const data = await request(`/api/rooms/${room}/reset`, { method: 'POST', body: JSON.stringify({ password }) });
    pending.clear(); merge(data);
  } else {
    throw new Error('O servidor precisa estar conectado para gerar outra DRE com segurança.');
  }
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
$('reset').onclick = () => { $('reset-error').textContent = ''; $('reset-password').value = ''; $('reset-demo').hidden = !!api; $('reset-dialog').showModal(); };
$('reset-form').onsubmit = async event => {
  event.preventDefault();
  const button = $('reset-form').querySelector('[type=submit]');
  button.disabled = true; button.textContent = 'Gerando nova DRE…';
  try { await reset($('reset-password').value); $('reset-dialog').close(); show('Nova DRE criada para o grupo.'); }
  catch (error) { $('reset-error').textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Gerar nova DRE'; }
};
$('close-help').onclick = $('help-ok').onclick = () => $('help-dialog').close();
$('close-reset').onclick = $('cancel-reset').onclick = () => $('reset-dialog').close();
channel?.addEventListener('message', event => { if (event.data?.revision > state.revision) merge(event.data); });
renderFacts();
if (api) { renderAll(); await refresh(); setInterval(refresh, 2500); }
else { try { const saved = JSON.parse(localStorage.getItem(localKey())); if (saved) state = sanitizeServer(saved); } catch {} renderAll(); }
