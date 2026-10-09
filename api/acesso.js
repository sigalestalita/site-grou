const c = require('./_comum');
const db = require('./_db');
const sessao = require('./_sessao');

const MAX_FALHAS = 5, BLOQUEIO_MIN = 15;

/* Login, sair e troca de senha do painel interno. */
module.exports = async (req, res) => {
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Acesso indisponível no momento.' });

  if (req.method === 'GET') {
    const u = await sessao.usuario(req);
    return u ? c.responde(res, 200, { logado: true, email: u.email, nome: u.nome || '' }) : c.responde(res, 401, { logado: false });
  }
  if (req.method !== 'POST') return c.responde(res, 405, { erro: 'Método não permitido.' });
  if (!c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });
  const b = c.corpoJson(req);

  if (b.acao === 'sair') { sessao.saiu(res); return c.responde(res, 200, { ok: true }); }

  if (b.acao === 'trocar') {
    const u = await sessao.usuario(req);
    if (!u) return c.responde(res, 401, { erro: 'Sessão expirada. Entre de novo.' });
    const nova = String(b.nova || '');
    if (!sessao.confereSenha(String(b.atual || ''), u.senha_hash)) return c.responde(res, 401, { erro: 'A senha atual não confere.' });
    if (nova.length < 10) return c.responde(res, 400, { erro: 'A nova senha precisa ter pelo menos 10 caracteres.' });
    if (nova === String(b.atual)) return c.responde(res, 400, { erro: 'Escolha uma senha diferente da atual.' });
    try {
      await db.atualizaAcesso(u.email, { senha_hash: sessao.hashSenha(nova) });
      return c.responde(res, 200, { ok: true });
    } catch (e) { console.error('trocar senha:', e.message); return c.responde(res, 502, { erro: 'Não foi possível trocar agora.' }); }
  }

  /* login */
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120), senha = String(b.senha || '').slice(0, 200);
  if (!email || !senha) return c.responde(res, 400, { erro: 'Informe e-mail e senha.' });
  let linha = null;
  try { linha = await db.acesso(email); } catch (e) { console.error('acesso:', e.message); return c.responde(res, 502, { erro: 'Não foi possível entrar agora.' }); }
  if (linha && linha.bloqueado_ate && new Date(linha.bloqueado_ate) > new Date()) {
    sessao.confereSenha(senha, sessao.FALSO);
    return c.responde(res, 429, { erro: 'Muitas tentativas. Tente de novo em ' + BLOQUEIO_MIN + ' minutos.' });
  }
  const ok = sessao.confereSenha(senha, linha ? linha.senha_hash : sessao.FALSO) && linha && linha.ativo;
  if (!ok) {
    if (linha) {
      const falhas = (linha.falhas || 0) + 1;
      try {
        await db.atualizaAcesso(email, falhas >= MAX_FALHAS
          ? { falhas: 0, bloqueado_ate: new Date(Date.now() + BLOQUEIO_MIN * 60000).toISOString() }
          : { falhas });
      } catch (e) { console.error('falhas:', e.message); }
    }
    return c.responde(res, 401, { erro: 'E-mail ou senha incorretos.' });
  }
  try { await db.atualizaAcesso(email, { falhas: 0, bloqueado_ate: null, ultimo_acesso: new Date().toISOString() }); } catch (e) { /* segue */ }
  sessao.entrou(res, email);
  c.responde(res, 200, { ok: true, nome: linha.nome || '', email });
};
