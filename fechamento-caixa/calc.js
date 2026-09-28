// Regras do fechamento de caixa, iguais às da planilha "Backup de Fecha caixa":
//   Total sistema = Rel. caixa sistema + Troco inicial + Suprimento
//   Total gaveta  = Crédito à vista + Crédito parcelado + Débito + PIX + Troco final
//                   + Sangrias + Despesas + Vale transporte + Outros (crediário, cheque...)
//   Diferença     = Total gaveta − Total sistema
// Todos os valores são centavos (inteiros) para não haver erro de arredondamento.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DENOMINACOES = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 25, 10, 5];

  // Formas de recebimento da gaveta que não são dinheiro.
  const FORMAS = [
    { id: 'credito', nome: 'Crédito à vista' },
    { id: 'creditoParcelado', nome: 'Crédito parcelado' },
    { id: 'debito', nome: 'Débito' },
    { id: 'pix', nome: 'PIX' },
  ];

  function paraCentavos(valor) {
    if (typeof valor === 'number') return Math.round(valor * 100);
    if (valor == null) return 0;
    let s = String(valor).replace(/[R$\s]/g, '');
    if (!s) return 0;
    const negativo = s.startsWith('-');
    s = s.replace(/^-/, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    if (!Number.isFinite(n)) return 0;
    const c = Math.round(n * 100);
    return negativo ? -c : c;
  }

  function formatar(centavos, comSimbolo = true) {
    const neg = centavos < 0;
    const abs = Math.abs(Math.round(centavos));
    const reais = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const texto = reais + ',' + String(abs % 100).padStart(2, '0');
    return (neg ? '−' : '') + (comSimbolo ? 'R$ ' : '') + texto;
  }

  const somar = (lista) => (lista || []).reduce((t, v) => t + (typeof v === 'number' ? v : v?.valor || 0), 0);

  function totalContagem(contagem) {
    return DENOMINACOES.reduce((t, d) => t + d * (Number(contagem?.[d]) || 0), 0);
  }

  // status: 'semVenda' | 'pendente' | 'ok' | 'falta' | 'sobra'
  function calcularCaixa(c, tolerancia = 0) {
    const g = (k) => c[k] || 0;
    const totalSistema = g('sistema') + g('trocoInicial') + g('suprimento');
    const cartoes = g('credito') + g('creditoParcelado') + g('debito');
    const sangrias = somar(c.sangrias);
    const outros = somar(c.outros);
    const totalGaveta = cartoes + g('pix') + g('trocoFinal') + sangrias + g('despesas') + g('valeTransporte') + outros;
    const diferenca = totalGaveta - totalSistema;
    // Dinheiro que entrou em vendas: o que saiu da gaveta em espécie menos o que já estava nela.
    const dinheiro = g('trocoFinal') + sangrias + g('despesas') + g('valeTransporte') - g('trocoInicial') - g('suprimento');

    let status;
    if (c.semVenda || (!g('sistema') && !cartoes && !g('pix'))) status = 'semVenda';
    else if (!cartoes && !g('pix') && !g('trocoFinal') && !sangrias) status = 'pendente';
    else if (Math.abs(diferenca) <= tolerancia) status = 'ok';
    else status = diferenca < 0 ? 'falta' : 'sobra';

    return { totalSistema, totalGaveta, diferenca, cartoes, sangrias, outros, dinheiro, status };
  }

  const conta = (st) => st === 'ok' || st === 'falta' || st === 'sobra';

  function calcularDia(dia, tolerancia = 0) {
    const caixas = (dia.caixas || []).map((c) => ({ ...c, r: calcularCaixa(c, tolerancia) }));
    const validos = caixas.filter((c) => conta(c.r.status));
    return {
      caixas,
      vendas: validos.reduce((t, c) => t + (c.sistema || 0), 0),
      diferenca: validos.reduce((t, c) => t + c.r.diferenca, 0),
      pendentes: caixas.filter((c) => c.r.status === 'pendente').length,
    };
  }

  // Resumo de vários dias: vendas, mix de pagamento, diferenças por caixa.
  function resumir(dias, tolerancia = 0) {
    const porCaixa = {};
    const mix = { credito: 0, creditoParcelado: 0, debito: 0, pix: 0, dinheiro: 0 };
    const ocorrencias = [];
    const pendentes = [];
    let vendas = 0, diferenca = 0, diasComVenda = 0;

    for (const dia of dias) {
      const d = calcularDia(dia, tolerancia);
      if (d.vendas) diasComVenda++;
      for (const c of d.caixas) {
        const k = c.caixa;
        porCaixa[k] ??= { caixa: k, vendas: 0, diferenca: 0, fechamentos: 0, faltas: 0, sobras: 0, maiorFalta: 0 };
        if (c.r.status === 'pendente') { pendentes.push({ data: dia.data, caixa: k, sistema: c.sistema || 0 }); continue; }
        if (!conta(c.r.status)) continue;
        const p = porCaixa[k];
        p.vendas += c.sistema || 0;
        p.diferenca += c.r.diferenca;
        p.fechamentos++;
        if (c.r.status === 'falta') p.faltas++;
        if (c.r.status === 'sobra') p.sobras++;
        p.maiorFalta = Math.min(p.maiorFalta, c.r.diferenca);
        vendas += c.sistema || 0;
        diferenca += c.r.diferenca;
        FORMAS.forEach((f) => (mix[f.id] += c[f.id] || 0));
        // O restante das vendas (dinheiro, crediário etc.) = sistema − cartões − PIX
        mix.dinheiro += (c.sistema || 0) - c.r.cartoes - (c.pix || 0);
        if (c.r.status !== 'ok') ocorrencias.push({ data: dia.data, caixa: k, operador: c.operador || '', diferenca: c.r.diferenca });
      }
    }
    ocorrencias.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));
    return {
      vendas, diferenca, diasComVenda, mix, ocorrencias, pendentes,
      caixas: Object.values(porCaixa).sort((a, b) => a.caixa - b.caixa),
    };
  }


  // ---------- diagnóstico: onde pode estar a diferença ----------
  const ROTULOS = {
    sistema: 'Rel. caixa sistema', trocoInicial: 'Troco inicial', suprimento: 'Suprimento',
    credito: 'Crédito à vista', creditoParcelado: 'Crédito parcelado', debito: 'Débito', pix: 'PIX',
    trocoFinal: 'Troco final', despesas: 'Despesas', valeTransporte: 'Vale transporte',
  };
  const LADO_SISTEMA = ['sistema', 'trocoInicial', 'suprimento'];
  const PESO = { alta: 3, media: 2, baixa: 1 };

  // Todos os valores digitados, com o lado da conta em que entram.
  function valoresDigitados(c) {
    const lista = [];
    for (const k of Object.keys(ROTULOS)) if (c[k]) lista.push({ campo: k, rotulo: ROTULOS[k], valor: c[k], sistema: LADO_SISTEMA.includes(k) });
    (c.sangrias || []).forEach((v, i) => v && lista.push({ campo: 'sangrias', indice: i, rotulo: `Sangria ${i + 1}`, valor: v, sistema: false }));
    (c.outros || []).forEach((o, i) => o?.valor && lista.push({ campo: 'outros', indice: i, rotulo: o.desc || `Outro recebimento ${i + 1}`, valor: o.valor, sistema: false }));
    return lista;
  }

  // Valores que a pessoa pode ter querido digitar no lugar de v.
  function trocasDeDigito(v) {
    const s = String(Math.abs(v));
    const out = [];
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i] === s[i + 1]) continue;
      const w = s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
      out.push({ valor: Number(w), tipo: 'inversao' });
    }
    out.push({ valor: v * 10, tipo: 'zero' });
    if (v % 10 === 0) out.push({ valor: v / 10, tipo: 'zero' });
    return out;
  }

  // c: caixa (centavos). ctx: { tolerancia, trocoOntem: {valor, data}, difOntem: {data, diferenca},
  //   outrosCaixas: [{caixa, diferenca}] do mesmo dia, perfil: perfil do caixa }
  // perfil: { formas: {credito: {mediana, p95}, ...} (fração do sistema), difP90 (centavos) }
  function diagnosticar(c, ctx = {}) {
    const tol = ctx.tolerancia ?? 200;
    const perfil = ctx.perfil || null;
    const r = calcularCaixa(c, tol);
    const d = r.diferenca;
    const limite = Math.max(2000, perfil?.difP90 || 0);
    // Aceita um resíduo de até a tolerância (sempre sobram alguns centavos).
    const perto = (a, b) => Math.abs(a - b) <= Math.max(2, tol);
    const exato = (a, b) => Math.abs(a - b) <= 10; // até 10 centavos: bate quase certinho
    const dicas = [];
    const add = (confianca, titulo, detalhe, campo) => dicas.push({ confianca, titulo, detalhe, campo });

    if (r.status === 'semVenda') return { nivel: 'semVenda', diferenca: 0, limite, dicas };
    if (r.status === 'pendente') {
      add('alta', 'A gaveta está em branco', 'O relatório do sistema foi lançado, mas nenhum valor da gaveta (cartões, PIX, troco final, sangrias).');
      return { nivel: 'pendente', diferenca: d, limite, dicas };
    }

    // Troco inicial x troco final do fechamento anterior (vale mesmo sem diferença)
    const ontem = ctx.trocoOntem;
    if (ontem && ontem.valor != null && c.trocoInicial !== ontem.valor) {
      const delta = (c.trocoInicial || 0) - ontem.valor;
      const resolve = Math.abs(d) > tol && perto(d + delta, 0);
      add(resolve ? 'alta' : 'baixa', 'Troco inicial diferente do último fechamento',
        `Foi lançado ${formatar(c.trocoInicial || 0)}, mas este caixa fechou em ${ontem.data ? ontem.data.split('-').reverse().join('/') : 'o último dia'} com ${formatar(ontem.valor)}.` +
        (resolve ? ' Com o troco do dia anterior, o caixa fecharia certinho.' : ''), 'trocoInicial');
    }

    if (Math.abs(d) <= tol) {
      dicas.sort((a, b) => PESO[b.confianca] - PESO[a.confianca]);
      return { nivel: 'ok', diferenca: d, limite, dicas };
    }

    const falta = d < 0, abs = Math.abs(d);
    const valores = valoresDigitados(c);

    // 1. Um valor lançado igual à diferença: em dobro, de outro caixa, ou não entrou na gaveta
    for (const v of valores) {
      if (!perto(v.valor, abs)) continue;
      if (!falta && !v.sistema) {
        add('alta', `${v.rotulo} tem o mesmo valor da sobra`,
          v.campo === 'sangrias' ? `Essa sangria de ${formatar(v.valor)} pode ter sido lançada duas vezes.`
            : `${formatar(v.valor)} pode ter sido lançado em dobro, ou ser de outro caixa ou de outro dia.`, v.campo);
      } else if (falta && v.sistema && v.campo !== 'sistema') {
        add('alta', `${v.rotulo} tem o mesmo valor da falta`,
          v.campo === 'suprimento' ? `Confira se o reforço de ${formatar(v.valor)} entrou mesmo na gaveta.`
            : `Confira se o troco inicial de ${formatar(v.valor)} estava na gaveta ou se foi retirado sem registro.`, v.campo);
      }
    }

    // 2. Erro de digitação: dígitos invertidos ou zero a mais/a menos
    for (const v of valores) {
      for (const alt of trocasDeDigito(v.valor)) {
        const efeito = v.sistema ? -(alt.valor - v.valor) : alt.valor - v.valor; // mudança na diferença
        if (!perto(d + efeito, 0)) continue;
        add(exato(d + efeito, 0) ? 'alta' : 'media', `Possível erro de digitação em ${v.rotulo}`,
          `Foi lançado ${formatar(v.valor)}. Se o certo for ${formatar(alt.valor)}` +
          (alt.tipo === 'inversao' ? ' (dois números trocados de lugar)' : ' (um zero a mais ou a menos)') + ', o caixa fecha.', v.campo);
      }
    }

    // 3. Forma de pagamento zerada que normalmente aparece (só em falta)
    if (falta && perfil?.formas && c.sistema) {
      for (const f of FORMAS) {
        if (c[f.id]) continue;
        const p = perfil.formas[f.id];
        if (!p || p.mediana < 0.03) continue;
        const esperado = p.mediana * c.sistema;
        const plausivel = abs >= esperado * 0.35 && abs <= Math.max(esperado * 2.5, (p.p95 || 0) * c.sistema);
        add(plausivel ? 'media' : 'baixa', `${f.nome} está zerado`,
          `Neste caixa, ${f.nome.toLowerCase()} costuma ser ${Math.round(p.mediana * 100)}% das vendas (perto de ${formatar(Math.round(esperado))} hoje). ` +
          (f.id === 'pix' ? 'Confira o extrato do PIX.' : 'Confira o fechamento de lote da maquininha.'), f.id);
      }
    }

    // 4. Forma de pagamento muito acima do normal (só em sobra)
    if (!falta && perfil?.formas && c.sistema) {
      for (const f of FORMAS) {
        const p = perfil.formas[f.id];
        if (!c[f.id] || !p?.p95) continue;
        const parte = c[f.id] / c.sistema;
        if (parte > p.p95 * 1.25 && parte - p.mediana > 0.1) {
          add('media', `${f.nome} acima do normal`,
            `${f.nome} ficou em ${Math.round(parte * 100)}% das vendas; o normal deste caixa é até ${Math.round(p.p95 * 100)}%. Pode ter entrado o valor de outro caixa ou do dia todo da maquininha.`, f.id);
        }
      }
    }

    // 5a. Diferença que se desfaz com a do fechamento anterior do mesmo caixa
    const ant = ctx.difOntem;
    if (ant && Math.abs(ant.diferenca) > tol && Math.sign(ant.diferenca) !== Math.sign(d) &&
        Math.abs(d + ant.diferenca) <= Math.max(tol, abs * 0.1)) {
      add('media', 'Compensa a diferença do fechamento anterior',
        `Em ${ant.data.split('-').reverse().join('/')} este caixa fechou com ${formatar(ant.diferenca)}. ` +
        'Pode ser dinheiro, sangria ou comprovante de um dia contado no outro.');
    }

    // 5b. Diferença que se compensa com outro caixa no mesmo dia
    for (const o of ctx.outrosCaixas || []) {
      if (Math.abs(o.diferenca) <= tol || Math.sign(o.diferenca) === Math.sign(d)) continue;
      if (Math.abs(d + o.diferenca) <= Math.max(tol, abs * 0.1)) {
        add('media', `Compensa a diferença do Caixa ${o.caixa}`,
          `Hoje o Caixa ${o.caixa} está com ${formatar(o.diferenca)}. Pode ser uma venda, sangria ou comprovante lançado no caixa errado.`);
      }
    }

    // 5. Diferença redonda: cédula ou sangria
    const REDONDOS = [20000, 10000, 5000, 2000, 1000, 500, 200];
    const multiplo = Math.round(abs / 5000) * 5000;
    if (falta && multiplo >= 5000 && perto(abs, multiplo)) {
      add('media', 'Falta em valor redondo', `Sangrias costumam ser redondas. Confira se alguma retirada de ${formatar(multiplo)} ficou sem lançamento ou sem recibo.`, 'sangrias');
    }
    const nota = REDONDOS.find((n) => perto(abs, n));
    if (nota) {
      add('media', `Diferença de exatamente uma cédula de ${formatar(nota)}`,
        falta ? 'Pode ser troco dado a mais ou uma nota contada a mais na abertura. Reconte a gaveta separando as notas.'
          : 'Pode ser troco dado a menos ou uma nota contada duas vezes. Reconte a gaveta separando as notas.', 'trocoFinal');
    }

    // 6. Tamanho da diferença em relação ao histórico do caixa
    if (abs > limite) {
      add('baixa', 'Diferença bem acima do normal',
        `9 de cada 10 fechamentos deste caixa ficam até ${formatar(limite)}.` +
        (dicas.length ? '' : falta
          ? ' Confira: recontagem da gaveta, comprovantes da maquininha contra os valores lançados, recibos de sangria e cancelamentos no sistema.'
          : ' Confira: venda feita sem registrar no sistema, troco dado a menos, PIX ou cartão de outro caixa.'));
    } else if (!dicas.length) {
      add('baixa', falta ? 'Nenhuma causa óbvia para a falta' : 'Nenhuma causa óbvia para a sobra',
        falta ? 'Reconte a gaveta e confira os comprovantes da maquininha contra os valores lançados.'
          : 'Confira se houve venda sem registro no sistema ou troco dado a menos.');
    }

    // remove repetidas (mesmo título) e ordena por confiança
    const vistos = new Set();
    const unicas = dicas.filter((x) => (vistos.has(x.titulo) ? false : vistos.add(x.titulo)));
    unicas.sort((a, b) => PESO[b.confianca] - PESO[a.confianca]);
    return { nivel: abs > limite ? 'grave' : 'atencao', diferenca: d, limite, dicas: unicas };
  }

  // Perfil "normal" de cada caixa a partir do histórico: participação de cada
  // forma de pagamento nas vendas, tamanho típico da diferença e último troco final.
  function montarPerfil(dias, tolerancia = 200) {
    const q = (lista, p) => {
      if (!lista.length) return 0;
      const o = [...lista].sort((a, b) => a - b);
      return o[Math.min(o.length - 1, Math.floor(p * (o.length - 1) + 0.5))];
    };
    const base = {};
    for (const dia of [...dias].sort((a, b) => a.data.localeCompare(b.data))) {
      for (const c of dia.caixas || []) {
        const b = (base[c.caixa] ??= { partes: {}, difs: [], ultimoTroco: null, fechamentos: 0 });
        const r = calcularCaixa(c, tolerancia);
        if (c.trocoFinal || c.trocoInicial) b.ultimoTroco = { data: dia.data, valor: c.trocoFinal || c.trocoInicial };
        if (!['ok', 'falta', 'sobra'].includes(r.status) || !c.sistema) continue;
        b.fechamentos++;
        b.difs.push(Math.abs(r.diferenca));
        for (const f of FORMAS) (b.partes[f.id] ??= []).push((c[f.id] || 0) / c.sistema);
      }
    }
    const caixas = {};
    for (const [n, b] of Object.entries(base)) {
      const formas = {};
      for (const f of FORMAS) {
        const l = b.partes[f.id] || [];
        formas[f.id] = { mediana: +q(l, 0.5).toFixed(4), p95: +q(l, 0.95).toFixed(4) };
      }
      caixas[n] = { fechamentos: b.fechamentos, difP50: q(b.difs, 0.5), difP90: q(b.difs, 0.9), formas, ultimoTroco: b.ultimoTroco };
    }
    return { caixas };
  }

  return { montarPerfil, diagnosticar, DENOMINACOES, FORMAS, paraCentavos, formatar, totalContagem, calcularCaixa, calcularDia, resumir };
});
