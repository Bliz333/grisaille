// POST /api/run: a one-use ticket issued when a run starts; the score upload must bring it back
export async function onRequestPost({ env }) {
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO runs (id, t0) VALUES (?, ?)').bind(id, Date.now()).run();
  return Response.json({ id });
}
