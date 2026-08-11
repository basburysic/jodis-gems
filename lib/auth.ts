import crypto from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const SESSION_COOKIE = "jodis_gems_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Reads secrets directly off the Cloudflare binding, the same proven-reliable
// path used for D1 (lib/db.ts) — not process.env, which OpenNext is supposed
// to populate from these same bindings but wasn't reliably doing so for these
// two keys in production.
async function getSecret(name: "ADMIN_PASSWORD" | "SESSION_SECRET"): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  const value = env[name];
  if (!value) throw new Error(`${name} is not set (Cloudflare dashboard → Settings → Variables and Secrets)`);
  return value;
}

async function sign(payload: string): Promise<string> {
  const secret = await getSecret("SESSION_SECRET");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function createSessionToken(): Promise<string> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = String(expires);
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await sign(payload);
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return false;
  return Number(payload) > Date.now();
}

export async function checkPassword(password: string): Promise<boolean> {
  const expected = await getSecret("ADMIN_PASSWORD");
  return password === expected;
}
