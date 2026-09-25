# Academia Dragones Elite — sitio web + plataforma del club

Sitio público de alto impacto y panel de gestión (tipo SaaS) para la Academia
Dragones Elite, club de cheerleading de Iquique. Todo es HTML, CSS y JavaScript
sin frameworks ni build: se publica tal cual en GitHub Pages.

**Publicado en:** https://alejandrovegacampusano-sudo.github.io/cheer-elite-demo/

**Demo para la directiva:** https://alejandrovegacampusano-sudo.github.io/cheer-elite-demo/demo.html
— los tres accesos, entrada directa sin formularios (`panel.html?demo`, `panel.html?demo&vista=caja`,
`apoderados.html?demo`), un recorrido de 10 minutos, código QR para el celular y un botón para
reiniciar los datos de ejemplo.

## Tres accesos, tres audiencias

| Acceso | Para quién | Qué ve |
|---|---|---|
| **Sitio público** (`index.html`, `inscripcion.html`) | El mundo y las familias nuevas | Quién es el club, equipos con cupos reales, galería, e inscripción en 3 pasos. |
| **Portal de apoderados** (`apoderados.html`) | La mamá o el papá de cada deportista | Solo lo suyo: sus hijas, sus pagos, su asistencia, sus horarios y los avisos del club. |
| **Panel del club** (`panel.html`) | Directiva, sostenedores y cuerpo técnico | Todo: dashboard, deportistas, equipos, pagos, asistencia, calendario y avisos. |

Están separados a propósito —cada uno con su CSS, su JS y su público— pero comparten
la misma fuente de datos: si el club marca un pago, la apoderada lo ve al instante; si
la apoderada corrige un teléfono, el club lo ve en la ficha.

### Sitio público
Concepto **"dragón en vuelo"**: negro profundo con fuego (rojo, brasa y oro).
- Hero en cuatro profundidades: escamas y brasas en canvas al fondo, la palabra
  DRAGONES gigante en contorno, el título letra por letra y atletas ilustradas
  que entran "lanzadas" en arco y quedan flotando. Parallax con el scroll y
  con el mouse.
- Zarpazos que se dibujan entre secciones, títulos que suben palabra por palabra,
  contadores, marquesina y cursor propio (solo con mouse).
- **Quiénes somos** con los cinco valores del club: cada ícono se enciende y su
  línea se dibuja al entrar en pantalla.
- **Logros**: cifras y una línea de tiempo 2007 → hoy que se recorre en
  horizontal mientras bajas (vertical en celular).
- **Competencias** con cuenta regresiva en vivo, tomadas del calendario del panel.
- **Tryouts**: formulario corto que sugiere la categoría por edad y abre
  WhatsApp con el mensaje listo (y lo envía por correo si hay endpoint).
- **Equipos**: al elegir una categoría se ve su **calendario de la semana** —qué días
  y a qué hora entrena, con el día de hoy marcado— más las tarjetas con cupos reales.
  Los días salen del horario configurado de cada equipo (`Store.horarioDe`), no se
  cargan aparte.
- **Sin valores en todo el sitio público** (portada e inscripción): el club los informa
  en la clase de evaluación. Los montos siguen existiendo en `data.js` y se usan para
  los cargos, pero solo se ven en el panel y en el portal de cada familia.
- Programas por categoría, galería con visor, coaches, testimonios,
  **auspiciadores** ("Tu marca aquí" + qué recibe una marca), preguntas y
  **contacto** con redes oficiales y mapa que solo carga al pedirlo.
- Con `prefers-reduced-motion` no se anima nada; si las librerías no cargan, el
  sitio queda completo y estático. En celular: menos brasas, parallax suave, sin
  cursor propio.
- SEO local: título y descripción con "club de cheerleading en Iquique",
  datos estructurados `SportsClub` (schema.org) y vista previa para compartir.

### Inscripción
- Sugerencia automática de categoría a partir de la edad.
- Equipos con cupos en vivo; los llenos quedan bloqueados.
- Descuento por hermanas y opción de clase de prueba, ambos reflejados en el total al instante.
- Validación con mensajes claros y aviso cuando la edad no calza con la categoría.
- Al confirmar, la deportista queda registrada y aparece de inmediato en el panel.

### Portal de apoderados
- Entra con el WhatsApp que dejó en la inscripción; puede tener varias hijas y cambia entre ellas.
- Tarjeta de la deportista: equipo, horario, coach, antigüedad.
- Mensualidad del mes con pago en línea simulado e historial de 6 meses.
- Asistencia clase por clase con lectura en lenguaje humano.
- Avisos que publica el club, calendario semanal o mensual de su deportista
  (entrenamientos según el horario de su equipo, competencias, actividades y el
  vencimiento de la mensualidad) y próximas fechas.
- Puede corregir sus propios datos (teléfono, correo, talla, emergencia, condición médica) y el cambio llega a la ficha del club.
- Al terminar la inscripción entra directo a su portal, ya con la sesión abierta.

### Panel del club
- **Resumen**: deportistas activas, recaudación del mes, cobranza, ocupación de cupos, gráfico de ingresos de 6 meses, dona de ocupación, últimas inscripciones y agenda.
- **Deportistas**: buscador, filtros por equipo y estado, orden por columna, paginación, ficha lateral con historial de pagos y acciones (pausar, beca, cambiar de equipo, eliminar), exportación a CSV.
- **Mensualidades**: por mes, ordenadas por urgencia, con marcar/revertir pago y recordatorio por WhatsApp prellenado.
- **Asistencia**: pasar lista por equipo y fecha desde el celular.
- **Calendario**: mes navegable con eventos por tipo y alta de nuevos eventos.
- **Avisos**: publica mensajes que aparecen de inmediato en el portal de todas las familias.
- **Equipos**: ocupación y cobranza, y **«Horario y aviso»** para cambiar días, hora,
  coach y cupos de un equipo. El cambio se aplica al instante en el sitio, en el portal
  y en el calendario de cada familia (`Store.actualizarEquipo` guarda los cambios aparte
  de los datos base y envuelve las funciones que leen equipos). Desde ahí mismo se avisa
  a las familias: mensaje listo para **copiar y pegar en el grupo de WhatsApp** del
  equipo, o para **enviar una por una** a cada apoderado.
- **Ajustes**: datos del club, valores por categoría, exportación y reinicio de los datos de ejemplo.

### Finanzas y piloto automático
Pensado desde el entrenador: **lo que quiere dejar de hacer para dedicarse a entrenar.**
El sistema hace el trabajo administrativo y la persona solo decide lo que un sistema
no debería decidir solo. La unidad es la **familia**: los hermanos comparten una sola
cuenta, un solo mensaje y un solo pago.

| Hoy se hace a mano | Lo hace el sistema |
|---|---|
| Cargar la mensualidad a cada deportista | El piloto la carga el día 1, con su beca |
| Perseguir por WhatsApp a quien no pagó | Recordatorios escalonados (−3, +1 y +10 días), uno por familia, nunca repetidos |
| Revisar el banco para ver quién transfirió | Se sube la cartola CSV y reconoce el pago por nombre del apoderado o del hijo y por monto |
| Preguntar "¿ya pagaste?" por WhatsApp | La familia avisa su transferencia con el comprobante y el club la confirma con un clic |
| Hacer comprobantes | Cada pago genera uno con folio correlativo, imprimible |
| Llevar las cuotas del viaje en un cuaderno | Cobros en cuotas con avance y "quién falta" |
| Armar el Excel de la rendición | Rendición mensual con cascada, publicada sola en el portal |

- **Hoy**: la pantalla de entrada. Solo lo que necesita una decisión (transferencias sin
  identificar, familias con más de 30 días, cuotas por vencer, gastos sin boleta) y lo que
  hizo el piloto, con el tiempo estimado que ahorró y cómo se calcula.
- **Familias**: estado de cuenta por apoderado, antigüedad de la deuda, registrar pago
  de varios cargos a la vez, convenios de pago (el piloto deja de insistir), comprobantes
  y anulación.
- **Cuotas**: viajes, uniformes o torneos en N cuotas para todo el club, una categoría o
  un equipo; grilla deportista × cuota.
- **Caja**: saldo, ingresos y egresos de 6 meses, movimientos con respaldo y conciliación
  de la cartola bancaria (leída en el navegador, no se sube a ningún servidor).
- **Rendición**: saldo inicial → ingresos → egresos → saldo final. Solo la ve la
  directiva; lo publicado queda fijo.
- **Piloto automático**: reglas editables (día de vencimiento, días y textos de cada
  recordatorio, cuándo escalar, conciliación automática, día de la rendición), cola de
  WhatsApp y bitácora.
- **Portal de apoderados**: estado de cuenta de toda la familia y pago paso a paso.
  Con **tarjeta** (formulario Webpay simulado, confirmación al instante y comprobante) o
  con **transferencia**: muestra los datos de la cuenta del club con botón de copiar, la
  familia sube la foto o el PDF de su comprobante y el cargo queda «en revisión» —el piloto
  deja de enviarle recordatorios— hasta que alguien del club lo confirma desde «Hoy», con la
  imagen a la vista. Si lo rechaza, el cargo vuelve a quedar pendiente. La rendición de
  cuentas del club NO se muestra aquí: es solo de la directiva, en el panel.

## Estructura

```
index.html · inscripcion.html · apoderados.html · panel.html
legal.html · privacidad.html · 404.html · demo.html
assets/
  css/  fonts.css  core.css (sistema de diseño)  site.css  portal.css  panel.css
        fuego.css (secciones y efectos de la portada)  finanzas.css
  js/   data.js (datos del club)  store.js (persistencia)  core.js (UI común)
        finanzas.js (cuentas, conciliación y piloto)  panel-finanzas.js (vistas)
        site.js  inscripcion.js  apoderados.js  panel.js
        fuego.js (movimiento de la portada)  consentimiento.js
  img/  art-*.svg, volando-*.svg, escamas.svg (ilustraciones de marca)
  fotos/ fotos reales del club (ver LEEME.txt)
  fonts/ Anton, DM Sans, Manrope, Playfair Display auto-alojadas (OFL)
  vendor/ GSAP 3 + ScrollTrigger + SplitText y Lenis, alojados en el sitio
          (licencias en vendor/LICENCIAS.txt)
tools/gen-art.js  → regenera las ilustraciones: node tools/gen-art.js
```

## Cómo adaptarlo al club real

1. **Equipos, horarios, precios y cupos** → `assets/js/data.js`. Todo el sitio y el
   panel leen de ahí: cambiar un precio actualiza landing, inscripción y panel.
2. **WhatsApp, correo y dirección** → objeto `CLUB` en el mismo archivo.
3. **Fotos reales** → dejar los archivos en `assets/fotos/` con el nombre que indica
   `assets/fotos/LEEME.txt` y listo: la página los detecta al cargar y reemplaza la
   ilustración. No hay que tocar código ni una lista de imágenes. Mientras una foto no
   exista, esa pieza sigue mostrando su ilustración, así que se puede ir subiendo de a poco.

   | Archivo | Dónde aparece | Formato |
   |---|---|---|
   | `hero.jpg` | Portada, junto al titular | Vertical, aire arriba |
   | `banda.jpg` | Cinta a pantalla completa | Horizontal 16:9, motivo a la derecha |
   | `galeria-1..8.jpg` | Mosaico "Momentos Dragones" | 1 y 5 grandes, 4 y 8 anchas |
   | `programa-<categoría>.jpg` | Tarjetas de programas | Horizontal |
   | `coach-<nombre-con-guiones>.jpg` | Cuerpo técnico | Vertical 4:5 |
   | `testimonio-1..4.jpg` | Carrusel de testimonios | Cuadrada |
4. **Logo en alta resolución** → reemplazar `assets/logo-dragones.png` (el actual es
   una foto de perfil de Instagram recortada).

## Antes de publicarlo de verdad

El sitio ya trae lo básico de una web publicada: página 404 propia, vista previa
al compartir, favicon, textos legales y banner de consentimiento. Falta completar
con datos del club:

| Qué | Dónde | Estado |
|---|---|---|
| Razón social, RUT y domicilio | `legal.html` y `privacidad.html`, marcados `POR COMPLETAR` | Pendiente del club |
| WhatsApp real | `CLUB.whatsapp` en `assets/js/data.js` | Hoy es un número de ejemplo |
| Correo donde llegan las inscripciones | `CLUB.formEndpoint` — URL de Formspree, Web3Forms o similar | Vacío: solo avisa por WhatsApp |
| Estadísticas de visitas | `ANALITICA.codigo` en `assets/js/consentimiento.js` | Vacío: sin código no aparece el banner |
| Revisión legal | Los textos los redactó una IA sobre la Ley 21.719 | Debe revisarlos un abogado |

**Marco legal:** rige la **Ley 21.719** de protección de datos personales, que entra
en vigencia el **1 de diciembre de 2026** (no RGPD ni LSSI, que son europeas). Lo más
delicado de este sitio no son las cookies —no usa— sino que el formulario recoge
**datos de salud de menores**, que la ley trata como dato sensible: requieren
consentimiento expreso del apoderado y acceso restringido.

## Pendiente para producción

1. **Backend real.** Hoy todo vive en `localStorage` del navegador: los datos no se
   comparten entre dispositivos. Al conectar una API, el único archivo que cambia es
   `assets/js/store.js` (su interfaz ya está aislada del resto).
   El comprobante que sube la familia se achica en el navegador antes de guardarse.
2. **Pasarela de pago.** El pago con tarjeta es simulado: falta integrar Webpay
   (Transbank) o Flow. Requiere club constituido con RUT e inicio de actividades en el
   SII y cuenta bancaria a nombre del club. La transferencia ya funciona sin pasarela:
   la familia sube su comprobante y el club lo confirma. Los datos de la cuenta están
   en `CLUB.banco` (`assets/js/data.js`) y hoy son de ejemplo.
3. **Piloto en el servidor y WhatsApp Business.** Hoy el piloto corre al abrir el panel o
   el portal, y los recordatorios quedan en una cola que se envía con un toque. En
   producción corre cada mañana en el servidor y los mensajes salen solos por la API de
   WhatsApp Business (Meta cobra por conversación iniciada). La conciliación puede pasar
   de subir la cartola a leerla directo del banco con un agregador (p. ej. Fintoc).
4. **Cuentas y roles.** Los dos accesos son pantallas de demo: al panel entra cualquier
   clave y al portal basta el teléfono. En producción hacen falta cuentas reales: roles
   para el club (directora, coach, tesorería) y verificación por código de WhatsApp para
   los apoderados.
4. **Datos reales del club.** Los nombres de equipos, precios y logros son de ejemplo.
   En Instagram aparecen nombres como Sharks, Strike y Orion, sin confirmar.
5. **Fotografías oficiales.** Las ilustraciones vectoriales son un puente hasta tener
   fotos de la temporada.

## Desarrollo

No hay que instalar nada ni compilar: las librerías de movimiento vienen incluidas en `assets/vendor/`. Para verlo en local con las fuentes cargadas
hace falta servirlo por HTTP (con `file://` el navegador bloquea las tipografías):

```bash
python3 -m http.server 8000   # luego abrir http://localhost:8000
```
