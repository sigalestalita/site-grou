# Grou — site institucional

Site estático da Grou, a HR Tech especialista em gestão comportamental.
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
index.html                                   Home
404.html                                     Página de erro
avaliacoes/                                  Hub de soluções
  pda-assessment/                            PDA Assessment
  feedback-360/                              Feedback 360º
  dilemas-de-gestao/                         Dilemas de Gestão
  questionario-de-resiliencia/               Questionário de Resiliência
grou-skills/                                 Hub da Grou Skills
  certificacoes-e-capacitacoes/              Certificação de Analista PDA
  programa-de-desenvolvimento/               Liderança assertiva
  workshops/                                 PDA para líderes, autogestão, team building
  mentorias-e-assessment/                    Assessment 4.0 e mentoria
  devolutivas/                               Devolutivas individuais e em grupo
conteudo/                                    Podcast, vídeo e blog
contato/                                     Formulário e canais de contato
assets/css/grou.css                          Sistema de design inteiro
assets/js/grou.js                            Camada de movimento e interação
assets/img/                                  Logo e favicon (SVG)
sitemap.xml  robots.txt
```

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
| Laranja (ação) | `--laranja-energia` | `#ff5700` |
| Laranja claro | `--laranja-claro` | `#ff9431` |
| Tinta (títulos) | `--tinta` | `#0c0a2e` |
| Névoa (fundo alt.) | `--nevoa` | `#f4f6fb` |

Tipografia: **Poppins** (200–600) com **Montserrat** de apoio, via Google Fonts.
Títulos usam peso 200 com `<b>` em 600 — é esse contraste que dá o tom premium.

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

Os **logos de clientes são brancos sobre transparência**, feitos para a faixa
`.logos`, que tem fundo `--azul-noite`. Não os use sobre fundo claro sem
inverter. A lista e a altura de cada marca ficam em `CLIENTES`, no topo do
bloco de logos de cada página — cada marca tem altura própria para que todas
pareçam do mesmo tamanho óptico.

As fotos de turmas têm legenda real (quem, onde, qual formação). Ao trocar uma
foto, troque a legenda junto: elas documentam entregas que de fato aconteceram.

Toda `<img>` tem `alt` descritivo e `loading="lazy"` (menos a do hero, que usa
`fetchpriority="high"` por ser a maior imagem acima da dobra).

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
