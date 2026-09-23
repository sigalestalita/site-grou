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
  /* Envia direto para a API de formulários do HubSpot quando o GUID do     */
  /* formulário está preenchido em data-hs-form. Sem GUID, cai no mesmo     */
  /* mecanismo de e-mail usado no formulário de contato do site, para que   */
  /* nenhuma inscrição se perca enquanto o formulário não é criado no CRM.  */
  /* ====================================================================== */
  (function () {
    var form = $('[data-inscricao]');
    if (!form) return;

    var cartao = form.closest('.w-form-card');
    var botao = $('.w-enviar', form);
    var erro = $('.w-erro', cartao);
    var portal = form.getAttribute('data-hs-portal') || '';
    var guid = (form.getAttribute('data-hs-form') || '').trim();

    function cookie(nome) {
      var m = document.cookie.match('(^|;)\\s*' + nome + '\\s*=\\s*([^;]+)');
      return m ? m.pop() : '';
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
    }

    function porEmail(dados) {
      var linhas = Object.keys(dados).map(function (k) { return k + ': ' + dados[k]; });
      window.location.href = 'mailto:' + (form.getAttribute('data-email') || '') +
        '?subject=' + encodeURIComponent(form.getAttribute('data-assunto') || 'Inscrição no webinar') +
        '&body=' + encodeURIComponent(linhas.join('\n'));
      concluir();
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
      Object.keys(extra).forEach(function (k) { dados[k] = extra[k]; });

      if (!portal || !guid) { porEmail(dados); return; }

      botao.disabled = true;
      erro.classList.remove('visivel');

      var campos = Object.keys(dados).map(function (k) {
        return { objectTypeId: '0-1', name: k, value: dados[k] };
      });

      fetch('https://api.hsforms.com/submissions/v3/integration/submit/' + portal + '/' + guid, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        })
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        concluir();
      }).catch(function () {
        erro.classList.add('visivel');
      }).then(function () {
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
