// Confere qualidade e SEO dos posts antes de publicar. Sai com código 1 se houver erro.
// Uso: node conteudo-blog/motor/verificar.mjs [slug]   (sem slug: confere todos)
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { carregarPosts } from './gerar.mjs';

const RAIZ = process.cwd();
const site = JSON.parse(readFileSync(join(RAIZ, 'conteudo-blog', 'site.json'), 'utf8'));
const regras = site.regras;
const alvo = process.argv[2];
const todos = carregarPosts({ incluirRascunhos: true });
const posts = alvo ? todos.filter((p) => p.slug === alvo) : todos;
if (alvo && !posts.length) { console.error(`post "${alvo}" não encontrado`); process.exit(1); }

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let erros = 0, avisos = 0;
for (const p of posts) {
  const e = [], a = [];
  const kw = norm(p.palavra_chave);
  const primeiroPar = norm(p.corpo.split(/\n\s*\n/).find((b) => b.trim() && !b.startsWith('#')) || '');
  if (!p.titulo) e.push('falta título');
  if (!p.descricao) e.push('falta descrição');
  if (!p.palavra_chave) e.push('falta palavra_chave');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.data || '')) e.push('data inválida (use AAAA-MM-DD)');
  if ((p.titulo_seo || '').length > 65) a.push(`título SEO com ${p.titulo_seo.length} caracteres (ideal até 60)`);
  if (p.descricao && (p.descricao.length < 110 || p.descricao.length > 165)) a.push(`descrição com ${p.descricao.length} caracteres (ideal 120 a 160)`);
  if (kw && !norm(p.titulo_seo).includes(kw) && !norm(p.titulo).includes(kw)) a.push('palavra-chave fora do título');
  if (kw && !primeiroPar.includes(kw)) a.push('palavra-chave fora do primeiro parágrafo');
  if (kw && !p.sumario.some((s) => norm(s.txt).includes(kw.split(' ')[0]))) a.push('nenhum H2 com a palavra-chave');
  if (p.palavras < regras.palavras_min) e.push(`texto curto: ${p.palavras} palavras (mínimo ${regras.palavras_min})`);
  if (p.sumario.length < 4) e.push(`só ${p.sumario.length} seções H2 (mínimo 4)`);
  const internosSite = p.internos.filter((u) => u.startsWith('/') || site.dominios_internos.some((d) => u.includes(d)));
  if (internosSite.length < regras.links_internos_min) e.push(`só ${internosSite.length} link(s) interno(s) (mínimo ${regras.links_internos_min})`);
  if (p.fontes.length < regras.fontes_min) e.push(`só ${p.fontes.length} fonte(s) (mínimo ${regras.fontes_min})`);
  if (p.fontes.some((f) => !/^https?:\/\//.test(f.url))) e.push('fonte sem URL (use "Título | https://...")');
  if (p.faq.length < 3) e.push(`FAQ com ${p.faq.length} pergunta(s) (mínimo 3, em "## Perguntas frequentes" com ### por pergunta)`);
  if (!/^[a-z0-9-]{3,80}$/.test(p.slug) || ['admin', 'categoria', 'pagina'].includes(p.slug)) e.push('slug inválido');
  if (todos.filter((o) => o.slug === p.slug).length > 1) e.push('slug repetido');
  if (todos.filter((o) => o.slug !== p.slug && kw && norm(o.palavra_chave) === kw).length) a.push('outra matéria já usa a mesma palavra-chave (risco de canibalização)');
  const textoNorm = ' ' + norm(p.corpo + ' ' + p.titulo).replace(/[^a-z0-9]+/g, ' ') + ' ';
  for (const t of regras.proibidos) if (textoNorm.includes(' ' + norm(t).replace(/[^a-z0-9]+/g, ' ').trim() + ' ')) e.push(`expressão proibida: "${t}"`);
  if (/como (um|uma) (ia|modelo de linguagem|assistente)/i.test(p.corpo)) e.push('texto com marca de IA');
  if (p.status === 'publicado' && !existsSync(join(RAIZ, site.saida, p.slug, 'capa.jpg'))) a.push('sem capa (rode motor/capa.cjs)');
  if (e.length || a.length) {
    console.log(`\n${p.slug}`);
    e.forEach((x) => console.log('  ERRO   ' + x)); a.forEach((x) => console.log('  aviso  ' + x));
  }
  erros += e.length; avisos += a.length;
}
console.log(`\nverificados ${posts.length} post(s): ${erros} erro(s), ${avisos} aviso(s)`);
process.exit(erros ? 1 : 0);
