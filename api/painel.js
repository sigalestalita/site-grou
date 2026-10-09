const fs = require('fs');
const path = require('path');
const db = require('./_db');
const sessao = require('./_sessao');

/* Entrega a página do painel só para quem está logado e liberado; os demais vão para a página de acesso. */
module.exports = async (req, res) => {
  const u = await sessao.usuario(req);
  if (!u) {
    res.statusCode = 302;
    res.setHeader('Location', '/gestao/');
    res.setHeader('Cache-Control', 'no-store');
    return res.end();
  }
  const html = fs.readFileSync(path.join(__dirname, '_painel.html'), 'utf8').replace('__USUARIO__', JSON.stringify({ email: u.email, nome: u.nome || '' }).replace(/</g, '\\u003c'));
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('X-Frame-Options', 'DENY');
  res.end(html);
};
