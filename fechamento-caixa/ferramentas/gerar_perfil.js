// Gera o perfil "normal" de cada caixa a partir do histórico importado.
// Uso: node ferramentas/gerar_perfil.js historico.json [perfil.js|perfil.json]
const fs = require('fs');
const path = require('path');
const { montarPerfil } = require('../calc.js');

const [entrada, saida = 'perfil.js'] = process.argv.slice(2);
if (!entrada) { console.error('Uso: node ferramentas/gerar_perfil.js historico.json [perfil.js|perfil.json]'); process.exit(1); }
const { fechamentos } = JSON.parse(fs.readFileSync(entrada, 'utf8'));
const perfil = { geradoEm: new Date().toISOString(), ...montarPerfil(fechamentos, 200) };
const json = JSON.stringify(perfil);
fs.writeFileSync(saida, path.extname(saida) === '.js' ? `window.PERFIL_INICIAL = ${json};\n` : json);
console.log(`Perfil de ${Object.keys(perfil.caixas).length} caixas gravado em ${saida}`);
