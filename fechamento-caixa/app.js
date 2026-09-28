(function () {
  const { DENOMINACOES, FORMAS, paraCentavos, formatar, totalContagem, calcularCaixa, calcularDia, resumir } = window.Calc;
  const CHAVE_DADOS = 'fechamento-caixa:v2:dias';
  const CHAVE_CFG = 'fechamento-caixa:v2:config';
  const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const CORES_MIX = { credito: 'var(--serie-1)', creditoParcelado: 'var(--serie-2)', debito: 'var(--serie-3)', pix: 'var(--serie-4)', dinheiro: 'var(--serie-5)' };
  const NOMES_MIX = { credito: 'Crédito à vista', creditoParcelado: 'Crédito parcelado', debito: 'Débito', pix: 'PIX', dinheiro: 'Dinheiro e outros' };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const emArtefato = (() => { try { return window.self !== window.top; } catch { return true; } })();
  if (emArtefato) document.body.classList.add('em-artefato');

  // ---------- armazenamento (com memória de reserva se o navegador bloquear) ----------
  const memoria = {};
  function ler(chave, padrao) {
    try { const v = localStorage.getItem(chave); if (v != null) return JSON.parse(v); } catch {}
    return chave in memoria ? JSON.parse(memoria[chave]) : padrao;
  }
  function gravar(chave, valor) {
    memoria[chave] = JSON.stringify(valor);
    try { localStorage.setItem(chave, memoria[chave]); } catch {}
  }
  const dias = () => ler(CHAVE_DADOS, []);
  const config = () => ({ qtdCaixas: 3, tolerancia: 200, ...ler(CHAVE_CFG, {}) });
  const diaDaData = (iso) => dias().find((d) => d.data === iso);

  function salvarDias(lista) {
    lista.sort((a, b) => a.data.localeCompare(b.data));
    gravar(CHAVE_DADOS, lista);
  }

  // Primeira abertura: carrega o histórico das planilhas, se dados.js existir.
  if (!dias().length && Array.isArray(window.HISTORICO_INICIAL)) salvarDias(window.HISTORICO_INICIAL.slice());

  // ---------- utilidades ----------
  function avisar(msg) {
    const el = $('#aviso');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => (el.hidden = true), 2600);
  }
  function confirmar(msg) {
    return new Promise((ok) => {
      $('#modal-texto').textContent = msg;
      $('#modal').hidden = false;
      $('#modal-sim').focus();
      const fim = (v) => { $('#modal').hidden = true; ok(v); };
      $('#modal-sim').onclick = () => fim(true);
      $('#modal-nao').onclick = () => fim(false);
    });
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hoje = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const dataObj = (iso) => new Date(iso + 'T12:00:00');
  const dataBR = (iso) => iso.split('-').reverse().join('/');
  const paraCampo = (c) => (c ? formatar(c, false).replace('−', '-') : '');
  const classeValor = (v) => (v < 0 ? 'neg' : v > 0 ? 'pos' : '');
  const sinal = (v) => (v > 0 ? '+' : '') + formatar(v, false);

  // ---------- estado do dia em edição ----------
  let dia = null;          // cópia editável
  let salvo = false;       // existe no histórico?
  let alterado = false;

  function caixaVazio(n) {
    return { caixa: n, operador: '', semVenda: false, sistema: 0, trocoInicial: 0, suprimento: 0,
      credito: 0, creditoParcelado: 0, debito: 0, pix: 0, trocoFinal: 0, sangrias: [], despesas: 0, valeTransporte: 0, outros: [] };
  }

  // Troco inicial de hoje = troco final do último fechamento anterior do mesmo caixa.
  function trocoAnterior(iso, n) {
    const ant = dias().filter((d) => d.data < iso).reverse();
    for (const d of ant) {
      const c = d.caixas.find((x) => x.caixa === n);
      if (c && (c.trocoFinal || c.trocoInicial)) return { valor: c.trocoFinal || c.trocoInicial, data: d.data };
    }
    return null;
  }

  function abrirDia(iso) {
    const existente = diaDaData(iso);
    const qtd = config().qtdCaixas;
    if (existente) {
      dia = JSON.parse(JSON.stringify(existente));
      salvo = true;
      for (let n = 1; n <= qtd; n++) if (!dia.caixas.some((c) => c.caixa === n)) dia.caixas.push(caixaVazio(n));
      dia.caixas = dia.caixas.map((c) => ({ ...caixaVazio(c.caixa), ...c }));
    } else {
      dia = { id: 'd-' + iso, data: iso, obs: '', caixas: [] };
      for (let n = 1; n <= qtd; n++) {
        const c = caixaVazio(n);
        const t = trocoAnterior(iso, n);
        if (t) c.trocoInicial = t.valor;
        dia.caixas.push(c);
      }
      salvo = false;
    }
    dia.caixas.sort((a, b) => a.caixa - b.caixa);
    alterado = false;
    $('#in-data').value = iso;
    $('#in-obs').value = dia.obs || '';
    const d = dataObj(iso);
    $('#dia-semana').textContent = `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
    renderCaixas();
    atualizarEstado();
    atualizarTotais();
  }

  function atualizarEstado() {
    const chip = $('#dia-estado');
    chip.className = 'chip' + (salvo && !alterado ? ' salvo' : '');
    chip.textContent = alterado ? 'Alterações não salvas' : salvo ? (dia.origem ? 'Importado da planilha' : 'Salvo') : 'Novo fechamento';
    $('#btn-excluir').hidden = !salvo;
  }

  // ---------- cartões dos caixas ----------
  const CAMPOS_SISTEMA = [
    ['sistema', 'Rel. caixa sistema'],
    ['trocoInicial', 'Troco inicial'],
    ['suprimento', 'Suprimento'],
  ];
  const CAMPOS_GAVETA = [
    ['credito', 'Crédito à vista'],
    ['creditoParcelado', 'Crédito parcelado'],
    ['debito', 'Débito'],
    ['pix', 'PIX'],
    ['trocoFinal', 'Troco final'],
  ];
  const CAMPOS_GAVETA_2 = [
    ['despesas', 'Despesas'],
    ['valeTransporte', 'Vale transporte'],
  ];

  function linhaCampo(i, k, rotulo, extra = '') {
    return `<div class="linha"><span>${rotulo}${extra}</span>
      <input class="moeda" id="cx${i}-${k}" data-i="${i}" data-k="${k}" inputmode="decimal" placeholder="0,00" aria-label="${rotulo}"></div>`;
  }

  function renderCaixas() {
    $('#caixas').innerHTML = dia.caixas.map((c, i) => {
      const t = trocoAnterior(dia.data, c.caixa);
      const difere = t && c.trocoInicial && t.valor !== c.trocoInicial;
      const dicaTroco = t
        ? `<small class="${difere ? 'alerta' : ''}">${difere ? 'diferente do troco final de' : 'troco final de'} ${dataBR(t.data).slice(0, 5)}: ${formatar(t.valor)}</small>`
        : '';
      return `
      <article class="caixa" id="cx${i}">
        <div class="caixa-topo">
          <h2>Caixa ${c.caixa}</h2>
          <label><input type="checkbox" id="cx${i}-semVenda" data-i="${i}" data-k="semVenda"> Sem venda</label>
        </div>
        <div class="caixa-operador">
          <input id="cx${i}-operador" data-i="${i}" data-k="operador" placeholder="Operador(a)" aria-label="Operador do caixa ${c.caixa}">
        </div>
        <div class="caixa-corpo">
          <div class="secao">
            <p class="secao-titulo">Sistema</p>
            ${CAMPOS_SISTEMA.map(([k, r]) => linhaCampo(i, k, r, k === 'trocoInicial' ? dicaTroco : '')).join('')}
            <div class="linha total"><span>Total sistema</span><output id="cx${i}-totSis"></output></div>
          </div>
          <div class="secao">
            <p class="secao-titulo">Gaveta</p>
            ${CAMPOS_GAVETA.map(([k, r]) => linhaCampo(i, k, r)).join('')}
            <div class="linha-botoes"><button type="button" class="mini" data-contar="${i}">Contar cédulas e moedas</button></div>
            <div class="contagem" id="cx${i}-contagem" hidden></div>
            <div class="sublista" id="cx${i}-sangrias"></div>
            ${CAMPOS_GAVETA_2.map(([k, r]) => linhaCampo(i, k, r)).join('')}
            <div class="sublista" id="cx${i}-outros"></div>
            <div class="linha-botoes">
              <button type="button" class="mini" data-add="sangrias" data-i="${i}">+ sangria</button>
              <button type="button" class="mini" data-add="outros" data-i="${i}">+ outro recebimento</button>
            </div>
            <div class="linha total"><span>Total gaveta</span><output id="cx${i}-totGav"></output></div>
          </div>
        </div>
        <div class="caixa-resultado" id="cx${i}-res"><span></span><strong></strong></div>
      </article>`;
    }).join('');

    dia.caixas.forEach((c, i) => {
      [...CAMPOS_SISTEMA, ...CAMPOS_GAVETA, ...CAMPOS_GAVETA_2].forEach(([k]) => ($(`#cx${i}-${k}`).value = paraCampo(c[k])));
      $(`#cx${i}-operador`).value = c.operador || '';
      $(`#cx${i}-semVenda`).checked = !!c.semVenda;
      renderSublista(i, 'sangrias');
      renderSublista(i, 'outros');
    });
  }

  function renderSublista(i, tipo) {
    const c = dia.caixas[i];
    const el = $(`#cx${i}-${tipo}`);
    const itens = tipo === 'sangrias' ? c.sangrias.map((v) => ({ valor: v })) : c.outros;
    el.innerHTML = itens.map((it, j) => tipo === 'sangrias'
      ? `<div class="linha"><span>Sangria ${j + 1}</span>
          <div class="item" style="grid-template-columns:1fr 28px"><input class="moeda" id="cx${i}-s${j}" data-i="${i}" data-lista="sangrias" data-j="${j}" inputmode="decimal" value="${paraCampo(it.valor)}" aria-label="Sangria ${j + 1}">
          <button type="button" data-rem="sangrias" data-i="${i}" data-j="${j}" aria-label="Remover sangria">×</button></div></div>`
      : `<div class="item"><input id="cx${i}-o${j}d" data-i="${i}" data-lista="outros" data-j="${j}" data-campo="desc" value="${esc(it.desc)}" placeholder="Crediário, cheque..." aria-label="Descrição">
          <input class="moeda" id="cx${i}-o${j}v" data-i="${i}" data-lista="outros" data-j="${j}" data-campo="valor" inputmode="decimal" value="${paraCampo(it.valor)}" aria-label="Valor">
          <button type="button" data-rem="outros" data-i="${i}" data-j="${j}" aria-label="Remover">×</button></div>`).join('');
  }

  function renderContagem(i) {
    const c = dia.caixas[i];
    c.contagem ??= {};
    const el = $(`#cx${i}-contagem`);
    el.innerHTML = `<table><tbody>${DENOMINACOES.map((d) => `
      <tr><td>${formatar(d, false)}</td><td><input type="number" min="0" step="1" id="cx${i}-den${d}" data-i="${i}" data-den="${d}" value="${c.contagem[d] || ''}" placeholder="0" inputmode="numeric" aria-label="Quantidade de ${formatar(d)}"></td>
      <td id="cx${i}-sub${d}">${formatar(d * (c.contagem[d] || 0), false)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">Total contado</td><td id="cx${i}-contado">${formatar(totalContagem(c.contagem), false)}</td></tr></tfoot></table>
      <div class="acoes" style="margin-top:6px"><button type="button" class="mini" data-usar="${i}">Usar como troco final</button></div>`;
  }

  function atualizarCaixa(i) {
    const c = dia.caixas[i];
    const r = calcularCaixa(c, config().tolerancia);
    $(`#cx${i}-totSis`).textContent = formatar(r.totalSistema);
    $(`#cx${i}-totGav`).textContent = formatar(r.totalGaveta);
    $(`#cx${i}`).classList.toggle('semVenda', r.status === 'semVenda');
    const res = $(`#cx${i}-res`);
    res.className = 'caixa-resultado r-' + r.status;
    const rotulos = { ok: 'Caixa confere', falta: 'Falta', sobra: 'Sobra', pendente: 'Gaveta não lançada', semVenda: 'Sem venda' };
    $('span', res).textContent = rotulos[r.status];
    $('strong', res).textContent = r.status === 'semVenda' || r.status === 'pendente' ? '' : sinal(r.diferenca);
  }

  function atualizarTotais() {
    dia.caixas.forEach((_, i) => atualizarCaixa(i));
    const d = calcularDia(dia, config().tolerancia);
    $('#dia-vendas').textContent = formatar(d.vendas);
    const dif = $('#dia-dif');
    dif.textContent = sinal(d.diferenca);
    dif.className = classeValor(d.diferenca);
  }

  function marcarAlterado() {
    if (!alterado) { alterado = true; atualizarEstado(); }
  }

  // Eventos dos cartões (delegados)
  $('#caixas').addEventListener('input', (e) => {
    const t = e.target, i = +t.dataset.i;
    if (Number.isNaN(i)) return;
    const c = dia.caixas[i];
    if (t.dataset.den) {
      c.contagem[t.dataset.den] = Math.max(0, parseInt(t.value, 10) || 0);
      $(`#cx${i}-sub${t.dataset.den}`).textContent = formatar(+t.dataset.den * c.contagem[t.dataset.den], false);
      $(`#cx${i}-contado`).textContent = formatar(totalContagem(c.contagem), false);
      marcarAlterado();
      return;
    }
    if (t.dataset.lista === 'sangrias') c.sangrias[+t.dataset.j] = paraCentavos(t.value);
    else if (t.dataset.lista === 'outros') {
      const it = c.outros[+t.dataset.j];
      if (t.dataset.campo === 'desc') it.desc = t.value; else it.valor = paraCentavos(t.value);
    } else if (t.dataset.k === 'semVenda') c.semVenda = t.checked;
    else if (t.dataset.k === 'operador') c.operador = t.value;
    else if (t.dataset.k) c[t.dataset.k] = paraCentavos(t.value);
    marcarAlterado();
    atualizarTotais();
  });
  $('#caixas').addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') e.target.dispatchEvent(new Event('input', { bubbles: true }));
  });
  $('#caixas').addEventListener('focusout', (e) => {
    const t = e.target;
    if (t.classList.contains('moeda') && t.value.trim()) t.value = paraCampo(paraCentavos(t.value)) || '0,00';
  });
  $('#caixas').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const i = +b.dataset.i;
    if (b.dataset.add) {
      const c = dia.caixas[i];
      if (b.dataset.add === 'sangrias') c.sangrias.push(0); else c.outros.push({ desc: '', valor: 0 });
      renderSublista(i, b.dataset.add);
      const campos = $$(`#cx${i}-${b.dataset.add} input`);
      campos[b.dataset.add === 'sangrias' ? campos.length - 1 : campos.length - 2]?.focus();
    } else if (b.dataset.rem) {
      dia.caixas[i][b.dataset.rem].splice(+b.dataset.j, 1);
      renderSublista(i, b.dataset.rem);
      marcarAlterado();
      atualizarTotais();
    } else if (b.dataset.contar) {
      const k = +b.dataset.contar, el = $(`#cx${k}-contagem`);
      if (el.hidden) renderContagem(k);
      el.hidden = !el.hidden;
    } else if (b.dataset.usar) {
      const k = +b.dataset.usar, c = dia.caixas[k];
      c.trocoFinal = totalContagem(c.contagem);
      $(`#cx${k}-trocoFinal`).value = paraCampo(c.trocoFinal) || '0,00';
      marcarAlterado();
      atualizarTotais();
    }
  });
  $('#in-obs').addEventListener('input', (e) => { dia.obs = e.target.value; marcarAlterado(); });

  $('#in-data').addEventListener('change', async (e) => {
    const nova = e.target.value;
    if (!nova) return;
    if (alterado && !(await confirmar('Há alterações não salvas neste dia. Trocar de data mesmo assim?'))) {
      e.target.value = dia.data;
      return;
    }
    abrirDia(nova);
  });

  async function salvar() {
    const tol = config().tolerancia;
    const r = calcularDia(dia, tol);
    const comDif = r.caixas.filter((c) => c.r.status === 'falta' || c.r.status === 'sobra');
    if (comDif.length && !dia.obs.trim()) {
      const ok = await confirmar(`${comDif.map((c) => `Caixa ${c.caixa}: ${sinal(c.r.diferenca)}`).join(' · ')}. Salvar sem justificativa nas observações?`);
      if (!ok) { $('#in-obs').focus(); return; }
    }
    const registro = JSON.parse(JSON.stringify(dia));
    registro.caixas.forEach((c) => {
      c.sangrias = c.sangrias.filter(Boolean);
      c.outros = c.outros.filter((o) => o.valor || o.desc);
      if (c.contagem && !totalContagem(c.contagem)) delete c.contagem;
    });
    registro.salvoEm = new Date().toISOString();
    const lista = dias().filter((d) => d.data !== registro.data);
    lista.push(registro);
    salvarDias(lista);
    salvo = true; alterado = false;
    dia = { ...registro, caixas: registro.caixas.map((c) => ({ ...caixaVazio(c.caixa), ...c })) };
    atualizarEstado();
    avisar('Fechamento de ' + dataBR(dia.data) + ' salvo.');
  }
  $('#btn-salvar').onclick = salvar;
  $('#btn-excluir').onclick = async () => {
    if (!(await confirmar(`Excluir o fechamento de ${dataBR(dia.data)}? Não dá para desfazer.`))) return;
    salvarDias(dias().filter((d) => d.data !== dia.data));
    abrirDia(dia.data);
    avisar('Fechamento excluído.');
  };
  $('#btn-imprimir').onclick = () => window.print();
  $('#btn-ficha').onclick = () => {
    renderFicha();
    document.body.classList.add('imprimir-ficha');
    window.print();
    setTimeout(() => document.body.classList.remove('imprimir-ficha'), 500);
  };

  function renderFicha() {
    const moedas = [5, 10, 25, 50, 100, 200, 500, 1000, 2000];
    const direita = ['Sangria:', 'Sangria:', 'Sangria:', 'Total desp.:', '______________:', 'Crédito:', 'Débito:', 'PIX:', 'Troco final:'];
    const bloco = `<div class="ficha-bloco">
      <div>Cx: ____ Data: ____/____/20___ Nome: ________________</div><div>Sobra dia anterior: __________</div>
      <table>${moedas.map((m, k) => `<tr><td>${formatar(m, false)} x ____ = ________</td><td>${direita[k]} __________</td></tr>`).join('')}
      <tr><td>Inicial − Reforço: ________</td><td>Vendas dia: ________ Dif.: ______</td></tr></table></div>`;
    $('#ficha').innerHTML = bloco.repeat(6);
  }

  // ---------- calendário ----------
  function mesAtual() { return ($('#cal-mes').value || hoje().slice(0, 7)); }
  function renderCalendario() {
    const mes = mesAtual();
    const [a, m] = mes.split('-').map(Number);
    const tol = config().tolerancia;
    const doMes = dias().filter((d) => d.data.startsWith(mes));
    const temDomingo = doMes.some((d) => dataObj(d.data).getDay() === 0);
    const colunas = temDomingo ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    const el = $('#calendario');
    el.style.setProperty('--cols', colunas.length);
    const cab = colunas.map((c) => `<div class="cal-cab">${DIAS_SEMANA[c].slice(0, 3)}</div>`).join('');
    const ultimo = new Date(a, m, 0).getDate();
    const celulas = [];
    let semana = [];
    const pos = (dow) => colunas.indexOf(dow);
    for (let d = 1; d <= ultimo; d++) {
      const iso = `${mes}-${String(d).padStart(2, '0')}`;
      const dow = dataObj(iso).getDay();
      if (pos(dow) < 0) continue;
      if (!semana.length) for (let k = 0; k < pos(dow); k++) semana.push('<div class="cal-dia fora"></div>');
      semana.push(celulaDia(iso, d, tol));
      if (pos(dow) === colunas.length - 1) { celulas.push(...semana); semana = []; }
    }
    if (semana.length) celulas.push(...semana);
    el.innerHTML = cab + celulas.join('');

    const s = resumir(doMes, tol);
    $('#cal-resumo').innerHTML = doMes.length
      ? `${doMes.length} dias lançados · vendas <b>${formatar(s.vendas)}</b> · diferença líquida <b class="${classeValor(s.diferenca)}">${sinal(s.diferenca)}</b> · ${s.ocorrencias.length} fora da tolerância${s.pendentes.length ? ` · ${s.pendentes.length} gavetas não lançadas` : ''}`
      : 'Nenhum fechamento neste mês.';
  }
  function celulaDia(iso, n, tol) {
    const d = diaDaData(iso);
    if (!d) return `<button type="button" class="cal-dia vazio" data-abrir="${iso}"><span class="cal-num">${n}</span></button>`;
    const r = calcularDia(d, tol);
    const linhas = r.caixas.map((c) => {
      const txt = c.r.status === 'semVenda' ? '—' : c.r.status === 'pendente' ? 'pend.' : sinal(c.r.diferenca);
      return `<span class="cal-cx st-${c.r.status}"><span>cx${c.caixa}</span><span>${txt}</span></span>`;
    }).join('');
    return `<button type="button" class="cal-dia" data-abrir="${iso}" title="Abrir ${dataBR(iso)}">
      <span class="cal-num">${n}<small>${formatar(r.vendas, false).replace(/,\d\d$/, '')}</small></span>${linhas}</button>`;
  }
  $('#calendario').addEventListener('click', (e) => {
    const b = e.target.closest('[data-abrir]');
    if (b) irParaDia(b.dataset.abrir);
  });
  $('#cal-mes').onchange = renderCalendario;
  function moverMes(delta) {
    const [a, m] = mesAtual().split('-').map(Number);
    const d = new Date(a, m - 1 + delta, 1);
    $('#cal-mes').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    renderCalendario();
  }
  $('#cal-ant').onclick = () => moverMes(-1);
  $('#cal-prox').onclick = () => moverMes(1);

  async function irParaDia(iso) {
    if (alterado && dia.data !== iso && !(await confirmar('Há alterações não salvas no dia aberto. Descartar?'))) return;
    if (dia.data !== iso || !alterado) abrirDia(iso);
    trocarAba('dia');
  }

  // ---------- painel ----------
  function renderPainel() {
    const lista = dias();
    const meses = [...new Set(lista.map((d) => d.data.slice(0, 7)))].sort().reverse();
    const sel = $('#pn-periodo');
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todo o período</option>' + meses.map((m) => {
      const [a, mm] = m.split('-');
      return `<option value="${m}">${MESES[+mm - 1]} de ${a}</option>`;
    }).join('');
    sel.value = meses.includes(atual) ? atual : '';
    const periodo = sel.value;
    const doPeriodo = lista.filter((d) => !periodo || d.data.startsWith(periodo));
    const tol = config().tolerancia;
    const s = resumir(doPeriodo, tol);
    const somaFaltas = s.ocorrencias.filter((o) => o.diferenca < 0).reduce((t, o) => t + o.diferenca, 0);
    const somaSobras = s.ocorrencias.filter((o) => o.diferenca > 0).reduce((t, o) => t + o.diferenca, 0);

    $('#pn-kpis').innerHTML = `
      <div class="kpi"><span>Vendas no sistema</span><strong>${formatar(s.vendas)}</strong><small>${s.diasComVenda} dias com venda · média ${formatar(s.diasComVenda ? s.vendas / s.diasComVenda : 0)}/dia</small></div>
      <div class="kpi"><span>Diferença líquida</span><strong class="${classeValor(s.diferenca)}">${sinal(s.diferenca)}</strong><small>sobras e faltas se compensam aqui</small></div>
      <div class="kpi"><span>Faltas fora da tolerância</span><strong class="neg">${formatar(somaFaltas)}</strong><small>${s.ocorrencias.filter((o) => o.diferenca < 0).length} fechamentos · sobras ${formatar(somaSobras)}</small></div>
      <div class="kpi"><span>Gavetas não lançadas</span><strong>${s.pendentes.length}</strong><small>${s.pendentes.length ? 'confira a lista abaixo' : 'tudo lançado'}</small></div>`;

    $('#pn-caixas').innerHTML = `<thead><tr><th>Caixa</th><th>Vendas</th><th title="Fechamentos">Fech.</th><th>Faltas</th><th>Sobras</th><th>Líquido</th><th>Maior falta</th></tr></thead><tbody>` +
      (s.caixas.map((c) => `<tr><td>Caixa ${c.caixa}</td><td>${formatar(c.vendas, false)}</td><td>${c.fechamentos}</td><td>${c.faltas}</td><td>${c.sobras}</td>
        <td class="${classeValor(c.diferenca)}">${sinal(c.diferenca)}</td><td class="${classeValor(c.maiorFalta)}">${c.maiorFalta ? formatar(c.maiorFalta, false) : '—'}</td></tr>`).join('') ||
        '<tr><td colspan="7" class="vazio-msg">Sem fechamentos no período.</td></tr>') + '</tbody>';

    const totalMix = Object.values(s.mix).reduce((t, v) => t + Math.max(v, 0), 0) || 1;
    const chaves = Object.keys(NOMES_MIX);
    $('#pn-mix').innerHTML = `
      <div class="mix-barra" role="img" aria-label="Participação de cada forma de pagamento">${chaves.map((k) =>
        `<div style="flex:${Math.max(s.mix[k], 0)};background:${CORES_MIX[k]}" title="${NOMES_MIX[k]}: ${(100 * s.mix[k] / totalMix).toFixed(1)}%"></div>`).join('')}</div>
      <ul class="mix-lista">${chaves.map((k) => `<li><i style="background:${CORES_MIX[k]}"></i><span>${NOMES_MIX[k]}</span><b>${formatar(s.mix[k], false)}</b><em>${(100 * s.mix[k] / totalMix).toFixed(1)}%</em></li>`).join('')}</ul>`;

    renderGraficoVendas(doPeriodo, tol);

    $('#pn-ocorrencias').innerHTML = s.ocorrencias.slice(0, 10).map((o) =>
      `<li><button type="button" data-abrir="${o.data}"><span>${dataBR(o.data)} · Caixa ${o.caixa}${o.operador ? ' · ' + esc(o.operador) : ''}</span><b class="${classeValor(o.diferenca)}">${sinal(o.diferenca)}</b></button></li>`).join('') ||
      '<li class="vazio-msg">Nenhuma diferença fora da tolerância.</li>';
    $('#pn-pendentes').innerHTML = s.pendentes.map((p) =>
      `<li><button type="button" data-abrir="${p.data}"><span>${dataBR(p.data)} · Caixa ${p.caixa}</span><b>sistema ${formatar(p.sistema, false)}</b></button></li>`).join('') ||
      '<li class="vazio-msg">Nenhuma.</li>';
  }
  $('#pn-periodo').onchange = renderPainel;
  $('#aba-painel').addEventListener('click', (e) => {
    const b = e.target.closest('[data-abrir]');
    if (b && !b.closest('svg')) irParaDia(b.dataset.abrir);
  });

  function renderGraficoVendas(lista, tol) {
    const pts = lista.map((d) => ({ data: d.data, v: calcularDia(d, tol).caixas.reduce((t, c) => t + (c.sistema || 0), 0) })).filter((p) => p.v > 0);
    const el = $('#pn-vendas');
    if (!pts.length) { el.innerHTML = '<p class="vazio-msg">Sem vendas no período.</p>'; return; }
    const L = 720, A = 220, esq = 48, base = 196, topo = 12;
    const max = Math.max(...pts.map((p) => p.v));
    const passo = [100000, 200000, 500000, 1000000, 2000000, 5000000].find((p) => max / p <= 5) || 10000000;
    const teto = Math.ceil(max / passo) * passo;
    const y = (v) => base - (v / teto) * (base - topo);
    const larg = (L - esq - 8) / pts.length;
    const b = Math.max(2, Math.min(18, larg - 2));
    let svg = '';
    for (let v = 0; v <= teto; v += passo) {
      svg += `<line class="grade" x1="${esq}" x2="${L - 4}" y1="${y(v)}" y2="${y(v)}"/><text x="${esq - 6}" y="${y(v) + 4}" text-anchor="end">${v ? v / 100000 + "k" : "0"}</text>`;
    }
    const marcaMes = new Set();
    pts.forEach((p, k) => {
      const x = esq + k * larg + (larg - b) / 2;
      const h = base - y(p.v);
      const r = Math.min(3, b / 2, h);
      svg += `<rect class="alvo" x="${esq + k * larg}" y="${topo}" width="${larg}" height="${base - topo}" data-k="${k}"/>`;
      svg += `<path class="barra" d="M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + b - r} Q${x + b},${base - h} ${x + b},${base - h + r} V${base} Z"/>`;
      const mes = p.data.slice(0, 7);
      if (!marcaMes.has(mes)) {
        marcaMes.add(mes);
        svg += `<text x="${x}" y="${base + 16}">${MESES[+mes.slice(5) - 1].slice(0, 3)}</text>`;
      }
    });
    el.innerHTML = `<svg viewBox="0 0 ${L} ${A}" role="img" aria-label="Vendas por dia no período">${svg}</svg>`;
    const dica = $('#dica-grafico');
    const svgEl = $('svg', el);
    svgEl.addEventListener('pointermove', (e) => {
      const alvo = e.target.closest('.alvo');
      if (!alvo) { dica.hidden = true; return; }
      const p = pts[+alvo.dataset.k];
      const d = dataObj(p.data);
      dica.textContent = `${DIAS_SEMANA[d.getDay()].slice(0, 3)} ${dataBR(p.data)} · ${formatar(p.v)}`;
      dica.hidden = false;
      dica.style.left = Math.min(e.clientX + 12, window.innerWidth - dica.offsetWidth - 8) + 'px';
      dica.style.top = e.clientY - 34 + 'px';
    });
    svgEl.addEventListener('pointerleave', () => (dica.hidden = true));
    svgEl.addEventListener('click', (e) => {
      const alvo = e.target.closest('.alvo');
      if (alvo) { dica.hidden = true; irParaDia(pts[+alvo.dataset.k].data); }
    });
  }

  // ---------- ajustes e backup ----------
  function renderConfig() {
    const cfg = config();
    $('#cfg-qtd').value = cfg.qtdCaixas;
    $('#cfg-tolerancia').value = paraCampo(cfg.tolerancia) || '0,00';
    const l = dias();
    $('#cfg-contagem').textContent = l.length
      ? `${l.length} dias salvos neste navegador, de ${dataBR(l[0].data)} a ${dataBR(l[l.length - 1].data)}.`
      : 'Nenhum fechamento salvo ainda.';
  }
  $('#btn-salvar-cfg').onclick = () => {
    const qtd = Math.min(8, Math.max(1, parseInt($('#cfg-qtd').value, 10) || 3));
    gravar(CHAVE_CFG, { qtdCaixas: qtd, tolerancia: Math.abs(paraCentavos($('#cfg-tolerancia').value)) });
    renderConfig();
    if (!alterado) abrirDia(dia.data); else atualizarTotais();
    avisar('Ajustes salvos.');
  };

  function gerarCSV() {
    const cab = ['Data', 'Caixa', 'Operador', 'Situação', 'Rel. sistema', 'Troco inicial', 'Suprimento', 'Total sistema',
      ...FORMAS.map((f) => f.nome), 'Troco final', 'Sangrias', 'Despesas', 'Vale transporte', 'Outros', 'Total gaveta', 'Diferença', 'Observações'];
    const n = (c) => (c / 100).toFixed(2).replace('.', ',');
    const sit = { ok: 'confere', falta: 'falta', sobra: 'sobra', pendente: 'gaveta não lançada', semVenda: 'sem venda' };
    const linhas = [];
    for (const d of dias()) for (const c of d.caixas) {
      const r = calcularCaixa(c, config().tolerancia);
      linhas.push([dataBR(d.data), c.caixa, c.operador || '', sit[r.status], n(c.sistema || 0), n(c.trocoInicial || 0), n(c.suprimento || 0), n(r.totalSistema),
        ...FORMAS.map((f) => n(c[f.id] || 0)), n(c.trocoFinal || 0), n(r.sangrias), n(c.despesas || 0), n(c.valeTransporte || 0), n(r.outros), n(r.totalGaveta), n(r.diferenca), d.obs || '']);
    }
    return [cab, ...linhas].map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  }
  function baixar(conteudo, nome, tipo) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $('#btn-backup').onclick = () => baixar(JSON.stringify({ versao: 2, config: config(), fechamentos: dias() }, null, 1), `backup-caixa-${hoje()}.json`, 'application/json');
  $('#btn-csv').onclick = () => baixar('﻿' + gerarCSV(), `fechamentos-${hoje()}.csv`, 'text/csv');
  $('#btn-copiar-csv').onclick = () => {
    const txt = gerarCSV().replace(/;/g, '\t').replace(/"/g, '');
    navigator.clipboard?.writeText(txt).then(() => avisar('Planilha copiada. Cole no Excel.'), () => avisar('O navegador não deixou copiar.'))
      ?? avisar('O navegador não deixou copiar.');
  };
  $('#in-backup').onchange = async (e) => {
    const arq = e.target.files[0];
    e.target.value = '';
    if (!arq) return;
    let dados;
    try {
      dados = JSON.parse(await arq.text());
      if (!Array.isArray(dados.fechamentos) || dados.fechamentos.some((d) => !d.data || !Array.isArray(d.caixas))) throw new Error();
    } catch { avisar('Arquivo inválido. Use um backup deste app ou o JSON do importador.'); return; }
    const atuais = dias();
    const repetidos = dados.fechamentos.filter((d) => atuais.some((a) => a.data === d.data)).length;
    const msg = `Importar ${dados.fechamentos.length} dias?` + (repetidos ? ` ${repetidos} já existem e serão substituídos.` : '');
    if (!(await confirmar(msg))) return;
    const datas = new Set(dados.fechamentos.map((d) => d.data));
    salvarDias([...atuais.filter((a) => !datas.has(a.data)), ...dados.fechamentos]);
    if (dados.config) gravar(CHAVE_CFG, { ...config(), ...dados.config });
    renderConfig();
    abrirDia(dia.data);
    avisar(`${dados.fechamentos.length} dias importados.`);
  };

  // ---------- abas ----------
  function trocarAba(nome) {
    $$('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === nome));
    $$('.painel').forEach((p) => (p.hidden = p.id !== 'aba-' + nome));
    if (nome === 'calendario') renderCalendario();
    if (nome === 'painel') renderPainel();
    if (nome === 'config') renderConfig();
    try { localStorage.setItem('fechamento-caixa:aba', nome); } catch {}
    window.scrollTo(0, 0);
  }
  $$('.aba').forEach((b) => (b.onclick = () => trocarAba(b.dataset.aba)));
  window.addEventListener('beforeunload', (e) => { if (alterado) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- início ----------
  const lista = dias();
  const ultimo = lista.length ? lista[lista.length - 1].data : null;
  abrirDia(hoje());
  $('#cal-mes').value = (ultimo || hoje()).slice(0, 7);
  let abaInicial = 'dia';
  try { abaInicial = localStorage.getItem('fechamento-caixa:aba') || (lista.length > 20 ? 'painel' : 'dia'); } catch {}
  if (/^#(dia|calendario|painel|config)$/.test(location.hash)) abaInicial = location.hash.slice(1);
  trocarAba(abaInicial);
})();
