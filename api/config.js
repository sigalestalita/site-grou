const c = require('./_comum');
const db = require('./_db');

/* O navegador pergunta aqui se o checkout está ligado e qual SDK carregar. Não devolve nada secreto.
   Com ?verificar=1 o servidor testa a chave na DOM (consulta de um pedido inexistente, sem cobrança)
   e mostra só o começo e o fim dela para conferência. */
module.exports = async (req, res) => {
  const saida = {
    ativo: c.ativo(),
    inscricoes: db.ativo(),
    ambiente: c.ambiente(),
    chavePublica: c.env('DOM_PUBLIC_KEY'),
    sdk: c.urls().sdk,
    preco: c.PRECO_CHEIO,
    precoMetade: c.PRECO_METADE
  };
  if (req.query && req.query.verificar && c.ativo()) {
    const k = c.env('DOM_API_KEY');
    saida.verificacao = { chaveTamanho: k.length, chaveInicio: k.slice(0, 4), chaveFim: k.slice(-4), host: c.urls().api };
    try {
      const r = await c.dom('/transactions/00000000-0000-0000-0000-000000000000');
      saida.verificacao.http = r.http;
      saida.verificacao.aceita = r.http !== 401 && r.http !== 403;
      saida.verificacao.resposta = r.json ? String(r.json.msg || r.json.message || '').slice(0, 80) : '';
    } catch (e) {
      saida.verificacao.erro = 'sem resposta da DOM';
    }
  }
  c.responde(res, 200, saida);
};
