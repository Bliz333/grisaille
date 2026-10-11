'use strict';
/* GRISAILLE · rooms — optional special rooms (trial, forge, fortune, spring, library) */
const RX_ROOMS = {};   // room type -> { setup(r, c, f), manual?, waves?(r), reward?(r) }
const RX = {};         // pick variant (p.k === 'rx', p.v) -> { draw(p), prompt(p) -> [title, sub], use(p), label?(p), upd?(p, dt) }

const RXT = {
  trialTag: L2('TRIAL', '试炼'), sealT: L2('BREAK THE RUNE · TRIAL', '击碎符文 · 接受试炼'),
  sealD: L2('The doors lock. Three brutal waves. Survive for a <em class="y">guardian rune</em>, gold and healing.', '大门紧锁，三波强敌来袭。活下来，就能获得一枚<em class="y">守卫级符文</em>、金币和治疗。'),
  trialSub: L2('the rune breaks · something wakes', '符文碎裂 · 有东西醒了'), wonB: L2('TRIAL PASSED', '试炼通过'), wonSub: L2('the altar has drunk its fill', '祭坛已经喝饱了血'),
  anvilT: L2('TEMPER · +1 ★', '强化 · +1 ★'), noW: L2('NO WEAPON IN HAND', '手里没有武器'),
  cruT: L2('REFORGE', '重铸'), cruTag: L2('REFORGE · ONCE', '重铸 · 仅一次'), cruUp: L2('a random weapon one tier higher', '随机换成高一阶的武器'), cruSide: L2('another top-tier weapon', '另一把顶级武器'),
  keep: L2('keeps ★ · once', '保留 ★ · 仅一次'), reforged: L2('REFORGED ·', '重铸 ·'),
  fortT: L2('SPIN THE WHEEL OF FATE', '转动命运轮盘'), fortD: n => L2(`Pay and spin. Fate is cruel. ${n} of 3 left.`, `付钱转一次，命运无常。还剩 ${n} 次。`), djCards: L2('JACKPOT · CHOOSE ONE', '大奖 · 任选其一'),
  clearT: L2('CLEAR FOUNTAIN', '清泉'), clearD: L2('Heal fully and restore shields.', '回满生命，护盾恢复。'),
  murkT: L2('TAINTED FOUNTAIN', '污泉'), murkD: L2('<b>-1</b> max HP and <b>+10%</b> damage, forever.', '永久最大生命 <b>-1</b>，永久伤害 <b>+10%</b>。'),
  onlyOne: L2('Drink from one; the other runs dry.', '只能喝其中一口，另一口随即干涸。'), frail: L2('TOO WEAK TO DRINK', '身体太虚弱，喝不了'),
  readT: L2('READ', '阅读'), tomes: L2('GRIMOIRE', '禁书'), libD: L2('Choose 1 of up to 3 runes of this school. The other grimoires lock shut.', '从该流派至多三枚符文中选一枚，其余禁书随即锁死。'), learned: L2('NOTHING LEFT TO LEARN', '该流派已无可学'),
};
const FORTUNE = [   // order matches the gems on the wheel (WHEEL below)
  { name: 'JACKPOT', zh: '大奖', w: 8, cls: 'gold', v: L2('Gold under the needle. Fate smiles, for once.', '指针停在金色上。命运难得对你笑了一次。'),
    go: p => { invFlash(1); ringFx(p.x, p.y - 10, 4, 60, 0.6, C.gold, 2); later(0.9, () => openCards(3, lx(RXT.djCards))); } },
  { name: 'LUCKY', zh: '幸运', w: 16, cls: 'cyan', v: L2('A spark of magic slips through the cracks.', '一缕魔力从裂缝里溜了出来。'),
    go: p => { G.picks.push({ k: 'orb', tier: 1, x: p.x, y: p.y + 24, t: 0 }); AU.pickup(); ringFx(p.x, p.y + 24, 4, 30, 0.4, C.gold, 1); } },
  { name: 'SMALL LUCK', zh: '小赚', w: 22, cls: '', v: L2('Coins rattle in the dark. Not bad.', '黑暗里叮当作响。还不错。'),
    go: (p, paid) => { rxGold(Math.round(paid * 1.5), p.x, p.y); dropItem('potion', p.x + 14, p.y + 18); } },
  { name: 'SOMETHING', zh: '收获', w: 22, cls: '', v: L2('Something rolls out from under the wheel.', '轮盘底下滚出来一样东西。'),
    go: p => { dropItem(pick(['potion', 'vial', 'shard', 'whet', 'heartc', 'scroll']), p.x, p.y + 18); AU.pickup(); } },
  { name: 'BAD LUCK', zh: '霉运', w: 18, cls: 'red', v: L2('It bites you, then pays for the blood.', '它咬了你一口，又为这口血付了钱。'),
    go: (p, paid) => { if (P.hp > 1) { P.hp--; UI.hp(); AU.hurt(); UI.flash('hurt'); num(P.x, P.y - 12, '-1', false, C.red); inkDrops(P.x, P.y, -Math.PI / 2, 8, 1.4, 80); } rxGold(paid * 2, p.x, p.y); } },
  { name: 'DOOM', zh: '厄运', w: 10, cls: 'red', v: L2('The wheel screams. Two shadows answer.', '轮盘发出尖啸，两道黑影应声而来。'),
    go: (p, paid, r) => { p.used = true; r.cleared = false; activateRoom(r); slowmo(0.4, 0.35); invFlash(1); shake(0.3); ringFx(p.x, p.y - 10, 4, 80, 0.6, C.red, 2); } },
];

/* ---------- shared bits ---------- */
const rxCost = b => Math.round(b * S.shop);
const rxRoom = p => G.room.rooms[p.rid];
const rxNo = msg => { AU.deny(); UI.toast(msg, 'r'); };
const rxPrice = (p, v) => ({ x: p.x, y: p.y + 16, text: v + (LANG === 'zh' ? ' 金' : ' G'), cls: G.coins >= v ? 'price' : 'price no' });
const rxStill = p => { for (const q of G.picks) if (q.k === 'rx' && q.rid === p.rid) q.used = true; };
const rxGold = (n, x, y) => { G.coins += n; num(x, y - 20, '+' + n, false, C.gold); AU.coin(6); burst(x, y - 8, 16, C.gold, 100, 0.5); };
const rxElites = () => POOLS[G.floor].map(q => q[0]).filter(k => EDEF[k] && (EDEF[k].cost || 1) >= 2);
function rxAdd(v, x, y, r, o) { G.picks.push(Object.assign({ k: 'rx', v, x, y, t: 0, tall: true, rid: r.id }, o)); }
/* faint dotted ellipse painted onto the floor's decal layer (like the boss / shrine circles) */
function rxRing(cx, cy, rx, ry, f) { const c = G.room.dx; c.fillStyle = BIOMES[f].det; for (let a = 0; a < TAU; a += 1 / Math.max(rx, ry)) c.fillRect(Math.round(cx + Math.cos(a) * rx) + 8, Math.round(cy + Math.sin(a) * ry) + 8, 1, 1); }
const RX_RUNE_ROWS = ['r...r...r', '.r..r..r.', '..r.r.r..', '...rrr...', '....r....', '....r....', '...r.r...', '..r...r..', '.r.....r.'];
const RX_RUNE = spr(RX_RUNE_ROWS), RX_RUNE_DIM = spr(RX_RUNE_ROWS.map(s => s.replace(/r/g, 'R'))), RX_RUNE_OFF = spr(RX_RUNE_ROWS.map(s => s.replace(/r/g, 'd')));

/* ---------- 1 · trial 试炼: break the rune on the blood altar, survive three hard waves ---------- */
RX_ROOMS.trial = {
  manual: true,
  setup(r, c, f) {
    rxAdd('seal', c.x, c.y, r);
    rxRing(c.x, c.y + 4, 54, 34, f); rxRing(c.x, c.y + 4, 68, 44, f);
    const d = G.room.dx; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; d.fillRect(Math.round(c.x + Math.cos(a) * 61) + 7, Math.round(c.y + 4 + Math.sin(a) * 39) + 7, 3, 3); }
  },
  waves(r) {
    const f = G.floor, d = G.depth, pool = POOLS[f].filter(q => EDEF[q[0]]), big = rxElites(), out = [];
    for (let w = 0; w < 3; w++) {
      let budget = ((d ? 8 : 6) + d * 2 + r.dist * 0.6 + w * 2.5) * G.diff.budget, turrets = 0; const list = []; // the first level's trial is a taste, not a wall
      for (let guard = 0; budget > 0 && list.length < 16 && guard < 80; guard++) {
        const [type] = wpick(pool, q => q[1]), D = EDEF[type];
        if (D.anchored && turrets++ >= 2) continue;
        for (let g = 0; g < (D.group || 1); g++) list.push({ type, elite: Math.random() < 0.12 + d * 0.025 });
        budget -= D.cost || 1;
      }
      for (let k = 0; k < (d ? w : w >> 1); k++) list.push({ type: pick(big), elite: true });
      out.push(list);
    }
    return out;
  },
  reward(r) {
    const { x, y } = roomC(r);
    G.picks.push({ k: 'orb', tier: 2, x, y: y + 26, t: 0 }); dropGem(x, y + 14, 2); G.vacT = 3;
    for (let i = 0; i < 6 + G.depth * 2; i++) dropCoin(x, y + 14);
    healP(1); AU.altar(); invFlash(1);
    UI.banner(lx(RXT.wonB), lx(RXT.wonSub), 'gold');
    ringFx(x, y - 8, 4, 64, 0.6, C.gold, 2); burst(x, y + 20, 18, C.gold, 120, 0.5);
  },
};
RX.seal = {   // a standing rune stone on a blood altar, two candles on the step
  draw(p) {
    const x = Math.round(p.x), y = Math.round(p.y), r = rxRoom(p), fight = r.active, done = p.used && !fight, k = (Math.sin(p.t * 3) + 1) / 2;
    shadow(x, y + 7, 15);
    prect(x - 14, y + 1, 28, 7, C.ink); prect(x - 13, y + 2, 26, 1, C.dk); prect(x - 12, y + 5, 24, 1, C.ink2);
    prect(x - 10, y + 3, 20, 1, fight ? C.red : !done && k > 0.5 ? C.redDk : C.ink2);   // the blood groove
    prect(x - 8, y - 19, 16, 21, C.ink); prect(x - 6, y - 21, 12, 2, C.ink); prect(x - 3, y - 22, 6, 1, C.ink);
    prect(x - 7, y - 18, 14, 19, C.ink2); prect(x - 7, y - 18, 1, 19, C.dk); prect(x - 5, y - 20, 10, 1, C.dk);
    prect(x + 5, y - 11, 2, 1, C.ink); prect(x - 6, y - 4, 2, 1, C.ink);
    ctx.drawImage(done ? RX_RUNE_OFF : fight || k > 0.5 ? RX_RUNE : RX_RUNE_DIM, x - 4, y - 16);
    for (const s of [-1, 1]) {
      const cx = x + s * 12; prect(cx - 1, y - 3, 2, 4, C.lt); prect(cx - 1, y - 3, 1, 4, C.white);
      if (!done) { prect(cx - 1, y - 5, 2, 2, ((G.t * 9 + s * 3) | 0) % 3 ? C.fire : C.gold); prect(cx - 1 + (((G.t * 7 + s) | 0) & 1), y - 6, 1, 1, C.gold); }
      else if (Math.random() < 0.03) part(cx, y - 4, rand(-3, 3), rand(-16, -10), 1.2, C.mid, 1, { drag: 0.99 });
    }
    if (fight) { const fl = ((G.t * 8) | 0) % 2 ? C.red : C.white; pline(x - 3, y - 21, x, y - 13, fl); pline(x, y - 13, x - 2, y - 6, fl); pline(x + 2, y - 4, x + 5, y + 1, fl); if (Math.random() < 0.3) part(x + rand(-6, 6), y - rand(4, 16), rand(-20, 20), rand(-40, -20), 0.5, C.red, 1, { drag: 0.94 }); }
    else if (!done && Math.random() < 0.2) part(x + rand(-9, 9), y - rand(0, 18), 0, rand(-30, -14), 0.8, C.red, 1, { drag: 0.96 });
  },
  prompt: () => [lx(RXT.sealT), lx(RXT.sealD)],
  label: p => p.used ? null : { x: p.x, y: p.y + 18, text: lx(RXT.trialTag), cls: 'tag red' },
  use(p) {
    const r = rxRoom(p); p.used = true; r.cleared = false; activateRoom(r);
    UI.banner(lx(RXT.trialTag), lx(RXT.trialSub), 'red'); AU.altar(); shake(0.3); invFlash(1); hitstop(0.08);
    ringFx(p.x, p.y - 8, 4, 80, 0.6, C.red, 2); burst(p.x, p.y - 10, 20, C.red, 130, 0.6);
  },
};

/* ---------- 2 · forge 铁匠铺: anvil (+1 ★, repeatable) and crucible (reforge, once) ---------- */
const anvilCost = p => rxCost((22 + 4 * G.depth) * (1 + 0.6 * p.n));
RX_ROOMS.forge = {
  setup(r, c, f) {
    rxAdd('anvil', c.x - 40, c.y + 4, r, { n: 0 }); rxAdd('crucible', c.x + 40, c.y + 4, r);
    scorch(c.x + 40, c.y + 10, 18); rxRing(c.x - 40, c.y + 10, 20, 12, f);
  },
};
RX.anvil = {
  draw(p) {
    const x = Math.round(p.x), y = Math.round(p.y), k = p.t - (p.hit ?? -9), hot = ((p.t * 5) | 0) % 3 ? C.fire : C.gold;
    shadow(x, y + 7, 12);
    prect(x - 6, y - 1, 12, 8, C.ink); prect(x - 5, y, 10, 1, C.mid); prect(x - 5, y + 3, 10, 1, C.dk);
    prect(x - 4, y - 5, 8, 4, C.ink); prect(x - 9, y - 9, 18, 4, C.ink); prect(x - 13, y - 9, 4, 2, C.ink); prect(x - 11, y - 7, 2, 1, C.ink);
    prect(x - 8, y - 9, 16, 1, C.mid); prect(x - 5, y - 11, 9, 2, k < 0.18 ? C.white : hot);
    const lift = k < 0.3 ? Math.round(Math.abs(0.15 - k) * 50) : -1;
    if (lift >= 0) { prect(x - 3, y - 15 - lift, 8, 4, C.ink); prect(x - 2, y - 14 - lift, 6, 1, C.mid); pline(x + 5, y - 13 - lift, x + 12, y - 19 - lift, C.dk, 2); }
    else { pline(x + 10, y + 6, x + 13, y - 6, C.dk, 2); prect(x + 10, y - 9, 7, 3, C.ink); prect(x + 11, y - 9, 5, 1, C.mid); }
    if (Math.random() < 0.06) part(x + rand(-4, 4), y - 12, rand(-25, 25), rand(-60, -30), 0.4, C.fire, 1, { drag: 0.94, grav: 140 });
  },
  prompt(p) {
    const w = curW(), lv = w ? w.lv || 1 : 0;
    return [lx(RXT.anvilT), !w ? lx(RXT.noW) : lv >= 3 ? t('maxLv') : `${tn(WEAPONS[w.id])} <em class="y">${'★'.repeat(lv - 1) || '—'}</em> → <em class="y">${'★'.repeat(lv)}</em>`];
  },
  label: p => rxPrice(p, anvilCost(p)),
  use(p) {
    const w = curW(), cost = anvilCost(p);
    if (!w) return rxNo(lx(RXT.noW));
    if ((w.lv || 1) >= 3) return rxNo(t('maxLv'));
    if (G.coins < cost) return rxNo(t('noGold'));
    G.coins -= cost; p.n++; p.hit = p.t; w.lv = (w.lv || 1) + 1; UI.weapons();
    AU.coin(8); AU.hit(true); AU.reflect(); AU.charged(); shake(0.12); hitstop(0.05);
    sparks(p.x, p.y - 12, -Math.PI / 2, 14, C.gold, 170, 1.4); sparks(p.x, p.y - 12, -Math.PI / 2, 8, C.fire, 120, 1.6); ringFx(p.x, p.y - 10, 3, 30, 0.35, C.gold, 1);
    UI.toast(`${tn(WEAPONS[w.id])} <em class="y">${'★'.repeat(w.lv - 1)}</em>`, 'y');
  },
};
RX.crucible = {
  draw(p) {
    const x = Math.round(p.x), y = Math.round(p.y), on = !p.used;
    shadow(x, y + 8, 12);
    prect(x - 9, y + 1, 2, 7, C.ink); prect(x + 7, y + 1, 2, 7, C.ink); prect(x - 7, y + 3, 14, 3, C.ink);
    prect(x - 6, y + 4, 12, 1, on ? (((p.t * 7) | 0) % 2 ? C.fire : C.redDk) : C.dk);
    prect(x - 11, y - 11, 22, 3, C.ink); prect(x - 10, y - 9, 20, 11, C.ink); prect(x - 9, y - 7, 18, 7, C.ink2); prect(x - 9, y - 7, 2, 7, C.dk);
    prect(x - 9, y - 11, 18, 2, on ? C.fire : C.dk);
    if (on) {
      for (let i = 0; i < 4; i++) { const fh = 2 + ((p.t * 9 + i * 7) | 0) % 4; prect(x - 7 + i * 4, y - 11 - fh, 2, fh, i % 2 ? C.fire : C.gold); }
      const b = (p.t * 1.7) % 1; if (b < 0.25) prect(x - 4 + Math.round(Math.sin(p.t) * 4), y - 11, 2, 1, C.gold);
      if (Math.random() < 0.18) part(x + rand(-8, 8), y - 13, rand(-10, 10), rand(-55, -25), 0.6, pick([C.fire, C.gold]), 1, { drag: 0.95 });
    } else if (Math.random() < 0.05) part(x + rand(-6, 6), y - 12, rand(-4, 4), rand(-16, -10), 1.4, C.mid, 1, { drag: 0.99 });
  },
  prompt(p) {
    const w = curW(); if (!w) return [lx(RXT.cruT), lx(RXT.noW)];
    return [lx(RXT.cruT), `${tn(WEAPONS[w.id])} → ${lx((WEAPONS[w.id].tier || 0) >= 2 ? RXT.cruSide : RXT.cruUp)} · ${lx(RXT.keep)}`];
  },
  label: p => p.used ? null : { x: p.x, y: p.y + 16, text: lx(RXT.cruTag), cls: 'tag' },
  use(p) {
    const w = curW(); if (!w) return rxNo(lx(RXT.noW));
    // exact next tier (randWeapon caps tiers by floor, which could hand back a sidegrade on levels 1-2)
    const nt = Math.min(2, (WEAPONS[w.id].tier || 0) + 1), held = P.ws.filter(Boolean).map(q => q.id);
    const id = pick(Object.keys(WEAPONS).filter(k => (WEAPONS[k].tier || 0) === nt && !held.includes(k))), lv = w.lv || 1;
    const pw = power(); P.ws[P.wi] = mkWeapon(id, lv); p.used = true; UI.weapons(); UI.powerUp(pw, tn(WEAPONS[id])); checkWSyn();
    AU.swap(); AU.altar(); invFlash(1); slowmo(0.35, 0.4); shake(0.2);
    ringFx(p.x, p.y - 8, 4, 56, 0.5, C.fire, 2); burst(p.x, p.y - 12, 22, C.fire, 140, 0.6); burst(P.x, P.y - 4, 12, C.gold, 90, 0.5);
    UI.toast(`${lx(RXT.reforged)} ${tn(WEAPONS[id])}${lv > 1 ? ` <em class="y">${'★'.repeat(lv - 1)}</em>` : ''} <small>${td(WEAPONS[id])}</small>`, 'y');
  },
};

/* ---------- 3 · fortune 命运轮盘: pay to spin the wheel (3 max), weighted fate ---------- */
const fortuneCost = p => rxCost((14 + 3 * G.depth) * [1, 1.6, 2.4][p.n]);
const WHEEL = [C.gold, C.cyan, C.white, C.lt, C.red, C.redDk];   // one gem per FORTUNE outcome
const RX_PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
// wheel angle: eases out over 0.6 s from spin.a0 to spin.a1 (which puts the drawn gem under the needle)
function wheelA(p) { const s = p.spin; if (!s) return 0; const k = Math.min(1, (p.t - s.t0) / 0.6); return s.a0 + (s.a1 - s.a0) * (1 - (1 - k) ** 3); }
RX_ROOMS.fortune = {
  manual: true,
  setup(r, c, f) {
    rxAdd('sticks', c.x, c.y, r, { n: 0 });
    rxRing(c.x, c.y + 4, 34, 22, f);
    const d = G.room.dx; d.fillStyle = BIOMES[f].det;
    for (let k = 0; k < 6; k++) {   // six die faces around the wheel
      const a = k / 6 * TAU - Math.PI / 2, tx = Math.round(c.x + Math.cos(a) * 52) + 8, ty = Math.round(c.y + 4 + Math.sin(a) * 34) + 8;
      d.fillRect(tx - 4, ty - 4, 9, 1); d.fillRect(tx - 4, ty + 4, 9, 1); d.fillRect(tx - 4, ty - 3, 1, 7); d.fillRect(tx + 4, ty - 3, 1, 7);
      for (const q of RX_PIPS[k]) d.fillRect(tx - 2 + (q % 3) * 2, ty - 2 + ((q / 3) | 0) * 2, 1, 1);
    }
  },
  waves: () => { const big = rxElites(); return [[{ type: pick(big), elite: true }, { type: pick(big), elite: true }]]; },
  reward(r) {
    const p = G.picks.find(q => q.k === 'rx' && q.rid === r.id), { x, y } = roomC(r), cx = x + rand(-30, 30);
    G.picks.push({ k: 'chest', v: 'gold', x: cx, y: y + 32, t: 0, tall: true });
    ringFx(cx, y + 32, 4, 40, 0.5, C.gold, 2); burst(cx, y + 32, 16, C.gold, 120, 0.5);
    p.used = p.n >= 3;
  },
};
RX.sticks = {   // the wheel of fate: iron wheel on a wooden stand, needle on top, a skull candle beside it
  draw(p) {
    const x = Math.round(p.x), y = Math.round(p.y), wy = y - 15, a = wheelA(p) + (!p.used && p.t % 3.4 < 0.15 ? Math.sin(p.t * 70) * 0.05 : 0);
    shadow(x, y + 8, 12);
    prect(x - 11, y + 1, 22, 4, C.ink); prect(x - 10, y + 2, 20, 1, C.dk); prect(x - 9, y + 5, 2, 3, C.ink); prect(x + 7, y + 5, 2, 3, C.ink);
    pline(x - 6, y + 1, x - 1, wy, C.ink, 2); pline(x + 6, y + 1, x + 1, wy, C.ink, 2);
    pc(x, wy, 11, C.ink); pc(x, wy, 10, C.ink2);
    for (let i = 0; i < 6; i++) {
      const b = a + i * TAU / 6, sb = b + TAU / 12;
      pline(x, wy, x + Math.cos(sb) * 9, wy + Math.sin(sb) * 9, C.dk);
      prect(Math.round(x + Math.cos(b) * 7) - 1, Math.round(wy + Math.sin(b) * 7) - 1, 2, 2, WHEEL[i]);
    }
    pring(x, wy, 10, C.mid); pc(x, wy, 2, C.mid); prect(x, wy - 1, 1, 1, C.lt);
    const hl = p.pop != null && p.t - p.pop < 1.8, nc = hl && ((p.t * 8) | 0) % 2 ? p.col : C.lt;
    prect(x - 2, wy - 14, 5, 2, C.ink); prect(x - 1, wy - 12, 3, 1, C.ink); prect(x, wy - 11, 1, 1, C.ink); prect(x - 1, wy - 14, 3, 1, nc);
    if (hl) pring(x, wy - 7, 3, p.col);
    const ix = x + 16; prect(ix - 2, y - 1, 5, 4, C.lt); prect(ix - 1, y, 1, 1, C.ink); prect(ix + 1, y, 1, 1, C.ink); prect(ix - 1, y + 3, 3, 1, C.lt);
    prect(ix - 1, y - 6, 2, 5, C.white); prect(ix - 1, y - 8, 2, 2, ((G.t * 5) | 0) % 2 ? C.fire : C.gold);
    if (Math.random() < 0.08) part(ix + rand(-0.5, 0.5), y - 9, rand(-5, 5), rand(-16, -10), 1.4, C.mid, 1, { drag: 0.99 });
    if (!p.used && Math.random() < 0.06) part(x + rand(-8, 8), wy - rand(0, 10), 0, rand(-20, -10), 0.7, C.gold, 1, { drag: 0.96 });
  },
  prompt: p => [lx(RXT.fortT), lx(RXT.fortD(3 - p.n))],
  label: p => p.used ? null : rxPrice(p, fortuneCost(p)),
  use(p) {
    const cost = fortuneCost(p); if (G.coins < cost) return rxNo(t('noGold'));
    G.coins -= cost; p.n++; p.used = true; AU.coin(8);
    for (const d of [0, 0.07, 0.15, 0.25, 0.37, 0.52]) later(d, () => AU.tink());   // the needle clicks slower as the wheel winds down
    const F = wpick(FORTUNE, q => q.w), a0 = wheelA(p);
    p.spin = { t0: p.t, a0, a1: a0 + 3 * TAU + ((-Math.PI / 2 - FORTUNE.indexOf(F) * TAU / 6 - a0) % TAU + TAU) % TAU };
    later(0.6, () => {
      p.pop = p.t; p.col = F.cls === 'red' ? C.red : F.cls ? C.gold : C.white; p.used = p.n >= 3;
      UI.banner(tn(F), lx(F.v), F.cls); AU.page(); burst(p.x, p.y - 30, 10, p.col, 70, 0.5);
      F.go(p, cost, rxRoom(p));
    });
  },
};

/* ---------- 4 · spring 双泉: one choice — clear (mend) or tainted (power for blood) ---------- */
RX_ROOMS.spring = {
  setup(r, c, f) {
    for (const s of [-1, 1]) { rxAdd(s < 0 ? 'clear' : 'murk', c.x + s * 36, c.y + 2, r); rxRing(c.x + s * 36, c.y + 6, 20, 12, f); rxRing(c.x + s * 36, c.y + 6, 28, 17, f); }
  },
};
// stone fountain: basin on a pedestal and a spout pillar — a small upper bowl for the clear one, a skull for the tainted one
function drawBasin(p) {
  const x = Math.round(p.x), y = Math.round(p.y), clear = p.v === 'clear', gl = clear ? C.cyan : C.violet;
  shadow(x, y + 8, 14);
  prect(x - 6, y + 2, 12, 5, C.ink); prect(x - 9, y + 6, 18, 2, C.dk);
  prect(x - 12, y - 7, 24, 9, C.ink); prect(x - 13, y - 6, 26, 6, C.ink); prect(x - 11, y - 1, 22, 2, C.dk); prect(x - 11, y - 1, 22, 1, C.mid);
  prect(x - 11, y - 6, 22, 4, p.used ? C.mid : clear ? C.white : C.ink2); if (!clear && !p.used) prect(x - 11, y - 6, 22, 4, 'rgba(185,138,255,0.22)');
  prect(x - 2, y - 18, 4, 13, C.ink); prect(x - 1, y - 17, 1, 11, C.dk);
  if (clear) { prect(x - 6, y - 21, 12, 3, C.ink); prect(x - 5, y - 21, 10, 1, p.used ? C.mid : C.white); prect(x - 4, y - 18, 8, 1, C.ink); prect(x - 1, y - 23, 2, 2, C.ink); }
  else { const ey = p.used ? C.ink : C.violet; prect(x - 2, y - 24, 4, 1, C.lt); prect(x - 3, y - 23, 6, 3, C.lt); prect(x - 2, y - 20, 4, 2, C.lt); prect(x + 2, y - 23, 1, 3, C.mid); prect(x - 2, y - 22, 1, 1, ey); prect(x + 1, y - 22, 1, 1, ey); prect(x - 1, y - 19, 1, 1, C.ink); prect(x + 1, y - 19, 1, 1, C.ink); }
  if (p.used) return;
  if (clear) for (const s of [-1, 1]) for (let j = 0; j < 4; j++) { const u = (p.t * 2.5 + j / 4) % 1; prect(x + s * (6 + u * 3), y - 20 + u * u * 14, 1, 1, j % 2 ? C.white : C.frost); }
  else { const u = (p.t * 0.8) % 1; prect(x, y - 17 + u * 11, 1, u < 0.15 ? 2 : 1, C.violet); }
  const k = ((p.t * (clear ? 8 : 4)) % 11) | 0; prect(x - k, y - 5, 1, 1, gl); prect(x + k, y - 5, 1, 1, gl);
  if (clear) { prect(x - 8, y - 6, 3, 1, C.frost); if (Math.random() < 0.15) part(x + rand(-9, 9), y - 7, 0, rand(-26, -12), 0.8, pick([C.cyan, C.white]), 1, { drag: 0.96 }); }
  else { prect(x + 5, y - 6, 2, 1, C.violet); if (Math.random() < 0.07) part(x + rand(-8, 8), y - 5, 0, -4, 0.5, C.violet, 3, { kind: 2 }); }
}
RX.clear = {
  draw: drawBasin,
  prompt: () => [lx(RXT.clearT), `${lx(RXT.clearD)} ${lx(RXT.onlyOne)}`],
  label: p => p.used ? null : { x: p.x, y: p.y + 18, text: lx(RXT.clearT), cls: 'tag cyan' },
  use(p) {
    if (P.hp >= P.maxHp && P.sh >= P.maxSh) return rxNo(t('whole'));
    rxStill(p); healP(P.maxHp - P.hp); P.sh = Math.max(P.sh, P.maxSh); UI.hp(); AU.shieldUp(); AU.splash(); invFlash(1);
    ringFx(p.x, p.y - 4, 4, 50, 0.6, C.cyan, 2); burst(P.x, P.y - 4, 20, C.white, 110, 0.6);
    UI.toast(`${lx(RXT.clearT)} <small>${lx(RXT.clearD)}</small>`, 'c');
  },
};
RX.murk = {
  draw: drawBasin,
  prompt: () => [lx(RXT.murkT), `${lx(RXT.murkD)} ${lx(RXT.onlyOne)}`],
  label: p => p.used ? null : { x: p.x, y: p.y + 18, text: lx(RXT.murkT), cls: 'tag red' },
  use(p) {
    if (P.maxHp <= 2) return rxNo(lx(RXT.frail));
    const pw = power(); rxStill(p); G.hpBonus--; G.blessings.push({ id: 'murk', name: RXT.murkT.en, zh: RXT.murkT.zh, ap: s => { s.dmg += 0.1; } }); recalc(); UI.hp(); UI.powerUp(pw, lx(RXT.murkT));
    AU.altar(); AU.splash(); invFlash(1); shake(0.15); slowmo(0.3, 0.4);
    ringFx(p.x, p.y - 4, 4, 50, 0.6, C.violet, 2); inkDrops(p.x, p.y - 4, -Math.PI / 2, 14, 1.2, 120);
    UI.toast(`${lx(RXT.murkT)} <small>${lx(RXT.murkD)}</small>`, 'y');
  },
};

/* ---------- 5 · library 禁书库: three lecterns, three chained grimoires — read one, the others lock ---------- */
RX_ROOMS.library = {
  setup(r, c, f) {
    shuffle(Object.keys(SCHOOLS).filter(id => rollSchool(id, 1).length)).slice(0, 3).forEach((s, i) => { rxAdd('lectern', c.x + (i - 1) * 56, c.y, r, { s }); rxRing(c.x + (i - 1) * 56, c.y + 7, 16, 9, f); });
  },
};
RX.lectern = {
  draw(p) {
    const x = Math.round(p.x), y = Math.round(p.y), col = p.s === 'chroma' ? hue(G.t * 200 + p.x) : SCHOOLS[p.s].col, open = !p.used || p.read;
    shadow(x, y + 7, 11);
    prect(x - 7, y + 4, 14, 3, C.ink); prect(x - 6, y + 4, 12, 1, C.dk); prect(x - 1, y - 6, 3, 11, C.ink); prect(x, y - 5, 1, 9, C.dk);
    prect(x - 10, y - 11, 20, 6, C.ink); prect(x - 9, y - 10, 18, 1, C.dk);
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const u = i / 6, cx = x + s * (9 + Math.sin(u * Math.PI) * 2 - u * 4), cy = y - 9 + u * 13; prect(cx, cy, i % 2 ? 1 : 2, i % 2 ? 2 : 1, i % 2 ? C.dk : C.mid); }   // the chains
    if (!open) { prect(x - 7, y - 15, 14, 5, C.ink); prect(x - 6, y - 14, 12, 3, C.ink2); prect(x - 7, y - 13, 14, 1, C.mid); prect(x - 1, y - 14, 3, 3, C.lt); prect(x, y - 13, 1, 1, C.ink); return; }
    const fl = !p.used && (p.t * 0.7 + p.x * 0.013) % 2.2 < 0.25;
    prect(x - 10, y - 16, 20, 7, C.ink); prect(x - 10, y - 13, 1, 2, C.mid); prect(x + 9, y - 13, 1, 2, C.mid);
    prect(x - 9, y - 15, 8, 5, C.paper); prect(x + 1, y - 15, 8, 5, fl ? C.lt : C.paper); prect(x - 1, y - 15, 2, 5, C.mid);
    for (let l = 0; l < 2; l++) { prect(x - 8, y - 14 + l * 2, 5, 1, C.mid); if (!fl) prect(x + 2, y - 14 + l * 2, 5, 1, C.mid); }
    if (fl) { prect(x + 1, y - 19, 4, 5, C.paper); prect(x + 1, y - 19, 4, 1, C.lt); }
    prect(x + 4, y - 10, 1, 4, col);
    if (p.used) return;
    const by = y - 25 + Math.round(Math.sin(p.t * 2.5 + p.x) * 2);   // the school's rune, hovering over the page
    pline(x, by - 3, x, by + 3, C.ink, 3); pline(x - 2, by - 3, x, by - 1, C.ink, 3); pline(x + 2, by - 3, x, by - 1, C.ink, 3);
    pline(x, by - 3, x, by + 3, col); pline(x - 2, by - 3, x, by - 1, col); pline(x + 2, by - 3, x, by - 1, col);
    if (Math.random() < 0.15) part(x + rand(-7, 7), y - 15, 0, rand(-24, -12), 0.9, col, 1, { drag: 0.96 });
  },
  prompt: p => [`${lx(RXT.readT)} · ${scName(p.s)}`, lx(RXT.libD)],
  label: p => p.used ? null : { x: p.x, y: p.y + 16, text: scName(p.s), cls: 'name' },
  use(p) {
    const list = rollSchool(p.s, 3); if (!list.length) return rxNo(lx(RXT.learned));
    rxStill(p); p.read = true; AU.page(); AU.altar();
    ringFx(p.x, p.y - 12, 4, 40, 0.4, SCHOOLS[p.s].col, 2); burst(p.x, p.y - 14, 14, SCHOOLS[p.s].col, 90, 0.5);
    openCards(0, `${scName(p.s)} · ${lx(RXT.tomes)}`, () => rollSchool(p.s, 3));
  },
};
