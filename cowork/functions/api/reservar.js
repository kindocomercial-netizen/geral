import {
  json, erro, dataValida, slotsDe, lerPrecos, soDigitos, POSTOS, DIARIA,
  agoraSP, marca, token, ehDono,
} from '../_lib.js';

// POST /api/reservar  {data, posto, inicio, horas, tipo, nome, tel}
export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return erro('Pedido inválido.'); }
  const dono = ehDono(request, env);

  const data = b.data, posto = b.posto, tipo = b.tipo === 'diaria' ? 'diaria' : 'hora';
  const nome = String(b.nome || '').trim().slice(0, 80);
  const tel = String(b.tel || '').trim().slice(0, 30);
  const teld = soDigitos(tel);

  if (!dataValida(data)) return erro('Data inválida.');
  if (!POSTOS.includes(posto)) return erro('Posto inválido.');
  if (!nome) return erro('Informe o nome do profissional.');
  if (teld.length < 10) return erro('Informe o WhatsApp com DDD.');

  const total = slotsDe(data);
  if (!total) return erro('Aos domingos a loja fica fechada.');

  let inicio, horas;
  if (tipo === 'diaria') { inicio = DIARIA.inicio; horas = DIARIA.horas; }
  else {
    inicio = Number(b.inicio); horas = Number(b.horas);
    if (!Number.isInteger(inicio) || !Number.isInteger(horas) || inicio < 0 || horas < 1 || inicio + horas > total)
      return erro('Horário inválido.');
  }
  if (marca(data, inicio) < agoraSP()) return erro('Esse horário já passou.');

  // Uso anterior sem pagamento bloqueia nova reserva (cláusula 3.5 do contrato).
  if (!dono) {
    const { results: abertas } = await env.DB.prepare(
      "SELECT data, inicio, horas, valor FROM reservas WHERE teld = ? AND cancelado = 0 AND status != 'pago'"
    ).bind(teld).all();
    const agora = agoraSP();
    const divida = abertas.find((r) => marca(r.data, r.inicio + r.horas) <= agora);
    if (divida) {
      const [y, m, d] = divida.data.split('-');
      return erro(`Há um uso de ${d}/${m} em aberto (R$ ${divida.valor}). Quite esse valor com o Julio para reservar de novo.`, 409);
    }
  }

  // Conflito com reservas existentes no mesmo posto e dia.
  const { results: ocupadas } = await env.DB.prepare(
    'SELECT inicio, horas FROM reservas WHERE data = ? AND posto = ? AND cancelado = 0'
  ).bind(data, posto).all();
  const conflito = ocupadas.some((r) => inicio < r.inicio + r.horas && r.inicio < inicio + horas);
  if (conflito) return erro('Parte desse horário já está reservada. Escolha outro na grade.', 409);

  const precos = await lerPrecos(env.DB);
  const valor = tipo === 'diaria' ? precos.diaria : horas * precos.hora;
  const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const tk = token();

  await env.DB.prepare(
    `INSERT INTO reservas (id, data, posto, inicio, horas, tipo, nome, tel, teld, valor, status, token, criado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`
  ).bind(id, data, posto, inicio, horas, tipo, nome, tel, teld, valor, tk, new Date().toISOString()).run();

  // Conferência final contra reserva simultânea: se colidiu, desfaz a mais nova.
  const { results: depois } = await env.DB.prepare(
    'SELECT id, inicio, horas, criado FROM reservas WHERE data = ? AND posto = ? AND cancelado = 0 AND id != ?'
  ).bind(data, posto, id).all();
  if (depois.some((r) => inicio < r.inicio + r.horas && r.inicio < inicio + horas)) {
    await env.DB.prepare('DELETE FROM reservas WHERE id = ?').bind(id).run();
    return erro('Alguém acabou de reservar esse horário. Escolha outro na grade.', 409);
  }

  return json({ id, token: tk, valor, inicio, horas, tipo });
}
