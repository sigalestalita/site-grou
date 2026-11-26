// Markdown enxuto para os posts do blog (sem dependências).
// Suporta: ## e ### (com âncora), parágrafos, **negrito**, *itálico*, [link](url), listas - e 1.,
// > citação, > **Destaque:** (caixa de destaque), tabelas | a | b |, --- (divisória) e `código`.

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const slugify = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

function inline(t, ctx) {
  let s = esc(t);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => {
    const u = url.replace(/&amp;/g, '&');
    const externo = /^https?:\/\//.test(u) && !(ctx.dominios || []).some((d) => u.includes(d));
    if (externo) ctx.externos.push(u); else ctx.internos.push(u);
    return `<a href="${esc(u)}"${externo ? ' target="_blank" rel="noopener"' : ''}>${txt}</a>`;
  });
  return s;
}

/** Converte o corpo do post. Devolve html, sumário (h2), perguntas do FAQ e os links encontrados. */
export function markdown(md, opcoes = {}) {
  const ctx = { externos: [], internos: [], dominios: opcoes.dominios || [] };
  const linhas = md.replace(/\r/g, '').split('\n');
  const out = []; const sumario = []; const faq = []; const ids = new Set();
  let i = 0, emFaq = false, perguntaAtual = null;
  const idDe = (t) => { let b = slugify(t) || 'secao', id = b, n = 2; while (ids.has(id)) id = `${b}-${n++}`; ids.add(id); return id; };
  const fecharPergunta = () => { if (perguntaAtual) { faq.push(perguntaAtual); perguntaAtual = null; } };

  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{2,3})\s+(.+)$/))) {
      const nivel = m[1].length, txt = m[2].trim(), id = idDe(txt);
      if (nivel === 2) {
        fecharPergunta();
        emFaq = /perguntas frequentes|d[úu]vidas frequentes|faq/i.test(txt);
        sumario.push({ id, txt });
      } else if (emFaq) { fecharPergunta(); perguntaAtual = { pergunta: txt, resposta: '' }; }
      out.push(`<h${nivel} id="${id}">${inline(txt, ctx)}</h${nivel}>`);
      i++; continue;
    }
    if (/^---+\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^\|.*\|\s*$/.test(l)) {
      const tab = [];
      while (i < linhas.length && /^\|.*\|\s*$/.test(linhas[i])) tab.push(linhas[i++]);
      const celulas = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const temCab = tab[1] && /^\|?\s*:?-{2,}/.test(tab[1]);
      const cab = temCab ? celulas(tab[0]) : null;
      const corpo = tab.slice(temCab ? 2 : 0).map(celulas);
      out.push(`<div class="tabela-rolagem"><table>${cab ? `<thead><tr>${cab.map((c) => `<th>${inline(c, ctx)}</th>`).join('')}</tr></thead>` : ''}<tbody>${corpo.map((r) => `<tr>${r.map((c) => `<td>${inline(c, ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^>\s?/.test(l)) {
      const bloco = [];
      while (i < linhas.length && /^>\s?/.test(linhas[i])) bloco.push(linhas[i++].replace(/^>\s?/, ''));
      const txt = bloco.join(' ').trim();
      const dest = txt.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
      out.push(dest
        ? `<aside class="destaque"><strong>${esc(dest[1])}</strong><p>${inline(dest[2].charAt(0).toUpperCase() + dest[2].slice(1), ctx)}</p></aside>`
        : `<blockquote><p>${inline(txt, ctx)}</p></blockquote>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ordenada = /^\s*\d+\./.test(l); const itens = [];
      while (i < linhas.length && /^\s*([-*]|\d+\.)\s+/.test(linhas[i])) {
        let item = linhas[i++].replace(/^\s*([-*]|\d+\.)\s+/, '');
        while (i < linhas.length && /^\s{2,}\S/.test(linhas[i]) && !/^\s*([-*]|\d+\.)\s+/.test(linhas[i])) item += ' ' + linhas[i++].trim();
        itens.push(`<li>${inline(item, ctx)}</li>`);
      }
      const html = `<${ordenada ? 'ol' : 'ul'}>${itens.join('')}</${ordenada ? 'ol' : 'ul'}>`;
      out.push(html);
      if (perguntaAtual) perguntaAtual.resposta += ' ' + itens.map((x) => x.replace(/<[^>]+>/g, '')).join(' ');
      continue;
    }
    const par = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#{2,3}\s|>|\||---+\s*$|\s*([-*]|\d+\.)\s+)/.test(linhas[i])) par.push(linhas[i++].trim());
    const txt = par.join(' ');
    out.push(`<p>${inline(txt, ctx)}</p>`);
    if (perguntaAtual) perguntaAtual.resposta += ' ' + inline(txt, ctx).replace(/<[^>]+>/g, '');
  }
  fecharPergunta();
  faq.forEach((f) => { f.resposta = f.resposta.trim(); });
  return { html: out.join('\n'), sumario, faq: faq.filter((f) => f.resposta), externos: ctx.externos, internos: ctx.internos };
}

/** Front matter simples: chave: valor, listas "- item" e [a, b]. */
export function lerPost(texto) {
  const m = texto.replace(/\r/g, '').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('post sem cabeçalho (--- ... ---)');
  const dados = {}; let chaveLista = null;
  for (const linha of m[1].split('\n')) {
    if (!linha.trim()) continue;
    const item = linha.match(/^\s+-\s+(.*)$/);
    if (item && chaveLista) { dados[chaveLista].push(item[1].trim()); continue; }
    const kv = linha.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v === '') { dados[k] = []; chaveLista = k; continue; }
    chaveLista = null;
    if (/^\[.*\]$/.test(v)) dados[k] = v.slice(1, -1).split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    else dados[k] = v.replace(/^["']|["']$/g, '');
  }
  return { dados, corpo: m[2].trim() };
}
