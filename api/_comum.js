/* Utilidades do checkout do NR-1 Estratégica (DOM Pagamentos).
   Variáveis de ambiente (Vercel → Settings → Environment Variables):
     DOM_API_KEY      chave privada da DOM (nunca vai para o navegador)
     DOM_PUBLIC_KEY   chave pública do checkout (pk_...), usada pelo SDK de cartão
     DOM_AMBIENTE     "sandbox" (testes) ou "production"
   Sem DOM_API_KEY o checkout fica desligado e a página usa o botão de link. */

/* variáveis coladas na Vercel às vezes levam espaço, quebra de linha ou aspas: limpa antes de usar */
const env = (nome) => String(process.env[nome] || '').trim().replace(/^["']+|["']+$/g, '').trim();

const PRECO_CHEIO = 249;
const PRECO_METADE = 124.5;

/* Mesmos cupons da página (evento/nr1-estrategica). Quem decide o preço é este arquivo, nunca o navegador. */
const NOMES = ['MAICON', 'TAIS', 'CAROL', 'MARIANA', 'BRUNA', 'FERNANDA', 'GROU', 'LUMI', 'PARCEIRO', 'MENTOR'];
const CUPONS_100 = NOMES.map((n) => n + 'CONVITE');
const CUPONS_50 = NOMES.map((n) => n + 'CONVITE50');

const normaliza = (v) => String(v || '').toUpperCase().replace(/[\s\-‐-―]+/g, '');

function precoDoCupom(cupom) {
  const c = normaliza(cupom);
  if (!c) return { ok: true, total: PRECO_CHEIO, cupom: '' };
  if (CUPONS_50.includes(c)) return { ok: true, total: PRECO_METADE, cupom: c };
  if (CUPONS_100.includes(c)) return { ok: false, motivo: 'Este cupom libera o ingresso sem pagamento.' };
  return { ok: false, motivo: 'Cupom inválido.' };
}

function ambiente() {
  return env('DOM_AMBIENTE').toLowerCase() === 'production' ? 'production' : 'sandbox';
}
function urls() {
  return ambiente() === 'production'
    ? { api: 'https://apiv3.dompagamentos.com.br/checkout/production', sdk: 'https://apiv3.dompagamentos.com.br/js/sdk-dompagamentos.min.js' }
    : { api: 'https://hml-apiv3.dompagamentos.com.br/checkout/sandbox', sdk: 'https://hml-apiv3.dompagamentos.com.br/js/sdk-dompagamentos.min.js' };
}
const ativo = () => !!env('DOM_API_KEY');

async function dom(caminho, opcoes) {
  const o = opcoes || {};
  const r = await fetch(urls().api + caminho, {
    method: o.metodo || 'GET',
    headers: Object.assign({
      Authorization: 'Bearer ' + env('DOM_API_KEY'),
      'Content-Type': 'application/json'
    }, o.cabecalhos || {}),
    body: o.corpo ? JSON.stringify(o.corpo) : undefined
  });
  let json = null;
  try { json = await r.json(); } catch (e) { /* resposta sem JSON */ }
  return { http: r.status, json };
}

function cpfValido(v) {
  const s = String(v || '').replace(/\D/g, '');
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(s[i]) * (t + 1 - i);
    const d = ((soma * 10) % 11) % 10;
    if (d !== Number(s[t])) return false;
  }
  return true;
}

/* Só aceita chamadas vindas do próprio site (e das prévias da Vercel). */
function origemPermitida(req) {
  const o = req.headers.origin || '';
  if (!o) return true;
  try {
    const h = new URL(o).hostname;
    return /(^|\.)grougp\.com(\.br)?$/.test(h) || /(^|\.)vercel\.app$/.test(h) || h === 'localhost' || h === '127.0.0.1';
  } catch (e) { return false; }
}

function corpoJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

function responde(res, codigo, obj) {
  res.statusCode = codigo;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

/* Estados da DOM: pending (aguardando), approved/paid (pago), o resto é falha. */
function situacao(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved' || s === 'paid') return 'pago';
  if (s === 'pending' || s === 'processing' || s === 'in_process' || s === 'authorized') return 'aguardando';
  return 'recusado';
}

module.exports = { env, CUPONS_100, CUPONS_50, PRECO_CHEIO, PRECO_METADE, precoDoCupom, normaliza, ambiente, urls, ativo, dom, cpfValido, origemPermitida, corpoJson, responde, situacao };
