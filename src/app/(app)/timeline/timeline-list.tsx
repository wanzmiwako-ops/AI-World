"use client";

import Link from "next/link";
import { useState } from "react";
import { Cat } from "@/components/cat";
import { play } from "@/lib/feel";

export type TimelineEvent = {
  key: string;
  at: string;
  kind: "ketemu" | "foto" | "momen";
  emoji: string;
  title: string;
  sub?: string;
  href?: string;
  thumbs?: string[];
  special?: boolean;
  tall?: boolean;
};

const FILTERS = [
  { id: "semua", label: "Semua ✨" },
  { id: "ketemu", label: "Ketemu 📍" },
  { id: "foto", label: "Foto 📸" },
  { id: "momen", label: "Momen 💞" },
] as const;

const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const dayFmt = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" });

const DOT: Record<TimelineEvent["kind"], string> = { ketemu: "bg-aqua-soft", foto: "bg-tint", momen: "bg-pink-soft" };

export function TimelineList({ events, plain = false }: { events: TimelineEvent[]; plain?: boolean }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("semua");
  const [limit, setLimit] = useState(30);
  const list = filter === "semua" ? events : events.filter((e) => e.kind === filter);
  const shown = list.slice(0, limit);

  return (
    <section className="flex flex-col gap-4">
      <div className={`scroll-row flex gap-2 ${plain ? "hidden" : ""}`}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              setLimit(30);
              play("tap");
            }}
            className="chip shrink-0"
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Cat variant="mochi" size={90} mood="happy" />
          <p className="text-sm text-muted">Belum ada cerita di sini. Yuk bikin kenangan baru!</p>
        </div>
      ) : (
        <ol className="relative flex flex-col gap-3 pl-11">
          <span aria-hidden="true" className="absolute top-2 bottom-2 left-[19px] w-[3px] rounded-full" style={{ background: "linear-gradient(var(--color-pink), var(--color-aqua), var(--color-ocean))" }} />
          {shown.map((e, i) => {
            const month = monthFmt.format(new Date(e.at));
            const showMonth = i === 0 || monthFmt.format(new Date(shown[i - 1].at)) !== month;
            const body = (
              <>
                <span className="text-[11px] font-bold tracking-wide text-muted uppercase">{dayFmt.format(new Date(e.at))}</span>
                <span className={`font-bold ${e.special ? "font-display text-lg" : ""}`}>{e.title}</span>
                {e.sub && <span className="line-clamp-2 text-[13px] text-ink-soft">{e.sub}</span>}
                {e.thumbs && e.thumbs.length > 0 && (
                  <span className="mt-1 flex gap-1.5">
                    {e.thumbs.map((u, j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={u}
                        src={u}
                        alt=""
                        loading="lazy"
                        className={`${e.tall ? "h-24 w-[54px]" : "size-16"} rounded-xl bg-tint object-cover`}
                        style={{ transform: `rotate(${(j % 2 ? 1 : -1) * 2}deg)` }}
                      />
                    ))}
                  </span>
                )}
              </>
            );
            const card = `flex flex-col gap-0.5 rounded-[22px] p-4 ${e.special ? "hero text-white" : "card"}`;
            return (
              <li key={e.key} className="relative flex flex-col gap-3" style={{ animation: `rise .45s ease ${Math.min(i, 10) * 0.04}s both` }}>
                {showMonth && <span className="-ml-11 self-start rounded-full bg-navy px-3 py-1 text-xs font-bold text-white first-letter:uppercase">{month}</span>}
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute top-3 -left-11 flex size-10 items-center justify-center rounded-full border-[3px] border-sky text-lg shadow-soft ${e.special ? "bg-sand" : DOT[e.kind]}`}
                    style={e.special ? { animation: "beat 2.4s ease-in-out infinite" } : undefined}
                  >
                    {e.emoji}
                  </span>
                  {e.href?.startsWith("http") ? (
                    <a href={e.href} target="_blank" rel="noopener noreferrer" className={`tap ${card}`}>
                      {body}
                    </a>
                  ) : e.href ? (
                    <Link href={e.href} className={`tap ${card}`}>
                      {body}
                    </Link>
                  ) : (
                    <div className={card}>{body}</div>
                  )}
                </div>
              </li>
            );
          })}
          {shown.length === list.length && filter === "semua" && !plain && (
            <li className="relative flex items-center gap-3 pt-2">
              <span className="absolute -left-11">
                <Cat variant="mochi" size={44} mood="love" motion="bob" />
              </span>
              <span className="text-sm font-bold text-muted">Di sinilah semuanya dimulai 🐾</span>
            </li>
          )}
        </ol>
      )}

      {list.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 30)} className="chip self-center">
          Lihat lebih banyak ({list.length - limit})
        </button>
      )}
    </section>
  );
}
