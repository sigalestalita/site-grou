/* Utilidades das páginas públicas DU99: chamada da API e aplicação da identidade (cores, fontes, logo). */
(function () {
  function api(rota, corpo, params) {
    var q = params ? '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&') : '';
    var op = corpo ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), credentials: 'same-origin' } : { credentials: 'same-origin' };
    return fetch('/du99/api/' + rota + '/' + q, op)
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; j._ok = r.ok; return j; }); })
      .catch(function () { return { _ok: false, _status: 0, erro: 'Sem conexão. Tente de novo em instantes.' }; });
  }
  function identidade(id) {
    id = id || {};
    var cor = id.cores || {}, fo = id.fontes || {}, r = document.documentElement.style;
    if (cor.primaria) r.setProperty('--c1', cor.primaria);
    if (cor.secundaria) r.setProperty('--c2', cor.secundaria);
    if (cor.destaque) r.setProperty('--c3', cor.destaque);
    if (fo.titulo) r.setProperty('--ft', "'" + fo.titulo + "'");
    if (fo.texto) r.setProperty('--fx', "'" + fo.texto + "'");
    if (window.DU99Cert) window.DU99Cert.fontes([fo.titulo || 'Comfortaa', fo.texto || 'Nunito']);
    document.querySelectorAll('[data-logo]').forEach(function (el) {
      el.src = id.logo_claro_url || id.logo_url || '/du99/assets/logo-du99-claro.png';
      el.alt = id.nome_empresa || 'DU99';
    });
    document.querySelectorAll('[data-empresa]').forEach(function (el) { el.textContent = id.nome_empresa || 'DU99'; });
    var m = document.querySelector('meta[name=theme-color]'); if (m && cor.primaria) m.content = cor.primaria;
  }
  window.DU99 = { api: api, identidade: identidade };
})();
