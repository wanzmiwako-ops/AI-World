"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { loadOlder, markRead, sendMessage, type ChatMessage } from "./actions";
import { Cat, Heart } from "@/components/cat";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/ui";
import { useCoupleChannel } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import { randomId, resizeImage } from "@/lib/image";

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
  const [online, setOnline] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length >= 60);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const stickToBottom = useRef(true);
  const partnerName = partner?.name ?? "Pasangan";

  const upsert = useCallback((m: ChatMessage, tempId?: string) => {
    setMessages((prev) => {
      const without = prev.filter((x) => x.id !== m.id && x.id !== tempId);
      const existing = prev.find((x) => x.id === m.id);
      const merged = existing ? { ...existing, ...m, url: m.url ?? existing.url } : m;
      return [...without, merged].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, []);

  // Foto yang datang lewat realtime belum punya URL: minta URL sementara.
  const resolveUrl = useCallback(
    async (m: ChatMessage) => {
      if (!m.media_path || m.url) return;
      const { data } = await createClient().storage.from("gallery").createSignedUrl(m.media_path, 3600);
      if (data?.signedUrl) upsert({ ...m, url: data.signedUrl });
    },
    [upsert],
  );

  useCoupleChannel(
    `couple:${coupleId}:chat`,
    {
      message: (payload) => {
        const m = payload as unknown as ChatMessage;
        upsert(m);
        void resolveUrl(m);
        if (m.sender_id !== me.id) {
          setTyping(false);
          if (document.visibilityState === "visible") startTransition(() => markRead());
        }
      },
      message_update: (payload) => upsert(payload as unknown as ChatMessage),
      typing: (payload) => {
        if (payload.user === me.id) return;
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 3500);
      },
    },
    {
      presenceKey: me.id,
      onPresence: (keys) => setOnline(Boolean(partner && keys.includes(partner.id))),
      onReady: (ch) => (channelRef.current = ch),
    },
  );

  // Tandai dibaca saat membuka chat & saat kembali ke tab
  useEffect(() => {
    startTransition(() => markRead());
    const onVisible = () => document.visibilityState === "visible" && startTransition(() => markRead());
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

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
    void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { user: me.id } });
  }

  function send(kind: ChatMessage["kind"], body: string | null, mediaPath: string | null = null, localUrl?: string) {
    setError(undefined);
    stickToBottom.current = true;
    const tempId = `temp-${randomId()}`;
    upsert({
      id: tempId,
      couple_id: coupleId,
      sender_id: me.id,
      kind,
      body,
      media_path: mediaPath,
      created_at: new Date().toISOString(),
      read_at: null,
      url: localUrl,
    });
    startTransition(async () => {
      const res = await sendMessage({ kind, body, mediaPath });
      if (res.error || !res.message) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(res.error ?? "Pesan gagal terkirim.");
      } else {
        upsert(res.message, tempId);
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

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    startTransition(async () => {
      const blob = await resizeImage(file);
      const path = `${coupleId}/chat/${randomId()}.webp`;
      const { error: upErr } = await createClient().storage.from("gallery").upload(path, blob, { contentType: "image/webp" });
      if (upErr) return setError(`Foto gagal diunggah: ${upErr.message}`);
      send("photo", null, path, URL.createObjectURL(blob));
    });
  }

  function older() {
    const first = messages.find((m) => !m.id.startsWith("temp-"));
    if (!first) return;
    stickToBottom.current = false;
    startTransition(async () => {
      const list = await loadOlder(first.created_at);
      if (list.length < 40) setHasMore(false);
      setMessages((prev) => [...list.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
    });
  }

  const lastMine = [...messages].reverse().find((m) => m.sender_id === me.id);

  return (
    <div className="flex h-dvh flex-col lg:h-[calc(100dvh-48px)] lg:pt-6">
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

      <div ref={listRef} onScroll={onScroll} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4 lg:px-10">
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
          const bubble = mine
            ? "rounded-[22px_22px_6px_22px] bg-ocean text-white"
            : "rounded-[22px_22px_22px_6px] bg-white text-navy";
          return (
            <Fragment key={m.id}>
              {showDay && (
                <span className="my-1 self-center rounded-[10px] bg-tint px-3 py-1 text-xs font-bold text-muted">{dayLabel(m.created_at)}</span>
              )}
              <div className={`flex animate-rise flex-col gap-1 ${mine ? "items-end" : "items-start"}`} style={{ animationDuration: ".3s" }}>
                {m.kind === "text" && (
                  <p className={`max-w-[78%] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-[0_3px_10px_rgba(11,37,69,0.05)] lg:max-w-[60%] ${bubble}`}>{m.body}</p>
                )}
                {m.kind === "heart" && <Heart size={64} />}
                {m.kind === "sticker" && (
                  <span role="img" aria-label="Stiker kucing kangen">
                    <Cat variant={mine ? "mochi" : "boba"} size={100} mood="love" motion="hop" />
                  </span>
                )}
                {m.kind === "photo" && (
                  <a href={m.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-[22px] bg-white p-1.5 shadow-soft">
                    {m.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="Foto dari chat" className="max-h-64 w-56 rounded-[17px] object-cover" />
                    ) : (
                      <span className="flex h-40 w-56 items-center justify-center rounded-[17px] bg-tint text-ocean">
                        <Icon name="image" size={30} />
                      </span>
                    )}
                  </a>
                )}
                <span className="px-1.5 text-[11px] text-muted">
                  {timeFmt.format(new Date(m.created_at))}
                  {m.id === lastMine?.id && (m.id.startsWith("temp-") ? " · Mengirim…" : m.read_at ? " · Dibaca" : " · Terkirim")}
                </span>
              </div>
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
        <div className="flex gap-2 overflow-x-auto">
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
          <button type="button" onClick={() => fileRef.current?.click()} aria-label="Kirim foto" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky">
            <Icon name="camera" size={20} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPhoto} aria-label="Pilih foto" />
          <label htmlFor="pesan" className="sr-only">Tulis pesan</label>
          <input
            id="pesan"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              notifyTyping();
            }}
            placeholder="Tulis pesan…"
            autoComplete="off"
            className="h-[46px] min-w-0 flex-1 rounded-full border-2 border-tint bg-sky px-4 text-[15px] focus:border-ocean focus:outline-none"
          />
          <button type="button" onClick={() => send("heart", null)} aria-label="Kirim hati" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-pink-soft">
            <Heart size={22} beat={false} />
          </button>
          <button type="submit" aria-label="Kirim" className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-ocean text-white shadow-ocean">
            <Icon name="send" size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
