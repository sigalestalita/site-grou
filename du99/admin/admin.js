/* Painel de certificados DU99. Navegação por #hash:
   #eventos · #evento/<id>/<aba> (dados, participantes, avaliacao, whatsapp) · #evento/novo
   #certificados · #certificado/<id|novo> · #tipos-evento · #identidade · #acessos */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var C = window.DU99Cert, esc = C.esc;
  var S = { dados: null, usuario: null, parts: {}, sujo: false };
  var ORIGEM = location.origin;

  /* ---------- utilidades ---------- */
  function api(rota, corpo, params) {
    var q = params ? '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&') : '';
    var op = corpo ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), credentials: 'same-origin' } : { credentials: 'same-origin' };
    return fetch('/du99/api/' + rota + '/' + q, op)
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._ok = r.ok; j._status = r.status; if (r.status === 401 && rota !== 'login' && rota !== 'eu') porta(); return j; }); })
      .catch(function () { return { _ok: false, erro: 'Sem conexão. Tente de novo.' }; });
  }
  var tAviso;
  function aviso(msg, mal) { var a = $('#aviso'); a.textContent = msg; a.className = 'aviso' + (mal ? ' mal' : ''); a.hidden = false; clearTimeout(tAviso); tAviso = setTimeout(function () { a.hidden = true; }, mal ? 6000 : 3000); }
  function copia(txt) { try { return navigator.clipboard.writeText(txt).then(function () { aviso('Copiado.'); }, function () { aviso('Selecione e copie com Ctrl+C.', true); }); } catch (e) { aviso('Selecione e copie com Ctrl+C.', true); } }
  function slugify(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70); }
  function porId(lista, id) { return (lista || []).filter(function (x) { return x.id === id; })[0] || null; }
  function hoje() { return new Date().toISOString().slice(0, 10); }
  function fmtData(iso) { if (!iso) return ''; var d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function celFmt(n) { n = String(n || '').replace(/\D/g, ''); if (n.length === 13 && n.indexOf('55') === 0) n = n.slice(2); if (n.length === 11) return '(' + n.slice(0, 2) + ') ' + n.slice(2, 7) + '-' + n.slice(7); if (n.length === 10) return '(' + n.slice(0, 2) + ') ' + n.slice(2, 6) + '-' + n.slice(6); return n; }
  function waNum(n) { n = String(n || '').replace(/\D/g, ''); if (n.length === 10 || n.length === 11) n = '55' + n; return n; }
  function form(el) { var o = {}; $$('[name]', el).forEach(function (i) { if (i.type === 'checkbox') o[i.name] = i.checked; else if (i.type === 'radio') { if (i.checked) o[i.name] = i.value; } else o[i.name] = i.value; }); return o; }
  function campo(rot, html, cls, ajuda) { return '<label class="campo ' + (cls || '') + '"><span>' + rot + '</span>' + html + (ajuda ? '<small>' + ajuda + '</small>' : '') + '</label>'; }
  function inp(nome, valor, extra) { return '<input type="text" name="' + nome + '" value="' + esc(valor == null ? '' : valor) + '" ' + (extra || '') + '>'; }
  function area(nome, valor, extra) { return '<textarea name="' + nome + '" ' + (extra || '') + '>' + esc(valor || '') + '</textarea>'; }
  function sel(nome, valor, opcoes) { return '<select name="' + nome + '">' + opcoes.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(valor == null ? '' : valor) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  function chk(nome, valor, rot) { return '<label class="marca-check"><input type="checkbox" name="' + nome + '"' + (valor ? ' checked' : '') + '><span>' + rot + '</span></label>'; }
  function dialogo(html, aoAbrir) { var d = $('#dlg'); $('#dlgForm').innerHTML = html; d.showModal(); if (aoAbrir) aoAbrir($('#dlgForm')); return d; }
  function confirma(msg, rotulo) {
    return new Promise(function (ok) {
      dialogo('<h2>Confirmar</h2><p>' + esc(msg) + '</p><div class="linha-bt"><button class="btn btn-s" value="nao">Cancelar</button><button class="btn btn-mal" value="sim">' + esc(rotulo || 'Confirmar') + '</button></div>');
      $('#dlg').addEventListener('close', function f() { $('#dlg').removeEventListener('close', f); ok($('#dlg').returnValue === 'sim'); });
    });
  }
  window.addEventListener('beforeunload', function (e) { if (S.sujo) { e.preventDefault(); e.returnValue = ''; } });

  /* upload: reduz imagens grandes no navegador e manda como data URL */
  function enviaImagem(arquivo, pasta, manterPng) {
    return new Promise(function (ok, falha) {
      if (!/^image\/(png|jpeg|webp)$/.test(arquivo.type)) return falha('Use uma imagem PNG, JPG ou WEBP.');
      var leitor = new FileReader();
      leitor.onload = function () {
        var img = new Image();
        img.onload = function () {
          var max = 2000, w = img.width, h = img.height, k = Math.min(1, max / Math.max(w, h));
          var png = manterPng || arquivo.type === 'image/png';
          if (k === 1 && arquivo.size < 2300000) return ok(leitor.result);
          var cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          ok(cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.88));
        };
        img.onerror = function () { falha('Não foi possível ler a imagem.'); };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    }).then(function (dataUrl) { return api('upload', { pasta: pasta, imagem: dataUrl }); })
      .then(function (j) { if (!j._ok) throw (j.erro || 'Falha no envio.'); return j.url; });
  }
  /* campo de imagem: mostra miniatura, botão de enviar e de remover; grava a URL num input escondido */
  function campoImagem(nome, valor, pasta, rot, escuro, ajuda) {
    return '<div class="campo"><span>' + rot + '</span><div class="imgcampo" data-img="' + nome + '" data-pasta="' + pasta + '">'
      + '<div class="mini' + (escuro ? ' escuro' : '') + '" style="background-image:' + (valor ? 'url(\'' + esc(valor) + '\')' : 'none') + '"></div>'
      + '<input type="hidden" name="' + nome + '" value="' + esc(valor || '') + '">'
      + '<label class="btn btn-s btn-pq">Enviar imagem<input type="file" accept="image/png,image/jpeg,image/webp" hidden></label>'
      + '<button type="button" class="btn btn-s btn-pq" data-limpa>Remover</button></div>' + (ajuda ? '<small>' + ajuda + '</small>' : '') + '</div>';
  }
  function ligaImagens(raiz, aoMudar) {
    $$('[data-img]', raiz).forEach(function (bloco) {
      var oculto = $('input[type=hidden]', bloco), mini = $('.mini', bloco);
      $('input[type=file]', bloco).addEventListener('change', function () {
        var f = this.files[0]; if (!f) return;
        aviso('Enviando imagem…');
        enviaImagem(f, bloco.dataset.pasta, bloco.dataset.pasta !== 'eventos' && bloco.dataset.pasta !== 'fundos').then(function (url) {
          oculto.value = url; mini.style.backgroundImage = "url('" + url + "')"; aviso('Imagem enviada.'); if (aoMudar) aoMudar();
        }, function (e) { aviso(String(e), true); });
        this.value = '';
      });
      $('[data-limpa]', bloco).addEventListener('click', function () { oculto.value = ''; mini.style.backgroundImage = 'none'; if (aoMudar) aoMudar(); });
    });
  }

  /* ---------- prévia do certificado ---------- */
  function previaHtml(dica) { return '<div class="previa"><div class="palco"><div class="escala" id="pvEscala"></div></div><p class="dica">' + (dica || 'Prévia com dados de exemplo. O nome e o código mudam para cada participante.') + '</p></div>'; }
  var pvTimer;
  function previa(ctx) {
    clearTimeout(pvTimer);
    pvTimer = setTimeout(function () {
      var alvo = $('#pvEscala'); if (!alvo) return;
      var el = C.render(alvo, Object.assign({ nome: 'Maria Aparecida da Silva', codigo: (S.dados.config.prefixo_codigo || 'DU99') + '-A1B2-C3D4', verificar: ORIGEM + '/du99/verificar/' }, ctx));
      var ajusta = function () { C.ajusta(el); var p = alvo.parentElement, s = (p.clientWidth - 28) / el.offsetWidth; alvo.style.transform = 'scale(' + s + ')'; alvo.style.height = el.offsetHeight * s + 'px'; alvo.style.width = el.offsetWidth * s + 'px'; };
      ajusta(); C.prepara(ctx).then(ajusta);
    }, 120);
  }
  function eventoExemplo() {
    var ev = (S.dados.eventos || [])[0];
    if (ev) return { nome: ev.nome, tipo_evento: (porId(S.dados.tipos_evento, ev.tipo_evento_id) || {}).nome || '', dados: ev.dados || {} };
    return { nome: 'Mutirão de revitalização da praça', tipo_evento: 'Ação social', dados: { data_inicio: hoje(), local: 'Praça da Matriz', cidade: 'Porto Alegre (RS)', modalidade: 'presencial', carga_horaria: 4, temas: 'Cuidado com o espaço público · Trabalho em equipe · Impacto social' } };
  }
  window.addEventListener('resize', function () { var a = $('#pvEscala'); if (a && a.firstChild) { var el = a.firstChild, s = (a.parentElement.clientWidth - 28) / el.offsetWidth; a.style.transform = 'scale(' + s + ')'; a.style.height = el.offsetHeight * s + 'px'; a.style.width = el.offsetWidth * s + 'px'; } });

  /* ---------- entrar ---------- */
  function porta() {
    $('#app').hidden = true; $('#porta').hidden = false;
    var token = new URLSearchParams(location.search).get('convite');
    if (token) {
      $('#fLogin').hidden = true; $('#fConvite').hidden = false;
      api('convite', null, { token: token }).then(function (j) {
        var f = $('#fConvite');
        if (!j._ok) { $('.erro', f).textContent = j.erro; $('.erro', f).hidden = false; $('button', f).disabled = true; return; }
        if (j.email) { $('#cvEmail').hidden = true; $('#cvSub').textContent = 'Acesso de ' + j.email + '. Defina sua senha para entrar.'; }
        if (j.troca) $('#cvTit').textContent = 'Definir nova senha';
        f.nome.value = j.nome || '';
      });
    }
  }
  $('#fLogin').addEventListener('submit', function (e) {
    e.preventDefault(); var f = this, b = $('button', f), er = $('.erro', f);
    b.disabled = true; er.hidden = true;
    api('login', { email: f.email.value.trim(), senha: f.senha.value }).then(function (j) {
      b.disabled = false;
      if (!j._ok) { er.textContent = j.erro || 'Não foi possível entrar.'; er.hidden = false; return; }
      f.senha.value = ''; inicia();
    });
  });
  $('#fConvite').addEventListener('submit', function (e) {
    e.preventDefault(); var f = this, b = $('button', f), er = $('.erro', f);
    if (f.senha.value.length < 10) { er.textContent = 'Use uma senha com pelo menos 10 caracteres.'; er.hidden = false; return; }
    b.disabled = true; er.hidden = true;
    api('aceitar', { token: new URLSearchParams(location.search).get('convite'), nome: f.nome.value, email: f.email.value, senha: f.senha.value }).then(function (j) {
      b.disabled = false;
      if (!j._ok) { er.textContent = j.erro || 'Não foi possível salvar.'; er.hidden = false; return; }
      history.replaceState(null, '', location.pathname + '#eventos'); inicia();
    });
  });
  $('#sair').addEventListener('click', function () { api('sair', {}).then(function () { location.href = location.pathname; }); });

  function inicia() {
    return api('dados').then(function (j) {
      if (!j._ok) { if (j._status !== 401) aviso(j.erro || 'Falha ao carregar.', true); porta(); return; }
      S.dados = j; S.usuario = j.usuario;
      $('#porta').hidden = true; $('#app').hidden = false;
      $('#quem').textContent = j.usuario.nome || j.usuario.email;
      aplicaCores();
      rota();
    });
  }
  function aplicaCores() {
    var c = (S.dados.config || {}).cores || {}, r = document.documentElement.style;
    if (c.primaria) r.setProperty('--c1', c.primaria); if (c.secundaria) r.setProperty('--c2', c.secundaria); if (c.destaque) r.setProperty('--c3', c.destaque);
    var cfg = S.dados.config || {}; $('#cabLogo').src = cfg.logo_claro_url || cfg.logo_url || '/du99/assets/logo-du99-claro.png';
  }
  function recarrega() { return api('dados').then(function (j) { if (j._ok) { S.dados = j; aplicaCores(); } return j; }); }

  /* ---------- rotas ---------- */
  window.addEventListener('hashchange', function () { if (S.sujo && !window.confirm('Há alterações não salvas. Sair mesmo assim?')) return; S.sujo = false; rota(); });
  function rota() {
    if (!S.dados) return;
    var h = (location.hash || '#eventos').slice(1).split('/');
    var m = h[0] === 'evento' ? 'eventos' : h[0] === 'certificado' ? 'certificados' : h[0];
    $$('#menu a').forEach(function (a) { a.classList.toggle('ativo', a.dataset.m === m); });
    var alvo = $('#conteudo'); window.scrollTo(0, 0);
    if (h[0] === 'evento') return telaEvento(alvo, h[1], h[2] || 'dados');
    if (h[0] === 'certificados') return telaCertificados(alvo);
    if (h[0] === 'certificado') return telaCertificado(alvo, h[1]);
    if (h[0] === 'tipos-evento') return telaTiposEvento(alvo);
    if (h[0] === 'identidade') return telaIdentidade(alvo);
    if (h[0] === 'acessos') return telaAcessos(alvo);
    return telaEventos(alvo);
  }

  /* ---------- eventos ---------- */
  var STATUS = { rascunho: 'Rascunho', aberto: 'Emissão aberta', encerrado: 'Encerrado' };
  function npsDe(n) { var t = n[0] + n[1] + n[2]; return t ? Math.round((n[0] - n[2]) / t * 100) : null; }
  function telaEventos(alvo) {
    var evs = S.dados.eventos || [];
    alvo.innerHTML = '<div class="titulo"><div><h1>Eventos</h1><p>Cada evento tem a sua lista de participantes e o seu endereço para gerar o certificado.</p></div><a class="btn btn-p" href="#evento/novo">Novo evento</a></div>'
      + (evs.length ? '<div class="grade">' + evs.map(function (e) {
        var d = e.dados || {}, st = e.estatisticas || {}, n = npsDe(st.nps || [0, 0, 0]);
        return '<a class="ev" href="#evento/' + e.id + '/participantes"><span class="selo ' + e.status + '">' + STATUS[e.status] + '</span><b>' + esc(e.nome) + '</b>'
          + '<span class="meta">' + esc([(porId(S.dados.tipos_evento, e.tipo_evento_id) || {}).nome, C.dataCurta(d.data_inicio, d.data_fim), d.cidade].filter(Boolean).join(' · ') || 'Sem data') + '</span>'
          + '<div class="nums"><div><strong>' + st.total + '</strong><span>na lista</span></div><div><strong>' + st.presentes + '</strong><span>presentes</span></div><div><strong>' + st.gerados + '</strong><span>geraram</span></div><div><strong>' + (n === null ? '–' : n) + '</strong><span>NPS</span></div></div></a>';
      }).join('') + '</div>' : '<div class="card"><p class="vazio">Nenhum evento ainda. Crie o primeiro em "Novo evento".</p></div>');
  }

  function telaEvento(alvo, id, aba) {
    var ev = id === 'novo' ? null : porId(S.dados.eventos, id);
    if (id !== 'novo' && !ev) { alvo.innerHTML = '<p class="vazio">Evento não encontrado.</p>'; return; }
    var cab = '<a class="volta" href="#eventos">← Eventos</a><div class="titulo"><div><h1>' + esc(ev ? ev.nome : 'Novo evento') + '</h1>' + (ev ? '<p><span class="selo ' + ev.status + '">' + STATUS[ev.status] + '</span></p>' : '') + '</div></div>';
    if (!ev) { alvo.innerHTML = cab + '<div id="corpo"></div>'; return abaDados($('#corpo'), null); }
    var url = ORIGEM + '/du99/evento/' + ev.slug + '/';
    var abas = [['participantes', 'Participantes'], ['dados', 'Dados do evento'], ['avaliacao', 'Avaliação (NPS)'], ['whatsapp', 'WhatsApp']];
    alvo.innerHTML = cab
      + '<div class="link-pub"><span>Página do certificado:</span><code>' + esc(url) + '</code><button class="btn btn-s btn-pq" type="button" id="cpLink">Copiar</button><a class="btn btn-s btn-pq" href="' + esc(url) + '" target="_blank" rel="noopener">Abrir</a>'
      + (ev.status !== 'aberto' ? '<span style="color:var(--atencao);font-weight:700">' + (ev.status === 'rascunho' ? 'Rascunho: a página ainda não está no ar.' : 'Emissão encerrada: a página só mostra o aviso.') + '</span>' : '') + '</div>'
      + '<nav class="abas">' + abas.map(function (a) { return '<a href="#evento/' + ev.id + '/' + a[0] + '"' + (a[0] === aba ? ' class="ativo"' : '') + '>' + a[1] + '</a>'; }).join('') + '</nav><div id="corpo"></div>';
    $('#cpLink').addEventListener('click', function () { copia(url); });
    var corpo = $('#corpo');
    if (aba === 'participantes') return abaParticipantes(corpo, ev);
    if (aba === 'avaliacao') return abaAvaliacao(corpo, ev);
    if (aba === 'whatsapp') return abaWhatsapp(corpo, ev);
    return abaDados(corpo, ev);
  }

  var VARS_TXT = ['nome', 'evento', 'subtitulo', 'tipo_evento', 'empresa', 'data', 'local', 'cidade', 'modalidade', 'carga_horaria', 'temas', 'papel', 'em_local', 'com_carga'];
  function abaDados(alvo, ev) {
    var d = (ev && ev.dados) || {};
    var tiposEv = [['', '— escolha —']].concat((S.dados.tipos_evento || []).filter(function (t) { return t.ativo || (ev && t.id === ev.tipo_evento_id); }).map(function (t) { return [t.id, t.nome]; }));
    var tiposC = [['', '— escolha —']].concat((S.dados.tipos_certificado || []).filter(function (t) { return t.ativo || (ev && t.id === ev.tipo_certificado_id); }).map(function (t) { return [t.id, t.nome]; }));
    alvo.innerHTML = '<div class="duas"><form class="card" id="fEv" novalidate><div class="form">'
      + campo('Nome do evento', inp('nome', ev ? ev.nome : '', 'maxlength="140" required'), 'todo')
      + campo('Endereço da página', inp('slug', ev ? ev.slug : '', 'maxlength="80" pattern="[a-z0-9-]+"'), 'todo', 'Fica em ' + esc(ORIGEM) + '/du99/evento/<b>endereço</b>/. Só letras minúsculas, números e hífens.')
      + campo('Subtítulo', inp('subtitulo', d.subtitulo, 'maxlength="160"'), 'todo', 'Opcional. Aparece na página e pode entrar no texto do certificado com {subtitulo}.')
      + campo('Tipo de evento', sel('tipo_evento_id', ev && ev.tipo_evento_id, tiposEv))
      + campo('Tipo de certificado', sel('tipo_certificado_id', ev && ev.tipo_certificado_id, tiposC), '', 'Modelo padrão do evento. Dá para trocar por participante (ex.: palestrantes).')
      + campo('Início', '<input type="date" name="data_inicio" value="' + esc(d.data_inicio || '') + '">')
      + campo('Término', '<input type="date" name="data_fim" value="' + esc(d.data_fim || '') + '">', '', 'Deixe vazio se for um dia só.')
      + campo('Modalidade', sel('modalidade', d.modalidade || 'presencial', [['presencial', 'Presencial'], ['online', 'Online'], ['hibrido', 'Híbrido']]))
      + campo('Carga horária (horas)', '<input type="number" name="carga_horaria" min="0" step="0.5" value="' + esc(d.carga_horaria == null ? '' : d.carga_horaria) + '">', '', 'Ex.: 4 ou 1,5. Vazio: o certificado não cita a carga.')
      + campo('Local', inp('local', d.local, 'maxlength="140"'), '', 'Ex.: Praça da Matriz')
      + campo('Cidade', inp('cidade', d.cidade, 'maxlength="80"'), '', 'Ex.: Porto Alegre (RS)')
      + campo('Temas', area('temas', d.temas, 'maxlength="600" rows="2"'), 'todo', 'Separe por " · ". Aparece no certificado quando o tipo de certificado mostra os temas.')
      + campoImagem('imagem_url', d.imagem_url, 'eventos', 'Imagem de capa (opcional)', false, 'Fundo da página do evento.')
      + '<div class="campo todo"><span>Quem pode gerar o certificado</span>'
      + '<label class="marca-check"><input type="radio" name="regra" value="inscritos"' + (d.regra !== 'presentes' ? ' checked' : '') + '><span>Todos os e-mails da lista de participantes</span></label>'
      + '<label class="marca-check"><input type="radio" name="regra" value="presentes"' + (d.regra === 'presentes' ? ' checked' : '') + '><span>Só quem tiver a presença marcada</span></label></div>'
      + '<div class="campo todo">' + chk('pede_nps', ev ? d.pede_nps : true, 'Pedir uma nota de 0 a 10 (NPS) antes de gerar o certificado') + '</div>'
      + campo('Pergunta da nota', inp('pergunta_nps', d.pergunta_nps || '', 'maxlength="160" placeholder="De 0 a 10, o quanto você recomendaria este evento a um amigo ou colega?"'), 'todo')
      + campo('Texto do post no LinkedIn', area('texto_post', d.texto_post || '', 'maxlength="1500" rows="6" placeholder="Participei de {evento}, realizado por {empresa}{em_local}.&#10;&#10;Meu certificado: {link}"'), 'todo', 'O participante pode editar antes de publicar. Variáveis: {evento}, {empresa}, {data}, {em_local}, {com_carga}, {link}. Vazio: usa um texto padrão.')
      + campo('Nome da certificação no LinkedIn', inp('linkedin_nome', d.linkedin_nome, 'maxlength="120"'), 'todo', 'Vazio: usa o nome do evento.')
      + campo('Mensagem de ajuda', inp('ajuda', d.ajuda, 'maxlength="300"'), 'todo', 'Aparece embaixo do formulário. Vazio: usa o WhatsApp ou o e-mail da identidade.')
      + campo('Situação', sel('status', ev ? ev.status : 'rascunho', [['rascunho', 'Rascunho (página fora do ar)'], ['aberto', 'Emissão aberta'], ['encerrado', 'Encerrado (só verificação)']]), 'todo')
      + '</div><div class="acoes-form"><button class="btn btn-p" type="submit">Salvar evento</button>' + (ev ? '<button class="btn btn-s" type="button" id="dup">Duplicar</button><span class="esp"></span><button class="btn btn-mal" type="button" id="exc">Excluir evento</button>' : '') + '<p class="erro" hidden></p></div></form>'
      + previaHtml('Prévia com o tipo de certificado escolhido e um nome de exemplo.') + '</div>';
    var f = $('#fEv');
    var desenha = function () {
      var o = form(f), t = porId(S.dados.tipos_certificado, o.tipo_certificado_id);
      previa({ identidade: S.dados.config, tipo: t ? t.dados : { layout: 'lateral', titulo: 'Certificado', subtitulo: 'de participação', texto: 'participou de **{evento}**.' }, evento: { nome: o.nome || 'Nome do evento', tipo_evento: (porId(S.dados.tipos_evento, o.tipo_evento_id) || {}).nome || '', dados: { subtitulo: o.subtitulo, data_inicio: o.data_inicio, data_fim: o.data_fim, local: o.local, cidade: o.cidade, modalidade: o.modalidade, carga_horaria: o.carga_horaria, temas: o.temas } } });
    };
    var slugMexido = !!ev;
    f.slug.addEventListener('input', function () { slugMexido = true; });
    f.nome.addEventListener('input', function () { if (!slugMexido) f.slug.value = slugify(f.nome.value); });
    f.addEventListener('input', function () { S.sujo = true; desenha(); });
    f.addEventListener('change', desenha);
    ligaImagens(f, function () { S.sujo = true; });
    desenha();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var o = form(f), b = $('button[type=submit]', f), er = $('.erro', f); er.hidden = true;
      var corpo = { id: ev && ev.id, nome: o.nome, slug: o.slug, status: o.status, tipo_evento_id: o.tipo_evento_id, tipo_certificado_id: o.tipo_certificado_id, dados: Object.assign({}, d, o) };
      ['nome', 'slug', 'status', 'tipo_evento_id', 'tipo_certificado_id'].forEach(function (k) { delete corpo.dados[k]; });
      b.disabled = true;
      api('salvar', { tipo: 'evento', dados: corpo }).then(function (j) {
        b.disabled = false;
        if (!j._ok) { er.textContent = j.erro || 'Não foi possível salvar.'; er.hidden = false; if (j.campo && f[j.campo]) f[j.campo].focus(); return; }
        S.sujo = false; aviso('Evento salvo.');
        recarrega().then(function () { if (!ev) location.hash = '#evento/' + j.item.id + '/participantes'; else rota(); });
      });
    });
    if (ev) {
      $('#exc').addEventListener('click', function () {
        confirma('Excluir "' + ev.nome + '"? A lista de participantes vai junto e os códigos deixam de ser válidos. Não dá para desfazer.', 'Excluir').then(function (sim) {
          if (!sim) return; api('excluir', { tipo: 'evento', id: ev.id }).then(function (j) { if (!j._ok) return aviso(j.erro, true); S.sujo = false; aviso('Evento excluído.'); recarrega().then(function () { location.hash = '#eventos'; }); });
        });
      });
      $('#dup').addEventListener('click', function () {
        var copia = { nome: ev.nome + ' (cópia)', slug: (ev.slug + '-copia').slice(0, 78), status: 'rascunho', tipo_evento_id: ev.tipo_evento_id, tipo_certificado_id: ev.tipo_certificado_id, dados: ev.dados };
        api('salvar', { tipo: 'evento', dados: copia }).then(function (j) { if (!j._ok) return aviso(j.erro, true); aviso('Evento duplicado (sem participantes).'); recarrega().then(function () { location.hash = '#evento/' + j.item.id + '/dados'; }); });
      });
    }
  }

  /* ---------- participantes ---------- */
  function carregaParts(ev) { return api('participantes', null, { evento: ev.id }).then(function (j) { if (j._ok) S.parts[ev.id] = j.participantes; return S.parts[ev.id] || []; }); }
  function abaParticipantes(alvo, ev) {
    alvo.innerHTML = '<p class="vazio">Carregando a lista…</p>';
    carregaParts(ev).then(function () { desenhaParts(alvo, ev); });
  }
  function desenhaParts(alvo, ev) {
    var lista = S.parts[ev.id] || [], tiposC = S.dados.tipos_certificado || [];
    var st = { total: lista.length, pres: lista.filter(function (p) { return p.presente; }).length, ger: lista.filter(function (p) { return p.gerado_em; }).length };
    alvo.innerHTML = '<div class="kpis"><div><strong>' + st.total + '</strong><span>na lista</span></div><div><strong>' + st.pres + '</strong><span>com presença</span></div><div><strong>' + st.ger + '</strong><span>geraram o certificado</span></div><div><strong>' + (st.total ? Math.round(st.ger / st.total * 100) : 0) + '%</strong><span>da lista já gerou</span></div></div>'
      + '<div class="ferr"><input type="search" id="busca" placeholder="Buscar por nome, e-mail, empresa ou código">'
      + '<select id="filtro"><option value="">Todos</option><option value="pres">Com presença</option><option value="aus">Sem presença</option><option value="ger">Já geraram</option><option value="nao">Ainda não geraram</option></select>'
      + '<button class="btn btn-p" id="add" type="button">Adicionar</button><button class="btn btn-s" id="imp" type="button">Importar planilha</button><button class="btn btn-s" id="exp" type="button">Baixar CSV</button></div>'
      + '<div class="tabela"><table><thead><tr><th>Participante</th><th>Contato</th><th>Papel e certificado</th><th class="n">Presença</th><th>Certificado</th><th class="n">Nota</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>';
    var tb = $('#tb');
    function pinta() {
      var q = $('#busca').value.trim().toLowerCase(), fl = $('#filtro').value;
      var vis = lista.filter(function (p) {
        if (fl === 'pres' && !p.presente) return false; if (fl === 'aus' && p.presente) return false;
        if (fl === 'ger' && !p.gerado_em) return false; if (fl === 'nao' && p.gerado_em) return false;
        return !q || [p.nome, p.email, p.empresa, p.codigo, p.papel].join(' ').toLowerCase().indexOf(q) > -1;
      });
      tb.innerHTML = vis.length ? vis.map(function (p) {
        var tc = porId(tiposC, p.tipo_certificado_id);
        return '<tr data-id="' + p.id + '"><td><b>' + esc(p.nome) + '</b>' + (p.empresa ? '<span class="s">' + esc(p.empresa) + '</span>' : '') + '</td>'
          + '<td>' + esc(p.email) + (p.celular ? '<span class="s">' + esc(celFmt(p.celular)) + '</span>' : '') + '</td>'
          + '<td>' + esc(p.papel || '—') + '<span class="s">' + esc(tc ? tc.nome : 'Padrão do evento') + '</span></td>'
          + '<td class="n"><input type="checkbox" class="chk" data-pres' + (p.presente ? ' checked' : '') + ' aria-label="Presença de ' + esc(p.nome) + '"></td>'
          + '<td>' + (p.gerado_em ? '<b style="color:var(--ok)">Gerou</b><span class="s">' + esc(fmtData(p.gerado_em)) + (p.gerado_vezes > 1 ? ' · ' + p.gerado_vezes + 'x' : '') + '</span>' : '<span class="s">Ainda não</span>') + '<span class="s"><a href="/du99/verificar/?codigo=' + esc(p.codigo) + '" target="_blank" rel="noopener"><code>' + esc(p.codigo) + '</code></a></span></td>'
          + '<td class="n">' + (p.nps == null ? '–' : '<b>' + p.nps + '</b>') + '</td>'
          + '<td><button class="btn btn-s btn-pq" data-ed type="button">Editar</button></td></tr>';
      }).join('') : '<tr><td colspan="7" class="vazio" style="text-align:center">' + (lista.length ? 'Ninguém encontrado com esse filtro.' : 'A lista está vazia. Adicione participantes ou importe uma planilha.') + '</td></tr>';
    }
    pinta();
    $('#busca').addEventListener('input', pinta); $('#filtro').addEventListener('change', pinta);
    tb.addEventListener('change', function (e) {
      if (!e.target.matches('[data-pres]')) return;
      var id = e.target.closest('tr').dataset.id, p = porId(lista, id), v = e.target.checked;
      api('participante', { acao: 'presenca', id: id, valor: v }).then(function (j) { if (!j._ok) { e.target.checked = !v; return aviso(j.erro, true); } p.presente = v; });
    });
    tb.addEventListener('click', function (e) { if (e.target.matches('[data-ed]')) editaParticipante(ev, porId(lista, e.target.closest('tr').dataset.id), function () { desenhaParts(alvo, ev); }); });
    $('#add').addEventListener('click', function () { editaParticipante(ev, null, function () { desenhaParts(alvo, ev); }); });
    $('#imp').addEventListener('click', function () { importa(ev, function () { carregaParts(ev).then(function () { desenhaParts(alvo, ev); recarrega(); }); }); });
    $('#exp').addEventListener('click', function () { exportaCsv(ev, lista); });
  }
  function editaParticipante(ev, p, depois) {
    var tiposC = [['', 'Padrão do evento']].concat((S.dados.tipos_certificado || []).map(function (t) { return [t.id, t.nome]; }));
    p = p || {};
    dialogo('<h2>' + (p.id ? 'Editar participante' : 'Adicionar participante') + '</h2>'
      + campo('Nome completo (como sai no certificado)', inp('nome', p.nome, 'maxlength="120" required'))
      + campo('E-mail', '<input type="email" name="email" value="' + esc(p.email || '') + '" maxlength="160" required>')
      + '<div class="form">' + campo('Celular (WhatsApp)', inp('celular', p.celular ? celFmt(p.celular) : '', 'inputmode="tel" maxlength="20"')) + campo('Empresa', inp('empresa', p.empresa, 'maxlength="120"'))
      + campo('Papel', inp('papel', p.papel, 'maxlength="60" placeholder="Ex.: Palestrante, Voluntário"'), '', 'Pode entrar no texto com {papel}.') + campo('Tipo de certificado', sel('tipo_certificado_id', p.tipo_certificado_id || '', tiposC)) + '</div>'
      + chk('presente', p.presente, 'Presença confirmada')
      + '<p class="erro" hidden></p><div class="linha-bt">' + (p.id ? '<button class="btn btn-mal" type="button" data-rem>Remover da lista</button><span style="flex:1"></span>' : '') + '<button class="btn btn-s" value="cancelar" formnovalidate>Cancelar</button><button class="btn btn-p" type="button" data-salva>Salvar</button></div>',
    function (f) {
      $('[data-salva]', f).addEventListener('click', function () {
        var o = form(f), er = $('.erro', f); er.hidden = true;
        api('participante', p.id ? { acao: 'editar', id: p.id, dados: o } : { acao: 'adicionar', evento_id: ev.id, dados: o }).then(function (j) {
          if (!j._ok) { er.textContent = j.erro || 'Não foi possível salvar.'; er.hidden = false; return; }
          var lista = S.parts[ev.id] || (S.parts[ev.id] = []);
          if (p.id) Object.assign(p, j.item); else lista.push(j.item);
          lista.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
          $('#dlg').close(); aviso('Participante salvo.'); depois(); recarrega();
        });
      });
      var rem = $('[data-rem]', f);
      if (rem) rem.addEventListener('click', function () {
        if (!window.confirm('Remover ' + p.nome + ' da lista? O código dessa pessoa deixa de ser válido.')) return;
        api('participante', { acao: 'remover', id: p.id }).then(function (j) {
          if (!j._ok) return aviso(j.erro, true);
          S.parts[ev.id] = (S.parts[ev.id] || []).filter(function (x) { return x.id !== p.id; });
          $('#dlg').close(); aviso('Removido da lista.'); depois(); recarrega();
        });
      });
    });
  }

  /* planilha: CSV (vírgula, ponto e vírgula ou tab) com cabeçalho; aceita colar do Excel/Google Planilhas */
  function parseCsv(txt) {
    txt = txt.replace(/^﻿/, '');
    var prim = txt.split(/\r?\n/)[0] || '', sep = prim.indexOf('\t') > -1 ? '\t' : (prim.split(';').length > prim.split(',').length ? ';' : ',');
    var linhas = [], campo = '', linha = [], aspas = false;
    for (var i = 0; i < txt.length; i++) {
      var ch = txt[i];
      if (aspas) { if (ch === '"' && txt[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') aspas = false; else campo += ch; continue; }
      if (ch === '"') aspas = true; else if (ch === sep) { linha.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; linha.push(campo); campo = ''; if (linha.join('').trim()) linhas.push(linha); linha = []; }
      else campo += ch;
    }
    linha.push(campo); if (linha.join('').trim()) linhas.push(linha);
    return linhas;
  }
  var COLS = { nome: /^(nome|nome completo|name|participante)$/, email: /^(e-?mail|email address|correio)$/, celular: /^(celular|telefone|whats ?app|fone|tel|phone)$/, empresa: /^(empresa|organiza[cç][aã]o|company|institui[cç][aã]o)$/, papel: /^(papel|fun[cç][aã]o|role|atua[cç][aã]o)$/, presente: /^(presente|presen[cç]a|check-?in|compareceu)$/ };
  function linhasParaObjetos(linhas) {
    if (!linhas.length) return [];
    var cab = linhas[0].map(function (c) { return c.trim().toLowerCase().normalize('NFC'); }), mapa = {};
    cab.forEach(function (c, i) { Object.keys(COLS).forEach(function (k) { if (mapa[k] === undefined && COLS[k].test(c)) mapa[k] = i; }); });
    var temCab = mapa.nome !== undefined || mapa.email !== undefined;
    if (!temCab) mapa = { nome: 0, email: 1, celular: 2, empresa: 3 };
    return (temCab ? linhas.slice(1) : linhas).map(function (l) { var o = {}; Object.keys(mapa).forEach(function (k) { o[k] = (l[mapa[k]] || '').trim(); }); return o; });
  }
  function importa(ev, depois) {
    dialogo('<h2>Importar planilha</h2><p style="font-size:14px;color:var(--suave)">Envie um arquivo CSV ou cole as linhas copiadas do Excel ou do Google Planilhas. A primeira linha deve ter os títulos das colunas: <b>nome</b>, <b>email</b> e, se quiser, <b>celular</b>, <b>empresa</b>, <b>papel</b> e <b>presente</b> (sim/não). Quem já está na lista (mesmo e-mail) é atualizado e mantém o código.</p>'
      + '<label class="btn btn-s" style="align-self:flex-start">Escolher arquivo CSV<input type="file" accept=".csv,text/csv,text/plain" hidden id="arqCsv"></label>'
      + '<textarea id="txtCsv" placeholder="nome;email;celular;empresa&#10;Maria da Silva;maria@email.com;51999999999;DU99"></textarea><p id="resumo" style="font-size:13.5px"></p><p class="erro" hidden></p>'
      + '<div class="linha-bt"><button class="btn btn-s" value="cancelar" formnovalidate>Cancelar</button><button class="btn btn-p" type="button" id="btImp" disabled>Importar</button></div>',
    function (f) {
      var objs = [];
      var analisa = function () {
        objs = linhasParaObjetos(parseCsv($('#txtCsv').value));
        var validos = objs.filter(function (o) { return o.nome && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email); }).length;
        $('#resumo').textContent = objs.length ? objs.length + ' linhas lidas, ' + validos + ' com nome e e-mail válidos.' + (objs.length > validos ? ' As outras serão ignoradas e listadas no fim.' : '') : '';
        $('#btImp').disabled = !validos;
      };
      $('#txtCsv').addEventListener('input', analisa);
      $('#arqCsv').addEventListener('change', function () { var a = this.files[0]; if (!a) return; var r = new FileReader(); r.onload = function () { var t = r.result; if (/�/.test(t)) { var r2 = new FileReader(); r2.onload = function () { $('#txtCsv').value = r2.result; analisa(); }; r2.readAsText(a, 'windows-1252'); } else { $('#txtCsv').value = t; analisa(); } }; r.readAsText(a, 'utf-8'); });
      $('#btImp').addEventListener('click', function () {
        var b = this; b.disabled = true; b.textContent = 'Importando…';
        api('importar', { evento_id: ev.id, linhas: objs }).then(function (j) {
          b.disabled = false; b.textContent = 'Importar';
          if (!j._ok) { $('.erro', f).textContent = j.erro || 'Falha ao importar.'; $('.erro', f).hidden = false; return; }
          var msg = j.novos + ' novos, ' + j.atualizados + ' atualizados.';
          if (j.erros && j.erros.length) { $('#resumo').innerHTML = esc(msg) + '<br><b>Não importadas:</b> ' + j.erros.slice(0, 30).map(function (e) { return 'linha ' + e.linha + ' (' + esc(e.motivo) + (e.email ? ', ' + esc(e.email) : '') + ')'; }).join('; ') + (j.erros.length > 30 ? '…' : ''); aviso(msg); depois(); return; }
          $('#dlg').close(); aviso(msg); depois();
        });
      });
    });
  }
  function exportaCsv(ev, lista) {
    var cab = ['nome', 'email', 'celular', 'empresa', 'papel', 'tipo_certificado', 'presente', 'codigo', 'gerou_em', 'vezes', 'nota', 'link_verificacao'];
    var cel = function (v) { v = String(v == null ? '' : v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var linhas = lista.map(function (p) { return [p.nome, p.email, p.celular, p.empresa, p.papel, (porId(S.dados.tipos_certificado, p.tipo_certificado_id) || {}).nome || 'padrão', p.presente ? 'sim' : 'não', p.codigo, p.gerado_em ? fmtData(p.gerado_em) : '', p.gerado_vezes || 0, p.nps == null ? '' : p.nps, ORIGEM + '/du99/verificar/?codigo=' + p.codigo].map(cel).join(';'); });
    var blob = new Blob(['﻿' + [cab.join(';')].concat(linhas).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'participantes-' + ev.slug + '-' + hoje() + '.csv'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* ---------- avaliação (NPS) ---------- */
  function abaAvaliacao(alvo, ev) {
    alvo.innerHTML = '<p class="vazio">Carregando…</p>';
    carregaParts(ev).then(function (lista) {
      var notas = lista.filter(function (p) { return p.nps !== null && p.nps !== undefined; }).map(function (p) { return p.nps; });
      if (!(ev.dados || {}).pede_nps && !notas.length) { alvo.innerHTML = '<div class="card"><p class="vazio">Este evento não pede nota. Para coletar, marque "Pedir uma nota de 0 a 10" em Dados do evento.</p></div>'; return; }
      if (!notas.length) { alvo.innerHTML = '<div class="card"><p class="vazio">Ninguém deu nota ainda. As notas chegam quando os participantes geram o certificado.</p></div>'; return; }
      var p = notas.filter(function (n) { return n >= 9; }).length, ne = notas.filter(function (n) { return n >= 7 && n <= 8; }).length, d = notas.length - p - ne, t = notas.length;
      var nps = Math.round((p - d) / t * 100), media = (notas.reduce(function (a, b) { return a + b; }, 0) / t).toFixed(1).replace('.', ',');
      var dist = []; for (var i = 0; i <= 10; i++) dist.push(notas.filter(function (n) { return n === i; }).length);
      var max = Math.max.apply(null, dist) || 1, cor = function (n) { return n >= 9 ? '#1f8a5b' : n >= 7 ? '#d29a1c' : '#b3283c'; };
      alvo.innerHTML = '<div class="card"><h2>Avaliação do evento</h2><p class="sub">Nota de 0 a 10 que cada participante dá ao gerar o certificado. Promotores: 9 e 10 · neutros: 7 e 8 · detratores: 0 a 6. NPS = % de promotores − % de detratores.</p>'
        + '<div class="nps-top"><div class="score"><b>' + nps + '</b><span>NPS · ' + t + ' notas</span></div><div><b>' + Math.round(p / t * 100) + '%</b><span>promotores (' + p + ')</span></div><div><b>' + Math.round(ne / t * 100) + '%</b><span>neutros (' + ne + ')</span></div><div><b>' + Math.round(d / t * 100) + '%</b><span>detratores (' + d + ') · média ' + media + '</span></div></div>'
        + '<div class="nps-mix"><i style="width:' + (p / t * 100) + '%;background:#1f8a5b"></i><i style="width:' + (ne / t * 100) + '%;background:#d29a1c"></i><i style="width:' + (d / t * 100) + '%;background:#b3283c"></i></div>'
        + '<div class="nps-dist">' + dist.map(function (q, n) { return '<div><small>' + (q || '') + '</small><i style="height:' + Math.max(2, q / max * 100) + '%;background:' + cor(n) + '"></i></div>'; }).join('') + '</div>'
        + '<div class="nps-eixo">' + dist.map(function (q, n) { return '<span>' + n + '</span>'; }).join('') + '</div></div>';
    });
  }

  /* ---------- central de WhatsApp ---------- */
  function abaWhatsapp(alvo, ev) {
    alvo.innerHTML = '<p class="vazio">Carregando…</p>';
    carregaParts(ev).then(function (lista) {
      var d = ev.dados || {}, padrao = 'Oi, {primeiro_nome}! Obrigado por fazer parte de {evento}. Seu certificado já está disponível: é só acessar {link} e digitar o e-mail da sua inscrição.';
      alvo.innerHTML = '<div class="card"><h2>Mensagem</h2><p class="sub">Cada botão abre a conversa no WhatsApp com a mensagem pronta para a pessoa. Variáveis: {primeiro_nome}, {nome}, {evento}, {empresa}, {link}. Envie em lotes pequenos para o número não ser bloqueado.</p>'
        + '<textarea id="waMsg" style="width:100%;min-height:96px;padding:10px 12px;border:1px solid var(--linha);border-radius:10px">' + esc(d.whatsapp_msg || padrao) + '</textarea>'
        + '<div class="acoes-form" style="margin-top:10px"><button class="btn btn-s" id="waSalva" type="button">Salvar mensagem no evento</button><select id="waFiltro" style="padding:9px 12px;border:1px solid var(--linha);border-radius:10px"><option value="nao">Quem ainda não gerou</option><option value="todos">Todos com celular</option><option value="pres">Presentes que não geraram</option><option value="pend">Ainda não enviados</option></select><span id="waConta" style="color:var(--suave);font-size:13.5px"></span></div></div>'
        + '<div class="card"><ul class="wa" id="waLista"></ul></div>';
      var link = ORIGEM + '/du99/evento/' + ev.slug + '/', empresa = (S.dados.config || {}).nome_empresa || 'DU99';
      function msgDe(p) {
        var v = { primeiro_nome: (p.nome || '').split(/\s+/)[0], nome: p.nome, evento: ev.nome, empresa: empresa, link: link };
        return $('#waMsg').value.replace(/\{([a-z_]+)\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; });
      }
      function pinta() {
        var f = $('#waFiltro').value;
        var vis = lista.filter(function (p) {
          if (!p.celular) return false;
          if (f === 'nao') return !p.gerado_em; if (f === 'pres') return p.presente && !p.gerado_em; if (f === 'pend') return !p.whatsapp_em; return true;
        });
        $('#waConta').textContent = vis.length + ' pessoas · ' + vis.filter(function (p) { return p.whatsapp_em; }).length + ' já marcadas como enviadas';
        $('#waLista').innerHTML = vis.length ? vis.map(function (p) {
          return '<li data-id="' + p.id + '"' + (p.whatsapp_em ? ' class="feito"' : '') + '><span><b>' + esc(p.nome) + '</b><span class="s" style="display:block;font-size:12.5px;color:var(--suave)">' + esc(celFmt(p.celular)) + (p.empresa ? ' · ' + esc(p.empresa) : '') + '</span></span>'
            + '<a class="bt" target="_blank" rel="noopener" href="https://wa.me/' + waNum(p.celular) + '?text=' + encodeURIComponent(msgDe(p)) + '">Abrir conversa</a>'
            + '<label><input type="checkbox" data-env' + (p.whatsapp_em ? ' checked' : '') + '> enviada</label></li>';
        }).join('') : '<li style="justify-content:center;color:var(--suave)">Ninguém com celular neste filtro.</li>';
      }
      pinta();
      $('#waFiltro').addEventListener('change', pinta);
      $('#waMsg').addEventListener('input', function () { clearTimeout(this._t); this._t = setTimeout(pinta, 300); });
      $('#waLista').addEventListener('click', function (e) {
        var a = e.target.closest('a.bt'); if (!a) return;
        var li = a.closest('li'), p = porId(lista, li.dataset.id);
        if (p && !p.whatsapp_em) api('participante', { acao: 'whatsapp', id: p.id }).then(function (j) { if (j._ok) { p.whatsapp_em = new Date().toISOString(); li.classList.add('feito'); $('[data-env]', li).checked = true; } });
      });
      $('#waLista').addEventListener('change', function (e) {
        if (!e.target.matches('[data-env]')) return;
        var li = e.target.closest('li'), p = porId(lista, li.dataset.id), v = e.target.checked;
        api('participante', { acao: 'whatsapp', id: p.id, valor: v }).then(function (j) { if (!j._ok) return aviso(j.erro, true); p.whatsapp_em = v ? new Date().toISOString() : null; li.classList.toggle('feito', v); });
      });
      $('#waSalva').addEventListener('click', function () {
        var corpo = { id: ev.id, nome: ev.nome, slug: ev.slug, status: ev.status, tipo_evento_id: ev.tipo_evento_id, tipo_certificado_id: ev.tipo_certificado_id, dados: Object.assign({}, d, { whatsapp_msg: $('#waMsg').value }) };
        api('salvar', { tipo: 'evento', dados: corpo }).then(function (j) { if (!j._ok) return aviso(j.erro, true); aviso('Mensagem salva.'); ev.dados = j.item.dados; });
      });
    });
  }

  /* ---------- tipos de certificado ---------- */
  var LAYOUT_NOMES = { lateral: 'Lateral', classico: 'Clássico', moderno: 'Moderno' };
  function telaCertificados(alvo) {
    var l = S.dados.tipos_certificado || [];
    alvo.innerHTML = '<div class="titulo"><div><h1>Tipos de certificado</h1><p>Modelos de certificado: layout, título, texto e assinaturas. Cada evento escolhe um modelo padrão e cada participante pode ter um diferente (ex.: palestrante).</p></div><a class="btn btn-p" href="#certificado/novo">Novo tipo</a></div>'
      + (l.length ? '<div class="grade">' + l.map(function (t) {
        var d = t.dados || {}, usos = (S.dados.eventos || []).filter(function (e) { return e.tipo_certificado_id === t.id; }).length;
        return '<a class="ev" href="#certificado/' + t.id + '"><span class="selo ' + (t.ativo ? 'aberto' : 'rascunho') + '">' + (t.ativo ? 'Ativo' : 'Inativo') + '</span><b>' + esc(t.nome) + '</b><span class="meta">' + esc((d.titulo || '') + ' ' + (d.subtitulo || '')) + ' · layout ' + esc(LAYOUT_NOMES[d.layout] || d.layout) + '</span><span class="meta">' + usos + (usos === 1 ? ' evento usa' : ' eventos usam') + ' como padrão</span></a>';
      }).join('') + '</div>' : '<div class="card"><p class="vazio">Nenhum tipo de certificado ainda.</p></div>');
  }
  function editorAssinaturas(lista, pasta) {
    lista = (lista || []).slice(0, 3);
    return '<div class="ass-lista" data-ass>' + lista.map(function (a, i) { return linhaAss(a, i, pasta); }).join('') + '</div><button type="button" class="btn btn-s btn-pq" data-add-ass style="align-self:flex-start;margin-top:8px"' + (lista.length >= 3 ? ' hidden' : '') + '>Adicionar assinatura</button>';
  }
  function linhaAss(a, i, pasta) {
    a = a || {};
    return '<div class="ass-item">' + campo('Nome', inp('ass_nome_' + i, a.nome, 'maxlength="80"')) + campo('Cargo', inp('ass_cargo_' + i, a.cargo, 'maxlength="80"'))
      + campoImagem('ass_img_' + i, a.imagem_url, pasta, 'Assinatura (PNG com fundo transparente)') + '<button type="button" class="btn btn-mal btn-pq" data-rem-ass>Tirar</button></div>';
  }
  function leAssinaturas(raiz) {
    return $$('.ass-item', raiz).map(function (it) {
      var v = function (p) { var el = $('[name^="' + p + '"]', it); return el ? el.value : ''; };
      return { nome: v('ass_nome_'), cargo: v('ass_cargo_'), imagem_url: v('ass_img_') };
    }).filter(function (a) { return a.nome || a.imagem_url; });
  }
  function ligaAssinaturas(raiz, aoMudar) {
    var lista = $('[data-ass]', raiz), add = $('[data-add-ass]', raiz);
    var religa = function () { ligaImagens(lista, aoMudar); add.hidden = $$('.ass-item', lista).length >= 3; };
    add.addEventListener('click', function () {
      var n = Date.now() % 100000, div = document.createElement('div'); div.innerHTML = linhaAss({}, n, 'assinaturas'); lista.appendChild(div.firstChild);
      ligaImagens(lista.lastChild, aoMudar); add.hidden = $$('.ass-item', lista).length >= 3; aoMudar();
    });
    lista.addEventListener('click', function (e) { if (e.target.matches('[data-rem-ass]')) { e.target.closest('.ass-item').remove(); add.hidden = false; aoMudar(); } });
    religa();
  }
  function telaCertificado(alvo, id) {
    var t = id === 'novo' ? null : porId(S.dados.tipos_certificado, id);
    if (id !== 'novo' && !t) { alvo.innerHTML = '<p class="vazio">Tipo não encontrado.</p>'; return; }
    var d = (t && t.dados) || { layout: 'lateral', titulo: 'Certificado', subtitulo: 'de participação', abertura: 'Certificamos que', texto: 'participou de **{evento}**, realizado por **{empresa}** em **{data}**{em_local}{com_carga}.', mostrar_temas: true, mostrar_qr: true, fundo_opacidade: 0.15 };
    var cores = d.cores || {}, ident = (S.dados.config || {}).cores || {};
    var esq = { lateral: '<i style="left:0;top:0;bottom:0;width:30%;background:var(--c1)"></i><i style="left:36%;top:30%;width:50%;height:6px;background:#bbb;border-radius:3px"></i><i style="left:36%;top:52%;width:40%;height:4px;background:#ddd"></i>', classico: '<i style="inset:4px;border:2px solid var(--c1);border-radius:3px"></i><i style="left:30%;top:42%;width:40%;height:6px;background:#bbb;border-radius:3px"></i><i style="left:25%;top:62%;width:50%;height:4px;background:#ddd"></i>', moderno: '<i style="left:0;right:0;top:0;height:30%;background:var(--c1)"></i><i style="left:8%;top:48%;width:50%;height:6px;background:#bbb;border-radius:3px"></i><i style="left:8%;top:66%;width:62%;height:4px;background:#ddd"></i>' };
    alvo.innerHTML = '<a class="volta" href="#certificados">← Tipos de certificado</a><div class="titulo"><div><h1>' + esc(t ? t.nome : 'Novo tipo de certificado') + '</h1></div></div>'
      + '<div class="duas"><form class="card" id="fTc" novalidate><div class="form">'
      + campo('Nome do tipo (uso interno)', inp('nome', t ? t.nome : '', 'maxlength="80" required placeholder="Ex.: Participação, Voluntariado, Palestrante"'), 'todo')
      + '<div class="campo todo"><span>Layout</span><div class="layouts">' + ['lateral', 'classico', 'moderno'].map(function (k) { return '<label><input type="radio" name="layout" value="' + k + '"' + (d.layout === k ? ' checked' : '') + '><span class="esq">' + esq[k] + '</span>' + LAYOUT_NOMES[k] + '</label>'; }).join('') + '</div></div>'
      + campo('Título', inp('titulo', d.titulo, 'maxlength="40"')) + campo('Subtítulo', inp('subtitulo', d.subtitulo, 'maxlength="60"'))
      + campo('Frase antes do nome', inp('abertura', d.abertura, 'maxlength="60"'), 'todo')
      + '<div class="campo todo"><span>Texto do certificado</span>' + area('texto', d.texto, 'maxlength="900" rows="5" id="tcTexto"')
      + '<small>Use **duas estrelas** para negrito. Clique para inserir uma variável:</small><div class="chips" id="chipsVar">' + VARS_TXT.map(function (v) { return '<button type="button" data-v="{' + v + '}">{' + v + '}</button>'; }).join('') + '</div>'
      + '<small>{em_local} vira ", em Local, Cidade" (ou ", on-line") e {com_carga} vira ", com carga horária de X horas"; ficam vazias quando o evento não tem essa informação.</small></div>'
      + '<div class="campo todo">' + chk('mostrar_temas', d.mostrar_temas, 'Mostrar os temas do evento') + chk('mostrar_qr', d.mostrar_qr !== false, 'Mostrar QR code de verificação') + '</div>'
      + '<div class="campo todo"><span>Cores deste tipo</span><small>Marque para usar uma cor diferente da identidade só neste modelo.</small><div class="cores">' + [['primaria', 'Principal'], ['secundaria', 'Secundária'], ['destaque', 'Destaque'], ['texto', 'Texto'], ['fundo', 'Fundo']].map(function (c) {
        return '<div class="cor">' + chk('usa_' + c[0], !!cores[c[0]], c[1]) + '<input type="color" name="cor_' + c[0] + '" value="' + esc(cores[c[0]] || ident[c[0]] || '#000000') + '"></div>';
      }).join('') + '</div></div>'
      + campoImagem('fundo_url', d.fundo_url, 'fundos', 'Imagem de fundo (opcional)', false, 'Fica atrás do texto, com transparência.')
      + campo('Transparência do fundo', '<input type="range" name="fundo_opacidade" min="0" max="1" step="0.05" value="' + esc(d.fundo_opacidade == null ? 0.15 : d.fundo_opacidade) + '">', '', 'Mais à direita, mais visível.')
      + '<div class="campo todo">' + chk('usar_assinaturas_proprias', d.usar_assinaturas_proprias, 'Usar assinaturas próprias neste tipo (senão, usa as da Identidade)') + '<div id="assBox"' + (d.usar_assinaturas_proprias ? '' : ' hidden') + '>' + editorAssinaturas(d.assinaturas, 'assinaturas') + '</div></div>'
      + '<div class="campo todo">' + chk('ativo', t ? t.ativo : true, 'Ativo (aparece para escolher nos eventos)') + '</div>'
      + '</div><div class="acoes-form"><button class="btn btn-p" type="submit">Salvar tipo</button>' + (t ? '<button class="btn btn-s" type="button" id="dupTc">Duplicar</button><span class="esp"></span><button class="btn btn-mal" type="button" id="excTc">Excluir</button>' : '') + '<p class="erro" hidden></p></div></form>'
      + previaHtml() + '</div>';
    var f = $('#fTc');
    function dadosForm() {
      var o = form(f), cs = {};
      ['primaria', 'secundaria', 'destaque', 'texto', 'fundo'].forEach(function (k) { if (o['usa_' + k]) cs[k] = o['cor_' + k]; });
      return { layout: o.layout, titulo: o.titulo, subtitulo: o.subtitulo, abertura: o.abertura, texto: o.texto, mostrar_temas: o.mostrar_temas, mostrar_qr: o.mostrar_qr, cores: cs, fundo_url: o.fundo_url, fundo_opacidade: Number(o.fundo_opacidade), usar_assinaturas_proprias: o.usar_assinaturas_proprias, assinaturas: leAssinaturas($('#assBox')) };
    }
    var desenha = function () { previa({ identidade: S.dados.config, tipo: dadosForm(), evento: eventoExemplo() }); };
    var mudou = function () { S.sujo = true; desenha(); };
    f.addEventListener('input', mudou); f.addEventListener('change', function (e) { if (e.target.name === 'usar_assinaturas_proprias') $('#assBox').hidden = !e.target.checked; mudou(); });
    ligaImagens(f, mudou); ligaAssinaturas($('#assBox'), mudou);
    $('#chipsVar').addEventListener('click', function (e) {
      var v = e.target.dataset.v; if (!v) return; var ta = $('#tcTexto'), i = ta.selectionStart || ta.value.length;
      ta.value = ta.value.slice(0, i) + v + ta.value.slice(ta.selectionEnd || i); ta.focus(); ta.selectionStart = ta.selectionEnd = i + v.length; mudou();
    });
    desenha();
    function grava(corpo, msg, depois) { return api('salvar', { tipo: 'tipo_certificado', dados: corpo }).then(function (j) { if (!j._ok) { var er = $('.erro', f); er.textContent = j.erro || 'Não foi possível salvar.'; er.hidden = false; return; } S.sujo = false; aviso(msg); recarrega().then(function () { depois(j.item); }); }); }
    f.addEventListener('submit', function (e) { e.preventDefault(); $('.erro', f).hidden = true; grava({ id: t && t.id, nome: f.nome.value, ativo: f.ativo.checked, dados: dadosForm() }, 'Tipo salvo.', function (it) { if (!t) location.hash = '#certificado/' + it.id; else rota(); }); });
    if (t) {
      $('#dupTc').addEventListener('click', function () { grava({ nome: t.nome + ' (cópia)', ativo: true, dados: dadosForm() }, 'Tipo duplicado.', function (it) { location.hash = '#certificado/' + it.id; }); });
      $('#excTc').addEventListener('click', function () {
        confirma('Excluir o tipo "' + t.nome + '"? Eventos e participantes que usam este tipo ficam sem modelo até você escolher outro.', 'Excluir').then(function (sim) {
          if (sim) api('excluir', { tipo: 'tipo_certificado', id: t.id }).then(function (j) { if (!j._ok) return aviso(j.erro, true); S.sujo = false; aviso('Tipo excluído.'); recarrega().then(function () { location.hash = '#certificados'; }); });
        });
      });
    }
  }

  /* ---------- tipos de evento ---------- */
  function telaTiposEvento(alvo) {
    var l = S.dados.tipos_evento || [];
    alvo.innerHTML = '<div class="titulo"><div><h1>Tipos de evento</h1><p>Categorias para organizar os eventos (palestra, workshop, ação social…). O nome do tipo pode entrar no certificado com {tipo_evento}.</p></div><button class="btn btn-p" id="novoTe" type="button">Novo tipo</button></div>'
      + '<div class="tabela"><table><thead><tr><th>Nome</th><th>Descrição</th><th>Eventos</th><th class="n">Ativo</th><th></th></tr></thead><tbody>'
      + (l.length ? l.map(function (t) {
        var n = (S.dados.eventos || []).filter(function (e) { return e.tipo_evento_id === t.id; }).length;
        return '<tr data-id="' + t.id + '"><td><b>' + esc(t.nome) + '</b></td><td>' + esc(t.descricao) + '</td><td>' + n + '</td><td class="n">' + (t.ativo ? 'Sim' : 'Não') + '</td><td><button class="btn btn-s btn-pq" data-ed type="button">Editar</button></td></tr>';
      }).join('') : '<tr><td colspan="5" class="vazio">Nenhum tipo cadastrado.</td></tr>') + '</tbody></table></div>';
    var edita = function (t) {
      t = t || {};
      dialogo('<h2>' + (t.id ? 'Editar tipo de evento' : 'Novo tipo de evento') + '</h2>' + campo('Nome', inp('nome', t.nome, 'maxlength="80" required')) + campo('Descrição', area('descricao', t.descricao, 'maxlength="300" rows="3"')) + chk('ativo', t.id ? t.ativo : true, 'Ativo')
        + '<p class="erro" hidden></p><div class="linha-bt">' + (t.id ? '<button class="btn btn-mal" type="button" data-rem>Excluir</button><span style="flex:1"></span>' : '') + '<button class="btn btn-s" value="cancelar" formnovalidate>Cancelar</button><button class="btn btn-p" type="button" data-salva>Salvar</button></div>',
      function (f) {
        $('[data-salva]', f).addEventListener('click', function () {
          var o = form(f); o.id = t.id;
          api('salvar', { tipo: 'tipo_evento', dados: o }).then(function (j) { if (!j._ok) { $('.erro', f).textContent = j.erro; $('.erro', f).hidden = false; return; } $('#dlg').close(); aviso('Salvo.'); recarrega().then(rota); });
        });
        var r = $('[data-rem]', f); if (r) r.addEventListener('click', function () { if (!window.confirm('Excluir o tipo "' + t.nome + '"? Os eventos dele ficam sem tipo.')) return; api('excluir', { tipo: 'tipo_evento', id: t.id }).then(function (j) { if (!j._ok) return aviso(j.erro, true); $('#dlg').close(); aviso('Excluído.'); recarrega().then(rota); }); });
      });
    };
    $('#novoTe').addEventListener('click', function () { edita(null); });
    alvo.addEventListener('click', function (e) { if (e.target.matches('[data-ed]')) edita(porId(l, e.target.closest('tr').dataset.id)); });
  }

  /* ---------- identidade ---------- */
  var FONTES = ['Comfortaa', 'Nunito', 'Montserrat', 'Poppins', 'Inter', 'Raleway', 'Roboto', 'Open Sans', 'Lato', 'Quicksand', 'Varela Round', 'DM Sans', 'Playfair Display', 'Lora', 'Merriweather', 'Cormorant Garamond', 'Great Vibes', 'Dancing Script'];
  function telaIdentidade(alvo) {
    var c = S.dados.config || {}, cores = c.cores || {}, fo = c.fontes || {};
    alvo.innerHTML = '<div class="titulo"><div><h1>Identidade</h1><p>Logo, cores, fontes e assinaturas usadas em todos os certificados e nas páginas públicas. Os tipos de certificado podem trocar as cores e as assinaturas.</p></div></div>'
      + '<div class="duas"><form class="card" id="fId" novalidate><div class="form">'
      + campo('Nome da empresa', inp('nome_empresa', c.nome_empresa, 'maxlength="80"'), '', 'Entra no certificado com {empresa}.') + campo('Site', inp('site', c.site, 'maxlength="120"'))
      + campo('Slogan', inp('slogan', c.slogan, 'maxlength="140"'), 'todo')
      + campoImagem('logo_url', c.logo_url, 'identidade', 'Logo para fundo claro', false, 'PNG com fundo transparente.')
      + campoImagem('logo_claro_url', c.logo_claro_url, 'identidade', 'Logo para fundo escuro', true, 'Versão clara, usada sobre a cor principal.')
      + '<div class="campo todo"><span>Cores</span><div class="cores">' + [['primaria', 'Principal'], ['secundaria', 'Secundária'], ['destaque', 'Destaque'], ['texto', 'Texto'], ['fundo', 'Fundo do certificado']].map(function (k) { return '<label class="cor">' + k[1] + '<input type="color" name="cor_' + k[0] + '" value="' + esc(cores[k[0]] || '#000000') + '"></label>'; }).join('') + '</div></div>'
      + campo('Fonte dos títulos e do nome', sel('fonte_titulo', fo.titulo || 'Comfortaa', FONTES.map(function (x) { return [x, x]; })))
      + campo('Fonte do texto', sel('fonte_texto', fo.texto || 'Nunito', FONTES.map(function (x) { return [x, x]; })))
      + '<div class="campo todo"><span>Assinaturas padrão (até 3)</span>' + editorAssinaturas(c.assinaturas, 'assinaturas') + '</div>'
      + campo('WhatsApp de atendimento', inp('whatsapp', c.whatsapp, 'inputmode="tel" maxlength="20" placeholder="5551999999999"'), '', 'Com DDI e DDD. Aparece como ajuda na página do certificado.')
      + campo('E-mail de contato', '<input type="email" name="email_contato" value="' + esc(c.email_contato || '') + '" maxlength="160">')
      + campo('ID da empresa no LinkedIn', inp('linkedin_org_id', c.linkedin_org_id, 'inputmode="numeric" maxlength="20"'), '', 'Opcional. Com ele, a certificação no perfil do participante aparece com o logo da página da empresa (o número está no endereço do painel de administrador da página).')
      + campo('Prefixo do código', inp('prefixo_codigo', c.prefixo_codigo || 'DU99', 'maxlength="8"'), '', 'Ex.: DU99 → DU99-A1B2-C3D4. Vale para os próximos participantes; os códigos já emitidos não mudam.')
      + campo('Rodapé', inp('rodape', c.rodape, 'maxlength="160"'), 'todo')
      + '</div><div class="acoes-form"><button class="btn btn-p" type="submit">Salvar identidade</button><p class="erro" hidden></p></div></form>'
      + previaHtml('Prévia com o primeiro tipo de certificado ativo e um evento de exemplo.') + '</div>';
    var f = $('#fId');
    function dadosForm() {
      var o = form(f);
      return { nome_empresa: o.nome_empresa, site: o.site, slogan: o.slogan, logo_url: o.logo_url, logo_claro_url: o.logo_claro_url, rodape: o.rodape,
        cores: { primaria: o.cor_primaria, secundaria: o.cor_secundaria, destaque: o.cor_destaque, texto: o.cor_texto, fundo: o.cor_fundo },
        fontes: { titulo: o.fonte_titulo, texto: o.fonte_texto }, assinaturas: leAssinaturas(f), whatsapp: o.whatsapp, email_contato: o.email_contato, linkedin_org_id: o.linkedin_org_id, prefixo_codigo: o.prefixo_codigo };
    }
    var tipo = (S.dados.tipos_certificado || []).filter(function (t) { return t.ativo; })[0];
    var desenha = function () { var ident = Object.assign({}, c, dadosForm()); previa({ identidade: ident, tipo: tipo ? tipo.dados : { layout: 'lateral', titulo: 'Certificado', subtitulo: 'de participação', texto: 'participou de **{evento}**, realizado por **{empresa}** em **{data}**{em_local}{com_carga}.', mostrar_temas: true }, evento: eventoExemplo(), codigo: (dadosForm().prefixo_codigo || 'DU99').toUpperCase() + '-A1B2-C3D4' }); };
    var mudou = function () { S.sujo = true; desenha(); };
    f.addEventListener('input', mudou); f.addEventListener('change', mudou);
    ligaImagens(f, mudou); ligaAssinaturas(f, mudou); desenha();
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var er = $('.erro', f); er.hidden = true; var b = $('button[type=submit]', f); b.disabled = true;
      api('salvar', { tipo: 'config', dados: dadosForm() }).then(function (j) { b.disabled = false; if (!j._ok) { er.textContent = j.erro || 'Não foi possível salvar.'; er.hidden = false; return; } S.sujo = false; aviso('Identidade salva.'); recarrega().then(rota); });
    });
  }

  /* ---------- acessos ---------- */
  function telaAcessos(alvo) {
    alvo.innerHTML = '<p class="vazio">Carregando…</p>';
    api('usuarios').then(function (j) {
      if (!j._ok) { alvo.innerHTML = '<p class="vazio">' + esc(j.erro) + '</p>'; return; }
      var l = j.usuarios;
      alvo.innerHTML = '<div class="titulo"><div><h1>Acessos ao painel</h1><p>Quem pode entrar neste painel. O convite gera um link para a pessoa criar a própria senha (vale 7 dias). Para quem esqueceu a senha, gere um novo link.</p></div><button class="btn btn-p" id="conv" type="button">Convidar pessoa</button></div>'
        + '<div class="tabela"><table><thead><tr><th>Pessoa</th><th>Situação</th><th>Último acesso</th><th></th></tr></thead><tbody>'
        + l.map(function (u) {
          var sit = !u.ativo ? 'Desativado' : u.pendente ? 'Convite pendente' : 'Ativo';
          return '<tr data-id="' + u.id + '"><td><b>' + esc(u.nome || '—') + '</b><span class="s">' + esc(u.email || 'e-mail definido no primeiro acesso') + '</span></td><td>' + sit + '</td><td>' + esc(u.ultimo_acesso ? fmtData(u.ultimo_acesso) : '—') + '</td><td style="white-space:nowrap">'
            + '<button class="btn btn-s btn-pq" data-link type="button">Gerar novo link</button> '
            + (u.id === S.usuario.id ? '<span class="s" style="display:inline">você</span>' : '<button class="btn btn-' + (u.ativo ? 'mal' : 's') + ' btn-pq" data-at="' + (u.ativo ? 'desativar' : 'reativar') + '" type="button">' + (u.ativo ? 'Desativar' : 'Reativar') + '</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var mostraLink = function (link, quem) {
        dialogo('<h2>Link de acesso</h2><p style="font-size:14px">Envie este link para ' + esc(quem) + '. Ele vale por 7 dias e só pode ser usado uma vez.</p><div class="copiavel"><input readonly value="' + esc(link) + '"><button class="btn btn-p" type="button" data-cp>Copiar</button></div><div class="linha-bt"><button class="btn btn-s" value="ok">Fechar</button></div>',
          function (f) { $('[data-cp]', f).addEventListener('click', function () { copia(link); }); $('input', f).select(); });
      };
      $('#conv').addEventListener('click', function () {
        dialogo('<h2>Convidar pessoa</h2>' + campo('Nome', inp('nome', '', 'maxlength="80"')) + campo('E-mail', '<input type="email" name="email" maxlength="160" required>') + '<p class="erro" hidden></p><div class="linha-bt"><button class="btn btn-s" value="cancelar" formnovalidate>Cancelar</button><button class="btn btn-p" type="button" data-ok>Gerar convite</button></div>', function (f) {
          $('[data-ok]', f).addEventListener('click', function () {
            var o = form(f);
            api('usuario', { acao: 'convidar', nome: o.nome, email: o.email }).then(function (r) { if (!r._ok) { $('.erro', f).textContent = r.erro; $('.erro', f).hidden = false; return; } $('#dlg').close(); mostraLink(r.link, o.email); telaAcessos(alvo); });
          });
        });
      });
      alvo.querySelector('tbody').addEventListener('click', function (e) {
        var tr = e.target.closest('tr'); if (!tr) return; var u = porId(l, tr.dataset.id);
        if (e.target.matches('[data-link]')) api('usuario', { acao: 'novo_link', id: u.id }).then(function (r) { if (!r._ok) return aviso(r.erro, true); mostraLink(r.link, u.email || u.nome || 'a pessoa'); });
        if (e.target.dataset.at) api('usuario', { acao: e.target.dataset.at, id: u.id }).then(function (r) { if (!r._ok) return aviso(r.erro, true); aviso('Feito.'); telaAcessos(alvo); });
      });
    });
  }

  /* ---------- começo ---------- */
  if (new URLSearchParams(location.search).get('convite')) porta();
  else api('eu').then(function (j) { if (j._ok) inicia(); else porta(); });
})();
