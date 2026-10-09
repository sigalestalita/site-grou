const crypto = require('crypto');
const c = require('./_comum');

const EVENTO = {
  name: 'NR-1 Estratégica',
  place: 'Instituto Caldeira',
  date: '2026-11-12 14:00:00',
  address: { city: 'Porto Alegre', state: 'RS', country: 'Brasil' }
};

const limpa = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 120);
const soDigitos = (v) => String(v || '').replace(/\D/g, '');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return c.responde(res, 405, { erro: 'Método não permitido.' });
  if (!c.ativo()) return c.responde(res, 503, { erro: 'Pagamento indisponível no momento.' });
  if (!c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });

  const b = c.corpoJson(req);
  const cli = b.cliente || {};
  const metodo = ({ pix: 'pix', boleto: 'boleto', cartao: 'credit_card' })[b.metodo];
  if (!metodo) return c.responde(res, 400, { erro: 'Escolha a forma de pagamento.' });

  const nome = limpa(cli.nome, 100), email = limpa(cli.email, 120).toLowerCase();
  const celular = soDigitos(cli.celular), cpf = soDigitos(cli.cpf);
  if (nome.split(/\s+/).length < 2) return c.responde(res, 400, { erro: 'Informe nome e sobrenome.', campo: 'nome' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.responde(res, 400, { erro: 'E-mail inválido.', campo: 'email' });
  if (celular.length < 10 || celular.length > 11) return c.responde(res, 400, { erro: 'Celular inválido. Use DDD + número.', campo: 'celular' });
  if (!c.cpfValido(cpf)) return c.responde(res, 400, { erro: 'CPF inválido.', campo: 'cpf' });

  /* preço decidido aqui, a partir do cupom */
  const preco = c.precoDoCupom(b.cupom);
  if (!preco.ok) return c.responde(res, 400, { erro: preco.motivo, campo: 'cupom' });

  const carga = {
    cod_external: 'NR1-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase(),
    customer: {
      name: nome, email, mobile_phone: celular, document: cpf, document_type: 'CPF',
      ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined
    },
    items: [{ description: 'Ingresso NR-1 Estratégica', price: preco.total, quantity: 1, sku: preco.cupom ? 'NR1-50' : 'NR1' }],
    payment: { total: preco.total, payment_method: metodo },
    event: EVENTO,
    metadata: JSON.stringify({
      lp: 'nr1-estrategica', cupom: preco.cupom, empresa: limpa(cli.empresa, 80), cargo: limpa(cli.cargo, 80),
      utm_source: limpa(b.utm && b.utm.utm_source, 60), utm_medium: limpa(b.utm && b.utm.utm_medium, 60), utm_campaign: limpa(b.utm && b.utm.utm_campaign, 80)
    })
  };

  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  if (process.env.DOM_POSTBACK_URL) carga.postbackUrl = process.env.DOM_POSTBACK_URL;
  else if (host && !/^(localhost|127\.)/.test(host)) carga.postbackUrl = 'https://' + host + '/api/webhook/';

  if (metodo === 'credit_card') {
    const k = b.cartao || {};
    const parcelas = Math.max(1, Math.min(10, parseInt(k.parcelas, 10) || 1));
    if (!k.token || !k.bin || !k.brand) return c.responde(res, 400, { erro: 'Não foi possível validar o cartão. Confira os dados.', campo: 'cartao' });
    carga.payment.credit_card = {
      installments: parcelas, holder_name: limpa(k.titular, 80) || nome,
      token: limpa(k.token, 200), bin: limpa(k.bin, 20), brand: limpa(k.brand, 30)
    };
  }
  if (metodo === 'boleto') carga.payment.boleto = { boleto_due_days: 3, instructions: ['Ingresso NR-1 Estrategica - Grou'] };
  if (metodo === 'pix') {
    const d = new Date(Date.now() + 3600 * 1000 - 3 * 3600 * 1000); // 1 hora, no horário de Brasília
    carga.payment.pix = { pix_expire: d.toISOString().slice(0, 16).replace('T', ' ') };
  }

  /* a chave evita cobrança duplicada se a pessoa clicar duas vezes */
  const chave = /^[\w-]{8,64}$/.test(b.chave || '') ? b.chave : crypto.randomUUID();
  try {
    const r = await c.dom('/transactions', { metodo: 'POST', corpo: carga, cabecalhos: { 'X-Idempotency-Key': chave } });
    const t = r.json || {};
    if (!t.id) {
      return c.responde(res, r.http >= 500 ? 502 : 400, { erro: 'Não foi possível criar o pedido. ' + (t.msg ? String(t.msg).slice(0, 160) : 'Tente novamente.') });
    }
    const saida = { id: t.id, situacao: c.situacao(t.status), status: t.status, msg: t.msg || '', total: preco.total, ambiente: c.ambiente() };
    if (metodo === 'pix') {
      saida.pix = {
        imagem: typeof t.pix_qrcode === 'string' ? t.pix_qrcode.replace(/^(data:[^,]+,)\s+/, '$1') : '',
        copiaECola: t.pix_content || '', expira: t.pix_expire || ''
      };
    }
    if (metodo === 'boleto') saida.boleto = { url: t.boleto_url || '', linha: t.boleto_digitable_line || '' };
    c.responde(res, 200, saida);
  } catch (e) {
    c.responde(res, 502, { erro: 'Não foi possível falar com o banco agora. Tente de novo em instantes.' });
  }
};
