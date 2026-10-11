// GET /api/top: the 50 best runs, ties to the earlier one
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT nick, score, depth, win, diff, heat, secs FROM scores ORDER BY score DESC, at ASC LIMIT 50').all();
  return Response.json(results);
}
