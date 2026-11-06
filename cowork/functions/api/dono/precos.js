import { json, erro } from '../../_lib.js';

// POST /api/dono/precos {hora, diaria}
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch { return erro('Pedido inválido.'); }
  const hora = Number(b.hora), diaria = Number(b.diaria);
  if (!(hora > 0 && diaria > 0)) return erro('Informe valores maiores que zero.');
  await env.DB.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor')
    .bind('precos', JSON.stringify({ hora, diaria })).run();
  return json({ ok: true, precos: { hora, diaria } });
}
