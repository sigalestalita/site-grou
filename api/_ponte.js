/* Ponte de login para o painel do blog da Lumi (applumi.io/blog/admin/).
   Quem está logado no painel /gestao da Grou recebe um passe curto, assinado com Ed25519.
   A Lumi confere a assinatura com a chave pública publicada em /api/acesso/?chave=ponte; a chave privada nunca sai daqui
   e é derivada da SUPABASE_SERVICE_KEY, então não precisa de variável nova. */
const crypto = require('crypto');
const db = require('./_db');

const PREFIXO_PKCS8 = Buffer.from('302e020100300506032b657004220420', 'hex');
let cache = null;
function chaves() {
  if (cache && cache.base === db.chave()) return cache;
  const semente = crypto.createHash('sha256').update('blog-ponte-ed25519:' + db.chave()).digest();
  const privada = crypto.createPrivateKey({ key: Buffer.concat([PREFIXO_PKCS8, semente]), format: 'der', type: 'pkcs8' });
  const publica = crypto.createPublicKey(privada).export({ type: 'spki', format: 'der' }).toString('base64');
  cache = { base: db.chave(), privada, publica };
  return cache;
}

const publica = () => chaves().publica;
function assina(dados) {
  const corpo = Buffer.from(JSON.stringify({ ...dados, x: Math.floor(Date.now() / 1000) + 120 })).toString('base64url');
  return corpo + '.' + crypto.sign(null, Buffer.from(corpo), chaves().privada).toString('base64url');
}

module.exports = { publica, assina };
