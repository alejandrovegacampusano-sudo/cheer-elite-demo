# Academia Dragones Elite — sitio web + plataforma del club

Sitio público de alto impacto y panel de gestión (tipo SaaS) para la Academia
Dragones Elite, club de cheerleading de Iquique. Todo es HTML, CSS y JavaScript
sin frameworks ni build: se publica tal cual en GitHub Pages.

**Publicado en:** https://alejandrovegacampusano-sudo.github.io/cheer-elite-demo/

## Qué incluye

| Página | Para qué sirve |
|---|---|
| `index.html` | Landing del club: hero, programas, equipos con cupos reales, historia, galería, cuerpo técnico, testimonios, plataforma, preguntas frecuentes. |
| `inscripcion.html` | Inscripción en 3 pasos: categoría y equipo → ficha de la deportista → confirmación con resumen de pago. |
| `panel.html` | Panel del club: resumen con métricas y gráficos, deportistas, equipos, pagos, asistencia, calendario y ajustes. |

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

### Panel del club
- **Resumen**: deportistas activas, recaudación del mes, cobranza, ocupación de cupos, gráfico de ingresos de 6 meses, dona de ocupación, últimas inscripciones y agenda.
- **Deportistas**: buscador, filtros por equipo y estado, orden por columna, paginación, ficha lateral con historial de pagos y acciones (pausar, beca, cambiar de equipo, eliminar), exportación a CSV.
- **Pagos**: por mes, ordenados por urgencia, con marcar/revertir pago y recordatorio por WhatsApp prellenado.
- **Asistencia**: pasar lista por equipo y fecha desde el celular.
- **Calendario**: mes navegable con eventos por tipo y alta de nuevos eventos.
- **Ajustes**: datos del club, valores por categoría, exportación y reinicio de los datos de ejemplo.

## Estructura

```
index.html · inscripcion.html · panel.html
assets/
  css/  fonts.css  core.css (sistema de diseño)  site.css  panel.css
  js/   data.js (datos del club)  store.js (persistencia)  core.js (UI común)
        site.js  inscripcion.js  panel.js
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
3. **Cuentas y roles.** El acceso al panel es una pantalla de demo: cualquier clave
   entra. En producción se necesita autenticación con roles (directora, coach, tesorería).
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
