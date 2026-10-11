'use strict';
/* GRISAILLE · meta — what carries over between runs: colour crystals (色晶), the alchemist's research table (unlocks + talents), goals */
OPT.meta = Object.assign({ gems: 0, w: [], h: [], r: [], tal: {}, goals: {} }, OPT.meta || {});
const M0 = OPT.meta;
// what a brand-new save starts with; everything else is researched at the camp
const META_W0 = ['quill', 'scatter', 'needle', 'revolver', 'blot', 'blade', 'spear', 'chakram', 'maul', 'bow', 'flamer', 'laser'];
const META_H0 = ['knight'];
const HERO_COST = { rogue: 30, sage: 45, gilder: 60 };
const W_COST = [12, 20, 30]; // by weapon tier
// advanced runes come in one pack per school
const RUNE_PACKS = {
  blaze: ['pyre', 'phoenix'], frost: ['shardice', 'glacier', 'coldsnap'], volt: ['conduit', 'overload', 'arc'], umbra: ['shade', 'haunt', 'mirage'],
  blood: ['martyr', 'frenzy'], gold: ['interest', 'goldrush', 'patron', 'bounty'], edge: ['focus', 'bleed', 'exec'], wind: ['tailwind', 'cyclone', 'relay'],
  ward: ['bulwark', 'retort', 'aegis'], chroma: ['afterglow', 'palette'],
};
const PACK_COST = 30;
const RUNE_LOCK = {}; for (const sc in RUNE_PACKS) for (const id of RUNE_PACKS[sc]) RUNE_LOCK[id] = sc;
const TALENTS = [
  { id: 'vit', name: 'TOUGHENED', zh: '强健', cost: [30, 60], desc: '+1 max HP.', zhDesc: '最大生命 +1。' },
  { id: 'purse', name: 'NEST EGG', zh: '私房钱', cost: [15, 25, 40], desc: 'Start every run with +15 gold.', zhDesc: '每局开局金币 +15。' },
  { id: 'prism', name: 'PRISM LENS', zh: '棱镜透镜', cost: [25, 50], desc: '+15% colour absorbed.', zhDesc: '吸取的色能 +15%。' },
  { id: 'reroll', name: 'SECOND THOUGHTS', zh: '三思', cost: [40], desc: 'One free card reroll on every level.', zhDesc: '每层赠送一次免费重抽。' },
  { id: 'armory', name: 'TEMPERED RACK', zh: '淬火武器架', cost: [45], desc: 'Camp weapons start at ★1.', zhDesc: '营地武器自带 ★1。' },
  { id: 'breath', name: 'LAST BREATH', zh: '回光', cost: [120], desc: 'Once per run, a killing blow leaves you at 1 HP instead.', zhDesc: '每局一次：受到致命伤害时改为保留 1 点生命。' },
];
const GOALS = [
  { id: 'boss1', name: 'FIRST GUARDIAN', zh: '初胜', desc: 'Defeat a guardian.', zhDesc: '击败一名守卫。', gems: 10 },
  { id: 'lv2', name: 'DEEPER', zh: '深入', desc: 'Reach level 2-1.', zhDesc: '抵达第 2-1 层。', gems: 10 },
  { id: 'lv3', name: 'THE GEARS', zh: '齿轮之下', desc: 'Reach level 3-1.', zhDesc: '抵达第 3-1 层。', gems: 15 },
  { id: 'lv4', name: 'THE EDGE OF NOTHING', zh: '虚无边缘', desc: 'Reach level 4-1.', zhDesc: '抵达第 4-1 层。', gems: 20 },
  { id: 'win', name: 'COLOUR RETURNS', zh: '色彩归来', desc: 'Win a run on Normal or harder.', zhDesc: '在普通或更高难度通关。', gems: 40 },
  { id: 'winHard', name: 'AGAINST THE GREY', zh: '逆灰而行', desc: 'Win a run on Hard or harder.', zhDesc: '在困难或更高难度通关。', gems: 60 },
  { id: 'heat3', name: 'CURSED AND CROWNED', zh: '负咒加冕', desc: 'Win with 3 or more curses.', zhDesc: '背负 3 个以上诅咒通关。', gems: 50 },
  { id: 'res3', name: 'HARMONY', zh: '和鸣', desc: 'Take 3 resonances in one run.', zhDesc: '单局选取 3 个共鸣。', gems: 20 },
  { id: 'school3', name: 'MASTERY', zh: '登堂入室', desc: 'Awaken a school to tier III.', zhDesc: '将一个流派觉醒至 III 阶。', gems: 20 },
  { id: 'clean5', name: 'UNTOUCHED', zh: '毫发无伤', desc: 'Clear 5 fights in a row without losing HP.', zhDesc: '连续 5 场战斗不掉生命。', gems: 15 },
];
const metaW = id => META_W0.includes(id) || M0.w.includes(id);
const metaHero = id => META_H0.includes(id) || M0.h.includes(id);
const metaRune = id => !RUNE_LOCK[id] || M0.r.includes(RUNE_LOCK[id]);
const metaTal = id => M0.tal[id] || 0;
const metaHp = () => metaTal('vit');
const gemMul = () => [0.6, 1, 1.4, 1.8][OPT.diff] * (1 + 0.1 * (G.diff.heat || 0));
function dropGem(x, y, n) { for (let i = 0; i < n; i++) { const a = rand(TAU), s = rand(40, 110); G.picks.push({ k: 'gem', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 }); } }
function goal(id) {
  if (M0.goals[id]) return;
  const g = GOALS.find(q => q.id === id); M0.goals[id] = 1; M0.gems += g.gems; saveOpt(); // goal rewards are credited as listed, outside the difficulty multiplier
  UI.toast(`${t('goalDone')} · ${tn(g)} <small>+${g.gems} ${t('gems')}</small>`, 'chroma'); AU.synergy();
}
// run gems are banked when the run ends, is abandoned or the tab closes (only what is new since the last bank); difficulty and curses multiply them. Returns this run's total banked
function bankGems() {
  const n = Math.round(((G.gems || 0) - (G.gemsB || 0)) * gemMul()); G.gemsB = G.gems || 0; G.gemsGot = (G.gemsGot || 0) + n;
  M0.gems += n; saveOpt(); return G.gemsGot;
}
// a killing blow with LAST BREATH researched: once per run, stay at 1 HP
function metaRevive() {
  if (!metaTal('breath') || G.breathUsed) return false;
  G.breathUsed = true; P.hp = 1; P.inv = 2; UI.hp(); slowmo(0.8, 0.3); invFlash(2); AU.shieldUp();
  ringFx(P.x, P.y - 2, 4, 40, 0.5, C.white, 2); UI.banner(tn(TALENTS.find(q => q.id === 'breath')), '', '');
  return true;
}

/* ---------- the research table (炼金台) ---------- */
const LAB = {
  tab: 'w',
  open() { G.state = 'lab'; $('lab').hidden = false; AU.page(); this.fill(); },
  close() { $('lab').hidden = true; G.state = 'play'; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); },
  cost(key) { const [k, id] = key.split(':'); return k === 'w' ? W_COST[WEAPONS[id].tier || 0] : k === 'h' ? HERO_COST[id] : k === 'r' ? PACK_COST : TALENTS.find(q => q.id === id).cost[metaTal(id)]; },
  item(key, icon, name, desc, owned, lvl) {
    const cost = owned ? 0 : this.cost(key), can = !owned && M0.gems >= cost;
    return `<div class="lit${owned ? ' own' : ''}">${icon ? `<img src="${icon}" alt="">` : '<span class="li0"></span>'}<div><b>${name}${lvl ? ` <small>${lvl}</small>` : ''}</b><p>${desc}</p></div>${owned ? `<em>${t('owned')}</em>` : `<button data-k="${key}"${can ? '' : ' disabled'}>${cost} ◆</button>`}</div>`;
  },
  fill() {
    document.querySelectorAll('#lab .ltabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
    $('labGems').textContent = M0.gems;
    let h = '';
    if (this.tab === 'w') {
      for (const cls of ['mag', 'charge', 'melee', 'beam']) {
        h += `<h3>${CLS[cls][LANG === 'zh' ? 'zh' : 'en']}</h3><p class="phelp">${clsRule({ cls, sc: 15 })}</p><div class="lgrid">`;
        h += Object.keys(WEAPONS).filter(id => WEAPONS[id].cls === cls).map(id => { const W = WEAPONS[id]; return this.item('w:' + id, weaponURL(id), tn(W), td(W), metaW(id)); }).join('') + '</div>';
      }
    } else if (this.tab === 'h') {
      h += `<div class="lgrid">${Object.keys(HEROES).map(id => { const H = HEROES[id]; return this.item('h:' + id, sprURL('h:' + id, spr(H.icon)), tn(H), `${td(H)}<br>${t('skill')} R · ${tn(H.skill)}`, metaHero(id)); }).join('')}</div>`;
    } else if (this.tab === 'r') {
      h += `<p class="phelp">${t('labRunes')}</p><div class="lgrid">${Object.keys(RUNE_PACKS).map(sc => { const ids = RUNE_PACKS[sc]; return this.item('r:' + sc, glyphURL(GL[ids[0]]), `${scName(sc)} · ${t('pack')}`, ids.map(id => tn(GL[id])).join(' · '), M0.r.includes(sc)); }).join('')}</div>`;
    } else if (this.tab === 't') {
      h += `<div class="lgrid">${TALENTS.map(T0 => { const l = metaTal(T0.id), max = T0.cost.length; return this.item('t:' + T0.id, '', tn(T0), td(T0), l >= max, max > 1 ? `${l}/${max}` : ''); }).join('')}</div>`;
    } else {
      h += `<div class="lgrid">${GOALS.map(g => `<div class="lit${M0.goals[g.id] ? ' own' : ''}"><span class="li0">${M0.goals[g.id] ? '✓' : '◇'}</span><div><b>${tn(g)}</b><p>${td(g)}</p></div><em>+${g.gems} ◆</em></div>`).join('')}</div>`;
    }
    $('labBody').innerHTML = h;
    $('labBody').querySelectorAll('button[data-k]').forEach(b => { b.onclick = () => this.buy(b.dataset.k); b.onmouseenter = () => AU.uiHover(); });
  },
  buy(key) {
    const [k, id] = key.split(':'), cost = this.cost(key);
    if (!(cost <= M0.gems)) { AU.deny(); return; }
    M0.gems -= cost;
    if (k === 'w') M0.w.push(id); else if (k === 'h') M0.h.push(id); else if (k === 'r') M0.r.push(id); else M0.tal[id] = metaTal(id) + 1;
    saveOpt(); AU.select(); invFlash(1);
    if (k === 't' && id === 'vit') { recalc(); P.hp = P.maxHp; UI.hp(); }
    this.fill();
  },
};
addEventListener('pagehide', () => { if (G.state !== 'title' && G.state !== 'end') bankGems(); }); // crystals found so far survive closing the tab mid-run
document.querySelectorAll('#lab .ltabs button').forEach(b => b.onclick = () => { LAB.tab = b.dataset.tab; LAB.fill(); AU.uiClick(); });
$('labClose').onclick = () => LAB.close();
// the table in the camp: a slab with a prism that drinks the light around it
function drawLab(p) {
  const x = Math.round(p.x), y = Math.round(p.y), fy = y - 15 + Math.round(Math.sin(p.t * 2.5) * 1.5);
  shadow(x, y + 6, 11); prect(x - 11, y - 6, 22, 9, C.ink); prect(x - 10, y - 5, 20, 2, C.mid); prect(x - 9, y + 3, 2, 4, C.ink); prect(x + 7, y + 3, 2, 4, C.ink);
  prect(x - 8, y - 8, 4, 2, C.dk); prect(x + 5, y - 9, 2, 3, C.lt); // a jar, a vial
  for (let yy = -4; yy <= 4; yy++) { const hw = 3 - Math.abs(yy) * 0.7; prect(x - hw - 1, fy + yy, hw * 2 + 3, 1, C.ink); if (hw > 0) prect(x - hw, fy + yy, hw * 2 + 1, 1, Math.abs(yy) < 2 ? C.white : hue(G.t * 120 + yy * 30)); }
  if (Math.random() < 0.3) part(x + rand(-14, 14), fy + rand(-10, 10), 0, 0, 0.5, hue(rand(360)), 1, { drag: 0.9 });
}
