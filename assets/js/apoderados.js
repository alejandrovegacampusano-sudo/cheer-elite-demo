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
    pintarAsistencia();
    pintarCalendario();
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
    const cercanos = fam ? fam.impagos.filter(c => c.estado === 'vencido' || F.diasEntre(hoy, c.vence) <= 31) : [];
    /* Lo que ya tiene una transferencia avisada no se vuelve a cobrar */
    const enRevision = cercanos.filter(c => F.transferenciaDe(c.id));
    const aPagar = cercanos.filter(c => !F.transferenciaDe(c.id));
    const total = aPagar.reduce((s, c) => s + c.monto, 0);
    const vencido = aPagar.filter(c => c.estado === 'vencido').reduce((s, c) => s + c.monto, 0);
    const espera = enRevision.reduce((s, c) => s + c.monto, 0);

    $('#pago-estado').innerHTML = !cercanos.length ? '<span class="tag ok">Al día</span>'
      : !aPagar.length ? '<span class="tag info">En revisión</span>'
      : vencido ? '<span class="tag alert">Con saldo vencido</span>' : '<span class="tag warn">Por pagar</span>';

    const a = estado.activa;
    const meses = Store.meses(6).slice().reverse();
    const comps = F.comprobantes().filter(c => c.familia === estado.telefono && !c.anulado).slice(0, 4);

    $('#pago-box').innerHTML = `
      <div class="money-row">
        <div class="amount">${CLP(total)}<small>${aPagar.length ? `${aPagar.length === 1 ? '1 cargo' : `${aPagar.length} cargos`}${estado.hijas.length > 1 ? ' de toda la familia' : ''}` : 'Nada por pagar'}</small></div>
        ${aPagar.length ? '<button class="btn btn-gold" id="pagar">Pagar <span class="ico">→</span></button>' : '<span class="tag ok">Todo pagado</span>'}
      </div>
      ${enRevision.length ? `<div class="en-revision">
        <b>${CLP(espera)} en revisión</b>
        <span>Avisaste tu transferencia y el club la está revisando. No te llegarán recordatorios por ${enRevision.length === 1 ? 'este cargo' : 'estos cargos'}.</span>
        <ul>${enRevision.map(c => `<li>${esc(c.concepto)}${estado.hijas.length > 1 ? ` · ${esc(c.atleta.nombre.split(' ')[0])}` : ''}</li>`).join('')}</ul>
      </div>` : ''}
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

  /* ======================= Calendario ======================= */

  const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const pad2 = n => String(n).padStart(2, '0');
  const fISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  /* Lunes de la semana de una fecha */
  const lunesDe = d => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(12, 0, 0, 0); return x; };

  const cal = { modo: 'semana', ancla: new Date() };

  /* Qué le pasa a ESTA deportista un día: su entrenamiento, los eventos del
     club y el vencimiento de su mensualidad. */
  function marcasDelDia(fechaISO) {
    const a = estado.activa;
    const marcas = [];
    const { dias, hora } = Store.horarioDe(a.equipo);
    const d = new Date(fechaISO + 'T12:00');
    const eq = equipoPorId(a.equipo) || {};
    if (dias.includes(d.getDay()) && fechaISO >= a.ingreso && a.estado === 'activa') {
      marcas.push({ tipo: 'entreno', titulo: `Entrenamiento ${eq.nombre || ''}`.trim(), hora, lugar: 'Gimnasio' });
    }
    Store.eventos().filter(e => e.fecha === fechaISO).forEach(e =>
      marcas.push({ tipo: e.tipo === 'pago' ? 'pago' : e.tipo === 'competencia' ? 'competencia' : 'club', titulo: e.titulo, hora: e.hora, lugar: e.lugar }));

    const diaVence = window.DE.Finanzas.piloto().diaVence;
    if (d.getDate() === diaVence) {
      const pago = Store.pagoDe(a.id, fechaISO.slice(0, 7));
      if (pago && pago.estado !== 'pagado') marcas.push({ tipo: 'pago', titulo: 'Vence la mensualidad', hora: '', lugar: '' });
    }
    return marcas;
  }

  function pintarCalendario() {
    const hoy = fISO(new Date());
    $$('.chip-cal').forEach(b => b.classList.toggle('on', b.dataset.modo === cal.modo));

    if (cal.modo === 'semana') {
      const lunes = lunesDe(cal.ancla);
      const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d; });
      const fin = dias[6];
      $('#cal-rotulo').textContent = lunes.getMonth() === fin.getMonth()
        ? `${lunes.getDate()} al ${fin.getDate()} de ${MESES_LARGO[lunes.getMonth()]}`
        : `${lunes.getDate()} ${MESES[lunes.getMonth()]} al ${fin.getDate()} ${MESES[fin.getMonth()]}`;

      $('#cal-box').innerHTML = `<div class="cal-semana">${dias.map(d => {
        const f = fISO(d);
        const marcas = marcasDelDia(f);
        return `<div class="cal-dia${f === hoy ? ' hoy' : ''}${marcas.length ? '' : ' libre'}">
          <span class="cal-dow">${DOW[(d.getDay() + 6) % 7]} ${d.getDate()}</span>
          ${marcas.length ? marcas.map(m => `<div class="cal-marca p-${m.tipo}"><b>${esc(m.titulo)}</b>${m.hora ? `<span>${m.hora}${m.lugar ? ` · ${esc(m.lugar)}` : ''}</span>` : ''}</div>`).join('')
            : '<span class="cal-nada">Libre</span>'}
        </div>`;
      }).join('')}</div>`;
    } else {
      const primero = new Date(cal.ancla.getFullYear(), cal.ancla.getMonth(), 1);
      $('#cal-rotulo').textContent = `${MESES_LARGO[primero.getMonth()]} ${primero.getFullYear()}`;
      const inicio = lunesDe(primero);
      const celdas = Array.from({ length: 42 }, (_, i) => { const d = new Date(inicio); d.setDate(inicio.getDate() + i); return d; });
      const ultima = celdas.findIndex((d, i) => i >= 27 && d.getMonth() !== primero.getMonth() && (i + 1) % 7 === 0);

      $('#cal-box').innerHTML = `<div class="cal-mes">
        ${DOW.map(n => `<span class="cal-dow-mes">${n}</span>`).join('')}
        ${celdas.slice(0, ultima > 0 ? ultima + 1 : 42).map(d => {
          const f = fISO(d);
          const marcas = marcasDelDia(f);
          const fuera = d.getMonth() !== primero.getMonth();
          return `<div class="cal-celda${fuera ? ' fuera' : ''}${f === hoy ? ' hoy' : ''}" ${marcas.length ? `title="${esc(marcas.map(m => m.titulo).join(' · '))}"` : ''}>
            <b>${d.getDate()}</b>
            <span class="puntos">${marcas.slice(0, 3).map(m => `<i class="p-${m.tipo}"></i>`).join('')}</span>
          </div>`;
        }).join('')}
      </div>`;
    }
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

  /* ======================= Pago paso a paso ======================= */

  const pago = { cargos: [], total: 0, archivo: null, nombreArchivo: '' };

  function abrirPago(cargos) {
    pago.cargos = cargos;
    pago.total = cargos.reduce((s, c) => s + c.monto, 0);
    pago.archivo = null;
    pago.nombreArchivo = '';
    $('#sheet').classList.add('open');
    $('#sheet-veil').classList.add('open');
    document.body.style.overflow = 'hidden';
    pasoMetodo();
  }

  const cabecera = (titulo, bajada) => `
    <span class="grip"></span>
    <h3>${titulo}</h3>
    <p class="sheet-sub">${bajada}</p>
    <div class="total"><span>Total a pagar</span><b>${CLP(pago.total)}</b></div>`;

  function pasoMetodo() {
    const detalle = pago.cargos.length === 1 ? esc(pago.cargos[0].concepto)
      : `${pago.cargos.length} cargos${estado.hijas.length > 1 ? ' de toda la familia' : ''}`;
    $('#sheet').innerHTML = `
      ${cabecera('¿Cómo quieres pagar?', detalle)}
      <div class="metodos">
        <button class="metodo" data-metodo="tarjeta">
          <span class="metodo-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></svg></span>
          <span><b>Tarjeta de débito o crédito</b><small>Webpay · el pago queda confirmado al instante</small></span>
          <span class="metodo-ir" aria-hidden="true">→</span>
        </button>
        <button class="metodo" data-metodo="transferencia">
          <span class="metodo-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16l-3-3M20 15H4l3 3"/></svg></span>
          <span><b>Transferencia bancaria</b><small>Sin costo para el club · subes tu comprobante</small></span>
          <span class="metodo-ir" aria-hidden="true">→</span>
        </button>
      </div>
      <button class="btn btn-ghost btn-block" data-cancelar>Cancelar</button>`;
    $$('#sheet [data-metodo]').forEach(b => b.addEventListener('click', () =>
      b.dataset.metodo === 'tarjeta' ? pasoTarjeta() : pasoTransferencia()));
    $('#sheet [data-cancelar]').addEventListener('click', cerrarPago);
  }

  /* --- Tarjeta (simulada) --- */

  function pasoTarjeta() {
    $('#sheet').innerHTML = `
      ${cabecera('Pagar con tarjeta', 'Webpay · Transbank')}
      <div class="form-pago">
        <label class="field full"><span>Número de la tarjeta</span><input id="t-num" inputmode="numeric" autocomplete="cc-number" placeholder="4051 8856 0000 0000" maxlength="19"></label>
        <label class="field"><span>Vence</span><input id="t-exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5"></label>
        <label class="field"><span>CVV</span><input id="t-cvv" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4"></label>
        <label class="field full"><span>Nombre del titular</span><input id="t-nom" autocomplete="cc-name" placeholder="Como aparece en la tarjeta"></label>
      </div>
      <p class="aviso-demo">Demo: no se cobra nada y no se guardan datos de tarjetas. Puedes escribir cualquier número, o usar <button class="link" id="t-rellenar">una tarjeta de prueba</button>.</p>
      <button class="btn btn-gold btn-block btn-lg" id="t-pagar">Pagar ${CLP(pago.total)}</button>
      <button class="btn btn-ghost btn-block" data-volver>← Otra forma de pago</button>`;

    $('#t-num').addEventListener('input', e => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    });
    $('#t-exp').addEventListener('input', e => {
      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
      e.target.value = v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v;
    });
    $('#t-cvv').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
    /* Al corregir un campo se le quita la marca de error */
    $$('#sheet .form-pago input').forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('invalid')));
    $('#t-rellenar').addEventListener('click', () => {
      $('#t-num').value = '4051 8856 0000 0000';
      $('#t-exp').value = '12/29';
      $('#t-cvv').value = '123';
      $('#t-nom').value = estado.activa.apoderado;
      $$('#sheet .form-pago .field').forEach(f => f.classList.remove('invalid'));
    });
    $('#sheet [data-volver]').addEventListener('click', pasoMetodo);
    $('#t-pagar').addEventListener('click', () => {
      const num = $('#t-num').value.replace(/\D/g, '');
      const marcar = (sel, mal) => $(sel).closest('.field').classList.toggle('invalid', mal);
      marcar('#t-num', num.length < 15);
      marcar('#t-exp', !/^\d{2}\/\d{2}$/.test($('#t-exp').value));
      marcar('#t-cvv', $('#t-cvv').value.length < 3);
      marcar('#t-nom', $('#t-nom').value.trim().length < 5);
      if (num.length < 15 || !/^\d{2}\/\d{2}$/.test($('#t-exp').value) || $('#t-cvv').value.length < 3 || $('#t-nom').value.trim().length < 5) {
        toast('Revisa los datos de la tarjeta.', 'err');
        return;
      }
      pasoProcesando(num.slice(-4));
    });
  }

  function pasoProcesando(ultimos) {
    $('#sheet').innerHTML = `
      <span class="grip"></span>
      <div class="procesando">
        <span class="spinner" aria-hidden="true"></span>
        <h3>Procesando el pago…</h3>
        <p class="sheet-sub">Estamos confirmando con el banco. No cierres esta ventana.</p>
      </div>`;
    setTimeout(() => {
      const F = window.DE.Finanzas;
      const comp = F.aplicarPago(pago.cargos.map(c => c.id), { medio: 'Webpay', origen: 'portal', referencia: `Tarjeta terminada en ${ultimos}` });
      pasoListo(comp, `Tarjeta terminada en ${ultimos}`);
    }, 1800);
  }

  function pasoListo(comp, detalle) {
    $('#sheet').innerHTML = `
      <span class="grip"></span>
      <div class="pago-ok">
        <span class="tic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></span>
        <h3>¡Pago listo!</h3>
        <p class="sheet-sub">${CLP(pago.total)} · ${esc(detalle)}</p>
        ${comp ? `<p class="folio-ok">Comprobante N° ${comp.folio}</p>` : ''}
        <p class="sheet-sub">El club ya lo ve en su panel.</p>
      </div>
      ${comp ? '<button class="btn btn-ghost btn-block" id="ver-comp">Ver comprobante</button>' : ''}
      <button class="btn btn-gold btn-block btn-lg" data-cerrar-ok>Listo</button>`;
    $('#sheet [data-cerrar-ok]').addEventListener('click', () => { cerrarPago(); pintarPago(); });
    $('#ver-comp')?.addEventListener('click', () => window.DE.Finanzas.imprimirComprobante(comp));
  }

  /* --- Transferencia --- */

  function pasoTransferencia() {
    const b = CLUB.banco;
    /* Se muestra con formato, pero se copia el dato limpio para pegarlo en el banco */
    const copiable = (etiqueta, valor, copia = valor) => `
      <div class="dato-banco">
        <span>${etiqueta}</span>
        <b>${esc(valor)}</b>
        <button class="copiar" data-copiar="${esc(copia)}" aria-label="Copiar ${etiqueta}">Copiar</button>
      </div>`;
    $('#sheet').innerHTML = `
      ${cabecera('Transferencia bancaria', 'Transfiere y sube tu comprobante')}
      <div class="datos-banco">
        ${copiable('Banco', b.banco)}
        ${copiable('Tipo de cuenta', b.tipo)}
        ${copiable('N° de cuenta', b.numero)}
        ${copiable('RUT', b.rut)}
        ${copiable('Titular', b.titular)}
        ${copiable('Correo', b.email)}
        ${copiable('Monto', CLP(pago.total), String(pago.total))}
      </div>
      <button class="btn btn-ghost btn-block btn-sm" id="copiar-todo">Copiar todos los datos</button>
      <label class="subir-comp">
        <input type="file" id="comp-archivo" accept="image/*,application/pdf">
        <span id="comp-texto"><b>Subir mi comprobante</b><small>Foto o PDF de la transferencia</small></span>
      </label>
      <div id="comp-vista"></div>
      <button class="btn btn-gold btn-block btn-lg" id="enviar-comp">Ya transferí, avisar al club</button>
      <button class="btn btn-ghost btn-block" data-volver>← Otra forma de pago</button>`;

    $$('#sheet [data-copiar]').forEach(b2 => b2.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b2.dataset.copiar); b2.textContent = 'Copiado'; setTimeout(() => { b2.textContent = 'Copiar'; }, 1600); }
      catch { toast('Copia el dato a mano: el navegador no lo permitió.', 'err'); }
    }));
    $('#copiar-todo').addEventListener('click', async () => {
      const txt = `${b.titular}\nRUT ${b.rut}\n${b.banco} · ${b.tipo}\nN° ${b.numero}\n${b.email}\nMonto: ${CLP(pago.total)}`;
      try { await navigator.clipboard.writeText(txt); toast('Datos copiados.'); }
      catch { toast('Copia los datos a mano: el navegador no lo permitió.', 'err'); }
    });
    $('#sheet [data-volver]').addEventListener('click', pasoMetodo);
    $('#comp-archivo').addEventListener('change', e => leerComprobante(e.target.files[0]));
    $('#enviar-comp').addEventListener('click', enviarTransferencia);
  }

  /* La foto se achica antes de guardarla: una del celular pesa varios MB y no
     cabe en el navegador. Un PDF se guarda solo por su nombre. */
  function leerComprobante(file) {
    if (!file) return;
    pago.nombreArchivo = file.name;
    const vista = $('#comp-vista');
    $('#comp-texto').innerHTML = `<b>${esc(file.name)}</b><small>Toca para cambiarlo</small>`;

    if (file.type === 'application/pdf') {
      pago.archivo = null;
      vista.innerHTML = '<p class="comp-pdf">PDF adjunto. El club lo verá al revisar tu pago.</p>';
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        pago.archivo = c.toDataURL('image/jpeg', 0.62);
        vista.innerHTML = `<img class="comp-vista" src="${pago.archivo}" alt="Comprobante de transferencia que subiste">`;
      };
      img.onerror = () => { pago.archivo = null; vista.innerHTML = '<p class="comp-pdf">No pude leer la imagen, pero igual puedes avisar al club.</p>'; };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  }

  function enviarTransferencia() {
    const F = window.DE.Finanzas;
    if (!pago.nombreArchivo && !confirm('No subiste el comprobante. ¿Avisar igual? El club tendrá que buscar la transferencia a mano.')) return;
    F.avisarTransferencia({
      familia: estado.telefono,
      cargos: pago.cargos.map(c => c.id),
      monto: pago.total,
      archivo: pago.archivo,
      nombreArchivo: pago.nombreArchivo,
      referencia: `Comprobante de ${estado.activa.apoderado}`
    });
    $('#sheet').innerHTML = `
      <span class="grip"></span>
      <div class="pago-ok">
        <span class="tic espera" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
        <h3>Aviso enviado</h3>
        <p class="sheet-sub">${CLP(pago.total)} por transferencia${pago.nombreArchivo ? `, con tu comprobante adjunto` : ''}.</p>
        <p class="sheet-sub">El club lo revisa y tu cuenta queda al día. Mientras tanto verás <b>«en revisión»</b> y no te llegarán recordatorios por estos cargos.</p>
      </div>
      <button class="btn btn-gold btn-block btn-lg" data-cerrar-ok>Listo</button>`;
    $('#sheet [data-cerrar-ok]').addEventListener('click', () => { cerrarPago(); pintarPago(); });
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
    /* En la demo se mantiene la misma familia entre visitas: si no, tras pagar
       entraría otra con deuda y parecería que el pago no quedó. */
    if (guardada && Store.hijasDe(guardada).length) entrar(guardada);
    else if (new URLSearchParams(location.search).has('demo')) entrar(familiaDemo());

    $('#entrar').addEventListener('click', () => entrar($('#tel').value));
    $('#tel').addEventListener('keydown', e => { if (e.key === 'Enter') entrar($('#tel').value); });
    $('#demo').addEventListener('click', () => {
      const tel = familiaDemo();
      $('#tel').value = tel;
      entrar(tel);
    });
    $('#salir').addEventListener('click', salir);
    $('#guardar-ficha').addEventListener('click', guardarFicha);
    $$('.chip-cal').forEach(b => b.addEventListener('click', () => { cal.modo = b.dataset.modo; pintarCalendario(); }));
    $$('[data-mover]').forEach(b => b.addEventListener('click', () => {
      const n = Number(b.dataset.mover);
      cal.ancla = cal.modo === 'semana'
        ? new Date(cal.ancla.getFullYear(), cal.ancla.getMonth(), cal.ancla.getDate() + n * 7)
        : new Date(cal.ancla.getFullYear(), cal.ancla.getMonth() + n, 1);
      pintarCalendario();
    }));
    $('#cal-hoy').addEventListener('click', () => { cal.ancla = new Date(); pintarCalendario(); });
    $('#sheet-veil').addEventListener('click', cerrarPago);
    window.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarPago(); });

    $('#wa-club').href = `https://wa.me/${CLUB.whatsapp}?text=${encodeURIComponent('Hola, soy apoderada del club y tengo una consulta.')}`;
  });
})();
