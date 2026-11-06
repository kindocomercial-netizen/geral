import { json, erro, dataValida, lerPrecos, ehDono } from '../_lib.js';

// GET /api/dia?data=AAAA-MM-DD
// Público: horários ocupados (sem telefone). Dono (com senha): tudo.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const data = url.searchParams.get('data');
  if (!dataValida(data)) return erro('Data inválida.');
  const dono = ehDono(request, env);
  const { results } = await env.DB.prepare(
    'SELECT id, posto, inicio, horas, tipo, nome, tel, valor, status, comprovante FROM reservas WHERE data = ? AND cancelado = 0 ORDER BY inicio'
  ).bind(data).all();
  const reservas = results.map((r) => {
    const base = { id: r.id, posto: r.posto, inicio: r.inicio, horas: r.horas, tipo: r.tipo, nome: r.nome, status: r.status, valor: r.valor };
    if (dono) Object.assign(base, { tel: r.tel, comprovante: !!r.comprovante });
    return base;
  });
  return json({ data, precos: await lerPrecos(env.DB), reservas, dono });
}
