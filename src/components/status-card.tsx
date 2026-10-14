"use client";

import { useEffect, useState, useTransition } from "react";
import { setStatus } from "@/app/(app)/live-actions";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { Avatar } from "@/components/ui";
import { burstHearts, haptic, play } from "@/lib/feel";
import { setLive, useLive } from "@/lib/live";
import { attempt } from "@/lib/offline";

type Status = { text: string | null; emoji: string | null; at: string | null };
type Person = { id: string; name: string; avatar: string | null; status: Status };

const EMOJIS = ["🥰", "🥺", "😴", "😋", "🤯", "💼", "📚", "🛵", "🎮", "🍜", "☕", "🌧️", "🐱", "✨"];
const IDEAS: [string, string][] = [
  ["🥺", "Lagi kangen kamu"],
  ["💼", "Sibuk kerja, nanti kabarin ya"],
  ["🍜", "Lagi makan, jangan iri"],
  ["🛵", "OTW pulang"],
  ["😴", "Rebahan mode on"],
  ["📚", "Lagi fokus belajar"],
  ["🐱", "Butuh dielus-elus"],
  ["☕", "Ngopi dulu biar waras"],
];
const PROMPTS = ["Lagi mikirin apa nih?", "Gimana harimu?", "Kabar hati hari ini?", "Lagi ngapain, sayang?"];

function ago(iso: string | null) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

/** Waktu relatif dihitung di browser (setelah tampil) supaya server & HP tidak berbeda. */
function useAgo(iso: string | null) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => setText(ago(iso));
    const t0 = setTimeout(update, 0);
    const t = setInterval(update, 60_000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [iso]);
  return text;
}

function Row({ person, mine, onEdit }: { person: Person; mine: boolean; onEdit?: () => void }) {
  const when = useAgo(person.status.at);
  const has = Boolean(person.status.text || person.status.emoji);
  const body = (
    <>
      <Avatar name={person.name} url={person.avatar} size={44} tone={mine ? "sand" : "aqua"} className="border-white/70" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-1.5 text-[13px] font-bold">
          <span className="truncate">{mine ? `${person.name} (kamu)` : person.name}</span>
          {has && when && <span className="shrink-0 text-[11px] font-medium opacity-75">· {when}</span>}
        </span>
        <span className={`line-clamp-2 text-[14px] leading-snug ${has ? "font-semibold" : "italic opacity-80"}`}>
          {has ? (
            <>
              {person.status.emoji && <span className="mr-1">{person.status.emoji}</span>}
              {person.status.text}
            </>
          ) : mine ? (
            "Ketuk untuk pasang status…"
          ) : (
            "Belum pasang status"
          )}
        </span>
      </span>
      {mine && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Icon name="sparkle" size={16} />
        </span>
      )}
    </>
  );
  if (!mine) return <div className="flex items-center gap-3 rounded-[20px] bg-white/12 px-3 py-2.5">{body}</div>;
  return (
    <button type="button" onClick={onEdit} className="tap flex items-center gap-3 rounded-[20px] bg-white/20 px-3 py-2.5 text-left">
      {body}
    </button>
  );
}

/** Status "Lagi mikirin apa?" berdua, tampil di kartu biru Beranda. */
export function StatusCard({ me: meProp, partner: partnerProp }: { me: Person; partner: Person | null }) {
  // Status dari realtime (kalau ada) selalu lebih baru daripada data saat halaman dimuat
  const statuses = useLive((s) => s.statuses);
  const [mine, setMine] = useState<Status | null>(null);
  const me: Person = { ...meProp, status: mine ?? statuses[meProp.id] ?? meProp.status };
  const partner: Person | null = partnerProp ? { ...partnerProp, status: statuses[partnerProp.id] ?? partnerProp.status } : null;
  const meInit = meProp;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(meInit.status.text ?? "");
  const [emoji, setEmoji] = useState<string | null>(meInit.status.emoji);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [prompt, setPrompt] = useState(PROMPTS[0]);

  function openEditor() {
    setText(me.status.text ?? "");
    setEmoji(me.status.emoji);
    setError(null);
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    setOpen(true);
    play("tap");
  }

  function save(nextText: string, nextEmoji: string | null) {
    setError(null);
    start(async () => {
      const res = await attempt(() => setStatus(nextText, nextEmoji));
      if ("error" in res && res.error) {
        setError(res.error);
        play("error");
        return;
      }
      if ("status" in res && res.status) {
        const st = res.status;
        setMine(st);
        setLive((s) => ({ statuses: { ...s.statuses, [meProp.id]: st } }));
      }
      setOpen(false);
      if (nextText.trim() || nextEmoji) {
        play("pop");
        haptic([10, 30, 10]);
        burstHearts(window.innerWidth / 2, window.innerHeight / 2, 10);
      }
    });
  }

  return (
    <>
      <div className="relative flex flex-col gap-2">
        <Row person={me} mine onEdit={openEditor} />
        {partner && <Row person={partner} mine={false} />}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={prompt}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save(text, emoji);
          }}
        >
          <div className="flex items-center gap-2 rounded-[20px] bg-white p-2 shadow-soft">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-tint text-2xl">{emoji ?? "💭"}</span>
            <label htmlFor="status-text" className="sr-only">
              Status
            </label>
            <input
              id="status-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={80}
              autoComplete="off"
              placeholder="Tulis yang lagi kamu rasain…"
              className="min-w-0 flex-1 bg-transparent px-1 text-base focus:outline-none"
            />
            <span className="shrink-0 pr-1 text-xs text-muted tabular-nums">{text.length}/80</span>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pilih emoji">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={emoji === e}
                onClick={() => setEmoji(emoji === e ? null : e)}
                className={`flex size-11 items-center justify-center rounded-2xl text-xl transition-transform ${emoji === e ? "scale-110 bg-ocean shadow-ocean" : "bg-white shadow-soft"}`}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="label">Ide cepat</span>
            <div className="flex flex-wrap gap-2">
              {IDEAS.map(([e, t]) => (
                <button
                  key={t}
                  type="button"
                  className="chip min-h-9 text-[13px]"
                  onClick={() => {
                    setText(t);
                    setEmoji(e);
                  }}
                >
                  {e} {t}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-pink-soft px-4 py-3 text-sm font-semibold text-[#9b1c3a]">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {(me.status.text || me.status.emoji) && (
              <button type="button" disabled={pending} className="btn bg-white px-5 text-navy shadow-soft" onClick={() => save("", null)}>
                Hapus
              </button>
            )}
            <button type="submit" disabled={pending || (!text.trim() && !emoji)} className="btn btn-primary flex-1">
              {pending ? "Menyimpan…" : "Pasang status"}
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
