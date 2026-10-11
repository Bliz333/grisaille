'use strict';
/* GRISAILLE · scenery — dungeon backdrops behind the level, ambient atmosphere, title art, pixel logo */
// big layers are painted once into offscreen canvases (per level / screen size); a frame only blits them with offsets

// a ridge built from integer-period sines tiles seamlessly over width w
const ridgeY = (x, w, waves) => { let y = 0; for (const [k, a, p] of waves) y += Math.sin(x / w * TAU * k + p) * a; return y; };
const rgbA = (rgb, a) => `rgba(${rgb},${a.toFixed(3)})`;
// soft, horizontally tiling band of fog, posterised into 4 alpha steps so it stays pixel-crisp
function mistBand(w, h, rgb, a) {
  const s = mk(w, h), c = s.getContext('2d'), d = c.createImageData(w, h), p = d.data, [r, g, bl] = rgb.split(',').map(Number), ph = [rand(TAU), rand(TAU), rand(TAU)];
  for (let x = 0; x < w; x++) {
    const u = x / w * TAU, wob = Math.sin(u * 2 + ph[0]) * 0.25 + Math.sin(u * 5 + ph[1]) * 0.12, th = 0.55 + Math.sin(u * 3 + ph[2]) * 0.35;
    for (let y = 0; y < h; y++) {
      const v = (y / h - 0.5 - wob * 0.3) / (0.2 * th + 0.07), k = Math.exp(-v * v) * (0.72 + 0.28 * Math.sin(u * 11 + y * 0.35 + ph[1])), i = (y * w + x) * 4;
      p[i] = r; p[i + 1] = g; p[i + 2] = bl; p[i + 3] = Math.round(k * 4) / 4 * a * 255;
    }
  }
  c.putImageData(d, 0, 0); return s;
}
const lnOn = (c, x0, y0, x1, y1, col, dash = 0) => { c.fillStyle = col; const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) if (!dash || ((i / dash) | 0) % 2 === 0) c.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1); };
// a floating chunk of obsidian: flat lit top, body tapering to a point, violet light leaking from below
function rockOn(c, cx, cy, w, h) {
  const ph = rand(TAU);
  for (let y = 0; y <= h; y++) { const hw = Math.round(w / 2 * (1 - Math.pow(y / h, 0.75)) * (0.86 + 0.14 * Math.sin(y * 1.3 + ph))); if (hw <= 0) continue; c.fillStyle = y === 0 ? '#3e3a4c' : y < 3 ? '#24222d' : '#111016'; c.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1); }
  c.fillStyle = 'rgba(185,138,255,0.4)'; for (let n = randi(1, 3); n > 0; n--) c.fillRect(Math.round(cx + rand(-w / 5, w / 5)), Math.round(cy + h * rand(0.45, 0.8)), 1, 1);
  c.fillStyle = '#0a090e'; let x = cx + rand(-w / 4, w / 4); for (let y = 1; y < h * 0.6; y++) { c.fillRect(Math.round(x), Math.round(cy + y), 1, 1); x += rand(-0.8, 0.8); }
}

/* ---------- backdrop: the dark around the rooms ---------- */
const BM = 40; // vertical slack each layer may slide
const BD = [
  { sky: ['#08080a', '#121116', '#0a0a0c'], fog: '200,196,190', fa: 0.07 },
  { sky: ['#070908', '#101513', '#090b0a'], fog: '190,210,200', fa: 0.09 },
  { sky: ['#08080b', '#13141a', '#100c0a'], fog: '214,214,224', fa: 0.07 },
  { sky: ['#050408', '#0c0a12', '#060509'], fog: '170,130,240', fa: 0.06 },
];
function makeBackdrop(b, w, h) {
  const D = BD[b], LH = h + BM * 2, LW0 = Math.max(320, Math.ceil(w * 1.5)), layers = [], gears = [];
  const sky = mk(w, h), s = sky.getContext('2d'), gr = s.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, D.sky[0]); gr.addColorStop(0.6, D.sky[1]); gr.addColorStop(1, D.sky[2]); s.fillStyle = gr; s.fillRect(0, 0, w, h);
  if (b === 2) { const fg = s.createLinearGradient(0, h * 0.55, 0, h); fg.addColorStop(0, 'rgba(255,128,36,0)'); fg.addColorStop(1, 'rgba(255,128,36,0.06)'); s.fillStyle = fg; s.fillRect(0, 0, w, h); } // furnace glow from below
  const id = s.getImageData(0, 0, w, h), p = id.data; for (let i = 0; i < p.length; i += 4) { const n = (Math.random() - 0.5) * 3; p[i] += n; p[i + 1] += n; p[i + 2] += n; } s.putImageData(id, 0, 0);
  const layer = (lw, kx, ky, drift = 0, bob = 0) => { const cv = mk(lw, LH); layers.push({ c: cv, kx, ky, drift, bob }); return cv.getContext('2d'); };
  const fog = (y, kx, ky, drift, a) => { const m = mistBand(LW0, 44, D.fog, a); layer(LW0, kx, ky, drift).drawImage(m, 0, Math.round(y) - 22); };
  const R = (c, col, x, y, ww, hh) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
  const mounds = (c, base, wv, col, rim) => { const ys = []; for (let x = 0; x < LW0; x++) { const y = Math.round(base + ridgeY(x, LW0, wv)); ys.push(y); R(c, col, x, y, 1, LH - y); R(c, rim, x, y, 1, 1); } return ys; };
  if (b === 0) { // crypt: a far arcade, massive pillars hung with chains, rubble and grave markers
    const AW = 40, LW = Math.ceil(LW0 / AW) * AW, c = layer(LW, 0.035, 0.03), top = LH * 0.26, spring = LH * 0.42, foot = LH * 0.8;
    R(c, '#16151a', 0, top, LW, LH - top); R(c, '#201f25', 0, top, LW, 1); R(c, '#1c1b20', 0, foot, LW, 2);
    for (let ax = 0; ax < LW; ax += AW) {
      const ox = ax + 8, rr = 12;
      for (let yy = -rr; yy <= 0; yy++) { const hw = Math.round(Math.sqrt(rr * rr - yy * yy)); R(c, '#0b0b0e', ox + rr - hw, spring + yy, hw * 2, 1); }
      R(c, '#0b0b0e', ox, spring, rr * 2, foot - spring); R(c, '#201f25', ax + 7, spring - rr, 1, foot - spring + rr);
      if (Math.random() < 0.22) { const fx = ox + randi(6, 18), fy = foot - randi(4, 10); R(c, 'rgba(255,138,42,0.12)', fx - 1, fy - 1, 3, 3); R(c, 'rgba(255,150,60,0.55)', fx, fy, 1, 1); } // a candle, far away
    }
    const c2 = layer(LW0, 0.08, 0.06);
    for (let px = randi(20, 60); px < LW0 - 40; px += randi(120, 180)) { const pw = randi(18, 26); R(c2, '#0f0f12', px, 0, pw, LH); R(c2, '#1b1a1f', px, 0, 1, LH); for (let k = 0; k < LH; k += 9) R(c2, '#0b0b0d', px + 1, k, pw - 1, 1); for (const [yy, ex, hh] of [[0.12, 3, 6], [0.86, 4, 8]]) { R(c2, '#141317', px - ex, LH * yy, pw + ex * 2, hh); R(c2, '#1e1d22', px - ex, LH * yy, pw + ex * 2, 1); } }
    for (let n = (LW0 / 45) | 0; n > 0; n--) { const cx = randi(0, LW0 - 1), len = randi(20, LH * 0.5); for (let y = 0; y < len; y += 3) R(c2, '#1a191e', cx, y, 1, 2); R(c2, '#24232a', cx - 1, len, 3, 2); }
    fog(LH * 0.74, 0.1, 0.08, 3, D.fa);
    const c3 = layer(LW0, 0.14, 0.1), ys = mounds(c3, LH * 0.9, [[3, 6, rand(TAU)], [7, 3, rand(TAU)], [17, 1.5, rand(TAU)]], '#0c0c0e', '#19181d');
    for (let px = randi(10, 40); px < LW0 - 12; px += randi(30, 90)) { const y = ys[px], hh = randi(7, 12), cross = Math.random() < 0.4; if (cross) { R(c3, '#0c0c0e', px + 3, y - hh, 2, hh); R(c3, '#0c0c0e', px, y - hh + 3, 8, 2); R(c3, '#1d1c22', px + 3, y - hh, 2, 1); } else { R(c3, '#0c0c0e', px, y - hh + 2, 7, hh - 2); R(c3, '#0c0c0e', px + 1, y - hh + 1, 5, 1); R(c3, '#1d1c22', px + 1, y - hh + 1, 5, 1); } }
  } else if (b === 1) { // sewers: brick tunnel mouths over black water, big pipes in front
    const AW = 128, LW = Math.ceil(LW0 / AW) * AW, c = layer(LW, 0.035, 0.03), top = LH * 0.12, wl = LH * 0.82, cy = LH * 0.5, ro = 52, ri = 42;
    R(c, '#121614', 0, top, LW, LH - top);
    for (let k = 0; k < LH - top; k += 5) R(c, '#0f1311', 0, top + k, LW, 1);
    for (let ax = 0; ax < LW; ax += AW) {
      const cx = ax + AW / 2;
      for (let yy = -ro; yy <= 0; yy++) { const ho = Math.round(Math.sqrt(ro * ro - yy * yy)), hi = yy > -ri ? Math.round(Math.sqrt(ri * ri - yy * yy)) : 0; R(c, '#1a201d', cx - ho, cy + yy, ho * 2, 1); if (hi) R(c, '#070a09', cx - hi, cy + yy, hi * 2, 1); }
      R(c, '#1a201d', cx - ro, cy, ro - ri, wl - cy); R(c, '#1a201d', cx + ri, cy, ro - ri, wl - cy); R(c, '#070a09', cx - ri, cy, ri * 2, wl - cy);
      for (let k = 0; k <= 14; k++) { const a = Math.PI + k / 14 * Math.PI; lnOn(c, cx + Math.cos(a) * ri, cy + Math.sin(a) * ri, cx + Math.cos(a) * ro, cy + Math.sin(a) * ro, '#101412'); }
      R(c, '#222a26', cx - ro, cy - ro, 1, 1);
    }
    R(c, '#0b100f', 0, wl, LW, LH - wl); R(c, '#1c2421', 0, wl, LW, 1);
    for (let n = (LW / 5) | 0; n > 0; n--) R(c, rgbA('160,190,185', rand(0.03, 0.07)), randi(0, LW - 10), randi(Math.round(wl + 2), LH - 3), randi(3, 16), 1);
    const c2 = layer(LW0, 0.08, 0.06);
    for (const py of [LH * rand(0.2, 0.32), LH * rand(0.55, 0.66)]) { R(c2, '#141816', 0, py, LW0, 9); R(c2, '#222824', 0, py, LW0, 1); R(c2, '#0c0f0e', 0, py + 8, LW0, 1); for (let fx = randi(0, 40); fx < LW0 - 4; fx += 48) { R(c2, '#1a1f1c', fx, py - 2, 4, 13); R(c2, '#262d29', fx, py - 2, 1, 13); } for (let n = 2; n > 0; n--) { const vx = randi(20, LW0 - 30); R(c2, '#131715', vx, py + 9, 7, LH - py); R(c2, '#202622', vx, py + 9, 1, LH - py); } }
    for (let n = (LW0 / 30) | 0; n > 0; n--) { const mx = randi(0, LW0 - 1), my = LH * rand(0.2, 0.7); R(c2, '#18201a', mx, my, 1, randi(3, 10)); }
    fog(LH * 0.78, 0.1, 0.08, 2.5, D.fa);
  } else if (b === 2) { // clockworks: iron trusses, great gears turning in the dark, chains
    const c = layer(LW0, 0.035, 0.03);
    for (const ty of [LH * 0.2, LH * 0.62]) { R(c, '#16171c', 0, ty, LW0, 3); R(c, '#16171c', 0, ty + 18, LW0, 3); R(c, '#20212a', 0, ty, LW0, 1); for (let k = 0; k < LW0; k += 18) { lnOn(c, k, ty + 3, k + 9, ty + 18, '#16171c'); lnOn(c, k + 9, ty + 18, k + 18, ty + 3, '#16171c'); } }
    for (let n = 3; n > 0; n--) { const r = randi(22, 46), spr = gearSpr(r, Math.round(r * 0.45), [23, 24, 31, 255], [36, 37, 47, 255], [15, 16, 20, 255]); gears.push({ s: spr, x: (n / 3) * LW0 * rand(0.8, 1) , y: LH * rand(0.3, 0.75), spd: rand(0.05, 0.12) * (n % 2 ? 1 : -1) * 30 / r, kx: 0.05, ky: 0.04 }); }
    const c2 = layer(LW0, 0.09, 0.07);
    for (let n = (LW0 / 40) | 0; n > 0; n--) { const cx = randi(0, LW0 - 1), len = randi(30, LH * 0.7); for (let y = 0; y < len; y += 4) { R(c2, '#1c1d23', cx, y, 1, 3); R(c2, '#121318', cx - 1, y + 3, 3, 1); } R(c2, '#2a2b33', cx - 2, len, 5, 3); }
    for (let n = 2; n > 0; n--) { const vx = randi(20, LW0 - 30); R(c2, '#121318', vx, 0, 6, LH); R(c2, '#202129', vx, 0, 1, LH); for (let y = randi(0, 30); y < LH; y += 40) R(c2, '#191a20', vx - 1, y, 8, 3); }
    fog(LH * 0.7, 0.11, 0.08, 4, D.fa);
  } else { // the void: violet haze, unfinished wireframes, floating shards drifting by
    const c = layer(LW0, 0.03, 0.02);
    for (const [y, a] of [[0.35, 0.06], [0.62, 0.05]]) c.drawImage(mistBand(LW0, 60, '150,110,230', a), 0, Math.round(LH * y) - 30);
    for (let n = (LW0 / 8) | 0; n > 0; n--) R(c, rgbA(Math.random() < 0.5 ? '200,180,255' : '230,230,240', rand(0.08, 0.3)), randi(0, LW0 - 1), randi(0, LH - 1), 1, 1);
    for (let n = 3; n > 0; n--) { const qx = rand(20, LW0 - 80), qy = rand(LH * 0.15, LH * 0.7), sz = randi(24, 50), col = 'rgba(200,185,255,0.06)'; for (const [a0, b0, a1, b1] of [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0], [0, 0, 0.4, -0.3], [1, 0, 1.4, -0.3], [0.4, -0.3, 1.4, -0.3], [1, 1, 1.4, 0.7], [1.4, -0.3, 1.4, 0.7]]) lnOn(c, qx + a0 * sz, qy + b0 * sz, qx + a1 * sz, qy + b1 * sz, col, 3); }
    const c2 = layer(LW0, 0.07, 0.05, 1.5, 2); for (let n = randi(8, 12); n > 0; n--) rockOn(c2, randi(20, LW0 - 20), LH * rand(0.15, 0.85), randi(6, 22), randi(5, 14));
    fog(LH * 0.66, 0.1, 0.07, 2, D.fa);
    const c3 = layer(LW0, 0.14, 0.1, 3, 3); for (let n = randi(3, 5); n > 0; n--) rockOn(c3, randi(30, LW0 - 30), LH * rand(0.2, 0.85), randi(18, 38), randi(12, 26));
  }
  return { b, w, h, sky, layers, gears, LW0 };
}
let _bd = null;
// drawBackdrop(cx, cy): called in screen space (identity transform) right after the void fill, before the level is blitted
function drawBackdrop(cx, cy) {
  const L = G.room, b = L.biome;
  if (!_bd || _bd.b !== b || _bd.w !== VW || _bd.h !== VH) _bd = makeBackdrop(b, VW, VH);
  ctx.drawImage(_bd.sky, 0, 0);
  const midY = L.h * T / 2 - VH / 2, A = _bd;
  A.layers.forEach((ly, i) => {
    const lw = ly.c.width, ox = Math.round(-((((cx * ly.kx + G.rt * ly.drift) % lw) + lw) % lw)), oy = Math.round(clamp(-(cy - midY) * ly.ky, -BM, BM)) - BM + (ly.bob ? Math.round(Math.sin(G.rt * 0.5 + i) * ly.bob) : 0);
    ctx.drawImage(ly.c, ox, oy); if (ox + lw < VW) ctx.drawImage(ly.c, ox + lw, oy);
    if (i === 0) for (const g of A.gears) { const gx = (((g.x - cx * g.kx) % A.LW0) + A.LW0) % A.LW0, gy = g.y + Math.round(clamp(-(cy - midY) * g.ky, -BM, BM)) - BM, hw = g.s.width / 2; for (const sx of [gx, gx - A.LW0]) if (sx > -hw && sx < VW + hw) drawRot(g.s, sx, gy, G.rt * g.spd, hw, g.s.height / 2); }
  });
}

/* ---------- ambient motes (world space, wrapped around the view) ---------- */
const AMB = [], AMB_N = [42, 32, 22, 44];
let _ambB = -1, _ambT = 0;
const AMB_C = [['rgba(222,216,204,0.32)', 'rgba(222,216,204,0.16)', 'rgba(255,138,42,0.85)', 'rgba(255,176,74,0.55)'], ['rgba(170,200,195,0.55)', 'rgba(170,200,195,0.35)', 'rgba(210,226,218,0.07)', 'rgba(210,226,218,0.12)'], ['rgba(214,214,222,0.22)', 'rgba(214,214,222,0.12)', 'rgba(255,150,60,0.9)', 'rgba(255,200,120,0.7)'], ['rgba(185,138,255,0.55)', 'rgba(185,138,255,0.28)', 'rgba(226,210,255,0.6)', '#2a2734']];
const STEAM = ['rgba(225,226,234,0.24)', 'rgba(225,226,234,0.15)', 'rgba(225,226,234,0.07)'];
// drawAmbient(cx, cy): called in world space (camera transform) after particles, before the darkness layer
function drawAmbient(cx, cy) {
  const R = G.room, b = R.biome, N = AMB_N[b], col = AMB_C[b], t = G.t;
  if (_ambB !== b) { AMB.length = 0; for (let i = 0; i < N; i++) AMB.push({ x: cx + rand(VW), y: cy + rand(VH), s: rand(), p: rand(TAU), lu: 1, d: 1 }); _ambB = b; _ambT = t; }
  const dt = clamp(t - _ambT, 0, 0.05), x0 = cx - 16, y0 = cy - 16, ww = VW + 32, hh = VH + 32; _ambT = t;
  for (let i = 0; i < N; i++) {
    const m = AMB[i], s = m.s, p = m.p;
    if (b === 0) { if (i < 36) { m.x += (2 + Math.sin(t * 0.3 + p) * 3) * dt; m.y += (Math.sin(t * 0.5 + p * 2) * 2 - 0.8) * dt; } else { m.x += Math.sin(t * 2 + p) * 6 * dt; m.y -= (8 + s * 10) * dt; } }
    else if (b === 1 && i >= 14 && i < 30) m.x += (4 + s * 5) * dt;
    else if (b === 1 && i >= 30) { const tx = Math.floor((m.x + m.d * 6) / T), ty = Math.floor(m.y / T); if (tAt(R, tx, ty) !== TF) m.d = -m.d; else m.x += m.d * (34 + s * 20) * dt * (Math.sin(t * 1.3 + p) > -0.3 ? 1 : 0); }
    else if (b === 2 && i < 12) { m.x += Math.sin(t * 0.4 + p) * 2 * dt; m.y -= (1 + s) * dt; }
    else if (b === 3) { if (i < 30) { m.x += Math.sin(t * 0.6 + p) * 3 * dt; m.y -= (3 + s * 4) * dt; } else { m.x += (2 + s * 3) * dt; m.y += Math.sin(t * 0.4 + p) * 2 * dt; } }
    m.x = x0 + (((m.x - x0) % ww) + ww) % ww; m.y = y0 + (((m.y - y0) % hh) + hh) % hh;
    const x = Math.round(m.x), y = Math.round(m.y);
    if (b === 0) { if (i < 36) { ctx.fillStyle = col[s < 0.5 ? 0 : 1]; ctx.fillRect(x, y, 1, 1); } else if (Math.sin(t * 5 + p) > -0.6) { ctx.fillStyle = col[Math.sin(t * 9 + p) > 0 ? 2 : 3]; ctx.fillRect(x, y, 1, 1); } }
    else if (b === 1) {
      if (i < 14) { // a drip falls from the dark, splashes, and starts again somewhere else
        const P = 1.4 + s, u = ((t + p) / P) % 1, fall = 16 + s * 22;
        if (u < m.lu) { m.x = cx + rand(VW); m.y = cy + rand(VH * 0.85); } m.lu = u;
        ctx.fillStyle = col[0]; if (u < 0.55) ctx.fillRect(x, Math.round(m.y + u / 0.55 * fall), 1, 2); else if (u < 0.72) { ctx.fillStyle = col[1]; const yy = Math.round(m.y + fall); ctx.fillRect(x - 2, yy, 1, 1); ctx.fillRect(x + 2, yy, 1, 1); ctx.fillRect(x - 1, yy - 1, 1, 1); ctx.fillRect(x + 1, yy - 1, 1, 1); }
      } else if (i < 30) { ctx.fillStyle = col[s < 0.5 ? 2 : 3]; ctx.fillRect(x, y, 4 + ((s * 9) | 0), 1); if (s > 0.6) ctx.fillRect(x + 2, y - 1, 3 + ((s * 4) | 0), 1); }
      else if (tAt(R, Math.floor(m.x / T), Math.floor(m.y / T)) === TF) { // a rat, only ever seen on open floor
        ctx.fillStyle = '#1c1c1f'; ctx.fillRect(x - 2, y - 1, 5, 2); ctx.fillRect(x + m.d * 3, y - 1, 1, 1); ctx.fillStyle = '#3a3a3e'; ctx.fillRect(x - m.d * 4, y, 2, 1); if (((t * 12) | 0) % 2) { ctx.fillStyle = '#1c1c1f'; ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1); }
      }
    } else if (b === 2) {
      if (i < 12) { ctx.fillStyle = col[s < 0.5 ? 0 : 1]; ctx.fillRect(x, y, 1, 1); }
      else { // sparks shower down from the machinery above
        const P = 1.6 + s * 1.5, u = ((t + p) / P) % 1;
        if (u < m.lu) { m.x = cx + rand(VW); m.y = cy + rand(VH * 0.5); } m.lu = u;
        if (u < 0.4) { const tt = u * P; ctx.fillStyle = col[u < 0.2 ? 3 : 2]; ctx.fillRect(Math.round(m.x + tt * (s - 0.5) * 30), Math.round(m.y + tt * tt * 70), 1, 1); }
      }
    } else { if (i < 30) { ctx.fillStyle = col[Math.sin(t * 1.5 + p * 3) > 0.2 ? 0 : 1]; ctx.fillRect(x, y, 1, 1); } else { const fl = ((t * 2 + p) | 0) % 2; ctx.fillStyle = col[3]; ctx.fillRect(x, y, fl ? 2 : 1, fl ? 1 : 2); ctx.fillStyle = col[2]; ctx.fillRect(x, y + (fl ? 1 : 2), 1, 1); } }
  }
  if (b === 2 && R.vents) for (const v of R.vents) { // steam puffs from the vents in view
    if (v.x < cx - 20 || v.x > cx + VW + 20 || v.y < cy - 10 || v.y > cy + VH + 40) continue;
    for (let j = 0; j < 3; j++) { const u = (t * 0.45 + v.p + j / 3) % 1, sz = 1 + ((u * 4) | 0); ctx.fillStyle = STEAM[(u * 3) | 0]; ctx.fillRect(Math.round(v.x + Math.sin(u * 6 + v.p * 9) * 3 * u - sz / 2), Math.round(v.y - u * 26 - sz / 2), sz, sz); }
  }
}

/* ---------- title: the gate of the Grey Keep at night ---------- */
const KNIGHT_F = ['...###....', '..#####...', '..#c..#...', '..#####...', '...###....', '.#######.m', '##.###.##m', '#.#####.#m', '#.#####.mm', '#.#####..m', '#..###...m', '...#.#...m', '..##.##..m', '.........m'];
function titleArt(w, h) {
  const gx = Math.round(w * 0.7), aw = Math.round(clamp(w * 0.095, 30, 62)), spring = Math.round(h * 0.48), yt = Math.round(h * 0.78), wallL = Math.round(w * 0.46), wallTop = Math.round(h * 0.15);
  const torches = [[gx - aw - 18, Math.round(h * 0.53)], [gx + aw + 18, Math.round(h * 0.53)]], lr = h * 0.17;
  const base = mk(w, h), c = base.getContext('2d'), R = (col, x, y, ww, hh) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
  // night sky with a few cold stars
  const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#040406'); gr.addColorStop(0.6, '#0e0e13'); gr.addColorStop(1, '#09090b'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
  for (let n = Math.round(w * h / 1800); n > 0; n--) R(rgbA('210,214,230', rand(0.08, 0.45)), randi(0, w - 1), randi(0, Math.round(h * 0.55)), 1, 1);
  // far outer wall, low, and a few grave markers in the dark on the left
  const wv = [[2, 3, rand(TAU)], [5, 2, rand(TAU)], [13, 1, rand(TAU)]];
  for (let x = 0; x < w; x++) { const y = Math.round(h * 0.7 + ridgeY(x, w, wv) + ((x >> 3) % 3 === 0 ? -3 : 0)); R('#0d0d11', x, y, 1, h - y); R('#18181e', x, y, 1, 1); }
  R('#121113', 0, yt + 12, w, h - yt - 12); for (let y = yt + 14, k = 0; y < h; k++, y += 3 + k) R('#0b0a0b', 0, y, w, 1);
  for (let px = Math.round(w * 0.06); px < wallL - 20; px += randi(26, 60)) { const y = Math.round(h * 0.84), hh = randi(7, 11); R('#0a0a0d', px, y - hh + 2, 7, hh); R('#0a0a0d', px + 1, y - hh + 1, 5, 1); R('#1a1a20', px + 1, y - hh + 1, 5, 1); }
  // the keep: stone blocks, a battlement, a tower; lit warm by the gate torches (per-pixel, once)
  const inArch = (x, y) => y < yt && Math.abs(x - gx) < aw && (y >= spring || (x - gx) ** 2 + (y - spring) ** 2 < aw * aw);
  const ringD = (x, y) => y < spring ? Math.hypot(x - gx, y - spring) : Math.abs(x - gx);
  const towerX0 = Math.round(w * 0.88), towerTop = Math.round(h * 0.05);
  const lTop = Math.round(h * 0.1), lW = Math.round(w * 0.06);
  const inWall = (x, y) => { if (x < wallL) return false; const tw = x >= towerX0 && x < towerX0 + Math.round(w * 0.09), lt = x < wallL + lW, top = tw ? towerTop : lt ? lTop : wallTop; if (y >= top) return true; return y >= top - 6 && ((x - (tw ? towerX0 : wallL)) % 12) < 7; };
  const d = c.getImageData(0, 0, w, h), px = d.data;
  for (let y = 0; y < Math.min(h, yt + 2); y++) for (let x = 0; x < w; x++) {
    if (!inWall(x, y) || inArch(x, y)) continue;
    const rd = ringD(x, y), ring = rd >= aw && rd < aw + 7 && y < yt;
    let v;
    if (ring) { const a = y < spring ? Math.atan2(y - spring, x - gx) : 0, joint = y < spring ? Math.abs(((a / Math.PI * 9) % 1 + 1) % 1 - 0.5) > 0.44 : (y - spring) % 6 === 0; v = joint || rd >= aw + 6 ? 20 : 44 + (rd < aw + 1 ? 8 : 0); }
    else { const yy = y - wallTop + 12, row = Math.floor(yy / 8), off = Math.floor(hash2(row, 7) * 16), bw = 13 + ((row * 5) % 3) * 3, bk = Math.floor((x + off) / bw), hv = hash2(bk, row); v = (yy % 8 === 0 || (x + off) % bw === 0) ? 15 : hv < 0.05 ? 13 : 26 + Math.round(hv * 12 - 6) - ((yy % 8) === 1 ? -3 : 0); if (!inWall(x, y - 1)) v = 44; else if (!inWall(x - 1, y)) v = 12; }
    v += (Math.random() - 0.5) * 4 - (1 - y / yt) * 8 - (x < wallL + lW && x > wallL + lW - 2 ? 8 : 0);
    let lw = 0; for (const [tx, ty] of torches) lw += 1 / (1 + ((x - tx) ** 2 + (y - ty) ** 2) / (lr * lr));
    const i = (y * w + x) * 4; px[i] = v + lw * 70; px[i + 1] = v + lw * 34; px[i + 2] = v + 3 + lw * 12; px[i + 3] = 255;
  }
  c.putImageData(d, 0, 0);
  R('rgba(255,150,60,0.6)', towerX0 + Math.round(w * 0.04), towerTop + 10, 1, 3); // a lit arrow slit high in the tower
  // through the gate: stairs going down into the dark, a little cold fog on the first steps
  R('#030304', gx - aw, spring, aw * 2, yt - spring); for (let yy = -aw; yy <= 0; yy++) { const hw = Math.round(Math.sqrt(aw * aw - yy * yy)); R('#030304', gx - hw, spring + yy, hw * 2, 1); }
  for (let k = 0, y = yt; k < 10 && y > spring - aw * 0.4; k++) { const sp = Math.max(2, Math.round(7 * Math.pow(0.8, k))), v = Math.round(46 * Math.pow(0.7, k)); y -= sp; R(`rgb(${v + 6},${v + 2},${v})`, gx - aw + 1, y, aw * 2 - 2, 1); R(`rgb(${(v * 0.5) | 0},${(v * 0.5) | 0},${(v * 0.55) | 0})`, gx - aw + 1, y + 1, aw * 2 - 2, sp - 1); }
  for (let k = 0; k < 4; k++) c.drawImage(circSpr(24, 'rgba(170,172,190,0.045)'), gx - aw * (0.9 - k * 0.15), yt - 18 + k * 2, aw * (1.8 - k * 0.3), 22 - k * 4);
  for (let bx = gx - aw + 4; bx < gx + aw - 2; bx += 7) { const by = spring - Math.round(Math.sqrt(Math.max(0, aw * aw - (bx - gx) ** 2))) + 1; R('#0c0c0e', bx, by, 2, spring + 6 - by); R('#2e2c2c', bx, by, 1, spring + 6 - by); R('#0c0c0e', bx, spring + 6, 1, 2); } // the portcullis, raised
  // steps up to the gate and the courtyard flagstones, warm where the torchlight falls
  for (let k = 0; k < 3; k++) { const y = yt + k * 4, hw = aw + 6 + k * 7; R('#3a302a', gx - hw, y, hw * 2, 1); R('#1b1816', gx - hw, y + 1, hw * 2, 3); }
  const d2 = c.getImageData(0, yt, w, h - yt), q = d2.data;
  for (let y = 0; y < h - yt; y++) for (let x = 0; x < w; x++) { let lw = 0; for (const [tx] of torches) lw += 1 / (1 + ((x - tx) ** 2 + ((y - 6) * 3) ** 2) / (lr * lr * 1.5)); const i = (y * w + x) * 4; q[i] += lw * 44; q[i + 1] += lw * 22; q[i + 2] += lw * 9; }
  c.putImageData(d2, 0, yt);
  for (const [tx, ty] of torches) { R('#141215', tx - 1, ty, 3, 7); R('#2c2a2c', tx - 2, ty - 2, 5, 2); R('#5c5450', tx - 2, ty - 2, 5, 1); R('#141215', tx - 3, ty + 4, 7, 1); }
  // the knight at the top of the steps, rim-lit by both torches, a cyan spark in the visor
  const kn = mk(10, 14), k2 = kn.getContext('2d'), M = (x, y) => y >= 0 && y < 14 && x >= 0 && x < 10 && KNIGHT_F[y][x] !== '.' && KNIGHT_F[y][x] !== 'm';
  for (let y = 0; y < 14; y++) for (let x = 0; x < 10; x++) { const ch = KNIGHT_F[y][x]; if (ch === '.') continue; k2.fillStyle = ch === 'c' ? C.cyan : ch === 'm' ? (y === 8 ? '#3a3638' : '#77736f') : (!M(x - 1, y) || !M(x + 1, y)) ? '#5e3a24' : !M(x, y - 1) ? '#34303a' : '#09090b'; k2.fillRect(x, y, 1, 1); }
  const vig = mk(w, h), v = vig.getContext('2d'), vg = v.createRadialGradient(gx, h * 0.55, h * 0.2, gx, h * 0.55, Math.hypot(w, h) * 0.7);
  vg.addColorStop(0, 'rgba(3,3,5,0)'); vg.addColorStop(1, 'rgba(3,3,5,0.75)'); v.fillStyle = vg; v.fillRect(0, 0, w, h);
  const tw = []; for (let n = 8; n > 0; n--) { const sx = randi(0, w - 1), sy = randi(0, Math.round(h * 0.5)); if (!inWall(sx, sy)) tw.push([sx, sy, rand(TAU)]); }
  return { w, h, base, vig, kn, gx, yt, aw, torches, tw, fog1: mistBand(w + 64, 36, '180,180,192', 0.16), fog2: mistBand(w + 64, 40, '170,170,182', 0.13) };
}
let _tt = null;
// drawTitleArt(t): called in screen space instead of the level while G.state === 'title'
function drawTitleArt(t) {
  if (!_tt || _tt.w !== VW || _tt.h !== VH) _tt = titleArt(VW, VH);
  const A = _tt, w = A.w, h = A.h, fogAt = (img, y, spd) => { const mw = img.width, ox = -Math.round(((t * spd) % mw + mw) % mw); ctx.drawImage(img, ox, y); ctx.drawImage(img, ox + mw, y); };
  ctx.drawImage(A.base, 0, 0);
  for (const [x, y, p] of A.tw) { const k = Math.sin(t * 1.3 + p); if (k > 0.3) { ctx.fillStyle = k > 0.85 ? 'rgba(235,238,255,0.8)' : 'rgba(220,224,240,0.4)'; ctx.fillRect(x, y, 1, 1); } }
  // torchlight breathing over the stones, flames, embers drifting up
  ctx.globalCompositeOperation = 'lighter';
  for (const [i, [tx, ty]] of A.torches.entries()) { const f = Math.sin(t * 8.3 + i * 2) + Math.sin(t * 19.1 + i) * 0.5; ctx.globalAlpha = 0.32 + f * 0.05; ctx.drawImage(GLOWO, tx - 40, ty - 44, 80, 80); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  for (const [i, [tx, ty]] of A.torches.entries()) {
    const f = Math.sin(t * 9 + i * 3) + Math.sin(t * 23.7 + i) * 0.5, hh = 6 + (f > 0.3 ? 1 : 0) - (f < -0.9 ? 1 : 0), sw = f > 0.8 ? 1 : f < -0.6 ? -1 : 0, fy = ty - 3;
    ctx.fillStyle = C.fire; ctx.fillRect(tx - 1, fy - hh + 3, 3, hh - 2); ctx.fillRect(tx + sw, fy - hh + 1, 1, 2); ctx.fillRect(tx - 2, fy - 2, 5, 2);
    ctx.fillStyle = '#ffb04a'; ctx.fillRect(tx, fy - hh + 4, 1, hh - 4); ctx.fillStyle = '#fff0c0'; ctx.fillRect(tx, fy - 1, 1, 1);
    for (let e = 0; e < 4; e++) { const u = (t * 0.6 + e * 0.27 + i * 0.13) % 1; if (u > 0.85) continue; ctx.fillStyle = u < 0.4 ? 'rgba(255,176,74,0.85)' : 'rgba(255,138,42,0.5)'; ctx.fillRect(Math.round(tx + Math.sin(t * 2 + e * 7 + i) * 3 * u * 3), Math.round(fy - hh - u * 34), 1, 1); }
  }
  fogAt(A.fog1, A.yt - 20, 3);
  const kx = A.gx - 5, ky = A.yt - 14;
  ctx.drawImage(A.kn, kx, ky);
  ctx.fillStyle = 'rgba(64,228,255,0.25)'; ctx.fillRect(kx + 2, ky + 1, 3, 3);
  if ((t % 4.2) < 0.35) { ctx.fillStyle = C.white; ctx.fillRect(kx + 3, ky + 2, 1, 1); ctx.fillStyle = C.cyan; ctx.fillRect(kx + 1, ky + 2, 1, 1); ctx.fillRect(kx + 5, ky + 2, 1, 1); ctx.fillRect(kx + 3, ky, 1, 1); ctx.fillRect(kx + 3, ky + 4, 1, 1); }
  fogAt(A.fog2, h - Math.round(h * 0.14), 5);
  ctx.drawImage(A.vig, 0, 0);
}

/* ---------- logo: GRISAILLE cut in stone; the dot of the first I is the cyan spark ---------- */
const LOGO_G = {
  G: ['..####.', '.##..##', '##....#', '##.....', '##..###', '##...##', '##...##', '.##..##', '..####.'],
  R: ['#####..', '.##.##.', '.##..##', '.##..##', '.##.##.', '.####..', '.##.##.', '.##..##', '###..##'],
  I: ['####', '.##.', '.##.', '.##.', '.##.', '.##.', '.##.', '.##.', '####'],
  S: ['.####.', '##..##', '##....', '.##...', '..##..', '...##.', '....##', '##..##', '.####.'],
  A: ['...#...', '..###..', '..###..', '.##.##.', '.##.##.', '.#####.', '##...##', '##...##', '###.###'],
  L: ['####..', '.##...', '.##...', '.##...', '.##...', '.##...', '.##..#', '.##.##', '######'],
  E: ['######', '.##..#', '.##...', '.##.#.', '.####.', '.##.#.', '.##...', '.##..#', '######'],
};
function drawLogo(cv) {
  const word = 'GRISAILLE', S2 = 2, pad = 3, top = 8, rows = 9;
  const cells = [...word].reduce((n, ch) => n + LOGO_G[ch][0].length, 0) + word.length - 1, W = cells * S2 + pad * 2, H = rows * S2 + top + pad + 2;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), m = new Uint8Array(W * H);
  let cx = pad, dot = -1;
  for (const ch of word) { const g = LOGO_G[ch]; for (let r = 0; r < rows; r++) for (let q = 0; q < g[r].length; q++) if (g[r][q] === '#') for (let yy = 0; yy < S2; yy++) for (let xx = 0; xx < S2; xx++) m[(top + r * S2 + yy) * W + cx + q * S2 + xx] = 1; if (ch === 'I' && dot < 0) dot = cx + g[0].length * S2 / 2; cx += (g[0].length + 1) * S2; }
  const M = (px, py) => px >= 0 && py >= 0 && px < W && py < H && m[py * W + px] === 1;
  for (let i = 0; i < W * H; i++) if (m[i] && Math.random() < 0.05) { const px = i % W, py = (i / W) | 0, open = !M(px - 1, py) + !M(px + 1, py) + !M(px, py - 1) + !M(px, py + 1); if (open === 2 && (!M(px - 1, py) !== !M(px + 1, py))) m[i] = 2; } // worn, chipped corners
  for (let n = 0; n < 6; n++) { let px = randi(pad, W - pad), py = top + randi(1, rows * S2 - 2); for (let k = randi(4, 9); k > 0; k--) { if (M(px, py)) m[py * W + px] = 3; px += randi(-1, 1); py += randi(0, 1); } } // hairline cracks
  const d = x.createImageData(W, H), p = d.data, put = (i, r, g, bl, a = 255) => { p[i * 4] = r; p[i * 4 + 1] = g; p[i * 4 + 2] = bl; p[i * 4 + 3] = a; };
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px, v = m[i];
    if (v === 1) { let s = 196 - ((py - top) / (rows * S2)) * 60 + (Math.random() - 0.5) * 14; if (!M(px, py - 1)) s = 238; else if (!M(px, py + 1)) s = 74; else if (!M(px - 1, py)) s += 20; else if (!M(px + 1, py)) s -= 30; put(i, s, s, s - 4); }
    else if (v === 3) put(i, 58, 57, 62);
    else { let near = false; for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1; ox++) if (M(px + ox, py + oy)) { near = true; break; } if (near) put(i, 10, 10, 12); else if (M(px - 1, py - 2) || M(px, py - 2)) put(i, 0, 0, 0, 150); }
  }
  x.putImageData(d, 0, 0);
  const sy = top - 5; x.fillStyle = 'rgba(64,228,255,0.28)'; x.fillRect(dot - 2, sy - 2, 5, 5);
  x.fillStyle = C.cyan; x.fillRect(dot - 1, sy, 3, 1); x.fillRect(dot, sy - 1, 1, 3); x.fillRect(dot - 3, sy, 1, 1); x.fillRect(dot + 3, sy, 1, 1);
  x.fillStyle = C.white; x.fillRect(dot, sy, 1, 1);
}
