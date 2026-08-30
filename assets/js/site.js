/* ==========================================================================
   Dragones Elite — Landing pública
   ========================================================================== */

(function () {
  const { CLUB, CATEGORIAS, PROGRAMAS, COACHES, TESTIMONIOS, FAQ, HITOS, CLP, todosLosEquipos, Store } = window.DE;
  const { initReveal, initCounters } = window.DEUI;

  const iniciales = nombre => nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

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
    const cuposCard = $('.float-card.a strong');
    if (cuposCard) cuposCard.textContent = `${Math.max(cupos, 0)} cupos`;
    $$('.figures [data-count]')[0]?.setAttribute('data-count', anios);
    $$('.figures [data-count]')[2]?.setAttribute('data-count', equipos.length);
  }

  /* --- Programas (categorías) --------------------------------------------- */

  function pintarProgramas() {
    $('#program-grid').innerHTML = CATEGORIAS.map(cat => `
      <a class="program${cat.destacado ? ' featured' : ''}" href="inscripcion.html?cat=${cat.id}" data-reveal>
        <div class="program-art"><img src="assets/img/${cat.art}.svg" alt="" loading="lazy"></div>
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

  /* --- Historia ------------------------------------------------------------ */

  function pintarHitos() {
    $('#timeline').innerHTML = HITOS.map(h => `
      <div class="tl-item" data-reveal="left">
        <b>${h.año}</b>
        <div><h4>${h.titulo}</h4><p>${h.detalle}</p></div>
      </div>`).join('');
  }

  /* --- Galería + lightbox --------------------------------------------------- */

  const SHOTS = [
    { img: 'art-stunt',    t: 'Stunt en grupo',     s: 'Youth Storm · entrenamiento de martes' },
    { img: 'art-jump',     t: 'Jumps',              s: 'Toe touch sincronizado' },
    { img: 'art-toss',     t: 'Basket toss',        s: 'Junior Inferno · rutina 2026' },
    { img: 'art-podium',   t: 'Podio nacional',     s: 'Senior Elite' },
    { img: 'art-tumbling', t: 'Pista de tumbling',  s: 'Series de flic flac' },
    { img: 'art-team',     t: 'La familia',         s: 'Cierre de temporada' }
  ];

  function pintarGaleria() {
    $('#gallery').innerHTML = SHOTS.map((s, i) => `
      <figure class="shot" data-reveal="zoom" data-shot="${i}">
        <img src="assets/img/${s.img}.svg" alt="${s.t}" loading="lazy">
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
      $('img', box).src = `assets/img/${SHOTS[idx].img}.svg`;
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
        <span class="ini">${iniciales(c.nombre)}</span>
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
    track.innerHTML = TESTIMONIOS.map(t => `
      <blockquote class="quote">
        <p>“${t.texto}”</p>
        <footer>
          <span class="ini">${iniciales(t.autor)}</span>
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
    const url = `https://wa.me/${CLUB.whatsapp}?text=${encodeURIComponent('Hola, quiero información para inscribir a mi hija en Dragones Elite.')}`;
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
    pintarGaleria();
    pintarCoaches();
    pintarTestimonios();
    pintarFaq();
    pintarMock();
    pintarContacto();
    initReveal();
    initCounters();
  });
})();
