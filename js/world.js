'use strict';
/* GRISAILLE · world — floor maps (rooms + corridors + gates), terrain, collision, navigation, decals */
const TF = 0, TW = 1, TL = 2, TP = 3, TS = 4, TX = 5, TB = 6, TD = 7, TO = 8;
const BIOMES = [
  { name: 'THE CRYPT', zh: '地下墓穴', sub: 'the dead do not like visitors', zhSub: '亡者不欢迎访客', det: 'rgba(14,14,18,0.26)' },
  { name: 'THE SEWERS', zh: '下水道', sub: 'something breathes under the water', zhSub: '水面下有东西在呼吸', det: 'rgba(10,16,14,0.28)' },
  { name: 'THE CLOCKWORKS', zh: '机关大厅', sub: 'the gears still turn for no one', zhSub: '齿轮仍在空转，无人照看', det: 'rgba(12,12,20,0.26)' },
  { name: 'THE VOID', zh: '虚空', sub: 'below the last stair, nothing was finished', zhSub: '最后一级台阶之下，一切都未完成', det: 'rgba(200,170,255,0.1)', dark: true },
];
const tAt = (R, tx, ty) => (tx < 0 || ty < 0 || tx >= R.w || ty >= R.h) ? TW : R.t[ty * R.w + tx];
const walkBlock = v => v === TW || v === TL || v === TX || v === TB || v === TD;
const shotBlock = v => v === TW || v === TX || v === TB || v === TD;
const CW = 32, CH = 26;
const oddi = (a, b) => { let v = randi(a, b); return v % 2 ? v : v + 1 > b ? v - 1 : v + 1; };

/* ---------- floor generation ---------- */
// d = level depth 0..7: each biome (f = d >> 1) has an upper level (sub 0) and a deeper one (sub 1); both end in a guardian
function genFloor(d) {
  const f = d >> 1, sub = d & 1, N = sub ? [13, 14, 14, 12][f] : [10, 11, 11, 10][f];
  const key = (x, y) => x + ',' + y, cells = new Map();
  const start = { gx: 0, gy: 0, links: [] }; cells.set(key(0, 0), start);
  const list = [start];
  for (let guard = 0; list.length < N && guard < 6000; guard++) {
    const from = Math.random() < 0.55 ? list[Math.max(0, list.length - 1 - randi(0, 2))] : pick(list);
    if (from.links.length >= 3) continue;
    const [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const nx = from.gx + dx, ny = from.gy + dy;
    if (cells.has(key(nx, ny))) continue;
    const xs = list.map(n => n.gx).concat(nx), ys = list.map(n => n.gy).concat(ny);
    if (Math.max(...xs) - Math.min(...xs) > 4 || Math.max(...ys) - Math.min(...ys) > 3) continue;
    const n = { gx: nx, gy: ny, links: [from] }; from.links.push(n); cells.set(key(nx, ny), n); list.push(n);
  }
  // distances from start
  start.dist = 0; const q = [start];
  for (let i = 0; i < q.length; i++) for (const m of q[i].links) if (m.dist === undefined) { m.dist = q[i].dist + 1; q.push(m); }
  for (const n of list) n.type = 'combat';
  start.type = 'start';
  const leaves = list.filter(n => n !== start && n.links.length === 1).sort((a, b) => b.dist - a.dist);
  const boss = leaves.length ? leaves[0] : list.slice().sort((a, b) => b.dist - a.dist)[0];
  boss.type = 'boss';
  const extra = shuffle(['trial', 'forge', 'fortune', 'spring', 'library']).slice(0, sub && f < 3 ? 2 : 1);
  const specials = (!sub ? ['shop', 'chest'] : f === 3 ? ['shop', 'shrine', 'chest'] : shuffle(['shop', 'chest', 'shrine', 'npc']).concat(f < 2 ? [] : ['chest'])).concat(extra);
  const pool = shuffle(leaves.filter(n => n !== boss)).concat(shuffle(list.filter(n => n.type === 'combat' && n.links.length > 1 && n.dist > 0)));
  for (const s of specials) { const n = pool.find(m => m.type === 'combat' && !(s === 'shop' && m.dist < 2)); if (n) n.type = s; }
  const combats = list.filter(n => n.type === 'combat').sort((a, b) => b.dist - a.dist);
  if (combats.length > 2) combats[0].type = 'elite';
  if (d === 0) { const c = list.filter(n => n.type === 'combat').sort((a, b) => a.dist - b.dist)[0]; if (c) c.first = true; }
  // geometry
  const gx0 = Math.min(...list.map(n => n.gx)), gy0 = Math.min(...list.map(n => n.gy));
  const GW = Math.max(...list.map(n => n.gx)) - gx0 + 1, GH = Math.max(...list.map(n => n.gy)) - gy0 + 1;
  const L = { w: GW * CW, h: GH * CH, biome: f, depth: d, dark: !!BIOMES[f].dark, rooms: [], spk: 0 };
  L.t = new Uint8Array(L.w * L.h).fill(TW); L.hp = new Float32Array(L.w * L.h); L.shakeT = new Float32Array(L.w * L.h); L.rid = new Int16Array(L.w * L.h).fill(-1);
  const SZ = { start: [17, 15], boss: [29, 23], shop: [19, 15], chest: [15, 13], shrine: [19, 13], npc: [15, 13], trial: [23, 17], forge: [17, 13], fortune: [17, 13], spring: [15, 13], library: [19, 13] };
  list.forEach((n, i) => {
    let [w, h] = SZ[n.type] || (n.type === 'elite' ? [oddi(23, 27), oddi(17, 21)] : [oddi(19, 27), oddi(15, 21)]);
    const cx0 = (n.gx - gx0) * CW, cy0 = (n.gy - gy0) * CH;
    const r = { id: i, node: n, type: n.type, first: n.first, x: cx0 + ((CW - w) >> 1), y: cy0 + ((CH - h) >> 1), w, h, gates: [], links: [], dist: n.dist, visited: false, seen: false, cleared: n.type !== 'combat' && n.type !== 'elite' && n.type !== 'boss', active: false, ccx: cx0 + 15, ccy: cy0 + 12 };
    n.room = r; L.rooms.push(r);
    for (let y = r.y + 1; y < r.y + h - 1; y++) for (let x = r.x + 1; x < r.x + w - 1; x++) { L.t[y * L.w + x] = TF; L.rid[y * L.w + x] = i; }
  });
  // corridors (3 wide) along cell centre lines, gates where they pierce a room wall
  const done = new Set();
  for (const n of list) for (const m of n.links) {
    const k = [n.room.id, m.room.id].sort().join('-'); if (done.has(k)) continue; done.add(k);
    const a = n.room, b = m.room; a.links.push(b); b.links.push(a);
    if (n.gy === m.gy) {
      const [l, rr] = a.x < b.x ? [a, b] : [b, a], cy = a.ccy, x0 = l.x + l.w - 1, x1 = rr.x;
      for (let x = x0; x <= x1; x++) for (let y = cy - 1; y <= cy + 1; y++) L.t[y * L.w + x] = TF;
      for (let y = cy - 1; y <= cy + 1; y++) { l.gates.push({ x: x0, y, ix: x0 - 1, iy: y, to: rr }); rr.gates.push({ x: x1, y, ix: x1 + 1, iy: y, to: l }); }
    } else {
      const [u, d] = a.y < b.y ? [a, b] : [b, a], cx = a.ccx, y0 = u.y + u.h - 1, y1 = d.y;
      for (let y = y0; y <= y1; y++) for (let x = cx - 1; x <= cx + 1; x++) L.t[y * L.w + x] = TF;
      for (let x = cx - 1; x <= cx + 1; x++) { u.gates.push({ x, y: y0, ix: x, iy: y0 - 1, to: d }); d.gates.push({ x, y: y1, ix: x, iy: y1 + 1, to: u }); }
    }
  }
  for (const r of L.rooms) { decorateRoom(L, r, f); fixRoomConn(L, r); }
  for (let i = 0; i < L.w * L.h; i++) { if (L.t[i] === TX) L.hp[i] = 16; if (L.t[i] === TB) L.hp[i] = 6; }
  L.start = start.room; L.boss = boss.room;
  renderLevel(L);
  return L;
}

function decorateRoom(L, r, f) {
  const w = r.w, h = r.h, cx = w >> 1, cy = h >> 1;
  const nearGate = (lx, ly) => r.gates.some(g => Math.max(Math.abs(g.x - (r.x + lx)), Math.abs(g.y - (r.y + ly))) <= 2);
  const safe = (lx, ly) => (Math.abs(lx - cx) <= 2 && Math.abs(ly - cy) <= 2) || nearGate(lx, ly);
  const inside = (lx, ly) => lx > 0 && ly > 0 && lx < w - 1 && ly < h - 1;
  const set = (lx, ly, v) => { if (inside(lx, ly) && !safe(lx, ly)) L.t[(r.y + ly) * L.w + r.x + lx] = v; };
  const mset = (lx, ly, v) => { set(lx, ly, v); set(w - 1 - lx, ly, v); };
  const isF = (lx, ly) => inside(lx, ly) && L.t[(r.y + ly) * L.w + r.x + lx] === TF;
  const blob = (px, py, rad, v) => { for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y * 1.4 < rad * rad && isF(px + x, py + y)) set(px + x, py + y, v); };
  if (r.type === 'combat' || r.type === 'elite') {
    const lay = pick(['pillars', 'islands', 'rails', 'mixed', 'ring', 'open']);
    if (lay === 'pillars' || lay === 'mixed') {
      const sx = randi(5, 7), sy = randi(4, 6);
      for (let gx = 3; gx < cx - 1; gx += sx) for (let gy = 3; gy < h - 4; gy += sy) if (Math.random() < (lay === 'mixed' ? 0.5 : 0.8)) { mset(gx, gy, TW); mset(gx + 1, gy, TW); mset(gx, gy + 1, TW); mset(gx + 1, gy + 1, TW); }
    }
    if (lay === 'islands') for (let n = randi(2, 4); n > 0; n--) { const rw = randi(2, 4), rh = randi(1, 2), x0 = randi(2, cx - 3), y0 = randi(3, h - 5); for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) mset(x, y, TW); }
    if (lay === 'rails' || lay === 'mixed') {
      for (let n = randi(2, 3); n > 0; n--) { const len = randi(3, 6), x0 = randi(2, cx - 3), y0 = randi(3, h - 5); for (let x = x0; x < x0 + len; x++) mset(x, y0, TL); }
      if (Math.random() < 0.6) { const x0 = randi(3, cx - 4), y0 = randi(3, h - 8); for (let y = y0; y < y0 + randi(3, 4); y++) mset(x0, y, TL); }
    }
    if (lay === 'ring') { const rr = Math.min(cx, cy) - 3; for (let a = 0; a < TAU; a += 0.06) { const x = Math.round(cx + Math.cos(a) * rr * 1.4), y = Math.round(cy + Math.sin(a) * rr); if (Math.abs(Math.sin(a)) > 0.35) set(x, y, Math.cos(a * 2) > 0 ? TL : TW); } }
    for (let n = randi(2, 6); n > 0; n--) { let x = randi(2, w - 3), y = randi(2, h - 3); for (let k = randi(1, 4); k > 0; k--) { if (isF(x, y)) set(x, y, TX); x += randi(-1, 1); y += randi(-1, 1); } }
    for (let n = randi(1, 2) + (f > 0 ? 1 : 0); n > 0; n--) { const x = randi(2, w - 3), y = randi(2, h - 3); if (isF(x, y)) set(x, y, TB); }
    if (f === 1 || f === 3) for (let n = randi(2, 4); n > 0; n--) blob(randi(3, w - 4), randi(3, h - 4), rand(1.4, 2.8), TP);
    if (f >= 2) for (let n = randi(1, 3); n > 0; n--) { const x0 = randi(3, cx - 4), y0 = randi(3, h - 5), len = randi(3, 5), vert = Math.random() < 0.5; for (let i = 0; i < len; i++) { const x = vert ? x0 : x0 + i, y = vert ? y0 + i : y0; if (isF(x, y)) mset(x, y, TS); } }
    if (f === 1) for (let n = randi(0, 2); n > 0; n--) { const x0 = randi(3, cx - 4), y0 = randi(3, h - 5); for (let i = 0; i < 3; i++) if (isF(x0 + i, y0)) mset(x0 + i, y0, TS); }
  } else if (r.type === 'boss') {
    for (const [px, py] of [[6, 5], [w - 8, 5], [6, h - 7], [w - 8, h - 7]]) for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) set(px + x, py + y, TW);
    if (f === 1) for (const px of [cx - 9, cx + 9]) blob(px, cy, 1.8, TP);
  } else if (r.type !== 'start') {
    for (const [px, py] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]) set(px, py, TW);
    if (r.type === 'chest' || r.type === 'npc') for (let n = randi(2, 4); n > 0; n--) { const x = randi(2, w - 3), y = randi(2, h - 3); if (isF(x, y)) set(x, y, TX); }
  }
}
function fixRoomConn(L, r) {
  const inR = (x, y) => x > r.x && y > r.y && x < r.x + r.w - 1 && y < r.y + r.h - 1;
  const pass = v => v !== TW && v !== TL;
  const flood = () => {
    const seen = new Set(), sx = r.x + (r.w >> 1), sy = r.y + (r.h >> 1), st = [[sx, sy]]; seen.add(sy * L.w + sx);
    while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, i = ny * L.w + nx; if (!inR(nx, ny) || seen.has(i) || !pass(L.t[i])) continue; seen.add(i); st.push([nx, ny]); } }
    return seen;
  };
  let seen = flood();
  for (const g of r.gates) if (!seen.has(g.iy * L.w + g.ix)) {
    let x = g.ix, y = g.iy; const tx = r.x + (r.w >> 1), ty = r.y + (r.h >> 1);
    for (let k = 0; k < 60 && !seen.has(y * L.w + x); k++) { const i = y * L.w + x; if (!pass(L.t[i])) L.t[i] = TF; if (x !== tx) x += Math.sign(tx - x); else if (y !== ty) y += Math.sign(ty - y); }
    seen = flood();
  }
  for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) { const i = y * L.w + x; if (!seen.has(i) && pass(L.t[i])) L.t[i] = TW; }
}

/* ---------- static render (floor + walls) ---------- */
// wall palette per level: cap = top surface, rim = edge lit toward open floor, face/faceDk = front, lit = face highlight, deep = cliff dropping into the void (rgb)
const WALLC = [
  { cap: '#2a292d', capDk: '#211f24', rim: '#615f65', face: '#47464c', faceDk: '#2e2d32', lit: '#6c6a71', deep: '22,21,25' },
  { cap: '#252927', capDk: '#1d211f', rim: '#58625a', face: '#3f4541', faceDk: '#2a2f2c', lit: '#68736a', deep: '18,21,20' },
  { cap: '#2a2b31', capDk: '#212227', rim: '#7a7d8a', face: '#4a4c55', faceDk: '#32343b', lit: '#8a8d9a', deep: '22,23,28' },
  { cap: '#141318', capDk: '#0e0d12', rim: '#504b62', face: '#29272f', faceDk: '#1c1a21', lit: '#5d5970', deep: '10,9,13' },
];
const BOOKS = ['#5d5b60', '#4a484d', '#6c6a6f', '#3f3d42', '#77757a', '#545257', '#858388', '#38363b'];
const BONE = '#b8b5ac', BONE2 = '#8c8981';
const RUNES = ['#.#|##.|#.#|#..', '.#.|###|.#.|.#.', '#..|##.|#.#|#..', '###|#.#|.#.|.#.', '#.#|.#.|#.#|#.#', '.##|#..|.#.|..#', '#..|#..|###|#.#'].map(s => s.split('|').flatMap((r, y) => [...r].map((ch, x) => ch === '#' ? [x, y] : null).filter(Boolean)));
// glow sprites for live flames (drawn additively under the actors)
const glowSpr = (r, g, bl, a) => { const c = mk(32, 32), x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, `rgba(${r},${g},${bl},${a})`); gr.addColorStop(1, `rgba(${r},${g},${bl},0)`); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return c; };
const GLOWO = glowSpr(255, 140, 50, 0.55), GLOWV = glowSpr(185, 138, 255, 0.5);
// a gear as a pixel mask with a lit top edge and a shaded bottom edge (cols = [r,g,b,a]); ry squashes it into floor perspective
function gearSpr(R, teeth, col, hi, lo, ry = 1) {
  const w = R * 2 + 3, h = Math.ceil(R * 2 * ry) + 3, s = mk(w, h), c = s.getContext('2d'), d = c.createImageData(w, h), p = d.data, cx = w / 2, cy = h / 2;
  const inside = (px, py) => { const dx = px - cx, dy = (py - cy) / ry, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), tooth = (((a / TAU) * teeth % 1) + 1) % 1 < 0.5; if (r > (tooth ? R : R - 3) || r < R * 0.16) return false; if (R > 9 && r > R * 0.34 && r < R - 6) { const sp = (((a / TAU) * 6 % 1) + 1) % 1; if (sp > 0.17 && sp < 0.83) return false; } return true; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!inside(x + 0.5, y + 0.5)) continue; const cl = !inside(x + 0.5, y - 0.5) ? hi : !inside(x + 0.5, y + 1.5) ? lo : col, i = (y * w + x) * 4; p[i] = cl[0]; p[i + 1] = cl[1]; p[i + 2] = cl[2]; p[i + 3] = cl[3]; }
  c.putImageData(d, 0, 0); return s;
}
const _ftex = [];
// 16x16 floor variants per level, cached for the session (q = flagstone quadrant in the crypt)
function floorTex(b) {
  if (_ftex[b]) return _ftex[b];
  const out = [];
  for (let q = 0; q < [4, 1, 1, 1][b]; q++) { const row = []; for (let k = 0; k < 10; k++) row.push(tileTex(b, q, k)); out.push(row); }
  return (_ftex[b] = out);
}
function tileTex(b, q, k) {
  const s = mk(T, T), c = s.getContext('2d'), F = (col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  let grain = 3;
  if (b === 0) { // crypt: cut-stone flagstones (2x2 tiles each), pits, chips and cracks
    F('#727176', 0, 0, T, T);
    for (let n = randi(4, 8); n > 0; n--) F(Math.random() < 0.5 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.05)', randi(0, 14), randi(0, 14), randi(1, 3), randi(1, 2));
    if (!(q & 2)) { F('#56555a', 0, 0, T, 1); F('#807f84', 0, 1, T, 1); }
    if (!(q & 1)) { F('#56555a', 0, 0, 1, T); F('#7c7b80', 1, q & 2 ? 0 : 2, 1, T); }
    if (k === 6 && !q) { F('#5d5c61', 1, 1, 3, 2); F('#5d5c61', 1, 3, 1, 1); }
  } else if (b === 1) { // sewers: wet brick in dark mortar, slime between the joints
    F('#474c48', 0, 0, T, T);
    for (let j = 0; j < 4; j++) for (let bx = (j & 1) ? -4 : 0; bx < T; bx += 8) {
      const wet = Math.random() < 0.18;
      F(wet ? '#545a55' : pick(['#5f645f', '#5b605b', '#636863', '#585d58']), bx + 1, j * 4 + 1, 7, 3);
      F('rgba(255,255,255,0.07)', bx + 1, j * 4 + 1, 7, 1);
      if (wet) F('#87908a', bx + 2 + randi(0, 4), j * 4 + 2);
    }
    if (k % 5 === 4) for (let n = randi(2, 5); n > 0; n--) F(pick(['#66735a', '#5e6a54']), randi(0, 15), randi(0, 15));
  } else if (b === 2) { // clockworks: riveted iron plates, some with tread, some oil-stained
    F(k === 5 ? '#626469' : '#6b6d74', 0, 0, T, T);
    if (k % 3 === 0) for (let y = 2; y < T - 2; y += 4) for (let x = 2 + ((y >> 2) & 1) * 2; x < T - 3; x += 4) { F('rgba(255,255,255,0.11)', x, y); F('rgba(255,255,255,0.11)', x + 1, y + 1); F('rgba(0,0,0,0.12)', x + 1, y + 2); }
    F('#82848c', 0, 0, T, 1); F('#7a7c84', 0, 1, 1, T - 1); F('#4a4c53', 0, T - 1, T, 1); F('#52545b', T - 1, 0, 1, T - 1);
    for (const [a, c2] of [[2, 2], [13, 2], [2, 13], [13, 13]]) { F('#a0a2aa', a, c2); F('#3c3e44', a + 1, c2 + 1); }
    if (k === 7) F('rgba(16,16,22,0.2)', randi(3, 8), randi(3, 9), randi(3, 5), randi(2, 3));
    grain = 1.6;
  } else { // void: obsidian, a glassy sheen, now and then a crack leaking violet light
    F('#1d1c22', 0, 0, T, T);
    F('#29282f', 0, 0, T, 1); F('#25242b', 0, 1, 1, T - 1); F('#121116', 0, T - 1, T, 1); F('#151419', T - 1, 0, 1, T - 1);
    if (k % 2 === 0) { const o = randi(3, 9); for (let i = 0; i < 5; i++) F('rgba(215,205,255,0.08)', o + i, 11 - i); }
    grain = 1.4;
  }
  const d = c.getImageData(0, 0, T, T), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const n = (Math.random() - 0.5) * 2 * grain; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
  c.putImageData(d, 0, 0);
  return s;
}
const hash2 = (a, b) => { let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const STONE_TINT = ['rgba(0,0,0,0.07)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0)', 'rgba(255,255,255,0.025)', 'rgba(255,255,255,0.045)'];
function renderLevel(L) {
  const B = BIOMES[L.biome], b = L.biome, dk = L.dark, WC = WALLC[b], Lw = L.w, W = Lw * T + 16, H = L.h * T + 16, OL = '#0b0b0d';
  const c = mk(W, H), x = c.getContext('2d'); x.translate(8, 8); x.imageSmoothingEnabled = false;
  const F = (col, px, py, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  const ln = (x0, y0, x1, y1, col, dash = 0) => { x.fillStyle = col; const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) if (!dash || ((i / dash) | 0) % 2 === 0) x.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1); };
  const ell = (cx, cy, rx, ry, col, dash = 0) => { x.fillStyle = col; const n = Math.ceil(TAU * Math.max(rx, ry) / 1.1); for (let i = 0; i < n; i++) { if (dash && ((i / dash) | 0) % 2) continue; const a = i / n * TAU; x.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1); } };
  const blot = (cx, cy, rx, ry, col) => x.drawImage(circSpr(24, col), Math.round(cx - rx), Math.round(cy - ry), Math.max(1, Math.round(rx * 2)), Math.max(1, Math.round(ry * 2)));
  const glow = (cx, cy, rx, ry, col) => { for (let s = 0; s < 3; s++) blot(cx, cy, rx * (1 - s * 0.3), ry * (1 - s * 0.3), col); };
  const wallish = v => v === TW || v === TD, at = (tx, ty) => tAt(L, tx, ty), isW = (tx, ty) => wallish(at(tx, ty));
  // E: 0 open, 1 wall touching open space (drawn), 2 wall deep in the void (left transparent: the backdrop shows through)
  const E = new Uint8Array(Lw * L.h);
  for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < Lw; tx++) { if (!isW(tx, ty)) continue; let e = 2; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (!isW(tx + ox, ty + oy)) e = 1; E[ty * Lw + tx] = e; }
  const ek = (tx, ty) => (tx < 0 || ty < 0 || tx >= Lw || ty >= L.h) ? 2 : E[ty * Lw + tx];
  // gates: an iron sill on each open gate tile, stone posts on the walls flanking the opening
  const sill = new Map(), jamb = new Set();
  for (const r of L.rooms) for (const g of r.gates) sill.set(g.y * Lw + g.x, g.ix === g.x);
  for (const [i, hz] of sill) { const gx = i % Lw, gy = (i / Lw) | 0; for (const s of [-1, 1]) { const jx = hz ? gx + s : gx, jy = hz ? gy : gy + s; if (isW(jx, jy)) jamb.add(jy * Lw + jx); } }
  // back walls (open floor below, void above) get a tall front face; their fittings are chosen first so the floor can catch their light
  const tall = (tx, ty) => ek(tx, ty) === 1 && !isW(tx, ty + 1) && ek(tx, ty - 1) === 2 && !jamb.has(ty * Lw + tx);
  const KINDS = [['torch', 'torch', 'candles', 'coffin', 'shelf', 'banner', 'chains', 'niche', 'web'], ['outflow', 'outflow', 'grate', 'torch', 'chains', 'moss'], ['furnace', 'furnace', 'gauge', 'chains', 'window', 'cog'], ['shard', 'shard', 'rift', 'wire', 'rubble']][b];
  const deco = new Map(), pipes = new Set(); L.lamps = []; L.vents = [];
  for (let ty = 0; ty < L.h; ty++) {
    let gap = randi(1, 3), run = 0;
    for (let tx = 0; tx < Lw; tx++) {
      const i = ty * Lw + tx;
      if (!tall(tx, ty)) { gap = Math.max(gap, 2); run = 0; continue; }
      if ((b === 1 || b === 2) && !run && Math.random() < (b === 1 ? 0.07 : 0.04)) run = randi(3, 9);
      if (run > 0) { pipes.add(i); run--; }
      if (--gap > 0 || !tall(tx - 1, ty) || !tall(tx + 1, ty)) continue;
      deco.set(i, pick(KINDS)); gap = randi(3, 6);
    }
  }

  // ---- floor: textured tiles, per-flagstone / per-plate tone so it never reads as a flat grid
  const FT = floorTex(b), corr = dk ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.07)';
  for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < Lw; tx++) {
    if (E[ty * Lw + tx]) continue;
    const px = tx * T, py = ty * T, row = FT[b === 0 ? (tx & 1) + ((ty & 1) << 1) : 0];
    x.drawImage(row[(Math.random() * row.length) | 0], px, py);
    if (b !== 1) F(STONE_TINT[(hash2(b === 0 ? tx >> 1 : tx, b === 0 ? ty >> 1 : ty) * 5) | 0], px, py, T, T);
    if (L.rid[ty * Lw + tx] < 0) F(corr, px, py, T, T);
  }
  // ---- per-room grime + level dressing
  const skull = (sx, sy) => { sx = Math.round(sx); sy = Math.round(sy); F('rgba(0,0,0,0.28)', sx, sy + 4, 5, 1); F(BONE, sx, sy, 5, 3); F(BONE, sx + 1, sy + 3, 3, 1); F(BONE2, sx, sy + 2, 5, 1); F('#2a292d', sx + 1, sy + 1); F('#2a292d', sx + 3, sy + 1); F(BONE2, sx + 2, sy + 3); F('rgba(255,255,255,0.3)', sx + 1, sy, 2, 1); };
  const bone = (bx, by, len, dy) => { bx = Math.round(bx); by = Math.round(by); ln(bx, by + 1, bx + len, by + dy + 1, 'rgba(0,0,0,0.22)'); ln(bx, by, bx + len, by + dy, BONE); for (const [ex, ey] of [[bx - 1, by], [bx + len + 1, by + dy]]) { F(BONE, ex, ey - 1); F(BONE2, ex, ey + 1); } };
  const bones = (bx, by) => { for (let k = randi(2, 4); k > 0; k--) bone(bx + randi(-6, 4), by + randi(-3, 3), randi(4, 7), randi(-2, 2)); if (Math.random() < 0.75) skull(bx + randi(-4, 2), by + randi(-5, -1)); };
  const web = (wx, wy, sx, sy, R) => { const col = 'rgba(214,214,208,0.24)'; for (let k = 0; k <= 4; k++) { const a = k / 4 * Math.PI / 2; ln(wx, wy, wx + sx * Math.cos(a) * R, wy + sy * Math.sin(a) * R, col); } for (const rr of [R * 0.35, R * 0.65, R * 0.95]) { let p0 = wx + sx * rr, q0 = wy; for (let k = 1; k <= 4; k++) { const a = k / 4 * Math.PI / 2, r2 = rr * (k % 2 ? 0.82 : 1), p1 = wx + sx * Math.cos(a) * r2, q1 = wy + sy * Math.sin(a) * r2; ln(p0, q0, p1, q1, col); p0 = p1; q0 = q1; } } };
  const runeCircle = (cx, cy, R) => { // a worn summoning ring cut into the flagstones
    const ry = 0.8, CV = 'rgba(14,14,18,0.34)', HI = 'rgba(255,255,255,0.07)';
    for (const rr of [R, R - 10, R * 0.36]) { ell(cx, cy + 1, rr, rr * ry, HI); ell(cx, cy, rr, rr * ry, CV); }
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, rr = R - 5, gx = Math.round(cx + Math.cos(a) * rr) - 1, gy = Math.round(cy + Math.sin(a) * rr * ry) - 2; for (const [u, v] of pick(RUNES)) F(CV, gx + u, gy + v); }
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.785; ln(cx + Math.cos(a) * R * 0.36, cy + Math.sin(a) * R * 0.36 * ry, cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10) * ry, CV); }
  };
  const rug = (cx, cy, w, h) => { // a moth-eaten runner, fringe at both ends
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
    F('rgba(0,0,0,0.15)', x0 + 1, y0 + 2, w, h); F('#4b4648', x0, y0, w, h); F('#5a5456', x0, y0, w, 1);
    for (const [a, bb, ww, hh] of [[2, 2, w - 4, 1], [2, h - 3, w - 4, 1], [2, 2, 1, h - 4], [w - 3, 2, 1, h - 4]]) F('#37323a', x0 + a, y0 + bb, ww, hh);
    for (let xx = x0 + 8; xx < x0 + w - 8; xx += 9) { F('#5f595b', xx, cy - 1, 1, 3); F('#5f595b', xx - 1, cy, 3, 1); }
    for (let n = randi(3, 6); n > 0; n--) { const hx = x0 + randi(4, w - 10), hy = y0 + randi(3, h - 7); F('#3c3739', hx, hy, randi(3, 7), randi(2, 4)); }
    for (let yy = y0 + 1; yy < y0 + h - 1; yy += 2) { F('#4b4648', x0 - randi(1, 3), yy, 3, 1); F('#4b4648', x0 + w - 1, yy, randi(2, 4), 1); }
  };
  const grate = (gx, gy) => { F('#242926', gx, gy, 12, 10); F('#6a716b', gx, gy, 12, 1); F('#3a403c', gx, gy + 9, 12, 1); for (let k = 1; k < 12; k += 3) F('#525953', gx + k, gy + 1, 1, 8); F('rgba(0,0,0,0.3)', gx, gy + 10, 12, 1); };
  const vent = (vx, vy) => { F('#26272c', vx - 5, vy - 3, 11, 7); F('#7d808a', vx - 5, vy - 3, 11, 1); F('#3a3c43', vx - 5, vy + 3, 11, 1); for (let k = -3; k <= 3; k += 2) F('#55575f', vx + k, vy - 2, 1, 5); L.vents.push({ x: vx, y: vy - 3, p: rand() }); };
  const crack = (cx0, cy0, len, a) => { for (let i = 0; i < len; i++) { const qx = Math.round(cx0), qy = Math.round(cy0); F(dk ? '#0b0a0e' : '#47464b', qx, qy); F(dk ? (i % 2 ? 'rgba(185,138,255,0.3)' : 'rgba(0,0,0,0)') : 'rgba(255,255,255,0.07)', qx + 1, qy); a += rand(-0.5, 0.5); cx0 += Math.cos(a); cy0 += Math.sin(a) * 0.8; if (len > 12 && Math.random() < 0.05) crack(cx0, cy0, len >> 1, a + rand(-1.2, 1.2)); } };
  const chunk = (rx, ry) => { const w = randi(2, 4), h = randi(2, 3); rx = Math.round(rx); ry = Math.round(ry); F('rgba(0,0,0,0.35)', rx + 1, ry + h + 2, w, 1); F('#2c2a33', rx, ry, w, h); F('#46425a', rx, ry, w, 1); };
  const GRIME = ['rgba(10,10,14,0.05)', 'rgba(14,24,18,0.07)', 'rgba(10,10,18,0.05)', 'rgba(150,110,255,0.022)'][b];
  const inlay = b === 2 ? gearSpr(46, 20, [24, 24, 32, 70], [10, 10, 14, 110], [255, 255, 255, 40], 0.8) : null;
  for (const r of L.rooms) {
    const ix = (r.x + 1) * T, iy = (r.y + 1) * T, iw = (r.w - 2) * T, ih = (r.h - 2) * T, cx = ix + iw / 2, cy = iy + ih / 2, big = r.type === 'combat' || r.type === 'elite';
    const floorAt = (fx, fy) => at(Math.floor(fx / T), Math.floor(fy / T)) === TF && ![...r.gates].some(g => Math.abs(g.x * T + 8 - fx) < 40 && Math.abs(g.y * T + 8 - fy) < 40);
    x.save(); x.beginPath(); x.rect(ix, iy, iw, ih); x.clip();
    for (let n = randi(3, 6) + (b === 1 ? 3 : 0); n > 0; n--) { const bx = rand(ix, ix + iw), by = rand(iy, iy + ih), rr = rand(18, 56); for (let k = 0; k < 5; k++) { const q = rr * rand(0.35, 0.8); blot(bx + rand(-rr, rr) * 0.6, by + rand(-rr, rr) * 0.4, q, q * rand(0.5, 0.8), GRIME); } }
    if (b === 0) {
      if (big && Math.random() < 0.6) runeCircle(cx, cy + 2, Math.round(Math.min(iw * 0.3, ih * 0.38)));
      else if ((big && Math.random() < 0.6) || r.type === 'library') { const hz = iw >= ih; rug(cx, cy + 2, hz ? Math.round(iw * rand(0.45, 0.6)) : 44, hz ? 44 : Math.round(ih * rand(0.45, 0.6))); }
      for (const [bx, by] of [[ix + 8, iy + 10], [ix + iw - 10, iy + 10], [ix + 8, iy + ih - 6], [ix + iw - 10, iy + ih - 6]]) if (Math.random() < 0.45 && floorAt(bx, by)) bones(bx, by);
      for (let n = randi(1, 3); n > 0; n--) { const bx = rand(ix + 10, ix + iw - 10), by = rand(iy + 10, iy + ih - 10); if (floorAt(bx, by)) bone(bx, by, randi(4, 6), randi(-2, 2)); }
      if (Math.random() < 0.7) web(ix, iy, 1, 1, randi(12, 20)); if (Math.random() < 0.7) web(ix + iw - 1, iy, -1, 1, randi(12, 20));
      for (let n = randi(2, 5); n > 0; n--) crack(rand(ix + 10, ix + iw - 10), rand(iy + 10, iy + ih - 10), randi(10, 28), rand(TAU));
    } else if (b === 1) {
      for (let n = randi(1, 3); n > 0; n--) { const tx = randi(r.x + 2, r.x + r.w - 3), ty = randi(r.y + 2, r.y + r.h - 3); if (floorAt(tx * T + 8, ty * T + 8)) grate(tx * T + 2, ty * T + 3); }
      for (let n = randi(2, 4); n > 0; n--) blot(rand(ix, ix + iw), rand(iy, iy + ih), rand(10, 24), rand(6, 12), 'rgba(80,104,62,0.07)');
    } else if (b === 2) {
      if (big && Math.random() < 0.75) x.drawImage(inlay, Math.round(cx - inlay.width / 2), Math.round(cy + 2 - inlay.height / 2));
    } else {
      for (let n = randi(4, 8); n > 0; n--) crack(rand(ix + 10, ix + iw - 10), rand(iy + 10, iy + ih - 10), randi(14, 40), rand(TAU));
      for (let n = randi(1, 2); n > 0; n--) { const qx = rand(ix + 30, ix + iw - 60), qy = rand(iy + 20, iy + ih - 50), s = randi(18, 34), col = 'rgba(200,185,255,0.08)'; if (Math.random() < 0.5) { ln(qx, qy, qx + s, qy, col, 3); ln(qx + s, qy, qx + s, qy + s, col, 3); ln(qx + s, qy + s, qx, qy + s, col, 3); ln(qx, qy + s, qx, qy, col, 3); ln(qx, qy, qx + s * 0.4, qy - s * 0.3, col, 3); ln(qx + s, qy, qx + s * 1.4, qy - s * 0.3, col, 3); ln(qx + s * 0.4, qy - s * 0.3, qx + s * 1.4, qy - s * 0.3, col, 3); } else { ln(qx, qy + s, qx + s / 2, qy, col, 3); ln(qx + s / 2, qy, qx + s, qy + s, col, 3); ln(qx + s, qy + s, qx, qy + s, col, 3); } }
      for (let n = randi(3, 7); n > 0; n--) { const qx = rand(ix + 6, ix + iw - 8), qy = rand(iy + 6, iy + ih - 8); if (floorAt(qx, qy)) chunk(qx, qy); }
    }
    x.restore();
  }
  // ---- water channels / void pools and spike plates
  const PC = dk ? ['#0b0a0f', '#4a3f66', '#1a1724', 'rgba(185,138,255,0.28)'] : b === 1 ? ['#2a3836', '#767d76', '#3b4d4a', 'rgba(190,220,214,0.3)'] : ['#1f2025', '#55565c', '#2e2f36', 'rgba(220,222,232,0.18)'];
  for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < Lw; tx++) if (L.t[ty * Lw + tx] === TP) blot(tx * T + 8, ty * T + 9, 14, 13, dk ? 'rgba(120,80,220,0.06)' : 'rgba(10,18,16,0.12)');
  for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < Lw; tx++) {
    const v = L.t[ty * Lw + tx], px = tx * T, py = ty * T;
    if (v === TP) {
      F(PC[0], px, py, T, T);
      if (at(tx, ty - 1) !== TP) { F(PC[1], px, py, T, 2); F('rgba(0,0,0,0.35)', px, py + 2, T, 2); }
      if (at(tx - 1, ty) !== TP) F(PC[1], px, py, 1, T);
      if (at(tx + 1, ty) !== TP) F(PC[1], px + T - 1, py, 1, T);
      if (at(tx, ty + 1) !== TP) F(PC[2], px, py + T - 1, T, 1);
      if (b === 1) for (let yy = 5 + (tx & 1) * 2; yy < T - 1; yy += 4) F(PC[2], px + ((yy * 3 + tx * 5) % 6), py + yy, randi(4, 8), 1); // the channel's slow current
      for (let n = randi(1, 3); n > 0; n--) F(Math.random() < 0.3 ? PC[3] : PC[2], px + randi(1, 10), py + randi(5, 13), randi(2, 6), 1);
    } else if (v === TS) {
      const SP = dk ? ['#2e2c36', '#47445a', '#1d1b22', '#0c0b10'] : ['#5c5c62', '#7c7c82', '#404046', '#1d1d21'];
      F(SP[0], px + 1, py + 1, T - 2, T - 2); F(SP[1], px + 1, py + 1, T - 2, 1); F(SP[2], px + 1, py + T - 2, T - 2, 1);
      for (const [a, bb] of [[4, 4], [10, 4], [4, 10], [10, 10]]) { F(SP[3], px + a, py + bb, 2, 2); F(SP[1], px + a, py + bb + 2, 2, 1); }
    }
  }
  // ---- room ornaments: guardian's summoning ring, camp / shrine circle
  for (const r of L.rooms) {
    const cx = (r.x + r.w / 2) * T, cy = (r.y + r.h / 2) * T;
    x.fillStyle = B.det;
    if (r.type === 'boss') {
      for (const rr of [60, 76, 108]) for (let a = 0; a < TAU; a += 1 / rr) x.fillRect(Math.round(cx + Math.cos(a) * rr * 1.25), Math.round(cy + Math.sin(a) * rr * 0.8), 1, 1);
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; x.fillRect(Math.round(cx + Math.cos(a) * 90 * 1.25) - 1, Math.round(cy + Math.sin(a) * 90 * 0.8) - 1, 3, 3); }
    } else if (r.type === 'start' || r.type === 'shrine') {
      for (let a = 0; a < TAU; a += 1 / 40) x.fillRect(Math.round(cx + Math.cos(a) * 40), Math.round(cy + Math.sin(a) * 26), 1, 1);
    }
  }
  // ---- contact shadows along walls, moss, candles at the crypt walls, steam vents, gate sills, firelight on the floor
  const AO = dk ? ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.06)'] : ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.17)', 'rgba(0,0,0,0.09)', 'rgba(0,0,0,0.04)'];
  const candles = (cx, cy) => { glow(cx, cy - 3, 12, 7, 'rgba(255,138,42,0.05)'); for (let k = randi(2, 3); k > 0; k--) { const hx = cx + randi(-4, 4), hh = randi(2, 4); F('#cfcabe', hx - 1, cy, 3, 1); F('#d9d5c9', hx, cy - hh, 1, hh); F('#a9a49a', hx, cy - 1); L.lamps.push({ x: hx, y: cy - hh - 1, k: 0 }); } };
  for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < Lw; tx++) {
    if (E[ty * Lw + tx]) continue;
    const px = tx * T, py = ty * T, v = L.t[ty * Lw + tx], up = isW(tx, ty - 1), side = isW(tx - 1, ty) || isW(tx + 1, ty), free = v === TF && !sill.has(ty * Lw + tx) && !sill.has((ty - 1) * Lw + tx);
    if (up) for (let k = 0; k < 4; k++) F(AO[k], px, py + k, T, 1);
    if (isW(tx - 1, ty)) { F(AO[1], px, py, 1, T); F(AO[3], px + 1, py, 1, T); }
    if (isW(tx + 1, ty)) { F(AO[1], px + T - 1, py, 1, T); F(AO[3], px + T - 2, py, 1, T); }
    if (b === 1 && v === TF && (up || side) && Math.random() < 0.5) for (let n = randi(2, 5); n > 0; n--) F(pick(['#5d6a52', '#56634c', '#66735a']), px + randi(0, 15), py + (up ? randi(0, 3) : randi(0, 15)));
    if (b === 0 && free && up && tall(tx, ty - 1) && Math.random() < 0.06) candles(px + randi(5, 10), py + randi(6, 9));
    if (b === 2 && free && (up || side) && L.rid[ty * Lw + tx] >= 0 && Math.random() < 0.025) vent(px + 8, py + 9);
  }
  const SILL = ['#58575c', '#4c524e', '#5d5f67', '#2a2830'][b];
  for (const [i, hz] of sill) {
    const px = (i % Lw) * T, py = ((i / Lw) | 0) * T;
    if (hz) { F(SILL, px, py + 4, T, 8); F('rgba(255,255,255,0.18)', px, py + 4, T, 1); F('rgba(0,0,0,0.35)', px, py + 7, T, 2); F('rgba(0,0,0,0.18)', px, py + 11, T, 1); for (const k of [3, 12]) F('rgba(255,255,255,0.2)', px + k, py + 5); }
    else { F(SILL, px + 4, py, 8, T); F('rgba(255,255,255,0.18)', px + 4, py, 1, T); F('rgba(0,0,0,0.35)', px + 7, py, 2, T); F('rgba(0,0,0,0.18)', px + 11, py, 1, T); for (const k of [3, 12]) F('rgba(255,255,255,0.2)', px + 5, py + k); }
  }
  for (const [i, k] of deco) { const lx = (i % Lw) * T + 8, ly = ((i / Lw) | 0) * T + T + 10; if (k === 'torch' || k === 'candles' || k === 'furnace') glow(lx, ly, k === 'furnace' ? 30 : 24, k === 'furnace' ? 13 : 11, k === 'furnace' ? 'rgba(255,128,36,0.07)' : 'rgba(255,138,42,0.05)'); else if (k === 'shard' || k === 'rift') glow(lx, ly, 20, 9, 'rgba(185,138,255,0.045)'); }
  // ---- low walls (block walking, not shots): tomb ledges, brick parapets, iron barriers, obsidian slabs
  // a lit top a step brighter than the floor, a black outline and a dark front face, so they never melt into the floor (full walls have dark caps instead)
  const LT = [['#9a999e', '#838287', '#b3b2b6', '#3a393e'], ['#8a918b', '#747b75', '#a3aaa4', '#323733'], ['#9496a0', '#7c7e88', '#b0b2bc', '#3a3c43'], ['#4a4658', '#3a3747', '#6a6580', '#141318']][b];
  for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < Lw; tx++) if (L.t[ty * Lw + tx] === TL) {
    const px = tx * T, py = ty * T, up = at(tx, ty - 1) === TL, dn = at(tx, ty + 1) === TL, lf = at(tx - 1, ty) === TL, rt = at(tx + 1, ty) === TL;
    F(LT[0], px, py - 3, T, T);
    if (b === 0) { F(LT[1], px + (lf ? 0 : 2), py, T - (lf ? 0 : 2) - (rt ? 0 : 2), 1); F(LT[1], px + (lf ? 0 : 2), py + 8, T - (lf ? 0 : 2) - (rt ? 0 : 2), 1); F('rgba(255,255,255,0.06)', px, py + 1, T, 1); }
    else if (b === 1) for (let j = 0; j < 4; j++) { F(LT[1], px, py - 3 + j * 4, T, 1); F(LT[1], px + ((j + tx) & 1 ? 4 : 12), py - 3 + j * 4, 1, 4); }
    else if (b === 2) { for (let k = -T; k < T; k += 5) for (let j = 0; j < T; j++) { const xx = k + j; if (xx >= 0 && xx < T && (j & 1)) F('rgba(255,255,255,0.09)', px + xx, py - 3 + j); } for (const a of [2, 13]) { F(LT[3], px + a, py - 1); F(LT[3], px + a, py + 9); } }
    else { F('rgba(215,205,255,0.08)', px + 2, py + 1, T - 4, 1); if (Math.random() < 0.3) F('rgba(185,138,255,0.3)', px + randi(2, 12), py + randi(0, 9), 2, 1); }
    if (!up) { F(OL, px, py - 3, T, 1); F(LT[2], px, py - 2, T, 1); }
    if (!lf) { F(OL, px, py - 3, 1, T + 3); F(LT[2], px + 1, py - 2, 1, T - 2); }
    if (!rt) { F(OL, px + T - 1, py - 3, 1, T + 3); F(LT[1], px + T - 2, py - 2, 1, T - 2); }
    if (!dn) { F(LT[3], px, py + T - 4, T, 3); F(OL, px, py + T - 1, T, 1); F(AO[0], px, py + T, T, 2); F(AO[2], px, py + T + 2, T, 1); }
  }
  // ---- walls: cap (top) + front face, tall faces on back walls, cliffs where a room drops into the void
  const torch = (lx, top) => { // iron sconce; its flame and flicker are drawn live
    x.drawImage(circSpr(24, 'rgba(255,138,42,0.11)'), lx - 10, top - 6, 20, 20);
    F('#151417', lx - 1, top + 6, 3, 6); F('#2c2b30', lx - 2, top + 4, 5, 2); F('#5a595f', lx - 2, top + 4, 5, 1); F('#151417', lx, top + 12, 1, 2);
    L.lamps.push({ x: lx, y: top + 3, k: 1 });
  };
  const candelabra = (lx, top) => { x.drawImage(circSpr(24, 'rgba(255,138,42,0.08)'), lx - 9, top - 2, 18, 16); F('#18171b', lx, top + 8, 1, 9); F('#18171b', lx - 4, top + 8, 9, 1); F('#18171b', lx - 2, top + 16, 5, 1); for (const ox of [-4, 0, 4]) { F('#d9d5c9', lx + ox, top + 5 + (ox ? 1 : 0), 1, ox ? 2 : 3); L.lamps.push({ x: lx + ox, y: top + 4 + (ox ? 1 : 0), k: 0 }); } };
  const coffin = (px, top) => { F('#1a191d', px + 2, top, 12, 18); F('#29282c', px + 3, top + 1, 10, 16); [4, 6, 8, 8, 8, 7, 7, 7, 6, 6, 5, 5, 4].forEach((w, i) => { F(i ? '#58565b' : '#6d6b70', px + 8 - (w >> 1), top + 2 + i, w, 1); F('#3d3c41', px + 8 - (w >> 1) + w - 1, top + 2 + i, 1, 1); }); F('#3d3c41', px + 7, top + 4, 2, 8); F('#3d3c41', px + 5, top + 6, 6, 2); };
  const banner = (px, top, col, em) => { F('#151417', px + 2, top + 1, 12, 1); F('#6a696f', px + 2, top + 1); F('#6a696f', px + 13, top + 1); F(col, px + 4, top + 2, 8, 11); for (let xx = 0; xx < 8; xx++) F(col, px + 4 + xx, top + 13, 1, xx % 3 === 1 ? 1 : 3); F('rgba(255,255,255,0.1)', px + 4, top + 2, 1, 11); F('rgba(0,0,0,0.3)', px + 11, top + 2, 1, 12); F(em, px + 6, top + 4, 4, 4); F(em, px + 7, top + 8, 2, 1); F('rgba(0,0,0,0.25)', px + 7, top + 5, 2, 2); };
  const chains = (px, top, hgt) => { for (const cx0 of [px + 4, px + 11]) { const len = randi(8, hgt - 3); for (let y = 0; y < len; y += 3) { F('#6a6a70', cx0, top + y, 1, 2); F('#404046', cx0 - 1, top + y + 2, 3, 1); } F('#7a7a80', cx0 - 1, top + len, 3, 2); F('#2a2a2e', cx0, top + len + 1); } };
  const shelf = (px, top, hgt, tx) => { F('#1b1a1d', px, top, T, hgt); for (let y = top; y < top + hgt - 1; y += 6) { F('#4d4a4c', px, y, T, 1); const yb = Math.min(y + 6, top + hgt - 1); for (let bx = px; bx < px + T;) { const bw = randi(1, 3), bh = randi(Math.max(2, yb - y - 3), yb - y - 1); if (Math.random() < 0.85) { F(pick(BOOKS), bx, yb - bh, bw, bh); if (bw > 1) F('rgba(0,0,0,0.25)', bx + bw - 1, yb - bh, 1, bh); } bx += bw; } } if (tx % 2 === 0) F('#2b292c', px, top, 2, hgt); };
  const faceArt = (px, top, hgt, tx, k, pipe) => {
    const tl = hgt > 8;
    if (b === 0) { // big cut blocks
      F(WC.face, px, top, T, hgt);
      for (let j = 0, y = top; y < top + hgt; j++, y += 6) { F(WC.faceDk, px, y, T, 1); F(WC.faceDk, px + ((j + tx) & 1 ? 0 : 8), y, 1, 6); F('rgba(255,255,255,0.06)', px, y + 1, T, 1); if (Math.random() < 0.4) F(Math.random() < 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.04)', px + ((j + tx) & 1 ? 1 : 9), y + 1, 7, 5); }
      if (Math.random() < 0.2) { let cx0 = px + randi(2, 13); for (let y = top + 1; y < top + hgt - 1; y++) { F('#2a292e', cx0, y); if (Math.random() < 0.4) cx0 += randi(-1, 1); } }
      if (k === 'torch') torch(px + 8, top); else if (k === 'candles') candelabra(px + 8, top); else if (k === 'coffin') coffin(px, top); else if (k === 'shelf') shelf(px, top, hgt, tx);
      else if (k === 'banner') banner(px, top, '#3d3b40', '#6a686e'); else if (k === 'chains') chains(px, top, hgt);
      else if (k === 'niche') { F('#19181c', px + 4, top + 5, 8, 9); F('#19181c', px + 5, top + 4, 6, 1); F('#5c5b60', px + 3, top + 14, 10, 1); skull(px + 6, top + 9); }
      else if (k === 'web') web(px + (tx & 1 ? T - 1 : 0), top, tx & 1 ? -1 : 1, 1, 12);
    } else if (b === 1) { // small wet bricks, slime running down
      F(WC.face, px, top, T, hgt);
      for (let j = 0, y = top; y < top + hgt; j++, y += 3) { F(WC.faceDk, px, y, T, 1); F(WC.faceDk, px + ((j + tx) & 1 ? 3 : 9), y, 1, 3); F('rgba(255,255,255,0.05)', px, y + 1, T, 1); }
      F('#47523f', px, top, T, 1); for (let n = randi(1, 4); n > 0; n--) F(pick(['#4c5845', '#56634d']), px + randi(0, 15), top, 1, randi(1, Math.min(7, hgt)));
      if (Math.random() < 0.5) F('rgba(0,0,0,0.22)', px + randi(1, 14), top + 2, 1, hgt - 3);
      F('#1c1f1d', px, top + hgt - 1, T, 1);
      if (k === 'outflow') { x.drawImage(circSpr(5, '#232825'), px + 3, top + 3); x.drawImage(circSpr(4, '#5d645f'), px + 4, top + 4); x.drawImage(circSpr(3, '#0e1211'), px + 5, top + 5); F('#7d857e', px + 5, top + 4, 3, 1); F('rgba(170,200,195,0.5)', px + 8, top + 10, 1, hgt - 10); F('rgba(170,200,195,0.35)', px + 7, top + hgt - 1, 3, 1); F('rgba(16,24,22,0.4)', px + 4, top + hgt, 9, 2); F('rgba(16,24,22,0.25)', px + 2, top + hgt + 2, 12, 2); F('rgba(170,200,195,0.25)', px + 6, top + hgt + 1, 3, 1); }
      else if (k === 'grate') { F('#151816', px + 3, top + 4, 10, 9); F('#6d746e', px + 3, top + 4, 10, 1); for (let xx = px + 4; xx < px + 13; xx += 2) F('#4f5751', xx, top + 5, 1, 8); F('#3a403c', px + 3, top + 12, 10, 1); }
      else if (k === 'moss') for (let xx = px; xx < px + T; xx++) if (Math.random() < 0.7) F(pick(['#4c5845', '#56634d', '#3f4a3a']), xx, top, 1, randi(2, hgt - 4));
      else if (k === 'torch') torch(px + 8, top); else if (k === 'chains') chains(px, top, hgt);
      if (pipe) { F('#2b302d', px, top + 2, T, 1); F('#59605a', px, top + 3, T, 3); F('#808881', px, top + 3, T, 1); F('#353b37', px, top + 5, T, 1); if (tx % 3 === 0) { F('#444b46', px + 2, top + 2, 2, 5); F('#6a726b', px + 2, top + 2, 1, 5); } }
    } else if (b === 2) { // riveted iron panels
      F(WC.face, px, top, T, hgt);
      if (tl) { F('#53555e', px + 1, top + 2, T - 2, hgt - 5); F('#62656f', px + 1, top + 2, T - 2, 1); F('#3a3c44', px + 1, top + hgt - 4, T - 2, 1); F(WC.faceDk, px, top + 9, T, 1); }
      for (let xx = px + 2; xx < px + T; xx += 4) { F('#8f929e', xx, top + 1); F('#2a2b31', xx + 1, top + 2); if (tl) { F('#8f929e', xx, top + hgt - 3); F('#2a2b31', xx + 1, top + hgt - 2); } }
      F('#5f6271', px, top, 1, hgt); F('#33353c', px + T - 1, top, 1, hgt); F('#202127', px, top + hgt - 1, T, 1);
      if (k === 'furnace') { F('#141316', px + 2, top + 3, 12, hgt - 3); F('#141316', px + 3, top + 2, 10, 1); F('#2a1408', px + 3, top + 5, 10, hgt - 7); F('#7a2e0c', px + 3, top + hgt - 9, 10, 3); F(C.fire, px + 3, top + hgt - 6, 10, 3); F('#ffb04a', px + 4, top + hgt - 5, 8, 1); for (let k2 = 0; k2 < 4; k2++) F('#3e3e44', px + 4 + k2 * 3, top + 4, 1, hgt - 5); F('#5f6271', px + 2, top + 3, 12, 1); x.drawImage(circSpr(24, 'rgba(255,128,36,0.12)'), px - 4, top + 2, 24, 22); L.lamps.push({ x: px + 8, y: top + hgt - 4, k: 2 }); }
      else if (k === 'gauge') { x.drawImage(circSpr(5, '#1d1e23'), px + 3, top + 2); x.drawImage(circSpr(4, '#c9ccd6'), px + 4, top + 3); F('#9a9eab', px + 5, top + 4, 2, 1); F('#2a2b31', px + 8, top + 5, 1, 3); F('#2a2b31', px + 9, top + 5); F('#5d606a', px + 7, top + 13, 2, hgt - 13); F('#8a8e9a', px + 7, top + 13, 1, hgt - 13); }
      else if (k === 'window') { x.drawImage(circSpr(6, '#25262c'), px + 2, top + 2); x.drawImage(circSpr(4, '#7f8596'), px + 4, top + 4); F('#b4bacb', px + 5, top + 6, 2, 1); F('#b4bacb', px + 5, top + 7); F('rgba(255,255,255,0.6)', px + 10, top + 10); for (const [a, c2] of [[8, 2], [8, 14], [2, 8], [14, 8]]) F('#9a9eab', px + a, top + c2); }
      else if (k === 'cog') { const g = gearSpr(7, 10, [70, 72, 82, 255], [130, 134, 150, 255], [36, 37, 43, 255]); x.drawImage(g, px + 1, top + 1); }
      else if (k === 'chains') chains(px, top, hgt);
      if (pipe) { F('#2a2b31', px, top + 12, T, 1); F('#6e717c', px, top + 13, T, 2); F('#9a9eab', px, top + 13, T, 1); if (tx % 2 === 0) F('#4a4c55', px + 6, top + 12, 2, 4); }
    } else { // obsidian blocks, faint violet veins
      F(WC.face, px, top, T, hgt);
      for (let n = randi(1, 2); n > 0; n--) F(WC.faceDk, px + randi(0, 15), top, 1, hgt);
      F('#3a3746', px, top, T, 1); F('#0d0c11', px, top + hgt - 1, T, 1);
      if (tl) { const o = randi(1, 9); for (let i = 0; i < 6; i++) F('rgba(215,205,255,0.07)', px + o + i, top + 12 - i * 2, 1, 2); }
      if (Math.random() < 0.18) { let cx0 = px + randi(3, 12); for (let y = top + 1; y < top + hgt - 1; y++) { F('rgba(185,138,255,0.35)', cx0, y); if (Math.random() < 0.5) cx0 += randi(-1, 1); } }
      if (k === 'shard') { x.drawImage(circSpr(24, 'rgba(185,138,255,0.1)'), px - 3, top, 22, 20); for (const [ox, hh, ww] of [[3, randi(6, 9), 3], [7, randi(10, 14), 4], [11, randi(5, 8), 3]]) { const y0 = top + hgt - 1 - hh; for (let y = 0; y < hh; y++) { const w2 = Math.max(1, Math.round(ww * Math.min(1, (y + 1) / 3))); F(y < 2 ? C.violet : '#5d3f8a', px + ox, y0 + y, w2, 1); F('#c9a8ff', px + ox, y0 + y, 1, 1); } } L.lamps.push({ x: px + 8, y: top + 8, k: 3 }); }
      else if (k === 'rift') { x.drawImage(circSpr(24, 'rgba(185,138,255,0.12)'), px - 2, top - 1, 20, 20); let cx0 = px + 8; for (let y = top + 1; y < top + hgt - 1; y++) { F('#05040a', cx0 - 1, y, 2, 1); F('rgba(185,138,255,0.6)', cx0 - 2, y); F('rgba(185,138,255,0.6)', cx0 + 1, y); if (y % 4 === 0) F('#e2ccff', cx0, y); if (Math.random() < 0.5) cx0 += randi(-1, 1); } L.lamps.push({ x: px + 8, y: top + 8, k: 3 }); }
      else if (k === 'wire') { F('#0d0c11', px + 1, top + 1, T - 2, hgt - 2); ln(px + 2, top + 2, px + 13, top + 2, 'rgba(200,185,255,0.3)', 2); ln(px + 13, top + 2, px + 13, top + hgt - 3, 'rgba(200,185,255,0.3)', 2); ln(px + 2, top + hgt - 3, px + 13, top + hgt - 3, 'rgba(200,185,255,0.3)', 2); ln(px + 2, top + 2, px + 2, top + hgt - 3, 'rgba(200,185,255,0.3)', 2); ln(px + 2, top + 2, px + 13, top + hgt - 3, 'rgba(200,185,255,0.15)', 2); }
      else if (k === 'rubble') for (let n = randi(2, 4); n > 0; n--) chunk(px + randi(1, 11), top + randi(2, 12));
    }
  };
  const capTop = (px, y, tx) => { // things standing on a back wall, silhouetted against the void
    const r = Math.random();
    if (b === 0 && tx % 2 === 0) { const hh = r < 0.25 ? 2 : 4; F(WC.cap, px + 3, y - hh, 10, hh); F(WC.rim, px + 3, y - hh, r < 0.25 ? 6 : 10, 1); F(OL, px + 2, y - hh, 1, hh); F(OL, px + 13, y - hh, 1, hh); }
    else if (b === 1 && r < 0.14) { const hh = randi(4, 9); F('#3f4641', px + 6, y - hh, 3, hh); F('#6a726b', px + 6, y - hh, 1, hh); F('#4c534e', px + 5, y - hh, 5, 2); }
    else if (b === 2 && r < 0.12) { F('#3a3c44', px + 5, y - 7, 5, 7); F('#7a7d8a', px + 5, y - 7, 5, 1); F('#262730', px + 4, y - 8, 7, 1); L.vents.push({ x: px + 7, y: y - 8, p: rand() }); }
    else if (b === 3 && r < 0.3) chunk(px + randi(2, 11), y - randi(4, 12));
  };
  for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < Lw; tx++) {
    const i = ty * Lw + tx; if (E[i] !== 1) continue;
    const px = tx * T, py = ty * T;
    if (tall(tx, ty)) {
      F(OL, px, py - 6, T, 1); F(WC.cap, px, py - 5, T, 3); F(WC.rim, px, py - 3, T, 1);
      faceArt(px, py - 2, 18, tx, deco.get(i), pipes.has(i));
      if (!tall(tx - 1, ty)) F('rgba(0,0,0,0.35)', px, py - 2, 1, 18);
      if (!tall(tx + 1, ty)) F('rgba(0,0,0,0.35)', px + T - 1, py - 2, 1, 18);
      capTop(px, py - 6, tx);
      continue;
    }
    const n = ek(tx, ty - 1), s = ek(tx, ty + 1), w = ek(tx - 1, ty), e = ek(tx + 1, ty), j = jamb.has(i);
    F(WC.cap, px, py - 6, T, T);
    F(WC.capDk, px, py + 1, T, 1); F(WC.capDk, px + ((tx + ty) & 1 ? 4 : 11), py - 6, 1, 7); F(WC.capDk, px + ((tx + ty) & 1 ? 11 : 4), py + 2, 1, 8);
    if (Math.random() < 0.4) F(WC.capDk, px + randi(1, 12), py + randi(-5, 7), 2, 1);
    if (j) { F(WC.lit, px + 2, py - 4, T - 4, 1); F(WC.lit, px + 2, py - 4, 1, T - 4); F(WC.capDk, px + 3, py - 3, T - 6, T - 6); F(WC.rim, px + 5, py, T - 10, T - 10); }
    if (!n) F(WC.rim, px, py - 6, T, 1); else if (n === 2) F(OL, px, py - 6, T, 1);
    if (!w) F(WC.rim, px, py - 6, 1, T); else if (w === 2) F(OL, px, py - 6, 1, T);
    if (!e) F(WC.rim, px + T - 1, py - 6, 1, T); else if (e === 2) F(OL, px + T - 1, py - 6, 1, T);
    if (!s) { F(WC.rim, px, py + 9, T, 1); faceArt(px, py + 10, 6, tx, null, false); if (j) { F('rgba(0,0,0,0.3)', px + 3, py + 11, 1, 4); F('rgba(0,0,0,0.3)', px + 12, py + 11, 1, 4); } }
    else if (s === 2) { // the room's edge drops into the void: a cliff that fades into the dark
      F(WC.rim, px, py + 9, T, 1); F(`rgb(${WC.deep})`, px, py + 10, T, 5);
      for (let k = 0; k < 4; k++) F(`rgba(${WC.deep},${(0.75 - k * 0.2).toFixed(2)})`, px, py + 15 + k * 2, T, 2);
      if (Math.random() < 0.6) F(OL, px + randi(1, 14), py + 10, 1, randi(2, 9));
      if (w === 2) F(OL, px, py + 10, 1, 5); if (e === 2) F(OL, px + T - 1, py + 10, 1, 5);
      if (b === 3 && Math.random() < 0.2) chunk(px + randi(2, 11), py + randi(26, 40));
    }
  }
  L.cv = c; L.dc = mk(W, H); L.dx = L.dc.getContext('2d');
}

/* ---------- rooms ---------- */
function roomAt(px, py) { const L = G.room, tx = Math.floor(px / T), ty = Math.floor(py / T); if (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) return null; const i = L.rid[ty * L.w + tx]; return i >= 0 ? L.rooms[i] : null; }
const deepIn = (r, e) => { const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T); return tx >= r.x + 2 && ty >= r.y + 2 && tx <= r.x + r.w - 3 && ty <= r.y + r.h - 3; };
function arena() { const r = G.cur || (G.room && G.room.start); if (!r) return { x0: 0, y0: 0, x1: VW, y1: VH, cx: VW / 2, cy: VH / 2, w: VW, h: VH }; const x0 = (r.x + 1) * T, y0 = (r.y + 1) * T, x1 = (r.x + r.w - 1) * T, y1 = (r.y + r.h - 1) * T; return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 }; }
function setGates(r, closed) {
  const L = G.room;
  for (const g of r.gates) { const i = g.y * L.w + g.x; L.t[i] = closed ? TD : TF; L.shakeT[i] = 0.3; }
  L.fd = null;
}

/* ---------- decals (blood and goo that stay on the floor) ---------- */
const decalCol = col => (G.room && G.room.dark && typeof col === 'string' && col.startsWith('rgba(18,18,22')) ? col.replace('rgba(18,18,22', 'rgba(232,232,226').replace(/,([0-9.]+)\)$/, (m, a) => ',' + (a * 0.55).toFixed(2) + ')') : col;
function decalDot(x, y, s, col) { if (!G.room) return; const c = G.room.dx; c.fillStyle = decalCol(col === C.ink ? 'rgba(18,18,22,0.6)' : col); const w = s >= 2 ? 2 : 1; c.fillRect(Math.round(x) + 8, Math.round(y) + 8, w + (Math.random() < 0.5 ? 1 : 0), w); }
function splat(x, y, s, col = 'rgba(18,18,22,0.5)') {
  const c = G.room.dx; col = decalCol(col);
  pcOn(c, x + 8, y + 8, s, col);
  for (let k = 0; k < 4 + s; k++) { const a = rand(TAU), r = rand(s * 0.6, s * 1.6); pcOn(c, x + 8 + Math.cos(a) * r, y + 8 + Math.sin(a) * r, rand(0.5, s * 0.45), col); }
}
function scorch(x, y, r) { const c = G.room.dx; pcOn(c, x + 8, y + 8, r * 0.55, decalCol('rgba(18,18,22,0.07)')); for (let k = 0; k < 7; k++) { const a = rand(TAU); pcOn(c, x + 8 + Math.cos(a) * r * 0.8, y + 8 + Math.sin(a) * r * 0.8, rand(1, 2.5), decalCol('rgba(18,18,22,0.22)')); } }

/* ---------- collision ---------- */
function hitsWall(x, y, r) {
  const R = G.room;
  const x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r - 0.01) / T), y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (walkBlock(tAt(R, tx, ty))) return true;
  return false;
}
function moveBody(e, dx, dy) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 1.5)), sx = dx / n, sy = dy / n;
  let hx = false, hy = false;
  for (let i = 0; i < n && i < 400; i++) {
    if (!hx && sx) { e.x += sx; if (hitsWall(e.x, e.y, e.r)) { e.x -= sx; hx = true; } }
    if (!hy && sy) { e.y += sy; if (hitsWall(e.x, e.y, e.r)) { e.y -= sy; hy = true; } }
  }
  return (hx || hy) ? { hx, hy } : null;
}
function solidShot(x, y) { return shotBlock(tAt(G.room, Math.floor(x / T), Math.floor(y / T))); }
function los(x0, y0, x1, y1, walk) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 5);
  for (let i = 1; i < n; i++) { const v = tAt(G.room, Math.floor((x0 + dx * i / n) / T), Math.floor((y0 + dy * i / n) / T)); if (walk ? walkBlock(v) : shotBlock(v)) return false; }
  return true;
}
function rayWall(x, y, a, max = 600) {
  const c = Math.cos(a), s = Math.sin(a);
  for (let d = 0; d < max; d += 2) if (solidShot(x + c * d, y + s * d)) return d;
  return max;
}
function tileUnder(e) { return tAt(G.room, Math.floor(e.x / T), Math.floor((e.y + e.r * 0.5) / T)); }

/* ---------- navigation: flow field toward the player (bounded to the current room) ---------- */
function computeFlow(px, py) {
  const R = G.room, { w, h, t } = R, r = G.cur;
  const d = R.fd || (R.fd = new Int16Array(w * h)); d.fill(-1);
  const bx0 = r ? r.x - 2 : 0, by0 = r ? r.y - 2 : 0, bx1 = r ? r.x + r.w + 2 : w, by1 = r ? r.y + r.h + 2 : h;
  const s = clamp(Math.floor(py / T), 0, h - 1) * w + clamp(Math.floor(px / T), 0, w - 1);
  const q = [s]; d[s] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi], x = i % w, y = (i / w) | 0;
    const nb = [x > bx0 ? i - 1 : -1, x < bx1 - 1 ? i + 1 : -1, y > by0 ? i - w : -1, y < by1 - 1 ? i + w : -1];
    for (const j of nb) if (j >= 0 && j < w * h && d[j] < 0 && !walkBlock(t[j])) { d[j] = d[i] + 1; q.push(j); }
  }
}
function navAngle(e, target) {
  const R = G.room;
  if (!R.fd || los(e.x, e.y, target.x, target.y, true)) return angTo(e, target);
  const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T), w = R.w;
  let best = -1, bd = 1e9;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oy) continue;
    const nx = tx + ox, ny = ty + oy; if (nx < 0 || ny < 0 || nx >= w || ny >= R.h) continue;
    if (ox && oy && (walkBlock(tAt(R, tx + ox, ty)) || walkBlock(tAt(R, tx, ty + oy)))) continue;
    const v = R.fd[ny * w + nx]; if (v >= 0 && v + (ox && oy ? 0.4 : 0) < bd) { bd = v + (ox && oy ? 0.4 : 0); best = ny * w + nx; }
  }
  if (best < 0) return angTo(e, target);
  return Math.atan2(((best / w) | 0) * T + T / 2 - e.y, (best % w) * T + T / 2 - e.x);
}
function randFloor(minDistFromPlayer = 0, avoid = []) {
  const L = G.room, r = G.cur || L.start;
  for (let k = 0; k < 240; k++) {
    const tx = randi(r.x + 1, r.x + r.w - 2), ty = randi(r.y + 1, r.y + r.h - 2);
    if (L.t[ty * L.w + tx] !== TF) continue;
    const x = tx * T + T / 2, y = ty * T + T / 2;
    if (minDistFromPlayer && k < 200 && d2(x, y, P.x, P.y) < minDistFromPlayer ** 2) continue;
    if (avoid.some(a => d2(x, y, a.x, a.y) < 400)) continue;
    return { x, y };
  }
  return { x: (r.x + r.w / 2) * T, y: (r.y + r.h / 2) * T };
}

/* ---------- destructible tiles ---------- */
function hurtTile(tx, ty, dmg) {
  const R = G.room; if (tx < 0 || ty < 0 || tx >= R.w || ty >= R.h) return;
  const i = ty * R.w + tx, v = R.t[i];
  if (v !== TX && v !== TB) return;
  R.hp[i] -= dmg; R.shakeT[i] = 0.12;
  const cx = tx * T + T / 2, cy = ty * T + T / 2;
  if (R.hp[i] > 0) { AU.crate(); burst(cx, cy, 2, C.lt, 50, 0.3); return; }
  R.t[i] = TF; R.fd = null;
  if (v === TX) {
    AU.crate();
    for (let k = 0; k < 10; k++) part(cx, cy, rand(-90, 90), rand(-90, 90), rand(0.4, 0.8), pick([C.white, C.lt, C.ink]), randi(1, 3), { drag: 0.88, z: rand(2, 6), vz: rand(30, 90) });
    splat(cx, cy, 2, 'rgba(18,18,22,0.18)');
    if (Math.random() < 0.3) for (let k = randi(1, 3); k > 0; k--) dropCoin(cx, cy);
    if (Math.random() < 0.05) dropItem(pick(['potion', 'vial']), cx, cy);
  } else later(0.05, () => worldBlast(cx, cy, 36, 30, true));
}
function updTiles(dt) {
  const R = G.room;
  R.spk = (R.spk + dt) % 3.2;
  const x0 = Math.max(0, Math.floor(G.camX / T) - 2), y0 = Math.max(0, Math.floor(G.camY / T) - 2), x1 = Math.min(R.w - 1, x0 + Math.ceil(VW / T) + 4), y1 = Math.min(R.h - 1, y0 + Math.ceil(VH / T) + 4);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const i = ty * R.w + tx; if (R.shakeT[i] > 0) R.shakeT[i] -= dt; }
}
const spikePhase = () => { const s = G.room.spk; return s < 2.0 ? 0 : s < 2.6 ? 1 : 2; };
function viewTiles() { const R = G.room, x0 = Math.max(0, Math.floor(G.camX / T) - 1), y0 = Math.max(0, Math.floor(G.camY / T) - 1); return [x0, y0, Math.min(R.w - 1, x0 + Math.ceil(VW / T) + 2), Math.min(R.h - 1, y0 + Math.ceil(VH / T) + 3)]; }
function drawDynTiles() {
  const R = G.room, [x0, y0, x1, y1] = viewTiles(), sp = spikePhase();
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const i = ty * R.w + tx, v = R.t[i], px = tx * T, py = ty * T;
    if (v === TP && ((tx * 7 + ty * 13 + Math.floor(G.t * 1.5)) % 11) === 0) { const k = (G.t * 6 + tx) % 8; prect(px + 3 + k, py + 6 + (ty % 3) * 2, 3, 1, R.dark ? 'rgba(185,138,255,0.45)' : 'rgba(190,215,210,0.45)'); }
    else if (v === TS) {
      if (sp === 1 && ((G.t * 10) | 0) % 2) for (const [a, b] of [[4, 4], [10, 4], [4, 10], [10, 10]]) prect(px + a, py + b, 2, 2, C.red);
      if (sp === 2) for (const [a, b] of [[4, 4], [10, 4], [4, 10], [10, 10]]) { prect(px + a - 1, py + b - 3, 4, 5, C.ink); prect(px + a, py + b - 2, 2, 3, C.white); prect(px + a, py + b - 3, 2, 1, C.red); }
    } else if (v === TD) { // closed gate: a heavy iron portcullis, red while the guardian's room is sealed
      const rise = R.shakeT[i] > 0 ? Math.round(R.shakeT[i] / 0.3 * 10) : 0, red = R.boss && R.boss.active, y0 = py - 6 + rise, h = T + 6 - rise;
      prect(px, y0, T, h, C.ink); prect(px + 1, y0 + 1, T - 2, h - 2, red ? '#2a0c10' : '#141417');
      for (let k = 0; k < 3; k++) { const bx = px + 1 + k * 5; prect(bx, y0 + 1, 4, h - 1, C.ink); prect(bx + 1, y0 + 1, 2, h - 2, red ? C.redDk : '#6e6d74'); prect(bx + 1, y0 + 1, 1, h - 2, red ? C.red : '#a9a8a6'); prect(bx + 1, y0 + h - 1, 2, 1, red ? C.red : '#8a898f'); }
      for (const yy of [3, 11]) if (yy < h - 2) { prect(px, y0 + yy, T, 3, C.ink); prect(px + 1, y0 + yy + 1, T - 2, 1, red ? C.redDk : '#4e4e55'); for (let k = 0; k < 3; k++) prect(px + 2 + k * 5, y0 + yy + 1, 1, 1, red ? C.red : '#b9b8b4'); }
      prect(px, y0, T, 1, red ? C.red : C.lt);
    }
  }
  // live flames: 0 candle, 1 torch, 2 furnace mouth, 3 void glow
  if (R.lamps) for (const l of R.lamps) {
    if (l.x < G.camX - 20 || l.x > G.camX + VW + 20 || l.y < G.camY - 20 || l.y > G.camY + VH + 24) continue;
    const f = Math.sin(G.t * 9 + l.x * 0.7) + Math.sin(G.t * 23.7 + l.y) * 0.5, k = l.k;
    if (k === 0) { prect(l.x, l.y - (f > 0.5 ? 1 : 0), 1, f > 0.5 ? 2 : 1, f > -0.5 ? '#ffb04a' : C.fire); prect(l.x, l.y + (f > 0.5 ? 0 : 0), 1, 1, '#fff0c0'); continue; }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k === 3 ? 0.3 + Math.sin(G.t * 2.2 + l.x) * 0.12 : 0.34 + f * 0.05;
    ctx.drawImage(k === 3 ? GLOWV : GLOWO, l.x - 16, l.y - 16); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (k === 1) { const h = 5 + (f > 0.3 ? 1 : 0) - (f < -0.9 ? 1 : 0), sw = f > 0.8 ? 1 : f < -0.6 ? -1 : 0; prect(l.x - 1, l.y - h + 3, 3, h - 2, C.fire); prect(l.x + sw, l.y - h + 1, 1, 2, C.fire); prect(l.x, l.y - h + 4, 1, h - 4, '#ffb04a'); prect(l.x, l.y, 1, 1, '#fff0c0'); }
    else if (k === 2) { const q = ((G.t * 6 + l.x) | 0) % 9; prect(l.x - 4 + q, l.y - 1, 1, 1, '#ffe2a8'); if (f > 0.6) prect(l.x - 3, l.y - 2, 7, 1, '#ff9a3c'); }
  }
}
function propList() {
  const R = G.room, out = [], [x0, y0, x1, y1] = viewTiles();
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const v = R.t[ty * R.w + tx]; if (v === TX || v === TB) out.push({ y: ty * T + T, draw: () => drawProp(tx, ty, v) }); }
  return out;
}
// crates and barrels are baked into small per-level sprites once (one drawImage per prop per frame)
const _props = [];
function propSpr(b) {
  if (_props[b]) return _props[b];
  const P = [['#a39b90', '#6f6961', '#8b847a', '#57524c'], ['#8f958d', '#626862', '#7b827a', '#4b514b'], ['#a4a6ae', '#6e7078', '#8e9098', '#50525a'], ['#5a5764', '#36343e', '#484553', '#2a2832']][b];
  const one = draw => { const s = mk(T, 20), c = s.getContext('2d'); draw((col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); }); return s; };
  const crate = one(F => {
    F(C.ink, 1, 0, 14, 18); F(P[0], 2, 1, 12, 11); F(P[1], 2, 13, 12, 4); F(C.ink, 2, 12, 12, 1); F('rgba(255,255,255,0.45)', 2, 1, 12, 1);
    F(P[2], 2, 2, 12, 1); F(P[2], 2, 10, 12, 1); F(P[2], 2, 2, 1, 9); F(P[2], 13, 2, 1, 9);
    for (let k = 0; k < 8; k++) { F(P[3], 4 + k, 3 + k); F(P[3], 11 - k, 3 + k); }
    for (const [a, c2] of [[3, 3], [12, 3], [3, 9], [12, 9]]) F(P[3], a, c2);
    F(P[3], 6, 13, 1, 4); F(P[3], 10, 13, 1, 4); F('rgba(255,255,255,0.2)', 2, 13, 12, 1);
    for (const [a, c2] of [[2, 1], [12, 1], [2, 13], [12, 13]]) { F('#2a2a2e', a, c2, 2, 2); F('#77777d', a, c2); } // iron corners
  });
  const barrel = on => one(F => {
    F(C.ink, 2, 0, 12, 18); F('#3c3c43', 3, 1, 10, 15); F('#5d5d66', 3, 1, 10, 3); F('#2c2c32', 5, 2, 6, 1);
    F('#6e6e78', 4, 4, 2, 11); F('#2c2c32', 8, 4, 1, 12); F('#2c2c32', 11, 4, 1, 12);
    F('#77777f', 3, 5, 10, 1); F('#77777f', 3, 14, 10, 1);
    F(C.red, 3, 8, 10, 2); F(C.redDk, 3, 10, 10, 1);
    if (on) F(C.red, 7, 5, 2, 1);
  });
  return (_props[b] = { x: crate, b: [barrel(0), barrel(1)] });
}
function drawProp(tx, ty, v) {
  const R = G.room, j = R.shakeT[ty * R.w + tx] > 0 ? randi(-1, 1) : 0, sp = propSpr(R.biome);
  ctx.drawImage(v === TX ? sp.x : sp.b[((G.t * 3) | 0) % 2], tx * T + j, ty * T - 4);
}
