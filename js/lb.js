'use strict';
/* GRISAILLE · lb — online leaderboard (Cloudflare Pages Functions + D1, see functions/api): a one-use ticket per run, an upload at the end, the top 50 from the title */
const LB = {
  run: null,   // this run's ticket; stays null where the server is out of reach (the claude.ai copy, a local file)
  // keep in sync with score() in functions/api/score.js: the server recomputes it, this is only the end-screen preview
  score: s => Math.round((1000 * (s.depth + 1) + (s.win ? 2000 + Math.max(0, 3600 - s.secs) : 0) + 2 * s.kills) * [0.6, 1, 1.4, 1.8][s.diff] * (1 + 0.1 * s.heat)),
  esc: s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`),
  ticket() {
    LB.run = null;
    fetch('/api/run', { method: 'POST' }).then(r => r.ok ? r.json() : null).then(j => { if (j && j.id) LB.run = j.id; }).catch(() => {});
  },
  end(win) {
    const s = LB.last = { depth: G.depth, win: !!win, diff: OPT.diff, heat: G.diff.heat, kills: G.stats.kills, secs: Math.floor(G.stats.time) };
    $('lbScoreN').textContent = LB.score(s).toLocaleString();
    $('lbNick').value = OPT.nick || ''; $('lbNick').placeholder = t('lbNick');
    $('lbSend').disabled = $('lbNick').disabled = !LB.run;
    LB.msg(LB.run ? '' : t('lbOffline'), '');
  },
  msg(tx, cls) { const el = $('lbMsg'); el.textContent = tx; el.className = cls; },
  send() {
    const nick = $('lbNick').value.trim(), id = LB.run;
    if (!id) return;
    if (!nick) { LB.msg(t('lbNoNick'), 'no'); $('lbNick').focus(); return; }
    OPT.nick = nick; saveOpt(); AU.uiClick();
    LB.run = null; $('lbSend').disabled = $('lbNick').disabled = true; LB.msg(t('lbSending'), '');
    fetch('/api/score', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ id, nick }, LB.last)) })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => { $('lbScoreN').textContent = j.score.toLocaleString(); LB.msg(t('lbSent', j.rank), 'ok'); })
      .catch(st => { // a 400 is final (the server may already have spent the ticket); anything else can be retried
        if (st !== 400) { LB.run = id; $('lbSend').disabled = $('lbNick').disabled = false; }
        LB.msg(t(st === 400 ? 'lbBad' : 'lbFail'), 'no');
      });
  },
  open() {
    $('lb').hidden = false; AU.uiClick();
    const body = $('lbBody'), mmss = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
    body.innerHTML = `<p class="none">${t('lbLoad')}</p>`;
    fetch('/api/top').then(r => r.ok ? r.json() : Promise.reject(r.status)).then(rows => {
      body.innerHTML = !rows.length ? `<p class="none">${t('lbEmpty')}</p>` : `<table><tr>${t('lbCols').map(c => `<th>${c}</th>`).join('')}</tr>${rows.map((r, i) =>
        `<tr><td>${i + 1}</td><td>${LB.esc(r.nick)}</td><td><b>${r.score.toLocaleString()}</b></td><td${r.win ? ' class="w"' : ''}>${r.win ? t('lbWin') : `${(r.depth >> 1) + 1}-${(r.depth & 1) + 1}`}</td><td>${tn(DIFFS[r.diff])}${r.heat ? ` · ${t('heat')} ${r.heat}` : ''}</td><td>${mmss(r.secs)}</td></tr>`).join('')}</table>`;
    }).catch(() => { body.innerHTML = `<p class="none">${t('lbErr')}</p>`; });
  },
  close() { $('lb').hidden = true; AU.uiClick(); },
};
$('lbBtn').onclick = () => LB.open();
$('lbClose').onclick = () => LB.close();
$('lbSend').onclick = () => LB.send();
$('lbNick').addEventListener('keydown', e => { if (e.key === 'Enter') LB.send(); });
