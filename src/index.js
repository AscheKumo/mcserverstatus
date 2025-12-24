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
      return new Response(JSON.stringify({ online: false, error: "Not found" }), { status: 404, headers });
    }

    const host = url.searchParams.get("host");
    const port = url.searchParams.get("port"); // optional
    if (!host) {
      return new Response(JSON.stringify({ online: false, error: "Missing host" }), { status: 400, headers });
    }

    // v3 endpoint: /3/<address> (port optional; SRV supported)
    const address = port ? `${host}:${port}` : host;
    const api = `https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`;

    try {
      const r = await fetch(api, {
        headers: {
          // REQUIRED by mcsrvstat.us:
          "User-Agent": "mcserverstatus.ashlynrhal.workers.dev (Cloudflare Worker) - Minecraft status checker",
          "Accept": "application/json",
        },
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      const text = await r.text();

      if (!r.ok) {
        // Return upstream error details to help debugging
        return new Response(JSON.stringify({
          online: false,
          error: `Upstream mcsrvstat.us error: HTTP ${r.status}`,
          upstream_body: text.slice(0, 300)
        }), { status: 502, headers });
      }

      const d = JSON.parse(text);

      // Normalize output for your HTML
      const motdClean = Array.isArray(d?.motd?.clean) ? d.motd.clean.join("\n") : null;

      return new Response(JSON.stringify({
        online: !!d.online,
        version: d.protocol?.name ? { name: d.protocol.name } : (d.version ? { name: d.version } : null),
        players: d.players ? { online: d.players.online ?? null, max: d.players.max ?? null } : null,
        motd: motdClean,
        raw: d
      }), { headers });

    } catch (e) {
      return new Response(JSON.stringify({ online: false, error: String(e) }), { status: 502, headers });
    }
  }
};
