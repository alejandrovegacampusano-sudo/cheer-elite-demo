/* ==========================================================================
   Dragones Elite — Capa de datos del prototipo
   --------------------------------------------------------------------------
   Persiste en localStorage y siembra un club realista la primera vez, para
   que el panel se vea como una temporada en curso y no como una demo vacía.
   Sustituir estas funciones por llamadas a una API es el único cambio
   necesario para convertir el prototipo en producto real.
   ========================================================================== */

(function () {
  const NS = 'de.v2.';
  const { CATEGORIAS, CLUB, todosLosEquipos, equipoPorId, categoriaPorId } = window.DE;

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch { /* modo privado */ }
  };

  /* --- Generador pseudoaleatorio determinista (mismo club en cada visita) --- */
  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  const NOMBRES_M = ['Matías', 'Benjamín', 'Vicente', 'Agustín', 'Tomás', 'Lucas', 'Joaquín', 'Cristóbal', 'Diego', 'Bastián', 'Emilio', 'Maximiliano'];
  const NOMBRES = ['Martina', 'Antonella', 'Fernanda', 'Josefa', 'Valentina', 'Camila', 'Isidora', 'Emilia', 'Florencia', 'Catalina', 'Amanda', 'Agustina', 'Renata', 'Julieta', 'Trinidad', 'Magdalena', 'Sofía', 'Rafaela', 'Maite', 'Colomba', 'Ignacia', 'Anaís', 'Krishna', 'Belén', 'Constanza', 'Javiera', 'Amaya', 'Pascale', 'Laura', 'Mía'];
  const APELLIDOS = ['Vega', 'Rojas', 'Soto', 'Muñoz', 'Díaz', 'Pérez', 'Araya', 'Cortés', 'Fuentes', 'Riquelme', 'Salinas', 'Cáceres', 'Bravo', 'Yáñez', 'Peña', 'Contreras', 'Godoy', 'Molina', 'Tapia', 'Guerrero', 'Reyes', 'Navarro', 'Espinoza', 'Valdés', 'Carrasco', 'Ibarra', 'Zapata', 'Maldonado'];
  const TUTORES = ['Paulina', 'Rodrigo', 'Carolina', 'Marcela', 'Cristián', 'Andrea', 'Jorge', 'Daniela', 'Patricia', 'Sebastián', 'Verónica', 'Claudio', 'Pamela', 'Nicolás'];
  const TALLAS = ['XS', 'S', 'M', 'L'];
  const MEDICO = ['', '', '', '', 'Asma leve (usa inhalador)', '', 'Alergia a mariscos', '', 'Lente de contacto', '', 'Rodilla en recuperación', ''];

  const iso = d => d.toISOString().slice(0, 10);
  const mesKey = d => d.toISOString().slice(0, 7);

  function mesesRecientes(n) {
    const hoy = new Date();
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1);
      return mesKey(d);
    });
  }

  /* --- Siembra ------------------------------------------------------------ */

  function sembrarDeportistas() {
    const rand = rng(20260301);
    const pick = arr => arr[Math.floor(rand() * arr.length)];
    const lista = [];
    const hoy = new Date();
    /* Recorre los nombres con pasos coprimos al largo de la lista: cada nombre
       aparece un número parecido de veces en vez de repetirse por azar. */
    const enOrden = (arr, i, paso) => arr[(i * paso) % arr.length];

    CATEGORIAS.forEach(cat => cat.equipos.forEach(eq => {
      for (let i = 0; i < eq.inscritas; i++) {
        const edad = cat.edad[0] + Math.floor(rand() * (cat.edad[1] - cat.edad[0] + 1));
        /* Cumpleaños ya ocurrido este año: la edad mostrada calza con la categoría */
        const nac = new Date(hoy.getFullYear() - edad, Math.floor(rand() * (hoy.getMonth() + 1)), 1 + Math.floor(rand() * 27));
        const antiguedadMeses = Math.floor(rand() * 46);
        const ingreso = new Date(hoy.getFullYear(), hoy.getMonth() - antiguedadMeses, 1 + Math.floor(rand() * 27));
        const apellido = enOrden(APELLIDOS, lista.length, 5);
        /* El club es mixto: en cheer competitivo los equipos coed son la norma
           en las categorías mayores. Uno de cada cinco es varón. */
        const varon = lista.length % 5 === 2;
        const nombrePila = varon ? enOrden(NOMBRES_M, lista.length, 3) : enOrden(NOMBRES, lista.length, 7);
        lista.push({
          id: `A${(1000 + lista.length).toString()}`,
          genero: varon ? 'm' : 'f',
          nombre: `${nombrePila} ${apellido}`,
          nacimiento: iso(nac),
          equipo: eq.id,
          categoria: cat.id,
          apoderado: `${pick(TUTORES)} ${apellido}`,
          telefono: `9${Math.floor(10000000 + rand() * 89999999)}`,
          email: '',
          medico: pick(MEDICO),
          emergencia: '',
          talla: pick(TALLAS),
          ingreso: iso(ingreso),
          estado: rand() < 0.05 ? 'pausa' : 'activa',
          beca: rand() < 0.06,
          origen: 'seed'
        });
      }
    }));

    /* Algunas familias tienen más de una hija en el club: comparten apoderado y
       teléfono, para que el portal de apoderados muestre a las dos hermanas. */
    const rand2 = rng(4242);
    for (let i = 0; i < 12; i++) {
      const a = lista[Math.floor(rand2() * lista.length)];
      const b = lista[Math.floor(rand2() * lista.length)];
      if (!a || !b || a.id === b.id) continue;
      b.apoderado = a.apoderado;
      b.telefono = a.telefono;
      b.nombre = `${b.nombre.split(' ')[0]} ${a.apoderado.split(' ')[1]}`;
    }
    return lista;
  }

  function sembrarPagos(deportistas) {
    const rand = rng(777);
    const meses = mesesRecientes(6);
    const mesActual = meses[meses.length - 1];
    const pagos = {};
    deportistas.forEach(a => {
      const cat = categoriaPorId(a.categoria);
      const monto = a.beca ? Math.round(cat.precio * 0.5) : cat.precio;
      meses.forEach(mes => {
        if (mes < a.ingreso.slice(0, 7)) return;
        const esActual = mes === mesActual;
        const r = rand();
        let estado = 'pagado';
        if (esActual) estado = r < 0.72 ? 'pagado' : (r < 0.93 ? 'pendiente' : 'vencido');
        else if (r < 0.015) estado = 'vencido';
        pagos[`${a.id}|${mes}`] = {
          estado,
          monto,
          medio: estado === 'pagado' ? (rand() < 0.65 ? 'Transferencia' : 'Débito') : null,
          fecha: estado === 'pagado' ? `${mes}-${String(2 + Math.floor(rand() * 8)).padStart(2, '0')}` : null
        };
      });
    });
    return pagos;
  }

  function sembrarEventos() {
    const hoy = new Date();
    const d = n => iso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n));
    return [
      { id: 'E0', fecha: d(-9), titulo: 'Ensayo general de rutina',        tipo: 'entreno',     hora: '18:00', lugar: 'Gimnasio' },
      { id: 'E0b', fecha: d(-3), titulo: 'Reunión de apoderados',          tipo: 'club',        hora: '19:30', lugar: 'Gimnasio' },
      { id: 'E1', fecha: d(2),  titulo: 'Evaluación de nuevas deportistas', tipo: 'club',        hora: '17:00', lugar: 'Gimnasio' },
      { id: 'E2', fecha: d(6),  titulo: 'Entrenamiento extra Senior Elite', tipo: 'entreno',     hora: '19:30', lugar: 'Gimnasio' },
      { id: 'E3', fecha: d(11), titulo: 'Toma de medidas de uniformes',     tipo: 'club',        hora: '16:30', lugar: 'Gimnasio' },
      { id: 'E4', fecha: d(18), titulo: 'Regional Norte Grande',            tipo: 'competencia', hora: '09:00', lugar: 'Antofagasta' },
      { id: 'E5', fecha: d(25), titulo: 'Cierre de mensualidades',          tipo: 'pago',        hora: '23:59', lugar: 'Online' },
      { id: 'E6', fecha: d(33), titulo: 'Showcase de temporada',            tipo: 'competencia', hora: '18:00', lugar: 'Teatro Municipal' }
    ];
  }

  /* --- API interna -------------------------------------------------------- */

  function deportistas() {
    let lista = read('atletas', null);
    if (!lista) { lista = sembrarDeportistas(); write('atletas', lista); }
    return lista;
  }

  function pagos() {
    let mapa = read('pagos', null);
    if (!mapa) { mapa = sembrarPagos(deportistas()); write('pagos', mapa); }
    return mapa;
  }

  function eventos() {
    let lista = read('eventos', null);
    if (!lista) { lista = sembrarEventos(); write('eventos', lista); }
    return lista;
  }

  function asistencia() { return read('asistencia', {}); }

  function sembrarAvisos() {
    const hoy = new Date();
    const d = n => iso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n));
    return [
      { id: 'V1', fecha: d(-1), titulo: 'Uniformes de competencia',
        texto: 'La toma de medidas es el próximo sábado en el gimnasio. Si no pueden asistir, avisen por WhatsApp para coordinar otro horario.',
        alcance: 'todos' },
      { id: 'V2', fecha: d(-4), titulo: 'Cierre de mensualidades',
        texto: 'Recuerden que la mensualidad vence los días 5. Después de esa fecha el estado cambia a pendiente en el portal.',
        alcance: 'todos' },
      { id: 'V3', fecha: d(-8), titulo: 'Viaje al Regional Norte Grande',
        texto: 'Las deportistas convocadas viajan el viernes por la mañana. La reunión informativa con los apoderados es el miércoles a las 19:30.',
        alcance: 'todos' }
    ];
  }

  function avisos() {
    let lista = read('avisos', null);
    if (!lista) { lista = sembrarAvisos(); write('avisos', lista); }
    return lista;
  }

  const Store = {
    meses: mesesRecientes,
    mesActual: () => mesKey(new Date()),

    deportistas,
    pagos,
    eventos,
    asistencia,

    /* Alta desde el formulario público */
    inscribir(datos) {
      const lista = deportistas();
      const id = `A${2000 + lista.filter(a => a.origen === 'web').length}`;
      const cat = categoriaPorId(datos.categoria);
      const nueva = { ...datos, id, origen: 'web', estado: 'activa', beca: false, ingreso: iso(new Date()), genero: datos.genero || 'f' };
      lista.unshift(nueva);
      write('atletas', lista);

      const mapa = pagos();
      mapa[`${id}|${Store.mesActual()}`] = {
        estado: 'pagado', monto: cat.precio, medio: 'Inscripción web', fecha: iso(new Date())
      };
      write('pagos', mapa);
      return nueva;
    },

    actualizar(id, cambios) {
      const lista = deportistas().map(a => (a.id === id ? { ...a, ...cambios } : a));
      write('atletas', lista);
      return lista.find(a => a.id === id);
    },

    eliminar(id) {
      write('atletas', deportistas().filter(a => a.id !== id));
    },

    marcarPago(id, mes, estado) {
      const mapa = pagos();
      const cat = categoriaPorId(deportistas().find(a => a.id === id).categoria);
      const previo = mapa[`${id}|${mes}`] || { monto: cat.precio };
      mapa[`${id}|${mes}`] = {
        ...previo,
        estado,
        medio: estado === 'pagado' ? (previo.medio || 'Registro manual') : null,
        fecha: estado === 'pagado' ? iso(new Date()) : null
      };
      write('pagos', mapa);
      return mapa[`${id}|${mes}`];
    },

    pagoDe(id, mes) { return pagos()[`${id}|${mes}`] || null; },

    marcarAsistencia(id, fecha, presente) {
      const mapa = asistencia();
      mapa[`${id}|${fecha}`] = presente;
      write('asistencia', mapa);
    },

    asistenciaDe(id, fecha) {
      const mapa = asistencia();
      const clave = `${id}|${fecha}`;
      if (clave in mapa) return mapa[clave];
      /* Valor por defecto determinista: la misma deportista tiene el mismo
         historial en cada visita hasta que alguien pase lista de verdad. */
      const semilla = [...clave].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      return rng(semilla)() > 0.12;
    },

    agregarEvento(evento) {
      const lista = eventos();
      lista.push({ ...evento, id: `E${Date.now().toString().slice(-6)}` });
      lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
      write('eventos', lista);
      return lista;
    },

    eliminarEvento(id) { write('eventos', eventos().filter(e => e.id !== id)); },

    /* Métricas del panel */
    resumen() {
      const lista = deportistas();
      const mes = Store.mesActual();
      const activas = lista.filter(a => a.estado === 'activa');
      const pagosMes = activas.map(a => Store.pagoDe(a.id, mes)).filter(Boolean);
      const alDia = pagosMes.filter(p => p.estado === 'pagado');
      const morosas = pagosMes.filter(p => p.estado === 'vencido');
      const recaudado = alDia.reduce((s, p) => s + p.monto, 0);
      const proyectado = pagosMes.reduce((s, p) => s + p.monto, 0);
      const nuevasMes = lista.filter(a => a.ingreso.slice(0, 7) === mes).length;
      return {
        total: lista.length,
        activas: activas.length,
        pausas: lista.length - activas.length,
        equipos: todosLosEquipos().length,
        alDia: alDia.length,
        pendientes: pagosMes.length - alDia.length - morosas.length,
        morosas: morosas.length,
        recaudado,
        proyectado,
        cobranza: proyectado ? recaudado / proyectado : 0,
        nuevasMes,
        ocupacion: Store.ocupacion()
      };
    },

    ocupacion() {
      const lista = deportistas().filter(a => a.estado === 'activa');
      const total = todosLosEquipos().reduce((s, eq) => s + eq.cupos, 0);
      return { ocupados: lista.length, total, pct: total ? lista.length / total : 0 };
    },

    /* Serie de ingresos de los últimos meses */
    serieIngresos(n = 6) {
      return Store.meses(n).map(mes => {
        const total = deportistas().reduce((s, a) => {
          const p = Store.pagoDe(a.id, mes);
          return s + (p && p.estado === 'pagado' ? p.monto : 0);
        }, 0);
        return { mes, total };
      });
    },

    porEquipo() {
      const mes = Store.mesActual();
      return todosLosEquipos().map(eq => {
        const lista = deportistas().filter(a => a.equipo === eq.id);
        const activas = lista.filter(a => a.estado === 'activa');
        const alDia = activas.filter(a => (Store.pagoDe(a.id, mes) || {}).estado === 'pagado').length;
        return {
          ...eq,
          deportistas: lista.length,
          activas: activas.length,
          alDia,
          cobranza: activas.length ? alDia / activas.length : 1,
          ocupacion: eq.cupos ? lista.length / eq.cupos : 0
        };
      });
    },

    avisos,

    publicarAviso(aviso) {
      const lista = avisos();
      lista.unshift({ ...aviso, id: `V${Date.now().toString().slice(-6)}`, fecha: iso(new Date()) });
      write('avisos', lista);
      return lista;
    },

    eliminarAviso(id) { write('avisos', avisos().filter(v => v.id !== id)); },

    /* --- Apoderados ------------------------------------------------------- */

    /* Un apoderado se identifica por su teléfono: puede tener varias hijas. */
    hijasDe(telefono) {
      const limpio = String(telefono).replace(/\D/g, '').slice(-9);
      return deportistas().filter(a => a.telefono.slice(-9) === limpio);
    },

    /* Últimas clases de una deportista según el horario de su equipo */
    /* Días de la semana en que entrena un equipo, leídos de su horario
       configurado ("Lun, Mié y Vie · 17:30" → [1, 3, 5]). Devuelve también la
       hora, para el calendario del portal. */
    horarioDe(equipo) {
      const eq = typeof equipo === 'string' ? equipoPorId(equipo) : equipo;
      if (!eq) return { dias: [], hora: '' };
      const mapa = { lun: 1, mar: 2, mié: 3, mie: 3, jue: 4, vie: 5, sáb: 6, sab: 6, dom: 0 };
      const texto = eq.horario.toLowerCase();
      let dias = Object.keys(mapa).filter(d => texto.includes(d)).map(d => mapa[d]);
      if (texto.includes('a vie')) dias = [1, 2, 3, 4, 5];
      if (texto.includes('a jue')) dias = [1, 2, 3, 4];
      dias = [...new Set(dias)];
      if (!dias.length) dias = [2, 4];
      return { dias, hora: (eq.horario.match(/\d{1,2}:\d{2}/) || [''])[0] };
    },

    ultimasClases(atleta, cuantas = 6) {
      const eq = equipoPorId(atleta.equipo);
      if (!eq) return [];
      const { dias } = Store.horarioDe(eq);

      const clases = [];
      const cursor = new Date();
      for (let i = 0; i < 60 && clases.length < cuantas; i++) {
        if (dias.includes(cursor.getDay())) {
          const fecha = iso(cursor);
          if (fecha >= atleta.ingreso) {
            clases.push({ fecha, presente: Store.asistenciaDe(atleta.id, fecha) });
          }
        }
        cursor.setDate(cursor.getDate() - 1);
      }
      return clases;
    },

    sesionApoderado: {
      actual: () => read('apoderado', null),
      abrir: telefono => write('apoderado', String(telefono).replace(/\D/g, '').slice(-9)),
      cerrar: () => write('apoderado', null)
    },

    sesion: {
      abierta: () => read('sesion', false),
      abrir: () => write('sesion', { desde: Date.now() }),
      cerrar: () => write('sesion', false)
    },

    reiniciar() {
      ['atletas', 'pagos', 'eventos', 'asistencia', 'avisos'].forEach(k => localStorage.removeItem(NS + k));
    },

    exportarCSV() {
      const mes = Store.mesActual();
      const cabecera = ['ID', 'Deportista', 'Nacimiento', 'Género', 'Categoría', 'Equipo', 'Apoderado', 'Teléfono', 'Estado', 'Mensualidad', 'Pago del mes'];
      const filas = deportistas().map(a => {
        const eq = equipoPorId(a.equipo) || {};
        const cat = categoriaPorId(a.categoria) || {};
        const pago = Store.pagoDe(a.id, mes) || {};
        return [a.id, a.nombre, a.nacimiento, a.genero === 'm' ? 'M' : 'F', cat.nombre || '', eq.nombre || '', a.apoderado, `+56${a.telefono}`, a.estado, pago.monto || cat.precio || '', pago.estado || 'sin registro'];
      });
      return [cabecera, ...filas]
        .map(fila => fila.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    }
  };

  window.DE.Store = Store;
  window.DE.CLUB_NS = NS;
})();
