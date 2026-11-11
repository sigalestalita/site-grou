/* Banco de inscritos (Supabase / PostgREST). Só o servidor fala com ele.
   Variáveis: SUPABASE_SERVICE_KEY (chave secreta do projeto grou-eventos) e, opcional, SUPABASE_URL. */
const URL_BASE = process.env.SUPABASE_URL || 'https://eycvxhstugodnjmblsdl.supabase.co';
const chave = () => String(process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/^["']+|["']+$/g, '').trim();
const ativo = () => !!chave();

async function rest(caminho, o) {
  const op = o || {};
  const k = chave();
  const r = await fetch(URL_BASE + '/rest/v1/' + caminho, {
    method: op.metodo || 'GET',
    /* chaves novas (sb_...) vão só em apikey; as antigas (JWT) também em Authorization */
    headers: Object.assign({ apikey: k, 'Content-Type': 'application/json' }, k.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + k }, op.cabecalhos || {}),
    body: op.corpo ? JSON.stringify(op.corpo) : undefined
  });
  const txt = await r.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch (e) { /* sem JSON */ }
  if (!r.ok) throw new Error('db ' + r.status + ' ' + (json && json.message ? json.message : txt).slice(0, 160));
  return json;
}

/* grava (ou ignora, se a chave já existe) */
function grava(linha, ignoraRepetido) {
  return rest('inscricoes?on_conflict=chave', {
    metodo: 'POST', corpo: linha,
    cabecalhos: { Prefer: 'resolution=' + (ignoraRepetido ? 'ignore-duplicates' : 'merge-duplicates') + ',return=minimal' }
  });
}

/* traduz o estado da DOM para o do nosso painel */
function statusInterno(statusDom) {
  const s = String(statusDom || '').toLowerCase();
  if (s === 'approved' || s === 'paid') return 'pago';
  if (s === 'pending' || s === 'processing' || s === 'in_process' || s === 'authorized') return 'pendente';
  if (['cancelled', 'canceled', 'expired', 'refunded', 'chargeback', 'reversed'].includes(s)) return 'cancelado';
  return 'recusado';
}

/* atualiza o pedido quando a DOM avisa (webhook) ou quando a página consulta o status.
   Devolve as linhas que acabaram de virar "pago" (para disparar o e-mail de confirmação).
   tx: a transação lida na DOM; serve para achar, pelo e-mail do comprador, pedidos feitos pelo link de
   pagamento, que não guardam o id da DOM (sem isso o boleto pago pelo link ficava "pendente" para sempre). */
async function sincroniza(domId, statusDom, tx) {
  const novo = statusInterno(statusDom);
  const id = encodeURIComponent(domId);
  const volta = { Prefer: 'return=representation' };
  if (novo === 'pago') {
    const agora = new Date().toISOString();
    const linhas = (await rest('inscricoes?dom_id=eq.' + id + '&status=neq.pago', { metodo: 'PATCH', corpo: { status: 'pago', pago_em: agora }, cabecalhos: volta })) || [];
    if (linhas.length) return linhas;
    const jaPago = (await rest('inscricoes?dom_id=eq.' + id + '&limit=1')) || [];
    const email = String((tx && tx.customer && tx.customer.email) || '').trim().toLowerCase();
    if (jaPago.length || !/^[^@\s*,()]+@[^@\s*,()]+$/.test(email)) return [];
    return (await rest('inscricoes?evento=eq.nr1-estrategica&tipo=eq.pagante&status=eq.pendente&dom_id=is.null&email=ilike.' + encodeURIComponent(email), {
      metodo: 'PATCH', corpo: { status: 'pago', pago_em: agora, dom_id: domId }, cabecalhos: volta
    })) || [];
  }
  if (novo === 'pendente') return [];
  await rest('inscricoes?dom_id=eq.' + id + '&status=eq.pendente', { metodo: 'PATCH', corpo: { status: novo }, cabecalhos: { Prefer: 'return=minimal' } });
  return [];
}

/* pedido feito pelo link de pagamento da DOM: a página avisa quando a DOM devolve a pessoa para /obrigado/ */
const confirmaLink = async (chave) => (await rest('inscricoes?chave=eq.' + encodeURIComponent(chave) + '&status=eq.pendente', {
  metodo: 'PATCH', corpo: { status: 'pago', pago_em: new Date().toISOString() }, cabecalhos: { Prefer: 'return=representation' }
})) || [];

/* manda a confirmação a quem acabou de pagar; falha de e-mail não derruba o pedido (o painel reenvia) */
async function avisaPagos(linhas) {
  const correio = require('./_email');
  if (!correio.ativo()) return;
  for (const i of (linhas || []).filter((l) => l.status === 'pago' && !l.email_confirmacao_em)) {
    try { await correio.enviaConfirmacao(i); await marcaEmail([i.id]); }
    catch (e) { console.error('confirmação pago ' + i.id + ':', e.message); }
  }
}

/* pagante pendente confirmado à mão no painel (só muda quem ainda está aguardando) */
const confirmaManual = (id, metodo) => rest('inscricoes?id=eq.' + encodeURIComponent(id) + '&tipo=eq.pagante&status=eq.pendente', {
  metodo: 'PATCH', corpo: { status: 'pago', pago_em: new Date().toISOString(), metodo }, cabecalhos: { Prefer: 'return=representation' }
});

const lista = (evento) => rest('inscricoes?evento=eq.' + encodeURIComponent(evento) + '&order=criado_em.desc&limit=5000');
/* corrige o e-mail de uma inscrição (digitado errado) e devolve a linha atualizada */
const atualizaEmail = async (id, email) => ((await rest('inscricoes?id=eq.' + encodeURIComponent(id), {
  metodo: 'PATCH', corpo: { email, atualizado_em: new Date().toISOString() }, cabecalhos: { Prefer: 'return=representation' }
})) || [])[0] || null;
const porId = async (id) => ((await rest('inscricoes?id=eq.' + encodeURIComponent(id) + '&limit=1')) || [])[0] || null;
/* inscrição feita na porta do evento, para quem não se inscreveu pela página (já entra com check-in) */
const insereNaHora = async (linha) => ((await rest('inscricoes', { metodo: 'POST', corpo: linha, cabecalhos: { Prefer: 'return=representation' } })) || [])[0] || null;
/* inscrições do evento com o mesmo celular ou e-mail (filtros já validados: só dígitos e e-mail sem vírgula/parênteses) */
const buscaPorContato = (evento, filtros) => rest('inscricoes?select=nome,tipo,status&evento=eq.' + encodeURIComponent(evento) + '&or=' + encodeURIComponent('(' + filtros.join(',') + ')') + '&limit=20');
const marcaPresenca = (id, valor) => rest('inscricoes?id=eq.' + encodeURIComponent(id), { metodo: 'PATCH', corpo: { presente: !!valor }, cabecalhos: { Prefer: 'return=minimal' } });

/* ---- e-mail de confirmação (convidados com cupom de 100%) ---- */
const porChave = async (chave) => ((await rest('inscricoes?chave=eq.' + encodeURIComponent(chave) + '&limit=1')) || [])[0] || null;
const marcaEmail = (ids) => rest('inscricoes?id=in.(' + ids.map(encodeURIComponent).join(',') + ')', {
  metodo: 'PATCH', corpo: { email_confirmacao_em: new Date().toISOString() }, cabecalhos: { Prefer: 'return=minimal' }
});
/* convidados confirmados e pagantes já pagos que ainda não receberam a confirmação */
const semConfirmacao = (evento) => rest('inscricoes?evento=eq.' + encodeURIComponent(evento) + '&or=(and(tipo.eq.convidado,status.eq.confirmado),and(tipo.eq.pagante,status.eq.pago))&email_confirmacao_em=is.null&email=neq.&order=criado_em.asc&limit=100');

/* ---- leads das páginas de captação (ex.: demo gratuita do PDA) ---- */
const gravaLead = (linha) => rest('leads', { metodo: 'POST', corpo: linha, cabecalhos: { Prefer: 'return=minimal' } });
const listaLeads = () => rest('leads?order=criado_em.desc&limit=5000');

/* ---- totem Lumi do evento (respostas anônimas) ---- */
const totemGrava = (linhas) => rest('totem_respostas?on_conflict=sessao', { metodo: 'POST', corpo: linhas, cabecalhos: { Prefer: 'resolution=ignore-duplicates,return=minimal' } });
const totemLista = (teste) => rest('totem_respostas?select=area,humor,emocao,respostas&evento=eq.nr1-estrategica&teste=is.' + (teste ? 'true' : 'false') + '&limit=10000');

/* ---- acessos ao painel ---- */
const acesso = async (email) => ((await rest('painel_acessos?email=eq.' + encodeURIComponent(email) + '&limit=1')) || [])[0] || null;
const atualizaAcesso = (email, campos) => rest('painel_acessos?email=eq.' + encodeURIComponent(email), { metodo: 'PATCH', corpo: campos, cabecalhos: { Prefer: 'return=minimal' } });

module.exports = { buscaPorContato, insereNaHora, atualizaEmail, porId, chave, acesso, atualizaAcesso, ativo, grava, sincroniza, statusInterno, lista, marcaPresenca, confirmaManual, confirmaLink, avisaPagos, gravaLead, listaLeads, porChave, marcaEmail, semConfirmacao, totemGrava, totemLista };
