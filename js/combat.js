'use strict';
/* GRISAILLE · combat — glyphs (universal upgrades), resonances, damage pipeline, procs, blasts, fx */
const AD = (pairs) => pairs; // { weaponType: [en, zh] }
const GLYPHS = [
  { id: 'sharp', name: 'WHETTED EDGE', zh: '磨锋', rar: 0, max: 4, tags: ['DAMAGE', '伤害'], icon: ['...ww...', '..wggw..', '..wggw..', '.wggggw.', '.wg..gw.', '.wggggw.', '..wggw..', '...ww...'],
    desc: l => `All attacks deal <b>+10%</b> damage. <i>(now +${10 * l}%)</i>`, zhDesc: l => `所有攻击伤害 <b>+10%</b>。<i>（当前 +${10 * l}%）</i>`, ap: (s, l) => { s.dmg += 0.1 * l; } },
  { id: 'haste', name: 'QUICK HANDS', zh: '快手', rar: 0, max: 3, tags: ['SPEED', '攻速'], icon: ['w..w....', 'gw.gw...', '.gw.gw..', '..gw.gw.', '.gw.gw..', 'gw.gw...', 'w..w....', '........'],
    desc: () => `<b>+8%</b> attack, charge and reload speed.`, zhDesc: () => `攻击、蓄力与装填速度 <b>+8%</b>。`, ap: (s, l) => { s.rate += 0.08 * l; },
    ad: AD({ whip: ['faster lashes', '抽击更快'], fan: ['faster gusts', '施放更快'], wave: ['faster blasts', '吹奏更快'], gun: ['faster trigger', '射速更快'], blade: ['faster swings', '挥砍更快'], maul: ['faster wind-up', '蓄力更快'], beam: ['faster charge', '充能更快'], lob: ['faster reload', '装填更快'], throw: ['faster throws', '投掷更快'], bow: ['faster draw', '拉弓更快'], spear: ['faster thrusts', '突刺更快'], scythe: ['faster spins', '旋斩更快'], guard: ['faster pokes', '戳击更快'], stream: ['denser stream', '喷涌更密'], mine: ['faster mining', '布雷更快'], summon: ['faster casting', '施法更快'], brush: ['quicker casting', '施法更快'] }) },
  { id: 'keen', name: 'EAGLE EYE', zh: '鹰眼', rar: 0, max: 3, tags: ['CRIT', '暴击'], icon: ['........', '..wwww..', '.wggggw.', 'wggyyggw', 'wggyyggw', '.wggggw.', '..wwww..', '........'],
    desc: () => `<b>+4%</b> crit chance, <b>+15%</b> crit damage. Crits flash <em class="y">gold</em>.`, zhDesc: () => `暴击率 <b>+4%</b>，暴击伤害 <b>+15%</b>。暴击闪耀<em class="y">金光</em>。`, ap: (s, l) => { s.crit += 0.04 * l; s.critMul += 0.15 * l; } },
  { id: 'heavy', name: 'BRUTE FORCE', zh: '蛮力', rar: 0, max: 3, tags: ['SIZE', '体积'], icon: ['..wwww..', '.wggggw.', 'wggggggw', 'wggggmgw', 'wgggmmgw', 'wggggggw', '.wggggw.', '..wwww..'],
    desc: () => `Every attack grows <b>+15%</b> and knocks back <b>+25%</b>.`, zhDesc: () => `所有攻击体积 <b>+15%</b>，击退 <b>+25%</b>。`, ap: (s, l) => { s.size += 0.15 * l; s.kb += 0.25 * l; },
    ad: AD({ whip: ['longer lash', '鞭身更长'], fan: ['wider gust', '风刃更广'], wave: ['wider arcs', '音波更宽'], gun: ['bigger bullets', '子弹更大'], blade: ['wider arcs', '刀弧更宽'], maul: ['larger shockwave', '冲击更大'], beam: ['thicker beam', '光束更粗'], lob: ['bigger blasts', '爆炸更大'], throw: ['bigger blades', '飞刃更大'], bow: ['heavier arrows', '箭矢更重'], spear: ['longer reach', '锋刃更长'], scythe: ['wider spin', '旋斩更广'], guard: ['wider shield', '盾面更大'], stream: ['wider stream', '喷涌更宽'], mine: ['bigger mine blasts', '地雷爆炸更大'], summon: ['bigger wisps', '灵体更大'], brush: ['thicker fire lines', '火线更粗'] }) },
  { id: 'heart', name: 'IRON HEART', zh: '钢铁之心', rar: 0, max: 3, tags: ['VITALITY', '生命'], icon: ['.rr..rr.', 'rrrrrrrr', 'rwrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...', '........'],
    desc: () => `<b>+1</b> max HP and heal <b>2</b>.`, zhDesc: () => `最大生命 <b>+1</b>，并回复 <b>2</b> 点。`, ap: () => { } },
  { id: 'plate', name: 'PLATE ARMOR', zh: '板甲', rar: 0, max: 2, tags: ['SHIELD', '护盾'], icon: ['wwwwwwww', 'wggggggw', 'wggwwggw', 'wggwwggw', '.wggggw.', '.wggggw.', '..wggw..', '...ww...'],
    desc: () => `<b>+1</b> regenerating shield, <b>+20%</b> regen.`, zhDesc: () => `<b>+1</b> 层可再生护盾，回复速度 <b>+20%</b>。`, ap: (s, l) => { s.maxSh += l; s.shRegen += 0.2 * l; } },
  { id: 'swift', name: 'LIGHT FEET', zh: '轻盈', rar: 0, max: 3, tags: ['MOBILITY', '机动'], icon: ['....www.', '...wggw.', '..wggw..', '..wggw..', '..wgggww', '..wggggg', '..wwwwww', '........'],
    desc: () => `<b>+10%</b> move speed, dash recharges <b>15%</b> faster.`, zhDesc: () => `移动速度 <b>+10%</b>，冲刺冷却 <b>-15%</b>。`, ap: (s, l) => { s.spd += 0.1 * l; s.dashCd -= 0.15 * l; } },
  { id: 'greed', name: 'GREED', zh: '贪婪', rar: 0, max: 2, tags: ['GOLD', '金币'], icon: ['..yyyy..', '.yYYYYy.', 'yYYwYYYy', 'yYwYYYYy', 'yYYYYYYy', 'yYYYYYYy', '.yYYYYy.', '..yyyy..'],
    desc: () => `<b>+40%</b> gold drops, wider coin magnet.`, zhDesc: () => `金币掉落 <b>+40%</b>，吸取范围更大。`, ap: (s, l) => { s.greed += 0.4 * l; s.magnet += 30 * l; } },
  { id: 'flow', name: 'MOMENTUM', zh: '冲劲', rar: 0, max: 3, tags: ['WHILE MOVING', '移动中'], icon: ['........', 'ww......', '.gww....', '...gww..', '.....gww', '...gww..', '.gww....', 'ww......'],
    desc: l => `While moving, deal <b>+${10 * l}%</b> damage.`, zhDesc: l => `移动时伤害 <b>+${10 * l}%</b>。`, ap: (s, l) => { s.flow = l; } },
  { id: 'still', name: 'STEADY AIM', zh: '沉稳', rar: 0, max: 3, tags: ['STANDING', '静立'], icon: ['..wwww..', '.w....w.', 'w..gg..w', 'w.gwwg.w', 'w.gwwg.w', 'w..gg..w', '.w....w.', '..wwww..'],
    desc: l => `After standing still for 0.4s, deal <b>+${15 * l}%</b> damage.`, zhDesc: l => `静立 0.4 秒后伤害 <b>+${15 * l}%</b>。`, ap: (s, l) => { s.still = l; } },
  { id: 'twin', name: 'TWIN RUNE', zh: '双生', rar: 2, max: 1, tags: ['MULTISHOT', '多重'], icon: ['wwwwww..', 'wggggw..', 'wwwwww..', '........', '..wwwwww', '..wggggw', '..wwwwww', '........'],
    desc: () => `<b>+1</b> to every attack's count; extra projectiles split the damage (<b>×1.44</b> total).`, zhDesc: () => `所有攻击的数量 <b>+1</b>；额外弹丸分摊伤害（合计 <b>×1.44</b>）。`, ap: (s, l) => { s.multi += l; },
    ad: AD({ whip: ['+1 extra lash', '多抽一鞭'], fan: ['+1 gust blade', '多一道风刃'], wave: ['+1 sound arc', '多一道音波'], gun: ['+1 bullet per shot', '每次多射一发'], blade: ['swings launch blade waves', '挥砍放出剑气'], maul: ['+1 aftershock ring', '多一圈余震'], beam: ['+1 split beam', '多一道分光'], lob: ['+1 extra bomb', '多投一枚炸弹'], throw: ['+1 projectile', '多掷一枚'], bow: ['+1 arrow per draw', '每次多一支箭'], spear: ['+1 parallel thrust', '多一道平行突刺'], scythe: ['+1 expanding crescent', '多一道扩散月刃'], guard: ['returns more bullets', '反弹更多子弹'], stream: ['more streams', '更多喷流'], mine: ['+1 mine per throw', '每次多布一颗雷'], summon: ['+1 wisp', '多召一只灵体'], brush: ['bigger detonations', '引爆范围更大'] }) },
  { id: 'echo', name: 'ECHO', zh: '回响', rar: 1, max: 3, tags: ['ON ATTACK', '攻击时'], icon: ['..gggg..', '.g....g.', 'g..ww..g', 'g.w..w.g', 'g.w..w.g', 'g..ww..g', '.g....g.', '..gggg..'],
    desc: l => `Every attack replays as a ghost at <b>${25 + 10 * l}%</b> power.`, zhDesc: l => `每次攻击都会以 <b>${25 + 10 * l}%</b> 威力由幽影重演。`, ap: (s, l) => { s.echo = 1; s.echoMul = 0.25 + 0.1 * l; },
    ad: AD({ whip: ['a ghost lash follows', '幽影鞭紧随'], fan: ['a ghost gust follows', '幽影疾风紧随'], wave: ['the horn sounds twice', '号声再响一次'], gun: ['every trigger pull fires again', '每次射击都会重演'], blade: ['a ghost blade repeats each swing', '幽影刀重演每次挥砍'], maul: ['a second slam lands a beat later', '稍后落下第二锤'], beam: ['the beam fires twice', '光束发射两次'], lob: ['a ghost bomb follows', '幽影炸弹紧随'], throw: ['ghost throws follow', '幽影飞刃紧随'], bow: ['a ghost arrow follows', '幽影箭紧随'], spear: ['a ghost thrust follows', '幽影突刺紧随'], scythe: ['a ghost spin follows', '幽影旋斩紧随'], guard: ['a ghost poke follows', '幽影戳击紧随'], stream: ['the stream echoes', '喷流产生回响'], mine: ['a ghost mine follows', '幽影地雷紧随'], summon: ['ghost wisps follow', '幽影灵体紧随'], brush: ['the fire line echoes', '火线回响'] }) },
  { id: 'static', name: 'STATIC', zh: '静电', rar: 1, max: 3, tags: ['ON HIT · SHOCK', '命中 · 雷'], icon: ['....cc..', '...cc...', '..cc....', '.cccccc.', '....cc..', '...cc...', '..cc....', '.c......'],
    desc: l => `Hits have <b>${8 + 6 * l}%</b> chance to arc <em class="c">lightning</em> through <b>${2 + l}</b> foes.`, zhDesc: l => `命中有 <b>${8 + 6 * l}%</b> 几率放出<em class="c">闪电</em>，连锁 <b>${2 + l}</b> 个敌人。`, ap: (s, l) => { s.static = 0.08 + 0.06 * l; s.staticN = 2 + l; } },
  { id: 'kindle', name: 'KINDLE', zh: '引火', rar: 1, max: 3, tags: ['ON HIT · FIRE', '命中 · 火'], icon: ['...o....', '...oo...', '..ooo.o.', '.oooooo.', '.ooyyoo.', '.oyyyyo.', '..oyyo..', '...oo...'],
    desc: () => `Hits <em class="o">ignite</em> foes, burning them for 3s.`, zhDesc: () => `命中使敌人<em class="o">燃烧</em> 3 秒。`, ap: (s, l) => { s.kindle = l; } },
  { id: 'rime', name: 'FROSTBIND', zh: '寒霜', rar: 1, max: 3, tags: ['ON HIT · FROST', '命中 · 冰'], icon: ['...f....', '.f.f.f..', '..fff...', 'fffffff.', '..fff...', '.f.f.f..', '...f....', '........'],
    desc: () => `Hits <em class="f">chill</em>. 5 chills <em class="f">freeze</em> a foe; frozen foes take +30%.`, zhDesc: () => `命中使敌人<em class="f">寒冷</em>，叠满 5 层<em class="f">冻结</em>；冻结的敌人受到伤害 +30%。`, ap: (s, l) => { s.rime = l; } },
  { id: 'volatile', name: 'VOLATILE', zh: '爆裂', rar: 1, max: 3, tags: ['ON KILL · BLAST', '击杀 · 爆炸'], icon: ['......o.', '.....y..', '..wwww..', '.wggggw.', '.wgwggw.', '.wggggw.', '..wwww..', '........'],
    desc: () => `Slain foes <b>explode</b>. Explosions can chain.`, zhDesc: () => `被击杀的敌人会<b>爆炸</b>，爆炸可以连锁。`, ap: (s, l) => { s.volatile = l; } },
  { id: 'shatter', name: 'SHATTER', zh: '碎裂', rar: 1, max: 3, tags: ['ON KILL · SHARDS', '击杀 · 碎片'], icon: ['w......w', '.w....w.', '..w..w..', '........', '..w..w..', '.w....w.', 'w......w', '........'],
    desc: l => `Slain foes burst into <b>${2 + 2 * l}</b> shards.`, zhDesc: l => `被击杀的敌人炸成 <b>${2 + 2 * l}</b> 枚碎片。`, ap: (s, l) => { s.shatter = l; } },
  { id: 'seeker', name: 'SEEKER', zh: '追踪', rar: 1, max: 3, tags: ['ON ATTACK', '攻击时'], icon: ['...w....', '.wwwww..', '.w.w.w..', 'wwwcwww.', '.w.w.w..', '.wwwww..', '...w....', '........'],
    desc: l => `Every 3rd attack sheds <b>${1 + l}</b> homing motes.`, zhDesc: l => `每第 3 次攻击放出 <b>${1 + l}</b> 枚追踪追踪弹。`, ap: (s, l) => { s.seeker = l; } },
  { id: 'leech', name: 'LIFESTEAL', zh: '吸血', rar: 1, max: 3, tags: ['ON KILL · HEAL', '击杀 · 治疗'], icon: ['...r....', '...r....', '..rrr...', '.rrrrr..', '.rrwrr..', '.rrrrr..', '..rrr...', '........'],
    desc: l => `Every <b>${[0, 25, 18, 12][l]}</b> kills, heal 1.`, zhDesc: l => `每击杀 <b>${[0, 25, 18, 12][l]}</b> 个敌人，回复 1 点生命。`, ap: (s, l) => { s.leech = [0, 25, 18, 12][l]; } },
  { id: 'phantom', name: 'PHANTOM DASH', zh: '幻影冲刺', rar: 1, max: 2, tags: ['ON DASH', '冲刺时'], icon: ['..www...', '.wwwww..', '.w.w.w..', '.wwwww..', '.wwwww..', '.w.w.w..', '........', '........'],
    desc: () => `Dashing <b>erases bullets</b> and cuts foes you pass through.`, zhDesc: () => `冲刺可<b>抹除子弹</b>，并切伤穿过的敌人。`, ap: (s, l) => { s.phantom = l; } },
  { id: 'thorns', name: 'BACKLASH', zh: '反击波', rar: 1, max: 2, tags: ['ON HURT', '受伤时'], icon: ['w..w..w.', '.w.w.w..', '..www...', 'wwwwwww.', '..www...', '.w.w.w..', 'w..w..w.', '........'],
    desc: () => `When hit, release a nova that <b>clears bullets</b> and wounds everything near.`, zhDesc: () => `受伤时释放冲击波，<b>清除子弹</b>并伤害周围敌人。`, ap: (s, l) => { s.thorns = l; } },
  { id: 'exec', name: 'EXECUTE', zh: '斩杀', rar: 1, max: 2, tags: ['DAMAGE', '伤害'], icon: ['.wwwww..', 'wwwwwww.', 'w..w..w.', 'w..w..w.', 'wwwwwww.', '.ww.ww..', '.w.w.w..', '........'],
    desc: l => `Foes under <b>${15 + 10 * l}%</b> HP take <b>+60%</b> damage.`, zhDesc: l => `生命低于 <b>${15 + 10 * l}%</b> 的敌人受到伤害 <b>+60%</b>。`, ap: (s, l) => { s.exec = 0.15 + 0.1 * l; } },
  { id: 'over', name: 'PRISM CORE', zh: '棱镜核心', rar: 1, max: 2, tags: ['CHROMA', '色彩'], icon: ['...c....', '..ccc...', '.vvwvv..', 'rrwwwrr.', '.yywyy..', '..ooo...', '...o....', '........'],
    desc: () => `<em class="c">Chroma</em> charges <b>40%</b> faster and lasts <b>+2s</b>.`, zhDesc: () => `<em class="c">色彩</em>充能快 <b>40%</b>，持续时间 <b>+2 秒</b>。`, ap: (s, l) => { s.over = l; } },
  { id: 'cresc', name: 'CRESCENDO', zh: '越战越勇', rar: 1, max: 2, tags: ['COMBO', '连击'], icon: ['.......w', '......ww', '.....www', '....wwww', '...wwwww', '..wwwwww', '.wwwwwww', 'wwwwwwww'],
    desc: l => `Each combo point adds <b>+1%</b> damage, up to <b>+${30 * l}%</b>.`, zhDesc: l => `每点连击伤害 <b>+1%</b>，最高 <b>+${30 * l}%</b>。`, ap: (s, l) => { s.cresc = l; } },
  { id: 'first', name: 'AMBUSH', zh: '偷袭', rar: 1, max: 2, tags: ['FIRST HIT', '首击'], icon: ['w.......', 'ww......', 'www.....', 'wwww....', 'wwwww...', 'www.....', 'w.w.....', '...w....'],
    desc: l => `Your first hit on each foe deals <b>+${50 * l}%</b> damage.`, zhDesc: l => `对每个敌人的第一击伤害 <b>+${50 * l}%</b>。`, ap: (s, l) => { s.first = l; } },
  { id: 'midas', name: 'MIDAS TOUCH', zh: '点金手', rar: 1, max: 2, tags: ['ON CRIT · GOLD', '暴击 · 金币'], icon: ['...y....', '..yyy...', '.yyYyy..', 'yyYwYyy.', '.yyYyy..', '..yyy...', '...y....', '........'],
    desc: l => `Crits have <b>${25 * l}%</b> chance to strike a coin loose.`, zhDesc: l => `暴击有 <b>${25 * l}%</b> 几率敲出一枚金币。`, ap: (s, l) => { s.midas = l; } },
  { id: 'glass', name: 'GLASS CANNON', zh: '玻璃大炮', rar: 2, max: 1, tags: ['CURSED POWER', '诅咒之力'], icon: ['.wwwww..', 'w..w..w.', 'w...w.w.', 'w..w..w.', 'w.w...w.', 'w..w..w.', '.wwwww..', '........'],
    desc: () => `<b>+50%</b> damage. <b>-3</b> max HP.`, zhDesc: () => `伤害 <b>+50%</b>，最大生命 <b>-3</b>。`, ap: s => { s.dmg += 0.5; } },
  { id: 'storm', name: 'TEMPEST', zh: '风暴', rar: 2, max: 1, tags: ['ON CRIT · SHOCK', '暴击 · 雷'], icon: ['..yy.yy.', '.yy.yy..', 'yyyyyyy.', '..yy.yy.', '.yy.yy..', 'yy.yy...', '........', '........'],
    desc: () => `Every <em class="y">crit</em> calls down chain lightning.`, zhDesc: () => `每次<em class="y">暴击</em>都会召下连锁闪电。`, ap: s => { s.storm = 1; } },
  { id: 'hole', name: 'SINGULARITY', zh: '奇点', rar: 2, max: 1, tags: ['ON KILL · VOID', '击杀 · 虚空'], icon: ['..vvvv..', '.v....v.', 'v..vv..v', 'v.v..v.v', 'v.v.v..v', 'v..v...v', '.v....v.', '..vvvv..'],
    desc: () => `Every 10th kill tears open a <em class="v">void</em> that drags and shreds foes.`, zhDesc: () => `每第 10 次击杀撕开一道<em class="v">虚空</em>，吞噬并撕碎敌人。`, ap: s => { s.hole = 1; } },
  { id: 'halo', name: 'BLADE HALO', zh: '环刃', rar: 2, max: 1, tags: ['ORBIT · DEFENSE', '环绕 · 防御'], icon: ['...w....', '........', 'w..gg..w', '..gwwg..', '..gwwg..', 'w..gg..w', '........', '...w....'],
    desc: () => `Blade orbs circle you, cutting foes and <b>eating bullets</b>. +1 orb per multishot.`, zhDesc: () => `刃珠环绕在你身边，切伤敌人并<b>吞噬子弹</b>。每级多重额外 +1 颗。`, ap: s => { s.halo = 1; } },
];
const FL = () => 1 + (G.depth || 0) * 0.2; // depth scaling for flat proc damage (8 levels: ×1 → ×2.4)
GLYPHS.push(
  /* ---- blaze ---- */
  { id: 'ember', name: 'EMBER', zh: '余烬', rar: 0, max: 2, tags: ['VS BURNING', '对燃烧'], icon: ['........', '...o....', '..ooo...', '.oyyyo..', '.oywyo..', '.oyyyo..', '..ooo...', '........'],
    desc: l => `Burning foes take <b>+${12 * l}%</b> damage from everything.`, zhDesc: l => `燃烧中的敌人受到的所有伤害 <b>+${12 * l}%</b>。`, ap: (s, l) => { s.ember = l; } },
  { id: 'pyre', name: 'PYRE', zh: '焚化', rar: 1, max: 2, tags: ['ON KILL · FIRE', '击杀 · 火'], icon: ['...o.o..', '..oo.oo.', '..ooooo.', '.ooyyoo.', '.oyywyo.', '.oyyyyo.', '..wwww..', '.w.ww.w.'],
    desc: l => `Burning foes that die erupt in flame, <em class="o">igniting</em> everything near. <i>(${20 + 6 * l}px)</i>`, zhDesc: l => `燃烧中的敌人死亡时喷发烈焰，<em class="o">点燃</em>周围一切。<i>（半径 ${20 + 6 * l}）</i>`, ap: (s, l) => { s.pyre = l; } },
  { id: 'demo', name: 'DEMOLITION', zh: '爆破', rar: 0, max: 3, tags: ['EXPLOSIONS', '爆炸'], icon: ['.....yo.', '....w...', '..wwww..', '.wggggw.', 'wgg..ggw', 'wgg..ggw', '.wggggw.', '..wwww..'],
    desc: l => `Every explosion you cause is <b>+12%</b> bigger and <b>+15%</b> stronger. <i>(now +${12 * l}% / +${15 * l}%)</i>`, zhDesc: l => `你造成的所有爆炸范围 <b>+12%</b>，伤害 <b>+15%</b>。<i>（当前 +${12 * l}% / +${15 * l}%）</i>`, ap: (s, l) => { s.blastR += 0.12 * l; s.blastD += 0.15 * l; } },
  { id: 'concuss', name: 'CONCUSSION', zh: '震荡', rar: 1, max: 1, tags: ['EXPLOSIONS', '爆炸'], icon: ['w..w..w.', '.w.w.w..', '..yyy...', 'wwy.yww.', '..yyy...', '.w.w.w..', 'w..w..w.', '........'],
    desc: () => `Your explosions <b>stun</b> foes for 0.6s. Stunned bosses take +50%.`, zhDesc: () => `你的爆炸使敌人<b>眩晕</b> 0.6 秒。眩晕的首领受到伤害 +50%。`, ap: s => { s.concuss = 1; } },
  { id: 'phoenix', name: 'PHOENIX', zh: '不死鸟', rar: 2, max: 1, tags: ['ONCE PER PAGE', '每页一次'], icon: ['o......o', 'oo....oo', '.oo..oo.', '..oyyo..', '...yy...', '..oyyo..', '.o.oo.o.', '...o....'],
    desc: () => `Once per page, a killing blow instead <b>revives</b> you with 3 HP in a firestorm.`, zhDesc: () => `每页一次：受到致命伤害时改为<b>浴火重生</b>，回复 3 点生命并掀起火暴。`, ap: s => { s.phoenix = 1; } },
  /* ---- frost ---- */
  { id: 'shardice', name: 'ICICLE', zh: '冰棱', rar: 1, max: 2, tags: ['VS FROZEN', '对冻结'], icon: ['...f....', '..fwf...', '..fwf.f.', 'f.fwf.f.', 'ffwwwff.', '.fwwwf..', '..fff...', '........'],
    desc: l => `Frozen foes that die shatter into <b>${3 + 2 * l}</b> ice shards that <em class="f">chill</em>.`, zhDesc: l => `冻结的敌人死亡时碎成 <b>${3 + 2 * l}</b> 枚冰棱，使命中者<em class="f">寒冷</em>。`, ap: (s, l) => { s.shardice = l; } },
  { id: 'frostbite', name: 'FROSTBITE', zh: '冻伤', rar: 0, max: 2, tags: ['VS CHILLED', '对寒冷'], icon: ['ffffffff', 'fwwwwwwf', '.fw..wf.', '.fw..wf.', '..f..f..', '..f..f..', '........', '........'],
    desc: l => `Each <em class="f">chill</em> stack on a foe: <b>+${3 * l}%</b> damage taken. Frozen counts as 5.`, zhDesc: l => `敌人每层<em class="f">寒冷</em>使其受到伤害 <b>+${3 * l}%</b>，冻结视为 5 层。`, ap: (s, l) => { s.frostbite = l; } },
  { id: 'glacier', name: 'GLACIER', zh: '冰川', rar: 1, max: 1, tags: ['ON SHIELD BREAK', '护盾破碎时'], icon: ['ffffffff', 'fwwwwwwf', 'fwfwwfwf', 'fwwffwwf', '.fwffwf.', '.fwwwwf.', '..fwwf..', '...ff...'],
    desc: () => `When a shield breaks, <em class="f">freeze</em> every foe within 70px.`, zhDesc: () => `护盾破碎时，<em class="f">冻结</em>周围 70 范围内的所有敌人。`, ap: s => { s.glacier = 1; } },
  { id: 'coldsnap', name: 'COLD SNAP', zh: '寒潮', rar: 0, max: 2, tags: ['ON DASH', '冲刺时'], icon: ['.....f..', 'w..f.f.f', '.w..fff.', 'ww.fffff', '.w..fff.', 'w..f.f.f', '.....f..', '........'],
    desc: l => `Dashing <em class="f">chills</em> every foe near your path by <b>${1 + l}</b>.`, zhDesc: l => `冲刺使路径附近的敌人<em class="f">寒冷</em> <b>${1 + l}</b> 层。`, ap: (s, l) => { s.coldsnap = l; } },
  /* ---- storm ---- */
  { id: 'conduit', name: 'CONDUIT', zh: '导雷', rar: 1, max: 3, tags: ['EVERY Nth HIT', '每 N 次命中'], icon: ['...cc...', '...cc...', '..cccc..', '...cc...', '.c.cc.c.', 'c..cc..c', '...cc...', '..wwww..'],
    desc: l => `Every <b>${14 - 3 * l}</b>th hit calls a <em class="c">lightning bolt</em> onto the target.`, zhDesc: l => `每第 <b>${14 - 3 * l}</b> 次命中，向目标召下一道<em class="c">落雷</em>。`, ap: (s, l) => { s.conduit = l; } },
  { id: 'overload', name: 'OVERLOAD', zh: '过载', rar: 1, max: 2, tags: ['LIGHTNING', '闪电'], icon: ['..wwww..', '.wccccw.', '.wc..cw.', '.wccccw.', '.wc..cw.', '.wccccw.', '.wccccw.', '.wwwwww.'],
    desc: l => `Chain lightning jumps <b>+${l}</b> more and every jump feeds <em class="c">chroma</em>.`, zhDesc: l => `连锁闪电多跳 <b>${l}</b> 次，每一跳都为<em class="c">色彩</em>充能。`, ap: (s, l) => { s.overload = l; } },
  { id: 'arc', name: 'ARC TRAIL', zh: '电弧', rar: 1, max: 2, tags: ['ON DASH', '冲刺时'], icon: ['........', 'c.......', '.c...c..', '..c.c.c.', '...c...c', '........', 'wwwwwwww', '........'],
    desc: () => `Dashing leaves a crackling <em class="c">electric trail</em> that zaps foes.`, zhDesc: () => `冲刺留下噼啪作响的<em class="c">电弧轨迹</em>，电击触碰的敌人。`, ap: (s, l) => { s.arc = l; } },
  /* ---- shade ---- */
  { id: 'shade', name: 'SHADOW FAMILIAR', zh: '暗影使魔', rar: 2, max: 1, tags: ['COMPANION', '伙伴'], icon: ['..vvvv..', '.vvvvvv.', 'vvwvvwvv', 'vvvvvvvv', 'vvvvvvvv', 'vvvvvvvv', 'v.vv.vv.', '........'],
    desc: () => `A shadow familiar follows you and fires <em class="v">homing bolts</em> at foes. +1 shot per multishot.`, zhDesc: () => `一只暗影使魔伙伴跟随你，向敌人发射<em class="v">追踪暗弹</em>。每级多重额外 +1 发。`, ap: s => { s.shade = 1; } },
  { id: 'haunt', name: 'HAUNT', zh: '怨魂', rar: 1, max: 2, tags: ['ON KILL', '击杀时'], icon: ['....v...', '...vv...', '..vvv...', '.vvwvv..', '.vvvvv..', '..vvv...', '...v....', '........'],
    desc: l => `Slain foes release a <em class="v">ghost</em> that hunts another foe. <i>(${8 + 5 * l} dmg)</i>`, zhDesc: l => `被击杀的敌人放出一缕<em class="v">怨魂</em>，追猎下一个敌人。<i>（${8 + 5 * l} 伤害）</i>`, ap: (s, l) => { s.haunt = l; } },
  { id: 'mirage', name: 'MIRAGE', zh: '幻象', rar: 1, max: 2, tags: ['AFTER DASH', '冲刺后'], icon: ['.gg..ww.', 'gggwwww.', '.g..w...', 'gggwwww.', '.g..w...', 'g.gw.w..', '........', '........'],
    desc: l => `After a dash, your next attack is repeated by <b>${l}</b> ghost${l > 1 ? 's' : ''} at 50%.`, zhDesc: l => `冲刺后的下一次攻击，由 <b>${l}</b> 个幻影以 50% 威力重演。`, ap: (s, l) => { s.mirage = l; } },
  /* ---- blood ---- */
  { id: 'frenzy', name: 'BLOODLUST', zh: '嗜血', rar: 0, max: 2, tags: ['LOW HP', '低生命'], icon: ['r...r...', '.r...r..', '..r...r.', 'r..r...r', '.r..r...', '..r..r..', '...r..r.', '........'],
    desc: l => `At half HP or less: <b>+${15 * l}%</b> damage and <b>+${10 * l}%</b> attack speed.`, zhDesc: l => `生命不高于一半时：伤害 <b>+${15 * l}%</b>，攻速 <b>+${10 * l}%</b>。`, ap: (s, l) => { s.frenzy = l; } },
  { id: 'martyr', name: 'MARTYR', zh: '殉道', rar: 1, max: 1, tags: ['ON HURT', '受伤时'], icon: ['.rr..rr.', 'rrrr.rrr', 'rrr.rrrr', 'rrrr.rrr', '.rr.rrr.', '..rr.r..', '...rr...', '........'],
    desc: () => `Losing HP refills your shields and grants <b>+40%</b> damage for 4s.`, zhDesc: () => `失去生命时立刻充满护盾，并在 4 秒内伤害 <b>+40%</b>。`, ap: s => { s.martyr = 1; } },
  /* ---- gold ---- */
  { id: 'interest', name: 'INTEREST', zh: '利息', rar: 0, max: 2, tags: ['ON CLEAR', '清房时'], icon: ['........', '..yyyy..', '.yYYYYy.', '..yyyy..', '.yYYYYy.', '..yyyy..', '.yYYYYy.', '..yyyy..'],
    desc: l => `Clearing a room pays <b>${8 * l}%</b> of your gold (max ${6 * l}).`, zhDesc: l => `每清理一个房间，获得持有金币的 <b>${8 * l}%</b>（最多 ${6 * l}）。`, ap: (s, l) => { s.interest = l; } },
  { id: 'bounty', name: 'BOUNTY', zh: '赏金', rar: 0, max: 2, tags: ['VS ELITES', '对精英'], icon: ['...y....', '.yyyyy..', 'y.y.y.y.', 'yyywyyy.', 'y.y.y.y.', '.yyyyy..', '...y....', '........'],
    desc: l => `Elites and bosses take <b>+${12 * l}%</b> damage. Elites drop more gold.`, zhDesc: l => `精英与首领受到伤害 <b>+${12 * l}%</b>，精英掉落更多金币。`, ap: (s, l) => { s.bounty = l; } },
  { id: 'goldrush', name: 'GOLD RUSH', zh: '淘金', rar: 1, max: 2, tags: ['ON COIN', '拾金时'], icon: ['....yyy.', '...yYYYy', 'ww.yYwYy', '...yYYYy', 'ww.yYYYy', '...yYYYy', '....yyy.', '........'],
    desc: l => `Each coin you collect: <b>+1%</b> damage for 5s, stacking to <b>+${15 * l}%</b>.`, zhDesc: l => `每拾取一枚金币，5 秒内伤害 <b>+1%</b>，最多叠加到 <b>+${15 * l}%</b>。`, ap: (s, l) => { s.goldrush = l; } },
  { id: 'patron', name: 'PATRON', zh: '贵客', rar: 1, max: 2, tags: ['SHOPS', '商店'], icon: ['.yyyyyy.', '.ywwwwy.', '.yw##wy.', '.ywwwwy.', '.yw##wy.', '.ywwwwy.', '.yyyyyy.', '........'],
    desc: l => `Prices <b>-${20 * l}%</b>. One free reroll on every page.`, zhDesc: l => `所有价格 <b>-${20 * l}%</b>，每页赠送一次免费重抽。`, ap: (s, l) => { s.shop -= 0.2 * l; s.patron = l; } },
  /* ---- edge ---- */
  { id: 'pierce', name: 'PIERCE', zh: '穿透', rar: 0, max: 2, tags: ['PIERCE', '穿透'], icon: ['........', '...w....', 'w..w...w', 'wwwwwwwy', 'w..w...w', '...w....', '........', '........'],
    desc: l => `Projectiles pierce <b>+${l}</b> foe${l > 1 ? 's' : ''}. Melee hits gain <b>+${5 * l}%</b> crit.`, zhDesc: l => `投射物额外穿透 <b>${l}</b> 个敌人；近战命中暴击率 <b>+${5 * l}%</b>。`, ap: (s, l) => { s.pierce = l; },
    ad: AD({ gun: ['bullets pierce', '子弹穿透'], bow: ['arrows pierce', '箭矢穿透'], throw: ['blades pierce', '飞刃穿透'], blade: ['melee crit up', '近战暴击提升'], spear: ['melee crit up', '近战暴击提升'], scythe: ['melee crit up', '近战暴击提升'], maul: ['melee crit up', '近战暴击提升'], whip: ['melee crit up', '近战暴击提升'], fan: ['melee crit up', '近战暴击提升'] }) },
  { id: 'bleed', name: 'LACERATE', zh: '撕裂', rar: 1, max: 2, tags: ['ON CRIT', '暴击时'], icon: ['w.......', '.w......', '..w..r..', '...wrr..', '...rrrr.', '..rrwrr.', '..rrrrr.', '...rrr..'],
    desc: l => `Crits make foes <em class="r">bleed</em> for <b>${40 * l}%</b> of the crit over 2s.`, zhDesc: l => `暴击使敌人<em class="r">流血</em>，2 秒内再受到该次暴击 <b>${40 * l}%</b> 的伤害。`, ap: (s, l) => { s.bleed = l; } },
  { id: 'focus', name: 'FOCUS', zh: '专注', rar: 0, max: 2, tags: ['SAME TARGET', '同一目标'], icon: ['wwwwwwww', 'w......w', 'w.gggg.w', 'w.gwwg.w', 'w.gwwg.w', 'w.gggg.w', 'w......w', 'wwwwwwww'],
    desc: l => `Each hit in a row on the same foe: <b>+3%</b> damage, up to <b>+${15 * l}%</b>.`, zhDesc: l => `连续命中同一敌人时，每次伤害 <b>+3%</b>，最高 <b>+${15 * l}%</b>。`, ap: (s, l) => { s.focus = l; } },
  /* ---- wind ---- */
  { id: 'tailwind', name: 'TAILWIND', zh: '顺风', rar: 0, max: 2, tags: ['AFTER DASH', '冲刺后'], icon: ['........', 'wwwww...', '.....w..', 'wwww..w.', '....w.w.', 'ww..w...', '..ww....', '........'],
    desc: l => `For 1.2s after a dash, deal <b>+${25 * l}%</b> damage.`, zhDesc: l => `冲刺后 1.2 秒内，伤害 <b>+${25 * l}%</b>。`, ap: (s, l) => { s.tailwind = l; } },
  { id: 'cyclone', name: 'CYCLONE', zh: '旋风', rar: 2, max: 1, tags: ['ON DASH', '冲刺时'], icon: ['wwwwwww.', '.wggggw.', '..wwwww.', '..wggw..', '...www..', '...wg...', '....w...', '........'],
    desc: () => `Every dash releases a ring of <b>8</b> wind blades. +2 per multishot.`, zhDesc: () => `每次冲刺释放一圈 <b>8</b> 道风刃。每级多重额外 +2 道。`, ap: s => { s.cyclone = 1; } },
  { id: 'relay', name: 'SECOND WIND', zh: '回气', rar: 0, max: 2, tags: ['ON KILL', '击杀时'], icon: ['..www...', '.w...w..', 'w.....w.', 'w..w..w.', 'w...w.w.', '.w....ww', '..www.w.', '........'],
    desc: l => `Every kill recharges your dash by <b>${25 * l}%</b>.`, zhDesc: l => `每次击杀，冲刺冷却恢复 <b>${25 * l}%</b>。`, ap: (s, l) => { s.relay = l; } },
  /* ---- ward ---- */
  { id: 'bulwark', name: 'BULWARK', zh: '壁垒', rar: 0, max: 2, tags: ['FULL SHIELD', '满护盾'], icon: ['wwwwwww.', 'wgggggw.', 'wgwwwgw.', 'wgwgwgw.', 'wgwwwgw.', '.wgggw..', '..wgw...', '...w....'],
    desc: l => `<b>+1</b> shield. While shields are full, <b>+${10 * l}%</b> damage.`, zhDesc: l => `护盾 <b>+1</b>。护盾全满时伤害 <b>+${10 * l}%</b>。`, ap: (s, l) => { s.maxSh += l; s.bulwark = l; } },
  { id: 'retort', name: 'RIPOSTE', zh: '还击', rar: 1, max: 2, tags: ['ON SHIELD HIT', '护盾受击时'], icon: ['......y.', 'wwwww.y.', 'wgggw...', 'wgggwyy.', 'wgggw...', '.wgw..y.', '..w.....', '........'],
    desc: l => `When a shield absorbs a hit, your next <b>${2 + l}</b> hits are <em class="y">crits</em>.`, zhDesc: l => `护盾抵挡伤害后，接下来 <b>${2 + l}</b> 次命中必定<em class="y">暴击</em>。`, ap: (s, l) => { s.retort = l; } },
  { id: 'aegis', name: 'AEGIS', zh: '神盾', rar: 2, max: 1, tags: ['EVERY 10s', '每 10 秒'], icon: ['..yyyy..', '.y....y.', 'y.wwww.y', 'y.wggw.y', 'y.wggw.y', '.y.ww.y.', '..y..y..', '...yy...'],
    desc: () => `Every 10s, a golden ward <b>blocks</b> the next hit completely.`, zhDesc: () => `每 10 秒生成一层金色结界，完全<b>格挡</b>下一次伤害。`, ap: s => { s.aegis = 1; } },
  /* ---- chroma ---- */
  { id: 'spectrum', name: 'SPECTRUM', zh: '光谱', rar: 0, max: 2, tags: ['CHROMA', '色彩'], icon: ['rrrrrrrr', 'oooooooo', 'yyyyyyyy', 'cccccccc', 'ffffffff', 'vvvvvvvv', '........', '........'],
    desc: l => `Kills feed <b>+${2 * l}</b> extra <em class="c">chroma</em>; kills during chroma extend it.`, zhDesc: l => `击杀额外获得 <b>${2 * l}</b> 点<em class="c">色彩</em>；色彩期间击杀会延长持续时间。`, ap: (s, l) => { s.spectrum = l; } },
  { id: 'afterglow', name: 'AFTERGLOW', zh: '残光', rar: 1, max: 1, tags: ['CHROMA END', '色彩结束时'], icon: ['........', '...yy...', '..yooy..', '.yorroy.', 'yorrrroy', 'wwwwwwww', '.g.g.g.g', '........'],
    desc: () => `When <em class="c">chroma</em> ends: <b>+2</b> overshield and a shockwave.`, zhDesc: () => `<em class="c">色彩</em>结束时：获得 <b>2</b> 层额外护盾并释放冲击波。`, ap: s => { s.afterglow = 1; } },
  { id: 'palette', name: 'PRISM CROWN', zh: '棱彩王冠', rar: 2, max: 1, tags: ['SCHOOLS', '流派'], icon: ['..wwww..', '.wrwywww', 'wwwwwcww', 'wvwww.ww', 'wwwww..w', '.wwfw..w', '..wwwww.', '........'],
    desc: () => `<b>+6%</b> damage for every school you have awakened.`, zhDesc: () => `每有一个流派觉醒，伤害 <b>+6%</b>。`, ap: s => { s.palette = 1; } },
);
const GL = {}; GLYPHS.forEach(g => { GL[g.id] = g; });
/* schools (流派): every glyph belongs to 1–2; owning 3 / 5 / 7 distinct glyphs of a school awakens tier I / II / III */
const SCHOOLS = {
  blaze: { name: 'BLAZE', zh: '烈焰', col: C.fire, cls: 'o', t: [['Burns deal +50%.', '燃烧伤害 +50%。'], ['Your explosions +25% bigger.', '你的爆炸范围 +25%。'], ['Every burning foe explodes on death.', '燃烧的敌人死亡时必定爆炸。']],
    ap: (s, k) => { if (k >= 2) s.blastR += 0.25; } },
  frost: { name: 'FROST', zh: '冰霜', col: C.frost, cls: 'f', t: [['Freezing needs 1 fewer chill.', '冻结所需寒冷层数 -1。'], ['Frozen foes take +60% (was +30%).', '冻结的敌人受到伤害 +60%（原 +30%）。'], ['A freeze chills every foe nearby by 3.', '冻结时使周围敌人寒冷 3 层。']] },
  volt: { name: 'STORM', zh: '雷霆', col: C.cyan, cls: 'c', t: [['Lightning chains +1 jump.', '闪电连锁 +1 跳。'], ['Lightning deals +50%.', '闪电伤害 +50%。'], ['Every 1.6s a bolt strikes a foe in the room.', '每 1.6 秒，落雷劈中房间内的一个敌人。']] },
  umbra: { name: 'SHADE', zh: '暗影', col: C.violet, cls: 'v', t: [['Ghost attacks +15% power.', '幽影攻击威力 +15%。'], ['Every 6th attack echoes, even without ECHO.', '每第 6 次攻击都会重演（无需回响）。'], ['Ghost attacks strike at full power.', '幽影攻击以全额威力出击。']],
    ap: (s, k) => { s.echoMul += 0.15; if (k >= 3) s.echoFull = 1; } },
  blood: { name: 'BLOOD', zh: '鲜血', col: C.red, cls: 'r', t: [['Clearing a room heals 1.', '清理房间时回复 1 点生命。'], ['+20% damage while hurt.', '未满血时伤害 +20%。'], ['Every 10 kills heal 1.', '每击杀 10 个敌人回复 1 点生命。']] },
  gold: { name: 'GOLD', zh: '黄金', col: C.gold, cls: 'y', t: [['Kills drop extra coins more often.', '击杀更常掉落额外金币。'], ['+1% damage per 5 gold held (max +30%).', '每持有 5 金币伤害 +1%（最多 +30%）。'], ['Each cleared room: +15 gold and a free reroll.', '每清理一个房间：+15 金币与一次免费重抽。']] },
  edge: { name: 'EDGE', zh: '锋刃', col: C.white, cls: 'w', t: [['+6% crit chance.', '暴击率 +6%。'], ['+30% crit damage.', '暴击伤害 +30%。'], ['Crits pierce bubble shields and deal +25%.', '暴击无视护罩，并额外 +25% 伤害。']],
    ap: (s, k) => { s.crit += 0.06; if (k >= 2) s.critMul += 0.3; } },
  wind: { name: 'WIND', zh: '疾风', col: C.mint, cls: 'm', t: [['+10% move speed.', '移动速度 +10%。'], ['Dash recharges 25% faster.', '冲刺冷却 -25%。'], ['Every dash fires 6 wind blades.', '每次冲刺放出 6 道风刃。']],
    ap: (s, k) => { s.spd += 0.1; if (k >= 2) s.dashCd -= 0.25; } },
  ward: { name: 'WARD', zh: '守护', col: C.lt, cls: 'g', t: [['+1 shield.', '护盾 +1。'], ['Shields regen 50% faster; a breaking shield releases a nova.', '护盾回复 +50%；护盾破碎时释放冲击波。'], ['After 4s unhurt, the next hit is blocked.', '4 秒未受伤后，格挡下一次伤害。']],
    ap: (s, k) => { s.maxSh += 1; if (k >= 2) s.shRegen *= 1.5; } },
  chroma: { name: 'CHROMA', zh: '棱彩', col: C.white, cls: 'chroma', t: [['Chroma charges 25% faster.', '色彩充能 +25%。'], ['Chroma lasts longer and hits harder (×1.7).', '色彩持续更久，伤害提升至 ×1.7。'], ['During chroma, kills extend it and hits may arc lightning.', '色彩期间击杀会延长时间，命中可能放出闪电。']],
    ap: (s, k) => { s.over += 0.6; if (k >= 2) { s.over += 0.5; s.chromaDmg += 0.2; } } },
};
const GSC = {
  sharp: ['edge'], haste: ['wind'], keen: ['edge', 'gold'], heavy: ['blaze'], heart: ['blood', 'ward'], plate: ['ward'], swift: ['wind'], greed: ['gold'], flow: ['wind'], still: ['ward'],
  twin: ['umbra'], echo: ['umbra'], static: ['volt'], kindle: ['blaze'], rime: ['frost'], volatile: ['blaze'], shatter: ['frost', 'edge'], seeker: ['umbra'], leech: ['blood'], phantom: ['umbra', 'wind'],
  thorns: ['blood', 'ward'], exec: ['edge'], over: ['chroma'], cresc: ['wind', 'chroma'], first: ['edge'], midas: ['gold'], glass: ['blood'], storm: ['volt'], hole: ['umbra', 'blaze'], halo: ['ward', 'umbra'],
  ember: ['blaze'], pyre: ['blaze'], demo: ['blaze'], concuss: ['blaze', 'ward'], phoenix: ['blaze', 'blood'], shardice: ['frost'], frostbite: ['frost'], glacier: ['frost', 'ward'], coldsnap: ['frost', 'wind'],
  conduit: ['volt'], overload: ['volt', 'chroma'], arc: ['volt', 'wind'], shade: ['umbra'], haunt: ['umbra', 'blood'], mirage: ['umbra'], frenzy: ['blood'], martyr: ['blood', 'ward'],
  interest: ['gold'], bounty: ['gold'], goldrush: ['gold'], patron: ['gold'], pierce: ['edge'], bleed: ['edge', 'blood'], focus: ['edge'], tailwind: ['wind'], cyclone: ['wind'], relay: ['wind'],
  bulwark: ['ward'], retort: ['ward', 'edge'], aegis: ['ward'], spectrum: ['chroma'], afterglow: ['chroma', 'ward'], palette: ['chroma'],
};
GLYPHS.forEach(g => { g.sc = GSC[g.id]; });
const gdesc = (g, l) => (LANG === 'zh' && g.zhDesc ? g.zhDesc : g.desc)(l);
const gtag = g => g.tags[LANG === 'zh' ? 1 : 0];
const gad = (g, type) => g.ad && g.ad[type] ? g.ad[type][LANG === 'zh' ? 1 : 0] : '';
const ROMAN3 = ['', 'I', 'II', 'III'];
const SCT = [3, 5, 7]; // runes needed for school tier I / II / III
const scTier = n => n >= SCT[2] ? 3 : n >= SCT[1] ? 2 : n >= SCT[0] ? 1 : 0;
const scNext = n => n < SCT[0] ? SCT[0] : n < SCT[1] ? SCT[1] : n < SCT[2] ? SCT[2] : 0;
// school progress pips (7, with a notch at each tier)
const scPips = (now, next = now) => { let h = ''; for (let i = 1; i <= SCT[2]; i++) h += `<i class="${i <= now ? 'on' : i <= next ? 'new' : ''}${SCT.includes(i) && i < SCT[2] ? ' cut' : ''}"></i>`; return h; };
const scName = id => LANG === 'zh' ? SCHOOLS[id].zh : SCHOOLS[id].name;
const scTxt = (id, k) => SCHOOLS[id].t[k - 1][LANG === 'zh' ? 1 : 0];
const SYN = [
  { id: 'napalm', name: 'BURNING GROUND', zh: '焦土', a: 'kindle', b: 'volatile', desc: 'Death blasts leave burning ground behind.', zhDesc: '死亡爆炸会在地面留下燃烧的火焰。' },
  { id: 'superconduct', name: 'SUPERCONDUCT', zh: '超导', a: 'static', b: 'rime', desc: 'Lightning deals 2.5× to chilled foes and spreads chill.', zhDesc: '闪电对寒冷的敌人造成 2.5 倍伤害，并传播寒冷。' },
  { id: 'swarm', name: 'SWARM', zh: '蜂群', a: 'shatter', b: 'seeker', desc: 'Shards hunt their prey.', zhDesc: '碎片会追踪猎物。' },
  { id: 'chorus', name: 'CHORUS', zh: '合唱', a: 'echo', b: 'twin', desc: 'Echoes strike at full power.', zhDesc: '回响以全额威力出击。' },
  { id: 'guillotine', name: 'GUILLOTINE', zh: '断头台', a: 'keen', b: 'exec', desc: 'Crits on low-HP foes are instant kills.', zhDesc: '对残血敌人的暴击直接斩杀。' },
  { id: 'cluster', name: 'CLUSTER', zh: '集束', a: 'volatile', b: 'shatter', desc: 'Shards detonate on impact.', zhDesc: '碎片在命中时爆炸。' },
  { id: 'wraith', name: 'WRAITH', zh: '怨灵', a: 'phantom', b: 'thorns', desc: 'Every dash ends in a backlash nova.', zhDesc: '每次冲刺结束都会释放反噬冲击。' },
  { id: 'windrun', name: 'WINDRUNNER', zh: '疾风行者', a: 'flow', b: 'swift', desc: 'While moving, +15% crit chance.', zhDesc: '移动时暴击率 +15%。' },
  { id: 'zen', name: 'DEADEYE', zh: '死神之眼', a: 'still', b: 'keen', desc: 'Standing still, crits gain +50% bonus damage.', zhDesc: '静立时，暴击获得 +50% 额外伤害加成。' },
  { id: 'steam', name: 'STEAM BURST', zh: '蒸汽爆', a: 'kindle', b: 'rime', desc: 'Fire meeting frost on one foe bursts into scalding steam.', zhDesc: '同一敌人身上冰火相遇，爆出灼热蒸汽。' },
  { id: 'thunderfire', name: 'THUNDERFIRE', zh: '雷火', a: 'static', b: 'kindle', desc: 'Lightning ignites, and deals 1.5× to burning foes.', zhDesc: '闪电会点燃敌人，并对燃烧的敌人造成 1.5 倍伤害。' },
  { id: 'avalanche', name: 'AVALANCHE', zh: '雪崩', a: 'rime', b: 'volatile', desc: 'Frozen foes explode in huge frost blasts that chill.', zhDesc: '冻结的敌人死亡时炸开巨大的冰爆，并使周围寒冷。' },
  { id: 'jackpot', name: 'JACKPOT', zh: '大奖', a: 'midas', b: 'keen', desc: 'Every 7th crit is a jackpot: 3× damage and 3 coins.', zhDesc: '每第 7 次暴击中头彩：3 倍伤害并掉落 3 枚金币。' },
  { id: 'bloodmoon', name: 'BLOOD MOON', zh: '血月', a: 'leech', b: 'glass', desc: 'Leech needs half as many kills.', zhDesc: '汲血所需击杀数减半。' },
  { id: 'phantasm', name: 'PHANTASM', zh: '幻群', a: 'echo', b: 'seeker', desc: 'Every echo also sheds a homing mote.', zhDesc: '每次回响都会额外放出一枚追踪追踪弹。' },
  { id: 'constellation', name: 'CONSTELLATION', zh: '星环', a: 'halo', b: 'twin', desc: 'Halo orbs fire motes at nearby foes.', zhDesc: '环刃的刃珠会向附近敌人发射追踪弹。' },
  { id: 'blink', name: 'BLINK', zh: '闪现', a: 'phantom', b: 'swift', desc: 'Kills during or right after a dash reset its cooldown.', zhDesc: '冲刺中或刚冲刺后击杀，立即重置冲刺。' },
  { id: 'spiked', name: 'SPIKED ARMOR', zh: '棘甲', a: 'thorns', b: 'plate', desc: 'Backlash is 1.5× wider and twice as strong.', zhDesc: '反噬冲击范围 1.5 倍，伤害翻倍。' },
  { id: 'assassin', name: 'ASSASSIN', zh: '刺客', a: 'first', b: 'phantom', desc: 'Foes cut by your dash are marked: your next hit on them crits for +50%.', zhDesc: '被冲刺切中的敌人会被标记：下一击必定暴击且 +50%。' },
  { id: 'tempo', name: 'TEMPO', zh: '节拍', a: 'cresc', b: 'flow', desc: 'Combos last 2s longer; Crescendo cap +30%.', zhDesc: '连击持续时间 +2 秒；渐强上限 +30%。' },
  { id: 'collapse', name: 'COLLAPSE', zh: '坍缩', a: 'hole', b: 'volatile', desc: 'Voids open every 6th kill and end in a giant blast.', zhDesc: '每第 6 次击杀就撕开虚空，虚空结束时引发巨爆。' },
  { id: 'judgment', name: 'JUDGMENT', zh: '天罚', a: 'storm', b: 'exec', desc: 'Lightning executes foes under 20% HP.', zhDesc: '闪电直接处决生命低于 20% 的敌人。' },
  { id: 'ionic', name: 'IONIC', zh: '离子', a: 'static', b: 'seeker', desc: 'Homing motes arc lightning on hit.', zhDesc: '追踪追踪弹命中时放出闪电。' },
  { id: 'hail', name: 'HAIL', zh: '冰雹', a: 'shatter', b: 'rime', desc: 'Shards chill whatever they hit.', zhDesc: '碎片会使命中的敌人寒冷。' },
  { id: 'wildfire', name: 'WILDFIRE', zh: '野火', a: 'kindle', b: 'haste', desc: 'Burning spreads to a nearby foe every second.', zhDesc: '燃烧每秒蔓延到附近的一个敌人。' },
  { id: 'goldleaf', name: 'GOLD PLATING', zh: '镀金', a: 'greed', b: 'plate', desc: 'Every 20 coins collected restore a shield.', zhDesc: '每拾取 20 枚金币恢复 1 层护盾。' },
  { id: 'bastion', name: 'BASTION', zh: '坚守', a: 'still', b: 'plate', desc: 'Standing still restores a shield every 2s.', zhDesc: '静立时每 2 秒恢复 1 层护盾。' },
  { id: 'supernova', name: 'SUPERNOVA', zh: '超新星', a: 'over', b: 'volatile', desc: 'Unleashing chroma sets off a ring of six blasts.', zhDesc: '释放色彩时引发一圈六连爆炸。' },
  { id: 'prismecho', name: 'PRISM ECHO', zh: '棱影', a: 'over', b: 'echo', desc: 'During chroma, echoes strike at full power.', zhDesc: '色彩期间，回响以全额威力出击。' },
  { id: 'deathmark', name: 'DEATH MARK', zh: '死亡印记', a: 'bleed', b: 'exec', desc: 'Bleeding foes count as low HP 15% sooner.', zhDesc: '流血的敌人更早进入斩杀线（+15%）。' },
  { id: 'stormfront', name: 'STORMFRONT', zh: '雷暴', a: 'conduit', b: 'static', desc: 'Conduit bolts chain to 3 more foes.', zhDesc: '导体落雷会连锁到另外 3 个敌人。' },
  { id: 'shatterpoint', name: 'SHATTERPOINT', zh: '碎点', a: 'frostbite', b: 'keen', desc: 'Crits on frozen foes shatter them (bosses take 2×).', zhDesc: '暴击冻结的敌人会将其击碎（首领受到 2 倍）。' },
  { id: 'inferno', name: 'INFERNO', zh: '炼狱', a: 'pyre', b: 'demo', desc: 'Pyre eruptions are twice as big and leave fire.', zhDesc: '焚身的喷发范围翻倍，并留下火焰。' },
  { id: 'vengeance', name: 'VENGEANCE', zh: '复仇', a: 'martyr', b: 'thorns', desc: 'Losing HP releases a huge backlash that heals 1 if it kills 3+.', zhDesc: '失去生命时释放巨大反噬，若击杀 3 个以上则回复 1 点生命。' },
];
const SYNM = {}; SYN.forEach(s => { SYNM[s.id] = s; });
let S = {};
function baseStats() {
  return { dmg: 1, rate: 1, crit: 0.05, critMul: 2, size: 1, kb: 1, multi: 0, spd: 1, dashCd: 1, echo: 0, echoMul: 0, echoFull: 0, static: 0, staticN: 0, kindle: 0, rime: 0, volatile: 0, shatter: 0, seeker: 0, leech: 0, phantom: 0, thorns: 0, exec: 0, over: 0, greed: 1, magnet: 44, storm: 0, pierce: 0, hole: 0, halo: 0, maxSh: 2, shRegen: 1, flow: 0, still: 0, cresc: 0, first: 0, midas: 0,
    blastR: 1, blastD: 1, chromaDmg: 1.5, shop: 1, ember: 0, pyre: 0, concuss: 0, phoenix: 0, shardice: 0, frostbite: 0, glacier: 0, coldsnap: 0, conduit: 0, overload: 0, arc: 0, shade: 0, haunt: 0, mirage: 0, frenzy: 0, martyr: 0,
    interest: 0, bounty: 0, goldrush: 0, patron: 0, bleed: 0, focus: 0, tailwind: 0, cyclone: 0, relay: 0, bulwark: 0, retort: 0, aegis: 0, spectrum: 0, afterglow: 0, palette: 0 };
}
function schoolCounts() { const n = {}; for (const id in SCHOOLS) n[id] = 0; for (const id in G.gl) for (const sc of GL[id].sc) n[sc]++; return n; }
// every source of power, in the order recalc applies it (also used for the stats breakdown)
function powerSources() {
  const out = [], H = hero();
  out.push({ k: 'hero', name: tn(H), ap: s => H.ap(s) });
  for (const id in G.gl) out.push({ k: 'glyph', id, name: `${tn(GL[id])} ${ROMAN3[G.gl[id]] || G.gl[id]}`, ap: s => GL[id].ap(s, G.gl[id]) });
  const n = schoolCounts();
  for (const id in SCHOOLS) { const k = scTier(n[id]); if (k && SCHOOLS[id].ap) out.push({ k: 'school', id, name: `${scName(id)} ${ROMAN3[k]}`, ap: s => SCHOOLS[id].ap(s, k) }); }
  const fr = G.frags || {};
  if (fr.red) out.push({ k: 'frag', name: tn(STORY.frag.red), ap: s => { s.dmg += 0.15; } });
  if (fr.cyan) out.push({ k: 'frag', name: tn(STORY.frag.cyan), ap: s => { s.over += 0.75; } });
  if (fr.gold) out.push({ k: 'frag', name: tn(STORY.frag.gold), ap: s => { s.crit += 0.08; s.greed += 0.3; } });
  for (const b of G.blessings) out.push({ k: 'bless', name: tn(b), ap: b.ap });
  return out;
}
function recalc() {
  S = baseStats();
  for (const src of powerSources()) src.ap(S);
  const n = schoolCounts(); G.sc = n; G.st = {}; for (const id in n) G.st[id] = scTier(n[id]);
  G.syn = new Set(SYN.filter(s => G.synOn && G.synOn.has(s.id) && G.gl[s.a] && G.gl[s.b]).map(s => s.id));
  if (G.syn.has('bloodmoon')) S.leech = Math.ceil(S.leech / 2);
  if (S.echoFull || (P.chromaT > 0 && G.syn.has('prismecho'))) S.echoMul = 1;
  S.shop = Math.max(0.4, S.shop) * G.diff.shop; S.greed *= G.diff.gold; S.maxSh = Math.max(0, S.maxSh + G.diff.sh);
  P.maxHp = Math.max(2, hero().hp + (G.gl.heart || 0) - (G.gl.glass ? 3 : 0) + (G.hpBonus || 0) + metaHp());
  P.hp = Math.min(P.hp, P.maxHp); P.maxSh = S.maxSh; P.sh = Math.min(P.sh, P.maxSh + 2);
}
const wLvMul = w => w ? 1 + 0.2 * ((w.lv || 1) - 1) : 1;
// one readable "how strong am I" number: base damage × speed × crit expectation × multishot × weapon stars × weapon synergy
function power() { const w = curW(); return Math.round(100 * S.dmg * S.rate * (1 + Math.min(1, S.crit) * (S.critMul - 1)) * (1 + 0.44 * S.multi) * wLvMul(w) * (wsyn(w) ? 1.25 : 1)); }
// per-stat breakdown: apply each source alone onto base stats and read the difference
const STAT_KEYS = [['dmg', 'pct'], ['rate', 'pct'], ['crit', 'pt'], ['critMul', 'x'], ['multi', 'n'], ['size', 'pct'], ['spd', 'pct'], ['dashCd', 'cd'], ['maxSh', 'n'], ['greed', 'pct']];
function statBreak() {
  const srcs = powerSources(), base = baseStats(), rows = [];
  for (const [k, fmt] of STAT_KEYS) {
    const parts = [];
    for (const src of srcs) { const s = baseStats(); src.ap(s); const dv = s[k] - base[k]; if (Math.abs(dv) > 1e-6) parts.push({ name: src.name, v: dv }); }
    const rest = S[k] - parts.reduce((a, p) => a + p.v, base[k]); // difficulty & fade marks are applied after the sources
    if (Math.abs(rest) > 1e-6) parts.push({ name: tn(G.diff) + (G.diff.heat ? ` · ${t('heat')} ${G.diff.heat}` : ''), v: rest });
    rows.push({ k, fmt, v: S[k], base: base[k], parts });
  }
  return rows;
}
// power if glyph id were taken (for card previews); restores everything
function powerWith(id) { const hp = P.hp, sh = P.sh, had = G.gl[id]; G.gl[id] = (had || 0) + 1; recalc(); const v = power(); if (had) G.gl[id] = had; else delete G.gl[id]; recalc(); P.hp = hp; P.sh = sh; return v; }
const synReady = () => SYN.filter(s => !G.synOn.has(s.id) && G.gl[s.a] && G.gl[s.b]);
// a resonance offered as a card: you pick it instead of a rune, so combos are choices, not accidents
const synCard = s => ({ id: 's:' + s.id, sy: s, rar: 3, name: s.name, zh: s.zh });
function rollGlyphs(n = 3, tier = 0) {
  let pool = GLYPHS.filter(g => (G.gl[g.id] || 0) < g.max && metaRune(g.id)); const out = [];
  const legOnly = tier === 3;
  if (legOnly) { const leg = pool.filter(g => g.rar === 2); if (leg.length) pool = leg; tier = 2; }
  const sc = G.sc || schoolCounts();
  const wf = g => {
    let b = [[66, 30, 4], [30, 52, 18], [5, 45, 50]][tier][g.rar];
    for (const s of SYN) if ((s.a === g.id && G.gl[s.b]) || (s.b === g.id && G.gl[s.a])) b *= 1.25; // only a light nudge: combos are planned, not handed out
    if (G.gl[g.id]) b *= 1.1;
    else b *= 1 + 0.06 * Math.min(4, Math.max(...g.sc.map(id => sc[id])));
    return b;
  };
  while (out.length < n && pool.length) { const g = wpick(pool, wf); out.push(g); pool.splice(pool.indexOf(g), 1); }
  const rs = synReady();
  if (rs.length && !legOnly && Math.random() < [0.4, 0.65, 0.85][tier]) out[Math.min(out.length, n - 1)] = synCard(pick(rs));
  return out;
}
function rollSchool(id, n) { const pool = shuffle(GLYPHS.filter(g => g.sc.includes(id) && (G.gl[g.id] || 0) < g.max && metaRune(g.id))), out = []; while (out.length < n && pool.length) { const g = wpick(pool, g => [5, 3, 1.2][g.rar]); out.push(g); pool.splice(pool.indexOf(g), 1); } return out; }
function synergyIf(id) { return SYN.filter(s => !G.synOn.has(s.id) && !G.gl[id] && ((s.a === id && G.gl[s.b]) || (s.b === id && G.gl[s.a]))); }
// what picking glyph g would change: school tiers reached and resonances completed
function glyphPreview(g) {
  const owned = !!G.gl[g.id], sc = G.sc || schoolCounts();
  return { schools: g.sc.map(id => { const now = sc[id], next = now + (owned ? 0 : 1); return { id, now, next, up: scTier(next) > scTier(now) ? scTier(next) : 0 }; }), syn: synergyIf(g.id) };
}
function takeGlyph(id) {
  const before = new Set(G.syn), stB = Object.assign({}, G.st), pw = power();
  if (id.startsWith('s:')) G.synOn.add(id.slice(2)); else G.gl[id] = (G.gl[id] || 0) + 1;
  recalc();
  if (id === 'heart') healP(2, true);
  if (id === 'plate' || id === 'bulwark') P.sh = P.maxSh;
  const news = [];
  for (const s of SYN) if (G.syn.has(s.id) && !before.has(s.id)) news.push([t('resonance') + ' · ' + tn(s), td(s), 'gold']);
  for (const sid in G.st) if (G.st[sid] > (stB[sid] || 0)) news.push([`${t('school')} · ${scName(sid)} ${ROMAN3[G.st[sid]]}`, scTxt(sid, G.st[sid]), sid === 'chroma' ? 'chroma' : sid === 'blood' ? 'red' : sid === 'volt' || sid === 'frost' ? 'cyan' : 'gold']);
  news.forEach(([a, b, c], i) => later(0.5 + i * 1.5, () => { UI.banner(a, b, c); AU.synergy(); invFlash(1); }));
  UI.build(); UI.powerUp(pw, tn(GL[id] || SYNM[id.slice(2)])); checkWSyn();
  UI.tip('glyph'); if (synReady().length) UI.tip('resonance'); if (Object.keys(G.st).some(k => G.st[k] > (stB[k] || 0))) UI.tip('school');
}

/* ---------- build hooks (called from player.js / main.js) ---------- */
const hurt = () => P.hp * 2 <= P.maxHp;
function rateMul() { return (P.chromaT > 0 ? 1.35 : 1) * (S.frenzy && hurt() ? 1 + 0.1 * S.frenzy : 1); }
function ghostFire(w, a, p, c, n, mul, gap) { for (let i = 0; i < n; i++) later(gap * (i + 1), () => { if (!P.dead && G.state === 'play') fireGhost(w, P.aim, p * mul, c); }); }
function gAttack(w, a, p, c) {
  G.atkAll = (G.atkAll || 0) + 1;
  if (G.mirageN > 0) { ghostFire(w, a, p, c, G.mirageN, 0.5, 0.09); G.mirageN = 0; }
  if (!S.echo && G.st.umbra >= 2 && G.atkAll % 6 === 0) ghostFire(w, a, p, c, 1, S.echoFull ? 1 : 0.4 + S.echoMul, 0.16); // as strong as ECHO I plus the school's ghost bonus
  if (S.echo && G.syn.has('phantasm')) later(0.16, () => pShot(P.x, P.y - 3, P.aim + rand(-1, 1), 150, 5 * FL(), { kind: 'mote', home: 7, r: 1.5, life: 1.8, col: C.cyan, noSize: true }));
}
function windRing(n, dmg) { const a0 = rand(TAU); for (let i = 0; i < n; i++) { const b = pShot(P.x, P.y, a0 + i / n * TAU, 250, dmg, { r: 2, life: 0.45, kind: 'wind', pierce: 2, col: C.mint, kb: 110 }); b.draw = drawWindBlade; } AU.swing(0.7); }
function drawWindBlade(b) { const a = Math.atan2(b.vy, b.vx), x = Math.round(b.x), y = Math.round(b.y); parc(x - Math.cos(a) * 3, y - Math.sin(a) * 3, 4 * S.size, a - 1, a + 1, C.ink, 2); parc(x - Math.cos(a) * 3, y - Math.sin(a) * 3, 4 * S.size, a - 0.9, a + 0.9, C.mint, 1); }
function gDash() {
  G.dashT0 = G.t; P.dashChill = new Set();
  if (S.cyclone) windRing(8 + 2 * S.multi, 9 * FL());
  if (G.st.wind >= 3) windRing(6, 7 * FL());
}
function gDashing(dt) {
  if (S.coldsnap) for (const e of G.enemies) if (!e.dead && !e.hide && !P.dashChill.has(e) && d2(e.x, e.y, P.x, P.y) < (e.r + 26) ** 2) { P.dashChill.add(e); chillE(e.parent || e, 1 + S.coldsnap); burst(e.x, e.y, 4, C.frost, 60, 0.3); }
  if (S.arc && (G.arcN = (G.arcN || 0) + 1) % 2 === 0) G.fx.push({ k: 'arc', x: P.x, y: P.y + 2, t: 0, life: 1.2, tick: 0, emissive: true });
}
function gDashEnd() { G.dashEndT = G.t; if (S.tailwind) G.tailT = 1.2; if (S.mirage) G.mirageN = S.mirage; }
function gChroma(on) {
  if (on) {
    if (G.syn.has('supernova')) for (let i = 0; i < 6; i++) later(0.1 + i * 0.12, () => { const a = i / 6 * TAU; blast(P.x + Math.cos(a) * 60, P.y + Math.sin(a) * 45, 34, 26 * FL(), { col: hue(i * 60), noProc: true }); });
    if (G.syn.has('prismecho')) S.echoMul = 1;
  } else {
    if (S.afterglow) { P.sh = Math.min(P.maxSh + 2, P.sh + 2); AU.shieldUp(); UI.hp(); nova(70, 1.2); for (let i = 0; i < 3; i++) ringFx(P.x, P.y, 4, 50 + i * 20, 0.4 + i * 0.1, [C.red, C.gold, C.fire][i], 2); }
    if (G.syn.has('prismecho')) recalc();
  }
}
function gBlock() {
  if (S.aegis && G.aegisR) { G.aegisR = false; G.aegisT = 10; AU.reflect(); ringFx(P.x, P.y - 2, 6, 34, 0.35, C.gold, 2); burst(P.x, P.y - 2, 14, C.gold, 120, 0.4); G.lastHurtT = G.t; return true; }
  if (G.st.ward >= 3 && G.t - (G.lastHurtT ?? -99) > 4) { G.lastHurtT = G.t; AU.tink(); ringFx(P.x, P.y - 2, 6, 28, 0.3, C.white, 2); burst(P.x, P.y - 2, 10, C.white, 100, 0.3); return true; }
  return false;
}
function gShieldHit() {
  G.lastHurtT = G.t;
  if (S.retort) P.critN = Math.max(P.critN || 0, 2 + S.retort);
  if (G.st.ward >= 2) nova(48, 0.8);
  if (S.glacier) { for (const e of G.enemies) if (!e.dead && !e.hide && d2(e.x, e.y, P.x, P.y) < 70 * 70) { if (e.boss) chillE(e, 5); else if (!e.parent) { e.frozen = 1.4; e.chill = 0; } } AU.freeze(); ringFx(P.x, P.y, 6, 70, 0.4, C.frost, 2); burst(P.x, P.y, 20, C.frost, 140, 0.5); }
}
function gHpLoss() {
  G.lastHurtT = G.t; G.roomHurt = true;
  if (S.martyr) { G.martyrT = 4; P.sh = Math.max(P.sh, P.maxSh); AU.shieldUp(); }
  if (G.syn.has('vengeance')) { const k0 = G.stats.kills; nova(110, 2.5); later(0.05, () => { if (G.stats.kills - k0 >= 3) healP(1); }); }
}
function gRevive() {
  if (!S.phoenix || G.phoenixUsed) return false;
  G.phoenixUsed = true; P.hp = Math.min(P.maxHp, 3); P.inv = 2.5; UI.hp();
  slowmo(1, 0.25); invFlash(3); hitstop(0.1); AU.chroma();
  blast(P.x, P.y, 90, 40 * FL(), { clear: true, col: C.fire, noProc: true }); clearEB(P.x, P.y, 300);
  for (const e of G.enemies) if (!e.dead && d2(e.x, e.y, P.x, P.y) < 120 * 120) ignite(e, 3);
  for (let i = 0; i < 4; i++) ringFx(P.x, P.y, 4, 50 + i * 30, 0.4 + i * 0.1, i % 2 ? C.gold : C.fire, 2);
  UI.banner(tn(GL.phoenix), LANG === 'zh' ? '浴火重生' : 'risen from the ash', 'gold');
  return true;
}
function gClear() {
  if (S.interest) { const g = Math.min(6 * S.interest, Math.floor(G.coins * 0.08 * S.interest)); if (g > 0) { G.coins += g; UI.toast(`${tn(GL.interest)} +${g}`, 'y'); AU.coin(4); } }
  if (G.st.blood >= 1) healP(1);
  if (G.st.gold >= 3) { G.coins += 15; G.freeRR = (G.freeRR || 0) + 1; UI.toast(`${scName('gold')} III · +15 · ${t('reroll')}`, 'y'); }
}
function gCoin() {
  if (S.goldrush) { G.grN = Math.min(15 * S.goldrush, (G.grN || 0) + 1); G.grT = 5; }
  if (G.syn.has('goldleaf') && (G.glN = (G.glN || 0) + 1) % 20 === 0 && P.sh < P.maxSh + 1) { P.sh++; AU.shieldUp(); UI.hp(); ringFx(P.x, P.y - 2, 3, 14, 0.3, C.gold); }
}
function gFloor() { G.phoenixUsed = false; if (S.patron) G.freeRR = (G.freeRR || 0) + 1; G.freeRR = (G.freeRR || 0) + metaTal('reroll'); P.fam = null; }
// per-frame upkeep for timed build effects
function gTick(dt) {
  if (G.martyrT > 0) G.martyrT -= dt;
  if (G.tailT > 0) G.tailT -= dt;
  if (G.grT > 0) { G.grT -= dt; if (G.grT <= 0) G.grN = 0; }
  if (S.aegis && !G.aegisR) { G.aegisT = (G.aegisT ?? 10) - dt; if (G.aegisT <= 0) { G.aegisR = true; AU.shieldUp(); ringFx(P.x, P.y - 2, 14, 6, 0.3, C.gold); } }
  for (const e of G.enemies) if (e.bleedN > 0 && !e.dead) { e.bleedT -= dt; if (e.bleedT <= 0) { e.bleedT = 0.5; e.bleedN--; hit(e, e.bleedD, { kind: 'dot', raw: true, noProc: true }); if (!e.dead) part(e.x, e.y, rand(-20, 20), rand(-30, 0), 0.4, C.red, 1); } }
  G.secT = (G.secT || 0) + dt;
  if (G.secT >= 1) { G.secT -= 1; if (G.syn.has('wildfire')) spreadFire(); }
  if (G.st.volt >= 3 && G.active) { G.boltT = (G.boltT || 0) - dt; if (G.boltT <= 0) { G.boltT = 1.6; const fs = G.enemies.filter(e => !e.dead && !e.dummy && !e.hide && !e.inv && !e.parent); if (fs.length) bolt(pick(fs), 12 * FL(), 2); } }
  if (G.syn.has('bastion') && G.stillT > 0.8) { G.basT = (G.basT || 0) + dt; if (G.basT >= 2) { G.basT = 0; if (P.sh < P.maxSh) { P.sh++; AU.shieldUp(); UI.hp(); ringFx(P.x, P.y - 2, 3, 14, 0.3, C.white); } } } else G.basT = 0;
  if (G.syn.has('constellation') && S.halo) { G.conT = (G.conT || 0) - dt; if (G.conT <= 0) { G.conT = 1; const n = 3 + S.multi, R = 22 * S.size; for (let i = 0; i < n; i++) { const a = P.haloA + i / n * TAU, x = P.x + Math.cos(a) * R, y = P.y - 2 + Math.sin(a) * R * 0.8, e = nearFoe(x, y, 120); if (e) pShot(x, y, Math.atan2(e.y - y, e.x - x), 170, 4 * FL(), { kind: 'mote', home: 6, r: 1.5, life: 1.2, col: C.cyan, noSize: true }); } } }
  if (S.shade && !P.dead) updFam(dt);
}
function nearFoe(x, y, r) { let best = null, bd = r * r; for (const e of G.enemies) { if (e.dead || e.dummy || e.hide || e.inv) continue; const dd = d2(x, y, e.x, e.y); if (dd < bd) { bd = dd; best = e; } } return best; }
function updFam(dt) {
  if (!P.fam || dist(P.fam, P) > 220) P.fam = { x: P.x - 14, y: P.y - 12, cd: 0.6, t: 0 };
  const f = P.fam; f.t += dt;
  const tx = P.x - Math.cos(P.aim) * 14, ty = P.y - 14 + Math.sin(f.t * 3) * 3, k = 1 - Math.exp(-dt * 5);
  f.x = lerp(f.x, tx, k); f.y = lerp(f.y, ty, k);
  f.cd -= dt * rateMul();
  if (f.cd <= 0) { const e = nearFoe(f.x, f.y, 170); if (e) { f.cd = 0.55; for (let i = 0; i <= S.multi; i++) pShot(f.x, f.y, angTo(f, e) + fan(i, S.multi + 1, 0.3), 190, 6 * FL(), { kind: 'mote', home: 6, r: 1.5, life: 1.4, col: C.violet, noSize: true }); AU.pop(); } else f.cd = 0.2; }
}
function drawFam() { const f = P.fam; if (!f) return; const x = Math.round(f.x), y = Math.round(f.y); shadow(x, y + 10, 3); pc(x, y, 5, C.ink); pc(x, y, 4, C.violet); prect(x - 2, y - 1, 1, 2, C.ink); prect(x + 1, y - 1, 1, 2, C.ink); for (let i = -1; i <= 1; i++) prect(x + i * 3 - 1, y + 4 + ((G.t * 8 + i) & 1), 2, 2, C.violet); }
// draw items the build adds to the world (familiar, ward rings); pushed into render's y-sorted list
function buildDraws(list) {
  if (P.dead) return;
  if (P.fam && S.shade) list.push({ y: P.fam.y + 10, draw: drawFam });
  const ward = (S.aegis && G.aegisR) || (G.st.ward >= 3 && G.t - (G.lastHurtT ?? -99) > 4);
  if (ward) list.push({ y: P.y + 6, draw: () => { const k = ((G.t * 2) | 0) % 2; pring(P.x, P.y - 2, 11 + k, S.aegis && G.aegisR ? C.gold : C.lt, 1); } });
}
function spreadFire() { for (const e of G.enemies) { if (e.dead || !(e.burn > 0) || e.spread === G.t) continue; const n = G.enemies.find(o => o !== e && !o.dead && !o.dummy && !(o.burn > 0) && d2(o.x, o.y, e.x, e.y) < 40 * 40); if (n) { n.spread = G.t; ignite(n, 2.5, e.burnD); G.fx.push({ k: 'zap', x0: e.x, y0: e.y, x1: n.x, y1: n.y, t: 0, life: 0.15, col: C.fire }); } } }
function ignite(e, t, d) { if (e.dead) return; if (!(e.burn > 0)) AU.burn(); e.burn = Math.max(e.burn || 0, t); e.burnD = Math.max(e.burnD || 0, d || (3 + 3 * Math.max(1, S.kindle)) * S.dmg * FL() * (G.st.blaze >= 1 ? 1.5 : 1)); }
function chillE(e, n) {
  if (e.dead || e.frozen > 0) return;
  e.chill = (e.chill || 0) + n; e.chillT = 2.5;
  const need = (e.boss ? 10 : 5) - (G.st.frost >= 1 ? (e.boss ? 2 : 1) : 0);
  if (e.chill >= need) {
    e.chill = 0; e.frozen = e.boss ? 0.9 : 1.2 + 0.25 * S.rime; AU.freeze(); burst(e.x, e.y, 12, C.frost, 80, 0.5);
    if (G.st.frost >= 3) for (const o of G.enemies) if (o !== e && !o.dead && !o.parent && d2(o.x, o.y, e.x, e.y) < 50 * 50) chillE(o, 3);
  }
}
function bolt(e, dmg, chainN) {
  G.fx.push({ k: 'bolt', x: e.x, y: e.y, t: 0, life: 0.25, emissive: true }); AU.zap();
  hit(e, dmg * (G.st.volt >= 2 ? 1.5 : 1), { kind: 'zap', raw: true, a: -Math.PI / 2, kb: 40, depth: 2 });
  if (chainN && !e.dead) chain(e, dmg * 0.6, chainN, 2);
}

/* ---------- damage pipeline ---------- */
function gainChroma(v) {
  if (P.chromaT > 0 || G.state !== 'play') return;
  const was = P.chroma;
  P.chroma = Math.min(100, P.chroma + v * (1 + 0.4 * S.over) * (1 + 0.15 * metaTal('prism')));
  if (was < 100 && P.chroma >= 100) { AU.charged(); UI.chromaReady(); }
}
// projectiles born from a hit's consequences (kills, shards, chains) never inherit the firing weapon's multishot split or colour
function hit(e, base, o) {
  const wm = G.wmk, ws = G.wsat; G.wmk = 0; G.wsat = false;
  const r = hitOne(e, base, o || {});
  G.wmk = wm; G.wsat = ws; return r;
}
function hitOne(e, base, o) {
  if (e && e.parent) { if (e.inv || e.hide) return 0; if (o.kind !== 'b') { if (e.parent._segT === G.t) return 0; e.parent._segT = G.t; } e.flash = 0.08; return hitOne(e.parent, base, o); }
  if (!e || e.dead || e.inv || e.hp <= 0) return 0;
  if (e.reflect && o.kind === 'b' && o.x !== undefined) {
    AU.reflect(); sparks(o.x, o.y, angTo(o, P), 5, C.gold, 140); e.shieldF = 0.12;
    eShot(o.x, o.y, Math.atan2(P.y - o.y, P.x - o.x), 150, { r: 2.5 }); return -1;
  }
  if (e.shieldA !== undefined && o.kind === 'b' && o.x !== undefined && Math.abs(angDiff(e.shieldA, Math.atan2(o.y - e.y, o.x - e.x))) < 1.1) {
    AU.tink(); sparks(o.x, o.y, Math.atan2(o.y - e.y, o.x - e.x), 4, C.white, 120); e.shieldF = 0.1; return -1;
  }
  const dot = o.kind === 'dot', direct = !o.raw && !dot; // direct = a real attack (not a proc, burn or bleed)
  let d = o.raw ? base : base * S.dmg * (P.chromaT > 0 ? S.chromaDmg : 1);
  const moving = P.moving && !P.dead, still = (G.stillT || 0) > 0.4;
  let crit = !!o.crit;
  if (!crit && direct && Math.random() < S.crit + (moving && G.syn.has('windrun') ? 0.15 : 0) + (o.kind === 'm' ? 0.05 * S.pierce : 0)) crit = true;
  if (direct && P.critN > 0) { crit = true; P.critN--; }
  if (direct && e.mark) { crit = true; e.mark = false; d *= 1.5; }
  // every situational bonus adds into one bucket (×(1 + sum)), so stacking many of them grows linearly, not exponentially
  let bonus = 0;
  if (direct) {
    if (S.flow && moving) bonus += 0.1 * S.flow;
    if (S.still && still) bonus += 0.15 * S.still;
    if (S.cresc) bonus += Math.min(0.3 * S.cresc + (G.syn.has('tempo') ? 0.3 : 0), P.combo * 0.01);
    if (S.first && !e.touched) bonus += 0.5 * S.first;
    if (crit && still && G.syn.has('zen')) bonus += 0.5;
    if (G.tailT > 0) bonus += 0.25 * S.tailwind;
    if (S.frenzy && hurt()) bonus += 0.15 * S.frenzy;
    if (G.martyrT > 0) bonus += 0.4;
    if (G.grT > 0) bonus += 0.01 * G.grN;
    if (S.bulwark && P.sh >= P.maxSh) bonus += 0.1 * S.bulwark;
    if (S.palette) bonus += 0.06 * Object.values(G.st).filter(k => k > 0).length;
    if (G.st.blood >= 2 && P.hp < P.maxHp) bonus += 0.2;
    if (G.st.gold >= 2) bonus += Math.min(0.3, G.coins / 500);
    if (S.focus) { const k = e; if (G.focE === k) G.focN = Math.min(5 * S.focus, G.focN + 1); else { G.focE = k; G.focN = 0; } bonus += 0.03 * G.focN; }
  }
  e.touched = true;
  if (S.ember && e.burn > 0) bonus += 0.12 * S.ember;
  if (S.frostbite) bonus += 0.03 * S.frostbite * Math.min(5, e.frozen > 0 ? 5 : (e.chill || 0));
  if (S.bounty && (e.elite || e.boss)) bonus += 0.12 * S.bounty;
  d *= 1 + bonus;
  if (e.frozen > 0) d *= G.st.frost >= 2 ? 1.6 : 1.3;
  const low = S.exec && e.hp < e.maxHp * (S.exec + (e.bleedN > 0 && G.syn.has('deathmark') ? 0.15 : 0));
  if (low) d *= 1.6;
  let jack = false;
  if (crit && G.syn.has('jackpot') && (G.jackN = (G.jackN || 0) + 1) % 7 === 0) { d *= 3; jack = true; }
  if (crit) d *= S.critMul * (G.st.edge >= 3 ? 1.25 : 1);
  if (crit && low && G.syn.has('guillotine')) d = e.boss ? d * 1.5 : e.hp + 1;
  if (crit && e.frozen > 0 && G.syn.has('shatterpoint')) { d = e.boss ? d * 2 : e.hp + 1; burst(e.x, e.y, 16, C.frost, 160, 0.5); }
  if (e.boss && e.stun > 0) d *= 1.5;
  d = Math.max(1, Math.round(d));
  if (e.bubble > 0 && !(crit && G.st.edge >= 3)) { const ab = Math.min(e.bubble, d); e.bubble -= ab; d -= ab; e.flash = 0.06; if (e.bubble <= 0) { AU.tink(); ringFx(e.x, e.y - e.r, e.r, e.r * 3, 0.25, C.gold, 1); } if (d <= 0) { sparks(e.x, e.y, o.a || 0, 3, C.gold, 100); return 0; } d = Math.max(1, Math.round(d)); }
  e.hp -= d; G.stats.dmg += d;
  if (crit && S.midas && !e.dummy && Math.random() < 0.25 * S.midas) dropCoin(e.x, e.y);
  if (jack) { for (let i = 0; i < 3; i++) dropCoin(e.x, e.y); AU.coin(6); ringFx(e.x, e.y, 3, 26, 0.35, C.gold, 2); }
  if (crit && S.bleed && direct) { e.bleedD = d * 0.4 * S.bleed / 4; e.bleedN = 4; e.bleedT = 0.5; }
  e.flash = 0.08; e.sq = 0.45;
  if (!e.boss && !e.anchored) { const k = (o.kb != null ? o.kb : 60) * S.kb / (e.mass || 1); e.kx += Math.cos(o.a || 0) * k; e.ky += Math.sin(o.a || 0) * k; }
  if (dot) num(e.x, e.y - e.r - 3, d, false, e.bleedN > 0 && !(e.burn > 0) ? C.red : C.fire);
  else {
    num(e.x, e.y - e.r - 4, d, crit, jack ? C.gold : undefined);
    sparks(e.x, e.y, o.a || 0, crit ? 8 : 3, crit ? C.gold : (P.chromaT > 0 ? hue(G.t * 400) : C.white), crit ? 220 : 140);
    if (crit) { AU.crit(); hitstop(o.heavy ? 0.07 : 0.035); if (o.heavy) shake(0.06); }
    else { AU.hit(o.heavy); if (o.heavy) hitstop(0.045); }
  }
  gainChroma(d * (o.kind === 'm' ? 0.07 : 0.035));
  if (direct && S.conduit && (G.condN = (G.condN || 0) + 1) >= 14 - 3 * S.conduit && !e.dead) { G.condN = 0; const tgt = e; later(0.05, () => { if (!tgt.dead) bolt(tgt, (14 + 8 * S.conduit) * FL(), G.syn.has('stormfront') ? 3 : 0); }); }
  if (P.dash > 0 && o.kind === 'm' && G.syn.has('assassin') && e.hp > 0) e.mark = true;
  if (!o.noProc && (o.depth || 0) < 2 && !dot) procHit(e, d, crit, o);
  if (e.hp <= 0) kill(e, o);
  return d;
}
function procHit(e, d, crit, o) {
  const dep = (o.depth || 0) + 1;
  if (S.static && Math.random() < S.static) chain(e, d * 0.6, S.staticN, dep);
  else if (S.storm && crit) chain(e, d * 0.8, 4, dep);
  else if (P.chromaT > 0 && G.st.chroma >= 3 && Math.random() < 0.2) chain(e, d * 0.5, 2, dep);
  if (o.src === 'mote' && G.syn.has('ionic')) chain(e, d * 0.5, 2, dep);
  if (S.kindle && !e.dead) ignite(e, 3, (3 + 3 * S.kindle) * S.dmg * FL() * (G.st.blaze >= 1 ? 1.5 : 1));
  if (S.rime && !e.dead) chillE(e, 1);
  if (o.src === 'shard' && G.syn.has('hail') && !e.dead) chillE(e, 2);
  if (G.syn.has('steam') && !e.dead && e.burn > 0 && (e.chill > 0 || e.frozen > 0) && !(e.steamT > G.t)) {
    e.steamT = G.t + 1.2; e.burn = 0; const x = e.x, y = e.y;
    later(0.03, () => { blast(x, y, 24, 12 * FL(), { col: C.frost, noProc: true, depth: dep }); for (let i = 0; i < 8; i++) part(x + rand(-8, 8), y + rand(-6, 6), rand(-20, 20), rand(-60, -30), 0.7, C.paper, 2, { drag: 0.94 }); });
  }
}
function chain(src, dmg, n, dep) {
  let cur = src; const seen = new Set([src, src.parent || src]);
  n += (G.st.volt >= 1 ? 1 : 0) + S.overload;
  AU.zap();
  for (let i = 0; i < n; i++) {
    let best = null, bd = 80 * 80;
    for (const e of G.enemies) { if (e.dead || seen.has(e) || seen.has(e.parent || e) || e.dummy || e.hide) continue; const dd = d2(cur.x, cur.y, e.x, e.y); if (dd < bd) { bd = dd; best = e; } }
    if (!best) break;
    seen.add(best); seen.add(best.parent || best);
    G.fx.push({ k: 'zap', x0: cur.x, y0: cur.y, x1: best.x, y1: best.y, t: 0, life: 0.18 });
    let dd = dmg * (G.st.volt >= 2 ? 1.5 : 1);
    if (G.syn.has('superconduct') && (best.chill > 0 || best.frozen > 0)) { dd *= 2.5; chillE(best.parent || best, 2); }
    if (G.syn.has('thunderfire')) { const b = best.parent || best; if (b.burn > 0) dd *= 1.5; ignite(b, 2.5); }
    if (S.overload) gainChroma(0.6);
    const from = cur, tgt = best, judge = G.syn.has('judgment');
    later(0.035 * (i + 1), () => { const b = tgt.parent || tgt; if (judge && !b.boss && !b.dead && b.hp < b.maxHp * 0.2) dd = b.hp + 1; hit(tgt, dd, { kind: 'zap', raw: true, a: angTo(from, tgt), kb: 25, depth: dep, noProc: dep >= 2 }); });
    cur = best;
  }
}
function kill(e, o = {}) {
  if (e.dead) return;
  if (e.dummy) { e.hp = e.maxHp; return; }
  if (e.boss) { e.hp = 0; bossDown(e); return; }
  e.dead = true; if (e.tl) e.tl.dead = true;
  G.stats.kills++; G.kills++;
  P.combo++; P.comboT = G.syn.has('tempo') ? 4.6 : 2.6; G.stats.combo = Math.max(G.stats.combo, P.combo);
  const a = o.a != null ? o.a : rand(TAU);
  inkDrops(e.x, e.y, a, e.elite ? 28 : 14, 0.9, 170);
  inkDrops(e.x, e.y, a + Math.PI, 5, 2, 60);
  splat(e.x, e.y, e.r * 0.6 + 1);
  ringFx(e.x, e.y, 2, e.r * 2.2 + 6, 0.25, P.chromaT > 0 ? hue(G.t * 300) : C.ink, 2);
  burst(e.x, e.y, 6, C.white, 90, 0.3, 2);
  hitstop(e.elite ? 0.08 : 0.025); shake(e.elite ? 0.18 : 0.04);
  AU.kill(e.elite);
  const nc = e.elite ? randi(2, 3) + S.bounty : (Math.random() < 0.2 + (G.st.gold >= 1 ? 0.2 : 0) ? 1 : 0);
  const kc = nc * S.greed / G.diff.budget; // harder levels spawn more foes, not more gold
  for (let i = 0; i < Math.floor(kc) + (Math.random() < kc % 1 ? 1 : 0); i++) dropCoin(e.x, e.y);
  for (let i = 0; i < (e.elite ? 6 : 2); i++) dropSoul(e.x, e.y);
  if (Math.random() < 0.025) dropItem('potion', e.x, e.y);
  if (e.D && e.D.onDie) e.D.onDie(e);
  if (S.spectrum) { gainChroma(2 * S.spectrum); }
  if (P.chromaT > 0 && (S.spectrum || G.st.chroma >= 3)) P.chromaT = Math.min(6 + 2 * S.over, P.chromaT + 0.25 * S.spectrum + (G.st.chroma >= 3 ? 0.4 : 0));
  if (S.relay) P.dashCd -= 0.58 * 0.25 * S.relay;
  if (G.syn.has('blink') && (P.dash > 0 || G.t - (G.dashEndT ?? -9) < 0.5)) P.dashCd = 0;
  if (G.st.blood >= 3 && (G.bloodN = (G.bloodN || 0) + 1) % 10 === 0) healP(1);
  const dep = (o.depth || 0) + 1, burning = e.burn > 0, frozen = e.frozen > 0, x = e.x, y = e.y;
  const vol = S.volatile || (burning && G.st.blaze >= 3);
  if (vol && dep < 3) later(0.08, () => {
    const lv = Math.max(1, S.volatile), ava = frozen && G.syn.has('avalanche'), r = (22 + 6 * lv) * S.size * (ava ? 1.5 : 1);
    blast(x, y, r, (8 + 6 * lv) * FL(), { depth: dep, col: ava ? C.frost : G.syn.has('napalm') ? C.fire : null });
    if (ava) for (const q of G.enemies) if (!q.dead && d2(q.x, q.y, x, y) < r * r) chillE(q.parent || q, 3);
    if (G.syn.has('napalm') && fxN('fire') < 24) G.fx.push({ k: 'fire', x, y, r: 18 * S.size, t: 0, life: 2.6, tick: 0 });
  });
  if (S.pyre && burning && dep < 3) later(0.06, () => {
    const big = G.syn.has('inferno') ? 2 : 1, r = (20 + 6 * S.pyre) * big;
    blast(x, y, r, (6 + 4 * S.pyre) * FL(), { depth: dep, col: C.fire, noProc: true });
    for (const q of G.enemies) if (!q.dead && d2(q.x, q.y, x, y) < (r + q.r) ** 2) ignite(q.parent || q, 3);
    if (big > 1 && fxN('fire') < 24) G.fx.push({ k: 'fire', x, y, r: r * 0.6, t: 0, life: 2.4, tick: 0 });
  });
  if (S.shatter && dep < 3) {
    const n = 2 + 2 * S.shatter, a0 = rand(TAU);
    for (let i = 0; i < n; i++) pShot(x, y, a0 + i / n * TAU, 230, 5 * FL(), { r: 1.5, life: 0.55, kind: 'shard', depth: dep, home: G.syn.has('swarm') ? 4 : 0, cluster: G.syn.has('cluster'), col: G.syn.has('hail') ? C.frost : C.white });
  }
  if (S.shardice && frozen && dep < 3) {
    const n = 3 + 2 * S.shardice, a0 = rand(TAU);
    for (let i = 0; i < n; i++) { const b = pShot(x, y, a0 + i / n * TAU, 210, 6 * FL(), { r: 1.5, life: 0.6, kind: 'shard', depth: dep, col: C.frost }); b.onHit = (b, q) => chillE(q.parent || q, 2); }
    burst(x, y, 10, C.frost, 120, 0.4);
  }
  if (S.haunt && dep < 4) later(0.1, () => pShot(x, y - 4, rand(TAU), 120, (8 + 5 * S.haunt) * FL(), { kind: 'mote', home: 8, r: 2, life: 2.2, col: C.violet, noSize: true, depth: dep }));
  if (S.leech) { G.leechN = (G.leechN || 0) + 1; if (G.leechN >= S.leech) { G.leechN = 0; healP(1); } }
  if (S.hole) { G.holeN = (G.holeN || 0) + 1; if (G.holeN >= (G.syn.has('collapse') ? 6 : 10) && fxN('hole') < 3) { G.holeN = 0; G.fx.push({ k: 'hole', x, y, t: 0, life: 2.4, tick: 0 }); AU.roar(2.5); } }
}
function blast(x, y, r, dmg, o = {}) {
  r *= S.blastR; dmg *= S.blastD;
  const once = new Set();
  for (const e of G.enemies) {
    if (e.dead) continue; const k = e.parent || e; if (once.has(k)) continue;
    if (d2(x, y, e.x, e.y) < (r + e.r) ** 2) {
      once.add(k); hit(e, dmg, { kind: 'blast', a: Math.atan2(e.y - y, e.x - x), kb: 170, depth: o.depth || 0, heavy: o.heavy, noProc: o.noProc, crit: o.crit });
      if (S.concuss && !k.dead) { if (k.boss) k.stun = Math.max(k.stun || 0, 0.25); else k.stunT = Math.max(k.stunT || 0, 0.6); }
    }
  }
  blastTiles(x, y, r, dmg);
  if (o.clear) clearEB(x, y, r);
  if (!o.quiet) boomFx(x, y, r, o.col);
}
function blastTiles(x, y, r, dmg) {
  for (let ty = Math.floor((y - r) / T); ty <= Math.floor((y + r) / T); ty++) for (let tx = Math.floor((x - r) / T); tx <= Math.floor((x + r) / T); tx++)
    if (d2(tx * T + 8, ty * T + 8, x, y) < (r + 8) ** 2) hurtTile(tx, ty, dmg);
}
function worldBlast(x, y, r, dmg, hurtP) {
  for (const e of G.enemies) if (!e.dead && !e.boss && d2(x, y, e.x, e.y) < (r + e.r) ** 2) hit(e, dmg * FL(), { kind: 'blast', raw: true, a: Math.atan2(e.y - y, e.x - x), kb: 220, noProc: true });
  if (hurtP && d2(x, y, P.x, P.y) < (r + P.r) ** 2) hurtPlayer(1, x, y);
  blastTiles(x, y, r, 99);
  boomFx(x, y, r, C.red); shake(0.12);
}
// count of live fx of one kind (caps for effects that can snowball in big chain reactions)
const fxN = k => { let n = 0; for (const f of G.fx) if (f.k === k) n++; return n; };
function boomFx(x, y, r, col) {
  AU.boom(r > 40 ? 1.3 : 0.9); shake(Math.min(0.12, r / 300)); scorch(x, y, r * 0.8);
  if (G.fx.length > 360) return; // the blast still lands; only its extra visuals are skipped in a huge chain
  G.fx.push({ k: 'boom', x, y, r, t: 0, life: 0.38, col });
  for (let i = 0; i < r * 0.5; i++) { const a = rand(TAU), s = rand(0.3, 1) * r * 4; part(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.3, 0.7), pick([C.ink, C.dk, C.mid]), randi(2, 4), { drag: 0.84 }); }
  burst(x, y, 8, col || C.white, r * 5, 0.25, 2);
}
function clearEB(x, y, r) {
  for (const b of G.bullets) if (b.team === 'e' && !b.dead && d2(x, y, b.x, b.y) < r * r) { b.dead = true; burst(b.x, b.y, 2, C.red, 40, 0.2); }
}

/* ---------- generic fx ---------- */
function updFx(dt) {
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i]; f.t += dt;
    if (f.u) f.u(f, dt);
    if (f.k === 'fire') {
      f.tick -= dt; if (f.tick <= 0) { f.tick = 0.3; for (const e of G.enemies) if (!e.dead && d2(f.x, f.y, e.x, e.y) < (f.r + e.r) ** 2) hit(e, 3 * FL(), { kind: 'dot', raw: true, noProc: true }); }
      if (Math.random() < 0.5) part(f.x + rand(-f.r, f.r) * 0.8, f.y + rand(-f.r, f.r) * 0.6, 0, -rand(15, 35), 0.4, pick([C.fire, C.gold, C.ink]), 1, { drag: 0.95 });
    }
    if (f.k === 'arc') {
      f.tick -= dt; if (f.tick <= 0) { f.tick = 0.25; for (const e of G.enemies) if (!e.dead && !e.dummy && d2(f.x, f.y, e.x, e.y) < (e.r + 9) ** 2) hit(e, (5 + 3 * S.arc) * FL(), { kind: 'zap', raw: true, noProc: true, kb: 10 }); }
    }
    if (f.k === 'hole') {
      f.tick -= dt;
      for (const e of G.enemies) { if (e.dead || e.boss) continue; const dd = Math.hypot(e.x - f.x, e.y - f.y); if (dd < 100 && dd > 2) { e.kx += (f.x - e.x) / dd * 420 * dt; e.ky += (f.y - e.y) / dd * 420 * dt; } }
      if (f.tick <= 0) { f.tick = 0.2; for (const e of G.enemies) if (!e.dead && d2(f.x, f.y, e.x, e.y) < 30 * 30) hit(e, 6 * FL(), { kind: 'dot', noProc: true }); }
      const a = rand(TAU); part(f.x + Math.cos(a) * 60, f.y + Math.sin(a) * 60, -Math.cos(a) * 140, -Math.sin(a) * 140, 0.4, C.violet, 1, { drag: 1, kind: 1 });
      if (f.t >= f.life) blast(f.x, f.y, 46 * (G.syn.has('collapse') ? 2 : 1), 30 * FL() * (G.syn.has('collapse') ? 1.5 : 1), { col: C.violet, noProc: true });
    }
    if (f.t >= f.life || f.dead) G.fx.splice(i, 1);
  }
}
function drawFxOne(f) {
  {
    const k = f.t / f.life;
    if (f.d) { f.d(f, k); return; }
    switch (f.k) {
      case 'ring': pring(f.x, f.y, lerp(f.r0, f.r1, 1 - (1 - k) ** 3), f.col, f.w); break;
      case 'boom': {
        if (k < 0.18) pc(f.x, f.y, f.r * (0.6 + k * 2), f.col === C.red ? C.red : C.white);
        else { pring(f.x, f.y, f.r * (0.7 + k * 0.6), k < 0.5 ? C.ink : C.dk, Math.max(1, Math.round(4 * (1 - k)))); if (k < 0.4) pc(f.x, f.y, f.r * 0.5 * (1 - k * 2), f.col || C.white); }
        break;
      }
      case 'zap': {
        if (k > 0.8 && ((f.t * 60) | 0) % 2) break;
        let px = f.x0, py = f.y0; const n = 6;
        for (let s = 1; s <= n; s++) { const nx = lerp(f.x0, f.x1, s / n) + (s < n ? rand(-5, 5) : 0), ny = lerp(f.y0, f.y1, s / n) + (s < n ? rand(-5, 5) : 0); pline(px, py, nx, ny, f.col || C.cyan, 2); pline(px, py, nx, ny, C.white, 1); px = nx; py = ny; }
        break;
      }
      case 'bolt': {
        if (k > 0.6 && ((f.t * 60) | 0) % 2) break;
        let px = f.x + rand(-6, 6), py = f.y - 110;
        for (let s = 1; s <= 7; s++) { const nx = f.x + (s < 7 ? rand(-7, 7) : 0), ny = f.y - 110 + s * 110 / 7; pline(px, py, nx, ny, C.cyan, 3); pline(px, py, nx, ny, C.white, 1); px = nx; py = ny; }
        if (k < 0.3) { pc(f.x, f.y, 7 * (1 - k), C.white); pring(f.x, f.y, 6 + k * 30, C.cyan, 1); }
        break;
      }
      case 'arc': { if (((f.t * 30) | 0) % 3 === 0) break; const x = f.x + rand(-3, 3), y = f.y + rand(-2, 2); pline(f.x - 4, f.y, x, y, C.cyan, 1); pline(x, y, f.x + 4, f.y + rand(-2, 2), k > 0.7 ? C.cyanDk : C.white, 1); break; }
      case 'fire': { const fl = ((f.t * 12) | 0) % 2; pc(f.x, f.y + 1, f.r * 0.7, 'rgba(255,138,42,0.22)'); if (fl) pring(f.x, f.y, f.r * 0.75, 'rgba(255,138,42,0.5)'); break; }
      case 'hole': { const r = 10 + Math.sin(f.t * 20) * 2; pc(f.x, f.y, r + 3, C.violet); pc(f.x, f.y, r, C.void); for (let j = 0; j < 3; j++) parc(f.x, f.y, 22 + j * 14, f.t * (4 - j) + j * 2, f.t * (4 - j) + j * 2 + 2, C.violet, 1); break; }
    }
  }
}
