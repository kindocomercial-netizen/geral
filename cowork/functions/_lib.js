// Funções compartilhadas da API do Cowork Kindo (Cloudflare Pages Functions).
// Bindings esperados no projeto da Cloudflare:
//   DB           -> banco D1 (reservas e valores)
//   COMPROVANTES -> namespace KV (arquivos dos comprovantes)
//   ADMIN_SENHA  -> variável secreta com a senha da área do dono

export const PADRAO = { hora: 20, diaria: 120 };
export const POSTOS = ['cab1', 'cab2', 'mani'];
export const SLOTS = 10;          // 9h às 19h, de hora em hora
export const HORA_INI = 9;        // primeiro horário
export const DIARIA = { inicio: 0, horas: 9 }; // 9h às 18h
export const MAX_ARQUIVO = 5 * 1024 * 1024;

let schemaPronto = false;
export async function garantirSchema(db) {
  if (schemaPronto) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS reservas (
      id TEXT PRIMARY KEY, data TEXT NOT NULL, posto TEXT NOT NULL,
      inicio INTEGER NOT NULL, horas INTEGER NOT NULL, tipo TEXT NOT NULL,
      nome TEXT NOT NULL, tel TEXT NOT NULL, teld TEXT NOT NULL, valor REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente', token TEXT NOT NULL,
      comprovante INTEGER NOT NULL DEFAULT 0, criado TEXT NOT NULL,
      cancelado INTEGER NOT NULL DEFAULT 0)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_res_data ON reservas(data, posto)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_res_tel ON reservas(teld)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)`),
  ]);
  schemaPronto = true;
}

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const erro = (mensagem, status = 400) => json({ erro: mensagem }, status);

export async function lerPrecos(db) {
  const r = await db.prepare('SELECT valor FROM config WHERE chave = ?').bind('precos').first();
  if (!r) return { ...PADRAO };
  try { const v = JSON.parse(r.valor); return { hora: Number(v.hora) || PADRAO.hora, diaria: Number(v.diaria) || PADRAO.diaria }; }
  catch { return { ...PADRAO }; }
}

function igual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

export function ehDono(request, env) {
  const senha = env.ADMIN_SENHA;
  if (!senha) return false;
  const h = request.headers.get('authorization') || '';
  return igual(h, 'Bearer ' + senha);
}

export const soDigitos = (t) => String(t || '').replace(/\D/g, '');

export function dataValida(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function diaDaSemana(data) {
  const [y, m, d] = data.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const slotsDe = (data) => (diaDaSemana(data) === 0 ? 0 : SLOTS);

// "Agora" no horário de São Paulo, como texto comparável: AAAA-MM-DDTHH:MM
export function agoraSP() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 16);
}

export function marca(data, indiceHora) {
  const h = HORA_INI + indiceHora;
  return data + 'T' + String(h).padStart(2, '0') + ':00';
}

export function token() {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c]));
}
