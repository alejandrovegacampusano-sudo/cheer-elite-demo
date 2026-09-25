/* Generador de arte vectorial para Dragones Elite.
   Crea pósters SVG (siluetas pictográficas + luz + trama) usados como imágenes del sitio. */
const fs = require('fs');
const path = require('path');
const OUT = path.join(process.cwd(), 'assets/img');

/* --- Poses: puntos en coordenadas locales (cadera en 0,0, figura ~200 alto) --- */
const POSES = {
  highV:   { head:[0,-106], arms:[[[-30,-104],[-58,-152]], [[30,-104],[58,-152]]], legs:[[[-14,52],[-18,106]], [[14,52],[18,106]]] },
  base:    { head:[0,-106], arms:[[[-22,-120],[-16,-164]], [[22,-120],[16,-164]]], legs:[[[-26,52],[-30,106]], [[26,52],[30,106]]] },
  liberty: { head:[0,-106], arms:[[[-32,-106],[-60,-154]], [[32,-106],[60,-154]]], legs:[[[6,54],[4,108]], [[-46,30],[-4,54]]] },
  toetouch:{ head:[0,-106], arms:[[[-48,-80],[-100,-96]], [[48,-80],[100,-96]]], legs:[[[-72,-8],[-128,-30]], [[72,-8],[128,-30]]] },
  tuck:    { head:[0,-102],  arms:[[[-40,-88],[-74,-118]], [[40,-88],[74,-118]]], legs:[[[-46,22],[-14,-24]], [[46,22],[14,-24]]] },
  scale:   { head:[0,-106], arms:[[[-40,-116],[-40,-166]], [[40,-116],[40,-166]]], legs:[[[10,54],[8,108]], [[-58,20],[-118,4]]] },
  reach:   { head:[0,-106], arms:[[[-26,-124],[-22,-170]], [[26,-124],[22,-170]]], legs:[[[-18,52],[-22,106]], [[18,52],[22,106]]] },
  handspr: { head:[0,-102],  arms:[[[-44,-70],[-96,-52]], [[44,-84],[96,-70]]], legs:[[[-30,44],[-56,96]], [[36,40],[86,70]]] }
};

/* Dibuja una figura: torso ahusado + miembros con trazo redondeado + cabeza con coleta */
function figure(pose, { x = 0, y = 0, s = 1, rot = 0, color = '#0a0906', op = 1, pony = true } = {}) {
  const p = POSES[pose];
  const [hx, hy] = p.head;
  const arm = (side, [e, h]) => `M${side * 24} -62 L${e[0]} ${e[1]} L${h[0]} ${h[1]}`;
  const leg = (side, [k, f]) => `M${side * 13} 2 L${k[0]} ${k[1]} L${f[0]} ${f[1]}`;
  const torso = `M-27 -70 Q0 -78 27 -70 L19 8 Q0 14 -19 8 Z`;
  const ponytail = pony
    ? `<path d="M${hx - 8} ${hy - 18} C${hx - 46} ${hy - 18} ${hx - 54} ${hy + 14} ${hx - 30} ${hy + 50} C${hx - 44} ${hy + 10} ${hx - 34} ${hy - 4} ${hx - 4} ${hy - 2} Z" fill="${color}" />`
    : '';
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity="${op}">
    <g fill="none" stroke="${color}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round">
      ${p.arms.map((a, i) => `<path d="${arm(i === 0 ? -1 : 1, a)}" />`).join('')}
    </g>
    <g fill="none" stroke="${color}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
      ${p.legs.map((l, i) => `<path d="${leg(i === 0 ? -1 : 1, l)}" />`).join('')}
    </g>
    <path d="${torso}" fill="${color}" />
    <circle cx="-24" cy="-64" r="12" fill="${color}" />
    <circle cx="24" cy="-64" r="12" fill="${color}" />
    <rect x="-8" y="-84" width="16" height="22" rx="7" fill="${color}" />
    ${ponytail}
    <circle cx="${hx}" cy="${hy}" r="20" fill="${color}" />
  </g>`;
}

const arc = (d, color, w = 3, op = .5, dash = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" opacity="${op}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''} />`;

function confetti(color, n, seed, W, H) {
  let out = '', r = seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H * .85, a = rnd() * 360, w = 5 + rnd() * 9;
    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(w * .38).toFixed(1)}" rx="1.5" fill="${color}" opacity="${(.18 + rnd() * .4).toFixed(2)}" transform="rotate(${a.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" />`;
  }
  return out;
}

const THEMES = {
  /* Tonos de fuego: rojo, brasa y oro del logo real */
  gold:  { a: '#ffd36b', b: '#e0561a', fig: '#12060a', ink: '#12060a', spot: '#fff1c9', halo: '#ffffff' },
  night: { a: '#140809', b: '#3d0e06', fig: '#ff7a2e', ink: '#f7f3e9', spot: '#ff5a1f', halo: '#f5b700' },
  glow:  { a: '#240b06', b: '#b2360c', fig: '#ffd9a0', ink: '#fff2cd', spot: '#ffb347', halo: '#ffd08a' },
  cream: { a: '#ffe9b8', b: '#f59a00', fig: '#12060a', ink: '#12060a', spot: '#ffffff', halo: '#ffffff' },
  ember: { a: '#1c0906', b: '#8a2308', fig: '#ffb34d', ink: '#fff2cd', spot: '#ff7a2e', halo: '#ffb347' }
};

function poster({ name, W = 900, H = 700, theme = 'gold', word = '', scene, dots = true }) {
  const t = THEMES[theme];
  const id = name.replace(/[^a-z0-9]/gi, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${word || name}">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.a}" /><stop offset="1" stop-color="${t.b}" />
    </linearGradient>
    <radialGradient id="spot${id}" cx="50%" cy="14%" r="72%">
      <stop offset="0" stop-color="${t.spot}" stop-opacity=".78" /><stop offset="1" stop-color="${t.spot}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="fade${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity=".55" />
    </linearGradient>
    <pattern id="dots${id}" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.7" fill="${t.ink}" opacity=".2" />
    </pattern>
    <clipPath id="clip${id}"><rect width="${W}" height="${H}" /></clipPath>
  </defs>
  <g clip-path="url(#clip${id})">
    <rect width="${W}" height="${H}" fill="url(#bg${id})" />
    <rect width="${W}" height="${H}" fill="url(#spot${id})" />
    ${dots ? `<rect width="${W}" height="${H}" fill="url(#dots${id})" />` : ''}
    ${word ? `<text x="${W / 2}" y="${H * .62}" text-anchor="middle" font-family="Impact, 'Arial Black', 'Helvetica Neue', sans-serif" font-size="${Math.min(H * .40, (W * 1.55) / Math.max(word.length, 3))}" fill="${t.ink}" opacity=".08" letter-spacing="6">${word}</text>` : ''}
    ${scene(t, W, H)}
    <rect width="${W}" height="${H}" fill="url(#fade${id})" />
  </g>
</svg>`;
  fs.writeFileSync(path.join(OUT, name + '.svg'), svg.replace(/\n\s+/g, '\n  '));
  return name;
}

/* ---------------------------- Composiciones ---------------------------- */

poster({ name: 'art-stunt', theme: 'gold', word: 'STUNT', scene: (t, W, H) => `
  ${arc(`M120 ${H - 120} Q${W / 2} ${H * .1} ${W - 120} ${H - 120}`, t.ink, 3, .22, '14 16')}
  ${figure('base', { x: W / 2, y: H - 90, s: 1.05, color: t.fig })}
  ${figure('base', { x: W / 2 - 190, y: H - 96, s: .92, color: t.fig, op: .55 })}
  ${figure('base', { x: W / 2 + 190, y: H - 96, s: .92, color: t.fig, op: .55 })}
  ${figure('liberty', { x: W / 2, y: H - 356, s: .95, color: t.fig })}
  <circle cx="${W / 2}" cy="${H - 470}" r="150" fill="none" stroke="${t.halo}" stroke-width="2" opacity=".28" />` });

poster({ name: 'art-toss', theme: 'night', word: 'TOSS', scene: (t, W, H) => `
  ${arc(`M${W / 2 - 250} ${H - 190} Q${W / 2} ${H * -.05} ${W / 2 + 250} ${H - 190}`, t.halo, 2.5, .35, '10 14')}
  ${figure('tuck', { x: W / 2, y: 230, s: 1, rot: -12, color: t.fig })}
  ${figure('tuck', { x: W / 2 - 96, y: 300, s: .8, rot: -20, color: t.fig, op: .22 })}
  ${figure('tuck', { x: W / 2 - 178, y: 386, s: .62, rot: -28, color: t.fig, op: .12 })}
  ${figure('base', { x: W / 2 - 150, y: H - 60, s: .95, color: t.fig, op: .85 })}
  ${figure('base', { x: W / 2 + 150, y: H - 60, s: .95, color: t.fig, op: .85 })}
  ${figure('reach', { x: W / 2, y: H - 44, s: 1.02, color: t.fig })}` });

poster({ name: 'art-jump', theme: 'cream', word: 'JUMP', scene: (t, W, H) => `
  ${arc(`M90 ${H - 130} Q${W / 2} ${H - 520} ${W - 90} ${H - 130}`, t.ink, 3, .2, '12 14')}
  ${figure('toetouch', { x: W / 2, y: H * .52, s: 1.05, color: t.fig })}
  ${figure('toetouch', { x: W * .17, y: H * .66, s: .62, color: t.fig, op: .35 })}
  ${figure('toetouch', { x: W * .83, y: H * .66, s: .62, color: t.fig, op: .35 })}
  ${confetti(t.ink, 22, 77, W, H)}` });

poster({ name: 'art-team', theme: 'night', word: 'FAMILIA', scene: (t, W, H) => `
  ${figure('highV', { x: W * .16, y: H - 70, s: .78, color: t.fig, op: .5 })}
  ${figure('base',  { x: W * .34, y: H - 62, s: .92, color: t.fig, op: .75 })}
  ${figure('highV', { x: W * .5,  y: H - 56, s: 1.02, color: t.fig })}
  ${figure('base',  { x: W * .66, y: H - 62, s: .92, color: t.fig, op: .75 })}
  ${figure('highV', { x: W * .84, y: H - 70, s: .78, color: t.fig, op: .5 })}
  ${figure('liberty', { x: W * .5, y: H - 330, s: .8, color: t.fig, op: .95 })}
  ${arc(`M60 ${H - 118} L${W - 60} ${H - 118}`, t.halo, 2, .25)}` });

poster({ name: 'art-tumbling', theme: 'ember', word: 'TUMBLING', scene: (t, W, H) => `
  ${arc(`M100 ${H - 140} Q${W * .5} ${H * .12} ${W - 100} ${H - 140}`, t.halo, 3, .4, '8 16')}
  ${figure('reach', { x: W * .16, y: H - 120, s: .8, rot: -18, color: t.fig, op: .3 })}
  ${figure('handspr', { x: W * .38, y: H * .5, s: .88, rot: 95, color: t.fig, op: .5 })}
  ${figure('handspr', { x: W * .6, y: H * .38, s: .95, rot: 195, color: t.fig, op: .72 })}
  ${figure('highV',   { x: W * .84, y: H - 110, s: 1, color: t.fig })}` });

poster({ name: 'art-podium', theme: 'gold', word: 'ELITE', scene: (t, W, H) => `
  ${confetti(t.ink, 30, 21, W, H)}
  <g fill="${t.fig}" opacity=".9">
    <rect x="${W / 2 - 230}" y="${H - 150}" width="150" height="150" rx="8" opacity=".55" />
    <rect x="${W / 2 - 75}" y="${H - 215}" width="150" height="215" rx="8" />
    <rect x="${W / 2 + 80}" y="${H - 120}" width="150" height="120" rx="8" opacity=".4" />
  </g>
  ${figure('highV', { x: W / 2, y: H - 225, s: .92, color: t.fig })}
  ${figure('reach', { x: W / 2 - 155, y: H - 158, s: .68, color: t.fig, op: .6 })}
  ${figure('reach', { x: W / 2 + 155, y: H - 128, s: .68, color: t.fig, op: .45 })}
  <circle cx="${W / 2}" cy="${H - 400}" r="120" fill="none" stroke="${t.halo}" stroke-width="2.5" opacity=".4" />` });

poster({ name: 'art-hero', W: 820, H: 1040, theme: 'glow', word: '', dots: false, scene: (t, W, H) => `
  ${arc(`M60 ${H - 150} Q${W / 2} 60 ${W - 60} ${H - 150}`, t.halo, 2, .25, '10 16')}
  <circle cx="${W / 2}" cy="${H * .34}" r="250" fill="none" stroke="${t.halo}" stroke-width="1.5" opacity=".2" />
  <circle cx="${W / 2}" cy="${H * .34}" r="330" fill="none" stroke="${t.halo}" stroke-width="1" opacity=".12" />
  ${figure('base', { x: W / 2 - 175, y: H - 70, s: 1.02, color: t.fig, op: .5 })}
  ${figure('base', { x: W / 2 + 175, y: H - 70, s: 1.02, color: t.fig, op: .5 })}
  ${figure('base', { x: W / 2, y: H - 58, s: 1.15, color: t.fig, op: .82 })}
  ${figure('liberty', { x: W / 2, y: H - 380, s: 1.12, color: t.fig })}
  ${confetti(t.halo, 16, 5, W, H * .6)}` });

poster({ name: 'art-class', W: 700, H: 880, theme: 'cream', word: '', scene: (t, W, H) => `
  <circle cx="${W / 2}" cy="${H * .42}" r="228" fill="none" stroke="${t.ink}" stroke-width="2" opacity=".18" />
  ${arc(`M70 ${H - 150} Q${W / 2} ${H * .18} ${W - 70} ${H - 150}`, t.ink, 2.5, .18, '10 14')}
  ${figure('scale', { x: W / 2 + 40, y: H - 170, s: 1.15, color: t.fig })}
  ${figure('highV', { x: W * .2, y: H - 120, s: .62, color: t.fig, op: .3 })}
  ${figure('toetouch', { x: W * .82, y: H * .3, s: .5, color: t.fig, op: .25 })}
  ${confetti(t.ink, 18, 33, W, H * .8)}` });

console.log('OK');

/* ------------------------------------------------------------------------
   Atletas sueltos, sin fondo, para el efecto "volando".
   Se reemplazan por recortes reales dejando assets/fotos/volando-N.webp
   (WebP con transparencia) con el mismo número.
   ------------------------------------------------------------------------ */
function atleta(nombre, pose, rot = 0) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-170 -210 340 340" width="340" height="340">
  <defs>
    <linearGradient id="f" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#e10600" />
      <stop offset=".5" stop-color="#ff5a1f" />
      <stop offset="1" stop-color="#f5b700" />
    </linearGradient>
  </defs>
  <g filter="drop-shadow(0 0 14px rgba(255,90,31,.45))">
    ${figure(pose, { x: 0, y: 0, s: 1, rot, color: 'url(#f)' })}
  </g>
</svg>`;
  fs.writeFileSync(path.join(OUT, nombre + '.svg'), svg.replace(/\n\s+/g, '\n  '));
}
atleta('volando-1', 'liberty');
atleta('volando-2', 'toetouch');
atleta('volando-3', 'tuck', -14);
atleta('volando-4', 'highV');

/* Textura de escamas: se usa como fondo en muy baja opacidad */
fs.writeFileSync(path.join(OUT, 'escamas.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="26" viewBox="0 0 44 26">
  <path d="M0 26 Q11 4 22 26 Q33 4 44 26 M-22 13 Q-11 -9 0 13 Q11 -9 22 13 Q33 -9 44 13 Q55 -9 66 13"
        fill="none" stroke="#f5b700" stroke-width="1" />
</svg>`);
console.log('atletas y escamas');
