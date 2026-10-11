// POST /api/score: validate an end-of-run upload against its ticket, store it, answer with the score and rank
const DMUL = [0.6, 1, 1.4, 1.8]; // easy, normal, hard, nightmare
// keep in sync with LB.score in js/lb.js (the client only previews it; this one counts)
const score = s => Math.round((1000 * (s.depth + 1) + (s.win ? 2000 + Math.max(0, 3600 - s.secs) : 0) + 2 * s.kills) * DMUL[s.diff] * (1 + 0.1 * s.heat));
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const bad = why => Response.json({ error: why }, { status: 400 });

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return bad('json'); }
  const nick = String(b.nick ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 12);
  const s = { depth: b.depth, win: b.win === true, diff: b.diff, heat: b.heat, kills: b.kills, secs: b.secs };
  if (!nick || typeof b.id !== 'string' || !int(s.depth, 0, 7) || !int(s.diff, 0, 3) || !int(s.heat, 0, 7) || !int(s.kills, 0, 500 * (s.depth + 1)) || !int(s.secs, 0, 43200)) return bad('fields'); // a level holds at most ~290 foes even on nightmare
  if (s.win && s.depth !== 7) return bad('fields');
  if (s.secs < 45 * s.depth || s.kills > 3 * s.secs + 50) return bad('pace'); // nobody clears a level in under 45 s or kills 3 foes a second for a whole run
  const run = await env.DB.prepare('UPDATE runs SET used = 1 WHERE id = ? AND used = 0 RETURNING t0').bind(b.id).first();
  if (!run) return bad('ticket');
  const age = (Date.now() - run.t0) / 1000;
  if (age > 43200) return bad('ticket'); // tickets last 12 h, so none can be banked for later
  if (s.secs > age + 5) return bad('clock'); // in-game time cannot outrun the real time since the ticket
  const sc = score(s), at = Date.now();
  await env.DB.prepare('INSERT INTO scores (nick, score, depth, win, diff, heat, kills, secs, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(nick, sc, s.depth, s.win ? 1 : 0, s.diff, s.heat, s.kills, s.secs, at).run();
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE score > ? OR (score = ? AND at < ?)').bind(sc, sc, at).first(); // same order as the board: ties go to the earlier run
  return Response.json({ score: sc, rank: n + 1 });
}
