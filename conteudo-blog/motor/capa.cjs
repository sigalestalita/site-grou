// Gera a capa (1200 x 630, JPG) de cada post que ainda não tem, com a identidade do site.
// Uso: node conteudo-blog/motor/capa.cjs   (precisa do Playwright com Chromium; no ambiente do Claude já existe)
const { readFileSync, readdirSync, existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

(async () => {
  const RAIZ = process.cwd();
  const BASE = join(RAIZ, 'conteudo-blog');
  const site = JSON.parse(readFileSync(join(BASE, 'site.json'), 'utf8'));
  const { lerPost, slugify, esc } = await import(join(BASE, 'motor', 'markdown.mjs'));
  const c = site.capa;
  const logo = c.logo_arquivo ? `data:${c.logo_arquivo.endsWith('.svg') ? 'image/svg+xml' : 'image/png'};base64,${readFileSync(join(BASE, c.logo_arquivo)).toString('base64')}` : '';
  const pendentes = readdirSync(join(BASE, 'posts')).filter((f) => f.endsWith('.md')).map((f) => {
    const { dados } = lerPost(readFileSync(join(BASE, 'posts', f), 'utf8'));
    return { ...dados, slug: dados.slug || slugify(dados.titulo) };
  }).filter((p) => !existsSync(join(RAIZ, site.saida, p.slug, 'capa.jpg')) || process.argv.includes('--todas'));
  if (!pendentes.length) { console.log('capas: nada a gerar'); return; }

  let chromium;
  try { ({ chromium } = require('playwright')); } catch { console.log('capas: Playwright indisponível, posts ficam com a imagem padrão'); return; }
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const p of pendentes) {
    const titulo = p.titulo.length > 90 ? p.titulo.slice(0, 87) + '…' : p.titulo;
    const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=${c.fonte_google}&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}html,body{margin:0}
body{width:1200px;height:630px;overflow:hidden;position:relative;font-family:${c.fonte_texto};color:${c.texto};
background:radial-gradient(700px 420px at 92% 8%, ${c.brilho}, transparent 62%),radial-gradient(640px 520px at 0% 100%, ${c.brilho2}, transparent 60%),linear-gradient(150deg, ${c.fundo2} 0%, ${c.fundo} 70%)}
.grade{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:60px 60px;mask-image:linear-gradient(120deg,transparent 30%,#000)}
.topo{position:absolute;left:72px;top:64px;right:72px;display:flex;justify-content:space-between;align-items:center}
.topo img{height:${c.logo_altura || 40}px}
.cat{font-size:20px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${c.destaque};border:2px solid ${c.destaque};padding:8px 16px;border-radius:999px}
h1{position:absolute;left:72px;right:110px;bottom:118px;margin:0;font-family:${c.fonte_titulo};font-weight:${c.peso_titulo || 600};font-size:${titulo.length > 60 ? 56 : 64}px;line-height:1.08;letter-spacing:-.02em;text-wrap:balance}
.rodape{position:absolute;left:72px;bottom:58px;font-size:22px;opacity:.75}
.barra{position:absolute;left:72px;bottom:96px;width:120px;height:6px;border-radius:6px;background:${c.destaque}}
</style></head><body><div class="grade"></div>
<div class="topo">${logo ? `<img src="${logo}" alt="">` : `<strong>${esc(site.nome)}</strong>`}<span class="cat">${esc(p.categoria || 'Blog')}</span></div>
<h1>${esc(titulo)}</h1><div class="barra"></div><div class="rodape">${esc(site.dominio.replace(/^https?:\/\//, ''))}/blog</div>
</body></html>`;
    await pg.setContent(html, { waitUntil: 'networkidle' }).catch(() => {});
    await pg.waitForTimeout(300);
    const dir = join(RAIZ, site.saida, p.slug);
    mkdirSync(dir, { recursive: true });
    await pg.screenshot({ path: join(dir, 'capa.jpg'), type: 'jpeg', quality: 86 });
    console.log('capa:', p.slug);
  }
  await b.close();
})();
