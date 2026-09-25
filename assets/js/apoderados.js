/* ==========================================================================
   Dragones Elite — Portal de apoderados
   El apoderado ve solo lo suyo: sus hijas, sus pagos, su asistencia.
   ========================================================================== */

(function () {
  const { CLUB, CLP, Store, equipoPorId, categoriaPorId, edadDesde } = window.DE;
  const { toast } = window.DEUI;

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const iniciales = n => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const esc = t => { const d = document.createElement('div'); d.textContent = t ?? ''; return d.innerHTML; };
  const mesLindo = clave => `${MESES[Number(clave.split('-')[1]) - 1]} ${clave.split('-')[0]}`;
  const fechaLinda = iso => new Date(iso + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });

  const estado = { telefono: null, hijas: [], activa: null };

  /* ======================= Acceso ======================= */

  function entrar(telefono) {
    const hijas = Store.hijasDe(telefono);
    if (!hijas.length) {
      toast('No encontramos deportistas con ese número. Revisa el WhatsApp o escríbele al club.', 'err');
      return;
    }
    Store.sesionApoderado.abrir(telefono);
    estado.telefono = String(telefono).replace(/\D/g, '').slice(-9);
    estado.hijas = hijas;
    estado.activa = hijas[0];
    $('#gate').hidden = true;
    $('#portal').hidden = false;
    pintarTodo();
  }

  function salir() {
    Store.sesionApoderado.cerrar();
    $('#portal').hidden = true;
    $('#gate').hidden = false;
    $('#tel').value = '';
  }

  /* Familia de ejemplo: la que tenga más de una hija, para mostrar el selector */
  /* Familia de ejemplo: con dos hijos y algo por pagar, para que la demo
     muestre el selector de hijos y el pago con comprobante */
  function familiaDemo() {
    const fams = window.DE.Finanzas.familias();
    const ideal = fams.find(f => f.hijos.length > 1 && f.impagos.length) || fams.find(f => f.hijos.length > 1) || fams[0];
    return ideal.telefono;
  }

  /* ======================= Pintado ======================= */

  function pintarTodo() {
    const primerNombre = estado.activa.apoderado.split(' ')[0];
    $('#saludo').textContent = `Hola, ${primerNombre}`;
    $('#bajada').textContent = estado.hijas.length > 1
      ? `Tienes ${estado.hijas.length} deportistas en el club. Elige a quién quieres ver.`
      : 'Todo lo de tu deportista en el club, en un solo lugar.';

    pintarHijas();
    pintarDeportista();
    pintarPago();
    pintarRendicion();
    pintarAsistencia();
    pintarAvisos();
    pintarAgenda();
    pintarFicha();
  }

  function pintarHijas() {
    const caja = $('#kids');
    caja.hidden = estado.hijas.length < 2;
    caja.innerHTML = estado.hijas.map(a => `
      <button class="kid${a.id === estado.activa.id ? ' on' : ''}" data-id="${a.id}">
        <b>${iniciales(a.nombre)}</b>${esc(a.nombre.split(' ')[0])}
      </button>`).join('');
    $$('#kids .kid').forEach(b => b.addEventListener('click', () => {
      estado.activa = estado.hijas.find(a => a.id === b.dataset.id);
      pintarTodo();
    }));
  }

  function pintarDeportista() {
    const a = estado.activa;
    const eq = equipoPorId(a.equipo) || {};
    const cat = categoriaPorId(a.categoria) || {};
    $('#athlete-hero').innerHTML = `
      <div class="who">
        <span class="face">${iniciales(a.nombre)}</span>
        <div>
          <h2>${esc(a.nombre)}</h2>
          <p class="sub">${cat.nombre} · ${edadDesde(a.nacimiento)} años · en el club desde ${new Date(a.ingreso + 'T12:00').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
      <div class="hero-facts">
        <div><span>Equipo</span><b>${eq.nombre || '—'}</b></div>
        <div><span>Entrena</span><b>${eq.horario || '—'}</b></div>
        <div><span>Coach</span><b>${eq.coach || '—'}</b></div>
      </div>
      ${a.estado === 'pausa' ? '<span class="tag mute">Temporada en pausa</span>' : ''}`;
  }

  /* Estado de cuenta de la FAMILIA: todos los hijos, mensualidades y cuotas
     extra juntas. Se paga todo de una vez y sale el comprobante al tiro. */
  function pintarPago() {
    const F = window.DE.Finanzas;
    const fam = F.familia(estado.telefono);
    const hoy = F.hoy();
    const aPagar = fam ? fam.impagos.filter(c => c.estado === 'vencido' || F.diasEntre(hoy, c.vence) <= 31) : [];
    const total = aPagar.reduce((s, c) => s + c.monto, 0);
    const vencido = aPagar.filter(c => c.estado === 'vencido').reduce((s, c) => s + c.monto, 0);

    $('#pago-estado').innerHTML = !aPagar.length ? '<span class="tag ok">Al día</span>'
      : vencido ? '<span class="tag alert">Con saldo vencido</span>' : '<span class="tag warn">Por pagar</span>';

    const a = estado.activa;
    const meses = Store.meses(6).slice().reverse();
    const comps = F.comprobantes().filter(c => c.familia === estado.telefono && !c.anulado).slice(0, 4);

    $('#pago-box').innerHTML = `
      <div class="money-row">
        <div class="amount">${CLP(total)}<small>${aPagar.length ? `${aPagar.length === 1 ? '1 cargo' : `${aPagar.length} cargos`}${estado.hijas.length > 1 ? ' de toda la familia' : ''}` : 'Nada pendiente'}</small></div>
        ${aPagar.length ? '<button class="btn btn-gold" id="pagar">Pagar <span class="ico">→</span></button>' : '<span class="tag ok">Todo pagado</span>'}
      </div>
      ${aPagar.length ? `<div class="timeline-pay">${aPagar.map(c => `
        <div class="pay-line cargo">
          <span>${esc(c.concepto)}${estado.hijas.length > 1 ? ` · ${esc(c.atleta.nombre.split(' ')[0])}` : ''}</span>
          <b>${CLP(c.monto)}</b>
          ${c.estado === 'vencido' ? '<span class="tag alert">Vencida</span>' : `<span class="tag mute">Vence ${F.fechaCorta(c.vence)}</span>`}
        </div>`).join('')}</div>` : ''}

      <details class="historial">
        <summary>Historial de mensualidades de ${esc(a.nombre.split(' ')[0])}</summary>
        <div class="timeline-pay">
          ${meses.map(m => {
            const p = Store.pagoDe(a.id, m);
            if (!p) return '';
            const tag = p.estado === 'pagado' ? '<span class="tag ok">Pagada</span>'
              : p.estado === 'pendiente' ? '<span class="tag warn">Pendiente</span>'
              : '<span class="tag alert">Vencida</span>';
            return `<div class="pay-line"><span>${mesLindo(m)}</span><b>${CLP(p.monto)}${p.medio ? ` · ${p.medio}` : ''}</b>${tag}</div>`;
          }).join('')}
        </div>
      </details>

      ${comps.length ? `<div class="comprobantes-portal"><h4>Tus comprobantes</h4>${comps.map(c => `
        <button class="pay-line cargo" data-comp="${c.folio}"><span>N° ${c.folio} · ${F.fechaCorta(c.fecha)}</span><b>${CLP(c.total)}</b><span class="tag mute">Ver</span></button>`).join('')}</div>` : ''}

      <p style="font-size:11.5px;color:var(--muted-2)">
        La mensualidad vence el día ${F.piloto().diaVence} de cada mes. Aquí aparecen también las cuotas de viajes y uniformes.
      </p>`;

    $('#pagar')?.addEventListener('click', () => abrirPago(aPagar));
    $$('#pago-box [data-comp]').forEach(b => b.addEventListener('click', () =>
      F.imprimirComprobante(F.comprobantes().find(c => c.folio === Number(b.dataset.comp)))));
  }

  /* Rendición publicada: los totales del club, sin datos de otras familias */
  function pintarRendicion() {
    const F = window.DE.Finanzas;
    const r = F.ultimaRendicionPublicada();
    if (!r) { $('#rendicion-box').innerHTML = '<p class="empty">El club aún no publica su primera rendición.</p>'; $('#rend-mes').textContent = ''; return; }
    const c = r.copia;
    $('#rend-mes').textContent = F.mesLargo(r.mes);
    const max = Math.max(...c.egresos.map(x => x.monto), 1);
    $('#rendicion-box').innerHTML = `
      <div class="rend-portal">
        <div><span>Entró</span><b>${CLP(c.totalIn)}</b></div>
        <div><span>Salió</span><b>${CLP(c.totalEg)}</b></div>
        <div><span>Quedó en caja</span><b>${CLP(c.final)}</b></div>
      </div>
      <h4 class="rend-sub">En qué se usó la plata</h4>
      <ul class="barras-h">${c.egresos.slice(0, 6).map(x => `
        <li><span>${esc(x.nombre)}</span><i style="--p:${(x.monto / max * 100).toFixed(1)}%"></i><b>${CLP(x.monto)}</b></li>`).join('')}</ul>
      <p style="font-size:11.5px;color:var(--muted-2)">Publicada el ${F.fechaCorta(r.fecha)}. ${Math.round(c.cobranza * 100)}% de las mensualidades del mes se pagaron. No se muestran datos de otras familias.</p>`;
  }

  function pintarAsistencia() {
    const a = estado.activa;
    const clases = Store.ultimasClases(a, 8);
    const presentes = clases.filter(c => c.presente).length;
    const pct = clases.length ? Math.round(presentes / clases.length * 100) : 0;

    $('#asis-pct').textContent = `${pct}% en las últimas ${clases.length} clases`;
    $('#asis-box').innerHTML = clases.length ? `
      <div class="att-dots">
        ${clases.slice().reverse().map(c => `
          <div class="att-dot ${c.presente ? 'si' : 'no'}">
            <i></i>${new Date(c.fecha + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
          </div>`).join('')}
      </div>
      <p style="font-size:12px;color:var(--muted)">
        ${pct >= 85 ? '¡Excelente asistencia! Es lo que más ayuda a avanzar de nivel.'
          : pct >= 70 ? 'Buena asistencia. Las rutinas se arman con el equipo completo, cada clase suma.'
          : 'La asistencia viene baja. Si hay algún tema de horario, escríbele al club y lo vemos.'}
      </p>` : '<p style="font-size:12.5px;color:var(--muted)">Todavía no hay clases registradas.</p>';
  }

  function pintarAvisos() {
    const avisos = Store.avisos().slice(0, 4);
    $('#avisos-box').innerHTML = avisos.length ? avisos.map(v => `
      <article class="notice">
        <time>${fechaLinda(v.fecha)}</time>
        <h4>${esc(v.titulo)}</h4>
        <p>${esc(v.texto)}</p>
      </article>`).join('') : '<p style="font-size:12.5px;color:var(--muted)">No hay avisos nuevos.</p>';
  }

  function pintarAgenda() {
    const hoy = new Date().toISOString().slice(0, 10);
    const proximos = Store.eventos().filter(e => e.fecha >= hoy).slice(0, 5);
    $('#agenda-box').innerHTML = proximos.length ? proximos.map(e => {
      const d = new Date(e.fecha + 'T12:00');
      return `
      <div class="next-item">
        <div class="when"><b>${d.getDate()}</b><span>${MESES[d.getMonth()]}</span></div>
        <div><h4>${esc(e.titulo)}</h4><p>${e.hora} · ${esc(e.lugar)}</p></div>
      </div>`;
    }).join('') : '<p style="font-size:12.5px;color:var(--muted)">Sin fechas próximas.</p>';
  }

  function pintarFicha() {
    const a = estado.activa;
    $('#d-telefono').value = a.telefono;
    $('#d-email').value = a.email || '';
    $('#d-talla').value = a.talla || '';
    $('#d-emergencia').value = a.emergencia || '';
    $('#d-medico').value = a.medico || '';
  }

  function guardarFicha() {
    const telefono = $('#d-telefono').value.replace(/\D/g, '');
    if (telefono.length < 8) return toast('Revisa el número de WhatsApp.', 'err');
    Store.actualizar(estado.activa.id, {
      telefono,
      email: $('#d-email').value.trim(),
      talla: $('#d-talla').value,
      emergencia: $('#d-emergencia').value.trim(),
      medico: $('#d-medico').value.trim()
    });
    estado.hijas = Store.hijasDe(telefono.slice(-9));
    estado.activa = estado.hijas.find(h => h.id === estado.activa.id) || estado.hijas[0];
    Store.sesionApoderado.abrir(telefono);
    estado.telefono = telefono.slice(-9);
    toast('Datos actualizados. El club ya los ve en la ficha.');
    pintarTodo();
  }

  /* ======================= Pago simulado ======================= */

  function abrirPago(cargos) {
    const F = window.DE.Finanzas;
    const total = cargos.reduce((s, c) => s + c.monto, 0);
    $('#sheet').innerHTML = `
      <span class="grip"></span>
      <h3>Pagar</h3>
      <p style="font-size:13px;color:var(--muted)">${cargos.length === 1 ? esc(cargos[0].concepto) : `${cargos.length} cargos`}${estado.hijas.length > 1 ? ' de toda la familia' : ` de ${esc(estado.activa.nombre)}`}</p>
      <div class="total"><span>Total</span><b>${CLP(total)}</b></div>
      <div class="field">
        <span>Forma de pago</span>
        <select id="medio">
          <option value="Webpay">Webpay · débito o crédito</option>
          <option value="Transferencia">Transferencia bancaria</option>
        </select>
      </div>
      <button class="btn btn-gold btn-block btn-lg" id="confirmar-pago">Confirmar pago</button>
      <button class="btn btn-ghost btn-block" id="cancelar-pago">Cancelar</button>
      <p style="font-size:11px;color:var(--muted-2);text-align:center">
        Prototipo: el cobro es simulado. En producción se conecta a Transbank, Flow o Mercado Pago.
      </p>`;
    $('#sheet').classList.add('open');
    $('#sheet-veil').classList.add('open');
    document.body.style.overflow = 'hidden';

    $('#cancelar-pago').addEventListener('click', cerrarPago);
    $('#confirmar-pago').addEventListener('click', () => {
      const comp = F.aplicarPago(cargos.map(c => c.id), { medio: $('#medio').value, origen: 'portal' });
      cerrarPago();
      toast(comp ? `¡Pago registrado! Comprobante N° ${comp.folio}. El club ya lo ve en su panel.` : 'Esos cargos ya estaban pagados.');
      pintarPago();
    });
  }

  function cerrarPago() {
    $('#sheet').classList.remove('open');
    $('#sheet-veil').classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ======================= Arranque ======================= */

  document.addEventListener('DOMContentLoaded', () => {
    /* En producción el piloto corre cada mañana en el servidor; aquí se
       simula al abrir cualquiera de las dos aplicaciones */
    window.DE.Finanzas.correrPiloto();
    const guardada = Store.sesionApoderado.actual();
    if (new URLSearchParams(location.search).has('demo')) entrar(familiaDemo());
    else if (guardada && Store.hijasDe(guardada).length) entrar(guardada);

    $('#entrar').addEventListener('click', () => entrar($('#tel').value));
    $('#tel').addEventListener('keydown', e => { if (e.key === 'Enter') entrar($('#tel').value); });
    $('#demo').addEventListener('click', () => {
      const tel = familiaDemo();
      $('#tel').value = tel;
      entrar(tel);
    });
    $('#salir').addEventListener('click', salir);
    $('#guardar-ficha').addEventListener('click', guardarFicha);
    $('#sheet-veil').addEventListener('click', cerrarPago);
    window.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarPago(); });

    $('#wa-club').href = `https://wa.me/${CLUB.whatsapp}?text=${encodeURIComponent('Hola, soy apoderada del club y tengo una consulta.')}`;
  });
})();
