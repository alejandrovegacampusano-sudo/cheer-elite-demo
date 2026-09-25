/* ==========================================================================
   Dragones Elite — Modelo de datos del club
   --------------------------------------------------------------------------
   Todo lo editable del club vive aquí. Cambiar precios, equipos u horarios
   no requiere tocar el resto de la aplicación.
   NOTA: los nombres de equipos y los precios son de ejemplo hasta que el club
   confirme los reales (ver README → "Pendiente para producción").
   ========================================================================== */

const CLUB = {
  nombre: 'Academia Dragones Elite',
  corto: 'Dragones Elite',
  lema: 'El Dragón, una vez más',
  ciudad: 'Iquique',
  region: 'Tarapacá',
  fundacion: 2007,
  instagram: '@dragoneselite',
  whatsapp: '56900000000',          // ← reemplazar por el número real del club
  email: 'contacto@dragoneselite.cl',
  direccion: 'Gimnasio Dragones Elite · Iquique, Tarapacá',
  matricula: 18000,
  descuentoHermanos: 0.15,
  temporada: '2026',

  /* Envío de la inscripción al club.
     endpoint: URL de un servicio de formularios (Formspree, Web3Forms, Basin…).
     Vacío = no se intenta enviar por correo y solo queda el aviso por WhatsApp,
     que funciona sin configurar nada. */
  formEndpoint: '',

  /* Redes oficiales, verificadas en la búsqueda del 25-09-2026 */
  redes: {
    instagram: 'https://www.instagram.com/dragoneselite/',
    facebook:  'https://www.facebook.com/p/Academia-Dragones-Elite-Chile-100063991477597/',
    youtube:   'https://www.youtube.com/@AcademiaDragonesEliteChile'
  },

  /* Cuenta del club para las transferencias. Reemplazar por la real. */
  banco: {
    titular: 'Academia Dragones Elite',
    rut: '77.777.777-7',
    banco: 'Banco Estado',
    tipo: 'Cuenta Corriente',
    numero: '000 123 45678',
    email: 'pagos@dragoneselite.cl'
  },

  /* Centro de Iquique como referencia hasta tener la dirección del gimnasio */
  mapa: { lat: -20.2307, lon: -70.1357, referencial: true }
};

/* Valores del club: se muestran en "Quiénes somos" */
const VALORES = [
  { icono: 'llama',   titulo: 'Confianza',          texto: 'Un stunt se sostiene porque cuatro personas confían entre sí. Eso se entrena igual que un salto.' },
  { icono: 'escudo',  titulo: 'Seguridad primero',  texto: 'Nadie sube a una pirámide antes de estar lista. La progresión la define el cuerpo técnico, no el apuro.' },
  { icono: 'estrella',titulo: 'Disciplina',         texto: 'Llegar a la hora, repetir lo que no sale y cuidar el cuerpo. Los podios se ganan los martes.' },
  { icono: 'ala',     titulo: 'Equipo antes que yo',texto: 'Aquí nadie sube sola: el lugar de cada una en la rutina importa lo mismo, arriba o abajo.' },
  { icono: 'corazon', titulo: 'Orgullo del norte',  texto: 'Competimos por Iquique y por Tarapacá. Llevar el nombre del club es llevar el de la ciudad.' }
];

const CATEGORIAS = [
  {
    id: 'tiny', nombre: 'Tiny', nivel: 'Iniciación', edad: [3, 5], edadTxt: '3 a 5 años',
    precio: 19900, art: 'art-class', color: '#f0d489',
    resumen: 'Primer contacto con el cheer: coordinación, ritmo y juego en equipo.',
    incluye: ['2 clases semanales', 'Motricidad y ritmo', 'Showcase de fin de año'],
    equipos: [
      { id: 'tiny-dragoncitos', nombre: 'Dragoncitos', horario: 'Mar y Jue · 17:00', cupos: 18, inscritas: 12, coach: 'Camila Ruiz' }
    ]
  },
  {
    id: 'mini', nombre: 'Mini', nivel: 'Nivel 1', edad: [6, 8], edadTxt: '6 a 8 años',
    precio: 24900, art: 'art-jump', color: '#f5b700',
    resumen: 'Base técnica: stunt inicial, saltos y primeras acrobacias con colchoneta.',
    incluye: ['3 clases semanales', 'Tumbling básico', '2 competencias regionales'],
    equipos: [
      { id: 'mini-fire', nombre: 'Mini Fire', horario: 'Lun, Mié y Vie · 17:30', cupos: 24, inscritas: 21, coach: 'Camila Ruiz' },
      { id: 'mini-spark', nombre: 'Mini Spark', horario: 'Mar, Jue y Sáb · 10:00', cupos: 24, inscritas: 16, coach: 'Ignacio Pérez' }
    ]
  },
  {
    id: 'youth', nombre: 'Youth', nivel: 'Nivel 2', edad: [9, 11], edadTxt: '9 a 11 años',
    precio: 27900, art: 'art-stunt', color: '#d9b459',
    resumen: 'Stunt en grupo, pirámides y rutina completa de competencia.',
    incluye: ['3 clases semanales', 'Stunt y pirámides', '3 competencias por temporada'],
    equipos: [
      { id: 'youth-storm', nombre: 'Youth Storm', horario: 'Lun, Mié y Vie · 18:00', cupos: 24, inscritas: 22, coach: 'Ignacio Pérez' },
      { id: 'youth-blaze', nombre: 'Youth Blaze', horario: 'Mar, Jue y Sáb · 11:30', cupos: 24, inscritas: 18, coach: 'Valentina Soto' }
    ]
  },
  {
    id: 'junior', nombre: 'Junior', nivel: 'Nivel 3', edad: [12, 14], edadTxt: '12 a 14 años',
    precio: 31900, art: 'art-toss', color: '#cba445',
    resumen: 'Equipo competitivo: basket toss, tumbling en pista y rutina nacional.',
    incluye: ['4 clases semanales', 'Preparación física', 'Nacional + regional'],
    equipos: [
      { id: 'junior-inferno', nombre: 'Junior Inferno', horario: 'Lun a Jue · 18:30', cupos: 24, inscritas: 23, coach: 'Valentina Soto' },
      { id: 'junior-onyx', nombre: 'Junior Onyx', horario: 'Mar, Jue y Sáb · 16:00', cupos: 24, inscritas: 15, coach: 'Matías Fuentes' }
    ]
  },
  {
    id: 'senior', nombre: 'Senior Elite', nivel: 'Nivel 4-5', edad: [15, 18], edadTxt: '15 a 18 años',
    precio: 34900, art: 'art-podium', color: '#c0982f', destacado: true,
    resumen: 'El equipo insignia. Alta dificultad, tumbling élite y ruta internacional.',
    incluye: ['5 clases semanales', 'Tumbling élite', 'Nacional e internacional'],
    equipos: [
      { id: 'senior-elite', nombre: 'Senior Elite', horario: 'Lun a Vie · 19:30', cupos: 28, inscritas: 26, coach: 'Matías Fuentes' }
    ]
  }
];

/* Programas complementarios (no son equipos de competencia) */
/* Clases sueltas, sin equipo fijo. Hoy NO se muestran en el sitio: el club
   prefiere mostrar solo las categorías por edad. Se dejan aquí por si más
   adelante quieren volver a ofrecerlas. */
const PROGRAMAS = [
  { id: 'tumbling', nombre: 'Tumbling', art: 'art-tumbling', precio: 22000, horario: 'Sáb · 12:30',
    desc: 'Clase abierta de acrobacia: rondada, flic flac y series. Para deportistas del club y externas.' },
  { id: 'prep', nombre: 'Prep Team', art: 'art-team', precio: 21900, horario: 'Mar y Jue · 16:00',
    desc: 'Puente entre la clase recreativa y el equipo competitivo, con una competencia al año.' },
  { id: 'verano', nombre: 'Escuela de verano', art: 'art-jump', precio: 39000, horario: 'Enero · Lun a Vie',
    desc: 'Intensivo de enero: stunt, tumbling, coreografía y showcase final para las familias.' }
];

const COACHES = [
  { nombre: 'Valentina Soto', rol: 'Directora técnica', años: 14, detalle: 'Ex atleta Senior. Certificación de seguridad en stunt y jueza regional.' },
  { nombre: 'Matías Fuentes', rol: 'Head coach Senior', años: 9, detalle: 'Especialista en tumbling élite y preparación para nacionales.' },
  { nombre: 'Camila Ruiz', rol: 'Coach Mini y Tiny', años: 7, detalle: 'Profesora de educación física, foco en formación temprana y motricidad.' },
  { nombre: 'Ignacio Pérez', rol: 'Preparador físico', años: 6, detalle: 'Fuerza, movilidad y prevención de lesiones para todas las categorías.' }
];

const TESTIMONIOS = [
  { texto: 'Mi hija llegó tímida a los 7 años. Hoy compite en Junior y es otra niña: se para distinto, habla distinto. El club le dio una familia.', autor: 'Paulina M.', rol: 'Apoderada · Junior Inferno' },
  { texto: 'La inscripción online nos ahorró tres viajes al gimnasio. Todo quedó registrado y nos llegó la confirmación al WhatsApp el mismo día.', autor: 'Rodrigo V.', rol: 'Apoderado · Mini Fire' },
  { texto: 'Los coaches se toman en serio la seguridad. Es lo primero que me mostraron: cómo entrenan el stunt antes de subir a alguien.', autor: 'Carolina A.', rol: 'Apoderada · Youth Storm' },
  { texto: 'Entré a los 12 sin saber nada de tumbling. A los 16 estaba en la rutina del nacional. Este club te empuja de verdad.', autor: 'Josefa T.', rol: 'Atleta · Senior Elite' }
];

const FAQ = [
  { q: '¿Necesita experiencia previa para entrar?', a: 'No. Tiny, Mini y Prep Team parten desde cero. En las categorías competitivas hacemos una clase de evaluación para ubicar a cada deportista en el equipo que le corresponde por edad y nivel.' },
  { q: '¿Qué incluye la mensualidad?', a: 'Las clases semanales de su equipo, la preparación física y el acompañamiento del cuerpo técnico. Uniforme de competencia, viajes e inscripciones a campeonatos se cobran aparte y se avisan con anticipación.' },
  { q: '¿Cómo se paga?', a: 'Matrícula al inscribirse y mensualidad dentro de los primeros 5 días de cada mes. En el panel del club queda registrado el estado de cada pago, y las familias reciben recordatorio por WhatsApp.' },
  { q: '¿Hay descuento por hermanas?', a: 'Sí: 15% de descuento en la mensualidad del segundo hijo o hija en adelante. Se aplica automáticamente al inscribir con el mismo apoderado.' },
  { q: '¿Qué pasa si se lesiona?', a: 'Todo el cuerpo técnico está formado en seguridad de stunt y hay protocolo de accidentes. Ante una lesión, la mensualidad se congela mientras dure la recuperación acreditada.' },
  { q: '¿Se puede probar antes de inscribirse?', a: 'Sí. La primera clase es de prueba y sin costo. Se agenda desde el formulario de inscripción marcando la opción "clase de prueba".' }
];

const HITOS = [
  { año: '2007', titulo: 'Nace el club', detalle: 'Un grupo de 14 niñas entrenando en un gimnasio prestado en Iquique.' },
  { año: '2013', titulo: 'Primer nacional', detalle: 'El equipo Junior viaja a Santiago y vuelve con la primera medalla del club.' },
  { año: '2018', titulo: 'Gimnasio propio', detalle: 'Pista de tumbling, colchonetas de competencia y horario extendido.' },
  { año: '2024', titulo: 'Ruta internacional', detalle: 'Senior Elite clasifica a su primer torneo fuera de Chile.' },
  { año: '2026', titulo: 'Club digital', detalle: 'Inscripciones online, control de pagos y asistencia en una sola plataforma.' }
];

/* --- Utilidades compartidas ------------------------------------------------ */

const CLP = value => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(value || 0));
const NUM = value => new Intl.NumberFormat('es-CL').format(Math.round(value || 0));

const todosLosEquipos = () =>
  CATEGORIAS.flatMap(cat => cat.equipos.map(eq => ({ ...eq, categoria: cat.nombre, categoriaId: cat.id, precio: cat.precio })));

const equipoPorId = id => todosLosEquipos().find(eq => eq.id === id);
const categoriaPorId = id => CATEGORIAS.find(cat => cat.id === id);

const categoriaPorEdad = edad => CATEGORIAS.find(cat => edad >= cat.edad[0] && edad <= cat.edad[1]);

function edadDesde(fechaISO) {
  if (!fechaISO) return null;
  const hoy = new Date();
  const nac = new Date(fechaISO);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

/* Cupos totales del club, calculados desde la configuración */
const CUPOS = todosLosEquipos().reduce(
  (acc, eq) => ({ total: acc.total + eq.cupos, ocupados: acc.ocupados + eq.inscritas }),
  { total: 0, ocupados: 0 }
);

window.DE = {
  CLUB, CATEGORIAS, VALORES, PROGRAMAS, COACHES, TESTIMONIOS, FAQ, HITOS, CUPOS,
  CLP, NUM, todosLosEquipos, equipoPorId, categoriaPorId, categoriaPorEdad, edadDesde
};
