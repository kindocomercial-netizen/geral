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
