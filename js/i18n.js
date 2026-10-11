'use strict';
/* GRISAILLE · i18n — English / 简体中文 */
const OPT = { lang: 'en', shake: 0.5, hero: 'knight', diff: 1, heat: 0, tips: {}, rec: { runs: 0, best: 0, wins: [0, 0, 0, 0], heat: 0 } };
try {
  const saved = JSON.parse(localStorage.getItem('grisaille-opt') || 'null');
  if (saved) Object.assign(OPT, saved);
  else OPT.lang = /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
} catch (e) { OPT.lang = /^zh/i.test(navigator.language || '') ? 'zh' : 'en'; }
let LANG = OPT.lang;
function saveOpt() { try { localStorage.setItem('grisaille-opt', JSON.stringify(OPT)); } catch (e) { } }
const tn = o => o ? (LANG === 'zh' ? (o.zh || o.name) : o.name) : '';
const td = o => o ? (LANG === 'zh' ? (o.zhDesc || o.desc) : o.desc) : '';

const STR = {
  en: {
    begin: 'BEGIN', enterHint: 'ENTER · BEST WITH HEADPHONES · M MUTES',
    tag: 'Beneath the Grey Keep, a living prism drinks the world\'s color. You are the last knight with a <b>spark of cyan</b> left in your eye. Descend, break its guardians, and <b>take the color back.</b>',
   
    kMove: 'move', kAttack: 'attack · hold', kDash: 'dash', kSwap: 'swap weapon', kUse: 'take · open · talk', kChroma: 'unleash chroma', kPause: 'pause · build', kMap: 'big map',
    touch: 'Grisaille needs a keyboard and mouse.',
    chroma: 'CHROMA', combo: 'COMBO', empty: 'EMPTY',
    chooseGlyph: 'CHOOSE A RUNE', eliteGlyph: "AN ELITE'S RUNES", bossGlyph: "A GUARDIAN'S GIFT", shrineGlyph: 'THE ALTAR ANSWERS',
    reroll: 'REROLL', pickHint: '1 · 2 · 3 TO PICK · R TO REROLL', resonance: 'RESONANCE', isNew: 'NEW',
    rar: ['COMMON', 'RARE', 'LEGENDARY', 'RESONANCE'],
    paused: 'PAUSED', resume: 'RESUME · ESC', restart: 'RESTART RUN', soundOn: 'SOUND · ON', soundOff: 'SOUND · OFF', volume: 'VOLUME',
    langBtn: 'LANGUAGE · ENGLISH', shakeBtn: ['SCREEN SHAKE · OFF', 'SCREEN SHAKE · LOW', 'SCREEN SHAKE · FULL'],
    yourGlyphs: 'YOUR RUNES', resonances: 'RESONANCES', noGlyphs: 'No runes yet. Clear rooms to earn them.', yourStory: 'DIARY PAGES',
    dead: 'YOU HAVE FALLEN', win: 'COLOR RESTORED', winSub: 'The prism shatters. Every hue it hoarded floods back into the world.',
    fellOn: f => `Fell on ${f}`,
    sRooms: 'ROOMS', sKills: 'KILLS', sCombo: 'BEST COMBO', sDmg: 'DAMAGE', sTime: 'TIME', sGlyphs: 'RUNES',
    again: 'TRY AGAIN · R', toTitle: 'TITLE',
    take: 'TAKE', buy: 'BUY', open: 'OPEN', talk: 'TALK', offer: 'OFFER', read: 'READ', descend: 'DESCEND',
    noGold: 'NOT ENOUGH GOLD', whole: 'ALREADY WHOLE', chromaReady: 'CHROMA READY · PRESS F', chromaB: 'CHROMA', chromaSub: 'the world remembers color', maxLv: 'ALREADY MASTERED',
    clear: 'CLEARED', newFoe: 'NEW FOE', guardian: 'GUARDIAN OF', finalPage: 'THE DEEPEST LEVEL', falls: 'FALLS', pageReturns: 'a color returns to the world',
    page: 'LEVEL', next: 'E · CLICK', skip: 'SPACE TO SKIP',
   
   
    school: 'SCHOOL', schools: 'SCHOOLS', power: 'POWER', awaken: 'AWAKENS', free: 'FREE', active: 'ACTIVE', base: 'base',
    tBuild: 'BUILD', tStats: 'STATS', tCodex: 'CODEX', tPages: 'DIARY',
    stDmg: 'Damage', stRate: 'Attack speed', stCrit: 'Crit chance', stCritMul: 'Crit damage', stMulti: 'Multishot', stSize: 'Attack size', stSpd: 'Move speed', stDashCd: 'Dash cooldown', stMaxSh: 'Shields', stGreed: 'Gold gain',
    powerHelp: 'POWER = damage × attack speed × crit × multishot × weapon stars × weapon synergy. Situational bonuses (moving, low HP, burning targets…) come on top.',
    schoolHelp: 'Every rune belongs to one or two schools. Own 3 / 5 / 7 different runes of a school to awaken tier I / II / III.',
    synHelp: 'Own two specific runes and their resonance card starts to appear among your rune choices. Pick it to switch on an effect neither rune has alone.',
    wsynHelp: 'Each weapon has one partner rune. Hold the weapon and own that rune to transform it.',
    cxWeapons: 'WEAPONS · SYNERGIES',
    wsyn: 'WEAPON SYNERGY', needs: 'needs',
    mapHint: 'CLICK A VISITED ROOM TO TRAVEL · TAB / ESC TO CLOSE', mapLocked: 'CANNOT TRAVEL DURING A FIGHT', mapHere: 'YOU ARE HERE', travel: 'TRAVEL',
    laterSyn: 'LATER, WITH', playing: 'YOUR KNIGHT', become: 'BECOME', cycle: 'E · CHANGE', heatNone: 'No curses. Each curse adds a challenge and +10% crystals.', flawless: 'FLAWLESS', rec: (r, w, b, h) => `RUNS ${r} · WINS ${w}${b ? ' · FURTHEST ' + b : ''}${h ? ' · MAX CURSE ' + h : ''}`, skill: 'SKILL', passive: 'PASSIVE', kSkill: 'skill', diffT: 'DIFFICULTY', tip: 'TIP', heat: 'CURSE',
    tipGlyph: 'Runes upgrade <b>every</b> weapon you hold. The line under the card shows how it adapts to your current weapon. ESC shows your whole build.',
    tipResonance: '<b>Resonance ready!</b> Two of your runes can now combine. Their gold <b>resonance card</b> will show up among rune choices — pick it to switch the combo on.',
    tipSchool: '<b>Schools</b>: runes of the same school stack. 3 / 5 / 7 of them awaken bonuses (bottom-left).',
    tipChroma: 'The bar at the bottom is <em class="c">colour</em>, drunk from every foe you hit and kill. Your weapon feeds on it all the time (see the ◈ line on the weapon). When full, press <kbd>F</kbd> to unleash it: bullets vanish and for a few seconds every attack is fed for free.',
    tipStar: '<b>★ stars</b>: each star gives that weapon +20% power. Blacksmiths, whetstones and mana altars add stars.',
    tipLab: '<b>Colour crystals ◆</b> drop from elites and guardians and are <b>kept even when you fall</b>. Spend them at the camp research table: new weapons, heroes, rune packs and talents.',
    tipWeapon: 'Every weapon is one of four classes — <b>magazine, charge, melee, beam</b> — and each draws power from absorbed <em class="c">colour</em> differently. Its ◈ line tells you how.',
    tipWsyn: '<b>Weapon synergy</b>: this weapon and one of your runes transform each other. Check the weapon card.',
    tipMap: 'Press <kbd>TAB</kbd> for the map. Outside combat, click any visited room to travel there instantly.',
    tipSkill: 'Press <kbd>R</kbd> to use your knight\'s skill. The icon next to the chroma bar shows its cooldown.',
    tipPower: '<b>POWER</b> (bottom right) sums up your damage output. Every upgrade shows exactly how much it added.',
    tipElite: 'Elites carry an <b>affix</b> shown above them. Read it before you fight.',
    echoBoss: 'AN ECHO', gems: 'CRYSTALS', goalDone: 'GOAL', owned: 'OWNED', lab: 'RESEARCH TABLE', locked: 'LOCKED', pack: 'RUNE PACK',
    labSub: n => `Research weapons, heroes, runes and talents with colour crystals. You have ${n} ◆`, labLocked: c => `Research it at the camp table · ${c} ◆`,
    labRunes: 'Researched runes join the rune pool of every future run.', labHint: 'ESC / E · CLOSE', tW: 'WEAPONS', tH: 'HEROES', tR: 'RUNES', tT: 'TALENTS', tG: 'GOALS',
    gemsEnd: (n, tot, m) => `+${n} COLOUR CRYSTALS ◆ <small>(×${m} for difficulty) · ${tot} in total · spend them at the camp research table</small>`,
    fsBtn: ['FULLSCREEN', 'EXIT FULLSCREEN'], fsKey: 'FULLSCREEN · PRESS F11',
    lbBtn: 'LEADERBOARD', lbRule: 'One board for every difficulty. Score = levels reached × 1000, +2000 for a win, +1 per second under an hour (wins only), +2 per kill; then × difficulty (easy 0.6 · normal 1 · hard 1.4 · nightmare 1.8) and +10% per curse.',
    lbCols: ['#', 'NAME', 'SCORE', 'FURTHEST', 'DIFFICULTY', 'TIME'], lbEmpty: 'No runs yet. Be the first.', lbErr: 'Could not reach the leaderboard (it works on the online version only).', lbLoad: 'LOADING…', lbWin: 'CLEARED',
    lbScore: 'SCORE', lbNick: 'NICKNAME', lbSend: 'UPLOAD SCORE', lbSending: 'UPLOADING…', lbSent: r => `Uploaded · #${r} on the leaderboard`, lbFail: 'Upload failed. Try again in a moment.', lbOffline: 'Could not reach the leaderboard (uploads work on the online version only).', lbBad: 'This run did not pass the server check, so it cannot be uploaded.', lbNoNick: 'Enter a nickname first.',
    synUnlock: 'UNLOCKS RESONANCE CARD', synReady: 'READY', synPickHint: 'Both runes are yours. Pick to switch the resonance on.',
    wReload: 'RELOADING', wSat: 'COLOUR ROUNDS', wNext: c => `next reload drinks ${c}`, wGrey: 'grey · needs colour', wOver: 'OVERCHARGE', wHold: 'hold at full to drink colour', wRelease: 'release spends 10 colour', wBlade: 'colour blade on 3rd',
  },
  zh: {
    begin: '开始', enterHint: '回车开始 · 建议佩戴耳机 · M 静音',
    tag: '灰堡之下，一块活着的棱镜正在吞噬世间的颜色。你是最后一名骑士，眼中还留着<b>一点青色</b>。深入地牢，击败层层守卫，<b>把颜色夺回来。</b>',
   
    kMove: '移动', kAttack: '攻击 · 按住', kDash: '冲刺', kSwap: '切换武器', kUse: '拾取 · 开启 · 对话', kChroma: '释放色彩', kPause: '暂停 · 构筑', kMap: '大地图',
    touch: '本游戏需要键盘和鼠标。',
    chroma: '色能', combo: '连击', empty: '空',
    chooseGlyph: '选择一枚符文', eliteGlyph: '精英的符文', bossGlyph: '守卫的馈赠', shrineGlyph: '祭坛的回应',
    reroll: '重抽', pickHint: '按 1 · 2 · 3 选择 · R 重抽', resonance: '共鸣', isNew: '新',
    rar: ['普通', '稀有', '传说', '共鸣'],
    paused: '暂停', resume: '继续 · ESC', restart: '重新开始', soundOn: '声音 · 开', soundOff: '声音 · 关', volume: '音量',
    langBtn: '语言 · 简体中文', shakeBtn: ['屏幕震动 · 关', '屏幕震动 · 弱', '屏幕震动 · 强'],
    yourGlyphs: '已获符文', resonances: '共鸣', noGlyphs: '还没有符文。清理房间来获得。', yourStory: '日记残页',
    dead: '你倒下了', win: '色彩归来', winSub: '棱镜碎裂。它囤积的每一种颜色，都流回了人间。',
    fellOn: f => `倒在${f}`,
    sRooms: '房间', sKills: '击杀', sCombo: '最高连击', sDmg: '总伤害', sTime: '用时', sGlyphs: '符文',
    again: '再来一次 · R', toTitle: '标题',
    take: '拾取', buy: '购买', open: '开启', talk: '交谈', offer: '献祭', read: '阅读', descend: '下行',
    noGold: '金币不足', whole: '生命已满', chromaReady: '色能已满 · 按 F', chromaB: '色彩', chromaSub: '世界想起了颜色', maxLv: '已经精通',
    clear: '肃清', newFoe: '新的敌人', guardian: '守卫 ·', finalPage: '最深处', falls: '陨落', pageReturns: '一种颜色回到了世间',
    page: '第', next: 'E · 点击继续', skip: '空格跳过',
   
   
    school: '流派', schools: '流派', power: '战力', awaken: '觉醒', free: '免费', active: '已激活', base: '基础',
    tBuild: '构筑', tStats: '属性', tCodex: '图鉴', tPages: '日记',
    stDmg: '伤害', stRate: '攻速', stCrit: '暴击率', stCritMul: '暴击伤害', stMulti: '多重', stSize: '攻击体积', stSpd: '移动速度', stDashCd: '冲刺冷却', stMaxSh: '护盾', stGreed: '金币收益',
    powerHelp: '战力 = 伤害 × 攻速 × 暴击期望 × 多重 × 武器星级 × 武器联动。移动、低血、目标燃烧等条件加成另算，不计入战力。',
    schoolHelp: '每枚符文属于一到两个流派。同一流派拥有 3 / 5 / 7 枚不同符文时，依次觉醒 I / II / III 阶加成。',
    synHelp: '集齐两枚特定符文后，它们的共鸣卡会开始出现在符文选择里；选中它才会激活两者单独都没有的新效果。',
    wsynHelp: '每把武器都有一枚搭档符文。手持该武器并拥有那枚符文，武器就会质变。',
    cxWeapons: '武器 · 联动',
    wsyn: '武器联动', needs: '需要',
    mapHint: '点击已探索的房间快速传送 · TAB / ESC 关闭', mapLocked: '战斗中无法传送', mapHere: '你在这里', travel: '传送',
    laterSyn: '日后可搭配', playing: '当前角色', become: '切换为', cycle: 'E · 切换', heatNone: '没有诅咒。每多一层诅咒，多一项挑战，色晶 +10%。', flawless: '无瑕', rec: (r, w, b, h) => `出征 ${r} · 胜利 ${w}${b ? ` · 最远 ${b} 层` : ''}${h ? ' · 最高诅咒 ' + h : ''}`, skill: '技能', passive: '被动', kSkill: '技能', diffT: '难度', tip: '提示', heat: '诅咒',
    tipGlyph: '符文会强化你手里的<b>所有</b>武器。卡片底部那行写着它在当前武器上的具体效果。按 ESC 可查看完整构筑。',
    tipResonance: '<b>共鸣就绪！</b>你的两枚符文可以组合了。之后的符文选择里会出现金色的<b>共鸣卡</b>，选中它才会激活组合效果。',
    tipSchool: '<b>流派</b>：同流派的符文会累加，凑齐 3 / 5 / 7 枚依次觉醒加成（左下角显示进度）。',
    tipChroma: '底部的条是<em class="c">色能</em>，从你击中、击杀的每个敌人身上吸取。武器会持续消耗它变强（看武器上的 ◈ 说明）。充满后按 <kbd>F</kbd> 释放：清除弹幕，几秒内所有攻击免费吃满色能。',
    tipStar: '<b>★ 星级</b>：武器每多一颗星，威力 +20%。铁匠铺、磨刀石和魔力祭坛都能加星。',
    tipLab: '<b>色晶 ◆</b> 由精英和守卫掉落，<b>死亡后也会保留</b>。回营地的炼金台花掉它们：研究新武器、角色、符文包与天赋。',
    tipWeapon: '每把武器属于四类之一——<b>弹匣、蓄力、近战、光束</b>，各自以不同方式吸取<em class="c">色能</em>变强。武器上的 ◈ 一行写着具体规则。',
    tipWsyn: '<b>武器联动</b>：这把武器和你的某枚符文互相成就，发生了质变。详见武器卡。',
    tipMap: '按 <kbd>TAB</kbd> 打开地图。不在战斗中时，点击任意已探索的房间即可瞬间传送。',
    tipSkill: '按 <kbd>R</kbd> 释放角色技能。色彩条旁的图标显示冷却。',
    tipPower: '右下角的<b>战力</b>概括了你的输出能力。每次变强，都会显示具体加了多少、来自哪里。',
    tipElite: '精英头顶会显示<b>词缀</b>，开打前先看清楚。',
    echoBoss: '回响', gems: '色晶', goalDone: '目标达成', owned: '已拥有', lab: '炼金台', locked: '未解锁', pack: '符文包',
    labSub: n => `用色晶研究新武器、角色、符文与天赋。现有 ${n} ◆`, labLocked: c => `可在营地炼金台研究 · ${c} ◆`,
    labRunes: '研究后，这些进阶符文会出现在之后每一局的符文选择里。', labHint: 'ESC / E · 关闭', tW: '武器', tH: '角色', tR: '符文', tT: '天赋', tG: '目标',
    gemsEnd: (n, tot, m) => `色晶 +${n} ◆ <small>（难度倍率 ×${m}）· 共 ${tot} · 回营地炼金台使用</small>`,
    fsBtn: ['全屏', '退出全屏'], fsKey: '全屏 · 按 F11',
    lbBtn: '排行榜', lbRule: '所有难度一张总榜。综合分 = 到达层数 × 1000，通关再 +2000，通关用时每比一小时少 1 秒 +1，每击杀 +2；最后乘难度倍率（简单 0.6 · 普通 1 · 困难 1.4 · 噩梦 1.8），每层诅咒再 +10%。',
    lbCols: ['名次', '昵称', '综合分', '最远', '难度', '用时'], lbEmpty: '还没有人上榜，来当第一个。', lbErr: '没连上排行榜服务器（只有线上版能查看）。', lbLoad: '读取中…', lbWin: '通关',
    lbScore: '本局综合分', lbNick: '昵称', lbSend: '上传成绩', lbSending: '上传中…', lbSent: r => `已上传 · 总榜第 ${r} 名`, lbFail: '上传失败，稍后再试。', lbOffline: '没连上排行榜服务器（只有线上版能上传成绩）。', lbBad: '这一局没有通过服务器校验，无法上传。', lbNoNick: '先填一个昵称。',
    synUnlock: '解锁共鸣卡', synReady: '可选取', synPickHint: '两枚符文都已拥有，选择它即可激活共鸣。',
    wReload: '装填中', wSat: '彩弹', wNext: c => `下次装填吸取 ${c} 色能`, wGrey: '灰光 · 需要色能', wOver: '过载', wHold: '满蓄后按住吸取色能', wRelease: '出手消耗 10 色能', wBlade: '第 3 击斩出彩刃',
  }
};
const t = (k, ...a) => { const v = (STR[LANG] && STR[LANG][k] !== undefined) ? STR[LANG][k] : STR.en[k]; return typeof v === 'function' ? v(...a) : v; };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const ZHNUM = ['', '一', '二', '三', '四', '五'];
const lvTxt = n => LANG === 'zh' ? ZHNUM[n] || n : ROMAN[n] || n;
const floorTxt = d => `${LANG === 'zh' ? `第 ${(d >> 1) + 1}-${(d & 1) + 1} 层` : `LEVEL ${(d >> 1) + 1}-${(d & 1) + 1}`} · ${tn(BIOMES[d >> 1])}`;
function setLang(l) { LANG = OPT.lang = l; saveOpt(); document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'; document.body.classList.toggle('zh', l === 'zh'); if (typeof UI !== 'undefined' && UI.applyLang) UI.applyLang(); }
