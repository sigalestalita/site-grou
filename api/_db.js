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

/* atualiza o pedido quando a DOM avisa (webhook) ou quando a página consulta o status */
async function sincroniza(domId, statusDom) {
  const novo = statusInterno(statusDom);
  const id = encodeURIComponent(domId);
  if (novo === 'pago') {
    return rest('inscricoes?dom_id=eq.' + id + '&status=neq.pago', { metodo: 'PATCH', corpo: { status: 'pago', pago_em: new Date().toISOString() }, cabecalhos: { Prefer: 'return=minimal' } });
  }
  if (novo === 'pendente') return null;
  return rest('inscricoes?dom_id=eq.' + id + '&status=eq.pendente', { metodo: 'PATCH', corpo: { status: novo }, cabecalhos: { Prefer: 'return=minimal' } });
}

const lista = (evento) => rest('inscricoes?evento=eq.' + encodeURIComponent(evento) + '&order=criado_em.desc&limit=5000');
const marcaPresenca = (id, valor) => rest('inscricoes?id=eq.' + encodeURIComponent(id), { metodo: 'PATCH', corpo: { presente: !!valor }, cabecalhos: { Prefer: 'return=minimal' } });

/* ---- acessos ao painel ---- */
const acesso = async (email) => ((await rest('painel_acessos?email=eq.' + encodeURIComponent(email) + '&limit=1')) || [])[0] || null;
const atualizaAcesso = (email, campos) => rest('painel_acessos?email=eq.' + encodeURIComponent(email), { metodo: 'PATCH', corpo: campos, cabecalhos: { Prefer: 'return=minimal' } });

module.exports = { chave, acesso, atualizaAcesso, ativo, grava, sincroniza, statusInterno, lista, marcaPresenca };
