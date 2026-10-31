const enc = new TextEncoder();

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return json({ error: "后台还没配置 ADMIN_PASSWORD" }, 500);
  let password = "";
  try {
    ({ password } = await request.json());
  } catch (e) {
    return json({ error: "请求格式不对" }, 400);
  }
  if (!password || password !== env.ADMIN_PASSWORD) return json({ error: "密码不对" }, 401);

  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const sig = await hmac(env.SESSION_SECRET || env.ADMIN_PASSWORD, String(exp));
  return json({ ok: true }, 200, {
    "Set-Cookie": `admin=${exp}.${sig}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`,
  });
}
