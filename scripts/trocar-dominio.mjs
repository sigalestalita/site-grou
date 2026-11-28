// Troca o domínio oficial (canonical, sitemap, og:url, dados estruturados, llms.txt) nas páginas do site.
// Provisório enquanto o grougp.com.br não aponta para a Vercel: o site se declara em https://www.grougp.com.
//   Ir:     node scripts/trocar-dominio.mjs ir      (grougp.com.br -> www.grougp.com, grava a lista de arquivos)
//   Voltar: node scripts/trocar-dominio.mjs voltar  (desfaz só nos arquivos da lista)
// Depois de qualquer um dos dois: node conteudo-blog/motor/gerar.mjs, commit e push.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';

const OFICIAL = 'https://grougp.com.br';
const PROVISORIO = 'https://www.grougp.com';
const LISTA = 'scripts/dominio-provisorio.json';
const FORA = new Set(['.git', 'node_modules', 'public', 'blog', 'api']);
const TIPOS = new Set(['.html', '.xml', '.txt', '.json']);

function arquivos(dir, saida = []) {
  for (const n of readdirSync(dir)) {
    if (FORA.has(n) || n.startsWith('.')) continue;
    const c = join(dir, n);
    if (statSync(c).isDirectory()) { if (!c.startsWith('conteudo-blog/posts') && !c.startsWith('conteudo-blog/pesquisa')) arquivos(c, saida); }
    else if (TIPOS.has(extname(n)) && c !== LISTA) saida.push(c);
  }
  return saida;
}

const modo = process.argv[2];
if (modo === 'ir') {
  const mudados = [];
  for (const f of arquivos('.')) {
    const t = readFileSync(f, 'utf8');
    if (!t.includes(OFICIAL)) continue;
    writeFileSync(f, t.split(OFICIAL).join(PROVISORIO));
    mudados.push(f);
  }
  const antes = existsSync(LISTA) ? JSON.parse(readFileSync(LISTA, 'utf8')) : [];
  writeFileSync(LISTA, JSON.stringify([...new Set([...antes, ...mudados])].sort(), null, 1) + '\n');
  console.log(`${mudados.length} arquivo(s) agora apontam para ${PROVISORIO}`);
} else if (modo === 'voltar') {
  if (!existsSync(LISTA)) { console.log('nada a desfazer'); process.exit(0); }
  const lista = JSON.parse(readFileSync(LISTA, 'utf8'));
  for (const f of lista) if (existsSync(f)) writeFileSync(f, readFileSync(f, 'utf8').split(PROVISORIO).join(OFICIAL));
  rmSync(LISTA);
  console.log(`${lista.length} arquivo(s) voltaram para ${OFICIAL}`);
} else {
  console.log('uso: node scripts/trocar-dominio.mjs ir|voltar');
}
