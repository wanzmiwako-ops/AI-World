"use client";

import { useEffect, useState, useTransition } from "react";
import { deletePushSubscription, savePushSubscription, sendTestPush } from "@/app/(app)/akun/actions";
import { removeNativeToken, saveNativeToken } from "@/app/(app)/live-actions";
import { enableNativePush, isNativeApp, nativePushState } from "@/lib/native";
import { attempt } from "@/lib/offline";
import { unstable_rethrow } from "next/navigation";
import { Icon } from "@/components/icon";
import { FormMessage } from "@/components/ui";
import { haptic, isHapticOn, isSoundOn, play, setHapticOn, setSoundOn } from "@/lib/feel";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export type PushSupport = "ok" | "unsupported" | "ios-install" | "no-key";

export function detectPushSupport(): PushSupport {
  if (!VAPID) return "no-key";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
  if (isIOS && !standalone) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "ok";
}

/** Aktifkan notifikasi push di perangkat ini. Harus dipanggil dari ketukan tombol. */
export async function enablePush(): Promise<{ ok?: boolean; error?: string }> {
  const support = detectPushSupport();
  if (support === "no-key") return { error: "Kunci VAPID belum diisi (lihat README)." };
  if (support === "ios-install") return { error: "Di iPhone, tambahkan aplikasi ke Home Screen dulu, lalu buka dari ikonnya." };
  if (support === "unsupported") return { error: "Browser ini belum mendukung notifikasi." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { error: "Izin notifikasi ditolak. Aktifkan lewat pengaturan browser/HP." };
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }));
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) }));
  const res = await savePushSubscription(JSON.parse(JSON.stringify(sub)));
  return res.error ? { error: res.error } : { ok: true };
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-14 items-center gap-3 text-left">
      <span className="flex flex-1 flex-col">
        <span className="font-bold">{label}</span>
        <span className="text-[13px] text-muted">{hint}</span>
      </span>
      <span className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${on ? "bg-ocean" : "bg-[#C9D6E2]"}`}>
        <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[24px]" : "translate-x-1"}`} />
      </span>
    </button>
  );
}

export function NotificationSettings() {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [native, setNative] = useState(false);
  const [android, setAndroid] = useState(false);
  const [sound, setSound] = useState(true);
  const [vibrate, setVibrate] = useState(true);
  const [status, setStatus] = useState<{ error?: string; message?: string }>();
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    (async () => {
      // Nilai ini hanya ada di browser, jadi dibaca setelah tampil
      await Promise.resolve();
      if (isNativeApp()) {
        const st = await nativePushState();
        if (!alive) return;
        setNative(true);
        setSupport("ok");
        setSound(isSoundOn());
        setVibrate(isHapticOn());
        setSubscribed(st === "granted");
        return;
      }
      const s = detectPushSupport();
      setAndroid(/Android/i.test(navigator.userAgent));
      let sub = false;
      if (s === "ok") {
        const reg = await navigator.serviceWorker.getRegistration();
        sub = Boolean(await reg?.pushManager.getSubscription()) && Notification.permission === "granted";
      }
      if (!alive) return;
      setSupport(s);
      setSound(isSoundOn());
      setVibrate(isHapticOn());
      setSubscribed(sub);
    })();
    return () => {
      alive = false;
    };
  }, []);

  function togglePush(on: boolean) {
    setStatus(undefined);
    start(async () => {
      try {
      if (native) {
        if (on) {
          const res = await enableNativePush(saveNativeToken);
          if (res.error) return setStatus({ error: res.error });
          setSubscribed(true);
          setStatus({ message: "Notifikasi aplikasi aktif. Suara pesan: meong 🐱" });
        } else {
          const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
          const { token } = await FirebaseMessaging.getToken().catch(() => ({ token: "" }));
          if (token) await removeNativeToken(token);
          await FirebaseMessaging.deleteToken().catch(() => {});
          setSubscribed(false);
        }
        return;
      }
      if (on) {
        const res = await enablePush();
        if (res.error) return setStatus({ error: res.error });
        setSubscribed(true);
        setStatus({ message: "Notifikasi aktif di perangkat ini." });
      } else {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await deletePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setSubscribed(false);
      }
      } catch (e) {
        unstable_rethrow(e);
        setStatus({ error: "Gagal mengubah notifikasi. Cek internet & izin notifikasi, lalu coba lagi." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      {!native && android && APK_URL && (
        <a href={APK_URL} className="mb-2 flex items-center gap-3 rounded-2xl bg-tint px-4 py-3 text-sm">
          <span className="text-2xl" aria-hidden="true">🤖</span>
          <span className="flex flex-1 flex-col">
            <b>Pasang aplikasi Android A&amp;I WORLD</b>
            <span className="text-muted">Notifikasi lebih andal dan bunyi meong saat ada pesan</span>
          </span>
          <Icon name="next" size={18} />
        </a>
      )}
      {support === "ios-install" && (
        <p className="mb-2 rounded-2xl bg-sand-soft px-4 py-3 text-sm text-sand-ink">
          <b>Pengguna iPhone:</b> buka di Safari → tombol Share → <b>Add to Home Screen</b>. Lalu buka A&amp;I WORLD dari ikon di Home Screen untuk mengaktifkan notifikasi.
        </p>
      )}
      {support === "no-key" && (
        <p className="mb-2 rounded-2xl bg-sand-soft px-4 py-3 text-sm text-sand-ink">
          Notifikasi push belum disiapkan di server (kunci VAPID). Lihat README bagian Notifikasi.
        </p>
      )}
      <Toggle
        on={subscribed}
        onChange={togglePush}
        label={native ? "Notifikasi aplikasi" : "Notifikasi push"}
        hint={pending ? "Sebentar…" : "Pesan, check-in, dan kangen dari pasangan, walau aplikasi ditutup"}
      />
      <Toggle
        on={sound}
        onChange={(v) => {
          setSound(v);
          setSoundOn(v);
          if (v) play("ding");
        }}
        label="Suara"
        hint="Bunyi kecil saat kirim, terima pesan, dan colek kucing"
      />
      <Toggle
        on={vibrate}
        onChange={(v) => {
          setVibrate(v);
          setHapticOn(v);
          if (v) haptic(20);
        }}
        label="Getar"
        hint="Getaran halus saat menekan tombol (Android)"
      />
      {subscribed && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => setStatus(await attempt(() => sendTestPush())))}
          className="chip mt-2 self-start"
        >
          <Icon name="send" size={16} className="mr-1.5" /> Kirim notifikasi uji
        </button>
      )}
      {native && subscribed && (
        <p className="mt-2 text-[13px] text-muted">Suara, getar, dan tampilan notifikasi bisa diatur di Pengaturan HP → Aplikasi → A&amp;I WORLD → Notifikasi.</p>
      )}
      <div className="mt-2">
        <FormMessage state={status?.error ? status : status?.message ? status : (status as { ok?: boolean })?.ok ? { message: "Terkirim! Cek notifikasi di HP-mu." } : undefined} />
      </div>
    </div>
  );
}
