'use strict';
/* GRISAILLE · story — narrative text, NPCs, lore pages, dialogue runner */
const L2 = (en, zh) => ({ en, zh });
const lx = o => o ? (LANG === 'zh' ? o.zh : o.en) : '';
const STORY = {
  intro: [
    L2('Long ago, an alchemist feared the world would fade, so he forged a prism to hold its colors forever.', '很久以前，一位炼金师害怕世界会褪色，于是铸造了一块棱镜，想把所有颜色永远留住。'),
    L2('The prism woke hungry. It drank the red of blood, the cyan of magic, the gold of fortune, and named itself CHROMATIC.', '棱镜醒来时满怀饥饿。它喝光了鲜血的红、魔法的青、财富的金，自称「窃色者」。'),
    L2('Then it sank into the dungeon beneath the Grey Keep, and the world above turned grey.', '随后它沉入灰堡之下的地牢，地面上的世界从此只剩灰色。'),
    L2('Eight guardians wait on the eight levels below. Three of them hold the stolen colors.', '地牢共有八层，每层尽头都有一位守卫，其中三位握着被偷走的颜色。'),
    L2('You are the last knight with a spark of cyan left in your eye.', '你是最后一名骑士，眼中还留着一点青色。'),
    L2('Go down. Take the colors back.', '下去吧，把颜色夺回来。'),
  ],
  heroIntro: {
    knight: L2('You are the last knight with a spark of cyan left in your eye.', '你是最后一名骑士，眼中还留着一点青色。'),
    rogue: L2('You are a rogue. The prism missed one drop of red: the one on your blade.', '你是一名游荡者。棱镜漏掉了一滴红——就在你的刀刃上。'),
    sage: L2('You are a wizard. Your staff still holds a flicker of cyan the prism could not reach.', '你是一名巫师。你的法杖里还藏着一缕棱镜够不着的青光。'),
    gilder: L2('You are a paladin. Your oath is gold, and the prism has never managed to steal an oath.', '你是一名圣骑士。你的誓言是金色的，而棱镜从来偷不走誓言。'),
  },
  floorStele: [
    L2('THE CRYPT. The dead sleep badly down here. The Warden of this level keeps the RED.', '地下墓穴。这里的死者睡得并不安稳。这一层的守卫，握着「红」。'),
    L2('THE SEWERS. The cyan drained away with the water. Something long and hungry swims in the dark channels.', '下水道。青色随着污水流走了。漆黑的水道里，有个又长又饿的东西在游。'),
    L2('THE CLOCKWORKS. Gears that count stolen time. The master of these halls holds the GOLD.', '机关大厅。齿轮在数着偷来的时间。这里的主人，握着「金」。'),
    L2('THE VOID. Below the last level there is nothing left at all. The prism waits where color ends.', '虚空。最后一层之下，什么都不剩了。棱镜在颜色的尽头等你。'),
  ],
  npcs: {
    painter: {
      name: 'OLD ALCHEMIST', zh: '老炼金师',
      spr: ['..#####...', '.#######..', '#########.', '..#www#...', '..#w#w#...', '..#www#...', '...www....', '..#ddd#...', '.#ddddd#..', '.#ddddd#.g', '.#ddddd#g.', '..#d#d#...'],
      lines: [
        L2('Ah, you made it to the gate. Good. You still have a little color in you.', '啊，你到地牢门口了。很好，你身上还留着一点颜色。'),
        L2('The rack holds one weapon of each kind: magazine, charge, melee, beam. All of them run on color. The more you drink from the monsters, the harder they bite. Try one on the dummy.', '架上每类武器各放了一把：弹匣、蓄力、近战、光束。它们都靠颜色驱动——从怪物身上吸得越多，就咬得越狠。拿训练假人试试。'),
        L2('The statues are heroes you can become; stand before one and press E. Some are still stone. The rune stone sets the difficulty: the brighter it burns, the harder the road.', '那些雕像是你可以成为的英雄，站到像前按 E 切换；有几尊还是石头。那块符石决定难度——它烧得越亮，路就越难。'),
        L2('Elites and guardians bleed color crystals. Even if you fall, I keep them for you. Bring them to my research table and we will wake new weapons, heroes and runes.', '精英和守卫会流出色晶。就算你倒下，我也替你收着。带回我的炼金台，我们一起唤醒新的武器、英雄和符文。'),
        L2('Runes belong to schools; gather one school and it awakens. Hold the right two runes and their resonance becomes a card you may choose. Choose with care, not by luck.', '符文各有流派，同一流派凑得越多就会觉醒。手握对的两枚符文，它们的共鸣就会变成一张可选的卡。要用心挑，别只靠运气。'),
        L2('Doors lock when the monsters wake. Clear the room and they open again. Your map is at the top right.', '怪物一醒，房门就会锁上；清干净了，门自然会开。地图在右上角。'),
        L2('Every level ends in a guardian. The ones of the crypt hold the RED. Bring it back, knight.', '每一层的尽头都有一位守卫，墓穴的守卫握着「红」。把它带回来吧，骑士。'),
      ]
    },
    cartographer: {
      name: 'CARTOGRAPHER', zh: '制图师',
      spr: ['...###....', '..#ggg#...', '.#ggggg#..', '.#g#w#g#..', '.#gwwwg#..', '..#ggg#...', '.#ggggg#..', '#gg#yy#gg#', '#gg#yy#gg#', '.#ggggg#..', '..#g.g#...', '..##.##...'],
      lines: [
        L2('These halls shift whenever nobody is looking. I map them anyway.', '这些大厅总在没人看的时候挪动位置。可我还是照画不误。'),
        L2('Here, take my notes. Your map is complete now.', '给，拿着我的笔记。你的地图现在完整了。'),
      ], gift: 'map'
    },
    violet: {
      name: 'LOST VIOLET', zh: '迷途的紫',
      spr: ['..........', '....vv....', '...vvvv...', '..vvwvvv..', '.vvvvvvvv.', 'vvvvvvvv..', '..vvvvv...', '...v.v....', '..........', '..........', '..........', '..........'],
      lines: [
        L2('I am the one color the prism did not want. It left me down here.', '我是棱镜唯一不想要的颜色，它把我丢在了这里。'),
        L2('Carry me for a while. I will make your color burst brighter.', '带上我一阵子吧，我会让你的色彩爆发得更亮。'),
      ], gift: 'violet'
    },
    knight: {
      name: 'FALLEN KNIGHT', zh: '陨落的骑士',
      spr: ['....m.....', '...mm.....', '.#######..', '.#ggggg#..', '.#######..', '.#gg.gg#..', '.#ggggg#..', '.#ggggg#..', '.#ggggg#..', '.#######..', '..#...#...', '..#...#...'],
      lines: [
        L2('I came down here before you. I had cyan in my eyes too.', '我比你先下来过。我的眼里也曾有过青色。'),
        L2('Take my weapon. And do not stop until the prism breaks.', '拿上我的武器。不打碎棱镜，就别停下。'),
      ], gift: 'weapon'
    },
    echo: {
      name: "ALCHEMIST'S GHOST", zh: '炼金师的亡魂',
      spr: ['..#####...', '.#######..', '#########.', '..#####...', '..#w#w#...', '..#####...', '...###....', '..#####...', '.#######..', '.#######..', '.#######..', '..#.#.#...'],
      lines: [
        L2('I made the prism. I only wanted the colors to last forever.', '棱镜是我造的。我只是想让颜色永远不褪。'),
        L2('Forever is a cage. Break it, knight, and let the colors fade and return as they should.', '「永远」是一座牢笼。打碎它吧，骑士，让颜色像本来那样褪去，再重新回来。'),
      ], gift: 'blessing'
    },
  },
  npcByFloor: ['cartographer', 'violet', 'knight', 'echo'],
  merchant: [L2('COLOR COSTS EXTRA.', '颜色要另外收费。'), L2('NO REFUNDS. NO RED.', '概不退款，红色不卖。'), L2('GOLD STILL SHINES DOWN HERE.', '这下面，金子照样发光。'), L2('SPEND IT. YOU CANNOT TAKE IT WITH YOU.', '花掉吧，反正带不走。')],
  pages: [
    L2("Day 1. The prism is finished. It hums when color is near.", '第一天。棱镜完成了。颜色靠近时，它会嗡嗡作响。'),
    L2('Day 9. It drank a sunset tonight. The sky went grey and the prism glowed like a coal.', '第九天。今晚它喝下了一片晚霞。天空变灰，棱镜亮得像一块炭。'),
    L2('Day 14. I gave the Warden the red and asked him to lock the crypt.', '第十四天。我把红色交给典狱长，请他锁好墓穴。'),
    L2('Day 20. The sewers are full of colors I washed away. They whisper at night.', '第二十天。下水道里全是我冲掉的颜色，它们夜里会低语。'),
    L2('Day 31. The prism speaks now. It only ever says: forever, forever, forever.', '第三十一天。棱镜会说话了。它只会说：永远，永远，永远。'),
    L2('Day 40. A knight came down with cyan in their eyes. I watched it go out.', '第四十天。一名眼含青色的骑士走了下来。我看着那点青光熄灭。'),
    L2('Day 52. I am afraid of my own work.', '第五十二天。我开始害怕自己造出来的东西。'),
    L2('Last entry. If someone breaks it, the colors will fade again one day. Good. Whatever fades can come back.', '最后一篇。如果有人打碎它，颜色终有一天会再次褪去。那很好——会褪去的东西，才会回来。'),
  ],
  frag: {
    red: { name: 'RED RESTORED', zh: '红色归来', desc: 'Your blood runs hot: +15% damage.', zhDesc: '热血沸腾：伤害 +15%。' },
    cyan: { name: 'CYAN RESTORED', zh: '青色归来', desc: 'Magic flows through you faster.', zhDesc: '魔力在你体内流得更快。' },
    gold: { name: 'GOLD RESTORED', zh: '金色归来', desc: 'Fortune favors you: +8% crit, more gold.', zhDesc: '好运眷顾：暴击率 +8%，金币更多。' },
  },
  ending: [
    L2('The prism cracks. Red, cyan and gold pour out like a breath held far too long.', '棱镜裂开了。红、青、金像憋了太久的一口气，倾泻而出。'),
    L2('One day they will fade again. That is what colors are for.', '终有一天，它们还会褪去。颜色本来就是这样。'),
    L2('But today, the world has color again.', '但今天，世界重新有了颜色。'),
  ],
  epitaphs: [L2('The dungeon keeps what it takes.', '地牢从不归还它拿走的东西。'), L2('Even grey has shades.', '灰色也有深浅。'), L2('Get up. Go down again.', '站起来，再下去一次。'), L2('Every hero fell once.', '每个英雄都倒下过。')],
};

/* ---------- dialogue runner ---------- */
const DLG = { q: null, i: 0, shown: 0, cb: null, sp: null, narr: false };
function talk(sp, lines, cb, narr) {
  DLG.q = lines; DLG.i = 0; DLG.shown = 0; DLG.cb = cb || null; DLG.sp = sp; DLG.narr = !!narr;
  G.state = 'talk'; M.l = false; UI.dialog(true); AU.page();
}
function updTalk(rdt) {
  const line = lx(DLG.q[DLG.i]);
  DLG.shown = Math.min(line.length, DLG.shown + rdt * (LANG === 'zh' ? 26 : 48));
  UI.dialogText(line.slice(0, DLG.shown | 0), DLG.shown >= line.length);
  if (DLG.narr && KP[' ']) { DLG.i = DLG.q.length; return endTalk(); }
  if (DLG.narr && DLG.shown >= line.length) DLG.hold = (DLG.hold || 0) + rdt; else DLG.hold = 0; // narration turns its own pages
  if (KP.e || KP.enter || M.lp || (!DLG.narr && KP[' ']) || DLG.hold > 2.2) {
    if (DLG.shown < line.length) DLG.shown = line.length;
    else { DLG.i++; DLG.shown = 0; if (DLG.i >= DLG.q.length) return endTalk(); AU.page(); }
  }
}
function endTalk() {
  UI.dialog(false); G.state = 'play';
  const cb = DLG.cb; DLG.cb = null; DLG.q = null;
  if (cb) cb();
}
