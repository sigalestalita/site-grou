const crypto = require('crypto');
const c = require('./_comum');
const db = require('./_db');
const correio = require('./_email');

const limpa = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 120);

/* Inscrições que não passam pelo checkout embutido:
   - convidado com cupom de 100%: só registra a vaga;
   - tipo "link": quem vai pagar pelo link da DOM (R$ 249 ou R$ 124,50 com cupom de 50%). Fica "aguardando pagamento"
     até a DOM devolver a pessoa para /obrigado/, que avisa aqui com acao "pago". */
module.exports = async (req, res) => {
  if (req.method !== 'POST') return c.responde(res, 405, { erro: 'Método não permitido.' });
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Registro indisponível.' });
  if (!c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });

  const b = c.corpoJson(req);
  if (b.acao === 'pago') {
    const pedido = String(b.pedido || '');
    if (!/^l:[0-9a-f-]{36}$/i.test(pedido)) return c.responde(res, 400, { erro: 'Pedido inválido.' });
    try { await db.confirmaLink(pedido); return c.responde(res, 200, { ok: true }); }
    catch (e) { console.error('confirma link:', e.message); return c.responde(res, 502, { erro: 'Não foi possível atualizar agora.' }); }
  }
  const link = b.tipo === 'link';
  const cupom = c.normaliza(b.cupom);
  const preco = link ? c.precoDoCupom(cupom) : null;
  if (link ? !preco.ok : !c.CUPONS_100.includes(cupom)) return c.responde(res, 400, { erro: 'Cupom inválido.', campo: 'cupom' });
  const nome = limpa(b.nome, 100), email = limpa(b.email, 120).toLowerCase();
  let celular = String(b.celular || '').replace(/\D/g, '');
  /* aceita o telefone com o código do país (+55), que o preenchimento automático do celular costuma trazer */
  if ((celular.length === 12 || celular.length === 13) && celular.startsWith('55')) celular = celular.slice(2);
  const empresa = limpa(b.empresa, 80), cargo = limpa(b.cargo, 80);
  if (nome.length < 3) return c.responde(res, 400, { erro: 'Informe o nome.', campo: 'nome' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.responde(res, 400, { erro: 'E-mail inválido.', campo: 'email' });
  if (celular.length < 10 || celular.length > 11) return c.responde(res, 400, { erro: 'Celular inválido.', campo: 'celular' });
  if (!empresa || !cargo) return c.responde(res, 400, { erro: 'Informe empresa e cargo.' });

  const u = b.utm || {};
  const utm = { utm_source: limpa(u.utm_source, 60) || null, utm_medium: limpa(u.utm_medium, 60) || null, utm_campaign: limpa(u.utm_campaign, 80) || null };
  if (link) {
    const pedido = 'l:' + crypto.randomUUID();
    try {
      await db.grava(Object.assign({
        chave: pedido, evento: 'nr1-estrategica', tipo: 'pagante', cupom: preco.cupom || null, desconto: preco.cupom ? 50 : 0,
        nome, email, celular, empresa, cargo, aceite: true, status: 'pendente', valor: preco.total
      }, utm), false);
      return c.responde(res, 200, { ok: true, pedido });
    } catch (e) {
      console.error('pedido link:', e.message);
      return c.responde(res, 502, { erro: 'Não foi possível registrar agora.' });
    }
  }
  const chaveConvite = 'c:nr1-estrategica:' + email + ':' + cupom;
  try {
    await db.grava({
      chave: chaveConvite, evento: 'nr1-estrategica', tipo: 'convidado',
      cupom, desconto: 100, nome, email, celular, empresa, cargo, aceite: true, status: 'confirmado', valor: 0,
      utm_source: limpa(u.utm_source, 60) || null, utm_medium: limpa(u.utm_medium, 60) || null, utm_campaign: limpa(u.utm_campaign, 80) || null
    }, true);
  } catch (e) {
    console.error('inscricao:', e.message);
    return c.responde(res, 502, { erro: 'Não foi possível registrar agora.' });
  }
  /* e-mail de confirmação: só uma vez por inscrição; uma falha aqui não desfaz a vaga */
  if (correio.ativo()) {
    try {
      const linha = await db.porChave(chaveConvite);
      if (linha && !linha.email_confirmacao_em) {
        await correio.enviaConfirmacao(linha);
        await db.marcaEmail([linha.id]);
      }
    } catch (e) { console.error('email confirmacao:', e.message); }
  }
  c.responde(res, 200, { ok: true });
};
