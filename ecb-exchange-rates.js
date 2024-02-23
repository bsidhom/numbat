/**
 * @typedef {Object} Env
 */

const ALLOWED_ORIGINS = [
  "https://bsidhom.github.io",
  "https://dash.cloudflare.com",
  "https://numbat.dev",
  "https://workers-playground-broken-wave-5333.bsidhom.workers.dev",
];

const NOT_FOUND = new Response(null, { status: 404, statusText: "not found" });

const isLocalhost = (origin) => {
  let url;
  try {
    url = new URL(origin);
  } catch (error) {
    console.warn("received invalid origin:", origin);
    return false;
  }
  return url.hostname == "localhost";
};

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    if (!request.url) {
      return NOT_FOUND;
    }
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    if (!origin) {
      return NOT_FOUND;
    }
    const now = new Date().toISOString();
    console.log(`${now} request from ${origin}`);
    if (
      url.pathname === "/numbat/ecb-exchange-rates" &&
      url.search == "" &&
      (ALLOWED_ORIGINS.includes(origin) || isLocalhost(origin))
    ) {
      console.log(`${now} origin allowed: ${origin}`);
      // NOTE: We allow _all_ ports at localhost.
      // NOTE: It looks like Cloudflare respects Cache-Control policies and
      // automatically caches fetch responses, so we don't need to do this
      // explicitly. The ECB currently sets TTL to 5 minutes.
      const response = await self.fetch(
        "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
      );
      return new Response(response.body, {
        headers: {
          "content-type": "application/xml",
          "access-control-allow-origin": origin,
        },
      });
    }
    console.log(`${now} origin not allowed: ${origin}`);
    return NOT_FOUND;
  },
};
