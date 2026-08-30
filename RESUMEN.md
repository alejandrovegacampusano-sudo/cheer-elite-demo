# Academia Dragones Elite — sitio web + plataforma del club

Sitio público y panel de gestión para la Academia Dragones Elite (cheerleading,
Iquique). Proyecto independiente de MOVANORTE, en su propio repo.

## Link publicado

**https://alejandrovegacampusano-sudo.github.io/cheer-elite-demo/**

Repo: `github.com/alejandrovegacampusano-sudo/cheer-elite-demo`

## Qué es ahora

Pasó de ser una página única de inscripción a **tres accesos distintos**, cada uno
con su público:

1. **Sitio público** (`index.html` + `inscripcion.html`) — para el mundo: hero a
   pantalla completa con tipografía de cartel, programas por categoría, equipos con
   cupos reales, historia, galería con visor, cuerpo técnico, testimonios, preguntas
   frecuentes, y la inscripción en tres pasos con cupos en vivo y descuento por hermanas.
2. **Portal de apoderados** (`apoderados.html`) — para las familias: entra con el
   WhatsApp de la inscripción y ve solo lo suyo. Sus hijas (puede tener varias), la
   mensualidad del mes con pago en línea, el historial, la asistencia clase por clase,
   los horarios, los avisos del club y sus propios datos, que puede corregir.
3. **Panel del club** (`panel.html`) — para la directiva y los sostenedores: dashboard
   con métricas y gráficos, deportistas con ficha lateral, equipos, control de pagos con
   recordatorio por WhatsApp, asistencia, calendario, avisos y ajustes.

Los tres están separados —cada uno con su diseño y su código— pero comparten una sola
fuente de datos, y eso es lo que los hace un sistema y no tres páginas sueltas:

- El club marca un pago → la apoderada lo ve al instante en su portal.
- La apoderada corrige un teléfono → el club lo ve en la ficha.
- El club publica un aviso → aparece en el portal de todas las familias.
- Una mamá inscribe a su hija → entra directo a su portal, ya con sesión, y la ficha
  aparece en el panel del club.

## Lo que se agregó en esta versión

- Identidad visual completa: escala tipográfica (Anton + Manrope + DM Sans
  auto-alojadas), tokens de color, sombras y curvas de animación reutilizables.
- Movimiento con intención: aparición por scroll escalonada, parallax, contadores,
  marquesina, transiciones entre páginas, confeti al confirmar, micro-interacciones
  en botones y tarjetas. Todo respeta `prefers-reduced-motion`.
- Ilustraciones de marca propias (siluetas de stunt, jumps, basket toss, tumbling,
  podio y equipo) generadas por `tools/gen-art.js`, mientras llegan las fotos reales.
- Un club sembrado y realista: 150+ deportistas repartidas en 8 equipos, con
  historial de pagos de 6 meses, asistencia y agenda, para que el panel se vea como
  una temporada en curso y no como una demo vacía.
- Adaptación a móvil en las cuatro páginas —el portal de apoderados está pensado
  para el celular primero— y navegación por teclado en visor y menús.

## Stack

HTML, CSS y JavaScript puro, sin frameworks ni compilación. Los datos se guardan
en `localStorage`; toda la persistencia está aislada en `assets/js/store.js`, que
es el único archivo a reemplazar cuando exista una API real.

## Pendiente para dejarlo 100% real

1. **Equipos y precios reales** — hoy son de ejemplo (en Instagram aparecen nombres
   como Sharks, Strike y Orion, sin confirmar).
2. **Fotos oficiales** del club para galería y programas.
3. **Logo en alta resolución** (el actual es una foto de perfil recortada).
4. **Pasarela de pago** real: Transbank, Flow o Mercado Pago.
5. **Backend y cuentas** con roles (directora, coach, tesorería) en vez de
   `localStorage` y una pantalla de acceso de demo.

Detalle técnico y guía para adaptarlo: ver `README.md`.

## Comparación con soluciones del mercado

Existen plataformas ya hechas (iClassPro, Amilia, TeamLinkt, Communiti), pero son
SaaS en dólares pensado para academias grandes. Para un club puntual como este, un
sistema propio sale más barato y a la medida — de ahí la decisión de construirlo.
