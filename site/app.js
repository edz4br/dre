import { CASE, ROLES, FIELDS, CONTROLLER_FIELDS, EMPTY, formatMoney, normalizeMoney, grade } from './core.js';

const api = String(window.DRE_API_URL || '').replace(/\/$/, '');
const requestedRoom = new URLSearchParams(location.search).get('sala');
const room = requestedRoom?.match(/^[A-Z0-9]{8,12}$/i)?.[0].toUpperCase() || makeRoom();
const roleFromUrl = location.hash.slice(1);
let active = ROLES.some(r => r.id === roleFromUrl) ? roleFromUrl : 'operational';
let state = { fields: EMPTY(), caseData: CASE, checked: {}, updatedAt: null, revision: 0 };
let pending = new Set();
let saving = Promise.resolve();
let remoteError = false;
const channel = !api && 'BroadcastChannel' in window ? new BroadcastChannel(`dre-${room}`) : null;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const show = (text) => { $('toast').textContent = text; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 2800); };
function makeRoom() { const bytes = crypto.getRandomValues(new Uint8Array(8)); return Array.from(bytes, b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('') + 'DRE'; }
if (requestedRoom !== room) history.replaceState(null, '', `?sala=${room}${location.hash}`);
$('room-code').textContent = room;

const HELP = {
  operational: [
    ['Dividam a aba', 'Os dois gerentes operacionais podem preencher juntos: um cuida das receitas e do custo dos produtos; o outro, das despesas da operação.'],
    ['Encontrem o lucro bruto', 'Subtraiam o custo dos produtos vendidos da receita bruta. Neste caso, a venda é receita e o gasto para produzir ou adquirir o produto é custo.'],
    ['Completem a operação', 'Somem outras receitas operacionais e subtraiam despesas de vendas, pesquisa, administração, perda de ágio e outras despesas. Quando o caso disser “não ocorreu”, preencham 0.'],
    ['Confiram sua área', 'Informem os valores como números positivos. A estrutura da DRE já indica o que entra com sinal de menos. Depois, usem Corrigir minha parte.']
  ],
  investment: [
    ['Localizem investimentos', 'Procurem equivalência patrimonial e outras receitas ou despesas de investimentos nos dados do caso. Elas entram depois do resultado operacional.'],
    ['Interpretem “não ocorreu”', 'Se a informação diz que não houve receita nem despesa de investimento, registrem 0 em cada campo. Não deixem em branco: o zero indica que vocês analisaram a linha.'],
    ['Entreguem ao controller', 'O resultado da sua parte se soma ao operacional para formar o resultado antes de financiamento e tributos.']
  ],
  financing: [
    ['Separem juros e tributos', 'Juros de empréstimos e arrendamentos reduzem o resultado antes do imposto. Depois entram imposto de renda e contribuição social.'],
    ['Preencham ausências', 'Juros de benefícios a empregados e operações descontinuadas que não ocorreram recebem 0.'],
    ['N\u00e3o invertam o sinal', 'Digitem cada despesa como valor positivo. A DRE mostra o sinal de subtra\u00e7\u00e3o. O resultado de opera\u00e7\u00f5es descontinuadas pode aumentar ou reduzir o resultado; usem o valor informado nos dados do caso.'],
  ],
  controller: [
    ['Recebam as apurações', 'Veja a DRE ao vivo nesta página. Os gerentes apuram seus campos e você usa os valores que eles entregaram. No trabalho descrito nos slides, o controller faz o cálculo final e entrega o relatório.'],
    ['Calculem em sequência', 'Receita menos custo = lucro bruto. Ajuste pelas receitas e despesas da operação, depois pelos investimentos, juros, tributos e operações descontinuadas.'],
    ['Registrem os cinco resultados', 'Preencha cada subtotal na ordem mostrada. O site verifica sua conta quando você clicar em Corrigir minha parte. Se o valor de um gerente parecer estranho, avise a pessoa responsável pela área.'],
    ['Assinem e entreguem', 'No exercício presencial, o controller assina o relatório final e o entrega ao professor. Este simulado não envia o trabalho.']
  ]
};

function sanitizeServer(data) {
  const fields = EMPTY();
  for (const role of ROLES) for (const f of FIELDS[role.id]) fields[role.id][f.key] = String(data?.fields?.[role.id]?.[f.key] ?? '').slice(0, 32);
  const caseData = Object.fromEntries(['operational', 'investment', 'financing'].map(group => [group, CASE[group].map(field => ({ ...field, value: Number(data?.caseData?.[group]?.find(item => item.key === field.key)?.value ?? field.value) }))]));
  caseData.metadata = data?.caseData?.metadata || null;
  return { fields, caseData, checked: data?.checked || {}, updatedAt: data?.updatedAt || null, revision: Number(data?.revision) || 0 };
}
function localKey() { return `dre-simulado:${room}`; }
function persistLocal() { state.updatedAt = new Date().toISOString(); state.revision++; localStorage.setItem(localKey(), JSON.stringify(state)); channel?.postMessage(state); renderMeta(); renderTabs(); renderPreview(); }
async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || `Erro ${response.status}`);
  return json;
}
function merge(data) {
  const incoming = sanitizeServer(data);
  if (incoming.revision < state.revision && !remoteError) return;
  for (const key of pending) { const [role, field] = key.split('.'); incoming.fields[role][field] = state.fields[role][field]; }
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
  $('progress').textContent = `${ROLES.filter(r => state.checked[r.id]?.correct).length} de 4 áreas`;
  $('connection').textContent = api ? remoteError ? 'Servidor indisponível' : 'Sala sincronizada' : 'Demonstração local';
  $('connection').classList.toggle('offline', !api || remoteError);
}
function renderTabs() {
  $('tabs').innerHTML = ROLES.map(r => `<button class="tab ${active === r.id ? 'active' : ''}" data-role="${r.id}" aria-current="${active === r.id ? 'page' : 'false'}"><span class="tab-num">${r.number}</span><span><strong>${r.name}</strong><small>${r.people}</small></span>${state.checked[r.id]?.correct ? '<span class="check">✓</span>' : ''}</button>`).join('');
}
function renderFields(role) {
  const groups = role === 'operational' ? ['Receitas e custos', 'Despesas e resultado operacional'] : [null];
  return groups.map(group => `${group ? `<h3 class="section-title">${group}</h3>` : ''}${FIELDS[role].filter(f => !group || f.group === group).map(f => {
    const checked = state.checked[role]?.fields?.[f.key];
    return `<div class="field-row ${checked === true ? 'good' : checked === false ? 'bad' : ''}"><div><label for="f-${f.key}">${esc(f.label)}</label>${f.formula ? `<small>${esc(f.formula)}</small>` : ''}${checked === false ? '<div class="feedback bad">Confira este valor</div>' : checked === true ? '<div class="feedback good">Correto</div>' : ''}</div><div class="field-input"><span>R$</span><input id="f-${f.key}" data-field="${f.key}" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(state.fields[role][f.key])}" aria-label="${esc(f.label)} em reais"></div></div>`;
  }).join('')}`).join('');
}
function renderRole() {
  const info = ROLES.find(r => r.id === active);
  const subtitles = { operational: 'Os dois gerentes operacionais dividem a apuração das receitas, custos e despesas.', investment: 'Apure os resultados de participações e outras movimentações de investimentos.', financing: 'Apure juros, tributos e eventuais operações descontinuadas.', controller: 'Use as apurações dos gerentes para calcular e registrar os resultados finais.' };
  const result = state.checked[active];
  $('role-content').innerHTML = `<div class="role-heading"><div><p class="eyebrow">ÁREA ${info.number} · ${info.people.toUpperCase()}</p><h2>${info.name}</h2><p>${subtitles[active]}</p></div><button class="help-button" id="help">? Ajuda desta área</button></div>${renderFields(active)}<div class="role-footer"><p>Preencha todos os campos. Use 0 quando o fato não ocorreu.</p><button class="primary" id="correct">Corrigir minha parte</button></div>${result ? `<div class="result ${result.correct ? 'success' : 'partial'}" role="status"><strong>${result.correct ? 'Tudo certo nesta área!' : `${result.count} de ${result.total} campos corretos`}</strong>${result.correct ? 'Sua apuração foi conferida. O grupo já pode usar estes valores no fechamento.' : 'Revise os campos destacados e tente novamente. A ajuda explica a ordem do cálculo.'}</div>` : ''}`;
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
  const parts = [['Operacional', state.caseData.operational], ['Investimento', state.caseData.investment], ['Financiamento e tributos', state.caseData.financing]];
  const metadata = state.caseData.metadata;
  $('case-context').innerHTML = metadata ? `<div class="case-context"><strong>${esc(metadata.company)} · ${esc(metadata.sector)}</strong><p>${esc(metadata.context)}</p><small>${metadata.source === 'IA' ? 'Caso criado por IA' : 'Caso criado automaticamente'} · ${new Date(metadata.generatedAt).toLocaleString('pt-BR')}</small></div>` : '';
  $('case-facts').innerHTML = parts.map(([title, fields]) => `<div class="fact-group"><h3>${title}</h3>${fields.map(f => `<div class="fact"><span>${esc(f.label)}</span><strong class="${f.value === 0 ? 'zero' : ''}">${f.value === 0 ? 'Não ocorreu' : formatMoney(Math.round(f.value * 100))}</strong></div>`).join('')}</div>`).join('');
}
function renderPreview() {
  const rows = [];
  const add = (label, role, key, subtotal = false, final = false) => {
    const value = normalizeMoney(state.fields[role][key]);
    rows.push(`<div class="dre-row ${subtotal ? 'subtotal' : ''} ${final ? 'final' : ''}"><span>${esc(label)}</span><strong>${formatMoney(value)}</strong></div>`);
  };
  for (const f of state.caseData.operational.slice(0,2)) add(`${f.kind === 'minus' ? '(-)' : '(+)'} ${f.label}`, 'operational', f.key);
  add('= Lucro bruto', 'controller', 'gross', true);
  for (const f of state.caseData.operational.slice(2)) add(`${f.kind === 'minus' ? '(-)' : '(+)'} ${f.label}`, 'operational', f.key);
  add('= Resultado operacional', 'controller', 'operating', true);
  for (const f of state.caseData.investment) add(`(+) ${f.label}`, 'investment', f.key);
  add('= Antes do financiamento e tributos', 'controller', 'beforeFinance', true);
  for (const f of state.caseData.financing.slice(0,2)) add(`(-) ${f.label}`, 'financing', f.key);
  add('= Antes do imposto', 'controller', 'beforeTax', true);
  add('(−) Imposto de renda e contribuição social', 'financing', 'tax');
  add('(+) Operações descontinuadas', 'financing', 'discontinued');
  add('= RESULTADO DO EXERCÍCIO', 'controller', 'final', true, true);
  $('dre-preview').innerHTML = rows.join('') + '<p class="live-note">Os valores exibidos são as respostas do grupo. Os subtotais são preenchidos pelo controller.</p>';
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
    } else { state.checked[role] = grade(role, state.fields[role], state.caseData); persistLocal(); renderRole(); }
  } catch (error) { show(`Não foi possível corrigir: ${error.message}`); button.disabled = false; }
}
function openHelp() {
  $('help-title').textContent = `Como fazer: ${ROLES.find(r => r.id === active).name}`;
  $('help-body').innerHTML = HELP[active].map(([title, body], index) => `<div class="help-step"><strong>${index + 1}. ${esc(title)}</strong><p>${esc(body)}</p></div>`).join('');
  $('help-dialog').showModal();
}
async function reset(password) {
  if (api) { const data = await request(`/api/rooms/${room}/reset`, { method: 'POST', body: JSON.stringify({ password }) }); pending.clear(); merge(data); }
  else { if (password !== 'treino') throw new Error('Senha incorreta. Na demonstração local, use “treino”.'); state = { fields: EMPTY(), caseData: CASE, checked: {}, updatedAt: null, revision: state.revision }; pending.clear(); persistLocal(); renderAll(); }
}
$('tabs').addEventListener('click', event => { const button = event.target.closest('[data-role]'); if (!button) return; active = button.dataset.role; location.hash = active; renderTabs(); renderRole(); });
$('share').onclick = async () => { try { await navigator.clipboard.writeText(location.href); show('Link da sala copiado.'); } catch { show(`Código da sala: ${room}`); } };
$('reset').onclick = () => { $('reset-error').textContent = ''; $('reset-password').value = ''; $('reset-demo').hidden = !!api; $('reset-dialog').showModal(); };
$('reset-form').onsubmit = async event => { event.preventDefault(); const button = $('reset-form').querySelector('[type=submit]'); button.disabled = true; button.textContent = 'Gerando nova DRE…'; try { await reset($('reset-password').value); $('reset-dialog').close(); show('Nova DRE criada para o grupo.'); } catch (error) { $('reset-error').textContent = error.message; } finally { button.disabled = false; button.textContent = 'Gerar nova DRE'; } };
$('close-help').onclick = $('help-ok').onclick = () => $('help-dialog').close();
$('close-reset').onclick = $('cancel-reset').onclick = () => $('reset-dialog').close();
channel?.addEventListener('message', event => { if (event.data?.revision > state.revision) merge(event.data); });
renderFacts();
if (api) { await refresh(); setInterval(refresh, 2500); }
else { try { const saved = JSON.parse(localStorage.getItem(localKey())); if (saved) state = sanitizeServer(saved); } catch {} renderAll(); }
