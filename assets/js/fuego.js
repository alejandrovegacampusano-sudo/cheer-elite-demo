/* ==========================================================================
   Dragones Elite — Movimiento de la portada ("dragón en vuelo")
   --------------------------------------------------------------------------
   GSAP + ScrollTrigger + SplitText + Lenis, alojados en assets/vendor/.
   Reglas:
   · Todo parte desde el estado final: si esto no corre, el sitio está completo.
   · prefers-reduced-motion → no se anima nada.
   · Solo se anima transform y opacity (y clip-path en entradas puntuales).
   · En celular: sin cursor propio, sin parallax de mouse, parallax suave,
     menos brasas y riel de logros vertical.
   ========================================================================== */

(function () {
  const raiz = document.documentElement;
  const quitarIntro = () => raiz.classList.remove('intro');
  const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    if (menosMovimiento || !window.gsap || !window.ScrollTrigger) { quitarIntro(); return; }

    const { gsap, ScrollTrigger, SplitText, Lenis } = window;
    gsap.registerPlugin(ScrollTrigger, SplitText);

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const escritorio = window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches;
    const angosto = window.innerWidth < 861;

    /* --- Scroll suave ----------------------------------------------------- */
    let lenis = null;
    if (Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      raiz.classList.add('lenis');
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);

      document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]');
        if (!a || a.getAttribute('href').length < 2) return;
        const destino = $(a.getAttribute('href'));
        if (!destino) return;
        e.preventDefault();
        lenis.scrollTo(destino, { offset: -78, duration: 1.3 });
      });
    }

    /* --- Entrada del hero -------------------------------------------------- */
    const titulo = $('.hero-titulo');
    const lineaSolida = $('.hero-titulo .linea:not(.fuego)');
    const lineaFuego = $('.hero-titulo .linea.fuego');
    const letras = lineaSolida ? new SplitText(lineaSolida, { type: 'chars', charsClass: 'char' }).chars : [];

    const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
    quitarIntro();
    intro
      .from('.hero-texto .eyebrow', { y: 16, autoAlpha: 0, duration: .8 }, .1)
      .from(letras, { yPercent: 115, rotate: 7, autoAlpha: 0, duration: 1.1, stagger: .045 }, .15)
      /* "Elite" no se corta en letras: su degradado de fuego se rompería */
      .from(lineaFuego, { yPercent: 60, autoAlpha: 0, scale: .96, duration: 1.2 }, .45)
      .from('.hero-texto .hero-in:not(.eyebrow)', { y: 26, autoAlpha: 0, duration: .9, stagger: .09 }, .6)
      .from('.proxima', { y: 36, autoAlpha: 0, scale: .96, duration: 1.1 }, .75);

    /* Atletas "lanzados": x y y con curvas distintas dibujan un arco */
    const vuelos = [
      { el: '.volador.v1', x: -340, y: 300, rot: -70, t: .7 },
      { el: '.volador.v2', x: 320,  y: 360, rot: 90,  t: .85 },
      { el: '.volador.v3', x: 260,  y: 220, rot: 140, t: 1.0 }
    ];
    vuelos.forEach(v => {
      const el = $(v.el);
      if (!el || getComputedStyle(el).display === 'none') return;
      intro.from(el, { x: v.x, duration: 1.4, ease: 'power2.out' }, v.t)
           .from(el, { y: v.y, duration: 1.4, ease: 'back.out(1.6)' }, v.t)
           .from(el, { rotate: v.rot, scale: .35, autoAlpha: 0, duration: 1.2, ease: 'power3.out' }, v.t);
      /* después flotan, como en el aire */
      gsap.to(el, { yPercent: -9, rotate: '+=5', duration: 2.6 + Math.random(), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: v.t + 1.4 });
    });

    /* --- Parallax por profundidad con el scroll -------------------------- */
    const hero = $('.hero-fuego');
    const fuerza = angosto ? .35 : 1;
    $$('[data-profundidad]', hero).forEach(capa => {
      const p = parseFloat(capa.dataset.profundidad);
      gsap.to(capa, {
        y: () => p * 320 * fuerza,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
      });
    });

    /* --- Parallax con el mouse (solo escritorio) -------------------------- */
    if (escritorio && hero) {
      const capas = $$('[data-profundidad]', hero).map(el => ({
        el, p: parseFloat(el.dataset.profundidad),
        x: gsap.quickTo(el, 'x', { duration: .9, ease: 'power3.out' }),
        yp: gsap.quickTo(el, 'yPercent', { duration: .9, ease: 'power3.out' })
      }));
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - .5;
        const ny = (e.clientY - r.top) / r.height - .5;
        capas.forEach(c => { c.x(nx * c.p * -60); c.yp(ny * c.p * -6); });
      });
      hero.addEventListener('pointerleave', () => capas.forEach(c => { c.x(0); c.yp(0); }));
    }

    /* --- Brasas subiendo en el hero --------------------------------------- */
    const lienzo = $('#brasas');
    if (lienzo) {
      const ctx = lienzo.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = 0, h = 0, brasas = [], activo = true;
      const nueva = (inicio) => ({
        x: Math.random() * w,
        y: inicio ? Math.random() * h : h + 10,
        vy: .35 + Math.random() * 1.1,
        vx: (Math.random() - .5) * .35,
        r: .6 + Math.random() * 2.1,
        vida: 0,
        max: 260 + Math.random() * 320,
        tono: 8 + Math.random() * 40,          /* de rojo (8) a oro (48) */
        fase: Math.random() * 6.28
      });
      const medir = () => {
        const r = lienzo.getBoundingClientRect();
        w = r.width; h = r.height;
        lienzo.width = w * dpr; lienzo.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = Math.round(Math.min(angosto ? 28 : 80, w / 16));
        brasas = Array.from({ length: n }, () => nueva(true));
      };
      const pintar = () => {
        if (!activo) return;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        brasas.forEach((b, i) => {
          b.vida++; b.y -= b.vy; b.x += b.vx + Math.sin((b.vida + b.fase * 40) / 40) * .25;
          const t = b.vida / b.max;
          const alfa = Math.max(0, Math.sin(Math.PI * t)) * (.55 + .45 * Math.sin(b.vida / 6 + b.fase));
          if (t >= 1 || b.y < -10) { brasas[i] = nueva(false); return; }
          ctx.fillStyle = `hsla(${b.tono}, 100%, 60%, ${alfa * .22})`;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 3.2, 0, 6.283); ctx.fill();
          ctx.fillStyle = `hsla(${b.tono + 8}, 100%, 72%, ${alfa})`;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
        });
        requestAnimationFrame(pintar);
      };
      medir();
      window.addEventListener('resize', () => { clearTimeout(medir.t); medir.t = setTimeout(medir, 200); });
      /* Se detienen cuando el hero sale de pantalla o la pestaña se oculta */
      new IntersectionObserver(([e]) => {
        const antes = activo;
        activo = e.isIntersecting && !document.hidden;
        if (activo && !antes) requestAnimationFrame(pintar);
      }).observe(hero);
      document.addEventListener('visibilitychange', () => {
        const antes = activo;
        activo = !document.hidden;
        if (activo && !antes) requestAnimationFrame(pintar);
      });
      requestAnimationFrame(pintar);
    }

    /* --- Títulos de sección palabra por palabra -------------------------- */
    $$('[data-palabras]').forEach(t => {
      const partes = new SplitText(t, { type: 'words', mask: 'words', wordsClass: 'palabra' });
      gsap.from(partes.words, {
        yPercent: 110, duration: 1, ease: 'expo.out', stagger: .06,
        scrollTrigger: { trigger: t, start: 'top 86%', once: true }
      });
    });

    /* --- Valores: entran en fila, la línea se dibuja, el ícono se enciende -- */
    $$('#valores .valor').forEach((v, i) => {
      const trazos = $$('.valor-ico path', v);
      trazos.forEach(p => {
        const largo = p.getTotalLength();
        gsap.set(p, { strokeDasharray: largo, strokeDashoffset: largo });
      });
      const tl = gsap.timeline({ scrollTrigger: { trigger: v, start: 'top 88%', once: true } });
      tl.from(v, { x: -28, autoAlpha: 0, duration: .8, ease: 'power3.out', delay: i * .05 })
        .to(trazos, { strokeDashoffset: 0, duration: .9, ease: 'power2.inOut' }, '-=.5')
        .from($('.valor-linea', v), { scaleX: 0, duration: 1, ease: 'power3.inOut' }, '-=.8')
        .add(() => v.classList.add('encendido'), '-=.3');
    });

    /* --- Zarpazos entre secciones ----------------------------------------- */
    $$('.zarpazo').forEach(z => {
      const trazos = $$('path', z);
      trazos.forEach(p => {
        const largo = p.getTotalLength();
        gsap.set(p, { strokeDasharray: largo, strokeDashoffset: largo });
      });
      gsap.to(trazos, {
        strokeDashoffset: 0, duration: .45, ease: 'power4.in', stagger: .09,
        scrollTrigger: { trigger: z, start: 'top 88%', once: true }
      });
    });

    /* --- Entradas en barrido diagonal ------------------------------------- */
    const barrido = { clipPath: 'polygon(0% 0%, 0% 0%, -25% 100%, -25% 100%)' };
    $$('.comp, .tryout-form, .auspicio-beneficios article').forEach((el, i) => {
      gsap.fromTo(el, barrido, {
        clipPath: 'polygon(0% 0%, 125% 0%, 100% 100%, -25% 100%)',
        duration: 1.05, ease: 'power3.inOut', delay: (i % 3) * .08,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onComplete: () => gsap.set(el, { clearProps: 'clipPath' })
      });
    });

    /* --- Logros: riel horizontal fijado (solo escritorio) ----------------- */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      const riel = $('#logros-riel');
      const pin = $('.logros-pin');
      if (!riel || !pin) return;
      const distancia = () => Math.max(0, riel.scrollWidth - window.innerWidth);
      if (distancia() < 40) return;

      const guia = document.createElement('div');
      guia.className = 'wrap logros-guia';
      guia.innerHTML = '<span>Desliza</span><i></i><span>2007 → hoy</span>';
      pin.appendChild(guia);

      gsap.to(riel, {
        x: () => -distancia(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin, start: 'center 52%', end: () => '+=' + distancia(),
          pin: true, scrub: .6, invalidateOnRefresh: true,
          onUpdate: self => guia.style.setProperty('--avance', self.progress.toFixed(3))
        }
      });
      return () => guia.remove();
    });

    /* --- Cursor propio (solo mouse) --------------------------------------- */
    if (escritorio) {
      const punto = document.createElement('div');
      const aro = document.createElement('div');
      punto.className = 'cursor-punto'; aro.className = 'cursor-aro';
      punto.setAttribute('aria-hidden', 'true'); aro.setAttribute('aria-hidden', 'true');
      document.body.append(punto, aro);
      raiz.classList.add('cursor-propio');
      gsap.set([punto, aro], { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      const px = gsap.quickTo(punto, 'x', { duration: .08 }), py = gsap.quickTo(punto, 'y', { duration: .08 });
      const ax = gsap.quickTo(aro, 'x', { duration: .45, ease: 'power3.out' }), ay = gsap.quickTo(aro, 'y', { duration: .45, ease: 'power3.out' });
      window.addEventListener('pointermove', e => {
        gsap.set([punto, aro], { autoAlpha: 1 });
        px(e.clientX); py(e.clientY); ax(e.clientX); ay(e.clientY);
      }, { passive: true });
      document.addEventListener('pointerleave', () => gsap.to([punto, aro], { autoAlpha: 0, duration: .2 }));
      document.addEventListener('pointerover', e => {
        aro.classList.toggle('sobre', !!e.target.closest('a, button, [data-magnetic], .shot, .tab, .pick, input, select, textarea'));
      });
    }

    /* Las imágenes que llegan tarde cambian alturas: recalcular posiciones */
    window.addEventListener('load', () => ScrollTrigger.refresh());
  });
})();
