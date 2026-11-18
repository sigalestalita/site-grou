/* Porta de entrada da API da DU99: /du99/api/<rota>/ é reescrito para /api/certificado?du99=<rota>.
   Fica dentro da função de certificado da Grou para não criar uma função nova na Vercel. */
const c = require('../_comum');
const B = require('./base');
const P = require('./publico');
const A = require('./admin');
const S = require('./sessao');

const GET_PUB = { eventos: P.eventos, evento: P.evento, verificar: P.verificar, pagina: P.pagina, convite: A.convite };
const POST_PUB = { gerar: P.gerar, imagem: P.imagem, login: A.login, aceitar: A.aceitar };
const GET_ADM = { dados: A.dados, participantes: A.participantes, usuarios: A.usuarios };
const POST_ADM = { salvar: A.salvar, excluir: A.excluir, participante: A.participante, importar: A.importar, upload: A.upload, usuario: A.usuario };

module.exports = async (req, res) => {
  if (!B.db.ativo()) return c.responde(res, 503, { erro: 'Sistema indisponível agora. Tente de novo em instantes.' });
  const url = new URL(req.url, B.SITE);
  const rota = String(url.searchParams.get('du99') || '').replace(/[^a-z_]/g, '');
  try {
    if (req.method === 'GET') {
      if (GET_PUB[rota]) return await GET_PUB[rota](req, res, url);
      if (rota === 'eu') { const u = await S.usuario(req); return c.responde(res, u ? 200 : 401, u ? { ok: true, usuario: u } : { erro: 'Entre para continuar.' }); }
      if (GET_ADM[rota]) {
        const u = await S.usuario(req);
        if (!u) return c.responde(res, 401, { erro: 'Sua sessão terminou. Entre de novo.' });
        return await GET_ADM[rota](req, res, url, u);
      }
      return c.responde(res, 404, { erro: 'Rota desconhecida.' });
    }
    if (req.method !== 'POST') return c.responde(res, 405, { erro: 'Método não permitido.' });
    if (!c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });
    const b = c.corpoJson(req);
    if (rota === 'sair') { S.saiu(res); return c.responde(res, 200, { ok: true }); }
    if (POST_PUB[rota]) return await POST_PUB[rota](req, res, b);
    if (POST_ADM[rota]) {
      const u = await S.usuario(req);
      if (!u) return c.responde(res, 401, { erro: 'Sua sessão terminou. Entre de novo.' });
      return await POST_ADM[rota](req, res, b, u);
    }
    return c.responde(res, 404, { erro: 'Rota desconhecida.' });
  } catch (e) {
    console.error('du99 ' + rota + ':', e.message);
    return c.responde(res, 502, { erro: 'Não foi possível concluir agora. Tente de novo em instantes.' });
  }
};
