/* ==========================================================================
   Grou — camada de movimento e interação
   Sem dependências. Tudo degrada bem sem JS e respeita prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* --- agendador de rolagem: um único rAF para todos os leitores ---------- */
  var leitores = [];
  var agendado = false;
  function aoRolar(fn) { leitores.push(fn); }
  function disparar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(function () {
      agendado = false;
      for (var i = 0; i < leitores.length; i++) leitores[i]();
    });
  }
  window.addEventListener('scroll', disparar, { passive: true });
  window.addEventListener('resize', disparar, { passive: true });

  /* ====================================================================== */
  /* 1. Barra de progresso de rolagem                                       */
  /* ====================================================================== */
  (function () {
    var barra = $('.progresso');
    if (!barra) return;
    aoRolar(function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? window.scrollY / h : 0;
      barra.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
    });
  })();

  /* ====================================================================== */
  /* 2. Navegação: fundo ao rolar, auto-ocultar, dropdowns e gaveta          */
  /* ====================================================================== */
  (function () {
    var topo = $('.topo');
    if (!topo) return;
    var ultimo = window.scrollY;

    aoRolar(function () {
      var y = window.scrollY;
      topo.classList.toggle('fixa', y > 12);
      if (!document.body.classList.contains('gaveta-aberta')) {
        // some ao descer, volta ao subir — só depois do primeiro dobra
        topo.classList.toggle('oculta', y > 320 && y > ultimo + 4);
      }
      ultimo = y;
    });

    /* Dropdowns do menu (hover no desktop, clique no teclado/toque) */
    $$('.menu-item').forEach(function (item) {
      var sub = $('.submenu', item);
      if (!sub) return;
      var gatilho = $('.menu-link', item);
      var fechar;

      function abrir() { clearTimeout(fechar); $$('.menu-item.aberto').forEach(function (o) { if (o !== item) o.classList.remove('aberto'); }); item.classList.add('aberto'); gatilho.setAttribute('aria-expanded', 'true'); }
      function fecha(atraso) { clearTimeout(fechar); fechar = setTimeout(function () { item.classList.remove('aberto'); gatilho.setAttribute('aria-expanded', 'false'); }, atraso || 0); }

      item.addEventListener('mouseenter', abrir);
      item.addEventListener('mouseleave', function () { fecha(120); });
      gatilho.addEventListener('click', function (e) {
        if (gatilho.getAttribute('href') && gatilho.getAttribute('href') !== '#') return;
        e.preventDefault();
        item.classList.contains('aberto') ? fecha(0) : abrir();
      });
      item.addEventListener('focusin', abrir);
      item.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) fecha(0);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        $$('.menu-item.aberto').forEach(function (o) { o.classList.remove('aberto'); });
        if (document.body.classList.contains('gaveta-aberta')) alternarGaveta(false);
      }
    });

    /* Menu do Consulting: trilho de categorias troca o painel ao lado */
    $$('.submenu-mega').forEach(function (mega) {
      var abas = $$('.cat-aba', mega);
      var paineis = $$('.cat-painel', mega);
      function mostra(cat) {
        abas.forEach(function (a) {
          var on = a.getAttribute('data-cat') === cat;
          a.classList.toggle('ativa', on);
          a.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
        paineis.forEach(function (p) {
          p.classList.toggle('ativa', p.getAttribute('data-cat') === cat);
        });
      }
      abas.forEach(function (a) {
        var cat = a.getAttribute('data-cat');
        a.addEventListener('mouseenter', function () { mostra(cat); });
        a.addEventListener('focus', function () { mostra(cat); });
        a.addEventListener('click', function (e) { e.preventDefault(); mostra(cat); });
      });
      /* ao fechar o menu, volta para a primeira categoria */
      var item = mega.closest('.menu-item');
      if (item) item.addEventListener('mouseleave', function () {
        setTimeout(function () {
          if (!item.classList.contains('aberto') && abas[0]) mostra(abas[0].getAttribute('data-cat'));
        }, 260);
      });
    });

    /* Gaveta mobile */
    var botao = $('.hamburguer');
    function alternarGaveta(estado) {
      var abrir = typeof estado === 'boolean' ? estado : !document.body.classList.contains('gaveta-aberta');
      document.body.classList.toggle('gaveta-aberta', abrir);
      if (botao) botao.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      if (abrir) topo.classList.remove('oculta');
    }
    if (botao) botao.addEventListener('click', function () { alternarGaveta(); });
    $$('.gaveta a').forEach(function (a) { a.addEventListener('click', function () { alternarGaveta(false); }); });

    /* Acordeões da gaveta */
    $$('.gaveta-titulo').forEach(function (t) {
      t.addEventListener('click', function () {
        var g = t.closest('.gaveta-grupo');
        var estava = g.classList.contains('aberto');
        $$('.gaveta-grupo').forEach(function (o) { o.classList.remove('aberto'); });
        g.classList.toggle('aberto', !estava);
        t.setAttribute('aria-expanded', !estava ? 'true' : 'false');
      });
    });
  })();

  /* ====================================================================== */
  /* 3. Revelação por rolagem (+ escalonamento automático)                  */
  /* ====================================================================== */
  (function () {
    var alvos = $$('[data-reveal]');
    if (!alvos.length) return;

    if (reduzido || !('IntersectionObserver' in window)) {
      alvos.forEach(function (el) { el.classList.add('dentro'); });
      return;
    }

    /* escalonamento: data-stagger no pai aplica --d incremental aos filhos */
    $$('[data-stagger]').forEach(function (pai) {
      var passo = parseInt(pai.getAttribute('data-stagger'), 10) || 90;
      $$('[data-reveal]', pai).forEach(function (f, i) {
        if (!f.style.getPropertyValue('--d')) f.style.setProperty('--d', (i * passo) + 'ms');
      });
    });

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('dentro'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    alvos.forEach(function (el) { obs.observe(el); });
  })();

  /* ====================================================================== */
  /* 4. Revelação palavra a palavra                                         */
  /* ====================================================================== */
  (function () {
    var blocos = $$('.palavras');
    if (!blocos.length) return;

    blocos.forEach(function (bloco) {
      /* envolve cada palavra preservando marcação interna simples */
      var partes = [];
      (function anda(no) {
        Array.prototype.slice.call(no.childNodes).forEach(function (f) {
          if (f.nodeType === 3) {
            var frag = document.createDocumentFragment();
            f.nodeValue.split(/(\s+)/).forEach(function (t) {
              if (!t) return;
              if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
              var s = document.createElement('span');
              s.className = 'pw'; s.textContent = t;
              partes.push(s); frag.appendChild(s);
            });
            no.replaceChild(frag, f);
          } else if (f.nodeType === 1 && !f.classList.contains('pw')) {
            anda(f);
          }
        });
      })(bloco);
      partes.forEach(function (s, i) { s.style.setProperty('--d', (i * 46) + 'ms'); });
    });

    if (reduzido || !('IntersectionObserver' in window)) {
      blocos.forEach(function (b) { b.classList.add('dentro'); });
      return;
    }
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('dentro'); obs.unobserve(e.target); } });
    }, { threshold: 0.35 });
    blocos.forEach(function (b) { obs.observe(b); });
  })();

  /* ====================================================================== */
  /* 5. Parallax — data-parallax="0.18" (positivo sobe mais devagar)        */
  /* ====================================================================== */
  (function () {
    var itens = $$('[data-parallax]');
    if (!itens.length || reduzido) return;

    var medidos = itens.map(function (el) {
      return { el: el, f: parseFloat(el.getAttribute('data-parallax')) || 0.15, meio: 0, h: 0 };
    });
    function medir() {
      medidos.forEach(function (m) {
        var r = m.el.getBoundingClientRect();
        m.meio = r.top + window.scrollY + r.height / 2;
        m.h = r.height;
      });
    }
    medir();
    window.addEventListener('resize', medir, { passive: true });
    window.addEventListener('load', medir);

    aoRolar(function () {
      var centro = window.scrollY + window.innerHeight / 2;
      medidos.forEach(function (m) {
        var d = centro - m.meio;
        if (Math.abs(d) > window.innerHeight * 1.6 + m.h) return;
        m.el.style.transform = 'translate3d(0,' + (d * m.f * -1).toFixed(2) + 'px,0)';
      });
    });
    disparar();
  })();

  /* ====================================================================== */
  /* 6. Contadores animados                                                 */
  /* ====================================================================== */
  (function () {
    var alvos = $$('[data-contar]');
    if (!alvos.length) return;

    function formata(v, dec) {
      return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }

    function anima(el) {
      var fim = parseFloat(el.getAttribute('data-contar'));
      var dec = (el.getAttribute('data-contar').split('.')[1] || '').length;
      var pre = el.getAttribute('data-pre') || '';
      var dur = 1500;
      var t0 = null;
      function passo(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + formata(fim * e, dec);
        if (p < 1) requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    }

    if (reduzido || !('IntersectionObserver' in window)) {
      alvos.forEach(function (el) {
        var v = parseFloat(el.getAttribute('data-contar'));
        var dec = (el.getAttribute('data-contar').split('.')[1] || '').length;
        el.textContent = (el.getAttribute('data-pre') || '') + formata(v, dec);
      });
      return;
    }
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { anima(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.5 });
    alvos.forEach(function (el) { obs.observe(el); });
  })();

  /* ====================================================================== */
  /* 7. Brilho que segue o cursor nos cartões                               */
  /* ====================================================================== */
  (function () {
    if (reduzido || !window.matchMedia('(hover:hover)').matches) return;
    $$('.cartao, .vs-col, .post').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  })();

  /* ====================================================================== */
  /* 8. Scrollytelling — etapas fixas                                       */
  /* ====================================================================== */
  (function () {
    var wrap = $('.passos');
    if (!wrap) return;
    var passos = $$('.passo', wrap);
    var telas = $$('.passo-tela', wrap);
    var total = Math.max(passos.length, telas.length);
    if (!total) return;

    var mob = $('.passos-mob', wrap);
    var mnum = mob && $('.mnum', mob), mtit = mob && $('.mtit', mob), mdes = mob && $('.mdes', mob);
    var pontos = $$('.pponto', wrap);
    var ant = $('.pseta-ant', wrap), prox = $('.pseta-prox', wrap);
    var atual = -1;

    function ir(i) {
      i = Math.max(0, Math.min(total - 1, i));
      if (i === atual) return;
      atual = i;
      passos.forEach(function (p, k) { p.classList.toggle('ativo', k === i); });
      telas.forEach(function (t, k) { t.classList.toggle('ativo', k === i); });
      pontos.forEach(function (p, k) { p.classList.toggle('ativo', k === i); });
      if (mob && telas[i]) {
        var fonte = passos[i] || telas[i];
        if (mnum) mnum.textContent = 'Etapa ' + String(i + 1).padStart(2, '0');
        if (mtit) mtit.textContent = (fonte.getAttribute('data-titulo') || '');
        if (mdes) mdes.textContent = (fonte.getAttribute('data-desc') || '');
      }
      if (ant) ant.disabled = i === 0;
      if (prox) prox.disabled = i === total - 1;
    }

    /* desktop: posição da rolagem dentro do bloco fixo decide a etapa */
    var desktop = window.matchMedia('(min-width:901px)');
    function alturaBloco() {
      wrap.style.height = desktop.matches ? (total * 88 + 40) + 'vh' : '';
    }
    alturaBloco();
    desktop.addEventListener('change', function () { alturaBloco(); ir(0); disparar(); });

    aoRolar(function () {
      if (!desktop.matches) return;
      var r = wrap.getBoundingClientRect();
      var percorrivel = wrap.offsetHeight - window.innerHeight;
      if (percorrivel <= 0) return;
      var p = Math.min(0.9999, Math.max(0, -r.top / percorrivel));
      ir(Math.floor(p * total));
    });

    passos.forEach(function (p, i) {
      p.addEventListener('click', function () {
        if (!desktop.matches) { ir(i); return; }
        var percorrivel = wrap.offsetHeight - window.innerHeight;
        var topo = wrap.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: topo + percorrivel * ((i + 0.5) / total), behavior: 'smooth' });
      });
    });
    if (ant) ant.addEventListener('click', function () { ir(atual - 1); });
    if (prox) prox.addEventListener('click', function () { ir(atual + 1); });

    /* gesto de arrastar no mobile */
    var dir = $('.passos-dir', wrap), x0 = null;
    if (dir) {
      dir.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      dir.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 44) ir(atual + (dx < 0 ? 1 : -1));
        x0 = null;
      }, { passive: true });
    }

    ir(0);
    disparar();
  })();

  /* ====================================================================== */
  /* 9. FAQ                                                                 */
  /* ====================================================================== */
  (function () {
    $$('.faq-item').forEach(function (item) {
      var q = $('.faq-q', item);
      if (!q) return;
      q.addEventListener('click', function () {
        var abrindo = !item.classList.contains('aberto');
        var faq = item.closest('.faq');
        if (faq) $$('.faq-item', faq).forEach(function (o) {
          o.classList.remove('aberto');
          var oq = $('.faq-q', o); if (oq) oq.setAttribute('aria-expanded', 'false');
        });
        item.classList.toggle('aberto', abrindo);
        q.setAttribute('aria-expanded', abrindo ? 'true' : 'false');
      });
    });
  })();

  /* ====================================================================== */
  /* 10. Teia de partículas do hero                                         */
  /* ====================================================================== */
  (function () {
    var tela = $('.hero-teia');
    if (!tela || reduzido) return;
    var ctx = tela.getContext('2d');
    var pts = [], l = 0, a = 0, raf = null, visivel = true;
    var mouse = { x: -9999, y: -9999 };

    function dimensionar() {
      var r = tela.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      l = r.width; a = r.height;
      tela.width = l * dpr; tela.height = a * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(110, Math.round(l * a / 11000));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({ x: Math.random() * l, y: Math.random() * a, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, r: Math.random() * 1.6 + .9 });
      }
    }

    function quadro() {
      ctx.clearRect(0, 0, l, a);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > l) p.vx *= -1;
        if (p.y < 0 || p.y > a) p.vy *= -1;

        var dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = dm < 150 ? 'rgba(18,5,115,.55)' : 'rgba(108,216,207,.78)';
        ctx.fill();

        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j];
          var d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 168) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = 'rgba(108,216,207,' + (0.42 * (1 - d / 168)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(quadro);
    }

    function liga() { if (!raf && visivel) quadro(); }
    function desliga() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    dimensionar();
    window.addEventListener('resize', function () { dimensionar(); }, { passive: true });
    tela.parentElement.addEventListener('pointermove', function (e) {
      var r = tela.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    tela.parentElement.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visivel = es[0].isIntersecting;
        visivel ? liga() : desliga();
      }, { threshold: 0 }).observe(tela);
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? desliga() : liga();
    });
    liga();
  })();

  /* ====================================================================== */
  /* 11. Transição de saída entre páginas                                   */
  /* ====================================================================== */
  (function () {
    var veu = $('.veu');
    if (!veu || reduzido) return;

    requestAnimationFrame(function () { veu.classList.add('saindo'); });

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || a.target === '_blank' || a.hasAttribute('download')) return;
      if (a.host && a.host !== window.location.host) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      veu.classList.remove('saindo');
      veu.classList.add('entrando');
      setTimeout(function () { window.location.href = a.href; }, 420);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) { veu.classList.remove('entrando'); veu.classList.add('saindo'); }
    });
  })();

  /* ====================================================================== */
  /* 12. Botão flutuante do WhatsApp                                        */
  /* ====================================================================== */
  (function () {
    var zap = $('.zap');
    if (!zap) return;
    aoRolar(function () { zap.classList.toggle('visivel', window.scrollY > 520); });
  })();

  /* ====================================================================== */
  /* 13. Formulários — abre o e-mail já preenchido                          */
  /* ====================================================================== */
  (function () {
    $$('form[data-email]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!f.reportValidity()) return;
        var dados = new FormData(f);
        var linhas = [];
        dados.forEach(function (v, k) { if (String(v).trim()) linhas.push(k + ': ' + v); });
        var assunto = f.getAttribute('data-assunto') || 'Contato pelo site da Grou';
        window.location.href = 'mailto:' + f.getAttribute('data-email') +
          '?subject=' + encodeURIComponent(assunto) +
          '&body=' + encodeURIComponent(linhas.join('\n'));
        var ok = $('.form-ok', f.parentElement);
        if (ok) ok.classList.add('visivel');
        f.reset();
      });
    });
  })();

  /* ====================================================================== */
  /* 14. Filtros de conteúdo                                                */
  /* ====================================================================== */
  (function () {
    var chips = $$('.chip[data-filtro]');
    if (!chips.length) return;
    var itens = $$('[data-categoria]');
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        chips.forEach(function (o) { o.classList.remove('ativo'); o.setAttribute('aria-pressed', 'false'); });
        c.classList.add('ativo'); c.setAttribute('aria-pressed', 'true');
        var f = c.getAttribute('data-filtro');
        itens.forEach(function (i) {
          var bate = f === 'todos' || i.getAttribute('data-categoria') === f;
          i.classList.toggle('oculto', !bate);
        });
      });
    });
  })();

  /* ====================================================================== */
  /* 15. Ano corrente no rodapé                                             */
  /* ====================================================================== */
  $$('[data-ano]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  disparar();
})();
