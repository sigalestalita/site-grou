const c = require('./_comum');
const db = require('./_db');

const limpa = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 120);

/* Lead de página de captação (ex.: /demo-pda/, aberta pelo QR code de um evento).
   Grava os dados e a página segue para a demo; "origem" diz de onde a pessoa veio. */
module.exports = async (req, res) => {
  if (req.method !== 'POST') return c.responde(res, 405, { erro: 'Método não permitido.' });
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Registro indisponível.' });
  if (!c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });

  const b = c.corpoJson(req);
  const nome = limpa(b.nome, 100), email = limpa(b.email, 120).toLowerCase(), empresa = limpa(b.empresa, 80);
  let celular = String(b.celular || '').replace(/\D/g, '');
  if ((celular.length === 12 || celular.length === 13) && celular.startsWith('55')) celular = celular.slice(2);
  if (nome.split(/\s+/).length < 2) return c.responde(res, 400, { erro: 'Informe nome e sobrenome.', campo: 'nome' });
  if (celular.length < 10 || celular.length > 11) return c.responde(res, 400, { erro: 'Celular inválido. Use DDD + número.', campo: 'celular' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.responde(res, 400, { erro: 'E-mail inválido.', campo: 'email' });
  if (!empresa) return c.responde(res, 400, { erro: 'Informe a empresa.', campo: 'empresa' });

  const origem = /^[a-z0-9-]{2,40}$/.test(String(b.origem || '')) ? b.origem : 'site';
  const interesse = /^[a-z0-9-]{2,40}$/.test(String(b.interesse || '')) ? b.interesse : 'demo-pda';
  const u = b.utm || {};
  try {
    await db.gravaLead({
      origem, interesse, nome, email, celular, empresa, aceite: true,
      utm_source: limpa(u.utm_source, 60) || null, utm_medium: limpa(u.utm_medium, 60) || null, utm_campaign: limpa(u.utm_campaign, 80) || null
    });
    c.responde(res, 200, { ok: true });
  } catch (e) {
    console.error('lead:', e.message);
    c.responde(res, 502, { erro: 'Não foi possível registrar agora.' });
  }
};
