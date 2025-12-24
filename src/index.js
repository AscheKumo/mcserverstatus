export default {
  async fetch(request) {
    const url = new URL(request.url);

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (url.pathname !== "/status") {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
    }

    const host = url.searchParams.get("host");
    const port = Number(url.searchParams.get("port") || "25565");
    if (!host) {
      return new Response(JSON.stringify({ online: false, error: "Missing host" }), { status: 400, headers });
    }

    // Public checker that understands the Java status protocol
    const api = `https://api.mcsrvstat.us/2/${encodeURIComponent(host)}:${port}`;

    try {
      const r = await fetch(api, { cf: { cacheTtl: 0, cacheEverything: false } });
      const d = await r.json();

      return new Response(JSON.stringify({
        online: !!d.online,
        version: d.version ? { name: d.version } : null,
        players: d.players ? { online: d.players.online ?? null, max: d.players.max ?? null } : null,
        motd: d.motd?.clean?.join("\n") ?? null
      }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ online: false, error: String(e) }), { status: 502, headers });
    }
  }
};
