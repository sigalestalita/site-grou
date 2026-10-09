const crypto = require('crypto');
const c = require('./_comum');
const db = require('./_db');

const hash = (v) => crypto.createHash('sha256').update(String(v || '')).digest();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/* Painel interno de inscritos. A senha vem no cabeçalho x-gestao-senha e é conferida contra GESTAO_SENHA. */
module.exports = async (req, res) => {
  const senha = process.env.GESTAO_SENHA;
  if (!senha || !db.ativo()) return c.responde(res, 503, { erro: 'Painel ainda não configurado.' });
  const dado = req.headers['x-gestao-senha'];
  if (!crypto.timingSafeEqual(hash(dado), hash(senha))) {
    await espera(700);
    return c.responde(res, 401, { erro: 'Senha incorreta.' });
  }
  try {
    if (req.method === 'POST') {
      const b = c.corpoJson(req);
      if (b.acao === 'presenca' && /^[0-9a-f-]{36}$/i.test(String(b.id || ''))) {
        await db.marcaPresenca(b.id, b.valor);
        return c.responde(res, 200, { ok: true });
      }
      return c.responde(res, 400, { erro: 'Ação inválida.' });
    }
    const linhas = await db.lista('nr1-estrategica');
    c.responde(res, 200, {
      geradoEm: new Date().toISOString(), ambiente: c.ambiente(),
      cupons: { cem: c.CUPONS_100, metade: c.CUPONS_50 }, preco: c.PRECO_CHEIO, precoMetade: c.PRECO_METADE,
      inscritos: linhas
    });
  } catch (e) {
    console.error('gestao:', e.message);
    c.responde(res, 502, { erro: 'Não foi possível ler os inscritos agora.' });
  }
};
