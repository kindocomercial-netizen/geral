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
    const linhas = FORMAS.map((f) => ({ ...f, contado: ct[f.id], sistema: a?.[f.id] || 0, dif: ct[f.id] - (a?.[f.id] || 0) }));
    const dif = linhas.reduce((t, l) => t + l.dif, 0);
    return { linhas, dif, status: Math.abs(dif) <= TOL ? 'ok' : dif < 0 ? 'falta' : 'sobra' };
  }

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
    $('#g-hist').innerHTML = '';
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
    if (!r) return { status: 'nenhum' };
    if (!a) return { status: 'aguarda', r };
    return { ...comparar(r, a), r, a };
  }

  function render() {
    if (!liberado || !abaAberta()) return;
    const data = gData();
    let n0 = 0, dTot = 0;
    $('#g-caixas').innerHTML = Array.from({ length: QTD_CAIXAS }, (_, i) => i + 1).map((n) => {
      const s = situacao(data, n);
      const a = anglo[idDoc(data, n)] || {};
      const linhas = s.r ? comparar(s.r, a).linhas : FORMAS.map((f) => ({ ...f, contado: 0, sistema: a[f.id] || 0, dif: 0 }));
      if (s.dif != null) { n0++; dTot += s.dif; }
      const totalAnglo = FORMAS.reduce((t, f) => t + (a[f.id] || 0), 0);
      const cls = (v) => (Math.abs(v) > TOL ? (v < 0 ? 'neg' : 'pos') : '');
      const extras = [];
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
            <td><input class="moeda" id="g-${n}-${l.id}" inputmode="decimal" placeholder="0,00" value="${paraCampo(a[l.id] || 0)}" aria-label="${l.nome} no sistema, caixa ${n}"></td>
            <td class="num ${s.dif != null ? cls(l.dif) : ''}">${s.dif != null ? sinal(l.dif) : '—'}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Total</td><td class="num">${s.r ? formatar(linhas.reduce((t, l) => t + l.contado, 0), false) : '—'}</td>
            <td class="num">${formatar(totalAnglo, false)}</td>
            <td class="num ${s.dif != null ? cls(s.dif) : ''}"><b>${s.dif != null ? sinal(s.dif) : '—'}</b></td></tr></tfoot>
        </table></div>
        ${extras.join('')}
        <button type="button" class="primario g-salvar" data-salvar="${n}">Salvar números do sistema</button>
      </article>`;
    }).join('');
    $('#g-resumo').textContent = n0 ? `${n0} ${n0 === 1 ? 'caixa conferido' : 'caixas conferidos'} · diferença real do dia ${sinal(dTot)}` : 'Nenhum caixa conferido neste dia.';
    renderHistorico();
  }

  function renderHistorico() {
    const dias = Array.from({ length: 14 }, (_, i) => somaDias(hoje(), -i));
    $('#g-hist').innerHTML = `<thead><tr><th>Dia</th>${Array.from({ length: QTD_CAIXAS }, (_, i) => `<th>Caixa ${i + 1}</th>`).join('')}</tr></thead>
      <tbody>${dias.map((d) => `<tr><td><button type="button" class="link-dia" data-dia="${d}">${dataBR(d).slice(0, 5)}</button></td>${
        Array.from({ length: QTD_CAIXAS }, (_, i) => {
          const s = situacao(d, i + 1);
          return `<td>${chip(s.status)}${s.dif != null ? ` <span class="num">${sinal(s.dif)}</span>` : ''}</td>`;
        }).join('')}</tr>`).join('')}</tbody>`;
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
    const corpo = { data, caixa: n, lancadoEm: new Date().toISOString() };
    FORMAS.forEach((f) => (corpo[f.id] = paraCentavos($(`#g-${n}-${f.id}`).value)));
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
  $('#g-hist').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dia]');
    if (b) { $('#g-data').value = b.dataset.dia; render(); }
  });
  $('#g-data').addEventListener('change', render);
  $('#g-ant').onclick = () => { $('#g-data').value = somaDias(gData(), -1); render(); };
  $('#g-prox').onclick = () => { $('#g-data').value = somaDias(gData(), 1); render(); };

  $('#g-data').value = hoje();
  iniciar();
})();
