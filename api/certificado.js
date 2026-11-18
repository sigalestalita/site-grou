const crypto = require('crypto');
const c = require('./_comum');
const db = require('./_db');

/* Certificado de participação do NR-1 Estratégica (/evento/nr1-estrategica/certificado/).
   POST {email, nps}: procura a inscrição confirmada (convidado) ou paga (pagante) com esse e-mail,
   grava a nota do evento (nps, 0 a 10; vale a última) e devolve só o nome e o código do certificado.
   GET ?codigo=NR1-XXXX-XXXX: confere um código impresso no certificado e devolve o nome.
   POST {acao:'imagem', email, codigo, imagem}: guarda a imagem do certificado (JPEG) para a prévia do LinkedIn.
   GET ?pagina=NR1-XXXX-XXXX (rota /evento/nr1-estrategica/certificado/c/NR1-XXXX-XXXX/): página de
   compartilhamento, com og:image = imagem do certificado da pessoa; quem abre vai para a verificação. */
const EVENTO = 'nr1-estrategica';
const SAL = 'nr1-estrategica-certificado-2026';
const VALIDAS = 'status=in.(confirmado,pago)';

const SUPA = process.env.SUPABASE_URL || 'https://eycvxhstugodnjmblsdl.supabase.co';
const BUCKET = 'certificados';
const SITE = 'https://www.grougp.com';
const CERT = SITE + '/evento/nr1-estrategica/certificado/';
const imagemUrl = (cod) => SUPA + '/storage/v1/object/public/' + BUCKET + '/' + cod + '.jpg';
const chaveDb = () => String(process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/^["']+|["']+$/g, '').trim();
const esc = (v) => String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const codigo = (id) => {
  const h = crypto.createHash('sha256').update(SAL + ':' + id).digest('hex').slice(0, 8).toUpperCase();
  return 'NR1-' + h.slice(0, 4) + '-' + h.slice(4);
};

/* "ANA DE SOUZA" ou "ana de souza" → "Ana de Souza" */
const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'van', 'von']);
const formataNome = (nome) => String(nome || '').trim().replace(/\s+/g, ' ').toLowerCase().split(' ')
  .map((p, i) => (i > 0 && MINUSCULAS.has(p)) ? p : p.split('-').map((q) => q.charAt(0).toUpperCase() + q.slice(1)).join('-'))
  .join(' ');

async function inscricaoPorEmail(email) {
  const linhas = (await db.rest('inscricoes?select=id,nome,email,criado_em&evento=eq.' + EVENTO + '&' + VALIDAS
    + '&email=ilike.' + encodeURIComponent(email) + '&order=criado_em.asc&limit=10')) || [];
  return linhas.find((l) => String(l.email || '').trim().toLowerCase() === email);
}

/* a imagem só é aceita de quem tem o e-mail da inscrição, e para o código dessa inscrição */
async function guardaImagem(res, email, b) {
  const cod = String(b.codigo || '').trim().toUpperCase();
  const m = String(b.imagem || '').match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!/^NR1-[0-9A-F]{4}-[0-9A-F]{4}$/.test(cod) || !m) return c.responde(res, 400, { erro: 'Imagem inválida.' });
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length < 2000 || buf.length > 1900000 || buf[0] !== 0xff || buf[1] !== 0xd8) return c.responde(res, 400, { erro: 'Imagem inválida.' });
  const i = await inscricaoPorEmail(email);
  if (!i || codigo(i.id) !== cod) return c.responde(res, 403, { erro: 'Certificado não confere.' });
  const k = chaveDb();
  const r = await fetch(SUPA + '/storage/v1/object/' + BUCKET + '/' + cod + '.jpg', {
    method: 'POST',
    headers: Object.assign({ apikey: k, 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'Cache-Control': 'max-age=300' }, k.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + k }),
    body: buf
  });
  if (!r.ok) { console.error('certificado imagem:', r.status, (await r.text()).slice(0, 160)); return c.responde(res, 502, { erro: 'Não foi possível guardar a imagem.' }); }
  return c.responde(res, 200, { ok: true, pagina: CERT + 'c/' + cod + '/' });
}

/* página que o LinkedIn lê para montar a prévia do post */
async function pagina(req, res) {
  const url = new URL(req.url, SITE);
  const cod = String(url.searchParams.get('pagina') || '').trim().toUpperCase();
  const destino = CERT + (/^NR1-[0-9A-F]{4}-[0-9A-F]{4}$/.test(cod) ? '?codigo=' + cod : '');
  let nome = '', img = SITE + '/assets/evento/nr1-estrategica/og.jpg', w = 1200, h = 630;
  if (destino !== CERT) {
    const linhas = (await db.rest('inscricoes?select=id,nome&evento=eq.' + EVENTO + '&' + VALIDAS + '&limit=5000')) || [];
    const achou = linhas.find((l) => codigo(l.id) === cod);
    if (achou) {
      nome = formataNome(achou.nome);
      try { const hd = await fetch(imagemUrl(cod), { method: 'HEAD' }); if (hd.ok) { img = imagemUrl(cod); w = 1200; h = 627; } } catch (e) { /* fica a imagem do evento */ }
    }
  }
  const titulo = nome ? nome + ' participou do NR-1 Estratégica' : 'Certificado de participação · NR-1 Estratégica';
  const desc = 'Certificado de participação no NR-1 Estratégica: transformando risco em performance. Grou · 12/11/2026 · Instituto Caldeira, Porto Alegre (RS) · 5 horas.';
  const proprio = CERT + 'c/' + cod + '/';
  const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(titulo) + '</title><meta name="description" content="' + esc(desc) + '"><meta name="robots" content="noindex">'
    + '<meta property="og:type" content="website"><meta property="og:site_name" content="Grou">'
    + '<meta property="og:url" content="' + esc(proprio) + '"><meta property="og:title" content="' + esc(titulo) + '">'
    + '<meta property="og:description" content="' + esc(desc) + '"><meta property="og:image" content="' + esc(img) + '">'
    + '<meta property="og:image:width" content="' + w + '"><meta property="og:image:height" content="' + h + '"><meta property="og:image:alt" content="' + esc('Certificado de participação' + (nome ? ' de ' + nome : '') + ' no NR-1 Estratégica') + '">'
    + '<meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="' + esc(proprio) + '">'
    + '<script>location.replace(' + JSON.stringify(destino) + ')</script></head>'
    + '<body style="font-family:system-ui,sans-serif;padding:40px"><p><a href="' + esc(destino) + '">Ver o certificado</a></p></body></html>';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
  res.end(html);
}

module.exports = async (req, res) => {
  /* gerador de certificados da DU99 (rotas /du99/api/*), que usa esta mesma função */
  if (/[?&]du99=/.test(req.url || '')) return require('./_du99')(req, res);
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Certificados indisponíveis agora. Tente de novo em instantes.' });

  try {
    if (req.method === 'GET' && /[?&]pagina=/.test(req.url || '')) return pagina(req, res);
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
    if (b.acao === 'imagem') return guardaImagem(res, email, b);
    const nps = Number(b.nps);
    if (b.nps === undefined || b.nps === null || b.nps === '' || !Number.isInteger(nps) || nps < 0 || nps > 10) {
      return c.responde(res, 400, { erro: 'Escolha uma nota de 0 a 10 para o evento.', campo: 'nps' });
    }
    const i = await inscricaoPorEmail(email);
    if (!i) {
      return c.responde(res, 404, { erro: 'Não encontramos uma inscrição confirmada com esse e-mail. Use o mesmo e-mail da inscrição.', campo: 'email' });
    }
    try {
      await db.rest('inscricoes?id=eq.' + encodeURIComponent(i.id), {
        metodo: 'PATCH', corpo: { nps, nps_em: new Date().toISOString() }, cabecalhos: { Prefer: 'return=minimal' }
      });
    } catch (e) { console.error('certificado nps:', e.message); /* a nota não pode travar o certificado */ }
    c.responde(res, 200, { ok: true, nome: formataNome(i.nome), codigo: codigo(i.id) });
  } catch (e) {
    console.error('certificado:', e.message);
    c.responde(res, 502, { erro: 'Não foi possível gerar agora. Tente de novo em instantes.' });
  }
};
