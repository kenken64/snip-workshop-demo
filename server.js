import { relative, resolve, sep } from "node:path";
import { stat } from "node:fs/promises";

const port = Number(process.env.PORT || 3000);
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const baseUrl = (
  process.env.BASE_URL ||
  (railwayDomain ? `https://${railwayDomain}` : `http://localhost:${port}`)
).replace(/\/+$/, "");
const publicDir = process.env.PUBLIC_DIR ? resolve(process.env.PUBLIC_DIR) : null;
const links = new Map();
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function makeCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function createUniqueCode() {
  let code;
  do {
    code = makeCode();
  } while (links.has(code));
  return code;
}

async function serveStatic(pathname, method) {
  if (!publicDir || (method !== "GET" && method !== "HEAD")) {
    return null;
  }

  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname === "/" ? "index.html" : pathname.slice(1));
  } catch {
    return null;
  }

  const filePath = resolve(publicDir, relativePath);
  const pathFromRoot = relative(publicDir, filePath);
  if (pathFromRoot.startsWith("..") || pathFromRoot.split(sep).includes("..")) {
    return null;
  }

  try {
    if (!(await stat(filePath)).isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  return new Response(method === "HEAD" ? null : Bun.file(filePath), {
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-cache",
    },
  });
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const requestUrl = new URL(request.url);
    const { pathname } = requestUrl;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === "POST" && pathname === "/api/links") {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      if (!payload || typeof payload.url !== "string") {
        return json({ error: "A URL is required" }, 400);
      }

      let originalUrl;
      try {
        originalUrl = new URL(payload.url);
      } catch {
        return json({ error: "URL must use http or https" }, 400);
      }

      if (originalUrl.protocol !== "http:" && originalUrl.protocol !== "https:") {
        return json({ error: "URL must use http or https" }, 400);
      }

      const link = {
        code: createUniqueCode(),
        url: payload.url,
        shortUrl: "",
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      link.shortUrl = `${baseUrl}/${link.code}`;
      links.set(link.code, link);

      return json(link, 201);
    }

    if (request.method === "GET" && pathname === "/api/links") {
      return json([...links.values()]);
    }

    const staticResponse = await serveStatic(pathname, request.method);
    if (staticResponse) {
      return staticResponse;
    }

    if (request.method === "GET" && /^\/[^/]+$/.test(pathname)) {
      const code = decodeURIComponent(pathname.slice(1));
      const link = links.get(code);
      if (!link) {
        return json({ error: "Link not found" }, 404);
      }

      link.hits += 1;
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: link.url,
        },
      });
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`Snip listening on ${server.url}`);
