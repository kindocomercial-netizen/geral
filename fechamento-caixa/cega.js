// Fechamento às cegas: o operador lança só o que contou (gaveta, maquininha, PIX) e não vê
// diferença nenhuma. O gerente lança os totais do Anglo por caixa e a página compara forma por
// forma. Os números do sistema ficam em `anglo/`, que só quem edita a página lê (regra do db).
(function () {
  const { paraCentavos, formatar } = window.Calc;
  const QTD_CAIXAS = 3;
  const TOL = 200; // R$ 2,00
  const LOCAL = 'fechamento-cego:';
  const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const CAMPOS = ['trocoInicial', 'suprimento', 'trocoFinal', 'despesas', 'valeTransporte', 'credito', 'creditoParcelado', 'debito', 'pix'];
  // Linhas da conferência: o que o caixa contou x o campo do Anglo.
  const FORMAS = [
    { id: 'dinheiro', nome: 'Dinheiro' },
    { id: 'credito', nome: 'Crédito à vista' },
    { id: 'creditoParcelado', nome: 'Crédito parcelado' },
    { id: 'debito', nome: 'Débito' },
    { id: 'pix', nome: 'PIX' },
    { id: 'outros', nome: 'Outros (crediário…)' },
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
  const lerLocal = (k, p) => { try { const v = localStorage.getItem(LOCAL + k); return v == null ? p : JSON.parse(v); } catch { return p; } };
  const gravarLocal = (k, v) => { try { localStorage.setItem(LOCAL + k, JSON.stringify(v)); } catch {} };
  const apagarLocal = (k) => { try { localStorage.removeItem(LOCAL + k); } catch {} };
  const idDoc = (data, n) => `${data}_cx${n}`;

  function avisar(msg) {
    const el = $('#aviso');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => (el.hidden = true), 3500);
  }

  // O que o caixa contou, já separado por forma de recebimento.
  function contado(r) {
    const g = (k) => r[k] || 0;
    return {
      dinheiro: g('trocoFinal') + somar(r.sangrias) + g('despesas') + g('valeTransporte') - g('trocoInicial') - g('suprimento'),
      credito: g('credito'), creditoParcelado: g('creditoParcelado'), debito: g('debito'), pix: g('pix'),
      outros: somar(r.outros),
    };
  }
  function comparar(r, a) {
    const ct = contado(r);
    const linhas = FORMAS.map((f) => ({ ...f, contado: ct[f.id], sistema: a?.[f.id] || 0, dif: ct[f.id] - (a?.[f.id] || 0) }));
    const dif = linhas.reduce((t, l) => t + l.dif, 0);
    const status = Math.abs(dif) <= TOL ? 'ok' : dif < 0 ? 'falta' : 'sobra';
    return { linhas, dif, status };
  }

  // ---------- conexão ----------
  let banco = null;
  let cegos = [];           // fechamentos lançados pelos operadores
  let anglo = {};           // id -> números do sistema (só o gerente recebe)
  let gerente = false;

  async function conectar() {
    const db = window.claude?.use ? await window.claude.use('db').catch(() => null) : null;
    if (!db) {
      $('#conexao').textContent = 'NÃO CONECTADO À LOJA. Entre na conta Claude da loja e recarregue a página para poder enviar.';
      $('#conexao').classList.add('offline');
      atualizar();
      return;
    }
    banco = db;
    $('#conexao').textContent = 'Envios compartilhados com a loja';
    db.collection('cegos').orderBy('data', 'desc').limit(400).onSnapshot((snap) => {
      cegos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    }, () => { $('#conexao').textContent = 'Sem conexão com os envios. Recarregue a página.'; $('#conexao').classList.add('offline'); });
    try {
      const user = await window.claude.use('user');
      gerente = !!(user && (await user.canEdit()));
      if (user && (await user.can('data.write')) === false) {
        podeEscrever = false;
        $('#conexao').textContent = 'Você pode ver, mas não enviar. Peça acesso de Colaborador ao gerente.';
      }
    } catch {}
    if (gerente) {
      $('#nav').hidden = false;
      prepararTrava();
    }
    atualizar();
  }

  // ---------- operador ----------
  let caixa = null;
  let c = vazio();
  let existente = null;
  let podeEscrever = true;
  let enviando = false;

  function vazio() {
    return { trocoInicial: 0, suprimento: 0, trocoFinal: 0, despesas: 0, despesasDesc: '', valeTransporte: 0,
      credito: 0, creditoParcelado: 0, debito: 0, pix: 0, sangrias: [], outros: [], obs: '' };
  }
  const dataSel = () => $('#f-data').value;

  function trocoAnterior(data, n) {
    const ant = cegos.filter((r) => r.caixa === n && r.data < data).sort((a, b) => b.data.localeCompare(a.data))[0];
    return ant ? { data: ant.data, valor: ant.trocoFinal || 0 } : null;
  }

  function renderCaixas() {
    const data = dataSel();
    $('#f-caixas').innerHTML = Array.from({ length: QTD_CAIXAS }, (_, i) => i + 1).map((n) => {
      const r = cegos.find((x) => x.id === idDoc(data, n));
      return `<button type="button" role="radio" aria-checked="${n === caixa}" data-cx="${n}" id="f-cx${n}">
        <b>Caixa ${n}</b><small>${r ? 'enviado ' + hora(r.enviadoEm) : 'não enviado'}</small></button>`;
    }).join('');
  }

  function renderHoje() {
    const data = hoje();
    const d = new Date(data + 'T12:00:00');
    const itens = Array.from({ length: QTD_CAIXAS }, (_, i) => i + 1).map((n) => {
      const r = cegos.find((x) => x.id === idDoc(data, n));
      return `<span class="hoje-cx ${r ? 'st-ok' : ''}">Caixa ${n}: ${r ? 'enviado' : 'falta enviar'}</span>`;
    }).join('');
    $('#hoje').innerHTML = `<span>${DIAS[d.getDay()]}, ${dataBR(data)}:</span>${itens}`;
  }

  function renderSublistas() {
    $('#lista-sangrias').innerHTML = c.sangrias.map((v, j) => `
      <div class="linha"><span>Sangria ${j + 1}</span>
        <div class="item" style="grid-template-columns:1fr 32px"><input class="moeda" id="f-s${j}" data-lista="sangrias" data-j="${j}" inputmode="decimal" value="${paraCampo(v)}" aria-label="Sangria ${j + 1}">
        <button type="button" data-rem="sangrias" data-j="${j}" aria-label="Remover sangria">×</button></div></div>`).join('');
    $('#lista-outros').innerHTML = c.outros.map((o, j) => `
      <div class="item"><input id="f-o${j}d" data-lista="outros" data-j="${j}" data-campo="desc" value="${esc(o.desc)}" placeholder="Crediário, cheque..." aria-label="Descrição">
        <input class="moeda" id="f-o${j}v" data-lista="outros" data-j="${j}" data-campo="valor" inputmode="decimal" value="${paraCampo(o.valor)}" aria-label="Valor">
        <button type="button" data-rem="outros" data-j="${j}" aria-label="Remover">×</button></div>`).join('');
  }

  function carregar() {
    const data = dataSel();
    existente = caixa ? cegos.find((r) => r.id === idDoc(data, caixa)) : null;
    const rascunho = caixa ? lerLocal(`rascunho:${idDoc(data, caixa)}`, null) : null;
    if (rascunho) c = { ...vazio(), ...rascunho };
    else if (existente) c = { ...vazio(), ...JSON.parse(JSON.stringify(existente)) };
    else {
      c = vazio();
      const t = caixa && trocoAnterior(data, caixa);
      if (t) c.trocoInicial = t.valor;
    }
    CAMPOS.forEach((k) => ($(`#f-${k}`).value = paraCampo(c[k])));
    $('#f-despesasDesc').value = c.despesasDesc || '';
    $('#f-obs').value = c.obs || '';
    renderSublistas();
    const t = caixa && trocoAnterior(data, caixa);
    $('#dica-troco').textContent = t ? `fechou ${dataBR(t.data).slice(0, 5)} com ${formatar(t.valor)}` : 'o que havia na gaveta ao abrir';
    const ed = $('#f-editando');
    ed.hidden = !existente && !rascunho;
    ed.textContent = rascunho ? 'Rascunho recuperado deste aparelho. Ainda não foi enviado.'
      : existente ? `Enviado por ${existente.operador || 'alguém'} às ${hora(existente.enviadoEm)}. Se enviar de novo, substitui (o anterior fica registrado).` : '';
    atualizar();
  }

  function atualizar() {
    const ct = contado(c);
    $('#res-din').textContent = formatar(ct.dinheiro);
    $('#res-maq').textContent = formatar(ct.credito + ct.creditoParcelado + ct.debito);
    $('#res-pix').textContent = formatar(ct.pix);
    const preenchido = c.trocoFinal || c.credito || c.creditoParcelado || c.debito || c.pix || c.sangrias.some(Boolean);
    $('#res-card').className = 'res-card ' + (existente ? 'r-ok' : caixa && preenchido ? 'r-pendente' : 'r-semVenda');
    $('#res-rotulo').textContent = !caixa ? 'Escolha o caixa'
      : existente ? `Enviado às ${hora(existente.enviadoEm)}, aguardando conferência` : preenchido ? 'Pronto para enviar' : 'Lance o que você contou';
    $('#linha-despesasDesc').hidden = !c.despesas && !c.despesasDesc;
    validarEnvio();
  }

  function validarEnvio() {
    const faltas = [];
    if (!banco) faltas.push('conexão com a loja');
    if (!podeEscrever) faltas.push('permissão para enviar');
    if (!$('#f-operador').value.trim()) faltas.push('seu nome');
    if (!caixa) faltas.push('o caixa');
    if (!dataSel()) faltas.push('a data');
    $('#btn-enviar').disabled = enviando || faltas.length > 0;
    $('#enviar-nota').textContent = faltas.length ? 'Falta: ' + faltas.join(', ') + '.'
      : [c.despesas && !(c.despesasDesc || '').trim() ? 'Descreva a despesa antes de enviar.' : '',
        existente ? 'Vai substituir o envio anterior deste caixa.' : ''].filter(Boolean).join(' ');
  }

  function guardarRascunho() {
    if (!caixa) return;
    clearTimeout(guardarRascunho.t);
    guardarRascunho.t = setTimeout(() => gravarLocal(`rascunho:${idDoc(dataSel(), caixa)}`, c), 400);
  }

  function escolherCaixa(n) {
    caixa = n;
    renderCaixas();
    carregar();
  }

  $('#form').addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'f-operador') { gravarLocal('operador', t.value); validarEnvio(); return; }
    if (t.id === 'f-data') return;
    if (t.id === 'f-despesasDesc') c.despesasDesc = t.value;
    else if (t.id === 'f-obs') c.obs = t.value;
    else if (t.dataset.lista === 'sangrias') c.sangrias[+t.dataset.j] = paraCentavos(t.value);
    else if (t.dataset.lista === 'outros') {
      const it = c.outros[+t.dataset.j];
      if (t.dataset.campo === 'desc') it.desc = t.value; else it.valor = paraCentavos(t.value);
    } else if (t.dataset.k) c[t.dataset.k] = paraCentavos(t.value);
    guardarRascunho();
    atualizar();
  });
  $('#form').addEventListener('focusout', (e) => {
    const t = e.target;
    if (t.classList.contains('moeda') && t.value.trim()) t.value = paraCampo(paraCentavos(t.value)) || '0,00';
  });
  $('#form').addEventListener('change', (e) => {
    if (e.target.id === 'f-data') { renderCaixas(); carregar(); }
  });
  $('#form').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.cx) return escolherCaixa(+b.dataset.cx);
    if (b.dataset.rem) {
      c[b.dataset.rem].splice(+b.dataset.j, 1);
      renderSublistas(); guardarRascunho(); atualizar();
    } else if (b.id === 'btn-add-sangria' || b.id === 'btn-add-outro') {
      const lista = b.id === 'btn-add-sangria' ? 'sangrias' : 'outros';
      if (lista === 'sangrias') c.sangrias.push(0); else c.outros.push({ desc: '', valor: 0 });
      renderSublistas();
      $(lista === 'sangrias' ? `#f-s${c.sangrias.length - 1}` : `#f-o${c.outros.length - 1}d`).focus();
    }
  });

  $('#btn-enviar').addEventListener('click', async () => {
    if (enviando) return;
    validarEnvio();
    if ($('#btn-enviar').disabled) return;
    const data = dataSel();
    const id = idDoc(data, caixa);
    const anterior = cegos.find((x) => x.id === id);
    const corpo = {
      data, caixa, operador: $('#f-operador').value.trim(),
      ...Object.fromEntries(CAMPOS.map((k) => [k, c[k] || 0])),
      sangrias: c.sangrias.filter(Boolean),
      outros: c.outros.filter((o) => o.valor || o.desc),
      despesasDesc: c.despesas ? (c.despesasDesc || '').trim() : '',
      obs: (c.obs || '').trim(),
      enviadoEm: new Date().toISOString(),
      reenvios: anterior ? [...(anterior.reenvios || []), { enviadoEm: anterior.enviadoEm, operador: anterior.operador }].slice(-10) : [],
    };
    const botao = $('#btn-enviar');
    enviando = true;
    botao.disabled = true;
    botao.textContent = 'Enviando…';
    try {
      await banco.collection('cegos').doc(id).set(corpo);
      cegos = [{ id, ...corpo }, ...cegos.filter((x) => x.id !== id)];
      apagarLocal(`rascunho:${id}`);
      avisar(`Caixa ${caixa} de ${dataBR(data)} enviado. Obrigado!`);
      renderCaixas(); renderHoje(); carregar();
    } catch (err) {
      if (err?.code === 'invalid_argument') { podeEscrever = false; avisar('Seu acesso não permite enviar. Peça acesso de Colaborador ao gerente.'); }
      else avisar('Não foi possível enviar. Confira a internet e tente de novo; os valores continuam aqui.');
    } finally {
      enviando = false;
      botao.textContent = 'Enviar fechamento';
      validarEnvio();
    }
  });

  // ---------- gerente ----------
  const gData = () => $('#g-data').value;

  function chip(status) {
    const t = { ok: 'confere', falta: 'falta', sobra: 'sobra', aguarda: 'falta o sistema', nenhum: 'não enviado' }[status];
    const cls = { ok: 'st-ok', falta: 'st-falta', sobra: 'st-sobra', aguarda: 'st-pendente', nenhum: 'st-semVenda' }[status];
    return `<span class="st ${cls}">${t}</span>`;
  }
  function situacao(data, n) {
    const r = cegos.find((x) => x.id === idDoc(data, n));
    const a = anglo[idDoc(data, n)];
    if (!r) return { status: 'nenhum' };
    if (!a) return { status: 'aguarda', r };
    return { ...comparar(r, a), r, a };
  }

  // ---------- PIN da gerente ----------
  // A tranca impede a olhada casual quando o caixa usa a mesma conta da gerente. Os números do
  // sistema só são buscados depois do PIN certo. Não substitui contas separadas.
  let pinSalvo = null;      // { sal, hash } guardado em gerencia/pin
  let liberado = false;
  let pararAnglo = null;
  let trocandoPin = false;

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

  async function prepararTrava() {
    try {
      const d = await banco.doc('gerencia/pin').get();
      pinSalvo = d.exists ? d.data() : null;
    } catch { pinSalvo = null; }
    mostrarTrava();
  }

  function mostrarTrava() {
    const criar = !pinSalvo || trocandoPin;
    $('#g-trava').hidden = liberado && !trocandoPin;
    $('#g-conteudo').hidden = !liberado || trocandoPin;
    $('#g-trava-titulo').textContent = trocandoPin ? 'Trocar o PIN' : criar ? 'Crie o PIN da gerente' : 'Área da gerente';
    $('#g-trava-texto').textContent = criar
      ? 'Escolha um PIN de 4 a 6 números. Ele será pedido sempre que alguém abrir esta área.'
      : 'Digite o PIN para ver a conferência com os números do sistema.';
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
        renderGerente();
      }, () => {});
    }
    renderGerente();
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

  // Tranca sozinha após 10 minutos sem mexer na área.
  function tocarRelogio() {
    clearTimeout(tocarRelogio.t);
    if (liberado) tocarRelogio.t = setTimeout(trancar, 10 * 60 * 1000);
  }
  ['click', 'input', 'keydown'].forEach((ev) => $('#aba-conferir').addEventListener(ev, tocarRelogio));

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

  function renderGerente() {
    if (!gerente || !liberado || $('#aba-conferir').hidden) return;
    const data = gData();
    let n0 = 0, dTot = 0;
    $('#g-caixas').innerHTML = Array.from({ length: QTD_CAIXAS }, (_, i) => i + 1).map((n) => {
      const s = situacao(data, n);
      const a = anglo[idDoc(data, n)] || {};
      const linhas = s.r ? comparar(s.r, a).linhas : FORMAS.map((f) => ({ ...f, contado: 0, sistema: a[f.id] || 0, dif: 0 }));
      if (s.dif != null) { n0++; dTot += s.dif; }
      const cab = s.r ? `${esc(s.r.operador || '—')} · enviado ${hora(s.r.enviadoEm)}` : 'O caixa ainda não enviou';
      const extras = s.r ? [
        s.r.despesas ? `Despesa ${formatar(s.r.despesas)}: ${esc(s.r.despesasDesc || 'sem descrição')}` : '',
        s.r.obs ? `Obs.: ${esc(s.r.obs)}` : '',
      ].filter(Boolean).map((t) => `<p class="nota">${t}</p>`).join('') : '';
      return `<article class="g-cx" data-cx="${n}">
        <header><h3>Caixa ${n}</h3>${chip(s.status)}</header>
        <p class="nota">${cab}</p>
        <table class="g-tab">
          <thead><tr><th>Forma</th><th>Contado</th><th>Sistema (Anglo)</th><th>Diferença</th></tr></thead>
          <tbody>${linhas.map((l) => `<tr>
            <td>${l.nome}</td>
            <td class="num">${s.r ? formatar(l.contado, false) : '—'}</td>
            <td><input class="moeda" id="g-${n}-${l.id}" data-g="${l.id}" inputmode="decimal" placeholder="0,00" value="${paraCampo(a[l.id] || 0)}" aria-label="${l.nome} no sistema, caixa ${n}"></td>
            <td class="num ${s.dif != null && Math.abs(l.dif) > TOL ? (l.dif < 0 ? 'neg' : 'pos') : ''}">${s.dif != null ? sinal(l.dif) : '—'}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Total</td><td class="num">${s.r ? formatar(linhas.reduce((t, l) => t + l.contado, 0), false) : '—'}</td>
            <td class="num">${formatar(FORMAS.reduce((t, f) => t + (a[f.id] || 0), 0), false)}</td>
            <td class="num ${s.dif != null && Math.abs(s.dif) > TOL ? (s.dif < 0 ? 'neg' : 'pos') : ''}"><b>${s.dif != null ? sinal(s.dif) : '—'}</b></td></tr></tfoot>
        </table>
        ${extras}
        <button type="button" class="primario g-salvar" data-salvar="${n}">Salvar números do sistema</button>
      </article>`;
    }).join('');
    $('#g-resumo').textContent = n0 ? `${n0} ${n0 === 1 ? 'caixa conferido' : 'caixas conferidos'} · diferença do dia ${sinal(dTot)}` : 'Nenhum caixa conferido neste dia.';
    renderHistorico();
  }

  function renderHistorico() {
    const fim = hoje();
    const dias = Array.from({ length: 14 }, (_, i) => somaDias(fim, -i));
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
      renderGerente();
    } catch {
      avisar('Não foi possível salvar. Só quem edita esta página pode lançar os números do sistema.');
      b.disabled = false;
    }
  });
  $('#g-hist').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dia]');
    if (b) { $('#g-data').value = b.dataset.dia; renderGerente(); }
  });
  $('#g-data').addEventListener('change', renderGerente);
  $('#g-ant').onclick = () => { $('#g-data').value = somaDias(gData(), -1); renderGerente(); };
  $('#g-prox').onclick = () => { $('#g-data').value = somaDias(gData(), 1); renderGerente(); };

  function trocarAba(nome) {
    $$('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === nome));
    $$('.painel').forEach((p) => (p.hidden = p.id !== 'aba-' + nome));
    if (nome === 'conferir') renderGerente();
    else if (liberado) trancar();
  }
  $$('.aba').forEach((b) => (b.onclick = () => trocarAba(b.dataset.aba)));

  function render() {
    renderCaixas();
    renderHoje();
    if (caixa) {
      existente = cegos.find((r) => r.id === idDoc(dataSel(), caixa)) || null;
      atualizar();
    }
    renderGerente();
  }

  // ---------- início ----------
  $('#f-data').value = hoje();
  $('#g-data').value = hoje();
  $('#f-operador').value = lerLocal('operador', '');
  renderCaixas();
  renderHoje();
  atualizar();
  conectar();
})();
