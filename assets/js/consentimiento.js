/* ==========================================================================
   Dragones Elite — Consentimiento y estadísticas
   --------------------------------------------------------------------------
   Regla: nada que no sea estrictamente necesario se carga antes de que la
   persona decida, y rechazar cuesta exactamente lo mismo que aceptar
   (un clic, mismo tamaño, mismo color, sin casillas premarcadas).
   Si ANALITICA.codigo está vacío no hay nada opcional que consultar, así que
   el banner no aparece: preguntar por algo que no existe es ruido.
   ========================================================================== */

(function () {
  const ANALITICA = {
    proveedor: 'goatcounter',   // sin cookies, sin seguimiento entre sitios
    codigo: '',                 // ← código de la cuenta; vacío = analítica apagada
    script: 'https://gc.zgo.at/count.js'
  };

  const CLAVE = 'de.v2.consentimiento';
  const leer = () => { try { return localStorage.getItem(CLAVE); } catch { return null; } };
  const guardar = v => { try { localStorage.setItem(CLAVE, v); } catch { /* modo privado */ } };

  function cargarAnalitica() {
    if (!ANALITICA.codigo || document.getElementById('analitica')) return;
    const s = document.createElement('script');
    s.id = 'analitica';
    s.async = true;
    s.dataset.goatcounter = `https://${ANALITICA.codigo}.goatcounter.com/count`;
    s.src = ANALITICA.script;
    document.head.appendChild(s);
  }

  function pintarBanner() {
    const caja = document.createElement('div');
    caja.className = 'consent';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-label', 'Estadísticas de visitas');
    caja.innerHTML = `
      <div class="consent-txt">
        <strong>Estadísticas de visitas</strong>
        <p>
          Nos ayuda saber cuánta gente visita el sitio. La herramienta que usamos no instala
          cookies ni te sigue por otras páginas. Tú decides.
          <a href="privacidad.html">Cómo tratamos tus datos</a>
        </p>
      </div>
      <div class="consent-btns">
        <button class="btn btn-consent" data-consent="no">Rechazar</button>
        <button class="btn btn-consent" data-consent="si">Aceptar</button>
      </div>`;
    document.body.appendChild(caja);
    requestAnimationFrame(() => caja.classList.add('on'));

    caja.querySelectorAll('[data-consent]').forEach(b => b.addEventListener('click', () => {
      guardar(b.dataset.consent);
      if (b.dataset.consent === 'si') cargarAnalitica();
      caja.classList.remove('on');
      setTimeout(() => caja.remove(), 350);
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    /* Permite cambiar de opinión desde el pie, en cualquier página */
    document.querySelectorAll('[data-preferencias]').forEach(el => el.addEventListener('click', e => {
      e.preventDefault();
      if (!ANALITICA.codigo) { window.DEUI?.toast('No hay estadísticas activas en este sitio.'); return; }
      try { localStorage.removeItem(CLAVE); } catch { /* modo privado */ }
      document.querySelector('.consent')?.remove();
      pintarBanner();
    }));

    if (!ANALITICA.codigo) return;          // nada opcional que consultar
    const decision = leer();
    if (decision === 'si') return cargarAnalitica();
    if (decision === 'no') return;
    pintarBanner();
  });
})();
