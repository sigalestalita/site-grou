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

Qualquer hospedagem estática serve a pasta raiz do repositório:

- **Cloudflare Pages** (recomendado): conectar este repo, *build command* vazio,
  *output directory* `/`. O `404.html` é servido automaticamente.
- Netlify / Vercel: mesmo esquema, sem build.

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
