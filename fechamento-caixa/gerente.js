// Aba "Gerente" do Fechamento do Operador: com o PIN, a gerente digita os totais do Anglo de
// cada caixa e a página compara com o que o operador lançou, forma por forma, e também com o
// "Rel. caixa sistema" que o próprio operador digitou. Os números do Anglo ficam em `anglo/` e o
// PIN em `gerencia/pin`, ambos legíveis só por quem edita a página (regras do db).
(function () {
  const { paraCentavos, formatar } = window.Calc;
  const QTD_CAIXAS = 3;
  const TOL = 200;
  // No Anglo o cartão sai num total só (na linha "Outros" do relatório): crédito, parcelado e
  // débito juntos. Só o PIX vem separado. Outros recebimentos do caixa (crediário, cheque) entram
  // junto do cartão.
  const FORMAS = [
    { id: 'dinheiro', nome: 'Dinheiro' },
    { id: 'cartao', nome: 'Cartão' },
    { id: 'pix', nome: 'PIX' },
  ];

  // No Anglo o cartão (crédito, débito e parcelado) vem em "Outros". Lançamentos antigos
  // não têm o campo cartao: soma os campos de antes para não mostrar 0,00.
  const sis = (a, id) => {
    if (!a) return 0;
    if (id === 'cartao' && a.cartao == null) return (a.outros || 0) + (a.credito || 0) + (a.creditoParcelado || 0) + (a.debito || 0);
    return a[id] || 0;
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const hoje = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const dataBR = (iso) => iso.split('-').reverse().join('/');
  const paraCampo = (v) => (v ? formatar(v, false).replace('−', '-') : '');
  const sinal = (v) => (v > 0 ? '+' : '') + formatar(v, false);
  const hora = (iso) => { try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const somar = (l) => (l || []).reduce((t, v) => t + (typeof v === 'number' ? v : v?.valor || 0), 0);
  const idDoc = (data, n) => `${data}_cx${n}`;

  function avisar(msg) {
    const el = $('#aviso');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => (el.hidden = true), 3500);
  }

  // O que o caixa lançou, separado por forma de recebimento.
  function contado(r) {
    const g = (k) => r[k] || 0;
    return {
      dinheiro: g('trocoFinal') + somar(r.sangrias) + g('despesas') + g('valeTransporte') - g('trocoInicial') - g('suprimento'),
      cartao: g('cartao') + g('credito') + g('creditoParcelado') + g('debito') + somar(r.outros), pix: g('pix'),
    };
  }
  function comparar(r, a) {
    const ct = contado(r);
    const linhas = FORMAS.map((f) => ({ ...f, contado: ct[f.id], sistema: sis(a, f.id), dif: ct[f.id] - sis(a, f.id) }));
    const dif = linhas.reduce((t, l) => t + l.dif, 0);
    return { linhas, dif, status: Math.abs(dif) <= TOL ? 'ok' : dif < 0 ? 'falta' : 'sobra' };
  }

  // Fechamento real: a contagem do funcionário com as movimentações do relatório do Anglo
  // (troco inicial, vendas em dinheiro, sangria e despesa registradas no sistema).
  const REAL = [
    { id: 'trocoInicial', nome: 'Troco inicial', func: (r) => r.trocoInicial || 0 },
    { id: 'dinheiro', nome: 'Vendas em dinheiro', func: (r) => r.vendasDinheiro || 0 },
    { id: 'sangria', nome: 'Sangrias', func: (r) => somar(r.sangrias) },
    { id: 'despesa', nome: 'Despesas', func: (r) => (r.despesas || 0) + (r.valeTransporte || 0) },
    { id: 'trocoFinal', nome: 'Troco final', func: (r) => r.trocoFinal || 0 },
  ];
  const temReal = (a) => a && ['trocoInicial', 'sangria', 'despesa'].every((k) => a[k] != null);
  function fechamentoReal(r, a) {
    const sup = r?.suprimento || 0, vale = r?.valeTransporte || 0;
    // Se o vale-transporte não está na despesa do Anglo, ele sai da gaveta do mesmo jeito.
    const esperado = (a.trocoInicial || 0) + sup + (a.dinheiro || 0) - (a.sangria || 0) - (a.despesa || 0) - vale;
    const gaveta = r ? r.trocoFinal || 0 : 0;
    const ct = r ? contado(r) : { cartao: 0, pix: 0 };
    const formas = [
      { nome: 'Dinheiro na gaveta', func: gaveta, sis: esperado },
      { nome: 'Cartão', func: ct.cartao, sis: sis(a, 'cartao') },
      { nome: 'PIX', func: ct.pix, sis: sis(a, 'pix') },
    ].map((l) => ({ ...l, dif: l.func - l.sis }));
    return { esperado, sup, vale, formas, dif: formas.reduce((t, l) => t + l.dif, 0) };
  }
  const fechados = new Set();

  let banco = null;
  let registros = [];
  let anglo = {};
  let pinSalvo = null;
  let liberado = false;
  let trocandoPin = false;
  let pararAnglo = null;
  let pararReg = null;
  const gData = () => $('#g-data').value;
  const abaAberta = () => !$('#aba-gerente').hidden;

  async function iniciar() {
    const db = window.claude?.use ? await window.claude.use('db').catch(() => null) : null;
    if (!db) return;
    let gerente = false;
    try {
      const user = await window.claude.use('user');
      gerente = !!(user && (await user.canEdit()));
    } catch {}
    if (!gerente) return;
    banco = db;
    $('#aba-btn-gerente').hidden = false;
    try {
      const d = await db.doc('gerencia/pin').get();
      pinSalvo = d.exists ? d.data() : null;
    } catch { pinSalvo = null; }
    mostrarTrava();
  }

  // ---------- PIN ----------
  async function hashPin(pin, sal) {
    const bytes = new TextEncoder().encode(sal + ':' + pin);
    if (crypto?.subtle) {
      const h = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 2166136261;
    for (const b of bytes) h = Math.imul(h ^ b, 16777619) >>> 0;
    return 'f' + h.toString(16);
  }

  function mostrarTrava() {
    const criar = !pinSalvo || trocandoPin;
    $('#g-trava').hidden = liberado && !trocandoPin;
    $('#g-conteudo').hidden = !liberado || trocandoPin;
    $('#g-trava-titulo').textContent = trocandoPin ? 'Trocar o PIN' : criar ? 'Crie o PIN da gerente' : 'Área da gerente';
    $('#g-trava-texto').textContent = criar
      ? 'Escolha um PIN de 4 a 6 números. Ele será pedido sempre que alguém abrir esta área.'
      : 'Digite o PIN para conferir os caixas com os números do sistema.';
    $('#g-pin2-rotulo').hidden = !criar;
    $('#g-entrar').textContent = criar ? 'Salvar PIN' : 'Entrar';
    $('#g-trava-erro').textContent = '';
    $('#g-pin').value = ''; $('#g-pin2').value = '';
  }

  function liberar() {
    liberado = true;
    trocandoPin = false;
    mostrarTrava();
    if (!pararAnglo) {
      pararAnglo = banco.collection('anglo').orderBy('data', 'desc').limit(400).onSnapshot((snap) => {
        anglo = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
        render();
      }, () => {});
    }
    if (!pararReg) {
      pararReg = banco.collection('fechamentos').orderBy('data', 'desc').limit(600).onSnapshot((snap) => {
        registros = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        render();
      }, () => {});
    }
    render();
    tocarRelogio();
  }

  function trancar() {
    liberado = false;
    trocandoPin = false;
    if (typeof pararAnglo === 'function') pararAnglo();
    pararAnglo = null;
    anglo = {};
    $('#g-caixas').innerHTML = '';
    $('#g-cal').innerHTML = '';
    $('#g-cal-kpis').innerHTML = '';
    mostrarTrava();
  }

  function tocarRelogio() {
    clearTimeout(tocarRelogio.t);
    if (liberado) tocarRelogio.t = setTimeout(trancar, 10 * 60 * 1000);
  }
  ['click', 'input', 'keydown'].forEach((ev) => $('#aba-gerente').addEventListener(ev, tocarRelogio));

  $('#g-trava').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = $('#g-pin').value.trim();
    const erro = $('#g-trava-erro');
    if (!/^\d{4,6}$/.test(pin)) { erro.textContent = 'O PIN tem de 4 a 6 números.'; return; }
    if (!pinSalvo || trocandoPin) {
      if (pin !== $('#g-pin2').value.trim()) { erro.textContent = 'Os dois PINs não são iguais.'; return; }
      const sal = Math.random().toString(36).slice(2, 10);
      const novo = { sal, hash: await hashPin(pin, sal), alteradoEm: new Date().toISOString() };
      try {
        await banco.doc('gerencia/pin').set(novo);
        pinSalvo = novo;
        avisar('PIN salvo.');
        liberar();
      } catch { erro.textContent = 'Não foi possível salvar o PIN. Só quem edita esta página pode definir o PIN.'; }
      return;
    }
    if ((await hashPin(pin, pinSalvo.sal)) === pinSalvo.hash) liberar();
    else { erro.textContent = 'PIN errado.'; $('#g-pin').value = ''; }
  });
  $('#g-trancar').onclick = trancar;
  $('#g-trocar').onclick = () => { trocandoPin = true; mostrarTrava(); };
  // Sair da aba tranca a área.
  $$('.aba').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.aba === 'gerente') render();
    else if (liberado) trancar();
  }));

  // ---------- conferência ----------
  function chip(status) {
    const t = { ok: 'confere', falta: 'falta', sobra: 'sobra', aguarda: 'falta o sistema', nenhum: 'não enviado', semVenda: 'sem venda' }[status];
    const cls = { ok: 'st-ok', falta: 'st-falta', sobra: 'st-sobra', aguarda: 'st-pendente', nenhum: 'st-semVenda', semVenda: 'st-semVenda' }[status];
    return `<span class="st ${cls}">${t}</span>`;
  }
  function situacao(data, n) {
    const r = registros.find((x) => x.id === idDoc(data, n));
    const a = anglo[idDoc(data, n)];
    if (!r) return { status: 'nenhum', a };
    if (!a) return { status: 'aguarda', r };
    return { ...comparar(r, a), r, a };
  }
  // Envio sem nenhuma contagem (ex.: o envio em branco do clique duplo) num dia que teve venda.
  const vendeu = (a) => !!(a && (a.vendaDia || sis(a, 'dinheiro') + sis(a, 'cartao') + sis(a, 'pix')));
  const emBranco = (r, a) => vendeu(a) && !r.trocoFinal && !r.pix && !contado(r).cartao && !somar(r.sangrias);
  // Diferença do fechamento real (movimentos do Anglo); sem eles, a conferência forma a forma.
  function difReal(r, a) {
    const dif = temReal(a) ? fechamentoReal(r, a).dif : comparar(r, a).dif;
    return { dif, status: Math.abs(dif) <= TOL ? 'ok' : dif < 0 ? 'falta' : 'sobra' };
  }

  function render() {
    if (!liberado || !abaAberta()) return;
    const data = gData();
    let n0 = 0, dTot = 0;
    $('#g-caixas').innerHTML = Array.from({ length: QTD_CAIXAS }, (_, i) => i + 1).map((n) => {
      const s = situacao(data, n);
      const a = anglo[idDoc(data, n)] || {};
      const linhas = s.r ? comparar(s.r, a).linhas : FORMAS.map((f) => ({ ...f, contado: 0, sistema: sis(a, f.id), dif: 0 }));
      if (s.dif != null && !emBranco(s.r, s.a)) { n0++; dTot += difReal(s.r, s.a).dif; }
      const totalAnglo = FORMAS.reduce((t, f) => t + sis(a, f.id), 0);
      const cls = (v) => (Math.abs(v) > TOL ? (v < 0 ? 'neg' : 'pos') : '');
      const extras = [];
      if (s.r && s.a && emBranco(s.r, s.a)) {
        extras.push('<p class="g-alerta g-ruim">Este envio está em branco (sem troco final, cartão nem PIX), mas o Anglo tem venda neste dia. Não é falta de dinheiro: o fechamento do caixa não foi lançado. Peça ao operador para reenviar.</p>');
      }
      if (s.r) {
        // O que o próprio operador digitou como sistema, contra o Anglo.
        if (s.a) {
          const dSis = (s.r.sistema || 0) - totalAnglo;
          extras.push(`<p class="g-alerta ${Math.abs(dSis) > TOL ? 'g-ruim' : ''}">Operador digitou como sistema <b>${formatar(s.r.sistema || 0)}</b>; o Anglo dá <b>${formatar(totalAnglo)}</b>${Math.abs(dSis) > TOL ? ` (${sinal(dSis)}). O número do sistema lançado pelo caixa não confere.` : '. Confere.'}</p>`);
          if (s.r.vendasDinheiro && Math.abs(s.r.vendasDinheiro - (a.dinheiro || 0)) > TOL) {
            extras.push(`<p class="g-alerta g-ruim">Vendas em dinheiro digitadas pelo operador: <b>${formatar(s.r.vendasDinheiro)}</b>; no Anglo: <b>${formatar(a.dinheiro || 0)}</b>.</p>`);
          }
        }
        if (s.r.despesas) extras.push(`<p class="nota">Despesa ${formatar(s.r.despesas)}: ${esc(s.r.despesasDesc || 'sem descrição')}</p>`);
        if (s.r.justificativa) extras.push(`<p class="nota">Justificativa: ${esc(s.r.justificativa)}</p>`);
      }
      return `<article class="g-cx" data-cx="${n}">
        <header><h3>Caixa ${n}</h3>${chip(s.r && s.r.status === 'semVenda' && !s.a ? 'semVenda' : s.status)}</header>
        <p class="nota">${s.r ? `${esc(s.r.operador || '—')} · enviado ${hora(s.r.enviadoEm)} · diferença no fechamento dele ${sinal(s.r.diferenca || 0)}` : 'O caixa ainda não enviou'}</p>
        <div class="rolagem"><table class="g-tab">
          <thead><tr><th>Forma</th><th>Caixa</th><th>Sistema (Anglo)</th><th>Diferença</th></tr></thead>
          <tbody>${linhas.map((l) => `<tr>
            <td>${l.nome}</td>
            <td class="num">${s.r ? formatar(l.contado, false) : '—'}</td>
            <td><input class="moeda" id="g-${n}-${l.id}" inputmode="decimal" placeholder="0,00" value="${paraCampo(sis(a, l.id))}" aria-label="${l.nome} no sistema, caixa ${n}"></td>
            <td class="num ${s.dif != null ? cls(l.dif) : ''}">${s.dif != null ? sinal(l.dif) : '—'}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Total</td><td class="num">${s.r ? formatar(linhas.reduce((t, l) => t + l.contado, 0), false) : '—'}</td>
            <td class="num">${formatar(totalAnglo, false)}</td>
            <td class="num ${s.dif != null ? cls(s.dif) : ''}"><b>${s.dif != null ? sinal(s.dif) : '—'}</b></td></tr></tfoot>
        </table></div>
        ${extras.join('')}
        ${blocoReal(n, s.r, a)}
        <button type="button" class="primario g-salvar" data-salvar="${n}">Salvar números do sistema</button>
      </article>`;
    }).join('');
    $('#g-resumo').textContent = n0 ? `${n0} ${n0 === 1 ? 'caixa conferido' : 'caixas conferidos'} · diferença real do dia ${sinal(dTot)}` : 'Nenhum caixa conferido neste dia.';
    renderCalendario();
  }

  function blocoReal(n, r, a) {
    const cls = (v) => (Math.abs(v) > TOL ? (v < 0 ? 'neg' : 'pos') : '');
    const ok = temReal(a) && (a.dinheiro != null || sis(a, 'cartao') || sis(a, 'pix'));
    const fr = ok ? fechamentoReal(r, a) : null;
    const resumo = !ok ? 'faltam números do relatório' : r ? `diferença ${sinal(fr.dif)}` : 'o caixa não enviou';
    const mov = REAL.map((l) => {
      const f = r ? l.func(r) : null;
      const v = a[l.id];
      const d = f != null && v != null ? f - v : null;
      return `<tr><td>${l.nome}</td><td class="num">${f != null ? formatar(f, false) : '—'}</td>
        <td>${l.id === 'dinheiro' ? `<span class="num">${formatar(v || 0, false)}</span>` : `<input class="moeda" id="g-${n}-${l.id}" inputmode="decimal" placeholder="0,00" value="${paraCampo(v || 0)}" aria-label="${l.nome} no sistema, caixa ${n}">`}</td>
        <td class="num ${d != null ? cls(d) : ''}">${d != null ? sinal(d) : '—'}</td></tr>`;
    }).join('');
    const resultado = fr ? `<div class="rolagem"><table class="g-tab g-real-res">
        <thead><tr><th>Fechamento real</th><th>Funcionário</th><th>Sistema</th><th>Diferença</th></tr></thead>
        <tbody>${fr.formas.map((l) => `<tr><td>${l.nome}</td><td class="num">${r ? formatar(l.func, false) : '—'}</td><td class="num">${formatar(l.sis, false)}</td><td class="num ${r ? cls(l.dif) : ''}">${r ? sinal(l.dif) : '—'}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Diferença real</td><td></td><td></td><td class="num ${r ? cls(fr.dif) : ''}"><b>${r ? sinal(fr.dif) : '—'}</b></td></tr></tfoot>
      </table></div>
      <p class="nota">Dinheiro esperado na gaveta = troco inicial ${formatar(a.trocoInicial || 0)}${fr.sup ? ` + suprimento ${formatar(fr.sup)}` : ''} + vendas em dinheiro ${formatar(a.dinheiro || 0)} − sangrias ${formatar(a.sangria || 0)} − despesas ${formatar(a.despesa || 0)}${fr.vale ? ` − vale-transporte ${formatar(fr.vale)}` : ''} = <b>${formatar(fr.esperado)}</b>. Os números do sistema vêm do relatório do Anglo; a gaveta, o cartão e o PIX vêm da contagem do funcionário.</p>`
      : '<p class="nota">Lance troco inicial, sangrias e despesas do relatório do Anglo e clique em "Salvar números do sistema".</p>';
    return `<details class="g-real" data-real="${n}" ${fechados.has(n) ? '' : 'open'}>
      <summary>Fechamento real <span class="nota">· ${resumo}</span></summary>
      <div class="rolagem"><table class="g-tab">
        <thead><tr><th>Movimento</th><th>Funcionário</th><th>Sistema (Anglo)</th><th>Diferença</th></tr></thead>
        <tbody>${mov}</tbody>
      </table></div>
      ${resultado}
    </details>`;
  }

  // ---------- calendário da gerente ----------
  const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const diaSemana = (iso) => new Date(iso + 'T12:00:00').getDay();
  const gMes = () => $('#g-cal-mes').value || gData().slice(0, 7);
  function renderCalendario() {
    const mes = gMes();
    const [ano, m] = mes.split('-').map(Number);
    const hj = hoje();
    const ultimo = new Date(ano, m, 0).getDate();
    const caixas = Array.from({ length: QTD_CAIXAS }, (_, i) => i + 1);
    const conferidos = [];
    let semAnglo = 0, naoEnviou = 0;
    const celulas = {};
    for (let d = 1; d <= ultimo; d++) {
      const iso = `${mes}-${String(d).padStart(2, '0')}`;
      if (iso > hj) continue;
      celulas[iso] = caixas.map((n) => {
        const s = situacao(iso, n);
        if (!s.r) {
          if (!s.a) return null;
          if (!vendeu(s.a)) return { n, st: 'semVenda', txt: 'sem venda' };
          naoEnviou++;
          return { n, st: 'naoEnviou', txt: 'não enviou' };
        }
        if (!s.a) {
          if (s.r.status === 'semVenda') return { n, st: 'semVenda', txt: 'sem venda' };
          semAnglo++;
          return { n, st: 'pendente', txt: 'falta Anglo', op: s.r.operador };
        }
        if (emBranco(s.r, s.a)) { naoEnviou++; return { n, st: 'naoEnviou', txt: 'em branco', op: s.r.operador }; }
        const real = difReal(s.r, s.a);
        conferidos.push({ n, ...real });
        return { n, st: real.status, txt: sinal(real.dif), dif: real.dif, op: s.r.operador };
      });
    }
    const fora = conferidos.filter((c) => c.status !== 'ok');
    const faltas = fora.filter((c) => c.dif < 0), sobras = fora.filter((c) => c.dif > 0);
    const soma = (l) => l.reduce((t, c) => t + c.dif, 0);
    const saldo = soma(conferidos);
    const cor = (v) => (v < -TOL ? 'neg' : v > TOL ? 'pos' : '');
    const plural = (k, um, varios) => `${k} ${k === 1 ? um : varios}`;
    $('#g-cal-kpis').innerHTML = `
      <div class="kpi"><span>Faltas reais</span><strong class="neg">${formatar(soma(faltas))}</strong><small>${plural(faltas.length, 'fechamento', 'fechamentos')} acima de ${formatar(TOL)}</small></div>
      <div class="kpi"><span>Sobras reais</span><strong class="pos">${formatar(soma(sobras))}</strong><small>${plural(sobras.length, 'fechamento', 'fechamentos')}</small></div>
      <div class="kpi"><span>Saldo real do mês</span><strong class="${cor(saldo)}">${sinal(saldo)}</strong><small>${plural(conferidos.length, 'caixa conferido', 'caixas conferidos')}</small></div>
      <div class="kpi"><span>Por caixa</span><small>${caixas.map((n) => { const l = conferidos.filter((c) => c.n === n); const t = soma(l); return `Caixa ${n}: <b class="${cor(t)}">${sinal(t)}</b> (${l.length})`; }).join('<br>')}</small></div>
      <div class="kpi"><span>Pendências</span><small>${plural(semAnglo, 'envio', 'envios')} sem número do Anglo<br>${plural(naoEnviou, 'caixa', 'caixas')} com venda e sem envio (ou envio em branco)</small></div>`;

    const temDomingo = Object.keys(celulas).some((iso) => diaSemana(iso) === 0 && celulas[iso].some(Boolean));
    const cols = temDomingo ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    const el = $('#g-cal');
    el.style.setProperty('--cols', cols.length);
    let html = cols.map((c) => `<div class="cal-cab">${DIAS[c]}</div>`).join('');
    let primeiro = true;
    for (let d = 1; d <= ultimo; d++) {
      const iso = `${mes}-${String(d).padStart(2, '0')}`;
      const pos = cols.indexOf(diaSemana(iso));
      if (pos < 0) continue;
      if (primeiro) { html += '<div class="cal-dia fora"></div>'.repeat(pos); primeiro = false; }
      const cel = celulas[iso];
      const sel = iso === gData() ? ' g-cal-sel' : '';
      if (!cel || !cel.some(Boolean)) { html += `<div class="cal-dia vazio${sel}"><span class="cal-num">${d}</span></div>`; continue; }
      const linhas = cel.map((c, i) => c
        ? `<button type="button" class="cal-cx st-${c.st}" data-g-dia="${iso}" title="${esc(c.op || '')}"><span>cx${c.n}</span><span>${c.txt}</span></button>`
        : `<span class="cal-cx"><span>cx${i + 1}</span><span>—</span></span>`).join('');
      const total = cel.reduce((t, c) => t + (c?.dif || 0), 0);
      const temDif = cel.some((c) => c?.dif != null);
      html += `<div class="cal-dia${sel}"><span class="cal-num">${d}${temDif ? `<small class="${cor(total)}">${sinal(total)}</small>` : ''}</span>${linhas}</div>`;
    }
    el.innerHTML = html;
  }

  $('#g-caixas').addEventListener('focusout', (e) => {
    const t = e.target;
    if (t.classList.contains('moeda') && t.value.trim()) t.value = paraCampo(paraCentavos(t.value)) || '0,00';
  });
  $('#g-caixas').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-salvar]');
    if (!b || b.disabled) return;
    const n = +b.dataset.salvar;
    const data = gData();
    const corpo = { ...(anglo[idDoc(data, n)] || {}), data, caixa: n, lancadoEm: new Date().toISOString() };
    FORMAS.forEach((f) => (corpo[f.id] = paraCentavos($(`#g-${n}-${f.id}`).value)));
    REAL.forEach((l) => { const el = $(`#g-${n}-${l.id}`); if (el && l.id !== 'dinheiro') corpo[l.id] = paraCentavos(el.value); });
    b.disabled = true;
    try {
      await banco.collection('anglo').doc(idDoc(data, n)).set(corpo);
      anglo[idDoc(data, n)] = corpo;
      avisar(`Números do sistema do caixa ${n} salvos.`);
      render();
    } catch {
      avisar('Não foi possível salvar. Só quem edita esta página pode lançar os números do sistema.');
      b.disabled = false;
    }
  });
  $('#g-caixas').addEventListener('toggle', (e) => {
    const d = e.target.closest?.('[data-real]');
    if (d) d.open ? fechados.delete(+d.dataset.real) : fechados.add(+d.dataset.real);
  }, true);
  $('#g-cal').addEventListener('click', (e) => {
    const b = e.target.closest('[data-g-dia]');
    if (!b) return;
    $('#g-data').value = b.dataset.gDia;
    render();
    $('#g-caixas').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const moverMes = (k) => {
    const [a, m] = gMes().split('-').map(Number);
    const d = new Date(a, m - 1 + k, 1);
    $('#g-cal-mes').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    renderCalendario();
  };
  $('#g-cal-mes').addEventListener('change', renderCalendario);
  $('#g-cal-ant').onclick = () => moverMes(-1);
  $('#g-cal-prox').onclick = () => moverMes(1);
  $('#g-data').addEventListener('change', render);
  $('#g-ant').onclick = () => { $('#g-data').value = somaDias(gData(), -1); render(); };
  $('#g-prox').onclick = () => { $('#g-data').value = somaDias(gData(), 1); render(); };

  $('#g-data').value = hoje();
  $('#g-cal-mes').value = hoje().slice(0, 7);
  iniciar();
})();
