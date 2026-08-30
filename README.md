# Academia Dragones Elite — sitio web + plataforma del club

Sitio público de alto impacto y panel de gestión (tipo SaaS) para la Academia
Dragones Elite, club de cheerleading de Iquique. Todo es HTML, CSS y JavaScript
sin frameworks ni build: se publica tal cual en GitHub Pages.

**Publicado en:** https://alejandrovegacampusano-sudo.github.io/cheer-elite-demo/

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
- Hero con tipografía Anton, degradado tornasol animado, tarjetas flotantes y parallax.
- Marquesina infinita, contadores animados y aparición por scroll con escalonado.
- Programas por categoría con arte propio y detalle que se despliega al pasar el cursor.
- Equipos con pestañas por categoría y **cupos calculados desde los datos reales** del club.
- Galería en mosaico con visor a pantalla completa (teclado y gestos).
- Carrusel de testimonios, línea de tiempo, acordeón de preguntas y CTA final.
- Enlace directo a WhatsApp en botón flotante, CTA y pie.

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
- Avisos que publica el club y próximas fechas del calendario.
- Puede corregir sus propios datos (teléfono, correo, talla, emergencia, condición médica) y el cambio llega a la ficha del club.
- Al terminar la inscripción entra directo a su portal, ya con la sesión abierta.

### Panel del club
- **Resumen**: deportistas activas, recaudación del mes, cobranza, ocupación de cupos, gráfico de ingresos de 6 meses, dona de ocupación, últimas inscripciones y agenda.
- **Deportistas**: buscador, filtros por equipo y estado, orden por columna, paginación, ficha lateral con historial de pagos y acciones (pausar, beca, cambiar de equipo, eliminar), exportación a CSV.
- **Pagos**: por mes, ordenados por urgencia, con marcar/revertir pago y recordatorio por WhatsApp prellenado.
- **Asistencia**: pasar lista por equipo y fecha desde el celular.
- **Calendario**: mes navegable con eventos por tipo y alta de nuevos eventos.
- **Avisos**: publica mensajes que aparecen de inmediato en el portal de todas las familias.
- **Ajustes**: datos del club, valores por categoría, exportación y reinicio de los datos de ejemplo.

## Estructura

```
index.html · inscripcion.html · apoderados.html · panel.html
assets/
  css/  fonts.css  core.css (sistema de diseño)  site.css  portal.css  panel.css
  js/   data.js (datos del club)  store.js (persistencia)  core.js (UI común)
        site.js  inscripcion.js  apoderados.js  panel.js
  img/  art-*.svg (ilustraciones de marca)
  fonts/ Anton, DM Sans, Manrope auto-alojadas (OFL)
tools/gen-art.js  → regenera las ilustraciones: node tools/gen-art.js
```

## Cómo adaptarlo al club real

1. **Equipos, horarios, precios y cupos** → `assets/js/data.js`. Todo el sitio y el
   panel leen de ahí: cambiar un precio actualiza landing, inscripción y panel.
2. **WhatsApp, correo y dirección** → objeto `CLUB` en el mismo archivo.
3. **Fotos reales** → dejar los archivos en `assets/img/` y reemplazar el nombre del
   arte: campo `art` de cada categoría en `data.js` y la lista `SHOTS` al inicio de
   `assets/js/site.js`. Sirven `.jpg`, `.webp` o `.svg` con la misma proporción.
4. **Logo en alta resolución** → reemplazar `assets/logo-dragones.png` (el actual es
   una foto de perfil de Instagram recortada).

## Pendiente para producción

1. **Backend real.** Hoy todo vive en `localStorage` del navegador: los datos no se
   comparten entre dispositivos. Al conectar una API, el único archivo que cambia es
   `assets/js/store.js` (su interfaz ya está aislada del resto).
2. **Pasarela de pago.** El cobro es simulado; falta integrar Transbank, Flow o
   Mercado Pago en el paso 3 de la inscripción.
3. **Cuentas y roles.** Los dos accesos son pantallas de demo: al panel entra cualquier
   clave y al portal basta el teléfono. En producción hacen falta cuentas reales: roles
   para el club (directora, coach, tesorería) y verificación por código de WhatsApp para
   los apoderados.
4. **Datos reales del club.** Los nombres de equipos, precios y logros son de ejemplo.
   En Instagram aparecen nombres como Sharks, Strike y Orion, sin confirmar.
5. **Fotografías oficiales.** Las ilustraciones vectoriales son un puente hasta tener
   fotos de la temporada.

## Desarrollo

No hay dependencias ni compilación. Para verlo en local con las fuentes cargadas
hace falta servirlo por HTTP (con `file://` el navegador bloquea las tipografías):

```bash
python3 -m http.server 8000   # luego abrir http://localhost:8000
```
