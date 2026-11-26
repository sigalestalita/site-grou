// Build da Vercel (site estático da Grou): gera o blog e monta a pasta public/ com o site,
// sem as fontes do blog (conteudo-blog/) nem arquivos internos.
import { cpSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { gerar } from './gerar.mjs';

const r = gerar();
console.log(`blog gerado: ${r.posts} post(s)`);
const FORA = new Set(['public', 'api', 'conteudo-blog', 'node_modules', 'scripts', 'vercel.json', 'package.json', 'package-lock.json', 'README.md']);
rmSync('public', { recursive: true, force: true });
mkdirSync('public');
for (const nome of readdirSync('.')) {
  if (FORA.has(nome) || nome.startsWith('.')) continue;
  cpSync(nome, 'public/' + nome, { recursive: true });
}
console.log('site copiado para public/');
