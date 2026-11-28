# Rotina diária do blog (para o Claude)

Duas vezes por dia (rodada da **manhã** e rodada da **tarde**), cada rodada publica 1 post: **pesquisa → pauta → post → verificação → publicação**. Leia `estrategia.md` antes de começar. Trabalhe na raiz do repositório.

## 1. Contexto (2 min)
- `ls conteudo-blog/posts` e leia o cabeçalho (titulo, palavra_chave, categoria) de todos os posts: **não repita palavra-chave nem ângulo**.
- Leia `conteudo-blog/pauta.md` (ideias guardadas) e a pesquisa dos últimos 3 dias em `conteudo-blog/pesquisa/`.
- Descubra a rodada pela hora de Brasília: antes do meio-dia é a rodada **manhã**, depois é a rodada **tarde**.
- Se o arquivo da pesquisa de hoje (`conteudo-blog/pesquisa/AAAA-MM-DD.md`) já tiver a seção `# Rodada <manhã|tarde>` desta rodada, pare: o post desta rodada já saiu.
- Na rodada da tarde, leia o post da manhã: o segundo post do dia precisa ser de **outro pilar** e de outra palavra-chave.

## 2. Pesquisa do dia (obrigatória)
Use busca na web. No mínimo 6 buscas, cobrindo:
1. **Novidades** dos pilares nos últimos 7 a 30 dias (legislação, estudos, pesquisas de mercado, notícias de RH no Brasil).
2. **Perguntas reais** das pessoas sobre 2 ou 3 palavras-chave candidatas (o que aparece em "as pessoas também perguntam", fóruns, buscas relacionadas).
3. **Concorrência**: o que ranqueia hoje para a palavra-chave escolhida (títulos, profundidade, o que falta neles). O post precisa cobrir o que eles cobrem **e** trazer algo que eles não trazem (roteiro, exemplo, tabela, dado mais recente).
4. **Fontes**: abra (leia de fato) as páginas que vai citar. Só cite número com link para a fonte original.

Escolha a pauta pela soma: aderência ao que a empresa vende + intenção de busca clara + chance de ranquear (cauda média/longa) + atualidade. Alterne os pilares ao longo da semana e nunca publique dois posts do mesmo pilar no mesmo dia.

Grave em `conteudo-blog/pesquisa/AAAA-MM-DD.md` (crie o arquivo na rodada da manhã; na rodada da tarde, **acrescente** ao final, sem apagar o que já existe) uma seção da rodada:
```
# Rodada manhã   (ou: # Rodada tarde)
## Buscas feitas
- "termo" → o que apareceu (com links)
## Achados do dia
- novidade/dado | fonte (URL)
## Palavras-chave avaliadas
| palavra-chave | intenção | concorrência (o que ranqueia) | decisão |
## Pauta escolhida
- Palavra-chave: … · Título: … · Por quê: … · Diferencial sobre os concorrentes: …
## Ideias para os próximos dias
- …
```
Acrescente as ideias boas que não usou em `pauta.md` (e risque/remova a que usou hoje).

## 3. Escrever o post
Arquivo: `conteudo-blog/posts/AAAA-MM-DD-slug.md` (data de hoje, horário de Brasília). Formato:
```
---
titulo: Título que aparece na página (com a palavra-chave)
titulo_seo: Título para o Google, até 60 caracteres
descricao: Meta description de 120 a 160 caracteres, com a palavra-chave e um benefício claro.
slug: palavra-chave-curta-em-kebab-case
data: AAAA-MM-DD
categoria: um dos pilares (ex.: Liderança)
palavra_chave: palavra-chave principal
tags: [tag 1, tag 2, tag 3]
autor: Equipe Grou
status: publicado
fontes:
  - Nome da fonte ou estudo | https://url-real
  - …
---
Primeiro parágrafo já respondendo a dúvida, com a palavra-chave.

## Seção…
…
## Perguntas frequentes
### Pergunta 1?
Resposta.
```
Regras (o verificador cobra):
- Mínimo de palavras e links internos definidos em `site.json` → `regras`. Links internos em Markdown com caminho relativo, ex.: `[Pesquisa de Clima](/tecnologias/pesquisa-de-clima/)`.
- No mínimo 4 seções `##` e um FAQ com 3+ perguntas.
- Fontes reais, abertas na pesquisa. Nada inventado: se não achou o dado, escreva sem número.
- Texto original, escrito para pessoas: exemplos concretos, nada de enchimento. Sem expressões da lista `proibidos`.
- Não use imagens externas. A capa é gerada automaticamente.

## 4. Gerar e verificar
```
node conteudo-blog/motor/publicar.mjs SLUG-DO-POST
```
Isso gera a capa, as páginas (post, listas, categorias), o feed e o sitemap, e roda o verificador. **Corrija todos os ERROS** e reavalie os avisos até passar. Abra `blog/SLUG/index.html` e confira que o texto renderizou certo.

## 5. Publicar
```
git add -A conteudo-blog blog sitemap.xml llms.txt
git commit -m "Blog: <título do post>"
git push origin HEAD:main
```
Depois siga o passo de publicação específico do site em `PUBLICACAO.md` e confirme a URL no ar (HTTP 200).

Com a URL no ar, avise os buscadores (Bing e os que usam IndexNow; o Google lê o sitemap):
```
node conteudo-blog/motor/avisar.mjs SLUG-DO-POST
```
Se responder 403, a chave ainda não está no ar no domínio: siga em frente, o sitemap cobre.

## 6. Se algo der errado
- Verificador não passa depois de 3 tentativas: salve o post com `status: rascunho`, faça commit, publique o resto e registre o motivo na pesquisa do dia.
- Push recusado por mudança remota: `git pull --rebase origin main` e tente de novo (nunca force push).
- Nunca apague posts publicados. Para tirar do ar, mude para `status: rascunho` e gere de novo.
