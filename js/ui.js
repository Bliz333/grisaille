'use strict';
/* GRISAILLE · ui — DOM HUD, minimap, labels, dialogue, glyph cards, banners, menus, settings */
const $ = id => document.getElementById(id);
const _url = new Map();
function sprURL(key, s) { let u = _url.get(key); if (!u) { u = s.toDataURL(); _url.set(key, u); } return u; }
const glyphURL = g => sprURL('g:' + g.id, spr(g.icon));
const weaponURL = id => sprURL('w:' + id, WSPR[id].s);
const ROOMN = { start: ['CAMP', '营地'], combat: ['FIGHT', '战斗'], elite: ['ELITE', '精英'], boss: ['GUARDIAN', '守卫'], shop: ['SHOP', '商店'], chest: ['TREASURE', '宝箱'], shrine: ['ALTARS', '祭坛'], npc: ['VISITOR', '来客'], trial: ['TRIAL', '试炼'], forge: ['BLACKSMITH', '铁匠铺'], fortune: ['WHEEL OF FATE', '命运轮盘'], spring: ['FOUNTAINS', '双泉'], library: ['FORBIDDEN LIBRARY', '禁书库'] };
const npcURL = N => N && N.spr ? sprURL('n:' + N.name, N._s || (N._s = spr(N.spr))) : '';

const UI = {
  last: {}, mapDirty: true, big: false, lab: [],
  showHUD(on) { $('hud').hidden = !on; },
  all() { this.hp(); this.weapons(); this.build(); this.floor(); this.coins(true); this.gems(); this.frags(); this.mapDirty = true; $('skill').hidden = false; $('skillIc').src = sprURL('h:' + G.hero, spr(hero().icon)); },
  hp() {
    let s = ''; for (let i = 0; i < P.maxHp; i++) s += `<i class="${i < P.hp ? 'on' : ''}"></i>`;
    $('hp').innerHTML = s;
    let t2 = ''; for (let i = 0; i < Math.max(P.maxSh, P.sh); i++) t2 += `<i class="${i < P.sh ? 'on' : ''}${i >= P.maxSh ? ' over' : ''}"></i>`;
    $('sh').innerHTML = t2;
    document.body.classList.toggle('lowhp', P.hp <= 2 && P.hp > 0);
  },
  gems() { $('gemsN').textContent = G.gems || 0; },
  frags() { $('frags').innerHTML = ['red', 'cyan', 'gold'].map(c => `<i class="${c}${G.frags && G.frags[c] ? ' on' : ''}"></i>`).join(''); },
  coins(force) { if (force || this.last.coins !== G.coins) { const el = $('coins'); el.textContent = G.coins; if (!force) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } this.last.coins = G.coins; } },
  weapons() {
    let s = '';
    P.ws.forEach((w, i) => {
      if (!w) { s += `<div class="wcard empty${i === P.wi ? ' act' : ''}"><span>${t('empty')}</span></div>`; return; }
      const D = WEAPONS[w.id], lv = w.lv || 1;
      const on = wsyn(w);
      s += `<div class="wcard${i === P.wi ? ' act' : ''} t${D.tier || 0}"><img src="${weaponURL(w.id)}" alt=""><div><b>${tn(D)}${lv > 1 ? ` <em class="y">${'★'.repeat(lv - 1)}</em>` : ''}</b><small>${wcls(D)}</small>${i === P.wi ? `<span class="ws${on ? ' on' : ''}">◆ ${tn(D.syn)}${on ? '' : ` · ${t('needs')} ${tn(GL[D.syn.g])}`}</span>` : ''}<span class="wst" data-w="${i}"></span></div>${i !== P.wi ? '<kbd>Q</kbd>' : ''}</div>`;
    });
    $('wpn').innerHTML = s; this.last.wst = null;
  },
  build() {
    let c = '';
    for (const id in SCHOOLS) { const n = G.sc[id] || 0; if (!n) continue; const k = scTier(n); c += `<div class="sc ${SCHOOLS[id].cls}${k ? ' on' : ''}"><b>${scName(id)}</b><span class="pips">${scPips(n)}</span>${k ? `<span>${ROMAN3[k]}</span>` : ''}</div>`; }
    $('scRow').innerHTML = c;
    let s = '';
    for (const id in G.gl) { const g = GL[id]; s += `<div class="gi r${g.rar}" title="${tn(g)}"><img src="${glyphURL(g)}" alt=""><span>${lvTxt(G.gl[id])}</span></div>`; }
    for (const id of G.syn) s += `<div class="gi syn" title="${tn(SYNM[id])}"><b>◆</b><span>${tn(SYNM[id])}</span></div>`;
    $('build').innerHTML = s;
  },
  // POWER readout: silent refresh every frame, and a visible "old → new · source" pop for permanent upgrades
  powerUp(prev, src) {
    const now = power(); this.last.pow = now; $('powerN').textContent = now;
    if (now === prev) return;
    const pct = Math.round((now / prev - 1) * 100), el = document.createElement('div'); el.className = 'up';
    el.innerHTML = `${prev} → ${now} ${pct >= 0 ? '▲' : '▼'}${Math.abs(pct)}%${src ? `<small>${src}</small>` : ''}`; if (pct < 0) el.style.color = 'var(--red)';
    $('power').querySelectorAll('.up').forEach(o => o.remove()); $('power').appendChild(el); setTimeout(() => el.remove(), 2700);
    this.tip('power');
  },
  // one-time contextual tips (remembered across runs)
  tip(k) {
    if (OPT.tips[k] || G.state === 'title') return; OPT.tips[k] = 1; saveOpt();
    (this.tipQ || (this.tipQ = [])).push(k); if (!this.tipOn) this.nextTip();
  },
  nextTip() {
    const k = this.tipQ.shift(), el = $('tip'); if (!k) { this.tipOn = false; return; }
    this.tipOn = true; el.innerHTML = `<small>${t('tip')}</small>${t('tip' + k[0].toUpperCase() + k.slice(1))}`; el.className = ''; void el.offsetWidth; el.className = 'show';
    setTimeout(() => this.nextTip(), 8000);
  },
  floor() { $('floorName').textContent = floorTxt(G.depth); },
  chromaReady() { $('chroma').classList.add('ready'); this.toast(t('chromaReady'), 'c'); this.tip('chroma'); },
  chromaEnd() { $('chroma').classList.remove('active'); },
  flash(kind) { const v = $('vig'); v.className = ''; void v.offsetWidth; v.className = kind; },
  bars(on) { document.body.classList.toggle('cine', on); },
  bossIntro(b) {
    const ln = b.BD.lines && b.BD.lines.intro;
    $('bossCard').innerHTML = `<small>${b.echo ? t('echoBoss') + ' · ' : ''}${b.BD.floor === 3 ? t('finalPage') : t('guardian') + ' ' + tn(BIOMES[G.floor])}</small><b>${tn(b.BD)}</b><i>${LANG === 'zh' ? (b.BD.zhTitle || b.BD.title) : b.BD.title}</i>${ln ? `<p>“${lx(ln)}”</p>` : ''}`;
    const el = $('bossCard'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  bossBar(b) {
    this.boss = b; $('boss').hidden = !b;
    if (b) { $('bossName').textContent = tn(b.BD); $('bossTitle').textContent = LANG === 'zh' ? (b.BD.zhTitle || b.BD.title) : b.BD.title; this.bossLag = 1; $('bossTicks').innerHTML = b.BD.phases.map(p => `<i style="left:${p * 100}%"></i>`).join(''); }
  },
  // banners queue so two announcements in a row (synergy + resonance) are both readable
  banner(tx, sub, cls = '') { const now = performance.now(), at = Math.max(now, this.banAt || 0); this.banAt = at + 1400; if (at > now) { setTimeout(() => this.showBanner(tx, sub, cls), at - now); return; } this.showBanner(tx, sub, cls); },
  showBanner(tx, sub, cls) { const el = $('banner'); el.innerHTML = `<b>${tx}</b>${sub ? `<small>${sub}</small>` : ''}`; el.className = ''; void el.offsetWidth; el.className = 'show ' + cls; },
  stamp(tx) { const el = $('stamp'); el.textContent = tx; el.className = ''; void el.offsetWidth; el.className = 'show'; },
  toast(tx, cls = '') {
    const box = $('toasts'), el = document.createElement('div'); el.className = 't ' + cls; el.innerHTML = tx; box.appendChild(el);
    setTimeout(() => el.remove(), 2600); while (box.children.length > 4) box.firstChild.remove();
  },
  foe(e) {
    const tip = e.D.tip ? e.D.tip[LANG === 'zh' ? 'zh' : 'en'] : '';
    const el = $('foe'); el.innerHTML = `<small>${t('newFoe')}</small><b>${tn(e.D)}</b>${tip ? `<p>${tip}</p>` : ''}`; el.className = ''; void el.offsetWidth; el.className = 'show' + (e.elite ? ' elite' : ''); AU.foe();
  },
  tick(dt) {
    this.coins();
    const ch = $('chroma'), fill = $('chromaFill');
    if (P.chromaT > 0) { ch.classList.add('active'); ch.classList.remove('ready'); fill.style.width = (P.chromaT / (6 + 2 * S.over) * 100) + '%'; }
    else { fill.style.width = P.chroma + '%'; if (P.chroma < 100) ch.classList.remove('ready'); }
    const sk = $('skill'), k = Math.round(Math.max(0, P.skCd) / hero().skill.cd * 100) / 100; if (k !== this.last.skk) { sk.style.setProperty('--k', k); this.last.skk = k; } sk.classList.toggle('act', P.skT > 0); const rdy = P.skCd <= 0; if (rdy !== this.last.sk) { sk.classList.toggle('ready', rdy); if (rdy) { sk.classList.remove('pop'); void sk.offsetWidth; sk.classList.add('pop'); } this.last.sk = rdy; }
    const cb = $('combo');
    if (P.combo >= 3) {
      cb.hidden = false;
      if (this.last.combo !== P.combo) { const n = $('comboN'); n.textContent = P.combo; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); this.last.combo = P.combo; }
      cb.classList.toggle('hot', P.combo >= 15); $('comboBar').style.width = (P.comboT / 2.6 * 100) + '%';
    } else { cb.hidden = true; this.last.combo = 0; }
    if (this.boss) {
      const k = Math.max(0, this.boss.hp / this.boss.maxHp); this.bossLag = Math.max(k, this.bossLag - dt * 0.35);
      $('bossFill').style.width = k * 100 + '%'; $('bossLag').style.width = this.bossLag * 100 + '%';
      $('boss').classList.toggle('p2', this.boss.phase > 1);
    }
    const hk = P.hp + '/' + P.sh + '/' + P.maxHp + '/' + P.maxSh; if (this.last.hp !== hk) { this.last.hp = hk; this.hp(); }
    const ws = P.ws.map(w => w ? this.wstat(w) : ''), wk = ws.join('|');
    if (this.last.wst !== wk) { this.last.wst = wk; document.querySelectorAll('#wpn .wst').forEach(el => { el.innerHTML = ws[+el.dataset.w]; }); }
    const pw = power(); if (this.last.pow !== pw) { this.last.pow = pw; $('powerN').textContent = pw; }
    this._mt = (this._mt || 0) + dt; if (this._mt >= 1 / 30) { this._mt = 0; this.drawMap(); } // minimap at 30 fps is plenty
  },
  // the weapon card's live line: ammo / reload, overcharge, colour feed, the melee strike count
  wstat(w) {
    const D = WEAPONS[w.id], on = P.chromaT > 0;
    if (D.cls === 'mag') {
      if (w.reload > 0) return `<i class="rl" style="--k:${Math.round((1 - w.reload / w.rlMax) * 20) / 20}"></i>${t('wReload')}`;
      return `<b class="${on || w.sat > 0 ? 'sat' : ''}">${w.ammo}/${w.ammoMax}</b>${on || w.sat > 0 ? ` ${t('wSat')}` : ` <small>${t('wNext', D.sc)}</small>`}`;
    }
    if (D.cls === 'beam') return `<b>∞</b> ${on || P.chroma > 0 ? `<b class="sat">${t('wSat')}</b>` : `<small>${t('wGrey')}</small>`}`;
    if (D.cls === 'charge') return D.manual ? `<small>${t('wRelease')}</small>` : w.oc > 0 ? `<b class="sat">${t('wOver')} ${Math.round(w.oc * 60)}%</b>` : `<small>${t('wHold')}</small>`;
    const k = Math.floor(w.mN); let h = ''; for (let i = 0; i < 3; i++) h += i < k ? '●' : '○';
    return `<b class="${k === 2 && (on || P.chroma >= 8) ? 'sat' : ''}">${h}</b> <small>${t('wBlade')}</small>`;
  },
  sound() { $('sndBtn').textContent = AU.on ? t('soundOn') : t('soundOff'); },

  /* ---------- minimap ---------- */
  drawMap() {
    const L = G.room; if (!L || !L.rooms) return;
    const c = $('map'), big = this.big, cw = big ? 560 : 176, chh = big ? 400 : 128;
    if (this._mw !== cw) { this._mw = cw; c.width = cw * 2; c.height = chh * 2; c.style.width = cw + 'px'; c.style.height = chh + 'px'; }
    const x = c.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); x.clearRect(0, 0, cw, chh);
    x.fillStyle = big ? 'rgba(10,10,12,0.95)' : 'rgba(10,10,12,0.82)'; x.fillRect(0, 0, cw, chh);
    const s = Math.min((cw - 12) / L.w, (chh - 12) / L.h), ox = (cw - L.w * s) / 2, oy = (chh - L.h * s) / 2; this._ms = { s, ox, oy };
    const known = r => r.visited || r.seen;
    x.strokeStyle = '#4a4a52'; x.lineWidth = Math.max(1.5, s * 2.4);
    for (const r of L.rooms) for (const n of r.links) if (r.id < n.id && (r.visited || n.visited || G.revealed)) {
      x.beginPath(); x.moveTo(ox + (r.x + r.w / 2) * s, oy + (r.y + r.h / 2) * s); x.lineTo(ox + (n.x + n.w / 2) * s, oy + (n.y + n.h / 2) * s); x.stroke();
    }
    const blink = ((G.rt * 3) | 0) % 2;
    for (const r of L.rooms) {
      if (!known(r) && !G.revealed) continue;
      const rx = ox + (r.x + 1) * s, ry = oy + (r.y + 1) * s, rw = (r.w - 2) * s, rh = (r.h - 2) * s;
      x.fillStyle = r === G.cur ? '#f6f5f0' : r.visited ? (r.cleared ? '#8e8d88' : '#6c6c72') : '#26262c';
      x.fillRect(rx, ry, rw, rh);
      if (big && r === this.hover) { x.strokeStyle = canTravel(r) ? '#40e4ff' : '#ff3d4a'; x.lineWidth = 2.5; x.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4); }
      if (r.active) { x.strokeStyle = '#ff3d4a'; x.lineWidth = 1.5; x.strokeRect(rx, ry, rw, rh); }
      else if (!r.visited) { x.strokeStyle = '#55555e'; x.lineWidth = 1; x.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1); }
      const ic = { boss: '#ff3d4a', shop: '#ffc83d', chest: '#ffc83d', shrine: '#b98aff', npc: '#40e4ff', elite: '#ffc83d', start: '#f6f5f0', trial: '#ff3d4a', forge: '#ff8a2a', fortune: '#ffc83d', spring: '#aee0ff', library: '#86e8b8' }[r.type];
      if (ic && (known(r) || G.revealed)) {
        const mx = rx + rw / 2, my = ry + rh / 2, z = Math.max(3, s * 3.5);
        x.fillStyle = '#121215'; x.fillRect(mx - z / 2 - 1, my - z / 2 - 1, z + 2, z + 2);
        x.fillStyle = ic;
        if (r.type === 'boss') { x.fillRect(mx - z / 2, my - z / 2, z, z); x.fillStyle = '#121215'; x.fillRect(mx - z / 4, my - z / 6, z / 6, z / 6); x.fillRect(mx + z / 10, my - z / 6, z / 6, z / 6); }
        else if (r.type === 'elite') { if (!r.cleared) x.fillRect(mx - z / 2, my - z / 2, z, z / 3), x.fillRect(mx - z / 2, my - z / 2, z / 4, z), x.fillRect(mx + z / 4, my - z / 2, z / 4, z); }
        else if (r.type === 'start') { x.fillRect(mx - z / 4, my - z / 4, z / 2, z / 2); }
        else if (r.type === 'trial' || r.type === 'spring') { x.beginPath(); x.arc(mx, my, z / 2, 0, TAU); x.fill(); }
        else if (r.type === 'forge' || r.type === 'library' || r.type === 'fortune') { x.fillRect(mx - z / 2, my - z / 6, z, z / 3); x.fillRect(mx - z / 6, my - z / 2, z / 3, z); }
        else x.fillRect(mx - z / 2, my - z / 2, z, z);
      }
    }
    for (const r of L.rooms) if (r.reward && !r.cleared && (known(r) || G.revealed)) { const mx = ox + (r.x + r.w / 2) * s, my = oy + (r.y + r.h / 2) * s + (big ? 10 : 4), z = big ? 4 : 2; x.fillStyle = '#121215'; x.fillRect(mx - z - 1, my - z - 1, z * 2 + 2, z * 2 + 2); x.fillStyle = { orb: '#40e4ff', chest: '#ffc83d', goldchest: '#ffc83d', gold: '#ffc83d', potion: '#ff3d4a', heartc: '#ff3d4a', vial: '#40e4ff' }[r.reward] || '#f6f5f0'; x.fillRect(mx - z, my - z, z * 2, z * 2); }
    if (!P.dead && (blink || !big)) { const px = ox + P.x / T * s, py = oy + P.y / T * s; x.fillStyle = '#121215'; x.fillRect(px - 2.5, py - 2.5, 5, 5); x.fillStyle = '#40e4ff'; x.fillRect(px - 1.5, py - 1.5, 3, 3); }
  },
  bigMap(on) {
    this.big = on; this.hover = null; $('mapWrap').classList.toggle('big', on); AU.page();
    G.state = on ? 'map' : 'play'; this.mapHint();
    if (on) this.tip('map');
  },
  mapHint() {
    const el = $('mapHint'), r = this.hover;
    el.classList.toggle('no', !!G.active);
    el.textContent = G.active ? t('mapLocked') : r && r === G.cur ? t('mapHere') : r && canTravel(r) ? `${t('travel')} · ${ROOMN[r.type][LANG === 'zh' ? 1 : 0]}` : t('mapHint');
  },
  mapRoom(mx, my) {
    const L = G.room, m = this._ms; if (!L || !m) return null;
    for (const r of L.rooms) { if (!(r.visited || r.seen || G.revealed)) continue; const rx = m.ox + (r.x + 1) * m.s, ry = m.oy + (r.y + 1) * m.s; if (mx >= rx - 3 && my >= ry - 3 && mx <= rx + (r.w - 2) * m.s + 3 && my <= ry + (r.h - 2) * m.s + 3) return r; }
    return null;
  },

  /* ---------- world-anchored labels (crisp text in any language) ---------- */
  labels(list, cx, cy) {
    const box = $('labels');
    while (this.lab.length < list.length) { const d = document.createElement('div'); box.appendChild(d); this.lab.push(d); }
    for (let i = 0; i < this.lab.length; i++) {
      const d = this.lab[i], it = list[i];
      if (!it) { if (!d.hidden) d.hidden = true; continue; }
      d.hidden = false;
      if (d._h !== it.text) { d.innerHTML = it.text; d._h = it.text; }
      if (d._c !== it.cls) { d.className = 'lab ' + it.cls; d._c = it.cls; }
      if (d._col !== it.col) { d.style.color = it.col || ''; d._col = it.col; }
      d.style.transform = `translate(${Math.round((it.x - cx) * SCALE)}px, ${Math.round((it.y - cy) * SCALE)}px) translate(-50%, -100%)`;
    }
  },

  /* ---------- dialogue ---------- */
  dialog(on) {
    const el = $('dlg'); el.hidden = !on; if (!on) return;
    el.classList.toggle('narr', DLG.narr);
    const sp = DLG.sp;
    $('dlgName').textContent = sp ? tn(sp) : '';
    const img = $('dlgPic'); const u = npcURL(sp); img.hidden = !u; if (u) img.src = u;
    $('dlgHint').textContent = DLG.narr ? `${t('next')} · ${t('skip')}` : t('next');
  },
  dialogText(tx, done) { const el = $('dlgText'); if (el._t !== tx) { el.textContent = tx; el._t = tx; } $('dlg').classList.toggle('done', !!done); },

  /* ---------- glyph cards ---------- */
  track(id, now, next) {
    const S0 = SCHOOLS[id], k = scTier(next), nx = scNext(next);
    return `<div class="trk ${S0.cls}"><b>${scName(id)}</b><span class="pips">${scPips(now, next)}</span><small>${nx ? `${next}/${nx} → ${ROMAN3[scTier(nx)]} ${scTxt(id, scTier(nx))}` : `${ROMAN3[k]} ✓`}</small></div>`;
  },
  cards(list, tier, onPick, title, roller) {
    this.cardList = list; this.cardTier = tier; this.onPick = onPick; this.roller = roller || (() => rollGlyphs(3, tier));
    const pw0 = power();
    $('cardsTitle').textContent = title || (tier >= 2 ? t('bossGlyph') : tier === 1 ? t('eliteGlyph') : t('chooseGlyph'));
    const w = curW(), wt = w ? WEAPONS[w.id].type : null, wn = w ? tn(WEAPONS[w.id]) : '';
    $('cardRow').innerHTML = list.map((g, i) => {
      if (g.sy) return this.synPick(g, i);
      const lv = (G.gl[g.id] || 0) + 1, syn = synergyIf(g.id), ad = wt ? gad(g, wt) : '', pv = glyphPreview(g), pa = powerWith(g.id), ws = w && WEAPONS[w.id].syn;
      const tracks = pv.schools.map(x => this.track(x.id, x.now, x.next)).join('');
      const aw = pv.schools.filter(x => x.up).map(x => `<div class="aw" style="--c:${SCHOOLS[x.id].col}"><i>${t('awaken')} · ${scName(x.id)} ${ROMAN3[x.up]}</i>${scTxt(x.id, x.up)}</div>`).join('');
      const later = SYN.filter(s => (s.a === g.id || s.b === g.id) && !G.syn.has(s.id) && !G.gl[s.a === g.id ? s.b : s.a]).slice(0, 2)
        .map(s => { const q = GL[s.a === g.id ? s.b : s.a]; return `<div class="rcp" title="${td(s)}">◇ <img src="${glyphURL(q)}" alt="">${tn(q)} → <b>${tn(s)}</b></div>`; }).join('');
      const wl = ws && ws.g === g.id && !G.gl[g.id] ? `<div class="syn">◆ ${t('wsyn')} · ${wn}<small>${tn(ws)} — ${td(ws)}</small></div>` : '';
      return `<button class="card r${g.rar}" data-i="${i}" style="--d:${i * 70}ms">
        <div class="rar">${t('rar')[g.rar]} · ${gtag(g)}</div>
        <div class="tracks">${tracks}</div>
        <img class="ic" src="${glyphURL(g)}" alt="">
        <div class="nm">${tn(g)}${lv > 1 ? ` <span class="lv">${lvTxt(lv)}</span>` : ` <span class="new">${t('isNew')}</span>`}</div>
        <div class="ds">${gdesc(g, lv)}</div>${ad ? `<div class="ad"><span>${wn}</span> ${ad}</div>` : ''}
        ${syn.map(s => `<div class="syn">◆ ${t('synUnlock')} · ${tn(s)}<small>${td(s)}</small></div>`).join('')}${wl}${aw}${later ? `<div class="rcps"><small>${t('laterSyn')}</small>${later}</div>` : ''}
        ${pa !== pw0 ? `<div class="pw">${t('power')} ${pw0} → <b>${pa}</b></div>` : ''}
        <kbd>${i + 1}</kbd></button>`;
    }).join('');
    const free = G.freeRR > 0, cost = 10 + 6 * G.rerolls; $('rrCost').textContent = free ? t('free') : cost + 'G'; $('reroll').disabled = !free && G.coins < cost;
    $('cardRow').querySelectorAll('.card').forEach(c => { c.onmouseenter = () => AU.uiHover(); c.onclick = () => this.pickCard(+c.dataset.i); });
    clearTimeout(this.hideT); $('cards').hidden = false; $('cards').classList.remove('out'); // a new set may open before the last pick's fade-out ends
  },
  // a resonance card: both runes are already yours; picking it switches their combined effect on
  synPick(g, i) {
    const s = g.sy, ic = id => `<span class="sr"><img src="${glyphURL(GL[id])}" alt="">${tn(GL[id])}</span>`;
    return `<button class="card r3" data-i="${i}" style="--d:${i * 70}ms"><div class="rar">${t('rar')[3]}</div><div class="srs">${ic(s.a)}<b>+</b>${ic(s.b)}</div><div class="nm">◆ ${tn(s)}</div><div class="ds">${td(s)}</div><div class="pw">${t('synPickHint')}</div><kbd>${i + 1}</kbd></button>`;
  },
  pickCard(i) {
    if (!this.cardList || !this.cardList[i]) return;
    const g = this.cardList[i]; this.cardList = null; if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    $('cardRow').children[i].classList.add('chosen'); $('cards').classList.add('out');
    this.hideT = setTimeout(() => { $('cards').hidden = true; }, 380);
    this.onPick(g);
  },
  reroll() {
    const free = G.freeRR > 0, cost = 10 + 6 * G.rerolls;
    if ((!free && G.coins < cost) || !this.cardList) { AU.deny(); return; }
    if (free) G.freeRR--; else { G.coins -= cost; G.rerolls++; }
    AU.uiClick();
    this.cards(this.roller(), this.cardTier, this.onPick, $('cardsTitle').textContent, this.roller);
  },

  /* ---------- pause / end / language ---------- */
  pause(on) {
    G.state = on ? 'pause' : 'play'; $('pause').hidden = !on; if (!on && document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (!on) return;
    AU.uiClick(); this.fillPause();
  },
  fillPause() {
    const tab = this.ptab || 'build';
    document.querySelectorAll('.ptabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('pTab').innerHTML = this['tab_' + tab]();
    this.sound(); this.settings();
  },
  schoolCard(id, all) {
    const S0 = SCHOOLS[id], n = G.sc[id] || 0, k = scTier(n);
    const gs = all ? `<div class="gs">${GLYPHS.filter(g => g.sc.includes(id)).map(g => `<img src="${glyphURL(g)}" class="${G.gl[g.id] ? 'own' : ''}" title="${tn(g)}" alt="">`).join('')}</div>` : '';
    return `<div class="psc ${S0.cls}${k ? ' on' : ''}"><b>${scName(id)} ${k ? ROMAN3[k] : ''}<span class="pips">${scPips(n)}</span><span>${n} / ${scNext(n) || SCT[2]}</span></b>${S0.t.map((tx, i) => `<p class="${k > i ? 'lit' : ''}"><i>${ROMAN3[i + 1]} · ${SCT[i]}</i>${tx[LANG === 'zh' ? 1 : 0]}</p>`).join('')}${gs}</div>`;
  },
  synCard(s) { const ic = id => `<img src="${glyphURL(GL[id])}" class="${G.gl[id] ? 'own' : ''}" alt="">${tn(GL[id])}`, rd = !G.syn.has(s.id) && G.gl[s.a] && G.gl[s.b]; return `<div class="sy${G.syn.has(s.id) ? ' on' : rd ? ' rd' : ''}"><b>◆ ${tn(s)}${rd ? ` <em>${t('synReady')}</em>` : ''}</b><span class="rc">${ic(s.a)} + ${ic(s.b)}</span><small>${td(s)}</small></div>`; },
  tab_build() {
    const ids = Object.keys(G.gl), held = P.ws.filter(Boolean);
    const scs = Object.keys(SCHOOLS).filter(id => G.sc[id] > 0);
    const near = SYN.filter(s => !G.syn.has(s.id) && (G.gl[s.a] || G.gl[s.b]));
    return `<h3>${t('schools')}</h3><p class="phelp">${t('schoolHelp')}</p><div class="pscs">${scs.length ? scs.map(id => this.schoolCard(id)).join('') : `<p class="none">—</p>`}</div>
      <h3>${t('yourGlyphs')}</h3><div id="pBuild">${ids.length ? ids.map(id => { const g = GL[id], l = G.gl[id]; return `<div class="row r${g.rar}"><img src="${glyphURL(g)}" alt=""><div><b>${tn(g)} <span>${lvTxt(l)}</span></b> ${g.sc.map(x => `<span class="chip ${SCHOOLS[x].cls}"><b>${scName(x)}</b></span>`).join(' ')}<p>${gdesc(g, l)}</p></div></div>`; }).join('') : `<p class="none">${t('noGlyphs')}</p>`}</div>
      <h3>${t('resonances')}</h3><p class="phelp">${t('synHelp')}</p><div id="pSyn">${SYN.filter(s => G.syn.has(s.id)).concat(near).map(s => this.synCard(s)).join('') || '<p class="none">—</p>'}</div>
      <h3>${t('wsyn')}</h3><p class="phelp">${t('wsynHelp')}</p><div class="wgrid">${held.map(w => this.wRow(w.id)).join('')}</div>`;
  },
  wRow(id) { const W = WEAPONS[id], ws = W.syn, on = P.ws.some(w => w && w.id === id) && G.gl[ws.g]; return `<div class="wrow${on ? ' on' : ''}${metaW(id) ? '' : ' lk'}"><img src="${weaponURL(id)}" alt=""><div><b>${tn(W)} · ${wcls(W)}</b><small>◈ ${clsRule(W)}<br>◆ ${tn(ws)} — ${t('needs')} ${tn(GL[ws.g])}: ${td(ws)}</small></div></div>`; },
  tab_stats() {
    const fmt = (f, v, d) => f === 'pct' ? (d ? `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%` : `×${v.toFixed(2)}`) : f === 'pt' ? `${d && v >= 0 ? '+' : ''}${Math.round(v * 100)}%` : f === 'x' ? (d ? `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%` : `×${v.toFixed(2)}`) : f === 'cd' ? (d ? `${Math.round(v * 100)}%` : `${Math.round((v - 1) * 100)}%`) : `${d && v >= 0 ? '+' : ''}${Math.round(v * 100) / 100}`;
    const name = { dmg: 'stDmg', rate: 'stRate', crit: 'stCrit', critMul: 'stCritMul', multi: 'stMulti', size: 'stSize', spd: 'stSpd', dashCd: 'stDashCd', maxSh: 'stMaxSh', greed: 'stGreed' };
    const w = curW();
    return `<h3>${t('power')}</h3><p class="bigPow">${power()}</p><p class="phelp">${t('powerHelp')}${w ? ` · ${tn(WEAPONS[w.id])} ${'★'.repeat((w.lv || 1) - 1)} ×${wLvMul(w).toFixed(1)}${wsyn(w) ? ' · ◆ ×1.25' : ''}` : ''}</p>
      <h3>${t('tStats')}</h3>${statBreak().map(r => `<div class="stat"><b>${t(name[r.k])}</b><span>${fmt(r.fmt, r.v, false)}</span><small>${r.parts.length ? r.parts.map(p => `<em>${p.name}</em> ${fmt(r.fmt, p.v, true)}`).join(' · ') : t('base')}</small></div>`).join('')}`;
  },
  tab_codex() {
    return `<h3>${t('schools')}</h3><p class="phelp">${t('schoolHelp')}</p><div class="pscs">${Object.keys(SCHOOLS).map(id => this.schoolCard(id, true)).join('')}</div>
      <h3>${t('resonances')} · ${G.syn.size}/${SYN.length}</h3><p class="phelp">${t('synHelp')}</p><div id="pSyn">${SYN.map(s => this.synCard(s)).join('')}</div>
      <h3>${t('cxWeapons')}</h3><p class="phelp">${t('wsynHelp')}</p><div class="wgrid">${Object.keys(WEAPONS).map(id => this.wRow(id)).join('')}</div>`;
  },
  tab_pages() { return `<h3>${t('yourStory')}</h3><div id="pPages">${(G.pages || []).length ? G.pages.map(i => `<p>${lx(STORY.pages[i])}</p>`).join('') : '<p class="none">—</p>'}</div>`; },
  settings() {
    document.querySelectorAll('.langBtn').forEach(b => b.textContent = t('langBtn'));
    const lvl = OPT.shake <= 0 ? 0 : OPT.shake < 0.9 ? 1 : 2;
    document.querySelectorAll('.shakeBtn').forEach(b => b.textContent = t('shakeBtn')[lvl]);
    document.querySelectorAll('.fsBtn').forEach(b => b.textContent = document.fullscreenEnabled ? t('fsBtn')[document.fullscreenElement ? 1 : 0] : t('fsKey')); // inside a frame without the fullscreen permission only F11 works
  },
  end(win, gems) {
    const st = G.stats, m = Math.floor(st.time / 60), s = Math.floor(st.time % 60);
    $('endTitle').textContent = win ? t('win') : t('dead');
    $('endSub').textContent = win ? t('winSub') : `${t('fellOn', floorTxt(G.depth))} — ${lx(pick(STORY.epitaphs))}`;
    $('endGems').innerHTML = t('gemsEnd', gems, M0.gems, gemMul().toFixed(1));
    $('end').classList.toggle('win', win);
    $('endStats').innerHTML = [[t('sRooms'), st.rooms], [t('sKills'), st.kills], [t('sCombo'), st.combo], [t('sDmg'), Math.round(st.dmg)], [t('sTime'), `${m}:${String(s).padStart(2, '0')}`], [t('sGlyphs'), Object.values(G.gl).reduce((a, b) => a + b, 0)], [t('diffT'), tn(G.diff) + (G.diff.heat ? ` · ${t('heat')} ${G.diff.heat}` : '')], [t('power'), power()], [t('gems'), `+${gems} ◆`]]
      .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
    $('endBuild').innerHTML = ['red', 'cyan', 'gold'].map(c => `<i class="fr ${c}${G.frags[c] ? ' on' : ''}"></i>`).join('') + Object.keys(G.gl).map(id => `<img src="${glyphURL(GL[id])}" title="${tn(GL[id])}" alt="">`).join('') + [...G.syn].map(id => `<span>◆ ${tn(SYN.find(x => x.id === id))}</span>`).join('');
    $('end').hidden = false; this.showHUD(false); this.bossBar(null); this.labels([], 0, 0);
  },
  titleSel() {
    const R = OPT.rec; $('rec').textContent = R.runs ? t('rec', R.runs, R.wins.reduce((a, b) => a + b, 0), R.deep >= 0 ? `${(R.deep >> 1) + 1}-${(R.deep & 1) + 1}` : '', R.heat) : '';
  },
  applyLang() {
    document.querySelectorAll('[data-t]').forEach(el => { const v = t(el.dataset.t); if (el.dataset.html !== undefined) el.innerHTML = v; else el.textContent = v; });
    this.settings(); this.sound(); this.titleSel();
    if (G.state !== 'title') { this.all(); if (G.state === 'pause') this.fillPause(); }
  },
};

/* wire static buttons */
$('reroll').onclick = () => UI.reroll();
document.querySelectorAll('.ptabs button').forEach(b => b.onclick = () => { UI.ptab = b.dataset.tab; UI.fillPause(); AU.uiClick(); });
$('map').addEventListener('mousemove', e => { if (!UI.big) return; const r = UI.mapRoom(e.offsetX, e.offsetY); if (r !== UI.hover) { UI.hover = r; UI.mapHint(); if (r) AU.uiHover(); } });
$('map').addEventListener('click', e => { if (UI.big && G.state === 'map') { const r = UI.mapRoom(e.offsetX, e.offsetY); if (r) travelTo(r); } });
$('resumeBtn').onclick = () => UI.pause(false);
$('restartBtn').onclick = () => { $('pause').hidden = true; startRun(); };
$('sndBtn').onclick = () => { AU.toggle(); UI.sound(); };
$('vol').oninput = e => AU.setVol(+e.target.value);
$('againBtn').onclick = () => startRun();
$('menuBtn').onclick = () => toTitle();
$('startBtn').onclick = () => startRun();
document.querySelectorAll('.langBtn').forEach(b => b.onclick = () => { setLang(LANG === 'zh' ? 'en' : 'zh'); AU.uiClick(); });
document.querySelectorAll('.shakeBtn').forEach(b => b.onclick = () => { OPT.shake = OPT.shake <= 0 ? 0.5 : OPT.shake < 0.9 ? 1 : 0; saveOpt(); UI.settings(); AU.uiClick(); if (OPT.shake > 0) { G.shake = 0; shake(0.5); } });
document.querySelectorAll('.fsBtn').forEach(b => b.onclick = () => { if (!document.fullscreenEnabled) { AU.deny(); return; } AU.uiClick(); if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); });
document.addEventListener('fullscreenchange', () => UI.settings());
$('dlg').addEventListener('mousedown', () => { if (G.state === 'talk') M.lp = true; });
document.querySelectorAll('button').forEach(b => b.addEventListener('mouseenter', () => AU.uiHover()));
