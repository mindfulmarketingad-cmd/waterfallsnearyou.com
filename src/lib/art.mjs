// Procedural landscape illustrations used as featured / social images. Each page gets a unique,
// deterministic scene (seeded by its URL) in the site's calm slate-and-forest palette.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = seed || 1;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; };
}

const PALETTES = [
  { sky: ['#F4EFE7', '#DCE6E1'], sun: '#FBF7EF', ridges: ['#C8D3CF', '#A3B2AE', '#7C8B88', '#55625F'], forest: '#3F6F5A', ground: '#2F4A3F', water: '#F7FAF9', pool: '#9FB8B2' },
  { sky: ['#EEF2F1', '#CBD8D8'], sun: '#FFFFFF', ridges: ['#BFCBCD', '#98A7AB', '#6F7D82', '#4D5359'], forest: '#41675A', ground: '#2E3F3B', water: '#FFFFFF', pool: '#93AEB0' },
  { sky: ['#EFE6DE', '#CFCBD3'], sun: '#FAF2EA', ridges: ['#C6C2CB', '#A19FAD', '#7A7B89', '#4D5359'], forest: '#47665B', ground: '#343C3D', water: '#F8F8FA', pool: '#A1AAB4' },
  { sky: ['#E3ECE6', '#BFD2C7'], sun: '#F6FAF5', ridges: ['#B3C7BC', '#8EAA9B', '#6A8878', '#486356'], forest: '#365C4B', ground: '#263D33', water: '#F5FAF7', pool: '#8DB1A3' },
  { sky: ['#F1EDE4', '#D9DED2'], sun: '#FFFDF6', ridges: ['#CCD1C3', '#A9B19F', '#7F8977', '#5A6152'], forest: '#4B6A4E', ground: '#33452F', water: '#FBFBF5', pool: '#A3B3A0' },
];

function ridgePath(r, w, h, base, amp, step = 30) {
  const phases = [r() * 6.28, r() * 6.28, r() * 6.28];
  const freqs = [1.2 + r() * 1.5, 3 + r() * 3, 7 + r() * 5];
  const pts = [];
  for (let x = -step; x <= w + step; x += step) {
    const t = x / w;
    const y = base - amp * (0.55 * Math.sin(t * freqs[0] * Math.PI + phases[0]) + 0.3 * Math.sin(t * freqs[1] * Math.PI + phases[1]) + 0.15 * Math.sin(t * freqs[2] * Math.PI + phases[2]));
    pts.push([x, y]);
  }
  let d = `M${pts[0][0]},${h} L${pts[0][0]},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    d += ` Q${x0.toFixed(1)},${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)},${((y0 + y1) / 2).toFixed(1)}`;
  }
  d += ` L${w + step},${h} Z`;
  return d;
}

function pines(r, x0, x1, yAt, color, count, scale) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * (x1 - x0);
    const hgt = scale * (0.6 + r() * 0.8);
    const y = yAt(x) + 4;
    const wd = hgt * 0.36;
    out += `<path d="M${x.toFixed(1)},${(y - hgt).toFixed(1)} L${(x + wd).toFixed(1)},${y.toFixed(1)} L${(x - wd).toFixed(1)},${y.toFixed(1)} Z" fill="${color}"/>`;
  }
  return out;
}

export function landscapeSvg(key, { width = 1200, height = 630 } = {}) {
  const seed = hash(key);
  const r = rng(seed);
  const p = PALETTES[seed % PALETTES.length];
  const W = width, H = height;
  const sunX = W * (0.15 + r() * 0.7), sunY = H * (0.14 + r() * 0.12), sunR = 34 + r() * 26;
  const fallX = W * (0.36 + r() * 0.28);
  const ledgeY = H * (0.50 + r() * 0.06);
  const poolY = H * 0.80;
  const fallW = 38 + r() * 34;
  const flare = 26 + r() * 30;

  const ridges = [
    ridgePath(r, W, H, H * 0.30, 95, 40),
    ridgePath(r, W, H, H * 0.42, 80, 34),
  ];
  // Cliff band holding the waterfall
  const cliffL = `M-10,${H} L-10,${ledgeY + 30} Q${fallX * 0.45},${ledgeY - 30 - r() * 30} ${fallX - fallW / 2 - 4},${ledgeY} L${fallX - fallW / 2 - 18},${poolY} L-10,${poolY + 20} Z`;
  const cliffR = `M${W + 10},${H} L${W + 10},${ledgeY + 40} Q${fallX + (W - fallX) * 0.5},${ledgeY - 24 - r() * 34} ${fallX + fallW / 2 + 4},${ledgeY} L${fallX + fallW / 2 + 18},${poolY} L${W + 10},${poolY + 20} Z`;
  const water = `M${fallX - fallW / 2},${ledgeY} C${fallX - fallW / 4},${ledgeY - 6} ${fallX + fallW / 4},${ledgeY - 6} ${fallX + fallW / 2},${ledgeY} C${fallX + fallW / 2 + 4},${ledgeY + 90} ${fallX + fallW / 2 + flare * 0.5},${poolY - 40} ${fallX + fallW / 2 + flare},${poolY + 4} L${fallX - fallW / 2 - flare},${poolY + 4} C${fallX - fallW / 2 - flare * 0.5},${poolY - 40} ${fallX - fallW / 2 - 4},${ledgeY + 90} ${fallX - fallW / 2},${ledgeY} Z`;
  let streaks = '';
  for (let i = 0; i < 5; i++) {
    const sx = fallX - fallW / 2 + 6 + (i * (fallW - 12)) / 4;
    const drift = (sx - fallX) * (flare / fallW) * 1.2;
    streaks += `<path d="M${sx.toFixed(1)},${(ledgeY + 8).toFixed(1)} C${sx.toFixed(1)},${(ledgeY + 80).toFixed(1)} ${(sx + drift * 0.5).toFixed(1)},${(poolY - 60).toFixed(1)} ${(sx + drift).toFixed(1)},${(poolY - 6).toFixed(1)}" stroke="${p.pool}" stroke-opacity=".45" stroke-width="2" fill="none"/>`;
  }
  const yRidgeFront = (x) => poolY - 6 - 18 * Math.sin((x / W) * 9 + seed);
  const leftTrees = pines(r, 0, fallX - fallW - 40, () => ledgeY + 6 + r() * 20, p.ground, 9, 46);
  const rightTrees = pines(r, fallX + fallW + 40, W, () => ledgeY + 10 + r() * 22, p.ground, 9, 46);
  const frontTrees = pines(r, 0, W, yRidgeFront, p.ground, 6, 70);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient>
<linearGradient id="fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.water}"/><stop offset="1" stop-color="${p.water}" stop-opacity=".82"/></linearGradient>
<radialGradient id="mist" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".85"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="${sunR.toFixed(0)}" fill="${p.sun}" opacity=".9"/>
<path d="${ridges[0]}" fill="${p.ridges[0]}"/>
<path d="${ridges[1]}" fill="${p.ridges[1]}"/>
<path d="${cliffL}" fill="${p.ridges[2]}"/>
<path d="${cliffR}" fill="${p.ridges[2]}"/>
<path d="M-10,${(ledgeY + 34).toFixed(1)} Q${(fallX * 0.5).toFixed(1)},${(ledgeY - 10).toFixed(1)} ${(fallX - fallW / 2 - 4).toFixed(1)},${(ledgeY + 4).toFixed(1)} L${(fallX - fallW / 2 - 18).toFixed(1)},${poolY} L-10,${poolY + 20} Z" fill="${p.forest}" opacity=".55"/>
<path d="M${W + 10},${(ledgeY + 44).toFixed(1)} Q${(fallX + (W - fallX) * 0.5).toFixed(1)},${(ledgeY - 4).toFixed(1)} ${(fallX + fallW / 2 + 4).toFixed(1)},${(ledgeY + 4).toFixed(1)} L${(fallX + fallW / 2 + 18).toFixed(1)},${poolY} L${W + 10},${poolY + 20} Z" fill="${p.forest}" opacity=".55"/>
${leftTrees}${rightTrees}
<path d="${water}" fill="url(#fall)"/>
${streaks}
<rect x="0" y="${poolY}" width="${W}" height="${H - poolY}" fill="${p.pool}"/>
<ellipse cx="${fallX.toFixed(1)}" cy="${(poolY + 2).toFixed(1)}" rx="${(fallW * 2.4).toFixed(1)}" ry="34" fill="url(#mist)"/>
<path d="M${(fallX - fallW * 2.2).toFixed(1)},${(poolY + 26).toFixed(1)} Q${fallX.toFixed(1)},${(poolY + 14).toFixed(1)} ${(fallX + fallW * 2.2).toFixed(1)},${(poolY + 26).toFixed(1)}" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M${(fallX - fallW * 1.4).toFixed(1)},${(poolY + 44).toFixed(1)} Q${fallX.toFixed(1)},${(poolY + 35).toFixed(1)} ${(fallX + fallW * 1.4).toFixed(1)},${(poolY + 44).toFixed(1)}" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M-10,${H} L-10,${(H - 40).toFixed(1)} Q${(W * 0.12).toFixed(1)},${(H - 70).toFixed(1)} ${(W * 0.24).toFixed(1)},${(H - 30).toFixed(1)} L${(W * 0.3).toFixed(1)},${H} Z" fill="${p.ground}"/>
<path d="M${W + 10},${H} L${W + 10},${(H - 50).toFixed(1)} Q${(W * 0.86).toFixed(1)},${(H - 84).toFixed(1)} ${(W * 0.74).toFixed(1)},${(H - 26).toFixed(1)} L${(W * 0.7).toFixed(1)},${H} Z" fill="${p.ground}"/>
${pines(r, 0, W * 0.2, () => H - 46, p.ground, 3, 90)}${pines(r, W * 0.8, W, () => H - 50, p.ground, 3, 96)}
</svg>`;
}
