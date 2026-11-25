/* HabitLoop — check-in diário, sequências e alertas de meta */

const $ = (s) => document.querySelector(s);
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const banco = {
  ler(k, padrao) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch { return padrao; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } }
};
const iso = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const diasAtras = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const EMOJIS = ['💧', '📚', '🏃', '🧘', '🥗', '😴', '✍️', '🎸', '💊', '🧹', '🌱', '📵', '🦷', '💰', '☀️', '🙏'];
const CORES = ['#2f7d4f', '#1c7ed6', '#e8590c', '#ae3ec9', '#f08c00', '#d6336c', '#0ca678', '#495057'];
const MARCOS = [3, 7, 14, 21, 30, 50, 66, 100, 200, 365];

/* Primeira visita: hábitos com um histórico de exemplo */
function exemplos() {
  const h = (dias) => Object.fromEntries(dias.map((n) => [iso(diasAtras(n)), true]));
  const faixa = (a, b, pular = []) => Array.from({ length: b - a + 1 }, (_, i) => a + i).filter((n) => !pular.includes(n));
  return [
    { id: 1, nome: 'Beber 2 L de água', emoji: '💧', cor: '#1c7ed6', meta: 21, feitos: h(faixa(1, 17)) },
    { id: 2, nome: 'Ler 20 páginas', emoji: '📚', cor: '#ae3ec9', meta: 30, feitos: h(faixa(1, 40, [6, 13, 19, 27, 33])) },
    { id: 3, nome: 'Caminhar 30 minutos', emoji: '🏃', cor: '#e8590c', meta: 14, feitos: h(faixa(0, 5).concat(faixa(8, 30, [10, 15, 16, 22]))) },
    { id: 4, nome: 'Dormir antes da meia-noite', emoji: '😴', cor: '#2f7d4f', meta: 7, feitos: h([2, 3, 5, 9, 12, 14, 20, 21, 25, 31, 44, 50]) }
  ];
}
let habitos = banco.ler('hl_habitos', null) ?? exemplos();
const salvar = () => banco.salvar('hl_habitos', habitos);

/* Sequência atual: conta para trás a partir de hoje (ou de ontem, se hoje ainda não foi marcado) */
function sequenciaAtual(h) {
  let n = 0, i = h.feitos[iso(diasAtras(0))] ? 0 : 1;
  while (h.feitos[iso(diasAtras(i))]) { n++; i++; }
  return n;
}
function melhorSequencia(h) {
  const dias = Object.keys(h.feitos).filter((k) => h.feitos[k]).sort();
  let melhor = 0, atual = 0, anterior = null;
  dias.forEach((d) => {
    const t = new Date(d + 'T12:00').getTime();
    atual = anterior !== null && Math.round((t - anterior) / 864e5) === 1 ? atual + 1 : 1;
    melhor = Math.max(melhor, atual); anterior = t;
  });
  return melhor;
}

function cabecalho() {
  const fmt = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3);
  $('#dias-cab').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = diasAtras(6 - i);
    return `<span class="${i === 6 ? 'hoje' : ''}">${i === 6 ? 'Hoje' : fmt(d)}<b>${d.getDate()}</b></span>`;
  }).join('');
}

function desenhar() {
  const hoje = iso(diasAtras(0));
  const feitosHoje = habitos.filter((h) => h.feitos[hoje]).length;
  $('#feitos').textContent = `${feitosHoje}/${habitos.length}`;
  $('#anel').style.strokeDashoffset = 213.6 * (1 - (habitos.length ? feitosHoje / habitos.length : 0));
  const faltam = habitos.length - feitosHoje;
  $('#frase').textContent = !habitos.length ? 'Comece criando seu primeiro hábito.'
    : faltam === 0 ? 'Dia completo! Todos os hábitos de hoje feitos. 🎉'
    : `${faltam === 1 ? 'Falta 1 hábito' : `Faltam ${faltam} hábitos`} para fechar o dia.`;

  const fmtCurto = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3);
  $('#habitos').innerHTML = habitos.length ? habitos.map((h) => {
    const seq = sequenciaAtual(h), melhor = melhorSequencia(h), pct = Math.min(100, (seq / h.meta) * 100);
    const checks = Array.from({ length: 7 }, (_, i) => {
      const d = diasAtras(6 - i), k = iso(d), feito = !!h.feitos[k];
      const rot = i === 6 ? 'Hoje' : fmtCurto(d);
      return `<span class="item"><button class="check ${i === 6 ? 'hoje' : ''}" data-h="${h.id}" data-d="${k}" aria-pressed="${feito}" aria-label="${escapar(h.nome)}, ${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}">${CHECK}</button><span class="rot">${rot}</span></span>`;
    }).join('');
    return `<li class="habito ${h.feitos[hoje] ? 'completo' : ''}" style="--cor:${h.cor}">
      <div class="habito__info">
        <span class="habito__emoji" aria-hidden="true">${h.emoji}</span>
        <div>
          <button class="habito__nome" data-editar="${h.id}" title="Editar hábito">${escapar(h.nome)}</button>
          <div class="meta"><span class="barra"><i style="width:${pct}%"></i></span><span>${seq >= h.meta ? 'Meta batida! ' : ''}${Math.min(seq, h.meta)}/${h.meta} dias · recorde ${melhor}</span></div>
        </div>
      </div>
      <div class="checks">${checks}</div>
      <div class="sequencia" title="Sequência atual"><strong class="${seq >= 3 ? 'acesa' : ''}">${seq >= 3 ? '🔥' : ''}${seq}</strong><span>${seq === 1 ? 'dia' : 'dias'} seguidos</span></div>
    </li>`;
  }).join('') : '<li class="habito vazio">Nenhum hábito ainda. Crie o primeiro abaixo!</li>';

  desenharMapa();
}

/* Mapa de calor: 12 semanas, colunas começando na segunda */
function desenharMapa() {
  const hoje = diasAtras(0);
  const ini = new Date(hoje); ini.setDate(ini.getDate() - ((hoje.getDay() + 6) % 7) - 7 * 11);
  let html = '', dias = 0, completos = 0;
  for (let i = 0; i < 84; i++) {
    const d = new Date(ini); d.setDate(d.getDate() + i);
    if (d > hoje) { html += '<i class="futuro"></i>'; continue; }
    const k = iso(d);
    const n = habitos.length ? habitos.filter((h) => h.feitos[k]).length / habitos.length : 0;
    const nivel = n === 0 ? 0 : n <= 0.25 ? 1 : n <= 0.5 ? 2 : n < 1 ? 3 : 4;
    if (n === 1) completos++;
    dias++;
    html += `<i class="n${nivel}" title="${d.toLocaleDateString('pt-BR')}: ${Math.round(n * 100)}%"></i>`;
  }
  $('#mapa').innerHTML = html;
  $('#mapa-txt').innerHTML = `<strong>${completos}</strong>${completos === 1 ? 'dia' : 'dias'} com todos os hábitos feitos nas últimas 12 semanas`;
  $('#mapa').setAttribute('aria-label', `Nas últimas 12 semanas, ${completos} de ${dias} dias tiveram todos os hábitos feitos.`);
}

/* Check-in */
$('#habitos').addEventListener('click', (e) => {
  const ed = e.target.closest('[data-editar]');
  if (ed) { abrirForm(habitos.find((h) => h.id === +ed.dataset.editar)); return; }
  const b = e.target.closest('.check');
  if (!b) return;
  const h = habitos.find((x) => x.id === +b.dataset.h), k = b.dataset.d;
  const antes = sequenciaAtual(h), todosAntes = habitos.every((x) => x.feitos[iso(diasAtras(0))]);
  if (h.feitos[k]) delete h.feitos[k]; else h.feitos[k] = true;
  salvar(); desenhar();
  const novo = document.querySelector(`.check[data-h="${h.id}"][data-d="${k}"]`);
  if (novo && h.feitos[k]) novo.classList.add('estalo');
  // Alertas de metas atingidas
  const depois = sequenciaAtual(h);
  if (h.feitos[k] && depois > antes) {
    if (depois === h.meta) { alertar('🏆', 'Meta atingida!', `${depois} dias seguidos de “${h.nome}”. Incrível!`); confete(); return; }
    if (MARCOS.includes(depois)) { alertar('🔥', `${depois} dias seguidos!`, `Sua sequência de “${h.nome}” está crescendo.`); return; }
  }
  const todosDepois = habitos.length && habitos.every((x) => x.feitos[iso(diasAtras(0))]);
  if (todosDepois && !todosAntes) { alertar('🎉', 'Dia completo!', 'Você fez todos os hábitos de hoje.'); confete(); }
});

let timerAlerta;
function alertar(emoji, titulo, texto) {
  $('#alerta-emoji').textContent = emoji; $('#alerta-titulo').textContent = titulo; $('#alerta-texto').textContent = texto;
  const a = $('#alerta');
  a.hidden = true; void a.offsetWidth; a.hidden = false;
  clearTimeout(timerAlerta);
  timerAlerta = setTimeout(() => { a.hidden = true; }, 4200);
}

/* Confete simples em canvas */
function confete() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('#confete'), ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const ps = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight / 3, vx: (Math.random() - 0.5) * 14, vy: Math.random() * -12 - 4,
    r: Math.random() * 6 + 4, cor: CORES[Math.floor(Math.random() * CORES.length)], g: Math.random() * 6
  }));
  let t = 0;
  (function quadro() {
    ctx.clearRect(0, 0, c.width, c.height);
    ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.vx *= 0.99; p.g += 0.2; ctx.fillStyle = p.cor; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.g); ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
    if (++t < 160) requestAnimationFrame(quadro); else ctx.clearRect(0, 0, c.width, c.height);
  })();
}

/* Criar / editar / excluir */
let editando = null;
$('#f-emojis').innerHTML = EMOJIS.map((e, i) => `<label><input type="radio" name="emoji" value="${e}" ${i === 0 ? 'checked' : ''}><span>${e}</span></label>`).join('');
$('#f-cores').innerHTML = CORES.map((c, i) => `<label><input type="radio" name="cor" value="${c}" ${i === 0 ? 'checked' : ''} aria-label="Cor ${i + 1}"><span class="cor" style="--c:${c}"></span></label>`).join('');
function abrirForm(h = null) {
  editando = h;
  $('#dlg-titulo').textContent = h ? 'Editar hábito' : 'Novo hábito';
  $('#f-nome').value = h?.nome || '';
  const em = document.querySelector(`[name=emoji][value="${h?.emoji || EMOJIS[habitos.length % EMOJIS.length]}"]`);
  if (em) em.checked = true;
  const co = document.querySelector(`[name=cor][value="${h?.cor || CORES[habitos.length % CORES.length]}"]`);
  if (co) co.checked = true;
  $('#f-meta').value = h?.meta || 21;
  $('#f-excluir').hidden = !h; $('#f-excluir').textContent = 'Excluir hábito'; confirmar = false;
  $('#dlg').showModal();
}
$('#novo').addEventListener('click', () => abrirForm());
$('#dlg').addEventListener('close', () => {
  if ($('#dlg').returnValue !== 'salvar') return;
  const dados = { nome: $('#f-nome').value.trim(), emoji: document.querySelector('[name=emoji]:checked').value, cor: document.querySelector('[name=cor]:checked').value, meta: +$('#f-meta').value };
  if (!dados.nome) return;
  if (editando) Object.assign(editando, dados);
  else habitos.push({ id: Date.now(), feitos: {}, ...dados });
  salvar(); desenhar();
});
let confirmar = false;
$('#f-excluir').addEventListener('click', (e) => {
  if (!confirmar) { confirmar = true; e.target.textContent = 'Confirmar exclusão'; return; }
  habitos = habitos.filter((h) => h !== editando);
  salvar(); $('#dlg').close(); desenhar();
});
$('#dlg').addEventListener('click', (e) => { if (e.target === $('#dlg')) $('#dlg').close(); });

const hoje = new Date();
$('#hoje').textContent = (() => { const t = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); })();
cabecalho();
desenhar();
// Vira o dia sozinho se a página ficar aberta
setInterval(() => { if (iso(new Date()) !== iso(hoje)) location.reload(); }, 60000);
