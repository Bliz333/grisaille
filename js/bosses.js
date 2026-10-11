'use strict';
/* GRISAILLE · bosses — multi-phase guardians scripted with generators */
let BDT = 0;
const PCOL = [C.red, C.cyan, C.gold];
function bossWalk(b, a, spd) { const h = moveBody(b, Math.cos(a) * spd * BDT, Math.sin(a) * spd * BDT); if (Math.abs(Math.cos(a)) > 0.2) b.face = Math.cos(a) > 0 ? 1 : -1; b.mv = true; return h; }
function bossFly(b, tx, ty, spd) { const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy); if (d > 3) { b.x += dx / d * Math.min(d, spd * BDT); b.y += dy / d * Math.min(d, spd * BDT); } clampRoom(b); return d; }
function eBlastAt(x, y, r) { if (d2(x, y, P.x, P.y) < (r + P.hurtR) ** 2) hurtPlayer(1, x, y); burst(x, y, 10, C.ink, 90, 0.4, 2); ringFx(x, y, 2, r, 0.22, C.ink, 2); splat(x, y, 3, 'rgba(18,18,22,0.3)'); AU.crate(); }
function eBeam(x, y, a, w = 7, col = C.red) {
  const f = { k: 'ebeam', x, y, a, w, col, t: 0, life: 99, len: 0, max: 700,
    u: f => {
      f.len = rayWall(f.x, f.y, f.a, f.max);
      const t = clamp((P.x - f.x) * Math.cos(f.a) + (P.y - f.y) * Math.sin(f.a), 0, f.len), px = f.x + Math.cos(f.a) * t, py = f.y + Math.sin(f.a) * t;
      if (d2(px, py, P.x, P.y) < (f.w / 2 + P.hurtR) ** 2) hurtPlayer(1, px, py);
      if (Math.random() < 0.6) sparks(f.x + Math.cos(f.a) * f.len, f.y + Math.sin(f.a) * f.len, f.a + Math.PI, 1, f.col, 110, 1.2);
    },
    d: f => { const ex = f.x + Math.cos(f.a) * f.len, ey = f.y + Math.sin(f.a) * f.len, fl = ((G.t * 30) | 0) % 2; pline(f.x, f.y, ex, ey, C.ink, f.w + 3 + fl); pline(f.x, f.y, ex, ey, f.col, f.w); pline(f.x, f.y, ex, ey, C.white, Math.max(1, f.w - 4)); }
  };
  f.emissive = true; G.fx.push(f); return f;
}
function drawRock(t, k) {
  pc(t.x, t.y, t.r * k, RED_A(0.2)); pring(t.x, t.y, t.r, k > 0.75 && ((G.t * 16) | 0) % 2 ? C.white : C.red, 1);
  if (k > 0.6) { const h = (1 - k) / 0.4 * 90; prect(t.x - 5, t.y - h - 10, 10, 9, C.ink); prect(t.x - 4, t.y - h - 9, 8, 3, C.dk); }
}
function drawBlade(t, k) {
  pc(t.x, t.y, t.r * k, RED_A(0.2)); pring(t.x, t.y, t.r, k > 0.75 && ((G.t * 16) | 0) % 2 ? C.white : C.red, 1);
  if (k > 0.55) { const h = (1 - k) / 0.45 * 110; pline(t.x, t.y - h - 22, t.x, t.y - h, C.ink, 5); pline(t.x, t.y - h - 21, t.x, t.y - h - 1, C.white, 3); }
}

/* ---------------- shared helpers ---------------- */
const bfan = (i, n, step) => (i - (n - 1) / 2) * step;           // angle offset of shot i in an n-way fan
const bk = b => b.phase > 1 ? b.BD.k2 : 1;                         // phase-2 tempo of the new guardians
function inA(x, y, m) { const A = arena(); return { x: clamp(x, A.x0 + m, A.x1 - m), y: clamp(y, A.y0 + m, A.y1 - m) }; }
function rayRect(x, y, a, m) { // distance along a to the arena rect shrunk by m
  const A = arena(), c = Math.cos(a), s = Math.sin(a); let t = 1e9;
  if (c > 1e-6) t = Math.min(t, (A.x1 - m - x) / c); else if (c < -1e-6) t = Math.min(t, (A.x0 + m - x) / c);
  if (s > 1e-6) t = Math.min(t, (A.y1 - m - y) / s); else if (s < -1e-6) t = Math.min(t, (A.y0 + m - y) / s);
  return Math.max(0, t);
}
const minions = () => G.enemies.reduce((n, e) => n + (!e.dead && !e.boss && !e.seg ? 1 : 0), 0);
// a telegraph that fires fn when it runs out; clearing G.tele (phase change / death) cancels the hit with it
function tDo(o, fn) { return tele(Object.assign(o, { u: t => { if (!t.done && t.t >= t.life) { t.done = true; fn(t); } } })); }
function clearBossHaz(b) { // a mini-boss shares its room with other foes: it only drops the telegraphs and hazards it made (tagged .bo in updBoss)
  G.bullets = G.bullets.filter(x => x.team !== 'e');
  if (b && b.mini) { for (let i = G.tele.length - 1; i >= 0; i--) if (G.tele[i].bo === b) G.tele.splice(i, 1); G.fx.forEach(f => { if (f.bo === b) f.dead = true; }); }
  else { G.tele.length = 0; G.fx.forEach(f => { if (f.k === 'ebeam' || f.bfx) f.dead = true; }); }
}
// a wall of bullets that enters from one arena edge and crosses it; gaps = [{ c: offset along the edge, w: half width }]
function edgeWall(side, gaps, spd, o = {}, step = 11) {
  const A = arena(), across = side === 'T' || side === 'B', len = across ? A.w : A.h, out = [];
  const a = side === 'L' ? 0 : side === 'R' ? Math.PI : side === 'T' ? Math.PI / 2 : -Math.PI / 2, life = (across ? A.h : A.w) / spd + 0.6;
  for (let s = step / 2; s < len; s += step) {
    if (gaps.some(g => Math.abs(s - g.c) < g.w)) continue;
    const x = across ? A.x0 + s : side === 'L' ? A.x0 + 4 : A.x1 - 4, y = across ? (side === 'T' ? A.y0 + 4 : A.y1 - 4) : A.y0 + s;
    out.push(eShot(x, y, a, spd, Object.assign({ life }, o)));
  }
  return out;
}
function drawGapTele(t, k, blink) { // dashed edge strip that leaves the safe gaps blank
  const col = k > 0.7 && blink ? C.white : C.red;
  for (let s = 0; s < t.len; s += 6) { if (t.gaps.some(g => Math.abs(s + 2 - g.c) < g.w)) continue; if (t.v) prect(t.x - 1, t.y + s, 2, 4, col); else prect(t.x + s, t.y - 1, 4, 2, col); }
}
function oval(x, y, rx, ry, col) { for (let yy = -ry; yy <= ry; yy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / (ry + 0.5)) ** 2))); prect(x - hw, y + yy, hw * 2 + 1, 1, col); } }
function chainLn(x0, y0, x1, y1) { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3)); for (let i = 0; i <= n; i++) prect(lerp(x0, x1, i / n) - 1, lerp(y0, y1, i / n) - 1, 2, 2, i % 2 ? C.lt : C.dk); }

/* ---------------- THE WARDEN ---------------- */
function* wRend(b) {
  const n = b.phase === 1 ? 1 : 3;
  for (let i = 0; i < n; i++) {
    let t = 0; b.la = angTo(b, P);
    const tl = tele({ k: 'line', x: b.x, y: b.y, a: b.la, w: b.r * 2, life: 9 }); AU.tele();
    const wind = i === 0 ? 0.8 : 0.55;
    b.pose = 'wind';
    while (t < wind) { t += BDT; if (t < wind - 0.25) b.la = angTo(b, P); tl.x = b.x; tl.y = b.y; tl.a = b.la; b.sq = -0.25; yield 0; }
    tl.dead = true; b.pose = 'charge'; AU.dash();
    t = 0; let hw = false;
    while (t < 1.3) { t += BDT; if (bossWalk(b, b.la, 430)) { hw = true; break; } if (Math.random() < 0.8) part(b.x + rand(-8, 8), b.y + b.r, rand(-30, 30), rand(-30, 0), 0.5, C.lt, 2); yield 0; }
    b.pose = '';
    if (hw) {
      shake(0.15); AU.boom(1.4);
      burst(b.x + Math.cos(b.la) * b.r, b.y + Math.sin(b.la) * b.r, 20, C.ink, 140, 0.5, 2);
      blastTiles(b.x + Math.cos(b.la) * (b.r + 8), b.y + Math.sin(b.la) * (b.r + 8), 18, 99);
      for (let k = 0; k < (b.phase === 1 ? 7 : 10); k++) {
        const p = k < 2 ? { x: P.x + rand(-12, 12), y: P.y + rand(-12, 12) } : randFloor(), d = rand(0.75, 1.35);
        tDo({ k: 'circle', x: p.x, y: p.y, r: 13, life: d, d: drawRock }, () => eBlastAt(p.x, p.y, 13));
      }
      b.stun = b.phase === 1 ? 1.4 : (i === n - 1 ? 1.1 : 0.3); b.pose = 'stun'; yield b.stun; b.pose = '';
    } else yield 0.3;
  }
}
function* wSweep(b) {
  let t = 0;
  while (t < 1.2 && dist(b, P) > 46) { t += BDT; bossWalk(b, angTo(b, P), 100); yield 0; }
  for (let r = 0; r < (b.phase === 1 ? 1 : 2); r++) {
    const a = angTo(b, P), arc = 2.5, rad = 64;
    tele({ k: 'arc', x: b.x, y: b.y, a, arc, r: rad, life: 0.58 }); AU.tele(); b.pose = 'raise'; b.sa = a;
    yield 0.58;
    b.pose = 'slash'; b.sa = a;
    G.fx.push({ k: 'bslash', x: b.x, y: b.y, a, arc, r: rad, t: 0, life: 0.22, dir: r % 2 ? -1 : 1, fin: true, col: C.white, d: drawSwing });
    AU.swing(0.55); AU.slash(); shake(0.15);
    if (dist(b, P) < rad + P.hurtR && Math.abs(angDiff(a, angTo(b, P))) < arc / 2) hurtPlayer(1, b.x, b.y);
    const nw = b.phase === 1 ? 5 : 7;
    for (let k = 0; k < nw; k++) eShot(b.x, b.y, a + bfan(k, nw, 0.2), 130, { r: 4 });
    yield 0.42;
  }
  b.pose = ''; yield 0.45;
}
function* wBell(b) {
  b.pose = 'raise'; AU.tele(); yield 0.5;
  const rings = b.phase === 1 ? 3 : 4, n = b.phase === 1 ? 16 : 20;
  for (let i = 0; i < rings; i++) { ring(b.x, b.y - 6, n, 72 + i * 6, i * (TAU / n / 2), { r: 3 }); AU.eshot(); b.sq = 0.4; ringFx(b.x, b.y - 6, 4, 30, 0.3, C.red, 1); yield 0.45; }
  if (b.phase > 1) { let s = rand(TAU); for (let t = 0; t < 1.6; t += 0.07) { eShot(b.x, b.y - 6, s, 92, { r: 2.5 }); eShot(b.x, b.y - 6, s + Math.PI, 92, { r: 2.5 }); s += 0.25; if (((t * 100) | 0) % 3 === 0) AU.eshot(); yield 0.07; } }
  b.pose = ''; yield 0.6;
}
function* wSwords(b) {
  b.pose = 'raise'; AU.roar(1.4); yield 0.45;
  for (let i = 0; i < 10; i++) {
    const px = P.x + P.vx * 0.45, py = P.y + P.vy * 0.45;
    tDo({ k: 'circle', x: px, y: py, r: 14, life: 0.72, d: drawBlade }, () => { eBlastAt(px, py, 14); ring(px, py, 6, 55, rand(TAU), { r: 2.5 }); });
    yield 0.22;
  }
  b.pose = ''; yield 0.9;
}
function* wSummon(b) {
  b.pose = 'raise'; AU.roar(1.2);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4, x = b.x + Math.cos(a) * 44, y = b.y + Math.sin(a) * 44; if (!hitsWall(x, y, 6)) spawnEnemy(i % 2 ? 'inkling' : 'bomber', x, y, false, 0.8); }
  yield 1.0; b.pose = '';
}
wSummon.cap = 3;
function drawWarden(b) {
  const x = Math.round(b.x), y = Math.round(b.y), fl = b.flash > 0, sq = b.sq || 0;
  shadow(x, y + b.r, b.r + 3);
  const bw = Math.round(26 * (1 + sq * 0.2)), bh = Math.round(24 * (1 - sq * 0.2)), x0 = x - (bw >> 1), y0 = y + b.r - bh;
  const capeW = Math.sin(b.anim * 3) * 2;
  rrect(x0 + 2 - b.face * 3 + capeW, y0 + 6, bw - 4, bh - 2, C.dk);
  rrect(x0 - 1, y0 - 1, bw + 2, bh + 2, fl ? C.ink : C.white); rrect(x0, y0, bw, bh, fl ? C.white : C.ink);
  rrect(x0 - 4, y0 + 3, 8, 7, fl ? C.ink : C.dk); rrect(x0 + bw - 4, y0 + 3, 8, 7, fl ? C.ink : C.dk);
  rrect(x - 7, y0 - 9, 14, 11, fl ? C.ink : C.white); rrect(x - 6, y0 - 8, 12, 9, fl ? C.white : '#e8e7e0');
  prect(x - 6, y0 - 5, 12, 2, C.ink); prect(x - 1, y0 - 5, 2, 6, C.ink);
  const eye = b.phase > 1 ? C.red : (b.pose === 'wind' ? C.red : C.cyanDk);
  prect(x - 4 + b.face * 2, y0 - 5, 2, 1, eye); prect(x + 2 + b.face * 2, y0 - 5, 2, 1, eye);
  if (b.phase > 1) for (let i = 0; i < 2; i++) prect(x + rand(-6, 6), y0 - 10 - rand(0, 4), 1, 1, C.red);
  // the jailer's belt: a ring of keys and a shackle chain dragging on the floor
  const kx = x - b.face * 7, ky = y0 + 15, sw = Math.round(Math.sin(b.anim * 3) * 2);
  prect(x0 + 1, ky - 1, bw - 2, 1, C.mid);
  chainLn(kx, ky, kx - b.face * 5 + sw, y + b.r - 1); prect(kx - b.face * 5 + sw - 2, y + b.r - 2, 4, 2, C.lt);
  pring(kx + b.face * 4, ky + 2, 2, C.gold, 1); prect(kx + b.face * 4 - 1, ky + 4, 1, 3, C.gold); prect(kx + b.face * 4 + 1, ky + 4, 1, 2, C.goldDk);
  // the great sword
  let a = b.face > 0 ? 1.1 : Math.PI - 1.1;
  if (b.pose === 'raise') a = -Math.PI / 2 + b.face * 0.3; else if (b.pose === 'slash') a = b.sa + 0.9; else if (b.pose === 'charge' || b.pose === 'wind') a = b.la; else if (b.pose === 'stun') a = Math.PI / 2 + 0.4;
  const hx = x + b.face * 10, hy = y0 + 12, L = 30;
  pline(hx, hy, hx + Math.cos(a) * L, hy + Math.sin(a) * L, C.ink, 6); pline(hx, hy, hx + Math.cos(a) * (L - 1), hy + Math.sin(a) * (L - 1), fl ? C.ink : C.white, 3);
  pline(hx - Math.sin(a) * 5, hy + Math.cos(a) * 5, hx + Math.sin(a) * 5, hy - Math.cos(a) * 5, C.ink, 3);
  if (b.pose === 'stun') for (let i = 0; i < 4; i++) { const s = G.t * 4 + i * TAU / 4; prect(x + Math.cos(s) * 14, y0 - 14 + Math.sin(s) * 3, 2, 2, C.gold); }
}

/* ---------------- THE WEEPING EYE ---------------- */
function* eGaze(b) {
  const n = b.phase === 1 ? 1 : 2, dir = Math.random() < 0.5 ? 1 : -1, a0 = angTo(b, P) - 0.8 * dir;
  for (let i = 0; i < n; i++) tele({ k: 'laser', x: b.x, y: b.y, a: a0 + i * Math.PI, life: 0.85 });
  b.pose = 'charge'; AU.tele(); yield 0.85;
  AU.laser(1.6); const bms = []; for (let i = 0; i < n; i++) bms.push(eBeam(b.x, b.y, a0 + i * Math.PI, 7));
  let t = 0; const dur = 1.6;
  while (t < dur) { t += BDT; bms.forEach((bm, i) => { bm.a = a0 + 1.6 * dir * (t / dur) + i * Math.PI; bm.x = b.x; bm.y = b.y; }); yield 0; }
  bms.forEach(bm => bm.dead = true); b.pose = ''; yield 0.5;
}
function* eWeep(b) {
  b.pose = 'cry';
  for (let i = 0; i < (b.phase === 1 ? 22 : 32); i++) { eShot(b.x + rand(-8, 8), b.y + 8, -Math.PI / 2 + rand(-1.3, 1.3), rand(60, 130), { grav: 85, r: 3, life: 5 }); if (i % 3 === 0) AU.eshot(); yield 0.06; }
  b.pose = ''; yield 0.7;
}
function* eBloom(b) {
  let s = rand(TAU); const arms = b.phase === 1 ? 5 : 6;
  for (let t = 0; t < 2.4; t += 0.09) { for (let k = 0; k < arms; k++) eShot(b.x, b.y, s + k * TAU / arms, 80, { r: 2.5 }); if (b.phase > 1 && ((t * 100) | 0) % 2) for (let k = 0; k < 3; k++) eShot(b.x, b.y, -s * 1.3 + k * TAU / 3, 60, { r: 3 }); s += 0.16; AU.eshot(); yield 0.09; }
  yield 0.6;
}
function* eBlink(b) {
  for (let t = 0; t < 0.3; t += BDT) { b.lid = t / 0.3; yield 0; }
  const p = randFloor(110); tele({ k: 'circle', x: p.x, y: p.y, r: 22, life: 0.6 }); b.hide = true; b.inv = true; yield 0.6;
  b.x = p.x; b.y = p.y; b.hide = false; b.inv = false; inkDrops(b.x, b.y, 0, 20, Math.PI, 130);
  ring(b.x, b.y, b.phase === 1 ? 18 : 26, 85, rand(TAU), { r: 3 }); AU.boom(0.8); shake(0.15);
  for (let t = 0; t < 0.3; t += BDT) { b.lid = 1 - t / 0.3; yield 0; }
  b.lid = 0; yield 0.5;
}
function* eLighthouse(b) {
  const n = 3, a0 = rand(TAU), dir = Math.random() < 0.5 ? 1 : -1;
  for (let i = 0; i < n; i++) tele({ k: 'laser', x: b.x, y: b.y, a: a0 + i * TAU / n, life: 1.0 });
  b.pose = 'charge'; AU.tele(); yield 1.0;
  AU.laser(4.2); const bms = []; for (let i = 0; i < n; i++) bms.push(eBeam(b.x, b.y, a0 + i * TAU / n, 6));
  let t = 0, sh = 0;
  while (t < 4) { t += BDT; sh -= BDT; bms.forEach((bm, i) => { bm.a = a0 + i * TAU / n + dir * t * 0.72; bm.x = b.x; bm.y = b.y; }); if (sh <= 0) { sh = 0.8; eShot(b.x, b.y, angTo(b, P), 95, { r: 3 }); AU.eshot(); } yield 0; }
  bms.forEach(bm => bm.dead = true); b.pose = ''; yield 0.6;
}
function* eTears(b) { b.pose = 'cry'; AU.roar(1.6); for (let i = 0; i < 3; i++) { const p = randFloor(70); spawnEnemy('inkling', p.x, p.y, false, 0.8); } yield 1.0; b.pose = ''; }
eTears.cap = 3;
function drawEye(b) {
  if (b.hide) return;
  const fy = Math.sin(b.anim * 2) * 3, x = Math.round(b.x), y = Math.round(b.y + fy), r = b.r, fl = b.flash > 0;
  const a = angTo(b, P), red = b.phase > 1 || b.pose === 'charge';
  shadow(b.x, b.y + r + 10, r);
  for (let i = 0; i < 6; i++) { let px = x - 12 + i * 5, py = y + r - 4; for (let s = 0; s < 6; s++) { const nx = px + Math.sin(b.anim * 3 + i + s * 0.8) * 2, ny = py + 3; pline(px, py, nx, ny, C.ink, s < 3 ? 2 : 1); px = nx; py = ny; } }
  for (let i = 0; i < 5; i++) { // the beholder's eyestalks, each one watching you too
    const ba = -Math.PI / 2 + (i - 2) * 0.5, sw = Math.sin(b.anim * 2.4 + i * 1.3) * 0.25, L = i === 2 ? 13 : 10;
    const bx = x + Math.cos(ba) * (r - 3), by = y + Math.sin(ba) * (r - 3), mx = x + Math.cos(ba + sw) * (r + L * 0.5), my = y + Math.sin(ba + sw) * (r + L * 0.5), tx = x + Math.cos(ba - sw) * (r + L), ty = y + Math.sin(ba - sw) * (r + L);
    pline(bx, by, mx, my, C.ink, 3); pline(mx, my, tx, ty, C.ink, 3); pline(bx, by, mx, my, fl ? C.ink : C.mid, 1); pline(mx, my, tx, ty, fl ? C.ink : C.mid, 1);
    pc(tx, ty, 3, C.ink); pc(tx, ty, 2, fl ? C.ink : C.white);
    if (b.lid > 0.5) prect(tx - 2, ty, 5, 1, C.ink); else prect(tx - 1 + Math.round(Math.cos(a)), ty - 1 + Math.round(Math.sin(a)), 2, 2, red ? C.red : C.ink);
  }
  pc(x, y, r + 2, fl ? C.white : C.ink); pc(x, y, r, fl ? C.ink : C.white); pc(x, y + 3, r - 3, fl ? C.ink : '#e3e2db');
  const dd = Math.min(5, dist(b, P) / 20), ix = x + Math.cos(a) * dd, iy = y + Math.sin(a) * dd;
  pc(ix, iy, 8, red ? C.red : C.dk); pc(ix, iy, 6, red ? C.redDk : C.mid); pc(ix, iy, 3 + (b.pose === 'charge' ? 1 : 0), C.ink); prect(ix - 3, iy - 3, 2, 2, C.white);
  if (b.lid > 0) { const lh = Math.round((r * 2 + 2) * b.lid); for (let yy = 0; yy < lh; yy++) { const ry = y - r - 1 + yy, hw = Math.floor(Math.sqrt(Math.max(0, (r + 2) ** 2 - (ry - y) ** 2))); prect(x - hw, ry, hw * 2 + 1, 1, C.ink); } }
  if (b.pose === 'cry' && Math.random() < 0.5) part(x + rand(-6, 6), y + r - 2, 0, 30, 0.6, C.redDk, 2, { drag: 1, z: 0 }); // tears of blood
}

/* ---------------- CHROMATIC, thief of color ---------------- */
const pcol = b => PCOL[b.phase - 1];
function* pRefract(b) {
  const n = 2 + b.phase;
  for (let i = 0; i < n; i++) { eShot(b.x, b.y, angTo(b, P) + bfan(i, n, 0.42), 100, { r: 5, big: true, col: pcol(b), split: { t: 0.75, n: 8, spd: 85 } }); AU.eshot(); yield 0.28; }
  yield 0.7;
}
function* pWalls(b) {
  const A = arena(), horiz = Math.random() < 0.5, count = 2 + b.phase, gw = b.phase === 3 ? 0.06 : 0.075;
  for (let w = 0; w < count; w++) {
    const gap = rand(0.2, 0.8);
    if (horiz) edgeWall('T', [{ c: gap * A.w, w: gw * A.w }], 62, { r: 3, col: pcol(b) });
    else edgeWall('L', [{ c: gap * A.h, w: gw * 1.4 * A.h }], 62, { r: 3, col: pcol(b) });
    AU.eshot(); AU.tele(); yield 1.15;
  }
  yield 0.4;
}
function* pBlink(b) {
  for (let i = 0; i < 3; i++) {
    const p = inA(P.x + rand(-80, 80), P.y + rand(-60, 60), T);
    tele({ k: 'diamond', x: p.x, y: p.y, r: 12, life: 0.55 }); yield 0.55;
    const ox = b.x, oy = b.y; b.x = p.x; b.y = p.y;
    G.fx.push({ k: 'trail', t: 0, life: 0.25, d: (f, k) => pline(ox, oy, p.x, p.y, k < 0.5 ? pcol(b) : C.lt, Math.max(1, Math.round(4 * (1 - k)))) });
    ring(b.x, b.y, 12 + b.phase * 2, 95, rand(TAU), { r: 3, col: pcol(b) }); eShot(b.x, b.y, angTo(b, P), 150, { r: 3, col: pcol(b) });
    AU.boom(0.7); yield 0.38;
  }
  yield 0.5;
}
function* pBeams(b) {
  const n = b.phase === 2 ? 3 : 4, a0 = rand(TAU), dir = Math.random() < 0.5 ? 1 : -1;
  for (let i = 0; i < n; i++) tele({ k: 'laser', x: b.x, y: b.y, a: a0 + i * TAU / n, life: 1.0 });
  AU.tele(); yield 1.0; AU.laser(3.2);
  const bms = []; for (let i = 0; i < n; i++) bms.push(eBeam(b.x, b.y, a0 + i * TAU / n, 6, pcol(b)));
  let t = 0; while (t < 3.2) { t += BDT; bms.forEach((bm, i) => { bm.a = a0 + i * TAU / n + dir * t * 0.8; bm.x = b.x; bm.y = b.y; }); yield 0; }
  bms.forEach(bm => bm.dead = true); yield 0.5;
}
function* pGrid(b) {
  const A = arena(), nw = Math.round(A.w / T), nh = Math.round(A.h / T);
  for (let rep = 0; rep < 2; rep++) {
    const lines = [];
    for (let i = 0; i < 3; i++) lines.push({ x: A.x0 + 2, y: A.y0 + (randi(1, nh - 2) + 0.5) * T, a: 0 });
    for (let i = 0; i < 3; i++) lines.push({ x: A.x0 + (randi(1, nw - 2) + 0.5) * T, y: A.y0 + 2, a: Math.PI / 2 });
    lines.forEach(l => tele({ k: 'laser', x: l.x, y: l.y, a: l.a, life: 0.95 }));
    AU.tele(); yield 0.95;
    const bms = lines.map(l => eBeam(l.x, l.y, l.a, 6, pcol(b))); AU.laser(0.4); shake(0.15);
    yield 0.38; bms.forEach(bm => bm.dead = true); yield 0.37;
  }
  yield 0.3;
}
function* pMirror(b) {
  AU.roar(2);
  for (let i = 0; i < 2; i++) { const a = rand(TAU), x = b.x + Math.cos(a) * 60, y = b.y + Math.sin(a) * 40; const e = spawnEnemy('decoy', x, y, false, 0.5); e.col = pcol(b); }
  yield 1.2;
}
function* pSpectrum(b) {
  let s = 0;
  for (let t = 0; t < 3.6; t += 0.06) { for (let k = 0; k < 3; k++) eShot(b.x, b.y, s + k * TAU / 3, 90, { r: 3, col: hue(s * 60 + k * 120) }); s += 0.13 + 0.06 * Math.sin(t * 2); if (((t * 100) | 0) % 2) AU.eshot(); yield 0.06; }
  yield 0.5;
}
EDEF.decoy = {
  name: 'DECOY', zh: '幻影', r: 7, hp: 45, spd: 40, mass: 1, cost: 0, flying: true,
  ai(e, dt) { e.cd -= dt; const a = angTo(e, P) + Math.PI / 2; e.x += Math.cos(a) * 40 * dt; e.y += Math.sin(a) * 40 * dt; clampRoom(e); if (e.cd <= 0) { e.cd = 1.0; eShot(e.x, e.y, angTo(e, P), 120, { r: 3, col: e.col }); AU.eshot(); } },
  draw(e) { const y = e.y + Math.sin(e.anim * 3) * 2; shadow(e.x, e.y + 12, 6); if (e.mk) drawMiniMask(e.x, y - 3, e.flash > 0); else diamond(e.x, y, 8, 12, e.flash > 0 ? C.white : C.dk, e.col || C.red, false); }
};
function diamond(x, y, w, h, fill, edge, core) {
  x = Math.round(x); y = Math.round(y);
  for (let yy = -h; yy <= h; yy++) { const hw = Math.round(w * (1 - Math.abs(yy) / h)); prect(x - hw - 1, y + yy, hw * 2 + 3, 1, C.ink); }
  for (let yy = -h + 1; yy <= h - 1; yy++) { const hw = Math.round(w * (1 - Math.abs(yy) / h)) - 1; if (hw >= 0) prect(x - hw, y + yy, hw * 2 + 1, 1, fill); }
  pline(x, y - h + 2, x, y + h - 2, edge, 1); pline(x - w + 2, y, x + w - 2, y, edge, 1);
  if (core) pc(x, y, 2, C.white);
}
function drawPrism(b) {
  const fy = Math.sin(b.anim * 2.5) * 3, x = b.x, y = b.y - 6 + fy, fl = b.flash > 0;
  shadow(b.x, b.y + 14, 10);
  const col = b.phase === 3 ? hue(G.t * 200) : pcol(b);
  for (let i = 0; i < 4; i++) { const a = b.anim * 1.2 + i * TAU / 4; pline(x, y, x + Math.cos(a) * 26, y + Math.sin(a) * 26 * 0.6, i % 2 ? col : C.lt, 1, 3, G.t * 20); }
  diamond(x, y, 13, 19, fl ? C.ink : C.white, col, true);
  diamond(x, y, 6, 9, fl ? C.white : col, C.white, false);
  if (b.stun > 0) for (let i = 0; i < 3; i++) prect(x + rand(-12, 12), y + rand(-16, 16), 1, 1, col);
}

/* ---------------- THE FORBIDDEN GRIMOIRE ---------------- */
function* tPages(b) {
  const A = arena(), k = bk(b), side = pick(['L', 'R', 'T', 'B']), across = side === 'T' || side === 'B', len = across ? A.w : A.h;
  const ex = side === 'R' ? A.x1 - 3 : A.x0 + 3, ey = side === 'B' ? A.y1 - 3 : A.y0 + 3;
  b.openT = 1; AU.tele();
  tele({ k: 'line', x: across ? A.x0 : ex, y: across ? ey : A.y0, a: across ? 0 : Math.PI / 2, len, w: 6, life: 0.65 });
  yield 0.65;
  let g = rand(40, len - 40);
  for (let i = 0; i < 4; i++) {
    edgeWall(side, [{ c: g, w: 17 }], 62 * k, { r: 3 }).forEach(s => { s.draw = drawPage; });
    AU.eshot(); AU.swing(1.6); b.flip = 0.25;
    g = clamp(g + rand(-60, 60) / k, 40, len - 40);
    yield 0.9 / k;
  }
  b.openT = 0; yield 0.5;
}
function* tLetters(b) {
  b.openT = 1; AU.roar(1.5);
  for (let i = 0; i < 14; i++) part(b.x + rand(-14, 14), b.y - 6 + rand(-8, 8), rand(-60, 60), rand(-80, -20), 0.7, pick([C.white, C.paper]), 2, { drag: 0.9 });
  yield 0.5;
  const kinds = ['moth', 'moth', 'moth', 'scribe'].slice(0, Math.max(0, 6 - minions()));
  kinds.forEach((t, i) => {
    const a = i / kinds.length * TAU + rand(0.6), p = inA(b.x + Math.cos(a) * 40, b.y + Math.sin(a) * 30, T);
    if (!hitsWall(p.x, p.y, 6)) spawnEnemy(t, p.x, p.y, false, 0.8);
  });
  yield 1.0; b.openT = 0; yield 0.3;
}
tLetters.cap = 3;
function* tSlam(b) {
  const k = bk(b);
  b.openT = 1; AU.tele();
  for (let t = 0; t < 0.35; t += BDT) { b.z = 12 * t / 0.35; yield 0; }
  b.z = 12;
  for (let t = 0; t < 1.1 && dist(b, P) > 6; t += BDT) { bossFly(b, P.x, P.y, 150 * k); yield 0; }
  const x = b.x, y = b.y, life = 0.7 / Math.sqrt(k);
  tele({ k: 'circle', x, y, r: 64, life }); AU.tele();
  for (let t = 0; t < life; t += BDT) { b.z = 12 + 10 * t / life; yield 0; }
  b.z = 0; b.open = 0; b.openT = 0;
  eBlastAt(x, y, 64); ring(x, y, 24, 80 * k, rand(TAU), { r: 3 }); shake(0.15); AU.boom(1.3);
  for (let i = 0; i < 18; i++) { const a = rand(TAU); part(x + Math.cos(a) * 20, y + Math.sin(a) * 12, Math.cos(a) * rand(60, 160), Math.sin(a) * rand(40, 100), 0.6, pick([C.white, C.paper, C.ink]), 2, { drag: 0.88 }); }
  yield 0.8 / k;
}
function* tRibbons(b) {
  const k = bk(b), dir = Math.random() < 0.5 ? 1 : -1, oy = b.y + 2;
  const base = Math.atan2(P.y - oy, P.x - b.x) - dir * 0.4, angs = [-1, 0, 1].map(i => base + i * 0.55), tw = 0.8 / Math.sqrt(k), dur = 1.4 / k;
  b.openT = 1; AU.tele();
  angs.forEach(a => tele({ k: 'laser', x: b.x, y: oy, a, life: tw }));
  yield tw;
  AU.laser(dur);
  const bms = angs.map(a => eBeam(b.x, oy, a, 5));
  for (let t = 0; t < dur; t += BDT) { bms.forEach((bm, i) => { bm.a = angs[i] + dir * 0.8 * t / dur; bm.x = b.x; bm.y = b.y + 2; }); yield 0; }
  bms.forEach(bm => { bm.dead = true; }); b.openT = 0; yield 0.5;
}
function* tBats(b) { // torn pages fold into paper bats that home in on you
  const k = bk(b);
  b.openT = 1; b.tear = 0.6; AU.tele(); AU.swing(0.7); yield 0.55;
  for (let w = 0; w < 2; w++) {
    const a0 = angTo(b, P);
    for (let i = 0; i < 6; i++) { const s = eShot(b.x, b.y - 6, a0 + bfan(i, 6, 0.55), 72 * k, { r: 3, turn: 1.6, life: 4 }); s.draw = drawBat; }
    AU.eshot(); AU.swing(1.3); burst(b.x, b.y - 6, 8, C.white, 90, 0.4, 2); b.tear = 0.4;
    yield 0.9 / k;
  }
  b.openT = 0; yield 0.5;
}
function drawPage(s) {
  const x = Math.round(s.x), y = Math.round(s.y), w = 1 + Math.round(Math.abs(Math.sin(s.t * 9 + s.x * 0.1 + s.y * 0.1)) * 2);
  prect(x - w - 2, y - 4, w * 2 + 4, 9, C.ink); prect(x - w - 1, y - 3, w * 2 + 2, 7, C.red); prect(x - w, y - 2, w * 2, 5, C.white);
}
function drawBat(s) {
  const a = Math.atan2(s.vy, s.vx), c = Math.cos(a), n = Math.sin(a), x = s.x, y = s.y, fl = Math.sin(s.t * 18), sp = 5 + fl * 1.5, bkk = 1 + fl * 1.5;
  for (const sd of [-1, 1]) { // a wing: leading edge out to the tip, scalloped trailing edge back to the body
    const tx = x - n * sd * sp - c * bkk, ty = y + c * sd * sp - n * bkk, mx = x - n * sd * sp * 0.5 - c * 3, my = y + c * sd * sp * 0.5 - n * 3;
    pline(x, y, tx, ty, C.ink, 3); pline(tx, ty, mx, my, C.ink, 2); pline(x, y, tx, ty, C.white, 1); pline(tx, ty, mx, my, C.lt, 1);
  }
  pc(x, y, 2, C.ink); prect(x + c * 1.5 - n, y + n * 1.5 + c, 1, 1, C.red); prect(x + c * 1.5 + n, y + n * 1.5 - c, 1, 1, C.red);
}
function tomePost(b, dt) { b.open = lerp(b.open || 0, b.openT || 0, Math.min(1, dt * 12)); b.flip = Math.max(0, (b.flip || 0) - dt); b.tear = Math.max(0, (b.tear || 0) - dt); }
function drawTome(b) {
  const z = b.z || 0, o = b.open || 0, fl = b.flash > 0, jit = b.tear > 0 ? randi(-1, 1) : 0;
  const x = Math.round(b.x) + jit, y = Math.round(b.y - 6 - z + Math.sin(b.anim * 2.2) * 2), H = 26, sw = 8, hw = Math.round(lerp(3, 18, o)), top = y - H / 2;
  const O = fl ? C.ink : C.white, F = fl ? C.white : C.ink;
  shadow(b.x, b.y + 13, Math.max(6, 14 - z * 0.3));
  for (const sd of [-1, 1]) chainLn(x + sd * (sw / 2 + hw - 2), top + H - 2, b.x + sd * 12 + Math.sin(b.anim * 2 + sd) * 3, b.y + 12); // tethers to the floor
  // the red bookmark
  let rx = x, ry = top + H + 1; const RL = b.phase > 1 ? 18 : 13;
  for (let i = 1; i <= 6; i++) { const nx = x + Math.sin(b.anim * (b.phase > 1 ? 7 : 4) + i * 0.7) * i * 0.6, ny = top + H + 1 + i * RL / 6; pline(rx, ry, nx, ny, C.red, 2); rx = nx; ry = ny; }
  prect(rx - 2, ry, 1, 2, C.red); prect(rx + 1, ry, 1, 2, C.red);
  // covers and pages
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? x - sw / 2 - hw : x + sw / 2;
    rrect(x0 - 1, top - 1, hw + 2, H + 2, O); rrect(x0, top, hw, H, F);
    if (hw > 4) { const cx = sd < 0 ? x0 : x0 + hw - 2; prect(cx, top, 2, 2, C.lt); prect(cx, top + H - 2, 2, 2, C.lt); } // iron corner caps
    if (hw > 6) {
      const px = sd < 0 ? x0 + 2 : x0, pw = hw - 2;
      prect(px, top + 2, pw, H - 4, O);
      if (!fl) for (let ly = top + 5; ly < top + H - 4; ly += 3) prect(px + 2, ly, Math.max(1, pw - 4 - (ly % 3)), 1, C.lt);
    }
  }
  if (o > 0.6) { // a page in mid-flip
    const ph = b.flip > 0 ? (1 - b.flip / 0.25) * Math.PI : (b.anim * 2.5) % Math.PI, px = x + Math.cos(ph) * (sw / 2 + hw - 3), lift = Math.round(Math.sin(ph) * 3);
    prect(px - 2, top + 2 - lift, 4, H - 4, C.ink); prect(px - 1, top + 3 - lift, 2, H - 6, C.white);
  }
  // spine with its single eye
  rrect(x - sw / 2 - 1, top - 3, sw + 2, H + 6, O); rrect(x - sw / 2, top - 2, sw, H + 4, F);
  prect(x - sw / 2 + 1, top + 1, sw - 2, 1, C.mid); prect(x - sw / 2 + 1, top + H - 2, sw - 2, 1, C.mid);
  const ey = top + H / 2 - 2;
  if ((b.anim * 0.7) % 4 > 3.85) prect(x - 3, ey + 2, 6, 1, O);
  else {
    prect(x - 3, ey, 6, 4, O);
    const a = angTo(b, P); prect(x - 1 + Math.round(Math.cos(a) * 1.4), ey + 1 + Math.round(Math.sin(a) * 0.8), 2, 2, b.phase > 1 || o > 0.5 ? C.red : F);
  }
  // chains: wrapped while shut, snapped and dangling while open
  const wx = sw / 2 + hw + 2;
  if (o < 0.5) { chainLn(x - wx, top + H * 0.35, x + wx, top + H * 0.35); chainLn(x - wx, top + H * 0.7, x + wx, top + H * 0.7); }
  else for (const sd of [-1, 1]) chainLn(x + sd * (sw / 2 + 1), top + H * 0.35, x + sd * (sw / 2 + 4) + Math.sin(b.anim * 4 + sd) * 2, top + H * 0.35 + 9);
  if (b.phase > 1 && Math.random() < 0.08) part(x + rand(-wx, wx), top + rand(0, H), rand(-20, 20), rand(-30, -10), 0.8, C.white, 2, { drag: 0.95 });
}

/* ---------------- THE SEWER WYRM ---------------- */
const WY_N = 10, WY_GAP = 12;
function swim(b, tx, ty, spd, turn) { // steer the head toward a target; it never stops, so the body always flows
  const p = inA(tx, ty, 2 * T), want = Math.atan2(p.y - b.y, p.x - b.x);
  b.ha += clamp(angDiff(b.ha, want), -turn * BDT, turn * BDT);
  const q = inA(b.x + Math.cos(b.ha) * spd * BDT, b.y + Math.sin(b.ha) * spd * BDT, b.r); b.x = q.x; b.y = q.y;
  return Math.hypot(p.x - b.x, p.y - b.y);
}
function glide(b, x, y, spd) { // move straight to a point (the head turns to face it); returns the distance left
  const d = Math.hypot(x - b.x, y - b.y), st = spd * BDT, a = Math.atan2(y - b.y, x - b.x);
  if (d > 1) b.ha += clamp(angDiff(b.ha, a), -10 * BDT, 10 * BDT);
  if (d <= st) { b.x = x; b.y = y; return 0; }
  b.x += Math.cos(a) * st; b.y += Math.sin(a) * st; return d - st;
}
function wySink(b) { b.under = true; b.hide = true; b.inv = true; AU.splash(); ringFx(b.x, b.y, 3, 18, 0.4, C.ink, 2); inkDrops(b.x, b.y, -Math.PI / 2, 12, 1.2, 90); }
function wyInit(b) { // the body starts coiled around the head
  b.trail = []; b.segs = [];
  for (let d = 0; d <= 200; d += 2) { const a = d / 22, r = 6 + d * 0.16; b.trail.push({ x: b.x - Math.cos(a) * r, y: b.y - Math.sin(a) * r * 0.7, u: false, z: 0 }); }
  for (let i = 0; i < WY_N; i++) {
    const s = mkEnemy('wyrmseg', b.x, b.y, false);
    Object.assign(s, { parent: b, seg: true, idx: i, hp: 1, maxHp: 1, anchored: true, inv: true, hide: false, z: 0, ha: 0 });
    b.segs.push(s); G.enemies.push(s);
  }
}
function wyPost(b, dt) {
  if (!b.segs) wyInit(b);
  const tr = b.trail, h = tr[0], under = !!b.under;
  if (h.u !== under || d2(b.x, b.y, h.x, h.y) >= 4) tr.unshift({ x: b.x, y: b.y, u: under, z: b.z || 0 }); else h.z = b.z || 0;
  // walk the trail: each segment sits WY_GAP further back; it is underground if the newer end of its trail piece is
  let px = tr[0].x, py = tr[0].y, pu = tr[0].u, pz = tr[0].z, acc = 0, j = 1, lx = b.x, ly = b.y;
  for (let i = 0; i < b.segs.length; i++) {
    const s = b.segs[i], want = (i + 1) * WY_GAP;
    while (j < tr.length) {
      const q = tr[j], l = Math.hypot(q.x - px, q.y - py);
      if (acc + l >= want) { const f = (want - acc) / l; px = lerp(px, q.x, f); py = lerp(py, q.y, f); pz = lerp(pz, q.z, f); acc = want; break; }
      acc += l; px = q.x; py = q.y; pu = q.u; pz = q.z; j++;
    }
    const hid = pu && !b.dying;
    if (hid && !s.hide && b.segFire) ring(px, py, 6, 50, rand(TAU), { r: 2.5 });
    if (d2(lx, ly, px, py) > 0.25) s.ha = Math.atan2(ly - py, lx - px);
    s.x = px; s.y = py; s.z = pz; s.hide = hid; s.inv = b.inv || hid;
    if (!hid && pz < 8 && !b.intro && !b.dying && d2(px, py, P.x, P.y) < (s.r + P.hurtR) ** 2) hurtPlayer(1, px, py);
    lx = px; ly = py;
  }
  if (tr.length > j + 2) tr.length = j + 2;
  if (b.under && !b.dying) { b.rip = (b.rip || 0) - dt; if (b.rip <= 0) { b.rip = 0.12; ringFx(b.x, b.y, 2, 9, 0.35, C.dk, 1); part(b.x + rand(-5, 5), b.y + rand(-3, 3), rand(-20, 20), rand(-12, 4), 0.45, C.ink, 2); } }
}
function* wyDive(b) {
  const k = bk(b), reps = b.phase === 1 ? 1 : 2, life = b.phase === 1 ? 0.7 : 0.6;
  b.pose = 'rear'; AU.tele(); yield 0.4;
  b.pose = ''; wySink(b);
  for (let r = 0; r < reps; r++) {
    const p = inA(P.x, P.y, 2 * T), sx = b.x, sy = b.y;
    tele({ k: 'circle', x: p.x, y: p.y, r: 22, life }); AU.tele();
    for (let t = 0; t < life; t += BDT) { const f = Math.min(1, t / (life * 0.8)); b.x = lerp(sx, p.x, f); b.y = lerp(sy, p.y, f); yield 0; }
    const dir = Math.hypot(p.x - sx, p.y - sy) > 10 ? Math.atan2(p.y - sy, p.x - sx) : b.ha;
    b.x = p.x; b.y = p.y; b.ha = dir; b.under = false; b.hide = false; b.inv = false;
    eBlastAt(p.x, p.y, 22); ring(p.x, p.y, 16, 80 * k, rand(TAU), { r: 3 }); AU.splash(); AU.boom(1); shake(0.15);
    inkDrops(p.x, p.y, -Math.PI / 2, 26, 1.3, 160);
    const e = inA(p.x + Math.cos(dir) * 70, p.y + Math.sin(dir) * 70, 2 * T), ad = 0.6 / k;
    b.jaw = 1;
    for (let t = 0; t < ad; t += BDT) { const f = t / ad; b.x = lerp(p.x, e.x, f); b.y = lerp(p.y, e.y, f); b.z = Math.sin(f * Math.PI) * 26; yield 0; }
    b.x = e.x; b.y = e.y; b.z = 0; b.jaw = 0; b.segFire = true; wySink(b);
  }
  // keep swimming underground until the whole body has gone under, then surface away from the player
  const rf = randFloor(110), q = inA(rf.x, rf.y, 2 * T);
  for (let t = 0; t < 3 && !b.segs.every(s => s.hide); t += BDT) { swim(b, q.x, q.y, 150 * k, 4); yield 0; }
  b.segFire = false;
  for (let t = 0; t < 2 && glide(b, q.x, q.y, 160 * k) > 0; t += BDT) yield 0;
  tele({ k: 'circle', x: b.x, y: b.y, r: 14, life: 0.45 }); yield 0.45;
  b.under = false; b.hide = false; b.inv = false; AU.splash(); inkDrops(b.x, b.y, -Math.PI / 2, 14, 1.2, 110);
  yield 0.5;
}
function* wyCoil(b) {
  const A = arena(), k = bk(b), ax = Math.max(48, A.w / 2 - 3 * T), ay = Math.max(40, A.h / 2 - 3 * T), dir = Math.random() < 0.5 ? 1 : -1;
  b.pose = 'rear'; AU.roar(0.9); AU.tele(); yield 0.5; b.pose = '';
  let th = Math.atan2((b.y - A.cy) / ay, (b.x - A.cx) / ax);
  for (let t = 0; t < 2.5 && glide(b, A.cx + Math.cos(th) * ax, A.cy + Math.sin(th) * ay, 150 * k) > 0; t += BDT) yield 0;
  let trav = 0, ft = 0, fi = 0;
  while (trav < TAU) {
    const dth = 150 * k * BDT / Math.max(1, Math.hypot(ax * Math.sin(th), ay * Math.cos(th)));
    th += dir * dth; trav += dth;
    const nx = A.cx + Math.cos(th) * ax, ny = A.cy + Math.sin(th) * ay;
    if (d2(nx, ny, b.x, b.y) > 0.01) b.ha = Math.atan2(ny - b.y, nx - b.x);
    b.x = nx; b.y = ny;
    if ((ft -= BDT) <= 0) {
      ft = 0.12 / k; const s = b.segs[fi++ % b.segs.length];
      if (!s.hide) {
        const a = Math.atan2(A.cy - s.y, A.cx - s.x) + rand(-0.4, 0.4);
        if (b.phase === 1) eShot(s.x, s.y, a, 60, { r: 3, life: 7 }); else { eShot(s.x, s.y, a - 0.16, 60, { r: 3, life: 7 }); eShot(s.x, s.y, a + 0.16, 60, { r: 3, life: 7 }); }
        if (fi % 3 === 0) AU.eshot();
      }
    }
    yield 0;
  }
  yield 0.4;
}
function* wyLunge(b) {
  const k = bk(b), n = b.phase === 1 ? 2 : 3, m = 2 * T;
  for (let i = 0; i < n; i++) {
    let a = angTo(b, P);
    const tl = tele({ k: 'line', x: b.x, y: b.y, a, w: b.r * 2, len: Math.max(1, rayRect(b.x, b.y, a, m)), life: 9 }); AU.tele();
    const wind = i === 0 ? 0.7 : 0.5; b.pose = 'rear'; b.jaw = 1;
    for (let t = 0; t < wind; t += BDT) { if (t < wind - 0.25) a = angTo(b, P); b.ha += clamp(angDiff(b.ha, a), -9 * BDT, 9 * BDT); tl.a = a; tl.len = Math.max(1, rayRect(b.x, b.y, a, m)); tl.t = tl.life * Math.min(0.999, t / wind); yield 0; }
    tl.dead = true; b.pose = ''; b.ha = a; AU.dash();
    const L = rayRect(b.x, b.y, a, m), sx = b.x, sy = b.y; let d = 0, dt0 = 0;
    while (d < L) {
      d = Math.min(L, d + 380 * k * BDT); b.x = sx + Math.cos(a) * d; b.y = sy + Math.sin(a) * d;
      if ((dt0 -= BDT) <= 0) { dt0 = 0.05; const s = b.segs[randi(0, b.segs.length - 1)]; if (!s.hide) eShot(s.x, s.y, a + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2 + rand(-0.5, 0.5), rand(12, 22), { r: 3, life: 3.5 }); }
      yield 0;
    }
    shake(0.15); AU.crate(); burst(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r, 14, C.ink, 120, 0.45, 2); b.jaw = 0;
    yield 0.45 / k;
  }
  yield 0.3;
}
function* wySpit(b) {
  const k = bk(b);
  for (let v = 0; v < 3; v++) {
    b.jaw = 1; b.pose = 'rear';
    const tw = v === 0 ? 0.45 : 0.3;
    for (let t = 0; t < tw; t += BDT) { b.ha += clamp(angDiff(b.ha, angTo(b, P)), -6 * BDT, 6 * BDT); yield 0; }
    const mx = b.x + Math.cos(b.ha) * 12, my = b.y + Math.sin(b.ha) * 12, a = Math.atan2(P.y - my, P.x - mx);
    for (let i = 0; i < 5; i++) eShot(mx, my, a + bfan(i, 5, 0.26), 100 * k, { r: 5, big: true });
    AU.eshot(); AU.pop(); b.jaw = 0.4; b.pose = '';
    yield 0.12;
  }
  b.jaw = 0; yield 0.6;
}
function drawWyrm(b) {
  if (!b.segs) return; // body is built on the first update
  if (b.hide) { const w = 6 + Math.sin(b.anim * 12) * 1.5; pc(b.x, b.y + 1, 4, 'rgba(18,18,22,0.35)'); pring(b.x, b.y + 1, w, 'rgba(18,18,22,0.5)', 1); return; }
  const z = b.z || 0, fl = b.flash > 0, x = b.x, y = b.y - 3 - z - (b.pose === 'rear' ? 4 : 0), c = Math.cos(b.ha), s = Math.sin(b.ha);
  const Q = (u, v) => [x + c * u - s * v, y + s * u + c * v], O = fl ? C.ink : C.white, F = fl ? C.white : C.ink;
  shadow(b.x, b.y + 9, Math.max(5, 12 - z * 0.2));
  for (const sd of [-1, 1]) { // webbed gill frills
    const [r0x, r0y] = Q(-3, sd * 8), [f1x, f1y] = Q(-9, sd * 14), [f2x, f2y] = Q(-13, sd * 10);
    pline(r0x, r0y, f1x, f1y, C.ink, 3); pline(r0x, r0y, f2x, f2y, C.ink, 3); pline(f1x, f1y, f2x, f2y, C.ink, 2);
    pline(r0x, r0y, f1x, f1y, O, 1); pline(f1x, f1y, f2x, f2y, C.mid, 1);
  }
  const [hx, hy] = Q(-1, 0), [nx, ny] = Q(9, 0);
  pc(hx, hy, 10, O); pc(nx, ny, 6, O); pc(hx, hy, 9, F); pc(nx, ny, 5, F);
  if (b.jaw > 0.05) { const [jx, jy] = Q(12, 0), m = 1 + Math.round(b.jaw * 3); pc(jx, jy, m + 1, C.ink); pc(jx, jy, m, C.red); for (const sd of [-1, 1]) { const [tx, ty] = Q(11, sd * (m - 0.5)); prect(tx, ty, 1, 2, C.white); } } // fangs
  for (const sd of [-1, 1]) {
    const [ex, ey] = Q(2, sd * 5), [r0x, r0y] = Q(-1, sd * 3), [r1x, r1y] = Q(5, sd * 6), [qx, qy] = Q(13, sd * 2), [kx, ky] = Q(6, sd * 4);
    pline(r0x, r0y, r1x, r1y, O, 1); prect(qx, qy, 1, 1, C.dk); prect(kx, ky, 1, 1, C.mid); // brow ridge, nostril, scale
    prect(ex - 1, ey - 1, 2, 2, C.cyan); prect(ex - 1, ey - 1, 1, 1, C.white); // the cyan it swallowed glows in its eyes
  }
  if (!fl && Math.random() < 0.08) { const [dx, dy] = Q(10, rand(-3, 3)); part(dx, dy, 0, 14, 0.5, C.dk, 1, { drag: 1 }); } // sewer slime dripping from the jaw
}
function drawWyrmSeg(e) {
  if (e.hide) return;
  const z = e.z || 0, fl = e.flash > 0, x = Math.round(e.x), y = Math.round(e.y - 3 - z), c = Math.cos(e.ha), s = Math.sin(e.ha);
  shadow(e.x, e.y + 6, Math.max(4, 8 - z * 0.15));
  if (e.idx === WY_N - 1) for (const sd of [-1, 1]) { const fx = x - c * 12 - s * sd * 6, fy = y - s * 12 + c * sd * 6; pline(x, y, fx, fy, C.ink, 4); pline(x, y, fx, fy, fl ? C.ink : C.white, 2); }
  pc(x, y, 9, fl ? C.ink : C.white); pc(x, y, 8, fl ? C.white : C.ink);
  if (!fl) { parc(x, y + 1, 5, 0.4, Math.PI - 0.4, C.dk, 1); parc(x, y - 2, 4, 0.5, Math.PI - 0.5, C.dk, 1); prect(x - 1, y + 4, 2, 1, C.mid); }
  prect(x - 1, y - 10 - ((e.idx + ((G.t * 4) | 0)) % 2), 2, 2, C.white); // dorsal fin
}
EDEF.wyrmseg = { name: 'SEWER WYRM', zh: '下水道巨蟒', r: 8, hp: 1, spd: 0, mass: 99, cost: 0, anchored: true, flying: true, ai() { }, draw: drawWyrmSeg };

/* ---------------- THE HOURGLASS ---------------- */
function* hSand(b) {
  const A = arena(), k = bk(b), len = A.w, half = len / 2;
  let g1 = rand(40, half - 30), g2 = rand(half + 30, len - 40);
  b.pose = 'charge'; AU.tele();
  for (let w = 0; w < 3; w++) {
    const gaps = [{ c: g1, w: 20 }, { c: g2, w: 20 }];
    tele({ x: A.x0, y: A.y0 + 4, len, gaps, life: 0.5, d: drawGapTele });
    yield 0.5;
    edgeWall('T', gaps, 46 * k, { r: 3, col: C.gold }, 12); AU.eshot();
    g1 = clamp(g1 + rand(-70, 70), 30, half - 24); g2 = clamp(g2 + rand(-70, 70), half + 24, len - 30);
    yield 0.45 / k;
  }
  b.pose = ''; yield 0.6;
}
function rewindUpd(s, dt) { // fly out, hold still and blink, then run back the way they came
  s.rw += dt;
  if (s.rw < s.go) return;
  if (!s.fv) s.fv = [s.vx, s.vy];
  if (s.rw < s.go + 0.4) { s.vx = s.vy = 0; s.col = ((G.t * 16) | 0) % 2 ? C.white : C.gold; return; }
  s.vx = -s.fv[0] * 1.3; s.vy = -s.fv[1] * 1.3; s.col = C.gold; s.upd = null;
}
function* hRewind(b) {
  const k = bk(b), oy = b.y - 6;
  b.pose = 'charge'; tele({ k: 'diamond', x: b.x, y: oy, r: 16, life: 0.5 }); AU.tele(); yield 0.5;
  for (let r = 0; r < (b.phase === 1 ? 1 : 2); r++) {
    const off = rand(TAU);
    for (let i = 0; i < 24; i++) { const s = eShot(b.x, b.y - 6, off + i / 24 * TAU, 80 * k, { r: 3, life: 6, col: C.gold }); s.go = 0.8 / k; s.rw = 0; s.upd = rewindUpd; }
    AU.eshot(); ringFx(b.x, b.y - 6, 4, 26, 0.3, C.gold, 1);
    yield 0.35;
  }
  b.pose = ''; yield 1.4;
}
function stopUpd(s, dt) { // frozen while the hourglass holds time, then every shot turns on the player
  if (s.hg.tstop) { s.vx = s.vy = 0; s.life += dt; s.col = ((G.t * 10) | 0) % 2 ? C.white : (s.col0 || C.red); return; }
  const a = angTo(s, P); s.vx = Math.cos(a) * s.tsp; s.vy = Math.sin(a) * s.tsp; s.col = s.col0; s.upd = null;
}
function drawClockFx(f, k) {
  const r = 8 + (1 - (1 - k) ** 2) * 230;
  pring(f.x, f.y, r, C.white, 2); pring(f.x, f.y, Math.max(1, r - 3), C.gold, 1);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; pline(f.x + Math.cos(a) * (r - 6), f.y + Math.sin(a) * (r - 6), f.x + Math.cos(a) * (r + 2), f.y + Math.sin(a) * (r + 2), i % 3 ? C.gold : C.white, 1); }
}
function* hStop(b) {
  const k = bk(b);
  b.pose = 'charge'; AU.tele(); yield 0.45;
  let s = rand(TAU);
  for (let t = 0; t < 1.6; t += 0.08) { eShot(b.x, b.y - 6, s, 70 * k, { r: 2.5, col: C.gold, life: 8 }); eShot(b.x, b.y - 6, s + Math.PI, 70 * k, { r: 2.5, col: C.gold, life: 8 }); s += 0.3; if (((t * 100) | 0) % 3 === 0) AU.eshot(); yield 0.08; }
  tele({ k: 'diamond', x: b.x, y: b.y - 6, r: 18, life: 0.6 }); AU.tele(); yield 0.6;
  b.tstop = true; AU.freeze();
  for (const x of G.bullets) if (x.team === 'e' && !x.dead) { x.tsp = Math.hypot(x.vx, x.vy) || 60; x.col0 = x.col; x.vx = x.vy = 0; x.acc = x.turn = x.grav = x.curve = 0; x.hg = b; x.upd = stopUpd; }
  G.fx.push({ k: 'clock', bfx: true, x: b.x, y: b.y - 6, t: 0, life: 1.0, d: drawClockFx });
  for (let t = 0; t < 1.0; t += BDT) yield 0;
  b.tstop = false; AU.zap();
  b.pose = ''; yield 0.9;
}
function* hBlast(b) {
  const k = bk(b), oy = b.y - 6;
  b.pose = 'charge'; tele({ k: 'laser', x: b.x, y: oy, a: Math.atan2(P.y - oy, P.x - b.x), life: 0.45 }); AU.tele(); yield 0.45;
  for (let v = 0; v < 3; v++) { const a = Math.atan2(P.y - oy, P.x - b.x); for (let i = 0; i < 5; i++) eShot(b.x, oy, a + bfan(i, 5, 0.2), 115 * k, { r: 3, col: C.gold }); AU.eshot(); yield 0.32 / k; }
  b.pose = ''; yield 0.6;
}
function* hHands(b) {
  const oy = b.y - 6, pa = Math.atan2(P.y - oy, P.x - b.x), ah = pa + Math.PI, am = pa - Math.PI / 2;
  tele({ k: 'line', x: b.x, y: oy, a: ah, len: 160, w: 7, life: 0.9 }); tele({ k: 'line', x: b.x, y: oy, a: am, len: 220, w: 5, life: 0.9 });
  AU.tele(); AU.roar(1.8); b.pose = 'charge'; yield 0.9;
  AU.laser(5);
  const hh = eBeam(b.x, oy, ah, 7, C.gold), mh = eBeam(b.x, oy, am, 5, C.gold); hh.max = 160; mh.max = 220;
  let sh = 0.6;
  for (let t = 0; t < 5; t += BDT) {
    hh.a = ah + 0.5 * t; mh.a = am + 1.4 * t; hh.x = mh.x = b.x; hh.y = mh.y = b.y - 6;
    if ((sh -= BDT) <= 0) { sh = 0.75; eShot(b.x, b.y - 6, Math.atan2(P.y - b.y + 6, P.x - b.x), 95, { r: 2.5, col: C.gold }); AU.eshot(); }
    yield 0;
  }
  hh.dead = true; mh.dead = true; b.pose = ''; yield 0.6;
}
function gear(x, y, r, a, col) { // an iron cog: eight teeth, a rim and a hub
  for (let i = 0; i < 8; i++) { const t = a + i * TAU / 8, tx = Math.round(x + Math.cos(t) * (r + 1)), ty = Math.round(y + Math.sin(t) * (r + 1)); prect(tx - 1, ty - 1, 3, 3, C.ink); prect(tx, ty, 1, 1, col); }
  pc(x, y, r, C.ink); pring(x, y, r - 1, col, 1); pc(x, y, 1, col);
}
function hgPost(b, dt) { if (!b.tstop) b.ga = (b.ga || 0) + dt * (b.phase > 1 ? 2.2 : 1.4); } // the gears stand still while time does
function drawHourglass(b) {
  const fl = b.flash > 0, x = Math.round(b.x), y = Math.round(b.y - 6 + Math.sin(b.anim * 1.6) * 2), H = 13, W = 10;
  const frac = clamp(b.hp / b.maxHp, 0, 1), O = fl ? C.ink : C.white, F = fl ? C.white : C.ink, tell = b.pose === 'charge' && ((G.t * 14) | 0) % 2;
  shadow(b.x, b.y + 13, 12);
  if (b.tstop) pring(x, y, 24 + Math.sin(G.t * 20), C.gold, 1);
  const ga = b.ga || 0; gear(x - 13, y - H + 2, 7, ga, fl ? C.ink : C.lt); gear(x + 14, y + H - 4, 5, -ga * 1.4, fl ? C.ink : C.mid); // clockwork behind the glass
  for (const sd of [-1, 1]) { rrect(x + sd * 12 - 2, y - H - 2, 4, 2 * H + 4, O); prect(x + sd * 12 - 1, y - H - 1, 2, 2 * H + 2, F); }
  for (let yy = -H; yy <= H; yy++) { const hw = Math.max(1, Math.round(W * Math.abs(yy) / H)); prect(x - hw - 1, y + yy, hw * 2 + 3, 1, tell ? C.red : O); prect(x - hw, y + yy, hw * 2 + 1, 1, fl ? C.ink : C.paper2); }
  // the gold sand: what is left on top is what is left of its life
  const hs = Math.round(H * Math.sqrt(frac)), hb = Math.round(H * (1 - Math.sqrt(frac)));
  for (let yy = -hs; yy <= -1; yy++) { const hw = Math.max(1, Math.round(W * -yy / H)) - 1; prect(x - hw, y + yy, hw * 2 + 1, 1, C.gold); }
  for (let yy = H - hb + 1; yy <= H; yy++) { const hw = Math.max(1, Math.round(W * yy / H)) - 1, cut = yy === H - hb + 1 ? Math.round(hw * 0.5) : 0; prect(x - hw + cut, y + yy, (hw - cut) * 2 + 1, 1, C.gold); }
  if (frac > 0.02 && !b.tstop) { const ph = (G.t * 40) | 0; for (let yy = 0; yy <= H - hb; yy++) if (((yy - ph) % 3 + 3) % 3 === 0) prect(x, y + yy, 1, 1, C.gold); }
  prect(x - W + 3, y - H + 3, 1, 3, C.white); prect(x + W - 4, y + H - 6, 1, 3, C.white);
  if (b.phase > 1) { pline(x - 4, y - 8, x - 1, y - 4, C.ink); pline(x + 3, y + 6, x + 5, y + 10, C.ink); }
  for (const py of [y - H - 4, y + H + 1]) { rrect(x - 16, py - 1, 32, 5, O); rrect(x - 15, py, 30, 3, F); prect(x - 14, py + 1, 2, 1, C.gold); prect(x + 12, py + 1, 2, 1, C.gold); }
}

/* ---------------- THE THREE-FACED DUKE: a jester-duke in a dark coat who swaps red / black / white masks ---------------- */
const MFACES = ['red', 'black', 'white'];
const nextFace = b => MFACES[b.mi = ((b.mi || 0) + 1) % 3];
function* mSwap(b, f, wait) { b.mask = f; b.fch = 0.35; AU.swing(0.6); AU.tink(); burst(b.x, b.y - 6, 10, f === 'red' ? C.red : f === 'black' ? C.ink : C.white, 80, 0.35, 2); yield wait; }
function* mCycle(b) { const f = nextFace(b); yield* mSwap(b, f, 0.5); yield* MATK[f](b); }
function* mDuet(b) { for (let i = 0; i < 2; i++) { const f = nextFace(b); yield* mSwap(b, f, i ? 0.3 : 0.5); yield* MATK[f](b); } }
const mDuet2 = function* (b) { yield* mDuet(b); }; // a second entry so the duet is not forced to alternate with the card walls
function* mRed(b) { // the red mask, fury: three dash-strikes
  const k = bk(b), m = b.r + 4;
  for (let i = 0; i < 3; i++) {
    let a = angTo(b, P), len = Math.max(1, Math.min(dist(b, P) + 70, rayRect(b.x, b.y, a, m)));
    const tl = tele({ k: 'line', x: b.x, y: b.y, a, w: b.r * 2, len, life: 9 }); AU.tele(); b.pose = 'charge';
    for (let t = 0; t < 0.5; t += BDT) { if (t < 0.3) { a = angTo(b, P); len = Math.max(1, Math.min(dist(b, P) + 70, rayRect(b.x, b.y, a, m))); } tl.a = a; tl.len = len; tl.t = tl.life * Math.min(0.999, t / 0.5); yield 0; }
    tl.dead = true; b.pose = ''; AU.dash();
    const sx = b.x, sy = b.y;
    for (let d = 0; d < len;) { d = Math.min(len, d + 360 * k * BDT); b.x = sx + Math.cos(a) * d; b.y = sy + Math.sin(a) * d; if (Math.random() < 0.7) part(b.x + rand(-6, 6), b.y - 6 + rand(-8, 8), 0, 0, 0.3, C.red, 2); yield 0; }
    clampRoom(b);
    ring(b.x, b.y - 4, 10, 85 * k, rand(TAU), { r: 3 }); AU.slash(); ringFx(b.x, b.y - 4, 4, 22, 0.25, C.red, 1);
    yield 0.32;
  }
  yield 0.4;
}
function shockFx(x, y, spd, max) { // a ground ring that hurts where it passes
  return { k: 'shock', bfx: true, x, y, r: 4, spd, t: 0, life: max / spd, hitP: false,
    u: f => { f.r = 4 + f.spd * f.t; if (!f.hitP && Math.abs(Math.hypot(P.x - f.x, P.y - f.y) - f.r) < 6 && hurtPlayer(1, f.x, f.y)) f.hitP = true; },
    d: f => { pring(f.x, f.y, f.r, C.ink, 3); pring(f.x, f.y, f.r, ((G.t * 16) | 0) % 2 ? C.white : C.red, 1); } };
}
function* mBlack(b) { // the black mask, wrath: slow great shots and a ground shockwave
  const k = bk(b);
  b.pose = 'charge'; AU.roar(0.8); yield 0.5;
  for (let v = 0; v < 2; v++) { const a = angTo(b, P) + (v ? 0.18 : 0); for (let i = 0; i < 6; i++) eShot(b.x, b.y - 6, a + bfan(i, 6, 0.36), 50 * k, { r: 6, big: true, life: 9 }); AU.eshot(); AU.pop(); yield 0.6; }
  tele({ k: 'circle', x: b.x, y: b.y, r: 22, life: 0.55 }); AU.tele();
  for (let t = 0; t < 0.55; t += BDT) { b.z = 16 * Math.sin(Math.min(1, t / 0.55) * Math.PI); yield 0; }
  b.z = 0; shake(0.15); AU.boom(1.3); burst(b.x, b.y + 4, 16, C.ink, 120, 0.45, 2);
  G.fx.push(shockFx(b.x, b.y + 4, 110 * k, 260));
  b.pose = ''; yield 0.9;
}
function* mWhite(b) { // the white mask, deceit: two decoy masks and homing shots
  const k = bk(b);
  b.pose = 'charge'; AU.tele(); yield 0.5;
  const have = G.enemies.filter(e => e.type === 'decoy' && !e.dead).length;
  for (let i = have; i < 2; i++) {
    const p = inA(b.x + (i % 2 ? 56 : -56), b.y + rand(-20, 20), 2 * T);
    if (hitsWall(p.x, p.y, 7)) continue;
    const e = spawnEnemy('decoy', p.x, p.y, false, 0.5), ox = b.x, oy = b.y - 6; e.col = C.red; e.mk = true;
    G.fx.push({ k: 'trail', t: 0, life: 0.3, d: (f, kk) => pline(ox, oy, p.x, p.y - 4, kk < 0.5 ? C.white : C.lt, Math.max(1, Math.round(3 * (1 - kk)))) });
  }
  AU.roar(2); yield 0.35;
  for (let v = 0; v < 2; v++) { const a = angTo(b, P); for (let i = 0; i < 4; i++) eShot(b.x, b.y - 6, a + bfan(i, 4, 0.7), 80 * k, { r: 3, turn: 1.4, life: 4.5 }); AU.eshot(); yield 0.7; }
  b.pose = ''; yield 0.4;
}
const MATK = { red: mRed, black: mBlack, white: mWhite };
function* mCards(b) { // the duke deals two walls of playing cards from the side walls
  const A = arena(), k = bk(b), len = A.h, g1 = rand(40, len - 40), g2 = rand(40, len - 40);
  AU.roar(1.8); AU.tele(); b.pose = 'charge';
  tele({ x: A.x0 + 4, y: A.y0, len, v: true, gaps: [{ c: g1, w: 18 }], life: 0.8, d: drawGapTele });
  tele({ x: A.x1 - 4, y: A.y0, len, v: true, gaps: [{ c: g2, w: 18 }], life: 0.8, d: drawGapTele });
  yield 0.8;
  for (const [sd, g] of [['L', g1], ['R', g2]]) edgeWall(sd, [{ c: g, w: 18 }], 46 * k, { r: 3 }, 10).forEach(s => { s.draw = drawCard; });
  AU.swing(0.5); b.pose = '';
  let sh = 0.9;
  for (let t = 0; t < 4.5; t += BDT) { if ((sh -= BDT) <= 0) { sh = 1.2; eShot(b.x, b.y - 6, angTo(b, P), 85, { r: 3 }); AU.eshot(); } yield 0; }
  yield 0.3;
}
function drawCard(s) { // a spinning playing card: face up, then its back
  const x = Math.round(s.x), y = Math.round(s.y), up = ((s.t * 8 + s.y * 0.05) | 0) % 2;
  prect(x - 3, y - 4, 7, 9, C.ink);
  if (up) { prect(x - 2, y - 3, 5, 7, C.white); prect(x, y - 1, 1, 3, C.red); prect(x - 1, y, 3, 1, C.red); }
  else { prect(x - 2, y - 3, 5, 7, C.red); prect(x - 1, y - 2, 3, 5, C.redDk); }
}
function drawMiniMask(x, y, fl) { // a white half-mask on a gilded stick
  x = Math.round(x); y = Math.round(y);
  pline(x + 4, y + 3, x + 7, y + 11, C.ink, 3); pline(x + 4, y + 3, x + 7, y + 11, fl ? C.ink : C.gold, 1);
  oval(x, y, 9, 6, C.ink); oval(x, y, 8, 5, fl ? C.ink : C.white);
  if (fl) return;
  prect(x - 3, y - 5, 7, 1, C.gold);
  for (const sd of [-1, 1]) { const ex = x + sd * 4; prect(ex - 2, y - 1, 5, 1, C.ink); prect(ex - 1, y - 2, 3, 3, C.ink); prect(ex, y - 1, 1, 1, C.red); }
  prect(x - 1, y + 3, 3, 1, C.lt);
}
function maskFace(b, f, x, y) { // red: a manic grin · black: a scowl · white: a sly smirk and a painted tear
  const a = angTo(b, P), lx = Math.round(Math.cos(a) * 1.5), ly = Math.round(Math.sin(a) * 0.6), ey = y - 2;
  for (const sd of [-1, 1]) {
    const ex = x + sd * 4;
    if (f === 'black') { prect(ex - 4, ey, 9, 1, C.mid); prect(ex - 3, ey - 1, 7, 3, C.mid); pline(x + sd, ey - 3, x + sd * 8, ey - 5, C.white, 1); } // eye rims, brows knitted down
    else parc(ex, ey + 1, 4, Math.PI + 0.5, TAU - 0.5, f === 'red' ? C.gold : C.ink, 1); // arched brows
    prect(ex - 3, ey, 7, 1, C.void); prect(ex - 2, ey - 1, 5, 3, C.void); // almond eye holes
    prect(ex + lx, ey + ly, 1, 1, f === 'white' ? C.red : C.white);
  }
  if (f === 'red') {
    oval(x, y + 5, 6, 2, C.ink); prect(x - 7, y + 3, 1, 2, C.ink); prect(x + 7, y + 3, 1, 2, C.ink); prect(x - 4, y + 4, 9, 1, C.white); // the grin
    prect(x, y - 9, 1, 3, C.gold); prect(x - 1, y - 8, 3, 1, C.gold);
  } else if (f === 'black') {
    parc(x, y + 9, 4, Math.PI + 0.5, TAU - 0.5, C.white, 1); pline(x, y - 9, x, y - 6, C.lt, 1);
  } else {
    prect(x - 4, y + 1, 1, 3, C.ink); prect(x - 5, y + 2, 3, 1, C.ink); // the painted tear
    pline(x - 3, y + 6, x + 2, y + 6, C.ink, 1); pline(x + 2, y + 6, x + 4, y + 4, C.ink, 1); prect(x, y - 9, 1, 2, C.gold);
  }
}
function maskPost(b, dt) { b.fch = Math.max(0, (b.fch || 0) - dt); }
function drawDuke(b) {
  const f = b.mask || 'red', fl = b.flash > 0, z = b.z || 0, rx = 10, ry = 11, O = fl ? C.ink : C.white, cloth = fl ? C.white : C.dk;
  const x = Math.round(b.x), y = Math.round(b.y - 10 - z + Math.sin(b.anim * 2) * 2), tell = b.pose === 'charge' && ((G.t * 14) | 0) % 2;
  shadow(b.x, b.y + 13, Math.max(6, 12 - z * 0.2));
  // the long dark coat with a ragged hem and gold buttons
  const cy0 = y + ry - 2, cy1 = y + 21;
  for (let yy = cy0; yy <= cy1; yy++) { const hw = Math.round(5 + (yy - cy0) / (cy1 - cy0) * 7); prect(x - hw - 1, yy, hw * 2 + 3, 1, C.ink); prect(x - hw, yy, hw * 2 + 1, 1, cloth); }
  for (let i = -3; i <= 3; i++) { const hx = x + i * 3, hl = 2 + Math.round((Math.sin(b.anim * 5 + i * 1.9) + 1) * 1.5); prect(hx - 1, cy1 + 1, 3, hl, C.ink); prect(hx, cy1 + 1, 1, hl - 1, cloth); }
  prect(x, cy0 + 4, 1, cy1 - cy0 - 4, C.ink); for (let yy = cy0 + 6; yy < cy1 - 1; yy += 4) prect(x - 1, yy, 3, 2, fl ? C.ink : C.gold);
  // white-gloved hands, raised to conduct when it attacks
  const up = b.pose === 'charge' ? -10 : 0;
  for (const sd of [-1, 1]) { const hx = x + sd * 16, hy = y + 19 + up + Math.round(Math.sin(b.anim * 3 + sd) * 1.5); pline(x + sd * 8, y + 15, hx, hy, C.ink, 3); pline(x + sd * 8, y + 15, hx, hy, cloth, 1); prect(hx - 2, hy - 2, 4, 4, C.ink); prect(hx - 1, hy - 1, 2, 2, O); }
  // the ruff collar
  oval(x, y + ry + 2, 12, 3, C.ink); oval(x, y + ry + 2, 11, 2, O); if (!fl) for (let i = -9; i <= 9; i += 3) prect(x + i, y + ry + 1, 1, 3, C.lt);
  // the jester's hat: one floppy point per mask colour, each with a bell; the worn colour jingles
  const pts = [-1, 0, 1].map(sd => { const mf = MFACES[sd + 1], wob = Math.sin(b.anim * (mf === f ? 8 : 2.5) + sd) * (mf === f ? 2 : 1);
    return { col: fl ? C.white : mf === 'red' ? C.red : mf === 'black' ? C.mid : C.white, bx: x + sd * 5, by: y - ry + 1, mx: x + (sd ? sd * 12 : 1), my: y - ry - (sd ? 6 : 8), tx: x + (sd ? sd * 17 : 5) + wob, ty: y - ry + (sd ? 1 : -13) }; });
  for (const p of pts) { pline(p.bx, p.by, p.mx, p.my, C.ink, 7); pline(p.mx, p.my, p.tx, p.ty, C.ink, 4); }
  for (const p of pts) { pline(p.bx, p.by, p.mx, p.my, p.col, 5); pline(p.mx, p.my, p.tx, p.ty, p.col, 2); pc(p.tx, p.ty + 1, 3, C.ink); pc(p.tx, p.ty + 1, 2, fl ? C.ink : C.gold); }
  // the mask itself
  oval(x, y, rx + 2, ry + 2, C.ink); oval(x, y, rx + 1, ry + 1, fl ? C.ink : tell ? C.red : O);
  oval(x, y, rx, ry, fl ? C.white : f === 'red' ? C.red : f === 'black' ? C.ink2 : C.white);
  if (!fl) maskFace(b, f, x, y);
  rrect(x - 8, y - ry - 2, 17, 4, C.ink); prect(x - 7, y - ry - 1, 15, 1, fl ? C.white : C.gold); // hat band
  if (b.fch > 0) { // the mask-swap sweep
    const yy = Math.round(lerp(-ry - 2, ry + 2, 1 - b.fch / 0.35));
    prect(x - rx, y + yy - 2, rx * 2 + 1, 4, C.white); prect(x - rx, y + yy - 2, rx * 2 + 1, 1, C.ink);
    for (let i = 0; i < 2; i++) prect(x + rand(-rx, rx), y + yy + rand(-4, 4), 1, 1, C.gold);
  }
}

/* ---------------- shared boss machinery ---------------- */
const BOSSES = {
  warden: { name: 'THE WARDEN', zh: '典狱长', title: 'jailer of the crypt', zhTitle: '地下墓穴的看守', hp: 1400, r: 13, spd: 46, phases: [0.5],
    atk: [[wRend, wSweep, wBell], [wRend, wSweep, wBell, wSwords, wSummon]], draw: drawWarden,
    idle: function* (b, t) { for (let tt = 0; tt < t; tt += BDT) { if (dist(b, P) > 70) bossWalk(b, navAngle(b, P), this.spd); yield 0; } },
    phaseName: ['', 'THE WARDEN · UNCHAINED'], zhPhase: ['', '典狱长 · 挣脱锁链'], frag: 'red', floor: 0,
    lines: { intro: { en: 'No one leaves my crypt, little knight. Not even the dead.', zh: '没人能离开我的墓穴，小骑士。死人也不行。' },
      death: { en: 'Red... take it. I only kept the cell. The thief kept the key.', zh: '红色……拿去吧。我只管看守牢房，钥匙一直在窃贼手里。' } } },
  tome: { name: 'THE FORBIDDEN GRIMOIRE', zh: '禁忌魔典', title: 'every page a curse', zhTitle: '每一页都是诅咒', hp: 1400, r: 16, flying: true, phases: [0.5], k2: 1.3,
    atk: [[tPages, tLetters, tSlam, tRibbons], [tPages, tLetters, tSlam, tRibbons, tBats]], draw: drawTome, post: tomePost,
    idle: function* (b, t) { const p = inA(P.x + rand(-80, 80), P.y - rand(55, 85), 3 * T); for (let tt = 0; tt < t; tt += BDT) { bossFly(b, p.x, p.y, 55 * bk(b)); yield 0; } },
    reset: b => { b.openT = 0; b.z = 0; b.tear = 0; b.flip = 0; },
    phaseName: ['', 'THE PAGES GROW WINGS'], zhPhase: ['', '书页化作蝙蝠'], frag: 'red', floor: 0,
    lines: { intro: { en: 'Hush. Read one line of me, and you are mine forever.', zh: '嘘。只要读过我一行字，你就永远属于我了。' },
      death: { en: 'The chains break... and the red bleeds out of my pages.', zh: '锁链断了……红色从我的书页里流了出去。' } } },
  eye: { name: 'THE WEEPING EYE', zh: '泣血之眼', title: 'watcher of the drains', zhTitle: '下水道的窥视者', hp: 2600, r: 17, flying: true, phases: [0.5],
    atk: [[eGaze, eWeep, eBloom, eBlink], [eGaze, eWeep, eBloom, eBlink, eLighthouse, eTears]], draw: drawEye,
    idle: function* (b, t) { const p = inA(P.x + rand(-90, 90), P.y - rand(50, 90), 3 * T); for (let tt = 0; tt < t; tt += BDT) { bossFly(b, p.x, p.y, 48); yield 0; } },
    onPhase: () => { G.darkOn = true; }, phaseName: ['', 'LIGHTS OUT'], zhPhase: ['', '熄灯'], frag: 'cyan', floor: 1,
    lines: { intro: { en: 'Every tear I shed was blue once. Now I only weep blood.', zh: '我流下的每一滴泪，曾经都是青色。如今只剩下血。' },
      death: { en: 'Cyan... I remember the sea.', zh: '青色……我想起了大海。' } } },
  wyrm: { name: 'THE SEWER WYRM', zh: '下水道巨蟒', title: 'it swims beneath the floor', zhTitle: '它在地板下游动', hp: 2600, r: 12, phases: [0.5], k2: 1.2,
    atk: [[wyDive, wyCoil, wyLunge, wySpit], [wyDive, wyCoil, wyLunge, wySpit]], draw: drawWyrm, post: wyPost,
    idle: function* (b, t) { const dir = Math.random() < 0.5 ? 1 : -1; for (let tt = 0; tt < t; tt += BDT) { const a = angTo(P, b) + dir * 0.7; swim(b, P.x + Math.cos(a) * 95, P.y + Math.sin(a) * 75, 72 * bk(b), 2.4); yield 0; } },
    reset: b => { b.under = false; b.z = 0; b.jaw = 0; b.segFire = false; },
    phaseName: ['', 'THE SEWERS FLOOD'], zhPhase: ['', '污水翻涌'], frag: 'cyan', floor: 1,
    lines: { intro: { en: 'The sewers drank the blue of the sky. I drank the sewers.', zh: '下水道喝光了天空的青色，而我喝光了下水道。' },
      death: { en: 'Take it... the cyan was always too bright for the dark.', zh: '拿走吧……对这片黑暗来说，青色太亮了。' } } },
  hourglass: { name: 'THE HOURGLASS', zh: '时之沙漏', title: 'engine of stolen hours', zhTitle: '窃取时间的机器', hp: 3800, r: 15, flying: true, phases: [0.5], k2: 1.25,
    atk: [[hSand, hRewind, hStop, hBlast], [hSand, hRewind, hStop, hBlast, hHands]], draw: drawHourglass, post: hgPost,
    idle: function* (b, t) { const A = arena(), p = inA(A.cx + rand(-70, 70), A.cy - 20 + rand(-40, 30), 3 * T); for (let tt = 0; tt < t; tt += BDT) { bossFly(b, p.x, p.y, 28); yield 0; } },
    reset: b => { b.tstop = false; },
    phaseName: ['', 'THE HANDS BEGIN TO TURN'], zhPhase: ['', '指针开始转动'], frag: 'gold', floor: 2,
    lines: { intro: { en: 'Tick. Gold was the color of long afternoons. I keep them all, grain by grain.', zh: '滴答。金色是漫长午后的颜色。我一粒一粒，把它们全都锁了起来。' },
      death: { en: 'The sand runs out... let the hours turn golden again.', zh: '沙子漏完了……让时间重新变成金色吧。' } } },
  mask: { name: 'THE THREE-FACED DUKE', zh: '三面公爵', title: 'which face is real?', zhTitle: '哪张脸才是真的？', hp: 3800, r: 15, flying: true, phases: [0.5], k2: 1.2,
    atk: [[mCycle], [mDuet, mDuet2, mCards]], draw: drawDuke, post: maskPost,
    idle: function* (b, t) { const a = angTo(P, b) + rand(-0.7, 0.7), p = inA(P.x + Math.cos(a) * 110, P.y + Math.sin(a) * 80, 3 * T); for (let tt = 0; tt < t; tt += BDT) { bossFly(b, p.x, p.y, 62 * bk(b)); yield 0; } },
    reset: b => { b.z = 0; b.fch = 0; },
    phaseName: ['', 'THE MASQUERADE BEGINS'], zhPhase: ['', '假面舞会开始'], frag: 'gold', floor: 2,
    lines: { intro: { en: 'A red mask to laugh, a black mask to rage, a white mask to lie. Which one is me?', zh: '红面具用来笑，黑面具用来怒，白面具用来撒谎。哪一张才是我？' },
      death: { en: 'Beneath the masks... only gold, and no face at all.', zh: '面具之下……只有金色，根本没有脸。' } } },
  prism: { name: 'CHROMATIC', zh: '窃色者', title: 'thief of color', zhTitle: '色彩的窃贼', hp: 5200, r: 15, flying: true, phases: [0.66, 0.33],
    atk: [[pRefract, pWalls, pBlink], [pRefract, pBeams, pGrid, pMirror, pBlink], [pSpectrum, pBeams, pGrid, pRefract, pWalls, pBlink]], draw: drawPrism,
    idle: function* (b, t) { const A = arena(), p = inA(A.cx + rand(-120, 120), A.cy + rand(-70, 50), 3 * T); for (let tt = 0; tt < t; tt += BDT) { bossFly(b, p.x, p.y, 70); yield 0; } },
    onPhase: b => { G.tint = PCOL[b.phase - 1]; }, phaseName: ['', 'SECOND LIGHT · CYAN', 'LAST LIGHT · GOLD'], zhPhase: ['', '第二道光 · 青色', '最后的光 · 金色'], frag: null, floor: 3,
    lines: { intro: { en: 'You carried my colors all the way down here? How very kind.', zh: '你一路把我的颜色送到了这么深的地方？真是贴心。' },
      death: { en: 'Without color... I am only glass.', zh: '没有了颜色……我不过是一块玻璃。' } } },
};

/* ================= MINI-BOSSES (首领): the last wave of an elite room, one per floor ================= */

/* ---------------- mini · THE LICH LIBRARIAN (Crypt) ---------------- */
function drawBook(s) { const x = Math.round(s.x), y = Math.round(s.y); if (((s.t * 10) | 0) % 2) { prect(x - 4, y - 3, 8, 6, C.ink); prect(x - 3, y - 2, 6, 4, C.red); prect(x - 3, y - 2, 1, 4, C.white); } else { prect(x - 3, y - 4, 6, 8, C.ink); prect(x - 2, y - 3, 4, 6, C.red); prect(x - 2, y + 2, 4, 1, C.white); } }
function drawShelf(x0, y0, x1, y1) { // a toppled bookcase, seen from above
  rrect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2, C.ink); rrect(x0, y0, x1 - x0, y1 - y0, C.dk);
  const along = x1 - x0 >= y1 - y0, n = Math.floor(((along ? x1 - x0 : y1 - y0) - 4) / 4);
  for (let i = 0; i < n; i++) { const col = [C.lt, C.mid, C.white, C.redDk][i % 4]; if (along) prect(x0 + 2 + i * 4, y0 + 2, 3, y1 - y0 - 4, col); else prect(x0 + 2, y0 + 2 + i * 4, x1 - x0 - 4, 3, col); }
}
function drawShelfTele(t, k, blink) {
  const w = t.x1 - t.x0, h = t.y1 - t.y0, col = k > 0.7 && blink ? C.white : C.red;
  prect(t.x0, t.y0, w, h, RED_A(0.08 + 0.18 * k)); prect(t.x0, t.y0, w, 1, col); prect(t.x0, t.y1 - 1, w, 1, col); prect(t.x0, t.y0, 1, h, col); prect(t.x1 - 1, t.y0, 1, h, col);
  if (k > 0.5) { const lift = (1 - k) / 0.5 * 80; drawShelf(t.x0, t.y0 - lift, t.x1, t.y1 - lift); }
}
function shelf(b, horiz) { // a bookcase topples onto a strip through the player
  const A = arena(), L = 70, th = 9;
  const s = horiz ? { x0: Math.max(A.x0, P.x - L), x1: Math.min(A.x1, P.x + L), y0: P.y - th, y1: P.y + th } : { x0: P.x - th, x1: P.x + th, y0: Math.max(A.y0, P.y - L), y1: Math.min(A.y1, P.y + L) };
  AU.tele();
  tDo(Object.assign(s, { life: 0.85, d: drawShelfTele }), t => {
    const cx = (t.x0 + t.x1) / 2, cy = (t.y0 + t.y1) / 2;
    if (P.x > t.x0 - P.hurtR && P.x < t.x1 + P.hurtR && P.y > t.y0 - P.hurtR && P.y < t.y1 + P.hurtR) hurtPlayer(1, cx, cy);
    burst(cx, cy, 18, C.ink, 120, 0.45, 2); shake(0.15); AU.crate(); AU.boom(0.8);
    for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6; eShot(horiz ? lerp(t.x0, t.x1, u) : cx, horiz ? cy : lerp(t.y0, t.y1, u), (horiz ? Math.PI / 2 : 0) + (i % 2 ? Math.PI : 0), 55, { r: 3 }).draw = drawBook; }
    G.fx.push({ k: 'shelf', bo: b, x0: t.x0, y0: t.y0, x1: t.x1, y1: t.y1, t: 0, life: 0.8, d: (f, k) => { if (k < 0.7 || ((G.t * 16) | 0) % 2) drawShelf(f.x0, f.y0, f.x1, f.y1); } });
  });
}
function* lbBooks(b) {
  const k = bk(b), n = b.phase === 1 ? 3 : 5;
  b.pose = 'raise'; tele({ k: 'laser', x: b.x, y: b.y - 8, a: angTo(b, P), life: 0.5 }); AU.tele(); yield 0.5;
  for (let v = 0; v < 3; v++) { const a = angTo(b, P) + (v % 2 ? 0.12 : -0.12); for (let i = 0; i < n; i++) eShot(b.x, b.y - 8, a + bfan(i, n, 0.24), 120 * k, { r: 3.5 }).draw = drawBook; AU.swing(1.4); AU.eshot(); yield 0.32 / k; }
  b.pose = ''; yield 0.5;
}
function* lbScribes(b) {
  b.pose = 'raise'; AU.roar(1.6); yield 0.6;
  for (let i = 0; i < 2; i++) { const p = inA(b.x + (i ? 30 : -30), b.y + rand(-12, 12), T); if (!hitsWall(p.x, p.y, 7)) spawnEnemy('scribe', p.x, p.y, false, 0.8); }
  yield 0.7; b.pose = '';
}
lbScribes.cap = 3;
function* lbShelf(b) {
  const h = Math.random() < 0.5;
  b.pose = 'raise'; AU.roar(1.9); yield 0.3;
  shelf(b, h);
  if (b.phase > 1) { yield 0.3; shelf(b, !h); }
  yield 1.0; b.pose = ''; yield 0.4 / bk(b);
}
function* lbPages(b) {
  b.pose = 'raise'; tele({ k: 'diamond', x: b.x, y: b.y - 10, r: 12, life: 0.45 }); AU.tele(); yield 0.45;
  for (let r = 0; r < 2; r++) { const off = rand(TAU); for (let i = 0; i < 14; i++) eShot(b.x, b.y - 8, off + i / 14 * TAU, 75, { r: 3 }).draw = drawPage; AU.swing(1.6); AU.eshot(); yield 0.4; }
  b.pose = ''; yield 0.5;
}
function drawLibrarian(b) {
  const x = Math.round(b.x), y = Math.round(b.y), fl = b.flash > 0, O = fl ? C.ink : C.white, F = fl ? C.white : C.ink, sq = b.sq || 0, bob = b.mv ? Math.round(Math.abs(Math.sin(b.anim * 6))) : 0;
  shadow(x, y + b.r, b.r + 2);
  const bw = Math.round(18 * (1 + sq * 0.2)), bh = Math.round(22 * (1 - sq * 0.2)), x0 = x - (bw >> 1), y0 = y + b.r - bh - bob;
  rrect(x0 - 1, y0 - 1, bw + 2, bh + 2, O); rrect(x0, y0, bw, bh, F); prect(x0 + 2, y0 + bh - 3, bw - 4, 1, C.dk);
  rrect(x - 6, y0 - 10, 12, 12, O); rrect(x - 5, y0 - 9, 10, 10, F); prect(x - 1 - b.face * 4, y0 - 13, 3, 3, F); // hood with its tip
  const sx = x - 3 + b.face, bone = fl ? C.ink : C.paper, glint = b.pose === 'raise' ? C.red : C.violet; // the skull inside the hood
  prect(sx, y0 - 8, 7, 6, bone); prect(sx + 1, y0 - 2, 5, 2, bone);
  for (const ex of [sx + 1, sx + 4]) { prect(ex, y0 - 6, 2, 2, C.ink); prect(ex + (b.face > 0 ? 1 : 0), y0 - 6, 1, 1, glint); }
  prect(sx + 3, y0 - 4, 1, 1, C.ink); prect(sx + 2, y0 - 1, 1, 1, C.ink); prect(sx + 4, y0 - 1, 1, 1, C.ink); // nose and teeth
  if (!fl && Math.random() < 0.1) part(x + rand(-5, 5), y0 - 10, rand(-6, 6), rand(-25, -12), 0.6, C.violet, 1); // grave-cold wisps
  const kx = b.pose === 'raise' ? x - 4 : x + b.face * 9 - 3, ky = b.pose === 'raise' ? y0 - 22 : y0 + 7; // the book stack, raised to throw
  [C.red, C.lt, C.mid].forEach((c, i) => { prect(kx - 1, ky + i * 4 - 1, 9, 5, C.ink); prect(kx, ky + i * 4, 7, 3, fl ? C.white : c); });
}

/* ---------------- mini · THE TOAD KING (Sewers) ---------------- */
function drawGlob(t, k) { pc(t.x, t.y, t.r * k, RED_A(0.18)); pring(t.x, t.y, t.r, k > 0.75 && ((G.t * 16) | 0) % 2 ? C.white : C.red, 1); if (k > 0.45) { const h = (1 - k) / 0.55 * 70; pc(t.x, t.y - h, 4, C.ink); prect(t.x - 1, t.y - h - 2, 1, 1, C.white); } }
function drawTongue(f) { const ex = f.x + Math.cos(f.a) * f.len, ey = f.y + Math.sin(f.a) * f.len; pline(f.x, f.y, ex, ey, C.ink, 6); pline(f.x, f.y, ex, ey, C.red, 4); pc(ex, ey, 4, C.ink); pc(ex, ey, 3, C.red); prect(ex - 1, ey - 2, 1, 1, C.white); }
function puddle(b, x, y) { // sludge that clings: walking through it is 40% slower (dashing is not)
  const old = G.fx.filter(f => f.k === 'puddle' && f.bo === b && !f.dead); if (old.length >= 6) old[0].dead = true;
  splat(x, y, 8, 'rgba(18,18,22,0.5)');
  G.fx.push({ k: 'puddle', bo: b, x, y, r: 20, t: 0, life: 6,
    u: (f, dt) => { if (P.dash <= 0 && !P.dead && d2(P.x, P.y, f.x, f.y) < f.r * f.r) moveBody(P, -P.vx * dt * 0.4, -P.vy * dt * 0.4); if (Math.random() < 0.04) part(f.x + rand(-f.r, f.r) * 0.7, f.y + rand(-f.r, f.r) * 0.5, 0, -12, 0.4, C.dk, 1); },
    d: (f, k) => { if (k > 0.85 && ((G.t * 12) | 0) % 2) return; pring(f.x, f.y, f.r - 1 + Math.sin(G.t * 3 + f.x) * 1.5, 'rgba(18,18,22,0.55)', 1); pring(f.x, f.y, f.r * 0.55, 'rgba(18,18,22,0.3)', 1); } });
}
function* fgJump(b) {
  const k = bk(b), n = b.phase === 1 ? 1 : 3;
  for (let i = 0; i < n; i++) {
    b.pose = 'crouch'; for (let t = 0; t < (i ? 0.3 : 0.4); t += BDT) { b.sq = -0.5; yield 0; }
    const sx = b.x, sy = b.y, c = inA(P.x, P.y, b.r + 2), p = freeSpot(c.x, c.y, b.r, 48) || { x: sx, y: sy }, air = (i ? 0.75 : 0.9) / Math.sqrt(k);
    tele({ k: 'circle', x: p.x, y: p.y, r: 30, life: air }); AU.dash(); AU.tele();
    b.pose = 'air'; b.inv = true; // out of reach while airborne
    for (let t = 0; t < air; t += BDT) { const f = t / air; b.x = lerp(sx, p.x, f); b.y = lerp(sy, p.y, f); b.z = Math.sin(f * Math.PI) * 90; yield 0; }
    b.x = p.x; b.y = p.y; b.z = 0; b.inv = false; b.pose = ''; b.sq = 0.6;
    eBlastAt(p.x, p.y, 30); ring(p.x, p.y, 14, 80 * k, rand(TAU), { r: 3 }); shake(0.15); AU.boom(1.1); splat(p.x, p.y, 6);
    yield 0.35;
  }
  if (b.phase > 1) b.stun = 0.9; // winded after the triple leap
  yield b.phase > 1 ? 0.9 : 0.5;
}
function* fgTongue(b) {
  const n = b.phase === 1 ? 1 : 2;
  for (let i = 0; i < n; i++) {
    let a = angTo(b, P); const len = () => Math.min(150, rayWall(b.x, b.y - 4, a, 150));
    const tl = tele({ k: 'line', x: b.x, y: b.y - 4, a, w: 8, len: Math.max(1, len()), life: 9 }); AU.tele(); b.pose = 'open';
    const wind = i ? 0.45 : 0.6;
    for (let t = 0; t < wind; t += BDT) { if (t < wind - 0.2) a = angTo(b, P); tl.a = a; tl.len = Math.max(1, len()); tl.t = tl.life * Math.min(0.999, t / wind); yield 0; }
    tl.dead = true; AU.slash();
    const bm = eBeam(b.x, b.y - 4, a, 5, C.red); bm.d = drawTongue; bm.max = 1;
    for (let t = 0; t < 0.4; t += BDT) { bm.max = Math.max(1, 150 * Math.sin(Math.min(1, t / 0.4) * Math.PI)); yield 0; }
    bm.dead = true; b.pose = ''; yield 0.3;
  }
  yield 0.4;
}
function* fgSpit(b) {
  const n = b.phase === 1 ? 3 : 5;
  b.pose = 'open'; AU.tele(); yield 0.45;
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), d = i ? rand(30, 70) : 0, p = inA(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, 12);
    tDo({ k: 'circle', x: p.x, y: p.y, r: 18, life: 0.85, d: drawGlob }, () => { eBlastAt(p.x, p.y, 14); puddle(b, p.x, p.y); AU.splash(); });
    AU.pop(); yield 0.14;
  }
  b.pose = ''; yield 0.8;
}
function* fgCroak(b) {
  b.pose = 'croak'; AU.roar(0.7); for (let t = 0; t < 0.6; t += BDT) { b.sac = t / 0.6; yield 0; }
  for (let r = 0; r < 2; r++) { ring(b.x, b.y - 4, 18, 70 + r * 12, r * TAU / 36, { r: 3 }); ringFx(b.x, b.y - 4, 6, 40, 0.3, C.ink, 2); AU.eshot(); b.sac = 0.3; yield 0.35; }
  b.sac = 0; b.pose = ''; yield 0.6;
}
function drawFrog(b) {
  const z = b.z || 0, fl = b.flash > 0, O = fl ? C.ink : C.white, F = fl ? C.white : C.ink, sq = b.sq || 0, x = Math.round(b.x), y = Math.round(b.y - z);
  shadow(x, b.y + 8, Math.max(6, Math.round(16 - z * 0.08)));
  const rx = Math.round(16 * (1 + sq * 0.25)), ry = Math.round(10 * (1 - sq * 0.25)), cy = y + 8 - ry;
  for (const sd of [-1, 1]) { rrect(x + sd * (rx - 3) - 4, y + 4, 8, 5, O); rrect(x + sd * (rx - 3) - 3, y + 5, 6, 3, F); }
  oval(x, cy, rx + 1, ry + 1, O); oval(x, cy, rx, ry, F);
  if (!fl) for (const [dx, dy] of [[-8, -2], [5, 1], [-2, 3], [9, -4], [-11, 2]]) prect(x + dx, cy + dy, 2, 1, C.dk); // warts
  if (b.sac > 0) { const sr = 2 + Math.round(b.sac * 6); pc(x, cy + ry - 1, sr + 1, C.ink); pc(x, cy + ry - 1, sr, C.white); }
  pline(x - 8, cy + 3, x + 8, cy + 3, fl ? C.ink : C.lt, 1); if (b.pose === 'open') prect(x - 4, cy + 3, 9, 2, C.red);
  const red = b.pose === 'crouch' || b.phase > 1;
  for (const sd of [-1, 1]) { const ex = x + sd * 7, ey = cy - ry + 1; pc(ex, ey, 4, O); pc(ex, ey, 3, fl ? C.ink : C.white); prect(ex - 1, ey - 1, 3, 2, red ? C.red : C.ink); }
  const ky = cy - ry - 5; prect(x - 5, ky, 11, 4, C.ink); prect(x - 4, ky + 1, 9, 2, C.gold); for (let i = -1; i <= 1; i++) { prect(x + i * 3 - 1, ky - 2, 3, 2, C.ink); prect(x + i * 3, ky - 2, 1, 2, C.gold); } // the crown
  if (b.stun > 0) for (let i = 0; i < 3; i++) { const s = G.t * 5 + i * TAU / 3; prect(x + Math.cos(s) * 12, ky - 4 + Math.sin(s) * 2, 2, 2, C.gold); }
}

/* ---------------- mini · THE GLASS KNIGHT (Clockworks) ---------------- */
function drawGlass(s) { const a = Math.atan2(s.vy, s.vx), c = Math.cos(a), n = Math.sin(a); pline(s.x - c * 4, s.y - n * 4, s.x + c * 4, s.y + n * 4, C.ink, 3); pline(s.x - c * 3, s.y - n * 3, s.x + c * 3, s.y + n * 3, C.white, 1); prect(s.x + c * 3, s.y + n * 3, 1, 1, C.red); }
function* knDash(b) {
  const k = bk(b), n = b.phase === 1 ? 2 : 3, reach = a => Math.max(1, Math.min(dist(b, P) + 50, rayWall(b.x, b.y, a, 400) - b.r));
  for (let i = 0; i < n; i++) {
    let a = angTo(b, P);
    const tl = tele({ k: 'line', x: b.x, y: b.y, a, w: b.r * 2, len: reach(a), life: 9 }); AU.tele(); b.pose = 'wind';
    const wind = i ? 0.42 : 0.55;
    for (let t = 0; t < wind; t += BDT) { if (t < wind - 0.2) a = angTo(b, P); b.la = a; tl.x = b.x; tl.y = b.y; tl.a = a; tl.len = reach(a); tl.t = tl.life * Math.min(0.999, t / wind); yield 0; }
    const L = tl.len; tl.dead = true; b.pose = 'dash'; AU.dash();
    for (let d = 0; d < L; d += 340 * k * BDT) { if (bossWalk(b, a, 340 * k)) break; if (Math.random() < 0.6) part(b.x + rand(-4, 4), b.y + rand(-6, 4), 0, 0, 0.3, C.white, 2); yield 0; }
    b.pose = 'slash'; AU.slash();
    G.fx.push({ k: 'kslash', x: b.x, y: b.y, a, t: 0, life: 0.15, d: (f, kk) => parc(f.x, f.y, 14 + kk * 6, f.a - 1, f.a + 1, C.white, 2) });
    for (let j = 0; j < 3; j++) eShot(b.x, b.y - 4, a + bfan(j, 3, 0.3), 130 * k, { r: 2.5 }).draw = drawGlass;
    yield 0.3;
  }
  b.pose = ''; yield 0.4;
}
function* knMirror(b) { // gold-rimmed guard: bullets bounce back, blades still bite
  const dur = b.phase === 1 ? 1.5 : 2.0;
  b.pose = 'guard'; b.reflect = true; AU.reflect(); AU.tele();
  for (let t = 0; t < dur; t += BDT) { if (dist(b, P) > 50) bossWalk(b, navAngle(b, P), 14); yield 0; }
  b.reflect = false; b.pose = 'charge';
  tele({ k: 'circle', x: b.x, y: b.y, r: 26, life: 0.4 }); yield 0.4;
  const n = b.phase === 1 ? 10 : 14, off = rand(TAU);
  for (let i = 0; i < n; i++) eShot(b.x, b.y - 4, off + i / n * TAU, 95, { r: 2.5 }).draw = drawGlass;
  AU.slash(); AU.tink(); b.pose = ''; yield 0.6;
}
function* knShards(b) {
  const k = bk(b);
  b.pose = 'charge'; tele({ k: 'laser', x: b.x, y: b.y - 4, a: angTo(b, P), life: 0.45 }); AU.tele(); yield 0.45;
  for (let v = 0; v < 3; v++) { const a = angTo(b, P) + (v - 1) * 0.15; for (let i = 0; i < 5; i++) eShot(b.x, b.y - 4, a + bfan(i, 5, 0.2), 135 * k, { r: 2.5 }).draw = drawGlass; AU.tink(); AU.eshot(); yield 0.3 / k; }
  b.pose = ''; yield 0.5;
}
function* knCross(b) { // two crossing glass cuts centred on where the player stood
  b.pose = 'raise';
  for (let r = 0; r < 2; r++) {
    const x = P.x, y = P.y, a0 = rand(Math.PI);
    for (let i = 0; i < 4; i++) tele({ k: 'laser', x, y, a: a0 + i * Math.PI / 2, life: 0.7 });
    AU.tele(); yield 0.7;
    const bms = []; for (let i = 0; i < 4; i++) bms.push(eBeam(x, y, a0 + i * Math.PI / 2, 5, C.white));
    AU.laser(0.3); AU.slash(); shake(0.12); yield 0.3;
    bms.forEach(bm => { bm.dead = true; }); yield 0.15;
  }
  b.pose = ''; yield 0.5;
}
function drawKnight(b) {
  const x = Math.round(b.x), y = Math.round(b.y), fl = b.flash > 0, O = fl ? C.ink : C.white, F = fl ? C.white : C.ink, bw = 14, bh = 18, x0 = x - 7, y0 = y + b.r - bh;
  shadow(x, y + b.r, b.r + 2);
  if (b.reflect) rrect(x0 - 3, y0 - 13, bw + 6, bh + 16, ((G.t * 10) | 0) % 2 ? C.gold : C.goldDk); // the mirror stance
  rrect(x0 - 1, y0 - 1, bw + 2, bh + 2, O); rrect(x0, y0, bw, bh, F);
  if (!fl) { prect(x0 + 2, y0 + 3, 4, 5, C.lt); prect(x0 + bw - 6, y0 + 3, 4, 5, C.lt); prect(x0 + 3, y0 + 4, 1, 2, C.white); } // glass plates
  rrect(x - 5, y0 - 10, 10, 10, O); rrect(x - 4, y0 - 9, 8, 8, F); prect(x - 3, y0 - 6, 6, 1, b.pose === 'wind' || b.pose === 'dash' ? C.red : C.lt);
  for (let i = 0; i < 4; i++) prect(x - b.face * (i + 1) * 2, y0 - 11 - i + Math.round(Math.sin(b.anim * 6 + i)), 2, 2, C.white); // plume
  let a = b.face > 0 ? 0.9 : Math.PI - 0.9;
  if (b.pose === 'guard') a = -Math.PI / 2; else if (b.pose === 'wind' || b.pose === 'dash') a = b.la + Math.PI; else if (b.pose === 'slash') a = b.la; else if (b.pose === 'raise' || b.pose === 'charge') a = -Math.PI / 2 + b.face * 0.4;
  const hx = b.pose === 'guard' ? x : x + b.face * 7, hy = y0 + 9, L = 18;
  pline(hx, hy, hx + Math.cos(a) * L, hy + Math.sin(a) * L, C.ink, 4); pline(hx, hy, hx + Math.cos(a) * (L - 1), hy + Math.sin(a) * (L - 1), b.reflect ? C.gold : C.white, 2);
}

/* ---------------- mini · THE HOLLOW (Void): a faceless wraith that wipes strips of the world away ---------------- */
function* erWipe(b, list, ride) { // strips wiped clean from one wall to the other; the Hollow may ride the leading edge
  for (const s of list) tele({ k: 'line', x: s.x, y: s.y, a: s.a, len: s.len, w: 18, life: 0.75 });
  AU.tele(); yield 0.75;
  const bms = list.map(s => { const bm = eBeam(s.x, s.y, s.a, 14, C.white); bm.max = 1; return bm; }), L = Math.max(...list.map(s => s.len)), sp = 380 * bk(b);
  AU.laser(L / sp + 0.25);
  for (let d = 0; d < L;) {
    d += sp * BDT; bms.forEach((bm, i) => { bm.max = Math.max(1, Math.min(list[i].len, d)); });
    if (ride) { const s = list[0], e = Math.min(s.len, d); b.x = s.x + Math.cos(s.a) * e; b.y = s.y + Math.sin(s.a) * e; clampRoom(b); if (Math.random() < 0.5) part(b.x, b.y, rand(-30, 30), rand(-30, 30), 0.5, pick([C.lt, C.violet]), 2); }
    yield 0;
  }
  yield 0.25; bms.forEach(bm => { bm.dead = true; });
}
function* erSweep(b) {
  const A = arena(), n = b.phase === 1 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const horiz = i % 2 === 0, dir = Math.random() < 0.5 ? 1 : -1;
    const at = horiz ? clamp(P.y + rand(-20, 20), A.y0 + 12, A.y1 - 12) : clamp(P.x + rand(-20, 20), A.x0 + 12, A.x1 - 12);
    const s = horiz ? { x: dir > 0 ? A.x0 + 2 : A.x1 - 2, y: at, a: dir > 0 ? 0 : Math.PI, len: A.w - 4 } : { x: at, y: dir > 0 ? A.y0 + 2 : A.y1 - 2, a: dir > 0 ? Math.PI / 2 : -Math.PI / 2, len: A.h - 4 };
    const q = inA(s.x, s.y, b.r);
    for (let t = 0; t < 1.2 && bossFly(b, q.x, q.y, 260) > 4; t += BDT) yield 0;
    yield* erWipe(b, [s], true);
  }
  yield 0.4;
}
function* erCross(b) {
  const A = arena(), y = clamp(P.y, A.y0 + 12, A.y1 - 12), x = clamp(P.x, A.x0 + 12, A.x1 - 12);
  b.pose = 'charge';
  yield* erWipe(b, [{ x: A.x0 + 2, y, a: 0, len: A.w - 4 }, { x, y: A.y0 + 2, a: Math.PI / 2, len: A.h - 4 }], false);
  b.pose = ''; yield 0.4;
}
function* erFade(b) {
  for (let i = 0; i < (b.phase === 1 ? 1 : 2); i++) {
    for (let t = 0; t < 0.45; t += BDT) { b.fade = t / 0.45; yield 0; }
    b.hide = true; b.inv = true; AU.zap(); yield 0.35;
    const p = randFloor(70); tele({ k: 'circle', x: p.x, y: p.y, r: 20, life: 0.6 }); AU.tele(); yield 0.6;
    b.x = p.x; b.y = p.y; clampRoom(b); b.hide = false; b.inv = false; b.fade = 0;
    ring(b.x, b.y, 20, 85, rand(TAU), { r: 3 }); if (b.phase > 1) ring(b.x, b.y, 20, 60, rand(TAU), { r: 3 });
    burst(b.x, b.y, 14, C.violet, 110, 0.45, 2); AU.boom(0.8); shake(0.12);
    yield 0.45;
  }
  yield 0.4;
}
function* erCrumbs(b) {
  b.pose = 'charge'; tele({ k: 'arc', x: b.x, y: b.y, a: angTo(b, P), arc: 0.9, r: 60, life: 0.5 }); AU.tele(); yield 0.5;
  let a = angTo(b, P), i = 0;
  for (let t = 0; t < 1.2; t += 0.06) { a += clamp(angDiff(a, angTo(b, P)), -0.05, 0.05); eShot(b.x, b.y, a + rand(-0.4, 0.4), rand(60, 110) * bk(b), { r: 2.5 }); if (i++ % 3 === 0) AU.eshot(); yield 0.06; }
  b.pose = ''; yield 0.5;
}
function drawHollow(b) {
  if (b.hide || (b.fade > 0 && ((G.t * 30) | 0) % 2 && Math.random() < b.fade)) return;
  const fl = b.flash > 0, x = Math.round(b.x), y = Math.round(b.y - 6 + Math.sin(b.anim * 2) * 2), F = fl ? C.white : C.lt;
  shadow(b.x, b.y + 10, 11);
  for (let yy = 0; yy <= 10; yy++) { const hw = Math.round(7 + yy * 0.5); prect(x - hw - 1, y + yy, hw * 2 + 3, 1, C.ink); prect(x - hw, y + yy, hw * 2 + 1, 1, F); } // the robe
  for (let i = -2; i <= 2; i++) { const wx = x + i * 5, wl = 2 + Math.round((Math.sin(b.anim * 4 + i * 1.7) + 1) * 2); prect(wx - 1, y + 11, 3, wl, C.ink); prect(wx, y + 11, 1, wl - 1, F); } // trailing into wisps
  for (const sd of [-1, 1]) { const hx = x + sd * 17, hy = y + 6 + Math.round(Math.sin(b.anim * 2.5 + sd * 1.3) * 3); pline(x + sd * 7, y + 2, hx, hy, C.ink, 3); pline(x + sd * 7, y + 2, hx, hy, F, 1); for (let c = -1; c <= 1; c++) prect(hx + sd, hy + c * 2, 2, 1, C.ink); } // long clawed arms
  oval(x, y - 7, 10, 9, C.ink); oval(x, y - 7, 9, 8, F); // the hood, and where a face should be: nothing
  oval(x, y - 6, 6, 6, fl ? C.ink : b.pose === 'charge' ? C.red : C.violet); oval(x, y - 6, 5, 5, C.void);
  if (!fl && Math.random() < 0.3) { const a = rand(TAU), d = rand(14, 22); part(x + Math.cos(a) * d, y - 6 + Math.sin(a) * d, -Math.cos(a) * d * 2.5, -Math.sin(a) * d * 2.5, 0.4, C.violet, 1); } // motes pulled into the void
}

const MINIS = {
  librarian: { name: 'THE LICH LIBRARIAN', zh: '巫妖馆长', title: 'keeper of the forbidden stacks', zhTitle: '禁书库的看守', hp: 650, r: 11, spd: 40, phases: [0.5], k2: 1.2, roar: 1.5, floor: 0,
    atk: [[lbBooks, lbShelf, lbScribes], [lbBooks, lbShelf, lbScribes, lbPages]], draw: drawLibrarian,
    idle: function* (b, t) { for (let tt = 0; tt < t; tt += BDT) { const d = dist(b, P); if (d > 110) bossWalk(b, navAngle(b, P), this.spd); else if (d < 60) bossWalk(b, angTo(P, b), this.spd * 0.8); yield 0; } },
    phaseName: ['', 'THE STACKS COLLAPSE'], zhPhase: ['', '书架倾塌'],
    lines: { intro: { en: 'Shh. Overdue readers get shelved. Forever.', zh: '嘘。逾期不还的读者，一律上架——永远。' }, death: { en: 'Return... the books...', zh: '书……要还……' } } },
  frogking: { name: 'THE TOAD KING', zh: '蟾蜍王', title: 'lord of the sludge', zhTitle: '污泥之王', hp: 1000, r: 14, spd: 30, phases: [0.5], k2: 1.2, roar: 0.8, floor: 1,
    atk: [[fgJump, fgTongue, fgSpit], [fgJump, fgTongue, fgSpit, fgCroak]], draw: drawFrog,
    idle: function* (b, t) { for (let tt = 0; tt < t; tt += BDT) { if (dist(b, P) > 60) bossWalk(b, navAngle(b, P), this.spd); yield 0; } },
    reset: b => { b.z = 0; b.sac = 0; },
    phaseName: ['', 'THE KING CROAKS'], zhPhase: ['', '蟾蜍王怒吼'],
    lines: { intro: { en: 'Kneel. Even the sewer has a king.', zh: '跪下。下水道也有国王。' }, death: { en: 'The sludge... goes still.', zh: '污泥……平静了。' } } },
  glassknight: { name: 'THE GLASS KNIGHT', zh: '琉璃骑士', title: 'the mirror duelist', zhTitle: '镜中的决斗者', hp: 1400, r: 10, spd: 55, phases: [0.5], k2: 1.2, roar: 1.8, floor: 2,
    atk: [[knDash, knMirror, knShards], [knDash, knMirror, knShards, knCross]], draw: drawKnight,
    idle: function* (b, t) { const dir = Math.random() < 0.5 ? 1 : -1; for (let tt = 0; tt < t; tt += BDT) { const d = dist(b, P); bossWalk(b, d > 100 ? navAngle(b, P) : d < 60 ? angTo(P, b) : angTo(b, P) + dir * Math.PI / 2, this.spd); yield 0; } },
    reset: b => { b.reflect = false; },
    phaseName: ['', 'SHATTERED GUARD'], zhPhase: ['', '镜甲破碎'],
    lines: { intro: { en: 'Strike me, and watch yourself bleed.', zh: '朝我出手吧，你只会看见自己流血。' }, death: { en: 'Shattered... transparent at last.', zh: '碎了……终于，透明了。' } } },
  eraser: { name: 'THE HOLLOW', zh: '空洞者', title: 'what the thief left behind', zhTitle: '窃贼留下的空洞', hp: 1850, r: 13, flying: true, phases: [0.5], k2: 1.2, roar: 1.2, floor: 3,
    atk: [[erSweep, erFade, erCrumbs], [erSweep, erFade, erCrumbs, erCross]], draw: drawHollow,
    idle: function* (b, t) { const p = inA(P.x + rand(-90, 90), P.y - rand(40, 80), 3 * T); for (let tt = 0; tt < t; tt += BDT) { bossFly(b, p.x, p.y, 60); yield 0; } },
    reset: b => { b.fade = 0; },
    phaseName: ['', 'NOTHING REMAINS'], zhPhase: ['', '什么都不剩'],
    lines: { intro: { en: 'I was here before the first color.', zh: '在第一种颜色出现之前，我就在这里。' }, death: { en: 'Even nothing... can be filled.', zh: '就连虚无……也能被填满。' } } },
};
function bossObj(kind, D, x, y) {
  return { boss: true, kind, D: { flying: D.flying }, BD: D, x, y, r: D.r, hp: D.hp, maxHp: D.hp, mass: 99, kx: 0, ky: 0, flash: 0, sq: 0, anim: 0,
    phase: 1, co: null, wait: 0, inv: true, intro: true, stun: 0, chill: 0, chillT: 0, burn: 0, burnD: 0, burnTick: 0, frozen: 0, face: 1, ha: Math.PI / 2, pose: '', lid: 0, last: null, anchored: true };
}
function mkBoss(kind) {
  const D = BOSSES[kind], A = arena(), b = bossObj(kind, D, A.cx, A.cy - 40);
  if (kind === 'prism') G.tint = PCOL[0];
  return b;
}
// a mini-boss for the current room: rises from a dark pool at a free spot away from the player, no cinematic; the caller pushes it into G.enemies
function mkMini(kind) {
  const D = MINIS[kind]; let p = randFloor(80);
  for (let i = 0; i < 30 && hitsWall(p.x, p.y, D.r + 1); i++) p = randFloor(80);
  const b = bossObj(kind, D, p.x, p.y); b.mini = true; b.intro = false; b.spawnT = 0.8; // updEnemies keeps it inv and undrawn until spawnT runs out
  tele({ k: 'spawn', x: p.x, y: p.y, r: D.r + 4, life: 0.8 }); AU.spawn(); AU.roar(D.roar);
  return b;
}
function* bossSeq(b) {
  const D = b.BD;
  yield* D.idle.call(D, b, rand(0.35, 0.8));
  const n = minions(), list = D.atk[b.phase - 1].filter(a => a !== b.last && (!a.cap || n < a.cap));
  const a = pick(list.length ? list : D.atk[b.phase - 1]); b.last = a;
  yield* a(b);
}
function* phaseShift(b) {
  const D = b.BD;
  b.inv = true; b.pose = ''; b.lid = 0; b.hide = false; if (D.reset) D.reset(b);
  clearBossHaz(b);
  if (b.mini) { slowmo(0.4, 0.45); invFlash(1); shake(0.3); AU.roar(D.roar * 1.2); }
  else { slowmo(1.0, 0.25); invFlash(3); shake(0.5); AU.phase(); hitstop(0.1); }
  b.phase++;
  for (let i = 0; i < 3; i++) ringFx(b.x, b.y, 6, 80 + i * 40, 0.5 + i * 0.15, i === 1 ? C.red : C.ink, 2);
  inkDrops(b.x, b.y, 0, 40, Math.PI, 200);
  UI.banner((LANG === 'zh' ? D.zhPhase : D.phaseName)[b.phase - 1] || 'PHASE ' + b.phase, '', b.kind === 'prism' ? 'chroma' : D.frag === 'gold' ? 'gold' : 'red');
  if (D.onPhase) D.onPhase(b);
  yield b.mini ? 0.8 : 1.4;
  b.inv = false;
}
function updBoss(b, dt) {
  b.anim += dt; b.stun = Math.max(0, b.stun - dt);
  if (b.dead) return;
  const nt = G.tele.length, nf = G.fx.length;
  if (!b.intro) {
    let bdt = dt * G.diff.tempo;
    if (b.frozen > 0) { b.frozen = Math.max(0, b.frozen - dt); bdt *= 0.35; }
    bdt *= 1 - 0.05 * Math.min(4, b.chill || 0);
    BDT = bdt;
    const th = b.BD.phases[b.phase - 1];
    if (!b.dying && th !== undefined && b.hp <= b.maxHp * th && !b.shifting) { b.shifting = true; b.co = phaseShift(b); b.wait = 0; }
    if (b.wait > 0) { b.wait -= bdt; }
    else {
      if (!b.co) { b.shifting = false; b.co = bossSeq(b); }
      const r = b.co.next();
      if (r.done) b.co = null; else b.wait = r.value || 0;
    }
    if (!b.hide && !b.dying && !(b.z > 8) && d2(b.x, b.y, P.x, P.y) < (b.r + P.hurtR) ** 2) hurtPlayer(1, b.x, b.y);
  }
  if (b.BD.post) b.BD.post(b, dt);
  if (b.mini) { for (let i = nt; i < G.tele.length; i++) G.tele[i].bo = b; for (let i = nf; i < G.fx.length; i++) G.fx[i].bo = b; } // tag what this mini made
}
function bossDown(b) {
  if (b.dying) return;
  if (b.BD.reset) b.BD.reset(b);
  b.dying = true; b.inv = true; b.hide = false; b.lid = 0; b.pose = 'stun'; b.co = dyingSeq(b); b.wait = 0;
  clearBossHaz(b);
  UI.bossBar(null);
  if (b.mini) { slowmo(0.5, 0.4); AU.roar(b.BD.roar * 0.8); invFlash(1); shake(0.3); return; } // the rest of the room fights on
  for (const e of G.enemies) if (!e.boss && !e.dead) { e.dead = true; if (e.tl) e.tl.dead = true; inkDrops(e.x, e.y, rand(TAU), 10, Math.PI, 120); splat(e.x, e.y, e.r * 0.6 + 1); }
  P.inv = Math.max(P.inv, 3);
  slowmo(2.4, 0.22); AU.roar(0.8); hitstop(0.1); invFlash(3); shake(0.5);
}
function* dyingSeq(b) {
  if (b.mini) {
    for (let i = 0; i < 4; i++) { const x = b.x + rand(-12, 12), y = b.y + rand(-14, 8); burst(x, y, 10, i % 2 ? C.white : C.ink, 110, 0.4, 2); ringFx(x, y, 3, 22, 0.3, i === 0 ? C.red : C.ink, 2); inkDrops(x, y, rand(TAU), 8, 1, 140); AU.boom(0.7); b.flash = 0.06; yield 0.13; }
    inkDrops(b.x, b.y, 0, 36, Math.PI, 200); splat(b.x, b.y, 9); ringFx(b.x, b.y, 4, 70, 0.45, C.ink, 2); AU.boom(1.3); shake(0.3);
    b.dead = true;
    onMiniDefeated(b);
    return;
  }
  const segs = b.segs ? b.segs.map(s => { s.dead = true; return { x: s.x, y: s.y }; }) : []; // the wyrm bursts tail to head
  for (let i = 0; i < 9; i++) {
    const s = segs[segs.length - 1 - i], x = s ? s.x : b.x + rand(-22, 22), y = s ? s.y : b.y + rand(-22, 18);
    boomFx(x, y, rand(12, 26), i % 3 === 0 ? C.red : null); inkDrops(x, y, rand(TAU), 10, 1, 160); b.flash = 0.06; yield 0.16;
  }
  inkDrops(b.x, b.y, 0, 70, Math.PI, 260); splat(b.x, b.y, 14); for (let i = 0; i < 4; i++) ringFx(b.x, b.y, 5, 90 + i * 50, 0.5 + i * 0.12, i % 2 ? C.white : C.ink, 3);
  AU.boom(2); invFlash(4); shake(0.5); hitstop(0.1);
  b.dead = true;
  onBossDefeated(b);
}
function drawBoss(b) { b.BD.draw(b); }
