/* Rotas do painel da DU99 (exigem login, exceto entrar e aceitar convite). */
const c = require('../_comum');
const B = require('./base');
const S = require('./sessao');
const { db, enc, texto } = B;

const FONTES = ['Comfortaa', 'Nunito', 'Montserrat', 'Poppins', 'Inter', 'Raleway', 'Roboto', 'Open Sans', 'Lato', 'Quicksand', 'Varela Round', 'DM Sans', 'Playfair Display', 'Lora', 'Merriweather', 'Cormorant Garamond', 'Great Vibes', 'Dancing Script'];
const LAYOUTS = ['lateral', 'classico', 'moderno'];
const MODALIDADES = ['presencial', 'online', 'hibrido'];
const data = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
const bool = (v) => v === true || v === 'true' || v === 1 || v === '1' || v === 'on';

function assinaturas(lista) {
  return (Array.isArray(lista) ? lista : []).slice(0, 3).map((a) => ({
    nome: texto(a && a.nome, 80), cargo: texto(a && a.cargo, 80), imagem_url: B.urlImagem(a && a.imagem_url)
  })).filter((a) => a.nome || a.imagem_url);
}
function cores(o, padrao) {
  const r = {};
  ['primaria', 'secundaria', 'destaque', 'texto', 'fundo'].forEach((k) => { const v = B.cor(o && o[k], ''); if (v) r[k] = v; else if (padrao && padrao[k]) r[k] = padrao[k]; });
  return r;
}

function limpaConfig(d) {
  const f = d.fontes || {};
  return {
    nome_empresa: texto(d.nome_empresa, 80) || 'DU99',
    slogan: texto(d.slogan, 140), site: texto(d.site, 120), rodape: texto(d.rodape, 160),
    logo_url: B.urlImagem(d.logo_url), logo_claro_url: B.urlImagem(d.logo_claro_url),
    cores: cores(d.cores, { primaria: '#013e88', secundaria: '#79484e', destaque: '#f5a623', texto: '#2f2f37', fundo: '#fbfaf7' }),
    fontes: { titulo: FONTES.includes(f.titulo) ? f.titulo : 'Comfortaa', texto: FONTES.includes(f.texto) ? f.texto : 'Nunito' },
    whatsapp: String(d.whatsapp || '').replace(/\D/g, '').slice(0, 15),
    email_contato: B.emailOk(String(d.email_contato || '').trim().toLowerCase()) ? String(d.email_contato).trim().toLowerCase() : '',
    linkedin_org_id: String(d.linkedin_org_id || '').replace(/\D/g, '').slice(0, 20),
    prefixo_codigo: String(d.prefixo_codigo || 'DU99').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'DU99',
    assinaturas: assinaturas(d.assinaturas)
  };
}
function limpaTipoCert(d) {
  const op = Number(d.fundo_opacidade);
  return {
    layout: LAYOUTS.includes(d.layout) ? d.layout : 'lateral',
    titulo: texto(d.titulo, 40), subtitulo: texto(d.subtitulo, 60), abertura: texto(d.abertura, 60),
    texto: texto(d.texto, 900),
    mostrar_temas: bool(d.mostrar_temas), mostrar_qr: d.mostrar_qr === undefined ? true : bool(d.mostrar_qr),
    usar_assinaturas_proprias: bool(d.usar_assinaturas_proprias), assinaturas: assinaturas(d.assinaturas),
    cores: cores(d.cores), fundo_url: B.urlImagem(d.fundo_url), fundo_opacidade: isFinite(op) ? Math.max(0, Math.min(1, op)) : 0.15
  };
}
function limpaEvento(d) {
  const ch = Number(String(d.carga_horaria || '').replace(',', '.'));
  return {
    subtitulo: texto(d.subtitulo, 160), data_inicio: data(d.data_inicio), data_fim: data(d.data_fim),
    local: texto(d.local, 140), cidade: texto(d.cidade, 80), modalidade: MODALIDADES.includes(d.modalidade) ? d.modalidade : 'presencial',
    carga_horaria: isFinite(ch) && ch > 0 ? Math.round(ch * 10) / 10 : null,
    temas: texto(d.temas, 600), descricao: texto(d.descricao, 600), imagem_url: B.urlImagem(d.imagem_url),
    regra: d.regra === 'presentes' ? 'presentes' : 'inscritos',
    pede_nps: bool(d.pede_nps), pergunta_nps: texto(d.pergunta_nps, 160),
    texto_post: texto(d.texto_post, 1500), whatsapp_msg: texto(d.whatsapp_msg, 1200), ajuda: texto(d.ajuda, 300),
    linkedin_nome: texto(d.linkedin_nome, 120)
  };
}

/* ---------- acesso ---------- */
async function login(req, res, b) {
  const email = String(b.email || '').trim().toLowerCase();
  const senha = String(b.senha || '');
  const l = B.emailOk(email) ? ((await db.rest('du99_admins?email=eq.' + enc(email) + '&limit=1')) || []) : [];
  const u = l[0];
  const ok = S.confereSenha(senha, (u && u.senha_hash) || S.FALSO);
  if (!u || !ok || !u.ativo || !u.senha_hash) return c.responde(res, 401, { erro: 'E-mail ou senha incorretos.' });
  S.entrou(res, u.id);
  db.rest('du99_admins?id=eq.' + u.id, { metodo: 'PATCH', corpo: { ultimo_acesso: new Date().toISOString() }, cabecalhos: { Prefer: 'return=minimal' } }).catch(() => {});
  return c.responde(res, 200, { ok: true, usuario: { email: u.email, nome: u.nome } });
}
async function porConvite(token) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(token || ''))) return null;
  const l = (await db.rest('du99_admins?convite_hash=eq.' + S.hashConvite(token) + '&limit=1')) || [];
  const u = l[0];
  return u && u.ativo && u.convite_expira && new Date(u.convite_expira) > new Date() ? u : null;
}
async function convite(req, res, url) {
  const u = await porConvite(url.searchParams.get('token'));
  if (!u) return c.responde(res, 404, { erro: 'Este link de acesso não vale mais. Peça um novo a quem administra o painel.' });
  return c.responde(res, 200, { ok: true, email: u.email || '', nome: u.nome || '', troca: !!u.senha_hash });
}
async function aceitar(req, res, b) {
  const u = await porConvite(b.token);
  if (!u) return c.responde(res, 404, { erro: 'Este link de acesso não vale mais. Peça um novo a quem administra o painel.' });
  const senha = String(b.senha || '');
  if (senha.length < 10) return c.responde(res, 400, { erro: 'Use uma senha com pelo menos 10 caracteres.', campo: 'senha' });
  const campos = { senha_hash: S.hashSenha(senha), convite_hash: null, convite_expira: null, ultimo_acesso: new Date().toISOString() };
  const nome = texto(b.nome, 80);
  if (nome) campos.nome = nome;
  if (!u.email) {
    const email = String(b.email || '').trim().toLowerCase();
    if (!B.emailOk(email)) return c.responde(res, 400, { erro: 'Confira o e-mail.', campo: 'email' });
    const ja = (await db.rest('du99_admins?select=id&email=eq.' + enc(email) + '&limit=1')) || [];
    if (ja.length) return c.responde(res, 409, { erro: 'Esse e-mail já tem acesso ao painel.', campo: 'email' });
    campos.email = email;
  }
  await db.rest('du99_admins?id=eq.' + u.id, { metodo: 'PATCH', corpo: campos, cabecalhos: { Prefer: 'return=minimal' } });
  S.entrou(res, u.id);
  return c.responde(res, 200, { ok: true });
}

/* ---------- leitura geral ---------- */
async function dados(req, res, u) {
  const [cfg, tiposEv, tiposCert, eventos, parts] = await Promise.all([
    B.config(),
    db.rest('du99_tipos_evento?order=nome.asc'),
    db.rest('du99_tipos_certificado?order=nome.asc'),
    db.rest('du99_eventos?order=criado_em.desc&limit=500'),
    db.rest('du99_participantes?select=evento_id,presente,gerado_em,nps&limit=100000')
  ]);
  const est = {};
  (parts || []).forEach((p) => {
    const e = est[p.evento_id] || (est[p.evento_id] = { total: 0, presentes: 0, gerados: 0, nps: [0, 0, 0] });
    e.total++; if (p.presente) e.presentes++; if (p.gerado_em) e.gerados++;
    if (p.nps !== null && p.nps !== undefined) e.nps[p.nps >= 9 ? 0 : p.nps >= 7 ? 1 : 2]++;
  });
  return c.responde(res, 200, { ok: true, usuario: u, config: cfg, tipos_evento: tiposEv || [], tipos_certificado: tiposCert || [], eventos: (eventos || []).map((e) => Object.assign(e, { estatisticas: est[e.id] || { total: 0, presentes: 0, gerados: 0, nps: [0, 0, 0] } })) });
}

/* ---------- gravação ---------- */
async function salvar(req, res, b) {
  const t = b.tipo, d = b.dados || {};
  const agora = new Date().toISOString();
  const volta = { Prefer: 'return=representation' };
  if (t === 'config') {
    const linha = await db.rest('du99_config?on_conflict=id', { metodo: 'POST', corpo: { id: 1, dados: limpaConfig(d), atualizado_em: agora }, cabecalhos: { Prefer: 'resolution=merge-duplicates,return=representation' } });
    return c.responde(res, 200, { ok: true, item: (linha || [])[0] });
  }
  if (t === 'tipo_evento') {
    const nome = texto(d.nome, 80);
    if (!nome) return c.responde(res, 400, { erro: 'Dê um nome ao tipo de evento.' });
    const corpo = { nome, descricao: texto(d.descricao, 300), ativo: d.ativo === undefined ? true : bool(d.ativo) };
    const r = B.uuid(d.id) ? await db.rest('du99_tipos_evento?id=eq.' + d.id, { metodo: 'PATCH', corpo, cabecalhos: volta }) : await db.rest('du99_tipos_evento', { metodo: 'POST', corpo, cabecalhos: volta });
    return c.responde(res, 200, { ok: true, item: (r || [])[0] });
  }
  if (t === 'tipo_certificado') {
    const nome = texto(d.nome, 80);
    if (!nome) return c.responde(res, 400, { erro: 'Dê um nome ao tipo de certificado.' });
    const corpo = { nome, dados: limpaTipoCert(d.dados || {}), ativo: d.ativo === undefined ? true : bool(d.ativo), atualizado_em: agora };
    const r = B.uuid(d.id) ? await db.rest('du99_tipos_certificado?id=eq.' + d.id, { metodo: 'PATCH', corpo, cabecalhos: volta }) : await db.rest('du99_tipos_certificado', { metodo: 'POST', corpo, cabecalhos: volta });
    return c.responde(res, 200, { ok: true, item: (r || [])[0] });
  }
  if (t === 'evento') {
    const nome = texto(d.nome, 140);
    const slug = String(d.slug || '').trim().toLowerCase();
    if (!nome) return c.responde(res, 400, { erro: 'Dê um nome ao evento.', campo: 'nome' });
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return c.responde(res, 400, { erro: 'O endereço do evento só pode ter letras minúsculas, números e hífens.', campo: 'slug' });
    const corpo = {
      nome, slug, status: ['rascunho', 'aberto', 'encerrado'].includes(d.status) ? d.status : 'rascunho',
      tipo_evento_id: B.uuid(d.tipo_evento_id) ? d.tipo_evento_id : null,
      tipo_certificado_id: B.uuid(d.tipo_certificado_id) ? d.tipo_certificado_id : null,
      dados: limpaEvento(d.dados || {}), atualizado_em: agora
    };
    if (corpo.status === 'aberto' && !corpo.tipo_certificado_id) return c.responde(res, 400, { erro: 'Escolha o tipo de certificado antes de abrir a emissão.', campo: 'tipo_certificado_id' });
    try {
      const r = B.uuid(d.id) ? await db.rest('du99_eventos?id=eq.' + d.id, { metodo: 'PATCH', corpo, cabecalhos: volta }) : await db.rest('du99_eventos', { metodo: 'POST', corpo, cabecalhos: volta });
      return c.responde(res, 200, { ok: true, item: (r || [])[0] });
    } catch (e) {
      if (/duplicate|23505|unique/i.test(e.message)) return c.responde(res, 409, { erro: 'Já existe um evento com esse endereço. Escolha outro.', campo: 'slug' });
      throw e;
    }
  }
  return c.responde(res, 400, { erro: 'Tipo desconhecido.' });
}

async function excluir(req, res, b) {
  const tabela = { evento: 'du99_eventos', tipo_evento: 'du99_tipos_evento', tipo_certificado: 'du99_tipos_certificado' }[b.tipo];
  if (!tabela || !B.uuid(b.id)) return c.responde(res, 400, { erro: 'Pedido inválido.' });
  await db.rest(tabela + '?id=eq.' + b.id, { metodo: 'DELETE', cabecalhos: { Prefer: 'return=minimal' } });
  return c.responde(res, 200, { ok: true });
}

/* ---------- participantes ---------- */
async function participantes(req, res, url) {
  const ev = url.searchParams.get('evento');
  if (!B.uuid(ev)) return c.responde(res, 400, { erro: 'Evento inválido.' });
  const l = (await db.rest('du99_participantes?evento_id=eq.' + ev + '&order=nome.asc&limit=20000')) || [];
  return c.responde(res, 200, { ok: true, participantes: l });
}
function limpaParticipante(p) {
  return {
    nome: texto(p.nome, 120), email: String(p.email || '').trim().toLowerCase().slice(0, 160),
    celular: String(p.celular || '').replace(/\D/g, '').slice(0, 15), empresa: texto(p.empresa, 120), papel: texto(p.papel, 60)
  };
}
async function participante(req, res, b) {
  const a = b.acao;
  if (a === 'adicionar' || a === 'editar') {
    const p = limpaParticipante(b.dados || {});
    if (!p.nome) return c.responde(res, 400, { erro: 'Informe o nome.', campo: 'nome' });
    if (!B.emailOk(p.email)) return c.responde(res, 400, { erro: 'Confira o e-mail.', campo: 'email' });
    const tc = (b.dados || {}).tipo_certificado_id;
    p.tipo_certificado_id = B.uuid(tc) ? tc : null;
    if ((b.dados || {}).presente !== undefined) p.presente = bool(b.dados.presente);
    try {
      if (a === 'editar') {
        if (!B.uuid(b.id)) return c.responde(res, 400, { erro: 'Pedido inválido.' });
        const r = await db.rest('du99_participantes?id=eq.' + b.id, { metodo: 'PATCH', corpo: p, cabecalhos: { Prefer: 'return=representation' } });
        return c.responde(res, 200, { ok: true, item: (r || [])[0] });
      }
      if (!B.uuid(b.evento_id)) return c.responde(res, 400, { erro: 'Evento inválido.' });
      const cfg = await B.config();
      Object.assign(p, { evento_id: b.evento_id, codigo: B.novoCodigo(cfg) });
      const r = await db.rest('du99_participantes', { metodo: 'POST', corpo: p, cabecalhos: { Prefer: 'return=representation' } });
      return c.responde(res, 200, { ok: true, item: (r || [])[0] });
    } catch (e) {
      if (/duplicate|23505|unique/i.test(e.message)) return c.responde(res, 409, { erro: 'Esse e-mail já está na lista deste evento.', campo: 'email' });
      throw e;
    }
  }
  if (!B.uuid(b.id)) return c.responde(res, 400, { erro: 'Pedido inválido.' });
  const alvo = 'du99_participantes?id=eq.' + b.id;
  const min = { Prefer: 'return=minimal' };
  if (a === 'remover') { await db.rest(alvo, { metodo: 'DELETE', cabecalhos: min }); return c.responde(res, 200, { ok: true }); }
  if (a === 'presenca') { await db.rest(alvo, { metodo: 'PATCH', corpo: { presente: bool(b.valor) }, cabecalhos: min }); return c.responde(res, 200, { ok: true }); }
  if (a === 'whatsapp') { await db.rest(alvo, { metodo: 'PATCH', corpo: { whatsapp_em: b.valor === false ? null : new Date().toISOString() }, cabecalhos: min }); return c.responde(res, 200, { ok: true }); }
  return c.responde(res, 400, { erro: 'Ação desconhecida.' });
}

/* importa uma lista (CSV lido no navegador). Quem já está na lista (mesmo e-mail) é atualizado e mantém o código. */
async function importar(req, res, b) {
  if (!B.uuid(b.evento_id)) return c.responde(res, 400, { erro: 'Evento inválido.' });
  const linhas = Array.isArray(b.linhas) ? b.linhas.slice(0, 5000) : [];
  const existentes = (await db.rest('du99_participantes?select=email,codigo,presente&evento_id=eq.' + b.evento_id + '&limit=20000')) || [];
  const mapa = Object.fromEntries(existentes.map((p) => [p.email, p]));
  const cfg = await B.config();
  const vistos = new Set(), ok = [], erros = [];
  linhas.forEach((l, i) => {
    const p = limpaParticipante(l);
    if (!p.nome || !B.emailOk(p.email)) { erros.push({ linha: i + 2, motivo: !p.nome ? 'sem nome' : 'e-mail inválido', email: p.email }); return; }
    if (vistos.has(p.email)) { erros.push({ linha: i + 2, motivo: 'e-mail repetido na planilha', email: p.email }); return; }
    vistos.add(p.email);
    const ja = mapa[p.email];
    p.evento_id = b.evento_id;
    p.codigo = ja ? ja.codigo : B.novoCodigo(cfg);
    p.presente = l.presente === undefined || l.presente === '' ? (ja ? !!ja.presente : false) : bool(l.presente) || /^(sim|s|x|presente|yes|y)$/i.test(String(l.presente).trim());
    ok.push(p);
  });
  for (let i = 0; i < ok.length; i += 500) {
    await db.rest('du99_participantes?on_conflict=evento_id,email', { metodo: 'POST', corpo: ok.slice(i, i + 500), cabecalhos: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  }
  const novos = ok.filter((p) => !mapa[p.email]).length;
  return c.responde(res, 200, { ok: true, novos, atualizados: ok.length - novos, erros });
}

/* ---------- imagens (logo, assinaturas, fundos, capas) ---------- */
async function upload(req, res, b) {
  const pasta = ['identidade', 'assinaturas', 'fundos', 'eventos'].includes(b.pasta) ? b.pasta : null;
  const img = B.imagemDe(b.imagem, 2500000);
  if (!pasta || !img) return c.responde(res, 400, { erro: 'Envie uma imagem PNG, JPG ou WEBP de até 2,5 MB.' });
  const nome = pasta + '/' + Date.now().toString(36) + '-' + require('crypto').randomBytes(5).toString('hex') + '.' + img.ext;
  const url = await B.guardaArquivo(nome, img.buf, img.tipo);
  return c.responde(res, 200, { ok: true, url });
}

/* ---------- pessoas com acesso ao painel ---------- */
async function usuarios(req, res) {
  const l = (await db.rest('du99_admins?select=id,email,nome,ativo,senha_hash,convite_expira,ultimo_acesso,criado_em&order=criado_em.asc')) || [];
  return c.responde(res, 200, { ok: true, usuarios: l.map((u) => ({ id: u.id, email: u.email, nome: u.nome, ativo: u.ativo, pendente: !u.senha_hash, convite_expira: u.convite_expira, ultimo_acesso: u.ultimo_acesso })) });
}
async function usuario(req, res, b, eu) {
  const a = b.acao;
  const link = (token) => B.BASE + '/admin/?convite=' + token;
  if (a === 'convidar') {
    const email = String(b.email || '').trim().toLowerCase();
    if (!B.emailOk(email)) return c.responde(res, 400, { erro: 'Confira o e-mail.', campo: 'email' });
    const ja = (await db.rest('du99_admins?select=id&email=eq.' + enc(email) + '&limit=1')) || [];
    if (ja.length) return c.responde(res, 409, { erro: 'Esse e-mail já está na lista. Use "Gerar novo link" ao lado dele.' });
    const cv = S.novoConvite();
    await db.rest('du99_admins', { metodo: 'POST', corpo: { email, nome: texto(b.nome, 80), convite_hash: cv.hash, convite_expira: cv.expira }, cabecalhos: { Prefer: 'return=minimal' } });
    return c.responde(res, 200, { ok: true, link: link(cv.token) });
  }
  if (!B.uuid(b.id)) return c.responde(res, 400, { erro: 'Pedido inválido.' });
  if (a === 'novo_link') {
    const cv = S.novoConvite();
    await db.rest('du99_admins?id=eq.' + b.id, { metodo: 'PATCH', corpo: { convite_hash: cv.hash, convite_expira: cv.expira }, cabecalhos: { Prefer: 'return=minimal' } });
    return c.responde(res, 200, { ok: true, link: link(cv.token) });
  }
  if (a === 'desativar' || a === 'reativar') {
    if (b.id === eu.id) return c.responde(res, 400, { erro: 'Você não pode desativar o seu próprio acesso.' });
    await db.rest('du99_admins?id=eq.' + b.id, { metodo: 'PATCH', corpo: { ativo: a === 'reativar' }, cabecalhos: { Prefer: 'return=minimal' } });
    return c.responde(res, 200, { ok: true });
  }
  return c.responde(res, 400, { erro: 'Ação desconhecida.' });
}

module.exports = { login, convite, aceitar, dados, salvar, excluir, participantes, participante, importar, upload, usuarios, usuario };
