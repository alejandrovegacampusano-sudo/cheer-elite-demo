/* ==========================================================================
   Dragones Elite — Finanzas del club y piloto automático
   --------------------------------------------------------------------------
   Lo que un entrenador no debería hacer a mano:
   · perseguir a cada familia por WhatsApp para cobrar,
   · revisar la cuenta del banco para ver quién transfirió,
   · hacer comprobantes,
   · llevar en un cuaderno las cuotas del viaje o del uniforme,
   · armar el Excel de la rendición de cuentas.

   Este módulo lo hace solo. La unidad es la FAMILIA (el apoderado y sus
   hijos en el club): cada una tiene un estado de cuenta con cargos
   (mensualidades y cuotas extra) y pagos con comprobante. La caja suma lo
   cobrado y los gastos, y de ahí sale la rendición mensual.

   El piloto corre cada vez que se abre el panel. Es idempotente: lo que ya
   hizo no lo repite, y deja registro de todo en la bitácora.

   Todo vive en localStorage (prefijo de.v2.fin.*). Para producción, estas
   funciones pasan a ser llamadas a una API sin tocar las vistas.
   ========================================================================== */

(function () {
  const { CLUB, CLP, Store, categoriaPorId, equipoPorId } = window.DE;
  const NS = window.DE.CLUB_NS + 'fin.';

  const read = (k, f) => { try { const r = localStorage.getItem(NS + k); return r ? JSON.parse(r) : f; } catch { return f; } };
  const write = (k, v) => { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch { /* sin espacio o modo privado */ } };
  const writeStore = (k, v) => { try { localStorage.setItem(window.DE.CLUB_NS + k, JSON.stringify(v)); } catch { /* idem */ } };

  /* --- Fechas (hora local de Chile, no UTC) -------------------------------- */
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoy = () => fmt(new Date());
  const desdeISO = s => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d || 1); };
  const sumarMeses = (s, n) => { const d = desdeISO(s); return fmt(new Date(d.getFullYear(), d.getMonth() + n, d.getDate())); };
  const sumarDias = (s, n) => { const d = desdeISO(s); d.setDate(d.getDate() + n); return fmt(d); };
  const diasEntre = (a, b) => Math.round((desdeISO(b) - desdeISO(a)) / 864e5);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesLargo = m => { const [a, n] = m.split('-'); return `${MESES[Number(n) - 1]} ${a}`; };
  const fechaCorta = s => { const d = desdeISO(s); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; };

  /* Texto comparable: sin tildes, mayúsculas, un espacio */
  const plano = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ==========================================================================
     Configuración del piloto
     ========================================================================== */

  const PILOTO_BASE = {
    activo: true,
    diaVence: 5,                 // la mensualidad vence este día de cada mes
    recordatorios: [
      { id: 'aviso',   dias: -3, nombre: 'Aviso previo',    texto: 'Hola {apoderado}, te recordamos que se acerca el vencimiento de:\n{detalle}\nTotal {total}. Puedes pagar en línea desde el portal: {portal}\n¡Gracias! — {club}' },
      { id: 'vencido', dias: 1,  nombre: 'Recién vencido',  texto: 'Hola {apoderado}, a la fecha tenemos pendiente:\n{detalle}\nTotal {total}. Paga en {portal} o respóndenos si ya transferiste. — {club}' },
      { id: 'segundo', dias: 10, nombre: 'Segundo aviso',   texto: 'Hola {apoderado}, seguimos con este saldo pendiente:\n{detalle}\nTotal {total}. Si necesitas pagarlo en partes, respóndenos y lo conversamos. — {club}' }
    ],
    escalarDias: 30,             // pasado esto, deja de insistir y te lo muestra a ti
    conciliarSolo: true,         // aplica sola la transferencia cuando calzan nombre y monto
    rendicionDia: 3,             // publica la rendición del mes anterior este día
    comprobantes: true
  };

  const piloto = () => ({ ...PILOTO_BASE, ...read('piloto', {}) });
  const guardarPiloto = cambios => write('piloto', { ...read('piloto', {}), ...cambios });

  /* Minutos que toma cada tarea hecha a mano. Se muestran en pantalla para
     que el cálculo de "tiempo ahorrado" se pueda discutir, no creer. */
  const MINUTOS = { cargos: 0.5, vencidos: 0.5, recordatorios: 3, conciliacion: 4, comprobantes: 2, rendicion: 90, gastos: 2 };

  /* ==========================================================================
     Siembra: cuotas extra, gastos y otros ingresos de una temporada real
     ========================================================================== */

  function sembrarCobros() {
    const mes0 = Store.meses(6)[5];
    return [
      { id: 'C1', nombre: 'Viaje Regional Norte Grande', total: 45000, cuotas: 3,
        primerVence: sumarMeses(sumarDias(hoy(), 5), -2), alcance: { tipo: 'categoria', ids: ['junior', 'senior'] },
        detalle: 'Bus, alojamiento e inscripción en Antofagasta.', creado: sumarMeses(`${mes0}-01`, -3) },
      { id: 'C2', nombre: 'Uniforme de competencia 2026', total: 58000, cuotas: 2,
        primerVence: sumarDias(hoy(), -12), alcance: { tipo: 'categoria', ids: ['junior', 'senior'] },
        detalle: 'Uniforme completo con moño y bolso.', creado: sumarMeses(`${mes0}-01`, -2) }
    ];
  }

  function sembrarPagosCuotas(cobros) {
    const rand = rng(9090);
    const hoyS = hoy();
    const mapa = {};
    const atletas = Store.deportistas();
    cobros.forEach(c => alcanceDe(c, atletas).forEach(a => {
      for (let n = 1; n <= c.cuotas; n++) {
        const vence = sumarMeses(c.primerVence, n - 1);
        if (vence > sumarDias(hoyS, 20)) continue;
        const atraso = diasEntre(vence, hoyS);
        const prob = atraso > 30 ? 0.96 : atraso > 0 ? 0.86 : 0.45;
        if (rand() < prob) {
          const fecha = sumarDias(vence, -Math.floor(rand() * 8));
          mapa[`${a.id}|${c.id}|${n}`] = { fecha: fecha > hoyS ? hoyS : fecha, medio: rand() < 0.7 ? 'Transferencia' : 'Pago en línea' };
        }
      }
    }));
    return mapa;
  }

  function sembrarMovimientos() {
    const rand = rng(5150);
    const meses = Store.meses(6);
    const lista = [];
    let n = 0;
    const mov = (fecha, tipo, categoria, detalle, monto, respaldo = 'Factura', extra = {}) =>
      lista.push({ id: `M${1000 + n++}`, fecha, tipo, categoria, detalle, monto, respaldo, medio: 'Transferencia', ...extra });

    meses.forEach((mes, i) => {
      const actual = i === meses.length - 1;
      const dia = d => `${mes}-${pad(d)}`;
      mov(dia(3), 'egreso', 'Arriendo', 'Arriendo gimnasio', 1100000);
      mov(dia(6), 'egreso', 'Honorarios', 'Honorarios Valentina Soto · dirección técnica', 650000, 'Boleta de honorarios');
      mov(dia(6), 'egreso', 'Honorarios', 'Honorarios Matías Fuentes', 600000, 'Boleta de honorarios');
      mov(dia(6), 'egreso', 'Honorarios', 'Honorarios Camila Ruiz', 480000, 'Boleta de honorarios');
      mov(dia(6), 'egreso', 'Honorarios', 'Honorarios Ignacio Pérez · preparación física', 450000, 'Boleta de honorarios');
      mov(dia(12), 'egreso', 'Servicios básicos', 'Electricidad gimnasio', 90000 + Math.round(rand() * 45000 / 100) * 100, 'Boleta');
      mov(dia(14), 'egreso', 'Servicios básicos', 'Agua potable', 32000 + Math.round(rand() * 18000 / 100) * 100, 'Boleta');
      mov(dia(8), 'egreso', 'Seguros', 'Seguro de accidentes deportivos', 85000, 'Póliza');
      if (!actual) mov(dia(28), 'egreso', 'Comisiones bancarias', 'Comisión mantención cuenta', 8900, 'Cartola bancaria');
      if (i === 1) mov(dia(18), 'egreso', 'Implementos', 'Colchonetas de caída (2)', 480000);
      if (i === 1) mov(dia(20), 'ingreso', 'Auspicios', 'Auspicio temporada · Ferretería del Norte', 300000, 'Factura emitida');
      if (i === 3) mov(dia(16), 'ingreso', 'Actividades', 'Rifa pro-viaje', 412000, 'Planilla de rifa');
      if (i === 4) {
        mov(dia(9), 'egreso', 'Competencias', 'Inscripción Regional Norte Grande (64 deportistas)', 1152000, 'Factura', { cobro: 'C1' });
        mov(dia(22), 'egreso', 'Uniformes', 'Anticipo 50% uniformes de competencia', 1850000, 'Factura', { cobro: 'C2' });
        mov(dia(24), 'ingreso', 'Actividades', 'Venta de colaciones en evaluación', 86500, 'Planilla de caja');
      }
      if (actual) {
        mov(dia(10), 'egreso', 'Viajes', 'Bus a Antofagasta · anticipo', 550000, 'Factura', { cobro: 'C1' });
        mov(dia(17), 'egreso', 'Implementos', 'Cintas, maquillaje y moños para rutina', 23400, '');
        mov(dia(19), 'egreso', 'Otros', 'Colaciones entrenamiento extra Senior', 18000, '');
      }
    });
    return lista.filter(m => m.fecha <= hoy());
  }

  /* ==========================================================================
     Lectura con siembra perezosa
     ========================================================================== */

  function cobros() {
    let l = read('cobros', null);
    if (!l) { l = sembrarCobros(); write('cobros', l); }
    return l;
  }
  function pagosCuotas() {
    let m = read('cuotas', null);
    if (!m) { m = sembrarPagosCuotas(cobros()); write('cuotas', m); }
    return m;
  }
  function movimientos() {
    let l = read('movs', null);
    if (!l) { l = sembrarMovimientos(); write('movs', l); }
    return l;
  }
  const config = () => ({ saldoInicial: 1250000, ...read('config', {}) });
  const comprobantes = () => read('comprobantes', []);
  const recordatorios = () => read('recordatorios', []);
  const revisar = () => read('revisar', []);
  const bitacora = () => read('bitacora', []);
  const convenios = () => read('convenios', {});
  const rendiciones = () => read('rendiciones', {});

  function anotar(tipo, n, detalle) {
    if (!n) return;
    const l = bitacora();
    l.unshift({ fecha: hoy(), hora: new Date().toTimeString().slice(0, 5), tipo, n, detalle });
    write('bitacora', l.slice(0, 300));
  }

  function siguienteFolio() {
    const f = read('folio', 1000) + 1;
    write('folio', f);
    return f;
  }

  /* ==========================================================================
     Familias y estado de cuenta
     ========================================================================== */

  function alcanceDe(cobro, atletas = Store.deportistas()) {
    const { tipo, ids = [] } = cobro.alcance || {};
    return atletas.filter(a => {
      if (a.estado !== 'activa' && a.ingreso > cobro.creado) return false;
      if (tipo === 'categoria') return ids.includes(a.categoria);
      if (tipo === 'equipo') return ids.includes(a.equipo);
      return true;
    });
  }

  const montoCuota = (c, n) => {
    const base = Math.floor(c.total / c.cuotas / 100) * 100;
    return n === c.cuotas ? c.total - base * (c.cuotas - 1) : base;
  };

  const claveFamilia = tel => String(tel).replace(/\D/g, '').slice(-9);

  /* Todos los cargos del club, con su estado calculado a hoy */
  function cargos() {
    const cfg = piloto();
    const hoyS = hoy();
    const atletas = Store.deportistas();
    const pagos = Store.pagos();
    const pc = pagosCuotas();
    const lista = [];

    const porId = new Map(atletas.map(a => [a.id, a]));

    Object.entries(pagos).forEach(([clave, p]) => {
      const [id, mes] = clave.split('|');
      const a = porId.get(id);
      if (!a) return;
      const vence = `${mes}-${pad(cfg.diaVence)}`;
      const pagado = p.estado === 'pagado';
      lista.push({
        id: `m|${id}|${mes}`, tipo: 'mensualidad', familia: claveFamilia(a.telefono), atleta: a,
        concepto: `Mensualidad ${mesLargo(mes)}`, corto: `Mens. ${mesLargo(mes).slice(0, 3)}`, monto: p.monto, vence,
        estado: pagado ? 'pagado' : (hoyS > vence ? 'vencido' : 'pendiente'),
        fechaPago: p.fecha || null, medio: p.medio || null, folio: p.folio || null
      });
    });

    cobros().forEach(c => alcanceDe(c, atletas).forEach(a => {
      for (let n = 1; n <= c.cuotas; n++) {
        const vence = sumarMeses(c.primerVence, n - 1);
        const pago = pc[`${a.id}|${c.id}|${n}`];
        lista.push({
          id: `c|${a.id}|${c.id}|${n}`, tipo: 'cuota', cobro: c.id, n, familia: claveFamilia(a.telefono), atleta: a,
          concepto: `${c.nombre} · cuota ${n}/${c.cuotas}`, corto: `${c.nombre.split(' ')[0]} ${n}/${c.cuotas}`,
          monto: montoCuota(c, n), vence,
          estado: pago ? 'pagado' : (hoyS > vence ? 'vencido' : 'pendiente'),
          fechaPago: pago?.fecha || null, medio: pago?.medio || null, folio: pago?.folio || null
        });
      }
    }));
    return lista;
  }

  function familias() {
    const hoyS = hoy();
    const conv = convenios();
    const avisos = recordatorios();
    const todos = cargos();
    const mapa = new Map();
    Store.deportistas().forEach(a => {
      const k = claveFamilia(a.telefono);
      if (!mapa.has(k)) mapa.set(k, { id: k, apoderado: a.apoderado, telefono: a.telefono, hijos: [], cargos: [] });
      mapa.get(k).hijos.push(a);
    });
    todos.forEach(c => mapa.get(c.familia)?.cargos.push(c));

    return [...mapa.values()].map(f => {
      const cs = f.cargos.sort((x, y) => x.vence.localeCompare(y.vence));
      const impagos = cs.filter(c => c.estado !== 'pagado');
      const vencidos = impagos.filter(c => c.estado === 'vencido');
      const masAntiguo = vencidos[0]?.vence || null;
      const atraso = masAntiguo ? diasEntre(masAntiguo, hoyS) : 0;
      const ultimo = avisos.find(r => r.familia === f.id) || null;
      return {
        ...f, cargos: cs, impagos, vencidos,
        deudaVencida: vencidos.reduce((s, c) => s + c.monto, 0),
        porVencer: impagos.filter(c => c.estado === 'pendiente' && diasEntre(hoyS, c.vence) <= 31).reduce((s, c) => s + c.monto, 0),
        atraso,
        tramo: !vencidos.length ? 'al-dia' : atraso <= 30 ? '1-30' : atraso <= 60 ? '31-60' : '60+',
        convenio: conv[f.id] || null,
        ultimoAviso: ultimo
      };
    }).sort((a, b) => b.deudaVencida - a.deudaVencida || a.apoderado.localeCompare(b.apoderado, 'es'));
  }

  const familia = id => familias().find(f => f.id === claveFamilia(id)) || null;

  /* ==========================================================================
     Pagos y comprobantes
     ========================================================================== */

  function aplicarPago(cargoIds, { medio = 'Registro manual', fecha = hoy(), origen = 'panel', referencia = '' } = {}) {
    const todos = cargos();
    const items = cargoIds.map(id => todos.find(c => c.id === id)).filter(c => c && c.estado !== 'pagado');
    if (!items.length) return null;
    const folio = siguienteFolio();

    const pagos = Store.pagos();
    const pc = pagosCuotas();
    items.forEach(c => {
      if (c.tipo === 'mensualidad') {
        const [, id, mes] = c.id.split('|');
        pagos[`${id}|${mes}`] = { ...pagos[`${id}|${mes}`], estado: 'pagado', medio, fecha, folio };
      } else {
        const [, id, cobro, n] = c.id.split('|');
        pc[`${id}|${cobro}|${n}`] = { fecha, medio, folio };
      }
    });
    writeStore('pagos', pagos);
    write('cuotas', pc);

    const comp = {
      folio, fecha, medio, origen, referencia,
      familia: items[0].familia, apoderado: items[0].atleta.apoderado,
      items: items.map(c => ({ id: c.id, concepto: c.concepto, deportista: c.atleta.nombre, monto: c.monto })),
      total: items.reduce((s, c) => s + c.monto, 0)
    };
    const l = comprobantes();
    l.unshift(comp);
    write('comprobantes', l);
    return comp;
  }

  function anularComprobante(folio) {
    const l = comprobantes();
    const comp = l.find(c => c.folio === folio);
    if (!comp || comp.anulado) return false;
    const pagos = Store.pagos();
    const pc = pagosCuotas();
    comp.items.forEach(it => {
      const partes = it.id.split('|');
      if (partes[0] === 'm') {
        const k = `${partes[1]}|${partes[2]}`;
        if (pagos[k]) pagos[k] = { ...pagos[k], estado: 'pendiente', medio: null, fecha: null, folio: null };
      } else delete pc[`${partes[1]}|${partes[2]}|${partes[3]}`];
    });
    writeStore('pagos', pagos);
    write('cuotas', pc);
    comp.anulado = hoy();
    write('comprobantes', l);
    return true;
  }

  /* ==========================================================================
     Cuotas extra
     ========================================================================== */

  function crearCobro({ nombre, total, cuotas: n, primerVence, alcance, detalle = '' }) {
    const l = cobros();
    const c = { id: `C${Date.now().toString().slice(-6)}`, nombre, total: Math.round(total), cuotas: Math.max(1, Math.min(12, n | 0)), primerVence, alcance, detalle, creado: hoy() };
    l.push(c);
    write('cobros', l);
    return c;
  }

  function eliminarCobro(id) {
    const tienePagos = Object.keys(pagosCuotas()).some(k => k.split('|')[1] === id);
    if (tienePagos) return false;
    write('cobros', cobros().filter(c => c.id !== id));
    return true;
  }

  function avanceCobro(c) {
    const cs = cargos().filter(x => x.tipo === 'cuota' && x.cobro === c.id);
    const esperado = cs.reduce((s, x) => s + x.monto, 0);
    const recaudado = cs.filter(x => x.estado === 'pagado').reduce((s, x) => s + x.monto, 0);
    const deportistas = new Set(cs.map(x => x.atleta.id)).size;
    const alDia = new Set(cs.map(x => x.atleta.id));
    cs.filter(x => x.estado === 'vencido').forEach(x => alDia.delete(x.atleta.id));
    const proxima = cs.filter(x => x.estado !== 'pagado' && x.vence >= hoy()).sort((a, b) => a.vence.localeCompare(b.vence))[0];
    return { cargos: cs, esperado, recaudado, deportistas, alDia: alDia.size, vencidas: cs.filter(x => x.estado === 'vencido').length, proxima: proxima?.vence || null };
  }

  /* ==========================================================================
     Caja: ingresos cobrados + movimientos manuales
     ========================================================================== */

  const CATEGORIAS_EGRESO = ['Arriendo', 'Honorarios', 'Servicios básicos', 'Seguros', 'Competencias', 'Viajes', 'Uniformes', 'Implementos', 'Comisiones bancarias', 'Otros'];
  const CATEGORIAS_INGRESO = ['Auspicios', 'Actividades', 'Donaciones', 'Otros'];

  function registrarMovimiento(m) {
    const l = movimientos();
    const nuevo = { id: `M${Date.now().toString().slice(-7)}`, medio: 'Transferencia', respaldo: '', ...m, monto: Math.abs(Math.round(m.monto)) };
    l.push(nuevo);
    write('movs', l);
    return nuevo;
  }
  function actualizarMovimiento(id, cambios) { write('movs', movimientos().map(m => (m.id === id ? { ...m, ...cambios } : m))); }
  function eliminarMovimiento(id) { write('movs', movimientos().filter(m => m.id !== id)); }

  /* Flujo de un mes: ingresos por origen y egresos por categoría */
  function flujo(mes) {
    const ingresos = {};
    const egresos = {};
    const suma = (obj, k, v) => { obj[k] = (obj[k] || 0) + v; };
    const nombreCobro = Object.fromEntries(cobros().map(c => [c.id, c.nombre]));

    cargos().forEach(c => {
      if (c.estado !== 'pagado' || !c.fechaPago || c.fechaPago.slice(0, 7) !== mes) return;
      suma(ingresos, c.tipo === 'mensualidad' ? 'Mensualidades' : `Cuotas · ${nombreCobro[c.cobro]}`, c.monto);
    });
    movimientos().forEach(m => {
      if (m.fecha.slice(0, 7) !== mes) return;
      suma(m.tipo === 'ingreso' ? ingresos : egresos, m.categoria, m.monto);
    });
    const orden = o => Object.entries(o).map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto);
    const inL = orden(ingresos), egL = orden(egresos);
    const totalIn = inL.reduce((s, x) => s + x.monto, 0);
    const totalEg = egL.reduce((s, x) => s + x.monto, 0);
    return { mes, ingresos: inL, egresos: egL, totalIn, totalEg, resultado: totalIn - totalEg };
  }

  function serieCaja(n = 6) {
    const meses = Store.meses(6).slice(-n);
    let saldo = config().saldoInicial;
    return Store.meses(6).map(mes => {
      const f = flujo(mes);
      const inicial = saldo;
      saldo += f.resultado;
      return { ...f, inicial, final: saldo };
    }).filter(x => meses.includes(x.mes));
  }

  const saldoCaja = () => { const s = serieCaja(6); return s[s.length - 1].final; };

  /* ==========================================================================
     Rendición de cuentas
     ========================================================================== */

  function rendicion(mes) {
    const f = serieCaja(6).find(x => x.mes === mes) || { ...flujo(mes), inicial: 0, final: 0 };
    const cs = cargos().filter(c => c.tipo === 'mensualidad' && c.vence.slice(0, 7) === mes);
    const cobrables = cs.length;
    const pagadas = cs.filter(c => c.estado === 'pagado').length;
    const fams = familias();
    return {
      ...f,
      cobranza: cobrables ? pagadas / cobrables : 0,
      deudaTotal: fams.reduce((s, x) => s + x.deudaVencida, 0),
      familiasConDeuda: fams.filter(x => x.deudaVencida > 0).length,
      familias: fams.length,
      sinRespaldo: movimientos().filter(m => m.fecha.slice(0, 7) === mes && m.tipo === 'egreso' && !m.respaldo).length,
      publicada: rendiciones()[mes] || null
    };
  }

  /* Se guarda una copia fija del mes cerrado: no cambia aunque después se
     corrija algo en la caja. La corrección se ve en la rendición siguiente.
     Es información solo de la directiva; el portal de apoderados no la muestra. */
  function publicarRendicion(mes, por = 'Directiva') {
    const r = rendicion(mes);
    const mapa = rendiciones();
    const { publicada, ...copia } = r;
    mapa[mes] = { fecha: hoy(), por, copia };
    write('rendiciones', mapa);
    return mapa[mes];
  }

  function ultimaRendicionPublicada() {
    const mapa = rendiciones();
    const mes = Object.keys(mapa).sort().pop();
    return mes ? { mes, ...mapa[mes] } : null;
  }

  /* ==========================================================================
     Conciliación bancaria: leer la cartola y reconocer quién pagó
     ========================================================================== */

  function leerMonto(t) {
    let s = String(t || '').replace(/[$\s]/g, '');
    if (!s) return 0;
    const neg = /^-|\(.*\)$/.test(s);
    s = s.replace(/[()\-+]/g, '');
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');   // 12.345,50
    else s = s.replace(/[.,]/g, '');                                        // 12.345 o 12,345
    const v = Math.round(parseFloat(s) || 0);
    return neg ? -v : v;
  }

  function leerFecha(t) {
    const s = String(t || '').trim();
    let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (m) { const a = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${a}-${pad(m[2])}-${pad(m[1])}`; }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }

  /* Acepta las cartolas de los bancos chilenos exportadas a CSV: separador
     ; , o tabulación; una columna Monto con signo, o Cargo y Abono separados. */
  function leerCartola(texto) {
    const lineas = String(texto).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lineas.length) return [];
    const sep = lineas[0].includes(';') ? ';' : lineas[0].includes('\t') ? '\t' : ',';
    const partir = l => l.split(sep).map(c => c.replace(/^"|"$/g, '').trim());
    const cab = partir(lineas[0]).map(plano);
    const tieneCab = cab.some(c => /FECHA|DESCRIPCION|GLOSA|MONTO|ABONO|CARGO/.test(c));
    const col = re => cab.findIndex(c => re.test(c));
    const iF = tieneCab ? col(/FECHA/) : 0;
    const iG = tieneCab ? col(/DESCRIPCION|GLOSA|DETALLE|MOVIMIENTO/) : 1;
    const iM = tieneCab ? col(/^MONTO|IMPORTE/) : 2;
    const iA = tieneCab ? col(/ABONO|DEPOSITO|INGRESO/) : -1;
    const iC = tieneCab ? col(/CARGO|GIRO|EGRESO/) : -1;

    return (tieneCab ? lineas.slice(1) : lineas).map(l => {
      const c = partir(l);
      const fecha = leerFecha(c[iF]);
      let monto = iM >= 0 ? leerMonto(c[iM]) : 0;
      if (iM < 0 && (iA >= 0 || iC >= 0)) monto = leerMonto(c[iA]) - Math.abs(leerMonto(c[iC]));
      return { fecha, glosa: c[iG] || '', monto };
    }).filter(x => x.fecha && x.monto);
  }

  /* Combinaciones de deuda que una transferencia puede estar pagando:
     lo más antiguo primero (lo normal), o solo lo del mes. */
  function combinaciones(f) {
    const imp = f.impagos.slice().sort((a, b) => a.vence.localeCompare(b.vence));
    const opciones = [];
    let acc = 0;
    imp.forEach((c, i) => { acc += c.monto; opciones.push({ monto: acc, cargos: imp.slice(0, i + 1) }); });
    const porMes = {};
    imp.forEach(c => { (porMes[c.vence.slice(0, 7)] ||= []).push(c); });
    Object.values(porMes).forEach(cs => opciones.push({ monto: cs.reduce((s, c) => s + c.monto, 0), cargos: cs }));
    imp.forEach(c => opciones.push({ monto: c.monto, cargos: [c] }));
    return opciones;
  }

  function reconocerFamilia(glosa, fams) {
    const g = ` ${plano(glosa)} `;
    const fuertes = fams.filter(f => {
      const [nom, ...ap] = plano(f.apoderado).split(' ');
      return g.includes(` ${nom} `) && ap.every(x => g.includes(` ${x} `));
    });
    if (fuertes.length === 1) return { familia: fuertes[0], certeza: 'nombre' };
    if (fuertes.length > 1) return { candidatas: fuertes, certeza: 'homonimo' };
    /* El apoderado a veces transfiere con el nombre del hijo */
    const porHijo = fams.filter(f => f.hijos.some(h => {
      const [nom, ...ap] = plano(h.nombre).split(' ');
      return g.includes(` ${nom} `) && ap.every(x => g.includes(` ${x} `));
    }));
    if (porHijo.length === 1) return { familia: porHijo[0], certeza: 'hijo' };
    const apellido = fams.filter(f => g.includes(` ${plano(f.apoderado).split(' ').slice(-1)[0]} `));
    return apellido.length ? { candidatas: apellido, certeza: 'apellido' } : { certeza: 'ninguna' };
  }

  function categoriaGasto(glosa) {
    const g = plano(glosa);
    if (/ARRIENDO/.test(g)) return 'Arriendo';
    if (/CGE|ENEL|ELECTRIC|LUZ|AGUA|ALTIPLANO/.test(g)) return 'Servicios básicos';
    if (/COMISION|MANTENCION|IMPUESTO|ITF/.test(g)) return 'Comisiones bancarias';
    if (/BUS|PASAJE|TRANSPORTE|TURBUS|PULLMAN/.test(g)) return 'Viajes';
    if (/HONORARIO/.test(g)) return 'Honorarios';
    if (/SEGURO|POLIZA/.test(g)) return 'Seguros';
    return null;
  }

  function conciliar(texto) {
    const cfg = piloto();
    const vistas = read('cartola', {});
    const resultado = [];
    const pendientes = revisar();

    leerCartola(texto).forEach(mov => {
      const huella = `${mov.fecha}|${plano(mov.glosa)}|${mov.monto}`;
      if (vistas[huella]) { resultado.push({ ...mov, estado: 'repetido', motivo: 'Ya estaba en una cartola anterior' }); return; }
      vistas[huella] = hoy();

      /* Cargos: gastos del banco o pagos a proveedores */
      if (mov.monto < 0) {
        const cat = categoriaGasto(mov.glosa);
        if (cat) {
          registrarMovimiento({ fecha: mov.fecha, tipo: 'egreso', categoria: cat, detalle: mov.glosa, monto: -mov.monto, respaldo: 'Cartola bancaria', medio: 'Cargo en cuenta' });
          resultado.push({ ...mov, estado: 'gasto', motivo: `Registrado como ${cat}` });
        } else {
          pendientes.push({ id: `R${Date.now().toString(36)}${resultado.length}`, ...mov, tipo: 'egreso', motivo: 'Cargo en la cuenta que no sé clasificar' });
          resultado.push({ ...mov, estado: 'revisar', motivo: 'Cargo sin categoría conocida' });
        }
        return;
      }

      const fams = familias();
      const r = reconocerFamilia(mov.glosa, fams);
      const cand = r.familia ? [r.familia] : (r.candidatas || fams.filter(f => f.impagos.length));
      const calzan = [];
      cand.forEach(f => combinaciones(f).forEach(o => { if (o.monto === mov.monto) calzan.push({ familia: f, cargos: o.cargos }); }));
      const unicas = [...new Map(calzan.map(x => [x.familia.id, x])).values()];

      const seguro = (r.familia || r.certeza === 'homonimo') && unicas.length === 1;
      if (seguro && cfg.conciliarSolo) {
        const fam = unicas[0].familia;
        const comp = aplicarPago(unicas[0].cargos.map(c => c.id), { medio: 'Transferencia', fecha: mov.fecha, origen: 'cartola', referencia: mov.glosa });
        const porque = r.certeza === 'hijo' ? 'Nombre del deportista y monto calzan'
          : r.certeza === 'homonimo' ? 'Hay dos apoderados con ese nombre; el monto calza solo con uno' : 'Nombre del apoderado y monto calzan';
        resultado.push({ ...mov, estado: 'aplicado', familia: fam.apoderado, folio: comp?.folio, motivo: porque });
      } else {
        const sugerencia = unicas.length === 1 ? { familia: unicas[0].familia.id, apoderado: unicas[0].familia.apoderado, cargos: unicas[0].cargos.map(c => c.id) } : null;
        const motivo = r.familia && !unicas.length ? `Es de ${r.familia.apoderado}, pero el monto no calza con su deuda (${CLP(r.familia.deudaVencida + r.familia.porVencer)})`
          : sugerencia && r.certeza === 'apellido' ? `La glosa solo trae el apellido; el monto calza con ${sugerencia.apoderado}`
          : sugerencia ? `El monto calza solo con ${sugerencia.apoderado}, pero la glosa no trae su nombre`
          : unicas.length > 1 ? `El monto calza con ${unicas.length} familias`
          : 'No reconozco quién transfirió';
        pendientes.push({ id: `R${Date.now().toString(36)}${resultado.length}`, ...mov, tipo: 'abono', familiaProbable: r.familia?.id || null, sugerencia, motivo });
        resultado.push({ ...mov, estado: 'revisar', familia: sugerencia?.apoderado || r.familia?.apoderado || null, motivo });
      }
    });

    write('cartola', vistas);
    write('revisar', pendientes);
    const aplicados = resultado.filter(x => x.estado === 'aplicado').length;
    const gastos = resultado.filter(x => x.estado === 'gasto').length;
    anotar('conciliacion', aplicados, `${aplicados} transferencia${aplicados === 1 ? '' : 's'} reconocida${aplicados === 1 ? '' : 's'} en la cartola`);
    anotar('comprobantes', aplicados, `${aplicados} comprobante${aplicados === 1 ? '' : 's'} emitido${aplicados === 1 ? '' : 's'} por transferencias`);
    anotar('gastos', gastos, `${gastos} cargo${gastos === 1 ? '' : 's'} del banco registrado${gastos === 1 ? '' : 's'} como gasto`);
    return resultado;
  }

  /* Resolver a mano lo que la conciliación no pudo */
  function resolverRevision(id, accion, datos = {}) {
    const l = revisar();
    const item = l.find(x => x.id === id);
    if (!item) return null;
    let res = null;
    if (accion === 'asignar') {
      const f = familia(datos.familia);
      const ids = datos.cargos || (f ? (combinaciones(f).find(o => o.monto === item.monto)?.cargos || f.impagos).map(c => c.id) : []);
      res = aplicarPago(ids, { medio: 'Transferencia', fecha: item.fecha, origen: 'cartola', referencia: item.glosa });
    } else if (accion === 'ingreso') {
      res = registrarMovimiento({ fecha: item.fecha, tipo: 'ingreso', categoria: datos.categoria || 'Otros', detalle: item.glosa, monto: item.monto, respaldo: 'Cartola bancaria' });
    } else if (accion === 'gasto') {
      res = registrarMovimiento({ fecha: item.fecha, tipo: 'egreso', categoria: datos.categoria || 'Otros', detalle: item.glosa, monto: Math.abs(item.monto), respaldo: 'Cartola bancaria' });
    }
    write('revisar', l.filter(x => x.id !== id));
    return res;
  }

  /* Una cartola de ejemplo armada con la deuda real del prototipo, para
     probar la conciliación sin tener que exportar nada del banco. */
  function cartolaEjemplo() {
    const fams = familias().filter(f => f.impagos.length);
    const rand = rng(31337);
    const hoyS = hoy();
    const filas = [['Fecha', 'Descripción', 'Monto']];
    const f = s => { const [a, m, d] = s.split('-'); return `${d}/${m}/${a}`; };
    const dia = n => f(sumarDias(hoyS, -n));

    fams.slice(0, 9).forEach((fam, i) => {
      const op = combinaciones(fam)[0];
      const quien = i === 4 ? fam.hijos[0].nombre : fam.apoderado;
      filas.push([dia(1 + (i % 4)), `TRANSF DE ${plano(quien)}`, op.monto]);
    });
    const otra = fams[10];
    if (otra) filas.push([dia(2), `TRANSF DE ${plano(otra.apoderado)}`, Math.max(1000, combinaciones(otra)[0].monto - 5000)]);
    const anonima = fams[11];
    if (anonima) filas.push([dia(3), 'TRANSF 76.123.456-7 CTA RUT', combinaciones(anonima)[0].monto + 1]);
    filas.push([dia(1), 'TRANSF DE FERRETERIA DEL NORTE SPA', 150000]);
    filas.push([dia(2), 'PAGO TURBUS PASAJES DELEGACION', -(180000 + Math.round(rand() * 20) * 1000)]);
    filas.push([dia(3), 'COMISION MANTENCION CUENTA', -8900]);
    filas.push([dia(4), 'PAGO EN LINEA TIENDA DEPORTIVA', -64990]);
    return filas.map(r => r.join(';')).join('\n');
  }

  /* ==========================================================================
     Recordatorios
     ========================================================================== */

  function textoRecordatorio(paso, fam, items) {
    const detalle = items.map(c => `• ${c.concepto} de ${c.atleta.nombre.split(' ')[0]}: ${CLP(c.monto)}`).join('\n');
    const total = items.reduce((s, c) => s + c.monto, 0);
    const portal = location.origin + location.pathname.replace(/[^/]*$/, '') + 'apoderados.html';
    return paso.texto
      .replace('{apoderado}', fam.apoderado.split(' ')[0])
      .replace('{detalle}', detalle)
      .replace('{total}', CLP(total))
      .replace('{portal}', portal)
      .replace('{club}', CLUB.corto);
  }

  const enlaceWhatsApp = (telefono, texto) => `https://wa.me/56${String(telefono).replace(/\D/g, '').slice(-9)}?text=${encodeURIComponent(texto)}`;

  function marcarRecordatorioEnviado(id) {
    write('recordatorios', recordatorios().map(r => (r.id === id ? { ...r, estado: 'enviado', enviado: hoy() } : r)));
  }

  /* ==========================================================================
     El piloto
     ========================================================================== */

  function correrPiloto() {
    const cfg = piloto();
    const hecho = { cargos: 0, vencidos: 0, recordatorios: 0, escaladas: 0, rendicion: null };
    if (!cfg.activo) return hecho;
    const hoyS = hoy();
    const mes = hoyS.slice(0, 7);

    /* 1. Cargar la mensualidad del mes a cada deportista activa */
    const pagos = Store.pagos();
    Store.deportistas().filter(a => a.estado === 'activa').forEach(a => {
      const k = `${a.id}|${mes}`;
      if (pagos[k]) return;
      const cat = categoriaPorId(a.categoria);
      pagos[k] = { estado: 'pendiente', monto: a.beca ? Math.round(cat.precio * 0.5) : cat.precio, medio: null, fecha: null };
      hecho.cargos++;
    });

    /* 2. Pasar a "vencido" lo que pasó la fecha, para que todo el panel
          (y el portal) muestre lo mismo */
    const vence = `${mes}-${pad(cfg.diaVence)}`;
    Object.entries(pagos).forEach(([k, p]) => {
      if (p.estado !== 'pendiente') return;
      const v = `${k.split('|')[1]}-${pad(cfg.diaVence)}`;
      if (hoyS > v) { p.estado = 'vencido'; hecho.vencidos++; }
    });
    writeStore('pagos', pagos);
    anotar('cargos', hecho.cargos, `Mensualidad de ${mesLargo(mes)} cargada a ${hecho.cargos} deportista${hecho.cargos === 1 ? '' : 's'}`);
    anotar('vencidos', hecho.vencidos, `${hecho.vencidos} mensualidad${hecho.vencidos === 1 ? '' : 'es'} pasaron a vencidas (vencían el ${fechaCorta(vence)})`);

    /* 3. Recordatorios escalonados: un solo mensaje por familia y por día,
          con todo lo que debe, y nunca el mismo aviso dos veces */
    const enviados = read('avisados', {});
    const conv = convenios();
    const cola = recordatorios();
    const yaHoy = new Set(cola.filter(r => r.fecha === hoyS).map(r => r.familia));
    const pasos = cfg.recordatorios.slice().sort((a, b) => a.dias - b.dias);

    familias().forEach(f => {
      if (conv[f.id] || yaHoy.has(f.id) || !f.impagos.length) return;
      if (f.atraso > cfg.escalarDias) return;             // esto ya no lo resuelve un mensaje automático
      let paso = null;
      const items = [];
      f.impagos.forEach(c => {
        const d = diasEntre(c.vence, hoyS);
        const aplicable = pasos.filter(p => d >= p.dias).pop();
        if (!aplicable) return;
        items.push(c);
        if (!enviados[`${c.id}|${aplicable.id}`]) paso = !paso || aplicable.dias > paso.dias ? aplicable : paso;
      });
      if (!paso || !items.length) return;
      items.forEach(c => pasos.filter(p => diasEntre(c.vence, hoyS) >= p.dias).forEach(p => { enviados[`${c.id}|${p.id}`] = hoyS; }));
      cola.unshift({
        id: `W${Date.now().toString(36)}${hecho.recordatorios}`, fecha: hoyS, familia: f.id, apoderado: f.apoderado, telefono: f.telefono,
        paso: paso.id, pasoNombre: paso.nombre, total: items.reduce((s, c) => s + c.monto, 0), texto: textoRecordatorio(paso, f, items), estado: 'en cola'
      });
      hecho.recordatorios++;
    });
    write('avisados', enviados);
    write('recordatorios', cola.slice(0, 400));
    anotar('recordatorios', hecho.recordatorios, `${hecho.recordatorios} recordatorio${hecho.recordatorios === 1 ? '' : 's'} de pago preparado${hecho.recordatorios === 1 ? '' : 's'} para WhatsApp`);

    /* 4. Publicar la rendición del mes anterior */
    const anterior = sumarMeses(`${mes}-01`, -1).slice(0, 7);
    if (Number(hoyS.slice(8)) >= cfg.rendicionDia && !rendiciones()[anterior] && Store.meses(6).includes(anterior)) {
      publicarRendicion(anterior, 'Piloto automático');
      hecho.rendicion = anterior;
      anotar('rendicion', 1, `Rendición de ${mesLargo(anterior)} cerrada y lista para la directiva`);
    }

    write('ultimaCorrida', { fecha: hoyS, hora: new Date().toTimeString().slice(0, 5) });
    return hecho;
  }

  /* ==========================================================================
     Bandeja "Hoy": solo lo que necesita una persona
     ========================================================================== */

  function bandeja() {
    const cfg = piloto();
    const hoyS = hoy();
    const items = [];

    revisar().forEach(r => items.push({ ...r, clase: r.tipo, tipo: 'revisar', prioridad: 1 }));

    /* Un solo aviso agrupado: veinte tarjetas iguales no se leen, se ignoran */
    const escaladas = familias().filter(f => !f.convenio && f.atraso > cfg.escalarDias).sort((a, b) => b.atraso - a.atraso);
    if (escaladas.length) items.push({ tipo: 'escalar', prioridad: 2, id: 'E', familias: escaladas, total: escaladas.reduce((s, f) => s + f.deudaVencida, 0) });

    cobros().forEach(c => {
      const av = avanceCobro(c);
      if (!av.proxima) return;
      const faltan = diasEntre(hoyS, av.proxima);
      const sinPagar = av.cargos.filter(x => x.vence === av.proxima && x.estado !== 'pagado').length;
      if (faltan <= 7 && sinPagar) items.push({ tipo: 'cobro', prioridad: 3, id: `C-${c.id}`, cobro: c, faltan, sinPagar, vence: av.proxima });
    });

    const mes = hoyS.slice(0, 7);
    movimientos().filter(m => m.tipo === 'egreso' && !m.respaldo && m.fecha.slice(0, 7) >= sumarMeses(`${mes}-01`, -1).slice(0, 7))
      .forEach(m => items.push({ tipo: 'respaldo', prioridad: 4, id: `S-${m.id}`, mov: m }));

    return items.sort((a, b) => a.prioridad - b.prioridad);
  }

  /* Tiempo que habría tomado hacer a mano lo que hizo el sistema este mes */
  function ahorroDelMes() {
    const mes = hoy().slice(0, 7);
    const porTipo = {};
    bitacora().filter(b => b.fecha.slice(0, 7) === mes).forEach(b => { porTipo[b.tipo] = (porTipo[b.tipo] || 0) + b.n; });
    const minutos = Object.entries(porTipo).reduce((s, [t, n]) => s + n * (MINUTOS[t] || 0), 0);
    return { minutos, porTipo };
  }

  /* ==========================================================================
     Comprobante imprimible
     ========================================================================== */

  function htmlComprobante(c) {
    const esc = t => String(t ?? '').replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[s]);
    return `
      <article class="comprobante">
        <header>
          <div><strong>${esc(CLUB.nombre)}</strong><span>${esc(CLUB.ciudad)}, ${esc(CLUB.region)}</span></div>
          <div class="folio"><span>Comprobante de pago</span><strong>N° ${c.folio}</strong></div>
        </header>
        <dl>
          <div><dt>Fecha</dt><dd>${fechaCorta(c.fecha)} ${c.fecha.slice(0, 4)}</dd></div>
          <div><dt>Apoderado</dt><dd>${esc(c.apoderado)}</dd></div>
          <div><dt>Medio de pago</dt><dd>${esc(c.medio)}</dd></div>
        </dl>
        <table>
          <thead><tr><th>Concepto</th><th>Deportista</th><th>Monto</th></tr></thead>
          <tbody>${c.items.map(i => `<tr><td>${esc(i.concepto)}</td><td>${esc(i.deportista)}</td><td>${CLP(i.monto)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2">Total pagado</td><td>${CLP(c.total)}</td></tr></tfoot>
        </table>
        ${c.anulado ? `<p class="anulado">ANULADO el ${fechaCorta(c.anulado)}</p>` : ''}
        <footer>Comprobante interno del club. No reemplaza una boleta o factura del SII.</footer>
      </article>`;
  }

  function imprimirComprobante(c) {
    let zona = document.getElementById('zona-impresion');
    if (!zona) { zona = document.createElement('div'); zona.id = 'zona-impresion'; document.body.appendChild(zona); }
    zona.innerHTML = htmlComprobante(c);
    document.body.classList.add('imprimiendo');
    const fin = () => { document.body.classList.remove('imprimiendo'); window.removeEventListener('afterprint', fin); };
    window.addEventListener('afterprint', fin);
    window.print();
    setTimeout(fin, 1000);
  }

  /* Reiniciar el prototipo también borra las finanzas */
  const reiniciarBase = Store.reiniciar;
  Store.reiniciar = () => {
    reiniciarBase();
    Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k));
  };

  window.DE.Finanzas = {
    hoy, mesLargo, fechaCorta, diasEntre, sumarDias, sumarMeses, MINUTOS,
    CATEGORIAS_EGRESO, CATEGORIAS_INGRESO,
    piloto, guardarPiloto, correrPiloto, ultimaCorrida: () => read('ultimaCorrida', null),
    cargos, familias, familia, claveFamilia,
    aplicarPago, anularComprobante, comprobantes, htmlComprobante, imprimirComprobante,
    cobros, crearCobro, eliminarCobro, avanceCobro, alcanceDe, montoCuota,
    movimientos, registrarMovimiento, actualizarMovimiento, eliminarMovimiento,
    config, guardarConfig: c => write('config', { ...read('config', {}), ...c }),
    flujo, serieCaja, saldoCaja,
    rendicion, publicarRendicion, rendiciones, ultimaRendicionPublicada,
    leerCartola, conciliar, cartolaEjemplo, revisar, resolverRevision,
    recordatorios, marcarRecordatorioEnviado, enlaceWhatsApp,
    convenios, fijarConvenio: (id, nota) => { const c = convenios(); if (nota === null) delete c[id]; else c[id] = { desde: hoy(), nota }; write('convenios', c); },
    bandeja, bitacora, ahorroDelMes
  };
})();
