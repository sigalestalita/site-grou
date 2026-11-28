// Avisa os buscadores (IndexNow: Bing, que alimenta o ChatGPT e o Copilot, Yandex, Seznam e outros) que há página nova ou atualizada.
// O Google não usa IndexNow: para ele, o sitemap com <lastmod> já basta.
// Uso, DEPOIS de confirmar o post no ar: node conteudo-blog/motor/avisar.mjs SLUG [OUTRO-SLUG...]
// Sem slug: avisa os posts publicados ou atualizados nos últimos 3 dias.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { carregarPosts } from './gerar.mjs';

const site = JSON.parse(readFileSync(join(process.cwd(), 'conteudo-blog', 'site.json'), 'utf8'));
const DOM = site.dominio.replace(/\/$/, '');
const chave = site.indexnow_chave;
if (!chave) { console.log('sem indexnow_chave no site.json: nada a avisar'); process.exit(0); }

const posts = carregarPosts();
const slugs = process.argv.slice(2);
const limite = new Date(Date.now() - 3 * 86400e3).toISOString().slice(0, 10);
const escolhidos = slugs.length ? posts.filter((p) => slugs.includes(p.slug)) : posts.filter((p) => p.atualizado >= limite || p.data >= limite);
const faltam = slugs.filter((s) => !posts.some((p) => p.slug === s));
if (faltam.length) console.log(`não encontrei publicado: ${faltam.join(', ')}`);
if (!escolhidos.length) { console.log('nenhum post para avisar'); process.exit(0); }

const urls = [...escolhidos.map((p) => DOM + p.url), DOM + site.url_base, DOM + site.url_base + 'feed.xml'];
const corpo = { host: new URL(DOM).host, key: chave, keyLocation: `${DOM}/${chave}.txt`, urlList: urls };
try {
  const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(corpo) });
  // 200 e 202 = recebido; 403 = a chave ainda não está no ar no domínio; 422 = URL fora do domínio
  const ok = r.status === 200 || r.status === 202;
  console.log(`IndexNow: ${r.status} ${ok ? 'recebido' : (await r.text()).slice(0, 200)} · ${urls.length} URL(s)`);
} catch (e) {
  console.log(`IndexNow não respondeu (${e.message}). O post já está no sitemap; dá para tentar de novo depois.`);
}
