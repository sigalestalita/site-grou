/* Montagem do certificado DU99 (usado na página do participante, na verificação e na prévia do painel).
   DU99Cert.render(alvo, ctx) desenha o certificado dentro de "alvo" e devolve o elemento .dc.
   ctx = { identidade, tipo (dados do tipo de certificado), evento {nome, tipo_evento, dados}, nome, codigo, papel, verificar (URL base) } */
(function () {
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function partes(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? { a: +m[1], m: +m[2], d: +m[3] } : null; }
  function formataData(ini, fim) {
    var a = partes(ini), b = partes(fim);
    if (!a) return '';
    var um = function (x) { return x.d + ' de ' + MESES[x.m - 1] + ' de ' + x.a; };
    if (!b || (a.a === b.a && a.m === b.m && a.d === b.d)) return um(a);
    if (a.a === b.a && a.m === b.m) return a.d + ' a ' + b.d + ' de ' + MESES[a.m - 1] + ' de ' + a.a;
    if (a.a === b.a) return a.d + ' de ' + MESES[a.m - 1] + ' a ' + b.d + ' de ' + MESES[b.m - 1] + ' de ' + a.a;
    return um(a) + ' a ' + um(b);
  }
  function dataCurta(ini, fim) {
    var a = partes(ini), b = partes(fim), p = function (n) { return (n < 10 ? '0' : '') + n; };
    if (!a) return '';
    var s = p(a.d) + '/' + p(a.m) + '/' + a.a;
    return b && (b.a !== a.a || b.m !== a.m || b.d !== a.d) ? s + ' a ' + p(b.d) + '/' + p(b.m) + '/' + b.a : s;
  }
  function carga(h) {
    var n = Number(h); if (!n || n <= 0) return '';
    var horas = Math.floor(n), min = Math.round((n - horas) * 60);
    if (!min) return horas + (horas === 1 ? ' hora' : ' horas');
    return (horas ? horas + 'h' : '') + (min < 10 ? '0' : '') + min + (horas ? '' : ' minutos');
  }
  var MODAL = { presencial: 'Presencial', online: 'Online', hibrido: 'Híbrido' };

  function variaveis(ctx) {
    var ev = ctx.evento || {}, d = ev.dados || {}, id = ctx.identidade || {};
    var local = d.local || '', cidade = d.cidade || '';
    var emLocal = d.modalidade === 'online' ? ', on-line' : (local && cidade ? ', em ' + local + ', ' + cidade : (local || cidade ? ', em ' + (local || cidade) : ''));
    var ch = carga(d.carga_horaria);
    return {
      nome: ctx.nome || '', evento: ev.nome || '', subtitulo: d.subtitulo || '', tipo_evento: ev.tipo_evento || '',
      empresa: id.nome_empresa || 'DU99', data: formataData(d.data_inicio, d.data_fim), local: local, cidade: cidade,
      modalidade: (MODAL[d.modalidade] || '').toLowerCase(), carga_horaria: ch, temas: d.temas || '', papel: ctx.papel || '',
      em_local: emLocal, com_carga: ch ? ', com carga horária de ' + ch : ''
    };
  }
  /* texto do modelo: {variavel} vira o valor e **trecho** vira negrito (tudo escapado antes) */
  function aplica(modelo, v) {
    var s = esc(modelo || '').replace(/\{([a-z_]+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(v, k) ? esc(v[k]) : m; });
    return s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  }
  var img = function (src, cls, alt) { return src ? '<img class="' + cls + '" src="' + esc(src) + '" alt="' + esc(alt || '') + '" crossorigin="anonymous">' : ''; };

  var carregadas = {};
  function fontes(nomes) {
    var falta = nomes.filter(function (n) { return n && !carregadas[n]; });
    falta.forEach(function (n) {
      carregadas[n] = 1;
      var l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(n).replace(/%20/g, '+') + ':wght@400;600;700&display=swap';
      document.head.appendChild(l);
    });
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(nomes.filter(Boolean).map(function (n) { return Promise.all([document.fonts.load('400 16px "' + n + '"'), document.fonts.load('700 16px "' + n + '"')]).catch(function () {}); }))
      .then(function () { return document.fonts.ready; });
  }

  function render(alvo, ctx) {
    var id = ctx.identidade || {}, t = ctx.tipo || {}, ev = ctx.evento || {}, d = ev.dados || {};
    var cor = Object.assign({}, id.cores || {}, t.cores || {}), fo = id.fontes || {};
    var v = variaveis(ctx);
    var ass = (t.usar_assinaturas_proprias && (t.assinaturas || []).length ? t.assinaturas : (id.assinaturas || [])).slice(0, 3);
    var assHtml = '<div class="ass">' + ass.map(function (a) {
      return '<div>' + img(a.imagem_url, '', 'Assinatura de ' + (a.nome || '')) + '<div class="lin"></div><span class="an">' + esc(a.nome) + '</span><span class="ac">' + esc(a.cargo) + '</span></div>';
    }).join('') + '</div>';
    var urlVer = (ctx.verificar || (location.origin + '/du99/verificar/'));
    var valHtml = '<div class="val"><div><small>Código de verificação</small><span class="cod">' + esc(ctx.codigo || '') + '</span><span class="url">' + esc(urlVer.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</span></div>'
      + (t.mostrar_qr === false ? '' : '<div class="qr" data-qr></div>') + '</div>';
    var temas = t.mostrar_temas && v.temas ? '<p class="temas"><strong>Temas</strong>' + esc(v.temas) + '</p>' : '';
    var titulo = esc(t.titulo || 'Certificado'), sub = esc(t.subtitulo || '');
    var fundo = t.fundo_url ? '<img class="fundo" src="' + esc(t.fundo_url) + '" alt="" crossorigin="anonymous" style="opacity:' + (t.fundo_opacidade == null ? 0.15 : Number(t.fundo_opacidade)) + '">' : '';
    var nomeHtml = '<p class="nome" data-nome>' + esc(ctx.nome || 'Nome do participante') + '</p>';
    var texto = '<p class="txt">' + aplica(t.texto || 'participou de **{evento}**.', v) + '</p>';
    var fichas = [];
    if (v.data) fichas.push(['Data', dataCurta(d.data_inicio, d.data_fim)]);
    if (d.modalidade === 'online') fichas.push(['Modalidade', 'Online']);
    else if (d.local || d.cidade) fichas.push(['Local', [d.local, d.cidade].filter(Boolean).join(' · ')]);
    if (v.carga_horaria) fichas.push(['Carga horária', v.carga_horaria + (d.modalidade ? ' · ' + (MODAL[d.modalidade] || '').toLowerCase() : '')]);
    var layout = ['lateral', 'classico', 'moderno'].indexOf(t.layout) > -1 ? t.layout : 'lateral';
    var h = '';
    if (layout === 'lateral') {
      h = '<div class="lado"><div class="deco2"></div><div class="deco"></div>' + img(id.logo_claro_url || id.logo_url, 'logo', id.nome_empresa)
        + (id.slogan ? '<p class="slogan">' + esc(id.slogan) + '</p>' : '')
        + '<div class="fichas">' + fichas.map(function (f) { return '<div class="ficha"><small>' + esc(f[0]) + '</small><span>' + esc(f[1]) + '</span></div>'; }).join('') + '</div>'
        + '<p class="emissor">Emitido por ' + esc(v.empresa) + '</p></div>'
        + '<div class="corpo">' + fundo + '<div class="faixa"></div><p class="tit">' + titulo + '</p><p class="tit2">' + sub + '</p>'
        + '<p class="abre">' + esc(t.abertura || 'Certificamos que') + '</p>' + nomeHtml + '<div class="sub"></div>' + texto + temas
        + '<div class="pe">' + assHtml + valHtml + '</div></div>';
    } else if (layout === 'classico') {
      h = fundo + '<div class="moldura"></div><div class="canto" style="left:2mm;top:2mm"></div><div class="canto" style="right:2mm;bottom:2mm"></div>'
        + '<div class="corpo">' + img(id.logo_url, 'logo', id.nome_empresa) + '<p class="tit2">' + titulo + '</p><p class="tit">' + sub + '</p>'
        + '<p class="abre">' + esc(t.abertura || 'Certificamos que') + '</p>' + nomeHtml + '<div class="sub"></div>' + texto + temas
        + '<div class="pe">' + assHtml + valHtml + '</div></div>';
    } else {
      h = '<div class="topo"><div class="deco"></div>' + img(id.logo_claro_url || id.logo_url, 'logo', id.nome_empresa)
        + '<div class="rotulo"><p class="tit">' + titulo + '</p><p class="tit2">' + sub + '</p></div></div>'
        + '<div class="corpo">' + fundo + '<div class="barra"></div><p class="abre">' + esc(t.abertura || 'Certificamos que') + '</p>' + nomeHtml + texto + temas
        + '<div class="fichas">' + fichas.map(function (f) { return '<div class="ficha"><small>' + esc(f[0]) + '</small><span>' + esc(f[1]) + '</span></div>'; }).join('') + '</div>'
        + '<div class="pe">' + assHtml + valHtml + '</div></div>';
    }
    alvo.innerHTML = '<div class="dc ' + layout + '">' + h + '</div>';
    var el = alvo.querySelector('.dc');
    var vars = { '--c1': cor.primaria, '--c2': cor.secundaria, '--c3': cor.destaque, '--tx': cor.texto, '--bg': cor.fundo, '--ft': fo.titulo ? "'" + fo.titulo + "'" : '', '--fx': fo.texto ? "'" + fo.texto + "'" : '' };
    Object.keys(vars).forEach(function (k) { if (vars[k]) el.style.setProperty(k, vars[k]); });
    var q = el.querySelector('[data-qr]');
    if (q && window.qrcode && ctx.codigo) {
      try { var qr = window.qrcode(0, 'M'); qr.addData(urlVer + '?codigo=' + ctx.codigo); qr.make(); q.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (e) { /* sem QR */ }
    }
    return el;
  }

  /* nome comprido: diminui a fonte até caber na largura disponível */
  function ajusta(el) {
    var n = el.querySelector('.nome'); if (!n) return;
    var caixa = n.parentElement, estilo = getComputedStyle(caixa);
    var max = caixa.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight) - 4;
    n.style.fontSize = '';
    var tam = parseFloat(getComputedStyle(n).fontSize);
    while (n.scrollWidth > max && tam > 18) { tam -= 1; n.style.fontSize = tam + 'px'; }
  }
  function prepara(ctx) {
    var fo = (ctx.identidade || {}).fontes || {};
    return fontes([fo.titulo || 'Comfortaa', fo.texto || 'Nunito']);
  }

  window.DU99Cert = { render: render, ajusta: ajusta, prepara: prepara, fontes: fontes, variaveis: variaveis, aplica: aplica, formataData: formataData, dataCurta: dataCurta, carga: carga, esc: esc };
})();
