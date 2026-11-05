const c = require('./_comum');
const db = require('./_db');

/* Totem Lumi do NR-1 Estratégica (/evento/nr1-estrategica/totem/).
   O colaborador experimenta o app: equipe, onboarding (categoria + 1 pergunta), emocionômetro (emoção + causa).
   POST: grava a jornada, anônima (sem nome, e-mail ou telefone). Aceita lote, para o que ficou guardado offline.
   GET:  devolve só o agregado do painel do gestor, nunca respostas individuais.
   Célula com menos de MINIMO respostas fica sem valor, para ninguém ser identificado.
   ?teste=1 lê à parte; no POST, "teste": true grava à parte (para testar sem sujar o painel do evento). */
const SETORES = ['operacao', 'administrativo', 'comercial', 'pessoas', 'tecnologia', 'lideranca'];
const CATEGORIAS = ['autolideranca', 'adaptacao', 'resiliencia', 'interacao'];
/* emocionômetro do Lumi: chave e valor (-2 a +2) */
const EMOCOES = { alegria: 1, amor: 2, tristeza: -1, raiva: -2, cansaco: -1, calma: 1, surpresa: 0, indiferenca: 0, medo: -2, estresse: -2 };
const MINIMO = 3;

const nota = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null; };
const media = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null;
const conta = (obj, k) => { obj[k] = (obj[k] || 0) + 1; };

function agrega(linhas) {
  const setores = {};
  SETORES.forEach((s) => { setores[s] = { n: 0, emo: [], cat: {} }; CATEGORIAS.forEach((k) => { setores[s].cat[k] = []; }); });
  const emocoes = {}; Object.keys(EMOCOES).forEach((e) => { emocoes[e] = 0; });
  const categorias = {}; CATEGORIAS.forEach((k) => { categorias[k] = 0; });
  const causasDificeis = {};
  const valores = [];
  linhas.forEach((l) => {
    const s = setores[l.area]; if (!s) return;
    const r = l.respostas || {};
    s.n++;
    if (l.emocao in EMOCOES) {
      const v = EMOCOES[l.emocao];
      emocoes[l.emocao]++; s.emo.push(v); valores.push(v);
      if (v < 0 && r.causa) conta(causasDificeis, r.causa);
    }
    if (CATEGORIAS.includes(r.categoria) && nota(r.nota)) { categorias[r.categoria]++; s.cat[r.categoria].push(r.nota); }
  });
  const porSetor = {};
  SETORES.forEach((k) => {
    const s = setores[k];
    porSetor[k] = { n: s.n, emocional: s.emo.length >= MINIMO ? media(s.emo) : null, categorias: {} };
    CATEGORIAS.forEach((c2) => { porSetor[k].categorias[c2] = s.cat[c2].length >= MINIMO ? media(s.cat[c2]) : null; });
  });
  const causas = Object.entries(causasDificeis).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { total: linhas.length, minimo: MINIMO, emocoes, mediaEmocional: media(valores), categorias, causas, setores: porSetor, atualizado: new Date().toISOString() };
}

module.exports = async (req, res) => {
  if (!db.ativo()) return c.responde(res, 503, { erro: 'Indisponível.' });
  if (!c.origemPermitida(req)) return c.responde(res, 403, { erro: 'Origem não permitida.' });

  if (req.method === 'GET') {
    try {
      const linhas = (await db.totemLista(req.query && req.query.teste === '1')) || [];
      return c.responde(res, 200, agrega(linhas));
    } catch (e) {
      console.error('totem get:', e.message);
      return c.responde(res, 502, { erro: 'Não foi possível ler agora.' });
    }
  }

  if (req.method !== 'POST') return c.responde(res, 405, { erro: 'Método não permitido.' });
  const b = c.corpoJson(req);
  const lista = Array.isArray(b.respostas) ? b.respostas.slice(0, 50) : [];
  const linhas = [];
  for (const r of lista) {
    const sessao = String((r && r.sessao) || '');
    if (!/^[0-9a-f-]{36}$/i.test(sessao) || !SETORES.includes(r.area) || !(r.emocao in EMOCOES)) continue;
    if (!CATEGORIAS.includes(r.categoria) || !nota(r.nota)) continue;
    const causa = String(r.causa || '').replace(/[^\p{L}\p{N} /-]/gu, '').trim().slice(0, 40) || null;
    const quando = Date.parse(r.quando);
    linhas.push({
      sessao, area: r.area, emocao: r.emocao, humor: EMOCOES[r.emocao] + 3, teste: r.teste === true,
      respostas: { categoria: r.categoria, nota: nota(r.nota), causa },
      /* o que ficou guardado offline sobe depois: vale a hora em que foi respondido (até 2 dias) */
      criado_em: Number.isFinite(quando) && Math.abs(Date.now() - quando) < 2 * 864e5 ? new Date(quando).toISOString() : new Date().toISOString()
    });
  }
  if (!linhas.length) return c.responde(res, 400, { erro: 'Resposta inválida.' });
  try {
    await db.totemGrava(linhas);
    c.responde(res, 200, { ok: true, gravadas: linhas.map((l) => l.sessao) });
  } catch (e) {
    console.error('totem post:', e.message);
    c.responde(res, 502, { erro: 'Não foi possível gravar agora.' });
  }
};
