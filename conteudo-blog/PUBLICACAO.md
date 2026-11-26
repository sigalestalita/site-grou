# Publicação · site da Grou

- Saída: `blog/` (páginas estáticas) + `sitemap.xml` na raiz.
- O site está na Vercel ligado ao branch `main`: o `git push origin HEAD:main` já publica. Aguarde 1 a 2 minutos.
- Confirme no ar: `curl -s -o /dev/null -w "%{http_code}" https://grougp.com.br/blog/SLUG/` deve dar 200 (e `https://grougp.com.br/blog/` deve listar o post).
- A pasta `conteudo-blog/` não é publicada (está no `.vercelignore`).
