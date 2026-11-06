import { json, erro } from '../../_lib.js';

// POST /api/dono/pago {id, pago: true|false}
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return erro('Pedido inválido.'); }
  const r = await env.DB.prepare('SELECT comprovante FROM reservas WHERE id = ?').bind(String(b.id || '')).first();
  if (!r) return erro('Reserva não encontrada.', 404);
  const status = b.pago ? 'pago' : (r.comprovante ? 'comprovante' : 'pendente');
  await env.DB.prepare('UPDATE reservas SET status = ? WHERE id = ?').bind(status, String(b.id)).run();
  return json({ ok: true, status });
}
