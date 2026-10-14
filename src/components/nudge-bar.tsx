"use client";

import { useState, useTransition } from "react";
import { sendNudge } from "@/app/(app)/live-actions";
import { attempt } from "@/lib/offline";
import { burstHearts, centerOf, haptic, play } from "@/lib/feel";
import { getLive, useLiveEvent } from "@/lib/live";

const KINDS = [
  {
    kind: "kangen",
    label: "Kangen",
    bg: "bg-pink-soft",
    fg: "text-[#C2264B]",
    // tapak kucing
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <ellipse cx="12" cy="16" rx="5" ry="4.2" />
        <circle cx="6" cy="10" r="2.1" />
        <circle cx="9.6" cy="6.6" r="2.1" />
        <circle cx="14.4" cy="6.6" r="2.1" />
        <circle cx="18" cy="10" r="2.1" />
      </svg>
    ),
  },
  {
    kind: "peluk",
    label: "Peluk",
    bg: "bg-aqua-soft",
    fg: "text-aqua-ink",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19s-6-3.6-7.7-7.2C3 9 4.6 6 7.6 6c1.7 0 2.9 1 4.4 2.4C13.5 7 14.7 6 16.4 6c3 0 4.6 3 3.3 5.8C18 15.4 12 19 12 19z" />
        <path d="M2 13c2 1 3.5 2.5 4.5 4.5M22 13c-2 1-3.5 2.5-4.5 4.5" />
      </svg>
    ),
  },
  {
    kind: "cium",
    label: "Cium",
    bg: "bg-[#FFE3EA]",
    fg: "text-[#B0193F]",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 9.2c1.5-1.8 3.2-2.4 4.6-2.2 1.7.3 3.4 1.7 5.4 4.6-2.6.6-4.3 2.7-5.6 4.4-1.2 1.5-2.6 2.5-4.4 2.5s-3.2-1-4.4-2.5C6.3 14.3 4.6 12.2 2 11.6 4 8.7 5.7 7.3 7.4 7c1.4-.2 3.1.4 4.6 2.2z" />
      </svg>
    ),
  },
  {
    kind: "semangat",
    label: "Semangat",
    bg: "bg-sand-soft",
    fg: "text-sand-ink",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.5l2.6 6.1 6.6.5-5 4.3 1.5 6.5L12 16.4 6.3 19.9l1.5-6.5-5-4.3 6.6-.5z" />
      </svg>
    ),
  },
] as const;

/** Kirim rasa ke pasangan dengan satu ketukan. Pasangan langsung dapat kejutan di layarnya. */
export function NudgeBar({ partnerName, mine, theirs }: { partnerName: string; mine: number; theirs: number }) {
  const [counts, setCounts] = useState({ mine, theirs });
  const [cooling, setCooling] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [, start] = useTransition();

  useLiveEvent("nudge", (p) => {
    const meId = getLive().me?.id;
    if (p.by === meId) return;
    setCounts((c) => ({ ...c, theirs: c.theirs + 1 }));
  });

  function send(kind: string, el: HTMLElement) {
    if (cooling === kind) return;
    const { x, y } = centerOf(el);
    burstHearts(x, y, 12);
    play("pop");
    haptic([10, 30, 10]);
    setCounts((c) => ({ ...c, mine: c.mine + 1 }));
    setCooling(kind);
    setSent(kind);
    setTimeout(() => setCooling(null), 2500);
    setTimeout(() => setSent((s) => (s === kind ? null : s)), 1600);
    start(async () => {
      const res = await attempt(() => sendNudge(kind));
      if ("error" in res && res.error) setCounts((c) => ({ ...c, mine: Math.max(0, c.mine - 1) }));
    });
  }

  return (
    <section className="card flex animate-rise flex-col gap-3 p-4" aria-labelledby="kirim-rasa">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 id="kirim-rasa" className="font-display text-lg font-medium">
          Kirim rasa ke {partnerName}
        </h2>
        <span className="text-xs font-semibold text-muted tabular-nums">
          hari ini {counts.mine} · {counts.theirs}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={(e) => send(k.kind, e.currentTarget)}
            aria-label={`Kirim ${k.label.toLowerCase()} ke ${partnerName}`}
            className={`tap flex flex-col items-center gap-1.5 rounded-[20px] py-3 ${k.bg} ${k.fg} ${cooling === k.kind ? "opacity-70" : ""}`}
          >
            <span key={sent === k.kind ? "sent" : "idle"} style={sent === k.kind ? { animation: "pop-in .4s cubic-bezier(.2,.9,.3,1.4) both" } : undefined}>
              {k.icon}
            </span>
            <span className="text-xs font-bold text-navy">{sent === k.kind ? "Terkirim!" : k.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
