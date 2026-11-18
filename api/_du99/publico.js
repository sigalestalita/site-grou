/* Rotas públicas do gerador de certificados da DU99 (participantes e verificação). */
const c = require('../_comum');
const B = require('./base');
const { db, enc, esc } = B;

/* campos do evento que podem aparecer em página pública (o resto, como a mensagem de WhatsApp, fica no painel) */
const PUBLICOS = ['subtitulo', 'data_inicio', 'data_fim', 'local', 'cidade', 'modalidade', 'carga_horaria', 'temas', 'descricao', 'imagem_url', 'regra', 'pede_nps', 'pergunta_nps', 'texto_post', 'ajuda', 'linkedin_nome'];
const publico = (dados) => { const o = {}; PUBLICOS.forEach((k) => { if (dados && dados[k] !== undefined) o[k] = dados[k]; }); return o; };

const IDENT = ['nome_empresa', 'slogan', 'site', 'logo_url', 'logo_claro_url', 'cores', 'fontes', 'whatsapp', 'email_contato', 'linkedin_org_id', 'assinaturas', 'rodape'];
const identidade = (cfg) => { const o = {}; IDENT.forEach((k) => { if (cfg[k] !== undefined) o[k] = cfg[k]; }); return o; };

async function eventoPorSlug(slug) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  const l = (await db.rest('du99_eventos?slug=eq.' + enc(slug) + '&status=neq.rascunho&limit=1')) || [];
  return l[0] || null;
}
async function tiposPorId(ids) {
  const v = [...new Set(ids.filter(B.uuid))];
  if (!v.length) return {};
  const l = (await db.rest('du99_tipos_certificado?select=id,nome,dados&id=in.(' + v.join(',') + ')')) || [];
  return Object.fromEntries(l.map((t) => [t.id, { id: t.id, nome: t.nome, dados: t.dados || {} }]));
}
async function tipoEventoNome(id) {
  if (!B.uuid(id)) return '';
  const l = (await db.rest('du99_tipos_evento?select=nome&id=eq.' + id + '&limit=1')) || [];
  return l[0] ? l[0].nome : '';
}
const eventoPublico = async (ev) => ({ slug: ev.slug, nome: ev.nome, status: ev.status, tipo_evento: await tipoEventoNome(ev.tipo_evento_id), dados: publico(ev.dados || {}) });

/* GET ?du99=eventos: eventos com emissão aberta (página inicial) */
async function eventos(req, res) {
  const l = (await db.rest('du99_eventos?select=slug,nome,status,dados&status=eq.aberto&order=criado_em.desc&limit=100')) || [];
  const cfg = await B.config();
  return c.responde(res, 200, { ok: true, identidade: identidade(cfg), eventos: l.map((e) => ({ slug: e.slug, nome: e.nome, dados: { data_inicio: (e.dados || {}).data_inicio, data_fim: (e.dados || {}).data_fim, cidade: (e.dados || {}).cidade, modalidade: (e.dados || {}).modalidade, imagem_url: (e.dados || {}).imagem_url } })) });
}

/* GET ?du99=evento&slug=...: dados para montar a página do evento */
async function evento(req, res, url) {
  const ev = await eventoPorSlug(String(url.searchParams.get('slug') || ''));
  if (!ev) return c.responde(res, 404, { erro: 'Evento não encontrado.' });
  const [cfg, tipos] = await Promise.all([B.config(), tiposPorId([ev.tipo_certificado_id])]);
  return c.responde(res, 200, { ok: true, identidade: identidade(cfg), evento: await eventoPublico(ev), tipo_certificado: tipos[ev.tipo_certificado_id] || null });
}

/* POST {acao:'gerar', slug, email, nps}: procura o participante e devolve nome, código e o modelo do certificado */
async function gerar(req, res, b) {
  const ev = await eventoPorSlug(String(b.slug || ''));
  if (!ev) return c.responde(res, 404, { erro: 'Evento não encontrado.' });
  if (ev.status !== 'aberto') return c.responde(res, 403, { erro: 'A emissão de certificados deste evento está encerrada. Se você já gerou o seu, o código continua valendo para verificação.' });
  const email = String(b.email || '').trim().toLowerCase();
  if (!B.emailOk(email)) return c.responde(res, 400, { erro: 'Confira o e-mail digitado.', campo: 'email' });
  const d = ev.dados || {};
  let nps = null;
  if (d.pede_nps) {
    nps = Number(b.nps);
    if (b.nps === undefined || b.nps === null || b.nps === '' || !Number.isInteger(nps) || nps < 0 || nps > 10) {
      return c.responde(res, 400, { erro: 'Escolha uma nota de 0 a 10 para o evento.', campo: 'nps' });
    }
  }
  const l = (await db.rest('du99_participantes?evento_id=eq.' + ev.id + '&email=eq.' + enc(email) + '&limit=1')) || [];
  const p = l[0];
  if (!p) return c.responde(res, 404, { erro: 'Não encontramos esse e-mail na lista do evento. Use o mesmo e-mail da sua inscrição.', campo: 'email' });
  if (d.regra === 'presentes' && !p.presente) {
    return c.responde(res, 403, { erro: 'Seu e-mail está na lista, mas a sua presença não foi registrada. Fale com a organização do evento.', campo: 'email' });
  }
  const agora = new Date().toISOString();
  const campos = { gerado_vezes: (p.gerado_vezes || 0) + 1 };
  if (!p.gerado_em) campos.gerado_em = agora;
  if (nps !== null) { campos.nps = nps; campos.nps_em = agora; }
  try { await db.rest('du99_participantes?id=eq.' + p.id, { metodo: 'PATCH', corpo: campos, cabecalhos: { Prefer: 'return=minimal' } }); }
  catch (e) { console.error('du99 gerar:', e.message); /* registrar a nota não pode travar o certificado */ }
  const tipoId = B.uuid(p.tipo_certificado_id) ? p.tipo_certificado_id : ev.tipo_certificado_id;
  const tipos = await tiposPorId([tipoId, ev.tipo_certificado_id]);
  return c.responde(res, 200, { ok: true, nome: B.formataNome(p.nome), codigo: p.codigo, papel: p.papel || '', tipo_certificado: tipos[tipoId] || tipos[ev.tipo_certificado_id] || null });
}

async function participantePorCodigo(cod) {
  if (!B.RE_CODIGO.test(cod)) return null;
  const l = (await db.rest('du99_participantes?select=id,nome,email,codigo,papel,tipo_certificado_id,evento_id&codigo=eq.' + enc(cod) + '&limit=1')) || [];
  if (!l[0]) return null;
  const ev = ((await db.rest('du99_eventos?id=eq.' + l[0].evento_id + '&status=neq.rascunho&limit=1')) || [])[0];
  return ev ? { p: l[0], ev } : null;
}

/* GET ?du99=verificar&codigo=...: confere um código impresso no certificado */
async function verificar(req, res, url) {
  const cod = String(url.searchParams.get('codigo') || '').trim().toUpperCase();
  if (!B.RE_CODIGO.test(cod)) return c.responde(res, 400, { erro: 'Código inválido.' });
  const a = await participantePorCodigo(cod);
  if (!a) return c.responde(res, 404, { erro: 'Não encontramos um certificado com esse código.' });
  const tipoId = B.uuid(a.p.tipo_certificado_id) ? a.p.tipo_certificado_id : a.ev.tipo_certificado_id;
  const [cfg, tipos] = await Promise.all([B.config(), tiposPorId([tipoId])]);
  const t = tipos[tipoId];
  return c.responde(res, 200, {
    ok: true, codigo: cod, nome: B.formataNome(a.p.nome), papel: a.p.papel || '',
    certificado: t ? ((t.dados.titulo || 'Certificado') + ' ' + (t.dados.subtitulo || '')).trim() : 'Certificado',
    evento: await eventoPublico(a.ev), identidade: identidade(cfg), tipo_certificado: t || null
  });
}

/* POST {acao:'imagem', email, codigo, imagem}: guarda a imagem do certificado para a prévia do LinkedIn.
   Só aceita de quem tem o e-mail do participante dono desse código. */
async function imagem(req, res, b) {
  const cod = String(b.codigo || '').trim().toUpperCase();
  const email = String(b.email || '').trim().toLowerCase();
  const img = B.imagemDe(b.imagem, 1900000);
  if (!B.RE_CODIGO.test(cod) || !img || img.tipo !== 'image/jpeg') return c.responde(res, 400, { erro: 'Imagem inválida.' });
  const a = await participantePorCodigo(cod);
  if (!a || a.p.email !== email) return c.responde(res, 403, { erro: 'Certificado não confere.' });
  try { await B.guardaArquivo('og/' + cod + '.jpg', img.buf, 'image/jpeg'); }
  catch (e) { console.error('du99 imagem:', e.message); return c.responde(res, 502, { erro: 'Não foi possível guardar a imagem.' }); }
  return c.responde(res, 200, { ok: true, pagina: B.BASE + '/c/' + cod + '/' });
}

/* GET ?du99=pagina&codigo=... (rota /du99/c/CODIGO/): página que o LinkedIn lê para a prévia do post */
async function pagina(req, res, url) {
  const cod = String(url.searchParams.get('codigo') || '').trim().toUpperCase();
  const a = B.RE_CODIGO.test(cod) ? await participantePorCodigo(cod) : null;
  const cfg = await B.config();
  const empresa = cfg.nome_empresa || 'DU99';
  const destino = B.BASE + '/verificar/' + (a ? '?codigo=' + cod : '');
  let img = B.SITE + '/du99/assets/og-padrao.jpg', w = 1200, h = 630, titulo = 'Certificado · ' + empresa, desc = 'Verifique a autenticidade de um certificado emitido por ' + empresa + '.';
  if (a) {
    const nome = B.formataNome(a.p.nome);
    titulo = nome + ' · ' + a.ev.nome;
    desc = 'Certificado emitido por ' + empresa + ' para ' + nome + ' em ' + a.ev.nome + '.';
    try { const hd = await fetch(B.urlPublica('og/' + cod + '.jpg'), { method: 'HEAD' }); if (hd.ok) { img = B.urlPublica('og/' + cod + '.jpg'); h = 627; } } catch (e) { /* fica a imagem padrão */ }
  }
  const proprio = B.BASE + '/c/' + cod + '/';
  const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(titulo) + '</title><meta name="description" content="' + esc(desc) + '"><meta name="robots" content="noindex">'
    + '<meta property="og:type" content="website"><meta property="og:site_name" content="' + esc(empresa) + '">'
    + '<meta property="og:url" content="' + esc(proprio) + '"><meta property="og:title" content="' + esc(titulo) + '">'
    + '<meta property="og:description" content="' + esc(desc) + '"><meta property="og:image" content="' + esc(img) + '">'
    + '<meta property="og:image:width" content="' + w + '"><meta property="og:image:height" content="' + h + '"><meta property="og:image:alt" content="' + esc(titulo) + '">'
    + '<meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="' + esc(proprio) + '">'
    + '<script>location.replace(' + JSON.stringify(destino) + ')</script></head>'
    + '<body style="font-family:system-ui,sans-serif;padding:40px"><p><a href="' + esc(destino) + '">Ver o certificado</a></p></body></html>';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
  res.end(html);
}

module.exports = { eventos, evento, gerar, verificar, imagem, pagina };
