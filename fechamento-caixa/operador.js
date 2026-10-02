(function () {
  const { DENOMINACOES, paraCentavos, formatar, totalContagem, calcularCaixa, diagnosticar } = window.Calc;
  const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const CAMPOS = ['sistema', 'trocoInicial', 'suprimento', 'credito', 'creditoParcelado', 'debito', 'pix', 'trocoFinal', 'despesas', 'valeTransporte'];
  const CONF = { alta: 'provável', media: 'possível', baixa: 'verifique' };
  const LOCAL = 'fechamento-operador:';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hoje = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const dataBR = (iso) => iso.split('-').reverse().join('/');
  const dataObj = (iso) => new Date(iso + 'T12:00:00');
  const paraCampo = (c) => (c ? formatar(c, false).replace('−', '-') : '');
  const sinal = (v) => (v > 0 ? '+' : '') + formatar(v, false);
  const hora = (iso) => { try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const lerLocal = (k, p) => { try { const v = localStorage.getItem(LOCAL + k); return v == null ? p : JSON.parse(v); } catch { return p; } };
  const gravarLocal = (k, v) => { try { localStorage.setItem(LOCAL + k, JSON.stringify(v)); } catch {} };
  const apagarLocal = (k) => { try { localStorage.removeItem(LOCAL + k); } catch {} };

  function avisar(msg) {
    const el = $('#aviso');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => (el.hidden = true), 3200);
  }

  // ---------- dados: banco compartilhado do artifact ou, fora dele, este navegador ----------
  let registros = [];          // fechamentos enviados, mais recentes primeiro
  let perfil = window.PERFIL_INICIAL || null;
  let loja = { qtdCaixas: 3, tolerancia: 200 };
  let banco = null;
  let podeEscrever = true;

  async function conectar() {
    const db = window.claude?.use ? await window.claude.use('db').catch(() => null) : null;
    if (!db) {
      registros = lerLocal('registros', []);
      $('#conexao').textContent = 'Modo local: os envios ficam só neste navegador';
      render();
      return;
    }
    banco = {
      salvar: (id, corpo) => db.collection('fechamentos').doc(id).set(corpo),
    };
    $('#conexao').textContent = 'Envios compartilhados com a loja';
    db.collection('fechamentos').orderBy('data', 'desc').limit(600).onSnapshot((snap) => {
      registros = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    }, () => { $('#conexao').textContent = 'Sem conexão com os envios. Recarregue a página.'; });
    try {
      const [p, l] = await Promise.all([db.doc('config/perfil').get(), db.doc('config/loja').get()]);
      if (p.exists) perfil = p.data();
      if (l.exists) loja = { ...loja, ...l.data() };
      renderCaixas();
      atualizar();
    } catch {}
    try {
      const user = await window.claude.use('user');
      const pode = user && (await user.can('data.write'));
      if (pode === false) {
        podeEscrever = false;
        $('#conexao').textContent = 'Você pode ver os envios, mas não enviar. Peça acesso de Colaborador.';
        atualizar();
      }
    } catch {}
  }

  // ---------- estado do formulário ----------
  let caixa = null;
  let c = vazio();
  let existente = null;

  function vazio() {
    return { sistema: 0, trocoInicial: 0, suprimento: 0, credito: 0, creditoParcelado: 0, debito: 0, pix: 0,
      trocoFinal: 0, despesas: 0, valeTransporte: 0, sangrias: [], outros: [], contagem: {} };
  }
  const idDoc = (data, n) => `${data}_cx${n}`;
  const dataSel = () => $('#f-data').value;

  function anteriores(data, n) {
    return registros.filter((r) => r.caixa === n && r.data < data).sort((a, b) => b.data.localeCompare(a.data));
  }
  function trocoOntem(data, n) {
    const ant = anteriores(data, n).find((r) => r.trocoFinal || r.trocoInicial);
    if (ant) return { data: ant.data, valor: ant.trocoFinal || ant.trocoInicial };
    const u = perfil?.caixas?.[n]?.ultimoTroco;
    return u && u.data < data ? u : null;
  }
  function contexto(data, n) {
    const ant = anteriores(data, n).find((r) => r.status !== 'semVenda');
    return {
      tolerancia: loja.tolerancia,
      perfil: perfil?.caixas?.[n] || null,
      trocoOntem: trocoOntem(data, n),
      difOntem: ant ? { data: ant.data, diferenca: ant.diferenca } : null,
      outrosCaixas: registros.filter((r) => r.data === data && r.caixa !== n).map((r) => ({ caixa: r.caixa, diferenca: r.diferenca })),
    };
  }

  function escolherCaixa(n) {
    caixa = n;
    $$('#f-caixas button').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.cx === n)));
    carregar();
  }

  function carregar() {
    const data = dataSel();
    existente = caixa ? registros.find((r) => r.id === idDoc(data, caixa)) : null;
    const rascunho = caixa ? lerLocal(`rascunho:${idDoc(data, caixa)}`, null) : null;
    if (rascunho) c = { ...vazio(), ...rascunho };
    else if (existente) c = { ...vazio(), ...JSON.parse(JSON.stringify(existente)) };
    else {
      c = vazio();
      const t = caixa && trocoOntem(data, caixa);
      if (t) c.trocoInicial = t.valor;
    }
    CAMPOS.forEach((k) => ($(`#f-${k}`).value = paraCampo(c[k])));
    $('#f-just').value = c.justificativa || '';
    $('#f-recontado').checked = !!c.recontado;
    renderSublistas();
    $('#contagem').hidden = true;
    const t = caixa && trocoOntem(data, caixa);
    $('#dica-troco').textContent = t ? `fechou ${dataBR(t.data).slice(0, 5)} com ${formatar(t.valor)}` : 'o que havia na gaveta ao abrir';
    const ed = $('#f-editando');
    ed.hidden = !existente && !rascunho;
    ed.textContent = rascunho ? 'Rascunho recuperado deste aparelho. Ainda não foi enviado.'
      : existente ? `Enviado por ${existente.operador || 'alguém'} às ${hora(existente.enviadoEm)}. Se enviar de novo, substitui (o envio anterior fica registrado).` : '';
    atualizar();
  }

  function renderCaixas() {
    const data = dataSel();
    $('#f-caixas').innerHTML = Array.from({ length: loja.qtdCaixas }, (_, i) => i + 1).map((n) => {
      const r = registros.find((x) => x.id === idDoc(data, n));
      return `<button type="button" role="radio" aria-checked="${n === caixa}" data-cx="${n}" id="f-cx${n}">
        <b>Caixa ${n}</b><small>${r ? 'enviado ' + hora(r.enviadoEm) : 'não enviado'}</small></button>`;
    }).join('');
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

  function renderContagem() {
    $('#contagem').innerHTML = `<table><tbody>${DENOMINACOES.map((d) => `
      <tr><td>${formatar(d, false)}</td><td><input type="number" min="0" step="1" id="f-den${d}" data-den="${d}" value="${c.contagem[d] || ''}" placeholder="0" inputmode="numeric" aria-label="Quantidade de ${formatar(d)}"></td>
      <td id="f-sub${d}">${formatar(d * (c.contagem[d] || 0), false)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">Total contado</td><td id="f-contado">${formatar(totalContagem(c.contagem), false)}</td></tr></tfoot></table>
      <div class="acoes" style="margin-top:6px"><button type="button" class="mini" id="btn-usar">Usar como troco final</button></div>`;
  }

  // ---------- resultado e diagnóstico ----------
  let ultimoDiag = null;
  function atualizar() {
    const tol = loja.tolerancia;
    const r = calcularCaixa(c, tol);
    const dg = caixa ? diagnosticar(c, contexto(dataSel(), caixa)) : { nivel: 'semVenda', dicas: [], diferenca: 0 };
    ultimoDiag = dg;
    $('#res-sis').textContent = formatar(r.totalSistema);
    $('#res-gav').textContent = formatar(r.totalGaveta);
    const card = $('#res-card');
    const rotulo = {
      ok: 'Caixa confere', atencao: r.diferenca < 0 ? 'Falta' : 'Sobra',
      grave: r.diferenca < 0 ? 'Falta alta' : 'Sobra alta',
      pendente: 'Gaveta não lançada', semVenda: caixa ? 'Sem venda lançada' : 'Escolha o caixa',
    }[dg.nivel];
    card.className = 'res-card r-' + ({ ok: 'ok', atencao: 'atencao', grave: 'grave', pendente: 'pendente', semVenda: 'semVenda' }[dg.nivel]);
    $('#res-rotulo').textContent = rotulo;
    $('#res-valor').textContent = dg.nivel === 'ok' || dg.nivel === 'atencao' || dg.nivel === 'grave' ? sinal(r.diferenca) : '';
    const bm = $('#barra-movel');
    bm.className = 'barra-movel ' + card.className.replace('res-card ', '');
    $('#bm-rotulo').textContent = dg.dicas.length && dg.nivel !== 'ok' ? `${rotulo.split(':')[0]} · ver ${dg.dicas.length} pista${dg.dicas.length > 1 ? 's' : ''}` : rotulo;
    $('#bm-valor').textContent = $('#res-valor').textContent;

    $$('.destaque-campo').forEach((el) => el.classList.remove('destaque-campo'));
    const diag = $('#diag');
    diag.hidden = !dg.dicas.length;
    $('#diag-titulo').textContent = dg.nivel === 'ok' ? 'Para conferir' : 'Onde pode estar a diferença';
    $('#diag-lista').innerHTML = dg.dicas.map((d, i) => `
      <li><span class="conf conf-${d.confianca}">${CONF[d.confianca]}</span><b>${esc(d.titulo)}</b>
        <p>${esc(d.detalhe)}</p>${d.campo ? `<button type="button" class="mini" data-ir="${i}">Ir para o campo</button>` : ''}</li>`).join('');

    const grave = dg.nivel === 'grave';
    $('#bloco-just').hidden = !(grave || dg.nivel === 'atencao');
    $('#just-aviso').textContent = grave
      ? `A diferença passou de ${formatar(dg.limite)}, acima do normal deste caixa. Se puder, reconte e explique o que aconteceu (não é obrigatório).`
      : 'Se souber o motivo da diferença, escreva aqui.';
    validarEnvio();
  }

  function validarEnvio() {
    const faltas = [];
    if (!podeEscrever) faltas.push('sem permissão para enviar');
    if (!$('#f-operador').value.trim()) faltas.push('seu nome');
    if (!caixa) faltas.push('o caixa');
    if (!dataSel()) faltas.push('a data');
    if (ultimoDiag?.nivel === 'pendente') faltas.push('os valores da gaveta');
    $('#btn-enviar').disabled = faltas.length > 0;
    const semMotivo = ultimoDiag?.nivel === 'grave' && !$('#f-just').value.trim();
    $('#enviar-nota').textContent = faltas.length ? 'Falta: ' + faltas.join(', ') + '.'
      : [semMotivo ? 'Diferença alta sem explicação: dá para enviar, mas o gerente vai ver.' : '', existente ? 'Vai substituir o envio anterior deste caixa.' : ''].filter(Boolean).join(' ');
  }

  function guardarRascunho() {
    if (!caixa) return;
    clearTimeout(guardarRascunho.t);
    guardarRascunho.t = setTimeout(() => {
      gravarLocal(`rascunho:${idDoc(dataSel(), caixa)}`, { ...c, justificativa: $('#f-just').value, recontado: $('#f-recontado').checked });
    }, 400);
  }

  // ---------- eventos do formulário ----------
  $('#form').addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'f-operador') { gravarLocal('operador', t.value); validarEnvio(); return; }
    if (t.id === 'f-data') return;
    if (t.dataset.den) {
      c.contagem[t.dataset.den] = Math.max(0, parseInt(t.value, 10) || 0);
      $(`#f-sub${t.dataset.den}`).textContent = formatar(+t.dataset.den * c.contagem[t.dataset.den], false);
      $('#f-contado').textContent = formatar(totalContagem(c.contagem), false);
    } else if (t.dataset.lista === 'sangrias') c.sangrias[+t.dataset.j] = paraCentavos(t.value);
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
    } else if (b.id === 'btn-contar') {
      const el = $('#contagem');
      if (el.hidden) renderContagem();
      el.hidden = !el.hidden;
    } else if (b.id === 'btn-usar') {
      c.trocoFinal = totalContagem(c.contagem);
      $('#f-trocoFinal').value = paraCampo(c.trocoFinal) || '0,00';
      guardarRascunho(); atualizar();
    }
  });
  $('#f-data').addEventListener('change', () => { renderCaixas(); carregar(); renderHoje(); });
  $('#f-just').addEventListener('input', () => { guardarRascunho(); validarEnvio(); });
  $('#f-recontado').addEventListener('change', () => { guardarRascunho(); validarEnvio(); });

  $('#diag-lista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]');
    if (!b) return;
    const campo = ultimoDiag.dicas[+b.dataset.ir].campo;
    const alvo = campo === 'sangrias' ? ($('#f-s0') || $('#btn-add-sangria')) : campo === 'outros' ? $('#f-o0v') : $(`#f-${campo}`);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    alvo.classList.add('destaque-campo');
    alvo.focus({ preventScroll: true });
  });

  $('#btn-enviar').addEventListener('click', async () => {
    validarEnvio();
    if ($('#btn-enviar').disabled) return;
    const data = dataSel();
    const id = idDoc(data, caixa);
    const r = calcularCaixa(c, loja.tolerancia);
    const anterior = registros.find((x) => x.id === id);
    const corpo = {
      data, caixa, operador: $('#f-operador').value.trim(),
      ...Object.fromEntries(CAMPOS.map((k) => [k, c[k] || 0])),
      sangrias: c.sangrias.filter(Boolean),
      outros: c.outros.filter((o) => o.valor || o.desc),
      diferenca: r.diferenca, status: r.status, nivel: ultimoDiag.nivel,
      dicas: ultimoDiag.dicas.filter((d) => d.confianca !== 'baixa').map((d) => ({ confianca: d.confianca, titulo: d.titulo })),
      justificativa: $('#f-just').value.trim(), recontado: $('#f-recontado').checked,
      enviadoEm: new Date().toISOString(),
      reenvios: anterior ? [...(anterior.reenvios || []), { enviadoEm: anterior.enviadoEm, operador: anterior.operador, diferenca: anterior.diferenca }].slice(-10) : [],
    };
    if (totalContagem(c.contagem)) corpo.contagem = c.contagem;
    const botao = $('#btn-enviar');
    botao.disabled = true;
    botao.textContent = 'Enviando…';
    try {
      if (banco) await banco.salvar(id, corpo);
      else {
        registros = [{ id, ...corpo }, ...registros.filter((x) => x.id !== id)].sort((a, b) => b.data.localeCompare(a.data));
        gravarLocal('registros', registros);
        render();
      }
      apagarLocal(`rascunho:${id}`);
      avisar(`Caixa ${caixa} de ${dataBR(data)} enviado.`);
      existente = { id, ...corpo };
      carregar();
    } catch (err) {
      if (err?.code === 'invalid_argument') { podeEscrever = false; avisar('Seu acesso não permite enviar. Peça acesso de Colaborador ao gerente.'); }
      else avisar('Não foi possível enviar. Confira a internet e tente de novo; os valores continuam aqui.');
    } finally {
      botao.textContent = 'Enviar fechamento';
      validarEnvio();
    }
  });

  // ---------- faixa "hoje" e conferência ----------
  function renderHoje() {
    const data = dataSel();
    const d = dataObj(data);
    const itens = Array.from({ length: loja.qtdCaixas }, (_, i) => i + 1).map((n) => {
      const r = registros.find((x) => x.id === idDoc(data, n));
      if (!r) return `<span class="hoje-cx">Caixa ${n}: falta enviar</span>`;
      const cls = r.status === 'semVenda' ? 'st-semVenda' : Math.abs(r.diferenca) <= loja.tolerancia ? 'st-ok' : r.diferenca < 0 ? 'st-falta' : 'st-sobra';
      return `<span class="hoje-cx ${cls}">Caixa ${n} <b>${r.status === 'semVenda' ? 'sem venda' : sinal(r.diferenca)}</b></span>`;
    }).join('');
    $('#hoje').innerHTML = `<span>${DIAS[d.getDay()]}, ${dataBR(data)}:</span>${itens}`;
  }

  function renderConferencia() {
    const filtro = $('#c-filtro').value;
    const tol = loja.tolerancia;
    const lista = registros.filter((r) => filtro === 'todos' || (r.status !== 'semVenda' && Math.abs(r.diferenca) > tol));
    const porDia = new Map();
    for (const r of lista) { if (!porDia.has(r.data)) porDia.set(r.data, []); porDia.get(r.data).push(r); }
    const ultimos30 = registros.filter((r) => (dataObj(hoje()) - dataObj(r.data)) / 864e5 <= 30);
    const graves = ultimos30.filter((r) => r.nivel === 'grave').length;
    $('#c-resumo').textContent = registros.length
      ? `${ultimos30.length} envios nos últimos 30 dias, ${graves} com diferença alta.`
      : 'Nenhum fechamento enviado ainda.';
    $('#c-lista').innerHTML = [...porDia.entries()].slice(0, 60).map(([data, itens]) => {
      const d = dataObj(data);
      return `<section class="c-dia"><h2>${DIAS[d.getDay()]}, ${dataBR(data)}</h2><div class="c-itens">${
        itens.sort((a, b) => a.caixa - b.caixa).map((r) => {
          const cls = r.status === 'semVenda' ? '' : Math.abs(r.diferenca) <= tol ? 'st-ok' : r.diferenca < 0 ? 'neg' : 'pos';
          const alertas = (r.dicas || []).slice(0, 2).map((x) => `<span class="conf conf-${x.confianca}">${CONF[x.confianca]}</span> ${esc(x.titulo)}`).join(' · ');
          return `<button type="button" class="c-item" data-abrir="${r.data}|${r.caixa}">
            <span class="c-cx">Caixa ${r.caixa}</span>
            <span>${esc(r.operador || '—')} · ${hora(r.enviadoEm)}${r.reenvios?.length ? ` · reenviado ${r.reenvios.length}x` : ''}${r.recontado ? ' · recontou' : ''}</span>
            <span class="c-dif ${cls}">${r.status === 'semVenda' ? 'sem venda' : sinal(r.diferenca)}</span>
            ${r.justificativa ? `<span class="c-det">“${esc(r.justificativa)}”</span>` : ''}
            ${alertas ? `<span class="c-alertas">${alertas}</span>` : ''}
          </button>`;
        }).join('')}</div></section>`;
    }).join('') || '<p class="vazio-msg">Nada para mostrar.</p>';
  }
  $('#c-filtro').onchange = renderConferencia;
  $('#barra-movel').onclick = () => $('#resultado').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  $('#c-lista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-abrir]');
    if (!b) return;
    const [data, n] = b.dataset.abrir.split('|');
    $('#f-data').value = data;
    renderCaixas();
    trocarAba('lancar');
    escolherCaixa(+n);
    renderHoje();
  });


  // ---------- calendário do mês ----------
  const mesCal = () => $('#cal-mes').value || hoje().slice(0, 7);
  function renderCalendario() {
    const mes = mesCal();
    const [a, m] = mes.split('-').map(Number);
    const tol = loja.tolerancia;
    const doMes = registros.filter((r) => r.data.startsWith(mes));
    const porDia = {};
    doMes.forEach((r) => ((porDia[r.data] ??= {})[r.caixa] = r));

    // resumo do mês
    const fora = doMes.filter((r) => r.status !== 'semVenda' && Math.abs(r.diferenca) > tol);
    const faltas = fora.filter((r) => r.diferenca < 0), sobras = fora.filter((r) => r.diferenca > 0);
    const soma = (l) => l.reduce((t, r) => t + r.diferenca, 0);
    const liquido = doMes.filter((r) => r.status !== 'semVenda').reduce((t, r) => t + r.diferenca, 0);
    const porCaixa = Array.from({ length: loja.qtdCaixas }, (_, i) => i + 1).map((n) => {
      const l = doMes.filter((r) => r.caixa === n && r.status !== 'semVenda');
      return { n, total: l.reduce((t, r) => t + r.diferenca, 0), envios: l.length };
    });
    $('#cal-kpis').innerHTML = `
      <div class="kpi"><span>Faltas no mês</span><strong class="neg">${formatar(soma(faltas))}</strong><small>${faltas.length} ${faltas.length === 1 ? 'fechamento' : 'fechamentos'} acima de ${formatar(tol)}</small></div>
      <div class="kpi"><span>Sobras no mês</span><strong class="pos">${formatar(soma(sobras))}</strong><small>${sobras.length} ${sobras.length === 1 ? 'fechamento' : 'fechamentos'}</small></div>
      <div class="kpi"><span>Saldo do mês</span><strong class="${liquido < 0 ? 'neg' : liquido > 0 ? 'pos' : ''}">${sinal(liquido)}</strong><small>${doMes.length} envios</small></div>
      <div class="kpi"><span>Por caixa</span><small>${porCaixa.map((c) => `Caixa ${c.n}: <b class="${c.total < 0 ? 'neg' : c.total > 0 ? 'pos' : ''}">${sinal(c.total)}</b> (${c.envios})`).join('<br>')}</small></div>`;

    // grade seg–sáb (domingo só se houver envio)
    const temDomingo = doMes.some((r) => dataObj(r.data).getDay() === 0);
    const cols = temDomingo ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    const el = $('#calendario');
    el.style.setProperty('--cols', cols.length);
    let html = cols.map((c) => `<div class="cal-cab">${DIAS[c].slice(0, 3)}</div>`).join('');
    const ultimo = new Date(a, m, 0).getDate();
    let primeiro = true;
    const hj = hoje();
    for (let d = 1; d <= ultimo; d++) {
      const iso = `${mes}-${String(d).padStart(2, '0')}`;
      const pos = cols.indexOf(dataObj(iso).getDay());
      if (pos < 0) continue;
      if (primeiro) { html += '<div class="cal-dia fora"></div>'.repeat(pos); primeiro = false; }
      const envios = porDia[iso];
      if (!envios) { html += `<div class="cal-dia vazio"><span class="cal-num">${d}</span></div>`; continue; }
      const linhas = Array.from({ length: loja.qtdCaixas }, (_, i) => i + 1).map((n) => {
        const r = envios[n];
        if (!r) return `<span class="cal-cx st-pendente"><span>cx${n}</span><span>${iso < hj ? 'não enviou' : '—'}</span></span>`;
        const st = r.status === 'semVenda' ? 'semVenda' : Math.abs(r.diferenca) <= tol ? 'ok' : r.diferenca < 0 ? 'falta' : 'sobra';
        return `<button type="button" class="cal-cx st-${st}" data-abrir="${r.data}|${r.caixa}" title="${esc(r.operador || '')}"><span>cx${n}</span><span>${st === 'semVenda' ? 'sem venda' : sinal(r.diferenca)}</span></button>`;
      }).join('');
      const totalDia = Object.values(envios).filter((r) => r.status !== 'semVenda').reduce((t, r) => t + r.diferenca, 0);
      html += `<div class="cal-dia"><span class="cal-num">${d}<small class="${totalDia < -tol ? 'neg' : totalDia > tol ? 'pos' : ''}">${sinal(totalDia)}</small></span>${linhas}</div>`;
    }
    el.innerHTML = html;
  }
  $('#cal-mes').addEventListener('change', renderCalendario);
  const moverMes = (k) => {
    const [a, m] = mesCal().split('-').map(Number);
    const d = new Date(a, m - 1 + k, 1);
    $('#cal-mes').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    renderCalendario();
  };
  $('#cal-ant').onclick = () => moverMes(-1);
  $('#cal-prox').onclick = () => moverMes(1);
  $('#calendario').addEventListener('click', (e) => {
    const b = e.target.closest('[data-abrir]');
    if (!b) return;
    const [data, n] = b.dataset.abrir.split('|');
    $('#f-data').value = data;
    renderCaixas();
    trocarAba('lancar');
    escolherCaixa(+n);
    renderHoje();
  });

  function render() {
    renderCaixas();
    renderHoje();
    if (!$('#aba-conferir').hidden) renderConferencia();
    if (!$('#aba-calendario').hidden) renderCalendario();
    // Atualiza o aviso de envio existente sem apagar o que a pessoa está digitando.
    if (caixa) {
      existente = registros.find((r) => r.id === idDoc(dataSel(), caixa)) || null;
      atualizar();
    }
  }

  function trocarAba(nome) {
    $$('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === nome));
    $$('.painel').forEach((p) => (p.hidden = p.id !== 'aba-' + nome));
    $('#barra-movel').hidden = nome !== 'lancar';
    if (nome === 'conferir') renderConferencia();
    if (nome === 'calendario') renderCalendario();
    window.scrollTo(0, 0);
  }
  $$('.aba').forEach((b) => (b.onclick = () => trocarAba(b.dataset.aba)));

  // ---------- início ----------
  $('#f-data').value = hoje();
  $('#f-operador').value = lerLocal('operador', '');
  renderCaixas();
  renderHoje();
  atualizar();
  $('#cal-mes').value = hoje().slice(0, 7);
  if (location.hash === '#conferir') trocarAba('conferir');
  if (location.hash === '#calendario') trocarAba('calendario');
  conectar();
})();
