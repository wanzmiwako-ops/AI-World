import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isFcmConfigured, sendFcm, type NativeTarget } from "./fcm";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

const isWebPushConfigured = Boolean(PUBLIC_KEY && PRIVATE_KEY);
export const isPushConfigured = isWebPushConfigured || isFcmConfigured;
if (isWebPushConfigured) webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  /** Notifikasi dengan tag sama saling menimpa (misal semua chat jadi satu). */
  tag?: string;
  /** Tetap kirim walau pasangan sedang membuka aplikasi. */
  force?: boolean;
};

type Targets = {
  active: boolean;
  unread: number;
  subs: { endpoint: string; p256dh: string; auth: string }[];
  native?: NativeTarget[];
};

/** Pesan & kangen pakai saluran bersuara meong; kabar lain pakai suara biasa. */
function channelFor(tag?: string) {
  return tag === "chat" || tag === "nudge" || tag === "test" ? "pesan_kucing" : "kabar";
}

async function deliverNative(supabase: SupabaseClient, targets: NativeTarget[], payload: PushPayload, badge?: number) {
  if (!isFcmConfigured || !targets.length) return;
  const dead = await sendFcm(targets, { ...payload, badge, channel: channelFor(payload.tag) }).catch(() => []);
  await Promise.all(dead.map((token) => supabase.rpc("remove_native_token", { p_token: token })));
}

async function deliver(supabase: SupabaseClient, subs: Targets["subs"], payload: Record<string, unknown>) {
  if (!isWebPushConfigured || !subs.length) return;
  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 60 * 60 * 24,
          urgency: "high",
        });
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        // 404/410: langganan sudah tidak berlaku (aplikasi dihapus / izin dicabut)
        if (code === 404 || code === 410) await supabase.rpc("remove_push_target", { p_endpoint: s.endpoint });
      }
    }),
  );
}

/**
 * Kirim notifikasi ke HP/laptop pasangan.
 * Dilewati kalau pasangan sedang membuka aplikasi (dia sudah dapat notifikasi di dalam aplikasi).
 */
export async function notifyPartner(supabase: SupabaseClient, payload: PushPayload) {
  if (!isPushConfigured) return;
  const { data } = await supabase.rpc("push_targets");
  const targets = data as Targets | null;
  if (!targets || (!targets.subs?.length && !targets.native?.length)) return;
  if (targets.active && !payload.force) return;
  await Promise.all([
    deliver(supabase, targets.subs ?? [], { ...payload, badge: targets.unread }),
    deliverNative(supabase, targets.native ?? [], payload, targets.unread),
  ]);
}

/** Kirim notifikasi uji ke perangkat milik sendiri. */
export async function notifySelf(supabase: SupabaseClient, payload: PushPayload) {
  if (!isPushConfigured) return { error: "Notifikasi belum disiapkan di server (lihat README bagian Notifikasi)." };
  const [{ data }, { data: native }] = await Promise.all([
    supabase.from("push_subscriptions").select("endpoint, p256dh, auth"),
    supabase.rpc("my_native_tokens"),
  ]);
  const tokens = (native ?? []) as NativeTarget[];
  if (!data?.length && !tokens.length) return { error: "Perangkat ini belum mengaktifkan notifikasi." };
  if (tokens.length && !isFcmConfigured) return { error: "Kunci Firebase (FIREBASE_SERVICE_ACCOUNT) belum diisi di Vercel." };
  await Promise.all([deliver(supabase, data ?? [], payload), deliverNative(supabase, tokens, payload)]);
  return { ok: true };
}

export function messagePreview(kind: string, body: string | null) {
  if (kind === "photo") return "Mengirim foto";
  if (kind === "heart") return "Mengirim hati ❤";
  if (kind === "sticker") return "Mengirim stiker kucing";
  if (kind === "voice") return "🎤 Mengirim voice note";
  const text = (body ?? "").trim();
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}
