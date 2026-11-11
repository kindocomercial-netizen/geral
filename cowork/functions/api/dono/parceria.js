import { json, erro, dataValida, slotsDe, soDigitos, POSTOS, DIARIA, agoraSP, marca, token } from '../../_lib.js';

// POST /api/dono/parceria {posto, nome, tel?, datas:[AAAA-MM-DD,...]}
// Reserva a cadeira o dia todo (9h às 18h) para profissional no esquema 70/30, sem cobrança de aluguel.
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return erro('Pedido inválido.'); }
  const posto = b.posto;
  const nome = String(b.nome || '').trim().slice(0, 80);
  const tel = String(b.tel || '').trim().slice(0, 30);
  const datas = Array.isArray(b.datas) ? [...new Set(b.datas)] : [];
  if (!POSTOS.includes(posto)) return erro('Escolha a cadeira.');
  if (!nome) return erro('Informe o nome do profissional.');
  if (!datas.length) return erro('Escolha pelo menos um dia.');
  if (datas.length > 120) return erro('Escolha no máximo 120 dias por vez.');

  const agora = agoraSP();
  const feitas = [], puladas = [];
  for (const data of datas.sort()) {
    if (!dataValida(data)) { puladas.push({ data, motivo: 'data inválida' }); continue; }
    if (!slotsDe(data)) { puladas.push({ data, motivo: 'domingo, loja fechada' }); continue; }
    if (marca(data, DIARIA.inicio + DIARIA.horas) <= agora) { puladas.push({ data, motivo: 'dia já passou' }); continue; }
    const { results: ocup } = await env.DB.prepare(
      'SELECT nome FROM reservas WHERE data = ? AND posto = ? AND cancelado = 0'
    ).bind(data, posto).all();
    if (ocup.length) { puladas.push({ data, motivo: 'já reservada por ' + ocup.map((r) => r.nome).join(', ') }); continue; }
    const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await env.DB.prepare(
      `INSERT INTO reservas (id, data, posto, inicio, horas, tipo, nome, tel, teld, valor, status, token, criado)
       VALUES (?, ?, ?, ?, ?, 'parceria', ?, ?, ?, 0, 'parceria', ?, ?)`
    ).bind(id, data, posto, DIARIA.inicio, DIARIA.horas, nome, tel, soDigitos(tel), token(), new Date().toISOString()).run();
    feitas.push(data);
  }
  return json({ ok: true, feitas, puladas });
}
