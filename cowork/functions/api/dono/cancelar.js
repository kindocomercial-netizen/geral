import { json, erro } from '../../_lib.js';

// POST /api/dono/cancelar {id}
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return erro('Pedido inválido.'); }
  const res = await env.DB.prepare('UPDATE reservas SET cancelado = 1 WHERE id = ?').bind(String(b.id || '')).run();
  if (!res.meta || !res.meta.changes) return erro('Reserva não encontrada.', 404);
  return json({ ok: true });
}
