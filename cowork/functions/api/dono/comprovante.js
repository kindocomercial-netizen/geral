import { erro } from '../../_lib.js';

// GET /api/dono/comprovante?id=...  -> devolve o arquivo enviado
export async function onRequestGet({ request, env }) {
  if (!env.COMPROVANTES) return erro('Comprovantes não ligados (binding COMPROVANTES).', 503);
  const id = new URL(request.url).searchParams.get('id') || '';
  const { value, metadata } = await env.COMPROVANTES.getWithMetadata('comp:' + id, { type: 'arrayBuffer' });
  if (!value) return erro('Comprovante não encontrado.', 404);
  return new Response(value, {
    headers: {
      'content-type': (metadata && metadata.tipo) || 'application/octet-stream',
      'cache-control': 'private, no-store',
      'content-disposition': 'inline',
    },
  });
}
