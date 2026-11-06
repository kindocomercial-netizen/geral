import { json, erro, MAX_ARQUIVO } from '../_lib.js';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

// POST /api/comprovante  (multipart: id, token, arquivo)
export async function onRequestPost({ request, env }) {
  if (!env.COMPROVANTES) return erro('O envio de comprovantes ainda não foi ligado (binding COMPROVANTES).', 503);
  let form;
  try { form = await request.formData(); } catch { return erro('Envio inválido.'); }
  const id = String(form.get('id') || '');
  const tk = String(form.get('token') || '');
  const arquivo = form.get('arquivo');
  if (!id || !tk || !arquivo || typeof arquivo === 'string') return erro('Anexe o comprovante.');
  if (arquivo.size > MAX_ARQUIVO) return erro('O arquivo passa de 5 MB. Envie uma foto ou um PDF menor.');
  const tipo = arquivo.type || 'application/octet-stream';
  if (!TIPOS.includes(tipo)) return erro('Envie uma foto (JPG ou PNG) ou um PDF.');

  const r = await env.DB.prepare('SELECT token, status, cancelado FROM reservas WHERE id = ?').bind(id).first();
  if (!r || r.token !== tk) return erro('Reserva não encontrada.', 404);
  if (r.cancelado) return erro('Essa reserva foi cancelada.', 409);

  await env.COMPROVANTES.put('comp:' + id, await arquivo.arrayBuffer(), {
    metadata: { tipo, nome: String(arquivo.name || 'comprovante').slice(0, 100), enviado: new Date().toISOString() },
  });
  await env.DB.prepare(
    "UPDATE reservas SET comprovante = 1, status = CASE WHEN status = 'pago' THEN 'pago' ELSE 'comprovante' END WHERE id = ?"
  ).bind(id).run();
  return json({ ok: true });
}
