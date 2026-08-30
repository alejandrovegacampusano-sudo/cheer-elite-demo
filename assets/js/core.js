/* ==========================================================================
   Dragones Elite — Runtime compartido (UI, movimiento, navegación)
   ========================================================================== */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- Aviso flotante -------------------------------------------------------- */

function toast(mensaje, tipo = 'ok') {
  let stack = $('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast${tipo === 'err' ? ' err' : ''}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<b>${tipo === 'err' ? '!' : '✓'}</b><span></span>`;
  $('span', el).textContent = mensaje;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => {
    el.classList.remove('on');
    setTimeout(() => el.remove(), 400);
  }, 3200);
}

/* --- Entradas al hacer scroll ---------------------------------------------- */

function initReveal(root = document) {
  const objetivos = $$('[data-reveal], .split-line', root).filter(el => !el.dataset.revealed);
  if (noMotion) { objetivos.forEach(el => { el.classList.add('in'); el.dataset.revealed = '1'; }); return; }

  const io = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;
      const el = entrada.target;
      el.classList.add('in');
      el.dataset.revealed = '1';
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  objetivos.forEach(el => {
    /* Escalona los hijos de un mismo grupo sin escribir delays a mano */
    const grupo = el.closest('[data-stagger]');
    if (grupo && !el.style.getPropertyValue('--delay')) {
      const hermanos = $$('[data-reveal], .split-line', grupo);
      el.style.setProperty('--delay', `${hermanos.indexOf(el) * 90}ms`);
    }
    io.observe(el);
  });
}

/* --- Contadores ------------------------------------------------------------ */

function initCounters(root = document) {
  const nums = $$('[data-count]', root).filter(el => !el.dataset.counted);
  const animar = el => {
    el.dataset.counted = '1';
    const destino = Number(el.dataset.count);
    const decimales = (el.dataset.count.split('.')[1] || '').length;
    const sufijo = el.dataset.suffix || '';
    const prefijo = el.dataset.prefix || '';
    if (noMotion) { el.textContent = prefijo + destino.toFixed(decimales) + sufijo; return; }
    const duracion = 1500;
    const inicio = performance.now();
    const paso = ahora => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const eased = 1 - Math.pow(1 - t, 3);
      const valor = destino * eased;
      el.textContent = prefijo + (decimales ? valor.toFixed(decimales) : Math.round(valor).toLocaleString('es-CL')) + sufijo;
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };
  const io = new IntersectionObserver(entradas => {
    entradas.forEach(e => { if (e.isIntersecting) { animar(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.5 });
  nums.forEach(el => io.observe(el));
}

/* --- Parallax y tilt ------------------------------------------------------- */

function initParallax() {
  const capas = $$('[data-parallax]');
  if (!capas.length || noMotion) return;
  let ticking = false;
  const pintar = () => {
    const y = window.scrollY;
    capas.forEach(capa => {
      const factor = parseFloat(capa.dataset.parallax);
      const caja = capa.getBoundingClientRect();
      const centro = caja.top + y + caja.height / 2 - window.innerHeight / 2;
      capa.style.transform = `translate3d(0, ${((y - centro) * factor).toFixed(1)}px, 0)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(pintar); }
  }, { passive: true });
  pintar();
}

function initTilt() {
  if (noMotion || window.matchMedia('(hover: none)').matches) return;
  $$('[data-tilt]').forEach(card => {
    const fuerza = Number(card.dataset.tilt) || 6;
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-py * fuerza).toFixed(2)}deg) rotateY(${(px * fuerza).toFixed(2)}deg) translateY(-4px)`;
      card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

function initMagnetic() {
  if (noMotion || window.matchMedia('(hover: none)').matches) return;
  $$('[data-magnetic]').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * .18).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * .3).toFixed(1)}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
}

/* --- Transición entre páginas ---------------------------------------------- */

function initPageTransitions() {
  const veil = document.createElement('div');
  veil.className = 'page-veil';
  document.body.appendChild(veil);
  document.body.classList.add('booting');
  requestAnimationFrame(() => document.body.classList.remove('booting'));

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link || noMotion) return;
    const url = new URL(link.href, location.href);
    const interna = url.origin === location.origin && /\.html$/.test(url.pathname) && url.pathname !== location.pathname;
    if (!interna || link.target === '_blank' || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    veil.classList.add('on');
    setTimeout(() => { location.href = link.href; }, 320);
  });

  window.addEventListener('pageshow', e => { if (e.persisted) veil.classList.remove('on'); });
}

/* --- Cabecera -------------------------------------------------------------- */

function initHeader() {
  const header = $('[data-header]');
  if (!header) return;
  const barra = $('[data-progress]');
  const menu = $('[data-menu]');
  const abrir = $('[data-menu-toggle]');

  const alScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 16);
    if (barra) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      barra.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    }
  };
  window.addEventListener('scroll', alScroll, { passive: true });
  alScroll();

  if (abrir && menu) {
    const alternar = forzar => {
      const abierto = forzar ?? !menu.classList.contains('open');
      menu.classList.toggle('open', abierto);
      abrir.setAttribute('aria-expanded', String(abierto));
      document.body.style.overflow = abierto ? 'hidden' : '';
    };
    abrir.addEventListener('click', () => alternar());
    $$('a, button', menu).forEach(el => el.addEventListener('click', () => alternar(false)));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') alternar(false); });
  }

  /* Sección activa en el menú */
  const enlaces = $$('[data-nav-link]');
  const secciones = enlaces.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if (secciones.length) {
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(e => {
        if (!e.isIntersecting) return;
        enlaces.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secciones.forEach(s => io.observe(s));
  }
}

/* --- Arranque -------------------------------------------------------------- */

function bootUI() {
  initReveal();
  initCounters();
  initParallax();
  initTilt();
  initMagnetic();
  initHeader();
  initPageTransitions();
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
}

document.addEventListener('DOMContentLoaded', bootUI);

window.DEUI = { toast, initReveal, initCounters, $, $$, noMotion };
