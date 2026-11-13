/* Meta Pixel · eventos do site (guia "Instalação de eventos · Meta Pixel", pixel 570597033128492).
   ViewContent nas páginas de serviço e tecnologia, Contact em WhatsApp/telefone/e-mail,
   CTA_Demonstracao nos botões para /contato/ e Lead quando o formulário de /contato/ é enviado com sucesso.
   Carregado logo antes do </body>, depois do código-base do pixel no <head>. */
(function () {
  if (typeof fbq !== 'function') return;

  /* ViewContent: paginas de servico e tecnologia */
  var p = location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
  var hubs = ['programas-de-lideranca', 'capacitacoes-e-treinamentos'];
  if ((p[0] === 'consulting' || p[0] === 'tecnologias') &&
      p.length === 2 && hubs.indexOf(p[1]) < 0) {
    fbq('track', 'ViewContent', { content_name: p[1], content_category: p[0] });
  }

  /* Contact (WhatsApp, telefone, e-mail) e CTA_Demonstracao */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    var t = (a.textContent || '').replace(/\s+/g, ' ');
    if (/wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com/.test(h)) {
      fbq('track', 'Contact', { method: 'whatsapp' });
    } else if (h.indexOf('tel:') === 0) {
      fbq('track', 'Contact', { method: 'telefone' });
    } else if (h.indexOf('mailto:') === 0) {
      fbq('track', 'Contact', { method: 'email' });
    } else if (h.indexOf('/contato') > -1 &&
               /solicitar demonstra|falar com a grou|agendar diagn/i.test(t)) {
      fbq('trackCustom', 'CTA_Demonstracao');
    }
  });

  /* Lead: formulario de /contato/ enviado com sucesso */
  function observaLead() {
    var ok = document.querySelector('#form-contato')
          && document.querySelector('.form-ok');
    if (!ok) return;
    var enviado = false;
    new MutationObserver(function () {
      if (!enviado && ok.classList.contains('visivel')) {
        enviado = true;
        fbq('track', 'Lead');
      }
    }).observe(ok, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observaLead);
  else observaLead();
})();
