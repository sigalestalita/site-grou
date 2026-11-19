/* Google Ads + GA4 · eventos do site (guia "Instalação de eventos · Google Ads", GTM-T47W6QD, AW-844659162).
   Manda os eventos para a camada de dados do GTM; as tags de conversão do Ads e do GA4 ficam configuradas no GTM.
   view_servico nas páginas de serviço e tecnologia, contato_whatsapp / contato_telefone / contato_email nos cliques
   e generate_lead quando o formulário de /contato/ é enviado com sucesso. Convive com meta-eventos.js. */
(function () {
  window.dataLayer = window.dataLayer || [];
  function ev(nome, extra) {
    var o = { event: nome };
    for (var k in extra) o[k] = extra[k];
    window.dataLayer.push(o);
  }

  /* view_servico: paginas de servico e tecnologia (fora os hubs) */
  var p = location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
  var hubs = ['programas-de-lideranca', 'capacitacoes-e-treinamentos'];
  if ((p[0] === 'consulting' || p[0] === 'tecnologias') &&
      p.length === 2 && hubs.indexOf(p[1]) < 0) {
    ev('view_servico', { servico: p[1], categoria: p[0] });
  }

  /* WhatsApp, telefone e e-mail */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com/.test(h)) {
      ev('contato_whatsapp');
    } else if (h.indexOf('tel:') === 0) {
      ev('contato_telefone');
    } else if (h.indexOf('mailto:') === 0) {
      ev('contato_email');
    }
  });

  /* generate_lead: formulario de /contato/ enviado com sucesso (a mensagem .form-ok ganha a classe "visivel") */
  function observaLead() {
    var ok = document.querySelector('#form-contato')
          && document.querySelector('.form-ok');
    if (!ok) return;
    var enviado = false;
    new MutationObserver(function () {
      if (!enviado && ok.classList.contains('visivel')) {
        enviado = true;
        ev('generate_lead');
      }
    }).observe(ok, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observaLead);
  else observaLead();
})();
