/* ==========================================================================
   Dragones Elite — Flujo de inscripción
   ========================================================================== */

(function () {
  const { CLUB, CATEGORIAS, CLP, categoriaPorId, categoriaPorEdad, equipoPorId, edadDesde, Store } = window.DE;
  const { toast, initReveal } = window.DEUI;

  const estado = { categoria: null, equipo: null, ficha: null, pago: 'transferencia', paso: 1 };

  /* --- Navegación entre pasos ---------------------------------------------- */

  function ir(paso) {
    estado.paso = paso;
    $$('.wpanel').forEach(p => p.classList.toggle('active', Number(p.dataset.panel) === paso));
    $$('.wstep').forEach((s, i) => {
      s.classList.toggle('active', paso < 4 && i + 1 === paso);
      s.classList.toggle('done', i + 1 < paso);
    });
    const y = $('#wizard').getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  /* --- Paso 1: categoría y equipo ------------------------------------------ */

  function cuposDe(equipo) {
    const inscritas = Store.deportistas().filter(a => a.equipo === equipo.id && a.estado === 'activa').length;
    return Math.max(equipo.cupos - inscritas, 0);
  }

  function pintarCategorias() {
    $('#cat-grid').innerHTML = CATEGORIAS.map(cat => `
      <button type="button" class="pick${estado.categoria?.id === cat.id ? ' sel' : ''}" data-cat="${cat.id}">
        <span class="tick">✓</span>
        <span class="sub">${cat.nivel}</span>
        <h3>${cat.nombre}</h3>
        <p>${cat.resumen}</p>
        <span class="price"><span>${cat.edadTxt}</span><b>${CLP(cat.precio)}</b></span>
      </button>`).join('');

    $$('#cat-grid .pick').forEach(btn => btn.addEventListener('click', () => {
      estado.categoria = categoriaPorId(btn.dataset.cat);
      estado.equipo = null;
      pintarCategorias();
      pintarEquipos();
      pintarResumen();
      revisarPaso1();
    }));
  }

  function pintarEquipos() {
    const bloque = $('#team-block');
    if (!estado.categoria) { bloque.hidden = true; return; }
    bloque.hidden = false;

    $('#team-pick').innerHTML = estado.categoria.equipos.map(eq => {
      const libres = cuposDe(eq);
      return `
      <button type="button" class="pick${estado.equipo?.id === eq.id ? ' sel' : ''}${libres === 0 ? ' full' : ''}" data-team="${eq.id}">
        <span class="tick">✓</span>
        <h3>${eq.nombre}</h3>
        <p style="min-height:auto">${eq.horario}<br>Coach ${eq.coach}</p>
        <span class="price"><span>${libres === 0 ? 'Sin cupos' : `${libres} cupos libres`}</span><b>${eq.cupos - libres}/${eq.cupos}</b></span>
      </button>`;
    }).join('');

    $$('#team-pick .pick').forEach(btn => btn.addEventListener('click', () => {
      estado.equipo = estado.categoria.equipos.find(e => e.id === btn.dataset.team);
      pintarEquipos();
      pintarResumen();
      revisarPaso1();
    }));
  }

  function revisarPaso1() {
    $('#ir-ficha').disabled = !(estado.categoria && estado.equipo);
  }

  function sugerirPorEdad(edad) {
    const caja = $('#age-hint');
    if (!edad || edad < 3 || edad > 19) { caja.hidden = true; return; }
    const cat = categoriaPorEdad(edad);
    caja.hidden = false;
    if (!cat) {
      caja.innerHTML = `<span>Con ${edad} años conviene hablar con el club: escríbenos y vemos el equipo adecuado.</span>`;
      return;
    }
    caja.innerHTML = `<span>Con ${edad} años le corresponde <b>${cat.nombre}</b> (${cat.edadTxt}). La dejamos seleccionada.</span>`;
    if (estado.categoria?.id !== cat.id) {
      estado.categoria = cat;
      estado.equipo = null;
      pintarCategorias();
      pintarEquipos();
      pintarResumen();
      revisarPaso1();
    }
  }

  /* --- Paso 2: ficha -------------------------------------------------------- */

  const campo = id => $(`#${id}`);
  const marcarError = (id, hay) => campo(id).closest('.field')?.classList.toggle('invalid', hay);

  function validarFicha() {
    const v = id => campo(id).value.trim();
    const datos = {
      nombre: v('f-nombre'),
      nacimiento: v('f-nacimiento'),
      apoderado: v('f-apoderado'),
      telefono: v('f-telefono').replace(/\D/g, ''),
      email: v('f-email'),
      talla: v('f-talla'),
      genero: v('f-genero'),
      medico: v('f-medico'),
      emergencia: v('f-emergencia'),
      prueba: campo('f-prueba').checked,
      hermana: campo('f-hermana').checked
    };

    const errores = [];
    marcarError('f-nombre', datos.nombre.length < 3);
    if (datos.nombre.length < 3) errores.push('Escribe el nombre de la deportista.');

    marcarError('f-nacimiento', !datos.nacimiento);
    if (!datos.nacimiento) errores.push('Falta la fecha de nacimiento.');

    marcarError('f-apoderado', datos.apoderado.length < 3);
    if (datos.apoderado.length < 3) errores.push('Escribe el nombre del apoderado.');

    marcarError('f-telefono', datos.telefono.length < 8);
    if (datos.telefono.length < 8) errores.push('Revisa el WhatsApp del apoderado (8 o 9 dígitos).');

    if (!campo('f-terminos').checked) errores.push('Debes autorizar la participación para continuar.');

    if (errores.length) { toast(errores[0], 'err'); return false; }

    /* Aviso —no bloqueante— si la edad no calza con la categoría elegida */
    const edad = edadDesde(datos.nacimiento);
    if (edad !== null && (edad < estado.categoria.edad[0] || edad > estado.categoria.edad[1])) {
      toast(`Ojo: con ${edad} años no calza con ${estado.categoria.nombre}. El club lo revisará en la evaluación.`);
    }

    estado.ficha = datos;
    return true;
  }

  /* --- Paso 3: revisión ----------------------------------------------------- */

  function totales() {
    const cat = estado.categoria;
    const mensual = estado.ficha?.hermana ? Math.round(cat.precio * (1 - CLUB.descuentoHermanos)) : cat.precio;
    const matricula = estado.ficha?.prueba ? 0 : CLUB.matricula;
    return { mensual, matricula, total: mensual + matricula, descuento: estado.ficha?.hermana ? cat.precio - mensual : 0 };
  }

  function pintarResumen() {
    const cuerpo = $('#summary-body');
    if (!estado.categoria) {
      cuerpo.innerHTML = '<p class="sum-empty">Elige una categoría para ver el detalle de matrícula y mensualidad.</p>';
      return;
    }
    const t = totales();
    cuerpo.innerHTML = `
      <div class="sum-row"><span>Categoría</span><b>${estado.categoria.nombre}</b></div>
      <div class="sum-row"><span>Equipo</span><b>${estado.equipo ? estado.equipo.nombre : '—'}</b></div>
      <div class="sum-row"><span>Horario</span><b>${estado.equipo ? estado.equipo.horario : '—'}</b></div>
      <div class="sum-row"><span>Mensualidad</span><b>${CLP(t.mensual)}</b></div>
      ${t.descuento ? `<div class="sum-row"><span>Descuento hermanas</span><b style="color:var(--ok)">−${CLP(t.descuento)}</b></div>` : ''}
      <div class="sum-row"><span>Matrícula</span><b>${t.matricula ? CLP(t.matricula) : 'Tras la clase de prueba'}</b></div>
      <div class="sum-total"><span>Total a pagar hoy</span><b>${CLP(t.total)}</b></div>
      <p style="font-size:11.5px;color:var(--muted-2)">Los valores de competencias, uniforme y viajes se informan aparte.</p>`;
  }

  function pintarRevision() {
    const t = totales();
    const f = estado.ficha;
    const edad = edadDesde(f.nacimiento);
    $('#review').innerHTML = `
      <div class="review-row"><span>Deportista</span><b>${f.nombre}${edad !== null ? ` · ${edad} años` : ''}</b></div>
      <div class="review-row"><span>Categoría y equipo</span><b>${estado.categoria.nombre} · ${estado.equipo.nombre}</b></div>
      <div class="review-row"><span>Horario</span><b>${estado.equipo.horario} · Coach ${estado.equipo.coach}</b></div>
      <div class="review-row"><span>Apoderado</span><b>${f.apoderado} · +56 ${f.telefono}</b></div>
      ${f.medico ? `<div class="review-row"><span>Condición médica</span><b>${f.medico}</b></div>` : ''}
      <div class="review-row"><span>Mensualidad</span><b>${CLP(t.mensual)}${t.descuento ? ' (con descuento hermanas)' : ''}</b></div>
      <div class="review-row"><span>Matrícula</span><b>${t.matricula ? CLP(t.matricula) : 'Se paga después de la clase de prueba'}</b></div>
      <div class="review-row"><span>Total hoy</span><b style="color:var(--gold);font-size:16px">${CLP(t.total)}</b></div>`;

    $('#nota-pago').textContent = f.prueba
      ? 'Con clase de prueba: hoy no se cobra matrícula, solo se reserva el cupo.'
      : 'Matrícula por única vez más la primera mensualidad.';
  }

  /* --- Aviso al club --------------------------------------------------------- */

  /* Resumen legible que viaja igual por correo y por WhatsApp */
  function resumenInscripcion(nueva, t) {
    const f = estado.ficha;
    return [
      `Nueva inscripción · ${CLUB.corto}`,
      `Deportista: ${f.nombre} (${f.nacimiento})`,
      `Categoría: ${estado.categoria.nombre} · Equipo: ${estado.equipo.nombre}`,
      `Horario: ${estado.equipo.horario} · Coach: ${estado.equipo.coach}`,
      `Apoderado: ${f.apoderado} · +56 ${f.telefono}${f.email ? ` · ${f.email}` : ''}`,
      f.medico ? `Condición médica: ${f.medico}` : null,
      f.emergencia ? `Emergencia: ${f.emergencia}` : null,
      `Mensualidad: ${CLP(t.mensual)}${t.descuento ? ' (descuento hermanos)' : ''}`,
      `Matrícula: ${t.matricula ? CLP(t.matricula) : 'tras la clase de prueba'}`,
      `Forma de pago elegida: ${estado.pago}`,
      `Código: ${nueva.id}`
    ].filter(Boolean).join('\n');
  }

  /* Intenta el correo si hay endpoint configurado. No bloquea la confirmación:
     si falla, la inscripción ya quedó guardada y queda el envío por WhatsApp. */
  async function avisarAlClub(nueva, t) {
    if (!CLUB.formEndpoint) return { estado: 'sin-endpoint' };
    try {
      const r = await fetch(CLUB.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          asunto: `Inscripción ${nueva.id} · ${estado.ficha.nombre}`,
          resumen: resumenInscripcion(nueva, t),
          deportista: estado.ficha.nombre,
          equipo: estado.equipo.nombre,
          apoderado: estado.ficha.apoderado,
          telefono: `+56${estado.ficha.telefono}`,
          email: estado.ficha.email || ''
        })
      });
      return { estado: r.ok ? 'enviado' : 'error', codigo: r.status };
    } catch (e) {
      return { estado: 'error', detalle: String(e) };
    }
  }

  /* --- Confirmación --------------------------------------------------------- */

  function lanzarConfeti() {
    if (window.DEUI.noMotion) return;
    const caja = document.createElement('div');
    caja.className = 'confetti';
    const colores = ['#e8c86a', '#fff2cd', '#c89b3c', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${-10 - Math.random() * 30}vh`;
      p.style.background = colores[i % colores.length];
      p.style.animationDuration = `${2.2 + Math.random() * 2}s`;
      p.style.animationDelay = `${Math.random() * .6}s`;
      caja.appendChild(p);
    }
    document.body.appendChild(caja);
    setTimeout(() => caja.remove(), 5200);
  }

  function confirmar() {
    const t = totales();
    const nueva = Store.inscribir({
      nombre: estado.ficha.nombre,
      nacimiento: estado.ficha.nacimiento,
      categoria: estado.categoria.id,
      equipo: estado.equipo.id,
      apoderado: estado.ficha.apoderado,
      telefono: estado.ficha.telefono,
      email: estado.ficha.email,
      medico: estado.ficha.medico,
      emergencia: estado.ficha.emergencia,
      talla: estado.ficha.talla,
      genero: estado.ficha.genero,
      notas: `Inscripción web · pago ${estado.pago}${estado.ficha.prueba ? ' · clase de prueba' : ''}`
    });

    /* Deja la sesión del apoderado abierta: al salir de aquí entra directo a su portal */
    Store.sesionApoderado.abrir(estado.ficha.telefono);

    $('#done-nombre').textContent = `${estado.ficha.genero === 'm' ? '¡Bienvenido' : '¡Bienvenida'}, ${nueva.nombre.split(' ')[0]}!`;
    $('#done-copy').textContent = estado.ficha.prueba
      ? 'Reservamos el cupo para la clase de evaluación. El club confirmará el día y la hora por WhatsApp.'
      : 'La ficha quedó registrada. El club se contactará por WhatsApp para coordinar uniforme y horarios.';
    $('#done-card').innerHTML = `
      <b>${estado.categoria.nombre} · ${estado.equipo.nombre}</b>
      <span>${estado.equipo.horario} · Coach ${estado.equipo.coach}</span>
      <span>${CLP(t.mensual)} mensual${t.matricula ? ` · matrícula ${CLP(t.matricula)}` : ' · matrícula pendiente'}</span>
      <span style="color:var(--gold)">Ya puedes entrar a tu portal con el +56 ${estado.ficha.telefono}</span>`;
    $('#done-code').textContent = `Código de inscripción ${nueva.id} · ${new Date().toLocaleDateString('es-CL')}`;

    /* Botón que manda la inscripción al WhatsApp del club: funciona hoy, sin
       servidor, y es el canal que las familias de verdad usan. */
    const wa = $('#enviar-wa');
    if (wa) {
      wa.href = `https://wa.me/${CLUB.whatsapp}?text=${encodeURIComponent(resumenInscripcion(nueva, t))}`;
      wa.hidden = false;
    }

    ir(4);
    lanzarConfeti();
    toast('Inscripción registrada en el panel del club.');

    avisarAlClub(nueva, t).then(r => {
      const aviso = $('#estado-envio');
      if (!aviso) return;
      if (r.estado === 'enviado') aviso.textContent = 'Aviso enviado al correo del club.';
      else if (r.estado === 'error') aviso.textContent = 'No pudimos avisar por correo. Usa el botón de WhatsApp para que el club se entere ahora.';
      else aviso.textContent = 'Avísale al club por WhatsApp para que reserve el cupo hoy.';
    });
  }

  function reiniciar() {
    estado.categoria = null; estado.equipo = null; estado.ficha = null; estado.pago = 'transferencia';
    $('#ficha').reset();
    $('#edad-hint').value = '';
    $('#age-hint').hidden = true;
    $$('.field.invalid').forEach(f => f.classList.remove('invalid'));
    pintarCategorias(); pintarEquipos(); pintarResumen(); revisarPaso1();
    ir(1);
  }

  /* --- Preselección desde la landing ---------------------------------------- */

  function preseleccion() {
    const params = new URLSearchParams(location.search);
    const equipoId = params.get('equipo');
    const catId = params.get('cat');
    const programa = params.get('programa');

    if (equipoId) {
      const eq = equipoPorId(equipoId);
      if (eq) {
        estado.categoria = categoriaPorId(eq.categoriaId);
        estado.equipo = estado.categoria.equipos.find(e => e.id === eq.id);
      }
    } else if (catId && categoriaPorId(catId)) {
      estado.categoria = categoriaPorId(catId);
    }
    if (programa) toast('Escríbenos por WhatsApp para los cupos de las clases abiertas.');
  }

  /* --- Arranque ------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', () => {
    preseleccion();
    pintarCategorias();
    pintarEquipos();
    pintarResumen();
    revisarPaso1();
    initReveal();

    $('#edad-hint').addEventListener('input', e => sugerirPorEdad(Number(e.target.value)));

    $('#ir-ficha').addEventListener('click', () => ir(2));
    $('#ir-confirmar').addEventListener('click', () => {
      if (!validarFicha()) return;
      pintarResumen();
      pintarRevision();
      ir(3);
    });
    $('#confirmar').addEventListener('click', confirmar);
    $('#otra').addEventListener('click', reiniciar);

    $$('[data-back]').forEach(b => b.addEventListener('click', () => ir(Number(b.dataset.back))));
    $$('.wstep').forEach((s, i) => s.addEventListener('click', () => {
      if (i + 1 < estado.paso && estado.paso < 4) ir(i + 1);
    }));

    $$('#pay-methods .pay').forEach(p => p.addEventListener('click', () => {
      estado.pago = p.dataset.pay;
      $$('#pay-methods .pay').forEach(x => x.classList.toggle('sel', x === p));
    }));

    /* El descuento por hermanas y la clase de prueba cambian el total en vivo */
    ['f-hermana', 'f-prueba'].forEach(id => $(`#${id}`).addEventListener('change', () => {
      if (!estado.ficha) estado.ficha = { hermana: $('#f-hermana').checked, prueba: $('#f-prueba').checked };
      else { estado.ficha.hermana = $('#f-hermana').checked; estado.ficha.prueba = $('#f-prueba').checked; }
      pintarResumen();
    }));

    /* Limpia el error del campo al corregirlo */
    $$('#ficha input, #ficha textarea').forEach(el =>
      el.addEventListener('input', () => el.closest('.field')?.classList.remove('invalid')));
  });
})();
