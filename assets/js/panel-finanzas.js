/* ==========================================================================
   Dragones Elite — Vistas de Finanzas del panel
   --------------------------------------------------------------------------
   Hoy · Familias · Cuotas · Caja · Rendición · Piloto automático.
   El criterio de todas: el sistema hace el trabajo y la persona solo decide
   lo que un sistema no debería decidir solo.
   ========================================================================== */

(function () {
  const { CLUB, CLP, CATEGORIAS, Store, Finanzas: F, todosLosEquipos } = window.DE;
  const toast = (...a) => window.DEUI.toast(...a);

  const esc = t => String(t ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]);
  const iniciales = n => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const compacto = v => { const a = Math.abs(v); const s = v < 0 ? '−' : ''; return a >= 1e6 ? `${s}$${(a / 1e6).toFixed(1).replace('.', ',')}M` : a >= 1000 ? `${s}$${Math.round(a / 1000)}k` : `${s}$${Math.round(a)}`; };
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const mesCorto = m => F.mesLargo(m).slice(0, 3);
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const irA = v => window.DE.irA?.(v);

  const ui = {
    famFiltro: 'deuda', famBusca: '', cobroSel: null, cuotaFiltro: 'todos',
    cajaMes: F.hoy().slice(0, 7), cajaTipo: 'todos', rendMes: null, cartola: null
  };

  /* Colores de serie validados contra el fondo del panel (#121117):
     banda de luminosidad, separación para daltonismo y contraste 3:1. */
  const SERIE = { ingreso: '#c08a00', egreso: '#4f8ad4', saldo: '#6f6b7a' };

  /* ======================= Utilidades de interfaz ======================= */

  function tramoTag(f) {
    if (f.convenio) return '<span class="tag info">Convenio</span>';
    if (f.tramo === 'al-dia') return '<span class="tag ok">Al día</span>';
    const cls = f.atraso > 30 ? 'alert' : 'warn';
    return `<span class="tag ${cls}">${plural(f.atraso, 'día', 'días')}</span>`;
  }

  function estadoCargo(c) {
    if (c.estado === 'pagado') return '<span class="tag ok">Pagado</span>';
    if (c.estado === 'vencido') return `<span class="tag alert">Vencido · ${F.fechaCorta(c.vence)}</span>`;
    return `<span class="tag mute">Vence ${F.fechaCorta(c.vence)}</span>`;
  }

  function abrirCajon(html) {
    const d = $('#drawer');
    d.innerHTML = html;
    d.classList.add('open');
    d.setAttribute('aria-hidden', 'false');
    $('#drawer-veil').classList.add('open');
    document.body.style.overflow = 'hidden';
    d.querySelector('[data-cerrar]')?.addEventListener('click', cerrarCajon);
    d.querySelector('[data-cerrar]')?.focus();
  }
  function cerrarCajon() {
    $('#drawer').classList.remove('open');
    $('#drawer').setAttribute('aria-hidden', 'true');
    $('#drawer-veil').classList.remove('open');
    document.body.style.overflow = '';
  }

  /* Tooltip único para los gráficos: se muestra al pasar el mouse y
     también al llegar con teclado a una barra */
  function tooltip(svg) {
    let tip = document.getElementById('fin-tip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'fin-tip'; tip.className = 'fin-tip'; tip.setAttribute('role', 'status'); document.body.appendChild(tip); }
    const mostrar = (el, x, y) => { tip.innerHTML = el.dataset.tip; tip.style.left = `${x}px`; tip.style.top = `${y}px`; tip.classList.add('on'); };
    svg.querySelectorAll('[data-tip]').forEach(el => {
      el.addEventListener('pointermove', e => mostrar(el, e.clientX, e.clientY));
      el.addEventListener('pointerleave', () => tip.classList.remove('on'));
      el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); mostrar(el, r.left + r.width / 2, r.top); });
      el.addEventListener('blur', () => tip.classList.remove('on'));
    });
  }

  function listaFamiliasDatalist() {
    return `<datalist id="dl-familias">${F.familias().map(f => `<option value="${esc(f.apoderado)} · +56 ${f.telefono}"></option>`).join('')}</datalist>`;
  }
  const familiaDesdeTexto = t => { const m = String(t).match(/(\d{9})\s*$/); return m ? F.familia(m[1]) : null; };

  /* ============================== HOY ============================== */

  function pintarHoy() {
    const cont = $('#fin-hoy');
    const d = new Date();
    const corrida = F.ultimaCorrida();
    const bandeja = F.bandeja();
    const fams = F.familias();
    const mes = F.hoy().slice(0, 7);
    const flujoMes = F.flujo(mes);
    const deuda = fams.reduce((s, f) => s + f.deudaVencida, 0);
    const conDeuda = fams.filter(f => f.deudaVencida > 0).length;
    const mens = F.cargos().filter(c => c.tipo === 'mensualidad' && c.vence.slice(0, 7) === mes);
    const cobranza = mens.length ? Math.round(mens.filter(c => c.estado === 'pagado').length / mens.length * 100) : 0;
    const ahorro = F.ahorroDelMes();
    const h = Math.floor(ahorro.minutos / 60), m = Math.round(ahorro.minutos % 60);
    const hoyLog = F.bitacora().filter(b => b.fecha === F.hoy());
    const cola = F.recordatorios().filter(r => r.estado === 'en cola');

    cont.innerHTML = `
      <div class="hoy-top">
        <div>
          <p class="hoy-fecha">${DIAS[d.getDay()]} ${d.getDate()} de ${F.mesLargo(mes).split(' ')[0]}</p>
          <h2 class="hoy-titulo">${bandeja.length ? `${plural(bandeja.length, 'cosa necesita', 'cosas necesitan')} tu decisión.` : 'Nada pendiente. Anda a entrenar.'}</h2>
          <p class="hoy-bajada">${corrida ? `El piloto automático revisó todo hoy a las ${corrida.hora}.` : 'El piloto automático aún no corre hoy.'} Cobros, avisos, comprobantes y rendición ya están hechos.</p>
        </div>
        <button class="ahorro" id="como-calcula" aria-expanded="false" aria-controls="supuestos">
          <strong>${h ? `${h} h ${m} min` : `${m} min`}</strong>
          <span>de trabajo administrativo que no hiciste este mes</span>
          <small>¿Cómo se calcula?</small>
        </button>
      </div>
      <div class="supuestos" id="supuestos" hidden>
        <p>Cada tarea que hizo el sistema, por los minutos que toma hacerla a mano. Es una estimación: ajústala a la realidad del club.</p>
        <table class="data compact">
          <thead><tr><th>Tarea</th><th class="num">Veces</th><th class="num">Min. a mano</th><th class="num">Total</th></tr></thead>
          <tbody>${Object.entries({ cargos: 'Cargar una mensualidad', vencidos: 'Marcar una mensualidad vencida', recordatorios: 'Escribir un recordatorio de pago', conciliacion: 'Buscar una transferencia en el banco', comprobantes: 'Hacer un comprobante', gastos: 'Anotar un gasto del banco', rendicion: 'Armar la rendición mensual' })
            .map(([k, t]) => `<tr><td>${t}</td><td class="num">${ahorro.porTipo[k] || 0}</td><td class="num">${F.MINUTOS[k]}</td><td class="num">${Math.round((ahorro.porTipo[k] || 0) * F.MINUTOS[k])} min</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="kpi-grid">
        <article class="kpi gold"><span>Caja hoy</span><strong>${CLP(F.saldoCaja())}</strong><small>saldo después de gastos</small></article>
        <article class="kpi"><span>Cobrado en ${F.mesLargo(mes).split(' ')[0]}</span><strong>${CLP(flujoMes.totalIn)}</strong><small>mensualidades, cuotas y otros</small></article>
        <article class="kpi"><span>Deuda vencida</span><strong>${CLP(deuda)}</strong><small>${plural(conDeuda, 'familia', 'familias')} de ${fams.length}</small></article>
        <article class="kpi"><span>Mensualidades pagadas</span><strong>${cobranza}%</strong><small>del mes en curso</small></article>
      </div>

      <div class="cols-2">
        <div class="panel-box">
          <div class="panel-head"><div><h3>Necesita tu decisión</h3><span class="sub">Lo que un sistema no debería resolver solo</span></div></div>
          <div class="panel-in decisiones">${bandeja.length ? bandeja.map(tarjetaDecision).join('') : '<p class="empty">Nada pendiente. Todo lo demás lo resolvió el piloto.</p>'}</div>
        </div>
        <div class="panel-box">
          <div class="panel-head"><div><h3>Lo que hizo el piloto hoy</h3><span class="sub">Sin que tocaras nada</span></div><span class="grow"></span><button class="btn btn-ghost btn-sm" data-ir="piloto">Ver reglas</button></div>
          <div class="panel-in">
            ${hoyLog.length ? `<ul class="bitacora">${hoyLog.map(b => `<li><span class="b-ico b-${b.tipo}" aria-hidden="true"></span><span>${esc(b.detalle)}</span><time>${b.hora}</time></li>`).join('')}</ul>` : '<p class="empty">Hoy todavía no hubo nada que hacer.</p>'}
            ${cola.length ? `<div class="cola-aviso"><div><b>${plural(cola.length, 'recordatorio listo', 'recordatorios listos')} para WhatsApp</b><span>Con WhatsApp Business conectado salen solos. En esta versión se envían con un toque.</span></div><button class="btn btn-gold btn-sm" data-ir="piloto">Revisar cola</button></div>` : ''}
          </div>
        </div>
      </div>

      <div class="panel-box">
        <div class="panel-head"><div><h3>Próximos 14 días</h3><span class="sub">Vencimientos que el piloto ya tiene programados</span></div></div>
        <div class="panel-in">${proximos()}</div>
      </div>
      ${listaFamiliasDatalist()}`;

    $('#como-calcula').addEventListener('click', e => {
      const s = $('#supuestos'); s.hidden = !s.hidden; e.currentTarget.setAttribute('aria-expanded', String(!s.hidden));
    });
    enlazarIr(cont);
    enlazarDecisiones(cont);
  }

  function proximos() {
    const hoyS = F.hoy();
    const hasta = F.sumarDias(hoyS, 14);
    const grupos = {};
    F.cargos().filter(c => c.estado !== 'pagado' && c.vence >= hoyS && c.vence <= hasta).forEach(c => {
      const k = `${c.vence}|${c.tipo === 'cuota' ? c.concepto : 'Mensualidad'}`;
      (grupos[k] ||= { vence: c.vence, concepto: c.tipo === 'cuota' ? c.concepto : `Mensualidad ${F.mesLargo(c.vence.slice(0, 7))}`, n: 0, monto: 0 });
      grupos[k].n++; grupos[k].monto += c.monto;
    });
    const l = Object.values(grupos).sort((a, b) => a.vence.localeCompare(b.vence));
    if (!l.length) return '<p class="empty">No vence nada en las próximas dos semanas.</p>';
    return `<div class="ev-list">${l.map(g => {
      const dd = F.diasEntre(hoyS, g.vence);
      return `<div class="ev-item">
        <div class="ev-date"><b>${Number(g.vence.slice(8))}</b><span>${mesCorto(g.vence.slice(0, 7))}</span></div>
        <div><h4>${esc(g.concepto)}</h4><p>${plural(g.n, 'deportista sin pagar', 'deportistas sin pagar')} · ${CLP(g.monto)} por cobrar</p></div>
        <span class="tag mute">${dd === 0 ? 'hoy' : `en ${plural(dd, 'día', 'días')}`}</span>
      </div>`;
    }).join('')}</div>
    <p class="nota">El piloto avisa 3 días antes, al día siguiente del vencimiento y a los 10 días. Después de 30 días deja de insistir y te lo muestra aquí.</p>`;
  }

  function tarjetaDecision(it) {
    if (it.tipo === 'revisar' && it.clase === 'abono') {
      return `
      <article class="decision" data-id="${it.id}">
        <header><span class="tag warn">Transferencia sin identificar</span><strong>${CLP(it.monto)}</strong><time>${F.fechaCorta(it.fecha)}</time></header>
        <p class="glosa">${esc(it.glosa)}</p>
        <p class="motivo">${esc(it.motivo)}</p>
        <div class="acciones">
          ${it.sugerencia ? `<button class="btn btn-gold btn-sm" data-asignar="${it.id}" data-fam="${it.sugerencia.familia}">Es de ${esc(it.sugerencia.apoderado)}</button>` : ''}
          <label class="field-inline"><span class="sr-only">Asignar a una familia</span><input class="input input-sm" list="dl-familias" placeholder="Buscar apoderado…" data-buscar="${it.id}"></label>
          <button class="btn btn-ghost btn-sm" data-asignar="${it.id}">Asignar</button>
          <button class="btn btn-ghost btn-sm" data-otro="${it.id}">Es otro ingreso</button>
        </div>
      </article>`;
    }
    if (it.tipo === 'revisar') {
      return `
      <article class="decision" data-id="${it.id}">
        <header><span class="tag warn">Cargo sin clasificar</span><strong>${CLP(Math.abs(it.monto))}</strong><time>${F.fechaCorta(it.fecha)}</time></header>
        <p class="glosa">${esc(it.glosa)}</p>
        <div class="acciones">
          <select class="input input-sm" data-cat="${it.id}" aria-label="Categoría del gasto">${F.CATEGORIAS_EGRESO.map(c => `<option>${c}</option>`).join('')}</select>
          <button class="btn btn-gold btn-sm" data-gasto="${it.id}">Registrar gasto</button>
        </div>
      </article>`;
    }
    if (it.tipo === 'escalar') {
      return `
      <article class="decision">
        <header><span class="tag alert">Más de 30 días</span><strong>${CLP(it.total)}</strong></header>
        <p><b>${plural(it.familias.length, 'familia lleva', 'familias llevan')} más de un mes sin pagar.</b> El piloto ya les avisó tres veces y dejó de insistir: esto se conversa en persona o se acuerda un convenio.</p>
        <ul class="mini-lista">${it.familias.slice(0, 4).map(f => `<li><button class="link" data-familia="${f.id}">${esc(f.apoderado)}</button><span>${CLP(f.deudaVencida)} · ${f.atraso} días</span></li>`).join('')}</ul>
        <div class="acciones"><button class="btn btn-ghost btn-sm" data-ir="familias" data-filtro="60">Ver las ${it.familias.length}</button></div>
      </article>`;
    }
    if (it.tipo === 'cobro') {
      return `
      <article class="decision">
        <header><span class="tag warn">Cuota por vencer</span><strong>${esc(it.cobro.nombre)}</strong></header>
        <p>La cuota vence ${it.faltan === 0 ? 'hoy' : `en ${plural(it.faltan, 'día', 'días')}`} y a ${plural(it.sinPagar, 'deportista le falta', 'deportistas les falta')} pagarla. El piloto ya les avisó; revisa si alguien necesita otra fecha antes de confirmar el viaje o el pedido.</p>
        <div class="acciones"><button class="btn btn-ghost btn-sm" data-cobro="${it.cobro.id}">Ver quién falta</button></div>
      </article>`;
    }
    if (it.tipo === 'respaldo') {
      return `
      <article class="decision" data-id="${it.mov.id}">
        <header><span class="tag mute">Gasto sin respaldo</span><strong>${CLP(it.mov.monto)}</strong><time>${F.fechaCorta(it.mov.fecha)}</time></header>
        <p class="glosa">${esc(it.mov.detalle)}</p>
        <div class="acciones">
          <input class="input input-sm" placeholder="N° de boleta o factura" data-resp="${it.mov.id}" aria-label="Número de boleta o factura">
          <button class="btn btn-ghost btn-sm" data-guardar-resp="${it.mov.id}">Guardar</button>
        </div>
      </article>`;
    }
    return '';
  }

  function enlazarIr(root) {
    root.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.filtro) ui.famFiltro = b.dataset.filtro;
      irA(b.dataset.ir);
    }));
    root.querySelectorAll('[data-familia]').forEach(b => b.addEventListener('click', () => abrirFamilia(b.dataset.familia)));
    root.querySelectorAll('[data-cobro]').forEach(b => b.addEventListener('click', () => { ui.cobroSel = b.dataset.cobro; ui.cuotaFiltro = 'pendientes'; irA('cuotas'); }));
  }

  function enlazarDecisiones(root) {
    const repintar = () => { pintarHoy(); badges(); };
    root.querySelectorAll('[data-asignar]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.asignar;
      const fam = b.dataset.fam ? F.familia(b.dataset.fam) : familiaDesdeTexto(root.querySelector(`[data-buscar="${id}"]`)?.value || '');
      if (!fam) { toast('Elige una familia de la lista.', 'err'); return; }
      const comp = F.resolverRevision(id, 'asignar', { familia: fam.id });
      toast(comp ? `Pago aplicado a ${fam.apoderado}. Comprobante N° ${comp.folio}.` : 'Esa familia no tenía deuda: quedó como revisado.');
      repintar();
    }));
    root.querySelectorAll('[data-otro]').forEach(b => b.addEventListener('click', () => {
      F.resolverRevision(b.dataset.otro, 'ingreso', { categoria: /FERRETERIA|SPA|LTDA|EIRL/.test(root.querySelector(`[data-id="${b.dataset.otro}"] .glosa`)?.textContent || '') ? 'Auspicios' : 'Otros' });
      toast('Registrado como ingreso en la caja.'); repintar();
    }));
    root.querySelectorAll('[data-gasto]').forEach(b => b.addEventListener('click', () => {
      const cat = root.querySelector(`[data-cat="${b.dataset.gasto}"]`).value;
      F.resolverRevision(b.dataset.gasto, 'gasto', { categoria: cat });
      toast(`Gasto registrado en ${cat}.`); repintar();
    }));
    root.querySelectorAll('[data-guardar-resp]').forEach(b => b.addEventListener('click', () => {
      const v = root.querySelector(`[data-resp="${b.dataset.guardarResp}"]`).value.trim();
      if (!v) { toast('Escribe el número del documento.', 'err'); return; }
      F.actualizarMovimiento(b.dataset.guardarResp, { respaldo: v });
      toast('Respaldo guardado.'); repintar();
    }));
  }

  /* ============================ FAMILIAS ============================ */

  const FILTROS_FAM = { todas: 'Todas', deuda: 'Con deuda', '30': '1 a 30 días', '60': 'Más de 30 días', convenio: 'Convenio', aldia: 'Al día' };

  function pintarFamilias() {
    const cont = $('#fin-familias');
    const todas = F.familias();
    const q = ui.famBusca.trim().toLowerCase();
    const filtro = {
      todas: () => true, deuda: f => f.deudaVencida > 0, '30': f => f.vencidos.length && f.atraso <= 30,
      '60': f => f.atraso > 30 && !f.convenio, convenio: f => !!f.convenio, aldia: f => !f.vencidos.length
    }[ui.famFiltro] || (() => true);
    const lista = todas.filter(filtro).filter(f => !q || f.apoderado.toLowerCase().includes(q) || f.hijos.some(h => h.nombre.toLowerCase().includes(q)) || f.telefono.includes(q));
    const deuda = todas.reduce((s, f) => s + f.deudaVencida, 0);

    cont.innerHTML = `
      <div class="kpi-grid">
        <article class="kpi"><span>Familias</span><strong>${todas.length}</strong><small>${Store.deportistas().length} deportistas</small></article>
        <article class="kpi"><span>Con deuda vencida</span><strong>${todas.filter(f => f.deudaVencida).length}</strong><small>${todas.filter(f => f.atraso > 30).length} con más de 30 días</small></article>
        <article class="kpi gold"><span>Deuda vencida total</span><strong>${CLP(deuda)}</strong><small>mensualidades y cuotas</small></article>
        <article class="kpi"><span>En convenio</span><strong>${todas.filter(f => f.convenio).length}</strong><small>el piloto no les insiste</small></article>
      </div>
      <div class="panel-box">
        <div class="panel-head" style="flex-wrap:wrap">
          <div><h3>Estado de cuenta por familia</h3><span class="sub">Hermanos juntos: una familia, una deuda, un mensaje</span></div>
          <span class="grow"></span>
          <input class="input input-sm" type="search" id="fam-busca" placeholder="Apoderado, deportista o teléfono" value="${esc(ui.famBusca)}" aria-label="Buscar familia">
          <div class="filters">${Object.entries(FILTROS_FAM).map(([k, t]) => `<button class="chip${ui.famFiltro === k ? ' active' : ''}" data-ff="${k}">${t}</button>`).join('')}</div>
        </div>
        <div class="table-wrap"><table class="data" id="tabla-familias">
          <thead><tr><th>Familia</th><th class="num">Vencido</th><th class="num">Por vencer</th><th>Atraso</th><th>Último aviso</th><th></th></tr></thead>
          <tbody>${lista.length ? lista.map(f => `
            <tr data-fam="${f.id}" tabindex="0">
              <td><div class="cell-person"><span class="avatar-sm">${iniciales(f.apoderado)}</span><span><b>${esc(f.apoderado)}</b><span>${f.hijos.map(h => esc(h.nombre.split(' ')[0])).join(', ')}</span></span></div></td>
              <td class="num">${f.deudaVencida ? `<b>${CLP(f.deudaVencida)}</b>` : '—'}</td>
              <td class="num">${f.porVencer ? CLP(f.porVencer) : '—'}</td>
              <td>${tramoTag(f)}</td>
              <td class="muted-cell">${f.ultimoAviso ? `${F.fechaCorta(f.ultimoAviso.fecha)} · ${esc(f.ultimoAviso.pasoNombre)}` : '—'}</td>
              <td style="text-align:right"><button class="btn btn-ghost btn-sm" data-abrir="${f.id}">Estado de cuenta</button></td>
            </tr>`).join('') : `<tr><td colspan="6"><p class="empty">Ninguna familia en este filtro.</p></td></tr>`}
          </tbody>
        </table></div>
      </div>`;

    $('#fam-busca').addEventListener('input', e => { ui.famBusca = e.target.value; const pos = e.target.selectionStart; pintarFamilias(); const i = $('#fam-busca'); i.focus(); i.setSelectionRange(pos, pos); });
    cont.querySelectorAll('[data-ff]').forEach(b => b.addEventListener('click', () => { ui.famFiltro = b.dataset.ff; pintarFamilias(); }));
    cont.querySelectorAll('tr[data-fam]').forEach(tr => {
      tr.addEventListener('click', () => abrirFamilia(tr.dataset.fam));
      tr.addEventListener('keydown', e => { if (e.key === 'Enter') abrirFamilia(tr.dataset.fam); });
    });
  }

  function textoEstadoCuenta(f) {
    const detalle = f.impagos.map(c => `• ${c.concepto} de ${c.atleta.nombre.split(' ')[0]}: ${CLP(c.monto)}${c.estado === 'vencido' ? ' (vencida)' : ` (vence ${F.fechaCorta(c.vence)})`}`).join('\n');
    const total = f.impagos.reduce((s, c) => s + c.monto, 0);
    return f.impagos.length
      ? `Hola ${f.apoderado.split(' ')[0]}, este es tu estado de cuenta en ${CLUB.corto}:\n${detalle}\nTotal ${CLP(total)}. Puedes pagarlo desde el portal de apoderados.`
      : `Hola ${f.apoderado.split(' ')[0]}, tu cuenta en ${CLUB.corto} está al día. ¡Gracias!`;
  }

  function abrirFamilia(id) {
    const f = F.familia(id);
    if (!f) return;
    const comps = F.comprobantes().filter(c => c.familia === f.id);
    const pagadoTemp = f.cargos.filter(c => c.estado === 'pagado').reduce((s, c) => s + c.monto, 0);

    abrirCajon(`
      <div class="drawer-head">
        <span class="avatar-sm">${iniciales(f.apoderado)}</span>
        <div><h3>${esc(f.apoderado)}</h3><span>+56 ${f.telefono} · ${f.hijos.map(h => esc(h.nombre)).join(', ')}</span></div>
        <button class="drawer-close" data-cerrar aria-label="Cerrar">✕</button>
      </div>
      <div class="drawer-body">
        <div class="mini-kpis">
          <div><span>Vencido</span><b class="${f.deudaVencida ? 'alerta' : ''}">${CLP(f.deudaVencida)}</b></div>
          <div><span>Por vencer</span><b>${CLP(f.impagos.filter(c => c.estado === 'pendiente').reduce((s, c) => s + c.monto, 0))}</b></div>
          <div><span>Pagado en la temporada</span><b>${CLP(pagadoTemp)}</b></div>
        </div>

        <section>
          <h4>Cargos pendientes</h4>
          ${f.impagos.length ? `
          <div class="cargos-lista">${f.impagos.map(c => `
            <label class="cargo-fila">
              <input type="checkbox" value="${c.id}" data-monto="${c.monto}" ${c.estado === 'vencido' ? 'checked' : ''}>
              <span><b>${esc(c.concepto)}</b><small>${esc(c.atleta.nombre)}</small></span>
              ${estadoCargo(c)}
              <strong>${CLP(c.monto)}</strong>
            </label>`).join('')}</div>
          <div class="registrar-pago">
            <select class="input input-sm" id="pago-medio" aria-label="Medio de pago"><option>Transferencia</option><option>Efectivo</option><option>Débito</option><option>Pago en línea</option></select>
            <button class="btn btn-gold btn-sm" id="pago-registrar">Registrar pago de <span id="pago-total"></span></button>
          </div>` : '<p class="empty" style="padding:18px">Sin cargos pendientes. Familia al día.</p>'}
        </section>

        <section class="row">
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${F.enlaceWhatsApp(f.telefono, textoEstadoCuenta(f))}">Enviar estado de cuenta por WhatsApp</a>
        </section>

        <section>
          <h4>Convenio de pago</h4>
          ${f.convenio
            ? `<p class="nota">Desde el ${F.fechaCorta(f.convenio.desde)}: ${esc(f.convenio.nota)}. El piloto no le envía recordatorios mientras dure.</p>
               <button class="btn btn-ghost btn-sm" id="conv-fin">Terminar convenio</button>`
            : `<p class="nota">Si la familia acordó pagar en partes, anótalo: el piloto deja de enviarle recordatorios automáticos.</p>
               <div class="registrar-pago"><input class="input input-sm" id="conv-nota" placeholder="Ej. paga $20.000 el 15 de cada mes"><button class="btn btn-ghost btn-sm" id="conv-crear">Acordar convenio</button></div>`}
        </section>

        <section>
          <h4>Comprobantes</h4>
          ${comps.length ? `<div class="pay-history">${comps.map(c => `
            <div class="pay-item${c.anulado ? ' anulado' : ''}">
              <b>N° ${c.folio} · ${F.fechaCorta(c.fecha)}</b><span>${esc(c.medio)}${c.origen === 'cartola' ? ' · conciliado' : ''}</span><span>${CLP(c.total)}</span>
              <button class="btn btn-ghost btn-sm" data-imprimir="${c.folio}">Ver</button>
              ${c.anulado ? '<span class="tag mute">Anulado</span>' : `<button class="btn btn-ghost btn-sm" data-anular="${c.folio}">Anular</button>`}
            </div>`).join('')}</div>` : '<p class="nota">Aún no hay comprobantes emitidos por el sistema para esta familia.</p>'}
        </section>
      </div>`);

    const d = $('#drawer');
    const total = () => [...d.querySelectorAll('.cargos-lista input:checked')].reduce((s, i) => s + Number(i.dataset.monto), 0);
    const actualizar = () => { const t = $('#pago-total'); if (t) t.textContent = CLP(total()); const b = $('#pago-registrar'); if (b) b.disabled = !total(); };
    d.querySelectorAll('.cargos-lista input').forEach(i => i.addEventListener('change', actualizar));
    actualizar();
    $('#pago-registrar')?.addEventListener('click', () => {
      const ids = [...d.querySelectorAll('.cargos-lista input:checked')].map(i => i.value);
      const comp = F.aplicarPago(ids, { medio: $('#pago-medio').value, origen: 'panel' });
      if (!comp) return;
      toast(`Pago registrado. Comprobante N° ${comp.folio}.`);
      abrirFamilia(f.id); repintarActual();
    });
    $('#conv-crear')?.addEventListener('click', () => {
      const nota = $('#conv-nota').value.trim();
      if (!nota) { toast('Escribe lo que se acordó.', 'err'); return; }
      F.fijarConvenio(f.id, nota); toast('Convenio registrado.'); abrirFamilia(f.id); repintarActual();
    });
    $('#conv-fin')?.addEventListener('click', () => { F.fijarConvenio(f.id, null); toast('Convenio terminado.'); abrirFamilia(f.id); repintarActual(); });
    d.querySelectorAll('[data-imprimir]').forEach(b => b.addEventListener('click', () => F.imprimirComprobante(F.comprobantes().find(c => c.folio === Number(b.dataset.imprimir)))));
    d.querySelectorAll('[data-anular]').forEach(b => b.addEventListener('click', () => {
      if (!confirm(`¿Anular el comprobante N° ${b.dataset.anular}? Los cargos vuelven a quedar pendientes.`)) return;
      F.anularComprobante(Number(b.dataset.anular)); toast('Comprobante anulado.'); abrirFamilia(f.id); repintarActual();
    }));
  }

  /* ============================= CUOTAS ============================= */

  function textoAlcance(c) {
    const { tipo, ids = [] } = c.alcance || {};
    if (tipo === 'categoria') return ids.map(id => CATEGORIAS.find(x => x.id === id)?.nombre || id).join(', ');
    if (tipo === 'equipo') return ids.map(id => todosLosEquipos().find(x => x.id === id)?.nombre || id).join(', ');
    return 'Todo el club';
  }

  function pintarCuotas() {
    const cont = $('#fin-cuotas');
    const cobros = F.cobros();
    if (!ui.cobroSel || !cobros.find(c => c.id === ui.cobroSel)) ui.cobroSel = cobros[0]?.id || null;
    const sel = cobros.find(c => c.id === ui.cobroSel);

    cont.innerHTML = `
      <div class="cols-2">
        <div class="cobros-grid">${cobros.length ? cobros.map(c => {
          const av = F.avanceCobro(c);
          const pct = av.esperado ? Math.round(av.recaudado / av.esperado * 100) : 0;
          return `<button class="cobro${c.id === ui.cobroSel ? ' activo' : ''}" data-sel="${c.id}" aria-pressed="${c.id === ui.cobroSel}">
            <span class="cobro-top"><b>${esc(c.nombre)}</b><span>${CLP(c.total)} · ${plural(c.cuotas, 'cuota', 'cuotas')}</span></span>
            <span class="barra" role="img" aria-label="${pct}% recaudado"><i style="width:${pct}%"></i></span>
            <span class="cobro-pie"><span>${CLP(av.recaudado)} de ${CLP(av.esperado)} · <b>${pct}%</b></span><span>${esc(textoAlcance(c))} · ${av.deportistas} deportistas</span>
            <span>${av.vencidas ? `<span class="tag alert">${plural(av.vencidas, 'cuota vencida', 'cuotas vencidas')}</span>` : '<span class="tag ok">Sin cuotas vencidas</span>'} ${av.proxima ? `<span class="tag mute">Próxima ${F.fechaCorta(av.proxima)}</span>` : ''}</span></span>
          </button>`;
        }).join('') : '<p class="empty">Aún no hay cobros extra. Crea el primero a la derecha.</p>'}</div>

        <div class="panel-box">
          <div class="panel-head"><div><h3>Nuevo cobro en cuotas</h3><span class="sub">Viaje, uniforme, inscripción a un torneo…</span></div></div>
          <div class="panel-in form-grid">
            <label class="field full"><span>Nombre</span><input id="nc-nombre" placeholder="Ej. Nacional de Santiago 2026"></label>
            <label class="field"><span>Monto por deportista</span><input id="nc-total" inputmode="numeric" placeholder="60.000"></label>
            <label class="field"><span>Cuotas</span><select id="nc-cuotas">${[1, 2, 3, 4, 5, 6].map(n => `<option ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field"><span>Primer vencimiento</span><input id="nc-vence" type="date" value="${F.sumarDias(F.hoy(), 15)}"></label>
            <label class="field"><span>Para quién</span><select id="nc-alcance"><option value="todos">Todo el club</option>${CATEGORIAS.map(c => `<option value="cat:${c.id}">${c.nombre}</option>`).join('')}${todosLosEquipos().map(e => `<option value="eq:${e.id}">Equipo ${e.nombre}</option>`).join('')}</select></label>
            <p class="preview full" id="nc-preview" aria-live="polite"></p>
            <button class="btn btn-gold full" id="nc-crear">Crear cobro</button>
            <p class="nota full">Al crearlo, el piloto se encarga del resto: carga las cuotas a cada familia, avisa antes de cada vencimiento y te muestra quién falta.</p>
          </div>
        </div>
      </div>

      ${sel ? detalleCobro(sel) : ''}`;

    cont.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => { ui.cobroSel = b.dataset.sel; pintarCuotas(); }));
    const prev = () => {
      const total = Number(String($('#nc-total').value).replace(/\D/g, '')) || 0;
      const n = Number($('#nc-cuotas').value);
      const cobro = { total, cuotas: n, alcance: leerAlcance(), creado: F.hoy() };
      const cuantos = F.alcanceDe(cobro).filter(a => a.estado === 'activa').length;
      $('#nc-preview').innerHTML = total ? `Se cargarán <b>${n === 1 ? 'una cuota' : `${n} cuotas`} de ${CLP(F.montoCuota(cobro, 1))}</b> a ${plural(cuantos, 'deportista', 'deportistas')}. Total esperado: <b>${CLP(total * cuantos)}</b>.` : 'Completa el monto para ver cuánto se espera recaudar.';
    };
    ['#nc-total', '#nc-cuotas', '#nc-alcance'].forEach(s => $(s).addEventListener('input', prev));
    prev();
    $('#nc-crear').addEventListener('click', () => {
      const nombre = $('#nc-nombre').value.trim();
      const total = Number(String($('#nc-total').value).replace(/\D/g, '')) || 0;
      const vence = $('#nc-vence').value;
      if (!nombre || total < 1000 || !vence) { toast('Completa nombre, monto y primer vencimiento.', 'err'); return; }
      const c = F.crearCobro({ nombre, total, cuotas: Number($('#nc-cuotas').value), primerVence: vence, alcance: leerAlcance() });
      ui.cobroSel = c.id;
      toast('Cobro creado. El piloto ya lo tiene en su agenda.');
      pintarCuotas();
    });
    enlazarDetalleCobro(cont);
  }

  function leerAlcance() {
    const v = $('#nc-alcance').value;
    if (v.startsWith('cat:')) return { tipo: 'categoria', ids: [v.slice(4)] };
    if (v.startsWith('eq:')) return { tipo: 'equipo', ids: [v.slice(3)] };
    return { tipo: 'todos', ids: [] };
  }

  function detalleCobro(c) {
    const av = F.avanceCobro(c);
    const porAtleta = new Map();
    av.cargos.forEach(x => { if (!porAtleta.has(x.atleta.id)) porAtleta.set(x.atleta.id, { a: x.atleta, cuotas: [] }); porAtleta.get(x.atleta.id).cuotas.push(x); });
    let filas = [...porAtleta.values()].sort((x, y) => x.a.nombre.localeCompare(y.a.nombre, 'es'));
    if (ui.cuotaFiltro === 'pendientes') filas = filas.filter(r => r.cuotas.some(x => x.estado !== 'pagado' && x.vence <= F.sumarDias(F.hoy(), 14)));
    if (ui.cuotaFiltro === 'vencidas') filas = filas.filter(r => r.cuotas.some(x => x.estado === 'vencido'));

    return `
      <div class="panel-box">
        <div class="panel-head" style="flex-wrap:wrap">
          <div><h3>${esc(c.nombre)}</h3><span class="sub">${esc(c.detalle || textoAlcance(c))} · toca una cuota para marcarla pagada</span></div>
          <span class="grow"></span>
          <div class="filters">
            ${[['todos', 'Todos'], ['pendientes', 'Faltan próximas'], ['vencidas', 'Con vencidas']].map(([k, t]) => `<button class="chip${ui.cuotaFiltro === k ? ' active' : ''}" data-cf="${k}">${t}</button>`).join('')}
          </div>
          ${av.cargos.some(x => x.estado === 'pagado') ? '' : `<button class="btn btn-ghost btn-sm" data-borrar-cobro="${c.id}">Eliminar cobro</button>`}
        </div>
        <div class="table-wrap"><table class="data compact cuotas-tabla">
          <thead><tr><th>Deportista</th>${Array.from({ length: c.cuotas }, (_, i) => `<th>Cuota ${i + 1} · ${F.fechaCorta(F.sumarMeses(c.primerVence, i))}</th>`).join('')}</tr></thead>
          <tbody>${filas.length ? filas.map(r => `<tr>
            <td><b>${esc(r.a.nombre)}</b><span class="muted-cell"> · ${esc(r.a.apoderado)}</span></td>
            ${r.cuotas.map(x => `<td>${x.estado === 'pagado'
              ? `<span class="tag ok">Pagada ${x.fechaPago ? F.fechaCorta(x.fechaPago) : ''}</span>`
              : `<button class="cuota-btn ${x.estado}" data-pagar-cuota="${x.id}" aria-label="Marcar pagada: ${esc(x.concepto)} de ${esc(r.a.nombre)}">${x.estado === 'vencido' ? 'Vencida' : 'Pendiente'} · ${CLP(x.monto)}</button>`}</td>`).join('')}
          </tr>`).join('') : `<tr><td colspan="${c.cuotas + 1}"><p class="empty">Nadie en este filtro.</p></td></tr>`}</tbody>
        </table></div>
      </div>`;
  }

  function enlazarDetalleCobro(root) {
    root.querySelectorAll('[data-cf]').forEach(b => b.addEventListener('click', () => { ui.cuotaFiltro = b.dataset.cf; pintarCuotas(); }));
    root.querySelectorAll('[data-pagar-cuota]').forEach(b => b.addEventListener('click', () => {
      const comp = F.aplicarPago([b.dataset.pagarCuota], { medio: 'Registro manual', origen: 'panel' });
      if (comp) toast(`Cuota pagada. Comprobante N° ${comp.folio}.`);
      pintarCuotas();
    }));
    root.querySelector('[data-borrar-cobro]')?.addEventListener('click', e => {
      if (!confirm('¿Eliminar este cobro? Solo se puede mientras nadie haya pagado.')) return;
      if (F.eliminarCobro(e.currentTarget.dataset.borrarCobro)) { ui.cobroSel = null; toast('Cobro eliminado.'); } else toast('Ya tiene pagos: no se puede eliminar.', 'err');
      pintarCuotas();
    });
  }

  /* ============================== CAJA ============================== */

  /* El gráfico se dibuja al ancho real de su caja: así el texto queda a
     tamaño natural en vez de encogerse o estirarse */
  const anchoGrafico = cont => Math.max(320, Math.round(cont.clientWidth - 30));

  function graficoCaja(serie, W = 640) {
    const H = 220, pad = { t: 14, r: 12, b: 28, l: 52 };
    const max = Math.max(...serie.flatMap(s => [s.totalIn, s.totalEg]), 1) * 1.1;
    const ancho = W - pad.l - pad.r, alto = H - pad.t - pad.b;
    const grupo = ancho / serie.length;
    const bw = Math.min(22, grupo / 3.2);
    const y = v => pad.t + alto * (1 - v / max);
    const barra = (x, v, color, tip) => {
      const h = Math.max(0, alto * v / max), yy = pad.t + alto - h, r = Math.min(4, h);
      /* Extremo de datos redondeado arriba, base recta sobre el eje */
      const d = `M${x},${yy + h} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${yy + h} Z`;
      return `<path d="${d}" fill="${color}" tabindex="0" data-tip="${tip}" class="barra-dato" />`;
    };
    const lineas = [0, .25, .5, .75, 1].map(p => `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(max / 1.1 * p)}" y2="${y(max / 1.1 * p)}"/><text class="axis" x="${pad.l - 8}" y="${y(max / 1.1 * p) + 4}" text-anchor="end">${compacto(max / 1.1 * p)}</text>`).join('');
    const barras = serie.map((s, i) => {
      const x0 = pad.l + grupo * i + grupo / 2 - bw - 1;
      const mes = F.mesLargo(s.mes);
      return barra(x0, s.totalIn, SERIE.ingreso, `<b>${mes}</b><br>Ingresos ${CLP(s.totalIn)}<br>Resultado ${CLP(s.resultado)}`)
        + barra(x0 + bw + 2, s.totalEg, SERIE.egreso, `<b>${mes}</b><br>Egresos ${CLP(s.totalEg)}<br>Resultado ${CLP(s.resultado)}`)
        + `<text class="axis" x="${pad.l + grupo * i + grupo / 2}" y="${H - 8}" text-anchor="middle">${mesCorto(s.mes)}</text>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y egresos de los últimos ${serie.length} meses">${lineas}${barras}</svg>`;
  }

  function pintarCaja() {
    const cont = $('#fin-caja');
    const serie = F.serieCaja(6);
    const meses = serie.map(s => s.mes);
    if (!meses.includes(ui.cajaMes)) ui.cajaMes = meses[meses.length - 1];
    const fm = serie.find(s => s.mes === ui.cajaMes);

    /* Lo cobrado a familias entra solo: una fila por concepto, no 150 */
    const auto = fm.ingresos.filter(x => x.nombre === 'Mensualidades' || x.nombre.startsWith('Cuotas · '))
      .map(x => ({ id: null, fecha: `${ui.cajaMes}-${F.hoy().slice(0, 7) === ui.cajaMes ? F.hoy().slice(8) : '28'}`, tipo: 'ingreso', categoria: x.nombre.startsWith('Cuotas') ? 'Cuotas extra' : 'Mensualidades', detalle: `${x.nombre} cobradas en ${F.mesLargo(ui.cajaMes).split(' ')[0]}`, monto: x.monto, respaldo: 'Comprobantes del sistema', auto: true }));
    let movs = [...auto, ...F.movimientos().filter(m => m.fecha.slice(0, 7) === ui.cajaMes)].sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (ui.cajaTipo === 'ingreso' || ui.cajaTipo === 'egreso') movs = movs.filter(m => m.tipo === ui.cajaTipo);
    if (ui.cajaTipo === 'sin') movs = movs.filter(m => m.tipo === 'egreso' && !m.respaldo);

    cont.innerHTML = `
      <div class="kpi-grid">
        <article class="kpi gold"><span>Saldo en caja</span><strong>${CLP(F.saldoCaja())}</strong><small>al día de hoy</small></article>
        <article class="kpi"><span>Ingresos · ${F.mesLargo(ui.cajaMes)}</span><strong>${CLP(fm.totalIn)}</strong><small>${fm.ingresos.length} orígenes</small></article>
        <article class="kpi"><span>Egresos · ${F.mesLargo(ui.cajaMes)}</span><strong>${CLP(fm.totalEg)}</strong><small>${fm.egresos.length} categorías</small></article>
        <article class="kpi"><span>Resultado del mes</span><strong class="${fm.resultado < 0 ? 'negativo' : ''}">${fm.resultado < 0 ? '−' : '+'}${CLP(Math.abs(fm.resultado))}</strong><small>ingresos menos egresos</small></article>
      </div>

      <div class="panel-box">
        <div class="panel-head"><div><h3>Ingresos y egresos</h3><span class="sub">Últimos 6 meses</span></div><span class="grow"></span>
          <div class="leyenda"><span><i style="background:${SERIE.ingreso}"></i>Ingresos</span><span><i style="background:${SERIE.egreso}"></i>Egresos</span></div></div>
        <div class="panel-in">
          ${graficoCaja(serie, anchoGrafico(cont))}
          <details class="como-tabla"><summary>Ver como tabla</summary>
            <div class="table-wrap"><table class="data compact"><thead><tr><th>Mes</th><th class="num">Ingresos</th><th class="num">Egresos</th><th class="num">Resultado</th><th class="num">Saldo final</th></tr></thead>
            <tbody>${serie.map(s => `<tr><td>${F.mesLargo(s.mes)}</td><td class="num">${CLP(s.totalIn)}</td><td class="num">${CLP(s.totalEg)}</td><td class="num">${CLP(s.resultado)}</td><td class="num">${CLP(s.final)}</td></tr>`).join('')}</tbody></table></div>
          </details>
        </div>
      </div>

      <div class="cols-2">
        <div class="panel-box">
          <div class="panel-head" style="flex-wrap:wrap">
            <div><h3>Movimientos</h3><span class="sub">Lo cobrado a familias entra solo</span></div><span class="grow"></span>
            <select class="input select-sm" id="caja-mes" aria-label="Mes">${meses.slice().reverse().map(m => `<option value="${m}" ${m === ui.cajaMes ? 'selected' : ''}>${F.mesLargo(m)}</option>`).join('')}</select>
            <div class="filters">${[['todos', 'Todos'], ['ingreso', 'Ingresos'], ['egreso', 'Egresos'], ['sin', 'Sin respaldo']].map(([k, t]) => `<button class="chip${ui.cajaTipo === k ? ' active' : ''}" data-ct="${k}">${t}</button>`).join('')}</div>
          </div>
          <div class="table-wrap"><table class="data compact">
            <thead><tr><th>Fecha</th><th>Detalle</th><th>Categoría</th><th>Respaldo</th><th class="num">Monto</th><th></th></tr></thead>
            <tbody>${movs.length ? movs.map(m => `<tr>
              <td class="muted-cell">${F.fechaCorta(m.fecha)}</td>
              <td>${esc(m.detalle)}${m.auto ? ' <span class="tag info">Automático</span>' : ''}</td>
              <td>${esc(m.categoria)}</td>
              <td>${m.respaldo ? `<span class="muted-cell">${esc(m.respaldo)}</span>` : '<span class="tag warn">Falta</span>'}</td>
              <td class="num monto-${m.tipo}">${m.tipo === 'egreso' ? '−' : '+'}${CLP(m.monto)}</td>
              <td style="text-align:right">${m.id ? `<button class="btn btn-ghost btn-sm" data-borrar-mov="${m.id}" aria-label="Eliminar movimiento">Eliminar</button>` : ''}</td>
            </tr>`).join('') : '<tr><td colspan="6"><p class="empty">Sin movimientos en este filtro.</p></td></tr>'}</tbody>
          </table></div>
        </div>

        <div style="display:grid;gap:var(--gap)">
          <div class="panel-box">
            <div class="panel-head"><div><h3>Conciliar cartola del banco</h3><span class="sub">Sube el CSV y el sistema reconoce quién pagó</span></div></div>
            <div class="panel-in" style="display:grid;gap:10px">
              <label class="subir"><input type="file" id="cartola-archivo" accept=".csv,.txt,text/csv"><span>Elegir archivo CSV</span></label>
              <button class="btn btn-ghost btn-sm" id="cartola-ejemplo">Probar con una cartola de ejemplo</button>
              <p class="nota">Funciona con la cartola exportada de BancoEstado, Santander, BCI, Chile y otros (fecha, descripción y monto, o cargo y abono). El archivo se lee en este navegador y no se sube a ningún servidor.</p>
              <div id="cartola-resultado">${ui.cartola ? resultadoCartola(ui.cartola) : ''}</div>
            </div>
          </div>

          <div class="panel-box">
            <div class="panel-head"><h3>Registrar gasto o ingreso</h3></div>
            <div class="panel-in form-grid">
              <div class="segmento full" role="radiogroup" aria-label="Tipo de movimiento">
                <label><input type="radio" name="mv-tipo" value="egreso" checked><span>Gasto</span></label>
                <label><input type="radio" name="mv-tipo" value="ingreso"><span>Ingreso</span></label>
              </div>
              <label class="field"><span>Fecha</span><input type="date" id="mv-fecha" value="${F.hoy()}"></label>
              <label class="field"><span>Monto</span><input id="mv-monto" inputmode="numeric" placeholder="25.000"></label>
              <label class="field full"><span>Categoría</span><select id="mv-cat">${F.CATEGORIAS_EGRESO.map(c => `<option>${c}</option>`).join('')}</select></label>
              <label class="field full"><span>Detalle</span><input id="mv-detalle" placeholder="Ej. Pasajes de bus Antofagasta"></label>
              <label class="field full"><span>Boleta o factura</span><input id="mv-resp" placeholder="N° del documento (puedes completarlo después)"></label>
              <button class="btn btn-gold full" id="mv-guardar">Guardar</button>
            </div>
          </div>
        </div>
      </div>`;

    tooltip(cont.querySelector('svg.chart'));
    $('#caja-mes').addEventListener('change', e => { ui.cajaMes = e.target.value; pintarCaja(); });
    cont.querySelectorAll('[data-ct]').forEach(b => b.addEventListener('click', () => { ui.cajaTipo = b.dataset.ct; pintarCaja(); }));
    cont.querySelectorAll('[data-borrar-mov]').forEach(b => b.addEventListener('click', () => {
      if (!confirm('¿Eliminar este movimiento?')) return;
      F.eliminarMovimiento(b.dataset.borrarMov); toast('Movimiento eliminado.'); pintarCaja();
    }));
    cont.querySelectorAll('input[name="mv-tipo"]').forEach(r => r.addEventListener('change', () => {
      const cats = r.value === 'ingreso' ? F.CATEGORIAS_INGRESO : F.CATEGORIAS_EGRESO;
      $('#mv-cat').innerHTML = cats.map(c => `<option>${c}</option>`).join('');
    }));
    $('#mv-guardar').addEventListener('click', () => {
      const monto = Number(String($('#mv-monto').value).replace(/\D/g, '')) || 0;
      const detalle = $('#mv-detalle').value.trim();
      if (!monto || !detalle) { toast('Completa monto y detalle.', 'err'); return; }
      F.registrarMovimiento({ fecha: $('#mv-fecha').value || F.hoy(), tipo: cont.querySelector('input[name="mv-tipo"]:checked').value, categoria: $('#mv-cat').value, detalle, monto, respaldo: $('#mv-resp').value.trim() });
      ui.cajaMes = ($('#mv-fecha').value || F.hoy()).slice(0, 7);
      toast('Movimiento guardado.'); pintarCaja();
    });
    const procesar = texto => { ui.cartola = F.conciliar(texto); pintarCaja(); badges(); };
    $('#cartola-ejemplo').addEventListener('click', () => procesar(F.cartolaEjemplo()));
    $('#cartola-archivo').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => procesar(String(r.result));
      r.readAsText(file, /utf/i.test(file.type) ? 'utf-8' : 'utf-8');
    });
  }

  function resultadoCartola(res) {
    if (!res.length) return '<p class="nota">No encontré movimientos en el archivo. Revisa que tenga fecha, descripción y monto.</p>';
    const n = e => res.filter(x => x.estado === e).length;
    const ETQ = { aplicado: ['ok', 'Pago aplicado'], gasto: ['info', 'Gasto registrado'], revisar: ['warn', 'Para ti en Hoy'], repetido: ['mute', 'Ya procesado'] };
    return `
      <div class="cartola-resumen">
        <span><b>${n('aplicado')}</b> pagos reconocidos</span><span><b>${n('gasto')}</b> gastos</span><span><b>${n('revisar')}</b> para revisar</span>${n('repetido') ? `<span><b>${n('repetido')}</b> repetidos</span>` : ''}
      </div>
      <ul class="cartola-lista">${res.map(x => `<li>
        <span class="tag ${ETQ[x.estado][0]}">${ETQ[x.estado][1]}</span>
        <span class="c-glosa">${esc(x.glosa)}<small>${esc(x.motivo)}${x.folio ? ` · comprobante N° ${x.folio}` : ''}</small></span>
        <b class="${x.monto < 0 ? 'monto-egreso' : 'monto-ingreso'}">${x.monto < 0 ? '−' : '+'}${CLP(Math.abs(x.monto))}</b>
      </li>`).join('')}</ul>
      ${n('revisar') ? '<button class="btn btn-ghost btn-sm" data-ir-hoy>Resolver en Hoy</button>' : ''}`;
  }

  /* ============================ RENDICIÓN ============================ */

  function cascada(r, W = 640) {
    const H = 250, pad = { t: 22, r: 12, b: 56, l: 12 };
    const top = (arr, n, nombre) => arr.length > n ? [...arr.slice(0, n - 1), { nombre, monto: arr.slice(n - 1).reduce((s, x) => s + x.monto, 0) }] : arr;
    const pasos = [
      { nombre: 'Saldo inicial', tipo: 'saldo', monto: r.inicial },
      ...top(r.ingresos, 3, 'Otros ingresos').map(x => ({ ...x, tipo: 'ingreso' })),
      ...top(r.egresos, 5, 'Otros egresos').map(x => ({ ...x, tipo: 'egreso' })),
      { nombre: 'Saldo final', tipo: 'saldo', monto: r.final }
    ];
    let acc = 0;
    const barras = pasos.map(p => {
      let desde, hasta;
      if (p.tipo === 'saldo') { desde = 0; hasta = p.monto; acc = p.monto; }
      else if (p.tipo === 'ingreso') { desde = acc; hasta = acc + p.monto; acc = hasta; }
      else { desde = acc; hasta = acc - p.monto; acc = hasta; }
      return { ...p, desde, hasta };
    });
    const max = Math.max(...barras.flatMap(b => [b.desde, b.hasta]), 1) * 1.08;
    const min = Math.min(0, ...barras.flatMap(b => [b.desde, b.hasta]));
    const ancho = W - pad.l - pad.r, alto = H - pad.t - pad.b;
    const y = v => pad.t + alto * (1 - (v - min) / (max - min));
    const paso = ancho / barras.length, bw = Math.min(40, paso * .62);
    const color = t => SERIE[t];
    const angosto = paso < 78;
    const etiqueta = (t, cx) => {
      const limpio = t.replace(/^Cuotas · /, 'Cuotas ');
      if (angosto) return `<text class="axis" transform="translate(${cx} ${H - pad.b + 12}) rotate(-38)" text-anchor="end">${esc(limpio.length > 16 ? `${limpio.slice(0, 15)}…` : limpio)}</text>`;
      const pal = limpio.split(' '); const l1 = []; const l2 = [];
      pal.forEach(w => ((l1.join(' ') + ' ' + w).trim().length <= 13 && !l2.length ? l1 : l2).push(w));
      const dos = l2.join(' ');
      return `<text class="axis" x="${cx}" y="${H - pad.b + 16}" text-anchor="middle">${esc(l1.join(' '))}${dos ? `<tspan x="${cx}" dy="13">${esc(dos.length > 14 ? `${dos.slice(0, 13)}…` : dos)}</tspan>` : ''}</text>`;
    };
    const cuerpo = barras.map((b, i) => {
      const x = pad.l + paso * i + (paso - bw) / 2;
      const y1 = y(Math.max(b.desde, b.hasta)), y2 = y(Math.min(b.desde, b.hasta));
      const signo = b.tipo === 'egreso' ? '−' : b.tipo === 'ingreso' ? '+' : '';
      const conector = i < barras.length - 1 ? `<line class="conector" x1="${x + bw}" x2="${x + paso}" y1="${y(b.hasta)}" y2="${y(b.hasta)}"/>` : '';
      return `<rect x="${x}" y="${y1}" width="${bw}" height="${Math.max(1, y2 - y1)}" rx="3" fill="${color(b.tipo)}" tabindex="0" class="barra-dato" data-tip="<b>${esc(b.nombre)}</b><br>${signo}${CLP(Math.abs(b.monto))}"/>
        ${conector}
        ${etiqueta(b.nombre, x + bw / 2)}
        ${b.tipo === 'saldo' ? `<text class="valor" x="${x + bw / 2}" y="${y1 - 6}" text-anchor="middle">${compacto(b.monto)}</text>` : ''}`;
    }).join('');
    const cero = min < 0 ? `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}"/>` : '';
    return `<svg class="chart cascada" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cascada de la caja: saldo inicial, ingresos, egresos y saldo final">${cero}${cuerpo}</svg>`;
  }

  function pintarRendicion() {
    const cont = $('#fin-rendicion');
    const meses = Store.meses(6);
    if (!ui.rendMes) ui.rendMes = meses[meses.length - 2] || meses[0];
    const r = F.rendicion(ui.rendMes);
    const pct = (v, t) => (t ? `${Math.round(v / t * 100)}%` : '—');

    cont.innerHTML = `
      <div class="panel-box">
        <div class="panel-head" style="flex-wrap:wrap">
          <div><h3>Rendición de cuentas · ${F.mesLargo(ui.rendMes)}</h3><span class="sub">${r.publicada ? `Publicada el ${F.fechaCorta(r.publicada.fecha)} por ${esc(r.publicada.por)}. Las familias la ven en su portal.` : 'Borrador: todavía no la ven las familias.'}</span></div>
          <span class="grow"></span>
          <select class="input select-sm" id="rend-mes" aria-label="Mes">${meses.slice().reverse().map(m => `<option value="${m}" ${m === ui.rendMes ? 'selected' : ''}>${F.mesLargo(m)}</option>`).join('')}</select>
          ${r.publicada ? '<span class="tag ok">Publicada</span>' : '<button class="btn btn-gold btn-sm" id="rend-publicar">Publicar en el portal</button>'}
          <button class="btn btn-ghost btn-sm" id="rend-imprimir">Imprimir o guardar PDF</button>
        </div>
        <div class="panel-in" id="rend-hoja">
          <div class="rend-cifras">
            <div><span>Saldo inicial</span><b>${CLP(r.inicial)}</b></div>
            <div><span>Ingresos</span><b class="monto-ingreso">+${CLP(r.totalIn)}</b></div>
            <div><span>Egresos</span><b class="monto-egreso">−${CLP(r.totalEg)}</b></div>
            <div><span>Saldo final</span><b>${CLP(r.final)}</b></div>
          </div>
          <div class="leyenda"><span><i style="background:${SERIE.saldo}"></i>Saldo</span><span><i style="background:${SERIE.ingreso}"></i>Ingresos</span><span><i style="background:${SERIE.egreso}"></i>Egresos</span></div>
          ${cascada(r, anchoGrafico(cont))}
          <div class="cols-2 rend-tablas">
            <div class="table-wrap"><table class="data compact"><thead><tr><th>Ingresos por origen</th><th class="num">Monto</th><th class="num">%</th></tr></thead>
              <tbody>${r.ingresos.map(x => `<tr><td>${esc(x.nombre)}</td><td class="num">${CLP(x.monto)}</td><td class="num">${pct(x.monto, r.totalIn)}</td></tr>`).join('') || '<tr><td colspan="3">Sin ingresos</td></tr>'}</tbody>
              <tfoot><tr><td>Total</td><td class="num">${CLP(r.totalIn)}</td><td></td></tr></tfoot></table></div>
            <div class="table-wrap"><table class="data compact"><thead><tr><th>Egresos por categoría</th><th class="num">Monto</th><th class="num">%</th></tr></thead>
              <tbody>${r.egresos.map(x => `<tr><td>${esc(x.nombre)}</td><td class="num">${CLP(x.monto)}</td><td class="num">${pct(x.monto, r.totalEg)}</td></tr>`).join('') || '<tr><td colspan="3">Sin egresos</td></tr>'}</tbody>
              <tfoot><tr><td>Total</td><td class="num">${CLP(r.totalEg)}</td><td></td></tr></tfoot></table></div>
          </div>
          <div class="rend-indicadores">
            <div><span>Mensualidades del mes pagadas</span><b>${Math.round(r.cobranza * 100)}%</b></div>
            <div><span>Familias con deuda vencida hoy</span><b>${r.familiasConDeuda} de ${r.familias}</b></div>
            <div><span>Deuda vencida total hoy</span><b>${CLP(r.deudaTotal)}</b></div>
            <div><span>Gastos del mes sin boleta</span><b>${r.sinRespaldo}</b></div>
          </div>
          <p class="nota">Las familias ven estos totales en su portal, sin nombres ni montos de otras familias. Lo publicado queda fijo: si después se corrige algo, el ajuste aparece en la rendición siguiente.</p>
        </div>
      </div>`;

    tooltip(cont.querySelector('svg.chart'));
    $('#rend-mes').addEventListener('change', e => { ui.rendMes = e.target.value; pintarRendicion(); });
    $('#rend-publicar')?.addEventListener('click', () => { F.publicarRendicion(ui.rendMes); toast('Rendición publicada en el portal de apoderados.'); pintarRendicion(); });
    $('#rend-imprimir').addEventListener('click', () => {
      document.body.classList.add('imprimiendo-rendicion');
      const fin = () => { document.body.classList.remove('imprimiendo-rendicion'); window.removeEventListener('afterprint', fin); };
      window.addEventListener('afterprint', fin);
      window.print();
      setTimeout(fin, 1000);
    });
  }

  /* ============================== PILOTO ============================== */

  function pintarPiloto() {
    const cont = $('#fin-piloto');
    const cfg = F.piloto();
    const corrida = F.ultimaCorrida();
    const cola = F.recordatorios();
    const enCola = cola.filter(r => r.estado === 'en cola');

    cont.innerHTML = `
      <div class="panel-box piloto-cabeza">
        <div class="panel-in">
          <label class="interruptor"><input type="checkbox" id="pl-activo" ${cfg.activo ? 'checked' : ''}><span aria-hidden="true"></span><b>Piloto automático ${cfg.activo ? 'encendido' : 'apagado'}</b></label>
          <p>${corrida ? `Última revisión: hoy a las ${corrida.hora}.` : 'Aún no corre.'} Corre solo cada vez que alguien abre el panel. En producción corre cada mañana a las 8:00 aunque nadie entre.</p>
          <button class="btn btn-ghost btn-sm" id="pl-correr">Correr ahora</button>
        </div>
      </div>

      <div class="cols-2">
        <div class="panel-box">
          <div class="panel-head"><div><h3>Reglas</h3><span class="sub">Se configuran una vez; después no hay que acordarse de nada</span></div></div>
          <div class="panel-in reglas">
            <div class="regla"><b>1</b><div><h4>Cargar la mensualidad</h4><p>El día 1 de cada mes carga la mensualidad a cada deportista activa, con su beca si tiene.</p></div></div>
            <div class="regla"><b>2</b><div><h4>Vencimiento</h4><p>La mensualidad vence el día <input class="input input-xs" type="number" min="1" max="28" id="pl-vence" value="${cfg.diaVence}" aria-label="Día de vencimiento"> de cada mes. Al día siguiente pasa a vencida en el panel y en el portal.</p></div></div>
            <div class="regla"><b>3</b><div><h4>Recordatorios por WhatsApp</h4><p>Un solo mensaje por familia, con todo lo que debe de todos sus hijos. Nunca el mismo aviso dos veces.</p>
              ${cfg.recordatorios.map((p, i) => `<details class="paso"><summary><span>${esc(p.nombre)}</span><em>${p.dias < 0 ? `${-p.dias} días antes` : `${p.dias} días después`}</em></summary>
                <label class="field"><span>Días respecto al vencimiento</span><input class="input input-xs" type="number" data-pdias="${i}" value="${p.dias}"></label>
                <label class="field"><span>Mensaje</span><textarea rows="4" data-ptexto="${i}">${esc(p.texto)}</textarea></label>
                <p class="nota">Puedes usar {apoderado}, {detalle}, {total}, {portal} y {club}.</p></details>`).join('')}
            </div></div>
            <div class="regla"><b>4</b><div><h4>Pasarte el caso a ti</h4><p>Después de <input class="input input-xs" type="number" min="7" max="120" id="pl-escalar" value="${cfg.escalarDias}" aria-label="Días para escalar"> días de atraso deja de insistir y te lo muestra en Hoy. Las familias con convenio no reciben avisos.</p></div></div>
            <div class="regla"><b>5</b><div><h4>Conciliar el banco</h4><label class="check"><input type="checkbox" id="pl-conciliar" ${cfg.conciliarSolo ? 'checked' : ''}><span>Aplicar solo el pago cuando el nombre y el monto calzan. Si hay dudas, te pregunta.</span></label></div></div>
            <div class="regla"><b>6</b><div><h4>Comprobantes</h4><p>Cada pago registrado, conciliado o hecho en el portal genera su comprobante con número correlativo.</p></div></div>
            <div class="regla"><b>7</b><div><h4>Rendición mensual</h4><p>El día <input class="input input-xs" type="number" min="1" max="28" id="pl-rend" value="${cfg.rendicionDia}" aria-label="Día de publicación"> publica en el portal la rendición del mes anterior.</p></div></div>
            <button class="btn btn-gold" id="pl-guardar">Guardar reglas</button>
          </div>
        </div>

        <div style="display:grid;gap:var(--gap)">
          <div class="panel-box">
            <div class="panel-head"><div><h3>Cola de WhatsApp</h3><span class="sub">${plural(enCola.length, 'mensaje listo', 'mensajes listos')}</span></div></div>
            <div class="panel-in">
              <p class="nota">Con WhatsApp Business API conectado estos mensajes salen solos (Meta cobra por conversación iniciada). Mientras tanto, cada uno se envía con un toque desde tu teléfono.</p>
              <ul class="cola">${enCola.slice(0, 40).map(r => `<li>
                <span><b>${esc(r.apoderado)}</b><small>${esc(r.pasoNombre)} · ${CLP(r.total)}</small></span>
                <a class="btn btn-ghost btn-sm" href="${F.enlaceWhatsApp(r.telefono, r.texto)}" target="_blank" rel="noopener" data-enviado="${r.id}">Enviar</a>
              </li>`).join('') || '<li><p class="empty">Nada en cola.</p></li>'}</ul>
              ${enCola.length > 40 ? `<p class="nota">Y ${enCola.length - 40} más.</p>` : ''}
            </div>
          </div>
          <div class="panel-box">
            <div class="panel-head"><div><h3>Bitácora</h3><span class="sub">Todo lo que hizo, con fecha</span></div></div>
            <div class="panel-in"><ul class="bitacora">${F.bitacora().slice(0, 30).map(b => `<li><span class="b-ico b-${b.tipo}" aria-hidden="true"></span><span>${esc(b.detalle)}</span><time>${F.fechaCorta(b.fecha)} ${b.hora}</time></li>`).join('') || '<li class="empty">Sin registros todavía.</li>'}</ul></div>
          </div>
        </div>
      </div>`;

    $('#pl-activo').addEventListener('change', e => { F.guardarPiloto({ activo: e.target.checked }); toast(e.target.checked ? 'Piloto encendido.' : 'Piloto apagado: nada se hará solo.'); pintarPiloto(); });
    $('#pl-correr').addEventListener('click', () => {
      const h = F.correrPiloto();
      const partes = [h.cargos && `${h.cargos} cargos`, h.vencidos && `${h.vencidos} vencidas`, h.recordatorios && `${h.recordatorios} recordatorios`, h.rendicion && 'rendición publicada'].filter(Boolean);
      toast(partes.length ? `Listo: ${partes.join(', ')}.` : 'Todo estaba al día: no hubo nada que hacer.');
      pintarPiloto(); badges();
    });
    $('#pl-guardar').addEventListener('click', () => {
      const recordatorios = cfg.recordatorios.map((p, i) => ({ ...p, dias: Number(cont.querySelector(`[data-pdias="${i}"]`).value) || p.dias, texto: cont.querySelector(`[data-ptexto="${i}"]`).value || p.texto }));
      F.guardarPiloto({
        diaVence: Math.min(28, Math.max(1, Number($('#pl-vence').value) || 5)),
        escalarDias: Math.min(120, Math.max(7, Number($('#pl-escalar').value) || 30)),
        rendicionDia: Math.min(28, Math.max(1, Number($('#pl-rend').value) || 3)),
        conciliarSolo: $('#pl-conciliar').checked,
        recordatorios
      });
      toast('Reglas guardadas.'); pintarPiloto();
    });
    cont.querySelectorAll('[data-enviado]').forEach(a => a.addEventListener('click', () => {
      F.marcarRecordatorioEnviado(a.dataset.enviado);
      setTimeout(pintarPiloto, 300);
    }));
  }

  /* ======================= Registro en el panel ======================= */

  function badges() {
    const n = F.bandeja().length;
    const b = document.getElementById('badge-hoy');
    if (b) { b.hidden = !n; b.textContent = n; }
  }

  const VISTAS = {
    hoy:       { titulo: 'Hoy', sub: 'Lo que necesita tu decisión', pintar: pintarHoy },
    familias:  { titulo: 'Familias', sub: 'Estado de cuenta por apoderado', pintar: pintarFamilias },
    cuotas:    { titulo: 'Cuotas', sub: 'Viajes, uniformes y cobros en cuotas', pintar: pintarCuotas },
    caja:      { titulo: 'Caja', sub: 'Ingresos, gastos y conciliación bancaria', pintar: pintarCaja },
    rendicion: { titulo: 'Rendición', sub: 'Cuentas claras para la directiva y las familias', pintar: pintarRendicion },
    piloto:    { titulo: 'Piloto automático', sub: 'Lo que el sistema hace solo', pintar: pintarPiloto }
  };

  function repintarActual() {
    const activa = document.querySelector('.view.active')?.dataset.view;
    if (VISTAS[activa]) VISTAS[activa].pintar();
    badges();
  }

  document.addEventListener('click', e => { if (e.target.closest('[data-ir-hoy]')) irA('hoy'); });

  window.DE.VistasFinanzas = {
    vistas: VISTAS,
    alEntrar: () => { F.correrPiloto(); },
    badges
  };
})();
