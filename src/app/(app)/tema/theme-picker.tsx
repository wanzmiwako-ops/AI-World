"use client";

import { useState, useTransition } from "react";
import { saveTheme } from "./actions";
import { attempt } from "@/lib/offline";
import { CatPair } from "@/components/cat";
import { Icon } from "@/components/icon";
import { burstHearts, centerOf, haptic, play } from "@/lib/feel";
import { setLive, useLive } from "@/lib/live";
import { applyTheme, isThemeId, THEMES, type ThemeId } from "@/lib/themes";

export function ThemePicker({ initial, partnerName }: { initial: string; partnerName: string }) {
  const live = useLive((s) => (s.ready ? s.theme : null));
  const [picked, setPicked] = useState<string | null>(null);
  const current = picked ?? live ?? initial;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function choose(id: ThemeId, el: Element) {
    if (id === current) return;
    const prev = current;
    setPicked(id);
    setError(null);
    applyTheme(id);
    setLive({ theme: id });
    const { x, y } = centerOf(el);
    burstHearts(x, y, 10);
    play("chime");
    haptic([10, 30, 10]);
    start(async () => {
      const res = await attempt(() => saveTheme(id));
      if ("error" in res && res.error) {
        setError(res.error);
        setPicked(prev);
        if (isThemeId(prev)) {
          applyTheme(prev);
          setLive({ theme: prev });
        }
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p role="alert" className="rounded-2xl bg-pink-soft px-4 py-3 text-sm font-semibold text-[#9b1c3a]">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {THEMES.map((t, i) => {
          const active = t.id === current;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={(e) => choose(t.id, e.currentTarget)}
              disabled={pending && !active}
              className={`group flex animate-rise flex-col overflow-hidden rounded-[28px] bg-white text-left shadow-soft transition-all hover:-translate-y-0.5 active:scale-[0.98] ${
                active ? "ring-4 ring-offset-2 ring-offset-sky" : ""
              }`}
              style={{ animationDelay: `${i * 40}ms`, ...(active ? { ["--tw-ring-color" as string]: t.colors.primary } : {}) }}
            >
              {/* Pratinjau mini */}
              <span
                className="relative flex h-[132px] items-end justify-between overflow-hidden p-4"
                style={{ background: `linear-gradient(135deg, ${t.colors.dark}, ${t.colors.primary})` }}
              >
                <span aria-hidden="true" className="absolute -top-10 -right-8 size-36 rounded-full opacity-40" style={{ background: t.colors.accent }} />
                {t.deco.map((d, j) => (
                  <span
                    key={j}
                    aria-hidden="true"
                    className="absolute text-xl"
                    style={{ left: `${12 + j * 26}%`, top: `${14 + ((j * 37) % 40)}%`, animation: `bob ${3 + j * 0.5}s ease-in-out ${j * 0.3}s infinite` }}
                  >
                    {d}
                  </span>
                ))}
                <span className="relative">
                  <CatPair size={46} motion={active ? "hop" : "none"} />
                </span>
                <span aria-hidden="true" className="relative text-[56px] leading-none transition-transform group-hover:scale-110">
                  {t.art}
                </span>
              </span>
              <span className="flex items-center gap-3 p-4" style={{ background: t.colors.bg }}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-lg font-semibold" style={{ color: t.colors.dark }}>
                    {t.name}
                  </span>
                  <span className="truncate text-[13px] text-muted">{t.tagline}</span>
                </span>
                {active ? (
                  <span className="flex size-8 items-center justify-center rounded-full text-white" style={{ background: t.colors.primary }}>
                    <Icon name="check" size={18} />
                  </span>
                ) : (
                  <span className="flex gap-1">
                    {[t.colors.primary, t.colors.accent].map((c) => (
                      <span key={c} className="size-4 rounded-full border-2 border-white" style={{ background: c }} />
                    ))}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-sm text-muted">Tema berlaku untuk kalian berdua. {partnerName} langsung melihat perubahannya.</p>
    </div>
  );
}
