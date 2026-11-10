/* Entregas dos e-mails do evento, lidas direto do Resend (a fonte da verdade sobre o que chegou).
   O painel mostra, por tipo de e-mail, quantos chegaram, voltaram ou falharam, e por pessoa o estado
   da confirmação de vaga e do guia. Fica 60 s em memória para não refazer a leitura a cada atualização. */
const chave = () => String(process.env.RESEND_API_KEY || '').trim();

/* tipos de e-mail do evento, reconhecidos pelo assunto; o resto (avisos de lead, outros produtos) é ignorado */
const TIPOS = [
  { chave: 'conf', nome: 'Confirmação de vaga', re: /^Vaga confirmada · NR-1/i, sempre: true },
  { chave: 'guia', nome: 'Falta pouco + Guia do Inscrito', re: /^Evento NR1 estratégica: falta pouco/i, sempre: true },
  { chave: 'sala', nome: 'Aviso de local (29/10)', re: /^Local do NR-1 Estratégica/i },
  { chave: 'amanha', nome: 'É amanhã', re: /^(É amanhã|Amanhã é o NR-1)/i },
  { chave: 'hoje', nome: 'É hoje', re: /^É hoje.*NR-?1|^NR-?1 Estratégica: é hoje/i }
];

/* o last_event do Resend vira uma de cinco situações; a ordem diz qual prevalece quando a mesma pessoa
   recebeu o mesmo tipo mais de uma vez (um reenvio que chegou vale mais que a tentativa que falhou) */
const SITUACAO = {
  delivered: 'chegou', opened: 'chegou', clicked: 'chegou',
  sent: 'caminho', delivery_delayed: 'caminho', scheduled: 'caminho', queued: 'caminho',
  suppressed: 'bloqueado', bounced: 'voltou', complained: 'voltou',
  failed: 'falhou', canceled: 'falhou'
};
const PESO = { chegou: 5, caminho: 4, bloqueado: 3, voltou: 2, falhou: 1 };
const DESDE = '2026-10-01';

let memo = { t: 0, dados: null };

async function pagina(after) {
  const url = 'https://api.resend.com/emails?limit=100' + (after ? '&after=' + encodeURIComponent(after) : '');
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + chave() }, signal: AbortSignal.timeout(15000) });
    if (r.status === 429) { await new Promise((s) => setTimeout(s, 700 * (tentativa + 1))); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('resend ' + r.status + ' ' + String(j.message || '').slice(0, 120));
    return j;
  }
  throw new Error('resend 429');
}

async function le() {
  const tipos = {}, porEmail = {};
  TIPOS.forEach((t) => { tipos[t.chave] = { chave: t.chave, nome: t.nome, sempre: !!t.sempre, total: 0, chegou: 0, caminho: 0, bloqueado: 0, voltou: 0, falhou: 0, pessoas: 0 }; });
  let after = null;
  for (let n = 0; n < 60; n++) {
    const j = await pagina(after);
    const lista = j.data || [];
    for (const e of lista) {
      if (/\[TESTE\]|\[Teste/i.test(e.subject || '')) continue;
      const t = TIPOS.find((x) => x.re.test(e.subject || ''));
      if (!t) continue;
      const sit = SITUACAO[e.last_event] || 'caminho';
      tipos[t.chave].total++;
      for (const dest of e.to || []) {
        const a = String(dest).trim().toLowerCase();
        const p = porEmail[a] || (porEmail[a] = {});
        const atual = p[t.chave];
        if (!atual || PESO[sit] > PESO[atual.s] || (PESO[sit] === PESO[atual.s] && e.created_at > atual.em)) p[t.chave] = { s: sit, em: e.created_at };
      }
    }
    if (!j.has_more || !lista.length || String(lista[lista.length - 1].created_at) < DESDE) break;
    after = lista[lista.length - 1].id;
  }
  /* contagem por pessoa (a situação final de cada destinatário), que é o número que importa no painel */
  Object.values(porEmail).forEach((p) => Object.keys(p).forEach((k) => { tipos[k][p[k].s]++; tipos[k].pessoas++; }));
  return {
    lidoEm: new Date().toISOString(),
    tipos: TIPOS.map((t) => tipos[t.chave]).filter((t) => t.sempre || t.total > 0),
    porEmail: Object.fromEntries(Object.entries(porEmail).map(([a, p]) => [a, Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.s]))]))
  };
}

async function entregas(forcar) {
  if (!chave()) return null;
  if (!forcar && memo.dados && Date.now() - memo.t < 60000) return memo.dados;
  const dados = await le();
  memo = { t: Date.now(), dados };
  return dados;
}
const esquece = () => { memo = { t: 0, dados: null }; };

module.exports = { entregas, esquece };
