// Gera o blog estático a partir dos posts em Markdown.
// Uso (na raiz do repositório): node conteudo-blog/motor/gerar.mjs
// Lê conteudo-blog/site.json e conteudo-blog/posts/*.md; escreve as páginas em site.saida, o feed e o sitemap.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { markdown, lerPost, esc, slugify } from './markdown.mjs';

const RAIZ = process.cwd();
const BASE = join(RAIZ, 'conteudo-blog');
const site = JSON.parse(readFileSync(join(BASE, 'site.json'), 'utf8'));
const SAIDA = join(RAIZ, site.saida);
const URLB = site.url_base;                      // ex.: /blog/
const DOM = site.dominio.replace(/\/$/, '');     // ex.: https://grougp.com.br
const POR_PAGINA = 18;
const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); // dia em Brasília

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataBR = (d) => { const [a, m, dia] = d.split('-').map(Number); return `${dia} de ${MESES[m - 1]} de ${a}`; };
const urlAbs = (p) => DOM + p;

// ---------- posts ----------
export function carregarPosts({ incluirRascunhos = false } = {}) {
  const dir = join(BASE, 'posts');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).map((arq) => {
    const { dados, corpo } = lerPost(readFileSync(join(dir, arq), 'utf8'));
    const slug = dados.slug || slugify(dados.titulo || arq.replace(/^\d{4}-\d{2}-\d{2}-|\.md$/g, ''));
    const conv = markdown(corpo, { dominios: site.dominios_internos });
    const palavras = corpo.replace(/[#>*|`\-\[\]()]/g, ' ').split(/\s+/).filter(Boolean).length;
    const fontes = (dados.fontes || []).map((f) => { const [t, u] = f.split('|').map((x) => x.trim()); return { titulo: t, url: u || t }; });
    return {
      arquivo: arq, corpo, ...conv, palavras,
      titulo: dados.titulo, titulo_seo: dados.titulo_seo || dados.titulo, descricao: dados.descricao, slug,
      data: dados.data, atualizado: dados.atualizado || dados.data, categoria: dados.categoria || 'Geral',
      tags: dados.tags || [], palavra_chave: dados.palavra_chave || '', autor: dados.autor || site.autor_padrao,
      status: dados.status || 'publicado', fontes, leitura: Math.max(3, Math.round(palavras / 200)),
      url: `${URLB}${slug}/`,
    };
  }).filter((p) => incluirRascunhos || (p.status === 'publicado' && p.data <= hoje))
    .sort((a, b) => (b.data + b.slug).localeCompare(a.data + a.slug));
}

// ---------- layout ----------
function cabecalhoHead({ titulo, descricao, url, imagem, tipo = 'website', extra = '' }) {
  return { titulo, descricao, url, imagem, tipo, extra };
}

function montarPagina(meta, conteudo) {
  const imagem = meta.imagem || site.imagem_padrao;
  const headExtra = `
<link rel="stylesheet" href="${URLB}blog.css?v=${site.versao_css || 1}">
<link rel="alternate" type="application/rss+xml" title="${esc(site.blog.titulo)}" href="${urlAbs(URLB + 'feed.xml')}">
<meta property="og:image" content="${esc(imagem)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(imagem)}">
${meta.extra || ''}`;
  if (site.layout.tipo === 'modelo') {
    let m = readFileSync(join(RAIZ, site.layout.arquivo), 'utf8');
    m = m.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.titulo)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(meta.descricao)}">`)
      .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(meta.url)}">`)
      .replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${meta.tipo}">`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(meta.titulo)}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(meta.descricao)}">`)
      .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(meta.url)}">`)
      .replace(/<meta property="og:image[^>]*>\n?/g, '').replace(/<meta name="twitter:(card|image)"[^>]*>\n?/g, '')
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '')
      .replace('</head>', headExtra + '\n</head>');
    // menu: o item ativo nas páginas do blog é "Conteúdo"
    const ini0 = m.indexOf('<ul class="menu">'), fim0 = m.indexOf('</ul>', m.indexOf('href="/blog/">Conteúdo'));
    if (ini0 > -1 && fim0 > ini0) {
      const menu = m.slice(ini0, fim0).replace(/ aria-current="page"/g, '').replace('<a class="menu-link" href="/blog/">Conteúdo', '<a class="menu-link" href="/blog/" aria-current="page">Conteúdo');
      m = m.slice(0, ini0) + menu + m.slice(fim0);
    }
    const ini = m.indexOf('<main id="conteudo-principal">'), fim = m.indexOf('</main>');
    return m.slice(0, ini) + `<main id="conteudo-principal" class="blog">\n${conteudo}\n` + m.slice(fim);
  }
  // layout por partes (cabeçalho e rodapé próprios do blog)
  const parte = (n) => readFileSync(join(BASE, 'partes', n), 'utf8');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.titulo)}</title>
<meta name="description" content="${esc(meta.descricao)}">
<link rel="canonical" href="${esc(meta.url)}">
<meta property="og:type" content="${meta.tipo}">
<meta property="og:site_name" content="${esc(site.nome)}">
<meta property="og:title" content="${esc(meta.titulo)}">
<meta property="og:description" content="${esc(meta.descricao)}">
<meta property="og:url" content="${esc(meta.url)}">
<meta property="og:locale" content="pt_BR">
${parte('head.html')}
${headExtra}
</head>
<body class="blog">
${parte('cabecalho.html')}
<main id="conteudo" class="blog">
${conteudo}
</main>
${parte('rodape.html')}
</body>
</html>
`;
}

const ldjson = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const capaDe = (p) => existsSync(join(SAIDA, p.slug, 'capa.jpg')) ? `${URLB}${p.slug}/capa.jpg` : null;

function cartao(p) {
  const capa = capaDe(p);
  return `<a class="bp-cartao" href="${p.url}">
  ${capa ? `<img src="${capa}" alt="" loading="lazy" width="1200" height="630">` : ''}
  <span class="bp-cat">${esc(p.categoria)}</span>
  <h3>${esc(p.titulo)}</h3>
  <p>${esc(p.descricao)}</p>
  <span class="bp-meta">${dataBR(p.data)} · ${p.leitura} min de leitura</span>
</a>`;
}

function paginaPost(p, todos) {
  const capa = capaDe(p);
  const relacionados = todos.filter((o) => o.slug !== p.slug)
    .map((o) => ({ o, pts: (o.categoria === p.categoria ? 2 : 0) + o.tags.filter((t) => p.tags.includes(t)).length }))
    .sort((a, b) => b.pts - a.pts || b.o.data.localeCompare(a.o.data)).slice(0, 3).map((x) => x.o);
  const catUrl = `${URLB}categoria/${slugify(p.categoria)}/`;
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.titulo_seo, description: p.descricao,
      datePublished: p.data, dateModified: p.atualizado, inLanguage: 'pt-BR', mainEntityOfPage: urlAbs(p.url),
      image: capa ? urlAbs(capa) : site.imagem_padrao, keywords: [p.palavra_chave, ...p.tags].filter(Boolean).join(', '),
      articleSection: p.categoria, wordCount: p.palavras,
      author: { '@type': 'Organization', name: p.autor, url: DOM + '/' },
      publisher: { '@type': 'Organization', name: site.nome, logo: { '@type': 'ImageObject', url: site.logo_url } },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: DOM + '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: urlAbs(URLB) },
        { '@type': 'ListItem', position: 3, name: p.categoria, item: urlAbs(catUrl) },
        { '@type': 'ListItem', position: 4, name: p.titulo, item: urlAbs(p.url) },
      ],
    },
  ];
  if (p.faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.pergunta, acceptedAnswer: { '@type': 'Answer', text: f.resposta } })) });

  const conteudo = `
<article class="bp">
  <header class="bp-topo"><div class="bp-wrap">
    <nav class="bp-migalhas" aria-label="Você está em"><a href="/">Início</a><span>/</span><a href="${URLB}">Blog</a><span>/</span><a href="${catUrl}">${esc(p.categoria)}</a></nav>
    <a class="bp-cat" href="${catUrl}">${esc(p.categoria)}</a>
    <h1>${esc(p.titulo)}</h1>
    <p class="bp-lead">${esc(p.descricao)}</p>
    <p class="bp-meta">Por ${esc(p.autor)} · <time datetime="${p.data}">${dataBR(p.data)}</time>${p.atualizado !== p.data ? ` · atualizado em <time datetime="${p.atualizado}">${dataBR(p.atualizado)}</time>` : ''} · ${p.leitura} min de leitura</p>
  </div></header>
  ${capa ? `<div class="bp-wrap"><img class="bp-capa" src="${capa}" alt="${esc(p.titulo)}" width="1200" height="630"></div>` : ''}
  <div class="bp-wrap bp-grade">
    ${p.sumario.length >= 3 ? `<aside class="bp-sumario"><strong>Neste artigo</strong><ol>${p.sumario.map((s) => `<li><a href="#${s.id}">${esc(s.txt)}</a></li>`).join('')}</ol></aside>` : '<div></div>'}
    <div class="bp-corpo">
${p.html}
      ${p.fontes.length ? `<section class="bp-fontes"><h2>Fontes e referências</h2><ol>${p.fontes.map((f) => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)}</a></li>`).join('')}</ol></section>` : ''}
      <aside class="bp-cta">
        <strong>${esc(site.cta.titulo)}</strong>
        <p>${esc(site.cta.texto)}</p>
        <a class="bp-botao" href="${site.cta.url}">${esc(site.cta.botao)}</a>
      </aside>
    </div>
  </div>
  ${relacionados.length ? `<section class="bp-wrap bp-relacionados"><h2>Continue lendo</h2><div class="bp-lista">${relacionados.map(cartao).join('')}</div></section>` : ''}
</article>`;
  return montarPagina({
    titulo: `${p.titulo_seo} | ${site.nome}`, descricao: p.descricao, url: urlAbs(p.url), imagem: capa ? urlAbs(capa) : null, tipo: 'article',
    extra: `<meta property="article:published_time" content="${p.data}"><meta property="article:modified_time" content="${p.atualizado}"><meta property="article:section" content="${esc(p.categoria)}">\n${ld.map(ldjson).join('\n')}`,
  }, conteudo);
}

function paginaLista({ titulo, h1, descricao, url, posts, pagina, total, base, categorias, catAtual }) {
  const nav = total > 1 ? `<nav class="bp-paginas" aria-label="Páginas">${Array.from({ length: total }, (_, i) => i + 1).map((n) =>
    n === pagina ? `<span aria-current="page">${n}</span>` : `<a href="${n === 1 ? base : `${base}pagina/${n}/`}">${n}</a>`).join('')}</nav>` : '';
  const conteudo = `
<section class="bp-lista-topo"><div class="bp-wrap">
  <nav class="bp-migalhas" aria-label="Você está em"><a href="/">Início</a><span>/</span>${catAtual ? `<a href="${URLB}">Blog</a><span>/</span><span>${esc(catAtual)}</span>` : '<span>Blog</span>'}</nav>
  <h1>${h1}</h1>
  <p class="bp-lead">${esc(descricao)}</p>
  <div class="bp-filtros"><a href="${URLB}"${!catAtual ? ' aria-current="page"' : ''}>Todos</a>${categorias.map((c) => `<a href="${URLB}categoria/${slugify(c)}/"${c === catAtual ? ' aria-current="page"' : ''}>${esc(c)}</a>`).join('')}</div>
</div></section>
<section class="bp-wrap">
  ${posts.length ? `<div class="bp-lista">${posts.map(cartao).join('')}</div>` : '<p class="bp-vazio">Os primeiros artigos chegam em breve.</p>'}
  ${nav}
</section>`;
  const ld = { '@context': 'https://schema.org', '@type': 'Blog', name: site.blog.titulo, url: urlAbs(base), description: descricao, publisher: { '@type': 'Organization', name: site.nome } };
  return montarPagina({ titulo, descricao, url: urlAbs(url), extra: ldjson(ld) }, conteudo);
}

function escrever(caminho, html) { mkdirSync(dirname(caminho), { recursive: true }); writeFileSync(caminho, html); }

// ---------- execução ----------
// ---------- llms.txt ----------
// Título e descrição de uma página do próprio site, lidos do HTML local (quando ele existe no repositório).
function metaLocal(url) {
  const caminho = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
  const arq = join(RAIZ, caminho, 'index.html');
  if (!existsSync(arq)) return null;
  const h = readFileSync(arq, 'utf8');
  const titulo = (/<title>([^<]+)<\/title>/i.exec(h) || [])[1];
  const desc = (/<meta\s+name="description"\s+content="([^"]*)"/i.exec(h) || [])[1];
  return titulo ? { titulo: titulo.trim(), descricao: (desc || '').trim() } : null;
}

function llmsTxt(posts, categorias, sitemap) {
  const L = site.llms;
  const linha = (t, u, d) => `- [${t.replace(/[[\]]/g, '')}](${u})${d ? `: ${d}` : ''}`;
  const paginas = [...(L.paginas || []).map((p) => linha(p.titulo, p.url.startsWith('http') ? p.url : urlAbs(p.url), p.descricao))];
  if (L.paginas_do_sitemap) {
    const vistas = new Set((L.paginas || []).map((p) => p.url));
    for (const [, u] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      if (u.includes(URLB) || vistas.has(u) || !u.startsWith(DOM)) continue;
      const m = metaLocal(u);
      if (m) paginas.push(linha(m.titulo.replace(/\s*[|·–-]\s*[^|·–-]*$/, '') || m.titulo, u, m.descricao));
    }
  }
  const blocos = categorias.map((c) => `### ${c}\n\n${posts.filter((p) => p.categoria === c).map((p) => linha(p.titulo, urlAbs(p.url), p.descricao)).join('\n')}`);
  return `# ${L.titulo || site.nome}

> ${L.resumo}

${(L.detalhes || []).join('\n\n')}${(L.detalhes || []).length ? '\n\n' : ''}## Páginas principais

${paginas.join('\n')}

## ${site.blog.titulo}

${site.blog.descricao} Feed: ${urlAbs(URLB + 'feed.xml')}

${blocos.join('\n\n')}
`;
}

export function gerar() {
  const posts = carregarPosts();
  const categorias = [...new Set(posts.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, 'pt'));
  const gerados = new Set();

  // posts
  for (const p of posts) { escrever(join(SAIDA, p.slug, 'index.html'), paginaPost(p, posts)); gerados.add(p.slug); }

  // listas (todos e por categoria), com paginação
  const listar = (lista, base, h1, descricao, titulo, catAtual) => {
    const total = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    for (let n = 1; n <= total; n++) {
      const url = n === 1 ? base : `${base}pagina/${n}/`;
      const dest = join(RAIZ, site.saida, url.slice(URLB.length), 'index.html');
      escrever(dest, paginaLista({ titulo: n === 1 ? titulo : `${titulo} · página ${n}`, h1, descricao, url, posts: lista.slice((n - 1) * POR_PAGINA, n * POR_PAGINA), pagina: n, total, base, categorias, catAtual }));
    }
  };
  listar(posts, URLB, site.blog.h1, site.blog.descricao, `${site.blog.titulo} | ${site.nome}`);
  for (const c of categorias) {
    listar(posts.filter((p) => p.categoria === c), `${URLB}categoria/${slugify(c)}/`, esc(c), `Artigos sobre ${c.toLowerCase()} no ${site.blog.titulo.toLowerCase()}.`, `${c} · ${site.blog.titulo} | ${site.nome}`, c);
  }
  gerados.add('categoria'); gerados.add('pagina');

  // remove páginas de posts que saíram (rascunho ou apagados); só mexe no que o próprio gerador criou
  const registro = join(SAIDA, '.gerados.json');
  const antes = existsSync(registro) ? JSON.parse(readFileSync(registro, 'utf8')) : [];
  for (const s of antes) if (!gerados.has(s) && existsSync(join(SAIDA, s, 'index.html'))) rmSync(join(SAIDA, s, 'index.html'));
  writeFileSync(registro, JSON.stringify([...gerados].sort(), null, 1));

  // css
  copyFileSync(join(BASE, 'estilo.css'), join(SAIDA, 'blog.css'));

  // feed RSS (20 mais recentes)
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${esc(site.blog.titulo)}</title><link>${urlAbs(URLB)}</link><description>${esc(site.blog.descricao)}</description><language>pt-BR</language>
<atom:link href="${urlAbs(URLB + 'feed.xml')}" rel="self" type="application/rss+xml"/>
${posts.slice(0, 20).map((p) => `<item><title>${esc(p.titulo)}</title><link>${urlAbs(p.url)}</link><guid>${urlAbs(p.url)}</guid><pubDate>${new Date(p.data + 'T09:00:00-03:00').toUTCString()}</pubDate><category>${esc(p.categoria)}</category><description>${esc(p.descricao)}</description></item>`).join('\n')}
</channel></rss>
`;
  writeFileSync(join(SAIDA, 'feed.xml'), feed);

  // sitemap: bloco do blog entre marcadores
  const smArq = join(RAIZ, site.sitemap);
  let sm = existsSync(smArq) ? readFileSync(smArq, 'utf8') : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${(site.sitemap_base || []).map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  sm = sm.replace(/\n?\s*<!-- blog:inicio -->[\s\S]*<!-- blog:fim -->/, '');
  const bloco = [`  <url><loc>${urlAbs(URLB)}</loc><lastmod>${posts[0]?.data || hoje}</lastmod><priority>0.8</priority></url>`,
    ...categorias.map((c) => `  <url><loc>${urlAbs(`${URLB}categoria/${slugify(c)}/`)}</loc><priority>0.5</priority></url>`),
    ...posts.map((p) => `  <url><loc>${urlAbs(p.url)}</loc><lastmod>${p.atualizado}</lastmod><priority>0.7</priority></url>`)].join('\n');
  sm = sm.replace('</urlset>', `  <!-- blog:inicio -->\n${bloco}\n  <!-- blog:fim -->\n</urlset>`);
  writeFileSync(smArq, sm);

  // llms.txt (resumo do site e índice dos posts, para buscadores com IA) e chave do IndexNow, ao lado do sitemap
  const pastaRaiz = dirname(smArq);
  if (site.llms) writeFileSync(join(pastaRaiz, 'llms.txt'), llmsTxt(posts, categorias, sm));
  if (site.indexnow_chave) writeFileSync(join(pastaRaiz, `${site.indexnow_chave}.txt`), site.indexnow_chave);

  // painel de gestão (/blog/admin/): página, leitor de Markdown, logo da capa e configuração
  if (site.painel) {
    const adm = join(SAIDA, 'admin');
    mkdirSync(adm, { recursive: true });
    copyFileSync(join(BASE, 'motor', 'painel.html'), join(adm, 'index.html'));
    copyFileSync(join(BASE, 'motor', 'markdown.mjs'), join(adm, 'markdown.mjs'));
    const logo = site.capa && site.capa.logo_arquivo;
    if (logo) copyFileSync(join(BASE, logo), join(adm, 'logo-capa' + logo.slice(logo.lastIndexOf('.'))));
    const todas = carregarPosts({ incluirRascunhos: true });
    const cfg = {
      nome: site.nome, dominio: site.dominio, url_base: URLB, saida: site.saida, posts_dir: 'conteudo-blog/posts',
      autor_padrao: site.autor_padrao, dominios_internos: site.dominios_internos, regras: site.regras,
      categorias: [...new Set([...(site.categorias || []), ...todas.map((p) => p.categoria)])],
      capa: { ...site.capa, fonte_titulo_canvas: site.capa.fonte_titulo, fonte_texto_canvas: site.capa.fonte_texto },
      capa_logo: logo ? 'logo-capa' + logo.slice(logo.lastIndexOf('.')) : null, fonte_google: site.capa.fonte_google,
      ...site.painel,
    };
    writeFileSync(join(adm, 'config.json'), JSON.stringify(cfg, null, 1));
  }

  return { posts: posts.length, categorias: categorias.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = gerar();
  console.log(`blog gerado: ${r.posts} post(s), ${r.categorias} categoria(s) em ${site.saida}/`);
}
