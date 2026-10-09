const c = require('./_comum');
const db = require('./_db');

/* Consulta a situação de um pedido (usado pelo Pix e pelo boleto enquanto a pessoa paga). */
module.exports = async (req, res) => {
  if (!c.ativo()) return c.responde(res, 503, { erro: 'Checkout desligado.' });
  if (!c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });
  const id = String((req.query && req.query.id) || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return c.responde(res, 400, { erro: 'Pedido inválido.' });
  try {
    const r = await c.dom('/transactions/' + id);
    if (!r.json || !r.json.status || r.json.status === 'error') return c.responde(res, 404, { erro: 'Pedido não encontrado.' });
    if (db.ativo()) { try { await db.sincroniza(id, r.json.status); } catch (e) { console.error('sincroniza ' + id + ':', e.message); } }
    c.responde(res, 200, { id, situacao: c.situacao(r.json.status), status: r.json.status });
  } catch (e) {
    c.responde(res, 502, { erro: 'Não foi possível consultar agora.' });
  }
};
