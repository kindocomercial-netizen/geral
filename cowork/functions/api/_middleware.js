import { garantirSchema, erro } from '../_lib.js';

export async function onRequest(context) {
  const { env } = context;
  if (!env.DB) return erro('A agenda ainda não foi ligada ao banco de dados (binding DB).', 503);
  try {
    await garantirSchema(env.DB);
    return await context.next();
  } catch (e) {
    return erro('Erro no servidor da agenda. Tente de novo em instantes.', 500);
  }
}
