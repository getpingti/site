const enc = new TextEncoder();
const REPO_FILE = "data/site.json";

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function cookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return "";
}

async function authed(request, env) {
  const token = cookie(request, "admin");
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = await hmac(env.SESSION_SECRET || env.ADMIN_PASSWORD, exp);
  return sig === expected;
}

function ghHeaders(env) {
  return {
    Authorization: `Bearer ${env.GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "pingti-admin",
    "Content-Type": "application/json",
  };
}

function decodeBase64(content) {
  const bin = atob((content || "").replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(text) {
  const bytes = enc.encode(text);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

async function readFile(env) {
  const url = `https://api.github.com/repos/${env.GH_REPO}/contents/${REPO_FILE}?ref=main`;
  const res = await fetch(url, { headers: ghHeaders(env) });
  if (!res.ok) throw new Error(`读取失败：${res.status}`);
  return res.json();
}

const FIELDS = [
  "title", "description", "hero_line1", "hero_line2",
  "hero_note", "list_heading", "list_note", "footer_note",
];

export async function onRequestGet({ request, env }) {
  if (!(await authed(request, env))) return json({ error: "未登录" }, 401);
  if (!env.GH_TOKEN || !env.GH_REPO) return json({ error: "缺少 GH_TOKEN / GH_REPO" }, 500);
  try {
    const file = await readFile(env);
    return json({ site: JSON.parse(decodeBase64(file.content)) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  if (!(await authed(request, env))) return json({ error: "未登录" }, 401);
  if (!env.GH_TOKEN || !env.GH_REPO) return json({ error: "缺少 GH_TOKEN / GH_REPO" }, 500);

  let site;
  try {
    ({ site } = await request.json());
  } catch (e) {
    return json({ error: "请求格式不对" }, 400);
  }
  if (!site || typeof site !== "object") return json({ error: "内容为空" }, 400);

  const clean = {};
  for (const key of FIELDS) {
    if (typeof site[key] === "string") clean[key] = site[key].trim();
  }
  if (!clean.hero_line1 || !clean.hero_line2) return json({ error: "主标题两行都要填" }, 400);

  try {
    const file = await readFile(env);
    const body = {
      message: `后台更新首页 ${new Date().toISOString().slice(0, 10)}`,
      content: encodeBase64(JSON.stringify(clean, null, 2) + "\n"),
      sha: file.sha,
      branch: "main",
    };
    const res = await fetch(`https://api.github.com/repos/${env.GH_REPO}/contents/${REPO_FILE}`, {
      method: "PUT",
      headers: ghHeaders(env),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `写入失败：${res.status} ${detail.slice(0, 160)}` }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
