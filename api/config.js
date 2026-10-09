const c = require('./_comum');

/* O navegador pergunta aqui se o checkout está ligado e qual SDK carregar. Não devolve nada secreto. */
module.exports = (req, res) => {
  c.responde(res, 200, {
    ativo: c.ativo(),
    ambiente: c.ambiente(),
    chavePublica: process.env.DOM_PUBLIC_KEY || '',
    sdk: c.urls().sdk,
    preco: c.PRECO_CHEIO,
    precoMetade: c.PRECO_METADE
  });
};
