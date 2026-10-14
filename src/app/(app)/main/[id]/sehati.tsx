"use client";

import { useEffect, useRef } from "react";
import { Cat } from "@/components/cat";
import { burstHearts, centerOf, haptic, play } from "@/lib/feel";
import { SEHATI_Q, sehatiRound, sehatiScore, type SehatiState } from "@/lib/games/cards";
import type { GameCtx } from "./game-room";

function verdict(score: number) {
  if (score >= 9) return "Sehati banget! Kalian seperti satu pikiran 💞";
  if (score >= 7) return "Kompak! Hampir selalu sejalan";
  if (score >= 5) return "Lumayan sehati, sisanya bikin seru";
  if (score >= 3) return "Beda-beda, justru saling melengkapi";
  return "Kalian unik! Banyak bahan obrolan nih";
}

export function SehatiGame({ ctx }: { ctx: GameCtx<SehatiState> }) {
  const { game, me, partner } = ctx;
  const s = game.state;
  const round = sehatiRound(s);
  const total = s.qs.length;
  const finished = round >= total;
  const score = sehatiScore(s);
  const lastRound = useRef(round);

  const key = (i: number, uid: string) => `${i}:${uid}`;
  const mine = s.answers[key(round, me.id)];
  const theirs = s.answers[key(round, partner.id)];

  // Ronde baru terbuka → efek (sama = hati)
  useEffect(() => {
    if (round > lastRound.current) {
      const prev = round - 1;
      const same = s.answers[key(prev, me.id)] === s.answers[key(prev, partner.id)];
      play(same ? "chime" : "pop");
      haptic(same ? [20, 30, 40] : 15);
      if (same) burstHearts(window.innerWidth / 2, window.innerHeight / 3, 14);
    }
    lastRound.current = round;
  }, [round, s.answers, me.id, partner.id]);

  useEffect(() => {
    if (finished && game.status === "playing") ctx.finish(null, { score });
  }, [finished, game.status, score, ctx]);

  function pick(choice: 0 | 1, el: Element) {
    if (mine !== undefined || finished) return;
    const { x, y } = centerOf(el);
    burstHearts(x, y, 4);
    play("send");
    haptic(10);
    ctx.merge("answers", { [key(round, me.id)]: choice });
  }

  const prev = round - 1;
  const prevQ = prev >= 0 ? SEHATI_Q[s.qs[prev]] : null;
  const prevMine = prev >= 0 ? s.answers[key(prev, me.id)] : undefined;
  const prevTheirs = prev >= 0 ? s.answers[key(prev, partner.id)] : undefined;

  return (
    <div className="grid animate-rise gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="card flex flex-col gap-5 p-5 sm:p-8">
        {/* Progres */}
        <div className="flex items-center gap-1.5" aria-label={`Ronde ${Math.min(round + 1, total)} dari ${total}`}>
          {s.qs.map((_, i) => {
            const done = i < round;
            const same = done && s.answers[key(i, me.id)] === s.answers[key(i, partner.id)];
            return <span key={i} className={`h-2 flex-1 rounded-full ${done ? (same ? "bg-pink" : "bg-ocean-light") : i === round ? "bg-sand" : "bg-line"}`} />;
          })}
        </div>

        {!finished ? (
          <>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-sm font-bold text-muted">Ronde {round + 1} dari {total}</span>
              <h2 className="font-display text-[28px] leading-tight font-semibold sm:text-[34px]">{SEHATI_Q[s.qs[round]][0]}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2].map((opt) => {
                const choice = (opt - 1) as 0 | 1;
                const chosen = mine === choice;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={mine !== undefined}
                    onClick={(e) => pick(choice, e.currentTarget)}
                    className={`flex min-h-[110px] items-center justify-center rounded-[26px] p-5 text-center font-display text-[21px] font-semibold transition-all active:scale-[0.97] ${
                      chosen ? "bg-ocean text-white shadow-ocean" : mine !== undefined ? "bg-sky text-muted" : choice === 0 ? "bg-pink-soft hover:scale-[1.02]" : "bg-aqua-soft hover:scale-[1.02]"
                    }`}
                  >
                    {SEHATI_Q[s.qs[round]][opt]}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-3 rounded-[20px] bg-sky px-4 py-3 text-sm">
              <Cat variant="boba" size={40} motion={theirs !== undefined ? "hop" : "bob"} mood={theirs !== undefined ? "joy" : "sleepy"} />
              <span className="font-semibold text-ink-soft">
                {mine === undefined
                  ? theirs !== undefined
                    ? `${partner.name} sudah memilih 🤫 giliranmu!`
                    : "Pilih jawabanmu. Jawaban baru terbuka setelah kalian berdua memilih."
                  : `Menunggu ${partner.name} memilih…`}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="font-display text-[72px] leading-none font-semibold text-ocean">
              {score}
              <span className="text-3xl text-muted">/{total}</span>
            </span>
            <p className="font-display text-xl font-medium">{verdict(score)}</p>
          </div>
        )}

        {prevQ && !finished && (
          <div key={prev} className="flex animate-rise items-center gap-3 rounded-[20px] border-2 border-dashed border-line p-3 text-sm">
            <span className="text-2xl">{prevMine === prevTheirs ? "💞" : "🙈"}</span>
            <span className="text-ink-soft">
              <b className="text-navy">{prevQ[0]}:</b> kamu <b>{prevQ[(prevMine ?? 0) + 1]}</b>, {partner.name} <b>{prevQ[(prevTheirs ?? 0) + 1]}</b>
              {prevMine === prevTheirs ? " · sama!" : " · beda, coba ceritakan kenapa"}
            </span>
          </div>
        )}
      </div>

      <aside className="card flex flex-col gap-2 p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-lg font-medium">Jawaban kalian</span>
          <span className="text-sm font-bold text-pink">{sehatiScore(s, round)} sama</span>
        </div>
        {round === 0 && <p className="text-sm text-muted">Jawaban muncul di sini setelah setiap ronde terbuka.</p>}
        {s.qs.slice(0, round).map((qi, i) => {
          const q = SEHATI_Q[qi];
          const a = s.answers[key(i, me.id)];
          const b = s.answers[key(i, partner.id)];
          return (
            <div key={i} className={`flex flex-col rounded-[14px] px-3 py-2 text-[13px] ${a === b ? "bg-pink-soft" : "bg-sky"}`}>
              <span className="font-bold">{q[0]}</span>
              <span className="text-ink-soft">
                Kamu: {q[(a ?? 0) + 1]} · {partner.name}: {q[(b ?? 0) + 1]}
              </span>
            </div>
          );
        })}
      </aside>
    </div>
  );
}
