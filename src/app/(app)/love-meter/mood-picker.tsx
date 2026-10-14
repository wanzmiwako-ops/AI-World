"use client";

import { useOptimistic, useTransition } from "react";
import { setMood } from "./actions";
import { attempt } from "@/lib/offline";
import { burstHearts, centerOf, haptic, play } from "@/lib/feel";
import { Cat, type CatMood } from "@/components/cat";
import { MOOD_LABELS_CLIENT, SAYINGS } from "./labels";

const FACES = ["", "🥶", "😐", "🙂", "🥰", "😻"];

function catMood(m: number | null): CatMood {
  if (!m) return "happy";
  if (m <= 2) return "sad";
  if (m === 3) return "neutral";
  if (m === 4) return "happy";
  return "love";
}

export function MoodPicker({ mine, partner, partnerName }: { mine: number | null; partner: number | null; partnerName: string }) {
  const [optimistic, setOptimistic] = useOptimistic(mine);
  const [, startTransition] = useTransition();
  const match = optimistic && partner && optimistic === partner;

  return (
    <section className="flex animate-rise flex-col gap-4 rounded-[26px] bg-aqua-soft p-5">
      <div className="flex items-center gap-3">
        <span className="flex shrink-0 items-end" aria-hidden="true">
          <Cat variant="mochi" size={56} mood={catMood(optimistic)} motion={optimistic === 5 ? "hop" : "bob"} />
          <Cat variant="boba" size={56} mood={catMood(partner)} motion={partner === 5 ? "hop" : "bob"} delay={0.3} className="-ml-3" />
        </span>
        <p key={optimistic ?? 0} className="flex-1 rounded-2xl rounded-bl-[6px] bg-white px-4 py-2.5 text-sm font-bold" style={{ animation: "pop-in .35s ease" }}>
          {match ? "Mood kalian sama hari ini! Sehati banget 💞" : SAYINGS[optimistic ?? 0]}
        </p>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-medium">Mood kamu hari ini?</h2>
        <span className="text-[13px] font-bold text-aqua-ink">
          {partnerName}: {partner ? `${FACES[partner]} ${MOOD_LABELS_CLIENT[partner]}` : "belum isi"}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = optimistic === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              aria-label={MOOD_LABELS_CLIENT[n]}
              onClick={(e) => {
                const el = e.currentTarget;
                startTransition(async () => {
                  setOptimistic(n);
                  haptic(12);
                  if (n >= 4) {
                    const c = centerOf(el);
                    burstHearts(c.x, c.y, n === 5 ? 14 : 8);
                  }
                  const res = await attempt(() => setMood(n));
                  if ("error" in res && res.error) play("error");
                  else play(n === 5 ? "meow" : "pop");
                });
              }}
              className={`tap flex flex-col items-center gap-1 rounded-[18px] py-2.5 transition-colors ${
                on ? "bg-white shadow-soft ring-2 ring-ocean" : "bg-white/50 hover:bg-white/80"
              }`}
            >
              <span
                key={on ? "on" : "off"}
                className={`block text-[30px] leading-none ${on ? "" : "opacity-80 grayscale-[35%]"}`}
                style={on ? { animation: "beat .8s ease-out" } : undefined}
              >
                {FACES[n]}
              </span>
              <span className={`text-[11px] leading-none ${on ? "font-bold text-ocean" : "font-medium text-ink-soft"}`}>{MOOD_LABELS_CLIENT[n]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
