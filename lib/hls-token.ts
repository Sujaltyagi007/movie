import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const IV_BYTES = 12;
const TAG_BYTES = 16;

declare global {
  var __hlsSealSecret: string | undefined;
}

function getSealKey(): Buffer {
  const envSecret =
    process.env.HLS_PROXY_SECRET?.trim() ||
    process.env.TMDB_READ_ACCESS?.trim() ||
    process.env.TMDB_API_KEY?.trim();
  const secret =
    envSecret ||
    globalThis.__hlsSealSecret ||
    (globalThis.__hlsSealSecret = randomBytes(32).toString("hex"));
  return createHash("sha256").update(secret).digest();
}

export function sealHlsTarget(rawUrl: string, ctx?: string): string {
  const payload = JSON.stringify(ctx ? [rawUrl, ctx] : [rawUrl]);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getSealKey(), iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const token = Buffer.concat([iv, tag, encrypted]).toString("base64url");
  return `/api/hls?u=${token}`;
}

export function unsealHlsTarget(token: string): { url: string; ctx?: string } | null {
  if (!token || token.length > 4096) return null;
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.byteLength <= IV_BYTES + TAG_BYTES) return null;
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);

    const decipher = createDecipheriv("aes-256-gcm", getSealKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plain) as unknown;
    if (!Array.isArray(parsed) || typeof parsed[0] !== "string" || !parsed[0]) return null;
    const ctx = typeof parsed[1] === "string" && parsed[1] ? parsed[1] : undefined;
    return { url: parsed[0], ...(ctx ? { ctx } : {}) };
  } catch {
    return null;
  }
}
