/* ==========================================================================
   Dragones Elite — Panel del club
   ========================================================================== */

(function () {
  const {
    CLUB, CATEGORIAS, CLP, NUM, Store,
    todosLosEquipos, equipoPorId, categoriaPorId, edadDesde
  } = window.DE;
  const { toast } = window.DEUI;

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const iniciales = n => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  /* El club es mixto: los estados concuerdan con cada deportista */
  const conGenero = (a, fem, masc) => (a.genero === 'm' ? masc : fem);
  const esc = t => { const d = document.createElement('div'); d.textContent = t ?? ''; return d.innerHTML; };
  const mesLindo = clave => {
    const [a, m] = clave.split('-');
    return `${MESES[Number(m) - 1]} ${a}`;
  };
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const compacto = v => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`;

  const ui = {
    vista: 'hoy',
    equipo: 'todos',
    estado: 'todas',
    busqueda: '',
    orden: { campo: 'nombre', asc: true },
    pagina: 1,
    porPagina: 20,
    mesPago: Store.mesActual(),
    seleccion: new Set(),
    filtroPago: 'todas',
    asisEquipo: todosLosEquipos()[0].id,
    asisFecha: hoyISO(),
    calMes: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  };

  const TITULOS = {
    resumen:     ['Resumen', 'Estado general de la temporada'],
    deportistas: ['Deportistas', 'Fichas, equipos y estado de pago'],
    equipos:     ['Equipos', 'Ocupación, cobranza y cuerpo técnico'],
    pagos:       ['Mensualidades', 'Mensualidades por deportista y mes'],
    asistencia:  ['Asistencia', 'Pasar lista por equipo y fecha'],
    calendario:  ['Calendario', 'Competencias, entrenamientos y cierres'],
    avisos:      ['Avisos', 'Lo que las familias ven en su portal'],
    ajustes:     ['Ajustes', 'Configuración del club y datos del prototipo']
  };

  /* Las vistas de Finanzas viven en panel-finanzas.js y se registran aquí */
  const FIN = window.DE.VistasFinanzas || {};
  Object.entries(FIN.vistas || {}).forEach(([id, v]) => { TITULOS[id] = [v.titulo, v.sub]; });

  /* ======================= Acceso ======================= */

  function entrar() {
    Store.sesion.abrir();
    FIN.alEntrar?.();
    $('#gate').hidden = true;
    $('#app').hidden = false;
    pintarTodo();
  }

  function salir() {
    Store.sesion.cerrar();
    $('#app').hidden = true;
    $('#gate').hidden = false;
    window.scrollTo({ top: 0 });
  }

  /* ======================= Navegación ======================= */

  function irA(vista) {
    ui.vista = vista;
    $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === vista));
    $$('.side-link').forEach(l => l.classList.toggle('active', l.dataset.view === vista));
    const [titulo, sub] = TITULOS[vista];
    $('#view-title').textContent = titulo;
    $('#view-sub').textContent = sub;
    $('#side').classList.remove('open');
    pintarVista(vista);
    $('.app-body').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pintarVista(vista) {
    ({
      resumen: pintarResumen,
      deportistas: pintarDeportistas,
      equipos: pintarEquipos,
      pagos: pintarPagos,
      asistencia: pintarAsistencia,
      calendario: pintarCalendario,
      avisos: pintarAvisos,
      ajustes: pintarAjustes,
      ...Object.fromEntries(Object.entries(FIN.vistas || {}).map(([id, v]) => [id, v.pintar]))
    })[vista]?.();
    FIN.badges?.();
  }

  /* ======================= Resumen ======================= */

  function pintarResumen() {
    const r = Store.resumen();

    $('#kpis').innerHTML = `
      <article class="kpi gold">
        <span>Deportistas en actividad</span>
        <strong class="num">${r.activas}</strong>
        <small>${r.pausas} en pausa · ${r.total} fichas totales</small>
      </article>
      <article class="kpi">
        <span>Recaudado del mes</span>
        <strong class="num">${CLP(r.recaudado)}</strong>
        <small>de ${CLP(r.proyectado)} proyectados</small>
        <span class="trend ${r.cobranza >= .7 ? 'up' : 'down'}">${Math.round(r.cobranza * 100)}%</span>
      </article>
      <article class="kpi">
        <span>Pagos al día</span>
        <strong class="num">${r.alDia}</strong>
        <small>${r.pendientes} pendientes · ${r.morosas} vencidas</small>
      </article>
      <article class="kpi">
        <span>Ocupación de cupos</span>
        <strong class="num">${Math.round(r.ocupacion.pct * 100)}%</strong>
        <small>${r.ocupacion.ocupados} de ${r.ocupacion.total} cupos</small>
      </article>
      <article class="kpi">
        <span>Nuevas este mes</span>
        <strong class="num">${r.nuevasMes}</strong>
        <small>inscripciones registradas</small>
      </article>`;

    $('#badge-pagos').hidden = r.morosas === 0;
    $('#badge-pagos').textContent = r.morosas;
    $('#pill-mes').textContent = mesLindo(Store.mesActual());

    graficoIngresos();
    bulletCobranza(r);
    donutOcupacion(r.ocupacion);

    const recientes = [...Store.deportistas()]
      .sort((a, b) => b.ingreso.localeCompare(a.ingreso))
      .slice(0, 6);
    $('#tabla-recientes').innerHTML = `
      <tbody>${recientes.map(a => filaResumen(a)).join('')}</tbody>`;
    $$('#tabla-recientes tr').forEach(tr => tr.addEventListener('click', () => abrirFicha(tr.dataset.id)));

    const proximos = Store.eventos().filter(e => e.fecha >= hoyISO()).slice(0, 5);
    $('#agenda').innerHTML = proximos.length
      ? proximos.map(evItem).join('')
      : '<p class="empty">Sin eventos próximos.</p>';
  }

  function filaResumen(a) {
    const eq = equipoPorId(a.equipo) || {};
    const pago = Store.pagoDe(a.id, Store.mesActual());
    return `
      <tr data-id="${a.id}">
        <td>
          <div class="cell-person">
            <span class="avatar-sm">${iniciales(a.nombre)}</span>
            <span><b>${esc(a.nombre)}</b><span>${eq.nombre || '—'}</span></span>
          </div>
        </td>
        <td style="color:var(--muted-2);font-size:12px">${new Date(a.ingreso + 'T12:00').toLocaleDateString('es-CL')}</td>
        <td style="text-align:right">${etiquetaPago(pago)}</td>
      </tr>`;
  }

  function etiquetaPago(pago) {
    if (!pago) return '<span class="tag mute">Sin registro</span>';
    if (pago.estado === 'pagado') return '<span class="tag ok">Al día</span>';
    if (pago.estado === 'pendiente') return '<span class="tag warn">Pendiente</span>';
    return '<span class="tag alert">Vencida</span>';
  }

  function evItem(e) {
    const d = new Date(e.fecha + 'T12:00');
    return `
      <div class="ev-item">
        <div class="ev-date"><b>${d.getDate()}</b><span>${MESES[d.getMonth()]}</span></div>
        <div><h4>${esc(e.titulo)}</h4><p>${e.hora} · ${esc(e.lugar)}</p></div>
        <span class="tag ${e.tipo === 'competencia' ? 'ok' : e.tipo === 'pago' ? 'warn' : 'mute'}">${e.tipo}</span>
      </div>`;
  }

  /* --- Gráficos ------------------------------------------------------------- */

  function graficoIngresos() {
    const serie = Store.serieIngresos(6);
    const max = Math.max(...serie.map(s => s.total), 1) * 1.15;
    const W = 640, H = 200, pad = { t: 16, r: 16, b: 30, l: 56 };
    const ancho = W - pad.l - pad.r;
    const alto = H - pad.t - pad.b;
    const x = i => pad.l + (serie.length === 1 ? ancho / 2 : (ancho * i) / (serie.length - 1));
    const y = v => pad.t + alto * (1 - v / max);

    const lineas = [0, .5, 1].map(p => {
      const yy = pad.t + alto * (1 - p);
      return `<line class="grid-line" x1="${pad.l}" y1="${yy}" x2="${W - pad.r}" y2="${yy}" />
              <text class="axis" x="${pad.l - 10}" y="${yy + 4}" text-anchor="end">${p ? compacto(max * p) : '0'}</text>`;
    }).join('');

    const puntos = serie.map((s, i) => `${x(i).toFixed(1)},${y(s.total).toFixed(1)}`).join(' ');
    const area = `${pad.l},${H - pad.b} ${puntos} ${W - pad.r},${H - pad.b}`;

    const marcas = serie.map((s, i) => `
      <circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(s.total).toFixed(1)}" r="4" />
      <circle class="hit" cx="${x(i).toFixed(1)}" cy="${y(s.total).toFixed(1)}" r="16" tabindex="0">
        <title>${mesLindo(s.mes)}: ${CLP(s.total)}</title>
      </circle>
      <text class="axis" x="${x(i).toFixed(1)}" y="${H - pad.b + 18}" text-anchor="middle">${mesLindo(s.mes).split(' ')[0]}</text>`).join('');

    $('#chart-ingresos').innerHTML = `
      <defs>
        <linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f5b700" stop-opacity=".28" />
          <stop offset="1" stop-color="#f5b700" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${lineas}
      <polygon class="area" points="${area}" />
      <polyline class="line" points="${puntos}" />
      ${marcas}`;

    /* Alternativa accesible: los mismos datos en texto, para quien no ve el gráfico */
    const tabla = $('#serie-texto');
    if (tabla) {
      const ultimo = serie[serie.length - 1], previo = serie[serie.length - 2];
      const delta = previo && previo.total ? Math.round((ultimo.total / previo.total - 1) * 100) : 0;
      tabla.innerHTML = serie.map(s => `<span><b>${mesLindo(s.mes).split(' ')[0]}</b> ${CLP(s.total)}</span>`).join('')
        + `<span class="resumen">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% vs. mes anterior</span>`;
    }
  }

  /* Medidor contra objetivo: la cobranza sola no dice nada, contra la meta sí */
  function bulletCobranza(r) {
    const caja = $('#bullet-cobranza');
    if (!caja) return;
    const pct = Math.round(r.cobranza * 100);
    const meta = 85;
    caja.innerHTML = `
      <div class="bullet-head"><span>Cobranza del mes</span><b>${pct}%</b></div>
      <div class="bullet-track">
        <div class="bullet-zone" style="left:0;width:60%"></div>
        <div class="bullet-zone" style="left:60%;width:25%;opacity:.6"></div>
        <div class="bullet-val" style="width:${Math.min(pct, 100)}%;background:${pct >= meta ? 'var(--ok)' : pct >= 60 ? 'var(--gold)' : 'var(--alert)'}"></div>
        <div class="bullet-target" style="left:${meta}%" title="Objetivo ${meta}%"></div>
      </div>
      <div class="bullet-legend"><span>${CLP(r.recaudado)} cobrados</span><span>Objetivo ${meta}%</span></div>`;
  }

  function donutOcupacion(oc) {
    const r = 58, c = 2 * Math.PI * r;
    const pct = Math.min(oc.pct, 1);
    $('#donut').innerHTML = `
      <defs>
        <linearGradient id="donutGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ff5a1f" /><stop offset="1" stop-color="#ffe08a" />
        </linearGradient>
      </defs>
      <g transform="translate(75 75) rotate(-90)">
        <circle class="track" r="${r}" />
        <circle class="value" r="${r}" stroke-dasharray="${(c * pct).toFixed(1)} ${c.toFixed(1)}" />
      </g>
      <text x="75" y="72" text-anchor="middle" fill="#f7f3e9" font-size="24" font-family="Manrope, sans-serif" font-weight="800">${Math.round(pct * 100)}%</text>
      <text x="75" y="92" text-anchor="middle" fill="#6d6659" font-size="10">ocupado</text>`;

    $('#donut-legend').innerHTML = `
      <div><i style="background:var(--gold)"></i>${oc.ocupados} cupos ocupados</div>
      <div><i style="background:rgba(255,255,255,.15)"></i>${oc.total - oc.ocupados} cupos libres</div>
      <div><i style="background:transparent"></i>${todosLosEquipos().length} equipos activos</div>`;
  }

  /* ======================= Deportistas ======================= */

  function listaFiltrada() {
    const mes = Store.mesActual();
    const q = ui.busqueda.toLowerCase().trim();
    let lista = Store.deportistas();

    if (ui.equipo !== 'todos') lista = lista.filter(a => a.equipo === ui.equipo);
    if (ui.estado === 'activa') lista = lista.filter(a => a.estado === 'activa');
    if (ui.estado === 'pausa') lista = lista.filter(a => a.estado === 'pausa');
    if (ui.estado === 'deuda') lista = lista.filter(a => {
      const p = Store.pagoDe(a.id, mes);
      return p && p.estado !== 'pagado';
    });
    if (q) lista = lista.filter(a => `${a.nombre} ${a.apoderado}`.toLowerCase().includes(q));

    const { campo, asc } = ui.orden;
    const valor = a => ({
      nombre: a.nombre,
      equipo: (equipoPorId(a.equipo) || {}).nombre || '',
      edad: a.nacimiento,
      ingreso: a.ingreso,
      pago: (Store.pagoDe(a.id, mes) || {}).estado || 'zz'
    })[campo];

    return lista.sort((a, b) => String(valor(a)).localeCompare(String(valor(b)), 'es', { numeric: true }) * (asc ? 1 : -1));
  }

  function pintarDeportistas() {
    if (!$('#filtro-equipo').options.length) {
      $('#filtro-equipo').innerHTML = `<option value="todos">Todos los equipos</option>` +
        todosLosEquipos().map(eq => `<option value="${eq.id}">${eq.nombre} · ${eq.categoria}</option>`).join('');
    }
    $('#filtro-equipo').value = ui.equipo;

    const lista = listaFiltrada();
    const paginas = Math.max(1, Math.ceil(lista.length / ui.porPagina));
    ui.pagina = Math.min(ui.pagina, paginas);
    const desde = (ui.pagina - 1) * ui.porPagina;
    const pagina = lista.slice(desde, desde + ui.porPagina);
    const mes = Store.mesActual();

    const flecha = campo => ui.orden.campo === campo ? `<span class="ord">${ui.orden.asc ? '▲' : '▼'}</span>` : '';
    const todasMarcadas = pagina.length && pagina.every(a => ui.seleccion.has(a.id));

    $('#tabla-deportistas').innerHTML = `
      <thead>
        <tr>
          <th class="check-cell"><input type="checkbox" id="marcar-todas" ${todasMarcadas ? 'checked' : ''} aria-label="Seleccionar la página"></th>
          <th data-sort="nombre">Deportista ${flecha('nombre')}</th>
          <th data-sort="equipo">Equipo ${flecha('equipo')}</th>
          <th data-sort="edad">Edad ${flecha('edad')}</th>
          <th>Apoderado</th>
          <th data-sort="ingreso">Ingreso ${flecha('ingreso')}</th>
          <th data-sort="pago">Pago ${mesLindo(mes)} ${flecha('pago')}</th>
        </tr>
      </thead>
      <tbody>
        ${pagina.length ? pagina.map(a => {
          const eq = equipoPorId(a.equipo) || {};
          const cat = categoriaPorId(a.categoria) || {};
          return `
          <tr data-id="${a.id}"${ui.seleccion.has(a.id) ? ' class="sel"' : ''}>
            <td class="check-cell"><input type="checkbox" data-marcar="${a.id}" ${ui.seleccion.has(a.id) ? 'checked' : ''} aria-label="Seleccionar ${esc(a.nombre)}"></td>
            <td>
              <div class="cell-person">
                <span class="avatar-sm">${iniciales(a.nombre)}</span>
                <span>
                  <b>${esc(a.nombre)}${a.estado === 'pausa' ? ' <span class="tag mute">pausa</span>' : ''}${a.beca ? ' <span class="tag info">beca</span>' : ''}</b>
                  <span>${a.id} · ${cat.nombre || ''}</span>
                </span>
              </div>
            </td>
            <td>${eq.nombre || '—'}<br><span style="font-size:11px;color:var(--muted-2)">${eq.horario || ''}</span></td>
            <td class="num">${edadDesde(a.nacimiento)} años</td>
            <td>${esc(a.apoderado)}<br><span style="font-size:11px;color:var(--muted-2)">+56 ${a.telefono}</span></td>
            <td style="font-size:12px;color:var(--muted-2)">${new Date(a.ingreso + 'T12:00').toLocaleDateString('es-CL')}</td>
            <td>${etiquetaPago(Store.pagoDe(a.id, mes))}</td>
          </tr>`;
        }).join('') : `<tr><td colspan="7"><p class="empty">Ninguna deportista coincide con el filtro.</p></td></tr>`}
      </tbody>`;

    pintarBarraSeleccion();

    $('#pager').innerHTML = `
      <span>${lista.length ? desde + 1 : 0}–${Math.min(desde + ui.porPagina, lista.length)} de ${lista.length} deportistas</span>
      <div class="row">
        <button class="page-btn" data-pag="prev" ${ui.pagina === 1 ? 'disabled' : ''}>‹</button>
        ${Array.from({ length: paginas }, (_, i) => i + 1)
          .filter(p => p === 1 || p === paginas || Math.abs(p - ui.pagina) <= 1)
          .map((p, i, arr) => (i && p - arr[i - 1] > 1 ? '<span>…</span>' : '') +
            `<button class="page-btn${p === ui.pagina ? ' active' : ''}" data-pag="${p}">${p}</button>`).join('')}
        <button class="page-btn" data-pag="next" ${ui.pagina === paginas ? 'disabled' : ''}>›</button>
      </div>`;

    $$('#tabla-deportistas tbody tr[data-id]').forEach(tr =>
      tr.addEventListener('click', e => {
        if (e.target.closest('.check-cell')) return;   /* marcar no es abrir */
        abrirFicha(tr.dataset.id);
      }));

    $$('#tabla-deportistas [data-marcar]').forEach(c => c.addEventListener('change', () => {
      if (c.checked) ui.seleccion.add(c.dataset.marcar); else ui.seleccion.delete(c.dataset.marcar);
      pintarDeportistas();
    }));

    const cabecera = $('#marcar-todas');
    if (cabecera) cabecera.addEventListener('change', () => {
      pagina.forEach(a => cabecera.checked ? ui.seleccion.add(a.id) : ui.seleccion.delete(a.id));
      pintarDeportistas();
    });

    $$('#tabla-deportistas th[data-sort]').forEach(th => th.addEventListener('click', () => {
      const campo = th.dataset.sort;
      ui.orden = { campo, asc: ui.orden.campo === campo ? !ui.orden.asc : true };
      pintarDeportistas();
    }));

    $$('#pager [data-pag]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.pag;
      ui.pagina = v === 'prev' ? ui.pagina - 1 : v === 'next' ? ui.pagina + 1 : Number(v);
      pintarDeportistas();
    }));
  }

  /* Acciones sobre varias deportistas a la vez: cobrar una por una es el
     trabajo que este panel viene a eliminar. */
  function pintarBarraSeleccion() {
    const barra = $('#bulk-bar');
    if (!barra) return;
    const n = ui.seleccion.size;
    barra.hidden = n === 0;
    if (!n) return;
    barra.innerHTML = `
      <b>${n}</b> seleccionada${n > 1 ? 's' : ''}
      <span class="grow"></span>
      <button class="btn btn-gold btn-sm" data-lote="pagar">Marcar pago de ${mesLindo(Store.mesActual())}</button>
      <button class="btn btn-solid btn-sm" data-lote="pausar">Pausar</button>
      <button class="btn btn-solid btn-sm" data-lote="activar">Reactivar</button>
      <button class="btn btn-ghost btn-sm" data-lote="limpiar">Quitar selección</button>`;

    $$('#bulk-bar [data-lote]').forEach(b => b.addEventListener('click', () => {
      const ids = [...ui.seleccion];
      const accion = b.dataset.lote;
      if (accion === 'pagar') {
        ids.forEach(id => Store.marcarPago(id, Store.mesActual(), 'pagado'));
        toast(`${ids.length} pago${ids.length > 1 ? 's' : ''} registrado${ids.length > 1 ? 's' : ''}.`);
      } else if (accion === 'pausar' || accion === 'activar') {
        const estado = accion === 'pausar' ? 'pausa' : 'activa';
        ids.forEach(id => Store.actualizar(id, { estado }));
        toast(`${ids.length} deportista${ids.length > 1 ? 's' : ''} en estado "${estado}".`);
      }
      ui.seleccion.clear();
      pintarDeportistas();
    }));
  }

  /* ======================= Ficha lateral ======================= */

  function abrirFicha(id) {
    const a = Store.deportistas().find(x => x.id === id);
    if (!a) return;
    const eq = equipoPorId(a.equipo) || {};
    const cat = categoriaPorId(a.categoria) || {};
    const meses = Store.meses(6);

    $('#drawer').innerHTML = `
      <div class="drawer-head">
        <span class="avatar-sm">${iniciales(a.nombre)}</span>
        <div><h3>${esc(a.nombre)}</h3><span>${cat.nombre} · ${eq.nombre || '—'}</span></div>
        <button class="drawer-close" id="cerrar-ficha" aria-label="Cerrar">✕</button>
      </div>
      <div class="drawer-body">
        <div class="row">
          <span class="tag ${a.estado === 'activa' ? 'ok' : 'mute'}">${a.estado === 'activa' ? conGenero(a, 'Activa', 'Activo') : 'En pausa'}</span>
          ${a.beca ? '<span class="tag info">Beca 50%</span>' : ''}
          ${a.origen === 'web' ? '<span class="tag warn">Inscripción web</span>' : ''}
        </div>

        <div>
          <h4>Ficha</h4>
          <div class="kv" style="margin-top:10px">
            <div><span>Edad</span><b>${edadDesde(a.nacimiento)} años (${new Date(a.nacimiento + 'T12:00').toLocaleDateString('es-CL')})</b></div>
            <div><span>Equipo</span><b>${eq.nombre || '—'} · ${eq.horario || ''}</b></div>
            <div><span>Coach</span><b>${eq.coach || '—'}</b></div>
            <div><span>Apoderado</span><b>${esc(a.apoderado)}</b></div>
            <div><span>WhatsApp</span><b><a href="https://wa.me/56${a.telefono}" target="_blank" rel="noopener" style="color:var(--gold)">+56 ${a.telefono}</a></b></div>
            ${a.email ? `<div><span>Correo</span><b>${esc(a.email)}</b></div>` : ''}
            <div><span>Talla</span><b>${a.talla || 'Por definir'}</b></div>
            <div><span>Médico</span><b>${esc(a.medico) || 'Sin observaciones'}</b></div>
            ${a.emergencia ? `<div><span>Emergencia</span><b>${esc(a.emergencia)}</b></div>` : ''}
            <div><span>En el club desde</span><b>${new Date(a.ingreso + 'T12:00').toLocaleDateString('es-CL')}</b></div>
          </div>
        </div>

        <div>
          <h4>Pagos recientes</h4>
          <div class="pay-history" style="margin-top:10px">
            ${meses.slice().reverse().map(m => {
              const p = Store.pagoDe(a.id, m);
              return `
              <div class="pay-item">
                <span style="width:66px;color:var(--muted-2)">${mesLindo(m)}</span>
                <b>${p ? CLP(p.monto) : '—'}${p && p.medio ? ` · ${p.medio}` : ''}</b>
                ${etiquetaPago(p)}
                ${p && p.estado !== 'pagado' ? `<button class="btn btn-ghost btn-sm" data-cobrar="${m}">Marcar pagada</button>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>

        <div>
          <h4>Acciones</h4>
          <div class="row" style="margin-top:10px">
    <button class="btn btn-solid btn-sm" data-accion="estado">${a.estado === 'activa' ? 'Pausar temporada' : 'Reactivar'}</button>
            <button class="btn btn-solid btn-sm" data-accion="beca">${a.beca ? 'Quitar beca' : 'Asignar beca 50%'}</button>
            <button class="btn btn-solid btn-sm" data-accion="equipo">Cambiar de equipo</button>
            <button class="btn btn-ghost btn-sm" data-accion="eliminar" style="color:var(--alert);border-color:rgba(255,106,77,.3)">Eliminar ficha</button>
          </div>
        </div>
      </div>`;

    $('#drawer').classList.add('open');
    $('#drawer').setAttribute('aria-hidden', 'false');
    $('#drawer-veil').classList.add('open');
    document.body.style.overflow = 'hidden';

    $('#cerrar-ficha').addEventListener('click', cerrarFicha);

    $$('#drawer [data-cobrar]').forEach(b => b.addEventListener('click', () => {
      Store.marcarPago(a.id, b.dataset.cobrar, 'pagado');
      toast(`Pago de ${mesLindo(b.dataset.cobrar)} registrado.`);
      abrirFicha(a.id);
      pintarVista(ui.vista);
    }));

    $$('#drawer [data-accion]').forEach(b => b.addEventListener('click', () => {
      const accion = b.dataset.accion;
      if (accion === 'estado') {
        Store.actualizar(a.id, { estado: a.estado === 'activa' ? 'pausa' : 'activa' });
        toast(a.estado === 'activa' ? 'Deportista en pausa.' : 'Deportista reactivada.');
        abrirFicha(a.id);
      } else if (accion === 'beca') {
        Store.actualizar(a.id, { beca: !a.beca });
        toast(a.beca ? 'Beca retirada.' : 'Beca del 50% asignada.');
        abrirFicha(a.id);
      } else if (accion === 'equipo') {
        cambiarEquipo(a);
        return;
      } else if (accion === 'eliminar') {
        if (!confirm(`¿Eliminar la ficha de ${a.nombre}? Esta acción no se puede deshacer.`)) return;
        Store.eliminar(a.id);
        toast('Ficha eliminada.');
        cerrarFicha();
      }
      pintarVista(ui.vista);
    }));
  }

  function cambiarEquipo(a) {
    const cuerpo = $('.drawer-body');
    const opciones = todosLosEquipos();
    cuerpo.insertAdjacentHTML('afterbegin', `
      <div class="panel-box" id="cambio-equipo" style="padding:16px">
        <h4 style="margin-bottom:10px">Mover a otro equipo</h4>
        <select class="input" id="nuevo-equipo">
          ${opciones.map(eq => `<option value="${eq.id}"${eq.id === a.equipo ? ' selected' : ''}>${eq.nombre} · ${eq.categoria}</option>`).join('')}
        </select>
        <div class="row" style="margin-top:12px">
          <button class="btn btn-gold btn-sm" id="guardar-equipo">Guardar</button>
          <button class="btn btn-ghost btn-sm" id="cancelar-equipo">Cancelar</button>
        </div>
      </div>`);

    $('#guardar-equipo').addEventListener('click', () => {
      const nuevo = equipoPorId($('#nuevo-equipo').value);
      Store.actualizar(a.id, { equipo: nuevo.id, categoria: nuevo.categoriaId });
      toast(`${a.nombre.split(' ')[0]} ahora entrena en ${nuevo.nombre}.`);
      abrirFicha(a.id);
      pintarVista(ui.vista);
    });
    $('#cancelar-equipo').addEventListener('click', () => $('#cambio-equipo').remove());
  }

  function cerrarFicha() {
    $('#drawer').classList.remove('open');
    $('#drawer').setAttribute('aria-hidden', 'true');
    $('#drawer-veil').classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ======================= Equipos ======================= */

  function pintarEquipos() {
    $('#grid-equipos').innerHTML = Store.porEquipo().map(eq => {
      const pct = Math.round(eq.ocupacion * 100);
      const cob = Math.round(eq.cobranza * 100);
      return `
      <article class="panel-box team-box">
        <header>
          <div><h4>${eq.nombre}</h4><span class="mini">${eq.categoria} · ${eq.horario}</span></div>
          <span class="tag ${pct >= 95 ? 'alert' : pct >= 80 ? 'warn' : 'ok'}">${pct}%</span>
        </header>
        <div>
          <div class="bar"><i style="width:${Math.min(pct, 100)}%"></i></div>
          <div class="stat-line" style="margin-top:8px"><span>${eq.activas} activas</span><span>${eq.cupos} cupos</span></div>
        </div>
        <div class="stat-line"><span>Coach</span><b style="color:var(--ink)">${eq.coach}</b></div>
        <div class="stat-line"><span>Mensualidad</span><b style="color:var(--ink)">${CLP(eq.precio)}</b></div>
        <div class="stat-line"><span>Cobranza del mes</span><b style="color:${cob >= 80 ? 'var(--ok)' : cob >= 60 ? 'var(--warn)' : 'var(--alert)'}">${cob}%</b></div>
        <div class="row" style="gap:8px">
          <button class="btn btn-gold btn-sm" data-horario="${eq.id}">Horario y aviso</button>
          <button class="btn btn-ghost btn-sm" data-equipo="${eq.id}">Ver deportistas</button>
        </div>
      </article>`;
    }).join('');

    $$('#grid-equipos [data-equipo]').forEach(b => b.addEventListener('click', () => {
      ui.equipo = b.dataset.equipo;
      ui.pagina = 1;
      irA('deportistas');
    }));
    $$('#grid-equipos [data-horario]').forEach(b => b.addEventListener('click', () => abrirHorario(b.dataset.horario)));
  }

  /* ======================= Horario del equipo y aviso ======================= */

  const DOW_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const DOW_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  /* [1,3,5] + '17:30' → 'Lun, Mié y Vie · 17:30' (el mismo formato que ya
     entiende Store.horarioDe, para que el sitio y el portal lo lean igual) */
  function textoHorario(dias, hora) {
    const orden = [1, 2, 3, 4, 5, 6, 0];
    const nombres = orden.filter(d => dias.includes(d)).map(d => DOW_CORTO[(d + 6) % 7]);
    if (!nombres.length) return hora || '';
    const lista = nombres.length === 1 ? nombres[0]
      : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
    return hora ? `${lista} · ${hora}` : lista;
  }

  function familiasDelEquipo(id) {
    const mapa = new Map();
    Store.deportistas().filter(a => a.equipo === id && a.estado === 'activa').forEach(a => {
      const k = a.telefono.replace(/\D/g, '').slice(-9);
      if (!mapa.has(k)) mapa.set(k, { telefono: a.telefono, apoderado: a.apoderado, hijos: [] });
      mapa.get(k).hijos.push(a.nombre.split(' ')[0]);
    });
    return [...mapa.values()].sort((a, b) => a.apoderado.localeCompare(b.apoderado, 'es'));
  }

  function mensajeHorario(eq) {
    return [
      `Hola, les escribe ${CLUB.corto}.`,
      '',
      `Equipo ${eq.nombre} (${eq.categoria})`,
      `Entrenamientos: ${eq.horario}`,
      `Coach: ${eq.coach}`,
      'Lugar: Gimnasio',
      '',
      'Cualquier duda, respondan por aquí. ¡Gracias!'
    ].join('\n');
  }

  function abrirHorario(id) {
    const eq = Store.porEquipo().find(e => e.id === id);
    if (!eq) return;
    const { dias, hora } = Store.horarioDe(id);
    const familias = familiasDelEquipo(id);

    $('#drawer').innerHTML = `
      <div class="drawer-head">
        <div><h3>${esc(eq.nombre)}</h3><span>${esc(eq.categoria)} · ${familias.length} familias</span></div>
        <button class="drawer-close" id="cerrar-horario" aria-label="Cerrar">✕</button>
      </div>
      <div class="drawer-body">
        <section>
          <h4>Días de entrenamiento</h4>
          <div class="dias-pick">
            ${DOW_LARGO.map((n, i) => {
              const d = (i + 1) % 7;
              return `<label class="dia-chip"><input type="checkbox" value="${d}" ${dias.includes(d) ? 'checked' : ''}><span>${DOW_CORTO[i]}</span></label>`;
            }).join('')}
          </div>
          <div class="form-grid">
            <label class="field"><span>Hora</span><input type="time" id="h-hora" value="${hora || '18:00'}"></label>
            <label class="field"><span>Coach</span><input id="h-coach" value="${esc(eq.coach)}"></label>
            <label class="field"><span>Cupos</span><input type="number" id="h-cupos" min="1" max="60" value="${eq.cupos}"></label>
          </div>
          <p class="nota" id="h-vista">Quedará como: <b>${esc(eq.horario)}</b></p>
          <button class="btn btn-gold" id="h-guardar">Guardar cambios</button>
        </section>

        <section>
          <h4>Avisar a las familias</h4>
          <p class="nota">Este mensaje se puede pegar en el grupo de WhatsApp del equipo, o enviarse a cada familia por separado.</p>
          <textarea class="input" id="h-mensaje" rows="9">${esc(mensajeHorario(eq))}</textarea>
          <div class="row" style="gap:8px">
            <button class="btn btn-gold btn-sm" id="h-copiar">Copiar para el grupo</button>
            <button class="btn btn-ghost btn-sm" id="h-ver-familias">Enviar una por una (${familias.length})</button>
          </div>
          <div id="h-familias" hidden>
            <ul class="cola" style="max-height:340px">
              ${familias.map(f => `<li>
                <span><b>${esc(f.apoderado)}</b><small>${esc(f.hijos.join(', '))}</small></span>
                <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" data-wa="${f.telefono}">Enviar</a>
              </li>`).join('') || '<li><p class="empty">Este equipo no tiene deportistas activas.</p></li>'}
            </ul>
          </div>
        </section>
      </div>`;

    $('#drawer').classList.add('open');
    $('#drawer').setAttribute('aria-hidden', 'false');
    $('#drawer-veil').classList.add('open');
    document.body.style.overflow = 'hidden';

    const leerDias = () => [...$$('#drawer .dia-chip input:checked')].map(i => Number(i.value));
    const vistaPrevia = () => {
      const txt = textoHorario(leerDias(), $('#h-hora').value);
      $('#h-vista').innerHTML = txt ? `Quedará como: <b>${esc(txt)}</b>` : 'Elige al menos un día.';
    };
    $$('#drawer .dia-chip input, #h-hora').forEach(el => el.addEventListener('change', vistaPrevia));
    $('#h-hora').addEventListener('input', vistaPrevia);

    $('#cerrar-horario').addEventListener('click', cerrarFicha);
    $('#h-guardar').addEventListener('click', () => {
      const d = leerDias();
      if (!d.length) { toast('Elige al menos un día de entrenamiento.', 'err'); return; }
      const horario = textoHorario(d, $('#h-hora').value);
      Store.actualizarEquipo(id, {
        horario,
        coach: $('#h-coach').value.trim() || eq.coach,
        cupos: Math.max(1, Number($('#h-cupos').value) || eq.cupos)
      });
      toast('Horario actualizado. Ya se ve en el sitio y en el portal de las familias.');
      abrirHorario(id);
      pintarEquipos();
    });
    $('#h-copiar').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#h-mensaje').value); toast('Mensaje copiado: pégalo en el grupo del equipo.'); }
      catch { toast('Selecciona el texto y cópialo a mano.', 'err'); }
    });
    $('#h-ver-familias').addEventListener('click', () => {
      const caja = $('#h-familias');
      caja.hidden = !caja.hidden;
      $$('#h-familias [data-wa]').forEach(a => {
        a.href = `https://wa.me/56${a.dataset.wa.replace(/\D/g, '').slice(-9)}?text=${encodeURIComponent($('#h-mensaje').value)}`;
      });
    });
  }

  /* ======================= Pagos ======================= */

  function pintarPagos() {
    const meses = Store.meses(6);
    if (!$('#filtro-mes').options.length) {
      $('#filtro-mes').innerHTML = meses.slice().reverse().map(m =>
        `<option value="${m}">${mesLindo(m)}</option>`).join('');
    }
    $('#filtro-mes').value = ui.mesPago;

    const activas = Store.deportistas().filter(a => a.estado === 'activa');
    const registros = activas.map(a => ({ a, p: Store.pagoDe(a.id, ui.mesPago) })).filter(x => x.p);

    const pagadas = registros.filter(x => x.p.estado === 'pagado');
    const pendientes = registros.filter(x => x.p.estado === 'pendiente');
    const vencidas = registros.filter(x => x.p.estado === 'vencido');
    const recaudado = pagadas.reduce((s, x) => s + x.p.monto, 0);
    const porCobrar = [...pendientes, ...vencidas].reduce((s, x) => s + x.p.monto, 0);

    $('#kpis-pagos').innerHTML = `
      <article class="kpi gold"><span>Recaudado</span><strong>${CLP(recaudado)}</strong><small>${pagadas.length} pagos de ${registros.length}</small></article>
      <article class="kpi"><span>Por cobrar</span><strong>${CLP(porCobrar)}</strong><small>${pendientes.length + vencidas.length} deportistas</small></article>
      <article class="kpi"><span>Vencidas</span><strong>${vencidas.length}</strong><small>más de un mes de atraso</small></article>
      <article class="kpi"><span>Cobranza</span><strong>${registros.length ? Math.round(pagadas.length / registros.length * 100) : 0}%</strong><small>${mesLindo(ui.mesPago)}</small></article>`;

    $('#pagos-sub').textContent = `${mesLindo(ui.mesPago)} · ${registros.length} deportistas activas`;

    const urgencia = { vencido: 0, pendiente: 1, pagado: 2 };
    const filtradas = (ui.filtroPago === 'todas' ? registros : registros.filter(x => x.p.estado === ui.filtroPago))
      .sort((x, y) => urgencia[x.p.estado] - urgencia[y.p.estado] || x.a.nombre.localeCompare(y.a.nombre, 'es'));

    $('#tabla-pagos').innerHTML = `
      <thead><tr><th>Deportista</th><th>Equipo</th><th>Monto</th><th>Medio</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        ${filtradas.length ? filtradas.map(({ a, p }) => {
          const eq = equipoPorId(a.equipo) || {};
          return `
          <tr>
            <td>
              <div class="cell-person">
                <span class="avatar-sm">${iniciales(a.nombre)}</span>
                <span><b>${esc(a.nombre)}</b><span>${esc(a.apoderado)}</span></span>
              </div>
            </td>
            <td>${eq.nombre || '—'}</td>
            <td class="num">${CLP(p.monto)}</td>
            <td style="color:var(--muted-2);font-size:12px">${p.medio || '—'}${p.fecha ? `<br>${p.fecha}` : ''}</td>
            <td>${etiquetaPago(p)}</td>
            <td style="text-align:right">
              ${p.estado === 'pagado'
                ? `<button class="btn btn-ghost btn-sm" data-revertir="${a.id}">Revertir</button>`
                : `<span class="row" style="justify-content:flex-end;flex-wrap:nowrap">
                     <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener"
                        href="https://wa.me/56${a.telefono}?text=${encodeURIComponent(`Hola ${a.apoderado.split(' ')[0]}, te recordamos la mensualidad de ${a.nombre.split(' ')[0]} (${mesLindo(ui.mesPago)}, ${CLP(p.monto)}). ¡Gracias! — ${CLUB.corto}`)}">Recordar</a>
                     <button class="btn btn-gold btn-sm" data-cobrar="${a.id}">Marcar pagada</button>
                   </span>`}
            </td>
          </tr>`;
        }).join('') : `<tr><td colspan="6"><p class="empty">Sin pagos en este filtro.</p></td></tr>`}
      </tbody>`;

    $$('#tabla-pagos [data-cobrar]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      Store.marcarPago(b.dataset.cobrar, ui.mesPago, 'pagado');
      toast('Pago registrado.');
      pintarPagos();
    }));
    $$('#tabla-pagos [data-revertir]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      Store.marcarPago(b.dataset.revertir, ui.mesPago, 'pendiente');
      toast('Pago revertido a pendiente.');
      pintarPagos();
    }));
  }

  /* ======================= Asistencia ======================= */

  function pintarAsistencia() {
    if (!$('#asis-equipo').options.length) {
      $('#asis-equipo').innerHTML = todosLosEquipos().map(eq =>
        `<option value="${eq.id}">${eq.nombre} · ${eq.categoria}</option>`).join('');
      $('#asis-fecha').value = ui.asisFecha;
    }
    $('#asis-equipo').value = ui.asisEquipo;

    const eq = equipoPorId(ui.asisEquipo);
    const lista = Store.deportistas().filter(a => a.equipo === ui.asisEquipo && a.estado === 'activa');
    const presentes = lista.filter(a => Store.asistenciaDe(a.id, ui.asisFecha)).length;

    $('#asis-sub').textContent = `${eq.nombre} · ${new Date(ui.asisFecha + 'T12:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}`;

    $('#asis-kpis').innerHTML = `
      <article class="kpi gold"><span>Presentes</span><strong>${presentes}</strong><small>de ${lista.length} deportistas</small></article>
      <article class="kpi"><span>Ausentes</span><strong>${lista.length - presentes}</strong><small>en esta clase</small></article>
      <article class="kpi"><span>Asistencia</span><strong>${lista.length ? Math.round(presentes / lista.length * 100) : 0}%</strong><small>${eq.horario}</small></article>`;

    $('#asis-lista').innerHTML = lista.length ? lista.map(a => {
      const pres = Store.asistenciaDe(a.id, ui.asisFecha);
      return `
      <div class="att-row ${pres ? 'pres' : 'aus'}" data-id="${a.id}">
        <span class="avatar-sm">${iniciales(a.nombre)}</span>
        <b>${esc(a.nombre)}</b>
        <div class="toggle-att">
          <button class="${pres ? 'on' : ''}" data-set="1">Presente</button>
          <button class="${pres ? '' : 'on'}" data-set="0">Ausente</button>
        </div>
      </div>`;
    }).join('') : '<p class="empty">Este equipo no tiene deportistas activas.</p>';

    $$('#asis-lista [data-set]').forEach(b => b.addEventListener('click', () => {
      const id = b.closest('[data-id]').dataset.id;
      Store.marcarAsistencia(id, ui.asisFecha, b.dataset.set === '1');
      pintarAsistencia();
    }));
  }

  /* ======================= Calendario ======================= */

  function pintarCalendario() {
    const base = ui.calMes;
    const año = base.getFullYear(), mes = base.getMonth();
    $('#cal-titulo').textContent = `${base.toLocaleDateString('es-CL', { month: 'long' })} ${año}`;

    const primero = new Date(año, mes, 1);
    const desplazamiento = (primero.getDay() + 6) % 7;   // lunes primero
    const dias = new Date(año, mes + 1, 0).getDate();
    const eventos = Store.eventos();
    const hoy = hoyISO();

    let celdas = DOW.map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < desplazamiento; i++) celdas += '<div class="cal-day out"></div>';

    for (let d = 1; d <= dias; d++) {
      const fecha = `${año}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const delDia = eventos.filter(e => e.fecha === fecha);
      celdas += `
        <div class="cal-day${fecha === hoy ? ' today' : ''}${delDia.length ? ' has' : ''}">
          <b>${d}</b>
          ${delDia.map(e => `<span class="cal-ev ${e.tipo}" data-ev="${e.id}" title="${esc(e.titulo)} · ${e.hora}">${esc(e.titulo)}</span>`).join('')}
        </div>`;
    }
    $('#cal').innerHTML = celdas;

    $$('#cal [data-ev]').forEach(el => el.addEventListener('click', () => {
      const ev = eventos.find(e => e.id === el.dataset.ev);
      if (confirm(`${ev.titulo}\n${ev.fecha} ${ev.hora} · ${ev.lugar}\n\n¿Eliminar este evento?`)) {
        Store.eliminarEvento(ev.id);
        toast('Evento eliminado.');
        pintarCalendario();
      }
    }));

    const proximos = eventos.filter(e => e.fecha >= hoy).slice(0, 6);
    $('#ev-proximos').innerHTML = proximos.length
      ? `<h4 style="margin-top:6px;font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted-2)">Próximos</h4>` + proximos.map(evItem).join('')
      : '';
  }

  function crearEvento() {
    const titulo = $('#ev-titulo').value.trim();
    const fecha = $('#ev-fecha').value;
    if (titulo.length < 3) return toast('Escribe un título para el evento.', 'err');
    if (!fecha) return toast('Elige una fecha.', 'err');
    Store.agregarEvento({
      titulo, fecha,
      hora: $('#ev-hora').value || '18:00',
      tipo: $('#ev-tipo').value,
      lugar: $('#ev-lugar').value.trim() || 'Gimnasio'
    });
    $('#ev-titulo').value = '';
    $('#ev-lugar').value = '';
    ui.calMes = new Date(fecha.slice(0, 4), Number(fecha.slice(5, 7)) - 1, 1);
    toast('Evento agregado al calendario.');
    pintarCalendario();
  }

  /* ======================= Avisos ======================= */

  function pintarAvisos() {
    const lista = Store.avisos();
    $('#lista-avisos').innerHTML = lista.length ? lista.map(v => `
      <div class="ev-item" style="grid-template-columns:1fr auto">
        <div>
          <h4>${esc(v.titulo)}</h4>
          <p style="margin-top:4px;color:var(--muted);font-size:12.5px">${esc(v.texto)}</p>
          <p style="margin-top:6px">${new Date(v.fecha + 'T12:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</p>
        </div>
        <button class="btn btn-ghost btn-sm" data-borrar-aviso="${v.id}" style="color:var(--alert);border-color:rgba(255,106,77,.3)">Quitar</button>
      </div>`).join('') : '<p class="empty">Todavía no hay avisos publicados.</p>';

    $$('#lista-avisos [data-borrar-aviso]').forEach(b => b.addEventListener('click', () => {
      Store.eliminarAviso(b.dataset.borrarAviso);
      toast('Aviso quitado del portal.');
      pintarAvisos();
    }));
  }

  function publicarAviso() {
    const titulo = $('#av-titulo').value.trim();
    const texto = $('#av-texto').value.trim();
    if (titulo.length < 4) return toast('Escribe un título para el aviso.', 'err');
    if (texto.length < 10) return toast('El mensaje es muy corto.', 'err');
    Store.publicarAviso({ titulo, texto, alcance: 'todos' });
    $('#av-titulo').value = '';
    $('#av-texto').value = '';
    toast('Aviso publicado en el portal de apoderados.');
    pintarAvisos();
  }

  /* ======================= Ajustes ======================= */

  function pintarAjustes() {
    $('#kv-club').innerHTML = `
      <div><span>Club</span><b>${CLUB.nombre}</b></div>
      <div><span>Ciudad</span><b>${CLUB.ciudad}, ${CLUB.region}</b></div>
      <div><span>Desde</span><b>${CLUB.fundacion} (${new Date().getFullYear() - CLUB.fundacion} años)</b></div>
      <div><span>Instagram</span><b>${CLUB.instagram}</b></div>
      <div><span>Correo</span><b>${CLUB.email}</b></div>
      <div><span>Matrícula</span><b>${CLP(CLUB.matricula)}</b></div>
      <div><span>Descuento hermanas</span><b>${Math.round(CLUB.descuentoHermanos * 100)}%</b></div>`;

    $('#kv-precios').innerHTML = CATEGORIAS.map(c => `
      <div><span>${c.nombre}</span><b>${CLP(c.precio)} · ${c.edadTxt} · ${c.equipos.length} equipo${c.equipos.length > 1 ? 's' : ''}</b></div>`).join('') +
      `<div><span>Editar</span><b style="color:var(--muted)">Los valores se configuran en <code>assets/js/data.js</code></b></div>`;
  }

  /* ======================= Exportar ======================= */

  function exportarCSV() {
    const csv = '﻿' + Store.exportarCSV();
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `dragones-elite-deportistas-${hoyISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Nómina exportada.');
  }

  /* ======================= Arranque ======================= */

  function pintarTodo() { pintarVista(ui.vista); }

  /* Para que Finanzas pueda llevar a otra vista (p. ej. "Ver las 28 familias") */
  window.DE.irA = irA;

  document.addEventListener('DOMContentLoaded', () => {
    /* Enlaces de la demo: panel.html?demo entra directo y ?vista=caja abre esa vista */
    const params = new URLSearchParams(location.search);
    if (Store.sesion.abierta() || params.has('demo')) {
      entrar();
      const vista = params.get('vista');
      if (vista && TITULOS[vista]) irA(vista);
    }

    $('#gate-in').addEventListener('click', entrar);
    $('#gate-pass').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
    $('#salir').addEventListener('click', salir);

    $$('.side-link').forEach(l => l.addEventListener('click', () => irA(l.dataset.view)));
    $$('[data-goto]').forEach(b => b.addEventListener('click', () => irA(b.dataset.goto)));
    $('#burger-app').addEventListener('click', () => $('#side').classList.toggle('open'));

    $('#buscador').addEventListener('input', e => {
      ui.busqueda = e.target.value;
      ui.pagina = 1;
      if (ui.vista !== 'deportistas') irA('deportistas'); else pintarDeportistas();
    });

    $('#filtro-equipo').addEventListener('change', e => { ui.equipo = e.target.value; ui.pagina = 1; pintarDeportistas(); });
    $$('[data-estado]').forEach(c => c.addEventListener('click', () => {
      ui.estado = c.dataset.estado;
      ui.pagina = 1;
      $$('[data-estado]').forEach(x => x.classList.toggle('active', x === c));
      pintarDeportistas();
    }));

    $('#filtro-mes').addEventListener('change', e => { ui.mesPago = e.target.value; pintarPagos(); });
    $$('[data-pago]').forEach(c => c.addEventListener('click', () => {
      ui.filtroPago = c.dataset.pago;
      $$('[data-pago]').forEach(x => x.classList.toggle('active', x === c));
      pintarPagos();
    }));

    $('#asis-equipo').addEventListener('change', e => { ui.asisEquipo = e.target.value; pintarAsistencia(); });
    $('#asis-fecha').addEventListener('change', e => { ui.asisFecha = e.target.value || hoyISO(); pintarAsistencia(); });

    $('#mes-prev').addEventListener('click', () => { ui.calMes = new Date(ui.calMes.getFullYear(), ui.calMes.getMonth() - 1, 1); pintarCalendario(); });
    $('#mes-next').addEventListener('click', () => { ui.calMes = new Date(ui.calMes.getFullYear(), ui.calMes.getMonth() + 1, 1); pintarCalendario(); });
    $('#hoy').addEventListener('click', () => { ui.calMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1); pintarCalendario(); });
    $('#ev-crear').addEventListener('click', crearEvento);
    $('#av-crear').addEventListener('click', publicarAviso);

    $('#exportar').addEventListener('click', exportarCSV);
    $('#exportar-2').addEventListener('click', exportarCSV);
    $('#reiniciar').addEventListener('click', () => {
      if (!confirm('¿Reiniciar el panel con los datos de ejemplo? Se borrarán las inscripciones hechas en este navegador.')) return;
      Store.reiniciar();
      toast('Datos de ejemplo restaurados.');
      pintarTodo();
    });

    $('#drawer-veil').addEventListener('click', cerrarFicha);
    window.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarFicha(); });
  });
})();
