'use strict';
/* GRISAILLE · enemies — foes with distinct tells, enemy bullets, telegraphs, spawning */
const RED_A = a => `rgba(255,61,74,${a})`;
const RED22 = RED_A(0.22);
function eShot(x, y, a, spd, o = {}) {
  const b = { team: 'e', x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: o.r || 2.5, life: o.life || 5, kind: 'eb', dmg: o.dmg || 1,
    acc: o.acc || 0, turn: o.turn || 0, curve: o.curve || 0, grav: o.grav || 0, split: o.split || null, col: o.col || null, t: 0, big: o.big };
  G.bullets.push(b); return b;
}
function ring(x, y, n, spd, off = 0, o) { for (let i = 0; i < n; i++) eShot(x, y, off + i / n * TAU, spd, o); }
function tele(o) { const t = Object.assign({ t: 0, life: 1 }, o); G.tele.push(t); return t; }
function updTele(dt) { for (let i = G.tele.length - 1; i >= 0; i--) { const t = G.tele[i]; t.t += dt; if (t.u) t.u(t, dt); if (t.dead || t.t >= t.life) G.tele.splice(i, 1); } }
function drawTele() {
  for (const t of G.tele) {
    const k = clamp(t.t / t.life, 0, 1), blink = ((G.t * 16) | 0) % 2;
    if (t.d) { t.d(t, k, blink); continue; }
    if (t.k === 'line') {
      const len = t.len || rayWall(t.x, t.y, t.a, 600), ex = t.x + Math.cos(t.a) * len, ey = t.y + Math.sin(t.a) * len;
      if (t.w) pline(t.x, t.y, ex, ey, RED_A(0.1 + 0.15 * k), t.w);
      pline(t.x, t.y, ex, ey, k > 0.7 && blink ? C.white : C.red, 1, 4, -G.t * 30);
    } else if (t.k === 'laser') {
      const len = rayWall(t.x, t.y, t.a, 600);
      pline(t.x, t.y, t.x + Math.cos(t.a) * len, t.y + Math.sin(t.a) * len, k > 0.75 && blink ? C.white : C.red, 1);
    } else if (t.k === 'circle') {
      pc(t.x, t.y, t.r * k, RED22); pring(t.x, t.y, t.r, k > 0.75 && blink ? C.white : C.red, 1);
    } else if (t.k === 'arc') {
      for (let rr = 10; rr <= t.r; rr += 3) parc(t.x, t.y, rr, t.a - t.arc / 2, t.a + t.arc / 2, RED_A(0.08 + 0.2 * k), 2);
      parc(t.x, t.y, t.r, t.a - t.arc / 2, t.a + t.arc / 2, k > 0.7 && blink ? C.white : C.red, 1);
      parc(t.x, t.y, t.r * k, t.a - t.arc / 2, t.a + t.arc / 2, C.red, 1);
    } else if (t.k === 'spawn') {
      pc(t.x, t.y + 2, Math.max(1, (t.r + 2) * Math.min(1, k * 1.4)), 'rgba(18,18,22,0.55)');
      if (blink) pring(t.x, t.y + 2, t.r + 4 - k * 3, C.mid, 1);
    } else if (t.k === 'diamond') {
      const s = t.r * (1.2 - k * 0.2); pline(t.x - s, t.y, t.x, t.y - s, C.red); pline(t.x, t.y - s, t.x + s, t.y, C.red); pline(t.x + s, t.y, t.x, t.y + s, C.red); pline(t.x, t.y + s, t.x - s, t.y, C.red);
      if (blink) pc(t.x, t.y, 2, C.red);
    }
  }
}

/* rounded pixel rect */
function rrect(x, y, w, h, col) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); ctx.fillStyle = col; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2); }
function body(e, w, h, col) { // squash-stretch body with outline, returns top-left
  const sq = e.sq || 0, bw = w * (1 + sq * 0.3), bh = h * (1 - sq * 0.3);
  const x = e.x - bw / 2, y = e.y + e.r - bh;
  if (e.elite) rrect(x - 2, y - 2, bw + 4, bh + 4, C.gold);
  rrect(x - 1, y - 1, bw + 2, bh + 2, e.flash > 0 ? C.ink : (e.elite ? C.ink : C.white));
  rrect(x, y, bw, bh, e.flash > 0 ? C.white : (e.frozen > 0 ? '#bfe6ff' : e.fren ? C.redDk : col));
  return { x, y, w: bw, h: bh };
}
const eyeCol = (e, alarm) => e.flash > 0 ? C.ink : alarm ? C.red : (e.elite ? C.gold : C.white);
// fill / outline used by hand-drawn silhouettes (same rules as body(): hit flash, frozen, frenzied, elite)
const efill = (e, col) => e.flash > 0 ? C.white : e.frozen > 0 ? '#bfe6ff' : e.fren ? C.redDk : col;
const eline = e => e.flash > 0 || e.elite ? C.ink : C.white;
// body() for any symmetric silhouette (slimes, flames, ghosts): H = half-width of each row, top row first
function shape(e, x, y0, H, col, ol = C.white) {
  x = Math.round(x); y0 = Math.round(y0);
  const rows = (g, c) => { for (let i = 0; i < H.length; i++) prect(x - H[i] - g, y0 + i - g, H[i] * 2 + 1 + g * 2, 1 + g * 2, c); };
  if (e.elite) rows(2, C.gold);
  rows(1, e.flash > 0 || e.elite ? C.ink : ol);
  rows(0, e.flash > 0 ? C.white : e.frozen > 0 ? '#bfe6ff' : e.fren ? C.redDk : col);
}
// 7x5 bone face set into a dark hood or helm; the sockets light up red while it attacks
function skull(x, y, e, al) {
  x = Math.round(x); y = Math.round(y); const bone = e.flash > 0 ? C.white : C.paper, lk = e.face > 0 ? 1 : 0;
  rrect(x, y, 7, 4, bone); prect(x + 1, y + 4, 5, 1, bone); prect(x + 2, y + 4, 1, 1, C.ink); prect(x + 4, y + 4, 1, 1, C.ink); prect(x + 3, y + 3, 1, 1, C.dk); // cranium, teeth, nose
  for (const sx of [x + 1, x + 4]) { prect(sx, y + 1, 2, 2, C.ink); if (al) prect(sx, y + 1, 2, 2, eyeCol(e, true)); else prect(sx + lk, y + 1, 1, 1, eyeCol(e, false)); }
}
function statusFx(e) {
  if (e.burn > 0 && Math.random() < 0.4) part(e.x + rand(-e.r, e.r), e.y - rand(0, e.r * 2), rand(-5, 5), rand(-40, -20), 0.35, pick([C.fire, C.gold]), 1, { drag: 0.95 });
  if (e.chill > 0) for (let i = 0; i < Math.min(4, e.chill); i++) prect(e.x - 4 + i * 3, e.y - e.r * 2 - 6, 2, 2, C.frost);
  if (e.frozen > 0) { pline(e.x - e.r, e.y - e.r, e.x + e.r, e.y + e.r * 0.3, C.white); prect(e.x - 1, e.y - e.r - 3, 2, 2, C.frost); }
  if (e.stunT > 0) for (let i = 0; i < 3; i++) { // dazed: little stars circling the head
    const a = G.t * 6 + i * TAU / 3, sx = Math.round(e.x + Math.cos(a) * (e.r + 2)), sy = Math.round(e.y - e.r * 2 - (e.D && e.D.flying ? 8 : 3) + Math.sin(a) * 1.5);
    prect(sx - 1, sy, 3, 1, C.gold); prect(sx, sy - 1, 1, 3, C.gold); prect(sx, sy, 1, 1, C.white);
  }
  if (e.raised && ((G.t * 3 + e.seed) | 0) % 2) prect(e.x - 1, e.y - e.r * 2 - 4, 2, 2, C.violet); // raised by a bone priest
  if (e.hauW) { const k = clamp(1 - e.hauT / 0.6, 0, 1), y = e.y - e.r * 2 - 5; pc(e.x, y, 2 + k * 2.5, C.ink); pc(e.x, y, 1 + k * 2.5, ((G.t * 16) | 0) % 2 ? C.violet : C.white); } // haunting orb gathering
  if (e.bubble > 0) { // lantern ward: white ring with a gold sheen, blinks when nearly spent
    const cy = e.y - (e.D && e.D.flying ? 5 : 2), r = e.r + 5;
    if (e.bubble > (e.bubbleMax || e.bubble) * 0.3 || ((G.t * 12) | 0) % 2) {
      pring(e.x, cy, r, C.white, 1); parc(e.x, cy, r - 1, -2.7, -1.9, C.gold, 1);
      const s = G.t * 1.8 + e.seed; parc(e.x, cy, r, s, s + 0.45, C.gold, 1);
    }
  }
}
function hpBar(e) {
  if (e.hp >= e.maxHp || e.boss || e.dummy) return;
  const w = Math.max(10, e.r * 2 + 2), x = Math.round(e.x - w / 2), y = Math.round(e.y - e.r * 2 - 9);
  prect(x - 1, y - 1, w + 2, 3, C.ink); prect(x, y, Math.ceil(w * Math.max(0, e.hp) / e.maxHp), 1, e.elite ? C.gold : C.white);
}

function walk(e, a, spd, dt) { moveBody(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt); if (Math.abs(Math.cos(a)) > 0.2) e.face = Math.cos(a) > 0 ? 1 : -1; e.mv = true; }
// drive a long-lived (life 99) telegraph from the owner's own timer: a frozen owner freezes its tell too
function teleK(tl, k) { if (tl) tl.t = clamp(k, 0, 0.999) * tl.life; }
// nearest point within maxD of (x,y) that is inside the current room and clear of walls, or null
function freeSpot(x, y, r, maxD = 16) {
  const A = arena();
  for (let d = 0; d <= maxD; d += 4) for (let k = 0, n = d ? 8 : 1; k < n; k++) {
    const px = x + Math.cos(k / n * TAU) * d, py = y + Math.sin(k / n * TAU) * d;
    if (px >= A.x0 + r && px <= A.x1 - r && py >= A.y0 + r && py <= A.y1 - r && !hitsWall(px, py, r)) return { x: px, y: py };
  }
  return null;
}
function slashFx(x, y, a, r, arc) {
  tele({ x, y, a, r, arc, life: 0.14, d: (t, k) => { const rr = t.r * (0.75 + 0.25 * k); parc(t.x, t.y, rr, t.a - t.arc / 2, t.a + t.arc / 2, C.white, 2); parc(t.x, t.y, rr - 2, t.a - t.arc * 0.4, t.a + t.arc * 0.4, C.ink, 1); } });
}
// pixel ellipse on the ground (ripples, affix rings); dash = pixels per dash, rot turns the dashes
function pellipse(x, y, rx, ry, col, dash = 0, rot = 0) {
  ctx.fillStyle = col; const n = Math.max(12, Math.ceil(TAU * Math.max(rx, ry) / 1.2));
  for (let i = 0; i < n; i++) { if (dash && Math.floor(i / dash) % 2) continue; const a = rot + i / n * TAU; ctx.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1); }
}
// shadow hound streak: each point arms 0.12s after it is laid (red core), hurts on touch, blinks, and fades 1.3s later
function shadowTrail() {
  const f = { k: 'trail', pts: [], t: 0, life: 4,
    u: f => {
      while (f.pts.length && f.t - f.pts[0].t > 1.3) f.pts.shift();
      if (!f.pts.length && f.t > 0.6) { f.dead = true; return; }
      for (const p of f.pts) if (f.t - p.t > 0.12 && d2(p.x, p.y, P.x, P.y) < (2.5 + P.hurtR) ** 2) { hurtPlayer(1, p.x, p.y); break; }
    },
    d: f => {
      const bl = ((G.t * 16) | 0) % 2;
      for (const w of [3, 1]) for (let i = 1; i < f.pts.length; i++) { const a = f.pts[i - 1], b = f.pts[i], age = f.t - b.t; if (age > 1.05 && bl) continue; pline(a.x, a.y, b.x, b.y, w > 1 ? C.ink : age > 0.12 ? C.red : C.dk, w); }
    } };
  G.fx.push(f); return f;
}
// bell toll: a ring expanding from (x,y) that hurts on its edge everywhere except the safe gap (half-width hw around angle gap)
function bellRing(x, y, gap, hw, spd, max) {
  G.fx.push({ k: 'toll', x, y, gap, hw, r: 4, t: 0, life: (max - 4) / spd,
    u: f => { f.r = 4 + spd * f.t; if (Math.abs(Math.sqrt(d2(f.x, f.y, P.x, P.y)) - f.r) < 3 + P.hurtR && Math.abs(angDiff(f.gap, Math.atan2(P.y - f.y, P.x - f.x))) > f.hw) hurtPlayer(1, f.x, f.y); },
    d: f => { const a0 = f.gap + f.hw, a1 = f.gap + TAU - f.hw; parc(f.x, f.y, f.r, a0, a1, C.ink, 3); parc(f.x, f.y, f.r, a0, a1, C.red, 1); } });
}
// bodies a bone priest can raise: updEnemies records every foe killed in the current room (newest last)
const CORPSES = [], NORAISE = new Set(['sketch', 'necro', 'mimic', 'spore']);
// every EDEF entry carries tip: { en, zh } — what it does and how to beat it (first-encounter card)
const EDEF = {
  inkling: {
    name: 'SLIME', zh: '史莱姆', r: 5, hp: 16, spd: 58, mass: 1, cost: 1, contact: true,
    tip: { en: 'Squashes down, then pounces; sidestep the leap.', zh: '压扁蓄力后扑跳，侧移躲开。' },
    ai(e, dt) {
      const dd = dist(e, P);
      if (e.st === 'move') { walk(e, navAngle(e, P) + Math.sin(e.anim * 3 + e.seed) * 0.35, this.spd * (e.elite ? 1.2 : 1), dt); e.cd -= dt; if (dd < 58 && e.cd <= 0 && los(e.x, e.y, P.x, P.y, true)) { e.st = 'wind'; e.t = 0.42; e.la = angTo(e, P); } }
      else if (e.st === 'wind') { e.t -= dt; e.sq = -0.5; if (e.t > 0.12) e.la = angTo(e, P); if (e.t <= 0) { e.st = 'leap'; e.t = 0.26; AU.pop(); e.sq = 0.5; } }
      else if (e.st === 'leap') { walk(e, e.la, 215, dt); e.t -= dt; if (e.t <= 0) { e.st = 'rest'; e.t = 0.5; e.cd = 1.1; e.sq = -0.4; } }
      else { e.t -= dt; if (e.t <= 0) e.st = 'move'; }
    },
    draw(e) {
      const hop = e.st === 'leap' ? 3 : Math.abs(Math.sin(e.anim * 9)) * 1.5, sq = e.sq || 0;
      shadow(e.x, e.y + e.r, e.r);
      if (e.st === 'wind') { // the lane it is about to leap down, ending in a chevron
        const ca = Math.cos(e.la), sa = Math.sin(e.la), x1 = e.x + ca * 56, y1 = e.y + 2 + sa * 56, c = e.t < 0.15 && ((G.t * 16) | 0) % 2 ? C.white : C.red;
        pline(e.x + ca * 7, e.y + 2 + sa * 7, x1, y1, c, 1, 3, -G.t * 30);
        for (const s of [-0.6, 0.6]) pline(x1, y1, x1 - Math.cos(e.la + s) * 4, y1 - Math.sin(e.la + s) * 4, c);
      }
      const n = Math.max(4, Math.round(9 * (1 - sq * 0.3))), W = 5 * (1 + sq * 0.3), c = n * 0.6, H = []; // a goo dome whose foot spreads one pixel wider
      for (let i = 0; i < n; i++) H.push(Math.round(W * Math.sqrt(1 - Math.max(0, (c - i - 0.5) / c) ** 2)) + (i === n - 1 ? 1 : 0));
      const x = Math.round(e.x), y0 = Math.round(e.y + e.r - n - hop), al = e.st === 'wind', o = e.face > 0 ? 1 : 0;
      shape(e, x, y0, H, C.ink);
      if (e.flash <= 0) { prect(x - 3, y0 + 1, 2, 1, C.mid); prect(x - 4, y0 + 2, 1, 1, C.mid); } // wet shine
      prect(x - 3 + o, y0 + n - 5, 2, 2, eyeCol(e, al)); prect(x + 1 + o, y0 + n - 5, 2, 2, eyeCol(e, al));
    }
  },
  gunner: {
    name: 'SKELETON GUNNER', zh: '骷髅枪手', r: 6, hp: 28, spd: 42, mass: 1.3, cost: 2,
    tip: { en: 'Aims, then fires a rapid burst; keep strafing sideways.', zh: '瞄准后连发点射，横向走位躲开。' },
    ai(e, dt) {
      e.cd -= dt; const dd = dist(e, P), see = los(e.x, e.y, P.x, P.y, false);
      if (e.st === 'aim') { e.t -= dt; if (e.t <= 0) { e.st = 'fire'; e.n = e.elite || G.floor > 1 ? 5 : 3; e.t = 0; } return; }
      if (e.st === 'fire') { e.t -= dt; if (e.t <= 0) { e.n--; e.t = 0.11; eShot(e.x + e.face * 5, e.y - 2, angTo(e, P) + rand(-0.07, 0.07), 112 + G.floor * 12, { r: 2.5 }); AU.eshot(); if (e.n <= 0) { e.st = 'move'; e.cd = rand(1.4, 2.0) - G.floor * 0.15; } } return; }
      if (Math.random() < dt * 0.5) e.strafe = -e.strafe;
      let a; if (!see || dd > 150) a = navAngle(e, P); else if (dd < 70) a = angTo(P, e); else a = angTo(e, P) + Math.PI / 2 * e.strafe;
      walk(e, a, this.spd, dt); e.face = P.x > e.x ? 1 : -1;
      if (see && dd < 200 && e.cd <= 0) { e.st = 'aim'; e.t = 0.45; }
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r);
      const b = body(e, 10, 12, C.ink); const al = e.st === 'aim' || e.st === 'fire';
      const hat = e.flash > 0 ? C.white : C.dk; prect(b.x - 1, b.y - 1, b.w + 2, 1, hat); prect(b.x + 2, b.y - 3, b.w - 4, 2, hat); // tricorn
      skull(b.x + (b.w - 7) / 2 + e.face * 0.5, b.y + 1, e, al);
      pline(b.x + 2, b.y + 7, b.x + b.w - 2, b.y + 10, C.dk, 1); // bandolier
      const a = angTo(e, P), gx = e.x + e.face * 3, gy = e.y + 1; pline(gx, gy, gx + Math.cos(a) * 7, gy + Math.sin(a) * 7, C.mid, 2); prect(gx + Math.cos(a) * 7, gy + Math.sin(a) * 7, 1, 1, C.lt); // musket
      if (e.st === 'aim') pline(gx + Math.cos(a) * 10, gy + Math.sin(a) * 10, gx + Math.cos(a) * 34, gy + Math.sin(a) * 34, C.red, 1, 2, -G.t * 30); // sighting line
      if (al && ((G.t * 20) | 0) % 2) pc(gx + Math.cos(a) * 8, gy + Math.sin(a) * 8, 1, C.red);
    }
  },
  bomber: {
    name: 'BOMB IMP', zh: '炸弹小鬼', r: 5, hp: 12, spd: 76, mass: 0.9, cost: 1,
    tip: { en: 'Rushes in and blows up, even when killed; shoot it early.', zh: '冲脸自爆，死了也会炸，远处击杀。' },
    ai(e, dt) {
      if (e.st === 'fuse') { e.t -= dt; e.sq = Math.sin(e.t * 40) * 0.3; teleK(e.tl, 1 - e.t / 0.6); if (e.t <= 0) { e.tl.dead = true; e.dead = true; worldBlast(e.x, e.y, 32, 12, true); } return; }
      walk(e, navAngle(e, P), this.spd * (e.elite ? 1.15 : 1), dt);
      if (dist(e, P) < 28) { e.st = 'fuse'; e.t = 0.6; e.tl = tele({ k: 'circle', x: e.x, y: e.y, r: 32, life: 99 }); AU.tele(); }
    },
    onDie(e) { tele({ k: 'circle', x: e.x, y: e.y, r: 28, life: 0.45, u: t => { if (!t.done && t.t >= t.life) { t.done = true; worldBlast(t.x, t.y, 28, 10, true); } } }); }, // killing it still sets it off, after a tell
    draw(e) {
      shadow(e.x, e.y + e.r, e.r);
      const fu = e.st === 'fuse', fl = fu && ((G.t * 18) | 0) % 2, rr = 5 + (fu ? Math.round((1 - e.t / 0.6) * 2) : 0), x = Math.round(e.x), y = Math.round(e.y + e.r - rr - 2 + (e.sq || 0) * 2), f = e.face;
      for (const s of [-3, 2]) prect(x + s, e.y + e.r - 2, 2, 2, C.ink); // stubby feet
      prect(x - f * 6, y + 2, 2, 1, C.dk); prect(x - f * 7, y + 1, 1, 1, C.dk); // tail
      if (e.elite) pc(x, y, rr + 2, C.gold);
      pc(x, y, rr + 1, e.flash > 0 || e.elite ? C.ink : C.white); pc(x, y, rr, efill(e, fl ? C.red : C.ink)); // a round black bomb with a face
      if (e.flash <= 0) { prect(x - 3, y - 3, 2, 1, C.mid); prect(x - 4, y - 2, 1, 1, C.mid); }
      for (const s of [-1, 1]) { prect(x + s * 3, y - rr - 1, 1, 2, C.mid); prect(x + s * 4, y - rr - 2, 1, 1, C.mid); } // horns
      prect(x, y - rr - 3, 1, 3, C.mid); pc(x + 1, y - rr - 4, 1, ((G.t * (fu ? 24 : 12)) | 0) % 2 ? C.fire : C.red); // lit fuse
      prect(x - 3, y, 2, 2, eyeCol(e, fu)); prect(x + 1, y, 2, 2, eyeCol(e, fu));
      prect(x - 2, y + 3, 4, 1, C.lt); prect(x - 1, y + 3, 1, 1, C.ink); prect(x + 1, y + 3, 1, 1, C.ink); // grin
    }
  },
  charger: {
    name: 'BOAR', zh: '野猪', r: 8, hp: 55, spd: 36, mass: 2.6, cost: 3, contact: true,
    tip: { en: 'Charges in a line; dodge sideways and it stuns itself on walls.', zh: '直线冲锋，侧闪让它撞墙眩晕。' },
    ai(e, dt) {
      const dd = dist(e, P);
      if (e.st === 'move') { walk(e, navAngle(e, P), this.spd, dt); e.cd -= dt; if (e.cd <= 0 && dd < 200 && los(e.x, e.y, P.x, P.y, true)) { e.st = 'aim'; e.t = 0.75; e.la = angTo(e, P); e.tl = tele({ k: 'line', x: e.x, y: e.y, a: e.la, w: e.r * 2, life: 99 }); AU.tele(); } }
      else if (e.st === 'aim') { e.t -= dt; if (e.t > 0.25) e.la = angTo(e, P); e.tl.x = e.x; e.tl.y = e.y; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.75); e.sq = -0.3; if (e.t <= 0) { e.st = 'charge'; e.t = 0.8; AU.dash(); e.tl.dead = true; } }
      else if (e.st === 'charge') {
        const h = moveBody(e, Math.cos(e.la) * 310 * dt, Math.sin(e.la) * 310 * dt); e.t -= dt;
        if (Math.random() < 0.6) part(e.x, e.y + e.r, rand(-20, 20), rand(-20, 0), 0.4, C.lt, 2);
        if (h) { e.st = 'stun'; e.t = 1.6; shake(0.08); AU.crate(); burst(e.x + Math.cos(e.la) * e.r, e.y + Math.sin(e.la) * e.r, 10, C.ink, 90, 0.4, 2); hurtTile(Math.floor((e.x + Math.cos(e.la) * (e.r + 6)) / T), Math.floor((e.y + Math.sin(e.la) * (e.r + 6)) / T), 40); }
        else if (e.t <= 0) { e.st = 'stun'; e.t = 0.5; }
      } else { e.t -= dt; if (e.t <= 0) { e.st = 'move'; e.cd = rand(1.2, 2.2); } }
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 1);
      const b = body(e, 18, 11, C.ink), al = e.st === 'aim' || e.st === 'charge', f = (al ? Math.cos(e.la) : e.face) > 0 ? 1 : -1; // side view, faces down its charge lane
      const R = (dx, y, w, h, c) => prect(f > 0 ? b.x + b.w - dx - w : b.x + dx, y, w, h, c), bc = e.flash > 0 ? C.white : C.mid; // dx = pixels back from the snout end
      for (let i = 0; i < 4; i++) R(6 + i * 3, b.y - 2 + (i % 2), 2, 2, bc); // bristly mane
      R(3, b.y - 2, 2, 3, bc); // ear
      rrect(f > 0 ? b.x + b.w - 3 : b.x - 2, b.y + 4, 5, 5, e.flash > 0 ? C.ink : C.mid); R(-2, b.y + 5, 1, 1, C.ink); R(-2, b.y + 7, 1, 1, C.ink); // snout + nostrils
      R(3, b.y + 6, 1, 4, C.paper); R(2, b.y + 5, 1, 2, C.paper); // tusk
      R(5, b.y + 2, 3, 2, eyeCol(e, al));
      for (const hx of [2, 5, b.w - 7, b.w - 4]) prect(b.x + hx, b.y + b.h - 1, 2, 1, bc); // hooves
      if (e.st === 'stun') for (let i = 0; i < 3; i++) { const a = G.t * 5 + i * TAU / 3; prect(e.x + Math.cos(a) * 8, b.y - 4 + Math.sin(a) * 2, 2, 2, C.gold); }
    }
  },
  turret: {
    name: 'GARGOYLE TURRET', zh: '石像炮台', r: 7, hp: 50, spd: 0, mass: 99, cost: 3, anchored: true,
    tip: { en: 'Its head turns slowly; circle around it. Too close and it rings out.', zh: '炮口转得慢，绕着跑；贴近会放环弹。' },
    ai(e, dt) { // the head turns at a fixed rate and the stream follows the head, not you; up close it answers with a ring
      const tr = (1.0 + G.floor * 0.15) * dt, mx = e.x, my = e.y - 4; e.la += clamp(angDiff(e.la, angTo(e, P)), -tr, tr); e.cd -= dt;
      if (e.st === 'warn') {
        e.t -= dt; teleK(e.tl, 1 - e.t / 0.55); e.tl.a = e.la;
        if (e.t <= 0) { e.tl.dead = true; if (e.pat) { e.st = 'move'; e.cd = 2.4 - G.floor * 0.25; ring(mx, my, e.elite ? 12 : 8 + G.floor * 2, 70 + G.floor * 8, rand(TAU), { r: 3 }); AU.eshot(); } else { e.st = 'fire'; e.n = 6 + G.floor; e.t = 0; } }
        return;
      }
      if (e.st === 'fire') { e.t -= dt; if (e.t <= 0) { e.t = 0.1; eShot(mx + Math.cos(e.la) * 4, my + Math.sin(e.la) * 3, e.la, 115 + G.floor * 10, { r: 3 }); AU.eshot(); if (--e.n <= 0) { e.st = 'move'; e.cd = 2.4 - G.floor * 0.25; } } return; }
      const dd = dist(e, P);
      if (e.cd <= 0 && dd < 260 && (dd < 56 || los(mx, my, P.x, P.y, false))) {
        e.pat = dd < 56 ? 1 : 0; e.st = 'warn'; e.t = 0.55; AU.tele();
        e.tl = e.pat ? tele({ k: 'circle', x: mx, y: my, r: 48, life: 99 }) : tele({ k: 'line', x: mx, y: my, a: e.la, life: 99 });
      }
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 1);
      const x = Math.round(e.x - 6), y = Math.round(e.y - 9);
      const fl = e.flash > 0, st = fl ? C.white : C.mid, al = e.st === 'warn' || e.st === 'fire';
      for (const s of [-1, 1]) { const wx = s < 0 ? x - 5 : x + 13; prect(wx, y - 1, 4, 7, fl ? C.ink : C.white); prect(wx + 1, y, 2, 5, st); prect(s < 0 ? wx : wx + 2, y - 3, 2, 2, fl ? C.ink : C.white); } // folded stone wings
      for (const s of [0, 9]) { prect(x + s, y - 4, 3, 3, fl ? C.ink : C.white); prect(x + s + 1, y - 4, 1, 3, st); } // horns
      if (e.elite) rrect(x - 2, y - 2, 16, 20, C.gold);
      rrect(x - 1, y - 1, 14, 18, fl ? C.ink : C.white); rrect(x, y, 12, 16, fl ? C.white : C.dk); // plinth
      if (!fl) { prect(x, y + 11, 12, 1, C.ink); prect(x + 5, y + 12, 1, 4, C.ink); prect(x + 2, y + 9, 1, 2, C.ink); prect(x + 9, y + 9, 1, 2, C.ink); } // mortar
      rrect(x + 1, y, 10, 9, st); prect(x + 2, y + 3, 8, 1, fl ? C.lt : C.dk); // the gargoyle's head and brow
      const ca = Math.cos(e.la), sa = Math.sin(e.la), ox = Math.round(ca * 1.5);
      prect(x + 3 + ox, y + 4, 2, 1, eyeCol(e, al)); prect(x + 7 + ox, y + 4, 2, 1, eyeCol(e, al));
      const mx = e.x + ca * 1.5, my = y + 7 + sa * 0.5; // the maw and its stone spout point where the next stream goes
      pline(mx, my, mx + ca * 7, my + sa * 5, C.ink, 3); pline(mx, my, mx + ca * 6, my + sa * 4, al ? C.red : C.lt, 1);
      pc(mx, my, 2, al ? C.red : C.ink); prect(mx - 1, my - 2, 1, 1, C.lt); prect(mx + 1, my - 2, 1, 1, C.lt);
    }
  },
  shield: {
    name: 'SHIELD SKELETON', zh: '盾骷髅', r: 7, hp: 60, spd: 32, mass: 2.4, cost: 3,
    tip: { en: 'Its shield blocks shots from the front; flank it.', zh: '盾牌挡正面子弹，绕到背后打。' },
    ai(e, dt) { // the tower shield turns slowly toward you (hit() blocks frontal bullets); up close in front it shield-bashes
      const want = angTo(e, P), tr = (1.1 + G.floor * 0.1) * dt; e.shieldA += clamp(angDiff(e.shieldA, want), -tr, tr);
      const dd = dist(e, P);
      if (e.st === 'raise') { e.t -= dt; e.la = e.shieldA; e.tl.x = e.x; e.tl.y = e.y - 6; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.45); if (e.t <= 0) { e.tl.dead = true; e.st = 'move'; e.cd = 2.3 - G.floor * 0.2; for (let k = -1; k <= 1; k++) eShot(e.x, e.y - 3, e.shieldA + k * 0.28, 80, { r: 3.5 }); AU.eshot(); } return; }
      if (e.st === 'bash') { e.t -= dt; e.sq = -0.3; e.tl.x = e.x; e.tl.y = e.y; e.tl.a = e.shieldA; teleK(e.tl, 1 - e.t / 0.42); if (e.t <= 0) { e.tl.dead = true; e.st = 'shove'; e.t = 0.15; AU.dash(); e.sq = 0.5; } return; }
      if (e.st === 'shove') {
        walk(e, e.shieldA, 220, dt); e.t -= dt;
        if (d2(e.x, e.y, P.x, P.y) < (e.r + 9 + P.hurtR) ** 2 && Math.abs(angDiff(e.shieldA, angTo(e, P))) < 1.0) hurtPlayer(1, e.x, e.y);
        if (e.t <= 0) { e.st = 'move'; e.cd = 1.6; }
        return;
      }
      walk(e, dd > 60 ? navAngle(e, P) : angTo(e, P) + Math.PI / 2 * e.strafe, this.spd, dt);
      e.cd -= dt; if (e.cd > 0) return;
      if (dd < 30 && Math.abs(angDiff(e.shieldA, want)) < 0.9) { e.st = 'bash'; e.t = 0.42; e.tl = tele({ k: 'arc', x: e.x, y: e.y, a: e.shieldA, r: 26, arc: 1.8, life: 99 }); AU.tele(); }
      else if (dd < 200) { e.st = 'raise'; e.t = 0.45; e.la = e.shieldA; e.tl = EDEF.eel.fan(e); }
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 1);
      const b = body(e, 12, 12, C.ink), hx = b.x + (b.w - 7) / 2 + e.face * 0.5, hm = e.flash > 0 ? C.ink : C.mid, al = e.st === 'raise' || e.st === 'bash' || e.st === 'shove';
      skull(hx, b.y + 2, e, al);
      prect(hx - 1, b.y + 1, 9, 1, hm); prect(b.x + b.w / 2 - 1, b.y - 2, 2, 3, hm); // iron helm rim + spike
      for (let i = 0; i < 2; i++) prect(b.x + 3, b.y + 8 + i * 2, b.w - 6, 1, C.dk); // ribs
      const sx = e.x, sy = e.y - 3, rr = e.r + 4; // a thick tower shield; its rim glows red before it fires or bashes
      parc(sx, sy, rr, e.shieldA - 1.05, e.shieldA + 1.05, C.ink, 5);
      parc(sx, sy, rr, e.shieldA - 0.95, e.shieldA + 0.95, e.shieldF > 0 ? C.gold : C.white, 3);
      parc(sx, sy, rr, e.shieldA - 0.95, e.shieldA + 0.95, al && ((G.t * 16) | 0) % 2 ? C.red : C.lt, 1);
    }
  },
  wisp: {
    name: "WILL-O'-WISP", zh: '鬼火', r: 5, hp: 34, spd: 34, mass: 1, cost: 3, flying: true,
    tip: { en: 'Blinks around and fires homing flames; lure them into walls.', zh: '闪现放追踪火，引火撞墙。' },
    ai(e, dt) { // fades out, reappears elsewhere (red diamond marks the spot) and looses slow homing flames that pillars can catch
      e.cd -= dt;
      if (e.st === 'out') { e.t -= dt; e.alpha = e.t / 0.3; if (e.t <= 0) { const p = randFloor(90); e.x = p.x; e.y = p.y; e.st = 'in'; e.t = 0.45; burst(e.x, e.y, 10, C.ink, 60, 0.4); e.tl = tele({ k: 'diamond', x: e.x, y: e.y - 10, r: 7, life: 99 }); } return; }
      if (e.st === 'in') { e.t -= dt; e.alpha = 1 - e.t / 0.45; teleK(e.tl, 1 - e.t / 0.45); if (e.t <= 0) { e.tl.dead = true; e.st = 'move'; e.alpha = 1; for (let k = 0; k < (e.elite ? 3 : 2); k++) eShot(e.x, e.y, angTo(e, P) + (k - 0.5) * 0.9, 70, { r: 3.5, turn: 1.7, life: 4.2 }); AU.eshot(); } return; }
      const dd = dist(e, P), a = dd > 110 ? angTo(e, P) : dd < 70 ? angTo(P, e) : angTo(e, P) + Math.PI / 2;
      e.x += Math.cos(a) * this.spd * dt; e.y += Math.sin(a) * this.spd * dt; clampRoom(e);
      if (e.cd <= 0) { e.st = 'out'; e.t = 0.3; e.cd = rand(3, 4); }
    },
    draw(e) {
      if (e.alpha < 1 && ((G.t * 30) | 0) % 2 && e.alpha < 0.5) return;
      const fy = Math.sin(e.anim * 4) * 2, x = Math.round(e.x), y0 = Math.round(e.y - 10 + fy), fl = ((e.anim * 10 + e.seed) | 0) % 2, al = e.st === 'in';
      shadow(e.x, e.y + e.r + 3, e.r - 1);
      shape(e, x, y0, fl ? [0, 1, 1, 2, 3, 3, 4, 4, 4, 3, 2] : [1, 1, 2, 2, 3, 4, 4, 4, 4, 3, 2], C.lt, C.ink); // a pale flame, flickering
      if (e.flash <= 0) { prect(x - 1, y0 + 4, 3, 5, C.white); prect(x + Math.round(Math.sin(e.anim * 7) * 1.5), y0 - 3 - ((e.anim * 4 + e.seed) % 1) * 3, 1, 1, C.lt); } // hot core + a rising ember
      for (const sx of [x - 2, x + 1]) { prect(sx, y0 + 6, 2, 2, C.ink); prect(sx, y0 + 6, 1 + (al ? 1 : 0), al ? 2 : 1, al ? C.red : e.elite ? C.gold : C.violet); }
    }
  },
  sniper: {
    name: 'SKELETON SNIPER', zh: '骷髅狙手', r: 6, hp: 30, spd: 38, mass: 1.2, cost: 2,
    tip: { en: 'Long red laser, then a fast shot; sidestep when it flashes.', zh: '红线瞄准后狙击，闪白时侧移。' },
    ai(e, dt) {
      e.cd -= dt; const dd = dist(e, P);
      if (e.st === 'aim') {
        e.t -= dt; if (e.t > 0.3) e.la = angTo(e, P); e.tl.x = e.x; e.tl.y = e.y - 2; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 1.0);
        if (e.t <= 0) { e.st = 'move'; e.tl.dead = true; e.cd = rand(2.4, 3.2) - G.floor * 0.3; eShot(e.x, e.y - 2, e.la, 380, { r: 2.5, big: true }); AU.eshot(); }
        return;
      }
      const see = los(e.x, e.y, P.x, P.y, false);
      const a = (!see || dd > 230) ? navAngle(e, P) : dd < 140 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe;
      walk(e, a, this.spd, dt);
      if (see && e.cd <= 0) { e.st = 'aim'; e.t = 1.0; e.la = angTo(e, P); e.tl = tele({ k: 'laser', x: e.x, y: e.y, a: e.la, life: 99 }); }
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r);
      const b = body(e, 8, 14, C.ink), a = e.st === 'aim' ? e.la : angTo(e, P), al = e.st === 'aim', hd = e.flash > 0 ? C.white : C.ink;
      prect(b.x + 2, b.y - 2, b.w - 4, 1, hd); prect(b.x + 3, b.y - 3, 2, 1, hd); // pointed hood
      skull(b.x + (e.face > 0 ? 1 : 0), b.y + 1, e, al);
      prect(b.x + 1, b.y + 8, b.w - 2, 1, C.dk); // belt
      pline(e.x, e.y - 2, e.x + Math.cos(a) * 12, e.y - 2 + Math.sin(a) * 12, C.mid, 1); prect(e.x + Math.cos(a) * 5 - 1, e.y - 3 + Math.sin(a) * 5, 2, 1, C.lt); // long rifle + scope
    }
  },
  /* ---------- CRYPT ---------- */
  moth: {
    name: 'BAT', zh: '蝙蝠', r: 4, hp: 8, spd: 70, mass: 0.6, cost: 1, group: 3, contact: true, flying: true,
    tip: { en: 'Circles you, then dives in a straight line; step aside.', zh: '绕你盘旋，再直线俯冲，侧移闪开。' },
    ai(e, dt) { // orbits the player in a loose ring; one at a time it hangs still, screeches (red lane) and dives straight through
      if (e.oa === undefined) { e.oa = angTo(P, e); e.cd += rand(0.4, 2.6); } // stagger the flock's dives
      if (e.st === 'wind') {
        e.t -= dt; if (e.t > 0.15) e.la = angTo(e, P); e.face = Math.cos(e.la) > 0 ? 1 : -1;
        e.tl.x = e.x; e.tl.y = e.y; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.5);
        if (e.t <= 0) { e.tl.dead = true; e.st = 'dive'; e.t = 0.42; AU.dash(); }
        return;
      }
      if (e.st === 'dive') {
        e.x += Math.cos(e.la) * 240 * dt; e.y += Math.sin(e.la) * 240 * dt; clampRoom(e); e.t -= dt;
        if (Math.random() < 0.5) part(e.x, e.y - 5, 0, 0, 0.3, C.dk, 1);
        if (e.t <= 0) { e.st = 'move'; e.cd = rand(2.2, 3.4) - G.floor * 0.2; e.oa = angTo(P, e); }
        return;
      }
      e.oa += dt * 1.3 * e.strafe;
      const R = 46 + Math.sin(e.anim * 2 + e.seed) * 8, tx = P.x + Math.cos(e.oa) * R, ty = P.y + Math.sin(e.oa) * R * 0.8;
      const a = Math.atan2(ty - e.y, tx - e.x) + Math.sin(e.anim * 9 + e.seed * 3) * 0.5, s = this.spd * (0.75 + 0.4 * Math.abs(Math.sin(e.anim * 7 + e.seed)));
      e.x += Math.cos(a) * s * dt; e.y += Math.sin(a) * s * dt; clampRoom(e);
      if (Math.abs(Math.cos(a)) > 0.3) e.face = Math.cos(a) > 0 ? 1 : -1;
      e.cd -= dt;
      if (e.cd <= 0 && d2(e.x, e.y, P.x, P.y) < 95 * 95) { e.st = 'wind'; e.t = 0.5; e.la = angTo(e, P); e.tl = tele({ k: 'line', x: e.x, y: e.y, a: e.la, len: 100, life: 99 }); AU.tele(); }
    },
    draw(e) {
      const al = e.st === 'wind', x = Math.round(e.x), y = Math.round(e.y - 5 + (al ? 0 : Math.sin(e.anim * 7 + e.seed) * 1.5));
      shadow(e.x, e.y + e.r, 3);
      const lift = e.frozen > 0 ? 0.3 : al ? 1.3 : Math.sin(e.anim * 22 + e.seed); // wing tips sweep from above the body to below it; held high while it screeches
      const ol = e.flash > 0 ? C.ink : e.elite ? C.gold : C.white, fill = e.flash > 0 ? C.white : e.frozen > 0 ? '#bfe6ff' : C.dk;
      const cols = []; for (let i = 1; i <= 4; i++) cols.push([i, y - 2 - Math.round(lift * i * 0.7), i === 4 ? 2 : i % 2 ? 4 : 3]); // membrane scallops
      for (const [i, ty, h] of cols) for (const s of [-1, 1]) prect(x + s * (i + 1) - 1, ty - 1, 3, h + 2, ol);
      prect(x - 2, y - 3, 5, 6, ol);
      for (const [i, ty, h] of cols) for (const s of [-1, 1]) prect(x + s * (i + 1), ty, 1, h, fill);
      prect(x - 1, y - 2, 3, 4, e.flash > 0 ? C.white : C.ink); prect(x - 1, y - 3, 1, 1, C.ink); prect(x + 1, y - 3, 1, 1, C.ink); // body + ears
      prect(x - 1, y - 1, 1, 1, eyeCol(e, al || e.st === 'dive')); prect(x + 1, y - 1, 1, 1, eyeCol(e, al || e.st === 'dive'));
      if (al) prect(x, y + 1, 1, 1, C.red); // screeching mouth
    }
  },
  scribe: {
    name: 'CULTIST', zh: '邪教徒', r: 6, hp: 30, spd: 40, mass: 1.2, cost: 2,
    tip: { en: 'Casts a slow wall of bolts; slip through its gap.', zh: '施放缓慢弹墙，从缺口穿过。' },
    ai(e, dt) {
      e.cd -= dt; const dd = dist(e, P), see = los(e.x, e.y, P.x, P.y, false);
      if (e.st === 'aim') {
        e.t -= dt; if (e.t > 0.2) e.la = angTo(e, P); e.face = Math.cos(e.la) > 0 ? 1 : -1;
        e.tl.x = e.x + Math.cos(e.la) * 10; e.tl.y = e.y - 2 + Math.sin(e.la) * 10; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.55);
        if (e.t <= 0) { // a wall of 9 slow bolts square to the aim, two missing where the preview showed the gap
          e.tl.dead = true; e.st = 'move'; e.cd = rand(1.9, 2.4) - G.floor * 0.1;
          const a = e.la, px = -Math.sin(a), py = Math.cos(a), ox = e.tl.x, oy = e.tl.y;
          for (let i = -4; i <= 4; i++) if (i !== e.gap && i !== e.gap + 1) eShot(ox + px * i * 6, oy + py * i * 6, a, 55, { r: 2.5, life: 6 });
          AU.eshot();
        }
        return;
      }
      if (Math.random() < dt * 0.4) e.strafe = -e.strafe;
      const a = (!see || dd > 140) ? navAngle(e, P) : dd < 90 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe;
      walk(e, a, this.spd, dt); e.face = P.x > e.x ? 1 : -1;
      if (see && dd < 230 && e.cd <= 0) {
        e.st = 'aim'; e.t = 0.55; e.la = angTo(e, P); e.gap = randi(-3, 2); AU.tele();
        e.tl = tele({ x: e.x, y: e.y, a: e.la, g: e.gap, life: 99, d: (t, k, bl) => { // where each bolt will appear, with the gap marked by two white posts
          const px = -Math.sin(t.a), py = Math.cos(t.a), c = k > 0.7 && bl ? C.white : C.red;
          for (let i = -4; i <= 4; i++) { const x = t.x + px * i * 6, y = t.y + py * i * 6; if (i === t.g || i === t.g + 1) continue; prect(x - 1, y - 1, 2, 2, c); }
          for (let j = 0; j < 2; j++) { const i = j ? t.g + 1.5 : t.g - 0.5, x = t.x + px * i * 6, y = t.y + py * i * 6; pline(x, y, x + Math.cos(t.a) * 6 * k, y + Math.sin(t.a) * 6 * k, C.white, 1); }
        } });
      }
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 1);
      const al = e.st === 'aim', f = e.face, o = f > 0 ? 1 : 0, H = [0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6], x = Math.round(e.x), y0 = Math.round(e.y + e.r - H.length);
      shape(e, x, y0, H, C.dk); // a tall pointed robe that flares at the hem
      rrect(x - 3 + o, y0 + 3, 5, 4, C.ink); prect(x - 2 + o, y0 + 4, 1, 1, eyeCol(e, al)); prect(x + o, y0 + 4, 1, 1, eyeCol(e, al)); // eyes in the hood's dark
      prect(x - 4, y0 + 9, 9, 1, C.mid); prect(x, y0 + 10, 1, 3, C.ink); // rope belt + robe fold
      const hx = e.x + f * 6, hy = e.y - 1;
      if (al) { const tx = hx + Math.cos(e.la) * 3, ty = hy - 1 + Math.sin(e.la) * 3; pline(hx, hy, tx, ty, C.dk, 2); pc(tx, ty, 1, C.red); if (((G.t * 20) | 0) % 2) pring(tx, ty, 2.5, C.red); } // casting hand
      else { prect(hx - 1, hy, 3, 1, C.ink); pline(hx, hy + 1, hx, hy + 4, C.lt, 1); } // ritual dagger
    }
  },
  bookworm: {
    name: 'BURROWER', zh: '钻地虫', r: 6, hp: 36, spd: 22, mass: 1.6, cost: 3,
    tip: { en: 'Tunnels under you; move when the red circle appears.', zh: '钻到你脚下，红圈出现就走开。' },
    rip(e) { // dirt ripples while travelling underground
      if (Math.random() < 0.3) part(e.x + rand(-3, 3), e.y + e.r * 0.5, 0, 0, 0.45, C.dk, 5, { kind: 2 });
      if (Math.random() < 0.5) part(e.x + rand(-4, 4), e.y + e.r * 0.5, rand(-25, 25), rand(-40, -10), 0.3, pick([C.dk, C.mid]), 1, { drag: 0.9 });
    },
    ai(e, dt) {
      if (e.st === 'move') { // above ground: vulnerable
        walk(e, navAngle(e, P), this.spd, dt); e.cd -= dt;
        if (e.cd <= 0) { e.st = 'dig'; e.t = 0.35; AU.crate(); }
      } else if (e.st === 'dig') {
        e.t -= dt; e.sq = Math.sin(e.t * 50) * 0.35; this.rip(e);
        if (e.t <= 0) { e.st = 'under'; e.t = 1.2; e.hide = true; e.inv = true; e.kx = e.ky = 0; burst(e.x, e.y + e.r, 8, C.dk, 60, 0.35); }
      } else if (e.st === 'under') {
        walk(e, navAngle(e, P), 80, dt); e.t -= dt; this.rip(e);
        if (e.t <= 0) { e.st = 'mark'; e.t = 0.7; e.tx = P.x; e.ty = P.y; e.tl = tele({ k: 'circle', x: P.x, y: P.y, r: 18, life: 99 }); AU.tele(); }
      } else if (e.st === 'mark') {
        e.t -= dt; teleK(e.tl, 1 - e.t / 0.7); this.rip(e);
        const k = Math.min(1, dt * 6); e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k;
        if (e.t <= 0) { // erupts under the marked spot, then stays up long enough to be punished
          e.tl.dead = true; const s = freeSpot(e.tx, e.ty, e.r) || randFloor(60); e.x = s.x; e.y = s.y;
          e.hide = false; e.inv = false; e.st = 'move'; e.cd = 1.6; e.sq = 0.7;
          eBlastAt(e.tx, e.ty, 18); AU.pop(); shake(0.05);
          inkDrops(e.x, e.y, -Math.PI / 2, 12, 1.4, 100, C.dk); // thrown-up dirt
        }
      }
    },
    draw(e) {
      const f = e.face;
      if (e.hide) { // only a travelling dirt mound shows
        const x = Math.round(e.x), y = Math.round(e.y + e.r), j = ((G.t * 14) | 0) % 2;
        prect(x - 4, y - 2, 9, 2, C.dk); prect(x - 2, y - 3 - j, 5, 1, C.mid); prect(x - 5 + j * 10, y - 1, 1, 1, C.mid);
        return;
      }
      shadow(e.x, e.y + e.r, e.r + 1);
      const ol = e.elite ? C.gold : C.white, fill = e.flash > 0 ? C.white : e.frozen > 0 ? '#bfe6ff' : C.ink;
      for (let i = 2; i >= 1; i--) { const sx = e.x - f * (3 + i * 4), sy = e.y + 2 + Math.sin(e.anim * 8 + i * 1.7), rr = 4 - i; pc(sx, sy, rr + 1, ol); pc(sx, sy, rr, fill); prect(sx - 1, sy - rr, 1, rr * 2, C.dk); } // ringed segments
      const b = body(e, 10, 9, C.ink), off = f > 0 ? 1 : -1, ec = eyeCol(e, e.st === 'dig'), mx = f > 0 ? b.x + b.w : b.x - 2;
      prect(b.x + 3 + off, b.y + 2, 1, 1, ec); prect(b.x + 6 + off, b.y + 2, 1, 1, ec); // beady eyes
      prect(b.x + 2 + off, b.y + 5, 6, 2, C.dk); prect(b.x + 3 + off, b.y + 5, 1, 1, C.lt); prect(b.x + 6 + off, b.y + 5, 1, 1, C.lt); // ringed maw + fangs
      prect(mx, b.y + b.h - 5, 2, 1, C.lt); prect(mx, b.y + b.h - 2, 2, 1, C.lt); // mandibles
    }
  },
  mimic: {
    name: 'MIMIC', zh: '宝箱怪', r: 7, hp: 48, spd: 64, mass: 2, cost: 2,
    tip: { en: 'A chest that bites; shoot it from afar before it wakes.', zh: '假宝箱会咬人，远处先打醒它。' },
    ai(e, dt) { // sits as a chest (st 'move') until you come close or hurt it; awake it hops after you and lunges jaw-first
      const dd = dist(e, P);
      if (e.st === 'move') { e.face = P.x > e.x ? 1 : -1; if (dd < 40 || e.flash > 0 || aliveFoes() <= 1) { this.bite(e, 0.55); burst(e.x, e.y - 8, 8, C.lt, 70, 0.3); } return; } // flash = any hit, even one a ward soaked; the last foe standing never plays dead
      if (e.st === 'wind') {
        e.t -= dt; if (e.t > 0.15) e.la = angTo(e, P); e.face = Math.cos(e.la) > 0 ? 1 : -1; e.sq = -0.3;
        e.tl.x = e.x; e.tl.y = e.y; e.tl.a = e.la; teleK(e.tl, 1 - e.t / e.wt);
        if (e.t <= 0) { e.tl.dead = true; e.st = 'chomp'; e.t = 0.2; e.bit = false; AU.dash(); e.sq = 0.5; }
        return;
      }
      if (e.st === 'chomp') {
        walk(e, e.la, 250, dt); e.t -= dt;
        if (!e.bit && d2(e.x, e.y, P.x, P.y) < (e.r + 7 + P.hurtR) ** 2 && Math.abs(angDiff(e.la, angTo(e, P))) < 1.3) { e.bit = true; hurtPlayer(1, e.x, e.y); }
        if (e.t <= 0) { e.st = 'rest'; e.t = 0.65; e.cd = rand(0.9, 1.3); AU.crate(); }
        return;
      }
      if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) e.st = 'chase'; return; }
      e.cd -= dt; walk(e, navAngle(e, P), this.spd * (0.4 + Math.abs(Math.sin(e.anim * 8))), dt);
      if (e.cd <= 0 && dd < 50 && los(e.x, e.y, P.x, P.y, true)) this.bite(e, 0.42);
    },
    bite(e, t) { e.st = 'wind'; e.t = e.wt = t; e.la = angTo(e, P); e.tl = tele({ k: 'line', x: e.x, y: e.y, a: e.la, w: 14, len: 62, life: 99 }); AU.tele(); },
    draw(e) {
      const aw = e.st !== 'move', wind = e.st === 'wind', f = e.face, x = Math.round(e.x);
      const tw = !aw && (e.anim + e.seed) % 3.4 < 0.25; // a dormant mimic only gives itself away with an odd twitch
      const op = wind ? 2 + Math.round(4 * (1 - e.t / (e.wt || 0.5))) : e.st === 'chomp' ? 6 : aw ? 1 + Math.round(Math.abs(Math.sin(e.anim * 9)) * 2) : tw ? 1 : 0; // jaw gap
      const hop = aw && !wind ? Math.round(Math.abs(Math.sin(e.anim * 8)) * 2) : 0, yb = Math.round(e.y + e.r - 7) - hop;
      shadow(e.x, e.y + e.r, 9);
      const wood = efill(e, '#cfcec7'), ol = e.elite ? C.gold : C.ink;
      if (aw) for (const s of [-7, -3, 2, 6]) prect(x + s, yb + 7, 1, 2 + (hop ? 0 : 1), C.ink); // spindly legs once awake
      prect(x - 9, yb - 4, 18, 11, ol); prect(x - 8, yb - 3, 16, 9, wood); prect(x - 8, yb + 1, 16, 1, C.dk); prect(x - 1, yb - 2, 3, 4, C.ink); // the box, band and lock of a wooden chest
      const ly = yb - 10 - op;
      if (op > 0) { // the maw between lid and box: ink, two rows of teeth, a red tongue lolling toward you
        const th = Math.min(2, op); prect(x - 8, yb - 4 - op, 16, op, C.ink);
        for (let i = -7; i <= 5; i += 3) { prect(x + i, yb - 4 - op, 1, th, C.white); prect(x + i + 1, yb - 4 - th, 1, th, C.white); }
        prect(f > 0 ? x + 8 : x - 11, yb - 5, 3, 2, aw ? C.red : C.redDk);
      }
      prect(x - 9, ly, 18, 6, ol); prect(x - 8, ly + 1, 16, 4, wood); prect(x - 8, ly + 4, 16, 1, C.dk); // lid
      if (aw) { prect(x - 5, ly + 1, 2, 2, eyeCol(e, wind || e.st === 'chomp')); prect(x + 3, ly + 1, 2, 2, eyeCol(e, wind || e.st === 'chomp')); } // eyes open on the lid
    }
  },
  necro: {
    name: 'BONE PRIEST', zh: '亡灵术士', r: 6, hp: 34, spd: 34, mass: 1.2, cost: 3,
    tip: { en: 'Raises fallen foes; hit it mid-chant to stop the ritual.', zh: '会复活倒下的敌人，吟唱时打断它。' },
    ai(e, dt) { // hangs back; chants over a fresh corpse (violet link) to raise it at 60% HP. Any damage during the chant breaks it
      e.cd -= dt; const dd = dist(e, P), see = los(e.x, e.y, P.x, P.y, false);
      if (e.st === 'chant') {
        e.t -= dt; teleK(e.tl, 1 - e.t / 1.1); e.face = e.c.x > e.x ? 1 : -1;
        if (e.hp < e.hp0 || (e.flash > 0 && e.t < 1.0)) { e.tl.dead = true; e.st = 'stagger'; e.t = 0.8; e.cd = 2.4; CORPSES.push(e.c); AU.tink(); burst(e.x, e.y - 14, 8, C.violet, 70, 0.35); return; }
        if (e.t <= 0) {
          e.tl.dead = true; e.st = 'move'; e.cd = rand(3.4, 4.2) - G.floor * 0.3;
          const s = spawnEnemy(e.c.type, e.c.x, e.c.y, false, 0.5); s.raised = true; s.hp = s.maxHp = Math.round(s.maxHp * 0.6);
          (e.kids || (e.kids = [])).push(s); ringFx(e.c.x, e.c.y, 2, 18, 0.35, C.violet, 1);
        }
        return;
      }
      if (e.st === 'stagger') { e.t -= dt; e.sq = -0.2; if (e.t <= 0) e.st = 'move'; return; }
      if (e.st === 'cast') {
        e.t -= dt; if (e.t > 0.15) e.la = angTo(e, P); e.face = Math.cos(e.la) > 0 ? 1 : -1; e.tl.x = e.x + e.face * 7; e.tl.y = e.y + e.r - 22; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.5);
        if (e.t <= 0) { e.tl.dead = true; e.st = 'move'; e.cd = rand(1.8, 2.4); for (let k = -1; k <= 1; k++) eShot(e.tl.x, e.tl.y, e.la + k * 0.3, 90 + G.floor * 8, { r: 3 }); AU.eshot(); }
        return;
      }
      if (Math.random() < dt * 0.4) e.strafe = -e.strafe;
      walk(e, (!see || dd > 170) ? navAngle(e, P) : dd < 110 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe, this.spd, dt); e.face = P.x > e.x ? 1 : -1;
      if (e.cd > 0) return;
      let n = 0; if (e.kids) for (const k of e.kids) if (!k.dead) n++;
      const c = n < (e.elite ? 3 : 2) && G.enemies.length < 14 ? this.corpse(e) : null;
      if (c) { e.c = c; e.st = 'chant'; e.t = 1.1; e.hp0 = e.hp; AU.tele(); e.tl = tele({ o: e, c, life: 99, d: this.link }); }
      else if (see && dd < 220) { e.st = 'cast'; e.t = 0.5; e.la = angTo(e, P); e.tl = EDEF.eel.fan(e); }
      else e.cd = 0.5;
    },
    onDie(e) { if (e.st === 'chant' && e.c) CORPSES.push(e.c); }, // a broken ritual leaves its corpse for another priest
    corpse(e) { // claims the nearest fresh body in this room
      let best = -1, bd = 220 * 220;
      for (let i = 0; i < CORPSES.length; i++) { const c = CORPSES[i]; if (c.room !== G.cur || G.t - c.t > 20) continue; const q = d2(c.x, c.y, e.x, e.y); if (q < bd) { bd = q; best = i; } }
      return best < 0 ? null : CORPSES.splice(best, 1)[0];
    },
    link(t, k, bl) { // staff-to-corpse link and the bones drawing together
      const o = t.o, c = t.c, sx = o.x + o.face * 7, sy = o.y + o.r - 25;
      pline(sx, sy, c.x, c.y - 2, bl ? C.violet : C.lt, 1, 3, -G.t * 24); pring(c.x, c.y - 1, 3 + 9 * k, C.violet, 1);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + k * 4, rr = 3 + 11 * (1 - k); prect(c.x + Math.cos(a) * rr - 1, c.y - 2 + Math.sin(a) * rr * 0.5, 2, 1, C.paper); }
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 1);
      const f = e.face, ch = e.st === 'chant', al = e.st === 'cast', H = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 6, 6], x = Math.round(e.x), y0 = Math.round(e.y + e.r - H.length);
      const sx = x + f * 7, st = y0 - 6 - (ch ? 3 : 0), bone = e.flash > 0 ? C.white : C.paper; // a skull-topped staff taller than the priest, raised while it chants
      pline(sx, e.y + e.r, sx, st + 3, C.ink, 3); pline(sx, e.y + e.r - 1, sx, st + 4, C.mid, 1);
      prect(sx - 4, st - 5, 1, 3, bone); prect(sx + 4, st - 5, 1, 3, bone); rrect(sx - 3, st - 3, 7, 6, C.ink); rrect(sx - 2, st - 2, 5, 4, bone);
      const se = ch ? (((G.t * 12) | 0) % 2 ? C.violet : C.white) : al ? C.red : C.ink; prect(sx - 1, st - 1, 1, 1, se); prect(sx + 1, st - 1, 1, 1, se);
      shape(e, x, y0, H, C.ink2); // tall hunched robe
      for (let i = -2; i <= 2; i++) prect(x + i * 2, y0 + 5, 1, 2, bone); // rib collar
      const o = f > 0 ? 1 : 0; rrect(x - 3 + o, y0 + 1, 5, 4, C.ink); prect(x - 2 + o, y0 + 2, 1, 1, ch ? C.violet : eyeCol(e, al)); prect(x + o, y0 + 2, 1, 1, ch ? C.violet : eyeCol(e, al));
      pline(x + f * 3, y0 + 8, sx, st + 8, e.flash > 0 ? C.white : C.ink2, 2); // sleeve to the staff
    }
  },
  /* ---------- SEWERS ---------- */
  leech: {
    name: 'LEECH', zh: '水蛭', r: 4, hp: 14, spd: 50, mass: 0.8, cost: 1, group: 2,
    tip: { en: 'Lunges and latches on to drain you; dash to shake it off.', zh: '扑上身吸血，冲刺甩掉它。' },
    ai(e, dt) { // lunge (red lane) -> on contact it latches on and a shrinking ring counts down a 1 HP drain; dashing throws it off dazed
      const dd = dist(e, P);
      if (e.st === 'latch') {
        if (P.dash > 0 || P.dead || dd > 14) { this.drop(e, true); return; }
        e.x = P.x + e.ox; e.y = P.y + e.oy; e.kx = e.ky = 0; e.t -= dt; e.sq = Math.sin(G.t * 30) * 0.25;
        if (e.t <= 0) { hurtPlayer(1, e.x, e.y); this.drop(e, false); }
        return;
      }
      if (e.st === 'move') {
        walk(e, navAngle(e, P) + Math.sin(e.anim * 4 + e.seed) * 0.3, this.spd * (0.6 + 0.8 * Math.abs(Math.sin(e.anim * 6 + e.seed))), dt); e.cd -= dt;
        if (dd < 75 && e.cd <= 0 && los(e.x, e.y, P.x, P.y, true)) { e.st = 'wind'; e.t = 0.35; e.la = angTo(e, P); e.tl = tele({ k: 'line', x: e.x, y: e.y, a: e.la, w: 6, len: 66, life: 99 }); }
      } else if (e.st === 'wind') {
        e.t -= dt; e.sq = -0.5; if (e.t > 0.12) e.la = angTo(e, P); e.face = Math.cos(e.la) > 0 ? 1 : -1;
        e.tl.x = e.x; e.tl.y = e.y; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.35);
        if (e.t <= 0) { e.tl.dead = true; e.st = 'lunge'; e.t = 0.25; AU.pop(); e.sq = 0.6; }
      } else if (e.st === 'lunge') {
        walk(e, e.la, 260, dt); e.t -= dt; if (Math.random() < 0.5) part(e.x, e.y + e.r, 0, 0, 0.5, C.ink, 2);
        if (d2(e.x, e.y, P.x, P.y) < (e.r + P.hurtR + 2) ** 2 && !(P.inv > 0) && !(P.dash > 0) && G.state === 'play') {
          e.st = 'latch'; e.t = 1.1; e.ox = (e.x > P.x ? 1 : -1) * 4; e.oy = 2; AU.pop(); return;
        }
        if (e.t <= 0) { e.st = 'rest'; e.t = 0.55; e.cd = 0.9; }
      } else { e.t -= dt; if (e.t <= 0) e.st = 'move'; }
    },
    drop(e, shaken) { // falls off: thrown and dazed when dashed off, sated after a drain
      const a = angTo(P, e); e.st = 'rest'; e.t = shaken ? 1.0 : 1.4; e.cd = 1.2; e.kx = Math.cos(a) * 150; e.ky = Math.sin(a) * 150;
      if (shaken) { e.stunT = 0.8; AU.tink(); burst(e.x, e.y, 5, C.ink, 60, 0.3); } else e.sq = 0.6;
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 1);
      const al = e.st === 'wind' || e.st === 'latch', inch = e.st === 'move' ? Math.sin(e.anim * 12 + e.seed) * 0.3 : 0;
      if (e.st === 'latch') { const k = clamp(e.t / 1.1, 0, 1); pring(P.x, P.y - 3, 4 + k * 9, k < 0.35 && ((G.t * 16) | 0) % 2 ? C.white : C.red, 1); } // drain countdown around you
      const b = body({ ...e, sq: e.sq + inch }, 10, 6, C.ink), f = e.face, fx = f > 0 ? b.x + b.w - 4 : b.x + 1;
      for (let i = 1; i <= 2; i++) prect(f > 0 ? b.x + b.w - 4 - i * 2 : b.x + 3 + i * 2, b.y + 1, 1, b.h - 2, C.dk); // body rings
      prect(fx, b.y + 1, 1, 2, eyeCol(e, al)); prect(fx + 2, b.y + 1, 1, 2, eyeCol(e, al));
      prect(f > 0 ? b.x + b.w - 2 : b.x, b.y + b.h - 2, 2, 1, al ? C.red : C.redDk); // blood-dark sucker
    }
  },
  bloater: {
    name: 'BLOATED CORPSE', zh: '腐尸', r: 8, hp: 40, spd: 24, mass: 2.2, cost: 2,
    tip: { en: 'Inhales to drag you in, then belches; walk away while it sucks.', zh: '吸气把你拉近再喷吐，趁吸气走远。' },
    ai(e, dt) { // inhale (red circle = belch reach) pulls you toward it for 1s, then it belches a short-range ring
      const dd = dist(e, P);
      if (e.st === 'inhale') {
        e.t -= dt; teleK(e.tl, 1 - e.t / 1.0); e.tl.x = e.x; e.tl.y = e.y - 3;
        if (dd > 6 && dd < 130 && !(P.dash > 0) && los(e.x, e.y, P.x, P.y, true)) { const k = 520 * dt * (1 - dd / 150) / dd; P.kx += (e.x - P.x) * k; P.ky += (e.y - P.y) * k; }
        if (Math.random() < 0.7) { const a = rand(TAU), r = rand(30, 60); part(e.x + Math.cos(a) * r, e.y - 3 + Math.sin(a) * r, -Math.cos(a) * r * 2.5, -Math.sin(a) * r * 2.5, 0.35, C.lt, 1, { drag: 1, kind: 1 }); } // air streaming in
        if (e.t <= 0) { e.tl.dead = true; e.st = 'move'; e.cd = rand(2.6, 3.2) - G.floor * 0.15; ring(e.x, e.y - 3, 10, 80, angTo(e, P), { r: 3, life: 0.55 }); AU.pop(); e.sq = 0.7; burst(e.x, e.y - 3, 8, C.dk, 70, 0.3); }
        return;
      }
      walk(e, dd > 50 ? navAngle(e, P) : angTo(e, P) + Math.PI / 2 * e.strafe, this.spd, dt);
      e.cd -= dt; if (e.cd <= 0 && dd < 100 && los(e.x, e.y, P.x, P.y, true)) { e.st = 'inhale'; e.t = 1.0; e.tl = tele({ k: 'circle', x: e.x, y: e.y - 3, r: 44, life: 99 }); AU.tele(); }
    },
    onDie(e) { // swells for 0.4s where it died, then bursts into a slow ring
      const x = e.x, y = e.y - 3, r = e.r;
      tele({ x, y, life: 0.4, d: (t, k, blink) => { const rr = r * (1 + k * 0.7); pc(x, y, rr + 1, blink ? C.red : C.white); pc(x, y, rr, C.mid); } });
      later(0.4, () => { ring(x, y, 10, 60, rand(TAU), { r: 3 }); AU.splash(); burst(x, y, 14, C.dk, 90, 0.4, 2); splat(x, y, 4); });
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 1);
      const al = e.st === 'inhale', sw = al ? clamp(1 - e.t / 1.0, 0, 1) : 0, pu = Math.sin(e.anim * 3) * 0.6;
      const b = body(e, 16 + sw * 5 + pu, 13 + sw * 3 + pu, C.mid), pc0 = al && ((G.t * 16) | 0) % 2 ? C.red : C.lt; // pale swollen flesh, boils blink red as it swells
      prect(b.x + 2, b.y + b.h * 0.62, b.w - 4, 1, C.dk); for (let i = 0; i < 4; i++) prect(b.x + 3 + i * (b.w - 6) / 3, b.y + b.h * 0.62 - 1, 1, 3, C.dk); // stitched belly
      for (const [px, py] of [[0.2, 0.3], [0.72, 0.22], [0.5, 0.82], [0.14, 0.78], [0.82, 0.74]]) prect(b.x + b.w * px, b.y + b.h * py, 2, 2, pc0);
      prect(b.x + b.w / 2 - 3, b.y + 3, 2, 2, C.ink); prect(b.x + b.w / 2 + 1, b.y + 3, 2, 2, C.ink); // sunken sockets
      prect(b.x + b.w / 2 - 3, b.y + 3, 1, 1, eyeCol(e, al)); prect(b.x + b.w / 2 + 2, b.y + 3, 1, 1, eyeCol(e, al));
      if (al) pc(b.x + b.w / 2, b.y + 7, 1 + Math.round(sw * 2.5), C.ink); else prect(b.x + b.w / 2 - 2, b.y + 6, 4, 1, C.ink); // the mouth gapes as it inhales
    }
  },
  golem: {
    name: 'STONE GOLEM', zh: '石像魔', r: 9, hp: 70, spd: 28, mass: 4, cost: 3,
    tip: { en: 'Slams when you get close; bait it, then hit it while it recovers.', zh: '靠近会砸地，引它出手再趁硬直打。' },
    ai(e, dt) {
      if (e.st === 'wind') {
        e.t -= dt; e.sq = -0.35; e.tl.x = e.x; e.tl.y = e.y; teleK(e.tl, 1 - e.t / 0.7);
        if (e.t <= 0) { e.tl.dead = true; e.st = 'rest'; e.t = 0.9; e.sq = 0.7; eBlastAt(e.x, e.y, 28); ring(e.x, e.y, 6, 95, rand(TAU), { r: 3, life: 0.4 }); shake(0.08); AU.boom(0.8); } // slam + short-range rubble
        return;
      }
      if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) { e.st = 'move'; e.cd = rand(1.0, 1.6); } return; }
      walk(e, navAngle(e, P), this.spd, dt); e.cd -= dt;
      if (e.cd <= 0 && dist(e, P) < 44) { e.st = 'wind'; e.t = 0.7; e.tl = tele({ k: 'circle', x: e.x, y: e.y, r: 34, life: 99 }); AU.tele(); }
    },
    onDie(e) { for (const s of [-1, 1]) { let x = e.x + s * 7, y = e.y; if (hitsWall(x, y, 5)) { x = e.x; y = e.y; } spawnEnemy('golemling', x, y, false, 0.2); } },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 2);
      const al = e.st === 'wind', top = e.y + e.r - 15, fy = al ? top - 5 : e.y + e.r - 8;
      const fists = () => { for (const s of [-1, 1]) { const fx = e.x + s * (al ? 6 : 10) - 2.5; rrect(fx - 1, fy - 1, 7, 8, e.elite ? C.gold : C.white); rrect(fx, fy, 5, 6, e.flash > 0 ? C.white : C.mid); if (e.flash <= 0) prect(fx + 1, fy + 3, 3, 1, C.dk); } }; // stone fists with knuckle seams
      if (!al) fists();
      const b = body(e, 17, 15, C.dk);
      if (e.flash <= 0) {
        prect(b.x + 2, b.y + 1, 4, 1, C.mid); prect(b.x + b.w - 5, b.y + 2, 3, 1, C.mid); prect(b.x + 3, b.y + b.h - 4, 4, 1, C.mid); // lit stone edges
        pline(b.x + b.w / 2, b.y + 1, b.x + b.w / 2 - 2, b.y + 4, C.ink, 1); pline(b.x + b.w - 4, b.y + b.h - 6, b.x + b.w - 2, b.y + b.h - 3, C.ink, 1); prect(b.x + 1, b.y + 8, 3, 1, C.ink); // cracks
      }
      prect(b.x + 3, b.y + 5, 4, 2, C.ink); prect(b.x + b.w - 7, b.y + 5, 4, 2, C.ink); // deep-set brow
      prect(b.x + 4, b.y + 6, 3, 1, eyeCol(e, al)); prect(b.x + b.w - 7, b.y + 6, 3, 1, eyeCol(e, al));
      if (al) fists();
    }
  },
  golemling: {
    name: 'STONELING', zh: '小石像魔', r: 5, hp: 20, spd: 52, mass: 1.4, cost: 0, contact: true,
    tip: { en: 'Small and quick; back off and keep firing.', zh: '小而快，边退边打。' },
    ai(e, dt) { walk(e, navAngle(e, P) + Math.sin(e.anim * 3 + e.seed) * 0.25, this.spd, dt); },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r);
      const hop = Math.abs(Math.sin(e.anim * 10)), fy = e.y + e.r - 5 - hop;
      for (const s of [-1, 1]) { const fx = e.x + s * 6 - 1.5; rrect(fx - 1, fy - 1, 5, 5, e.elite ? C.gold : C.white); rrect(fx, fy, 3, 3, e.flash > 0 ? C.white : C.mid); }
      const b = body({ ...e, y: e.y - hop }, 10, 9, C.dk);
      if (e.flash <= 0) { prect(b.x + 2, b.y + 1, 3, 1, C.mid); pline(b.x + b.w - 3, b.y + b.h - 4, b.x + b.w - 2, b.y + b.h - 2, C.ink, 1); } // lit edge + crack
      prect(b.x + 3, b.y + b.h - 3, 2, 1, C.ink);
      prect(b.x + 2, b.y + 3, 2, 1, eyeCol(e, false)); prect(b.x + b.w - 4, b.y + 3, 2, 1, eyeCol(e, false));
    }
  },
  toad: {
    name: 'SWAMP TOAD', zh: '毒蟾', r: 6, hp: 30, spd: 0, mass: 1.5, cost: 2,
    tip: { en: 'Lobs globs onto red circles; keep moving, then close in.', zh: '吐黏液砸红圈，持续走位再贴近。' },
    ai(e, dt) { // artillery: puffs its throat, then lobs globs onto red circles at (and ahead of) you; crowded, it hops away
      const dd = dist(e, P);
      if (e.st === 'move') {
        e.cd -= dt; e.hcd = (e.hcd || 0) - dt; e.face = P.x > e.x ? 1 : -1;
        if (dd < 50 && e.hcd <= 0) { e.st = 'squash'; e.t = 0.25; e.hcd = 2.8; e.la = angTo(P, e) + rand(-0.7, 0.7); }
        else if (e.cd <= 0 && dd > 40 && dd < 240) { e.st = 'puff'; e.t = 0.5; AU.tele(); }
      } else if (e.st === 'puff') {
        e.t -= dt; e.sq = -0.25;
        if (e.t <= 0) {
          e.st = 'move'; e.cd = rand(1.8, 2.4) - G.floor * 0.15; e.sq = 0.6; AU.pop();
          const A = arena(), n = e.elite || G.floor >= 2 ? 4 : 3, a0 = rand(TAU), lx = P.x + clamp(P.vx, -90, 90) * 0.45, ly = P.y + clamp(P.vy, -90, 90) * 0.45;
          for (let i = 0; i < n; i++) { const a = a0 + i * TAU / (n - 1), d = i ? 24 : 0; this.glob(e, clamp(lx + Math.cos(a) * d, A.x0 + 6, A.x1 - 6), clamp(ly + Math.sin(a) * d, A.y0 + 6, A.y1 - 6), 0.85 + i * 0.1); }
        }
      } else if (e.st === 'squash') {
        e.t -= dt; e.sq = 0.6;
        if (e.t <= 0) { e.st = 'jump'; e.t = 0.5; e.face = Math.cos(e.la) > 0 ? 1 : -1; e.sq = -0.6; AU.pop(); }
      } else if (e.st === 'jump') {
        e.t -= dt; moveBody(e, Math.cos(e.la) * 150 * dt, Math.sin(e.la) * 150 * dt);
        e.hz = Math.sin(Math.PI * clamp(1 - e.t / 0.5, 0, 1)) * 16;
        if (e.t <= 0) { e.hz = 0; e.st = 'move'; e.cd = Math.max(e.cd, 0.5); e.sq = 0.7; AU.splash(); burst(e.x, e.y + e.r, 8, C.mid, 70, 0.3); splat(e.x, e.y + 2, 2, 'rgba(18,18,22,0.25)'); }
      }
    },
    glob(e, tx, ty, life) { // the glob arcs out of its mouth onto a red circle and splashes there
      tele({ x: e.x, y: e.y - 8, tx, ty, r: 12, life,
        u: t => { if (!t.done && t.t >= t.life) { t.done = true; if (G.active) { eBlastAt(t.tx, t.ty, t.r); AU.splash(); } } },
        d: (t, k, bl) => { pc(t.tx, t.ty, t.r * k, RED22); pring(t.tx, t.ty, t.r, k > 0.75 && bl ? C.white : C.red, 1); const gx = lerp(t.x, t.tx, k), gy = lerp(t.y, t.ty, k) - Math.sin(Math.PI * k) * 46; pc(gx, gy, 3, C.ink); pc(gx, gy, 2, C.mid); } });
    },
    draw(e) {
      const hz = e.hz || 0;
      shadow(e.x, e.y + e.r, Math.max(3, e.r + 1 - hz * 0.15)); // the shadow stays on the ground
      const al = e.st === 'squash' || e.st === 'puff', b = body({ ...e, y: e.y - hz }, 13, 8, C.ink);
      for (const s of [0, 1]) { const ex = s ? b.x + b.w - 4 : b.x + 1; rrect(ex - 1, b.y - 3, 5, 4, e.elite ? C.gold : C.white); rrect(ex, b.y - 2, 3, 3, C.ink); prect(ex + 1, b.y - 2, 1, 1, eyeCol(e, al)); }
      if (e.flash <= 0) for (const [px, py] of [[2, 2], [5, 1], [9, 2], [4, 4], [b.w - 3, 4]]) prect(b.x + px, b.y + py, 1, 1, C.mid); // warts
      if (e.st === 'puff') { const k = clamp(1 - e.t / 0.5, 0, 1), r = 2 + Math.round(k * 3); pc(e.x, b.y + b.h - 1, r + 1, C.ink); pc(e.x, b.y + b.h - 1, r, ((G.t * 16) | 0) % 2 ? C.red : C.lt); } // throat sac balloons before it spits
      else { const th = Math.round(Math.abs(Math.sin(e.anim * 4 + e.seed))); prect(b.x + 3, b.y + b.h - 3 - th, b.w - 6, 2 + th, al ? C.lt : C.dk); }
    }
  },
  sapper: {
    name: 'RAT SAPPER', zh: '鼠工兵', r: 5, hp: 24, spd: 62, mass: 1, cost: 2,
    tip: { en: 'Plants mines that arm after a beat; shoot them or walk around.', zh: '埋下地雷，射击引爆或绕开走。' },
    ai(e, dt) { // scurries between spots away from you and plants up to 3 mines; mines fizzle when it dies
      const dd = dist(e, P);
      if (e.st === 'plant') { e.t -= dt; e.sq = -0.3; if (e.t <= 0) { e.st = 'move'; e.cd = rand(1.4, 2.0) - G.floor * 0.15; this.mine(e); e.wpT = 0; } return; }
      e.wpT = (e.wpT || 0) - dt;
      if (e.wpT <= 0 || (e.wp && d2(e.x, e.y, e.wp.x, e.wp.y) < 100)) { e.wp = null; e.wpT = 2.5; for (let k = 0; k < 6 && !e.wp; k++) { const p = randFloor(60); if (los(e.x, e.y, p.x, p.y, true)) e.wp = p; } } // a new spot in sight, every 2.5s or on arrival
      const a = dd < 50 || !e.wp ? angTo(P, e) : angTo(e, e.wp);
      walk(e, a + Math.sin(e.anim * 10 + e.seed) * 0.25, this.spd, dt);
      e.cd -= dt;
      if (e.cd <= 0 && dd > 34) { let n = 0; for (const f of G.fx) if (f.k === 'mine' && f.o === e) n++; if (n < (e.elite ? 4 : 3)) { e.st = 'plant'; e.t = 0.45; AU.tink(); } else e.cd = 0.8; }
    },
    mine(e) { // arms after 0.8s; you stepping within 20px lights a 0.45s fuse (red circle); a shot pops it on the spot
      G.fx.push({ k: 'mine', o: e, x: e.x + e.face * 3, y: e.y + e.r - 1, t: 0, life: 12, fuse: 0, fz: 0,
        u: f => {
          if (f.fz) { if (f.t - f.fz > 0.5) f.dead = true; return; }
          if (!f.fuse && (!G.active || f.o.dead || f.t > f.life - 0.6)) { f.fz = f.t; AU.tink(); return; } // fizzles: room clear, sapper dead, or old
          if (f.fuse) { if (f.t - f.fuse >= 0.45) { f.dead = true; worldBlast(f.x, f.y, 24, 8, true); } return; }
          if (f.t < 0.8) return;
          if (d2(f.x, f.y, P.x, P.y) < 20 * 20) { f.fuse = f.t; AU.tele(); return; }
          for (const b of G.bullets) if (b.team === 'p' && !b.dead && d2(b.x, b.y, f.x, f.y) < 64) { b.dead = true; f.dead = true; worldBlast(f.x, f.y, 24, 8, true); return; }
        },
        d: f => {
          const x = Math.round(f.x), y = Math.round(f.y), bl = ((G.t * (f.fuse ? 20 : 3)) | 0) % 2;
          if (f.fz && ((G.t * 20) | 0) % 2) return;
          if (f.fuse) { const k = clamp((f.t - f.fuse) / 0.45, 0, 1); pc(x, y, 24 * k, RED22); pring(x, y, 24, k > 0.7 && bl ? C.white : C.red, 1); }
          else if (f.t >= 0.8) pring(x, y, 20, C.redDk, 1); // armed: its trigger radius
          pc(x, y, 3, C.ink); prect(x - 2, y - 1, 5, 1, C.mid); prect(x, y - 2, 1, 1, f.t < 0.8 ? C.mid : bl ? C.red : C.redDk);
        } });
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 1);
      const f = e.face, pl = e.st === 'plant', b = body(e, 10, 7, C.dk), R = (dx, y, w, h, c) => prect(f > 0 ? b.x + b.w - dx - w : b.x + dx, y, w, h, c); // dx = pixels back from the snout
      const tx = f > 0 ? b.x : b.x + b.w, tw = Math.sin(e.anim * 9) * 2; pline(tx, b.y + b.h - 2, tx - f * 5, b.y + b.h - 4 + tw, C.mid, 1); pline(tx - f * 5, b.y + b.h - 4 + tw, tx - f * 9, b.y + b.h - 1 - tw, C.mid, 1); // long bare tail
      R(-4, b.y + 1, 5, 5, eline(e)); R(-3, b.y + 2, 4, 3, efill(e, C.dk)); R(-4, b.y + 3, 1, 1, C.lt); // pointed snout + nose
      R(1, b.y - 3, 3, 3, eline(e)); R(2, b.y - 2, 1, 1, C.lt); // round ear
      R(0, b.y + 2, 1, 1, eyeCol(e, pl));
      const px = f > 0 ? b.x + 2 : b.x + b.w - 2, py = b.y - 1; // a satchel of charges on its back, fuse lit
      pc(px, py, 4, eline(e)); pc(px, py, 3, e.flash > 0 ? C.white : C.mid); prect(px - 3, py, 7, 1, C.dk); prect(px, py - 5, 1, 2, C.mid); prect(px, py - 6, 1, 1, ((G.t * 10) | 0) % 2 ? C.fire : C.red);
      if (pl) { const mx = f > 0 ? b.x + b.w + 1 : b.x - 2; pc(mx, b.y + b.h, 2, C.ink); prect(mx, b.y + b.h - 2, 1, 1, ((G.t * 16) | 0) % 2 ? C.red : C.mid); } // the mine in its paws
    }
  },
  squid: {
    name: 'INK SQUID', zh: '墨鱼', r: 6, hp: 30, spd: 40, mass: 1.1, cost: 2,
    tip: { en: 'Hides in its ink cloud and fires out; aim at the red glint.', zh: '躲进墨云放冷枪，瞄红光打它。' },
    ai(e, dt) { // squirts a vision-blocking ink cloud, lurks inside it and fires single shots out of it (each preceded by a red glint)
      e.cd -= dt; e.cd2 = (e.cd2 === undefined ? rand(0.4, 1.4) : e.cd2) - dt; const dd = dist(e, P), see = los(e.x, e.y, P.x, P.y, false);
      if (e.st === 'squirt') { e.t -= dt; e.sq = Math.sin(e.t * 40) * 0.3; if (e.t <= 0) { e.st = 'move'; e.cd2 = rand(5.5, 6.5); e.cloud = this.cloud(e.x, e.y - 4); AU.splash(); inkDrops(e.x, e.y - 4, -Math.PI / 2, 10, Math.PI, 90); } return; }
      if (e.st === 'aim') { e.t -= dt; if (e.t > 0.15) e.la = angTo(e, P); e.tl.x = e.x; e.tl.y = e.y - 5; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.45); if (e.t <= 0) { e.tl.dead = true; e.st = 'move'; e.cd = rand(1.1, 1.5) - G.floor * 0.1; eShot(e.x, e.y - 5, e.la, 105 + G.floor * 10, { r: 3 }); AU.eshot(); } return; }
      const c = e.cloud && !e.cloud.dead ? e.cloud : null;
      if (c) walk(e, angTo(e, c) + Math.sin(e.anim * 2 + e.seed) * 1.2, this.spd * 0.6, dt); // lurks inside its ink
      else { if (Math.random() < dt * 0.4) e.strafe = -e.strafe; walk(e, (!see || dd > 150) ? navAngle(e, P) : dd < 80 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe, this.spd, dt); }
      if (e.cd2 <= 0 && !c && dd < 200) { e.st = 'squirt'; e.t = 0.4; return; }
      if (e.cd <= 0 && see && dd < 220) { e.st = 'aim'; e.t = 0.45; e.la = angTo(e, P); e.tl = tele({ k: 'line', x: e.x, y: e.y - 5, a: e.la, len: 46, life: 99 }); }
    },
    cloud(x, y) { // drawn above sprites (hides foes and you), below the telegraphs and enemy bullets (those stay readable)
      const f = { k: 'ink', x, y, t: 0, life: 5, b: [],
        u: f => { if (!G.active && f.t < f.life - 0.6) f.t = f.life - 0.6; },
        d: (f, k) => {
          const g = Math.min(1, f.t / 0.3), fade = f.t > f.life - 0.6, odd = ((G.t * 20) | 0) % 2;
          for (let i = 0; i < f.b.length; i++) { if (fade && (i + odd) % 2) continue; const q = f.b[i]; pc(f.x + q[0] * g + Math.sin(G.t * 1.5 + i) * 1.5, f.y + q[1] * g, Math.round(q[2] * g), 'rgba(20,20,26,0.9)'); }
        } };
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + rand(0.4), d = i ? rand(10, 20) : 0; f.b.push([Math.cos(a) * d, Math.sin(a) * d * 0.7, i ? randi(10, 14) : 18]); }
      G.fx.push(f); return f;
    },
    draw(e) {
      const al = e.st === 'aim', x = Math.round(e.x), y = Math.round(e.y + e.r - 4 - Math.abs(Math.sin(e.anim * 3 + e.seed)));
      shadow(e.x, e.y + e.r, e.r);
      for (let i = 0; i < 4; i++) { const tx = x - 3 + i * 2, w = Math.sin(e.anim * 8 + i * 1.3) * 1.5; pline(tx, y, tx + w, y + 4, e.flash > 0 ? C.white : C.ink, 1); prect(tx + w, y + 4, 1, 1, C.mid); } // trailing tentacles
      shape(e, x, y - 13, [0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 3, 3], C.ink); // tall pointed mantle
      if (e.flash <= 0) { prect(x - 5, y - 10, 1, 3, C.mid); prect(x + 5, y - 10, 1, 3, C.mid); prect(x - 1, y - 9, 1, 1, C.dk); prect(x + 1, y - 7, 1, 1, C.dk); } // fins + spots
      prect(x - 3, y - 4, 2, 2, eyeCol(e, al)); prect(x + 2, y - 4, 2, 2, eyeCol(e, al));
      if (e.st === 'squirt') pc(x, y + 1, 2, C.ink);
    }
  },
  /* ---------- CLOCKWORKS ---------- */
  mirror: {
    name: 'MIRROR KNIGHT', zh: '镜面骑士', r: 7, hp: 55, spd: 52, mass: 2.4, cost: 3,
    tip: { en: 'Reflects shots while its mirror glows; strike after it slashes.', zh: '镜面发光时反弹子弹，挥砍后再打。' },
    ai(e, dt) { // move = guard (reflects bullets) -> chase -> wind (red arc) -> slash + dash -> rest
      const dd = dist(e, P);
      if (e.st === 'move') {
        e.reflect = true; walk(e, navAngle(e, P), 18, dt); e.face = P.x > e.x ? 1 : -1; e.cd -= dt;
        if (e.cd <= 0) { e.st = 'chase'; e.t = 2.2; e.reflect = false; }
      } else if (e.st === 'chase') {
        e.reflect = false; walk(e, navAngle(e, P), this.spd, dt); e.t -= dt;
        if (dd < 30 && los(e.x, e.y, P.x, P.y, true)) { e.st = 'wind'; e.t = 0.4; e.la = angTo(e, P); e.tl = tele({ k: 'arc', x: e.x, y: e.y, a: e.la, r: 30, arc: 1.9, life: 99 }); AU.tele(); }
        else if (e.t <= 0) { e.st = 'move'; e.cd = 1.4; }
      } else if (e.st === 'wind') {
        e.t -= dt; e.sq = -0.3; if (e.t > 0.15) e.la = angTo(e, P);
        e.face = Math.cos(e.la) > 0 ? 1 : -1; e.tl.x = e.x; e.tl.y = e.y; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.4);
        if (e.t <= 0) {
          e.tl.dead = true; e.st = 'dash'; e.t = 0.33; AU.dash(); slashFx(e.x, e.y, e.la, 28, 1.9);
          if (dd < 30 + P.hurtR && Math.abs(angDiff(e.la, angTo(e, P))) < 0.95) hurtPlayer(1, e.x, e.y);
        }
      } else if (e.st === 'dash') { walk(e, e.la, 360, dt); e.t -= dt; if (Math.random() < 0.6) part(e.x, e.y + e.r, rand(-20, 20), rand(-20, 0), 0.3, C.lt, 2); if (e.t <= 0) { e.st = 'rest'; e.t = 0.8; } }
      else { e.reflect = false; e.t -= dt; if (e.t <= 0) { e.st = 'move'; e.cd = 1.4; } }
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 1);
      const g = e.st === 'move', al = e.st === 'wind' || e.st === 'dash', f = e.face;
      const b = body(e, 11, 13, C.ink);
      prect(b.x + b.w / 2 - 1, b.y - 3, 2, 3, e.flash > 0 ? C.white : C.mid); // crest
      prect(b.x + 2, b.y + 4, b.w - 4, 2, C.dk); prect(b.x + (f > 0 ? b.w - 5 : 2), b.y + 4, 3, 1, eyeCol(e, al)); // visor
      const sa = al ? e.la : (f > 0 ? Math.PI + 0.5 : -0.5), hx = e.x - (al ? 0 : f * 3), hy = e.y + 1;
      pline(hx, hy, hx + Math.cos(sa) * 9, hy + Math.sin(sa) * 9, al ? C.white : C.lt, 1); prect(hx - 1, hy - 1, 2, 2, C.ink); // sword
      const pa = angTo(e, P), sx = e.x + Math.cos(pa) * 7, sy = e.y - 1 + Math.sin(pa) * 4, pu = Math.sin(G.t * 14) > 0;
      rrect(sx - 3, sy - 5, 7, 10, e.elite ? C.gold : C.ink); // mirror shield: bright white-gold only while it reflects
      rrect(sx - 2, sy - 4, 5, 8, g ? (pu ? C.white : C.gold) : C.dk);
      if (g) { prect(sx - 1, sy - 3, 1, 3, pu ? C.gold : C.white); if (pu) pring(sx, sy, 7, C.gold); } else prect(sx - 1, sy - 3, 1, 3, C.mid);
    }
  },
  lantern: {
    name: 'LANTERN GHOST', zh: '提灯幽灵', r: 6, hp: 26, spd: 30, mass: 0.8, cost: 2, flying: true,
    tip: { en: 'Wards nearby foes; kill it and every ward it cast breaks.', zh: '给周围敌人加护盾，杀它护盾全破。' },
    ai(e, dt) {
      const dd = dist(e, P);
      if (Math.random() < dt * 0.3) e.strafe = -e.strafe;
      const a = dd < 90 ? angTo(P, e) + Math.sin(e.anim + e.seed) * 0.4 : dd > 170 ? angTo(e, P) : angTo(e, P) + Math.PI / 2 * e.strafe;
      e.x += Math.cos(a) * this.spd * dt; e.y += Math.sin(a) * this.spd * dt; clampRoom(e);
      e.tetT = (e.tetT || 0) - dt; e.cd -= dt;
      if (e.cd <= 0) { // ward the 2 nearest unwarded allies; its gold threads stay on them while the ward lasts
        const tg = G.enemies.filter(o => o !== e && !o.dead && !o.boss && !o.dummy && !o.hide && !(o.spawnT > 0) && !(o.bubble > 0))
          .sort((p, q) => d2(p.x, p.y, e.x, e.y) - d2(q.x, q.y, e.x, e.y)).slice(0, 2);
        if (tg.length) { const v = 18 * (1 + G.floor * 0.45); for (const o of tg) { o.bubble = v; o.bubbleMax = v; o.wardBy = e; } e.tetT = 0.3; e.cd = 3; AU.tink(); }
        else e.cd = 0.5;
      }
    },
    onDie(e) { for (const o of G.enemies) if (o.wardBy === e) { o.wardBy = null; if (o.bubble > 0) { o.bubble = 0; ringFx(o.x, o.y - o.r, o.r, o.r * 3, 0.25, C.gold, 1); } } AU.tink(); },
    draw(e) {
      const x = Math.round(e.x), y = Math.round(e.y - 7 + Math.sin(e.anim * 2.2 + e.seed) * 2), f = P.x > e.x ? 1 : -1, lx = x + f * 8, ly = y + 1; // holds its lantern out toward you
      shadow(e.x, e.y + e.r, 4);
      for (const o of G.enemies) if (o.wardBy === e && o.bubble > 0 && !o.dead) pline(lx, ly + 3, o.x, o.y - o.r, C.gold, 1, e.tetT > 0 ? 0 : 2, G.t * 10); // threads to every ward it keeps
      shape(e, x, y - 6, [2, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5], C.lt, C.ink2); // a pale sheet
      const hm = (e.anim * 6 + e.seed) | 0; for (let c = -5; c <= 5; c++) if ((c + hm) % 2 === 0) prect(x + c, y + 5, 1, 1, e.elite ? C.gold : C.ink2); // ragged hem
      if (e.flash <= 0) prect(x - 3, y - 4, 2, 1, C.paper);
      for (const ex of [x - 3 + f, x + 1 + f]) { prect(ex, y - 2, 2, 2, C.ink); prect(ex + (f > 0 ? 1 : 0), y - 2, 1, 1, eyeCol(e, false)); } // hollow eyes
      prect(x + f, y + 1, 1, 2, C.ink); // wailing mouth
      pline(x + f * 5, y + 1, lx, ly - 2, C.ink2, 1); // arm
      const fl = ((G.t * 10 + e.seed) | 0) % 2, big = e.tetT > 0 ? 1 : 0; // iron lantern; the flame flares when it wards
      prect(lx - 1, ly - 2, 3, 1, C.ink); rrect(lx - 2, ly - 1, 5, 7, C.ink); prect(lx - 1, ly, 3, 5, C.dk); prect(lx - 1, ly + 6, 3, 1, C.ink);
      prect(lx - big, ly + 1 - big, 1 + big * 2, 3 + big * 2, C.fire); prect(lx, ly + 2 - fl, 1, 1, C.white);
    }
  },
  shade: {
    name: 'SHADE', zh: '暗影', r: 5, hp: 24, spd: 44, mass: 1, cost: 2,
    tip: { en: 'Blinks behind you and slashes; dash away the moment it vanishes.', zh: '闪到你身后斩击，消失时快闪开。' },
    ai(e, dt) {
      const dd = dist(e, P);
      if (e.st === 'wind') {
        e.t -= dt; e.tl.x = e.x; e.tl.y = e.y; teleK(e.tl, 1 - e.t / 0.35);
        if (e.t <= 0) {
          e.tl.dead = true; e.st = 'rest'; e.t = 0.45; AU.dash(); slashFx(e.x, e.y, e.la, 16, 2.0);
          if (dd < 18 + P.hurtR && Math.abs(angDiff(e.la, angTo(e, P))) < 1.0) hurtPlayer(1, e.x, e.y);
        }
        return;
      }
      if (e.st === 'rest') { e.t -= dt; walk(e, angTo(P, e), this.spd, dt); if (e.t <= 0) e.st = 'move'; return; }
      if (Math.random() < dt * 0.4) e.strafe = -e.strafe;
      walk(e, dd > 120 ? navAngle(e, P) : dd < 80 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe, this.spd, dt);
      e.cd -= dt;
      if (e.cd <= 0) { // blink in 24px behind the player (opposite their velocity, else their aim)
        const fa = Math.hypot(P.vx, P.vy) > 10 ? Math.atan2(P.vy, P.vx) : (P.aim || 0);
        let s = null;
        for (const off of [0, 0.6, -0.6, 1.2, -1.2]) {
          const a = fa + Math.PI + off, x = P.x + Math.cos(a) * 24, y = P.y + Math.sin(a) * 24;
          if (los(x, y, P.x, P.y, true) && (s = freeSpot(x, y, e.r, 0))) break;
        }
        if (s) {
          burst(e.x, e.y, 8, C.ink, 60, 0.3); e.x = s.x; e.y = s.y; e.kx = e.ky = 0; burst(e.x, e.y, 8, C.ink, 60, 0.3);
          e.st = 'wind'; e.t = 0.35; e.la = angTo(e, P); e.face = Math.cos(e.la) > 0 ? 1 : -1; e.cd = rand(2.6, 3.4);
          e.tl = tele({ k: 'arc', x: e.x, y: e.y, a: e.la, r: 18, arc: 2.0, life: 99 }); AU.tele();
        } else e.cd = 0.4;
      }
    },
    draw(e) {
      if (dist(e, P) > 60 && e.st === 'move') { // nearly invisible: a dithered outline on every other frame
        if (((G.t * 30) | 0) % 2) return;
        const col = e.elite ? C.gold : C.mid;
        for (let i = 0; i < 18; i += 2) { const a = i / 18 * TAU; prect(e.x + Math.cos(a) * 5, e.y - 1 + Math.sin(a) * 6, 1, 1, col); }
        return;
      }
      shadow(e.x, e.y + e.r, e.r);
      const al = e.st === 'wind', b = body(e, 9, 11, C.ink2);
      for (let i = 0; i < 3; i++) prect(b.x + 1 + i * 3, b.y + b.h, 2, 1 + (((e.anim * 8) | 0) + i) % 2, e.flash > 0 ? C.white : C.ink2); // tatters
      prect(b.x + 2, b.y + 3, 2, 1, eyeCol(e, al)); prect(b.x + 5, b.y + 3, 2, 1, eyeCol(e, al));
    }
  },
  prismlet: {
    name: 'CRYSTAL', zh: '水晶怪', r: 5, hp: 28, spd: 36, mass: 0.9, cost: 2, flying: true,
    tip: { en: 'Sweeps a short beam across a red fan; dodge out past its start edge.', zh: '激光扇形扫射，从起始边躲出去。' },
    ai(e, dt) { // shows a red fan with an arrow (sweep direction), then drags a 130px beam across it; you start near the fan's first edge
      const dd = dist(e, P), ox = e.x, oy = e.y - 6;
      if (e.st === 'aim') {
        e.t -= dt; e.tl.x = ox; e.tl.y = oy; teleK(e.tl, 1 - e.t / 0.7);
        if (e.t <= 0) {
          e.tl.dead = true; e.st = 'beam'; e.t = 0.6; AU.laser(0.6);
          const bm = eBeam(ox, oy, e.a0, 4, C.red);
          bm.u = f => { // capped at 130px; dies with its crystal or the moment the crystal is frozen or stunned
            if (e.dead || e.frozen > 0 || e.stunT > 0) { f.dead = true; return; }
            f.len = rayWall(f.x, f.y, f.a, 130);
            const t = clamp((P.x - f.x) * Math.cos(f.a) + (P.y - f.y) * Math.sin(f.a), 0, f.len), px = f.x + Math.cos(f.a) * t, py = f.y + Math.sin(f.a) * t;
            if (d2(px, py, P.x, P.y) < (f.w / 2 + P.hurtR) ** 2) hurtPlayer(1, px, py);
            if (Math.random() < 0.6) sparks(f.x + Math.cos(f.a) * f.len, f.y + Math.sin(f.a) * f.len, f.a + Math.PI, 1, f.col, 110, 1.2);
          };
          e.beam = bm;
        }
        return;
      }
      if (e.st === 'beam') {
        e.t -= dt; const bm = e.beam;
        if (bm && !bm.dead) { bm.x = ox; bm.y = oy; bm.a = e.a0 + e.sw * clamp(1 - e.t / 0.6, 0, 1); }
        if (e.t <= 0 || !bm || bm.dead) { if (bm) bm.dead = true; e.beam = null; e.st = 'rest'; e.t = 0.4; e.cd = rand(2.4, 3.0) - G.floor * 0.15; }
        return;
      }
      if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) e.st = 'move'; return; }
      if (Math.random() < dt * 0.3) e.strafe = -e.strafe;
      const a = (dd > 150 ? angTo(e, P) : dd < 90 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe) + Math.sin(e.anim * 2 + e.seed) * 0.3;
      e.x += Math.cos(a) * this.spd * dt; e.y += Math.sin(a) * this.spd * dt; clampRoom(e);
      e.cd -= dt;
      if (e.cd <= 0 && dd < 160 && los(ox, oy, P.x, P.y, false)) {
        const s = Math.random() < 0.5 ? 1 : -1; e.sw = s * 1.1; e.a0 = Math.atan2(P.y - oy, P.x - ox) - s * 0.3; e.st = 'aim'; e.t = 0.7; AU.tele();
        e.tl = tele({ x: ox, y: oy, a: e.a0, sw: e.sw, life: 99, d: this.sector });
      }
    },
    sector(t, k, bl) { // the swept sector: solid start edge, dashed far edge, an arrow along the sweep
      const a0 = t.a, a1 = t.a + t.sw, lo = Math.min(a0, a1), hi = Math.max(a0, a1), R = 130, c = k > 0.7 && bl ? C.white : C.red;
      parc(t.x, t.y, R, lo, hi, c, 1); parc(t.x, t.y, R * k, lo, hi, C.redDk, 1);
      pline(t.x, t.y, t.x + Math.cos(a0) * R, t.y + Math.sin(a0) * R, c, 1); pline(t.x, t.y, t.x + Math.cos(a1) * R, t.y + Math.sin(a1) * R, c, 1, 3);
      const am = a0 + t.sw * 0.65, ax = t.x + Math.cos(am) * (R - 10), ay = t.y + Math.sin(am) * (R - 10), d = am + Math.sign(t.sw) * Math.PI / 2;
      pline(ax, ay, ax - Math.cos(d - 0.5) * 6, ay - Math.sin(d - 0.5) * 6, c); pline(ax, ay, ax - Math.cos(d + 0.5) * 6, ay - Math.sin(d + 0.5) * 6, c);
    },
    onDie(e) { if (e.beam) e.beam.dead = true; },
    draw(e) {
      const x = Math.round(e.x), y = Math.round(e.y - 6 + Math.sin(e.anim * 3 + e.seed) * 2), w = 4, h = 6;
      shadow(e.x, e.y + e.r, 3);
      const ol = e.elite ? C.gold : C.ink, fill = e.flash > 0 ? C.ink : e.frozen > 0 ? '#bfe6ff' : C.white, hot = e.st === 'aim' || e.st === 'beam';
      for (let yy = -h - 1; yy <= h + 1; yy++) { const hw = Math.round((w + 1) * (1 - Math.abs(yy) / (h + 1))); prect(x - hw, y + yy, hw * 2 + 1, 1, ol); }
      for (let yy = -h; yy <= h; yy++) { const hw = Math.round(w * (1 - Math.abs(yy) / h)); prect(x - hw, y + yy, hw * 2 + 1, 1, fill); }
      pline(x, y - h + 1, x, y + h - 1, C.cyan, 1); pline(x + 1, y + 1, x + w - 1, y, C.cyan, 1); pline(x - w + 1, y, x - 1, y - 1, C.cyanDk, 1); // facets
      prect(x - 1, y - 2, 1, 2, hot && ((G.t * 16) | 0) % 2 ? C.red : hot ? C.redDk : C.ink); // eye
    }
  },
  /* ---------- CRYPT II ---------- */
  inkpot: {
    name: 'SPAWNING CAULDRON', zh: '孵化锅', r: 6, hp: 22, spd: 0, mass: 99, cost: 2, anchored: true,
    tip: { en: 'Brews slimes endlessly; destroy the cauldron first.', zh: '不断孵出史莱姆，优先打掉锅。' },
    ai(e, dt) { // brews a slime every few seconds; never more than 2 (elite 3) of its own alive at once
      e.kids = (e.kids || []).filter(k => !k.dead);
      if (e.st === 'brew') {
        e.t -= dt; e.sq = Math.sin(e.t * 36) * 0.3;
        if (e.t <= 0) {
          e.st = 'move'; e.cd = rand(3.6, 4.4) - G.floor * 0.3;
          const a = angTo(e, P) + rand(-0.9, 0.9), s = freeSpot(e.x + Math.cos(a) * 15, e.y + Math.sin(a) * 15, 5, 16);
          if (s) { e.kids.push(spawnEnemy('inkling', s.x, s.y, false, 0.55)); inkDrops(e.x, e.y - 10, a, 8, 0.6, 90); e.sq = 0.6; }
        }
        return;
      }
      e.cd -= dt;
      if (e.cd <= 0 && e.kids.length < (e.elite ? 3 : 2) && G.enemies.length < 14 && dist(e, P) < 280) { e.st = 'brew'; e.t = 0.6; }
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r + 2);
      const al = e.st === 'brew', fl = e.flash > 0;
      const b = body({ ...e, y: e.y - 2 }, 14, 9, C.dk); // iron pot on stubby legs
      for (const s of [-1, 1]) prect(e.x + s * 5 - 1, e.y + e.r - 2, 2, 2, C.ink);
      if (!fl) { prect(b.x + 2, b.y + 4, b.w - 4, 1, C.ink); prect(b.x + 1, b.y + 2, 1, 2, C.mid); } // band + glint
      rrect(b.x - 2, b.y - 3, b.w + 4, 4, e.elite ? C.gold : fl ? C.ink : C.white); rrect(b.x - 1, b.y - 2, b.w + 2, 2, fl ? C.white : C.mid); prect(b.x + 1, b.y - 2, b.w - 2, 1, C.ink); // rim + the goo inside
      prect(b.x + 3, b.y + 5, 2, 2, eyeCol(e, al)); prect(b.x + b.w - 5, b.y + 5, 2, 2, eyeCol(e, al)); // the pot's own eyes
      const k = (G.t * (al ? 3 : 0.8) + e.seed) % 1; // a goo bubble rising out of the pot; fast and red-blinking while it brews
      pc(e.x - 1 + Math.sin(e.seed + G.t * 2), b.y - 3 - k * (al ? 8 : 4), al ? 2 : 1, al && ((G.t * 16) | 0) % 2 ? C.red : C.ink);
    }
  },
  quill: {
    name: 'SHADOW HOUND', zh: '影犬', r: 5, hp: 26, spd: 46, mass: 1.1, cost: 2, contact: true,
    tip: { en: 'Dashes twice, leaving a shadow streak; never stand on it.', zh: '连冲两次留下影迹，别踩轨迹。' },
    ai(e, dt) { // keeps its distance, aims a red lane, dashes down it leaving a streak of shadow that hurts, then re-aims (shorter tell) and dashes again
      const dd = dist(e, P);
      if (e.st === 'aim') {
        const T0 = e.n ? 0.4 : 0.6;
        e.t -= dt; if (e.t > 0.2) e.la = angTo(e, P); e.face = Math.cos(e.la) > 0 ? 1 : -1; e.sq = -0.3;
        e.tl.x = e.x; e.tl.y = e.y; e.tl.a = e.la; e.tl.len = Math.max(1, rayWall(e.x, e.y, e.la, 130)); teleK(e.tl, 1 - e.t / T0);
        if (e.t <= 0) { e.tl.dead = true; e.st = 'dash'; e.t = 0.42; e.trail = shadowTrail(); AU.dash(); e.sq = 0.5; }
        return;
      }
      if (e.st === 'dash') {
        const h = moveBody(e, Math.cos(e.la) * 300 * dt, Math.sin(e.la) * 300 * dt); e.t -= dt;
        e.trail.pts.push({ x: e.x, y: e.y, t: e.trail.t });
        if (h || e.t <= 0) { if (!e.n) { e.n = 1; this.lane(e, 0.4); } else { e.n = 0; e.st = 'rest'; e.t = 0.7; e.cd = rand(1.8, 2.4) - G.floor * 0.15; } }
        return;
      }
      if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) e.st = 'move'; return; }
      if (Math.random() < dt * 0.5) e.strafe = -e.strafe;
      const see = los(e.x, e.y, P.x, P.y, true);
      walk(e, (!see || dd > 130) ? navAngle(e, P) : dd < 70 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe, this.spd, dt);
      e.cd -= dt;
      if (e.cd <= 0 && see && dd < 150) { e.n = 0; this.lane(e, 0.6); }
    },
    lane(e, t) { e.st = 'aim'; e.t = t; e.la = angTo(e, P); e.tl = tele({ k: 'line', x: e.x, y: e.y, a: e.la, w: 6, len: Math.max(1, rayWall(e.x, e.y, e.la, 130)), life: 99 }); AU.tele(); },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r);
      const al = e.st === 'aim', f = e.face, sq = e.sq || 0, bw = 11 * (1 + sq * 0.3), bx = e.x - bw / 2, by = e.y - 2 + e.r - 6 * (1 - sq * 0.3); // side view: body() geometry, known before drawing the head
      const fill = e.flash > 0 ? C.white : e.frozen > 0 ? '#bfe6ff' : e.fren ? C.redDk : C.ink, hx = Math.round(f > 0 ? bx + bw - 3 : bx - 3), hy = Math.round(by - 3);
      const k = al ? 1.1 + Math.sin(G.t * 50) * 0.12 : 0.6 + Math.sin(e.anim * 12) * 0.25, ta = f > 0 ? Math.PI + k : -k, tx = f > 0 ? bx + 1 : bx + bw - 2, ty = by + 1; // tail: wags, stands up and quivers while aiming
      pline(tx, ty, tx + Math.cos(ta) * 6, ty + Math.sin(ta) * 6, e.flash > 0 ? C.ink : e.elite ? C.gold : C.white, 3); pline(tx, ty, tx + Math.cos(ta) * 5, ty + Math.sin(ta) * 5, fill, 1);
      if (e.elite) rrect(hx - 2, hy - 2, 10, 9, C.gold);
      rrect(hx - 1, hy - 1, 8, 7, e.flash > 0 || e.elite ? C.ink : C.white);
      const b = body({ ...e, y: e.y - 2 }, 11, 6, C.ink), run = e.mv ? ((e.anim * 14) | 0) % 2 : 0;
      for (const [lx, d] of [[b.x + 1, run], [b.x + 3, -run], [b.x + b.w - 4, -run], [b.x + b.w - 2, run]]) prect(lx + d, b.y + b.h, 1, 2, C.ink); // legs scissor while it runs
      rrect(hx, hy, 6, 5, fill);
      const H = (dx, y, w, h, c) => prect(f > 0 ? hx + 6 - dx - w : hx + dx, y, w, h, c); // dx = pixels back from the snout
      H(4, hy - 3, 1, 3, fill); H(2, hy + 1, 2, 1, eyeCol(e, al)); H(1, hy + 4, 1, 1, C.white); // pricked ear, eye, fang
    }
  },
  /* ---------- SEWERS II ---------- */
  eel: {
    name: 'SEWER EEL', zh: '下水道鳗', r: 6, hp: 30, spd: 0, mass: 1.4, cost: 2,
    tip: { en: 'Dives, then surfaces at range to spit fans; hit it while it is up.', zh: '潜水后远处浮出喷弹，露头时打。' },
    spot(e) { // a surfacing point 44-84px from the player with a clear shot at them; puddles preferred
      let best = null, bs = -1;
      for (let k = 0; k < 16; k++) {
        const a = rand(TAU), d = rand(44, 84), s = freeSpot(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, e.r, 8);
        if (!s || d2(s.x, s.y, P.x, P.y) < 40 * 40 || !los(s.x, s.y, P.x, P.y, false)) continue;
        const sc = (tAt(G.room, Math.floor(s.x / T), Math.floor(s.y / T)) === TP ? 2 : 0) + Math.random();
        if (sc > bs) { bs = sc; best = s; }
      }
      return best || freeSpot(e.x, e.y, e.r, 24) || { x: e.x, y: e.y };
    },
    fan(e) { return tele({ x: e.x, y: e.y - 6, a: e.la, life: 99, d: (t, k, bl) => { for (let i = -1; i <= 1; i++) { const a = t.a + i * 0.3, l = 6 + 12 * k; pline(t.x + Math.cos(a) * 5, t.y + Math.sin(a) * 5, t.x + Math.cos(a) * l, t.y + Math.sin(a) * l, k > 0.7 && bl ? C.white : C.red, 1, 2); } } }); },
    ai(e, dt) { // surfaced (vulnerable) -> dive -> under (only a wake shows) -> rise (ripples mark the spot) -> spit 3-shot fans -> surfaced
      e.t -= dt;
      if (e.st === 'move') { e.cd -= dt; e.face = P.x > e.x ? 1 : -1; if (e.cd <= 0) { e.st = 'dive'; e.t = 0.35; } }
      else if (e.st === 'dive') { e.sq = Math.sin(e.t * 50) * 0.3; if (e.t <= 0) { e.st = 'under'; e.t = rand(0.9, 1.4); e.hide = e.inv = true; e.kx = e.ky = 0; AU.splash(); inkDrops(e.x, e.y, -Math.PI / 2, 8, 1.2, 70, C.mid); } }
      else if (e.st === 'under') {
        walk(e, navAngle(e, P), 95, dt);
        if (e.t <= 0) {
          const s = this.spot(e); e.tx = s.x; e.ty = s.y; e.st = 'rise'; e.t = 0.55;
          e.tl = tele({ x: s.x, y: s.y + e.r - 1, life: 99, d: (t, k, bl) => { for (let i = 0; i < 2; i++) { const rr = 3 + ((k * 2 + i * 0.5) % 1) * 8; pellipse(t.x, t.y, rr, rr * 0.4, bl ? C.white : C.mid); } } });
        }
      } else if (e.st === 'rise') {
        teleK(e.tl, 1 - e.t / 0.55); const k = Math.min(1, dt * 8); e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k;
        if (e.t <= 0) {
          e.tl.dead = true; e.x = e.tx; e.y = e.ty; e.hide = e.inv = false; e.sq = 0.7; AU.splash(); inkDrops(e.x, e.y, -Math.PI / 2, 12, 1.2, 100, C.mid); ringFx(e.x, e.y + e.r - 1, 2, 12, 0.3, C.lt, 1);
          e.st = 'spit'; e.t = 0.45; e.n = e.elite || G.floor >= 2 ? 2 : 1; e.la = angTo(e, P); e.tl = this.fan(e);
        }
      } else if (e.st === 'spit') {
        if (e.t > 0.12) e.la = angTo(e, P); e.face = Math.cos(e.la) > 0 ? 1 : -1; e.tl.x = e.x; e.tl.y = e.y - 6; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.45); e.sq = -0.25;
        if (e.t <= 0) {
          for (let k = -1; k <= 1; k++) eShot(e.x + e.face * 3, e.y - 6, e.la + k * 0.3, 100 + G.floor * 10, { r: 3 });
          AU.eshot(); e.sq = 0.5;
          if (--e.n > 0) { e.t = 0.45; teleK(e.tl, 0); } else { e.tl.dead = true; e.st = 'move'; e.cd = 0.8; }
        }
      }
    },
    draw(e) {
      const x = Math.round(e.x), wy = Math.round(e.y + e.r - 1), j = ((G.t * 8 + e.seed) | 0) % 2;
      if (e.hide) { pellipse(x, wy, 5 + j, 2, C.mid); pellipse(x, wy, 2, 1, C.lt); return; } // underway: only a wake shows
      const up = e.st === 'dive' ? clamp(e.t / 0.35, 0.3, 1) : 1, al = e.st === 'spit', f = e.face;
      const b = body(e, 7, Math.round(5 + 10 * up), C.ink);
      prect(f > 0 ? b.x - 2 : b.x + b.w, b.y + 5, 2, 3, e.elite ? C.gold : C.white); // fin
      for (let i = 0; i < 3 && 3 + i * 3 < b.h; i++) prect(f > 0 ? b.x + 1 : b.x + b.w - 2, b.y + 3 + i * 3, 1, 2, C.dk); // gill slits
      prect(b.x + (f > 0 ? 4 : 1), b.y + 2, 2, 2, eyeCol(e, al));
      prect(f > 0 ? b.x + b.w : b.x - 2, b.y + 4, 2, 1, C.mid); prect(f > 0 ? b.x + b.w + 1 : b.x - 3, b.y + 5, 2, 1, C.mid); // drooping whisker
      if (al) prect(f > 0 ? b.x + b.w - 2 : b.x - 1, b.y + 5, 3, 2, ((G.t * 16) | 0) % 2 ? C.red : C.redDk); // gaping mouth
      pellipse(x, wy, 6 + j, 2, C.dk); pellipse(x, wy + 1, 9 - j, 3, C.lt, 2); // the sewer water it rises from
    }
  },
  spore: {
    name: 'SPORE POD', zh: '孢子囊', r: 7, hp: 34, spd: 20, mass: 1.6, cost: 2, flying: true, contact: true,
    tip: { en: 'Bursts into darting spores when popped; pop it from afar.', zh: '死后爆出飞射孢子，远处打爆它。' },
    ai(e, dt) { // drifts lazily after you; bursting it frees three fast sporelets
      const a = angTo(e, P) + Math.sin(e.anim * 1.3 + e.seed) * 0.8;
      e.x += Math.cos(a) * this.spd * dt; e.y += Math.sin(a) * this.spd * dt; clampRoom(e);
      if (Math.abs(Math.cos(a)) > 0.3) e.face = Math.cos(a) > 0 ? 1 : -1;
      if (Math.random() < dt * 2) part(e.x + rand(-4, 4), e.y - 7 + rand(-4, 4), rand(-8, 8), rand(-12, -4), 0.8, C.lt, 1, { drag: 0.97 });
    },
    onDie(e) {
      const a0 = rand(TAU); AU.pop(); burst(e.x, e.y - 7, 12, C.lt, 90, 0.45);
      for (let i = 0; i < 3; i++) {
        const a = a0 + i * TAU / 3, s = freeSpot(e.x + Math.cos(a) * 9, e.y + Math.sin(a) * 9, 3, 12) || e;
        const c = spawnEnemy('sporelet', s.x, s.y, false, 0.4); c.cd = rand(0.5, 0.8); c.la = a;
      }
    },
    draw(e) {
      const x = Math.round(e.x), y = Math.round(e.y - 7 + Math.sin(e.anim * 1.8 + e.seed) * 2), r = 6 + Math.round((e.sq || 0) * 2 + Math.sin(e.anim * 3 + e.seed) * 0.5);
      shadow(e.x, e.y + e.r, 5);
      const fill = e.flash > 0 ? C.white : e.frozen > 0 ? '#bfe6ff' : e.fren ? C.redDk : C.ink;
      for (let i = 0; i < 3; i++) prect(x - 2 + i * 2, y + r - 1, 1, 3 + (((e.anim * 5) | 0) + i) % 2, C.ink); // dangling roots
      pc(x, y, r + 1, e.elite ? C.gold : C.white); pc(x, y, r, fill);
      for (const [px, py] of [[-3, -3], [1, -4], [3, -1], [-4, 0], [0, -1]]) prect(x + px, y + py, 1, 1, C.lt); // spores showing through the skin
      prect(x - 3, y + 2, 2, 1, eyeCol(e, false)); prect(x + 1, y + 2, 2, 1, eyeCol(e, false));
    }
  },
  sporelet: {
    name: 'SPORELING', zh: '小孢子', r: 3, hp: 6, spd: 0, mass: 0.5, cost: 0, flying: true, contact: true,
    tip: { en: 'Its eye blinks red, then it darts at you.', zh: '眼睛闪红后突刺。' },
    ai(e, dt) { // hovers while its eye blinks red, then darts at you
      if (e.st === 'move') { e.cd -= dt; if (e.cd <= 0) { e.st = 'dart'; e.t = 0.32; e.la = angTo(e, P) + rand(-0.2, 0.2); e.face = Math.cos(e.la) > 0 ? 1 : -1; } return; }
      e.t -= dt; const s = 160 * (0.3 + Math.max(0, e.t) / 0.32); e.x += Math.cos(e.la) * s * dt; e.y += Math.sin(e.la) * s * dt; clampRoom(e);
      if (e.t <= 0) { e.st = 'move'; e.cd = rand(0.5, 0.8); }
    },
    draw(e) {
      const x = Math.round(e.x), y = Math.round(e.y - 4 + Math.sin(e.anim * 9 + e.seed)), al = e.st === 'move' && e.cd < 0.35 && ((G.t * 20) | 0) % 2;
      shadow(e.x, e.y + e.r, 2);
      pc(x, y, 3, e.elite ? C.gold : C.white); pc(x, y, 2, e.flash > 0 ? C.white : e.frozen > 0 ? '#bfe6ff' : C.ink);
      prect(x + (e.face > 0 ? 0 : -1), y - 1, 1, 1, eyeCol(e, al));
    }
  },
  /* ---------- CLOCKWORKS II ---------- */
  clockwork: {
    name: 'AUTOMATON', zh: '机关兵', r: 6, hp: 40, spd: 75, mass: 1.6, cost: 2,
    tip: { en: 'Fires a 4-way cross that turns 45° each time; stand on the diagonal.', zh: '十字弹每次转45°，站对角线。' },
    ai(e, dt) { // tick: a short burst of steps; tock: dead still. Wound up, it fires a 4-way cross (red tell) that turns 45° every volley
      e.t -= dt; e.cd -= dt; const dd = dist(e, P);
      if (e.st === 'move') { walk(e, e.la, this.spd, dt); if (e.t <= 0) { e.st = 'tock'; e.t = 0.45; e.n = (e.n || 0) + 1; e.sq = -0.35; pSnd('cw-tick', 0.05, () => AU.tone('triangle', 1600, 1500, 0.03, 0.02)); } }
      else if (e.st === 'tock') {
        if (e.t > 0) return;
        if (e.cd <= 0 && dd < 230) {
          e.st = 'wind'; e.t = 0.6; e.rot = e.rot || 0; AU.tele();
          e.tl = tele({ x: e.x, y: e.y - 5, a: e.rot, life: 99, d: (t, k, bl) => { for (let i = 0; i < 4; i++) { const a = t.a + i * Math.PI / 2, l = 8 + 22 * k; pline(t.x + Math.cos(a) * 7, t.y + Math.sin(a) * 7, t.x + Math.cos(a) * l, t.y + Math.sin(a) * l, k > 0.7 && bl ? C.white : C.red, 1, 3, -G.t * 30); } } });
        } else {
          e.st = 'move'; e.t = 0.22; if (Math.random() < 0.3) e.strafe = -e.strafe;
          e.la = dd > 110 || !los(e.x, e.y, P.x, P.y, true) ? navAngle(e, P) : dd < 60 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe;
        }
      } else if (e.st === 'wind') {
        teleK(e.tl, 1 - e.t / 0.6); e.sq = Math.sin(e.t * 60) * 0.15;
        if (e.t <= 0) {
          e.tl.dead = true; const sp = 92 + G.floor * 10, n = e.elite || G.floor >= 3 ? 3 : 2; // each arm is a short line of bullets
          for (let i = 0; i < 4; i++) for (let j = 0; j < n; j++) eShot(e.x, e.y - 5, e.rot + i * Math.PI / 2, sp * (1 - j * 0.22), { r: j ? 2.5 : 3 });
          AU.eshot(); e.rot += Math.PI / 4; e.st = 'tock'; e.t = 0.35; e.cd = rand(1.6, 2.0) - G.floor * 0.1; e.sq = 0.5;
        }
      }
    },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r);
      const al = e.st === 'wind', f = e.face, b = body({ ...e, y: e.y - (e.st === 'move' ? 1 : 0) }, 10, 12, C.ink);
      const kx = e.x - f * 7, ky = b.y + 6, kh = Math.round(Math.cos((e.n || 0) * Math.PI / 4) * 3); // wind-up key on its back: turns a notch every tick
      pline(f > 0 ? b.x : b.x + b.w, ky, kx, ky, C.mid, 1); prect(kx - 1, ky - Math.abs(kh) - 1, 2, Math.abs(kh) * 2 + 2, e.elite ? C.gold : C.white);
      const fx = b.x + b.w / 2 + f, fy = b.y + 4, ra = e.rot || 0; // clock-face eye; its hand points down the next volley
      pc(fx, fy, 3, C.ink); pc(fx, fy, 2, eyeCol(e, al && ((G.t * 16) | 0) % 2)); pline(fx, fy, fx + Math.cos(ra) * 2, fy + Math.sin(ra) * 2, C.ink, 1);
      prect(b.x + 2, b.y + b.h - 3, b.w - 4, 1, C.dk); // belt
    }
  },
  bell: {
    name: 'ALARM BELL', zh: '警钟', r: 8, hp: 56, spd: 0, mass: 99, cost: 2, anchored: true,
    tip: { en: 'Tolls an expanding ring; stand in the dashed safe gap.', zh: '钟声扩散成环，站进虚线缺口。' },
    ai(e, dt) { // sleeps until you come close, swings (red ring tell; the dashed lane marks the safe gap) and tolls an expanding ring
      e.cd -= dt; e.ringT = Math.max(0, (e.ringT || 0) - dt);
      if (e.st === 'wind') {
        e.t -= dt; teleK(e.tl, 1 - e.t / 0.85);
        if (e.t <= 0) {
          e.tl.dead = true; e.st = 'move'; e.cd = 2.6 - G.floor * 0.25; e.ringT = 0.6; shake(0.1);
          bellRing(e.x, e.y, e.gap, 0.55, 105, 128); if (e.elite) later(0.45, () => { if (!e.dead) bellRing(e.x, e.y, e.gap, 0.55, 105, 128); });
          pSnd('bell', 0.15, () => { AU.tone('triangle', 466, 452, 0.45, 0.07, { verb: 0.25 }); AU.tone('sine', 1290, 1240, 0.22, 0.02, { verb: 0.2 }); AU.tone('sine', 233, 228, 0.5, 0.04); }); // a short iron alarm clang, not a temple bell
        }
        return;
      }
      if (e.cd <= 0 && dist(e, P) < 100) {
        e.st = 'wind'; e.t = 0.85; e.gap = angTo(e, P) + (Math.random() < 0.5 ? -1 : 1) * rand(1.0, 1.9); AU.tele();
        e.tl = tele({ x: e.x, y: e.y, a: e.gap, life: 99, d: (t, k, bl) => {
          const c = k > 0.75 && bl ? C.white : C.red, r = 14 + 16 * k, g = 0.55;
          parc(t.x, t.y, r, t.a + g, t.a + TAU - g, c, 1);
          for (const s of [-1, 1]) { const a = t.a + s * g; pline(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, t.x + Math.cos(a) * (r + 6), t.y + Math.sin(a) * (r + 6), c, 1); }
          const ca = Math.cos(t.a), sa = Math.sin(t.a); // the safe lane, ink and white dashes so it reads on any floor
          pline(t.x + ca * 12, t.y + sa * 12, t.x + ca * 64, t.y + sa * 64, C.ink, 1, 3, -G.t * 20); pline(t.x + ca * 12, t.y + sa * 12, t.x + ca * 64, t.y + sa * 64, C.white, 1, 3, 3 - G.t * 20);
        } });
      }
    },
    draw(e) {
      const x = Math.round(e.x), gy = Math.round(e.y + e.r), top = gy - 22, al = e.st === 'wind';
      shadow(e.x, gy, e.r + 3);
      prect(x - 11, gy - 24, 2, 24, C.dk); prect(x + 9, gy - 24, 2, 24, C.dk); prect(x - 12, gy - 27, 24, 3, C.dk); prect(x - 11, gy - 26, 22, 1, C.mid); prect(x - 1, top - 3, 2, 3, C.ink); // iron gallows
      const ol = e.elite ? C.gold : C.white, fill = e.flash > 0 ? C.white : e.frozen > 0 ? '#bfe6ff' : e.fren ? C.redDk : C.dk;
      const sw = al ? Math.sin(G.t * 22) * 2.5 : Math.sin(G.t * 30) * (e.ringT || 0) * 3, H =[2, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 7, 8];
      const dx = i => Math.round(sw * i / 15);
      prect(x - H[0] - 1, top - 1, H[0] * 2 + 2, 1, ol);
      for (let i = 0; i < 16; i++) prect(x + dx(i) - H[i] - 1, top + i, H[i] * 2 + 2, 1, ol);
      prect(x + dx(15) - 9, top + 16, 18, 1, ol);
      for (let i = 0; i < 16; i++) prect(x + dx(i) - H[i], top + i, H[i] * 2, 1, i === 15 ? C.lt : i === 11 ? C.mid : fill); // body, waist band, lip
      prect(x + dx(6) - 3, top + 6, 2, 2, eyeCol(e, al)); prect(x + dx(6) + 1, top + 6, 2, 2, eyeCol(e, al));
      pc(x + dx(15) - sw * 0.8, top + 17, 1, al && ((G.t * 16) | 0) % 2 ? C.red : C.ink); // clapper
    }
  },
  arcdrone: {
    name: 'ARC DRONE', zh: '电弧机', r: 5, hp: 22, spd: 50, mass: 0.9, cost: 2, group: 2, flying: true,
    tip: { en: 'Pairs share an arc; never cross it while it glows red.', zh: '两机间有电弧，亮红时别穿过。' },
    ai(e, dt) { // two drones flank you on opposite sides; the leader cycles their arc slack -> tense (red, the tell) -> live (hurts). Alone, it shoots sparks
      let m = e.mate;
      if (m && (m.dead || m.mate !== e)) { m = e.mate = null; if (e.lead && e.tl) { e.tl.dead = true; e.tl = null; } e.lead = false; }
      if (!m && (e.find = (e.find || 0) - dt) <= 0) {
        e.find = 0.4; let bd = 240 * 240;
        for (const o of G.enemies) if (o !== e && o.type === 'arcdrone' && !o.dead && !o.mate && !(o.spawnT > 0)) { const q = d2(o.x, o.y, e.x, e.y); if (q < bd) { bd = q; m = o; } }
        if (m) {
          if (e.tl) e.tl.dead = true; if (m.tl) m.tl.dead = true; e.st = m.st = 'move';
          e.mate = m; m.mate = e; e.lead = true; m.lead = false; e.ph = 'slack'; e.pt = 1.0; e.oa = angTo(P, e); e.tl = tele({ o: e, life: 1e9, d: this.arc });
        }
      }
      if (m) {
        const L = e.lead ? e : m, s = e.lead ? 1 : -1, live = L.ph === 'live';
        if (e.lead) L.oa += dt * 0.55 * L.strafe * (live ? 0.25 : 1); // the pair turns slowly around you; barely at all while the arc is live
        const R = 52 + Math.sin(L.anim * 0.8) * 10, tx = P.x + Math.cos(L.oa || 0) * R * s, ty = P.y + Math.sin(L.oa || 0) * R * s, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        if (d > 2) { const v = Math.min(d, this.spd * (live ? 0.45 : 1) * dt); e.x += dx / d * v; e.y += dy / d * v; clampRoom(e); }
        e.face = P.x > e.x ? 1 : -1;
        if (e.lead) this.cycle(e, m, dt);
        return;
      }
      const dd = dist(e, P);
      if (e.st === 'aim') { e.t -= dt; if (e.t > 0.15) e.la = angTo(e, P); e.tl.x = e.x; e.tl.y = e.y - 7; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.45); if (e.t <= 0) { e.tl.dead = true; e.st = 'move'; e.cd = rand(1.4, 1.9); eShot(e.x, e.y - 7, e.la, 125, { r: 2.5 }); AU.zap(); } return; }
      const a = dd > 120 ? angTo(e, P) : dd < 70 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe;
      e.x += Math.cos(a) * this.spd * dt; e.y += Math.sin(a) * this.spd * dt; clampRoom(e); e.face = P.x > e.x ? 1 : -1;
      e.cd -= dt; if (e.cd <= 0 && dd < 210) { e.st = 'aim'; e.t = 0.45; e.la = angTo(e, P); e.tl = tele({ k: 'line', x: e.x, y: e.y - 7, a: e.la, len: 60, life: 99 }); }
    },
    cycle(e, m, dt) {
      const far = d2(e.x, e.y, m.x, m.y) > 160 * 160;
      if (m.frozen > 0 || m.stunT > 0 || m.spawnT > 0) { e.ph = 'slack'; e.pt = Math.max(e.pt, 0.6); return; } // a disabled partner drops the arc
      if ((e.pt -= dt) <= 0) {
        if (e.ph === 'slack') { if (far) e.pt = 0.3; else { e.ph = 'tense'; e.pt = 0.6; AU.tele(); } }
        else if (e.ph === 'tense') { e.ph = 'live'; e.pt = 1.1; AU.zap(); }
        else { e.ph = 'slack'; e.pt = rand(1.3, 1.8) - G.floor * 0.1; }
      }
      if (e.ph !== 'live') return;
      if (far) { e.ph = 'slack'; e.pt = 0.8; return; }
      const ax = e.x, ay = e.y - 7, dx = m.x - ax, dy = m.y - 7 - ay, k = clamp(((P.x - ax) * dx + (P.y - 4 - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1), px = ax + dx * k, py = ay + dy * k; // the arc hangs at drone height: test it against your chest
      if (d2(px, py, P.x, P.y - 4) < (3 + P.hurtR) ** 2) hurtPlayer(1, px, py);
      if (Math.random() < dt * 12) { const u = Math.random(); sparks(ax + dx * u, ay + dy * u, rand(TAU), 1, C.cyan, 60, 3); }
    },
    arc(t) { // drawn by the leader's telegraph: dotted when slack, blinking red when tense, a jagged red-white arc when live
      const a = t.o, b = a.mate; if (!b || a.dead || b.dead) return;
      const ph = a.frozen > 0 || a.stunT > 0 ? 'slack' : a.ph, ya = a.y - 7 + Math.sin(a.anim * 3 + a.seed) * 1.5, yb = b.y - 7 + Math.sin(b.anim * 3 + b.seed) * 1.5;
      if (ph === 'slack') { pline(a.x, ya, b.x, yb, C.mid, 1, 2, G.t * 8); return; }
      if (ph === 'tense') { pline(a.x, ya, b.x, yb, ((G.t * 16) | 0) % 2 ? C.red : C.white, 1, 3, -G.t * 30); return; }
      let px = a.x, py = ya;
      for (let s = 1; s <= 6; s++) { const nx = lerp(a.x, b.x, s / 6) + (s < 6 ? rand(-3, 3) : 0), ny = lerp(ya, yb, s / 6) + (s < 6 ? rand(-3, 3) : 0); pline(px, py, nx, ny, C.red, 3); pline(px, py, nx, ny, C.white, 1); px = nx; py = ny; }
    },
    draw(e) {
      const x = Math.round(e.x), y = Math.round(e.y - 7 + Math.sin(e.anim * 3 + e.seed) * 1.5), L = e.mate ? (e.lead ? e : e.mate) : null, hot = (L && L.ph !== 'slack') || e.st === 'aim';
      shadow(e.x, e.y + e.r, 3);
      const sp = ((G.t * 30) | 0) % 2; prect(x - 6 + sp, y - 7, 5, 1, C.lt); prect(x + 1 - sp, y - 7, 5, 1, C.lt); prect(x, y - 6, 1, 2, C.mid); // rotor blur
      for (const s of [-1, 1]) { prect(s < 0 ? x - 8 : x + 6, y - 2, 3, 5, eline(e)); prect(s < 0 ? x - 7 : x + 7, y - 1, 1, 3, hot ? C.red : C.cyan); } // coil prongs
      if (e.elite) pc(x, y, 6, C.gold);
      pc(x, y, 5, e.elite ? C.ink : eline(e)); pc(x, y, 4, efill(e, C.dk)); prect(x - 3, y + 1, 7, 1, C.ink); // round hull with a seam
      pc(x, y - 1, 2, C.ink); prect(x - 1 + (e.face > 0 ? 1 : 0), y - 2, 1, 1, e.flash > 0 ? C.ink : hot ? C.red : C.cyan); // lens eye
    }
  },
  sawblade: {
    name: 'SAWBLADE', zh: '锯轮', r: 6, hp: 36, spd: 135, mass: 2, cost: 2, contact: true,
    tip: { en: 'Ricochets off walls along its red line; step off the path.', zh: '沿红线撞墙反弹，离开路径。' },
    ai(e, dt) { // revs up while a red line shows its path and first bounce, then rolls and ricochets 3 times (elite 4); touching it always hurts
      if (e.st === 'move') { e.spin = (e.spin || 0) + dt * 3; e.cd -= dt; if (e.cd <= 0) { e.st = 'aim'; e.t = 0.65; e.la = angTo(e, P); e.n = 0; this.path(e); e.tl = tele({ o: e, life: 99, d: this.lane }); AU.tele(); } return; }
      if (e.st === 'aim') {
        e.t -= dt; if (e.t > 0.2) e.la = angTo(e, P); this.path(e); teleK(e.tl, 1 - e.t / 0.65); e.spin += dt * (6 + 30 * (1 - e.t / 0.65)); e.sq = Math.sin(G.t * 60) * 0.1;
        if (e.t <= 0) { e.st = 'roll'; e.t = 4; const s = this.spd + G.floor * 10; e.vx = Math.cos(e.la) * s; e.vy = Math.sin(e.la) * s; teleK(e.tl, 0.5); AU.dash(); }
        return;
      }
      if (e.st === 'roll') {
        e.t -= dt; e.spin += dt * 34; const h = moveBody(e, e.vx * dt, e.vy * dt);
        if (Math.random() < 0.5) sparks(e.x, e.y + e.r - 1, Math.atan2(-e.vy, -e.vx), 1, C.lt, 90, 0.6);
        if (h) { if (h.hx) e.vx = -e.vx; if (h.hy) e.vy = -e.vy; e.n++; AU.tink(); sparks(e.x, e.y - 4, Math.atan2(e.vy, e.vx), 6, C.white, 140); shake(0.03); }
        e.la = Math.atan2(e.vy, e.vx); if (Math.abs(e.vx) > 1) e.face = e.vx > 0 ? 1 : -1; this.path(e);
        if (e.n >= (e.elite ? 4 : 3) || e.t <= 0) { e.tl.dead = true; e.st = 'rest'; e.t = 0.8; e.sq = 0.5; }
        return;
      }
      e.t -= dt; e.spin = (e.spin || 0) + dt * 2; if (e.t <= 0) { e.st = 'move'; e.cd = rand(0.3, 0.6); }
    },
    path(e) { // e.pts = [x0,y0, x1,y1, x2,y2]: from here to the next wall and on to the one after, with the same collision as moveBody
      const q = e.pts || (e.pts = [0, 0, 0, 0, 0, 0]); let x = e.x, y = e.y, vx = Math.cos(e.la) * 3, vy = Math.sin(e.la) * 3;
      q[0] = x; q[1] = y;
      for (let s = 1; s <= 2; s++) {
        for (let n = 0; n < 140 && !hitsWall(x + vx, y + vy, e.r); n++) { x += vx; y += vy; }
        q[s * 2] = x; q[s * 2 + 1] = y;
        const bx = hitsWall(x + vx, y, e.r), by = hitsWall(x, y + vy, e.r); if (bx || !by) vx = -vx; if (by || !bx) vy = -vy;
      }
    },
    lane(t, k, bl) { const q = t.o.pts; if (!q) return; const c = k > 0.7 && bl ? C.white : C.red; pline(q[0], q[1], q[2], q[3], c, 2, 4, -G.t * 30); pline(q[2], q[3], q[4], q[5], C.red, 1, 3, -G.t * 30); },
    draw(e) {
      const x = Math.round(e.x), y = Math.round(e.y - 4 + (e.sq || 0) * 2), al = e.st === 'aim', R = 6, sp = e.spin || 0, ol = eline(e);
      shadow(e.x, e.y + e.r, e.r + 1);
      if (e.elite) pc(x, y, R + 3, C.gold);
      for (let i = 0; i < 8; i++) { const a = sp + i * TAU / 8; prect(x + Math.cos(a) * (R + 1) - 1, y + Math.sin(a) * (R + 1) - 1, 3, 3, e.elite ? C.ink : ol); } // tooth outlines
      pc(x, y, R + 1, e.elite ? C.ink : ol); pc(x, y, R, efill(e, C.dk));
      for (let i = 0; i < 8; i++) { const a = sp + i * TAU / 8; prect(x + Math.cos(a) * (R + 1), y + Math.sin(a) * (R + 1), 1, 1, C.lt); } // teeth
      pline(x - Math.cos(sp) * 4, y - Math.sin(sp) * 4, x + Math.cos(sp) * 4, y + Math.sin(sp) * 4, C.mid, 1); // spoke shows the spin
      pc(x, y, 2, C.ink); prect(x - 1, y - 1, 2, 2, eyeCol(e, al && ((G.t * 16) | 0) % 2));
    }
  },
  /* ---------- VOID ---------- */
  smudge: {
    name: 'STALKER', zh: '潜影者', r: 6, hp: 30, spd: 40, mass: 1.2, cost: 2,
    tip: { en: 'Nearly invisible; when red eyes appear, sidestep its lunge.', zh: '几乎隐形，红眼出现就侧闪。' },
    ai(e, dt) { // a faint shadow that creeps after you; up close it fades in (red eyes + lane tell), lunges, stays visible, then fades again
      const dd = dist(e, P);
      if (e.st === 'move') {
        const want = dd < 40 ? 0.45 : 0.1; e.alpha += clamp(want - e.alpha, -dt * 2, dt * 2); e.cd -= dt; // never fully gone right next to you
        walk(e, navAngle(e, P) + Math.sin(e.anim * 2 + e.seed) * 0.5, this.spd, dt);
        if (Math.random() < dt * 2.5) decalDot(e.x + rand(-3, 3), e.y + e.r - 1, 2, 'rgba(18,18,22,0.14)'); // leaves faint dark prints behind
        if (e.cd <= 0 && dd < 72 && los(e.x, e.y, P.x, P.y, true)) { e.st = 'reveal'; e.t = 0.5; e.la = angTo(e, P); e.tl = tele({ k: 'line', x: e.x, y: e.y, a: e.la, w: e.r * 2, len: Math.max(1, rayWall(e.x, e.y, e.la, 90)), life: 99 }); AU.tele(); }
      } else if (e.st === 'reveal') {
        e.t -= dt; e.alpha = Math.min(1, e.alpha + dt * 4); e.sq = -0.35; if (e.t > 0.18) e.la = angTo(e, P); e.face = Math.cos(e.la) > 0 ? 1 : -1;
        e.tl.x = e.x; e.tl.y = e.y; e.tl.a = e.la; e.tl.len = Math.max(1, rayWall(e.x, e.y, e.la, 90)); teleK(e.tl, 1 - e.t / 0.5);
        if (e.t <= 0) { e.tl.dead = true; e.st = 'lunge'; e.t = 0.3; e.alpha = 1; e.sq = 0.6; AU.dash(); }
      } else if (e.st === 'lunge') { // only the lunge hurts: touching the lurking shadow is safe
        const h = moveBody(e, Math.cos(e.la) * 290 * dt, Math.sin(e.la) * 290 * dt); e.t -= dt;
        if (Math.random() < 0.7) part(e.x, e.y + 2, rand(-15, 15), rand(-15, 5), 0.4, C.ink2, 2);
        if (d2(e.x, e.y, P.x, P.y) < (e.r + P.hurtR + 1) ** 2) hurtPlayer(1, e.x, e.y);
        if (h || e.t <= 0) { e.st = 'rest'; e.t = 0.9; }
      } else { e.t -= dt; if (e.t <= 0) { e.st = 'move'; e.cd = rand(1.2, 1.8); } }
    },
    draw(e) {
      ctx.globalAlpha = e.flash > 0 || e.frozen > 0 ? 1 : e.alpha;
      shadow(e.x, e.y + e.r, e.r);
      const al = e.st === 'reveal' || e.st === 'lunge', f = e.face, ink = e.flash > 0 ? C.white : C.ink2;
      pc(e.x - f * 8, e.y + 2, 3, ink); pc(e.x - f * 12, e.y + 3, 2, ink); // the shadow it trails
      const b = body(e, 13, 9, C.ink2), R = (dx, y, w, h, c) => prect(f > 0 ? b.x + b.w - dx - w : b.x + dx, y, w, h, c); // dx = pixels back from its face
      for (let i = 0; i < 3; i++) R(6 + i * 2, b.y - 1 - (i === 1 ? 1 : 0), 1, 1 + (i === 1 ? 1 : 0), ink); // hunched spine
      R(-2, b.y + 5, 4, 2, ink); R(-3, b.y + 5, 1, 1, C.lt); R(-3, b.y + 7, 1, 1, C.lt); R(-2, b.y + 7, 1, 1, C.lt); // long arm, hooked claws
      prect(b.x + 2, b.y + b.h, 2, 1, ink); prect(b.x + b.w - 4, b.y + b.h, 2, 1, ink); // crouched feet
      const eh = al ? 2 : 1; R(2, b.y + 3, 2, eh, eyeCol(e, al)); R(5, b.y + 3, 2, eh, eyeCol(e, al));
      ctx.globalAlpha = 1;
    }
  },
  sketch: {
    name: 'REVENANT', zh: '复生者', r: 6, hp: 28, spd: 38, mass: 1.1, cost: 2,
    tip: { en: 'Rises again once; stomp its bone pile before it stands.', zh: '倒下会复活，抢先踩碎骨堆。' },
    ai(e, dt) { // keeps mid range and looses three parallel bolts at you; its first death leaves a bone pile that rises again unless you walk over it
      e.cd -= dt; const dd = dist(e, P), see = los(e.x, e.y, P.x, P.y, false);
      if (e.st === 'aim') {
        e.t -= dt; if (e.t > 0.2) e.la = angTo(e, P); e.face = Math.cos(e.la) > 0 ? 1 : -1;
        e.tl.x = e.x; e.tl.y = e.y - 4; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.55);
        if (e.t <= 0) {
          e.tl.dead = true; e.st = 'move'; e.cd = rand(1.8, 2.4) - G.floor * 0.15; const px = -Math.sin(e.la), py = Math.cos(e.la);
          for (let i = -1; i <= 1; i++) eShot(e.x + px * i * 6, e.y - 4 + py * i * 6, e.la, 105 + G.floor * 10, { r: 2.5 });
          AU.eshot();
        }
        return;
      }
      if (Math.random() < dt * 0.4) e.strafe = -e.strafe;
      walk(e, (!see || dd > 150) ? navAngle(e, P) : dd < 80 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe, this.spd * (e.redrawn ? 1.25 : 1), dt); e.face = P.x > e.x ? 1 : -1;
      if (see && dd < 210 && e.cd <= 0) {
        e.st = 'aim'; e.t = 0.55; e.la = angTo(e, P);
        e.tl = tele({ x: e.x, y: e.y - 4, a: e.la, life: 99, d: (t, k, bl) => { const px = -Math.sin(t.a), py = Math.cos(t.a), l = 10 + 30 * k, c = k > 0.7 && bl ? C.white : C.red; for (let i = -1; i <= 1; i++) { const ox = t.x + px * i * 6, oy = t.y + py * i * 6; pline(ox, oy, ox + Math.cos(t.a) * l, oy + Math.sin(t.a) * l, c, 1, 3, -G.t * 30); } } });
      }
    },
    onDie(e) { // felled, not gone: the risen copy waits 1.8s inside its spawn delay (so the room stays open); stepping on the bones ends it for good
      if (e.redrawn) return;
      const x = e.x, y = e.y, s = spawnEnemy('sketch', x, y, false, 1.8), sp = G.tele[G.tele.length - 1]; s.redrawn = true; s.hp = s.maxHp = Math.round(e.maxHp * 0.5);
      G.fx.push({ k: 'bones', x: s.x, y: s.y, t: 0, life: 2, s, sp,
        u: f => {
          if (f.s.dead || !(f.s.spawnT > 0)) { f.dead = true; return; }
          if (f.t > 0.3 && d2(f.x, f.y, P.x, P.y) < 13 * 13) { f.s.dead = true; if (f.sp) f.sp.dead = true; f.dead = true; AU.crate(); burst(f.x, f.y - 2, 12, C.paper, 110, 0.4); ringFx(f.x, f.y, 2, 16, 0.25, C.white, 1); }
        },
        d: f => { // its bones drift back together inside a cursed glow; the dashed ring is where to step
          const k = clamp(1 - f.s.spawnT / 1.8, 0, 1);
          pellipse(f.x, f.y + 1, 13, 6, ((G.t * 8) | 0) % 2 ? C.white : C.mid, 2, G.t * 2); pring(f.x, f.y - 3, 2 + 5 * k, C.violet, 1);
          for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + k * 3, rr = 3 + 9 * (1 - k); prect(f.x + Math.cos(a) * rr - 1, f.y - 1 + Math.sin(a) * rr * 0.5, 2, 1, C.paper); }
        } });
    },
    draw(e) {
      const jit = e.redrawn && ((G.t * 12 + e.seed) | 0) % 3 === 0 ? 1 : 0; // the risen one is fainter and shimmers
      if (e.redrawn && e.flash <= 0) ctx.globalAlpha = 0.6;
      shadow(e.x, e.y + e.r, e.r);
      const al = e.st === 'aim', f = e.face, b = body({ ...e, x: e.x + jit }, 10, 12, C.ink2), hm = e.flash > 0 ? C.white : C.dk;
      prect(b.x + 1, b.y - 2, 1, 2, C.mid); prect(b.x + b.w - 2, b.y - 2, 1, 2, C.mid); // helm horns
      prect(b.x + 1, b.y, b.w - 2, 5, hm); const ox = f > 0 ? 1 : 0; prect(b.x + 2, b.y + 2, b.w - 4, 2, C.ink); // helm + visor slit
      prect(b.x + 2 + ox, b.y + 2, 2, 2, eyeCol(e, al)); prect(b.x + 5 + ox, b.y + 2, 2, 2, eyeCol(e, al));
      for (let i = 0; i < 2; i++) prect(b.x + 3, b.y + 6 + i * 2, b.w - 6, 1, C.dk); // ribs through the rusted mail
      for (let i = 0; i < 3; i++) prect(b.x + 1 + i * 3, b.y + b.h, 2, 1 + (((e.anim * 6) | 0) + i) % 2, e.flash > 0 ? C.white : C.ink2); // torn tabard
      const a = al ? e.la : angTo(e, P), cx = e.x + jit + f * 2, cy = e.y - 3, px = -Math.sin(a), py = Math.cos(a), qx = cx + Math.cos(a) * 5, qy = cy + Math.sin(a) * 5; // bone crossbow
      pline(cx, cy, qx, qy, C.mid, 1); pline(qx - px * 3, qy - py * 3, qx + px * 3, qy + py * 3, C.lt, 1);
      if (e.redrawn) for (let i = 0; i < 2; i++) prect(e.x + Math.sin(G.t * 5 + e.seed + i * 3) * 6, b.y + b.h - ((G.t * 9 + i * 5 + e.seed) % 14), 1, 1, C.violet); // cursed motes
      ctx.globalAlpha = 1;
    }
  },
  lens: {
    name: 'VOID LENS', zh: '虚空透镜', r: 7, hp: 44, spd: 30, mass: 1.6, cost: 3, flying: true,
    tip: { en: 'Bends your shots away; close in to hit it, but dodge its pulse.', zh: '扭曲你的子弹，贴近打并躲开脉冲。' },
    ai(e, dt) { // your bullets curve away within 44px of it (point-blank shots and melee still land); up close it pulses (red circle), from range it fans slow orbs
      const dd = dist(e, P), cy = e.y - 7;
      for (const b of G.bullets) { // bends around its hitbox (e.y), which sits below the floating lens
        if (b.team !== 'p' || b.dead || b.kind === 'chak') continue;
        const dx = b.x - e.x, dy = b.y - e.y, q = dx * dx + dy * dy; if (q > 44 * 44 || q < 1) continue;
        const sp = Math.hypot(b.vx, b.vy); if (sp < 1) continue;
        const a = Math.atan2(b.vy, b.vx) + (b.vx * dy - b.vy * dx > 0 ? 1 : -1) * 7 * (1 - Math.sqrt(q) / 44) * dt; // turn away from the side the lens is on
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      }
      if (e.st === 'pulse') {
        e.t -= dt; teleK(e.tl, 1 - e.t / 0.7); e.tl.x = e.x; e.tl.y = e.y;
        if (e.t <= 0) { e.tl.dead = true; e.st = 'move'; e.cd = rand(1.8, 2.3) - G.floor * 0.1; if (d2(e.x, e.y, P.x, P.y) < (40 + P.hurtR) ** 2) hurtPlayer(1, e.x, e.y); ringFx(e.x, e.y, 6, 44, 0.3, C.violet, 2); burst(e.x, cy, 12, C.violet, 120, 0.35); AU.boom(0.6); }
        return;
      }
      if (e.st === 'aim') {
        e.t -= dt; if (e.t > 0.15) e.la = angTo(e, P); e.tl.x = e.x; e.tl.y = cy; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.5);
        if (e.t <= 0) { e.tl.dead = true; e.st = 'move'; e.cd = rand(2.2, 2.8) - G.floor * 0.1; for (let k = -1; k <= 1; k++) eShot(e.x, cy, e.la + k * 0.3, 70, { r: 3.5 }); AU.eshot(); }
        return;
      }
      if (Math.random() < dt * 0.3) e.strafe = -e.strafe;
      const a = dd > 90 ? angTo(e, P) : dd < 50 ? angTo(P, e) : angTo(e, P) + Math.PI / 2 * e.strafe;
      e.x += Math.cos(a) * this.spd * dt; e.y += Math.sin(a) * this.spd * dt; clampRoom(e); e.face = P.x > e.x ? 1 : -1;
      e.cd -= dt; if (e.cd > 0) return;
      if (dd < 50) { e.st = 'pulse'; e.t = 0.7; e.tl = tele({ k: 'circle', x: e.x, y: e.y, r: 40, life: 99 }); AU.tele(); }
      else if (dd < 220) { e.st = 'aim'; e.t = 0.5; e.la = angTo(e, P); e.tl = EDEF.eel.fan(e); e.tl.y = cy; }
    },
    draw(e) {
      const x = Math.round(e.x), y = Math.round(e.y - 7 + Math.sin(e.anim * 2 + e.seed) * 2), pu = e.st === 'pulse', k = pu ? clamp(1 - e.t / 0.7, 0, 1) : 0;
      shadow(e.x, e.y + e.r, 5);
      const s = G.t * 0.8 + e.seed; for (let i = 0; i < 4; i++) parc(e.x, e.y, 44, s + i * TAU / 4, s + i * TAU / 4 + 0.5, C.dk, 1); // the warp field around its hitbox, slowly turning
      for (let i = 0; i < 3; i++) { const a = -G.t * 2 + i * TAU / 3 + e.seed; prect(x + Math.cos(a) * 11 - 1, y + Math.sin(a) * 6, 2, 2, C.lt); } // orbiting shards
      if (e.elite) pc(x, y, 9, C.gold);
      pc(x, y, 8, e.elite ? C.ink : eline(e)); pc(x, y, 7, efill(e, C.ink2)); pring(x, y, 5, C.violet, 1); // a thick rim around a hole in the world
      pc(x, y, 3 + Math.round(k * 2), pu && ((G.t * 16) | 0) % 2 ? C.red : C.void); if (e.flash <= 0) prect(x - 2, y - 3, 1, 1, C.white);
    }
  },
  echo: {
    name: 'ECHO', zh: '残响', r: 6, hp: 30, spd: 72, mass: 1, cost: 2, flying: true,
    tip: { en: 'Mirrors you across the room; walk toward the center to reach it.', zh: '镜像你的走位，走向中心逼近它。' },
    ai(e, dt) { // always flies to your mirror image through the room's center, and fires 3-shot bursts back at you (red lane tell)
      const A = arena(), tx = clamp(A.x0 + A.x1 - P.x, A.x0 + e.r, A.x1 - e.r), ty = clamp(A.y0 + A.y1 - P.y, A.y0 + e.r, A.y1 - e.r), dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      if (d > 1) { const v = Math.min(d, this.spd * (e.st === 'move' ? 1 : 0.6) * dt); e.x += dx / d * v; e.y += dy / d * v; }
      e.face = P.x > e.x ? 1 : -1; e.cd -= dt;
      if (e.st === 'aim') { e.t -= dt; if (e.t > 0.15) e.la = angTo(e, P); e.tl.x = e.x; e.tl.y = e.y - 6; e.tl.a = e.la; teleK(e.tl, 1 - e.t / 0.55); if (e.t <= 0) { e.tl.dead = true; e.st = 'fire'; e.n = 3; e.t = 0; } return; }
      if (e.st === 'fire') { e.t -= dt; if (e.t <= 0) { e.t = 0.09; eShot(e.x, e.y - 6, e.la, 125 + G.floor * 5, { r: 2.5 }); AU.eshot(); if (--e.n <= 0) { e.st = 'move'; e.cd = rand(1.9, 2.5); } } return; }
      if (e.cd <= 0 && dist(e, P) > 44) { e.st = 'aim'; e.t = 0.55; e.la = angTo(e, P); e.tl = tele({ k: 'line', x: e.x, y: e.y - 6, a: e.la, life: 99 }); AU.tele(); }
    },
    draw(e) {
      const A = arena(), cx = (A.x0 + A.x1) / 2, cy = (A.y0 + A.y1) / 2, al = e.st === 'aim' || e.st === 'fire', f = e.face;
      pline(e.x, e.y, cx, cy, C.dk, 1, 2, G.t * 6); prect(cx - 1, cy - 2, 2, 4, C.dk); prect(cx - 2, cy - 1, 4, 2, C.dk); // a faint thread to the mirror point at the room's center
      shadow(e.x, e.y + e.r, e.r);
      const jit = ((G.t * 10 + e.seed) | 0) % 5 === 0 ? 1 : 0, x = Math.round(e.x) + jit, top = Math.round(e.y + e.r - 15), ol = e.flash > 0 ? C.white : C.ink, fill = e.flash > 0 ? C.ink : e.frozen > 0 ? '#bfe6ff' : e.fren ? C.redDk : C.white; // the hero's colours inverted
      if (e.elite) { rrect(x - 5, top - 2, 10, 9, C.gold); rrect(x - 6, top + 4, 12, 12, C.gold); }
      rrect(x - 4, top - 1, 8, 7, ol); rrect(x - 5, top + 5, 10, 10, ol); rrect(x - 3, top, 6, 5, fill); rrect(x - 4, top + 6, 8, 8, fill); // blank-masked head on a hooded body
      prect(x - 4, top + 14, 3, 2, ol); prect(x + 1, top + 14, 3, 2, ol); // feet
      if (e.flash <= 0) { pline(x - 2, top + 7, x, top + 10, C.lt, 1); pline(x, top + 10, x - 1, top + 13, C.lt, 1); prect(x + 1, top + 1, 1, 2, C.lt); } // mirror cracks
      const o = f > 0 ? 1 : 0; prect(x - 2 + o, top + 2, 1, 2, al ? C.red : C.ink); prect(x + o, top + 2, 1, 2, al ? C.red : C.ink);
      const a = al ? e.la : angTo(e, P), hx = x + f * 4, hy = top + 9; pline(hx, hy, hx + Math.cos(a) * 6, hy + Math.sin(a) * 6, ol, 2); prect(hx + Math.cos(a) * 6, hy + Math.sin(a) * 6, 1, 1, al ? C.red : C.lt); // a mirror shard held out at you
    }
  },
  dummy: {
    name: 'TRAINING DUMMY', zh: '训练假人', r: 7, hp: 999, spd: 0, mass: 99, cost: 0, anchored: true,
    tip: { en: 'A practice target. Hit it all you like.', zh: '练习靶，随便打。' },
    ai() { },
    draw(e) {
      shadow(e.x, e.y + e.r, e.r);
      const j = e.flash > 0 ? randi(-1, 1) : 0;
      prect(e.x - 1 + j, e.y - 4, 2, 11, C.dk); prect(e.x - 6 + j, e.y - 1, 12, 2, C.dk); prect(e.x - 7 + j, e.y - 1, 1, 2, C.lt); prect(e.x + 6 + j, e.y - 1, 1, 2, C.lt); // post, crossbar arms, straw
      rrect(e.x - 6 + j, e.y - 12, 12, 10, e.flash > 0 ? C.white : '#e9e8e1'); rrect(e.x - 5 + j, e.y - 11, 10, 8, e.flash > 0 ? C.ink : '#bdbcb5');
      pring(e.x + j, e.y - 7, 3, C.red); prect(e.x + j, e.y - 7, 1, 1, C.red);
    }
  },
};
function clampRoom(e) { const A = arena(); e.x = clamp(e.x, A.x0 + e.r, A.x1 - e.r); e.y = clamp(e.y, A.y0 + e.r, A.y1 - e.r); }
/* ---------- elite affixes: every elite gets one random affix that fits its kind (mkEnemy); upd runs after its ai, onDie after its own ---------- */
const AFFIX = {
  swift: { name: 'SWIFT', zh: '迅捷', desc: 'Moves 50% faster and attacks sooner.', zhDesc: '移速提升 50%，出手更频繁。', col: C.frost,
    ok: D => !D.anchored, ap(e) { e.D.spd = e.D.spd * 1.5; },
    upd(e, dt) { e.cd -= dt * 0.4; if ((e.mv || e.D.flying) && Math.random() < dt * 12) part(e.x - e.face * e.r, e.y - rand(1, e.r * 1.6), -e.face * 50, 0, 0.18, C.frost, 1); } },
  armored: { name: 'ARMORED', zh: '护甲', desc: 'A ward soaks damage and re-forms 4s after it breaks.', zhDesc: '护盾吸收伤害，破碎 4 秒后重新生成。', col: C.gold,
    ap(e) { e.armMax = Math.round(e.maxHp * 0.3); e.bubble = e.bubbleMax = e.armMax; e.armT = 0; },
    upd(e, dt) { if (e.bubble > 0) { e.armT = 0; return; } if ((e.armT += dt) >= 4) { e.bubble = e.bubbleMax = e.armMax; AU.tink(); ringFx(e.x, e.y - e.r, e.r * 3, e.r + 4, 0.3, C.gold, 1); } } },
  splitting: { name: 'SPLITTING', zh: '分裂', desc: 'Splits into two weaker copies on death.', zhDesc: '死亡时分裂为两个较弱的分身。', col: C.white,
    ok: D => !D.anchored && D !== EDEF.golem && D !== EDEF.spore && D !== EDEF.sketch && D !== EDEF.mimic,
    onDie(e) { for (const s of [-1, 1]) { const p = freeSpot(e.x + s * 8, e.y, EDEF[e.type].r, 12) || e, c = spawnEnemy(e.type, p.x, p.y, false, 0.35); c.hp = c.maxHp = Math.round(c.maxHp * 0.45); } } },
  volatile: { name: 'VOLATILE', zh: '爆裂', desc: 'Explodes 0.8s after death. Keep clear.', zhDesc: '死亡 0.8 秒后爆炸，注意远离。', col: C.fire,
    ok: D => D !== EDEF.bomber,
    onDie(e) { const x = e.x, y = e.y; tele({ k: 'circle', x, y, r: 34, life: 0.8 }); AU.tele(); later(0.8, () => worldBlast(x, y, 34, 14, true)); } },
  frenzied: { name: 'FRENZIED', zh: '狂怒', desc: 'Below half HP it turns red and attacks twice as fast.', zhDesc: '生命低于一半时变红，攻击速度翻倍。', col: C.red,
    upd(e, dt) {
      if (!e.fren && e.hp < e.maxHp * 0.5) { e.fren = true; e.D.spd = e.D.spd * 1.25; burst(e.x, e.y - e.r, 10, C.red, 90, 0.4); AU.tele(); }
      if (e.fren) { e.cd -= dt; if (Math.random() < dt * 8) part(e.x + rand(-e.r, e.r), e.y - rand(0, e.r * 1.6), 0, rand(-30, -14), 0.4, C.red, 1, { drag: 0.95 }); }
    } },
  warping: { name: 'WARPING', zh: '闪现', desc: 'Blinks a short distance away when hit.', zhDesc: '受击时闪现到附近。', col: C.cyan,
    ok: D => !D.anchored,
    upd(e, dt) {
      e.wcd = (e.wcd || 0) - dt;
      if (e.hp < (e.whp ?? e.hp) && e.wcd <= 0) for (let k = 0; k < 10; k++) { // never lands within 44px of you
        const a = rand(TAU), d = rand(40, 64), s = freeSpot(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, e.r, 8);
        if (!s || d2(s.x, s.y, P.x, P.y) < 44 * 44) continue;
        ringFx(e.x, e.y - e.r, e.r * 2, 1, 0.2, C.cyan, 1); burst(e.x, e.y - e.r, 8, C.ink, 60, 0.3);
        e.x = s.x; e.y = s.y; e.kx = e.ky = 0; e.wcd = 2.2; ringFx(e.x, e.y - e.r, 1, e.r * 2.5, 0.25, C.cyan, 1); pSnd('warp', 0.1, () => AU.tone('sine', 900, 1800, 0.12, 0.04));
        break;
      }
      e.whp = e.hp;
    } },
  summoner: { name: 'SUMMONER', zh: '召唤', desc: 'Keeps calling slimes to its side.', zhDesc: '不断召来史莱姆助战。', col: C.lt,
    upd(e, dt) {
      if ((e.sumT = (e.sumT ?? 2.5) - dt) > 0) return;
      e.sumT = 5.5; e.minions = (e.minions || []).filter(m => !m.dead);
      if (e.minions.length >= 2 || G.enemies.length >= 14) return;
      const a = rand(TAU), s = freeSpot(e.x + Math.cos(a) * 16, e.y + Math.sin(a) * 12, 5, 16);
      if (s) { e.minions.push(spawnEnemy('inkling', s.x, s.y, false, 0.8)); ringFx(e.x, e.y - e.r, 2, 16, 0.3, C.lt, 1); }
    } },
  haunting: { name: 'HAUNTING', zh: '怨魂', desc: 'Looses a slow homing soul orb every few seconds.', zhDesc: '每隔几秒放出一颗缓慢追踪的灵魂球。', col: C.violet,
    upd(e, dt) { // the orb gathers over its head for 0.6s first (statusFx draws it)
      e.hauT = (e.hauT ?? rand(2, 3.5)) - dt;
      if (!e.hauW && e.hauT > 0 && e.hauT <= 0.6 && dist(e, P) < 260) e.hauW = true;
      if (e.hauT <= 0) { e.hauT = 4.2; if (e.hauW) { e.hauW = false; eShot(e.x, e.y - e.r * 2 - 5, angTo(e, P), 42, { r: 3.5, turn: 1.1, life: 5.5, col: C.violet }); AU.eshot(); } }
    } },
};
function mkEnemy(type, x, y, elite) {
  const D = EDEF[type];
  const e = { type, D, x, y, r: D.r + (elite ? 1 : 0), hp: D.hp * (0.85 + 0.25 * (G.depth || 0)) * (elite ? 2.6 : 1) * G.diff.ehp, mass: D.mass * (elite ? 1.6 : 1), kx: 0, ky: 0,
    st: 'move', t: 0, cd: rand(0.6, 1.6), flash: 0, sq: 0, face: 1, elite, burn: 0, burnD: 0, burnTick: 0, chill: 0, chillT: 0, frozen: 0,
    anim: rand(10), seed: rand(10), strafe: Math.random() < 0.5 ? -1 : 1, alpha: 1, anchored: D.anchored, pat: 0, la: 0 };
  if (type === 'shield') e.shieldA = 0;
  e.maxHp = e.hp;
  if (elite) { // the elite gets its own def object so an affix can tune spd or chain onDie (kill() calls e.D.onDie) without touching EDEF
    const A = AFFIX[e.affix = pick(Object.keys(AFFIX).filter(k => !AFFIX[k].ok || AFFIX[k].ok(D)))];
    e.D = Object.create(D);
    if (A.onDie) e.D.onDie = function (o) { if (D.onDie) D.onDie.call(this, o); A.onDie(o); };
    if (A.ap) A.ap(e);
  }
  return e;
}
function spawnEnemy(type, x, y, elite, delay = 0.8) {
  const e = mkEnemy(type, x, y, elite); e.spawnT = delay; e.inv = true;
  const s = hitsWall(x, y, e.r) && freeSpot(x, y, e.r, 16); if (s) { e.x = s.x; e.y = s.y; } // big bodies (r > 8) on a tile beside a wall would start stuck in it
  if (type === 'shield') e.shieldA = angTo(e, P);
  G.enemies.push(e); tele({ k: 'spawn', x: e.x, y: e.y, r: e.r + 3, life: delay }); AU.spawn(); return e;
}
// a foe that was killed (hp <= 0, not removed by script) leaves a body a bone priest can raise
function keepCorpse(e) {
  if (e.hp > 0 || e.raised || e.boss || e.dummy || e.parent || !(e.D && e.D.cost > 0) || e.D.anchored || NORAISE.has(e.type)) return;
  CORPSES.push({ type: e.type, x: e.x, y: e.y, t: G.t, room: G.cur }); if (CORPSES.length > 12) CORPSES.shift();
}
function updEnemies(dt) {
  G.flowT = (G.flowT || 0) - dt; if (G.flowT <= 0) { G.flowT = 0.25; computeFlow(P.x, P.y); }
  const es = G.enemies;
  for (const e of es) {
    if (e.dead) continue;
    e.flash -= dt; e.sq *= Math.exp(-dt * 10); e.anim += dt; e.shieldF = (e.shieldF || 0) - dt; e.mv = false;
    if (e.spawnT > 0) { e.spawnT -= dt; if (e.spawnT <= 0) { e.inv = false; e.sq = 0.6; inkDrops(e.x, e.y, -Math.PI / 2, 8, 1.6, 70); } continue; }
    if (e.burn > 0) { e.burn = Math.max(0, e.burn - dt); e.burnTick -= dt; if (e.burnTick <= 0) { e.burnTick = 0.33; hit(e, e.burnD * 0.33, { kind: 'dot', raw: true, noProc: true }); } if (e.burn <= 0) e.burnD = 0; }
    if (e.chillT > 0) { e.chillT -= dt; if (e.chillT <= 0) e.chill = 0; }
    if (e.dead) continue;
    if (e.boss) { updBoss(e, dt); continue; }
    if (e.frozen > 0) e.frozen = Math.max(0, e.frozen - dt);
    else if (e.stunT > 0) e.stunT = Math.max(0, e.stunT - dt); // stunned: no ai, no affix, no contact damage
    else { e.D.ai(e, dt * G.diff.tempo * (1 + 0.02 * (G.depth || 0)) * (1 - 0.12 * Math.min(4, e.chill || 0))); if (e.affix && !e.dead && !e.hide && AFFIX[e.affix].upd) AFFIX[e.affix].upd(e, dt); }
    if (e.dead) continue;
    if (e.kx || e.ky) {
      if (e.D.flying) { e.x += e.kx * dt; e.y += e.ky * dt; clampRoom(e); } else moveBody(e, e.kx * dt, e.ky * dt);
      const kd = Math.exp(-dt * 9); e.kx *= kd; e.ky *= kd; if (Math.abs(e.kx) + Math.abs(e.ky) < 2) e.kx = e.ky = 0;
    }
    if (!e.D.flying && !e.anchored) {
      const tl = tileUnder(e);
      if (tl === TS && spikePhase() === 2 && !e.spk) { e.spk = 1; hit(e, 10 * (1 + G.floor * 0.4), { kind: 'blast', raw: true, noProc: true, kb: 30 }); }
      if (spikePhase() !== 2) e.spk = 0;
    }
    if (e.D.contact && !e.frozen && !(e.stunT > 0) && !e.hide && d2(e.x, e.y, P.x, P.y) < (e.r + P.hurtR + 1) ** 2) hurtPlayer(1, e.x, e.y);
  }
  // soft separation
  for (let i = 0; i < es.length; i++) {
    const a = es[i]; if (a.dead || a.anchored || a.boss || a.hide) continue;
    for (let j = i + 1; j < es.length; j++) {
      const b = es[j]; if (b.dead || b.boss || b.hide) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, dd = dx * dx + dy * dy;
      if (dd < rr * rr && dd > 0.01) { const d = Math.sqrt(dd), push = (rr - d) * 0.5, nx = dx / d * push, ny = dy / d * push; if (!b.anchored) moveBody(b, nx, ny); moveBody(a, -nx, -ny); }
    }
  }
  G.enemies = es.filter(e => { if (!e.dead) return true; keepCorpse(e); return false; });
}
function drawEnemy(e) {
  if (e.spawnT > 0) return;
  if (e.boss) { drawBoss(e); return; }
  if (e.affix && !e.hide && e.alpha > 0.5) { // affix ring at the feet: slowly turning dashes in the affix color over an ink drop-shadow
    const rx = e.r + 4, ry = Math.max(3, rx * 0.4), rot = G.t * 1.5 + e.seed, y = e.y + e.r;
    pellipse(e.x, y + 1, rx, ry, C.ink, 3, rot); pellipse(e.x, y, rx, ry, AFFIX[e.affix].col, 3, rot);
  }
  e.D.draw(e); if (!e.hide) { statusFx(e); hpBar(e); }
}
