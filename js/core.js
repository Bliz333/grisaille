'use strict';
/* GRISAILLE · core — math, palette, canvas, input, pixel primitives, bitmap font, particles */
const TAU = Math.PI * 2, T = 16;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const d2 = (ax, ay, bx, by) => { const x = ax - bx, y = ay - by; return x * x + y * y; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function wpick(arr, wf) { let s = 0; for (const x of arr) s += wf(x); let r = Math.random() * s; for (const x of arr) { r -= wf(x); if (r <= 0) return x; } return arr[arr.length - 1]; }
const hue = h => `hsl(${((Math.round(h / 30) * 30) % 360 + 360) % 360},92%,62%)`;

const C = {
  void: '#0a0a0c', ink: '#121215', ink2: '#1e1e23', dk: '#36363d', mid: '#6c6c72', lt: '#a7a6a0',
  paper: '#d4d3cc', paper2: '#c6c5be', white: '#f6f5f0',
  red: '#ff3d4a', redDk: '#7d0f1b', gold: '#ffc83d', goldDk: '#8a5a00', cyan: '#40e4ff', cyanDk: '#0a5f74',
  fire: '#ff8a2a', frost: '#aee0ff', violet: '#b98aff', mint: '#86e8b8', shadow: 'rgba(14,14,20,0.26)'
};

/* ---------- canvas ---------- */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let SCALE = 3, VW = 480, VH = 270;
function resize() {
  const W = innerWidth, H = innerHeight;
  SCALE = Math.max(2, Math.round(Math.min(H / 270, W / 420)));
  VW = Math.ceil(W / SCALE); VH = Math.ceil(H / SCALE);
  cv.width = VW; cv.height = VH;
  cv.style.width = VW * SCALE + 'px'; cv.style.height = VH * SCALE + 'px';
  ctx.imageSmoothingEnabled = false;
  document.documentElement.style.setProperty('--px', SCALE + 'px');
}
addEventListener('resize', resize); resize();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

/* ---------- input ---------- */
const K = {}, KP = {};
const M = { sx: VW / 2, sy: VH / 2, x: 0, y: 0, l: false, r: false, lp: false, rp: false, wheel: 0 };
function keyName(e) {
  const c = e.code || '';
  if (c.startsWith('Key')) return c.slice(3).toLowerCase();
  if (c.startsWith('Digit')) return c.slice(5);
  if (c.startsWith('Numpad') && c.length === 7) return c.slice(6);
  if (c === 'Space') return ' ';
  if (c.startsWith('Shift')) return 'shift';
  return (e.key || '').toLowerCase();
}
const inUI = e => e.target && e.target.closest && e.target.closest('.ui');
addEventListener('keydown', e => {
  if (e.target.type === 'text') return; // typing a nickname must not restart the run (R) or pause
  const k = keyName(e);
  if (!e.repeat) KP[k] = true;
  K[k] = true;
  if (k === ' ' || k === 'tab' || k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', e => { const k = keyName(e); K[k] = false; if (k === ' ') e.preventDefault(); });
addEventListener('mousedown', e => {
  if (inUI(e)) return;
  if (e.button === 0) { M.l = true; M.lp = true; }
  if (e.button === 2) { M.r = true; M.rp = true; }
});
addEventListener('mouseup', e => { if (e.button === 0) M.l = false; if (e.button === 2) M.r = false; });
addEventListener('mousemove', e => { M.sx = e.clientX / SCALE; M.sy = e.clientY / SCALE; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => { M.wheel += Math.sign(e.deltaY); }, { passive: true });
addEventListener('blur', () => { for (const k in K) K[k] = false; M.l = M.r = false; });
function flushInput() { for (const k in KP) delete KP[k]; M.lp = M.rp = false; M.wheel = 0; }

/* ---------- global game state ---------- */
const G = {
  state: 'title', t: 0, rt: 0, hero: 'knight', gl: {}, st: {}, syn: new Set(),
  freeze: 0, slowT: 0, slowS: 1, shake: 0, kx: 0, ky: 0, camX: 0, camY: 0, cx: 0, cy: 0,
  floor: 0, roomIdx: 0, room: null, shopSeen: false,
  enemies: [], bullets: [], fx: [], parts: [], nums: [], picks: [], timers: [], tele: [],
  boss: null, dark: 0, darkOn: false, tint: null, tintA: 0, flashInv: 0,
  gl: {}, syn: new Set(), coins: 0, atk: 0, kills: 0, rerolls: 0,
  stats: { kills: 0, rooms: 0, time: 0, combo: 0, dmg: 0 },
  trans: null, prompt: null, victory: 0,
};
let DT = 0;

function later(t, fn) { G.timers.push({ t, fn }); }
function updTimers(dt) {
  for (let i = G.timers.length - 1; i >= 0; i--) {
    const tm = G.timers[i];
    tm.t -= dt;
    if (tm.t <= 0) { G.timers.splice(i, 1); tm.fn(); }
  }
}
/* shake is max-based (repeated blasts never stack) and scaled by the player's setting (OFF / LOW / FULL) */
function shake(a) { const k = OPT.shake; if (k <= 0) return; G.shake = Math.min(0.8, Math.max(G.shake, a * k)); }
function kick(a, f) { const k = OPT.shake; G.kx += Math.cos(a) * f * k; G.ky += Math.sin(a) * f * k; }
/* minor freezes are rate-limited so chains of explosions or fast weapons don't stutter */
function hitstop(t) { if (t < 0.06 && G.rt - (G.lastStop || -9) < 0.25) return; G.lastStop = G.rt; G.freeze = Math.min(0.14, Math.max(G.freeze, t)); }
function slowmo(t, s) { if (G.slowT <= 0) G.slowS = s; else G.slowS = Math.min(G.slowS, s); G.slowT = Math.max(G.slowT, t); }
function invFlash(n = 2) { G.flashInv = Math.max(G.flashInv, n); }

/* ---------- pixel primitives ---------- */
const _cc = new Map();
function circSpr(r, col) {
  const k = r + '|' + col; let s = _cc.get(k); if (s) return s;
  if (_cc.size > 900) _cc.clear();
  const d = r * 2 + 1; s = mk(d, d); const c = s.getContext('2d'); c.fillStyle = col;
  for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y) + 0.35); c.fillRect(r - hw, y + r, hw * 2 + 1, 1); }
  _cc.set(k, s); return s;
}
function pcOn(c, x, y, r, col) {
  r = Math.round(r);
  if (r <= 0) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); return; }
  c.drawImage(circSpr(r, col), Math.round(x) - r, Math.round(y) - r);
}
const pc = (x, y, r, col) => pcOn(ctx, x, y, r, col);
const _sh = new Map();
function shadow(x, y, w) {
  w = Math.max(2, Math.round(w)); let s = _sh.get(w);
  if (!s) {
    const h = Math.max(1, Math.round(w * 0.42)); s = mk(w * 2 + 1, h * 2 + 1); const c = s.getContext('2d'); c.fillStyle = C.shadow;
    for (let yy = -h; yy <= h; yy++) { const hw = Math.floor(w * Math.sqrt(1 - (yy / (h + 0.5)) ** 2) + 0.3); c.fillRect(w - hw, yy + h, hw * 2 + 1, 1); }
    _sh.set(w, s);
  }
  ctx.drawImage(s, Math.round(x) - w, Math.round(y) - ((s.height - 1) >> 1));
}
// rings are cached per integer radius / colour / width: one drawImage instead of hundreds of fillRects
const _rc = new Map();
function pring(x, y, r, col, w = 1) {
  if (r < 0.5) return;
  r = Math.round(r);
  if (r > 64 || col[0] !== '#') { ctx.fillStyle = col; const n = Math.ceil(TAU * r / 1.1); for (let i = 0; i < n; i++) { const a = i / n * TAU; ctx.fillRect(Math.round(x + Math.cos(a) * r - w / 2), Math.round(y + Math.sin(a) * r - w / 2), w, w); } return; } // big rings cost too much memory as sprites; one-off hsl()/rgba() colours would never be reused
  const k = r + '|' + col + '|' + w; let s = _rc.get(k);
  if (!s) {
    if (_rc.size > 600) _rc.clear();
    const o = r + w + 1, d = o * 2 + 1; s = mk(d, d); const c = s.getContext('2d'); c.fillStyle = col; const n = Math.max(10, Math.ceil(TAU * r / 1.1));
    for (let i = 0; i < n; i++) { const a = i / n * TAU; c.fillRect(Math.round(o + Math.cos(a) * r - w / 2), Math.round(o + Math.sin(a) * r - w / 2), w, w); }
    _rc.set(k, s);
  }
  ctx.drawImage(s, Math.round(x) - (r + w + 1), Math.round(y) - (r + w + 1));
}
function parc(x, y, r, a0, a1, col, w = 1) {
  ctx.fillStyle = col; const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r / 1.1));
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; ctx.fillRect(Math.round(x + Math.cos(a) * r - w / 2), Math.round(y + Math.sin(a) * r - w / 2), w, w); }
}
function pline(x0, y0, x1, y1, col, w = 1, dash = 0, off = 0) {
  ctx.fillStyle = col; const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) {
    if (dash && (Math.floor((i + off) / dash) & 1)) continue;
    ctx.fillRect(Math.round(x0 + dx * i / n - w / 2), Math.round(y0 + dy * i / n - w / 2), w, w);
  }
}
function prect(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

/* ---------- sprites from strings ---------- */
const PAL = { '#': C.ink, 'w': C.white, 'g': C.lt, 'm': C.mid, 'd': C.dk, 'p': C.paper, 'r': C.red, 'R': C.redDk, 'y': C.gold, 'Y': C.goldDk, 'c': C.cyan, 'C': C.cyanDk, 'o': C.fire, 'f': C.frost, 'v': C.violet };
function spr(rows, pal = PAL) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const s = mk(w, h), c = s.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const p = pal[r[x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } } });
  return s;
}
function silh(s, col) {
  const o = mk(s.width, s.height), c = o.getContext('2d');
  c.drawImage(s, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, o.width, o.height);
  return o;
}
/* draw sprite rotated around (ox,oy) inside sprite, at world x,y */
function drawRot(s, x, y, a, ox, oy, flipY, sc = 1) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a);
  if (flipY) ctx.scale(sc, -sc); else if (sc !== 1) ctx.scale(sc, sc);
  ctx.drawImage(s, -ox, -oy); ctx.restore();
}

/* ---------- 3x5 bitmap font ---------- */
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111',
  '.': '000000000000010', ',': '000000000010100', '!': '010010010000010', '?': '110001010000010', ':': '000010000010000',
  '-': '000000111000000', '+': '000010111010000', '/': '001001010100100', '%': '101001010100101', '(': '010100100100010',
  ')': '010001001001010', "'": '010010000000000', '>': '100010001010100', '<': '001010100010001', '*': '000101010101000',
  '=': '000111000111000', '$': '011110010011110', '#': '101111101111101', '·': '000000010000000', '_': '000000000000111',
  '"': '101101000000000', '[': '110100100100110', ']': '011001001001011', '&': '010101010101011', '×': '000101010101000'
};
const txtW = (s, sc = 1) => Math.max(0, s.length * 4 * sc - sc);
const _tc = new Map();
function txtSpr(s, col, sc, ol) {
  const k = s + '|' + col + '|' + sc + '|' + ol; let o = _tc.get(k); if (o) return o;
  if (_tc.size > 700) _tc.clear();
  const pad = ol ? sc : 0; o = mk(txtW(s, sc) + pad * 2, 5 * sc + pad * 2); const c = o.getContext('2d');
  const pass = (color, grow) => {
    c.fillStyle = color;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let b = 0; b < 15; b++) if (g[b] === '1') {
        const px = pad + i * 4 * sc + (b % 3) * sc, py = pad + ((b / 3) | 0) * sc;
        if (grow) c.fillRect(px - sc, py - sc, sc * 3, sc * 3); else c.fillRect(px, py, sc, sc);
      }
    }
  };
  if (ol) pass(ol, true);
  pass(col, false);
  _tc.set(k, o); return o;
}
function ptext(s, x, y, col = C.ink, sc = 1, align = 'l', ol = null) {
  s = String(s).toUpperCase(); if (!s) return;
  const o = txtSpr(s, col, sc, ol);
  const dx = align === 'c' ? -o.width / 2 : align === 'r' ? -o.width : 0;
  ctx.drawImage(o, Math.round(x + dx), Math.round(y - (ol ? sc : 0)));
}

/* ---------- particles & floating numbers ---------- */
function part(x, y, vx, vy, life, col, size = 1, o) {
  if (G.parts.length > 1700) return;
  G.parts.push({
    x, y, vx, vy, life, max: life, col, size,
    drag: o && o.drag != null ? o.drag : 0.9, grav: (o && o.grav) || 0,
    z: (o && o.z) || 0, vz: (o && o.vz) || 0, arc: !!(o && o.vz), decal: (o && o.decal) || null, kind: (o && o.kind) || 0
  });
}
function burst(x, y, n, col, spd = 80, life = 0.4, size = 1, o) {
  for (let i = 0; i < n; i++) { const a = rand(TAU), s = rand(0.25, 1) * spd; part(x, y, Math.cos(a) * s, Math.sin(a) * s, life * rand(0.6, 1.25), col, size, o); }
}
function sparks(x, y, a, n, col, spd = 150, spread = 0.7) {
  for (let i = 0; i < n; i++) { const aa = a + rand(-spread, spread), s = rand(0.4, 1) * spd; part(x, y, Math.cos(aa) * s, Math.sin(aa) * s, rand(0.12, 0.28), col, 1, { kind: 1, drag: 0.86 }); }
}
function inkDrops(x, y, a, n, spread = 1.3, spd = 130, col = C.ink) {
  for (let i = 0; i < n; i++) {
    const aa = a + rand(-spread, spread), s = rand(0.25, 1) * spd;
    part(x, y, Math.cos(aa) * s, Math.sin(aa) * s, 3, col, randi(1, 2), { drag: 0.93, z: rand(2, 7), vz: rand(50, 140), decal: true });
  }
}
function ringFx(x, y, r0, r1, life, col, w = 1) { G.fx.push({ k: 'ring', x, y, r0, r1, t: 0, life, col, w }); }
function updParts(dt) {
  const ps = G.parts;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]; p.life -= dt;
    const dr = Math.pow(p.drag, dt * 60); p.vx *= dr; p.vy *= dr; p.vy += p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.arc) { p.z += p.vz * dt; p.vz -= 340 * dt; if (p.z <= 0) { if (p.decal && G.room) decalDot(p.x, p.y, p.size, p.col); p.life = 0; } }
    if (p.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); }
  }
}
function drawParts() {
  const x0 = G.camX - 16, y0 = G.camY - 16, x1 = G.camX + VW + 16, y1 = G.camY + VH + 16;
  for (const p of G.parts) {
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    const k = p.life / p.max;
    if (p.kind === 1) { pline(p.x, p.y, p.x - p.vx * 0.035, p.y - p.vy * 0.035, p.col, 1); continue; }
    if (p.kind === 2) { pring(p.x, p.y, p.size * (1 - k) + 1, p.col, 1); continue; }
    if (p.kind === 3) { pc(p.x, p.y, Math.max(0, p.size * k), p.col); continue; }
    const s = p.arc ? p.size : Math.max(1, Math.round(p.size * Math.sqrt(k) + 0.3));
    ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - p.z - s / 2), s, s);
  }
}
function num(x, y, v, crit, col) {
  if (G.nums.length > 70) G.nums.shift();
  G.nums.push({ x: x + rand(-4, 4), y, v: String(v), t: 0, crit, col: col || (crit ? C.gold : C.white) });
}
function updNums(dt) {
  for (let i = G.nums.length - 1; i >= 0; i--) { const n = G.nums[i]; n.t += dt; n.y -= (n.crit ? 30 : 22) * dt * Math.max(0, 1 - n.t * 1.4); if (n.t > 0.8) G.nums.splice(i, 1); }
}
function drawNums() {
  for (const n of G.nums) {
    if (n.t > 0.6 && ((n.t * 30) | 0) % 2) continue;
    const sc = n.crit ? (n.t < 0.07 ? 3 : 2) : (n.t < 0.05 ? 2 : 1);
    ptext(n.v + (n.crit ? '!' : ''), n.x, n.y - (sc - 1) * 3, n.col, sc, 'c', C.ink);
  }
}
