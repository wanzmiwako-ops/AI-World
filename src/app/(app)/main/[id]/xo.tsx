"use client";

import { Cat } from "@/components/cat";
import { haptic, play } from "@/lib/feel";
import { xoFull, xoWinner, type XoState } from "@/lib/games/xo";
import type { GameCtx } from "./game-room";

function Paw({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <ellipse cx="12" cy="16" rx="5" ry="4.2" />
      <circle cx="6" cy="10" r="2.1" />
      <circle cx="9.6" cy="6.6" r="2.1" />
      <circle cx="14.4" cy="6.6" r="2.1" />
      <circle cx="18" cy="10" r="2.1" />
    </svg>
  );
}

export function XoGame({ ctx }: { ctx: GameCtx<XoState> }) {
  const { game, me, partner } = ctx;
  const s = game.state;
  const win = xoWinner(s.board);
  const draw = !win && xoFull(s.board);
  const myTurn = game.status === "playing" && game.turn === me.id;
  // pemain pertama = jejak Mochi (biru), kedua = jejak Boba (oren)
  const mark = (uid: string | null) => (uid === s.players[0] ? "text-[#2F7FD8]" : "text-[#F08A24]");
  const name = (uid: string) => (uid === me.id ? "Kamu" : partner.name);

  function tap(i: number) {
    if (!myTurn || s.board[i]) return;
    const board = s.board.slice();
    board[i] = me.id;
    const w = xoWinner(board);
    const full = xoFull(board);
    play("pop");
    haptic(12);
    void ctx.move({ ...s, board }, w || full ? null : partner.id, { done: Boolean(w || full), winner: w?.who ?? null });
  }

  return (
    <div className="grid animate-rise gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="card flex flex-col items-center gap-5 p-5 sm:p-8">
        <p className="font-display text-xl font-medium" aria-live="polite">
          {win ? `${name(win.who)} menang!` : draw ? "Seri! Kalian sama kuat" : myTurn ? "Giliranmu, pilih kotak" : `Menunggu ${partner.name}…`}
        </p>
        <div className="grid w-full max-w-[380px] grid-cols-3 gap-2.5">
          {s.board.map((cell, i) => {
            const inLine = win?.line.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-label={cell ? `Kotak ${i + 1}: ${name(cell)}` : `Kotak ${i + 1} kosong`}
                disabled={!myTurn || Boolean(cell)}
                onClick={() => tap(i)}
                className={`flex aspect-square items-center justify-center rounded-[22px] transition-all ${
                  inLine ? "bg-sand" : cell ? "bg-sky" : myTurn ? "bg-tint hover:bg-aqua-soft active:scale-95" : "bg-sky"
                }`}
              >
                {cell && (
                  <span className={`${mark(cell)} size-[62%]`} style={{ animation: "pop-in .35s cubic-bezier(.2,.9,.3,1.4) both" }}>
                    <Paw className="size-full" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="card flex flex-col gap-3 p-5">
        {s.players.map((uid, i) => (
          <div key={uid} className={`flex items-center gap-3 rounded-[20px] p-3 ${game.turn === uid ? "bg-tint" : ""}`}>
            <Cat variant={i === 0 ? "mochi" : "boba"} size={46} motion={game.turn === uid ? "hop" : "none"} mood={win ? (win.who === uid ? "joy" : "sad") : "happy"} />
            <div className="flex flex-col">
              <span className="font-bold">{name(uid)}</span>
              <span className={`flex items-center gap-1 text-[13px] ${mark(uid)}`}>
                <Paw className="size-4" /> jejak {i === 0 ? "Mochi" : "Boba"}
              </span>
            </div>
          </div>
        ))}
        <p className="text-[13px] text-muted">Tiga jejak sejajar (mendatar, menurun, atau miring) menang.</p>
      </aside>
    </div>
  );
}
