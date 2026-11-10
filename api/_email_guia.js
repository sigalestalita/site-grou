/* E-mail "Falta pouco" do NR-1 Estratégica, com o Guia do Inscrito em anexo (PDF publicado em /assets).
   Disparado em 09 e 10/11 para todos os inscritos; o painel de gestão usa este mesmo modelo para reenviar
   a quem não recebeu ou corrigiu o e-mail. Foco no conteúdo e na programação (não fala do lançamento do Lumi). */
const SITE = 'https://www.grougp.com';
const EVENTO_URL = SITE + '/evento/nr1-estrategica/';
const IMG = SITE + '/assets/evento/nr1-estrategica/email/';
const ENDERECO = 'Instituto Caldeira, Tv. São José, 455 - Navegantes, Porto Alegre - RS';
const MAPA = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ENDERECO);
const AGENDA = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  + '&text=' + encodeURIComponent('NR-1 Estratégica · Grou')
  + '&dates=20261112T163000Z/20261112T220000Z'
  + '&details=' + encodeURIComponent('Credenciamento e welcome coffee às 13h30, abertura às 14h. Programação: ' + EVENTO_URL)
  + '&location=' + encodeURIComponent(ENDERECO);
const WHATS = 'https://wa.me/5551991892049';
const WHATS_TXT = '(51) 99189-2049';
const CONTATO = 'atendimento@grougp.com.br';
const GUIA_NOME = 'Guia do Inscrito - NR-1 Estratégica.pdf';

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const primeiro = (nome) => {
  const p = String(nome || '').trim().split(/\s+/)[0] || '';
  if (!p || p.includes('@') || p.length < 2) return '';
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '';
};

const F = "'Poppins',Arial,Helvetica,sans-serif";
const NAVY = '#07033a', ROXO = '#120573', TEAL = '#12a594', TEAL_CLARO = '#6cd8cf', TXT = '#0c0a2e', MUT = '#4a4868', CINZA = '#8a88a3', FUNDO = '#f4f5fa', LINHA = '#e6e5ef';

const assunto = 'Evento NR1 estratégica: falta pouco';
const preheader = 'A programação, o que você leva dessa tarde e o Guia do Inscrito em anexo. Quinta, 12/11, no Instituto Caldeira.';

/* programação oficial, sem o horário de lançamento */
const PROGRAMA = [
  ['13h30', 'Welcome coffee e credenciamento', '', ''],
  ['14h', 'Abertura do NR-1 Estratégica', 'Mariana Uebel · CEO da Grou', 'mariana-uebel'],
  ['14h15', 'Análise de perfil comportamental e risco físico: o case Suzano', 'Amanda Zica · Suzano, com mediação de Luciana Masiero · Grou', 'amanda-zica'],
  ['15h', 'NR-1: o que muda e o que a lei exige?', 'Fernanda Woodhead · Juíza do Trabalho (TRT-4)', 'fernanda-woodhead'],
  ['15h30', 'Performance sustentável começa com saúde mental', 'Carolina Fuhrmeister', 'carolina-fuhrmeister'],
  ['16h05', 'Coffee break e networking', '', ''],
  ['16h35', 'Segurança psicológica como resposta ao risco psicossocial', 'Alessandra Becker · FALE Consultoras', 'alessandra-becker'],
  ['17h05', 'Dados, RH estratégico e saúde mental', 'Tamy Freitas · Hunu', 'tamy-freitas'],
  ['18h', 'Ressignificando o trabalho após três burnouts', 'Bruna Salazar', 'bruna-salazar'],
  ['18h20', 'Quando o adoecimento mental chega à Justiça do Trabalho: a sentença repara, não devolve', 'Camila Leal Lima · Juíza do Trabalho (TRT-1)', 'camila-leal-lima'],
  ['Após', 'Encerramento e networking, até as 19h', '', '']
];

const LEVA = [
  ['A lei', 'O que a NR-1 exige de verdade', 'Explicado por quem julga: Fernanda Woodhead, juíza do Trabalho (TRT-4).'],
  ['O case', 'Perfil comportamental e risco na operação', 'Como a Suzano cruzou os dois, com Amanda Zica.'],
  ['A prática', 'Do diagnóstico ao plano de ação', 'Segurança psicológica e dados de RH, com Alessandra Becker e Tamy Freitas.'],
  ['O tribunal', 'Quando o adoecimento vira processo', '"A sentença repara, não devolve", com Camila Leal Lima, juíza do Trabalho (TRT-1).']
];

const NUMEROS = [
  ['472 mil', 'afastamentos por saúde mental no Brasil em um único ano', 'INSS, 2024'],
  ['2026', 'o ano em que o risco psicossocial entra de vez na fiscalização do PGR', 'NR-1, MTE'],
  ['4,7×', 'o retorno médio de cada real investido em saúde mental no trabalho', 'Deloitte']
];

/* dias até o evento, no fuso de Porto Alegre */
const faltam = () => {
  const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const n = Math.round((new Date(2026, 10, 12) - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 864e5);
  return n > 1 ? 'Faltam ' + n + ' dias' : n === 1 ? 'É amanhã' : 'É hoje';
};

/* ---------- blocos ---------- */
const rotulo = (t, cor) => '<p style="margin:0 0 12px;font:700 12px/1.4 ' + F + ';letter-spacing:.14em;text-transform:uppercase;color:' + (cor || TEAL) + '">' + t + '</p>';
const titulo = (t) => '<p style="margin:0 0 14px;font:700 24px/1.3 ' + F + ';color:' + NAVY + '">' + t + '</p>';
const par = (t, extra) => '<p style="margin:0 0 16px;font:15px/1.65 ' + F + ';color:' + MUT + ';' + (extra || '') + '">' + t + '</p>';
const secao = (conteudo, fundo, pad) => '<tr><td class="sec" bgcolor="' + (fundo || '#ffffff') + '" style="background:' + (fundo || '#ffffff') + ';padding:' + (pad || '30px 36px') + '">' + conteudo + '</td></tr>';
const botao = (url, txt, cheio) => '<a href="' + url + '" style="display:inline-block;margin:0 8px 10px 0;padding:15px 22px;border-radius:12px;font:700 15px/1 ' + F + ';text-decoration:none;'
  + (cheio ? 'background:' + ROXO + ';color:#ffffff' : 'background:#e8f9f6;color:#0f8778;border:1px solid #bfeee8') + '">' + txt + '</a>';

const faixaInfo = () => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
  + [['Quando', 'Quinta, 12/11'], ['Horário', '13h30 às 19h'], ['Onde', 'Instituto Caldeira · Sala Multiuso']].map(([r, v], i) =>
    '<td class="col colinfo' + (i ? '' : ' colinfo1') + '" width="33%" valign="top" style="padding:18px 14px;' + (i ? 'border-left:1px solid #2a2f78;' : '') + '">'
    + '<p style="margin:0 0 6px;font:700 11px/1.3 ' + F + ';letter-spacing:.14em;text-transform:uppercase;color:' + TEAL_CLARO + '">' + r + '</p>'
    + '<p style="margin:0;font:700 15px/1.35 ' + F + ';color:#ffffff">' + v + '</p></td>').join('')
  + '</tr></table>';

const endereco = () => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
  + '<td width="5" bgcolor="' + TEAL + '" style="background:' + TEAL + ';border-radius:4px 0 0 4px">&nbsp;</td>'
  + '<td bgcolor="#e8f9f6" style="background:#e8f9f6;padding:18px 20px;border-radius:0 12px 12px 0">'
  + '<p style="margin:0 0 6px;font:700 12px/1.4 ' + F + ';letter-spacing:.14em;text-transform:uppercase;color:#0f8778">📍 Anote o endereço</p>'
  + '<p style="margin:0 0 6px;font:700 17px/1.4 ' + F + ';color:' + NAVY + '">Tv. São José, 455 · Navegantes · Porto Alegre</p>'
  + '<p style="margin:0;font:14px/1.6 ' + F + ';color:' + MUT + '">O Caldeira fica numa esquina. Para chegar à Sala Multiuso, entre pela <b style="color:' + NAVY + '">recepção da Rua Frederico Mentz</b>. Se algum e-mail anterior mostrou outro endereço, vale este. <a href="' + MAPA + '" style="color:#0f8778;font-weight:700">Abrir no mapa</a></p>'
  + '</td></tr></table>';

const cardsLeva = () => {
  const card = ([r, t, d]) => '<td class="col card" width="50%" valign="top" style="padding:6px">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="' + FUNDO + '" style="background:' + FUNDO + ';border-radius:14px;padding:18px 18px 16px">'
    + '<p style="margin:0 0 8px"><span style="display:inline-block;padding:4px 10px;border-radius:99px;background:' + ROXO + ';font:700 11px/1.4 ' + F + ';letter-spacing:.12em;text-transform:uppercase;color:#ffffff">' + r + '</span></p>'
    + '<p style="margin:0 0 6px;font:700 16px/1.35 ' + F + ';color:' + NAVY + '">' + t + '</p>'
    + '<p style="margin:0;font:13px/1.55 ' + F + ';color:' + MUT + '">' + esc(d) + '</p>'
    + '</td></tr></table></td>';
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' + card(LEVA[0]) + card(LEVA[1]) + '</tr><tr>' + card(LEVA[2]) + card(LEVA[3]) + '</tr></table>';
};

const numeros = () => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
  + NUMEROS.map(([n, d, f], i) => '<td class="col colnum" width="33%" valign="top" style="padding:4px 12px 4px ' + (i ? '16px' : '0') + ';' + (i ? 'border-left:1px solid #2a2f78;' : '') + '">'
    + '<p style="margin:0 0 6px;font:700 30px/1.1 ' + F + ';color:' + TEAL_CLARO + '">' + n + '</p>'
    + '<p style="margin:0 0 6px;font:13px/1.5 ' + F + ';color:#d9dcf2">' + d + '</p>'
    + '<p style="margin:0;font:11px/1.4 ' + F + ';color:#8f95c4">' + f + '</p></td>').join('')
  + '</tr></table>';

const programa = () => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + PROGRAMA.map(([hora, t, quem, foto]) => {
  const pausa = !quem;
  return '<tr>'
    + '<td width="54" valign="top" style="padding:14px 8px 14px 0;border-bottom:1px solid ' + LINHA + ';font:700 14px/1.4 ' + F + ';color:' + TEAL + '">' + hora + '</td>'
    + '<td width="56" valign="top" style="padding:10px 12px 10px 0;border-bottom:1px solid ' + LINHA + '">'
    + (foto ? '<img src="' + IMG + 'palestrantes/' + foto + '.jpg" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border:0;border-radius:50%">'
      : '<div style="width:44px;height:44px;border-radius:50%;background:' + FUNDO + ';text-align:center;font:20px/44px Arial">☕</div>')
    + '</td>'
    + '<td valign="top" style="padding:13px 0;border-bottom:1px solid ' + LINHA + '">'
    + '<p style="margin:0;font:' + (pausa ? '400 14px' : '700 15px') + '/1.45 ' + F + ';color:' + (pausa ? CINZA : TXT) + '">' + esc(t) + '</p>'
    + (quem ? '<p style="margin:3px 0 0;font:13px/1.45 ' + F + ';color:' + MUT + '">' + esc(quem) + '</p>' : '')
    + '</td></tr>';
}).join('') + '</table>';

const passos = () => {
  const passo = (n, t, d) => '<tr><td width="40" valign="top" style="padding:0 14px 18px 0">'
    + '<div style="width:30px;height:30px;border-radius:50%;background:' + ROXO + ';text-align:center;font:700 14px/30px ' + F + ';color:#ffffff">' + n + '</div></td>'
    + '<td valign="top" style="padding:3px 0 18px"><p style="margin:0 0 4px;font:700 15px/1.4 ' + F + ';color:' + NAVY + '">' + t + '</p>'
    + '<p style="margin:0;font:14px/1.6 ' + F + ';color:' + MUT + '">' + d + '</p></td></tr>';
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
    + passo(1, 'Fique de olho no e-mail do Caldeira', 'O Instituto Caldeira vai te mandar as instruções do cadastro facial. Faça antes de quinta para entrar sem fila. Se não encontrar, confira o spam.')
    + passo(2, 'Planeje a chegada', 'De Uber, informe <b style="color:' + NAVY + '">Instituto Caldeira</b> como destino. De carro: o Caldeira não tem estacionamento próprio; uma opção é o Shopping DC Navegantes, com entrada pela Rua Frederico Mentz.')
    + passo(3, 'Chegue às 13h30', 'Assim dá tempo do credenciamento e do welcome coffee com calma. A abertura é às 14h.')
    + '</table>';
};

const anexo = () => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
  + '<td bgcolor="#ffffff" style="background:#ffffff;border:1px dashed #bdbad6;border-radius:14px;padding:16px 18px">'
  + '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
  + '<td valign="middle" style="padding-right:14px"><div style="width:42px;height:50px;border-radius:6px;background:' + ROXO + ';text-align:center;font:700 11px/50px ' + F + ';color:#ffffff">PDF</div></td>'
  + '<td valign="middle"><p style="margin:0 0 3px;font:700 15px/1.4 ' + F + ';color:' + NAVY + '">📎 Guia do Inscrito, em anexo</p>'
  + '<p style="margin:0;font:13px/1.5 ' + F + ';color:' + MUT + '">Local, como chegar, estacionamento e a programação completa, em 3 páginas. Vale salvar no celular.</p></td>'
  + '</tr></table></td></tr></table>';

const pergunta = () => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
  + '<td bgcolor="' + ROXO + '" style="background:' + ROXO + ';border-radius:16px;padding:24px 24px 22px">'
  + '<p style="margin:0 0 8px;font:700 12px/1.4 ' + F + ';letter-spacing:.14em;text-transform:uppercase;color:' + TEAL_CLARO + '">Sua pergunta no palco</p>'
  + '<p style="margin:0 0 8px;font:700 19px/1.4 ' + F + ';color:#ffffff">Qual dúvida sobre NR-1 você quer ver respondida na quinta?</p>'
  + '<p style="margin:0;font:14px/1.6 ' + F + ';color:#d9dcf2"><b style="color:#ffffff">Responda este e-mail</b> com a sua pergunta. Vamos levar as mais frequentes para a tarde.</p>'
  + '</td></tr></table>';

function html(i) {
  const nome = esc(primeiro(i && i.nome));
  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge">'
    + '<title>' + esc(assunto) + '</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet">'
    + '<style>@media only screen and (max-width:620px){'
    + '.col{display:block!important;width:100%!important;box-sizing:border-box!important;border-left:0!important}'
    + '.colnum{padding:0 0 18px 0!important}.colinfo{padding:12px 14px!important;border-top:1px solid #2a2f78!important}.colinfo1{border-top:0!important}'
    + '.sec{padding-left:20px!important;padding-right:20px!important}.card{padding:5px 0!important}'
    + '}</style></head>'
    + '<body style="margin:0;padding:0;background:' + FUNDO + '">'
    + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:' + FUNDO + '">' + esc(preheader) + '</div>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + FUNDO + '" style="background:' + FUNDO + '"><tr><td align="center" style="padding:24px 10px">'
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden">'
    /* banner do evento */
    + '<tr><td bgcolor="' + NAVY + '" style="background:' + NAVY + '"><a href="' + EVENTO_URL + '"><img src="' + IMG + 'topo-falta-pouco.jpg" width="600" height="260" alt="NR-1 Estratégica · Falta pouco · Quinta, 12.11" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr>'
    + '<tr><td bgcolor="' + NAVY + '" style="background:' + NAVY + ';padding:0 22px 6px">' + faixaInfo() + '</td></tr>'
    /* abertura */
    + secao(rotulo(faltam()) + titulo(nome ? 'Falta pouco, ' + nome + '!' : 'Falta pouco!')
      + par('Com a nova redação da NR-1, o risco psicossocial passou a ser obrigatório dentro do PGR. Toda empresa com CLT precisa responder, e quase nenhuma sabe por onde começar.')
      + par('Na quinta, a gente coloca na mesma sala <b style="color:' + NAVY + '">quem julga, quem aplica e quem mede</b>: duas juízas do Trabalho, uma grande indústria, a clínica e os dados. Uma tarde para sair com respostas, e não com mais dúvidas.', 'margin:0 0 22px')
      + endereco(), '#ffffff', '34px 36px 30px')
    /* o que você leva */
    + secao(rotulo('O que você leva dessa tarde') + cardsLeva(), '#ffffff', '6px 36px 30px')
    /* números */
    + secao(rotulo('Para chegar no clima', TEAL_CLARO) + numeros(), NAVY, '28px 36px 30px')
    /* programação */
    + secao(rotulo('A programação') + titulo('Da NR-1 à performance, em uma tarde') + programa(), '#ffffff', '32px 36px 26px')
    /* antes de quinta */
    + secao(rotulo('Antes de quinta') + passos() + anexo(), FUNDO, '30px 36px 30px')
    /* pergunta + botões */
    + secao(pergunta()
      + '<p style="margin:22px 0 0">' + botao(AGENDA, 'Adicionar à agenda', true) + botao(MAPA, 'Como chegar', false) + botao(EVENTO_URL + '#palestrantes', 'Quem fala', false) + '</p>', '#ffffff', '30px 36px 14px')
    /* rodapé */
    + secao('<p style="margin:0 0 14px;font:14px/1.6 ' + F + ';color:' + MUT + '">Dúvidas ou imprevistos? Fale com a gente pelo WhatsApp <a href="' + WHATS + '" style="color:' + ROXO + ';font-weight:700">' + WHATS_TXT + '</a> ou em <a href="mailto:' + CONTATO + '" style="color:' + ROXO + '">' + CONTATO + '</a>.</p>'
      + '<p style="margin:0;font:15px/1.6 ' + F + ';color:' + TXT + '">Nos vemos na quinta,<br><b>Equipe Grou</b></p>', '#ffffff', '10px 36px 32px')
    + '</table>'
    + '<p style="margin:16px 0 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:' + CINZA + '">Grou Gestão de Pessoas · Porto Alegre (RS)<br>Você recebeu este e-mail porque está inscrita ou inscrito no NR-1 Estratégica.</p>'
    + '</td></tr></table></body></html>';
}

function texto(i) {
  return [(primeiro(i && i.nome) ? 'Falta pouco, ' + primeiro(i && i.nome) + '!' : 'Falta pouco!'), '',
    'Com a nova redação da NR-1, o risco psicossocial passou a ser obrigatório dentro do PGR. Toda empresa com CLT precisa responder, e quase nenhuma sabe por onde começar.', '',
    'Na quinta, a gente coloca na mesma sala quem julga, quem aplica e quem mede: duas juízas do Trabalho, uma grande indústria, a clínica e os dados.', '',
    'QUANDO: quinta, 12/11, das 13h30 às 19h (abertura às 14h)',
    'ONDE: Instituto Caldeira · Sala Multiuso',
    'Tv. São José, 455 · Navegantes · Porto Alegre. Entre pela recepção da Rua Frederico Mentz.',
    'Se algum e-mail anterior mostrou outro endereço, vale este. Mapa: ' + MAPA, '',
    'O QUE VOCÊ LEVA DESSA TARDE']
    .concat(LEVA.map(([r, t, d]) => '- ' + r + ': ' + t + '. ' + d), ['', 'PARA CHEGAR NO CLIMA'])
    .concat(NUMEROS.map(([n, d, f]) => '- ' + n + ': ' + d + ' (' + f + ')'), ['', 'A PROGRAMAÇÃO'])
    .concat(PROGRAMA.map(([h, t, q]) => h + '  ' + t + (q ? ' (' + q + ')' : '')), ['', 'ANTES DE QUINTA',
      '1. O Instituto Caldeira vai te mandar as instruções do cadastro facial. Faça antes de quinta (confira o spam).',
      '2. De Uber, informe "Instituto Caldeira". De carro: uma opção é o Shopping DC Navegantes, com entrada pela Rua Frederico Mentz.',
      '3. Chegue às 13h30 para o credenciamento e o welcome coffee.', '',
      'Em anexo: o Guia do Inscrito, com local, chegada e programação.', '',
      'Qual dúvida sobre NR-1 você quer ver respondida na quinta? Responda este e-mail com a sua pergunta.', '',
      'Adicionar à agenda: ' + AGENDA, '',
      'Dúvidas? WhatsApp ' + WHATS_TXT + ' · ' + CONTATO, '', 'Nos vemos na quinta,', 'Equipe Grou']).join('\n');
}

const GUIA_URL = SITE + '/assets/evento/nr1-estrategica/guia-inscrito.pdf';
const remetente = () => String(process.env.EMAIL_REMETENTE || '').trim() || 'Grou · NR-1 Estratégica <eventos@grougp.com.br>';

/* envia um "Falta pouco" com o guia anexado (o Resend busca o PDF pela URL) */
async function enviaGuia(i) {
  const chave = String(process.env.RESEND_API_KEY || '').trim();
  if (!chave) throw new Error('RESEND_API_KEY ausente');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: 'Bearer ' + chave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: remetente(), to: [i.email], reply_to: CONTATO, subject: assunto, html: html(i), text: texto(i),
      attachments: [{ filename: GUIA_NOME, path: GUIA_URL }] })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + String(j.message || j.name || '').slice(0, 160));
  return j;
}

module.exports = { enviaGuia, chave: 'falta-pouco', quando: '2026-11-09', rotulo: 'Seg 09/11', canal: 'E-mail', tema: 'Falta pouco + Guia do Inscrito', assunto, preheader, html, texto, GUIA_NOME, primeiro };
