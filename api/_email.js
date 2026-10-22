/* E-mail de confirmação de vaga (cupom de 100%), enviado pelo Resend.
   Variáveis: RESEND_API_KEY (obrigatória para enviar) e, opcional, EMAIL_REMETENTE
   (ex.: "Grou · NR-1 Estratégica <eventos@grougp.com.br>"; o domínio precisa estar verificado no Resend). */
const SITE = 'https://www.grougp.com';
const EVENTO_URL = SITE + '/evento/nr1-estrategica/';
const TOPO = SITE + '/assets/evento/nr1-estrategica/email/topo-confirmacao.jpg';
const MAPA = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Instituto Caldeira, Av. Farrapos, 1055, Porto Alegre - RS');
const AGENDA = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  + '&text=' + encodeURIComponent('NR-1 Estratégica · Grou')
  + '&dates=20261112T163000Z/20261112T220000Z'
  + '&details=' + encodeURIComponent('Credenciamento e welcome coffee às 13h30, abertura às 14h. Programação: ' + EVENTO_URL)
  + '&location=' + encodeURIComponent('Instituto Caldeira, Av. Farrapos, 1055, Porto Alegre - RS');
const WHATS = 'https://wa.me/5551991892049';
const WHATS_TXT = '(51) 99189-2049';
const CONTATO = 'atendimento@grougp.com.br';

const chave = () => String(process.env.RESEND_API_KEY || '').trim();
const ativo = () => !!chave();
const remetente = () => String(process.env.EMAIL_REMETENTE || '').trim() || 'Grou · NR-1 Estratégica <eventos@grougp.com.br>';

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';

function assunto() {
  return 'Vaga confirmada · NR-1 Estratégica, 12 de novembro';
}

function texto(i) {
  return [
    'Olá, ' + primeiroNome(i.nome) + '!',
    '',
    'Sua vaga no NR-1 Estratégica está confirmada. Você entrou com um convite da Grou (' + i.cupom + ') e não há nada a pagar.',
    '',
    'Quando: quinta, 12 de novembro de 2026',
    'Credenciamento e welcome coffee às 13h30 · abertura às 14h',
    'Onde: Instituto Caldeira · Av. Farrapos, 1055 · Porto Alegre (RS)',
    'Como chegar: ' + MAPA,
    'Ingresso: individual · convite ' + i.cupom,
    '',
    'Adicionar à agenda: ' + AGENDA,
    'Programação completa: ' + EVENTO_URL + '#programacao',
    '',
    'Dúvidas? WhatsApp ' + WHATS_TXT + ' · ' + CONTATO,
    '',
    'Até lá,',
    'Equipe Grou'
  ].join('\n');
}

function html(i) {
  const nome = esc(primeiroNome(i.nome));
  const cupom = esc(i.cupom);
  const linha = (rot, val) => '<tr><td style="padding:10px 0;border-bottom:1px solid #e6e5ef;font:600 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#12a594;width:110px;vertical-align:top">' + rot + '</td>'
    + '<td style="padding:10px 0;border-bottom:1px solid #e6e5ef;font:15px/1.5 Arial,Helvetica,sans-serif;color:#0c0a2e">' + val + '</td></tr>';
  const botao = (url, rot, cheio) => '<a href="' + url + '" style="display:inline-block;margin:6px 6px 0 0;padding:14px 22px;border-radius:12px;font:700 15px/1 Arial,Helvetica,sans-serif;text-decoration:none;'
    + (cheio ? 'background:#120573;color:#ffffff' : 'background:#e8f9f6;color:#0f8778;border:1px solid #bfeee8') + '">' + rot + '</a>';
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(assunto()) + '</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5fa">'
    + '<div style="display:none;max-height:0;overflow:hidden;opacity:0">Seu convite está garantido. Nos vemos no Instituto Caldeira, em 12 de novembro.</div>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fa"><tr><td align="center" style="padding:24px 12px">'
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">'
    + '<tr><td><a href="' + EVENTO_URL + '"><img src="' + TOPO + '" width="600" alt="NR-1 Estratégica · vaga confirmada" style="display:block;width:100%;height:auto;border:0"></a></td></tr>'
    + '<tr><td style="padding:32px 32px 8px">'
    + '<p style="margin:0 0 6px;font:700 24px/1.3 Arial,Helvetica,sans-serif;color:#07033a">Olá, ' + nome + '! Sua vaga está confirmada.</p>'
    + '<p style="margin:0 0 22px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#4a4868">Você entrou no <b style="color:#07033a">NR-1 Estratégica</b> com um convite da Grou e não há nada a pagar. Guarde este e-mail: ele é a confirmação da sua inscrição.</p>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
    + linha('Quando', '<b>Quinta, 12 de novembro de 2026</b><br>Credenciamento e welcome coffee às 13h30 · abertura às 14h')
    + linha('Onde', '<b>Instituto Caldeira</b><br>Av. Farrapos, 1055 · Porto Alegre (RS) · <a href="' + MAPA + '" style="color:#12a594">como chegar</a>')
    + linha('Ingresso', 'Individual · convite <b>' + cupom + '</b>')
    + '</table>'
    + '<div style="padding:22px 0 6px">' + botao(AGENDA, 'Adicionar à agenda', true) + botao(EVENTO_URL + '#programacao', 'Ver a programação', false) + '</div>'
    + '<p style="margin:18px 0 0;font:15px/1.6 Arial,Helvetica,sans-serif;color:#4a4868">Uma tarde com juízas do Trabalho, indústria, clínica e dados para transformar risco psicossocial em performance, com o soft launch do Lumi.</p>'
    + '</td></tr>'
    + '<tr><td style="padding:22px 32px 30px"><div style="padding:16px 18px;border-radius:12px;background:#f4f5fa;font:14px/1.6 Arial,Helvetica,sans-serif;color:#4a4868">'
    + 'Dúvidas ou imprevistos? Fale com a gente pelo WhatsApp <a href="' + WHATS + '" style="color:#120573;font-weight:700">' + WHATS_TXT + '</a> ou em <a href="mailto:' + CONTATO + '" style="color:#120573">' + CONTATO + '</a>.</div>'
    + '<p style="margin:22px 0 0;font:15px/1.6 Arial,Helvetica,sans-serif;color:#0c0a2e">Até lá,<br><b>Equipe Grou</b></p></td></tr>'
    + '</table>'
    + '<p style="margin:16px 0 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#8a88a3">Grou Gestão de Pessoas · Porto Alegre (RS)<br>Você recebeu este e-mail porque se inscreveu no NR-1 Estratégica.</p>'
    + '</td></tr></table></body></html>';
}

function mensagem(i) {
  return { from: remetente(), to: [i.email], reply_to: CONTATO, subject: assunto(), html: html(i), text: texto(i) };
}

async function envia(caminho, corpo, limiteMs) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), limiteMs || 8000);
  try {
    const r = await fetch('https://api.resend.com' + caminho, {
      method: 'POST', signal: ctl.signal,
      headers: { Authorization: 'Bearer ' + chave(), 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('resend ' + r.status + ' ' + String(j.message || j.name || '').slice(0, 160));
    return j;
  } finally { clearTimeout(t); }
}

/* uma confirmação (na hora da inscrição) */
const enviaConfirmacao = (i) => envia('/emails', mensagem(i), 6000);

/* várias de uma vez (botão do painel): até 100 por chamada */
const enviaLote = (lista) => envia('/emails/batch', lista.slice(0, 100).map(mensagem), 20000);

module.exports = { ativo, enviaConfirmacao, enviaLote, html, texto, assunto };
