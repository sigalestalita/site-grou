/* Núcleo do painel do blog: lê e grava os posts (Markdown) e as capas direto no GitHub.
   Cada gravação vira um commit no branch principal; a Vercel publica sozinha e o build gera as páginas.
   Variáveis: BLOG_GITHUB_TOKEN (token do GitHub com permissão de escrita em "Contents" no repositório),
   opcionais BLOG_GITHUB_REPO (dono/repo) e BLOG_GITHUB_BRANCH (padrão main). */
const GH = 'https://api.github.com';
const limpa = (v) => String(v || '').trim().replace(/^["']+|["']+$/g, '').trim();
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function criaBlog({ repoPadrao, saida, postsDir = 'conteudo-blog/posts' }) {
  const token = () => limpa(process.env.BLOG_GITHUB_TOKEN);
  const repo = () => limpa(process.env.BLOG_GITHUB_REPO) || repoPadrao;
  const ramo = () => limpa(process.env.BLOG_GITHUB_BRANCH) || 'main';
  const RE_POST = new RegExp('^' + escRe(postsDir) + '/\\d{4}-\\d{2}-\\d{2}-[a-z0-9-]{3,80}\\.md$');
  const RE_CAPA = new RegExp('^' + escRe(saida) + '/([a-z0-9-]{3,80})/capa\\.jpg$');

  async function gh(caminho, op) {
    const o = op || {};
    const r = await fetch(GH + '/repos/' + repo() + caminho, {
      method: o.metodo || 'GET',
      headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'painel-do-blog', 'Content-Type': 'application/json' },
      body: o.corpo ? JSON.stringify(o.corpo) : undefined
    });
    const txt = await r.text();
    let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { /* sem JSON */ }
    if (!r.ok) { const e = new Error('GitHub ' + r.status + ': ' + ((j && j.message) || txt).slice(0, 160)); e.status = r.status; throw e; }
    return j;
  }
  async function cabeca() {
    const ref = await gh('/git/ref/heads/' + ramo());
    const commit = await gh('/git/commits/' + ref.object.sha);
    return { commit: ref.object.sha, arvore: commit.tree.sha };
  }
  async function arvore(sha) {
    const t = await gh('/git/trees/' + sha + '?recursive=1');
    return t.tree || [];
  }

  async function lista() {
    const { arvore: a } = await cabeca();
    const itens = await arvore(a);
    return {
      arquivos: itens.filter((t) => t.type === 'blob' && RE_POST.test(t.path)).map((t) => ({ caminho: t.path, sha: t.sha })),
      capas: itens.filter((t) => t.type === 'blob' && RE_CAPA.test(t.path)).map((t) => t.path.match(RE_CAPA)[1])
    };
  }

  async function ler(caminhos) {
    const lista = [...new Set((caminhos || []).filter((c) => RE_POST.test(String(c))))].slice(0, 40);
    const saidaObj = {};
    await Promise.all(lista.map(async (c) => {
      const j = await gh('/contents/' + c.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(ramo()));
      saidaObj[c] = { sha: j.sha, texto: Buffer.from(j.content || '', 'base64').toString('utf8') };
    }));
    return { arquivos: saidaObj };
  }

  function valida(alteracoes) {
    if (!Array.isArray(alteracoes) || !alteracoes.length || alteracoes.length > 5) throw Object.assign(new Error('Alterações inválidas.'), { status: 400 });
    return alteracoes.map((a) => {
      const caminho = String(a.caminho || '');
      if (RE_POST.test(caminho)) {
        if (a.apagar) return { caminho, apagar: true };
        const texto = String(a.texto || '');
        if (!texto.startsWith('---\n') || texto.length > 200000) throw Object.assign(new Error('Texto do post inválido.'), { status: 400 });
        return { caminho, texto };
      }
      if (RE_CAPA.test(caminho) && a.apagar) return { caminho, apagar: true, opcional: true };
      if (RE_CAPA.test(caminho)) {
        const b64 = String(a.base64 || '');
        if (!/^[A-Za-z0-9+/=]+$/.test(b64) || b64.length > 2000000 || !Buffer.from(b64.slice(0, 8), 'base64').slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) throw Object.assign(new Error('Capa inválida.'), { status: 400 });
        return { caminho, base64: b64 };
      }
      throw Object.assign(new Error('Caminho não permitido: ' + caminho), { status: 400 });
    });
  }

  async function salvar({ mensagem, alteracoes, esperado }, autor) {
    const alt = valida(alteracoes);
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const { commit, arvore: base } = await cabeca();
      const itens = await arvore(base);
      const atual = new Map(itens.filter((t) => t.type === 'blob').map((t) => [t.path, t.sha]));
      // quem abriu o post precisa estar editando a versão atual dele
      if (esperado && esperado.caminho) {
        if (atual.get(esperado.caminho) !== esperado.sha) throw Object.assign(new Error('O post mudou desde que foi aberto.'), { status: 409 });
      }
      // não sobrescreve outro post sem querer
      for (const a of alt) {
        if (a.texto !== undefined && atual.has(a.caminho) && !(esperado && esperado.caminho === a.caminho)) throw Object.assign(new Error('Já existe um post com essa data e esse endereço.'), { status: 409 });
        if (a.apagar && !a.opcional && !atual.has(a.caminho)) throw Object.assign(new Error('O post não existe mais.'), { status: 409 });
      }
      const entradas = [];
      for (const a of alt) {
        if (a.apagar) { if (atual.has(a.caminho)) entradas.push({ path: a.caminho, mode: '100644', type: 'blob', sha: null }); continue; }
        const blob = await gh('/git/blobs', { metodo: 'POST', corpo: a.texto !== undefined ? { content: a.texto, encoding: 'utf-8' } : { content: a.base64, encoding: 'base64' } });
        entradas.push({ path: a.caminho, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const nova = await gh('/git/trees', { metodo: 'POST', corpo: { base_tree: base, tree: entradas } });
      const msg = String(mensagem || 'Blog (painel): atualização').replace(/\s+/g, ' ').slice(0, 140) + '\n\nFeito no painel do blog por ' + autor.email;
      const c = await gh('/git/commits', { metodo: 'POST', corpo: { message: msg, tree: nova.sha, parents: [commit], author: { name: autor.nome || autor.email, email: autor.email, date: new Date().toISOString() } } });
      try {
        await gh('/git/refs/heads/' + ramo(), { metodo: 'PATCH', corpo: { sha: c.sha, force: false } });
        return { ok: true, commit: c.sha };
      } catch (e) {
        if (e.status !== 422 || tentativa) throw e; // alguém publicou ao mesmo tempo: refaz em cima da versão nova
      }
    }
    throw new Error('Não foi possível gravar.');
  }

  /* trata as ações do painel; "usuario" já vem autenticado */
  async function trata(req, res, usuario, responde, corpo) {
    if (!token()) return responde(res, 503, { erro: 'Painel do blog ainda não configurado (falta o token do GitHub na Vercel).' });
    const acao = new URL(req.url, 'http://x').searchParams.get('acao') || corpo.acao;
    try {
      if (acao === 'sessao') return responde(res, 200, { email: usuario.email, nome: usuario.nome || '' });
      if (acao === 'lista') return responde(res, 200, await lista());
      if (req.method !== 'POST') return responde(res, 405, { erro: 'Método não permitido.' });
      if (acao === 'ler') return responde(res, 200, await ler(corpo.caminhos));
      if (acao === 'salvar') {
        const r = await salvar(corpo, usuario);
        console.log('blog: commit', r.commit, 'por', usuario.email);
        return responde(res, 200, r);
      }
      return responde(res, 400, { erro: 'Ação desconhecida.' });
    } catch (e) {
      console.error('blog:', acao, e.message);
      return responde(res, e.status === 409 || e.status === 400 ? e.status : 502, { erro: e.status === 409 || e.status === 400 ? e.message : 'Falha ao falar com o GitHub. Tente de novo.' });
    }
  }
  return { lista, ler, salvar, trata };
}

module.exports = { criaBlog };
