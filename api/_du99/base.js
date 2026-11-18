/* Gerador de certificados da DU99: utilidades comuns.
   Mora dentro do site da Grou (mesma Vercel e mesmo Supabase grou-eventos), mas com tabelas e bucket
   próprios (du99_*, bucket "du99"). Toda a API passa por /api/certificado?du99=<rota> (ver index.js). */
const crypto = require('crypto');
const db = require('../_db');

const SITE = 'https://www.grougp.com';
const BASE = SITE + '/du99';
const SUPA = process.env.SUPABASE_URL || 'https://eycvxhstugodnjmblsdl.supabase.co';
const BUCKET = 'du99';

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const enc = encodeURIComponent;
const uuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
const emailOk = (e) => /^[^@\s,()*;]+@[^@\s,()*;]+\.[^@\s,()*;]+$/.test(e) && e.length <= 160;
const texto = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const cor = (v, padrao) => /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : padrao;
const RE_CODIGO = /^[A-Z0-9]{1,8}-[0-9A-F]{4}-[0-9A-F]{4}$/;

/* "ANA DE SOUZA" ou "ana de souza" → "Ana de Souza" */
const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'van', 'von']);
const formataNome = (nome) => String(nome || '').trim().replace(/\s+/g, ' ').toLowerCase().split(' ')
  .map((p, i) => (i > 0 && MINUSCULAS.has(p)) ? p : p.split('-').map((q) => q.charAt(0).toUpperCase() + q.slice(1)).join('-'))
  .join(' ');

const prefixo = (cfg) => String((cfg && cfg.prefixo_codigo) || 'DU99').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'DU99';
const novoCodigo = (cfg) => { const h = crypto.randomBytes(4).toString('hex').toUpperCase(); return prefixo(cfg) + '-' + h.slice(0, 4) + '-' + h.slice(4); };

/* imagens aceitas: só o que o próprio sistema guarda (bucket du99), os arquivos padrão em /du99/assets/ e https comum */
const urlImagem = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^\/du99\/assets\/[a-z0-9._-]+$/i.test(s)) return s;
  if (/^https:\/\/[^\s"'<>]{4,600}$/.test(s)) return s;
  return '';
};

async function config() {
  const l = (await db.rest('du99_config?id=eq.1&limit=1')) || [];
  return (l[0] && l[0].dados) || {};
}

const chaveDb = () => db.chave();
async function guardaArquivo(caminho, buf, tipo) {
  const k = chaveDb();
  const r = await fetch(SUPA + '/storage/v1/object/' + BUCKET + '/' + caminho, {
    method: 'POST',
    headers: Object.assign({ apikey: k, 'Content-Type': tipo, 'x-upsert': 'true', 'Cache-Control': 'max-age=300' }, k.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + k }),
    body: buf
  });
  if (!r.ok) throw new Error('storage ' + r.status + ' ' + (await r.text()).slice(0, 160));
  return SUPA + '/storage/v1/object/public/' + BUCKET + '/' + caminho;
}
const urlPublica = (caminho) => SUPA + '/storage/v1/object/public/' + BUCKET + '/' + caminho;

/* imagem em data URL → Buffer validado (assinatura do arquivo confere com o tipo) */
function imagemDe(dataUrl, maxBytes) {
  const m = String(dataUrl || '').match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length < 200 || buf.length > (maxBytes || 2500000)) return null;
  const ok = (m[1] === 'png' && buf[0] === 0x89 && buf[1] === 0x50)
    || (m[1] === 'jpeg' && buf[0] === 0xff && buf[1] === 0xd8)
    || (m[1] === 'webp' && buf.slice(8, 12).toString() === 'WEBP');
  return ok ? { buf, tipo: 'image/' + m[1], ext: m[1] === 'jpeg' ? 'jpg' : m[1] } : null;
}

module.exports = { db, SITE, BASE, SUPA, BUCKET, esc, enc, uuid, emailOk, texto, cor, RE_CODIGO, formataNome, prefixo, novoCodigo, urlImagem, config, guardaArquivo, urlPublica, imagemDe };
