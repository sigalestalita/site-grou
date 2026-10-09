const c = require('./_comum');
const db = require('./_db');
const sessao = require('./_sessao');

/* Dados do painel interno: só para quem está logado e liberado. */
module.exports = async (req, res) => {
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Painel ainda não configurado.' });
  const u = await sessao.usuario(req);
  if (!u) return c.responde(res, 401, { erro: 'Sessão expirada. Entre de novo.' });
  if (req.method === 'POST' && !c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });
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
