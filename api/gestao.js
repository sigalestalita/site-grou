const c = require('./_comum');
const db = require('./_db');
const sessao = require('./_sessao');
const correio = require('./_email');

/* Dados do painel interno: só para quem está logado e liberado. */
module.exports = async (req, res) => {
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Painel ainda não configurado.' });
  const u = await sessao.usuario(req);
  if (!u) return c.responde(res, 401, { erro: 'Sessão expirada. Entre de novo.' });
  if (req.method === 'POST' && !c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });
  try {
    if (req.method === 'POST') {
      const b = c.corpoJson(req);
      if (b.acao === 'presenca' && /^[0-9a-f-]{36}$/i.test(String(b.id || ''))) {
        await db.marcaPresenca(b.id, b.valor);
        return c.responde(res, 200, { ok: true });
      }
      /* pagamento confirmado à mão (ex.: Pix pago na DOM que não voltou para o site): vira "pago" e recebe o e-mail */
      if (b.acao === 'confirmar_pagamento' && /^[0-9a-f-]{36}$/i.test(String(b.id || ''))) {
        const metodo = ['pix', 'cartao', 'boleto'].includes(b.metodo) ? b.metodo : 'pix';
        const linhas = (await db.confirmaManual(b.id, metodo)) || [];
        if (!linhas.length) return c.responde(res, 409, { erro: 'Essa inscrição não está mais aguardando pagamento. Atualize o painel.' });
        console.log('pagamento confirmado no painel:', b.id, metodo, 'por', u.email);
        let emailEnviado = false;
        if (correio.ativo()) {
          try { await correio.enviaConfirmacao(linhas[0]); await db.marcaEmail([linhas[0].id]); emailEnviado = true; }
          catch (e) { console.error('confirmação manual ' + b.id + ':', e.message); }
        }
        return c.responde(res, 200, { ok: true, emailEnviado });
      }
      if (b.acao === 'enviar_confirmacoes') {
        if (!correio.ativo()) return c.responde(res, 503, { erro: 'Envio de e-mail ainda não configurado (falta RESEND_API_KEY na Vercel).' });
        const pend = (await db.semConfirmacao('nr1-estrategica')) || [];
        if (!pend.length) return c.responde(res, 200, { ok: true, enviados: 0 });
        await correio.enviaLote(pend);
        await db.marcaEmail(pend.map((i) => i.id));
        console.log('confirmacoes enviadas pelo painel:', pend.length, 'por', u.email);
        return c.responde(res, 200, { ok: true, enviados: pend.length });
      }
      return c.responde(res, 400, { erro: 'Ação inválida.' });
    }
    const linhas = await db.lista('nr1-estrategica');
    /* leads das páginas de captação (demo PDA etc.); se falhar, o painel de inscritos continua */
    let leads = [];
    try { leads = (await db.listaLeads()) || []; } catch (e) { console.error('gestao leads:', e.message); }
    c.responde(res, 200, {
      geradoEm: new Date().toISOString(), ambiente: c.ambiente(), emailAtivo: correio.ativo(),
      cupons: { cem: c.CUPONS_100, metade: c.CUPONS_50 }, preco: c.PRECO_CHEIO, precoMetade: c.PRECO_METADE,
      inscritos: linhas, leads
    });
  } catch (e) {
    console.error('gestao:', e.message);
    c.responde(res, 502, { erro: 'Não foi possível ler os inscritos agora.' });
  }
};
