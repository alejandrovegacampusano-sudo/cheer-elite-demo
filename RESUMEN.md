# Prototipo — Academia Dragones Elite (Inscripciones)

Prototipo web de inscripciones y gestión para la Academia Dragones Elite (cheerleading, Iquique). Proyecto independiente de MOVANORTE — vive en su propia carpeta (`prototipo-cheer/`) y su propio repo de GitHub.

## Link publicado

**https://alejandrovegacampusano-sudo.github.io/cheer-elite-demo/**

Repo: `github.com/alejandrovegacampusano-sudo/cheer-elite-demo`

## Qué hace

**Vista pública (landing + inscripción):**
1. Hero con identidad del club ("Esto es más que cheer", lema real "El Dragón, una vez más") — la energía del club antes que la venta.
2. Strip de logros: años de trayectoria, familias en la comunidad, equipos activos, campeonatos.
3. Flujo de inscripción en 3 pasos:
   - **Categoría** → según edad (Mini, Youth, Junior, Senior), con selección de equipo dentro de cada una.
   - **Ficha** → datos de la deportista, apoderado, alergias/condiciones médicas, contacto de emergencia.
   - **Confirmar** → resumen + matrícula/mensualidad (pago simulado, sin pasarela real todavía).
4. Sección "Momentos Dragones Elite" — galería tipo mosaico con degradados de marca (placeholder hasta tener fotos reales del club).

**Panel del club** (botón arriba a la derecha):
- Métricas: deportistas activas, equipos, ingreso mensual proyectado, nuevas inscripciones.
- Filtro por equipo.
- Lista de fichas con estado de pago (al día / pendiente).

## Identidad visual

- Paleta: negro + dorado + blanco cálido, con brillo "tornasol" animado (degradado dorado/blanco en movimiento) — tomada de la paleta real del club, no de MOVANORTE.
- Logo: foto de perfil real de Instagram (`@dragoneselite`), recortada y usada en el header y la tarjeta de confianza (`assets/logo-dragones.png`).
- Fondo animado (blobs difuminados dorado/blanco), scroll reveal, contadores animados, transiciones entre pasos, micro-interacciones en botones y tarjetas.

## Stack técnico

HTML + CSS + JS puro (sin frameworks), igual que los otros prototipos de MOVANORTE. Datos guardados en `localStorage` del navegador — no hay backend ni base de datos real todavía.

## Pendiente (para dejarlo 100% real)

1. **Categorías/equipos reales**: hoy son de ejemplo (Mini/Youth/Junior/Senior con equipos genéricos). Falta reemplazar con los equipos reales del club (vi nombres como Sharks, Strike, Orion en su Instagram, sin confirmar).
2. **Precios reales** de matrícula y mensualidad por categoría.
3. **Logo en alta resolución**: el actual es una foto de perfil de Instagram recortada; si el club tiene el archivo original (PNG/SVG transparente), reemplazar para que se vea nítido en cualquier tamaño.
4. **Pasarela de pago real** (Transbank, Flow o Mercado Pago) — hoy el pago es solo simulado.
5. **Fotos reales** del club para la sección "Momentos Dragones Elite" (hoy son degradados de color, no fotos).

## Comparación con soluciones del mercado

Existen plataformas ya hechas para esto (iClassPro, Amilia, TeamLinkt, Communiti), pero son SaaS pagado en USD pensado para academias grandes/cadenas. Para un club puntual como este, un sistema propio sale más barato y a la medida — de ahí la decisión de construir este prototipo en vez de contratar una de esas herramientas.
