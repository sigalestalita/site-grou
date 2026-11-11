const crypto = require('crypto');
const c = require('./_comum');
const db = require('./_db');

/* Inscrição na porta do evento, feita pela própria pessoa (QR code impresso no credenciamento).
   Entra na mesma lista de inscritos do painel como convidado com o cupom QRPORTA, sem check-in:
   o check-in acontece quando a equipe imprime a etiqueta. Só funciona até o fim do dia do evento. */
const FIM = Date.parse('2026-11-13T03:00:00Z'); /* 12/11, meia-noite em Porto Alegre */
const limpa = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const EMAIL_OK = /^[^@\s(),;"']+@[^@\s(),;"']+\.[^@\s(),;"']+$/;

/* freio simples contra envio em massa (vale por instância da função) */
const tentativas = new Map();
function freia(ip) {
  const agora = Date.now(), lista = (tentativas.get(ip) || []).filter((t) => agora - t < 10 * 60000);
  lista.push(agora); tentativas.set(ip, lista);
  return lista.length > 8;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return c.responde(res, 405, { erro: 'Método não permitido.' });
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Inscrição indisponível no momento. Fale com a equipe do credenciamento.' });
  if (!c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });
  if (Date.now() > FIM) return c.responde(res, 410, { erro: 'As inscrições na porta foram encerradas.' });

  const b = c.corpoJson(req);
  /* campo invisível (robôs preenchem) e formulário enviado rápido demais */
  if (b.site || Number(b.t) < 2500) return c.responde(res, 200, { ok: true });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'sem-ip';
  if (freia(ip)) return c.responde(res, 429, { erro: 'Muitas inscrições seguidas deste aparelho. Fale com a equipe do credenciamento.' });

  const nome = limpa(b.nome, 100), cargo = limpa(b.cargo, 80), empresa = limpa(b.empresa, 80), email = limpa(b.email, 120).toLowerCase();
  let celular = String(b.celular || '').replace(/\D/g, '');
  if ((celular.length === 12 || celular.length === 13) && celular.startsWith('55')) celular = celular.slice(2);
  if (nome.length < 3 || !nome.includes(' ')) return c.responde(res, 400, { erro: 'Informe nome e sobrenome.', campo: 'nome' });
  if (celular.length < 10 || celular.length > 11) return c.responde(res, 400, { erro: 'Informe o WhatsApp com DDD.', campo: 'celular' });
  if (email && !EMAIL_OK.test(email)) return c.responde(res, 400, { erro: 'E-mail inválido. Se preferir, deixe em branco.', campo: 'email' });
  if (b.aceite !== true) return c.responde(res, 400, { erro: 'Para se inscrever, aceite o uso dos dados no evento.', campo: 'aceite' });

  try {
    /* quem já está na lista (pela página ou pela equipe) não ganha inscrição repetida */
    const filtros = ['celular.eq.' + celular].concat(email ? ['email.eq.' + email] : []);
    const ja = (await db.buscaPorContato('nr1-estrategica', filtros)) || [];
    const valida = ja.filter((i) => (i.tipo === 'convidado' && i.status === 'confirmado') || (i.tipo === 'pagante' && i.status === 'pago'))[0];
    if (valida) return c.responde(res, 200, { ok: true, ja: true, nome: valida.nome });

    await db.insereNaHora({
      chave: 'q:nr1-estrategica:' + crypto.randomUUID(), evento: 'nr1-estrategica', tipo: 'convidado', cupom: 'QRPORTA', desconto: 100, valor: 0,
      nome, email, celular, cargo: cargo || null, empresa: empresa || null, aceite: true, status: 'confirmado', presente: false
    });
    console.log('inscrição pelo QR da porta:', nome);
    return c.responde(res, 200, { ok: true });
  } catch (e) {
    console.error('porta:', e.message);
    return c.responde(res, 502, { erro: 'Não foi possível concluir agora. Fale com a equipe do credenciamento.' });
  }
};
