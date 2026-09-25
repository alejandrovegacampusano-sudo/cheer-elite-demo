/* ==========================================================================
   Dragones Elite — Página de la demo para la directiva
   Muestra el estado de los datos de ejemplo y permite volver a empezar.
   ========================================================================== */

(function () {
  const { Store, Finanzas: F, CLP, CLUB_NS } = window.DE;

  function pintarEstado() {
    const fams = F.familias();
    $('#demo-estado').innerHTML = `
      <span><b>${Store.deportistas().length}</b> deportistas</span>
      <span><b>${fams.length}</b> familias</span>
      <span><b>${CLP(F.saldoCaja())}</b> en caja</span>
      <span><b>${F.comprobantes().length}</b> comprobantes emitidos</span>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    pintarEstado();
    $$('[data-reiniciar]').forEach(b => b.addEventListener('click', () => {
      if (!confirm('¿Reiniciar la demo? Se borran los pagos, cobros y cambios hechos en este navegador.')) return;
      Object.keys(localStorage).filter(k => k.startsWith(CLUB_NS)).forEach(k => localStorage.removeItem(k));
      pintarEstado();
      window.DEUI.toast('Demo reiniciada con los datos de ejemplo.');
    }));
  });
})();
