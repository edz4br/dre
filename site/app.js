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
    ['Dividam a aba', 'Um gerente pode apurar receita bruta, deduções e custos. O outro pode apurar as demais receitas e despesas operacionais. Os dois usam os mesmos dados e campos.'],
    ['Apurem a receita bruta', 'Somem as vendas de mercadorias e as receitas de prestação de serviços. O total dessa soma é a receita bruta; não copiem uma conta isolada como se já fosse o subtotal.'],
    ['Apurem as deduções e os custos', 'Somem devoluções, abatimentos e impostos sobre vendas para obter as deduções. Para os custos, somem mercadorias vendidas, serviços prestados, materiais, mão de obra direta e fretes sobre compras.'],
    ['Apurem as despesas operacionais', 'Somem as contas de cada grupo. Fretes sobre compras entram em custos; fretes sobre vendas entram em despesas de vendas. Gastos administrativos ficam separados dos custos.'],
    ['Confiram sua área', 'Registrem o total apurado em cada campo. Gastos e deduções são digitados como valores positivos; a DRE mostra quando devem ser subtraídos.']
  ],
  investment: [
    ['Apurem a equivalência patrimonial', 'Somem os resultados informados para cada empresa coligada. O resultado de equivalência entra na categoria de investimentos.'],
    ['Apurem outras receitas e despesas', 'Somem as receitas de investimentos e subtraiam os valores marcados com (−), como uma perda de remensuração. Registrem o resultado líquido da soma.'],
    ['Entreguem ao controller', 'O controller soma os seus resultados ao resultado operacional para chegar ao resultado antes do financiamento e dos tributos.']
  ],
  financing: [
    ['Apurem os juros', 'Somem os juros de empréstimos e de arrendamentos. Façam outra soma para os juros das obrigações de benefícios aos empregados.'],
    ['Calculem os tributos sobre o lucro', 'A base é o resultado operacional mais os investimentos, menos os juros de financiamento. Se o subtotal “Antes do imposto” já aparecer na DRE ao vivo, usem esse valor. Calculem IRPJ de 15% e CSLL de 9% sobre a base e somem os dois tributos.'],
    ['Apurem operações descontinuadas', 'Subtraiam as despesas da unidade descontinuada da receita dessa mesma unidade. Registrem o resultado líquido.'],
    ['Confiram os sinais', 'Registrem despesas e tributos como valores positivos. O formato da DRE mostra essas linhas como deduções.']
  ],
  controller: [
    ['Recebam as apurações', 'Veja a DRE ao vivo nesta página e use os totais calculados pelos gerentes. O controller fecha o relatório depois das apurações das áreas.'],
    ['Calculem em sequência', 'Receita bruta menos deduções resulta na receita líquida. Subtraiam os custos para obter o lucro bruto. Depois, ajustem pelas receitas, despesas, investimentos, juros e tributos.'],
    ['Registrem os seis resultados', 'Preencha cada subtotal na ordem da DRE. O site confere suas contas; cada gerente continua responsável pelos próprios valores.'],
    ['Assinem e entreguem', 'No exercício presencial, o controller assina o relatório final e o entrega ao professor. Este simulado não envia o trabalho.']
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
  return groups.map(group => `${group ? `<h3 class="section-title">${group}</h3>` : ''}${FIELDS[role].filter(field => !group || field.group === group).map(field => {
    const checked = state.checked[role]?.fields?.[field.key];
    return `<div class="field-row ${checked === true ? 'good' : checked === false ? 'bad' : ''}"><div><label for="f-${field.key}">${esc(field.label)}</label>${field.formula ? `<small>${esc(field.formula)}</small>` : ''}${checked === false ? '<div class="feedback bad">Confira este valor</div>' : checked === true ? '<div class="feedback good">Correto</div>' : ''}</div><div class="field-input"><span>R$</span><input id="f-${field.key}" data-field="${field.key}" inputmode="decimal" autocomplete="off" placeholder="Total" value="${esc(state.fields[role][field.key])}" aria-label="${esc(field.label)} em reais"></div></div>`;
  }).join('')}`).join('');
}
function renderRole() {
  const info = ROLES.find(role => role.id === active);
  const subtitles = {
    operational: 'Os dois gerentes operacionais apuram os totais de receitas, deduções, custos e despesas a partir das contas de origem.',
    investment: 'Apure as participações e outras receitas e despesas dos investimentos a partir das contas de origem.',
    financing: 'Apure juros, tributos sobre o lucro e o resultado de operações descontinuadas.',
    controller: 'Use as apurações dos gerentes para calcular e registrar os subtotais finais.'
  };
  const result = state.checked[active];
  const footerPrompt = active === 'controller' ? 'Use os valores apurados pelos gerentes e feche os subtotais na sequência da DRE.' : 'Apure os totais a partir das contas de origem e registre-os aqui. O caso traz valores para todas as linhas.';
  $('role-content').innerHTML = `<div class="role-heading"><div><p class="eyebrow">ÁREA ${info.number} · ${info.people.toUpperCase()}</p><h2>${info.name}</h2><p>${subtitles[active]}</p></div><button class="help-button" id="help">ajuda?</button></div>${renderFields(active)}<div class="role-footer"><p>${footerPrompt}</p><button class="primary" id="correct">Corrigir minha parte</button></div>${result ? `<div class="result ${result.correct ? 'success' : 'partial'}" role="status"><strong>${result.correct ? 'Tudo certo nesta área!' : `${result.count} de ${result.total} campos corretos`}</strong>${result.correct ? 'Sua apuração foi conferida. O grupo já pode usar estes valores no fechamento.' : 'Revise os campos destacados e tente novamente. A ajuda explica a ordem do cálculo.'}</div>` : ''}`;
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
  const parts = [['operational', 'Operacional'], ['investment', 'Investimento'], ['financing', 'Financiamento e tributos']];
  const metadata = state.caseData.metadata;
  $('case-context').innerHTML = metadata ? `<div class="case-context"><strong>${esc(metadata.company)} · ${esc(metadata.sector)}</strong><p>${esc(metadata.context)}</p><small>${metadata.source === 'IA' ? 'Caso criado por IA' : 'Caso criado automaticamente'} · ${new Date(metadata.generatedAt).toLocaleString('pt-BR')}</small></div>` : '';
  $('case-facts').innerHTML = parts.map(([role, title]) => {
    const groups = Object.entries(state.caseData.sources?.[role] || {});
    const facts = groups.map(([key, items]) => {
      const field = FIELDS[role].find(candidate => candidate.key === key);
      if (!field || !items.length) return '';
      return `<div class="source-set"><strong>${esc(field.label)}</strong>${items.map(entry => `<div class="fact"><span>${entry.effect === 'subtract' ? '(−) ' : '(+) '}${esc(entry.label)}</span><strong>${formatMoney(Math.round(entry.value * 100))}</strong></div>`).join('')}</div>`;
    }).join('');
    const taxNote = role === 'financing' ? '<div class="source-note"><strong>Impostos sobre o lucro</strong><p>Base: resultado operacional + investimentos − juros de financiamento. Calcule IRPJ (15%) + CSLL (9%) sobre a base.</p></div>' : '';
    const accountCount = groups.reduce((total, [, items]) => total + items.length, 0) + (role === 'financing' ? 1 : 0);
    return `<details class="fact-group" ${active === role ? 'open' : ''}><summary>${title}<span>${accountCount} contas e cálculos</span></summary>${facts}${taxNote}</details>`;
  }).join('');
}
function renderPreview() {
  const rows = [];
  const add = (label, role, key, subtotal = false, final = false) => {
    const value = normalizeMoney(state.fields[role][key]);
    rows.push(`<div class="dre-row ${subtotal ? 'subtotal' : ''} ${final ? 'final' : ''}"><span>${esc(label)}</span><strong>${formatMoney(value)}</strong></div>`);
  };
  const sign = field => field.kind === 'minus' ? '(−)' : field.kind === 'variable' ? '(±)' : '(+)';
  for (const field of FIELDS.operational.slice(0, 2)) add(`${sign(field)} ${field.label}`, 'operational', field.key);
  add('= Receita líquida', 'controller', 'netRevenue', true);
  const cost = FIELDS.operational[2];
  add(`${sign(cost)} ${cost.label}`, 'operational', cost.key);
  add('= Lucro bruto', 'controller', 'gross', true);
  for (const field of FIELDS.operational.slice(3)) add(`${sign(field)} ${field.label}`, 'operational', field.key);
  add('= Resultado operacional', 'controller', 'operating', true);
  for (const field of FIELDS.investment) add(`${sign(field)} ${field.label}`, 'investment', field.key);
  add('= Antes do financiamento e tributos', 'controller', 'beforeFinance', true);
  for (const field of FIELDS.financing.slice(0, 2)) add(`${sign(field)} ${field.label}`, 'financing', field.key);
  add('= Antes do imposto', 'controller', 'beforeTax', true);
  for (const field of FIELDS.financing.slice(2)) add(`${sign(field)} ${field.label}`, 'financing', field.key);
  add('= RESULTADO DO EXERCÍCIO', 'controller', 'final', true, true);
  $('dre-preview').innerHTML = rows.join('') + '<p class="live-note">Os valores exibidos são as apurações do grupo. Os subtotais são preenchidos pelo controller.</p>';
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
      state.checked[role] = grade(role, state.fields[role], state.caseData);
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
    if (password !== 'treino') throw new Error('Senha incorreta. Na demonstração local, use "treino".');
    state = { fields: EMPTY(), caseData: normalizeCaseData(CASE), checked: {}, updatedAt: null, revision: state.revision };
    pending.clear(); persistLocal(); renderAll();
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
