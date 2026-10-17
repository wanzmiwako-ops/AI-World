"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { Avatar } from "@/components/ui";
import { attempt } from "@/lib/offline";
import { burstHearts, centerOf, haptic, play } from "@/lib/feel";
import { STORY_REACTIONS, timeAgo, type Highlight, type Story } from "@/lib/stories";
import { createHighlight, deleteHighlight, deleteStory, replyStory, seeStory, setStoryHighlight } from "@/app/(app)/story-actions";

const DURATION = 6;
const timeFmt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const HL_EMOJI = ["💞", "🌸", "✈️", "🍜", "🎂", "🐱", "🌙", "⭐", "🎉", "🏖️"];

export type Person = { id: string; name: string; avatar: string | null };

export function StoryViewer({
  stories,
  start,
  me,
  partner,
  highlight,
  highlights,
  onClose,
  onSeen,
}: {
  stories: Story[];
  start: number;
  me: Person;
  partner: Person | null;
  highlight?: Highlight | null;
  highlights: Highlight[];
  onClose: () => void;
  onSeen: (id: string) => void;
}) {
  const [idx, setIdx] = useState(Math.min(start, Math.max(0, stories.length - 1)));
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [held, setHeld] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [pickHl, setPickHl] = useState(false);
  const [confirmDel, setConfirmDel] = useState<"story" | "highlight" | null>(null);
  const [pending, startTransition] = useTransition();
  const press = useRef<{ x: number; y: number; t: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragY, setDragY] = useState(0);
  const seenSent = useRef(new Set<string>());

  const story = stories[idx];
  const mine = story?.author_id === me.id;
  const author = mine ? me : (partner ?? { id: "", name: "Pasangan", avatar: null });
  const paused = held || typing || pickHl || Boolean(confirmDel) || !loaded[story?.id ?? ""];

  // Tandai story pasangan sudah dilihat
  useEffect(() => {
    if (!story || mine || seenSent.current.has(story.id)) return;
    seenSent.current.add(story.id);
    onSeen(story.id);
    void attempt(() => seeStory(story.id));
  }, [story, mine, onSeen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  });

  // Story dihapus dari luar (mis. kedaluwarsa) → tutup kalau habis
  useEffect(() => {
    if (!stories.length) onClose();
  }, [stories.length, onClose]);

  function next() {
    setConfirmDel(null);
    setNote(null);
    if (idx < stories.length - 1) setIdx(idx + 1);
    else onClose();
  }
  function prev() {
    setConfirmDel(null);
    setNote(null);
    if (idx > 0) setIdx(idx - 1);
  }

  function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote((n) => (n === msg ? null : n)), 2200);
  }

  function react(emoji: string, el: HTMLElement) {
    const c = centerOf(el);
    burstHearts(c.x, c.y, 12);
    haptic(15);
    play("pop");
    startTransition(async () => {
      const res = await attempt(() => seeStory(story.id, emoji));
      if ("error" in res && res.error) flash(res.error);
      else flash(`${emoji} terkirim ke chat`);
    });
  }

  function sendReply(e: React.FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text) return;
    setReply("");
    setTyping(false);
    (document.activeElement as HTMLElement | null)?.blur();
    play("send");
    startTransition(async () => {
      const res = await attempt(() => replyStory(story.id, text));
      if ("error" in res && res.error) {
        setReply(text);
        flash(res.error);
      } else flash("Balasan terkirim ke chat 💌");
    });
  }

  function removeStory() {
    if (confirmDel !== "story") return setConfirmDel("story");
    startTransition(async () => {
      const res = await attempt(() => deleteStory(story.id));
      if ("error" in res && res.error) return flash(res.error);
      play("tap");
      onClose();
    });
  }

  function unhighlight() {
    startTransition(async () => {
      const res = await attempt(() => setStoryHighlight(story.id, null));
      if ("error" in res && res.error) return flash(res.error);
      flash("Dikeluarkan dari sorotan");
      if (stories.length <= 1) onClose();
    });
  }

  function removeHighlight() {
    if (!highlight) return;
    if (confirmDel !== "highlight") return setConfirmDel("highlight");
    startTransition(async () => {
      const res = await attempt(() => deleteHighlight(highlight.id));
      if ("error" in res && res.error) return flash(res.error);
      onClose();
    });
  }

  if (!story || typeof document === "undefined") return null;
  const partnerView = mine ? story.views.find((v) => v.user_id !== me.id) : null;
  const inHighlight = highlights.find((h) => h.id === story.highlight_id);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Story ${author.name}`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black text-white"
      style={{ animation: "fade-in .15s ease both" }}
    >
      <div
        className="relative flex h-full w-full max-w-[min(100vw,calc(100dvh*9/16))] flex-col overflow-hidden sm:h-[calc(100dvh-32px)] sm:rounded-[24px]"
        style={{ transform: dragY ? `translateY(${dragY}px) scale(${1 - dragY / 1600})` : undefined, transition: dragY ? "none" : "transform .2s" }}
      >
        {/* Gambar + area ketuk */}
        <div
          className="absolute inset-0 touch-none select-none"
          onPointerDown={(e) => {
            press.current = { x: e.clientX, y: e.clientY, t: Date.now() };
            holdTimer.current = setTimeout(() => setHeld(true), 220);
          }}
          onPointerMove={(e) => {
            const p = press.current;
            if (!p) return;
            const dy = e.clientY - p.y;
            if (dy > 8) setDragY(dy);
          }}
          onPointerUp={(e) => {
            const p = press.current;
            press.current = null;
            if (holdTimer.current) clearTimeout(holdTimer.current);
            setHeld(false);
            if (!p) return;
            const dy = e.clientY - p.y;
            setDragY(0);
            if (dy > 110) return onClose();
            if (Date.now() - p.t < 260 && Math.abs(e.clientX - p.x) < 12 && Math.abs(dy) < 12) {
              const r = e.currentTarget.getBoundingClientRect();
              if (e.clientX - r.left < r.width / 3) prev();
              else next();
            }
          }}
          onPointerCancel={() => {
            press.current = null;
            if (holdTimer.current) clearTimeout(holdTimer.current);
            setHeld(false);
            setDragY(0);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={story.id}
            src={story.url ?? story.thumbUrl}
            alt=""
            draggable={false}
            onLoad={() => setLoaded((l) => ({ ...l, [story.id]: true }))}
            onError={() => setLoaded((l) => ({ ...l, [story.id]: true }))}
            className="pointer-events-none size-full object-cover"
            style={{ animation: "fade-in .2s ease both" }}
          />
          {!loaded[story.id] && <span className="absolute inset-0 flex items-center justify-center text-sm opacity-80">Memuat…</span>}
          {/* muat duluan story berikutnya */}
          {stories[idx + 1]?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stories[idx + 1].url} alt="" className="hidden" onLoad={() => setLoaded((l) => ({ ...l, [stories[idx + 1].id]: true }))} />
          )}
        </div>

        {/* Atas: progress + pembuat */}
        <div
          className="pointer-events-none relative flex flex-col gap-3 bg-gradient-to-b from-black/55 to-transparent px-3 pb-8"
          style={{ paddingTop: "max(env(safe-area-inset-top), 10px)", opacity: held ? 0 : 1, transition: "opacity .2s" }}
        >
          <div className="flex gap-1">
            {stories.map((s, i) => (
              <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                {i < idx && <span className="block h-full w-full bg-white" />}
                {i === idx && (
                  <span
                    key={`${s.id}-${idx}`}
                    className="block h-full w-full bg-white"
                    style={{ animation: `grow ${DURATION}s linear both`, animationPlayState: paused ? "paused" : "running" }}
                    onAnimationEnd={next}
                  />
                )}
              </span>
            ))}
          </div>
          <div className="pointer-events-auto flex items-center gap-2.5">
            <Avatar name={author.name} url={author.avatar} size={36} tone={mine ? "sand" : "aqua"} className="border-white/80" />
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-bold">
                {highlight ? `${highlight.emoji ?? "⭐"} ${highlight.title}` : mine ? "Story kamu" : author.name}
              </span>
              <span className="text-xs opacity-80">
                {highlight ? `${mine ? "Kamu" : author.name} · ${dateFmt.format(new Date(story.created_at))}` : timeAgo(story.created_at)}
              </span>
            </div>
            <button type="button" onClick={onClose} aria-label="Tutup story" className="flex size-10 items-center justify-center rounded-full bg-black/30">
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {note && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/65 px-4 py-2 text-sm font-bold whitespace-nowrap" style={{ animation: "pop-in .3s ease both" }}>
            {note}
          </span>
        )}

        {/* Bawah */}
        <div
          className="relative mt-auto flex flex-col gap-3 bg-gradient-to-t from-black/60 to-transparent px-3 pt-10"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)", opacity: held ? 0 : 1, transition: "opacity .2s" }}
        >
          {highlight ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" disabled={pending} onClick={unhighlight} className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
                Keluarkan dari sorotan
              </button>
              <button type="button" disabled={pending} onClick={removeHighlight} className={`rounded-full px-4 py-2 text-sm font-bold ${confirmDel === "highlight" ? "bg-pink" : "bg-white/15"}`}>
                {confirmDel === "highlight" ? "Yakin hapus sorotan?" : "Hapus sorotan"}
              </button>
            </div>
          ) : mine ? (
            <div className="flex items-center gap-2">
              <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
                <Icon name="eye" size={18} />
                {partnerView ? (
                  <span className="truncate">
                    Dilihat {partner?.name ?? "pasangan"} · {timeFmt.format(new Date(partnerView.viewed_at))}
                    {partnerView.reaction && <span className="ml-1.5 inline-block text-lg" style={{ animation: "pop-in .4s ease both" }}>{partnerView.reaction}</span>}
                  </span>
                ) : (
                  <span className="opacity-80">Belum dilihat {partner?.name ?? ""}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setPickHl(true)}
                className="flex h-10 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm font-bold"
              >
                <Icon name="star" size={17} /> {inHighlight ? "Tersimpan" : "Sorotan"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={removeStory}
                aria-label="Hapus story"
                className={`flex h-10 items-center justify-center rounded-full px-3 text-sm font-bold ${confirmDel === "story" ? "bg-pink" : "bg-white/15"}`}
              >
                {confirmDel === "story" ? "Hapus?" : <Icon name="trash" size={18} />}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                {STORY_REACTIONS.map((r, i) => (
                  <button
                    key={r}
                    type="button"
                    aria-label={`Reaksi ${r}`}
                    disabled={pending}
                    onClick={(e) => react(r, e.currentTarget)}
                    className="flex size-12 items-center justify-center text-[30px] transition-transform active:scale-125"
                    style={{ animation: `pop-in .35s ease ${i * 0.04}s both` }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <form onSubmit={sendReply} className="flex items-center gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => setTyping(true)}
                  onBlur={() => setTyping(false)}
                  maxLength={500}
                  placeholder={`Balas story ${author.name}…`}
                  aria-label="Balas story"
                  className="h-12 min-w-0 flex-1 rounded-full border-2 border-white/60 bg-black/20 px-4 text-base text-white placeholder:text-white/70 focus:border-white focus:outline-none"
                />
                <button type="button" onClick={() => setPickHl(true)} aria-label="Simpan ke sorotan" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon name="star" size={20} />
                </button>
                {reply.trim() && (
                  <button type="submit" aria-label="Kirim balasan" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-navy">
                    <Icon name="send" size={20} />
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>

      <HighlightPicker
        open={pickHl}
        onClose={() => setPickHl(false)}
        story={story}
        highlights={highlights}
        onDone={(msg) => {
          setPickHl(false);
          flash(msg);
          play("chime");
          haptic(20);
        }}
      />
    </div>,
    document.body,
  );
}

function HighlightPicker({
  open,
  onClose,
  story,
  highlights,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  story: Story;
  highlights: Highlight[];
  onDone: (msg: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(HL_EMOJI[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function put(h: Highlight) {
    setError(null);
    startTransition(async () => {
      const res = await attempt(() => setStoryHighlight(story.id, h.id));
      if ("error" in res && res.error) return setError(res.error);
      onDone(`Disimpan ke ${h.emoji ?? "⭐"} ${h.title}`);
    });
  }
  function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    if (!t) return setError("Kasih nama sorotannya dulu, ya.");
    startTransition(async () => {
      const res = await attempt(() => createHighlight({ title: t, emoji, storyId: story.id }));
      if ("error" in res && res.error) return setError(res.error);
      setTitle("");
      onDone(`Sorotan ${emoji} ${t} dibuat!`);
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Simpan ke Sorotan ⭐">
      <p className="-mt-2 text-sm text-muted">Story di Sorotan tidak hilang setelah 24 jam, dan muncul di Beranda & Timeline.</p>
      {highlights.length > 0 && (
        <div className="flex flex-col gap-2">
          {highlights.map((h) => {
            const here = story.highlight_id === h.id;
            return (
              <button
                key={h.id}
                type="button"
                disabled={pending || here}
                onClick={() => put(h)}
                className="flex items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-soft disabled:opacity-70"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-tint text-2xl">{h.emoji ?? "⭐"}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">{h.title}</span>
                  <span className="text-xs text-muted">{h.stories.length} story</span>
                </span>
                {here && <Icon name="check" size={20} className="text-ocean" />}
              </button>
            );
          })}
        </div>
      )}
      <form onSubmit={create} className="flex flex-col gap-3 rounded-[22px] bg-white p-4 shadow-soft">
        <span className="font-bold">Sorotan baru</span>
        <div className="scroll-row flex gap-1.5">
          {HL_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={emoji === e}
              onClick={() => setEmoji(e)}
              className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xl ${emoji === e ? "bg-tint ring-2 ring-ocean" : "bg-sky"}`}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={30}
          placeholder="Mis. Kencan pertama"
          aria-label="Nama sorotan"
          className="h-12 rounded-2xl border-2 border-tint bg-sky px-4 text-base focus:border-ocean focus:outline-none"
        />
        {error && <p className="text-sm font-semibold text-[#9b1c3a]">{error}</p>}
        <button type="submit" disabled={pending} className="btn bg-ocean text-white disabled:opacity-70">
          {pending ? "Menyimpan…" : "Buat & simpan"}
        </button>
      </form>
    </Sheet>
  );
}
