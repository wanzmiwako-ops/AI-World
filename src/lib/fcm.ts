import "server-only";
import { createSign } from "node:crypto";

/**
 * Kirim notifikasi ke aplikasi Android (Firebase Cloud Messaging, API HTTP v1).
 * Kunci: env FIREBASE_SERVICE_ACCOUNT = isi file JSON service account (boleh juga base64-nya).
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function loadAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const acc = JSON.parse(json) as ServiceAccount;
    if (!acc.project_id || !acc.client_email || !acc.private_key) return null;
    return { ...acc, private_key: acc.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

const account = loadAccount();
export const isFcmConfigured = Boolean(account);

let cached: { token: string; exp: number } | null = null;

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

async function accessToken(acc: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: acc.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(acc.private_key))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`FCM auth ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, exp: now + data.expires_in };
  return data.access_token;
}

export type NativeTarget = { token: string; platform: string };
export type NativeMessage = { title: string; body: string; url: string; tag?: string; badge?: number; channel?: "pesan" | "kabar" };

/** Mengembalikan token yang sudah tidak berlaku (aplikasi dihapus) supaya dibersihkan. */
export async function sendFcm(targets: NativeTarget[], msg: NativeMessage): Promise<string[]> {
  if (!account || !targets.length) return [];
  const token = await accessToken(account);
  const dead: string[] = [];
  const channel = msg.channel ?? "kabar";
  await Promise.all(
    targets.map(async (t) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          message: {
            token: t.token,
            notification: { title: msg.title, body: msg.body },
            data: { url: msg.url, tag: msg.tag ?? "" },
            android: {
              priority: "high",
              ttl: "86400s",
              notification: {
                channel_id: channel,
                sound: channel === "pesan" ? "meow" : "default",
                tag: msg.tag,
                icon: "ic_stat_notify",
                color: "#0A6EBD",
                notification_count: msg.badge,
                default_vibrate_timings: true,
              },
            },
            apns: { payload: { aps: { sound: channel === "pesan" ? "meow.caf" : "default", badge: msg.badge, "thread-id": msg.tag } } },
          },
        }),
      }).catch(() => null);
      if (!res) return;
      if (res.status === 404 || res.status === 400) {
        const err = (await res.json().catch(() => null)) as { error?: { details?: { errorCode?: string }[]; status?: string } } | null;
        const code = err?.error?.details?.find((d) => d.errorCode)?.errorCode ?? err?.error?.status;
        // Hanya token yang benar-benar mati yang dihapus (bukan karena isi pesan salah)
        if (code === "UNREGISTERED" || (res.status === 404 && code === "NOT_FOUND")) dead.push(t.token);
      }
    }),
  );
  return dead;
}
