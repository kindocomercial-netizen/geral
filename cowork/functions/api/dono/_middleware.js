import { ehDono, erro } from '../../_lib.js';

// Tudo em /api/dono/* exige a senha da área do dono.
export async function onRequest(context) {
  if (!context.env.ADMIN_SENHA) return erro('A senha da área do dono ainda não foi cadastrada (ADMIN_SENHA).', 503);
  if (!ehDono(context.request, context.env)) return erro('Senha incorreta.', 401);
  return context.next();
}
