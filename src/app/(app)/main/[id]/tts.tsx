"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { haptic, play } from "@/lib/feel";
import { broadcast, useLiveEvent } from "@/lib/live";
import { isSolved, solution, wordCells, type TtsState, type TtsWord } from "@/lib/games/tts";
import type { GameCtx } from "./game-room";

export function TtsGame({ ctx }: { ctx: GameCtx<TtsState> }) {
  const { game, me, partner } = ctx;
  const s = game.state;
  const cells = useMemo(() => s.cells ?? {}, [s.cells]);
  const sol = useMemo(() => solution(s), [s]);
  const playing = game.status === "playing";
  const [sel, setSel] = useState<{ word: number; pos: number }>({ word: 0, pos: 0 });
  const [partnerCell, setPartnerCell] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const word = s.words[sel.word];
  const selCells = word ? wordCells(word) : [];
  const selKey = selCells[sel.pos];

  // Nomor di pojok sel
  const numbers = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of s.words) m.set(`${w.r},${w.c}`, w.n);
    return m;
  }, [s.words]);

  const filled = [...sol.keys()].filter((k) => cells[k]?.l).length;
  const total = sol.size;
  const correct = [...sol].filter(([k, l]) => cells[k]?.l === l).length;

  // Kursor pasangan
  useLiveEvent("game_cursor", (p) => {
    if (p.id === game.id && p.by !== me.id) setPartnerCell(String(p.cell ?? ""));
  });
  useEffect(() => {
    if (selKey) broadcast("events", "game_cursor", { id: game.id, cell: selKey, by: me.id });
  }, [selKey, game.id, me.id]);

  // Semua benar → selesai
  useEffect(() => {
    if (playing && total > 0 && isSolved(s, sol)) ctx.finish(null, { solved: true });
  }, [playing, s, sol, total, ctx]);

  function focusInput() {
    inputRef.current?.focus({ preventScroll: true });
  }

  function selectCell(key: string) {
    const owners = s.words
      .map((w, i) => ({ w, i, pos: wordCells(w).indexOf(key) }))
      .filter((x) => x.pos >= 0);
    if (!owners.length) return;
    // ketuk sel yang sama → ganti arah (mendatar ↔ menurun)
    const same = selKey === key;
    const pick = same && owners.length > 1 ? (owners.find((o) => o.i !== sel.word) ?? owners[0]) : (owners.find((o) => o.i === sel.word) ?? owners[0]);
    setSel({ word: pick.i, pos: pick.pos });
    play("tap");
    focusInput();
  }

  function selectWord(i: number) {
    const w = s.words[i];
    const cs = wordCells(w);
    const firstEmpty = cs.findIndex((k) => !cells[k]?.l);
    setSel({ word: i, pos: firstEmpty >= 0 ? firstEmpty : 0 });
    play("tap");
    focusInput();
  }

  function type(letter: string) {
    if (!playing || !selKey) return;
    ctx.merge("cells", { [selKey]: { l: letter, by: me.id } });
    haptic(6);
    if (sel.pos < selCells.length - 1) setSel({ ...sel, pos: sel.pos + 1 });
  }

  function erase() {
    if (!playing || !selKey) return;
    if (cells[selKey]?.l) {
      ctx.merge("cells", { [selKey]: { l: "", by: me.id } });
    } else if (sel.pos > 0) {
      const prevKey = selCells[sel.pos - 1];
      ctx.merge("cells", { [prevKey]: { l: "", by: me.id } });
      setSel({ ...sel, pos: sel.pos - 1 });
    }
  }

  function hint() {
    if (!playing || !selKey) return;
    const answer = sol.get(selKey);
    if (!answer) return;
    ctx.merge("cells", { [selKey]: { l: answer, by: "hint" } });
    play("ding");
    if (sel.pos < selCells.length - 1) setSel({ ...sel, pos: sel.pos + 1 });
  }

  const across = s.words.map((w, i) => ({ w, i })).filter((x) => x.w.dir === "a");
  const down = s.words.map((w, i) => ({ w, i })).filter((x) => x.w.dir === "d");

  function cellClass(key: string) {
    const v = cells[key];
    const wrong = checking && v?.l && v.l !== sol.get(key);
    if (key === selKey) return "bg-sand ring-[3px] ring-ocean z-10";
    if (wrong) return "bg-pink-soft text-[#9b1c3a]";
    if (selCells.includes(key)) return "bg-aqua-soft";
    if (key === partnerCell) return "bg-pink-soft ring-2 ring-pink";
    return "bg-white";
  }

  function letterColor(key: string) {
    const by = cells[key]?.by;
    if (by === "hint") return "text-muted";
    return by === me.id ? "text-ocean" : "text-[#D6336C]";
  }

  const clues = (list: { w: TtsWord; i: number }[], title: string) => (
    <div className="flex flex-col gap-1">
      <h3 className="px-1 font-display text-base font-medium">{title}</h3>
      {list.map(({ w, i }) => {
        const done = wordCells(w).every((k) => cells[k]?.l === sol.get(k));
        return (
          <button
            key={i}
            type="button"
            onClick={() => selectWord(i)}
            className={`flex gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
              i === sel.word ? "bg-tint font-semibold" : "hover:bg-sky"
            } ${done ? "text-muted line-through" : ""}`}
          >
            <b className="w-5 shrink-0 text-ocean">{w.n}</b>
            <span>
              {w.clue} <span className="text-muted">({w.answer.length})</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="grid animate-rise gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="card flex flex-col gap-4 p-4 sm:p-6">
        {/* Petunjuk aktif */}
        {word && (
          <div className="flex items-center gap-3 rounded-[18px] bg-tint px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ocean font-display font-semibold text-white">{word.n}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-bold text-muted">{word.dir === "a" ? "Mendatar" : "Menurun"} · {word.answer.length} huruf</span>
              <span className="font-semibold">{word.clue}</span>
            </div>
          </div>
        )}

        {/* Papan */}
        <div className="relative mx-auto w-full" style={{ maxWidth: Math.min(520, s.w * 52) }}>
          <div
            className="grid gap-[3px] rounded-[16px] bg-line p-[3px]"
            style={{ gridTemplateColumns: `repeat(${s.w}, minmax(0, 1fr))` }}
            onClick={focusInput}
          >
            {Array.from({ length: s.h * s.w }).map((_, idx) => {
              const r = Math.floor(idx / s.w);
              const c = idx % s.w;
              const key = `${r},${c}`;
              if (!sol.has(key)) return <span key={key} className="aspect-square rounded-[6px] bg-sky" />;
              const n = numbers.get(key);
              const letter = cells[key]?.l;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`Kotak baris ${r + 1} kolom ${c + 1}${letter ? `, huruf ${letter}` : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectCell(key);
                  }}
                  className={`relative flex aspect-square items-center justify-center rounded-[6px] font-display font-semibold uppercase transition-colors ${cellClass(key)}`}
                  style={{ fontSize: "clamp(14px, 4.2vw, 24px)" }}
                >
                  {n && <span className="absolute top-0.5 left-1 text-[9px] leading-none font-bold text-muted sm:text-[10px]">{n}</span>}
                  {letter && (
                    <span key={letter} className={letterColor(key)} style={{ animation: "pop-in .25s ease both" }}>
                      {letter}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Input tersembunyi supaya keyboard HP muncul */}
          <input
            ref={inputRef}
            aria-label="Ketik huruf"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="next"
            className="absolute top-0 left-0 h-px w-px opacity-0"
            value=""
            onChange={(e) => {
              const ch = e.target.value.slice(-1).toUpperCase();
              if (/^[A-Z]$/.test(ch)) type(ch);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                e.preventDefault();
                erase();
              } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                setSel((x) => ({ ...x, pos: Math.min(x.pos + 1, selCells.length - 1) }));
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                setSel((x) => ({ ...x, pos: Math.max(x.pos - 1, 0) }));
              } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                selectWord((sel.word + 1) % s.words.length);
              }
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 items-center gap-3 text-[13px] text-muted">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-ocean" /> Kamu</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-[#D6336C]" /> {partner.name}</span>
            <span>{filled}/{total} terisi</span>
          </div>
          {playing && (
            <>
              <button type="button" className="btn bg-sky min-h-10 px-4 text-sm text-navy" onClick={() => setChecking((v) => !v)}>
                <Icon name="check" size={16} /> {checking ? "Sembunyikan" : "Cek"}
              </button>
              <button type="button" className="btn bg-sand min-h-10 px-4 text-sm text-navy" onClick={hint}>
                <Icon name="bulb" size={16} /> Bantuan
              </button>
            </>
          )}
        </div>
        {checking && playing && (
          <p className="text-sm text-ink-soft">
            {correct} dari {total} huruf sudah benar. Kotak merah muda berarti salah.
          </p>
        )}
        {!playing && <p className="text-center font-display text-lg font-medium text-ocean">TTS selesai! Kalian tim yang hebat 🧩</p>}
      </div>

      <aside className="card flex flex-col gap-4 p-4 sm:p-5 lg:max-h-[calc(100svh-140px)] lg:overflow-y-auto">
        {clues(across, "Mendatar")}
        {clues(down, "Menurun")}
      </aside>
    </div>
  );
}
