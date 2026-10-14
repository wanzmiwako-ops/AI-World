"use client";

import { useActionState, useEffect, useState } from "react";
import { createMeeting } from "../kalender/actions";
import { Icon } from "@/components/icon";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { IDEAS, type Idea } from "@/lib/ideas";

const SUASANA = ["Semua", "Santai", "Seru", "Romantis"] as const;
const BUDGET = ["Semua", "Hemat", "Sedang", "Spesial"] as const;

function ScheduleForm({ idea, onDone }: { idea: Idea; onDone: () => void }) {
  const [state, action] = useActionState(createMeeting, undefined);
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onDone, 1200);
      return () => clearTimeout(t);
    }
  }, [state, onDone]);
  return (
    <form action={action} className="flex animate-rise flex-col gap-3 rounded-[20px] bg-sky p-4">
      <input type="hidden" name="title" value={idea.title} />
      <input type="hidden" name="note" value={idea.desc} />
      <label htmlFor={`when-${idea.id}`} className="label">Kapan?</label>
      <input id={`when-${idea.id}`} name="starts_at" type="datetime-local" required className="field" />
      <FormMessage state={state} />
      <SubmitButton pendingText="Menyimpan…">Masukkan ke kalender</SubmitButton>
    </form>
  );
}

export function IdeasView() {
  const [suasana, setSuasana] = useState<(typeof SUASANA)[number]>("Semua");
  const [budget, setBudget] = useState<(typeof BUDGET)[number]>("Semua");
  const [picked, setPicked] = useState<number | null>(null);
  const [scheduling, setScheduling] = useState<number | null>(null);
  const [rolls, setRolls] = useState(0);

  const list = IDEAS.filter(
    (i) => (suasana === "Semua" || i.suasana === suasana) && (budget === "Semua" || i.budget === budget),
  ).sort((a, b) => Number(b.id === picked) - Number(a.id === picked));

  function shuffle() {
    if (!list.length) return;
    const pool = list.length > 1 ? list.filter((i) => i.id !== picked) : list;
    setPicked(pool[Math.floor(Math.random() * pool.length)].id);
    setRolls((r) => r + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={shuffle}
        className="flex min-h-[68px] animate-rise items-center gap-4 rounded-[26px] bg-sand px-5 text-left font-display text-[19px] font-semibold transition-transform active:scale-[0.98]"
      >
        <span
          key={rolls}
          className="flex size-11 items-center justify-center rounded-[14px] bg-white"
          style={{ animation: rolls ? "wiggle 0.5s ease 2" : "wiggle 2.6s ease-in-out infinite" }}
        >
          <Icon name="dice" size={24} />
        </span>
        Bingung? Kocok ide!
      </button>

      <div className="flex flex-col gap-2.5">
        {[
          { opts: SUASANA, value: suasana, set: setSuasana, all: "Semua suasana" },
          { opts: BUDGET, value: budget, set: setBudget, all: "Semua budget" },
        ].map((g, gi) => (
          <div key={gi} className="scroll-row -mx-4 flex gap-2 px-4 pb-1 sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0">
            {g.opts.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={g.value === o}
                onClick={() => {
                  (g.set as (v: string) => void)(o);
                  setPicked(null);
                }}
                className="chip"
              >
                {o === "Semua" ? g.all : o}
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="text-sm text-muted">{list.length ? `${list.length} ide cocok buat kalian` : "Belum ada yang cocok. Coba longgarkan filter."}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((idea) => (
          <article
            key={idea.id}
            className={`card flex flex-col gap-3 border-[2.5px] p-5 ${idea.id === picked ? "animate-pop border-ocean" : "border-transparent"}`}
          >
            {idea.id === picked && (
              <span className="self-start rounded-lg bg-ocean px-2.5 py-1 text-xs font-bold text-white">Terpilih buat kalian!</span>
            )}
            <div className="flex items-start gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <h3 className="font-display text-xl leading-tight font-medium">{idea.title}</h3>
                <p className="text-sm text-ink-soft">{idea.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setScheduling(scheduling === idea.id ? null : idea.id)}
                aria-label={`Jadwalkan ${idea.title}`}
                aria-expanded={scheduling === idea.id}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-tint text-ocean"
              >
                <Icon name={scheduling === idea.id ? "close" : "plus"} size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[`${idea.tempat} ruangan`, idea.budget, idea.dur].map((t) => (
                <span key={t} className="rounded-lg bg-sky px-2.5 py-1 text-xs font-bold text-ink-soft">{t}</span>
              ))}
            </div>
            {scheduling === idea.id && <ScheduleForm idea={idea} onDone={() => setScheduling(null)} />}
          </article>
        ))}
      </div>
    </div>
  );
}
