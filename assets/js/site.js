/* ==========================================================================
   Dragones Elite — Landing pública
   ========================================================================== */

(function () {
  const { CLUB, CATEGORIAS, PROGRAMAS, COACHES, TESTIMONIOS, FAQ, HITOS, VALORES, CLP, todosLosEquipos, Store } = window.DE;
  const { initReveal, initCounters, initFotos } = window.DEUI;

  const iniciales = nombre => nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const slug = txt => txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* --- Cifras reales del club en el hero ---------------------------------- */

  function pintarCifras() {
    const anios = new Date().getFullYear() - CLUB.fundacion;
    const equipos = todosLosEquipos();
    const deportistas = Store.deportistas().length;
    const cupos = equipos.reduce((s, e) => s + e.cupos, 0) - Store.deportistas().filter(a => a.estado === 'activa').length;

    $('#anios-club').textContent = anios;
    $$('.hero-stats [data-count]')[0]?.setAttribute('data-count', anios);
    $$('.hero-stats [data-count]')[1]?.setAttribute('data-count', deportistas);
    $$('.hero-stats [data-count]')[2]?.setAttribute('data-count', equipos.length);
    $$('.hero-stats [data-count]')[3]?.setAttribute('data-count', CATEGORIAS.length);
    const cuposCard = $('.float-card.a strong');
    if (cuposCard) cuposCard.textContent = `${Math.max(cupos, 0)} cupos`;
    $$('.figures [data-count]')[0]?.setAttribute('data-count', anios);
    $$('.figures [data-count]')[2]?.setAttribute('data-count', equipos.length);
  }

  /* --- Programas (categorías) --------------------------------------------- */

  function pintarProgramas() {
    $('#program-grid').innerHTML = CATEGORIAS.map(cat => `
      <a class="program${cat.destacado ? ' featured' : ''}" href="inscripcion.html?cat=${cat.id}" data-reveal>
        <div class="program-art"><img data-foto="programa-${cat.id}" src="assets/img/${cat.art}.svg" alt="" loading="lazy"></div>
        <span class="pill lvl">${cat.destacado ? '★ ' : ''}${cat.nivel}</span>
        <h3>${cat.nombre}</h3>
        <span class="age">${cat.edadTxt}</span>
        <p>${cat.resumen}</p>
        <ul>${cat.incluye.map(i => `<li>${i}</li>`).join('')}</ul>
        <div class="foot">
          <b>${CLP(cat.precio)} <em>/ mes</em></b>
          <span class="go" aria-hidden="true">→</span>
        </div>
      </a>`).join('');

    $('#programa-extra').innerHTML = PROGRAMAS.map(p => `
      <article class="card team-card" data-reveal>
        <header>
          <div><h3>${p.nombre}</h3><span class="age" style="color:var(--gold);font-size:12px;letter-spacing:.08em;text-transform:uppercase">${p.horario}</span></div>
          <span class="tag mute">${CLP(p.precio)}/mes</span>
        </header>
        <p style="font-size:13.5px;color:var(--muted)">${p.desc}</p>
        <a class="btn btn-ghost btn-sm" href="inscripcion.html?programa=${p.id}" style="justify-self:start">Consultar cupo</a>
      </article>`).join('');
  }

  /* --- Equipos con pestañas por categoría --------------------------------- */

  function pintarEquipos() {
    const porEquipo = Store.porEquipo();
    const tabs = [{ id: 'todos', nombre: 'Todos' }, ...CATEGORIAS.map(c => ({ id: c.id, nombre: c.nombre }))];
    let activa = 'todos';

    const pintarTabs = () => {
      $('#team-tabs').innerHTML = tabs.map(t =>
        `<button class="tab${t.id === activa ? ' active' : ''}" role="tab" data-tab="${t.id}">${t.nombre}</button>`).join('');
      $$('#team-tabs .tab').forEach(btn => btn.addEventListener('click', () => {
        activa = btn.dataset.tab;
        pintarTabs();
        pintarLista();
      }));
    };

    const pintarLista = () => {
      const lista = porEquipo.filter(eq => activa === 'todos' || eq.categoriaId === activa);
      $('#team-grid').innerHTML = lista.map(eq => {
        const libres = Math.max(eq.cupos - eq.activas, 0);
        const pct = Math.min(100, Math.round(eq.ocupacion * 100));
        return `
        <article class="card team-card" data-reveal>
          <header>
            <div>
              <h3>${eq.nombre}</h3>
              <span class="age" style="color:var(--gold);font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:700">${eq.categoria}</span>
            </div>
            <span class="tag ${libres === 0 ? 'alert' : libres <= 4 ? 'warn' : 'ok'}">${libres === 0 ? 'Lista de espera' : `${libres} cupos`}</span>
          </header>
          <div class="meta">
            <div><i>◷</i><span>${eq.horario}</span></div>
            <div><i>◎</i><span>Coach ${eq.coach}</span></div>
            <div><i>◇</i><span>${CLP(eq.precio)} mensual</span></div>
          </div>
          <div>
            <div class="bar"><i data-bar="${pct}"></i></div>
            <div class="cupos"><span>${eq.activas} inscritas</span><span>${eq.cupos} cupos</span></div>
          </div>
          <a class="btn btn-ghost btn-sm" href="inscripcion.html?equipo=${eq.id}" style="justify-self:start">
            ${libres === 0 ? 'Anotarme en lista de espera' : 'Inscribirme en este equipo'}
          </a>
        </article>`;
      }).join('');

      initReveal($('#team-grid'));
      /* Las barras se llenan al entrar en pantalla */
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { e.target.style.width = `${e.target.dataset.bar}%`; io.unobserve(e.target); }
      }), { threshold: .4 });
      $$('#team-grid [data-bar]').forEach(b => io.observe(b));
    };

    pintarTabs();
    pintarLista();
  }

  /* --- Logros: riel horizontal ------------------------------------------- */

  function pintarHitos() {
    const riel = $('#logros-riel');
    if (!riel) return;
    /* Los hitos de competencia llevan medalla */
    const conMedalla = /nacional|internacional|podio|clasifica/i;
    riel.innerHTML = HITOS.map((h, i) => `
      <article class="hito" data-hito="${i}">
        ${conMedalla.test(h.titulo + ' ' + h.detalle) ? '<span class="hito-medalla" aria-label="Logro deportivo">★</span>' : ''}
        <div class="hito-ano">${h.año}</div>
        <h3>${h.titulo}</h3>
        <p>${h.detalle}</p>
      </article>`).join('');
  }

  /* --- Valores ------------------------------------------------------------ */

  const ICONOS = {
    llama:    '<path d="M12 22c4 0 7-2.8 7-7 0-3.4-2.2-6.1-4.1-8.1-.4 2-1.5 3.4-2.9 4.1.3-3.1-.8-6.3-3.4-9-.2 3.3-2 5.4-3.6 7.3C3.9 11.4 5 14 5 15c0 4.2 3 7 7 7z"/>',
    escudo:   '<path d="M12 2l8 3.5v6.2c0 4.8-3.4 8.9-8 10.3-4.6-1.4-8-5.5-8-10.3V5.5z"/><path d="M9 12l2 2 4-4"/>',
    estrella: '<path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z"/>',
    ala:      '<path d="M3 17c3-1 5.5-3.4 7-7 1.3 2.6 3.6 4 6.5 4.2L21 5c-3.7 2.3-7.5 3-11 2-1.2 4.7-3.5 8-7 10z"/><path d="M8 20c2.4-.4 4.6-1.7 6.2-3.8"/>',
    corazon:  '<path d="M12 20.5s-7.5-4.5-9.3-9.2C1.5 8 3.4 4.5 7 4.5c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.6 0 5.5 3.5 4.3 6.8-1.8 4.7-9.3 9.2-9.3 9.2z"/>'
  };

  function pintarValores() {
    const lista = $('#valores');
    if (!lista) return;
    lista.innerHTML = VALORES.map(v => `
      <li class="valor">
        <span class="valor-ico" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONOS[v.icono] || ''}</svg></span>
        <div><h3>${v.titulo}</h3><p>${v.texto}</p></div>
        <i class="valor-linea" aria-hidden="true"></i>
      </li>`).join('');

    /* Sin GSAP (o con menos movimiento) el ícono igual se enciende al entrar */
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('encendido'); io.unobserve(e.target); }
    }), { threshold: .6 });
    $$('#valores .valor').forEach(v => io.observe(v));
  }

  /* --- Competencias con cuenta regresiva ----------------------------------- */

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const cuando = e => new Date(`${e.fecha}T${e.hora || '09:00'}:00`);

  function proximos() {
    const ahora = new Date();
    return Store.eventos()
      .filter(e => cuando(e) > ahora && e.tipo !== 'pago')
      .sort((a, b) => cuando(a) - cuando(b));
  }

  function pintarCompetencias() {
    const grilla = $('#comp-grid');
    if (!grilla) return;
    const lista = proximos();
    /* Primero las competencias, que son las que mueven a las familias */
    const orden = [...lista.filter(e => e.tipo === 'competencia'), ...lista.filter(e => e.tipo !== 'competencia')].slice(0, 3);

    grilla.innerHTML = orden.length ? orden.map((e, i) => {
      const d = cuando(e);
      const etiqueta = { competencia: 'Competencia', club: 'Actividad del club', entreno: 'Entrenamiento' }[e.tipo] || 'Evento';
      return `
      <article class="comp${i === 0 ? ' principal' : ''}" data-cuando="${d.toISOString()}">
        <span class="comp-tipo">${etiqueta}</span>
        <h3>${e.titulo}</h3>
        <p class="comp-lugar">${d.getDate()} de ${MESES[d.getMonth()]} · ${e.hora} · ${e.lugar}</p>
        <div class="cuenta" aria-label="Tiempo restante">
          <div><b data-u="d">0</b><span>días</span></div>
          <div><b data-u="h">0</b><span>horas</span></div>
          <div><b data-u="m">0</b><span>min</span></div>
          <div><b data-u="s">0</b><span>seg</span></div>
        </div>
      </article>`;
    }).join('') : '<p class="lead">El club publicará aquí sus próximas fechas.</p>';

    const tick = () => {
      $$('#comp-grid .comp').forEach(c => {
        let ms = Math.max(0, new Date(c.dataset.cuando) - new Date());
        const u = { d: 864e5, h: 36e5, m: 6e4, s: 1e3 };
        Object.entries(u).forEach(([k, v]) => {
          const n = Math.floor(ms / v); ms -= n * v;
          const el = $(`[data-u="${k}"]`, c);
          if (el) el.textContent = String(n).padStart(k === 'd' ? 1 : 2, '0');
        });
      });
    };
    tick();
    setInterval(tick, 1000);

    /* La tarjeta flotante del hero anuncia la próxima competencia real */
    const comp = lista.find(e => e.tipo === 'competencia');
    if (comp) {
      const dias = Math.floor((cuando(comp) - new Date()) / 864e5);
      if ($('#hero-prox')) $('#hero-prox').textContent = comp.titulo;
      if ($('#hero-prox-cuando')) $('#hero-prox-cuando').textContent = dias < 1 ? `${comp.lugar} · hoy` : `${comp.lugar} · en ${dias} día${dias === 1 ? '' : 's'}`;
    }

    const evaluacion = lista.find(e => /evaluaci/i.test(e.titulo));
    if (evaluacion && $('#prox-eval')) {
      const d = cuando(evaluacion);
      $('#prox-eval').textContent = `Próxima evaluación: ${d.getDate()} de ${MESES[d.getMonth()]}, ${evaluacion.hora} hrs.`;
    }
  }

  /* --- Tryouts: formulario corto ------------------------------------------ */

  function prepararTryouts() {
    const form = $('#tryout-form');
    if (!form) return;
    $('#t-cat').innerHTML = '<option value="">Que el club me oriente</option>' +
      CATEGORIAS.map(c => `<option value="${c.nombre}">${c.nombre} · ${c.edadTxt}</option>`).join('');

    /* Al escribir la edad, sugiere la categoría */
    $('#t-edad').addEventListener('input', e => {
      const edad = Number(e.target.value);
      const cat = CATEGORIAS.find(c => edad >= c.edad[0] && edad <= c.edad[1]);
      if (cat) $('#t-cat').value = cat.nombre;
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const nombre = $('#t-nombre').value.trim();
      const edad = $('#t-edad').value.trim();
      const tel = $('#t-tel').value.replace(/\D/g, '');
      const cat = $('#t-cat').value || 'por definir';
      const marcar = (sel, mal) => $(sel).closest('.field').classList.toggle('invalid', mal);
      marcar('#t-nombre', nombre.length < 3); marcar('#t-edad', !edad); marcar('#t-tel', tel.length < 8);
      if (nombre.length < 3 || !edad || tel.length < 8) return window.DEUI.toast('Completa nombre, edad y WhatsApp.', 'err');
      if (!$('#t-ok').checked) return window.DEUI.toast('Necesitamos tu autorización para usar los datos.', 'err');

      const texto = `Hola, quiero agendar una clase de prueba.\nDeportista: ${nombre} (${edad} años)\nCategoría de interés: ${cat}\nWhatsApp: +56 ${tel}`;
      if (CLUB.formEndpoint) {
        fetch(CLUB.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ asunto: `Tryout · ${nombre}`, resumen: texto }) }).catch(() => {});
      }
      window.open(`https://wa.me/${CLUB.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
      window.DEUI.toast('Listo: te abrimos WhatsApp con tus datos para enviar al club.');
      form.reset();
    });
  }

  /* --- Contacto, redes y mapa --------------------------------------------- */

  const ICONO_RED = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.3a4.7 4.7 0 100 9.4 4.7 4.7 0 000-9.4zm0 7.7a3 3 0 110-6 3 3 0 010 6zm6-7.9a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0zM21.9 7c-.1-1.5-.4-2.8-1.5-3.9S17.9 1.7 16.4 1.6C14.9 1.5 9.1 1.5 7.6 1.6 6.1 1.7 4.8 2 3.7 3.1S2.3 5.5 2.2 7c-.1 1.5-.1 7.3 0 8.8.1 1.5.4 2.8 1.5 3.9s2.4 1.4 3.9 1.5c1.5.1 7.3.1 8.8 0 1.5-.1 2.8-.4 3.9-1.5s1.4-2.4 1.5-3.9c.1-1.5.1-7.3 0-8.8zm-2 10.6a3 3 0 01-1.7 1.7c-1.2.5-4 .4-5.2.4s-4 .1-5.2-.4a3 3 0 01-1.7-1.7c-.5-1.2-.4-4-.4-5.2s-.1-4 .4-5.2a3 3 0 011.7-1.7C7 5 9.8 5.1 11.1 5.1s4-.1 5.2.4a3 3 0 011.7 1.7c.5 1.2.4 4 .4 5.2s.1 4-.4 5.2z"/></svg>',
    facebook:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0022 12z"/></svg>',
    youtube:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.2a3 3 0 00-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 001 7.2 31 31 0 00.5 12a31 31 0 00.5 4.8 3 3 0 002.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 002.1-2.1 31 31 0 00.5-4.8 31 31 0 00-.5-4.8zM9.7 15V9l5.9 3z"/></svg>'
  };
  const NOMBRE_RED = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube' };

  function prepararContacto() {
    const wa = `https://wa.me/${CLUB.whatsapp}?text=${encodeURIComponent('Hola, quiero información sobre Dragones Elite.')}`;
    if ($('#c-dir')) $('#c-dir').textContent = CLUB.direccion;
    if ($('#c-wa')) $('#c-wa').href = wa;
    if ($('#c-mail')) { $('#c-mail').href = `mailto:${CLUB.email}`; $('#c-mail').textContent = CLUB.email; }
    if ($('#redes')) $('#redes').innerHTML = Object.entries(CLUB.redes).map(([red, url]) =>
      `<a href="${url}" target="_blank" rel="noopener">${ICONO_RED[red]}${NOMBRE_RED[red]}</a>`).join('');

    const auspicio = $('#cta-auspicio');
    if (auspicio) auspicio.href = `https://wa.me/${CLUB.whatsapp}?text=${encodeURIComponent('Hola, represento a una empresa y me interesa auspiciar a Dragones Elite.')}`;

    /* El mapa no se pide a OpenStreetMap hasta que la persona lo solicita */
    const boton = $('#ver-mapa');
    if (boton) boton.addEventListener('click', () => {
      const { lat, lon } = CLUB.mapa;
      const d = .018;
      const f = document.createElement('iframe');
      f.title = 'Mapa de ubicación del gimnasio';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer';
      f.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d},${lon + d},${lat + d}&layer=mapnik&marker=${lat},${lon}`;
      $('#mapa').innerHTML = '';
      $('#mapa').appendChild(f);
    });
  }

  /* --- Galería + lightbox --------------------------------------------------- */

  const SHOTS = [
    { img: 'art-stunt',    t: 'Arriba',             s: 'La flyer en lo alto del stunt' },
    { img: 'art-jump',     t: 'Jumps',              s: 'Toe touch sincronizado' },
    { img: 'art-toss',     t: 'Basket toss',        s: 'Junior Inferno · rutina 2026' },
    { img: 'art-podium',   t: 'Podio nacional',     s: 'Senior Elite' },
    { img: 'art-team',     t: 'En el aire',         s: 'Salto con pompones' },
    { img: 'art-tumbling', t: 'Pista de tumbling',  s: 'Series de flic flac' },
    { img: 'art-class',    t: 'Un solo equipo',     s: 'Manos en corazón antes de salir' },
    { img: 'art-hero',     t: 'Antes de salir',     s: 'Camarín, minutos previos' }
  ];

  function pintarGaleria() {
    $('#gallery').innerHTML = SHOTS.map((s, i) => `
      <figure class="shot" data-reveal="zoom" data-shot="${i}">
        <img data-foto="galeria-${i + 1}" src="assets/img/${s.img}.svg" alt="${s.t}" loading="lazy">
        <figcaption>${s.t}<small>${s.s}</small></figcaption>
      </figure>`).join('');

    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = `
      <button class="close" aria-label="Cerrar">✕</button>
      <button class="nav-btn prev" aria-label="Anterior">‹</button>
      <img alt="">
      <button class="nav-btn next" aria-label="Siguiente">›</button>
      <span class="cap"></span>`;
    document.body.appendChild(box);

    let idx = 0;
    const mostrar = i => {
      idx = (i + SHOTS.length) % SHOTS.length;
      const enGaleria = $(`#gallery [data-shot="${idx}"] img`);
      $('img', box).src = enGaleria ? enGaleria.src : `assets/img/${SHOTS[idx].img}.svg`;
      $('img', box).alt = SHOTS[idx].t;
      $('.cap', box).textContent = `${SHOTS[idx].t} — ${SHOTS[idx].s}`;
    };
    const abrir = i => { mostrar(i); box.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const cerrar = () => { box.classList.remove('open'); document.body.style.overflow = ''; };

    $$('#gallery .shot').forEach(fig => fig.addEventListener('click', () => abrir(Number(fig.dataset.shot))));
    $('.close', box).addEventListener('click', cerrar);
    $('.prev', box).addEventListener('click', () => mostrar(idx - 1));
    $('.next', box).addEventListener('click', () => mostrar(idx + 1));
    box.addEventListener('click', e => { if (e.target === box) cerrar(); });
    window.addEventListener('keydown', e => {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowRight') mostrar(idx + 1);
      if (e.key === 'ArrowLeft') mostrar(idx - 1);
    });
  }

  /* --- Coaches -------------------------------------------------------------- */

  function pintarCoaches() {
    $('#coach-grid').innerHTML = COACHES.map(c => `
      <article class="card coach" data-reveal>
        <span class="ini" data-foto="coach-${slug(c.nombre)}"><span class="ini-text">${iniciales(c.nombre)}</span></span>
        <div>
          <h3>${c.nombre}</h3>
          <span class="rol">${c.rol}</span>
        </div>
        <p>${c.detalle}</p>
        <span class="tag mute">${c.años} años en el club</span>
      </article>`).join('');
  }

  /* --- Testimonios ---------------------------------------------------------- */

  function pintarTestimonios() {
    const track = $('#quote-track');
    track.innerHTML = TESTIMONIOS.map((t, i) => `
      <blockquote class="quote">
        <p>“${t.texto}”</p>
        <footer>
          <span class="ini" data-foto="testimonio-${i + 1}"><span class="ini-text">${iniciales(t.autor)}</span></span>
          <div><strong>${t.autor}</strong><span>${t.rol}</span></div>
        </footer>
      </blockquote>`).join('');

    $('#quote-nav').innerHTML = TESTIMONIOS.map((_, i) =>
      `<button class="quote-dot${i === 0 ? ' active' : ''}" aria-label="Testimonio ${i + 1}"></button>`).join('');

    let activo = 0;
    let temporizador;
    const ir = i => {
      activo = (i + TESTIMONIOS.length) % TESTIMONIOS.length;
      track.style.transform = `translateX(-${activo * 100}%)`;
      $$('#quote-nav .quote-dot').forEach((d, k) => d.classList.toggle('active', k === activo));
    };
    const auto = () => { clearInterval(temporizador); temporizador = setInterval(() => ir(activo + 1), 7000); };

    $$('#quote-nav .quote-dot').forEach((d, i) => d.addEventListener('click', () => { ir(i); auto(); }));
    track.parentElement.addEventListener('mouseenter', () => clearInterval(temporizador));
    track.parentElement.addEventListener('mouseleave', auto);
    auto();

    /* Deslizar en móvil */
    let x0 = null;
    track.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) ir(activo + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* --- FAQ ------------------------------------------------------------------ */

  function pintarFaq() {
    $('#faq-list').innerHTML = FAQ.map((f, i) => `
      <div class="faq-item" data-reveal>
        <button class="faq-q" aria-expanded="false" aria-controls="faq-a-${i}">
          <span>${f.q}</span><i aria-hidden="true">+</i>
        </button>
        <div class="faq-a" id="faq-a-${i}"><div><p>${f.a}</p></div></div>
      </div>`).join('');

    $$('#faq-list .faq-q').forEach(btn => btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const abierto = item.classList.contains('open');
      $$('#faq-list .faq-item').forEach(i => {
        i.classList.remove('open');
        $('.faq-q', i).setAttribute('aria-expanded', 'false');
      });
      if (!abierto) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    }));
  }

  /* --- Maqueta del portal de apoderados ------------------------------------- */

  function pintarMock() {
    const caja = $('#mock-asis');
    if (!caja) return;
    const clases = [1, 1, 1, 0, 1, 1, 1, 1];
    caja.innerHTML = clases.map(p =>
      `<i style="background:${p ? 'var(--ok)' : 'var(--alert)'}"></i>`).join('');
  }

  /* --- Enlaces de contacto -------------------------------------------------- */

  function pintarContacto() {
    const url = `https://wa.me/${CLUB.whatsapp}?text=${encodeURIComponent('Hola, quiero información para inscribir a mi hijo o hija en Dragones Elite.')}`;
    ['#wa-link', '#wa-link-2', '#wa-float'].forEach(sel => {
      const el = $(sel);
      if (el) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    });
    $('#foot-dir').textContent = CLUB.direccion;
    $('#foot-mail').textContent = CLUB.email;
    $('#foot-ig').textContent = CLUB.instagram;
  }

  /* --- Arranque ------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', () => {
    pintarCifras();
    pintarProgramas();
    pintarEquipos();
    pintarHitos();
    pintarValores();
    pintarCompetencias();
    prepararTryouts();
    prepararContacto();
    pintarGaleria();
    pintarCoaches();
    pintarTestimonios();
    pintarFaq();
    pintarMock();
    pintarContacto();
    initReveal();
    initCounters();
    initFotos();
  });
})();
