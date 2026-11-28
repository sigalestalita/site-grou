# Publicação · site da Grou

> **Domínio provisório (desde 28/11/2026):** enquanto a cipnet não aponta o grougp.com.br para a Vercel, o site se declara em `https://www.grougp.com` (canonical, sitemap, llms.txt). Confira os posts em `https://www.grougp.com/blog/SLUG/`. Quando o DNS mudar: `node scripts/trocar-dominio.mjs voltar`, `node conteudo-blog/motor/gerar.mjs`, commit e push; depois o grougp.com e o www.grougp.com passam a redirecionar para o grougp.com.br na Vercel.

- Saída: `blog/` (páginas estáticas) + `sitemap.xml` na raiz.
- O site está na Vercel ligado ao branch `main`: o `git push origin HEAD:main` já publica. Aguarde 1 a 2 minutos.
- Confirme no ar: `curl -s -o /dev/null -w "%{http_code}" https://grougp.com.br/blog/SLUG/` deve dar 200 (e `https://grougp.com.br/blog/` deve listar o post).
- A pasta `conteudo-blog/` não é publicada (está no `.vercelignore`).
