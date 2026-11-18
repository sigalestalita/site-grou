/* Login do painel da DU99: senha pessoal (só o hash scrypt fica no banco) e cookie de sessão assinado.
   A chave da assinatura é derivada de SUPABASE_SERVICE_KEY com um rótulo próprio, diferente da sessão da Grou. */
const crypto = require('crypto');
const { db, enc } = require('./base');

const COOKIE = 'du99_sessao';
const HORAS = 12;
const SCRYPT = { N: 16384, r: 8, p: 1 };
const segredo = () => crypto.createHash('sha256').update('du99-painel-sessao:' + db.chave()).digest();

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
/* para e-mail desconhecido gasta o mesmo tempo, assim ninguém descobre quem tem acesso */
const FALSO = hashSenha(crypto.randomBytes(12).toString('hex'));

function criaToken(id) {
  const corpo = Buffer.from(JSON.stringify({ u: id, x: Math.floor(Date.now() / 1000) + HORAS * 3600 })).toString('base64url');
  return corpo + '.' + crypto.createHmac('sha256', segredo()).update(corpo).digest('base64url');
}
function leToken(tok) {
  try {
    const [corpo, sig] = String(tok || '').split('.');
    const esperado = crypto.createHmac('sha256', segredo()).update(corpo).digest();
    const obtido = Buffer.from(sig, 'base64url');
    if (esperado.length !== obtido.length || !crypto.timingSafeEqual(esperado, obtido)) return null;
    const d = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    return d.x * 1000 > Date.now() ? d.u : null;
  } catch (e) { return null; }
}
function cookieDe(req) {
  const m = String(req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}
function gravaCookie(res, token, segundos) {
  res.setHeader('Set-Cookie', COOKIE + '=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + segundos);
}
const entrou = (res, id) => gravaCookie(res, criaToken(id), HORAS * 3600);
const saiu = (res) => gravaCookie(res, '', 0);

/* quem está logado (com acesso ativo e senha definida), ou null */
async function usuario(req) {
  const id = leToken(cookieDe(req));
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const l = (await db.rest('du99_admins?select=id,email,nome,ativo,senha_hash&id=eq.' + enc(id) + '&limit=1')) || [];
    const u = l[0];
    return u && u.ativo && u.senha_hash ? { id: u.id, email: u.email, nome: u.nome } : null;
  } catch (e) { return null; }
}

/* convites (primeiro acesso e troca de senha): o link leva um token aleatório; no banco fica só o hash */
const hashConvite = (t) => crypto.createHash('sha256').update('du99-convite:' + String(t)).digest('hex');
const novoConvite = () => {
  const token = crypto.randomBytes(24).toString('base64url');
  return { token, hash: hashConvite(token), expira: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() };
};

module.exports = { hashSenha, confereSenha, FALSO, entrou, saiu, usuario, hashConvite, novoConvite };
