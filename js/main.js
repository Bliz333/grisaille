'use strict';
/* GRISAILLE · main — run flow, floor maps, rooms, rewards, pickups, projectiles, render, loop */
const ISPR = {
  potion: spr(['..###..', '..#w#..', '.##w##.', '#rrrrr#', '#rwrrr#', '#rrrrr#', '.#####.']),
  vial: spr(['..###..', '..#w#..', '..#c#..', '.#ccc#.', '.#cwc#.', '.#ccc#.', '..###..']),
  shard: spr(['...#...', '..#w#..', '.#wgw#.', '.#wgw#.', '.#wgw#.', '..#w#..', '...#...']),
  whet: spr(['.......', '..####.', '.#yyyy#', '#yywyy#', '#yyyy#.', '.####..', '.......']),
  heartc: spr(['.yy.yy.', 'yrryrry', 'yrwrrry', 'yrrrrry', '.yrrry.', '..yry..', '...y...']),
  scroll: spr(['#######', '#wwwww#', '#w###w#', '#wwwww#', '#w##ww#', '#wwwww#', '#######']),
  page: spr(['#####..', '#www##.', '#w#ww#.', '#wwww#.', '#w##w#.', '#wwww#.', '######.']),
};
const HEART = spr(['.##.##.', '#rr#rr#', '#rwrrr#', '#rrrrr#', '.#rrr#.', '..#r#..', '...#...']);
const CAT = spr(['.#.....#.', '.##...##.', '.#######.', '#########', '##w###w##', '#########', '.#######.', '..#####..', '.#######.', '#########']);
const ITEMS = {
  potion: { name: 'HEALTH POTION', zh: '生命药水', desc: '+2 HP', zhDesc: '生命 +2' },
  vial: { name: 'COLOR VIAL', zh: '色彩药剂', desc: '+50 color', zhDesc: '色彩 +50' },
  shard: { name: 'SHIELD SHARD', zh: '护盾碎片', desc: '+1 shield beyond max', zhDesc: '额外 +1 护盾' },
  whet: { name: 'WHETSTONE', zh: '磨刀石', desc: 'your weapon +1 ★', zhDesc: '手中武器 +1 ★' },
  heartc: { name: 'HEART CRYSTAL', zh: '心之水晶', desc: '+1 max HP', zhDesc: '最大生命 +1' },
  scroll: { name: 'TREASURE MAP', zh: '藏宝图', desc: 'reveals this level', zhDesc: '揭示本层地图' },
  page: { name: 'DIARY PAGE', zh: '日记残页', desc: "from the alchemist's diary", zhDesc: '炼金师日记的一页' },
  orb: { name: 'RUNE', zh: '符文', desc: 'choose 1 of 3', zhDesc: '三选一' },
  orb2: { name: 'RARE RUNE', zh: '稀有符文', desc: 'choose 1 of 3, rare and legendary more likely', zhDesc: '三选一，稀有与传说更常出现' },
  restock: { name: 'RESTOCK', zh: '补货', desc: 'refill every shelf (costs more each time)', zhDesc: '刷新全部货架（每次更贵）' },
};
const CHESTS = { wood: { name: 'WOODEN CHEST', zh: '木箱' }, ink: { name: 'IRON CHEST', zh: '铁箱' }, gold: { name: 'GOLDEN CHEST', zh: '黄金宝箱' } };
const ALTARS = {
  blood: { name: 'BLOOD ALTAR', zh: '鲜血祭坛', desc: 'Give 2 max HP. Receive a legendary rune.', zhDesc: '献上 2 点最大生命，换取一枚传说符文。' },
  gold: { name: 'GOLD ALTAR', zh: '黄金祭坛', desc: 'Give gold. +1 max HP and full heal.', zhDesc: '献上金币，最大生命 +1 并回满。' },
  ink: { name: 'MANA ALTAR', zh: '魔力祭坛', desc: 'Give 50 color. Your weapon +1 ★.', zhDesc: '献上 50 点色彩，手中武器 +1 ★。' },
};
const FRAGC = { red: C.red, cyan: C.cyan, gold: C.gold };
const DIFFS = [
  { id: 'sketch', name: 'EASY', zh: '简单', desc: 'Gentle: fewer, softer foes, slower bullets, +2 HP. Crystals ×0.6.', zhDesc: '轻松：敌人更少更弱，子弹更慢，生命 +2。色晶 ×0.6。', ehp: 0.7, budget: 0.8, bs: 0.85, tempo: 0.9, elite: 0, hp: 2, boss: 0.75, gold: 1 },
  { id: 'wash', name: 'NORMAL', zh: '普通', desc: 'The intended challenge.', zhDesc: '标准：设计好的挑战。', ehp: 1, budget: 1, bs: 1, tempo: 1, elite: 0, hp: 0, boss: 1, gold: 1 },
  { id: 'heavy', name: 'HARD', zh: '困难', desc: 'Hard: tougher, faster foes and more elites. Crystals ×1.4.', zhDesc: '困难：敌人更硬更快，精英更多。色晶 ×1.4。', ehp: 1.4, budget: 1.3, bs: 1.1, tempo: 1.08, elite: 0.1, hp: 0, boss: 1.3, gold: 1 },
  { id: 'scorched', name: 'NIGHTMARE', zh: '噩梦', desc: 'Nightmare: everything hits back harder, -1 HP. Crystals ×1.8.', zhDesc: '噩梦：一切都更凶狠，生命 -1。色晶 ×1.8。', ehp: 1.8, budget: 1.6, bs: 1.25, tempo: 1.2, elite: 0.22, hp: -1, boss: 1.65, gold: 1 },
];
// curses: optional stackable challenges (Hades-heat style), unlocked after a first win; each one adds +10% crystals
const MARKS = [
  { id: 'swift', name: 'FRENZY', zh: '狂躁', desc: 'Foes act 15% faster.', zhDesc: '敌人行动快 15%。', ap: d => { d.tempo *= 1.15; } },
  { id: 'thick', name: 'THICK HIDE', zh: '厚皮', desc: 'Foes and guardians have 30% more HP.', zhDesc: '敌人与首领生命 +30%。', ap: d => { d.ehp *= 1.3; d.boss *= 1.3; } },
  { id: 'rain', name: 'BULLET STORM', zh: '弹雨', desc: 'Enemy bullets fly 15% faster.', zhDesc: '敌方子弹快 15%。', ap: d => { d.bs *= 1.15; } },
  { id: 'elite', name: 'ELITE HORDE', zh: '精英潮', desc: '+15% elite chance.', zhDesc: '精英出现率 +15%。', ap: d => { d.elite += 0.15; } },
  { id: 'brittle', name: 'THIN SHIELD', zh: '薄盾', desc: '-1 shield.', zhDesc: '护盾 -1。', ap: d => { d.sh -= 1; } },
  { id: 'pricey', name: 'HIGH PRICES', zh: '高价', desc: 'Everything costs 40% more.', zhDesc: '所有价格 +40%。', ap: d => { d.shop *= 1.4; } },
  { id: 'thirst', name: 'WEAK POTIONS', zh: '药效减弱', desc: 'Health potions heal 1 instead of 2.', zhDesc: '生命药水只回复 1 点生命。', ap: d => { d.flask = 1; } },
];
function runDiff() {
  const d = Object.assign({ sh: 0, shop: 1, flask: 2 }, DIFFS[OPT.diff]); d.heat = 0;
  for (const m of MARKS.slice(0, OPT.heat)) { m.ap(d); d.heat++; }
  return d;
}
G.diff = runDiff();

/* ---------------- run flow ---------------- */
function resetRunState() {
  if (!metaHero(OPT.hero)) OPT.hero = 'knight';
  G.diff = runDiff(); G.hero = OPT.hero;
  newPlayer(); G.gl = {}; G.synOn = new Set(); G.frags = {}; G.blessings = []; G.hpBonus = G.diff.hp; G.freeRR = 0; G.wsOn = new Set(); recalc(); P.hp = P.maxHp; P.sh = P.maxSh;
  Object.assign(G, { coinChain: 0, coinChainT: 0, floor: 0, depth: 0, sub: 0, coins: 15 * metaTal('purse'), gems: 0, gemsB: 0, gemsGot: 0, breathUsed: false, cleanN: 0, vacT: 0, fought: [], bossPlan: [], kills: 0, atk: 0, rerolls: 0, leechN: 0, holeN: 0, darkOn: false, dark: 0, tint: null, victory: 0, trans: null, intro: null, freeze: 0, slowT: 0, slowS: 1, active: null, pageNext: 0, pageSpawned: 0, pages: [], seenFoes: new Set(), stillT: 0,
    mirageN: 0, aegisR: false, aegisT: 10, martyrT: 0, tailT: 0, grN: 0, grT: 0, focE: null, focN: 0, jackN: 0, condN: 0, glN: 0, bloodN: 0, atkAll: 0, basT: 0, conT: 0, boltT: 0, secT: 0, lastHurtT: -99, dashEndT: -9, roomHurt: false });
  G.stats = { kills: 0, rooms: 0, time: 0, combo: 0, dmg: 0 };
  cv.style.filter = ''; G._filter = '';
}
function startRun() {
  if (G.state !== 'title' && G.state !== 'end') bankGems(); // restarting mid-run still keeps the crystals found
  AU.init(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  $('title').hidden = true; $('end').hidden = true; $('pause').hidden = true; $('cards').hidden = true;
  resetRunState(); LB.ticket();
  enterFloor(0);
  G.state = 'play'; UI.showHUD(true); UI.all(); UI.bossBar(null); UI.bars(false);
  AU.music('calm');
  const floorBanner = () => { UI.banner(floorTxt(0), LANG === 'zh' ? BIOMES[0].zhSub : BIOMES[0].sub); later(3, () => UI.tip('skill')); later(14, () => UI.tip('lab')); };
  if (G.introSeen) floorBanner(); else { G.introSeen = true; const lines = STORY.intro.slice(); lines[4] = STORY.heroIntro[G.hero]; talk(null, lines, floorBanner, true); }
}
function toTitle() { if (G.state !== 'title' && G.state !== 'end') bankGems(); G.victory = 0; G.flashInv = 0; cv.style.filter = G._filter = ''; document.body.classList.remove('lowhp', 'cine'); $('end').hidden = true; $('pause').hidden = true; UI.showHUD(false); G.state = 'title'; titleScene(); $('title').hidden = false; AU.music('menu'); }
function titleScene() {
  newPlayer(); G.gl = {}; G.synOn = new Set(); G.frags = {}; G.blessings = []; recalc(); G.floor = 0; G.depth = 0;
  G.room = null; G.cur = null; // the title paints its own landscape; floor 0 is built when the run starts
  Object.assign(G, { enemies: [], bullets: [], fx: [], tele: [], picks: [], parts: [], nums: [], timers: [], tint: null, dark: 0, darkOn: false });
  P.x = -999; P.y = -999; P.dead = true;
}
function enterFloor(d) {
  G.depth = d; G.floor = d >> 1; G.sub = d & 1; AU.biome(G.floor);
  if (d === 2) goal('lv2'); else if (d === 4) goal('lv3'); else if (d === 6) goal('lv4');
  if (d > 0 && !G.sub) { G.gems++; UI.gems(); } // a new biome reached
  const L = genFloor(d);
  Object.assign(G, { room: L, cur: L.start, active: null, enemies: [], bullets: [], fx: [], tele: [], picks: [], timers: [], parts: [], nums: [], boss: null, darkOn: false, dark: 0, intro: null, tint: null });
  const s = L.start; s.visited = true; for (const n of s.links) n.seen = true;
  P.x = (s.x + s.w / 2) * T; P.y = (s.y + s.h / 2 + 2) * T; P.vx = P.vy = P.kx = P.ky = 0; P.dash = 0; P.lock = false;
  for (const w of P.ws) if (w) w.out = 0;
  P.haloHit = new Map(); gFloor();
  G.camX = P.x - VW / 2; G.camY = P.y - VH / 2;
  setupFloor(L, d);
  UI.floor(); UI.mapDirty = true;
}
function transition(cb) { if (G.trans) return; G.trans = { t: 0, mode: 'out', cb }; AU.dash(); }
function updTrans(rdt) {
  const tr = G.trans; tr.t += rdt;
  if (tr.mode === 'out' && tr.t >= 0.34) { tr.cb(); tr.mode = 'in'; tr.t = 0; }
  else if (tr.mode === 'in' && tr.t >= 0.42) G.trans = null;
}
const roomC = r => ({ x: (r.x + r.w / 2) * T, y: (r.y + r.h / 2) * T });
// nearest open floor tile to a room's centre (rooms always have floor around the middle)
function roomSpot(r) {
  const cx = r.x + (r.w >> 1), cy = r.y + (r.h >> 1) + 2, L = G.room; let any = null;
  for (let rad = 0; rad < Math.max(r.w, r.h); rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    const x = cx + dx, y = cy + dy, px = (x + 0.5) * T, py = (y + 0.5) * T;
    if (x < 0 || y < 0 || x >= L.w || y >= L.h || L.t[y * L.w + x] !== TF || L.rid[y * L.w + x] !== r.id) continue;
    if (!hitsWall(px, py, P.r + 2)) return { x: px, y: py };
    any = any || { x: px, y: py }; // a cramped room still has floor; take the closest one
  }
  return any;
}
const canTravel = r => !G.active && r && r.visited && r !== G.cur && !G.trans && !P.dead;
function travelTo(r) {
  if (!canTravel(r)) { AU.deny(); return; }
  UI.bigMap(false); AU.portal();
  transition(() => { const p = roomSpot(r); P.x = p.x; P.y = p.y; P.vx = P.vy = P.kx = P.ky = 0; P.dash = 0; G.cur = r; G.flowT = 0; G.camX = P.x - VW / 2; G.camY = P.y - VH / 2; P.fam = null; UI.mapDirty = true; });
}

/* ---------------- floor contents ---------------- */
// combat-room rewards are decided when the page is drawn, so the map and the gates can show them (route planning)
function rollReward() {
  const pend = G.room.rooms.filter(q => q.reward === 'page' && !q.cleared).length; // pages count only once actually dropped
  return wpick([['orb', 22], ['chest', 16], ['potion', 12], ['vial', 9], ['whet', 5], ['shard', 8], ['heartc', 2], ['page', G.pageSpawned + pend < 8 ? 8 : 0], ['gold', 6]], q => q[1])[0];
}
function setupFloor(L, d) {
  const f = d >> 1;
  for (const r of L.rooms) {
    const c = roomC(r);
    if (r.type === 'combat') r.reward = r.first ? 'orb' : rollReward(); else if (r.type === 'elite') r.reward = 'goldchest';
    if (r.type === 'start') {
      if (d === 0) {
        // the camp hub: hero statues (top), a rack with one weapon of each class (middle), rune stone for difficulty, the alchemist and her research table, a dummy
        const ids = ['mag', 'melee', 'charge', 'beam'].map(cls => pick(Object.keys(WEAPONS).filter(k => WEAPONS[k].cls === cls && metaW(k) && (WEAPONS[k].tier || 0) <= 1)));
        Object.keys(HEROES).forEach((id, i) => G.picks.push({ k: 'hero', id, x: c.x + (i - 1.5) * 46, y: c.y - 62, t: 0, tall: true }));
        ids.forEach((id, i) => G.picks.push({ k: 'weapon', id, lv: 1 + metaTal('armory'), x: c.x + (i - 1.5) * 44, y: c.y - 16, t: 0, hub: true, ped: true }));
        G.picks.push({ k: 'diff', x: c.x - 98, y: c.y + 30, t: 0, tall: true });
        if (OPT.rec.wins.some(w => w > 0)) G.picks.push({ k: 'heat', x: c.x - 98, y: c.y - 30, t: 0, tall: true });
        G.picks.push({ k: 'npc', id: 'painter', x: c.x + 98, y: c.y - 30, t: 0, tall: true });
        G.picks.push({ k: 'lab', x: c.x + 98, y: c.y + 12, t: 0, tall: true });
        const dm = mkEnemy('dummy', c.x + 96, c.y + 56, false); dm.dummy = true; G.enemies.push(dm);
        setGates(r, true);
      } else if (!G.sub) G.picks.push({ k: 'stele', f, x: c.x, y: c.y - 2 * T, t: 0, tall: true });
    } else if (r.type === 'shop') {
      r.restock = 0; shopStock(r, c, d);
      G.picks.push({ k: 'shop', item: 'restock', x: c.x + 3 * 36, y: c.y + 40, t: 0, rid: r.id, price: 12 });
      G.picks.push({ k: 'cat', x: c.x, y: (r.y + 2.6) * T, t: 0, say: pick(STORY.merchant), tall: true });
    } else if (r.type === 'chest') {
      G.picks.push({ k: 'chest', v: Math.random() < 0.5 ? 'ink' : 'wood', x: c.x, y: c.y, t: 0, tall: true });
      if (G.pageSpawned < 8 && Math.random() < 0.7) { G.pageSpawned++; G.picks.push({ k: 'item', id: 'page', x: c.x + 3 * T, y: c.y + T, t: 0 }); }
    } else if (r.type === 'shrine') {
      ['blood', 'gold', 'ink'].forEach((v, i) => G.picks.push({ k: 'altar', v, x: c.x + (i - 1) * 60, y: c.y, t: 0, tall: true, rid: r.id }));
    } else if (r.type === 'npc') {
      G.picks.push({ k: 'npc', id: STORY.npcByFloor[f], x: c.x, y: c.y, t: 0, tall: true });
    } else if (RX_ROOMS[r.type]) RX_ROOMS[r.type].setup(r, c, f);
  }
}

// six shelves: two rune choices (one rare), a weapon, a potion, a shield or vial, a heart crystal or whetstone; prices climb with depth
function shopStock(r, c, d) {
  for (const q of G.picks) if (q.k === 'shop' && q.rid === r.id && q.item !== 'restock') q.dead = true;
  const items = [{ item: 'orb', price: 30 + 6 * d }, { item: 'orb2', price: 55 + 8 * d }, { item: 'weapon', id: randWeapon(1), price: 30 + 5 * d }, { item: 'potion', price: 14 + 3 * d }, { item: pick(['shard', 'vial']), price: 14 + 3 * d }, { item: Math.random() < 0.25 ? 'heartc' : 'whet', price: 40 + 6 * d }];
  items.forEach((it, i) => G.picks.push(Object.assign({ k: 'shop', x: c.x + (i - 2.5) * 36, y: c.y + 10, t: 0, rid: r.id }, it)));
}

/* ---------------- rooms: activation, waves, clear ---------------- */
const POOLS = [
  [['inkling', 4], ['gunner', 3], ['bomber', 2], ['moth', 2.5], ['scribe', 2], ['bookworm', 1.2], ['charger', 1], ['turret', 1], ['inkpot', 1.2], ['quill', 2], ['mimic', 1], ['necro', 1.2]],
  [['inkling', 2], ['gunner', 2], ['bomber', 1.5], ['leech', 2.5], ['bloater', 2], ['golem', 1.2], ['toad', 2], ['shield', 1.5], ['wisp', 1.2], ['sniper', 1.2], ['eel', 2], ['spore', 1.8], ['sapper', 1.8], ['squid', 1.5]],
  [['gunner', 2], ['charger', 1.5], ['sniper', 1.8], ['shield', 1.5], ['mirror', 2], ['lantern', 1.5], ['shade', 2], ['prismlet', 2], ['wisp', 1.2], ['turret', 1], ['scribe', 1], ['clockwork', 2], ['bell', 1.2], ['arcdrone', 1.5], ['sawblade', 1.8]],
  [['inkling', 1], ['gunner', 1.5], ['charger', 1.5], ['sniper', 1.5], ['shield', 1.2], ['wisp', 1.2], ['mirror', 1.5], ['lantern', 1.2], ['shade', 1.5], ['prismlet', 1.5], ['golem', 1], ['toad', 1], ['bloater', 1], ['scribe', 1], ['bookworm', 1], ['smudge', 2], ['sketch', 2], ['clockwork', 1], ['eel', 1], ['lens', 1.2], ['echo', 1.5], ['necro', 0.8], ['sawblade', 0.8]],
];
function buildWaves(r) {
  if (RX_ROOMS[r.type] && RX_ROOMS[r.type].waves) return RX_ROOMS[r.type].waves(r);
  const f = G.floor, d = G.depth, elite = r.type === 'elite', pool = POOLS[f].filter(p => EDEF[p[0]]);
  const nW = 2 + (d >= 2 ? 1 : 0) + (elite ? 1 : 0), waves = [];
  for (let w = 0; w < nW; w++) {
    let budget = (4.5 + d * 1.6 + r.dist * 0.6 + w * 1.5) * G.diff.budget; const list = []; let turrets = 0;
    for (let guard = 0; budget > 0 && list.length < 14 && guard < 60; guard++) {
      const [type] = wpick(pool, x => x[1]); const D = EDEF[type];
      const fixed = EDEF[type].anchored; // turrets, ink pots, bells: at most two per wave
      if (fixed && turrets >= 2) continue;
      if (fixed) turrets++;
      for (let g = 0; g < (D.group || 1); g++) list.push({ type, elite: Math.random() < (d >= 6 ? 0.08 : d >= 4 ? 0.04 : 0) + G.diff.elite });
      budget -= D.cost || 1;
    }
    waves.push(list);
  }
  if (elite) { const opts = pool.map(p => p[0]).filter(t => (EDEF[t].cost || 1) >= 2); for (let k = 0; k < 2; k++) waves[waves.length - 1].push({ type: pick(opts), elite: true }); waves.push([{ mini: Object.keys(MINIS).find(k => MINIS[k].floor === f) }]); }
  if (r.first) waves[0] = waves[0].slice(0, 4);
  return waves;
}
function spawnWave(list) {
  const used = [];
  list.forEach((s, i) => {
    if (s.mini) { const b = mkMini(s.mini); b.hp = b.maxHp = Math.round(b.maxHp * G.diff.boss); G.enemies.push(b); UI.bossBar(b); UI.banner(tn(b.BD), LANG === 'zh' ? b.BD.zhTitle : b.BD.title, 'red'); return; }
    const p = randFloor(85, used); used.push(p); spawnEnemy(s.type, p.x, p.y, s.elite, 0.7 + i * 0.06); if (s.elite) later(1, () => UI.tip('elite'));
  });
}
const aliveFoes = () => { let n = 0; for (const e of G.enemies) if (!e.dead && !e.dummy && !e.parent) n++; return n; };
function updRooms(dt) {
  const r = roomAt(P.x, P.y);
  if (r && r !== G.cur) { G.cur = r; G.flowT = 0; }
  if (r && !r.visited) { r.visited = true; for (const n of r.links) n.seen = true; UI.mapDirty = true; G.stats.rooms++; }
  if (r && !r.cleared && !r.active && !G.active && !(RX_ROOMS[r.type] && RX_ROOMS[r.type].manual) && deepIn(r, P)) activateRoom(r);
  const A = G.active;
  if (!A || A.type === 'boss') return;
  const alive = aliveFoes();
  A.waveT -= dt;
  let next = false;
  if (A.wave < 0) next = A.waveT <= 0;
  else if (A.wave < A.waves.length - 1) { if (alive === 0) { A.gap += dt; next = A.gap > 0.6; } else next = alive <= 2 && A.waveT <= 0; }
  if (next) { A.wave++; spawnWave(A.waves[A.wave]); A.waveT = 8; A.gap = 0; }
  else if (A.wave === A.waves.length - 1 && alive === 0) clearRoom(A);
}
function activateRoom(r) {
  r.active = true; G.active = r; setGates(r, true); AU.gate(); G.flowT = 0; G.roomHurt = false;
  if (r.type === 'boss') { startBoss(r); return; }
  r.waves = buildWaves(r); r.wave = -1; r.waveT = 0.5; r.gap = 0; AU.music('combat');
}
function clearRoom(r) {
  r.cleared = true; r.active = false; G.active = null; setGates(r, false); AU.gate();
  slowmo(0.7, 0.3); AU.clear(); UI.stamp(t('clear')); P.sh = Math.max(P.sh, P.maxSh); UI.hp(); UI.mapDirty = true; gClear(r);
  AU.music('calm'); G.vacT = 3; // every coin on the floor flies to you
  if (G.stats.rooms >= 3) UI.tip('map');
  if (!G.roomHurt) { const n = 2 + (G.depth >> 1); for (let i = 0; i < n; i++) dropCoin(P.x, P.y - 10); UI.toast(`${t('flawless')} <small>+${n}</small>`, 'y'); if (++G.cleanN >= 5) goal('clean5'); } else G.cleanN = 0;
  if (r.type === 'elite') dropGem(P.x, P.y - 10, 2);
  later(0.4, () => spawnRoomReward(r));
}
function spawnRoomReward(r) {
  if (RX_ROOMS[r.type] && RX_ROOMS[r.type].reward) { RX_ROOMS[r.type].reward(r); return; }
  const { x, y } = roomC(r), d = G.depth;
  for (let i = 0; i < randi(1, 3) + (d >> 2); i++) dropCoin(x, y);
  const roll = r.reward;
  if (roll === 'goldchest') G.picks.push({ k: 'chest', v: 'gold', x, y, t: 0, tall: true });
  else if (roll === 'orb') G.picks.push({ k: 'orb', tier: 0, x, y, t: 0 });
  else if (roll === 'chest') G.picks.push({ k: 'chest', v: Math.random() < 0.6 ? 'wood' : 'ink', x, y, t: 0, tall: true });
  else if (roll === 'gold') for (let i = 0; i < 10 + d * 2; i++) dropCoin(x, y);
  else { if (roll === 'page') G.pageSpawned++; dropItem(roll, x, y, true); }
  ringFx(x, y, 4, 40, 0.5, C.white, 2); burst(x, y, 16, C.white, 120, 0.5);
}
function randWeapon(minTier = 0) {
  const held = P.ws.filter(Boolean).map(w => w.id), maxT = Math.min(2, Math.floor(G.depth / 3) + 1), all = Object.keys(WEAPONS).filter(k => metaW(k) && !held.includes(k));
  let opts = all.filter(k => (WEAPONS[k].tier || 0) <= Math.max(maxT, minTier) && (WEAPONS[k].tier || 0) >= Math.min(minTier, maxT));
  if (!opts.length) opts = all;
  return wpick(opts, k => [5, 3, 1.5][WEAPONS[k].tier || 0]);
}

/* ---------------- bosses ---------------- */
function startBoss(r) {
  const f = G.floor, kinds = Object.keys(BOSSES).filter(k => BOSSES[k].floor === f);
  let kind, echo = false;
  if (G.depth === 7 || !G.fought.length && f === 3) kind = 'prism';
  else if (f === 3) { kind = pick(G.fought); echo = true; }
  else { G.bossPlan[f] = G.bossPlan[f] || shuffle(kinds.slice()); kind = G.bossPlan[f][G.sub] || pick(kinds); }
  G.fought.push(kind);
  const b = mkBoss(kind); b.echo = echo; b.hp = b.maxHp = Math.round(b.maxHp * G.diff.boss * (echo ? 1.4 + 0.3 * (2 - BOSSES[kind].floor) : G.sub && f < 3 ? 1.12 : 1));
  G.enemies.push(b); G.boss = b; P.lock = true; AU.music('off'); G.intro = { b }; UI.bars(true);
  later(0.5, () => { UI.bossIntro(b); AU.roar(kind === 'eye' ? 0.7 : kind === 'prism' ? 1.6 : 1); shake(0.25); });
  later(2.9, () => { P.lock = false; b.intro = false; b.inv = false; UI.bars(false); UI.bossBar(b); AU.music('boss'); G.intro = null; });
}
function onBossDefeated(b) {
  G.boss = null; G.darkOn = false; G.tint = null; AU.music('calm');
  const r = G.active; if (r) { r.cleared = true; r.active = false; setGates(r, false); } G.active = null; UI.mapDirty = true;
  for (let i = 0; i < 8 + G.depth; i++) dropCoin(b.x, b.y);
  dropGem(b.x, b.y, 4 + G.depth); G.vacT = 4; goal('boss1');
  const ln = b.BD.lines && b.BD.lines.death;
  if (G.depth >= 7) { later(0.8, () => victory()); return; }
  const c = roomC(G.cur);
  later(0.9, () => {
    UI.banner(tn(b.BD) + ' · ' + t('falls'), ln ? lx(ln) : t('pageReturns'), 'gold');
    if (b.BD.frag && !G.frags[b.BD.frag]) G.picks.push({ k: 'frag', c: b.BD.frag, x: c.x, y: c.y + 14, t: 0 }); else dropItem('whet', c.x, c.y + 14, true);
    G.picks.push({ k: 'orb', tier: 2, x: c.x - 40, y: c.y + 14, t: 0 });
    dropItem('potion', c.x + 40, c.y + 14, true);
    G.picks.push({ k: 'portal', x: c.x, y: c.y - 40, t: 0 });
    AU.portal(); P.sh = Math.max(P.sh, P.maxSh); UI.hp();
  });
}
function onMiniDefeated(b) {
  for (let i = 0; i < 4 + (G.depth >> 1); i++) dropCoin(b.x, b.y);
  dropGem(b.x, b.y, 3); G.vacT = 3; G.picks.push({ k: 'orb', tier: 1, x: b.x, y: b.y, t: 0 });
  dropItem('potion', b.x, b.y);
  const ln = b.BD.lines && b.BD.lines.death;
  UI.banner(tn(b.BD) + ' · ' + t('falls'), ln ? lx(ln) : '', 'gold');
}
function victory() {
  G.victory = 0.001; AU.music('win');
  UI.banner(t('win'), '', 'chroma'); AU.chroma();
  for (let i = 0; i < 6; i++) later(0.4 + i * 0.25, () => { for (let k = 0; k < 30; k++) { const a = rand(TAU); part(P.x, P.y, Math.cos(a) * rand(60, 240), Math.sin(a) * rand(60, 240), rand(0.8, 1.6), hue(rand(360)), randi(1, 3), { drag: 0.92 }); } });
  later(3.2, () => talk(null, STORY.ending, () => endRun(true), true));
}
function playerDie() {
  P.dead = true; slowmo(1.4, 0.2); invFlash(3); shake(0.6);
  inkDrops(P.x, P.y, 0, 50, Math.PI, 200); splat(P.x, P.y, 9); AU.boom(1.5); AU.music('dead');
  later(1.5, () => endRun(false));
}
function endRun(win) {
  if (G.state === 'end') return;
  if (win) { if (OPT.diff >= 1) goal('win'); if (OPT.diff >= 2) goal('winHard'); if (G.diff.heat >= 3) goal('heat3'); }
  G.state = 'end';
  const R = OPT.rec; R.runs++; R.deep = Math.max(R.deep ?? -1, G.depth); if (win) { R.wins[OPT.diff]++; R.heat = Math.max(R.heat, G.diff.heat); } saveOpt();
  const n = bankGems();
  UI.end(win, n); LB.end(win);
}
function nextFloor() {
  enterFloor(G.depth + 1);
  UI.banner(floorTxt(G.depth), LANG === 'zh' ? BIOMES[G.floor].zhSub : BIOMES[G.floor].sub);
}

/* ---------------- pickups & items ---------------- */
function dropCoin(x, y) { const a = rand(TAU), s = rand(30, 110); G.picks.push({ k: 'coin', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 }); }
function dropSoul(x, y) { const a = rand(TAU), s = rand(40, 100); G.picks.push({ k: 'soul', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 }); }
function dropItem(id, x, y, still) { const a = rand(TAU), s = still ? 0 : rand(20, 60); G.picks.push({ k: 'item', id, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 }); }
function useItem(p) {
  const id = p.id;
  if (id === 'potion') { if (P.hp >= P.maxHp) return false; healP(G.diff.flask); }
  else if (id === 'vial') { if (P.chromaT > 0) return false; P.chroma = Math.min(100, P.chroma + 50); if (P.chroma >= 100) UI.chromaReady(); AU.soul(); }
  else if (id === 'shard') { P.sh = Math.min(P.maxSh + 2, P.sh + 1); AU.shieldUp(); UI.hp(); }
  else if (id === 'whet') { const w = curW(); if (!w) return false; if ((w.lv || 1) >= 3) { if (!p.warned) { UI.toast(t('maxLv'), 'r'); p.warned = true; } return false; } const pw = power(); w.lv = (w.lv || 1) + 1; AU.charged(); UI.weapons(); UI.powerUp(pw, tn(ITEMS.whet)); UI.tip('star'); sparks(P.x, P.y, -Math.PI / 2, 10, C.gold, 120, 1.2); }
  else if (id === 'heartc') { G.hpBonus++; recalc(); P.hp = Math.min(P.maxHp, P.hp + 1); AU.heal(); UI.hp(); }
  else if (id === 'scroll') { revealMap(); }
  else if (id === 'page') { const i = G.pageNext++; G.pages.push(i); talk({ name: 'DIARY PAGE', zh: '日记残页', spr: null }, [STORY.pages[i]]); }
  if (id !== 'page') UI.toast(`${tn(ITEMS[id])} <small>${td(ITEMS[id])}</small>`, id === 'whet' || id === 'heartc' ? 'y' : id === 'vial' ? 'c' : '');
  AU.pickup();
  return true;
}
function revealMap() { for (const r of G.room.rooms) r.seen = true; G.revealed = true; UI.mapDirty = true; AU.page(); }
function updPicks(dt) {
  G.coinChainT -= dt; if (G.coinChainT <= 0) G.coinChain = 0;
  if (G.vacT > 0) G.vacT -= dt;
  for (const p of G.picks) {
    p.t += dt;
    const dd = Math.hypot(P.x - p.x, P.y - p.y);
    if (p.k === 'coin' || p.k === 'soul' || p.k === 'gem' || p.k === 'item') {
      if (p.vx) { const k = Math.exp(-dt * 5); p.vx *= k; p.vy *= k; }
      const vac = p.k === 'coin' && G.vacT > 0 && p.t > 0.3 && !G.active; // after a fight every coin flies home
      const pull = p.k === 'soul' || p.k === 'gem' ? (p.t > 0.3 ? 1 : 0) : p.k === 'coin' ? (vac || p.t > 0.4 && dd < S.magnet ? 1 : 0) : 0;
      if (pull && !P.dead) { const sp = p.k === 'soul' || p.k === 'gem' || vac ? 260 + p.t * 300 : 200; p.vx = lerp(p.vx, (P.x - p.x) / (dd || 1) * sp, 0.2); p.vy = lerp(p.vy, (P.y - p.y) / (dd || 1) * sp, 0.2); }
      if (p.vx) { p.x += p.vx * dt; p.y += p.vy * dt; }
      if (p.k === 'item') { if (dd < 10 && p.t > 0.3 && !P.dead && G.state === 'play' && useItem(p)) p.dead = true; continue; }
      if (dd < 7 && p.t > 0.15 && !P.dead) {
        p.dead = true;
        if (p.k === 'coin') { G.coins++; gCoin(); AU.coin(G.coinChain++); G.coinChainT = 0.5; part(p.x, p.y, 0, -30, 0.3, C.gold, 1); }
        else if (p.k === 'gem') { G.gems++; AU.coin(10); UI.gems(); burst(p.x, p.y, 4, hue(G.t * 300), 60, 0.3); }
        else { gainChroma(4); AU.soul(); }
      }
    } else if (p.k === 'orb') {
      if (dd < 11 && G.state === 'play' && !G.trans && !P.dead) { p.dead = true; openCards(p.tier); }
      if (Math.random() < 0.3) part(p.x + rand(-6, 6), p.y + 4, 0, rand(-40, -20), 0.6, p.tier ? C.gold : C.cyan, 1, { drag: 0.96 });
    } else if (p.k === 'frag') {
      if (Math.random() < 0.5) part(p.x + rand(-8, 8), p.y + rand(-4, 8), 0, rand(-50, -20), 0.7, FRAGC[p.c], 1, { drag: 0.96 });
      if (dd < 12 && G.state === 'play' && !P.dead) { p.dead = true; takeFrag(p.c); }
    } else if (p.k === 'rx') { if (RX[p.v].upd) RX[p.v].upd(p, dt);
    } else if (p.k === 'portal') {
      if (Math.random() < 0.6) { const a = rand(TAU); part(p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 10, -Math.cos(a) * 30, -Math.sin(a) * 18 - 10, 0.6, pick([C.ink, C.dk, C.white]), 1, { drag: 0.95 }); }
      if (dd < 12 && !G.trans && !G.picks.some(q => q.k === 'frag')) { p.dead = true; transition(nextFloor); }
    }
  }
  G.picks = G.picks.filter(p => !p.dead);
}
function takeFrag(c) {
  const pw = power(); G.frags[c] = true; recalc(); UI.frags(); UI.powerUp(pw, tn(STORY.frag[c]));
  const F = STORY.frag[c];
  hitstop(0.1); invFlash(2); slowmo(0.8, 0.3); AU.frag();
  for (let i = 0; i < 4; i++) ringFx(P.x, P.y, 4, 40 + i * 30, 0.4 + i * 0.1, FRAGC[c], 2);
  UI.banner(tn(F), td(F), c === 'red' ? 'red' : c === 'gold' ? 'gold' : 'cyan');
}
function openCards(tier, title, roller) {
  G.state = 'cards'; AU.pickup(); hitstop(0.05);
  roller = roller || (() => rollGlyphs(3, tier));
  UI.cards(roller(), tier, g => {
    takeGlyph(g.id); AU.select(); invFlash(1);
    UI.toast(g.sy ? `${t('resonance')} · ${tn(g)}` : `${tn(g)} ${lvTxt(G.gl[g.id])}`, ['', 'c', 'y', 'y'][g.rar]);
    if (G.synOn.size >= 3) goal('res3'); if (Object.values(G.st).some(k => k >= 3)) goal('school3');
    ringFx(P.x, P.y, 4, 46, 0.4, g.rar >= 2 ? C.gold : g.rar === 1 ? C.cyan : C.white, 2);
    G.state = 'play';
  }, title, roller);
}
function openChest(p) {
  p.open = true; p.t = 0; AU.chest(); burst(p.x, p.y - 6, 14, p.v === 'gold' ? C.gold : C.white, 90, 0.5);
  const x = p.x, y = p.y + 14;
  later(0.25, () => {
    if (p.v === 'wood') { if (Math.random() < 0.55) G.picks.push({ k: 'weapon', id: randWeapon(0), lv: Math.random() < 0.15 + G.depth * 0.05 ? 2 : 1, x, y, t: 0 }); else { for (let i = 0; i < 6 + G.depth; i++) dropCoin(x, y); dropItem(pick(['potion', 'vial', 'shard', 'scroll']), x, y); } }
    else if (p.v === 'ink') { G.picks.push({ k: 'orb', tier: 0, x, y, t: 0 }); dropItem(pick(['potion', 'vial', 'whet']), x + 14, y); }
    else { G.picks.push({ k: 'orb', tier: 1, x, y, t: 0 }); if (Math.random() < 0.35) G.picks.push({ k: 'weapon', id: randWeapon(1), lv: 2, x: x + 22, y, t: 0 }); for (let i = 0; i < 6; i++) dropCoin(x, y); }
  });
}
function useAltar(p) {
  const v = p.v;
  if (v === 'blood') { if (P.maxHp <= 3) { AU.deny(); return; } G.hpBonus -= 2; recalc(); openCards(3, t('shrineGlyph')); }
  else if (v === 'gold') { const gc = altarGold(); if (G.coins < gc) { AU.deny(); UI.toast(t('noGold'), 'r'); return; } G.coins -= gc; G.hpBonus++; recalc(); P.hp = P.maxHp; AU.heal(); UI.hp(); }
  else { if (P.chroma < 50 || P.chromaT > 0) { AU.deny(); return; } const w = curW(); if (!w || (w.lv || 1) >= 3) { AU.deny(); UI.toast(t('maxLv'), 'r'); return; } const pw = power(); P.chroma -= 50; w.lv = (w.lv || 1) + 1; UI.weapons(); UI.powerUp(pw, tn(ALTARS.ink)); UI.tip('star'); }
  AU.altar(); invFlash(1);
  for (const q of G.picks) if (q.k === 'altar' && q.rid === p.rid) { q.used = true; burst(q.x, q.y - 8, 10, C.lt, 60, 0.5); }
  ringFx(p.x, p.y - 8, 4, 50, 0.6, v === 'blood' ? C.red : v === 'gold' ? C.gold : C.cyan, 2);
}
function npcGift(p) {
  const id = STORY.npcs[p.id].gift, c = { x: p.x, y: p.y + 18 };
  if (id === 'map') { revealMap(); for (let i = 0; i < 10; i++) dropCoin(c.x, c.y); }
  else if (id === 'violet') { const pw = power(); G.blessings.push({ id: 'violet', name: STORY.npcs.violet.name, zh: STORY.npcs.violet.zh, ap: s => { s.over += 1; } }); recalc(); UI.powerUp(pw, tn(STORY.npcs.violet)); P.chroma = 100; UI.chromaReady(); }
  else if (id === 'weapon') G.picks.push({ k: 'weapon', id: randWeapon(2), lv: 2, x: c.x, y: c.y, t: 0 });
  else if (id === 'blessing') { P.hp = P.maxHp; UI.hp(); openCards(2, t('bossGlyph')); }
  AU.altar();
}
const price = p => Math.round((p.item === 'restock' ? p.price * (1 + G.room.rooms[p.rid].restock) : p.price) * S.shop);
const altarGold = () => Math.round((30 + 3 * G.depth) * S.shop);
const inHub = () => G.depth === 0 && G.stats.rooms === 0; // hero / difficulty choices stay open until you leave the camp
function interactables() { return G.picks.filter(p => (((p.k === 'hero' || p.k === 'diff' || p.k === 'heat' || p.k === 'lab') && inHub()) || p.k === 'weapon' || p.k === 'shop' || p.k === 'npc' || p.k === 'stele' || (p.k === 'chest' && !p.open) || (p.k === 'altar' && !p.used) || (p.k === 'rx' && !p.used))); }
function updInteract() {
  G.prompt = null; if (P.dead || P.lock) return;
  let best = null, bd = 24 * 24;
  for (const p of interactables()) { const dd = d2(p.x, p.y, P.x, P.y); if (dd < bd) { bd = dd; best = p; } }
  if (!best) return;
  G.prompt = best;
  if (!KP.e) return;
  if (best.k === 'weapon') takeWeapon(best);
  else if (best.k === 'hero') setHero(best);
  else if (best.k === 'lab') LAB.open();
  else if (best.k === 'diff') { OPT.diff = (OPT.diff + 1) % DIFFS.length; saveOpt(); applyDiff(best); }
  else if (best.k === 'heat') { OPT.heat = (OPT.heat + 1) % (MARKS.length + 1); saveOpt(); applyDiff(best); }
  else if (best.k === 'chest') openChest(best);
  else if (best.k === 'altar') useAltar(best);
  else if (best.k === 'rx') RX[best.v].use(best);
  else if (best.k === 'stele') talk({ name: 'INSCRIPTION', zh: '碑文' }, [STORY.floorStele[best.f]]);
  else if (best.k === 'npc') { const N = STORY.npcs[best.id]; const first = !best.talked; talk(N, first ? N.lines : [N.lines[N.lines.length - 1]], () => { if (first) { best.talked = true; if (N.gift) npcGift(best); } }); }
  else if (best.k === 'shop') {
    if (G.coins < price(best)) { AU.deny(); UI.toast(t('noGold'), 'r'); return; }
    if (best.item === 'potion' && P.hp >= P.maxHp) { AU.deny(); UI.toast(t('whole'), 'r'); return; }
    if (best.item === 'whet' && (!curW() || (curW().lv || 1) >= 3)) { AU.deny(); UI.toast(t('maxLv'), 'r'); return; }
    G.coins -= price(best); AU.coin(8);
    if (best.item === 'restock') { const r = G.room.rooms[best.rid]; r.restock++; shopStock(r, roomC(r), G.depth); AU.page(); burst(best.x, best.y - 8, 10, C.gold, 80, 0.4); return; }
    best.dead = true;
    if (best.item === 'orb') openCards(0);
    else if (best.item === 'orb2') openCards(1);
    else if (best.item === 'weapon') takeWeapon({ k: 'weapon', id: best.id, lv: 1, x: best.x, y: best.y });
    else useItem({ id: best.item });
  }
}
// announce a weapon synergy the moment a held weapon and its partner glyph meet
function checkWSyn() {
  for (const w of P.ws) {
    if (!w || !wsyn(w) || G.wsOn.has(w.id)) continue;
    G.wsOn.add(w.id); const W = WEAPONS[w.id];
    later(0.3, () => { UI.banner(`${t('wsyn')} · ${tn(W.syn)}`, `${tn(W)} + ${tn(GL[W.syn.g])} — ${td(W.syn)}`, 'gold'); AU.synergy(); invFlash(1); UI.weapons(); UI.tip('wsyn'); });
  }
}
function setHero(p) {
  if (G.hero === p.id) return;
  if (!metaHero(p.id)) { AU.deny(); UI.toast(`${tn(HEROES[p.id])} <small>${t('labLocked', HERO_COST[p.id])}</small>`, 'r'); return; }
  OPT.hero = G.hero = p.id; saveOpt();
  const keep = { x: P.x, y: P.y, ws: P.ws, wi: P.wi }; newPlayer(); Object.assign(P, keep);
  recalc(); P.hp = P.maxHp; P.sh = P.maxSh; UI.all();
  AU.swap(); AU.altar(); invFlash(1); ringFx(p.x, p.y - 8, 4, 30, 0.4, HEROES[p.id].col, 2); burst(P.x, P.y - 4, 14, HEROES[p.id].col, 90, 0.4);
  UI.toast(`${tn(HEROES[p.id])} <small>${t('skill')} R · ${tn(HEROES[p.id].skill)}</small>`);
}
function applyDiff(p) {
  G.diff = runDiff(); G.hpBonus = G.diff.hp; recalc(); P.hp = P.maxHp; P.sh = P.maxSh; UI.hp();
  AU.page(); ringFx(p.x, p.y - 6, 4, 26, 0.35, OPT.diff >= 2 || p.k === 'heat' ? C.red : C.white, 2);
  UI.toast(p.k === 'heat' ? `${t('heat')} ${OPT.heat}` : `${t('diffT')} · ${tn(DIFFS[OPT.diff])} <small>${td(DIFFS[OPT.diff])}</small>`, OPT.diff >= 2 || p.k === 'heat' ? 'r' : '');
}
function takeWeapon(p) {
  const nw = mkWeapon(p.id, p.lv || 1); let dropped = null;
  if (!p.hub && !P.ws[0]) { P.ws[0] = nw; P.wi = 0; }
  else if (!p.hub && !P.ws[1]) { P.ws[1] = nw; P.wi = 1; }
  else { dropped = P.ws[P.wi]; P.ws[P.wi] = nw; }
  p.dead = true;
  if (dropped) G.picks.push({ k: 'weapon', id: dropped.id, lv: dropped.lv || 1, x: p.x, y: p.y, t: 0, hub: p.hub, ped: p.ped });
  AU.pickup(); AU.swap(); UI.weapons(); UI.toast(`${tn(WEAPONS[p.id])} <small>${wcls(WEAPONS[p.id])} · ${clsRule(WEAPONS[p.id])}</small>`); checkWSyn(); UI.tip('weapon');
  burst(p.x, p.y, 12, C.white, 80, 0.4);
  const s = G.room.start; if (p.hub && s.gates.length && G.room.t[s.gates[0].y * G.room.w + s.gates[0].x] === TD) { setGates(s, false); AU.gate(); }
}

/* ---------------- projectiles ---------------- */
function explodeGren(b) {
  blast(b.x, b.y, 30 * S.size, b.dmg, { col: b.ghost ? C.lt : null });
  splat(b.x, b.y, 5, b.ghost ? 'rgba(18,18,22,0.2)' : 'rgba(18,18,22,0.45)');
  inkDrops(b.x, b.y, 0, 12, Math.PI, 150);
}
function impact(b) { burst(b.x, b.y, 3, b.ghost ? C.lt : C.white, 60, 0.15); }
function collideP(b) {
  for (const e of G.enemies) {
    if (e.dead || e.inv || e.spawnT > 0 || e.hide) continue;
    if (b.kind === 'gren' && b.z > 8) continue;
    const rr = b.r + e.r; if (d2(b.x, b.y, e.x, e.y) > rr * rr) continue;
    const key = e.parent || e;
    if (b.kind === 'chak') { b.hitT = b.hitT || new Map(); const last = b.hitT.get(key) || -9; if (G.t - last < 0.22) continue; b.hitT.set(key, G.t); }
    else if (b.hitSet && b.hitSet.has(key)) continue;
    if (b.kind === 'gren') { explodeGren(b); b.dead = true; return; }
    const res = hit(e, b.dmg, { src: b.kind, kind: b.kind === 'wave' ? 'm' : 'b', a: Math.atan2(b.vy, b.vx), x: b.x, y: b.y, kb: b.kb, depth: b.depth, crit: b.crit, heavy: b.heavy });
    if (res === -1) { if (b.kind === 'chak') { b.ret = true; b.vx = -b.vx; b.vy = -b.vy; return; } b.dead = true; return; }
    if (b.onHit) b.onHit(b, e);
    if (b.dead) return;
    if (b.cluster) { blast(b.x, b.y, 14, 4 * FL(), { depth: b.depth + 1, noProc: true, quiet: true }); ringFx(b.x, b.y, 2, 14, 0.2, C.white, 1); }
    if (b.pierce > 0) { b.pierce--; (b.hitSet || (b.hitSet = new Set())).add(key); }
    else { b.dead = true; impact(b); return; }
  }
}
function updBullets(dt) {
  for (const b of G.bullets) {
    if (b.dead) continue;
    b.t += dt; b.life -= dt;
    if (b.upd) { b.upd(b, dt); if (b.dead) continue; }
    if (b.team === 'p' && !b.pb) { b.pb = 1; if (d2(b.x, b.y, P.x, P.y) < 900 && b.kind !== 'gren') { const ox = b.x, oy = b.y; b.x = (ox + P.x) / 2; b.y = (oy + P.y) / 2; collideP(b); if (!b.dead) { b.x = ox; b.y = oy; } else continue; } }
    if (b.team === 'e') {
      if (b.acc) { const sp = Math.hypot(b.vx, b.vy), ns = Math.max(10, sp + b.acc * dt); if (sp > 0) { b.vx *= ns / sp; b.vy *= ns / sp; } }
      if (b.turn && b.t < 2.5) { const a = Math.atan2(b.vy, b.vx), na = a + clamp(angDiff(a, angTo(b, P)), -b.turn * dt, b.turn * dt), sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
      if (b.curve) { const a = Math.atan2(b.vy, b.vx) + b.curve * dt, sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; }
      if (b.grav) b.vy += b.grav * dt;
      if (b.split && b.t >= b.split.t) { ring(b.x, b.y, b.split.n, b.split.spd, rand(TAU), { r: 2.5, col: b.col }); b.dead = true; AU.pop(); burst(b.x, b.y, 6, b.col || C.red, 60, 0.3); continue; }
    } else {
      if (b.home) {
        let best = null, bd = 170 * 170;
        for (const e of G.enemies) { if (e.dead || e.dummy || e.inv || e.hide) continue; const dd = d2(b.x, b.y, e.x, e.y); if (dd < bd) { bd = dd; best = e; } }
        if (best) { const a = Math.atan2(b.vy, b.vx), na = a + clamp(angDiff(a, angTo(b, best)), -b.home * dt, b.home * dt), sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
        if (b.kind === 'mote' && Math.random() < 0.5) part(b.x, b.y, 0, 0, 0.25, C.cyan, 1);
      }
      if (b.kind === 'chak') {
        if (!b.ret) { b.out -= dt; const k = Math.exp(-dt * 3); b.vx *= k; b.vy *= k; if (b.out <= 0) b.ret = true; }
        else {
          const a = angTo(b, P), sp = Math.min(440, Math.hypot(b.vx, b.vy) + 900 * dt);
          b.vx = lerp(b.vx, Math.cos(a) * sp, 0.25); b.vy = lerp(b.vy, Math.sin(a) * sp, 0.25);
          if (d2(b.x, b.y, P.x, P.y) < 64) { b.dead = true; if (!b.ghost && b.owner) b.owner.out = Math.max(0, b.owner.out - 1); AU.tink(); continue; }
        }
      }
      if (b.kind === 'gren') b.z = 4 * 20 * (b.t / b.tt) * (1 - b.t / b.tt);
      if (b.kind === 'wave') { const k = Math.exp(-dt * 2); b.vx *= k; b.vy *= k; }
    }
    const vm = b.team === 'e' ? G.diff.bs * (1 + 0.025 * G.depth) : 1; // difficulty and depth bullet speed, applied to the motion so re-aimed volleys keep it
    const n = Math.max(1, Math.min(60, Math.ceil(Math.hypot(b.vx, b.vy) * vm * dt / 4)));
    for (let i = 0; i < n && !b.dead; i++) {
      const sx = b.vx * vm * dt / n, sy = b.vy * vm * dt / n;
      b.x += sx; b.y += sy;
      if (!b.noWall && solidShot(b.x, b.y) && !(b.kind === 'chak' && b.ret) && !(b.kind === 'gren' && b.z > 7)) {
        if (b.team === 'p') {
          if (b.kind === 'chak' || b.bounce > 0) {
            b.x -= sx; b.y -= sy; const fx = solidShot(b.x + sx, b.y), fy = solidShot(b.x, b.y + sy);
            if (fx || !fy) b.vx = -b.vx; if (fy || !fx) b.vy = -b.vy;
            hurtTile(Math.floor((b.x + sx) / T), Math.floor((b.y + sy) / T), b.dmg);
            if (b.kind === 'chak') { b.ret = true; AU.tink(); } else { b.bounce--; b.bounced = (b.bounced || 0) + 1; b.hitSet = null; sparks(b.x, b.y, Math.atan2(b.vy, b.vx), 2, C.white, 80); }
            break;
          }
          hurtTile(Math.floor(b.x / T), Math.floor(b.y / T), b.dmg);
          if (b.kind === 'gren') explodeGren(b);
          else if (b.cluster) blast(b.x - sx, b.y - sy, 14, 4 * FL(), { depth: b.depth + 1, noProc: true });
          else { impact(b); if (b.kind === 'arrow') G.fx.push({ k: 'stuck', x: b.x - sx * 2, y: b.y - sy * 2, a: Math.atan2(b.vy, b.vx), t: 0, life: 2.5, d: f => pline(f.x, f.y, f.x - Math.cos(f.a) * 6, f.y - Math.sin(f.a) * 6, C.dk) }); }
        } else burst(b.x - sx, b.y - sy, 3, b.col || C.red, 40, 0.2);
        b.dead = true; break;
      }
      if (b.team === 'p') collideP(b);
      else if (d2(b.x, b.y, P.x, P.y) < (b.r + P.hurtR) ** 2 && hurtPlayer(b.dmg, b.x, b.y)) b.dead = true;
    }
    if (b.life <= 0 && !b.dead) { b.dead = true; if (b.kind === 'gren') explodeGren(b); if (b.kind === 'chak' && !b.ghost && b.owner) b.owner.out = Math.max(0, b.owner.out - 1); }
  }
  for (const b of G.bullets) if (b.dead && b.onEnd && !b._ended) { b._ended = true; b.onEnd(b); }
  G.bullets = G.bullets.filter(b => !b.dead);
}

/* ---------------- rendering ---------------- */
const darkC = mk(8, 8), darkX = darkC.getContext('2d');
// light hole stamped into the darkness layer (pre-rendered once instead of a gradient per light per frame)
const HOLE = (() => { const c = mk(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c; })();
function drawBullets(team) {
  const chroma = P.chromaT > 0;
  for (const b of G.bullets) {
    if (b.team !== team) continue;
    if (b.draw) { b.draw(b); continue; }
    const x = Math.round(b.x), y = Math.round(b.y);
    if (team === 'e') {
      const r = Math.round(b.r), col = b.col || C.red;
      if (b.big && ((G.t * 14) | 0) % 2) pring(x, y, r + 3, col, 1);
      pc(x, y, r + 1, C.ink); pc(x, y, r, col); if (r >= 2) prect(x - 1, y - 1, 1, 1, C.white);
      continue;
    }
    const col = b.ghost ? C.lt : b.col ? b.col : chroma || b.sat ? hue(G.t * 500 + b.seed) : C.white;
    const a = Math.atan2(b.vy, b.vx);
    switch (b.kind) {
      case 'gren': { shadow(x, y + 2, 3); const zy = y - Math.round(b.z || 0); pc(x, zy, 4, C.ink); pc(x - 1, zy - 1, 1, b.ghost ? C.lt : C.white); break; }
      case 'chak': { const r = Math.round(b.r) + 1; pc(x, y, r + 1, C.ink); pc(x, y, r, col); pc(x, y, Math.max(1, r - 2), C.ink); for (let i = 0; i < 4; i++) { const s = b.t * 22 + i * TAU / 4; prect(x + Math.cos(s) * (r + 1) - 1, y + Math.sin(s) * (r + 1) - 1, 2, 2, C.ink); } break; }
      case 'arrow': pline(x, y, x - Math.cos(a) * 9, y - Math.sin(a) * 9, C.ink, 2); pline(x, y, x - Math.cos(a) * 8, y - Math.sin(a) * 8, b.crit ? C.gold : C.dk, 1); pc(x, y, 1, b.crit ? C.gold : C.white); if (b.crit && Math.random() < 0.6) part(b.x, b.y, 0, 0, 0.25, C.gold, 1); break;
      case 'wave': { const r = Math.round(b.r) + 3; parc(x - Math.cos(a) * 3, y - Math.sin(a) * 3, r, a - 1.1, a + 1.1, C.ink, 3); parc(x - Math.cos(a) * 3, y - Math.sin(a) * 3, r, a - 1, a + 1, col, 1); break; }
      case 'mote': pc(x, y, 2, C.cyanDk); pc(x, y, 1, C.cyan); break;
      default: { const r = Math.max(1, Math.round(b.r)); pline(x, y, x - b.vx * 0.022, y - b.vy * 0.022, b.ghost ? C.paper2 : C.ink, r + 1); pc(x, y, r + 1, C.ink); pc(x, y, r, col); }
    }
  }
}
function inView(p, m = 24) { return p.x > G.camX - m && p.x < G.camX + VW + m && p.y > G.camY - m && p.y < G.camY + VH + m; }
function drawRewardIcon(k, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (k === 'orb') { for (let yy = -4; yy <= 4; yy++) { const hw = 3 - Math.abs(yy) * 0.75; prect(x - hw - 1, y + yy, hw * 2 + 3, 1, C.ink); if (hw > 0) prect(x - hw, y + yy, hw * 2 + 1, 1, Math.abs(yy) < 2 ? C.white : C.cyan); } }
  else if (k === 'chest' || k === 'goldchest') { prect(x - 5, y - 3, 10, 7, C.ink); prect(x - 4, y - 2, 8, 5, k === 'goldchest' ? C.gold : '#cfcec7'); prect(x - 4, y, 8, 1, C.ink); }
  else if (k === 'gold') { for (let i = 0; i < 3; i++) { prect(x - 3 + i * 2 - 1, y - 2 - i, 4, 5, C.ink); prect(x - 3 + i * 2, y - 1 - i, 2, 3, C.gold); } }
  else if (ISPR[k]) ctx.drawImage(ISPR[k], x - 3, y - 4);
}
// Hades-style door preview: the reward of an uncleared room floats outside each of its doorways
function drawRewardHints() {
  for (const r of G.room.rooms) {
    if (r.cleared || !r.reward || r === G.cur) continue;
    for (let i = 1; i < r.gates.length; i += 3) {
      const g = r.gates[i], x = (g.x * 2 - g.ix + 0.5) * T, y = (g.y * 2 - g.iy + 0.5) * T;
      if (!inView({ x, y })) continue;
      const bob = Math.sin(G.t * 3 + i) * 1.5; shadow(x, y + 7, 4); drawRewardIcon(r.reward, x, y + bob - 2);
    }
  }
}
function drawChest(p) {
  const x = Math.round(p.x), y = Math.round(p.y), o = p.open ? Math.min(1, p.t * 5) : 0;
  shadow(x, y + 6, 9);
  const body = p.v === 'wood' ? '#cfcec7' : C.ink, trim = p.v === 'gold' ? C.gold : p.v === 'ink' ? C.cyan : C.dk;
  prect(x - 9, y - 4, 18, 11, C.ink); prect(x - 8, y - 3, 16, 9, body); prect(x - 8, y + 1, 16, 1, trim);
  const ly = y - 8 - Math.round(o * 5);
  prect(x - 9, ly, 18, 6, C.ink); prect(x - 8, ly + 1, 16, 4, body); prect(x - 8, ly + 4, 16, 1, trim);
  prect(x - 1, y - 2, 3, 4, p.v === 'wood' ? C.ink : trim);
  if (p.open && o < 1) for (let i = 0; i < 3; i++) prect(x - 6 + i * 6, y - 10 - o * 10, 1, 6, trim);
  if (!p.open && p.v !== 'wood' && ((G.t * 2) | 0) % 2) prect(x - 1, y - 12, 2, 2, trim);
}
function drawNPC(p) {
  const N = STORY.npcs[p.id]; if (!N._s) N._s = spr(N.spr);
  const bob = Math.round(Math.sin(p.t * 2) * 1);
  shadow(p.x, p.y + 6, 5); ctx.drawImage(N._s, Math.round(p.x - N._s.width / 2), Math.round(p.y - N._s.height + 6 + bob));
  if (!p.talked && ((G.t * 3) | 0) % 2) { prect(p.x - 1, p.y - 20, 2, 5, C.gold); prect(p.x - 1, p.y - 14, 2, 2, C.gold); }
}
function drawTall(p) {
  const x = Math.round(p.x), y = Math.round(p.y);
  if (p.k === 'chest') drawChest(p);
  else if (p.k === 'npc') drawNPC(p);
  else if (p.k === 'rx') RX[p.v].draw(p);
  else if (p.k === 'hero') drawStatue(p);
  else if (p.k === 'lab') drawLab(p);
  else if (p.k === 'diff') drawRuneStone(p);
  else if (p.k === 'heat') drawCurseObelisk(p);
  else if (p.k === 'cat') { ctx.drawImage(CAT, x - 4, y - 6); if (((G.t * 0.5) | 0) % 3 === 0) prect(x - 4, y - 2, 9, 1, C.ink); }
  else if (p.k === 'stele') { shadow(x, y + 8, 9); prect(x - 8, y - 22, 16, 30, C.ink); prect(x - 7, y - 21, 14, 1, C.dk); for (let i = 0; i < 6; i++) prect(x - 5, y - 17 + i * 4, randiS(i, 4, 10), 1, C.lt); prect(x - 10, y + 6, 20, 3, C.dk); }
  else if (p.k === 'altar') {
    shadow(x, y + 6, 9); const col = p.v === 'blood' ? C.red : p.v === 'gold' ? C.gold : C.cyan;
    prect(x - 8, y - 6, 16, 12, C.ink); prect(x - 7, y - 5, 14, 2, C.dk); prect(x - 10, y + 4, 20, 3, C.dk);
    if (!p.used) { const fy = y - 14 + Math.round(Math.sin(p.t * 3) * 2); pc(x, fy, 4, C.ink); pc(x, fy, 3, col); prect(x - 1, fy - 1, 1, 1, C.white); if (Math.random() < 0.2) part(x + rand(-3, 3), fy, 0, -20, 0.5, col, 1); }
  }
}
// knight statue: grey stone figure with the knight's accent; the chosen one is lit and breathes
function drawStatue(p) {
  const H = HEROES[p.id], on = G.hero === p.id, live = inHub(), x = Math.round(p.x), y = Math.round(p.y), b = on ? Math.round(Math.sin(p.t * 3)) : 0;
  shadow(x, y + 6, 8); prect(x - 8, y + 1, 16, 6, C.ink); prect(x - 7, y + 2, 14, 2, on ? C.lt : C.dk);
  const body = on ? C.white : C.mid, ol = C.ink, y0 = y - 12 + b;
  prect(x - 5, y0 - 1, 10, 13, ol); prect(x - 4, y0, 8, 11, body); prect(x - 4, y0 + 3, 8, 2, ol);
  prect(x - 1, y0 + 3, 2, 1, on ? H.col : C.lt); prect(x - 4, y0 + 8, 8, 1, on ? H.col : C.dk);
  if (p.id === 'knight') { prect(x - 1, y0 - 4, 2, 3, on ? H.col : C.dk); }
  else if (p.id === 'rogue') { prect(x - 6, y0 + 5, 3, 4, on ? H.col : C.dk); prect(x - 4, y0 - 2, 8, 2, C.dk); }
  else if (p.id === 'sage') { for (let i = 0; i < 4; i++) prect(x - 4 + i, y0 - 2 - i * 2, 8 - i * 2, 2, on ? H.col : C.dk); } // pointed wizard hat
  else { prect(x + 4, y0 + 7, 3, 3, on ? H.col : C.dk); prect(x - 3, y0 - 3, 6, 2, on ? C.gold : C.dk); }
  if (on && live && Math.random() < 0.25) part(x + rand(-6, 6), y0 + rand(0, 10), 0, rand(-30, -14), 0.6, H.col, 1, { drag: 0.95 });
  if (!metaHero(p.id)) { prect(x - 4, y0 + 2, 8, 7, C.ink); prect(x - 3, y0 + 3, 6, 5, C.dk); parc(x, y0 + 2, 3, Math.PI, TAU, C.mid, 1); prect(x, y0 + 5, 1, 2, C.lt); }
}
// difficulty rune stone: a standing slab whose rune burns brighter and redder with each step
function drawRuneStone(p) {
  const x = Math.round(p.x), y = Math.round(p.y), d = OPT.diff, col = [C.lt, C.cyan, C.fire, C.red][d], on = ((p.t * 2) | 0) % 2;
  shadow(x, y + 6, 9); prect(x - 7, y - 16, 14, 22, C.ink); prect(x - 6, y - 15, 12, 20, C.dk); prect(x - 6, y - 15, 12, 1, C.mid);
  prect(x - 1, y - 12, 2, 12, col); prect(x - 4, y - 9, 8, 2, col); prect(x - 3, y - 4, 2, 2, col); prect(x + 1, y - 4, 2, 2, col);
  if (d >= 2 && on) pring(x, y - 6, 9, col, 1);
  for (let i = 0; i < 4; i++) prect(x - 7 + i * 4, y + 7, 3, 1, i <= d ? col : C.dk);
  if (inHub() && Math.random() < 0.1 + d * 0.05) part(x + rand(-3, 3), y - 10, 0, rand(-18, -8), 0.7, col, 1, { drag: 0.96 });
}
// curse obelisk (after a first win): a red mark lights up for every curse taken
function drawCurseObelisk(p) {
  const x = Math.round(p.x), y = Math.round(p.y), h = OPT.heat;
  shadow(x, y + 6, 8); prect(x - 7, y - 22, 14, 28, C.ink); prect(x - 6, y - 21, 12, 26, C.ink2);
  for (let i = 0; i < MARKS.length; i++) prect(x - 4 + (i % 2) * 5, y - 18 + (i >> 1) * 5, 3, 3, i < h ? C.red : C.dk);
  prect(x - 9, y + 4, 18, 3, C.dk);
}
const randiS = (seed, a, b) => a + ((seed * 7919) % (b - a + 1));
function drawPicks() {
  for (const p of G.picks) {
    if (p.tall || !inView(p)) continue;
    const x = Math.round(p.x), y = Math.round(p.y), bob = Math.round(Math.sin(p.t * 4) * 2);
    switch (p.k) {
      case 'coin': { const w = ((p.t * 8) | 0) % 4 === 0 ? 1 : 3; prect(x - (w >> 1) - 1, y - 2, w + 2, 5, C.ink); prect(x - (w >> 1), y - 1, w, 3, C.gold); break; }
      case 'soul': pc(x, y, 2, C.cyanDk); pc(x, y, 1, C.cyan); break;
      case 'gem': { const c0 = hue(G.t * 200 + p.vx); prect(x - 1, y - 3, 3, 7, C.ink); prect(x - 2, y - 2, 5, 5, C.ink); prect(x, y - 2, 1, 5, c0); prect(x - 1, y - 1, 3, 3, c0); prect(x, y - 1, 1, 1, C.white); break; }
      case 'item': { const s = ISPR[p.id]; shadow(x, y + 5, 4); if (s) ctx.drawImage(s, x - 3, y - 5 + bob); if (p.id === 'heartc' || p.id === 'whet') pring(x, y - 2 + bob, 7 + Math.sin(p.t * 6), C.gold); break; }
      case 'orb': {
        const col = p.tier ? C.gold : C.cyan, dk = p.tier ? C.goldDk : C.cyanDk;
        prect(x, y - 60, 1, 60, p.tier ? 'rgba(255,200,61,0.25)' : 'rgba(64,228,255,0.22)');
        shadow(x, y + 7, 6); pring(x, y + bob, 10 + Math.sin(p.t * 5) * 2, col);
        const s = Math.abs(Math.cos(p.t * 2.2)) * 5 + 1;
        for (let yy = -7; yy <= 7; yy++) { const hw = Math.round(s * (1 - Math.abs(yy) / 7.5)); prect(x - hw - 1, y + bob + yy, hw * 2 + 3, 1, C.ink); if (hw > 0) prect(x - hw + 1, y + bob + yy, hw * 2 - 1, 1, Math.abs(yy) < 3 ? C.white : col); }
        pline(x, y + bob - 5, x, y + bob + 5, dk); break;
      }
      case 'frag': { const col = FRAGC[p.c]; prect(x, y - 80, 1, 80, col); shadow(x, y + 8, 7); const s = Math.abs(Math.cos(p.t * 2)) * 7 + 2; for (let yy = -10; yy <= 10; yy++) { const hw = Math.round(s * (1 - Math.abs(yy) / 10.5)); prect(x - hw - 1, y + bob + yy, hw * 2 + 3, 1, C.ink); if (hw > 0) prect(x - hw + 1, y + bob + yy, hw * 2 - 1, 1, Math.abs(yy) < 3 ? C.white : col); } pring(x, y + bob, 14 + Math.sin(p.t * 4) * 2, col, 1); break; }
      case 'weapon': case 'shop': {
        if (p.k === 'weapon' && !p.ped) shadow(x, y + 5, 7); else { prect(x - 9, y + 2, 18, 9, C.ink); prect(x - 8, y + 3, 16, 2, C.dk); prect(x - 9, y + 11, 18, 2, 'rgba(10,10,14,0.15)'); }
        const id = p.k === 'weapon' ? p.id : p.item === 'weapon' ? p.id : null;
        if (id && WSPR[id]) { const ws = WSPR[id]; ctx.drawImage(ws.s, x - (ws.s.width >> 1), y - 8 + bob - (ws.s.height >> 1)); if ((p.lv || 1) > 1) for (let i = 0; i < p.lv - 1; i++) prect(x - 3 + i * 4, y - 16 + bob, 2, 2, C.gold); }
        else if (p.item === 'orb' || p.item === 'orb2') { const oc = p.item === 'orb2' ? C.gold : C.cyan; pring(x, y - 7 + bob, 6, oc); prect(x - 2, y - 9 + bob, 5, 5, oc); prect(x - 1, y - 8 + bob, 3, 3, C.white); }
        else if (p.item === 'restock') { const a0 = p.t * 3; parc(x, y - 7 + bob, 5, a0, a0 + 4.2, C.gold, 2); prect(x + Math.cos(a0 + 4.2) * 5 - 1, y - 8 + bob + Math.sin(a0 + 4.2) * 5, 3, 3, C.gold); }
        else if (p.item && ISPR[p.item]) ctx.drawImage(ISPR[p.item], x - 3, y - 11 + bob);
        break;
      }
      case 'portal': {
        for (let i = 0; i < 4; i++) { const r = 16 - i * 3 + Math.sin(p.t * 4 + i) * 1.5; parc(x, y, r, p.t * (2 + i) + i, p.t * (2 + i) + i + 4.4, i % 2 ? C.white : C.ink, 2); }
        pc(x, y, 5, C.void); pc(x, y, 2 + Math.sin(p.t * 8), C.white); break;
      }
    }
  }
}
function promptText(p) {
  const v = LANG === 'zh', id = p.k === 'weapon' ? p.id : p.item === 'weapon' ? p.id : null;
  if (id) { const W = WEAPONS[id], lv = p.lv || 1, on = G.gl[W.syn.g]; return [`${p.k === 'shop' ? t('buy') : t('take')} ${tn(W)}${lv > 1 ? ' ' + '★'.repeat(lv - 1) : ''}`, `<b class="cl">${wcls(W)}</b> ${td(W)}<br><em class="c">◈ ${clsRule(W)}</em><br><em class="${on ? 'y' : 'g'}">◆ ${t('wsyn')} · ${tn(W.syn)} — ${on ? t('active') : t('needs') + ' ' + tn(GL[W.syn.g])}</em>`]; }
  if (p.k === 'shop') { const I = ITEMS[p.item]; return [`${t('buy')} ${tn(I)}`, td(I)]; }
  if (p.k === 'rx') return RX[p.v].prompt(p);
  if (p.k === 'hero') { const H = HEROES[p.id], on = G.hero === p.id; return [`${on ? t('playing') : metaHero(p.id) ? t('become') : t('locked')} · ${tn(H)}`, `${metaHero(p.id) ? '' : `<em class="r">${t('labLocked', HERO_COST[p.id])}</em><br>`}${t('passive')} · ${td(H)}<br>${t('skill')} <kbd>R</kbd> ${tn(H.skill)} · ${td(H.skill)}`]; }
  if (p.k === 'lab') return [`${t('open')} · ${t('lab')}`, t('labSub', M0.gems)];
  if (p.k === 'diff') return [`${t('diffT')} · ${tn(DIFFS[OPT.diff])} <small>${t('cycle')}</small>`, td(DIFFS[OPT.diff])];
  if (p.k === 'heat') return [`${t('heat')} · ${OPT.heat}/${MARKS.length} <small>${t('cycle')}</small>`, OPT.heat ? MARKS.slice(0, OPT.heat).map(m => tn(m)).join(' · ') : t('heatNone')];
  if (p.k === 'chest') return [`${t('open')} ${tn(CHESTS[p.v])}`, ''];
  if (p.k === 'altar') return [`${t('offer')} · ${tn(ALTARS[p.v])}`, td(ALTARS[p.v])];
  if (p.k === 'npc') return [`${t('talk')} · ${tn(STORY.npcs[p.id])}`, ''];
  if (p.k === 'stele') return [`${t('read')} · ${v ? '碑文' : 'INSCRIPTION'}`, ''];
  return ['', ''];
}
function collectLabels() {
  const out = [];
  if (G.state === 'title') return out;
  for (const p of G.picks) {
    if (!inView(p, 0)) continue;
    if (p.k === 'shop') out.push({ x: p.x, y: p.y + 16, text: price(p) + (LANG === 'zh' ? ' 金' : ' G'), cls: G.coins >= price(p) ? 'price' : 'price no' });
    else if (p.k === 'altar' && p.v === 'gold' && !p.used) out.push({ x: p.x, y: p.y + 16, text: altarGold() + (LANG === 'zh' ? ' 金' : ' G'), cls: G.coins >= altarGold() ? 'price' : 'price no' });
    else if (p.k === 'lab' && inHub()) out.push({ x: p.x, y: p.y + 22, text: `${t('lab')} · ${M0.gems} ◆`, cls: 'tag' });
    else if (p.k === 'cat') out.push({ x: p.x, y: p.y - 14, text: lx(p.say), cls: 'say' });
    else if (p.k === 'portal') out.push({ x: p.x, y: p.y - 24, text: t('descend'), cls: 'tag' });
    else if (p.k === 'npc' && d2(p.x, p.y, P.x, P.y) < 110 * 110) out.push({ x: p.x, y: p.y - 24, text: tn(STORY.npcs[p.id]), cls: 'name' });
    else if (p.k === 'rx') { const l = RX[p.v].label && RX[p.v].label(p); if (l) out.push(l); }
    else if (p.k === 'frag') out.push({ x: p.x, y: p.y - 22, text: tn(STORY.frag[p.c]).split(' ')[0], cls: 'tag ' + p.c });
  }
  for (const e of G.enemies) if (e.affix && !e.dead && !(e.spawnT > 0) && !e.hide && !(e.alpha < 0.5) && inView(e, 0)) { const A = AFFIX[e.affix]; out.push({ x: e.x, y: e.y - e.r - 12, text: tn(A), cls: 'affix', col: A.col }); }
  if (G.prompt) { const [a, b] = promptText(G.prompt); out.push({ x: G.prompt.x, y: G.prompt.y - 30, text: `<kbd>E</kbd> ${a}${b ? `<small>${b}</small>` : ''}`, cls: 'prompt' }); }
  if (G.depth === 0 && G.cur === G.room.start) {
    const c = roomC(G.room.start), hints = [[t('kMove'), 'WASD'], [t('kAttack'), LANG === 'zh' ? '鼠标左键' : 'CLICK'], [t('kDash'), LANG === 'zh' ? '空格' : 'SPACE'], [t('kChroma'), 'F'], [t('kSwap'), 'Q'], [t('kUse'), 'E'], [t('kSkill'), 'R'], [t('kMap'), 'TAB'], [t('kPause'), 'ESC']];
    hints.forEach(([v, k], i) => { const row = i < 5 ? 0 : 1, n = row ? 4 : 5, j = row ? i - 5 : i; out.push({ x: c.x + (j - (n - 1) / 2) * 48, y: c.y + 80 + row * 15, text: `<kbd>${k}</kbd> ${v}`, cls: 'hint' }); });
    for (const p of G.picks) if ((p.k === 'hero' || p.k === 'diff' || p.k === 'heat') && inHub() && p !== G.prompt) out.push({ x: p.x, y: p.y - 26, text: p.k === 'hero' ? tn(HEROES[p.id]) : p.k === 'diff' ? tn(DIFFS[OPT.diff]) : `${t('heat')} ${OPT.heat}`, cls: p.k === 'hero' && G.hero === p.id ? 'name' : 'tag' });
  }
  return out;
}
function drawDark(cx, cy) {
  if (darkC.width !== VW || darkC.height !== VH) { darkC.width = VW; darkC.height = VH; }
  darkX.globalCompositeOperation = 'source-over'; darkX.clearRect(0, 0, VW, VH);
  darkX.fillStyle = `rgba(4,4,7,${0.94 * G.dark})`; darkX.fillRect(0, 0, VW, VH);
  darkX.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => darkX.drawImage(HOLE, x - cx - r, y - cy - r, r * 2, r * 2);
  hole(P.x, P.y, 74 + Math.sin(G.t * 9) * 2);
  let n = 0; for (const b of G.bullets) if (b.team === 'p' && n++ < 40) hole(b.x, b.y, 12);
  for (const f of G.fx) if (f.k === 'boom' || f.k === 'slam') hole(f.x, f.y, f.r * 2);
  for (const e of G.enemies) if (e.boss && !e.hide) hole(e.x, e.y, 30);
  for (const p of G.picks) if (p.k !== 'coin' && p.k !== 'soul' && inView(p)) hole(p.x, p.y, 16);
  ctx.drawImage(darkC, cx, cy);
}
function blit(c, cx, cy) {
  const sx = Math.max(0, cx + 8), sy = Math.max(0, cy + 8), ex = Math.min(c.width, cx + 8 + VW), ey = Math.min(c.height, cy + 8 + VH);
  if (ex > sx && ey > sy) ctx.drawImage(c, sx, sy, ex - sx, ey - sy, sx - 8, sy - 8, ex - sx, ey - sy);
}
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = C.void; ctx.fillRect(0, 0, VW, VH);
  if (G.state === 'title') { drawTitleArt(G.rt); UI.labels([], 0, 0); return; }
  const L = G.room; if (!L) return;
  const cx = Math.round(G.camX + G.sx), cy = Math.round(G.camY + G.sy);
  drawBackdrop(cx, cy);
  ctx.setTransform(1, 0, 0, 1, -cx, -cy);
  blit(L.cv, cx, cy); blit(L.dc, cx, cy);
  const tint = P.chromaT > 0 ? hue(G.t * 120) : G.tint;
  if (tint) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = P.chromaT > 0 ? 0.32 : 0.18; ctx.fillStyle = tint; ctx.fillRect(cx, cy, VW, VH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  drawDynTiles(); drawPicks(); if (G.state !== 'title') drawRewardHints();
  const list = propList();
  for (const p of G.picks) if (p.tall && inView(p, 40)) list.push({ y: p.y + 6, draw: () => drawTall(p) });
  if (G.state !== 'title') {
    for (const e of G.enemies) if (inView(e, 40)) list.push({ y: e.y + e.r, draw: () => drawEnemy(e) });
    list.push({ y: P.y + 5, draw: drawPlayer }); buildDraws(list);
  }
  list.sort((a, b) => a.y - b.y); for (const it of list) it.draw();
  drawBullets('p');
  for (const f of G.fx) if (!f.emissive) drawFxOne(f);
  drawParts(); drawAmbient(cx, cy);
  if (G.dark > 0.01) drawDark(cx, cy);
  for (const f of G.fx) if (f.emissive) drawFxOne(f);
  drawTele();
  drawBullets('e');
  drawNums();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (G.trans) {
    const tr = G.trans, k = tr.mode === 'out' ? 1 - tr.t / 0.34 : tr.t / 0.42, rr = Math.max(0, k) * Math.hypot(VW, VH) * 0.6;
    ctx.fillStyle = C.void; ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.arc(P.x - cx, P.y - cy, rr, 0, TAU, true); ctx.fill('evenodd');
  }
  if (G.state === 'play') drawCrosshair();
  let f = '';
  if (G.victory > 0) { G.victory = Math.min(1, G.victory + 0.004); f = `sepia(${0.7 * G.victory}) saturate(${1 + 3 * G.victory}) hue-rotate(${(G.rt * 90) % 360}deg)`; }
  if (G.flashInv > 0) { G.flashInv--; f = 'invert(1) ' + f; }
  if (G._filter !== f) { cv.style.filter = f; G._filter = f; }
  UI.labels(G.state === 'play' ? collectLabels() : [], cx, cy);
}
function drawCrosshair() {
  if (P.dead) return;
  const x = Math.round(M.sx), y = Math.round(M.sy), s = 3 + Math.round(P.recoil * 3), w = curW();
  const col = P.chromaT > 0 ? hue(G.t * 600) : C.white;
  for (const [dx, dy, ww, hh] of [[-s - 3, 0, 3, 1], [s + 1, 0, 3, 1], [0, -s - 3, 1, 3], [0, s + 1, 1, 3]]) { prect(x + dx - 1, y + dy - 1, ww + 2, hh + 2, C.ink); prect(x + dx, y + dy, ww, hh, col); }
  prect(x - 1, y - 1, 3, 3, C.ink); prect(x, y, 1, 1, col);
  if (w && w.chg) { parc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + TAU * w.ch, C.ink, 3); parc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + TAU * w.ch, w.full ? C.gold : C.white, 1); if (w.oc > 0) { parc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + TAU * w.oc, C.ink, 3); parc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + TAU * w.oc, hue(G.t * 600), 1); } }
  if (w && w.reload > 0) { const k = 1 - w.reload / w.rlMax; parc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + TAU * k, C.ink, 3); parc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + TAU * k, C.lt, 1); }
}

/* ---------------- camera & loop ---------------- */
function updCam(rdt) {
  const L = G.room; if (!L) return;
  let tx, ty;
  if (G.state === 'title') { const c = roomC(L.start); tx = c.x + Math.sin(G.rt * 0.12) * 220; ty = c.y + Math.cos(G.rt * 0.09) * 120; }
  else if (G.intro) { tx = G.intro.b.x; ty = G.intro.b.y; }
  else { tx = P.x + (M.sx - VW / 2) * 0.22; ty = P.y + (M.sy - VH / 2) * 0.22; }
  const gx = clamp(tx - VW / 2, -24, L.w * T - VW + 24), gy = clamp(ty - VH / 2, -24, L.h * T - VH + 24);
  const k = 1 - Math.exp(-rdt * (G.intro ? 3 : 9));
  G.camX = lerp(G.camX, gx, k); G.camY = lerp(G.camY, gy, k);
  G.shake = Math.max(0, G.shake - rdt * 2.8);
  const s = G.shake * G.shake * 6;
  G.sx = rand(-s, s) + G.kx; G.sy = rand(-s, s) + G.ky;
  const kd = Math.exp(-rdt * 16); G.kx *= kd; G.ky *= kd;
}
function step(rdt) {
  if (KP.m) { AU.toggle(); UI.sound(); }
  if (G.state === 'title') { G.t += rdt; updCam(rdt); updParts(rdt); if (!$('lb').hidden) { if (KP.escape) LB.close(); } else if (KP.enter) startRun(); return; }
  if (G.state === 'talk') { updTalk(rdt); updCam(rdt); return; }
  if (G.state === 'cards') { for (const k of ['1', '2', '3']) if (KP[k]) UI.pickCard(+k - 1); if (KP.r) UI.reroll(); updCam(rdt); return; }
  if (G.state === 'pause') { if (KP.escape || KP.p) UI.pause(false); return; }
  if (G.state === 'lab') { if (KP.escape || KP.e) LAB.close(); return; }
  if (G.state === 'map') { if (KP.tab || KP.escape) UI.bigMap(false); UI.drawMap(); updCam(rdt); return; }
  if (G.state === 'end') { if (KP.r || KP.enter) startRun(); return; }
  if ((KP.escape || KP.p) && !P.dead) { UI.pause(true); return; }
  if (KP.tab && !P.dead && !G.trans) { UI.bigMap(true); return; }
  if (G.trans) { updTrans(rdt); updCam(rdt); return; }
  if (G.freeze > 0) { G.freeze -= rdt; updCam(rdt); return; }
  let ts = 1; if (G.slowT > 0) { G.slowT -= rdt; ts = G.slowS; if (G.slowT <= 0) G.slowS = 1; }
  const dt = rdt * ts; DT = dt; G.t += dt; if (!P.dead) G.stats.time += rdt;
  M.x = M.sx + G.camX; M.y = M.sy + G.camY;
  updPlayer(dt); updEnemies(dt); updBullets(dt); updFx(dt); updTele(dt); updParts(dt); updNums(dt); updPicks(dt); updTimers(dt);
  if (G.state !== 'play') return;
  updRooms(dt); updTiles(dt); updInteract(); gTick(dt);
  G.stillT = P.moving ? 0 : (G.stillT || 0) + dt;
  for (const e of G.enemies) if (!e.boss && !e.dummy && !e.parent && e.D && e.D.name && e.D.cost && !(e.spawnT > 0) && !G.seenFoes.has(e.type)) { G.seenFoes.add(e.type); UI.foe(e); }
  G.dark = lerp(G.dark, G.darkOn ? 1 : 0, 1 - Math.exp(-dt * 1.5));
  G.lowHp = P.hp <= 2 && !P.dead;
  updCam(rdt); UI.tick(rdt);
}
let lastT = performance.now();
function frame(now) {
  const rdt = Math.min(0.05, (now - lastT) / 1000); lastT = now; G.rt += rdt;
  requestAnimationFrame(frame);
  step(rdt); render();
  flushInput();
}
window.__G = { G, get P() { return P; }, get S() { return S; } };
titleScene(); setLang(LANG);
// browsers only start audio after a gesture: the first click or key on the title wakes the menu music
const wakeAudio = () => { AU.init(); if (G.state === 'title') AU.music('menu'); removeEventListener('pointerdown', wakeAudio); removeEventListener('keydown', wakeAudio); };
addEventListener('pointerdown', wakeAudio); addEventListener('keydown', wakeAudio);
requestAnimationFrame(frame);
