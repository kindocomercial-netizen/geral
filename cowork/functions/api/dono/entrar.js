import { json } from '../../_lib.js';

// POST /api/dono/entrar — só confirma que a senha está certa.
export const onRequestPost = () => json({ ok: true });
