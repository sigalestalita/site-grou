/* Login do painel interno: senha pessoal (guardada só em hash scrypt) + cookie de sessão assinado.
   A chave da assinatura é derivada de SUPABASE_SERVICE_KEY, então não precisa de variável nova. */
const crypto = require('crypto');
const db = require('./_db');

const COOKIE = 'gestao_sessao';
const HORAS = 12;
const SCRYPT = { N: 16384, r: 8, p: 1 };

const segredo = () => crypto.createHash('sha256').update('nr1-gestao-sessao:' + db.chave()).digest();

function hashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(senha), sal, 32, SCRYPT);
  return 's1$' + sal.toString('base64') + '$' + h.toString('base64');
}
function confereSenha(senha, guardado) {
  try {
    const [v, sal, h] = String(guardado || '').split('$');
    if (v !== 's1') return false;
    const esperado = Buffer.from(h, 'base64');
    const obtido = crypto.scryptSync(String(senha), Buffer.from(sal, 'base64'), esperado.length, SCRYPT);
    return crypto.timingSafeEqual(esperado, obtido);
  } catch (e) { return false; }
}
/* para e-mail desconhecido gastamos o mesmo tempo, assim ninguém descobre quem tem acesso */
const FALSO = hashSenha(crypto.randomBytes(12).toString('hex'));

function criaToken(email) {
  const corpo = Buffer.from(JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + HORAS * 3600 })).toString('base64url');
  return corpo + '.' + crypto.createHmac('sha256', segredo()).update(corpo).digest('base64url');
}
function leToken(tok) {
  try {
    const [corpo, sig] = String(tok || '').split('.');
    const esperado = crypto.createHmac('sha256', segredo()).update(corpo).digest();
    const obtido = Buffer.from(sig, 'base64url');
    if (esperado.length !== obtido.length || !crypto.timingSafeEqual(esperado, obtido)) return null;
    const d = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    return d.x * 1000 > Date.now() ? d.e : null;
  } catch (e) { return null; }
}
function cookieDe(req) {
  const m = String(req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}
function gravaCookie(res, token, segundos) {
  res.setHeader('Set-Cookie', COOKIE + '=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + segundos);
}
const entrou = (res, email) => gravaCookie(res, criaToken(email), HORAS * 3600);
const saiu = (res) => gravaCookie(res, '', 0);

/* quem está logado (e ainda tem acesso ativo), ou null */
async function usuario(req) {
  if (!db.ativo()) return null;
  const email = leToken(cookieDe(req));
  if (!email) return null;
  try {
    const linha = await db.acesso(email);
    return linha && linha.ativo ? linha : null;
  } catch (e) { return null; }
}

module.exports = { hashSenha, confereSenha, FALSO, entrou, saiu, usuario };
