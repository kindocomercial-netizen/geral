const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../calc.js');

test('paraCentavos entende formatos brasileiros e internacionais', () => {
  assert.equal(C.paraCentavos('1.234,56'), 123456);
  assert.equal(C.paraCentavos('R$ 10'), 1000);
  assert.equal(C.paraCentavos('10,5'), 1050);
  assert.equal(C.paraCentavos('1234.56'), 123456);
  assert.equal(C.paraCentavos('1.000'), 100000);
  assert.equal(C.paraCentavos('-5,25'), -525);
  assert.equal(C.paraCentavos(''), 0);
  assert.equal(C.paraCentavos('abc'), 0);
  assert.equal(C.paraCentavos(0.1 + 0.2), 30);
});

test('formatar gera moeda brasileira', () => {
  assert.equal(C.formatar(123456), 'R$ 1.234,56');
  assert.equal(C.formatar(5), 'R$ 0,05');
  assert.equal(C.formatar(-1050), '−R$ 10,50');
  assert.equal(C.formatar(100000000, false), '1.000.000,00');
});

test('totalContagem soma cédulas e moedas', () => {
  assert.equal(C.totalContagem({ 10000: 2, 5000: 1, 25: 4 }), 25100);
  assert.equal(C.totalContagem({}), 0);
});

// Caixa 1 de 01/06/2026 da planilha: diferença de R$ 0,53
const cx1_0106 = {
  caixa: 1, sistema: 370326, trocoInicial: 96655, suprimento: 0,
  credito: 69631, creditoParcelado: 0, debito: 125112, pix: 62762, trocoFinal: 58480,
  sangrias: [90000, 60000], despesas: 1049, valeTransporte: 0,
};

test('reproduz a diferença calculada na planilha', () => {
  const r = C.calcularCaixa(cx1_0106);
  assert.equal(r.totalSistema, 466981);
  assert.equal(r.totalGaveta, 467034);
  assert.equal(r.diferenca, 53);
  assert.equal(r.status, 'sobra');
  assert.equal(C.calcularCaixa(cx1_0106, 200).status, 'ok');
});

test('outros recebimentos (crediário, cheque) entram na gaveta', () => {
  const r = C.calcularCaixa({ sistema: 10000, trocoInicial: 5000, pix: 5000, trocoFinal: 9000, outros: [{ desc: 'crediário', valor: 1000 }] });
  assert.equal(r.diferenca, 0);
  assert.equal(r.status, 'ok');
});

test('caixa sem venda e caixa com gaveta em branco', () => {
  assert.equal(C.calcularCaixa({ sistema: 0, trocoInicial: 30000, trocoFinal: 30000 }).status, 'semVenda');
  assert.equal(C.calcularCaixa({ sistema: 483028 }).status, 'pendente');
  assert.equal(C.calcularCaixa({ sistema: 100, semVenda: true }).status, 'semVenda');
});

test('dinheiro vendido = saídas em espécie − troco inicial', () => {
  const r = C.calcularCaixa(cx1_0106);
  assert.equal(r.dinheiro, 58480 + 150000 + 1049 - 96655);
});

test('resumir ignora pendentes e soma diferenças por caixa', () => {
  const dias = [
    { data: '2026-06-01', caixas: [cx1_0106, { caixa: 2, sistema: 50000 }] },
    { data: '2026-06-02', caixas: [{ ...cx1_0106, trocoFinal: 58000 }] },
  ];
  const s = C.resumir(dias, 100);
  assert.equal(s.vendas, 370326 * 2);
  assert.equal(s.diferenca, 53 - 427);
  assert.equal(s.pendentes.length, 1);
  assert.equal(s.caixas[0].faltas, 1);
  assert.equal(s.ocorrencias[0].diferenca, -427);
  assert.equal(s.mix.pix, 62762 * 2);
});

// ---------- diagnóstico ----------
const perfil = {
  formas: {
    credito: { mediana: 0.3, p95: 0.5 }, creditoParcelado: { mediana: 0, p95: 0.2 },
    debito: { mediana: 0.33, p95: 0.5 }, pix: { mediana: 0.12, p95: 0.25 },
  },
  difP90: 3000,
};
const titulos = (r) => r.dicas.map((d) => d.titulo);

test('diagnóstico: caixa que fecha não gera alerta', () => {
  const r = C.diagnosticar(cx1_0106, { perfil });
  assert.equal(r.nivel, 'ok');
  assert.equal(r.dicas.length, 0);
});

test('diagnóstico: sangria lançada duas vezes', () => {
  const r = C.diagnosticar({ ...cx1_0106, sangrias: [90000, 60000, 60000] }, { perfil });
  assert.equal(r.nivel, 'grave');
  assert.equal(r.dicas[0].confianca, 'alta');
  assert.match(r.dicas[0].detalhe, /duas vezes/);
});

test('diagnóstico: dígitos invertidos no débito', () => {
  // 1.251,12 digitado como 1.215,12
  const r = C.diagnosticar({ ...cx1_0106, debito: 121512 }, { perfil });
  assert.ok(titulos(r).includes('Possível erro de digitação em Débito'));
  assert.match(r.dicas.find((d) => d.campo === 'debito').detalhe, /1\.251,12/);
});

test('diagnóstico: zero a mais no relatório do sistema', () => {
  const r = C.diagnosticar({ ...cx1_0106, sistema: 3703260 }, { perfil });
  assert.ok(titulos(r).includes('Possível erro de digitação em Rel. caixa sistema'));
});

test('diagnóstico: PIX esquecido', () => {
  const r = C.diagnosticar({ ...cx1_0106, pix: 0 }, { perfil });
  const pix = r.dicas.find((d) => d.campo === 'pix');
  assert.equal(pix.confianca, 'media');
  assert.match(pix.titulo, /PIX está zerado/);
});

test('diagnóstico: troco inicial errado explica a diferença', () => {
  const r = C.diagnosticar({ ...cx1_0106, trocoInicial: 106655 }, { perfil, trocoOntem: { data: '2026-05-28', valor: 96655 } });
  assert.equal(r.dicas[0].titulo, 'Troco inicial diferente do último fechamento');
  assert.equal(r.dicas[0].confianca, 'alta');
});

test('diagnóstico: falta de uma nota de R$ 50', () => {
  const r = C.diagnosticar({ ...cx1_0106, trocoFinal: 58480 - 5053 }, { perfil });
  assert.equal(r.diferenca, -5000);
  assert.ok(titulos(r).some((t) => t.includes('cédula de R$ 50,00')));
  assert.ok(titulos(r).includes('Falta em valor redondo'));
});

test('diagnóstico: gaveta em branco', () => {
  assert.equal(C.diagnosticar({ caixa: 1, sistema: 483028 }).nivel, 'pendente');
});

test('montarPerfil calcula participação e último troco', () => {
  const p = C.montarPerfil([
    { data: '2026-06-01', caixas: [cx1_0106] },
    { data: '2026-06-02', caixas: [{ ...cx1_0106, trocoFinal: 58000 }] },
  ]);
  assert.equal(p.caixas[1].fechamentos, 2);
  assert.equal(p.caixas[1].ultimoTroco.valor, 58000);
  assert.ok(Math.abs(p.caixas[1].formas.pix.mediana - 62762 / 370326) < 0.001);
  assert.equal(p.caixas[1].difP90, 427);
});

test('diagnóstico: diferença que se desfaz com a de ontem ou com outro caixa', () => {
  const hoje = { ...cx1_0106, trocoFinal: 58480 + 10000 };
  const r = C.diagnosticar(hoje, { perfil, difOntem: { data: '2026-05-30', diferenca: -9950 }, outrosCaixas: [{ caixa: 2, diferenca: -10020 }] });
  assert.ok(titulos(r).includes('Compensa a diferença do fechamento anterior'));
  assert.ok(titulos(r).includes('Compensa a diferença do Caixa 2'));
});

test('diagnóstico: relatório do sistema menor que cartões e PIX', () => {
  // Caixa 3 de 01/06/2026 na planilha: sistema 74,96 com R$ 302,38 em cartões e PIX
  const cx3 = { caixa: 3, sistema: 7496, trocoInicial: 30215, credito: 4999, debito: 10795, pix: 14444, trocoFinal: 22245, sangrias: [15000] };
  const r = C.diagnosticar(cx3, { perfil });
  assert.equal(r.diferenca, 29772);
  assert.equal(r.dicas[0].titulo, 'Relatório do sistema menor que os cartões e o PIX');
});
