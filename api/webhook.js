const crypto = require('crypto');
const c = require('./_comum');
const db = require('./_db');

const b64 = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/* Confere o JWT (HS256) que a DOM manda em "signature", assinado com a chave privada. */
function assinaturaValida(jwt, idEsperado) {
  const p = String(jwt || '').split('.');
  if (p.length !== 3 || !process.env.DOM_API_KEY) return false;
  try {
    const cab = JSON.parse(b64(p[0]).toString());
    if (cab.alg !== 'HS256') return false;
    const esperado = crypto.createHmac('sha256', process.env.DOM_API_KEY).update(p[0] + '.' + p[1]).digest();
    const recebido = b64(p[2]);
    if (esperado.length !== recebido.length || !crypto.timingSafeEqual(esperado, recebido)) return false;
    const corpo = JSON.parse(b64(p[1]).toString());
    if (corpo.exp && corpo.exp * 1000 < Date.now()) return false;
    return !idEsperado || corpo.id === idEsperado;
  } catch (e) { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return c.responde(res, 405, { erro: 'Método não permitido.' });
  const b = c.corpoJson(req);
  const id = b.data && b.data.id;
  if (!assinaturaValida(b.signature, id)) return c.responde(res, 401, { erro: 'Assinatura inválida.' });
  /* Evento autêntico. Fica registrado nos logs da Vercel; é aqui que entram e-mail de confirmação / RD Station. */
  console.log(JSON.stringify({
    evento: b.event, id, cod_external: b.data.cod_external, status: b.data.status,
    metodo: b.data.payment_method, valor: b.data.amount
  }));
  /* confirma o estado direto na DOM e atualiza o painel de inscritos; erro aqui devolve 500 para a DOM tentar de novo */
  if (db.ativo() && id) {
    try {
      const r = await c.dom('/transactions/' + encodeURIComponent(id));
      if (r.json && r.json.status && r.json.status !== 'error') await db.sincroniza(id, r.json.status);
    } catch (e) {
      console.error('webhook ' + id + ':', e.message);
      return c.responde(res, 500, { erro: 'Falha ao atualizar.' });
    }
  }
  c.responde(res, 200, { ok: true });
};
