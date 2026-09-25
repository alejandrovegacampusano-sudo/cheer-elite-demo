# Sistema de diseño · Academia Dragones Elite

Fuente única de verdad para las tres superficies del producto. Antes de tocar
CSS, leer esto. Si una decisión no está aquí, se agrega aquí primero.

Origen de las reglas: perfiles `Data-Dense Dashboard` y `Analytics Dashboard`,
guías de tipografía/tablas/gráficos de `ui-ux-pro-max`, y contrastes medidos a
mano contra los fondos reales del proyecto.

---

## 1. Tres superficies, tres densidades

El error que originó este documento fue tratar las tres igual: el panel de
gestión estaba maquetado como una landing, con filas de 67px y aire de sobra.

| Superficie | Archivos | Densidad | Voz |
|---|---|---|---|
| **Sitio público** | `index.html`, `inscripcion.html` · `site.css` | Espaciosa: secciones de 56-108px, medida de 62ch | Emocional. Cartel + revista |
| **Portal de apoderados** | `apoderados.html` · `portal.css` | Media: tarjetas grandes, una columna, primero el celular | Cercana. Frases cortas |
| **Panel del club** | `panel.html` · `panel.css` | Densa: padding 12, gap 8, fila 42px | Neutra. Datos, cero decoración |

Regla: **el panel no se hojea, se escanea.** Cada píxel de aire de más es una
fila menos en pantalla.

---

## 2. Color

```
--bg      #0a0a0f   fondo general
--panel   #121117   superficie de tarjeta
--fire    #e10600   rojo dragón: SOLO decorativo o texto grande (3.98:1)
--ember   #ff5a1f   brasa: etiquetas, subtítulos, trazos (6.33:1)
--gold    #f5b700   oro: acciones, cifras, datos destacados (10.96:1)
--grad-gold  ember → gold   botones (texto oscuro encima)
--grad-fire  fire → ember → gold   solo titulares grandes y arte
--ink     #f7f3e9   texto principal
--muted   #b4ab99   texto secundario
--muted-2 #8f8778   etiquetas y metadatos
--ok #49dd9b · --warn #ffc24b · --alert #ff6a4d · --info #7db8ff
```

**Contrastes medidos** (mínimo AA para texto pequeño: 4.5:1)

| Color | Sobre panel | Sobre fondo |
|---|---|---|
| `ink` | 17.0 : 1 | 18.2 : 1 |
| `muted` | 8.3 : 1 | 8.8 : 1 |
| `muted-2` | 5.3 : 1 | 5.7 : 1 |
| `gold` | 10.9 : 1 | 11.0 : 1 |
| `ember` | — | 6.3 : 1 |
| `fire` | — | 4.0 : 1 → solo texto grande |
| `alert` | 6.6 : 1 | — |

El `--muted-2` anterior (`#6d6659`) daba **3.3:1** y no pasaba. Cualquier color
nuevo para texto se mide antes de entrar, no después.

El estado nunca se comunica solo con color: cada etiqueta lleva palabra
("Al día", "Pendiente", "Vencida"), no solo el punto verde o rojo.

---

## 3. Tipografía

| Familia | Para qué | Nunca |
|---|---|---|
| **Anton** | Hero del sitio y cierre. La voz de cartel | En el panel ni en tablas |
| **Playfair Display** | Titulares de secciones con relato, bastardilla en dorado | En datos ni en botones |
| **Manrope** | Números, KPIs, nombres de tarjeta | Como texto corrido |
| **DM Sans** | Todo el cuerpo y toda la interfaz | — |

**Escala modular, sin valores intermedios inventados:**
`12 · 13 · 14 · 18 · 24 · 32` y de ahí para arriba con `clamp()` en el sitio.
En el panel viven como `--fs-xs … --fs-xl`. Nada de 10.5, 11.5 ni 13.5.

Números siempre con `font-variant-numeric: tabular-nums`.

---

## 4. Densidad del panel

```
--pad 12px · --gap 8px · --row-h 42px · --side-w 240px · --top-h 56px
```

- Tabla: cabecera pegajosa, ordenable por columna, `overflow-x` en el contenedor.
- Selección múltiple con casilla + barra de acciones. Cobrar de a una es
  justamente el trabajo que este panel viene a eliminar.
- 20 filas por página: con filas de 42px caben, con las de 67px no cabían.

---

## 5. Gráficos

| Dato | Forma correcta | Por qué |
|---|---|---|
| Ingresos en el tiempo | Línea + área al 20-28% | Es una tendencia, no una comparación entre categorías |
| Cobranza vs objetivo | Medidor tipo *bullet* con marca de meta | Un porcentaje solo no dice si va bien |
| Ocupación de cupos | Dona con leyenda en texto | Una proporción de un total |

Todo gráfico lleva su alternativa en texto (`#serie-texto`): las mismas cifras
escritas, con el cambio respecto al mes anterior. Sirve para lector de pantalla
y para leer el número exacto sin apuntar con el mouse.

---

## 6. Iconos

SVG de trazo, 24×24, `stroke-width 1.6`, `currentColor`. **Nunca caracteres
tipográficos** (◱ ◈ ◇ ▤) ni emoji haciendo de icono: no escalan, no heredan
color y delatan el prototipo.

---

## 7. Movimiento

- Entradas por scroll: 850ms, escalonadas de a 90ms.
- Micro-interacciones: 200-300ms.
- Panel: solo cambios de estado, sin animación decorativa.
- Todo respeta `prefers-reduced-motion`.

---

## 8. Fotos

`assets/fotos/<nombre>.jpg` reemplaza sola a la ilustración de marca; la
búsqueda es perezosa. Nombres y proporciones en `assets/fotos/LEEME.txt`.
Nunca imágenes generadas con IA haciéndose pasar por las deportistas reales.

---

## 9. El club, según sus propias fotos

Revisando material real de `@dragoneselite` aparecieron dos cosas que el
prototipo tenía mal:

- **El club es mixto.** En las fotos del equipo mayor hay varones con uniforme
  Dragones Elite. Todo el texto estaba escrito para niñas ("tu hija", "las
  deportistas"). Corregido en las cuatro páginas; la ficha ahora registra
  género y los estados concuerdan.
- **La paleta es más ancha que negro + dorado.** El telón de competencia es
  negro con dorado y cromo, pero el uniforme lleva el logo en **celeste** con
  acentos **cobre/naranja** sobre gris perla. Falta confirmarlo contra el
  archivo original del logo: el que hay en el repo es una miniatura de 165px
  recortada de Instagram (65% negro, 8% dorado, 16% grises, 9% rojo).

## 10. Movimiento (portada)

GSAP + ScrollTrigger + SplitText + Lenis, alojados en `assets/vendor/`, orquestados
en `assets/js/fuego.js`.

- El HTML ya es el estado final. El JS solo anima **desde** algo; si no corre,
  no falta nada.
- `prefers-reduced-motion: reduce` → no se carga ninguna animación.
- Solo `transform`, `opacity` y `clip-path` puntual. Nada que fuerce layout.
- Celular: sin cursor propio ni parallax de mouse, parallax a un tercio, 28
  brasas en vez de 80, logros en vertical.
- Las brasas se detienen cuando el hero sale de pantalla o la pestaña se oculta.
- "Elite" no se parte en letras: el degradado de fuego se rompería.

## 11. Finanzas

- **La pantalla de entrada del panel es "Hoy", no un dashboard.** Muestra solo lo que
  necesita una decisión humana; lo que el sistema resolvió va en la bitácora.
- **Agrupar lo repetido.** 13 familias atrasadas son una tarjeta con la lista, no 13 tarjetas.
- **Colores de serie** (validados con el script de dataviz sobre `#121117`: banda de
  luminosidad, separación para daltonismo y contraste 3:1):
  `--serie-ingreso #c08a00` · `--serie-egreso #4f8ad4` · `--serie-saldo #6f6b7a`.
  El oro y el rojo de marca no se usan como serie: el oro es acento y el rojo es alerta.
- Los gráficos se dibujan **al ancho real de su caja** (se mide antes de pintar); un
  `viewBox` fijo con `height` fijo encoge el gráfico y apelotona las etiquetas.
- Todo gráfico tiene tooltip con mouse y teclado, leyenda y **"Ver como tabla"**.
- Montos con `font-variant-numeric: tabular-nums` y alineados a la derecha.
- Los mensajes explican el **porqué** de cada decisión del sistema ("Nombre del apoderado
  y monto calzan", "El monto calza con 2 familias").

## 12. Antipatrones (ya cometidos en este repo)

1. Maquetar el panel con aire de landing. → Filas de 67px, 12 por página.
2. Elegir un color de texto "que se ve bien" sin medir. → 3.3:1.
3. Usar caracteres tipográficos como iconos.
4. Barras para una serie temporal.
5. Tamaños de fuente arbitrarios (10.5, 11.5, 12.5, 13.5) en la misma vista.
6. `clip-path` en el contenedor de una animación de entrada: recorta a los
   hijos que sobresalen.
7. No resetear el margen de `<figure>`: descuadra cualquier grilla.
8. Escribir el sitio de un club real sin mirar sus fotos: quedó de un solo
   género durante todo el desarrollo.
9. Poner la foto de referencia de una menor que no es del club en la vista
   previa para compartir: viaja por WhatsApp como si fuera una deportista
   Dragones. La imagen OG usa solo arte propio hasta tener fotos autorizadas.
10. Que un proceso automático escriba datos que aún no se han sembrado: el piloto leyó
    las mensualidades directo de `localStorage` antes de que existieran y borró el
    historial de la temporada. Siempre leer a través de `Store`.
