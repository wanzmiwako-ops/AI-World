"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { heartbeat, markAway, saveNativeToken } from "@/app/(app)/live-actions";
import { isNativeApp, nativeStatusBar, startNative } from "@/lib/native";
import { channels, emitLive, pushToast, setLive, useLive, type Person } from "@/lib/live";
import { haptic, play, primeAudio } from "@/lib/feel";
import { createClient } from "@/lib/supabase/client";
import { applyTheme, isThemeId, themeInfo } from "@/lib/themes";
import { gameName } from "@/lib/games/catalog";
import { Toaster } from "./toaster";
import { NudgeOverlay } from "./nudge-overlay";

const MOOD = ["", "jauh", "biasa", "baik", "dekat", "lengket banget"];

function preview(kind: string, body: unknown) {
  if (kind === "photo") return "Mengirim foto";
  if (kind === "heart") return "Mengirim hati ❤";
  if (kind === "sticker") return "Mengirim stiker kucing";
  const t = String(body ?? "");
  return t.length > 90 ? `${t.slice(0, 87)}…` : t;
}

/**
 * Satu-satunya koneksi realtime aplikasi. Dipasang sekali di layout,
 * lalu membagikan kejadian ke halaman mana pun lewat lib/live.
 */
export function LiveBridge({
  coupleId,
  me,
  partner,
  initialUnread,
  pinEnabled,
  theme,
  since,
}: {
  coupleId: string;
  me: Person;
  partner: Person | null;
  initialUnread: number;
  pinEnabled: boolean;
  theme: string;
  since: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const unread = useLive((s) => s.unread);
  const photoBatch = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null }>({ count: 0, timer: null });
  // Nama & foto pasangan disimpan di ref: kalau berubah, koneksi realtime tidak perlu disambung ulang
  const partnerId = partner?.id ?? null;
  const partnerRef = useRef(partner);
  useEffect(() => {
    partnerRef.current = partner;
  });

  useEffect(() => {
    setLive({ ready: true, coupleId, me, partner, unread: initialUnread, since });
  }, [coupleId, me, partner, initialUnread, since]);

  // Tema dunia dari database (berlaku untuk berdua)
  useEffect(() => {
    const t = isThemeId(theme) ? theme : "ocean";
    setLive({ theme: t });
    applyTheme(t);
  }, [theme]);

  // Di dalam aplikasi Android: notifikasi Firebase, tombol kembali, ikon bar status
  useEffect(() => {
    void nativeStatusBar(false);
  }, []);
  useEffect(() => {
    void startNative({
      navigate: (url) => router.push(url),
      saveToken: (token, platform) => saveNativeToken(token, platform),
      away: () => void markAway().catch(() => {}),
      back: () => router.back(),
    });
  }, [router]);

  // Suara di HP baru boleh berbunyi setelah layar disentuh sekali
  useEffect(() => {
    const prime = () => primeAudio();
    window.addEventListener("pointerdown", prime, { once: true });
    return () => window.removeEventListener("pointerdown", prime);
  }, []);

  // Service worker untuk notifikasi push
  useEffect(() => {
    if ("serviceWorker" in navigator && !isNativeApp()) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);

  // Angka di ikon aplikasi (Home Screen)
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (unread > 0) nav.setAppBadge?.(unread).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [unread]);

  // Halaman sekarang: dikirim ke pasangan ("lagi buka Galeri"), dan reset badge chat
  useEffect(() => {
    pathRef.current = pathname;
    if (pathname.startsWith("/chat")) setLive({ unread: 0 });
    void channels.events?.track({ page: pathname, at: Date.now() });
  }, [pathname]);

  // Koneksi realtime
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let chat: RealtimeChannel | null = null;
    let events: RealtimeChannel | null = null;
    const pname = () => partnerRef.current?.name ?? "Pasangan";
    function toastFromPartner(title: string, body: string | undefined, href: string, tone: "ocean" | "pink" | "sand" | "aqua" = "ocean") {
      pushToast({ title, body, href, tone, avatar: partnerRef.current?.avatar ?? null, cat: "boba" });
      play("ding");
      haptic([30, 40, 30]);
    }

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;

      chat = supabase.channel(`couple:${coupleId}:chat`, { config: { private: true } });
      chat
        .on("broadcast", { event: "message" }, ({ payload }: { payload: Record<string, unknown> }) => {
          emitLive("message", payload);
          if (payload.sender_id === me.id) return;
          if (pathRef.current.startsWith("/chat") && document.visibilityState === "visible") return;
          setLive((s) => ({ unread: s.unread + 1 }));
          toastFromPartner(pname(), preview(String(payload.kind), payload.body), "/chat");
        })
        .on("broadcast", { event: "message_update" }, ({ payload }: { payload: Record<string, unknown> }) => emitLive("message_update", payload))
        .on("broadcast", { event: "typing" }, ({ payload }: { payload: Record<string, unknown> }) => emitLive("typing", payload))
        .subscribe();

      events = supabase.channel(`couple:${coupleId}:events`, { config: { private: true, presence: { key: me.id } } });
      events
        .on("broadcast", { event: "checkin" }, ({ payload }: { payload: Record<string, unknown> }) => {
          emitLive("checkin", payload);
          if (payload.table === "checkin_participants" && payload.by && payload.by !== me.id && !pathRef.current.startsWith("/ketemu")) {
            toastFromPartner(`${pname()} sudah check-in!`, "Lagi bareng? Ketuk untuk check-in juga.", "/ketemu", "aqua");
          }
        })
        .on("broadcast", { event: "activity" }, ({ payload }: { payload: Record<string, unknown> }) => {
          emitLive("activity", payload);
          if (payload.kind === "theme" && isThemeId(payload.theme)) {
            setLive({ theme: payload.theme });
            applyTheme(payload.theme);
          }
          if (payload.by === me.id) return;
          switch (payload.kind) {
            case "meeting":
              toastFromPartner(`${pname()} menambahkan jadwal`, String(payload.title ?? ""), "/kalender", "aqua");
              break;
            case "issue":
              toastFromPartner(`${pname()} ingin ngobrol`, String(payload.title ?? ""), "/ruang-bicara", "sand");
              break;
            case "issue_resolved":
              toastFromPartner("Kalian sudah sepakat ✨", String(payload.agreement ?? payload.title ?? ""), "/ruang-bicara", "aqua");
              break;
            case "issue_response":
              toastFromPartner(`${pname()} sudah menulis sisi ceritanya`, "Yuk sepakati langkah bareng", "/ruang-bicara", "sand");
              break;
            case "mood":
              toastFromPartner(`${pname()} lagi merasa ${MOOD[Number(payload.mood)] ?? "…"}`, "Lihat Love Meter", "/love-meter", "pink");
              break;
            case "theme": {
              const t = themeInfo(String(payload.theme));
              toastFromPartner(`${pname()} mengubah dunia kalian`, `Selamat datang di ${t.name} ${t.art}`, "/tema", "pink");
              break;
            }
            case "photo": {
              const b = photoBatch.current;
              b.count += 1;
              if (b.timer) clearTimeout(b.timer);
              b.timer = setTimeout(() => {
                toastFromPartner(`${pname()} menambahkan ${b.count} foto`, "Lihat di Galeri", "/galeri", "aqua");
                b.count = 0;
              }, 1500);
              break;
            }
          }
        })
        .on("broadcast", { event: "game" }, ({ payload }: { payload: Record<string, unknown> }) => {
          emitLive("game", payload);
          if (payload.by === me.id) return;
          const href = `/main/${String(payload.id)}`;
          const onIt = pathRef.current === href;
          const name = gameName(String(payload.kind));
          if (payload.op === "insert" && !onIt) {
            toastFromPartner(`${pname()} ngajak main ${name}!`, "Ketuk untuk ikut main", href, "pink");
          } else if (payload.op === "update" && !onIt && payload.status === "playing" && payload.turn === me.id) {
            toastFromPartner(`Giliranmu di ${name}`, `${pname()} sudah jalan`, href, "aqua");
          }
        })
        .on("broadcast", { event: "game_cursor" }, ({ payload }: { payload: Record<string, unknown> }) => emitLive("game_cursor", payload))
        .on("broadcast", { event: "nudge" }, ({ payload }: { payload: Record<string, unknown> }) => {
          emitLive("nudge", payload);
          if (payload.by !== me.id) setLive({ nudge: { kind: String(payload.kind), at: Date.now() } });
        })
        .on("presence", { event: "sync" }, () => {
          const state = events!.presenceState() as Record<string, { page?: string }[]>;
          const p = partnerId ? state[partnerId] : undefined;
          setLive({ partnerOnline: Boolean(p?.length), partnerPage: p?.[p.length - 1]?.page ?? null });
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") await events!.track({ page: pathRef.current, at: Date.now() });
        });

      channels.chat = chat;
      channels.events = events;
    })();

    return () => {
      cancelled = true;
      channels.chat = null;
      channels.events = null;
      if (chat) void supabase.removeChannel(chat);
      if (events) void supabase.removeChannel(events);
    };
  }, [coupleId, me.id, partnerId]);

  // Denyut: tandai online, perpanjang kunci PIN, dan kunci lagi kalau sudah lewat batas
  useEffect(() => {
    let hiddenAt = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function beat() {
      const res = await heartbeat().catch(() => null);
      if (res && !res.unlocked && pinEnabled) {
        router.replace(`/kunci?next=${encodeURIComponent(pathRef.current)}`);
      }
    }
    function start() {
      if (timer) clearInterval(timer);
      timer = setInterval(beat, 30_000);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        // langsung tandai "tidak aktif" supaya pesan berikutnya jadi notifikasi
        void markAway().catch(() => {});
        if (timer) clearInterval(timer);
        timer = null;
        return;
      }
      void beat();
      start();
      // Lama ditinggal → segarkan data supaya tidak basi
      if (hiddenAt && Date.now() - hiddenAt > 120_000) router.refresh();
    }

    void beat();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pinEnabled, router]);

  return (
    <>
      <Toaster />
      <NudgeOverlay partnerName={partner?.name ?? "Pasangan"} />
    </>
  );
}
