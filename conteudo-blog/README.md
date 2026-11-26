# Blog da Grou · como funciona

Todo dia, de manhã, um agente do Claude faz uma pesquisa (novidades, perguntas reais das pessoas, concorrência no Google), escolhe uma pauta, escreve um post e publica em https://grougp.com.br/blog/.

## Onde fica cada coisa
- `posts/` → os posts, um arquivo Markdown por post (`AAAA-MM-DD-slug.md`). **Este é o CMS.**
- `pesquisa/` → a pesquisa de cada dia (o que foi buscado, achados e por que a pauta foi escolhida).
- `pauta.md` → ideias guardadas. Coloque no topo o que quer que saia primeiro.
- `estrategia.md` → público, pilares, palavras-chave, links internos e tom de voz. O agente segue isso.
- `AGENTE.md` → a rotina diária do agente.
- `site.json` → configurações (nome, CTA, cores da capa, regras do verificador).
- `motor/` → o gerador (não precisa mexer).

## Tarefas comuns (dá pra fazer direto no GitHub, editando o arquivo)
- **Corrigir um texto:** edite o `.md` do post em `posts/` e peça ao Claude para "regenerar o blog" (ou rode `node conteudo-blog/motor/publicar.mjs`).
- **Tirar um post do ar:** troque `status: publicado` por `status: rascunho` e regenere.
- **Agendar:** um post com `data` no futuro só aparece a partir desse dia (na próxima geração).
- **Sugerir pauta:** escreva no topo de `pauta.md`.
- **Trocar o CTA do fim dos posts:** `site.json` → `cta`.

## O que o gerador produz
Página de cada post (com sumário, fontes, FAQ, posts relacionados, dados estruturados BlogPosting/FAQ/Breadcrumb e capa 1200×630), lista do blog com paginação, páginas de categoria, `feed.xml` e o trecho do blog dentro de `sitemap.xml`.
