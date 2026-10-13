"use client";

import { useOptimistic, useTransition } from "react";
import { setMood } from "./actions";
import { Cat, type CatMood } from "@/components/cat";
import { MOOD_LABELS_CLIENT, SAYINGS } from "./labels";

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

  return (
    <section className="flex animate-rise flex-col gap-4 rounded-[26px] bg-aqua-soft p-5">
      <div className="flex items-center gap-3">
        <span className="flex shrink-0 items-end" aria-hidden="true">
          <Cat variant="mochi" size={56} mood={catMood(optimistic)} motion={optimistic === 5 ? "hop" : "bob"} />
          <Cat variant="boba" size={56} mood={catMood(partner)} motion={partner === 5 ? "hop" : "bob"} delay={0.3} className="-ml-3" />
        </span>
        <p className="flex-1 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold">{SAYINGS[optimistic ?? 0]}</p>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-medium">Mood kamu hari ini?</h2>
        <span className="text-[13px] font-bold text-aqua-ink">
          {partnerName}: {partner ? MOOD_LABELS_CLIENT[partner] : "belum isi"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={optimistic === n}
            onClick={() =>
              startTransition(async () => {
                setOptimistic(n);
                await setMood(n);
              })
            }
            className="chip"
          >
            {MOOD_LABELS_CLIENT[n]}
          </button>
        ))}
      </div>
    </section>
  );
}
