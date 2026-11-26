// Passo único do dia: capas -> páginas -> verificação. Uso: node conteudo-blog/motor/publicar.mjs [slug-do-post-novo]
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const motor = join(process.cwd(), 'conteudo-blog', 'motor');
const rodar = (arq, args = []) => execFileSync(process.execPath, [join(motor, arq), ...args], { stdio: 'inherit' });
rodar('capa.cjs');
rodar('gerar.mjs');
rodar('verificar.mjs', process.argv.slice(2));
