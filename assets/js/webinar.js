/* ==========================================================================
   Landing page de webinar — inscrição, contagem regressiva e revelação.
   Autônomo: não depende do grou.js.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ====================================================================== */
  /* 1. Revelação suave                                                     */
  /* ====================================================================== */
  (function () {
    var alvos = $$('[data-w-reveal]');
    if (!alvos.length) return;
    if (reduzido || !('IntersectionObserver' in window)) {
      alvos.forEach(function (n) { n.classList.add('dentro'); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('dentro');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    alvos.forEach(function (n) { obs.observe(n); });
  })();

  /* ====================================================================== */
  /* 2. Contagem regressiva até o webinar                                   */
  /* ====================================================================== */
  (function () {
    var caixa = $('[data-conta]');
    if (!caixa) return;
    var alvo = new Date(caixa.getAttribute('data-conta')).getTime();
    if (isNaN(alvo)) { caixa.remove(); return; }
    var saida = $('b', caixa);

    function passo() {
      var resta = alvo - Date.now();
      if (resta <= 0) {
        caixa.innerHTML = '<span>O webinar está começando. Inscreva-se para receber o link.</span>';
        clearInterval(t);
        return;
      }
      var s = Math.floor(resta / 1000);
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      saida.textContent = (d > 0 ? d + 'd ' : '') + h + 'h ' + m + 'min';
    }
    passo();
    var t = setInterval(passo, 30000);
  })();

  /* ====================================================================== */
  /* 3. Inscrição                                                           */
  /*                                                                        */
  /* Manda a mesma inscrição para os destinos que estiverem configurados no */
  /* formulário — RD Station (data-rd-chave) e/ou HubSpot (data-hs-form).   */
  /* Basta um responder para a inscrição ser dada como feita: é melhor um   */
  /* lead duplicado do que um lead perdido. Sem nenhum destino configurado, */
  /* cai no envio por e-mail.                                               */
  /* ====================================================================== */
  (function () {
    var form = $('[data-inscricao]');
    if (!form) return;

    var cartao = form.closest('.w-form-card');
    var botao = $('.w-enviar', form);
    var erro = $('.w-erro', cartao);
    var at = function (n) { return (form.getAttribute(n) || '').trim(); };

    function cookie(nome) {
      var m = document.cookie.match('(^|;)\\s*' + nome + '\\s*=\\s*([^;]+)');
      return m ? decodeURIComponent(m.pop()) : '';
    }

    /* O rdtrk guarda o id anônimo da sessão: é ele que liga a conversão à
       origem de tráfego que o RD já vinha rastreando. */
    function idRd() {
      try {
        var c = cookie('rdtrk');
        return c ? (JSON.parse(c).id || '') : '';
      } catch (e) { return ''; }
    }

    function utms() {
      var q = new URLSearchParams(location.search);
      var fora = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
        if (q.get(k)) fora[k] = q.get(k);
      });
      return fora;
    }

    function concluir() {
      cartao.classList.add('pronto');
      erro.classList.remove('visivel');
      cartao.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'center' });
      if (window.dataLayer) window.dataLayer.push({ event: 'inscricao_webinar' });
    }

    function porEmail(d) {
      var linhas = Object.keys(d).map(function (k) { return k + ': ' + d[k]; });
      window.location.href = 'mailto:' + at('data-email') +
        '?subject=' + encodeURIComponent(at('data-assunto') || 'Inscrição no webinar') +
        '&body=' + encodeURIComponent(linhas.join('\n'));
      concluir();
    }

    function postar(url, corpo) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return true;
      });
    }

    /* --- RD Station: API de conversões -------------------------------- */
    function paraRd(d, extra) {
      var carga = {
        conversion_identifier: at('data-rd-conversao') || 'formulario-site',
        name: d.firstname,
        email: d.email,
        personal_phone: d.phone,
        company_name: d.company,
        job_title: d.jobtitle,
        cf_pagina_de_origem: location.href
      };
      Object.keys(extra).forEach(function (k) { carga[k] = extra[k]; });
      var tid = idRd();
      if (tid) carga.client_tracking_id = tid;
      if (extra.utm_source) carga.traffic_source = extra.utm_source;

      return postar('https://api.rd.services/platform/conversions?api_key='
        + encodeURIComponent(at('data-rd-chave')),
        { event_type: 'CONVERSION', event_family: 'CDP', payload: carga });
    }

    /* --- HubSpot: API de formulários ---------------------------------- */
    function paraHubspot(d) {
      var campos = Object.keys(d).map(function (k) {
        return { objectTypeId: '0-1', name: k, value: d[k] };
      });
      return postar('https://api.hsforms.com/submissions/v3/integration/submit/'
        + at('data-hs-portal') + '/' + at('data-hs-form'), {
        fields: campos,
        context: {
          hutk: cookie('hubspotutk') || undefined,
          pageUri: location.href,
          pageName: document.title
        },
        legalConsentOptions: {
          consent: {
            consentToProcess: true,
            text: 'Autorizo a Grou a entrar em contato sobre este webinar.',
            communications: [{
              value: true,
              subscriptionTypeId: 0,
              text: 'Aceito receber comunicações da Grou.'
            }]
          }
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var dados = {};
      new FormData(form).forEach(function (v, k) {
        v = String(v).trim();
        if (v) dados[k] = v;
      });
      var extra = utms();

      var envios = [];
      if (at('data-rd-chave')) envios.push(paraRd(dados, extra));
      if (at('data-hs-portal') && at('data-hs-form')) {
        var comUtm = {};
        Object.keys(dados).forEach(function (k) { comUtm[k] = dados[k]; });
        Object.keys(extra).forEach(function (k) { comUtm[k] = extra[k]; });
        envios.push(paraHubspot(comUtm));
      }

      if (!envios.length) { porEmail(dados); return; }

      botao.disabled = true;
      erro.classList.remove('visivel');

      Promise.allSettled(envios).then(function (rs) {
        var algumOk = rs.some(function (r) { return r.status === 'fulfilled'; });
        if (algumOk) concluir();
        else erro.classList.add('visivel');
        botao.disabled = false;
      });
    });
  })();

  /* ====================================================================== */
  /* 4. Barra fixa: some enquanto o formulário está à vista                 */
  /* ====================================================================== */
  (function () {
    var barra = $('.w-barra');
    var alvo = $('#inscricao');
    if (!barra || !alvo || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (e) {
      barra.classList.toggle('oculta', e[0].isIntersecting);
    }, { threshold: 0.18 }).observe(alvo);
  })();

  /* ====================================================================== */
  /* 5. Rolagem suave para o formulário                                     */
  /* ====================================================================== */
  $$('a[href="#inscricao"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var alvo = $('#inscricao');
      if (!alvo) return;
      e.preventDefault();
      alvo.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'center' });
      var primeiro = $('input', alvo);
      if (primeiro && window.innerWidth > 920) setTimeout(function () { primeiro.focus(); }, 520);
    });
  });
})();
