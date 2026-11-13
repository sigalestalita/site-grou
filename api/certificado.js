const crypto = require('crypto');
const c = require('./_comum');
const db = require('./_db');

/* Certificado de participação do NR-1 Estratégica (/evento/nr1-estrategica/certificado/).
   POST {email}: procura a inscrição confirmada (convidado) ou paga (pagante) com esse e-mail
   e devolve só o nome e o código do certificado.
   GET ?codigo=NR1-XXXX-XXXX: confere um código impresso no certificado e devolve o nome. */
const EVENTO = 'nr1-estrategica';
const SAL = 'nr1-estrategica-certificado-2026';
const VALIDAS = 'status=in.(confirmado,pago)';

const codigo = (id) => {
  const h = crypto.createHash('sha256').update(SAL + ':' + id).digest('hex').slice(0, 8).toUpperCase();
  return 'NR1-' + h.slice(0, 4) + '-' + h.slice(4);
};

/* "ANA DE SOUZA" ou "ana de souza" → "Ana de Souza" */
const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'van', 'von']);
const formataNome = (nome) => String(nome || '').trim().replace(/\s+/g, ' ').toLowerCase().split(' ')
  .map((p, i) => (i > 0 && MINUSCULAS.has(p)) ? p : p.split('-').map((q) => q.charAt(0).toUpperCase() + q.slice(1)).join('-'))
  .join(' ');

module.exports = async (req, res) => {
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Certificados indisponíveis agora. Tente de novo em instantes.' });

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, 'https://www.grougp.com');
      const cod = String(url.searchParams.get('codigo') || '').trim().toUpperCase();
      if (!/^NR1-[0-9A-F]{4}-[0-9A-F]{4}$/.test(cod)) return c.responde(res, 400, { erro: 'Código inválido.' });
      const linhas = (await db.rest('inscricoes?select=id,nome&evento=eq.' + EVENTO + '&' + VALIDAS + '&limit=5000')) || [];
      const achou = linhas.find((l) => codigo(l.id) === cod);
      if (!achou) return c.responde(res, 404, { erro: 'Não encontramos um certificado com esse código.' });
      return c.responde(res, 200, { ok: true, nome: formataNome(achou.nome), codigo: cod });
    }

    if (req.method !== 'POST') return c.responde(res, 405, { erro: 'Método não permitido.' });
    if (!c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });
    const b = c.corpoJson(req);
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^@\s,()*]+@[^@\s,()*]+\.[^@\s,()*]+$/.test(email) || email.length > 120) {
      return c.responde(res, 400, { erro: 'Confira o e-mail digitado.', campo: 'email' });
    }
    const linhas = (await db.rest('inscricoes?select=id,nome,email,criado_em&evento=eq.' + EVENTO + '&' + VALIDAS
      + '&email=ilike.' + encodeURIComponent(email) + '&order=criado_em.asc&limit=10')) || [];
    const i = linhas.find((l) => String(l.email || '').trim().toLowerCase() === email);
    if (!i) {
      return c.responde(res, 404, { erro: 'Não encontramos uma inscrição confirmada com esse e-mail. Use o mesmo e-mail da inscrição.', campo: 'email' });
    }
    c.responde(res, 200, { ok: true, nome: formataNome(i.nome), codigo: codigo(i.id) });
  } catch (e) {
    console.error('certificado:', e.message);
    c.responde(res, 502, { erro: 'Não foi possível gerar agora. Tente de novo em instantes.' });
  }
};
