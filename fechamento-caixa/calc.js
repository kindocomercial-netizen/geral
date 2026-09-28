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

  return { DENOMINACOES, FORMAS, paraCentavos, formatar, totalContagem, calcularCaixa, calcularDia, resumir };
});
