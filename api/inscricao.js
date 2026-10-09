const c = require('./_comum');
const db = require('./_db');

const limpa = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 120);

/* Inscrição de convidado com cupom de 100%: não passa pela DOM, só registra a vaga. */
module.exports = async (req, res) => {
  if (req.method !== 'POST') return c.responde(res, 405, { erro: 'Método não permitido.' });
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Registro indisponível.' });
  if (!c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });

  const b = c.corpoJson(req);
  const cupom = c.normaliza(b.cupom);
  if (!c.CUPONS_100.includes(cupom)) return c.responde(res, 400, { erro: 'Cupom inválido.', campo: 'cupom' });
  const nome = limpa(b.nome, 100), email = limpa(b.email, 120).toLowerCase(), celular = String(b.celular || '').replace(/\D/g, '');
  const empresa = limpa(b.empresa, 80), cargo = limpa(b.cargo, 80);
  if (nome.length < 3) return c.responde(res, 400, { erro: 'Informe o nome.', campo: 'nome' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.responde(res, 400, { erro: 'E-mail inválido.', campo: 'email' });
  if (celular.length < 10 || celular.length > 11) return c.responde(res, 400, { erro: 'Celular inválido.', campo: 'celular' });
  if (!empresa || !cargo) return c.responde(res, 400, { erro: 'Informe empresa e cargo.' });

  const u = b.utm || {};
  try {
    await db.grava({
      chave: 'c:nr1-estrategica:' + email + ':' + cupom, evento: 'nr1-estrategica', tipo: 'convidado',
      cupom, desconto: 100, nome, email, celular, empresa, cargo, aceite: true, status: 'confirmado', valor: 0,
      utm_source: limpa(u.utm_source, 60) || null, utm_medium: limpa(u.utm_medium, 60) || null, utm_campaign: limpa(u.utm_campaign, 80) || null
    }, true);
    c.responde(res, 200, { ok: true });
  } catch (e) {
    console.error('inscricao:', e.message);
    c.responde(res, 502, { erro: 'Não foi possível registrar agora.' });
  }
};
