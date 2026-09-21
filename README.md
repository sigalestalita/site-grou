# Grou — site institucional

Site estático da Grou — um ecossistema de soluções para gestão de pessoas.
HTML + CSS + JS puros, **sem build e sem dependências**.

## Rodar localmente

```sh
python3 -m http.server 8080
```

E abra <http://localhost:8080>. (Abrir o `index.html` direto pelo `file://` não
funciona: os links e os assets usam caminhos absolutos a partir da raiz.)

## Publicar

Hospedado na **Vercel**, a partir da raiz do repositório. Não há build: a Vercel
serve os arquivos como estão.

Ao importar o projeto:

- **Framework Preset:** Other
- **Build Command:** vazio
- **Output Directory:** vazio (a raiz)
- **Install Command:** vazio

O `vercel.json` já cuida do resto:

- `trailingSlash: true` — alinha as URLs com as `<link rel="canonical">` das
  páginas, que usam barra no final (`/avaliacoes/pda-assessment/`).
- Cabeçalhos de segurança em todas as rotas.
- Cache de 10 minutos com `stale-while-revalidate` em `/assets/`.

> O cache é curto de propósito: `grou.css` e `grou.js` têm nome fixo, sem hash.
> Um cache longo faria uma edição demorar a aparecer. Se um dia quiser cache
> longo, renomeie os arquivos a cada release (`grou.abc123.css`) e só então use
> `max-age=31536000, immutable`.

O `404.html` na raiz é servido automaticamente nas rotas inexistentes.

Qualquer outra hospedagem estática também serve (Netlify, Cloudflare Pages,
GitHub Pages) — sem build, apontando para a raiz.

### Domínio próprio

O site usa **caminhos absolutos** (`/assets/...`, `/avaliacoes/...`), então
precisa ser servido na **raiz de um domínio**. Funciona no domínio próprio e no
`*.vercel.app`; não funciona num subcaminho (`exemplo.com/site/`). Para servir
num subcaminho seria preciso converter os caminhos para relativos.

## Estrutura

```
index.html                                   Home — o ecossistema
404.html                                     Página de erro
consulting/                                  Hub dos 14 serviços, em 2 categorias
  master-lider/                              Tema visual próprio (ver abaixo)
  lider-360/ nr1-liderancas/ lideranca-assertiva/ pda-para-lideres/
  assessment-40/ capacitacao-pda/ entrevista-competencias/
  vendas-comportamental/ team-building/ pdi-com-pda/
  mentoria-comportamental/ sensibilizacao-pda/ devolutiva-pda/
tecnologias/                                 Hub de assessment
  pda-assessment/                            PDA
  questionario-de-resiliencia/               QR
  dilemas-de-gestao/                         DG
  feedback-360/                              Fora do menu (ver nota)
recrutamento-e-selecao/                      GrouTalent
conteudo/                                    Podcast, vídeo e blog
contato/                                     Formulário e canais
assets/css/grou.css                          Sistema de design inteiro
assets/js/grou.js                            Camada de movimento e interação
assets/img/                                  Fotos, logos e prints
sitemap.xml  robots.txt  vercel.json
```

## Os cinco pilares

A navegação segue os pilares da apresentação comercial:

| # | Pilar | Onde |
|---|---|---|
| 01 | A Grou | home |
| 02 | Consulting | `/consulting/` — 14 serviços |
| 03 | Tecnologias de Assessment | `/tecnologias/` — PDA, QR, DG |
| 04 | Coaching | link externo para a Self Guru |
| 05 | Recrutamento e Seleção | `/recrutamento-e-selecao/` — GrouTalent |

**Coaching** é um link externo, não uma página do site: aponta para o material
da Self Guru. Trocar a URL em `COACHING_URL`, no topo do bloco de navegação.

**Feedback 360º** existe como página e está linkado no hub de Tecnologias, mas
fica **fora do menu** — o pilar de Tecnologias define três produtos (PDA, QR e
DG). Para promovê-lo, basta adicioná-lo a `TECNOLOGIAS`.

O conteúdo das 14 páginas de serviço (objetivo, conteúdo programático, dores
que resolve, diferenciais, carga horária, formato e investimento) veio da
apresentação comercial da Grou.

Cada página é um HTML completo e independente: o menu e o rodapé estão escritos
em cada arquivo. Ao mexer na navegação ou no rodapé, replique a mudança em todas
as páginas.

## Identidade visual

Definida em variáveis CSS no topo de `assets/css/grou.css`:

| Papel | Variável | Valor |
|---|---|---|
| Azul institucional | `--azul-noite` | `#07033a` |
| Azul royal | `--azul-royal` | `#120573` |
| Ciano (destaque) | `--ciano` | `#6cd8cf` |
| Ciano (texto/ícone) | `--ciano-forte` | `#12a594` |
| Ação (fundo claro) | `--acao` | `#120573` |
| Ação (hover/gradiente) | `--acao-clara` | `#1d0f9e` |
| Tinta (títulos) | `--tinta` | `#0c0a2e` |
| Névoa (fundo alt.) | `--nevoa` | `#f4f6fb` |

Tipografia: **Poppins** (200–600) com **Montserrat** de apoio, via Google Fonts.
Títulos usam peso 200 com `<b>` em 600 — é esse contraste que dá o tom premium.

### O menu do Consulting

Catorze itens num dropdown não cabem de jeito nenhum. O menu mostra **só as
duas categorias** (`CATEGORIAS`, em `shared.py`) mais "ver todos" — três itens,
o mesmo formato do dropdown de Tecnologias. Cada categoria tem página própria
listando os seus serviços.

Isso foi escolhido também por robustez: se o CSS não carregar, o menu degrada
para uma lista de 3 links em vez de uma parede de 15.

Para mover um serviço de categoria, troque-o de lista em `CATEGORIAS` — o menu,
a gaveta mobile, o hub, as páginas de categoria e a seção "mesma categoria" de
cada serviço acompanham sozinhos.

### Tema visual do Master Líder

O Master Líder é o programa principal e tem **identidade própria**, herdada de
`masterlider.grougp.com.br`: fundo quase preto com azul elétrico (`#0055ff`)
para ciano (`#00d4ff`).

Isso vive num escopo `[data-tema="master"]` no fim do CSS, que só redefine os
tokens da paleta — o resto do site segue com as cores da Grou. Para dar tema a
outra página, passe `tema="master"` para `pagina()`, ou crie um novo bloco de
escopo no mesmo modelo.

A página é gerada por `p_master.py`, à parte do gerador dos outros 13 serviços,
porque tem seções que só ela tem (5 pilares, trilha de 16 módulos, bloco NR-1).

**O lockup do hero** (`.ml-marca`) não é uma imagem recortada: o monograma é
`assets/img/master-lider-marca.svg`, vetorizado a partir do logo oficial, e a
assinatura é texto real numa pílula de CSS. Por isso o conjunto é transparente,
nítido em qualquer tamanho e herda a cor do tema. Recortar o material de origem
deixaria franja do gradiente e texto rasterizado.

Cores da assinatura, medidas na arte original: texto `#275df6` (usamos `#3b6dff`,
um pouco mais claro, para legibilidade) e pílula sobre fundo `#0c1330`.

### Formas de apresentar conteúdo

Grade de cards não é a única forma — e repetida demais cansa. Os componentes
disponíveis, e quando usar cada um:

| Componente | Quando | Onde já está |
|---|---|---|
| `.horiz` | sequência ou catálogo com 5+ itens | Master Líder (pilares), PDA (relatórios e turmas), R&S (5 etapas), categorias do Consulting |
| `.linha-tempo` | jornada com ordem cronológica | Master Líder (16 módulos) |
| `.lista-exp` | lista longa em que o título já informa | Master Líder (benefícios), diferenciais dos serviços |
| `.lista-num` | conteúdo programático | páginas de serviço (escopo) |
| `.passos` | narrativa passo a passo com visual | home e PDA (como funciona) |
| `.grade` + `.cartao` | itens paralelos, sem ordem, até 4 | o resto |

**`.horiz`** é a horizontalização: a seção fica presa na tela e o trilho anda
para o lado conforme a página desce, com barra de progresso e contador. O JS
calcula a altura da seção a partir da largura do trilho, então acrescentar itens
não exige ajuste. No mobile vira carrossel nativo com `scroll-snap`; sob
`prefers-reduced-motion` vira uma faixa rolável comum — nos dois casos sem
sticky e sem altura forçada.

**`.linha-tempo`** preenche a linha e acende os marcadores conforme os blocos
entram na viewport.

Cards também têm **inclinação 3D** acompanhando o cursor (`.inclina`, aplicada
pelo JS), desligada em telas sem hover e sob movimento reduzido.

### Vídeos das etapas do PDA

As etapas 01 a 03 do "Como funciona", em `/tecnologias/pda-assessment/`, são
screencasts reais da plataforma (`assets/video/etapa{1,2,3}.mp4`, H.264, ~2,1 MB
no total). A etapa 04 continua sendo um mockup, porque mostra um e-mail.

Carregamento: **só o vídeo da etapa visível baixa**. O primeiro tem `autoplay`
e `preload="metadata"`; os outros dois não têm `autoplay` e ficam em
`preload="none"` até o JS trocar de etapa — aí ele sobe o preload e dá play,
pausando o anterior.

> O `autoplay` sobrepõe o `preload="none"`: deixar autoplay nos três fazia o
> navegador baixar os 2,1 MB de uma vez, no primeiro acesso. Por isso só o
> primeiro tem autoplay.

Todos são `muted`, `loop` e `playsinline` — sem áudio e sem abrir em tela cheia
no iOS. O efeito Ken Burns é desligado sob `prefers-reduced-motion`; o loop em
si continua, por ser o conteúdo que explica o produto.

**A etapa 03 tem tratamento próprio.** O arquivo é 760×468, bem menor que os
outros dois (1280×782). Com `object-fit:cover` mais Ken Burns, ele era ampliado
**2,03×** numa tela Retina — daí o borrão. Agora ele vai dentro de uma moldura
de janela (`.passo-janela`), com `object-fit:contain`, largura máxima de 600px
e sem Ken Burns: a ampliação cai para **1,58×**. Ao trocar o vídeo por um de
resolução maior, dá para voltar ao tratamento dos outros dois.

**A etapa 04** mostra os relatórios disponíveis na plataforma (`.mk-plat`) —
não chegando por e-mail: é ali que o RH acessa. A linguagem da seção é para o
RH, não para quem responde a avaliação.

## Cache e versionamento

Os links de CSS e JS levam a **hash do conteúdo** (`grou.css?v=ebb388a8`),
gerada em `shared.py`. Quando o arquivo muda, o link muda, e navegador e CDN
buscam a versão nova na hora.

Isso existe porque o contrário já quebrou o site em produção: um
`stale-while-revalidate=86400` no `vercel.json` autorizava o navegador a servir
CSS de até **24 horas atrás**, então um deploy podia chegar com o HTML novo e o
CSS velho — e o layout quebrava. O header agora é
`public, max-age=3600, must-revalidate`, sem servir cópia velha, e o hash cobre
o resto.

**Ao editar `grou.css` ou `grou.js` à mão**, regenere as páginas para atualizar
o hash. Sem isso, o link continua apontando para a versão anterior.

## Imagens

Todas em `assets/img/`, otimizadas (redimensionadas e recomprimidas), ~1,6 MB no total.

```
hero-time-rh.webp        Foto do hero (com transparência)
clientes/                18 logos de clientes, brancos, para fundo escuro
relatorios/              6 prints reais de relatórios do PDA Assessment
turmas/                  8 fotos de turmas e devolutivas que já aconteceram
certificado.jpg          Certificado de Analista PDA
marston.jpg              William Moulton Marston
disc.png  pda.png        Marcas usadas no comparativo DISC × PDA
logo-pda.svg             PDA International
logo-talogy.svg          Talogy
mulher-notebook.webp     Foto de apoio
skills-retrato.webp      Foto de apoio (Grou Skills)
resiliencia-componentes.webp / dilemas-tela.webp / f360-*.webp
```

São 13 marcas. Os **logos de clientes são brancos sobre transparência**, feitos para a faixa
`.logos`, que tem fundo `--azul-noite`. Não os use sobre fundo claro sem
inverter. A lista e a altura de cada marca ficam em `CLIENTES`, no topo do
bloco de logos de cada página — cada marca tem altura própria para que todas
pareçam do mesmo tamanho óptico.

As fotos de turmas têm legenda real (quem, onde, qual formação). Ao trocar uma
foto, troque a legenda junto: elas documentam entregas que de fato aconteceram.

Toda `<img>` tem `alt` descritivo e `loading="lazy"` (menos a do hero, que usa
`fetchpriority="high"` por ser a maior imagem acima da dobra).

### Nada de laranja

A paleta **não tem laranja**. A cor de ação é o azul royal sobre fundo claro e o
**ciano sobre fundo escuro** — `.faixa`, `.rodape` e `.sec.escura` trocam o
`.btn-primario` para ciano com texto azul-noite automaticamente, porque um botão
azul desapareceria ali. Contraste: 16,2:1 no claro e 11,4:1 no escuro.

### Camadas do hero

O palco do hero tem `z-index` **explícito** em cada camada (anel 0, disco 1,
núcleo 2, foto 3, cartões 4). Sem isso, navegadores divergem no empilhamento
quando `transform`/`animation` promovem camadas, e o disco branco chega a ser
pintado por cima da foto. Quando há foto (`.palco.com-foto`), o disco e o núcleo
são escondidos: a foto já traz o próprio halo.

## Movimento

Tudo em `assets/js/grou.js`, sem bibliotecas. Um único `requestAnimationFrame`
atende todos os leitores de rolagem.

- `data-reveal="up|left|right|scale|blur"` — revelação na entrada da viewport.
- `data-stagger="90"` num contêiner — escalona os filhos de 90 em 90 ms.
- `data-parallax="0.15"` — parallax; negativo inverte o sentido.
- `data-contar="2000"` + `data-pre="+"` — contador animado, formatado em pt-BR.
- `class="palavras"` — revelação palavra a palavra.
- `.passos` — seção de rolagem fixa (scrollytelling); vira carrossel no mobile.

Todo o movimento é desligado sob `prefers-reduced-motion: reduce`.

## Editar

- **Textos e seções**: direto no HTML de cada página.
- **Cores, espaçamentos, componentes**: `assets/css/grou.css`.
- **Contatos** (telefone, WhatsApp, e-mail, endereço): aparecem no rodapé de
  todas as páginas e na página `contato/`.
- **Formulário de contato**: o atributo `data-email` no `<form>` define o
  destinatário. O envio abre o aplicativo de e-mail do visitante com a mensagem
  preenchida — não há back-end. Para receber no servidor, troque o `submit` em
  `grou.js` (bloco 13) por um POST para o seu endpoint.
