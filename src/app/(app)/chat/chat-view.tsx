"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { loadOlder, markRead, sendMessage, type ChatMessage, type ReplyRef } from "./actions";
import { Cat, Heart } from "@/components/cat";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/ui";
import { broadcast, useLive, useLiveEvent } from "@/lib/live";
import { burstHearts, centerOf, haptic, play } from "@/lib/feel";
import { createClient } from "@/lib/supabase/client";
import { randomId, uploadPhoto, uploadVoice } from "@/lib/image";
import { attempt, OFFLINE } from "@/lib/offline";
import { kindPreview, MESSAGE_COLS } from "@/lib/chat";
import { CameraCapture } from "@/components/camera-capture";
import { RecordingBar, VoiceBubble, VoiceButton, type VoiceClip } from "@/components/voice";
import { LocationPicker } from "@/components/location-picker";
import { MapPreview } from "@/components/map-preview";
import { HASHTAG_RE, mapsUrl, type Place } from "@/lib/geo";

type Person = { id: string; name: string; avatar: string | null };

const QUICK = ["Kangen!", "Lagi apa?", "Semangat ya!", "Udah makan?"];

const timeFmt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const dayFmt = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" });
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });

function dayLabel(iso: string) {
  const k = dayKeyFmt.format(new Date(iso));
  const today = dayKeyFmt.format(new Date());
  const yesterday = dayKeyFmt.format(new Date(Date.now() - 86_400_000));
  if (k === today) return "Hari ini";
  if (k === yesterday) return "Kemarin";
  return dayFmt.format(new Date(iso));
}

function preview(r: Pick<ReplyRef, "kind" | "body">) {
  return kindPreview(r.kind, r.body, 200);
}

/** Kartu kecil "membalas story" di atas bubble. */
function StoryQuote({ m, mine, meId, partnerName }: { m: ChatMessage; mine: boolean; meId: string; partnerName: string }) {
  const storyOfMe = m.story ? m.story.author_id === meId : !mine;
  const label = !m.story
    ? "Story sudah hilang"
    : mine
      ? storyOfMe
        ? "Dari story kamu"
        : `Membalas story ${partnerName}`
      : storyOfMe
        ? "Membalas story kamu"
        : `Dari story ${partnerName}`;
  return (
    <div className={`flex items-center gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      <span className="relative h-16 w-11 shrink-0 overflow-hidden rounded-[10px] bg-tint shadow-soft">
        {m.storyUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.storyUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-lg">📸</span>
        )}
      </span>
      <span className="text-[12px] font-bold text-muted">{label}</span>
    </div>
  );
}

/** Teks pesan dengan #hashtag yang bisa diketuk (membuka Timeline untuk hashtag itu). */
function RichText({ text, mine }: { text: string; mine: boolean }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(HASHTAG_RE)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    parts.push(
      <Link
        key={i}
        href={`/timeline?tag=${encodeURIComponent(m[1].toLowerCase())}`}
        onPointerDown={(e) => e.stopPropagation()}
        className={`font-bold underline-offset-2 hover:underline ${mine ? "text-sand" : "text-pink"}`}
      >
        {m[0]}
      </Link>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Gelembung lokasi: peta kecil + nama tempat + tombol buka di Maps. */
function LocationBubble({ m, mine }: { m: ChatMessage; mine: boolean }) {
  const p = m.meta;
  if (!p) return null;
  return (
    <a
      href={mapsUrl(p)}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-60 max-w-[72vw] flex-col overflow-hidden rounded-[22px] bg-white shadow-soft ${mine ? "rounded-br-[6px]" : "rounded-bl-[6px]"}`}
    >
      {typeof p.lat === "number" && typeof p.lng === "number" && <MapPreview lat={p.lat} lng={p.lng} height={120} />}
      <span className="flex flex-col gap-0.5 px-3.5 py-2.5 text-navy">
        <span className="text-[11px] font-bold tracking-wide text-pink uppercase">📍 Lagi di sini</span>
        <span className="line-clamp-2 font-bold leading-snug">{p.name}</span>
        {p.address && <span className="line-clamp-1 text-xs text-muted">{p.address}</span>}
        <span className="mt-1 text-xs font-bold text-ocean">Buka di Maps ↗</span>
      </span>
    </a>
  );
}

/** Kotak kutipan pesan yang dibalas. Diketuk → lompat ke pesan aslinya. */
function Quote({
  reply,
  who,
  mine,
  inBubble,
  onJump,
}: {
  reply: ReplyRef | null;
  who: string;
  mine: boolean;
  inBubble: boolean;
  onJump?: () => void;
}) {
  const tone = inBubble && mine ? "bg-white/18 border-white/70 text-white" : "bg-sky border-ocean text-navy";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onJump?.();
      }}
      className={`flex w-full min-w-0 flex-col rounded-[14px] border-l-4 px-3 py-1.5 text-left ${tone}`}
    >
      <span className={`text-[12px] font-bold ${inBubble && mine ? "" : "text-ocean"}`}>{who}</span>
      <span className={`line-clamp-2 text-[13px] ${inBubble && mine ? "opacity-90" : "text-ink-soft"}`}>
        {reply ? preview(reply) : "Pesan sebelumnya"}
      </span>
    </button>
  );
}

const SWIPE = 56;

/** Satu bubble: geser ke kanan (HP), tekan lama (menu), atau tombol Balas saat diarahkan kursor (PC). */
function MessageRow({
  m,
  mine,
  quote,
  quoteWho,
  status,
  flash,
  menuOpen,
  partnerName,
  meId,
  onReply,
  onJump,
  onMenu,
  onOpenPhoto,
}: {
  meId: string;
  m: ChatMessage;
  mine: boolean;
  quote: { reply: ReplyRef | null } | null;
  quoteWho: string;
  status: string | null;
  flash: boolean;
  menuOpen: boolean;
  partnerName: string;
  onReply: (m: ChatMessage) => void;
  onJump: (id: string) => void;
  onMenu: (id: string | null) => void;
  onOpenPhoto: (m: ChatMessage) => void;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armed = useRef(false);
  const temp = m.id.startsWith("temp-");

  function clearHold() {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  }
  function reset() {
    start.current = null;
    armed.current = false;
    clearHold();
    setDx(0);
  }

  const bubble = mine ? "rounded-[22px_22px_6px_22px] bg-ocean text-white" : "rounded-[22px_22px_22px_6px] bg-white text-navy";
  const jump = () => m.reply_to && onJump(m.reply_to);

  return (
    <div
      id={`msg-${m.id}`}
      className={`group relative flex animate-rise flex-col gap-1 rounded-[24px] transition-colors duration-700 ${mine ? "items-end" : "items-start"} ${flash ? "bg-sand/60" : ""}`}
      style={{ animationDuration: ".3s", touchAction: "pan-y" }}
      onPointerDown={(e) => {
        if (temp || e.pointerType === "mouse") return;
        start.current = { x: e.clientX, y: e.clientY };
        clearHold();
        hold.current = setTimeout(() => {
          haptic(20);
          onMenu(m.id);
          start.current = null;
        }, 480);
      }}
      onPointerMove={(e) => {
        const s0 = start.current;
        if (!s0) return;
        const ddx = e.clientX - s0.x;
        const ddy = e.clientY - s0.y;
        if (Math.abs(ddx) > 6 || Math.abs(ddy) > 6) clearHold();
        if (Math.abs(ddy) > 12 && Math.abs(ddy) > Math.abs(ddx)) return reset();
        const next = Math.max(0, Math.min(ddx, 84));
        setDx(next);
        if (next >= SWIPE && !armed.current) {
          armed.current = true;
          haptic(12);
        }
      }}
      onPointerUp={() => {
        if (armed.current) onReply(m);
        reset();
      }}
      onPointerCancel={reset}
    >
      {/* Ikon balas yang muncul saat digeser */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ocean shadow-soft"
        style={{ opacity: Math.min(dx / SWIPE, 1), transform: `translateY(-50%) scale(${0.6 + Math.min(dx / SWIPE, 1) * 0.4})` }}
      >
        <Icon name="reply" size={18} />
      </span>

      <div
        className={`flex max-w-full flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? "none" : "transform .2s ease" }}
      >
        {m.story_id || m.story ? <StoryQuote m={m} mine={mine} meId={meId} partnerName={partnerName} /> : null}
        <div className={`flex max-w-full items-center gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
          {m.kind === "voice" ? (
            <div className={`flex flex-col gap-1.5 px-3 py-2 shadow-[0_3px_10px_rgba(11,37,69,0.05)] ${bubble}`}>
              {quote && <Quote reply={quote.reply} who={quoteWho} mine={mine} inBubble onJump={jump} />}
              <VoiceBubble id={m.id} src={m.fullUrl ?? m.url} durationMs={m.duration_ms} mine={mine} />
            </div>
          ) : m.kind === "text" ? (
            <div className={`flex max-w-[78vw] flex-col gap-1.5 px-4 py-2.5 shadow-[0_3px_10px_rgba(11,37,69,0.05)] sm:max-w-[420px] lg:max-w-[520px] ${bubble} ${quote ? "pt-2" : ""}`}>
              {quote && <Quote reply={quote.reply} who={quoteWho} mine={mine} inBubble onJump={jump} />}
              <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap select-none [@media(hover:hover)]:select-text">
                <RichText text={m.body ?? ""} mine={mine} />
              </p>
            </div>
          ) : (
            <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
              {quote && (
                <div className="w-56 max-w-[70vw]">
                  <Quote reply={quote.reply} who={quoteWho} mine={mine} inBubble={false} onJump={jump} />
                </div>
              )}
              {m.kind === "heart" && <Heart size={64} />}
              {m.kind === "location" && <LocationBubble m={m} mine={mine} />}
              {m.kind === "sticker" && (
                <span role="img" aria-label="Stiker kucing kangen">
                  <Cat variant={mine ? "mochi" : "boba"} size={100} mood="love" motion="hop" />
                </span>
              )}
              {m.kind === "photo" && (
                <button type="button" onClick={() => onOpenPhoto(m)} aria-label="Buka foto" className="overflow-hidden rounded-[22px] bg-white p-1.5 shadow-soft">
                  {m.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="Foto dari chat" loading="lazy" decoding="async" className="max-h-64 w-56 rounded-[17px] object-cover" />
                  ) : (
                    <span className="flex h-40 w-56 items-center justify-center rounded-[17px] bg-tint text-ocean">
                      <Icon name="image" size={30} />
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
          {/* Tombol balas untuk PC (muncul saat kursor di atas pesan) */}
          {!temp && (
            <button
              type="button"
              onClick={() => onReply(m)}
              aria-label={`Balas pesan ${mine ? "kamu" : partnerName}`}
              className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-white text-muted opacity-0 shadow-soft transition-opacity group-hover:opacity-100 hover:text-ocean focus-visible:opacity-100 [@media(hover:hover)]:flex"
            >
              <Icon name="reply" size={16} />
            </button>
          )}
        </div>
        <span className="px-1.5 text-[11px] text-muted">
          {timeFmt.format(new Date(m.created_at))}
          {status}
        </span>
      </div>

      {menuOpen && (
        <div
          className={`z-10 flex gap-1 rounded-full bg-navy p-1 text-sm font-bold text-white shadow-[0_8px_24px_rgba(11,37,69,0.25)]`}
          style={{ animation: "pop-in .25s cubic-bezier(.2,.9,.3,1.3) both" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button type="button" className="flex items-center gap-1.5 rounded-full px-3.5 py-2 active:bg-white/15" onClick={() => onReply(m)}>
            <Icon name="reply" size={16} /> Balas
          </button>
          {m.kind === "text" && m.body && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 active:bg-white/15"
              onClick={() => {
                void navigator.clipboard?.writeText(m.body ?? "");
                play("tap");
                onMenu(null);
              }}
            >
              <Icon name="copy" size={16} /> Salin
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Lihat foto chat di dalam aplikasi (tidak membuka alamat penyimpanan di browser). */
function PhotoViewer({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
  const [full, setFull] = useState<string | null>(message.fullUrl ?? null);
  useEffect(() => {
    if (full || !message.media_path) return;
    let alive = true;
    createClient()
      .storage.from("gallery")
      .createSignedUrl(message.media_path, 3600)
      .then(({ data }) => {
        if (alive && data?.signedUrl) setFull(data.signedUrl);
      });
    return () => {
      alive = false;
    };
  }, [full, message.media_path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const src = full ?? message.url;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto"
      className="fixed inset-0 z-[60] flex flex-col bg-navy p-4 text-white"
      style={{ paddingTop: "max(env(safe-area-inset-top), 16px)", paddingBottom: "max(env(safe-area-inset-bottom), 16px)", animation: "fade-in .15s ease both" }}
      onClick={onClose}
    >
      <div className="flex justify-end">
        <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-11 items-center justify-center rounded-full bg-white/15">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center py-4">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Foto dari chat" className="max-h-full max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        ) : (
          <span className="text-sm opacity-80">Memuat foto…</span>
        )}
      </div>
    </div>
  );
}

export function ChatView({
  coupleId,
  me,
  partner,
  initial,
  nextMeeting,
}: {
  coupleId: string;
  me: Person;
  partner: Person | null;
  initial: ChatMessage[];
  nextMeeting: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const online = useLive((s) => s.partnerOnline);
  const [hasMore, setHasMore] = useState(initial.length >= 60);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [rec, setRec] = useState({ recording: false, locked: false, ms: 0, cancelHint: 0 });
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const stickToBottom = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ChatMessage | null>(null);
  const partnerName = partner?.name ?? "Pasangan";
  const nameOf = (uid: string) => (uid === me.id ? "Kamu" : partnerName);

  // Menu tekan-lama tertutup saat mengetuk tempat lain
  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    const t = setTimeout(() => document.addEventListener("pointerdown", close, { once: true }), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", close);
    };
  }, [menuFor]);

  function startReply(m: ChatMessage) {
    setMenuFor(null);
    setReplyTo(m);
    play("tap");
    inputRef.current?.focus();
  }

  function jumpTo(id: string) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) {
      setError("Pesan itu ada di riwayat lama. Ketuk \"Muat pesan sebelumnya\" dulu, ya.");
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(id);
    setTimeout(() => setFlashId((f) => (f === id ? null : f)), 1400);
  }

  // Tandai dibaca; kalau sinyal putus, abaikan saja (dicoba lagi nanti)
  const readSafely = useCallback(async () => {
    try {
      await markRead();
    } catch {}
  }, []);

  const upsert = useCallback((m: ChatMessage, tempId?: string) => {
    setMessages((prev) => {
      const without = prev.filter((x) => x.id !== m.id && x.id !== tempId);
      const existing = prev.find((x) => x.id === m.id);
      const merged = existing
        ? { ...existing, ...m, url: m.url ?? existing.url, fullUrl: m.fullUrl ?? existing.fullUrl, story: m.story ?? existing.story, storyUrl: m.storyUrl ?? existing.storyUrl }
        : m;
      return [...without, merged].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, []);

  // Foto yang datang lewat realtime belum punya URL: minta URL sementara.
  const resolveUrl = useCallback(
    async (m: ChatMessage) => {
      const supabase = createClient();
      let story = m.story ?? null;
      if (m.story_id && !story) {
        const { data } = await supabase.from("stories").select("id, author_id, thumb_path").eq("id", m.story_id).maybeSingle();
        story = data ?? null;
      }
      const needMedia = Boolean(m.media_path && !m.url);
      const needStory = Boolean(story?.thumb_path && !m.storyUrl);
      if (!needMedia && !needStory && story === (m.story ?? null)) return;
      const paths = [needMedia ? m.thumb_path : null, needMedia ? m.media_path : null, needStory ? story?.thumb_path : null].filter(
        (p): p is string => Boolean(p),
      );
      const map: Record<string, string> = {};
      if (paths.length) {
        const { data } = await supabase.storage.from("gallery").createSignedUrls(paths, 3600);
        for (const d of data ?? []) if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
      }
      const next: ChatMessage = { ...m, story };
      if (needMedia && m.media_path && map[m.media_path]) {
        next.url = (m.thumb_path && map[m.thumb_path]) || map[m.media_path];
        next.fullUrl = map[m.media_path];
      }
      if (needStory && story?.thumb_path && map[story.thumb_path]) next.storyUrl = map[story.thumb_path];
      upsert(next);
    },
    [upsert],
  );

  // Kejadian realtime dibagikan oleh LiveBridge (satu koneksi untuk seluruh aplikasi)
  useLiveEvent("message", (payload) => {
    const m = payload as unknown as ChatMessage;
    upsert(m);
    void resolveUrl(m);
    if (m.sender_id !== me.id) {
      setTyping(false);
      if (document.visibilityState === "visible") {
        play("pop");
        haptic(15);
        startTransition(readSafely);
      }
    }
  });
  useLiveEvent("message_update", (payload) => upsert(payload as unknown as ChatMessage));
  // Koneksi realtime tersambung lagi → ambil pesan yang terlewat selama terputus
  useLiveEvent("resync", async () => {
    const last = [...messages].reverse().find((m) => !m.id.startsWith("temp-"));
    let q = createClient().from("messages").select(MESSAGE_COLS).order("created_at", { ascending: true }).limit(100);
    if (last) q = q.gt("created_at", last.created_at);
    const { data } = await q;
    for (const m of (data ?? []) as ChatMessage[]) {
      upsert(m);
      void resolveUrl(m);
    }
    if (data?.length) startTransition(readSafely);
  });
  useLiveEvent("typing", (payload) => {
    if (payload.user === me.id) return;
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 3500);
  });

  // Tandai dibaca saat membuka chat & saat kembali ke tab
  useEffect(() => {
    startTransition(readSafely);
    const onVisible = () => document.visibilityState === "visible" && startTransition(readSafely);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [readSafely]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    broadcast("chat", "typing", { user: me.id });
  }

  function send(
    kind: ChatMessage["kind"],
    body: string | null,
    mediaPath: string | null = null,
    localUrl?: string,
    thumbPath: string | null = null,
    extra: { durationMs?: number; place?: Place } = {},
  ) {
    setError(undefined);
    stickToBottom.current = true;
    play(kind === "heart" ? "pop" : "send");
    haptic(12);
    const tempId = `temp-${randomId()}`;
    const replying = replyTo && !replyTo.id.startsWith("temp-") ? replyTo : null;
    setReplyTo(null);
    upsert({
      reply_to: replying?.id ?? null,
      reply: replying ? { id: replying.id, sender_id: replying.sender_id, kind: replying.kind, body: replying.body } : null,
      id: tempId,
      couple_id: coupleId,
      sender_id: me.id,
      kind,
      body,
      media_path: mediaPath,
      thumb_path: thumbPath,
      created_at: new Date().toISOString(),
      read_at: null,
      url: localUrl,
      fullUrl: localUrl,
      duration_ms: extra.durationMs ?? null,
      meta: extra.place ? { name: extra.place.name, address: extra.place.address, lat: extra.place.lat ?? undefined, lng: extra.place.lng ?? undefined } : null,
    });
    startTransition(async () => {
      const res = await attempt(() => sendMessage({ kind, body, mediaPath, thumbPath, replyTo: replying?.id ?? null, durationMs: extra.durationMs ?? null, place: extra.place ?? null }));
      if ("error" in res && res.error || !("message" in res) || !res.message) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(("error" in res && res.error) || "Pesan gagal terkirim.");
        play("error");
        // teks yang gagal dikembalikan ke kolom ketik supaya tidak hilang
        if (kind === "text" && body) setDraft((d) => d || body);
        if (replying) setReplyTo((r) => r ?? replying);
      } else {
        // URL lokal tetap dipakai supaya foto/suara tidak berkedip saat diganti versi server
        upsert({ ...res.message, url: res.message.url ?? localUrl, fullUrl: res.message.fullUrl ?? localUrl }, tempId);
      }
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    send("text", text);
  }

  function onPhoto(file: Blob) {
    startTransition(async () => {
      const up = await uploadPhoto(createClient(), file, `${coupleId}/chat`).catch(() => ({ error: OFFLINE }));
      if ("error" in up) return setError(`Foto gagal diunggah: ${up.error}`);
      send("photo", null, up.path, up.localUrl, up.thumbPath);
    });
  }

  function onVoice(clip: VoiceClip) {
    startTransition(async () => {
      const up = await uploadVoice(createClient(), clip.blob, `${coupleId}/chat/voice`, clip.ext, clip.mime).catch(() => ({ error: OFFLINE }));
      if ("error" in up) return setError(`Voice note gagal diunggah: ${up.error}`);
      send("voice", null, up.path, up.localUrl, null, { durationMs: clip.durationMs });
    });
  }

  function older() {
    const first = messages.find((m) => !m.id.startsWith("temp-"));
    if (!first) return;
    stickToBottom.current = false;
    startTransition(async () => {
      const res = await attempt(() => loadOlder(first.created_at));
      if (!Array.isArray(res)) return setError(res.error);
      const list = res;
      if (list.length < 40) setHasMore(false);
      setMessages((prev) => [...list.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
    });
  }

  const lastMine = [...messages].reverse().find((m) => m.sender_id === me.id);
  const byId = new Map(messages.map((m) => [m.id, m]));

  return (
    <div data-fullscreen className="flex h-dvh flex-col overflow-hidden lg:h-[calc(100dvh-48px)] lg:pt-6">
      <header
        className="z-10 flex flex-col gap-3 rounded-b-[28px] bg-white px-4 pb-3.5 shadow-soft lg:mx-10 lg:rounded-[28px] lg:pt-4"
        style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}
      >
        <div className="flex items-center gap-2.5">
          <Link href="/" aria-label="Kembali" className="flex size-11 items-center justify-center rounded-full lg:hidden">
            <Icon name="back" />
          </Link>
          <span className="relative">
            <Avatar name={partnerName} url={partner?.avatar} size={46} tone="aqua" className="border-white" />
            {online && <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-white bg-[#2FBF71]" aria-hidden="true" />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="font-display text-[21px] leading-tight font-semibold">{partnerName}</h1>
            <p className="text-[13px] text-muted" aria-live="polite">
              {typing ? "Sedang mengetik…" : online ? "Online" : partner ? "Offline" : "Belum bergabung"}
            </p>
          </div>
        </div>
        {nextMeeting && (
          <Link href="/kalender" className="flex items-center gap-2 rounded-2xl bg-tint px-3.5 py-2.5 text-sm font-bold">
            <Icon name="calendar" size={18} className="text-ocean" />
            <span className="flex-1">{nextMeeting}</span>
            <span className="text-ocean">Lihat</span>
          </Link>
        )}
      </header>

      <div ref={listRef} onScroll={onScroll} className="flex flex-1 flex-col gap-2.5 overflow-x-clip overflow-y-auto overscroll-contain px-4 py-4 lg:px-10">
        {hasMore && (
          <button type="button" onClick={older} className="chip self-center text-[13px]">
            Muat pesan sebelumnya
          </button>
        )}
        {messages.length === 0 && (
          <div className="m-auto flex flex-col items-center gap-2 text-center">
            <Cat variant="boba" size={96} mood="love" />
            <p className="text-[15px] text-muted">Belum ada pesan. Sapa {partnerName} duluan, yuk!</p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === me.id;
          const showDay = i === 0 || dayLabel(messages[i - 1].created_at) !== dayLabel(m.created_at);
          const original = m.reply_to ? (m.reply ?? byId.get(m.reply_to) ?? null) : null;
          const quote = m.reply_to ? { reply: original } : null;
          return (
            <Fragment key={m.id}>
              {showDay && (
                <span className="my-1 self-center rounded-[10px] bg-tint px-3 py-1 text-xs font-bold text-muted">{dayLabel(m.created_at)}</span>
              )}
              <MessageRow
                m={m}
                mine={mine}
                quote={quote}
                quoteWho={original ? nameOf(original.sender_id) : "Balasan"}
                status={m.id === lastMine?.id ? (m.id.startsWith("temp-") ? " · Mengirim…" : m.read_at ? " · Dibaca" : " · Terkirim") : null}
                flash={flashId === m.id}
                menuOpen={menuFor === m.id}
                partnerName={partnerName}
                meId={me.id}
                onReply={startReply}
                onJump={jumpTo}
                onMenu={setMenuFor}
                onOpenPhoto={setViewing}
              />
            </Fragment>
          );
        })}
        {typing && (
          <div className="flex animate-rise items-center gap-1.5 self-start rounded-[22px_22px_22px_6px] bg-white px-4 py-3.5" aria-label={`${partnerName} sedang mengetik`}>
            {[0, 0.18, 0.36].map((d) => (
              <span key={d} className="size-2 rounded-full bg-aqua" style={{ animation: `dot 1.1s ease-in-out ${d}s infinite` }} />
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2.5 rounded-t-[28px] bg-white px-3.5 pt-3 shadow-[0_-6px_24px_rgba(11,37,69,0.06)] lg:mx-10 lg:mb-6 lg:rounded-[28px] lg:pb-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
      >
        {error && <p role="alert" className="px-1 text-sm font-semibold text-[#9b1c3a]">{error}</p>}
        {replyTo && (
          <div className="flex animate-rise items-center gap-2" style={{ animationDuration: ".2s" }}>
            <span className="flex size-8 shrink-0 items-center justify-center text-ocean">
              <Icon name="reply" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <Quote reply={replyTo} who={`Membalas ${replyTo.sender_id === me.id ? "dirimu sendiri" : partnerName}`} mine={false} inBubble={false} onJump={() => jumpTo(replyTo.id)} />
            </div>
            <button type="button" aria-label="Batal membalas" onClick={() => setReplyTo(null)} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky text-muted">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        <div className="scroll-row flex gap-2">
          <button type="button" onClick={() => setLocOpen(true)} className="chip min-h-9 shrink-0 bg-pink-soft text-[13px] shadow-none">
            📍 Lokasi
          </button>
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => send("text", q)} className="chip min-h-9 bg-sky text-[13px] shadow-none">
              {q}
            </button>
          ))}
          <button type="button" onClick={() => send("sticker", null)} className="chip min-h-9 bg-sky text-[13px] shadow-none">
            Stiker kucing
          </button>
        </div>
        <div className="flex items-center gap-2">
          {rec.recording ? (
            <RecordingBar ms={rec.ms} locked={rec.locked} cancelHint={rec.cancelHint} />
          ) : (
            <>
              <button type="button" onClick={() => setCamOpen(true)} aria-label="Pap dari kamera" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky">
                <Icon name="camera" size={20} />
              </button>
              <label htmlFor="pesan" className="sr-only">Tulis pesan</label>
              <input
                ref={inputRef}
                id="pesan"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  notifyTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setReplyTo(null);
                }}
                placeholder={replyTo ? "Tulis balasan…" : "Tulis pesan…"}
                autoComplete="off"
                className="h-[46px] min-w-0 flex-1 rounded-full border-2 border-tint bg-sky px-4 text-base focus:border-ocean focus:outline-none"
              />
              <button
                type="button"
                onClick={(e) => {
                  const { x, y } = centerOf(e.currentTarget);
                  burstHearts(x, y, 12);
                  send("heart", null);
                }}
                aria-label="Kirim hati"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-pink-soft"
              >
                <Heart size={22} beat={false} />
              </button>
            </>
          )}
          {draft.trim() && !rec.recording ? (
            <button type="submit" aria-label="Kirim" className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-ocean text-white shadow-ocean">
              <Icon name="send" size={20} />
            </button>
          ) : (
            <VoiceButton onRecorded={onVoice} onState={setRec} onError={(msg) => setError(msg)} />
          )}
        </div>
      </form>
      {viewing && <PhotoViewer message={viewing} onClose={() => setViewing(null)} />}
      <CameraCapture open={camOpen} onClose={() => setCamOpen(false)} onPick={onPhoto} confirmLabel="Kirim pap" />
      <LocationPicker
        open={locOpen}
        onClose={() => setLocOpen(false)}
        requireCoords
        title="Kirim lokasi 📍"
        onPick={(place) => send("location", place.name, null, undefined, null, { place })}
      />
    </div>
  );
}
