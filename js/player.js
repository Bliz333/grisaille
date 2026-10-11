'use strict';
/* GRISAILLE · player — 4 heroes + skills, 30 weapons with signature synergies, attack shapes (bullets, swings, slams, beams, lobs, throws, thrusts, spins, rune lines, lashes, gusts, waves) */
let P = {};
function newPlayer() {
  const H = hero();
  P = {
    x: 0, y: 0, r: 4, hurtR: 2.5, vx: 0, vy: 0, kx: 0, ky: 0, hp: H.hp, maxHp: H.hp, sh: 2, maxSh: 2, shT: 0, shTick: 0, skCd: 0, skT: 0, critN: 0,
    inv: 0, dash: 0, dashA: 0, dashCd: 0, dashHit: null, aim: 0, ws: [null, null], wi: 0, walkT: 0, sq: 0,
    chroma: 0, chromaT: 0, combo: 0, comboT: 0, recoil: 0, after: [], moving: false, haloA: 0, haloHit: new Map(), dead: false, lock: false,
  };
}
const fan = (i, n, step) => (i - (n - 1) / 2) * step;
const handPos = a => ({ x: P.x + Math.cos(a) * 3, y: P.y + 1 + Math.sin(a) * 2 });
const muzzlePos = (a, len) => { const h = handPos(a); return { x: h.x + Math.cos(a) * len, y: h.y + Math.sin(a) * len }; };

const WSPR = {
  quill: [['..##........', '.#gm#######.', '#ddmwwwwwww#', '#dd########.', '#dd#........', '.##.........'], 2, 3, 10],
  scatter: [['...........####', '.##########gww#', '#ddmwwwwwwwwww#', '#dd##########w#', '#dd#.......####', '.##............'], 2, 3, 13],
  needle: [['.##########.', '#mmmmmwwwww#', '#m#ggg#####.', '#m#www#.....', '###ggg#.....', '...###......'], 2, 3, 11],
  blade: [['..#................', '##################.', '#dd#wwwwwwwwwwwwww#', '##################.', '..#................'], 1, 2, 18],
  maul: [['...........#####', '...........#ggg#', '############ggg#', '#ddddddddddwwww#', '############ggg#', '...........#ggg#', '...........#####'], 1, 3, 14],
  rail: [['...........#...', '..........#c#..', '.########.#cwc#', '#ddmmmmdd#cwwc#', '.########.#cwc#', '..........#c#..', '...........#...'], 2, 3, 14],
  blot: [['......#o.', '.....#d#o', '..####d#.', '.#dddd#..', '#dmwddd#.', '#dwdddd#.', '#dddddd#.', '.#dddd#..', '..####...'], 3, 5, 12],
  chakram: [['..###..', '.#www#.', '#ww#ww#', '#w#.#w#', '#ww#ww#', '.#www#.', '..###..'], -2, 3, 6],
  bow: [['##....', 'g##...', 'g.##..', 'g..#..', 'g..#..', 'g..#..', 'g.##..', 'g##...', '##....'], 1, 4, 5],
  revolver: [['..###.........', '.#ggg#########', '#gdgdwwwwwwww#', '#ggg#########.', '#w##..........', '#w#...........', '###...........'], 2, 4, 12],
  gatling: [['.################', '#ddgwwwwwwwwwwww#', '#ddg############.', '#ddgwwwwwwwwwwww#', '#ddg############.', '.####w#..........', '....###..........'], 5, 4, 12],
  splitter: [['..........##.', '.#########w#.', '#wwwwwwwwww##', '#w#ggd####w#.', '#w#.......##.', '###..........'], 2, 3, 11],
  ricochet: [['.........#..', '.#####..#w#.', '#mmmm####gw#', '#m#ddd#wwgww', '#m#...##gw#.', '###.....#w#.', '.........#..'], 2, 3, 10],
  flamer: [['.####..........', '#dmmd#########.', '#dmmd#wwwwwww#o', '#dmmd#########.', '.####.#w#......', '......###......'], 7, 3, 8],
  spear: [['.................###...', '#################www#..', '#ddddddddddddddd#wwwww#', '#################www#..', '.................###...'], 6, 2, 16],
  scythe: [['..........######..', '.........#wwwwww#.', '..........######w#', '################w#', '#dddddddddddddd#w#', '################w#', '...............###'], 4, 4, 14],
  umbrella: [['.#####.', '#gwwwg#', '#gwgwg#', '#gwgwg#', '#ggggg#', '#gwgwg#', '#gwgwg#', '#gwwwg#', '.#####.'], -1, 4, 7],
  stylus: [['.............###', '.###########cwc#', '#ddmdddmdddd#cc#', '.###########cwc#', '.............###'], 4, 2, 13],
  mine: [['...#####...', '..#mmmmm#..', '.#mm#r#mm#.', '#mm#rrr#mm#', '.#mm#r#mm#.', '..#mmmmm#..', '...#####...'], 3, 3, 9],
  darts: [['#.........', '#d#.......', '#d#######.', '#dd#wwwww#', '#d#######.', '#d#.......', '#.........'], 2, 3, 8],
  crossbow: [['.........##...', '.........#g#..', '.........#.g#.', '.##########g#.', '#ddddddddwwww#', '.##########g#.', '.........#.g#.', '.........#g#..', '.........##...'], 3, 4, 10],
  staff: [['...............####.', '..............#wwww#', '##############ww#ww#', '#dddddddddddd##wwww#', '##############ww#ww#', '..............#wwww#', '...............####.'], 5, 3, 15],
  brush: [['.########.', '#dddddddw#', '#dmmmmmdw#', '#dm#o#mdw#', '#dmooomdw#', '#dmo#omdw#', '#dmmmmmdw#', '#dddddddw#', '.########.'], 1, 4, 10],
  whip: [['.......##.##..', '......#gw#gw#.', '#######g##.##.', '#ddddd##gw#...', '#######g##.##.', '......#gw#gw#.', '.......##.##..'], 3, 3, 8],
  fan: [['..........###.', '.........#wgw#', '#########gw#w#', '#dddddddd#wgw#', '#########.###.'], 1, 3, 10],
  firecracker: [['..###...###...###...', '.#ddd#.#ddd#.#ddd#o.', '#dmdd###dmdd###dmdd#', '#dddd#d#dddd#d#dddd#', '.#dd#...#dd#...#dd#.', '..##.....##.....##..'], 1, 2, 12],
  guqin: [['.............####', '.........####gww#', '#########dgggwmw#', '#ggggddgggggwwmw#', '#########dgggwmw#', '.........####gww#', '.............####'], 4, 3, 14],
  kite: [['...###...', '..#www#..', '.#wwwww#.', '#wcwwwcw#', '#wwwwwww#', '.#wwwww#.', '..#wwww#.', '...#wg#..', '....#g#..', '.....#...'], 4, 4, 4],
  abacus: [['....####.....', '...#yyyy#....', '.###########.', '#mmmmmmmwwww#', '#m#mm#######.', '#m#..#.......', '###..........'], 1, 2, 12],
  laser: [['..........##..', '.########.#c#.', '#ddmmmmmd#cwc#', '#dd######cwwc#', '#dd#.....#cwc#', '.##.......#c#.', '..........##..'], 2, 3, 13],
  siphon: [['...............###..', '..............#c.c#.', '##############c...c#', '#ddddddddddddd#.w.#.', '##############c...c#', '..............#c.c#.', '...............###..'], 5, 3, 16],
  twinhooks: [['..#.............', '.#d#............', '####............', '#dd############.', '#dd#wwwwwwwwwww#', '#dd############.', '####............', '.#d#............', '..#.............'], 1, 4, 16],
};
for (const k in WSPR) { const [rows, ox, oy, len] = WSPR[k]; const s = spr(rows); WSPR[k] = { s, g: silh(s, C.lt), wh: silh(s, C.white), ox, oy, len }; }

function muzzle(a, g, big) {
  const m = muzzlePos(a, WSPR[P.ws[P.wi].id].len);
  G.fx.push({ k: 'muzzle', x: m.x, y: m.y, a, t: 0, life: big ? 0.07 : 0.05, big, g, d: (f) => { const s = f.big ? 5 : 3; pc(f.x, f.y, s + 1, C.ink); pc(f.x, f.y, s, f.g ? C.lt : C.white); pline(f.x, f.y, f.x + Math.cos(f.a) * s * 2.4, f.y + Math.sin(f.a) * s * 2.4, f.g ? C.lt : C.white, 2); } });
  if (!g) part(P.x, P.y, -Math.cos(a) * 20 + rand(-30, 30), rand(-60, -20), 0.6, C.gold, 1, { drag: 0.9, z: 4, vz: 60 });
}
function recoil(a, kickAmt, rc) { kick(a + Math.PI, kickAmt); P.recoil = Math.min(1.5, P.recoil + rc); }
function pShot(x, y, a, spd, dmg, o = {}) {
  const b = {
    team: 'p', x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: (o.r || 2) * (o.noSize ? 1 : S.size), dmg,
    life: o.life || 1.1, max: o.life || 1.1, pierce: (o.pierce || 0) + (o.kind === 'mote' || o.kind === 'shard' ? 0 : S.pierce), kind: o.kind || 'b', kb: o.kb != null ? o.kb : 70, hitSet: null,
    home: o.home || 0, ghost: o.ghost, depth: o.depth || 0, cluster: o.cluster, col: o.col, crit: o.crit, heavy: o.heavy, t: 0,
    tx: o.tx, ty: o.ty, w: o.w, seed: Math.random() * 360, sat: G.wsat
  };
  if (G.wmk) b.dmg *= G.wmk; // a weapon's extra multishot projectiles share its damage
  G.bullets.push(b); return b;
}
// throttled custom sound (soft sine/triangle/noise only)
const _pSndT = {};
function pSnd(k, gap, fn) { if (!AU.ctx || !AU.on) return; const now = AU.ctx.currentTime; if (now - (_pSndT[k] ?? -9) < gap) return; _pSndT[k] = now; fn(); }
// player-projectile colour, same rule as drawBullets
const pbCol = b => b.ghost ? C.lt : b.col ? b.col : P.chromaT > 0 || b.sat ? hue(G.t * 500 + b.seed) : C.white;
// is the attack being made right now drawing on colour (saturated round, overcharge, chroma beam, or CHROMA unleashed)
const lit = () => P.chromaT > 0 || G.wsat;

/* ---------- attack shapes ---------- */
// an enemy bullet turns white/gold and flies where you aim
function pReflect(b) {
  const sp = Math.max(200, Math.hypot(b.vx, b.vy) * 1.6), na = P.aim + rand(-0.08, 0.08);
  b.team = 'p'; b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; b.dmg = 9 * FL(); b.kind = 'b'; b.life = 1; b.r = Math.max(2, b.r); b.grav = 0; b.acc = 0; b.turn = 0; b.curve = 0; b.split = null; b.col = C.gold; b.kb = 90; b.pierce = 1;
  sparks(b.x, b.y, na, 4, C.gold, 160);
}
function swing(a, o) {
  const R = o.r * S.size, arc = o.arc * (1 + (S.size - 1) * 0.4), dir = o.dir || 1;
  const col = o.ghost ? C.lt : (lit() ? hue(G.t * 500) : C.white);
  G.fx.push({ k: 'swing', x: P.x, y: P.y, a, arc, r: R, t: 0, life: 0.15, dir, col, fin: o.heavy, u: f => { f.x = P.x; f.y = P.y; }, d: drawSwing });
  P.swingA = { a0: a - arc / 2 * dir, a1: a + arc / 2 * dir, t: 0 };
  let n = 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dd = Math.hypot(e.x - P.x, e.y - P.y);
    if (dd < R + e.r && (dd < e.r + 6 || Math.abs(angDiff(a, Math.atan2(e.y - P.y, e.x - P.x))) < arc / 2 + 0.15)) { hit(e, o.dmg, { kind: 'm', a: Math.atan2(e.y - P.y, e.x - P.x), kb: o.kb, heavy: o.heavy }); n++; }
  }
  // reflect enemy bullets: they turn white and fly where you aim
  let rf = 0;
  for (const b of G.bullets) {
    if (b.team !== 'e' || b.dead || b.beam) continue;
    const dd = Math.hypot(b.x - P.x, b.y - P.y);
    if (dd < R + 4 && Math.abs(angDiff(a, Math.atan2(b.y - P.y, b.x - P.x))) < arc / 2 + 0.2) { pReflect(b); rf++; }
  }
  if (rf) { AU.reflect(); hitstop(0.03); gainChroma(rf * 2); }
  for (let k = -2; k <= 2; k++) { const aa = a + k * arc / 5; hurtTile(Math.floor((P.x + Math.cos(aa) * R * 0.8) / T), Math.floor((P.y + Math.sin(aa) * R * 0.8) / T), o.dmg); }
  if (n) { hitstop(o.heavy ? 0.06 : 0.035); shake(o.heavy ? 0.18 : 0.08); AU.slash(); }
}
function drawSwing(f, k) {
  const prog = Math.min(1, k * 2.2), a0 = f.a - f.arc / 2 * f.dir, aEnd = a0 + f.arc * f.dir * prog;
  const tail = Math.max(0, prog - 0.55 - k * 0.5);
  const aStart = a0 + f.arc * f.dir * tail;
  const lo = Math.min(aStart, aEnd), hi = Math.max(aStart, aEnd);
  const th = f.fin ? 8 : 6;
  parc(f.x, f.y, f.r + 1, lo, hi, C.ink, 2);
  for (let rr = f.r - th; rr <= f.r; rr += 1.5) parc(f.x, f.y, rr, lo, hi, (rr > f.r - 2) ? f.col : (k > 0.6 ? C.lt : f.col), 1);
  parc(f.x, f.y, f.r - th - 1, lo, hi, C.ink, 1);
}
function slam(x, y, r, dmg, c, ghost) {
  blast(x, y, r, dmg, { heavy: true, clear: c >= 0.99, quiet: true });
  G.fx.push({ k: 'slam', x, y, r, t: 0, life: 0.4, g: ghost, d: (f, k) => { pring(f.x, f.y, f.r * (0.3 + 0.7 * Math.sqrt(k)), f.g ? C.lt : C.white, Math.max(1, Math.round(5 * (1 - k)))); pring(f.x, f.y, f.r * (0.3 + 0.7 * Math.sqrt(k)) + 2, C.ink, 1); if (k < 0.15) pc(f.x, f.y, f.r * 0.5, f.g ? C.lt : C.white); } });
  const dc = G.room.dx;
  for (let i = 0; i < 7; i++) { let a = rand(TAU), px = x, py = y; dc.fillStyle = 'rgba(18,18,22,0.45)'; for (let s = 0; s < r * 0.7; s++) { a += rand(-0.3, 0.3); px += Math.cos(a); py += Math.sin(a); dc.fillRect(Math.round(px) + 8, Math.round(py) + 8, 1, 1); } }
  for (let i = 0; i < 16; i++) { const a = rand(TAU); part(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, Math.cos(a) * rand(30, 90), Math.sin(a) * rand(30, 90), 0.8, pick([C.ink, C.mid, C.white]), randi(1, 3), { z: 2, vz: rand(60, 160), drag: 0.92 }); }
  shake(0.22 + 0.3 * c); hitstop(0.04 + 0.05 * c); AU.slam(c);
}
function beam(x, y, a, w, dmg, ghost, col0) {
  const len = rayWall(x, y, a, 520), ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const t = clamp(((e.x - x) * Math.cos(a) + (e.y - y) * Math.sin(a)), 0, len);
    const px = x + Math.cos(a) * t, py = y + Math.sin(a) * t;
    if (d2(px, py, e.x, e.y) < (w / 2 + e.r) ** 2) hit(e, dmg, { kind: 'beam', a, kb: 110, heavy: true });
  }
  hurtTile(Math.floor((ex + Math.cos(a) * 3) / T), Math.floor((ey + Math.sin(a) * 3) / T), dmg);
  sparks(ex, ey, a + Math.PI, 8, C.white, 160, 1);
  const col = ghost ? C.lt : col0 || (lit() ? hue(G.t * 500) : C.white);
  G.fx.push({ k: 'beam', x, y, ex, ey, w, t: 0, life: 0.22, col, d: (f, k) => { const ww = Math.max(1, Math.round(f.w * (1 - k))); pline(f.x, f.y, f.ex, f.ey, C.ink, ww + 2); pline(f.x, f.y, f.ex, f.ey, f.col, ww); if (k < 0.3) { pc(f.x, f.y, f.w + 2, f.col); pc(f.ex, f.ey, f.w, f.col); } } });
  return { ex, ey };
}
function lob(x, y, tx, ty, dmg, ghost) {
  const dd = Math.hypot(tx - x, ty - y), tt = clamp(dd / 210, 0.22, 0.7);
  const b = pShot(x, y, Math.atan2(ty - y, tx - x), dd / tt, dmg, { kind: 'gren', life: tt, ghost, r: 3, noSize: true });
  b.tt = tt; return b;
}

/* thrust: a line hitbox from the player along the aim; reflects enemy bullets touching it */
function pThrust(a, o) {
  const ca = Math.cos(a), sa = Math.sin(a), off = o.off || 0, hw = 5;
  const x = P.x - sa * off, y = P.y + 1 + ca * off, L = o.len * S.size;
  const len = Math.min(L, rayWall(x, y, a, L) + 3);
  let n = 0, rf = 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const s = clamp((e.x - x) * ca + (e.y - y) * sa, 0, len);
    if (d2(x + ca * s, y + sa * s, e.x, e.y) < (hw + e.r) ** 2 && hit(e, o.dmg, { kind: 'm', a, kb: o.kb, heavy: o.heavy }) > 0) n++;
  }
  for (const b of G.bullets) {
    if (b.team !== 'e' || b.dead || b.beam) continue;
    const s = clamp((b.x - x) * ca + (b.y - y) * sa, 0, len);
    if (d2(x + ca * s, y + sa * s, b.x, b.y) < (hw + b.r + 2) ** 2) { pReflect(b); rf++; }
  }
  if (rf) { AU.reflect(); gainChroma(rf * 2); }
  hurtTile(Math.floor((x + ca * (len + 2)) / T), Math.floor((y + sa * (len + 2)) / T), o.dmg);
  const col = o.ghost ? C.lt : o.col || (lit() ? hue(G.t * 500) : C.white);
  G.fx.push({ k: 'thrust', a, off, len, x, y, t: 0, life: 0.12, col, u: f => { f.x = P.x - Math.sin(f.a) * f.off; f.y = P.y + 1 + Math.cos(f.a) * f.off; }, d: drawThrust });
  return n;
}
function drawThrust(f, k) {
  const ext = Math.min(1, k / 0.35), tail = k > 0.45 ? (k - 0.45) / 0.55 : 0, ca = Math.cos(f.a), sa = Math.sin(f.a);
  const s0 = 4 + f.len * tail * 0.9, s1 = 4 + (f.len - 4) * ext;
  if (s1 <= s0) return;
  const x0 = f.x + ca * s0, y0 = f.y + sa * s0, x1 = f.x + ca * s1, y1 = f.y + sa * s1;
  pline(x0, y0, x1, y1, C.ink, 4); pline(x0, y0, x1, y1, f.col, 2);
  pc(x1, y1, 2, C.ink); pc(x1, y1, 1, f.col);
}
/* spin: a 360° cut around the player that reflects every enemy bullet in reach */
function pSpin(a, R, dmg, ghost, col0) {
  const col = ghost ? C.lt : col0 || (lit() ? hue(G.t * 500) : C.white);
  G.fx.push({ k: 'spin', x: P.x, y: P.y, a: a + Math.PI, arc: TAU, r: R, t: 0, life: 0.2, dir: 1, col, fin: false, u: f => { f.x = P.x; f.y = P.y; }, d: drawSwing });
  let n = 0, rf = 0;
  for (const e of G.enemies) { if (e.dead) continue; if (Math.hypot(e.x - P.x, e.y - P.y) < R + e.r && hit(e, dmg, { kind: 'm', a: Math.atan2(e.y - P.y, e.x - P.x), kb: 120 }) > 0) n++; }
  for (const b of G.bullets) { if (b.team !== 'e' || b.dead || b.beam) continue; if (d2(b.x, b.y, P.x, P.y) < (R + 4) ** 2) { pReflect(b); rf++; } }
  if (rf) { AU.reflect(); gainChroma(rf * 2); }
  for (let k = 0; k < 8; k++) { const aa = k / 8 * TAU; hurtTile(Math.floor((P.x + Math.cos(aa) * R * 0.8) / T), Math.floor((P.y + Math.sin(aa) * R * 0.8) / T), dmg); }
  if (n) AU.slash();
  return n;
}
/* expanding ring that pierces everything it sweeps over (scythe multishot) */
function pRing(x, y, r0, r1, dmg, ghost) {
  G.fx.push({ k: 'sring', x, y, r0, r1, r: r0, t: 0, life: 0.32, dmg, g: ghost, hs: new Set(),
    u: f => {
      f.r = lerp(f.r0, f.r1, 1 - (1 - Math.min(1, f.t / f.life)) ** 2);
      for (const e of G.enemies) { if (e.dead || f.hs.has(e)) continue; const dd = Math.hypot(e.x - f.x, e.y - f.y); if (dd < f.r + e.r && dd > f.r - 10 - e.r) { f.hs.add(e); hit(e, f.dmg, { kind: 'm', a: Math.atan2(e.y - f.y, e.x - f.x), kb: 90 }); } }
    },
    d: (f, k) => { const w = Math.max(1, Math.round(3 * (1 - k))); pring(f.x, f.y, f.r + 1, C.ink, w + 1); pring(f.x, f.y, f.r, f.g ? C.lt : C.white, w); } });
}
/* stylus: thin continuous beam segment, redrawn every tick */
function stylusGeo(a) { const m = muzzlePos(a, 13), len = rayWall(m.x, m.y, a, 170); return { x0: m.x, y0: m.y, x1: m.x + Math.cos(a) * len, y1: m.y + Math.sin(a) * len, len }; }
function pStylus(a, da, dmg, ghost, ramp, sy) {
  const aa = a + da, sg = stylusGeo(aa), ca = Math.cos(aa), sa = Math.sin(aa), hs = new Set();
  for (const e of G.enemies) {
    if (e.dead) continue;
    const s = clamp((e.x - sg.x0) * ca + (e.y - sg.y0) * sa, 0, sg.len);
    if (d2(sg.x0 + ca * s, sg.y0 + sa * s, e.x, e.y) < (3 + e.r) ** 2) { hit(e, dmg, { kind: 'beam', a: aa, kb: 18 }); hs.add(e); }
  }
  if (sy) for (const e of hs) { const e2 = nearFoe(e.x, e.y, 70, hs); if (e2) { zapFx(e.x, e.y, e2.x, e2.y, ghost ? C.lt : C.cyan); hit(e2, dmg * 0.7, { kind: 'zap', a: angTo(e, e2), kb: 20 }); } break; }
  if (sg.len < 170) hurtTile(Math.floor((sg.x1 + ca * 3) / T), Math.floor((sg.y1 + sa * 3) / T), dmg);
  G.fx.push(Object.assign({ k: 'stylus', da, g: ghost, ramp, sy, t: 0, life: 0.09, u: f => Object.assign(f, stylusGeo(P.aim + f.da)), d: drawStylus }, sg));
}
function drawStylus(f) {
  const dx = f.x1 - f.x0, dy = f.y1 - f.y0, L = Math.max(1, Math.hypot(dx, dy)), px = -dy / L, py = dx / L, col = f.g ? C.lt : C.white;
  pline(f.x0, f.y0, f.x1, f.y1, C.ink, 3);
  const n = Math.max(2, Math.ceil(L / 8));
  let lx = f.x0, ly = f.y0;
  for (let s = 1; s <= n; s++) { const j = s < n ? rand(-1, 1) : 0, nx = f.x0 + dx * s / n + px * j, ny = f.y0 + dy * s / n + py * j; pline(lx, ly, nx, ny, col, 1); lx = nx; ly = ny; }
  if (!f.g) for (let q = 0; q < 2 + f.ramp * 3; q++) { const u = Math.random(), j = rand(-1.5, 1.5); prect(f.x0 + dx * u + px * j, f.y0 + dy * u + py * j, 1, 1, f.sy && q % 2 ? C.gold : C.cyan); }
  pc(f.x1, f.y1, 2, C.ink); pc(f.x1, f.y1, 1, col);
}
/* rune mine: slides to a stop, arms, blows up whatever steps close */
function pSeal(x, y, tx, ty, dmg, ghost, sy, mini) {
  const dd = Math.hypot(tx - x, ty - y), a = Math.atan2(ty - y, tx - x), fuse = mini ? 2.5 : 8;
  G.fx.push({ k: 'seal', x, y, r: 3, vx: Math.cos(a) * dd * 7, vy: Math.sin(a) * dd * 7, t: 0, life: fuse + 0.1, fuse, born: G.t, dmg, g: ghost, sy, mini, armed: false, u: sealU, d: drawSeal });
}
function sealU(f, dt) {
  if (f.dead) return;
  const k = Math.exp(-dt * 7); f.vx *= k; f.vy *= k;
  if (Math.abs(f.vx) + Math.abs(f.vy) > 3) { const h = moveBody(f, f.vx * dt, f.vy * dt); if (h) { if (h.hx) f.vx = 0; if (h.hy) f.vy = 0; } } else f.vx = f.vy = 0;
  if (f.t >= (f.mini ? 0.3 : 0.4) && !f.armed) { f.armed = true; pSnd('seal-arm', 0.05, () => AU.tone('sine', 1250, 1250, 0.05, 0.03)); }
  if (f.armed) for (const e of G.enemies) if (!e.dead && !e.inv && !e.hide && d2(e.x, e.y, f.x, f.y) < (24 + e.r) ** 2) { sealBoom(f); return; }
  if (f.t >= f.fuse) sealBoom(f);
}
function sealBoom(f) {
  if (f.dead) return; f.dead = true;
  const r = 34 * S.size * (f.mini ? 0.55 : 1);
  blast(f.x, f.y, r, f.dmg, { quiet: true });
  if (f.sy && !f.mini) for (let i = 0; i < 3; i++) { const a = rand(TAU), d = rand(26, 46); pSeal(f.x, f.y, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, f.dmg * 0.4, f.g, false, true); }
  G.fx.push({ k: 'sealfx', x: f.x, y: f.y, r, t: 0, life: 0.36, g: f.g, d: drawSealFx });
  for (let i = 0; i < 10; i++) { const a = rand(TAU), s = rand(40, 130); part(f.x, f.y, Math.cos(a) * s, Math.sin(a) * s, rand(0.3, 0.6), i < 3 && !f.g ? C.red : C.ink, randi(1, 2), { drag: 0.86 }); }
  splat(f.x, f.y, 5, f.g ? 'rgba(18,18,22,0.2)' : 'rgba(18,18,22,0.34)');
  pSnd('seal', 0.06, () => { AU.tone('sine', 120, 45, 0.25, 0.28); AU.nz(0.16, 0.18, { brown: true, type: 'lowpass', f: 900, f2: 180 }); });
}
// a stone disc with a red rune; it blinks while arming and again just before its fuse runs out
function drawSeal(f) {
  const x = Math.round(f.x), y = Math.round(f.y);
  shadow(x, y + 4, 4);
  const blink = !f.armed ? ((f.t * 16) | 0) % 2 : f.t > 7 ? ((f.t * 12) | 0) % 2 : 0, rc = f.g ? C.lt : blink ? C.redDk : C.red;
  if (f.mini) { pc(x, y, 2, f.g ? C.lt : C.gold); pc(x, y, 1, rc); return; }
  pc(x, y, 3, f.sy && !f.g ? C.gold : C.ink); pc(x, y, 2, C.dk);
  pline(x - 2, y, x, y - 2, rc); pline(x, y - 2, x + 2, y, rc); pline(x + 2, y, x, y + 2, rc); pline(x, y + 2, x - 2, y, rc); prect(x, y, 1, 1, rc);
  if (f.armed && !f.g && (f.t % 1) < 0.12) pring(x, y, 6, C.red, 1);
}
// the blast: an expanding rune circle with ticks around its rim
function drawSealFx(f, k) {
  const h = Math.round(f.r * 0.85 * (0.35 + 0.65 * Math.sqrt(k))), w = Math.max(1, Math.round(4 * (1 - k))), col = f.g ? C.lt : C.red;
  if (k < 0.12) pc(f.x, f.y, h * 0.5, col);
  pring(f.x, f.y, h + 1, C.ink, w + 2); pring(f.x, f.y, h, col, w);
  if (k < 0.6 && h > 8) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + k * 2, ca = Math.cos(a), sa = Math.sin(a); pline(f.x + ca * (h - 6), f.y + sa * (h - 6), f.x + ca * (h - 3), f.y + sa * (h - 3), col, 1); }
}
/* inferno tome: the traced path is a chain of fire runes; release ignites it */
function strokeAdd(st, x, y, maxL) {
  let q = st.pts[st.pts.length - 1], dx = x - q.x, dy = y - q.y, d = Math.hypot(dx, dy);
  while (d >= 6 && st.len < maxL) {
    q = { x: q.x + dx / d * 6, y: q.y + dy / d * 6 }; st.pts.push(q); st.len += 6;
    dx = x - q.x; dy = y - q.y; d = Math.hypot(dx, dy);
  }
}
function drawRunes(pts, from, col) {
  for (let j = from; j < pts.length; j++) {
    const x = Math.round(pts[j].x), y = Math.round(pts[j].y), s = j % 3;
    pc(x, y, 2, C.ink);
    if (s === 0) { prect(x - 1, y, 3, 1, col); prect(x, y - 1, 1, 3, col); }
    else if (s === 1) { prect(x - 1, y - 1, 1, 1, col); prect(x + 1, y - 1, 1, 1, col); prect(x, y, 1, 1, col); prect(x - 1, y + 1, 1, 1, col); prect(x + 1, y + 1, 1, 1, col); }
    else { prect(x, y - 1, 1, 1, col); prect(x - 1, y, 1, 2, col); prect(x + 1, y, 1, 2, col); }
  }
}
function brushBlast(x, y, r, dmg, hs, g, cap, sy) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    const n = hs.get(e) || 0;
    if (n >= cap || d2(x, y, e.x, e.y) > (r + e.r) ** 2) continue;
    if (hit(e, dmg, { kind: 'blast', a: Math.atan2(e.y - y, e.x - x), kb: 70 }) > 0) hs.set(e, n + 1);
  }
  hurtTile(Math.floor(x / T), Math.floor(y / T), dmg);
  burst(x, y, 5, g ? C.lt : C.fire, 70, 0.3, 1);
  ringFx(x, y, 2, r, 0.22, g ? C.lt : sy ? C.gold : C.fire, 1); if (sy && !g) burst(x, y, 3, C.gold, 60, 0.3);
  pSnd('brush-b', 0.05, () => AU.nz(0.07, 0.07, { f: rand(700, 1100), f2: 300, q: 0.8 }));
}

/* ---------- per-bullet hooks (b.upd / b.onHit / b.onEnd / b.draw) ---------- */
function splitUpd(b) { if (b.t >= 0.3) b.dead = true; }
function splitHit(b, e) { b.hitE = e; }
function splitEnd(b) {
  if (b.splitDone || (!b.hitE && b.t < 0.3)) return; // a wall before 0.3s just ends it
  b.splitDone = true;
  const n = 3 + S.multi + (b.sy ? 2 : 0), a = Math.atan2(b.vy, b.vx);
  for (let i = 0; i < n; i++) { const f = pShot(b.x, b.y, a - 0.5 + i / (n - 1), 280, 3 * b.pw, { r: 1.5, life: 0.4, kb: 30, ghost: b.ghost, col: b.sy ? C.gold : undefined }); if (b.hitE) f.hitSet = new Set([b.hitE.parent || b.hitE]); if (b.sy) f.onHit = fragSplit; }
  burst(b.x, b.y, 4, b.ghost ? C.lt : C.white, 70, 0.2); AU.pop();
}
function ricoUpd(b) { // +20% per wall bounce (main.js counts them in b.bounced)
  const nb = Math.min(3, b.bounced || 0);
  if (nb > b.nb) { b.nb = nb; b.dmg = b.base * 1.2 ** nb; AU.tink(); if (b.sy) { b.home = 9; b.col = C.cyan; } }
  if (b.sy && b.nb && Math.random() < 0.5) part(b.x, b.y, 0, 0, 0.25, C.cyan, 1);
}
function drawShard(b) {
  const x = Math.round(b.x), y = Math.round(b.y), a = Math.atan2(b.vy, b.vx), ca = Math.cos(a), sa = Math.sin(a), r = Math.max(1, Math.round(b.r));
  pline(x - ca * 5, y - sa * 5, x + ca * 2, y + sa * 2, C.ink, r + 2);
  pline(x - ca * 4, y - sa * 4, x + ca, y + sa, pbCol(b), r);
  if (b.nb && !b.ghost) prect(x, y, 1, 1, C.cyan);
}
function flameUpd(b, dt) {
  b.r = 3 + b.t * 12;
  const k = Math.exp(-dt * 2.5); b.vx *= k; b.vy *= k;
  if (solidShot(b.x + b.vx * dt * 1.5, b.y + b.vy * dt * 1.5)) { b.dead = true; part(b.x, b.y, 0, -20, 0.3, C.dk, 2); return; } // fizzle quietly against walls
  if (Math.random() < 0.15) part(b.x, b.y, rand(-10, 10), rand(-30, -10), 0.3, pick([C.fire, C.ink]), 1, { drag: 0.9 });
}
function flameHit(b, e) {
  if (e.dead) return;
  if (!e.burn) AU.burn();
  e.burn = 3; e.burnD = Math.max(e.burnD || 0, 6 * S.dmg * FL());
  if (b.frost && !e.dead) { // frostfire: double chill, and a frozen foe sprays frost shards
    chillE(e, 1);
    if (e.frozen > 0 && !b.sprayed) { b.sprayed = true; for (let i = 0; i < 2; i++) { const s = pShot(e.x, e.y, rand(TAU), 220, 3 * b.pw, { r: 1.5, life: 0.3, kb: 30, ghost: b.ghost, col: C.frost }); s.hitSet = new Set([e.parent || e]); } }
  }
}
function drawFlame(b) {
  const x = Math.round(b.x), y = Math.round(b.y), r = Math.round(b.r), k = b.t / b.max, fl = ((G.t * 30 + b.seed) | 0) % 2;
  if (b.ghost) { pc(x, y, r, C.lt); return; }
  if (k < 0.55) { pc(x, y, r + 1, C.ink); pc(x, y, r, fl ? (b.frost ? C.frost : C.fire) : C.ink); pc(x, y, Math.max(0, r - 2), k < 0.25 ? C.white : b.frost && !fl ? C.frost : C.fire); }
  else if (fl) pc(x, y - Math.round((k - 0.55) * 8), Math.max(1, r * (1.2 - k)), C.ink);
  else pc(x, y, Math.max(1, r * (1.1 - k)), C.dk);
}
function wispUpd(b, dt) {
  (b.tr || (b.tr = [])).push({ x: b.x, y: b.y }); if (b.tr.length > 4) b.tr.shift();
  if (b.t < b.orbT) {
    b.oa += dt * 10; const R = (b.sy ? 22 : 12) + Math.min(b.t, 0.4) * 10;
    if (b.sy) for (const q of G.bullets) if (q.team === 'e' && !q.dead && !q.beam && d2(q.x, q.y, b.x, b.y) < (q.r + b.r + 2) ** 2) { q.dead = true; burst(q.x, q.y, 2, C.gold, 50, 0.2); }
    b.x = P.x + Math.cos(b.oa) * R; b.y = P.y - 2 + Math.sin(b.oa) * R * 0.85;
    b.vx = -Math.sin(b.oa) * R * 10; b.vy = Math.cos(b.oa) * R * 8.5;
  } else if (!b.home) {
    const a = P.aim + b.lo; b.home = 6; b.noWall = false; b.vx = Math.cos(a) * 190; b.vy = Math.sin(a) * 190;
  }
}
function drawWisp(b) {
  const x = Math.round(b.x), y = Math.round(b.y);
  if (b.tr) b.tr.forEach((q, i) => pc(q.x, q.y, i > 1 ? 2 : 1, i > 1 ? C.mid : C.dk)); // a smoky tail
  pc(x, y, 3, C.ink); pc(x, y, 2, b.ghost ? C.lt : b.sy ? C.gold : C.white); prect(x - 1, y - 1, 1, 1, C.ink); prect(x + 1, y - 1, 1, 1, C.ink); // a little soul with hollow eyes
}
function dartHit(b, e) {
  G.fx.push({ k: 'dart', e, ox: (b.x - e.x) * 0.6, oy: (b.y - e.y) * 0.6, a: Math.atan2(b.vy, b.vx), x: b.x, y: b.y, t: 0, life: 0.9, g: b.ghost, p: b.pw, sy: b.sy, bt: 0.15,
    u: (f, dt) => {
      if (!f.e.dead) { f.x = f.e.x + f.ox; f.y = f.e.y + f.oy; if (f.sy && (f.bt -= dt) <= 0) { f.bt = 0.3; hit(f.e, 1.5 * f.p, { kind: 'dot', noProc: true }); part(f.x, f.y, rand(-10, 10), rand(5, 20), 0.4, C.red, 1, { drag: 0.9 }); } }
      if (f.t >= f.life && !f.done) { const r = f.sy ? 18 : 12; f.done = true; blast(f.x, f.y, r, 8 * f.p, { quiet: true }); ringFx(f.x, f.y, 2, r, 0.18, f.g ? C.lt : f.sy ? C.red : C.white, 1); burst(f.x, f.y, 4, C.ink, 70, 0.25); AU.pop(); }
    },
    d: (f, k) => { const ca = Math.cos(f.a), sa = Math.sin(f.a); pline(f.x, f.y, f.x - ca * 4, f.y - sa * 4, C.ink, 2); pline(f.x, f.y, f.x - ca * 3, f.y - sa * 3, f.g ? C.lt : C.dk, 1); if (k > 0.6 && ((f.t * 20) | 0) % 2) pc(f.x, f.y, 1, f.g ? C.lt : C.white); } });
}
function drawDart(b) {
  const x = Math.round(b.x), y = Math.round(b.y), a = Math.atan2(b.vy, b.vx), ca = Math.cos(a), sa = Math.sin(a);
  pline(x + ca, y + sa, x - ca * 5, y - sa * 5, C.ink, 2); pline(x, y, x - ca * 3, y - sa * 3, pbCol(b), 1); pline(x - ca * 4, y - sa * 4, x - ca * 5, y - sa * 5, C.dk, 1); // blade + grip
  prect(x - ca * 3 - sa * 1.5, y - sa * 3 + ca * 1.5, 1, 1, C.ink); prect(x - ca * 3 + sa * 1.5, y - sa * 3 - ca * 1.5, 1, 1, C.ink); // crossguard
}

/* ---------- weapon synergies (武器联动) + new weapon shapes ---------- */
// a weapon's signature synergy is live while you hold it AND own its glyph
const wsyn = w => !!(w && G.gl[WEAPONS[w.id].syn.g]);
function nearFoe(x, y, r, skip) {
  let best = null, bd = r * r;
  for (const e of G.enemies) { if (e.dead || e.inv || e.hide || e.spawnT > 0 || (skip && skip.has(e))) continue; const dd = d2(x, y, e.x, e.y); if (dd < bd) { bd = dd; best = e; } }
  return best;
}
function zapFx(x0, y0, x1, y1, col) {
  G.fx.push({ k: 'pzap', x0, y0, x1, y1, col, t: 0, life: 0.14, d: f => { let px = f.x0, py = f.y0; for (let s = 1; s <= 5; s++) { const nx = lerp(f.x0, f.x1, s / 5) + (s < 5 ? rand(-4, 4) : 0), ny = lerp(f.y0, f.y1, s / 5) + (s < 5 ? rand(-4, 4) : 0); pline(px, py, nx, ny, f.col, 2); pline(px, py, nx, ny, C.white, 1); px = nx; py = ny; } } });
}
// daze: a normal foe loses its turn for a moment, a boss opens up (+50% damage while stunned)
function daze(e, t) {
  if (e.dead) return;
  if (e.boss) e.stun = Math.max(e.stun || 0, t * 0.5); else e.frozen = Math.max(e.frozen || 0, t);
  for (let i = 0; i < 3; i++) part(e.x + rand(-5, 5), e.y - e.r - 4, rand(-20, 20), rand(-30, -10), 0.5, C.gold, 1);
}
function fissures(x, y, L, dmg, g) {
  const a0 = rand(TAU), hs = new Set(), lines = [];
  for (let i = 0; i < 8; i++) {
    const a = a0 + i / 8 * TAU, ca = Math.cos(a), sa = Math.sin(a), len = Math.min(L, rayWall(x, y, a, L)); lines.push({ a, len });
    for (const e of G.enemies) { if (e.dead || hs.has(e)) continue; const s = clamp((e.x - x) * ca + (e.y - y) * sa, 0, len); if (d2(x + ca * s, y + sa * s, e.x, e.y) < (4 + e.r) ** 2) { hs.add(e); hit(e, dmg, { kind: 'blast', a, kb: 90 }); } }
  }
  G.fx.push({ k: 'fissure', x, y, lines, g, t: 0, life: 0.5, d: (f, k) => { for (const l of f.lines) { const e = l.len * Math.min(1, k * 3), ex = f.x + Math.cos(l.a) * e, ey = f.y + Math.sin(l.a) * e; pline(f.x, f.y, ex, ey, C.ink, 3); if (k < 0.75) pline(f.x, f.y, ex, ey, f.g ? C.lt : C.gold, 1); } } });
}
// a beam that ends on a wall splits into two golden beams bouncing back off it
function refract(ex, ey, a, w, dmg, g) {
  const ca = Math.cos(a), sa = Math.sin(a), hx = solidShot(ex + ca * 4, ey), hy = solidShot(ex, ey + sa * 4);
  if (!hx && !hy) return;
  const ra = Math.atan2(hy ? -sa : sa, hx ? -ca : ca);
  for (const s of [-0.22, 0.22]) beam(ex - ca * 3, ey - sa * 3, ra + s, w, dmg, g, C.gold);
}
function inkFire(x, y, r, p, g) {
  G.fx.push({ k: 'pyre', x, y, r, p, g, t: 0, life: 3, tick: 0,
    u: (f, dt) => {
      f.tick -= dt;
      if (f.tick <= 0) { f.tick = 0.3; for (const e of G.enemies) if (!e.dead && d2(f.x, f.y, e.x, e.y) < (f.r + e.r) ** 2) { hit(e, 3 * f.p, { kind: 'dot', noProc: true }); if (!e.dead) { e.burn = Math.max(e.burn || 0, 1.5); e.burnD = Math.max(e.burnD || 0, 5 * S.dmg * FL()); } } }
      if (Math.random() < 0.6) part(f.x + rand(-f.r, f.r) * 0.8, f.y + rand(-f.r, f.r) * 0.6, 0, -rand(15, 35), 0.4, f.g ? C.lt : pick([C.fire, C.fire, C.ink]), 1, { drag: 0.95 });
    },
    d: (f, k) => { const al = k > 0.8 ? (1 - k) * 5 : 1; pc(f.x, f.y + 1, f.r * 0.8, f.g ? `rgba(167,166,160,${0.2 * al})` : `rgba(255,138,42,${0.22 * al})`); if (((f.t * 12) | 0) % 2) pring(f.x, f.y, f.r * 0.8, f.g ? C.lt : C.fire, 1); } });
}
function potEnd(b) { inkFire(b.x, b.y, 24 * S.size, b.pw, b.ghost); }
function orbChak(dmg) {
  const own = G.fx.filter(f => f.k === 'orbch' && !f.dead); if (own.length >= 3) own[0].dead = true;
  G.fx.push({ k: 'orbch', a0: rand(TAU), x: P.x, y: P.y, t: 0, life: 2.5, dmg, hs: new Map(),
    u: f => {
      const a = f.a0 + f.t * 5; f.x = P.x + Math.cos(a) * 26 * S.size; f.y = P.y - 2 + Math.sin(a) * 22 * S.size;
      for (const b of G.bullets) if (b.team === 'e' && !b.dead && !b.beam && d2(b.x, b.y, f.x, f.y) < (b.r + 5) ** 2) { b.dead = true; sparks(b.x, b.y, a, 3, C.gold, 90); }
      for (const e of G.enemies) { if (e.dead || d2(e.x, e.y, f.x, f.y) > (e.r + 6) ** 2 || G.t - (f.hs.get(e) ?? -9) < 0.25) continue; f.hs.set(e, G.t); hit(e, f.dmg, { kind: 'm', a: angTo(P, e), kb: 60 }); }
    },
    d: (f, k) => { if (k > 0.85 && ((f.t * 20) | 0) % 2) return; const x = Math.round(f.x), y = Math.round(f.y); pc(x, y, 5, C.ink); pc(x, y, 4, C.gold); pc(x, y, 2, C.ink); } });
}
function hawkHit(b, e) {
  if (b.split2) return; b.split2 = true;
  const a = Math.atan2(b.vy, b.vx);
  for (let i = -1; i <= 1; i++) { const s = pShot(b.x, b.y, a + i * 0.28, 420, b.dmg * 0.5, { kind: 'arrow', r: 2, pierce: 1, crit: true, life: 0.6, kb: 60, ghost: b.ghost }); s.hitSet = new Set([e.parent || e]); }
  sparks(b.x, b.y, a, 6, C.gold, 160, 0.5);
}
function goldRico(b, e) {
  if (!(b.rc > 0)) return;
  const skip = new Set(b.hitSet || []); skip.add(e); if (e.parent) skip.add(e.parent);
  const n = nearFoe(b.x, b.y, 150, skip); if (!n) return;
  const a = angTo(b, n), sp = Math.hypot(b.vx, b.vy);
  b.rc--; b.pierce = Math.max(b.pierce, 1); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.life = Math.max(b.life, 0.5);
  sparks(b.x, b.y, a, 5, C.gold, 150, 0.4); AU.tink();
}
function rodHit(b, e) { if (!e.dead && Math.random() < 0.15) chain(e, b.dmg * S.dmg * 0.8, 2, 1); }
function fragSplit(b, e) {
  if (b.split2) return; b.split2 = true;
  const a = Math.atan2(b.vy, b.vx);
  for (const s of [-0.6, 0.6]) { const f = pShot(b.x, b.y, a + s, 240, b.dmg * 0.6, { r: 1, life: 0.25, kb: 20, ghost: b.ghost, col: C.gold }); f.hitSet = new Set([e.parent || e]); }
}
/* whip: a curved lash; the last 30% is a sweet spot that always crits */
function pLash(a, L, dmg, tip, dir, g, sy) {
  L = Math.min(L, rayWall(P.x, P.y, a, L) + 4);
  const ca = Math.cos(a), sa = Math.sin(a), pts = [];
  for (let i = 0; i <= 10; i++) { const s = i / 10, o = Math.sin(s * Math.PI) * 7 * dir; pts.push({ x: ca * s * L - sa * o, y: sa * s * L + ca * o, s }); }
  for (const e of G.enemies) {
    if (e.dead) continue;
    let bs = -1, bd = (4 + e.r) ** 2;
    for (const q of pts) { const dd = d2(P.x + q.x, P.y + q.y, e.x, e.y); if (dd < bd) { bd = dd; bs = q.s; } }
    if (bs < 0) continue;
    const isTip = bs >= 0.7, ea = Math.atan2(e.y - P.y, e.x - P.x), low = e.hp < e.maxHp * 0.3;
    if (isTip && sy && low && !e.boss) { hit(e, e.hp + 1, { kind: 'm', raw: true, crit: true, a: ea, kb: 140 }); xMark(e.x, e.y); continue; }
    if (hit(e, isTip ? tip * (sy && low ? 2 : 1) : dmg, { kind: 'm', a: ea, kb: isTip ? 130 : 50, crit: isTip }) > 0 && isTip) sparks(e.x, e.y, ea, 5, C.gold, 170, 0.5);
  }
  const q = pts[10]; hurtTile(Math.floor((P.x + q.x) / T), Math.floor((P.y + q.y) / T), tip);
  G.fx.push({ k: 'lash', pts, g, sy, t: 0, life: 0.18, d: drawLash });
}
function drawLash(f, k) { // an iron chain: dark core with bright links
  const n = Math.max(1, Math.round(Math.min(1, k / 0.45) * 10)), col = f.g ? C.lt : C.white;
  for (let i = 0; i < n; i++) { const a = f.pts[i], b = f.pts[i + 1]; pline(P.x + a.x, P.y + a.y, P.x + b.x, P.y + b.y, C.ink, i > 7 ? 2 : 3); }
  for (let i = 0; i < n; i++) { const a = f.pts[i], b = f.pts[i + 1]; pline(P.x + a.x, P.y + a.y, P.x + b.x, P.y + b.y, C.mid, 1); pline(P.x + a.x, P.y + a.y, P.x + b.x, P.y + b.y, col, 1, 2, i * 3); }
  if (k > 0.4 && k < 0.7) { const q = f.pts[10], x = P.x + q.x, y = P.y + q.y, c2 = f.g ? C.lt : f.sy ? C.gold : C.white; prect(x - 3, y, 7, 1, c2); prect(x, y - 3, 1, 7, c2); }
}
function xMark(x, y) { G.fx.push({ k: 'xmark', x, y, t: 0, life: 0.35, d: (f, k) => { const s = 5 + k * 3; for (const [c, w] of [[C.ink, 3], [C.gold, 1]]) { pline(f.x - s, f.y - s, f.x + s, f.y + s, c, w); pline(f.x - s, f.y + s, f.x + s, f.y - s, c, w); } } }); }
/* fan: a wide gust — light damage, a big shove, enemy bullets blown off course */
function pGust(a, R, half, dmg, g) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    const ea = Math.atan2(e.y - P.y, e.x - P.x);
    if (d2(e.x, e.y, P.x, P.y) < (R + e.r) ** 2 && Math.abs(angDiff(a, ea)) < half + 0.12) hit(e, dmg, { kind: 'm', a: ea, kb: 340 });
  }
  let nb = 0;
  for (const b of G.bullets) {
    if (b.team !== 'e' || b.dead || b.beam) continue;
    const ba = Math.atan2(b.y - P.y, b.x - P.x);
    if (d2(b.x, b.y, P.x, P.y) > (R + 8) ** 2 || Math.abs(angDiff(a, ba)) > half + 0.2) continue;
    const sp = Math.max(170, Math.hypot(b.vx, b.vy) * 1.3); b.vx = Math.cos(ba) * sp; b.vy = Math.sin(ba) * sp; b.turn = 0; b.acc = 0; b.grav = 0; b.curve = 0; nb++;
  }
  if (nb) { AU.reflect(); gainChroma(nb); }
  G.fx.push({ k: 'gust', a, R, half, g, t: 0, life: 0.24, sd: rand(10), d: drawGust });
}
function drawGust(f, k) {
  const col = f.g ? C.lt : C.white;
  for (let i = 0; i < 7; i++) {
    const an = f.a - f.half + (i + 0.5) / 7 * f.half * 2 + Math.sin(f.sd + i) * 0.05, r0 = f.R * (0.2 + 0.55 * k + 0.08 * Math.sin(f.sd * 3 + i)), r1 = r0 + f.R * 0.3 * (1 - k * 0.5);
    const x0 = P.x + Math.cos(an) * r0, y0 = P.y + Math.sin(an) * r0, x1 = P.x + Math.cos(an + 0.08) * r1, y1 = P.y + Math.sin(an + 0.08) * r1;
    pline(x0, y0, x1, y1, C.ink, 2); pline(x0, y0, x1, y1, col, 1);
  }
  parc(P.x, P.y, f.R * (0.4 + 0.6 * k), f.a - f.half, f.a + f.half, k < 0.5 ? col : C.lt, 1);
}
function pWhirl(a, dmg) {
  G.fx.push({ k: 'whirl', x: P.x + Math.cos(a) * 14, y: P.y + Math.sin(a) * 14, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, t: 0, life: 1.5, tick: 0, dmg,
    u: (f, dt) => {
      const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt; if (solidShot(nx, ny)) { f.vx *= -0.4; f.vy *= -0.4; } else { f.x = nx; f.y = ny; }
      for (const e of G.enemies) { if (e.dead || e.boss || e.anchored) continue; const dx = f.x - e.x, dy = f.y - e.y, dd = Math.hypot(dx, dy); if (dd < 64 && dd > 3) { e.kx += dx / dd * 380 * dt; e.ky += dy / dd * 380 * dt; } }
      for (const b of G.bullets) if (b.team === 'e' && !b.dead && !b.beam && d2(b.x, b.y, f.x, f.y) < 22 * 22) { b.dead = true; burst(b.x, b.y, 2, C.white, 50, 0.2); }
      f.tick -= dt; if (f.tick <= 0) { f.tick = 0.2; for (const e of G.enemies) if (!e.dead && d2(e.x, e.y, f.x, f.y) < (18 + e.r) ** 2) hit(e, f.dmg, { kind: 'm', a: rand(TAU), kb: 20 }); }
      if (Math.random() < 0.5) { const an = rand(TAU); part(f.x + Math.cos(an) * 16, f.y + Math.sin(an) * 16, -Math.sin(an) * 90, Math.cos(an) * 90, 0.25, pick([C.lt, C.ink]), 1, { drag: 0.9 }); }
    },
    d: f => { const s = f.t * 14; for (let j = 0; j < 3; j++) { const r = 6 + j * 5; parc(f.x, f.y - j * 2, r, s + j, s + j + 3.6, C.ink, 2); parc(f.x, f.y - j * 2, r, s + j + 0.2, s + j + 3.4, j === 1 ? C.gold : C.white, 1); } } });
}
/* bomb chain: a fused string of small bombs flies to the cursor, lies down along the throw and goes off end to end */
function crackerThrow(tx, ty, a, n, p, g, sy) {
  G.fx.push({ k: 'cracker', x0: P.x, y0: P.y, tx, ty, t: 0, life: 0.3, g,
    u: f => {
      if (f.t < f.life || f.done) return; f.done = true;
      const ca = Math.cos(a), sa = Math.sin(a), pts = [], r = (sy ? 17 : 12) * S.size;
      for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 9, q = { x: tx + ca * o, y: ty + sa * o }; pts.push(q); later(0.06 * i, () => crackerPop(q.x, q.y, r, 7 * p, g)); }
      G.fx.push({ k: 'crstr', pts, g, t: 0, life: 0.06 * n + 0.05, d: drawBombChain });
      if (sy) later(0.06 * n + 0.08, () => {
        const R = 34 * S.size; blast(tx, ty, R, 20 * p, { quiet: true });
        ringFx(tx, ty, 4, R, 0.35, g ? C.lt : C.gold, 3); ringFx(tx, ty, 2, R + 4, 0.4, C.ink, 1); burst(tx, ty, 14, g ? C.lt : C.gold, 160, 0.45, 2);
        shake(0.1); pSnd('finale', 0.1, () => { AU.nz(0.3, 0.22, { brown: true, type: 'lowpass', f: 1200, f2: 160 }); AU.tone('sine', 140, 50, 0.3, 0.25); });
      });
    },
    d: (f, k) => { const x = lerp(f.x0, f.tx, k), y = lerp(f.y0, f.ty, k) - 60 * k * (1 - k); for (const o of [-3, 0, 3]) { pc(x + o, y, 2, C.ink); prect(x + o - 1, y - 1, 1, 1, f.g ? C.lt : C.mid); } if (((f.t * 30) | 0) % 2) prect(x + 5, y - 2, 1, 1, f.g ? C.lt : C.fire); } });
}
function drawBombChain(s) {
  const i0 = Math.floor(s.t / 0.06), q0 = s.pts[i0];
  for (let i = i0; i < s.pts.length - 1; i++) pline(s.pts[i].x, s.pts[i].y, s.pts[i + 1].x, s.pts[i + 1].y, C.dk, 1); // the fuse
  for (let i = i0; i < s.pts.length; i++) { const q = s.pts[i]; pc(q.x, q.y, 2, C.ink); prect(q.x - 1, q.y - 1, 1, 1, s.g ? C.lt : C.mid); }
  if (q0 && ((s.t * 30) | 0) % 2) prect(q0.x + 1, q0.y - 3, 1, 1, s.g ? C.lt : C.fire); // the spark running down it
}
function crackerPop(x, y, r, dmg, g) {
  blast(x, y, r, dmg, { quiet: true });
  ringFx(x, y, 2, r, 0.14, g ? C.lt : C.white, 1);
  for (let i = 0; i < 5; i++) { const a = rand(TAU), s = rand(40, 120); part(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.25, 0.5), g ? C.lt : pick([C.fire, C.fire, C.white, C.ink]), 1, { drag: 0.86 }); }
  decalDot(x, y, 1.5, g ? 'rgba(18,18,22,0.2)' : 'rgba(18,18,22,0.34)');
  pSnd('pop', 0.035, () => { AU.nz(0.07, 0.13, { f: rand(800, 1300), q: 0.9 }); AU.tone('sine', 220, 70, 0.08, 0.12); });
}
/* war horn: an expanding shockwave arc; nothing stops it, not even walls */
function pWave(a, half, R, dmg, g, sy) {
  G.fx.push({ k: 'qwave', x: P.x, y: P.y, a, half, R, r: 6, t: 0, life: 0.55, dmg, g, sy, hs: new Set(),
    u: f => {
      f.r = lerp(6, f.R, 1 - (1 - Math.min(1, f.t / f.life)) ** 1.6);
      for (const e of G.enemies) { if (e.dead || f.hs.has(e)) continue; const dd = Math.hypot(e.x - f.x, e.y - f.y), ea = Math.atan2(e.y - f.y, e.x - f.x); if (dd < f.r + e.r && dd > f.r - 10 - e.r && Math.abs(angDiff(f.a, ea)) < f.half + 0.15) { f.hs.add(e); hit(e, f.dmg, { kind: 'm', a: ea, kb: 70 }); } }
    },
    d: (f, k) => { const col = f.g ? C.lt : f.sy ? C.gold : C.white, w = k < 0.7 ? 2 : 1; parc(f.x, f.y, f.r + 1, f.a - f.half, f.a + f.half, C.ink, w + 1); parc(f.x, f.y, f.r, f.a - f.half, f.a + f.half, col, w); if (f.r > 14) parc(f.x, f.y, f.r - 5, f.a - f.half * 0.8, f.a + f.half * 0.8, C.lt, 1); } });
}
/* storm wisp: a little spirit drifts after the cursor; drawn as an fx so it floats above everything */
const kiteFlying = w => curW() === w || (dualOn() && P.ws[1 - P.wi] === w);
function drawKite(f) {
  const k = f.w.kite, x = Math.round(k.x), y = Math.round(k.y + Math.sin(G.t * 3) * 2);
  shadow(x, y + 22, 4);
  if (M.l) pring(x, y, 34, 'rgba(64,228,255,0.3)', 1);
  for (let i = 1; i <= 3; i++) prect(x + Math.sin(G.t * 6 + i * 1.7) * 2, y + 5 + i * 2, 1, 1, i < 3 ? C.lt : C.mid); // its wispy tail
  if (((G.t * 7) | 0) % 3 === 0) { const a = G.t * 13; prect(x + Math.cos(a) * 6, y + Math.sin(a) * 5, 1, 1, C.cyan); } // static crackle
  const ws = WSPR.kite; drawRot(ws.s, x, y, Math.sin(G.t * 5) * 0.15, ws.ox, ws.oy, false);
  if (f.w.zapT > 0 && wsyn(f.w)) pring(x, y, 6, C.gold, 1);
}
function kiteZap(x, y, e, dmg, g, sy) {
  zapFx(x, y, e.x, e.y, g ? C.lt : C.cyan);
  hit(e, dmg, { kind: 'zap', a: Math.atan2(e.y - y, e.x - x), kb: 30 });
  if (sy && !e.dead) {
    G.fx.push({ k: 'skybolt', x: e.x, y: e.y, t: 0, life: 0.2, g, d: (f, k) => { const col = f.g ? C.lt : C.gold; let px = f.x + rand(-3, 3), py = f.y - 90; for (let s = 1; s <= 6; s++) { const nx = f.x + (s < 6 ? rand(-5, 5) : 0), ny = f.y - 90 + s * 15; pline(px, py, nx, ny, col, 2); pline(px, py, nx, ny, C.white, 1); px = nx; py = ny; } if (k < 0.4) pc(f.x, f.y, 5, col); } });
    hit(e, dmg * 0.7, { kind: 'zap', a: Math.PI / 2, kb: 0 }); if (!e.dead) chain(e, dmg * 0.6 * S.dmg, 2, 1);
  }
  pSnd('kite', 0.08, () => AU.zap());
}
// a spinning coin: mostly its face, now and then edge-on
function drawBead(b) {
  const x = Math.round(b.x), y = Math.round(b.y), r = Math.max(1, Math.round(b.r)), col = pbCol(b);
  if (((G.t * 14 + b.seed) | 0) % 3 === 0) { prect(x - 1, y - r - 1, 3, r * 2 + 3, C.ink); prect(x, y - r, 1, r * 2 + 1, col); return; }
  pc(x, y, r + 1, C.ink); pc(x, y, r, col); prect(x - 1, y - 1, 1, 1, C.white); prect(x, y, 1, 1, col === C.gold ? C.goldDk : C.mid);
}
function beadCoin(b, e) { if (e.dead && !e.dummy && !b.ghost && Math.random() < 0.3) dropCoin(e.x, e.y); }
/* twin daggers: every 4th strike flings both daggers out on chains and yanks foes in */
function hookPull(a, R, dmg, g, sy) {
  let n = 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const ea = Math.atan2(e.y - P.y, e.x - P.x);
    if (d2(e.x, e.y, P.x, P.y) < (R + e.r) ** 2 && Math.abs(angDiff(a, ea)) < 1.3 && hit(e, dmg, { kind: 'm', a: ea + Math.PI, kb: 230 }) > 0) n++;
  }
  G.fx.push({ k: 'hooks', a, R, g, t: 0, life: 0.22, d: (f, k) => {
    const ext = k < 0.5 ? k / 0.5 : 2 - k / 0.5;
    for (const s of [-1, 1]) {
      const an = f.a + s * 0.7 * (1 - ext * 0.6), ca = Math.cos(an), sa = Math.sin(an), x1 = P.x + ca * f.R * ext, y1 = P.y + sa * f.R * ext, bx = x1 - ca * 5, by = y1 - sa * 5;
      pline(P.x, P.y, bx, by, C.ink, 2); pline(P.x, P.y, bx, by, f.g ? C.lt : C.mid, 1, 2); // chain
      pline(bx, by, x1, y1, C.ink, 3); pline(bx, by, x1, y1, f.g ? C.lt : C.white, 1); pline(bx - sa * 2, by + ca * 2, bx + sa * 2, by - ca * 2, C.ink, 2); // dagger + crossguard
    }
  } });
  if (sy && !g) pVoid(P.x + Math.cos(a) * 18, P.y + Math.sin(a) * 18, dmg * 0.4);
  AU.throwS(); if (n) { AU.slash(); shake(0.06); }
}
function pVoid(x, y, dmg) {
  G.fx.push({ k: 'pvoid', x, y, t: 0, life: 1, tick: 0, dmg,
    u: (f, dt) => {
      for (const e of G.enemies) { if (e.dead || e.boss || e.anchored) continue; const dx = f.x - e.x, dy = f.y - e.y, dd = Math.hypot(dx, dy); if (dd < 56 && dd > 2) { e.kx += dx / dd * 520 * dt; e.ky += dy / dd * 520 * dt; } }
      f.tick -= dt; if (f.tick <= 0) { f.tick = 0.2; for (const e of G.enemies) if (!e.dead && d2(e.x, e.y, f.x, f.y) < (22 + e.r) ** 2) hit(e, f.dmg, { kind: 'm', a: rand(TAU), kb: 0, noProc: true }); }
      if (Math.random() < 0.6) { const an = rand(TAU); part(f.x + Math.cos(an) * 40, f.y + Math.sin(an) * 40, -Math.cos(an) * 120, -Math.sin(an) * 120, 0.3, C.violet, 1, { drag: 1, kind: 1 }); }
    },
    d: (f, k) => { const r = (k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1) * (7 + Math.sin(f.t * 20)); pc(f.x, f.y, r + 2, C.violet); pc(f.x, f.y, r, C.void); parc(f.x, f.y, 16, f.t * 6, f.t * 6 + 2, C.violet, 1); parc(f.x, f.y, 24, -f.t * 4, -f.t * 4 + 1.6, C.violet, 1); } });
}

/* ---------- weapons ---------- */
// optional hooks: aw (attack weight 0..1), cdf(w) (dynamic cooldown), tick(w,dt,cur,can,rate) (every frame, both held weapons),
// manual (tick drives the trigger), moveMul(w), drawHeld(w,a,h,flip) (return true to replace the held sprite)
/* prism ray: a straight laser redrawn every tick; grey until colour feeds it */
function laserGeo(a) { const m = muzzlePos(a, 13), len = rayWall(m.x, m.y, a, 260); return { x0: m.x, y0: m.y, x1: m.x + Math.cos(a) * len, y1: m.y + Math.sin(a) * len, len }; }
function pLaser(a, da, dmg, ghost, ramp, col) {
  const aa = a + da, sg = laserGeo(aa), ca = Math.cos(aa), sa = Math.sin(aa), wd = (2 + ramp * 2) * S.size;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const s = clamp((e.x - sg.x0) * ca + (e.y - sg.y0) * sa, 0, sg.len);
    if (d2(sg.x0 + ca * s, sg.y0 + sa * s, e.x, e.y) < (wd / 2 + e.r) ** 2) hit(e, dmg, { kind: 'beam', a: aa, kb: 10 });
  }
  if (sg.len < 260) { hurtTile(Math.floor((sg.x1 + ca * 3) / T), Math.floor((sg.y1 + sa * 3) / T), dmg); if (Math.random() < 0.4) part(sg.x1, sg.y1, rand(-50, 50), rand(-50, 50), 0.2, col, 1); }
  G.fx.push(Object.assign({ k: 'laser', da, wd, col, t: 0, life: 0.09, u: f => Object.assign(f, laserGeo(P.aim + f.da)), d: drawLaser }, sg));
}
function drawLaser(f) { const w = Math.max(1, Math.round(f.wd)); pline(f.x0, f.y0, f.x1, f.y1, C.ink, w + 2); pline(f.x0, f.y0, f.x1, f.y1, f.col, w); if (w > 2) pline(f.x0, f.y0, f.x1, f.y1, C.white, 1); pc(f.x1, f.y1, w, f.col); }
/* siphon staff: a tether that sticks to one foe near the aim and drinks its colour */
function siphonTarget(a, w) {
  const q = w.sip;
  if (q && !q.dead && !q.hide && !q.inv && d2(q.x, q.y, P.x, P.y) < 180 * 180 && Math.abs(angDiff(a, angTo(P, q))) < 0.9) return q;
  let best = null, bs = 1e9;
  for (const e of G.enemies) {
    if (e.dead || e.dummy && !inHub() || e.hide || e.inv || e.spawnT > 0) continue;
    const dd = Math.hypot(e.x - P.x, e.y - P.y), da = Math.abs(angDiff(a, Math.atan2(e.y - P.y, e.x - P.x)));
    if (dd > 165 || da > 0.5 || !los(P.x, P.y, e.x, e.y, false)) continue;
    const sc = da * 120 + dd; if (sc < bs) { bs = sc; best = e; }
  }
  return best;
}
function drawSiphon(f) {
  const e = f.e, m = muzzlePos(P.aim, 16), dx = e.x - m.x, dy = e.y - m.y, L = Math.max(1, Math.hypot(dx, dy)), px = -dy / L, py = dx / L, n = Math.max(3, Math.ceil(L / 7));
  let lx = m.x, ly = m.y;
  for (let s = 1; s <= n; s++) { const u = s / n, j = s < n ? Math.sin(u * 9 - G.t * 30) * 2.2 * Math.sin(u * Math.PI) : 0, nx = m.x + dx * u + px * j, ny = m.y + dy * u + py * j; pline(lx, ly, nx, ny, C.ink, 3); pline(lx, ly, nx, ny, f.col, 1); lx = nx; ly = ny; }
  pring(e.x, e.y, e.r + 2 + ((G.t * 20) | 0) % 2, f.col, 1);
}

const WEAPONS = {
  quill: { name: 'FLINTLOCK', zh: '燧发枪', tier: 0, type: 'gun', cd: 0.2, desc: 'A steady, reliable pistol.', zhDesc: '稳定可靠的手枪。',
    syn: { g: 'sharp', name: 'HEAVY POWDER', zh: '加量火药', desc: 'Every 4th shot is a heavy gold ball that pierces 3 foes.', zhDesc: '每第 4 发化为沉重的金色弹丸，贯穿 3 个敌人。' },
    fire(a, p, g, w) {
      const n = 1 + S.multi, m = muzzlePos(a, 10), big = wsyn(w) && (g ? w.qBig : (w.qBig = (w.qn = (w.qn || 0) + 1) % 4 === 0));
      for (let i = 0; i < n; i++) pShot(m.x, m.y, a + fan(i, n, 0.13) + rand(-0.04, 0.04), 340, 7 * p, { r: 2, ghost: g });
      if (big) pShot(m.x, m.y, a, 420, 18 * p, { r: 3.5, pierce: 3, col: C.gold, kb: 160, heavy: true, life: 1.2, ghost: g });
      muzzle(a, g, big); AU.shot(big ? 0.75 : 1); recoil(a, big ? 2.6 : 1.6, 0.3);
    } },
  scatter: { name: 'BLUNDERBUSS', zh: '喇叭铳', tier: 0, type: 'gun', cd: 0.6, desc: 'Point-blank pellet storm. Kicks like a mule.', zhDesc: '近距离喷出一片弹丸，后坐力极强。',
    syn: { g: 'heavy', name: 'SLUG ROUND', zh: '独头弹', desc: 'Every blast also fires a heavy gold slug that pierces and hurls foes back.', zhDesc: '每次射击额外射出一枚金色独头弹，贯穿并把敌人轰飞。' },
    fire(a, p, g, w) {
      const n = 6 + 2 * S.multi, sp = 0.4 + 0.06 * S.multi, m = muzzlePos(a, 13); for (let i = 0; i < n; i++) pShot(m.x, m.y, a + rand(-sp, sp), rand(250, 350), 5 * p, { r: 2, life: rand(0.3, 0.42), kb: 150, ghost: g });
      if (wsyn(w)) pShot(m.x, m.y, a, 380, 20 * p, { r: 4, pierce: 2, col: C.gold, kb: 320, heavy: true, life: 0.6, ghost: g });
      muzzle(a, g, true); AU.shotgun(); recoil(a, 4, 1); P.kx -= Math.cos(a) * 110; P.ky -= Math.sin(a) * 110; shake(0.14);
    } },
  needle: { name: 'NAIL GUN', zh: '钉枪', tier: 0, type: 'gun', cd: 0.07, aw: 0.3, desc: 'A hail of nails. Triggers on-hit runes constantly.', zhDesc: '钉子如雨，不断触发命中类符文。',
    syn: { g: 'static', name: 'LIGHTNING ROD', zh: '引雷针', desc: 'Nails turn cyan; every hit has a 15% chance to arc lightning through 2 foes.', zhDesc: '钉子化为青色，每次命中有 15% 几率放出闪电，连锁 2 个敌人。' },
    fire(a, p, g, w) {
      const n = 1 + S.multi, m = muzzlePos(a, 11), sy = wsyn(w);
      for (let i = 0; i < n; i++) { const b = pShot(m.x, m.y, a + fan(i, n, 0.1) + rand(-0.15, 0.15), 370, 3 * p, { r: 1.5, life: 0.7, kb: 22, ghost: g, col: sy ? C.cyan : undefined }); if (sy) b.onHit = rodHit; }
      if (Math.random() < 0.5) muzzle(a, g); AU.needle(); recoil(a, 0.7, 0.12);
    } },
  blade: { name: 'SHORTSWORD', zh: '短剑', tier: 0, type: 'blade', cd: 0.26, desc: 'Three-hit combo. Swings reflect enemy bullets.', zhDesc: '三段连斩，挥砍可反弹敌方子弹。',
    syn: { g: 'phantom', name: 'PHANTOM EDGE', zh: '幻影刃', desc: 'Every dash ends in a full-circle violet cut that reflects bullets.', zhDesc: '每次冲刺结束时斩出一圈紫色幻影刀光，并反弹子弹。' },
    fire(a, p, g, w) {
      const c = g ? 0 : w.combo, fin = c === 2;
      swing(a, { r: fin ? 34 : 27, arc: fin ? 2.8 : 2.1, dmg: (fin ? 24 : 13) * p, kb: fin ? 230 : 110, heavy: fin, ghost: g, dir: c % 2 ? -1 : 1 });
      if (!g) { w.combo = (c + 1) % 3; w.comboT = 0.75; if (fin) { P.kx += Math.cos(a) * 160; P.ky += Math.sin(a) * 160; } }
      for (let i = 0; i < S.multi; i++) pShot(P.x + Math.cos(a) * 10, P.y + Math.sin(a) * 10, a + fan(i, S.multi, 0.25), 250, 8 * p, { kind: 'wave', r: 5, life: 0.4, pierce: 99, kb: 90, ghost: g });
      AU.swing(fin ? 0.75 : 1); P.sq = 0.3;
    },
    dashEnd(w) { if (!wsyn(w)) return; const R = 32 * S.size; pSpin(P.dashA, R, 18 * wLvMul(w), false, C.violet); ringFx(P.x, P.y, 4, R + 4, 0.25, C.violet, 2); AU.swing(0.7); } },
  maul: { name: 'WARHAMMER', zh: '战锤', tier: 1, type: 'maul', charge: 0.7, cd: 0.28, desc: 'Hold to wind up. Release to quake the floor.', zhDesc: '按住蓄力，松开重砸震裂地面。',
    syn: { g: 'concuss', name: 'EARTHSHAKER', zh: '撼地', desc: 'Slams daze every foe they hit and crack the floor in eight golden fissures.', zhDesc: '重砸震晕命中的敌人，并沿八个方向裂开金色地缝。' },
    fire(a, p, g, w, c) {
      const x = P.x + Math.cos(a) * 18, y = P.y + Math.sin(a) * 18, r = (22 + 28 * c) * S.size, d = (16 + 46 * c) * p;
      slam(x, y, r, d, c, g);
      if (wsyn(w)) { for (const e of G.enemies) if (!e.dead && d2(e.x, e.y, x, y) < (r + e.r) ** 2) daze(e, 0.6 + 0.8 * c); fissures(x, y, r * 1.7, d * 0.5, g); }
      for (let i = 0; i < S.multi; i++) later(0.17 * (i + 1), () => slam(x, y, r + 16 * (i + 1), d * 0.5, 0, true));
      P.swingA = { a0: a - 2.2, a1: a, t: 0 };
    } },
  rail: { name: 'ARCANE BEAM', zh: '奥术光束', tier: 1, type: 'beam', charge: 0.55, cd: 0.18, desc: 'Charge a beam that pierces every foe in a line.', zhDesc: '蓄力射出光束，贯穿一线上的所有敌人。',
    syn: { g: 'twin', name: 'PRISM BEAM', zh: '棱镜折光', desc: 'Beams that strike a wall refract into two golden beams.', zhDesc: '光束击中墙壁后折射为两道金色光束。' },
    fire(a, p, g, w, c) {
      const n = 1 + S.multi, m = muzzlePos(a, 14), sy = wsyn(w);
      for (let i = 0; i < n; i++) { const aa = a + fan(i, n, 0.13), wd = (2 + 5 * c) * S.size, dm = (8 + 46 * c) * p * (n > 1 && i !== (n - 1) / 2 ? 0.7 : 1), end = beam(m.x, m.y, aa, wd, dm, g); if (sy) refract(end.ex, end.ey, aa, wd * 0.7, dm * 0.55, g); }
      recoil(a, 3 + 5 * c, 0.5 + c); P.kx -= Math.cos(a) * 70 * c; P.ky -= Math.sin(a) * 70 * c; AU.rail(c); shake(0.08 + 0.25 * c); if (c > 0.9) hitstop(0.05);
    } },
  blot: { name: 'BOMB BAG', zh: '炸弹袋', tier: 0, type: 'lob', cd: 0.72, desc: 'Lob bombs at the cursor. Big, messy blasts.', zhDesc: '向光标处抛出炸弹，爆炸范围大。',
    syn: { g: 'kindle', name: 'NAPALM', zh: '燃烧弹', desc: 'Bombs leave a pool of burning oil for 3s.', zhDesc: '炸弹落地后留下持续 3 秒的燃烧油池。' },
    fire(a, p, g, w) {
      const m = muzzlePos(a, 12); let dd = clamp(Math.hypot(M.x - P.x, M.y - P.y), 30, 175);
      const tx = P.x + Math.cos(a) * dd, ty = P.y + Math.sin(a) * dd, n = 1 + S.multi, sy = wsyn(w);
      for (let i = 0; i < n; i++) { const o = i ? 22 : 0, oa = rand(TAU), b = lob(m.x, m.y, tx + Math.cos(oa) * o, ty + Math.sin(oa) * o, 24 * p, g); if (sy) { b.pw = p; b.onEnd = potEnd; } }
      AU.lob(); recoil(a, 2, 0.5); muzzle(a, g);
    } },
  chakram: { name: 'CHAKRAM', zh: '战轮', tier: 1, type: 'throw', cd: 0.28, desc: 'Returns to your hand, cutting twice.', zhDesc: '掷出后飞回手中，往返两次切割。',
    syn: { g: 'echo', name: 'TWIN ORBIT', zh: '双轮环绕', desc: 'Each throw leaves a golden chakram circling you for 2.5s, cutting foes and eating bullets.', zhDesc: '每次投掷都留下一枚绕身 2.5 秒的金色战轮，切伤敌人并吞噬子弹。' },
    fire(a, p, g, w) {
      const max = 2 + S.multi; let thrown = 0;
      const n = g ? 1 : Math.min(1 + S.multi, max - w.out);
      if (n <= 0) return false;
      for (let i = 0; i < n; i++) { const b = pShot(P.x, P.y, a + fan(i, n, 0.3), 330, 9 * p, { kind: 'chak', r: 4, life: 3, pierce: 999, kb: 70, ghost: g }); b.out = 0.34; b.hitT = new Map(); b.owner = w; if (!g) w.out++; thrown++; }
      if (!g && wsyn(w)) orbChak(6 * p);
      AU.throwS(); return thrown > 0;
    } },
  bow: { name: 'LONGBOW', zh: '长弓', tier: 1, type: 'bow', charge: 0.6, cd: 0.12, desc: 'Draw to charge. A full draw always crits.', zhDesc: '拉弓蓄力，满弦必定暴击。',
    syn: { g: 'keen', name: 'HAWK EYE', zh: '鹰眼', desc: 'Full draws curve toward foes and burst into three golden arrows on the first hit.', zhDesc: '满弦之箭会微微追踪，首次命中时分裂为三支金箭。' },
    fire(a, p, g, w, c) {
      const n = 1 + S.multi, m = muzzlePos(a, 5), sy = c >= 1 && wsyn(w);
      for (let i = 0; i < n; i++) { const b = pShot(m.x, m.y, a + fan(i, n, 0.09), 220 + 380 * c, (8 + 30 * c) * p, { kind: 'arrow', r: 2, pierce: Math.floor(c * 3) + (c >= 1 ? 1 : 0), crit: c >= 1, life: 1.4, kb: 60 + 120 * c, ghost: g, heavy: c >= 1 }); if (sy) { b.home = 2.5; b.onHit = hawkHit; } }
      AU.bow(c); recoil(a, 1 + 2 * c, 0.3);
    } },
  revolver: { name: 'REVOLVER', zh: '左轮', tier: 0, type: 'gun', cd: 0.28, desc: 'Six-round cylinder. The sixth shot is a piercing gold crit, then a reload.', zhDesc: '六发转轮。第六发必定暴击并穿透，随后装填。',
    syn: { g: 'midas', name: 'GOLDEN CHAMBER', zh: '黄金弹膛', desc: 'The sixth round ricochets on to as many as 4 more foes.', zhDesc: '第六发子弹会在敌人之间弹射，最多再命中 4 个。' },
    fire(a, p, g, w) {
      const big = g ? w.lastBig : (w.lastBig = w.ammo === 1);
      const n = 1 + S.multi, m = muzzlePos(a, 12), sy = big && wsyn(w);
      for (let i = 0; i < n; i++) { const b = pShot(m.x, m.y, a + fan(i, n, 0.1) + rand(-0.02, 0.02), 380, 13 * p, big ? { r: 3.5, pierce: 2, crit: true, heavy: true, col: C.gold, kb: 140, ghost: g } : { r: 2, kb: 90, ghost: g }); if (sy) { b.rc = 4; b.onHit = goldRico; } }
      muzzle(a, g, big); AU.shot(big ? 0.7 : 0.9); recoil(a, big ? 3.5 : 2, big ? 0.9 : 0.4);
      if (big && !g) { shake(0.06); sparks(m.x, m.y, a, 5, C.gold, 140, 0.5); pSnd('rev6', 0.1, () => AU.tone('sine', 1800, 1500, 0.12, 0.05, { verb: 0.3 })); }
    },
    drawHeld(w, a, h, flip) { if (!(w.reload > 0)) return false; const ws = WSPR.revolver; drawRot(ws.s, h.x, h.y, a + w.reload / w.rlMax * TAU * 2, ws.ox, ws.oy, flip); return true; } },
  gatling: { name: 'GATLING', zh: '加特林', tier: 1, type: 'gun', cd: 0.2, aw: 0.25, desc: 'Hold to spin up into a torrent of lead. You slow down while it roars.', zhDesc: '按住射击逐渐加速，倾泻弹雨。射击时移速降低。',
    syn: { g: 'flow', name: 'RUN AND GUN', zh: '移动扫射', desc: 'No slowdown, spins up twice as fast, and at full spin fires piercing gold tracers while you move.', zhDesc: '射击不再减速，转速提升翻倍；满转时边走边射会附带贯穿的金色曳光弹。' },
    cdf: w => lerp(0.2, 0.045, clamp((w.hold || 0) / (wsyn(w) ? 0.6 : 1.2), 0, 1)),
    moveMul: w => w.hold > 0 && !wsyn(w) ? 0.7 : 1,
    fire(a, p, g, w) {
      const n = 1 + S.multi, m = muzzlePos(a, 12), sy = wsyn(w), spin = clamp((w.hold || 0) / (sy ? 0.6 : 1.2), 0, 1);
      for (let i = 0; i < n; i++) pShot(m.x + rand(-1, 1), m.y + rand(-1, 1), a + fan(i, n, 0.08) + rand(-0.12, 0.12), 400, 3.5 * p, { r: 1.5, life: 0.75, kb: 16, ghost: g });
      if (sy && spin >= 1 && P.moving) pShot(m.x, m.y, a + rand(-0.04, 0.04), 460, 4 * p, { r: 1.5, pierce: 2, col: C.gold, life: 0.7, kb: 20, ghost: g });
      if (Math.random() < 0.5) muzzle(a, g); AU.needle(); recoil(a, 0.4, 0.1);
      pSnd('gat', 0.12, () => AU.tone('triangle', 180 + 380 * spin, 200 + 380 * spin, 0.12, 0.03));
    } },
  splitter: { name: 'SHARD CANNON', zh: '裂片炮', tier: 0, type: 'gun', cd: 0.32, desc: 'Shots burst into fragments on impact, or after a moment in flight.', zhDesc: '炮弹命中或飞行片刻后，分裂成多枚碎片。',
    syn: { g: 'shatter', name: 'CHAIN SPLIT', zh: '连锁分裂', desc: '+2 fragments, and each fragment splits again into gold shards when it hits.', zhDesc: '碎片 +2，且每枚碎片命中后再次分裂为金色碎屑。' },
    fire(a, p, g, w) {
      const m = muzzlePos(a, 11), b = pShot(m.x, m.y, a, 300, 6 * p, { r: 2.5, life: 1, kb: 60, ghost: g });
      b.pw = p; b.sy = wsyn(w); b.upd = splitUpd; b.onHit = splitHit; b.onEnd = splitEnd;
      muzzle(a, g); AU.shot(1.15); recoil(a, 1.4, 0.3);
    } },
  ricochet: { name: 'PRISM SHARD', zh: '棱镜碎片', tier: 0, type: 'gun', cd: 0.22, desc: 'Shards bounce off walls three times, cutting harder after every bounce.', zhDesc: '碎片可在墙面反弹三次，每次反弹伤害提升。',
    syn: { g: 'seeker', name: 'HUNTING LIGHT', zh: '猎光', desc: 'After a bounce the shard turns cyan and hunts the nearest foe.', zhDesc: '反弹后的碎片化为青色，追踪最近的敌人。' },
    fire(a, p, g, w) {
      const n = 1 + S.multi, m = muzzlePos(a, 10), sy = wsyn(w);
      for (let i = 0; i < n; i++) { const b = pShot(m.x, m.y, a + fan(i, n, 0.12), 330, 6 * p, { r: 2, life: 1.6, kb: 60, ghost: g }); b.bounce = 3; b.base = b.dmg; b.nb = 0; b.sy = sy; b.upd = ricoUpd; b.draw = drawShard; }
      muzzle(a, g); AU.shot(1.3); recoil(a, 1.2, 0.25);
    } },
  flamer: { name: 'FLAMETHROWER', zh: '喷火器', tier: 1, type: 'stream', cd: 0.05, aw: 0.2, desc: 'Hold to spray short-range flame that sets foes ablaze.', zhDesc: '按住喷出短程火焰，点燃敌人。',
    syn: { g: 'rime', name: 'FROSTFIRE', zh: '霜火', desc: 'Pale blue flames reach further, chill twice as fast, and frozen foes they lick spray frost shards.', zhDesc: '淡蓝火焰喷得更远、寒冷叠加翻倍，舔中冻结的敌人时迸出冰片。' },
    fire(a, p, g, w) {
      const n = 2 + S.multi, cone = 0.28 + 0.08 * S.multi, m = muzzlePos(a, 8), sy = wsyn(w);
      for (let i = 0; i < n; i++) { const b = pShot(m.x, m.y, a + rand(-cone, cone), rand(150, 190), 2.2 * p, { r: 3, life: sy ? 0.45 : 0.33, pierce: 2, kb: 12, noSize: true, ghost: g }); b.frost = sy; b.pw = p; b.upd = flameUpd; b.onHit = flameHit; b.draw = drawFlame; }
      P.recoil = Math.min(1.5, P.recoil + 0.05);
      pSnd('flame', 0.09, () => { AU.nz(0.12, 0.05, { f: rand(500, 800), f2: 300, q: 0.6 }); AU.nz(0.1, 0.04, { brown: true, type: 'lowpass', f: 600 }); });
    } },
  spear: { name: 'SPEAR', zh: '长矛', tier: 0, type: 'spear', cd: 0.32, desc: 'Long thrusts pierce a whole line and reflect bullets. Every third thrust lunges.', zhDesc: '长距离直刺，贯穿一线并反弹子弹。第三击向前突进。',
    syn: { g: 'swift', name: 'WIND LUNGE', zh: '疾风突刺', desc: 'Every dash fires a free golden thrust along your path.', zhDesc: '每次冲刺都会沿路径免费刺出一记金色突刺。' },
    fire(a, p, g, w) {
      const c = g ? 0 : w.combo, fin = c === 2, n = 1 + S.multi;
      let hits = 0;
      for (let i = 0; i < n; i++) { const off = i ? (i % 2 ? 8 : -8) * Math.ceil(i / 2) : 0; hits += pThrust(a, { len: fin ? 70 : 52, dmg: (fin ? 28 : 16) * p * (i ? 0.7 : 1), kb: fin ? 200 : 110, heavy: fin, ghost: g, off }); }
      if (!g) { w.combo = (c + 1) % 3; w.comboT = 0.8; w.thrT = G.t; if (fin) { P.kx += Math.cos(a) * 170; P.ky += Math.sin(a) * 170; if (hits) shake(0.06); } }
      if (hits) AU.slash();
      AU.swing(fin ? 0.7 : 1.3); P.sq = 0.25;
    },
    onDash(w) { if (!wsyn(w)) return; pThrust(P.dashA, { len: 64, dmg: 18 * wLvMul(w), kb: 160, off: 0, col: C.gold }); w.thrT = G.t; AU.swing(0.8); },
    drawHeld(w, a, h, flip) {
      const ws = WSPR.spear, dt = G.t - (w.thrT ?? -9), off = dt >= 0 && dt < 0.14 ? Math.sin(Math.PI * dt / 0.14) * 7 : 0;
      drawRot(ws.s, h.x + Math.cos(a) * (off - P.recoil * 2), h.y + Math.sin(a) * (off - P.recoil * 2), a, ws.ox, ws.oy, flip); return true;
    } },
  scythe: { name: 'SCYTHE', zh: '死神镰刀', tier: 1, type: 'scythe', cd: 0.45, desc: 'Spin a full circle, cutting everything and reflecting every bullet around you.', zhDesc: '360° 回旋斩，切割四周敌人并反弹所有子弹。',
    syn: { g: 'leech', name: 'BLOOD MOON', zh: '血月', desc: 'Spins grow 30% wider with a blood-red rim; every 12 foes cut heals 1.', zhDesc: '回旋范围扩大 30% 并带有血色刃边；每斩中 12 个敌人回复 1 点生命。' },
    fire(a, p, g, w) {
      const sy = wsyn(w), R = 30 * S.size * (sy ? 1.3 : 1);
      const n = pSpin(a, R, 12 * p, g, sy ? C.red : undefined);
      if (sy) { ringFx(P.x, P.y, R * 0.8, R + 4, 0.22, g ? C.lt : C.red, 1); if (!g && (w.bm = (w.bm || 0) + n) >= 12) { w.bm -= 12; healP(1); } }
      for (let i = 0; i < S.multi; i++) later(0.07 * (i + 1), () => pRing(P.x, P.y, R * 0.7, R + 30 + 10 * i, 7 * p, g));
      if (!g) P.swingA = { a0: a, a1: a + TAU, t: 0 };
      AU.swing(0.6); P.sq = 0.3;
    } },
  umbrella: { name: 'TOWER SHIELD', zh: '塔盾', tier: 2, type: 'guard', cd: 0.3, manual: true, desc: 'Hold to raise it and catch bullets in front of you. Release to hurl them back.', zhDesc: '按住举盾，挡下正面来袭的子弹；松开将其尽数掷回。',
    syn: { g: 'plate', name: 'IRON WALL', zh: '铁壁', desc: 'The shield covers a far wider arc, and every 8 bullets caught restore a shield.', zhDesc: '盾面覆盖范围大幅扩大，每挡下 8 发子弹回复 1 层护盾。' },
    moveMul: w => w.open ? 0.75 : 1,
    tick(w, dt, cur, can, rate) {
      if (!cur || !can) { w.open = false; return; } // swapping or dashing folds it; the catch is kept
      if (M.l && (w.open || w.cd <= 0)) {
        if (!w.open) { w.open = true; pSnd('umb', 0.1, () => { AU.tone('triangle', 300, 220, 0.08, 0.08); AU.nz(0.05, 0.05, { f: 2400, q: 2 }); }); }
        const sy = wsyn(w), arc = sy ? 1.9 : 1.22; let n = 0;
        for (const b of G.bullets) {
          if (b.team !== 'e' || b.dead || b.beam) continue;
          const dx = b.x - P.x, dy = b.y - P.y;
          if (dx * dx + dy * dy > (16 + b.r) ** 2 || Math.abs(angDiff(P.aim, Math.atan2(dy, dx))) > arc) continue;
          b.dead = true; w.store = Math.min(24, (w.store || 0) + 1); n++;
          sparks(b.x, b.y, Math.atan2(dy, dx), 3, C.white, 90, 0.9);
        }
        if (n) { AU.tink(); gainChroma(n); if (sy && (w.pc = (w.pc || 0) + n) >= 8) { w.pc -= 8; if (P.sh < P.maxSh) { P.sh++; AU.shieldUp(); ringFx(P.x, P.y - 2, 3, 14, 0.3, C.gold); } } }
      } else if (w.open) {
        w.open = false; doAttack(w, P.aim, 1, false, w.store || 0); w.store = 0; w.cd = WEAPONS.umbrella.cd / rate;
      }
    },
    fire(a, p, g, w, c) { // c = bullets caught
      const n = Math.round(c * (1 + 0.5 * S.multi));
      if (n > 0) {
        const m = muzzlePos(a, 8);
        for (let i = 0; i < n; i++) pShot(m.x, m.y, a + (n > 1 ? -0.5 + i / (n - 1) : 0) + rand(-0.03, 0.03), rand(300, 360), 7 * p, { r: 2, life: 0.9, kb: 80, ghost: g });
        AU.reflect(); sparks(m.x, m.y, a, 6, g ? C.lt : C.white, 150, 0.6);
      }
      pThrust(a, { len: 22, dmg: 10 * p, kb: 140, ghost: g, off: 0 });
      AU.swing(1.2); P.sq = 0.2;
    },
    drawHeld(w, a, h) {
      if (!w.open) return false;
      // raised: a curved iron face covering the catch arc; caught bullets glint where they struck it
      const sy = wsyn(w), ca = Math.cos(a), sa = Math.sin(a), A = sy ? 1.9 : 1.22, R = 11, cx = h.x + ca * 3, cy = h.y + sa * 3;
      pline(h.x - ca * 2, h.y - sa * 2, h.x + ca * 6, h.y + sa * 6, C.ink, 2);
      for (let rr = R - 4; rr <= R; rr++) parc(cx, cy, rr, a - A, a + A, rr === R - 4 || rr === R ? C.ink : rr === R - 1 ? C.lt : C.mid, 2);
      for (const s of [-1, 1]) pline(cx + Math.cos(a + s * A) * (R - 4), cy + Math.sin(a + s * A) * (R - 4), cx + Math.cos(a + s * A) * R, cy + Math.sin(a + s * A) * R, C.ink, 2);
      parc(cx, cy, R - 1, a - A * 0.92, a + A * 0.92, sy ? C.gold : C.white, 1);
      for (const s of [-0.6, 0, 0.6]) { const ra = a + s * A; prect(cx + Math.cos(ra) * (R - 3), cy + Math.sin(ra) * (R - 3), 1, 1, C.dk); } // rivets
      const n = Math.min(w.store || 0, 12);
      for (let i = 0; i < n; i++) { const ra = a - A * 0.8 + (n > 1 ? i / (n - 1) : 0.5) * A * 1.6; prect(cx + Math.cos(ra) * (R - 2), cy + Math.sin(ra) * (R - 2), 1, 1, C.white); }
      return true;
    } },
  stylus: { name: 'SEARING WAND', zh: '灼光魔杖', tier: 2, type: 'stream', cd: 0.08, aw: 0.25, desc: 'Hold to cast a thin beam that burns hotter the longer you hold it.', zhDesc: '按住射出细长光束，持续越久伤害越高。',
    syn: { g: 'conduit', name: 'FORKED BOLT', zh: '分叉雷光', desc: 'The beam forks: lightning leaps from what it touches to a second foe.', zhDesc: '光束分叉：闪电从被照射的敌人跃向另一个敌人。' },
    fire(a, p, g, w) {
      const ramp = clamp(w.hold || 0, 0, 1), dmg = (3 + 3 * ramp) * p, n = 1 + S.multi, sy = wsyn(w);
      for (let i = 0; i < n; i++) pStylus(a, i ? (i % 2 ? 0.15 : -0.15) * Math.ceil(i / 2) : 0, dmg, g, ramp, sy);
      pSnd('stylus', 0.1, () => { AU.tone('sine', 900 + 500 * ramp, 880 + 500 * ramp, 0.11, 0.025); AU.nz(0.08, 0.02, { f: 5000, q: 2 }); });
    } },
  mine: { name: 'RUNE MINE', zh: '符文地雷', tier: 1, type: 'mine', cd: 0.5, desc: 'Toss rune mines that blow up any foe who steps close. Up to four at once.', zhDesc: '投掷符文地雷，敌人靠近即引爆。最多同时存在四枚。',
    syn: { g: 'volatile', name: 'CLUSTER RUNES', zh: '集束符文', desc: 'Every rune blast scatters three small runes that finish off what is left.', zhDesc: '符文地雷爆炸时散出三枚小符文，继续轰炸残敌。' },
    fire(a, p, g, w) {
      const n = Math.min(4, 1 + S.multi), sy = wsyn(w);
      const own = G.fx.filter(f => f.k === 'seal' && !f.dead && !f.mini && !f.g === !g).sort((x, y) => x.born - y.born);
      for (let i = 0; i < own.length + n - 4 && i < own.length; i++) sealBoom(own[i]);
      const dd = clamp(Math.hypot(M.x - P.x, M.y - P.y), 16, 150);
      for (let i = 0; i < n; i++) { const o = i ? rand(14, 26) : 0, oa = rand(TAU); pSeal(P.x, P.y, P.x + Math.cos(a) * dd + Math.cos(oa) * o, P.y + Math.sin(a) * dd + Math.sin(oa) * o, 28 * p, g, sy); }
      AU.throwS(); recoil(a, 1, 0.2); P.sq = 0.2;
    } },
  darts: { name: 'THROWING KNIVES', zh: '飞刀', tier: 0, type: 'throw', cd: 0.38, desc: 'A fan of knives that stick into foes and burst a moment later.', zhDesc: '扇形掷出飞刀，钉入敌人片刻后爆裂。',
    syn: { g: 'bleed', name: 'SERRATED', zh: '锯齿刃', desc: 'Stuck knives make foes bleed, then burst in a wider red blast.', zhDesc: '钉入的飞刀令敌人流血，并以更大的血色爆炸收尾。' },
    fire(a, p, g, w) {
      const n = 3 + S.multi, sy = wsyn(w);
      for (let i = 0; i < n; i++) { const b = pShot(P.x + Math.cos(a) * 4, P.y + Math.sin(a) * 4, a + fan(i, n, 0.15), 360, 4 * p, { r: 1.5, life: 0.7, kb: 25, ghost: g, col: sy ? C.red : undefined }); b.pw = p; b.sy = sy; b.onHit = dartHit; b.draw = drawDart; }
      AU.throwS(); P.sq = 0.15;
    } },
  crossbow: { name: 'AUTO CROSSBOW', zh: '自动弩', tier: 0, type: 'bow', cd: 0.24, desc: 'Fires piercing bolts on its own. Every fifth shot is a triple.', zhDesc: '自动连射穿透弩箭，每第五发为三连射。',
    syn: { g: 'pierce', name: 'SIEGE BOLTS', zh: '攻城弩', desc: 'Bolts pierce 2 more foes, and every triple adds a golden ballista bolt that pierces everything.', zhDesc: '弩箭额外贯穿 2 个敌人，每次三连射额外射出一支贯穿一切的金色重弩。' },
    fire(a, p, g, w) {
      let tri;
      if (g) tri = w.lastTri; else { w.shots = (w.shots || 0) + 1; tri = w.shots % 5 === 0; w.lastTri = tri; }
      const k = tri ? 3 : 1, n = 1 + S.multi, m = muzzlePos(a, 9), sy = wsyn(w);
      for (let j = 0; j < k; j++) for (let i = 0; i < n; i++) pShot(m.x, m.y, a + fan(j, k, 0.12) + fan(i, n, 0.08), 420, 9 * p, { kind: 'arrow', r: 2, pierce: sy ? 3 : 1, life: 0.9, kb: 70, ghost: g });
      if (tri && sy) pShot(m.x, m.y, a, 520, 30 * p, { kind: 'arrow', r: 3.5, pierce: 99, crit: true, heavy: true, kb: 260, life: 1, ghost: g });
      AU.bow(tri ? 0.8 : 0.4); recoil(a, tri ? 2 : 1, tri ? 0.5 : 0.25);
    } },
  staff: { name: 'NECRO STAFF', zh: '死灵法杖', tier: 1, type: 'summon', charge: 0.7, cd: 0.2, desc: 'Hold to gather soul wisps (up to 4), release: they circle you, then hunt the nearest foe.', zhDesc: '按住聚集亡魂（最多 4 只），松开后亡魂环绕身侧，随后追踪最近的敌人。',
    syn: { g: 'halo', name: 'SOUL RING', zh: '亡魂之环', desc: '+1 wisp; wisps circle three times as long in a wide golden ring that eats bullets.', zhDesc: '亡魂 +1；环绕时间延长至三倍，形成吞噬子弹的金色大环。' },
    fire(a, p, g, w, c) {
      const sy = wsyn(w), n = 1 + Math.round(3 * c) + S.multi + (sy ? 1 : 0), a0 = rand(TAU);
      for (let i = 0; i < n; i++) { const b = pShot(P.x, P.y - 2, a, 0, 8 * p, { r: 2.5, life: sy ? 3.3 : 2.5, kb: 60, ghost: g }); b.oa = a0 + i / n * TAU; b.lo = fan(i, n, 0.35); b.orbT = sy ? 1.2 : 0.4; b.sy = sy; b.noWall = true; b.upd = wispUpd; b.draw = drawWisp; }
      pSnd('staff', 0.1, () => { AU.tone('sine', 520, 980, 0.18, 0.06, { verb: 0.4 }); AU.tone('triangle', 260, 490, 0.14, 0.04); });
      P.sq = 0.2;
    } },
  brush: { name: 'INFERNO TOME', zh: '炼狱魔典', tier: 2, type: 'brush', cd: 0.3, manual: true, desc: 'Hold and drag to trace a line of fire runes. Release to set the whole line ablaze.', zhDesc: '按住拖动画出一道火焰符文，松开即点燃整条符文线。',
    syn: { g: 'still', name: 'HELLFIRE SCRIPT', zh: '狱火咒文', desc: 'Rune lines run much longer, ignite in gold, and can hit each foe 5 times.', zhDesc: '符文线可以画得更长，以金色点燃，每个敌人最多被击中 5 次。' },
    tick(w, dt, cur, can, rate) {
      const st = w.stroke, sy = wsyn(w);
      if (!cur || P.lock) { w.stroke = null; return; }
      if (!st) {
        if (!(M.l && can && w.cd <= 0)) return;
        let x = M.x, y = M.y; const dd = Math.hypot(x - P.x, y - P.y);
        if (dd > 40) { x = P.x + (x - P.x) / dd * 40; y = P.y + (y - P.y) / dd * 40; }
        const s = { pts: [{ x, y }], len: 0, t: 0 }; w.stroke = s;
        G.fx.push({ k: 'stroke', t: 0, life: 99, st: s, w, u: f => { if (f.w.stroke !== f.st) f.dead = true; }, d: f => { const q = f.st.pts[f.st.pts.length - 1]; drawRunes(f.st.pts, 0, C.fire); pc(q.x, q.y, 1, wsyn(f.w) ? C.gold : C.white); } });
        pSnd('brush-s', 0.1, () => AU.nz(0.12, 0.05, { f: 600, f2: 1200, q: 0.7 }));
        return;
      }
      st.t += dt;
      if (M.l && can) { const n0 = st.pts.length; strokeAdd(st, M.x, M.y, sy ? 420 : 260); if (st.pts.length > n0) pSnd('brush-d', 0.08, () => AU.nz(0.06, 0.03, { f: 900, f2: 600, q: 0.8 })); }
      if (!M.l || st.len >= (sy ? 420 : 260) || st.t >= (sy ? 2 : 1.2)) {
        w.stroke = null; w.cd = WEAPONS.brush.cd / rate;
        if (st.pts.length >= 2) doAttack(w, P.aim, 1, false, st.pts);
      }
    },
    fire(a, p, g, w, pts) { // pts = the finished stroke
      if (!Array.isArray(pts) || pts.length < 2) return false;
      const sy = wsyn(w), r = (14 + 4 * S.multi) * S.size * (sy ? 1.2 : 1), hs = new Map();
      for (let i = 0; i < pts.length; i += 3) { const q = pts[i]; later(0.02 * i, () => brushBlast(q.x, q.y, r, 9 * p, hs, g, sy ? 5 : 3, sy)); }
      G.fx.push({ k: 'strokeburn', pts, t: 0, life: 0.02 * pts.length + 0.05, g, d: f => { const from = Math.min(f.pts.length - 1, Math.floor(f.t / 0.02)); if (from < f.pts.length - 1) { const q = f.pts[from]; drawRunes(f.pts, from, f.g ? C.lt : C.fire); pc(q.x, q.y, 3, f.g ? C.lt : C.fire); pc(q.x, q.y, 1, C.white); } } });
      AU.slash(); P.sq = 0.25;
    } },

  /* ----- v3: seven more weapons ----- */
  whip: { name: 'CHAIN WHIP', zh: '链鞭', tier: 0, type: 'whip', cd: 0.42, desc: 'A long lash. Its tip is a sweet spot that always crits.', zhDesc: '长鞭横扫，鞭梢是甜区，必定暴击。',
    syn: { g: 'exec', name: "HANGMAN'S CHAIN", zh: '绞刑链', desc: 'Tip strikes execute foes under 30% HP; bosses take double.', zhDesc: '鞭梢击中生命低于 30% 的敌人直接斩杀；首领则受到双倍伤害。' },
    fire(a, p, g, w) {
      const n = 1 + S.multi, sy = wsyn(w), dir = g ? 1 : (w.wd = -(w.wd || 1));
      for (let i = 0; i < n; i++) pLash(a + fan(i, n, 0.35), 56 * S.size, 9 * p, 16 * p, dir, g, sy);
      AU.swing(1.4); pSnd('crack', 0.06, () => AU.nz(0.04, 0.12, { f: 5200, q: 2, delay: 0.1 })); P.sq = 0.2;
    } },
  fan: { name: 'GALE WAND', zh: '疾风杖', tier: 1, type: 'fan', cd: 0.5, desc: 'A wide gust that shoves foes away and blows enemy bullets off course.', zhDesc: '释放大片疾风，吹退敌人，并把敌方子弹吹离航线。',
    syn: { g: 'haste', name: 'TORNADO', zh: '飓风', desc: 'Every 3rd gust also looses a golden whirlwind that drags foes in and eats bullets.', zhDesc: '每第三次疾风额外放出金色旋风，把敌人吸向中心并吞噬子弹。' },
    fire(a, p, g, w) {
      pGust(a, 64 * S.size, 0.7, 6 * p, g);
      for (let i = 0; i < S.multi; i++) later(0.1 * (i + 1), () => pGust(P.aim, (64 + 18 * (i + 1)) * S.size, 0.7, 4 * p, g));
      if (!g && wsyn(w) && (w.fn = (w.fn || 0) + 1) % 3 === 0) pWhirl(a, 5 * p);
      AU.swing(0.55); pSnd('gust', 0.08, () => AU.nz(0.25, 0.1, { f: 600, f2: 2200, q: 0.6 })); P.sq = 0.2;
    } },
  firecracker: { name: 'BOMB CHAIN', zh: '连环炸药', tier: 0, type: 'lob', cd: 0.7, desc: 'Toss a fused chain of small bombs that go off one after another along the line.', zhDesc: '抛出一串小炸弹，沿着落地的直线接连爆炸。',
    syn: { g: 'demo', name: 'GRAND FINALE', zh: '压轴大爆', desc: 'Longer chains, bigger blasts, and a golden finale blast at the end.', zhDesc: '炸弹串更长、爆炸更大，末尾还有一声金色压轴大爆。' },
    fire(a, p, g, w) {
      const sy = wsyn(w), dd = clamp(Math.hypot(M.x - P.x, M.y - P.y), 40, 170), n = 6 + 2 * S.multi + (sy ? 3 : 0);
      crackerThrow(P.x + Math.cos(a) * dd, P.y + Math.sin(a) * dd, a, n, p, g, sy);
      AU.lob(); recoil(a, 1, 0.2); P.sq = 0.15;
    } },
  guqin: { name: 'WAR HORN', zh: '战号', tier: 1, type: 'wave', charge: 0.6, cd: 0.25, desc: 'Hold to draw breath, release a sound wave that rolls through walls. Longer breath, wider and harder.', zhDesc: '按住蓄气，松开吹出可穿墙的音波。蓄得越久越宽越强。',
    syn: { g: 'cresc', name: 'RALLYING CALL', zh: '激昂号角', desc: 'A full breath rings out all around you, and hits 30% harder.', zhDesc: '满蓄的号声化作环身音浪，伤害 +30%。' },
    fire(a, p, g, w, c) {
      const sy = wsyn(w), k = 0.55 + 0.6 * c, full = sy && c >= 1, km = full ? 1.3 : 1;
      pWave(a, full ? Math.PI : 0.45 + 0.35 * c, 120 * S.size * k, 14 * p * k * km, g, sy);
      for (let i = 0; i < S.multi; i++) later(0.09 * (i + 1), () => pWave(P.aim, 0.6, 120 * S.size * k, 8 * p * k, g, sy));
      const f0 = 196 * 2 ** ([0, 4, 7][Math.min(2, Math.floor(c * 2.99))] / 12);
      pSnd('horn', 0.05, () => { AU.tone('triangle', f0 * 0.97, f0, 0.45, 0.12, { a: 0.04, lp: 1200, verb: 0.4 }); AU.tone('sine', f0 / 2, f0 / 2, 0.4, 0.06, { a: 0.05 }); });
      if (full) ringFx(P.x, P.y, 6, 30, 0.3, g ? C.lt : C.gold, 2);
      P.sq = 0.15;
    } },
  kite: { name: 'STORM WISP', zh: '雷灵', tier: 1, type: 'summon', cd: 0.35, desc: 'A storm wisp drifts after your cursor and zaps up to three foes beneath it.', zhDesc: '雷灵跟随光标飘浮，电击其下方最多三个敌人。',
    syn: { g: 'storm', name: 'THUNDERHEAD', zh: '雷暴之灵', desc: 'Every zap calls a golden bolt from the sky and chains to two more foes.', zhDesc: '每次电击都会引下金色天雷，并连锁另外两个敌人。' },
    tick(w, dt) {
      const k = w.kite || (w.kite = { x: P.x, y: P.y - 20 });
      let tx = M.x, ty = M.y; const dd = Math.hypot(tx - P.x, ty - P.y);
      if (dd > 170) { tx = P.x + (tx - P.x) / dd * 170; ty = P.y + (ty - P.y) / dd * 170; }
      const f = 1 - Math.exp(-dt * 5); k.x = lerp(k.x, tx, f); k.y = lerp(k.y, ty, f); w.zapT = Math.max(0, (w.zapT || 0) - dt);
      if (kiteFlying(w) && !G.fx.includes(w.kfx)) G.fx.push(w.kfx = { k: 'kite', w, t: 0, life: 1e9, u: q => { if (!kiteFlying(q.w) || P.dead) q.dead = true; }, d: drawKite });
    },
    fire(a, p, g, w) {
      const k = w.kite || P, hs = new Set();
      for (let i = 0; i < 3; i++) { const e = nearFoe(k.x, k.y, 34, hs); if (!e) break; hs.add(e); kiteZap(k.x, k.y, e, 10 * p, g, i === 0 && wsyn(w)); }
      if (!hs.size) return false; w.zapT = 0.15;
    },
    drawHeld(w, a, h) { prect(h.x - 2, h.y - 2, 5, 5, C.ink); prect(h.x - 1, h.y - 1, 3, 3, C.mid); prect(h.x, h.y, 1, 1, C.cyan); return true; } }, // the wisp's charm stone
  abacus: { name: 'COIN GUN', zh: '金币枪', tier: 0, type: 'gun', cd: 0.34, desc: 'Fires a burst of coins. Hits a little harder the more gold you carry.', zhDesc: '射出一串硬币，身上金币越多伤害越高。',
    syn: { g: 'greed', name: 'TREASURY', zh: '金库', desc: 'Coins turn gold and pierce, gain twice as much from your gold, and foes they slay may drop coins.', zhDesc: '硬币化为金色并可穿透，金币加成翻倍，被其击杀的敌人可能掉落金币。' },
    fire(a, p, g, w) {
      const sy = wsyn(w), gk = 1 + Math.min(1, G.coins / 200) * (sy ? 1 : 0.5), n = 3 + S.multi, m = muzzlePos(a, 9);
      for (let i = 0; i < n; i++) { const b = pShot(m.x, m.y, a + fan(i, n, 0.09) + rand(-0.05, 0.05), 300 + i * 18, 4 * p * gk, { r: 2, life: 0.8, kb: 50, ghost: g, col: sy ? C.gold : undefined, pierce: sy ? 1 : 0 }); b.draw = drawBead; if (sy) b.onHit = beadCoin; }
      muzzle(a, g); recoil(a, 1.2, 0.25);
      pSnd('coin', 0.05, () => { AU.tone('sine', 2400, 2300, 0.05, 0.03); AU.tone('sine', 3100, 3000, 0.04, 0.015, { delay: 0.03 }); AU.nz(0.03, 0.05, { f: 2600, q: 3 }); });
    } },
  laser: { name: 'PRISM RAY', zh: '棱光射线', tier: 1, type: 'stream', cd: 0.08, aw: 0.25, desc: 'Hold for a laser that pierces everything in a line. It burns hotter the longer it stays on.', zhDesc: '按住射出贯穿一线的激光，持续越久越灼热。',
    syn: { g: 'spectrum', name: 'PRISM SPLIT', zh: '三棱分光', desc: 'While fed with colour, the ray splits into three: red, gold and cyan.', zhDesc: '饱含色彩时，激光分裂为红、金、青三道。' },
    fire(a, p, g, w) {
      const ramp = clamp((w.hold || 0) / 1.2, 0, 1), n = 1 + S.multi, dmg = (1.6 + 2.2 * ramp) * p * (n > 1 ? 0.72 : 1);
      if (wsyn(w) && lit() && !g) for (const [da, c] of [[-0.12, C.red], [0, C.gold], [0.12, C.cyan]]) pLaser(a, da, dmg * 0.5, g, ramp, c);
      else for (let i = 0; i < n; i++) pLaser(a, fan(i, n, 0.12), dmg, g, ramp, g ? C.lt : lit() ? hue(G.t * 500 + i * 120) : C.lt);
      P.recoil = Math.min(1.5, P.recoil + 0.04);
      pSnd('laser', 0.1, () => AU.tone('sine', 620 + 300 * ramp, 640 + 300 * ramp, 0.11, 0.02));
    } },
  siphon: { name: 'SIPHON STAFF', zh: '汲色法杖', tier: 1, type: 'stream', cd: 0.1, aw: 0.3, desc: 'Hold to lock a draining tether onto the foe nearest your aim. It pulls three times the usual colour out of it.', zhDesc: '按住向准星附近的敌人射出汲取光束，持续伤害并吸取三倍色能。',
    syn: { g: 'leech', name: 'BLOOD SIPHON', zh: '鲜血汲取', desc: 'The tether drinks life too: every 250 damage it deals heals 1.', zhDesc: '光束同时汲取生命：每造成 250 点伤害回复 1 点生命。' },
    fire(a, p, g, w) {
      const e = siphonTarget(a, w); if (!e) { w.sip = null; return false; }
      w.sip = e; const d = hit(e, 3.4 * p, { kind: 'beam', a: angTo(P, e), kb: 6 });
      if (d > 0 && !g) { gainChroma(d * 0.07); if (wsyn(w) && (w.sipD = (w.sipD || 0) + d) >= 250) { w.sipD -= 250; healP(1); } }
      const col = g ? C.lt : lit() ? hue(G.t * 400) : C.lt;
      G.fx.push({ k: 'siphon', e, t: 0, life: 0.11, col, d: drawSiphon });
      if (!g && Math.random() < 0.6) part(e.x, e.y, (P.x - e.x) * 2.5, (P.y - e.y) * 2.5, 0.4, lit() ? hue(rand(360)) : C.lt, 1, { drag: 1 });
      pSnd('siphon', 0.12, () => AU.tone('triangle', 300, 340, 0.12, 0.02));
    } },
  twinhooks: { name: 'TWIN DAGGERS', zh: '双匕', tier: 1, type: 'blade', cd: 0.16, aw: 0.5, desc: 'Lightning-fast alternating slashes. Every 4th strike chains foes and yanks them in.', zhDesc: '双匕交替疾斩，每第四击甩出锁链，将敌人拽到身前。',
    syn: { g: 'hole', name: 'VOID CHAINS', zh: '虚空锁链', desc: 'The 4th-strike drag tears open a void that holds and shreds foes.', zhDesc: '第四击的拉拽撕开一道虚空，困住并撕碎敌人。' },
    fire(a, p, g, w) {
      const c = g ? 1 : (w.hk = ((w.hk || 0) + 1) % 4);
      if (c === 0) hookPull(a, 48 * S.size, 10 * p, g, wsyn(w));
      else swing(a, { r: 22, arc: 1.8, dmg: 7 * p, kb: 50, ghost: g, dir: c % 2 ? 1 : -1 });
      for (let i = 0; i < S.multi; i++) pShot(P.x + Math.cos(a) * 8, P.y + Math.sin(a) * 8, a + fan(i, S.multi, 0.25), 240, 4 * p, { kind: 'wave', r: 4, life: 0.3, pierce: 99, kb: 50, ghost: g });
      AU.swing(1.5); P.sq = 0.15;
    } },
};
const WTYPE_LABEL = {
  gun: { en: 'GUN', zh: '枪械' }, blade: { en: 'SWORD', zh: '刀剑' }, maul: { en: 'HAMMER', zh: '重锤' }, beam: { en: 'BEAM', zh: '光束' },
  lob: { en: 'EXPLOSIVE', zh: '爆破' }, throw: { en: 'THROWN', zh: '投掷' }, bow: { en: 'BOW', zh: '弓弩' },
  stream: { en: 'STREAM', zh: '持续' }, spear: { en: 'REACH', zh: '长柄' }, scythe: { en: 'SPIN', zh: '回旋' },
  guard: { en: 'GUARD', zh: '格挡' }, mine: { en: 'TRAP', zh: '陷阱' }, summon: { en: 'SUMMON', zh: '召唤' }, brush: { en: 'TOME', zh: '魔典' },
  whip: { en: 'WHIP', zh: '鞭' }, fan: { en: 'GUST', zh: '疾风' }, wave: { en: 'SOUND', zh: '音波' },
};
/* four weapon classes; each draws its power from absorbed colour (色能) in its own way.
   [class, magazine, reload s, damage factor, colour wave dmg (melee) / colour cost per magazine (mag)] */
const WCLS = {
  quill: ['mag', 12, 1.0, 0.95], scatter: ['mag', 2, 1.1, 0.9, 8], needle: ['mag', 40, 1.6, 0.85], revolver: ['mag', 6, 1.0, 0.9], gatling: ['mag', 90, 2.2, 0.75],
  splitter: ['mag', 5, 1.3, 0.9], ricochet: ['mag', 10, 1.1, 0.9], abacus: ['mag', 6, 1.2, 0.9], crossbow: ['mag', 10, 1.3, 0.85], darts: ['mag', 5, 1.2, 0.9],
  blot: ['mag', 3, 1.4, 0.85, 8], firecracker: ['mag', 2, 1.5, 0.85, 8], mine: ['mag', 4, 1.6, 0.85, 10],
  maul: ['charge', 0, 0, 0.85], rail: ['charge', 0, 0, 0.8], bow: ['charge', 0, 0, 0.7], guqin: ['charge', 0, 0, 0.85], staff: ['charge', 0, 0, 0.85], umbrella: ['charge', 0, 0, 0.85], brush: ['charge', 0, 0, 0.8],
  blade: ['melee', 0, 0, 0.9, 14], spear: ['melee', 0, 0, 0.9, 16], scythe: ['melee', 0, 0, 0.85, 12], whip: ['melee', 0, 0, 0.9, 12], twinhooks: ['melee', 0, 0, 0.85, 9], chakram: ['melee', 0, 0, 0.9, 10], fan: ['melee', 0, 0, 0.9, 10],
  flamer: ['beam', 0, 0, 0.65], stylus: ['beam', 0, 0, 0.7], kite: ['beam', 0, 0, 0.75], laser: ['beam', 0, 0, 0.9], siphon: ['beam', 0, 0, 1],
};
for (const id in WCLS) { const [cls, mag, rl, dm, x] = WCLS[id], D = WEAPONS[id]; Object.assign(D, { cls, dm }); if (mag) Object.assign(D, { mag, rl, sc: x || 15 }); if (cls === 'melee') D.mw = x; }
const CLS = {
  mag: { en: 'MAGAZINE', zh: '弹匣', rule: ['Reloads. A reload drinks {c} colour: the whole magazine becomes colour rounds (+35%).', '需要装填。装填时吸取 {c} 色能，整匣化为彩弹（伤害 +35%）。'] },
  charge: { en: 'CHARGE', zh: '蓄力', rule: ['Hold, release. Keep holding at full charge to drink colour: up to +60%.', '按住蓄力，松开出手。满蓄后继续按住吸取色能，最多 +60%。'], manual: ['Hold, release. A release with 10+ colour spends it: +40%.', '按住蓄力，松开出手。出手时若有 10 点以上色能则消耗它，威力 +40%。'] },
  melee: { en: 'MELEE', zh: '近战', rule: ['Close range, reflects bullets, absorbs double colour. Every 3rd strike spends 8 colour on a colour blade.', '近身攻击，可反弹子弹，吸色翻倍。每第 3 击消耗 8 色能斩出彩刃。'] },
  beam: { en: 'BEAM', zh: '光束', rule: ['Never reloads. Grey without colour; fed by colour it burns +50% (drains while firing).', '无限弹药。没有色能时是灰光；有色能时化为彩光，伤害 +50%（射击时持续消耗）。'] },
};
const wtype = type => WTYPE_LABEL[type][LANG === 'zh' ? 'zh' : 'en'];
const wcls = D => `${CLS[D.cls][LANG === 'zh' ? 'zh' : 'en']} · ${wtype(D.type)}`;
const clsRule = D => { const C0 = CLS[D.cls], r = D.manual && C0.manual ? C0.manual : C0.rule; return r[LANG === 'zh' ? 1 : 0].replace('{c}', D.sc); };
const mkWeapon = (id, lv = 1) => {
  const D = WEAPONS[id], w = { id, lv, cd: 0, ch: 0, chg: false, full: false, combo: 0, comboT: 0, out: 0, oc: 0, sat: 0, mN: 0 };
  if (D.mag) { w.ammo = w.ammoMax = D.mag; w.reload = 0; w.rlMax = D.rl; }
  return w;
};
const curW = () => P.ws[P.wi];

/* ---------- heroes ---------- */
const hero = () => HEROES[G.hero || 'knight'];
const dualOn = () => G.hero === 'knight' && P.skT > 0;
const HEROES = {
  knight: { name: 'KNIGHT', zh: '骑士', hp: 6, col: C.cyan, desc: 'Steadfast: +1 max shield.', zhDesc: '坚守：护盾上限 +1。', ap: s => { s.maxSh += 1; },
    icon: ['...dd...', '..wwww..', '.wwwwww.', '.##cc##.', '.wwwwww.', '.wwwwww.', '..wddw..', '........'],
    skill: { name: 'DUAL WIELD', zh: '双持', cd: 20, dur: 6, desc: 'For 6s your off-hand weapon fights alongside the main one at 70% power.', zhDesc: '6 秒内，副手武器以 70% 威力与主武器一同攻击。',
      cast() { AU.charged(); AU.swap(); ringFx(P.x, P.y - 2, 4, 26, 0.3, C.cyan, 2); burst(P.x, P.y - 4, 12, C.cyan, 90, 0.35); P.sq = 0.4; } } },
  rogue: { name: 'ROGUE', zh: '游荡者', hp: 5, col: C.red, desc: 'Quick and sharp: +8% crit chance, dash recharges 20% faster.', zhDesc: '迅捷锋利：暴击率 +8%，冲刺冷却 -20%。', ap: s => { s.crit += 0.08; s.dashCd -= 0.2; },
    icon: ['..dddd..', '.dddddd.', 'dd####dd', '.d#ww#d.', '.rrrrrr.', '..rrrr.r', '..wwww.r', '........'],
    skill: { name: 'SHADOW STEP', zh: '影袭', cd: 8, dur: 0, desc: 'Blink toward the cursor, cutting every foe on the path. Your next 3 hits crit.', zhDesc: '向光标瞬移，斩过路径上的所有敌人；之后 3 次命中必定暴击。', cast: shadowStep } },
  sage: { name: 'WIZARD', zh: '巫师', hp: 6, col: C.frost, desc: 'Chroma charges 30% faster and lasts 1.5s longer.', zhDesc: '色彩充能快 30%，持续时间 +1.5 秒。', ap: s => { s.over += 0.75; },
    icon: ['......c.', '.....m..', '....mmd.', '...mmmd.', '..ffffd.', 'mmmmmmmm', '..#cc#..', '..wwww..'],
    skill: { name: 'ARCANE TOTEM', zh: '奥术图腾', cd: 15, dur: 7, desc: 'Raise a rune obelisk at the cursor for 7s: it fires homing arcane bolts and slows nearby foes.', zhDesc: '在光标处立起奥术图腾 7 秒：持续发射追踪奥术飞弹，并减速周围敌人。', cast: plantTotem } },
  gilder: { name: 'PALADIN', zh: '圣骑士', hp: 7, col: C.gold, desc: 'Blessed purse: +50% gold, shop prices -15%.', zhDesc: '神眷：金币 +50%，商店价格 -15%。', ap: s => { s.greed += 0.5; s.shop -= 0.15; },
    icon: ['...yy...', '..gyyg..', '.gwwwwg.', '.y#cc#y.', '.gww#wg.', '.gww#wg.', '..yyyy..', '........'],
    skill: { name: 'DIVINE SHIELD', zh: '圣盾', cd: 16, dur: 2, desc: 'A golden dome shields you for 2s: you are untouchable and bullets that strike it are reflected. It ends in a nova.', zhDesc: '金色圣盾笼罩全身 2 秒：期间无敌，击中圣盾的子弹会被反弹，结束时释放冲击波。',
      cast() { ringFx(P.x, P.y - 2, 4, 18, 0.3, C.gold, 2); burst(P.x, P.y - 4, 10, C.gold, 80, 0.4); AU.shieldUp(); pSnd('dome', 0.2, () => { AU.tone('sine', 440, 660, 0.5, 0.05, { a: 0.06, verb: 0.5 }); AU.tone('triangle', 220, 330, 0.4, 0.04, { a: 0.05 }); }); },
      tick() { for (const b of G.bullets) if (b.team === 'e' && !b.dead && !b.beam && d2(b.x, b.y, P.x, P.y - 2) < (16 + b.r) ** 2) { pReflect(b); pSnd('dome-r', 0.05, () => AU.reflect()); } },
      end() { nova(60, 1.5); ringFx(P.x, P.y, 6, 70, 0.4, C.gold, 3); burst(P.x, P.y - 4, 16, C.gold, 140, 0.5); pSnd('dome-end', 0.2, () => { AU.nz(0.3, 0.12, { f: 1600, f2: 400, q: 0.7, verb: 0.4 }); AU.tone('sine', 660, 330, 0.3, 0.05, { verb: 0.4 }); }); shake(0.12); } } },
};
function shadowStep() {
  const a = P.aim, x0 = P.x, y0 = P.y;
  moveBody(P, Math.cos(a) * Math.min(100, Math.hypot(M.x - P.x, M.y - P.y)), Math.sin(a) * Math.min(100, Math.hypot(M.x - P.x, M.y - P.y)));
  const x1 = P.x, y1 = P.y, L = Math.hypot(x1 - x0, y1 - y0), ca = L ? (x1 - x0) / L : 0, sa = L ? (y1 - y0) / L : 0;
  for (const e of G.enemies) { if (e.dead) continue; const s = clamp((e.x - x0) * ca + (e.y - y0) * sa, 0, L); if (d2(x0 + ca * s, y0 + sa * s, e.x, e.y) < (e.r + 9) ** 2) hit(e, 24 * FL(), { kind: 'm', a, kb: 150, heavy: true }); }
  for (let i = 0; i < 6; i++) P.after.push({ x: lerp(x0, x1, i / 6), y: lerp(y0, y1, i / 6), t: 0.08 + 0.025 * i });
  G.fx.push({ k: 'sstep', x0, y0, x1, y1, t: 0, life: 0.28, d: (f, k) => { const w = Math.max(1, Math.round(4 * (1 - k))); pline(f.x0, f.y0, f.x1, f.y1, C.ink, w + 2); pline(f.x0, f.y0, f.x1, f.y1, k < 0.5 ? C.white : C.red, w); } });
  inkDrops(x0, y0, a + Math.PI, 6, 1, 80); burst(x1, y1, 8, C.red, 90, 0.3);
  P.inv = Math.max(P.inv, 0.3); P.critN = 3; P.kx = P.ky = 0; P.vx = Math.cos(a) * 60; P.vy = Math.sin(a) * 60; P.sq = -0.4;
  AU.dash(); AU.slash();
}
function plantTotem() {
  const A = arena(), x = clamp(M.x, A.x0 + 8, A.x1 - 8), y = clamp(M.y, A.y0 + 16, A.y1 - 6);
  G.fx.push({ k: 'totem', x, y, t: 0, life: HEROES.sage.skill.dur, cd: 0.2, fl: 0,
    u: (f, dt) => {
      for (const e of G.enemies) if (!e.dead && !e.boss && d2(e.x, e.y, f.x, f.y) < 48 * 48) { e.chill = Math.max(e.chill || 0, 3); e.chillT = Math.max(e.chillT || 0, 0.3); }
      f.fl = Math.max(0, f.fl - dt); f.cd -= dt; if (f.cd > 0) return;
      const e = nearFoe(f.x, f.y, 180); if (!e) return;
      f.cd = 0.35; f.fl = 0.1; pShot(f.x, f.y - 16, Math.atan2(e.y - f.y + 16, e.x - f.x), 200, 7 * FL(), { kind: 'mote', home: 9, r: 1.5, life: 1.6, col: C.cyan, noSize: true });
      pSnd('totem', 0.1, () => AU.tone('sine', 1100, 1400, 0.08, 0.03, { verb: 0.3 }));
    },
    d: (f, k) => {
      if (k > 0.85 && ((f.t * 16) | 0) % 2) return;
      const x = Math.round(f.x), y = Math.round(f.y), s = f.t * 0.8;
      for (let i = 0; i < 16; i += 2) parc(x, y, 48, s + i * TAU / 16, s + (i + 1) * TAU / 16, C.frost, 1);
      // a stone obelisk on a plinth: its runes and the crystal above it glow cyan and flash white as it fires
      const rc = f.fl > 0 ? C.white : C.cyan;
      shadow(x, y + 2, 6);
      prect(x - 4, y - 1, 9, 4, C.ink); prect(x - 3, y, 7, 2, C.mid);
      prect(x - 3, y - 12, 7, 12, C.ink); prect(x - 2, y - 11, 5, 11, C.mid); prect(x + 1, y - 11, 1, 11, C.dk);
      prect(x - 2, y - 14, 5, 2, C.ink); prect(x - 1, y - 13, 3, 2, C.mid); prect(x, y - 15, 1, 1, C.ink);
      prect(x - 1, y - 10, 3, 1, rc); prect(x, y - 9, 1, 2, rc); prect(x - 1, y - 6, 1, 2, rc); prect(x + 1, y - 6, 1, 2, rc); prect(x, y - 3, 1, 1, rc);
      pc(x, y - 17, 2, C.ink); pc(x, y - 17, 1, rc);
    } });
  ringFx(x, y, 4, 48, 0.4, C.cyan, 2); burst(x, y - 6, 14, C.mid, 90, 0.4, 2); AU.lob();
}
// knight's off-hand during DUAL WIELD: fires on its own cooldown; charge weapons loose a 75% draw, the tome traces a short straight rune line
function offFire(o, rate) {
  const D = WEAPONS[o.id], ca = Math.cos(P.aim), sa = Math.sin(P.aim);
  if (o.reload > 0) return;
  const c = D.charge ? 0.75 : o.id === 'brush' ? Array.from({ length: 10 }, (_, i) => ({ x: P.x + ca * (12 + i * 6), y: P.y + sa * (12 + i * 6) })) : 0;
  if (doAttack(o, P.aim, 0.7, false, c) !== false) o.cd = (D.charge ? D.cd + D.charge * 0.75 : D.cdf ? D.cdf(o) : D.cd) / rate;
}
/* colour (色能) feeding the weapon: does this attack draw on it, and how much stronger is it */
function satOf(w, D, c) {
  const free = P.chromaT > 0;
  if (D.cls === 'mag') return free || w.sat > 0 ? 1.35 : 1;
  if (D.cls === 'beam') return free || P.chroma > 0 ? 1.5 : 1;
  if (D.cls === 'charge') return D.manual ? (free || P.chroma >= 10 && c ? 1.4 : 1) : 1 + 0.6 * (free ? 1 : w.oc); // a manual release only drinks colour when it carries something (caught bullets, a rune line)
  return 1;
}
function satPay(w, D, sat) {
  if (P.chromaT > 0) return;
  if (D.cls === 'mag') { if (w.sat > 0) w.sat--; }
  else if (D.cls === 'beam') P.chroma = Math.max(0, P.chroma - 7 * (D.cdf ? D.cdf(w) : D.cd));
  else if (D.cls === 'charge' && D.manual && sat > 1) P.chroma -= 10;
}
// a ghost replay (echo, mirage, dual wield) of an attack: no ammo, no colour, same multishot split
function fireGhost(w, a, p, c) { G.wmk = S.multi ? 0.72 : 1; WEAPONS[w.id].fire(a, p, true, w, c); G.wmk = 0; }
// melee: every 3rd strike spends colour on a blade of light that flies on
function colourBlade(a, dmg, g) {
  const b = pShot(P.x + Math.cos(a) * 8, P.y + Math.sin(a) * 8, a, 270, dmg, { kind: 'wave', r: 6, life: 0.5, pierce: 99, kb: 110, ghost: g });
  b.sat = !g; if (!g) { burst(b.x, b.y, 6, hue(G.t * 500), 100, 0.3); pSnd('cblade', 0.08, () => AU.tone('sine', 900, 1300, 0.14, 0.03, { verb: 0.3 })); }
}
// c is the charge for charge weapons, or the payload of a manual weapon (tower shield: bullets caught, tome: rune-line points)
function doAttack(w, a, p, ghost, c) {
  const D = WEAPONS[w.id];
  if (!ghost && D.mag && !(w.ammo > 0)) return false;
  const sat = ghost ? w.lastSat || 1 : satOf(w, D, c);
  p *= wLvMul(w) * D.dm * sat;
  G.wsat = sat > 1.15; G.wmk = S.multi ? 0.72 : 1;
  const ok = D.fire(a, p, ghost, w, c || 0) !== false;
  G.wsat = false; G.wmk = 0;
  if (!ok) return false;
  if (!ghost) {
    w.lastSat = sat; satPay(w, D, sat);
    if (D.mag) { w.ammo--; w.shotT = G.t; if (w.ammo <= 0) startReload(w); }
    if (D.cls === 'melee' && (w.mN += D.aw ?? 1) >= 3) { w.mN -= 3; if (P.chromaT > 0 || P.chroma >= 8) { if (P.chromaT <= 0) P.chroma -= 8; colourBlade(a, D.mw * p, false); } } // fast blades count as part-strikes
    if (dualOn() && !P.ws[1 - P.wi] && w === curW()) later(0.06, () => { if (!P.dead && G.state === 'play') fireGhost(w, P.aim, p * 0.7, c || 0); });
    const aw = D.aw ?? 1;
    G.atk += aw;
    w.ea = (w.ea || 0) + aw;
    if (w.ea >= 0.999) { // a full attack's worth: only now do ECHO and SEEKER fire
      w.ea -= 1;
      gAttack(w, a, p, c || 0);
      if (S.echo) { const em = G.syn.has('chorus') ? 1 : S.echoMul; later(0.16, () => { if (!P.dead && G.state === 'play') fireGhost(w, P.aim, p * em, c || 0); }); }
      G.atkN = (G.atkN || 0) + 1;
      if (S.seeker && G.atkN % 3 === 0) for (let i = 0; i < 1 + S.seeker; i++) pShot(P.x, P.y - 3, a + rand(-1.4, 1.4), 150, 5 * FL(), { kind: 'mote', home: 7, r: 1.5, life: 1.8, col: C.cyan, noSize: true });
    }
  }
  return true;
}
/* magazines: reload when empty or after a moment without firing; a finished reload drinks colour for a magazine of colour rounds */
function startReload(w) {
  const D = WEAPONS[w.id]; if (w.reload > 0 || w.ammo >= w.ammoMax) return;
  w.reload = w.rlMax = D.rl;
  if (w === curW()) pSnd('rl-out', 0.1, () => AU.nz(0.05, 0.06, { f: 2600, q: 2 }));
}
function finishReload(w) {
  const D = WEAPONS[w.id]; w.reload = 0; w.ammo = w.ammoMax;
  if (w.sat < w.ammoMax && P.chromaT <= 0 && P.chroma >= D.sc) { P.chroma -= D.sc; w.sat = w.ammoMax; ringFx(P.x, P.y - 2, 3, 16, 0.3, hue(G.t * 300), 1); burst(P.x, P.y - 3, 6, hue(G.t * 400), 70, 0.3); }
  if (w === curW()) { AU.tink(); if (w.sat > 0) pSnd('rl-sat', 0.1, () => AU.tone('sine', 1500, 1900, 0.1, 0.03, { verb: 0.3 })); }
}
function updWeapon(dt) {
  const cw = curW(), rate = S.rate * rateMul();
  for (const w of P.ws) { // only weapons in use reload: the one in hand, and the off-hand while dual wielding
    if (!w || !w.ammoMax || w !== cw && !dualOn()) continue;
    if (w.reload > 0) { w.reload -= dt * rate; if (w.reload <= 0) finishReload(w); }
    else if (w.ammo < w.ammoMax && !(w === cw && M.l) && G.t - (w.shotT ?? -9) > 1.2) startReload(w);
  }
  for (const w of P.ws) if (w && w !== cw) { w.cd -= dt; w.chg = false; w.ch = 0; w.oc = 0; w.hold = 0; const D = WEAPONS[w.id]; if (D.tick) D.tick(w, dt, false, false, rate); }
  const w = cw; if (!w) return;
  const D = WEAPONS[w.id];
  w.cd -= dt; if (w.comboT > 0) { w.comboT -= dt; if (w.comboT <= 0) w.combo = 0; }
  const can = !P.lock && P.dash <= 0;
  if (!M.l) w.hold = 0; else if (can) w.hold = (w.hold || 0) + dt;
  if (wsyn(w) && Math.random() < dt * 4) { const m = muzzlePos(P.aim, WSPR[w.id].len); part(m.x + rand(-2, 2), m.y + rand(-2, 2), 0, -15, 0.45, C.gold, 1, { drag: 0.95 }); }
  if (dualOn()) { const o = P.ws[1 - P.wi]; if (o && M.l && can && o.cd <= 0) offFire(o, rate); }
  if (D.tick) D.tick(w, dt, true, can, rate);
  if (D.manual || w.reload > 0) return;
  if (D.charge) {
    if (M.l && w.cd <= 0) {
      if (!can) return;
      if (!w.chg) { w.chg = true; w.ch = 0; w.full = false; w.oc = 0; }
      w.ch = Math.min(1, w.ch + dt * rate / D.charge); AU.charge(w.ch);
      if (w.ch >= 1 && !w.full) { w.full = true; AU.charged(); burst(P.x, P.y - 4, 8, C.white, 70, 0.3); P.sq = 0.4; }
      // held past full: drink colour into an overcharge (15 colour fills it)
      if (w.full && w.oc < 1 && P.chromaT <= 0 && P.chroma > 0) {
        const d = Math.min(P.chroma, 30 * dt * rate); P.chroma -= d; w.oc = Math.min(1, w.oc + d / 15);
        if (Math.random() < 0.5) { const an = rand(TAU); part(P.x + Math.cos(an) * 14, P.y - 3 + Math.sin(an) * 12, -Math.cos(an) * 60, -Math.sin(an) * 50, 0.25, hue(rand(360)), 1, { drag: 0.9 }); }
        if (w.oc >= 1) { AU.charged(); ringFx(P.x, P.y - 3, 14, 4, 0.25, hue(G.t * 400), 2); P.sq = 0.4; }
      }
    } else if (w.chg && can) { w.chg = false; doAttack(w, P.aim, 1, false, w.ch); w.cd = D.cd / rate; w.ch = 0; w.oc = 0; }
  } else if (M.l && w.cd <= 0 && can) {
    if (doAttack(w, P.aim, 1, false) !== false) w.cd = (D.cdf ? D.cdf(w) : D.cd) / rate;
  }
}

/* ---------- player update ---------- */
function updPlayer(dt) {
  if (P.dead) return;
  let mx = 0, my = 0;
  if (!P.lock) { if (K.a || K.arrowleft) mx--; if (K.d || K.arrowright) mx++; if (K.w || K.arrowup) my--; if (K.s || K.arrowdown) my++; }
  const ml = Math.hypot(mx, my); if (ml) { mx /= ml; my /= ml; }
  P.moving = ml > 0;
  P.aim = Math.atan2(M.y - P.y, M.x - P.x);
  const tile = tileUnder(P);
  const w = curW(), D = w && WEAPONS[w.id];
  let spd = 92 * S.spd * (P.chromaT > 0 ? 1.2 : 1) * (tile === TP ? 0.62 : 1) * (w && w.chg ? (D.type === 'maul' || D.type === 'bow' ? 0.62 : 0.8) : 1) * (D && D.moveMul ? D.moveMul(w) : 1) * (D && D.cls === 'beam' && w.hold > 0 ? 0.8 : 1);
  P.dashCd -= dt;
  if (!P.lock && (KP[' '] || M.rp || KP.shift) && P.dashCd <= 0 && P.dash <= 0) {
    P.dashA = ml ? Math.atan2(my, mx) : P.aim; P.dash = 0.16; P.dashCd = 0.58 * Math.max(0.35, S.dashCd); P.inv = Math.max(P.inv, 0.22);
    P.dashHit = new Set(); AU.dash(); P.sq = -0.5; gDash(); if (D && D.onDash) D.onDash(w);
    for (let i = 0; i < 8; i++) part(P.x, P.y + 4, -Math.cos(P.dashA) * rand(20, 70) + rand(-20, 20), -Math.sin(P.dashA) * rand(20, 70) + rand(-20, 20), 0.4, C.lt, 2, { drag: 0.85 });
  }
  if (P.dash > 0) {
    P.dash -= dt;
    P.vx = Math.cos(P.dashA) * 330; P.vy = Math.sin(P.dashA) * 330;
    if (((G.t * 60) | 0) % 2 === 0) P.after.push({ x: P.x, y: P.y, t: 0.22 });
    if (S.phantom) {
      for (const b of G.bullets) if (b.team === 'e' && !b.dead && !b.beam && d2(b.x, b.y, P.x, P.y) < 14 * 14) { b.dead = true; burst(b.x, b.y, 3, C.white, 60, 0.2); gainChroma(1); }
      for (const e of G.enemies) if (!e.dead && !P.dashHit.has(e) && d2(e.x, e.y, P.x, P.y) < (e.r + 9) ** 2) { P.dashHit.add(e); hit(e, (10 + 8 * S.phantom) * FL(), { kind: 'm', a: P.dashA, kb: 120 }); }
      decalDot(P.x, P.y + 3, 1.5, 'rgba(18,18,22,0.25)');
    }
    gDashing(dt);
    if (P.dash <= 0) { P.vx *= 0.35; P.vy *= 0.35; P.sq = 0.35; if (G.syn.has('wraith')) nova(48, 0.7); gDashEnd(); if (D && D.dashEnd) D.dashEnd(w); }
  } else {
    const k = 1 - Math.exp(-dt * 16);
    P.vx = lerp(P.vx, mx * spd, k); P.vy = lerp(P.vy, my * spd, k);
  }
  moveBody(P, (P.vx + P.kx) * dt, (P.vy + P.ky) * dt);
  const kd = Math.exp(-dt * 9); P.kx *= kd; P.ky *= kd;
  if (P.moving && P.dash <= 0) { P.walkT += dt; if (tile === TP && Math.random() < 0.3) { part(P.x + rand(-3, 3), P.y + 4, rand(-20, 20), rand(-30, -10), 0.3, '#5c5d64', 1); AU.splash(); } }
  for (const a of P.after) a.t -= dt; P.after = P.after.filter(a => a.t > 0);
  P.inv -= dt; P.sq *= Math.exp(-dt * 12); P.recoil *= Math.exp(-dt * 10);
  // shield regen
  P.shT += dt;
  if (P.sh < P.maxSh && P.shT > 3.2 / S.shRegen) { P.shTick -= dt; if (P.shTick <= 0) { P.shTick = 1.0 / S.shRegen; P.sh++; AU.shieldUp(); ringFx(P.x, P.y - 2, 3, 12, 0.3, C.white); } }
  // hero skill (R)
  const H = hero(); P.skCd = Math.max(0, P.skCd - dt);
  if (P.skT > 0) { P.skT -= dt; if (H.skill.tick) H.skill.tick(dt); if (P.skT <= 0) { P.skT = 0; if (H.skill.end) H.skill.end(); } }
  if (KP.r && P.skCd <= 0 && !P.lock) { P.skCd = H.skill.cd; P.skT = H.skill.dur; H.skill.cast(); }
  // combo
  if (P.comboT > 0) { P.comboT -= dt; if (P.comboT <= 0) P.combo = 0; }
  // chroma
  if (P.chromaT > 0) { P.chromaT -= dt; if (P.chromaT <= 0) { UI.chromaEnd(); gChroma(false); } }
  else if (KP.f && P.chroma >= 100 && !P.lock) unleashChroma();
  // spikes
  if (tile === TS && spikePhase() === 2) hurtPlayer(1, P.x, P.y + 8);
  // swap
  if (!P.lock && (KP.q || M.wheel) && P.ws[1 - P.wi]) { P.wi = 1 - P.wi; AU.swap(); UI.weapons(); }
  updWeapon(dt);
  updHalo(dt);
  if (P.swingA) { P.swingA.t += dt; if (P.swingA.t > 0.16) P.swingA = null; }
}
function updHalo(dt) {
  if (!S.halo) return;
  P.haloA += dt * 3.2;
  const n = 3 + S.multi, R = 22 * S.size;
  for (let i = 0; i < n; i++) {
    const a = P.haloA + i / n * TAU, x = P.x + Math.cos(a) * R, y = P.y - 2 + Math.sin(a) * R * 0.8;
    for (const b of G.bullets) if (b.team === 'e' && !b.dead && !b.beam && d2(b.x, b.y, x, y) < (b.r + 4) ** 2) { b.dead = true; burst(b.x, b.y, 3, C.white, 50, 0.2); }
    for (const e of G.enemies) {
      if (e.dead || d2(e.x, e.y, x, y) > (e.r + 4) ** 2) continue;
      const last = P.haloHit.get(e) || 0; if (G.t - last < 0.3) continue;
      P.haloHit.set(e, G.t); hit(e, 6 * FL(), { kind: 'm', a, kb: 60 });
    }
  }
}
function nova(r, mul = 1) {
  blast(P.x, P.y, r, (14 + 10 * Math.max(1, S.thorns)) * FL() * mul, { clear: true, quiet: true, noProc: true });
  ringFx(P.x, P.y, 4, r, 0.3, C.white, 3); ringFx(P.x, P.y, 2, r + 4, 0.35, C.ink, 1);
}
function unleashChroma() {
  P.chroma = 0; P.chromaT = 6 + 2 * S.over;
  hitstop(0.14); invFlash(3); slowmo(0.6, 0.3); shake(0.6); AU.chroma();
  blast(P.x, P.y, 95, 30 * FL(), { clear: true, quiet: true });
  clearEB(P.x, P.y, 400);
  for (let i = 0; i < 6; i++) ringFx(P.x, P.y, 4, 60 + i * 30, 0.35 + i * 0.08, hue(i * 60), 2);
  for (let i = 0; i < 40; i++) { const a = rand(TAU); part(P.x, P.y, Math.cos(a) * rand(80, 260), Math.sin(a) * rand(80, 260), rand(0.4, 0.9), hue(rand(360)), randi(1, 3), { drag: 0.9 }); }
  UI.banner(t('chromaB'), t('chromaSub'), 'chroma'); gChroma(true);
}
function healP(n, quiet) {
  if (P.hp >= P.maxHp) return;
  P.hp = Math.min(P.maxHp, P.hp + n);
  if (!quiet) AU.heal();
  num(P.x, P.y - 12, '+' + n, false, C.red);
  for (let i = 0; i < 8; i++) part(P.x + rand(-6, 6), P.y + rand(-4, 4), 0, rand(-40, -20), 0.6, C.red, 1, { drag: 0.95 });
  UI.hp();
}
function hurtPlayer(d, sx, sy) {
  if (P.inv > 0 || P.dash > 0 || P.dead || G.state !== 'play' || G.trans || P.lock || (G.hero === 'gilder' && P.skT > 0)) return false;
  const a = Math.atan2(P.y - sy, P.x - sx);
  if (gBlock()) { P.inv = 0.6; clearEB(P.x, P.y, 40); return true; }
  if (S.thorns) nova(64 * (G.syn.has('spiked') ? 1.5 : 1), G.syn.has('spiked') ? 2 : 1);
  if (P.sh > 0) { P.sh--; AU.shieldBreak(); burst(P.x, P.y - 4, 16, C.white, 130, 0.4); P.inv = 0.75; UI.flash('shield'); gShieldHit(); }
  else { P.hp -= d; AU.hurt(); P.inv = 1.1; invFlash(2); UI.flash('hurt'); slowmo(0.45, 0.3); inkDrops(P.x, P.y, a, 10, 1, 90); num(P.x, P.y - 12, '-' + d, false, C.red); gHpLoss(); }
  P.shT = 0; P.shTick = 0; P.kx += Math.cos(a) * 190; P.ky += Math.sin(a) * 190; hitstop(0.09); shake(0.5);
  clearEB(P.x, P.y, 40); P.combo = Math.floor(P.combo / 2); P.sq = 0.5;
  UI.hp();
  if (P.hp <= 0 && !gRevive() && !metaRevive()) playerDie();
  return true;
}

/* ---------- player draw ---------- */
function drawWeaponHeld() {
  const w = curW(); if (!w) return;
  const o = dualOn() && P.ws[1 - P.wi];
  if (o) { // the off-hand weapon, held on the other side while DUAL WIELD lasts
    const Do = WEAPONS[o.id], wo = WSPR[o.id], a = P.aim, h = { x: P.x - Math.cos(a) * 2 + Math.sin(a) * 4, y: P.y + 2 - Math.cos(a) * 3 }, flip = Math.cos(a) < 0;
    if (!(Do.drawHeld && Do.drawHeld(o, a, h, flip))) drawRot(wo.s, h.x, h.y, a, wo.ox, wo.oy, flip);
  }
  const D = WEAPONS[w.id], ws = WSPR[w.id]; let a = P.aim;
  if (P.swingA) { const k = Math.min(1, P.swingA.t / 0.1); a = lerp(P.swingA.a0, P.swingA.a1, 1 - (1 - k) ** 2); }
  const h = handPos(a), flip = Math.cos(a) < 0;
  if (D.drawHeld && D.drawHeld(w, a, h, flip)) return;
  let back = 0;
  if (w.chg) back = (D.type === 'bow' ? 2 : 1) * w.ch * 2 + (w.full ? Math.sin(G.t * 60) * 0.6 : 0);
  const rk = P.recoil * 2 + back;
  const img = w.full && ((G.t * 20) | 0) % 2 ? ws.wh : ws.s;
  drawRot(img, h.x - Math.cos(a) * rk, h.y - Math.sin(a) * rk, a, ws.ox, ws.oy, flip);
  if (D.type === 'bow' && w.chg) {
    const pull = 2 + w.ch * 4, hx = h.x - Math.cos(a) * pull, hy = h.y - Math.sin(a) * pull, px = -Math.sin(a), py = Math.cos(a);
    pline(h.x + px * 4, h.y + py * 4, hx, hy, C.lt); pline(h.x - px * 4, h.y - py * 4, hx, hy, C.lt);
    pline(hx, hy, hx + Math.cos(a) * 8, hy + Math.sin(a) * 8, w.full ? C.gold : C.dk, 1);
  }
  if (w.id === 'chakram') for (let i = 0; i < Math.min(2 + S.multi, 2 + S.multi - w.out) - 1; i++) pc(P.x - Math.cos(a) * 5, P.y + 3 - i * 2, 1, C.dk);
}
function drawPlayer() {
  if (P.dead) return;
  for (const a of P.after) { const al = a.t / 0.22; prect(a.x - 4, a.y - 5, 9, 10, al > 0.5 ? C.lt : C.paper2); }
  shadow(P.x, P.y + 5, 5);
  if (S.halo) { const n = 3 + S.multi, R = 22 * S.size; for (let i = 0; i < n; i++) { const a = P.haloA + i / n * TAU; const x = P.x + Math.cos(a) * R, y = P.y - 2 + Math.sin(a) * R * 0.8; pc(x, y, 4, C.ink); pc(x, y, 3, P.chromaT > 0 ? hue(G.t * 300 + i * 90) : C.white); } }
  const blink = P.inv > 0 && P.dash <= 0 && ((G.t * 18) | 0) % 2;
  const aimDown = Math.sin(P.aim) > 0.1;
  if (!aimDown) drawWeaponHeld();
  const sq = P.sq, bw = Math.round(9 * (1 + sq * 0.35)), bh = Math.round(10 * (1 - sq * 0.3));
  const bob = P.moving && P.dash <= 0 ? Math.round(Math.abs(Math.sin(P.walkT * 11))) : 0;
  const x0 = Math.round(P.x - bw / 2), y0 = Math.round(P.y + 5 - bh - bob);
  const ol = P.chromaT > 0 ? hue(G.t * 400) : C.ink, body = blink ? C.mid : C.white;
  // feet
  const st = P.moving ? (Math.sin(P.walkT * 11) > 0 ? 1 : -1) : 0;
  prect(P.x - 4, P.y + 4 + (st > 0 ? -1 : 0), 3, 2, C.ink); prect(P.x + 1, P.y + 4 + (st < 0 ? -1 : 0), 3, 2, C.ink);
  // cape
  const cdx = -Math.round(clamp(P.vx / 60, -2, 2)), cdy = Math.round(clamp(-P.vy / 80, -1, 1));
  const fr = G.frags || {}, hid = G.hero || 'knight';
  if (hid === 'sage') { // the wizard's staff, slung on the side away from the aim; its head glows cyan
    const sx = Math.cos(P.aim) < 0 ? x0 + bw + 1 : x0 - 2;
    prect(sx - 1, y0 - 3, 3, bh + 4, C.ink); prect(sx, y0 - 2, 1, bh + 2, C.mid);
    pc(sx, y0 - 4, 2, C.ink); pc(sx, y0 - 4, 1, C.cyan); if (((G.t * 3) | 0) % 2) prect(sx, y0 - 4, 1, 1, C.white);
  }
  prect(x0 + 1 + cdx, y0 + 4 + cdy, bw - 2, bh - 3, fr.red ? C.redDk : C.dk); if (fr.red) prect(x0 - 1 + cdx * 2, y0 + 5 + cdy, bw + 2, bh - 3, C.red);
  // body
  prect(x0, y0 - 1, bw, 1, ol); prect(x0, y0 + bh, bw, 1, ol); prect(x0 - 1, y0, 1, bh, ol); prect(x0 + bw, y0, 1, bh, ol);
  prect(x0, y0, bw, bh, body);
  prect(x0, y0 + bh - 3, bw, 1, fr.gold ? C.gold : C.lt);
  // visor + eye (glows cyan — the only color the knight still owns)
  prect(x0, y0 + 3, bw, 2, C.ink);
  const ex = Math.round(x0 + bw / 2 - 1 + Math.cos(P.aim) * 2);
  prect(ex, y0 + 3, 2, 1, P.chromaT > 0 ? hue(G.t * 700) : C.cyan);
  // head piece per hero: knight plume, rogue hood + red scarf, wizard pointed hat, paladin crested helm + hip shield (the cyan fragment tints it)
  const pdx = -Math.round(clamp(P.vx / 50, -2, 2));
  const plc = fr.cyan ? C.cyan : C.dk;
  if (hid === 'knight') { prect(x0 + (bw >> 1) - 1 + pdx, y0 - 3, 2, 2, plc); prect(x0 + (bw >> 1) - 1 + pdx * 2, y0 - 4, 2, 1, plc); }
  else if (hid === 'rogue') {
    prect(x0, y0 - 3, bw, 2, C.ink); prect(x0 + 1, y0 - 2, bw - 2, 1, plc);
    prect(x0 - 1, y0 + 5, bw + 2, 1, C.red);
    const tx = P.vx > 8 ? x0 - 3 : P.vx < -8 ? x0 + bw + 1 : x0 + bw - 1; prect(tx, y0 + 5 + (((G.t * 8) | 0) % 2), 3, 1, C.red);
  } else if (hid === 'sage') { // a wide brim, a frost band, and a tall crooked tip that flops as you move
    prect(x0 - 2, y0 - 2, bw + 4, 2, C.ink); prect(x0 - 1, y0 - 2, bw + 2, 1, C.dk);
    for (let i = 0; i < 7; i++) { const ww = Math.max(1, bw - 2 - 2 * ((i + 1) >> 1)), xx = x0 + ((bw - ww) >> 1) + (i >= 4 ? pdx * (i - 3) : 0) + (i >= 5 ? 1 : 0); prect(xx - 1, y0 - 3 - i, ww + 2, 1, C.ink); prect(xx, y0 - 3 - i, ww, 1, i === 0 ? (plc === C.dk ? C.frost : C.cyan) : C.mid); }
    prect(x0 + ((bw - 1) >> 1) + pdx * 3 + 1, y0 - 10, 1, 1, C.ink);
  } else {
    prect(x0, y0 + 2, bw, 1, C.gold); // gold brow trim over the visor
    prect(x0 + (bw >> 1) - 1 + pdx, y0 - 4, 3, 4, C.ink); prect(x0 + (bw >> 1) + pdx, y0 - 4, 1, 3, plc === C.dk ? C.gold : C.cyan);
    const bx = x0 + bw + 1 + Math.round(Math.sin(P.walkT * 11) * 0.6), by = y0 + bh - 5; prect(bx - 1, by - 1, 4, 5, C.ink); prect(bx, by, 2, 2, C.gold); prect(bx, by + 2, 2, 1, C.lt);
  }
  if (aimDown) drawWeaponHeld();
  if (hid === 'gilder' && P.skT > 0 && !(P.skT < 0.5 && ((G.t * 16) | 0) % 2)) { // DIVINE SHIELD: a golden dome over the paladin, a halo above the helm
    const x = P.x, y = P.y - 2, r = 16 + Math.round(Math.sin(G.t * 9) * 0.6);
    parc(x, y, r, Math.PI, TAU, C.ink, 3); parc(x, y, r, Math.PI, TAU, C.gold, 1); parc(x, y, r, 0, Math.PI, C.goldDk, 1);
    for (let i = 0; i < 3; i++) { const an = Math.PI + (G.t * 1.5 + i / 3) % 1 * Math.PI; prect(x + Math.cos(an) * r, y + Math.sin(an) * r, 1, 1, C.white); }
    const hy = y0 - 7; prect(x - 4, hy - 1, 9, 3, C.ink); prect(x - 3, hy, 7, 1, C.gold);
  }
  // dash pip
  if (P.dashCd > 0) { const k = 1 - P.dashCd / (0.58 * Math.max(0.35, S.dashCd)); prect(P.x - 4, P.y + 8, Math.round(8 * k), 1, C.mid); }
}
