const c = require('./_comum');
const db = require('./_db');
const sessao = require('./_sessao');
const correio = require('./_email');
const guia = require('./_email_guia');
const entregas = require('./_entregas');

const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const confirmada = (i) => (i.tipo === 'convidado' && i.status === 'confirmado') || (i.tipo === 'pagante' && i.status === 'pago');

/* Dados do painel interno: só para quem está logado e liberado. */
module.exports = async (req, res) => {
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Painel ainda não configurado.' });
  const u = await sessao.usuario(req);
  if (!u) return c.responde(res, 401, { erro: 'Sessão expirada. Entre de novo.' });
  if (req.method === 'POST' && !c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });
  try {
    if (req.method === 'POST') {
      const b = c.corpoJson(req);
      /* credenciamento: quem chegou sem inscrição é inscrito na hora (convidado, cupom NAHORA) e já entra presente */
      if (b.acao === 'na_hora') {
        const txt = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
        const nome = txt(b.nome, 120);
        if (nome.length < 2) return c.responde(res, 400, { erro: 'Informe o nome.' });
        const email = txt(b.email, 120).toLowerCase();
        if (email && !EMAIL_OK.test(email)) return c.responde(res, 400, { erro: 'E-mail inválido. Deixe em branco se a pessoa não quiser informar.' });
        const celular = String(b.celular || '').replace(/\D/g, '').slice(0, 13);
        const linha = await db.insereNaHora({
          chave: 'h:nr1-estrategica:' + require('crypto').randomUUID(), evento: 'nr1-estrategica', tipo: 'convidado', cupom: 'NAHORA', desconto: 100, valor: 0,
          nome, email, celular: celular || null, cargo: txt(b.cargo, 120) || null, empresa: txt(b.empresa, 120) || null,
          aceite: true, status: 'confirmado', presente: b.presente !== false
        });
        console.log('inscrição na hora:', linha && linha.id, 'por', u.email);
        return c.responde(res, 200, { ok: true, inscricao: linha });
      }
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
      /* reenvio pelo painel: corrige o e-mail (se veio um novo) e manda confirmação e/ou guia de novo */
      if ((b.acao === 'corrigir_email' || b.acao === 'reenviar') && /^[0-9a-f-]{36}$/i.test(String(b.id || ''))) {
        if (!correio.ativo()) return c.responde(res, 503, { erro: 'Envio de e-mail não configurado.' });
        let i = await db.porId(b.id);
        if (!i || !confirmada(i)) return c.responde(res, 404, { erro: 'Inscrição não encontrada ou não confirmada.' });
        if (b.acao === 'corrigir_email') {
          const novo = String(b.email || '').trim().toLowerCase().slice(0, 120);
          if (!EMAIL_OK.test(novo)) return c.responde(res, 400, { erro: 'E-mail inválido.' });
          i = await db.atualizaEmail(i.id, novo);
          console.log('e-mail corrigido no painel:', b.id, 'por', u.email);
        }
        const quer = Array.isArray(b.enviar) ? b.enviar : ['conf', 'guia'];
        const feito = {};
        if (quer.includes('conf')) {
          try { await correio.enviaConfirmacao(i); await db.marcaEmail([i.id]); feito.conf = true; }
          catch (e) { console.error('reenvio conf ' + i.id + ':', e.message); feito.conf = false; }
        }
        if (quer.includes('guia')) {
          try { await guia.enviaGuia(i); feito.guia = true; }
          catch (e) { console.error('reenvio guia ' + i.id + ':', e.message); feito.guia = false; }
        }
        entregas.esquece();
        return c.responde(res, 200, { ok: true, email: i.email, feito });
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
    /* versão enxuta para a tela de credenciamento e etiquetas */
    if (req.query && req.query.leve) {
      const campos = ['id', 'nome', 'email', 'celular', 'cargo', 'empresa', 'tipo', 'status', 'cupom', 'presente'];
      return c.responde(res, 200, { geradoEm: new Date().toISOString(), usuario: u.nome || u.email,
        inscritos: linhas.map((i) => { const o = {}; campos.forEach((k) => { o[k] = i[k]; }); return o; }) });
    }
    /* leads das páginas de captação (demo PDA etc.); se falhar, o painel de inscritos continua */
    let leads = [];
    try { leads = (await db.listaLeads()) || []; } catch (e) { console.error('gestao leads:', e.message); }
    /* entregas lidas no Resend; se falhar, o painel continua com o resto */
    let ent = null;
    try { ent = await entregas.entregas(req.query && req.query.entregas === 'novo'); } catch (e) { console.error('gestao entregas:', e.message); }
    c.responde(res, 200, {
      entregas: ent,
      geradoEm: new Date().toISOString(), ambiente: c.ambiente(), emailAtivo: correio.ativo(),
      cupons: { cem: c.CUPONS_100, metade: c.CUPONS_50 }, preco: c.PRECO_CHEIO, precoMetade: c.PRECO_METADE,
      inscritos: linhas, leads
    });
  } catch (e) {
    console.error('gestao:', e.message);
    c.responde(res, 502, { erro: 'Não foi possível ler os inscritos agora.' });
  }
};
