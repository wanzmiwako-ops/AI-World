"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui";
import { burstHearts, centerOf, haptic, play } from "@/lib/feel";
import {
  canPlay,
  COLOR_NAME,
  COLORS,
  drawCard,
  label,
  other,
  parse,
  passTurn,
  playCard,
  top,
  type Color,
  type UnoState,
} from "@/lib/games/uno";
import type { GameCtx } from "./game-room";

const BG: Record<string, string> = {
  r: "bg-[#E5484D]",
  y: "bg-[#F2B21B]",
  g: "bg-[#25A065]",
  b: "bg-[#2F7FD8]",
  w: "bg-[#1E2235]",
};
const TEXT: Record<string, string> = {
  r: "text-[#E5484D]",
  y: "text-[#C98A00]",
  g: "text-[#1E8A55]",
  b: "text-[#2F7FD8]",
};

function Wheel({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M10 10V1a9 9 0 0 1 9 9z" fill="#E5484D" />
      <path d="M10 10h9a9 9 0 0 1-9 9z" fill="#F2B21B" />
      <path d="M10 10v9a9 9 0 0 1-9-9z" fill="#25A065" />
      <path d="M10 10H1a9 9 0 0 1 9-9z" fill="#2F7FD8" />
    </svg>
  );
}

export function UnoCard({ card, size = "md", dim = false, lift = false }: { card: string; size?: "sm" | "md" | "lg"; dim?: boolean; lift?: boolean }) {
  const { c, v } = parse(card);
  const text = label(card);
  const dims = size === "lg" ? "h-[150px] w-[104px] rounded-[18px]" : size === "sm" ? "h-[76px] w-[52px] rounded-[12px]" : "h-[112px] w-[78px] rounded-[16px]";
  const big = size === "lg" ? "text-[40px]" : size === "sm" ? "text-[20px]" : "text-[30px]";
  const small = size === "lg" ? "text-[30px]" : size === "sm" ? "text-[15px]" : "text-[22px]";
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center border-[3px] border-white font-display font-semibold text-white shadow-[0_6px_16px_rgba(11,37,69,0.18)] transition-all duration-200 ${dims} ${BG[c]} ${
        dim ? "opacity-45 saturate-50" : ""
      } ${lift ? "-translate-y-2" : ""}`}
    >
      <span className="absolute top-1 left-1.5 max-w-[80%] truncate text-[10px] leading-none">{c === "w" && v === "w" ? "" : text}</span>
      <span className={`flex aspect-[3/4] w-[74%] -rotate-12 items-center justify-center rounded-[50%] bg-white ${c === "w" ? "" : TEXT[c]}`}>
        {c === "w" ? (
          <span className="flex rotate-12 flex-col items-center">
            <Wheel className={size === "sm" ? "size-6" : "size-9"} />
            {v === "4" && <span className="font-display text-base leading-none text-[#1E2235]">+4</span>}
          </span>
        ) : (
          <span className={`rotate-12 leading-none ${v === "d" ? small : big}`}>{v === "s" ? "⊘" : v === "r" ? "⇄" : text}</span>
        )}
      </span>
    </span>
  );
}

function CardBack({ className = "" }: { className?: string }) {
  return (
    <span className={`flex h-[64px] w-[44px] shrink-0 items-center justify-center rounded-[10px] border-[3px] border-white bg-navy shadow-soft ${className}`}>
      <span className="font-display text-[11px] font-bold text-sand">A&I</span>
    </span>
  );
}

export function UnoGame({ ctx }: { ctx: GameCtx<UnoState> }) {
  const { game, me, partner } = ctx;
  const s = game.state;
  const [pickColorFor, setPickColorFor] = useState<number | null>(null);
  const myTurn = game.status === "playing" && game.turn === me.id;
  const hand = s.hands[me.id] ?? [];
  const opp = other(s, me.id);
  const oppCount = s.hands[opp]?.length ?? 0;
  const topCard = top(s);
  const last = s.last;

  function doPlay(index: number, chosen?: Color, el?: Element | null) {
    const r = playCard(s, me.id, index, chosen);
    if (!r) {
      play("error");
      haptic([20, 40, 20]);
      return;
    }
    play(r.winner ? "chime" : "send");
    haptic(14);
    if (el) {
      const { x, y } = centerOf(el);
      burstHearts(x, y, r.winner ? 16 : 5);
    }
    setPickColorFor(null);
    void ctx.move(r.state, r.turn, { done: Boolean(r.winner), winner: r.winner });
  }

  function tapCard(index: number, el: Element) {
    if (!myTurn) return;
    const card = hand[index];
    if (!canPlay(s, card) || (s.drawn && card !== s.drawn)) {
      play("error");
      haptic([20, 40, 20]);
      return;
    }
    if (parse(card).c === "w") {
      setPickColorFor(index);
      play("tap");
      return;
    }
    doPlay(index, undefined, el);
  }

  const whoText = (uid: string) => (uid === me.id ? "Kamu" : partner.name);
  const status =
    game.status === "done"
      ? game.winner === me.id
        ? "Kartumu habis. Menang!"
        : `${partner.name} menang!`
      : myTurn
        ? s.drawn
          ? "Kartu yang kamu ambil bisa dimainkan. Mainkan atau lewati?"
          : "Giliranmu! Mainkan kartu yang cocok atau ambil 1"
        : `Menunggu ${partner.name}…`;

  return (
    <div className="grid animate-rise gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
      <div className="card flex flex-col gap-5 overflow-hidden p-4 sm:p-6">
        {/* Lawan */}
        <div className="flex items-center gap-3">
          <Avatar name={partner.name} url={partner.avatar} size={44} tone="aqua" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-bold">{partner.name}</span>
            <span className="text-[13px] text-muted">{oppCount} kartu</span>
          </div>
          {oppCount === 1 && game.status === "playing" && (
            <span className="rounded-full bg-pink px-3 py-1 font-display text-sm font-bold text-white" style={{ animation: "beat 1.4s ease-in-out infinite" }}>
              UNO!
            </span>
          )}
        </div>
        <div className="flex justify-center">
          {Array.from({ length: Math.min(oppCount, 12) }).map((_, i) => (
            <CardBack key={i} className={i ? "-ml-6" : ""} />
          ))}
        </div>

        {/* Meja */}
        <div className="flex items-center justify-center gap-6 rounded-[24px] bg-sky py-5">
          <button
            type="button"
            disabled={!myTurn || Boolean(s.drawn)}
            onClick={() => {
              play("tap");
              haptic(10);
              const r = drawCard(s, me.id);
              void ctx.move(r.state, r.turn);
            }}
            className="tap flex flex-col items-center gap-1.5 disabled:opacity-60"
            aria-label="Ambil 1 kartu"
          >
            <span className="relative">
              <CardBack className="h-[112px] w-[78px] rounded-[16px]" />
              <span className="absolute -top-1 -right-1 rounded-full bg-white px-1.5 text-[11px] font-bold text-muted shadow-soft">{s.deck.length}</span>
            </span>
            <span className="text-xs font-bold text-ink-soft">Ambil</span>
          </button>
          <div className="flex flex-col items-center gap-1.5">
            <span key={s.pile.length} style={{ animation: "pop-in .35s cubic-bezier(.2,.9,.3,1.3) both" }}>
              <UnoCard card={topCard} size="lg" />
            </span>
            <span className={`flex items-center gap-1.5 text-xs font-bold ${TEXT[s.color]}`}>
              <span className={`size-3 rounded-full ${BG[s.color]}`} /> Warna: {COLOR_NAME[s.color]}
            </span>
          </div>
        </div>

        <p className={`text-center font-display text-lg font-medium ${myTurn ? "text-ocean" : ""}`} aria-live="polite">
          {status}
        </p>

        {/* Pilih warna untuk kartu bebas */}
        {pickColorFor !== null && (
          <div className="flex animate-rise flex-col items-center gap-2 rounded-[20px] bg-tint p-3">
            <span className="text-sm font-bold">Pilih warna</span>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={(e) => doPlay(pickColorFor, c, e.currentTarget)}
                  className={`tap size-12 rounded-full border-4 border-white shadow-soft ${BG[c]}`}
                  aria-label={COLOR_NAME[c]}
                />
              ))}
              <button type="button" className="btn btn-ghost min-h-12 px-3 text-sm" onClick={() => setPickColorFor(null)}>
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Kartu saya */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Kartumu ({hand.length})</span>
            {myTurn && s.drawn && (
              <button
                type="button"
                className="btn bg-sky min-h-10 px-4 text-sm text-navy"
                onClick={() => {
                  play("tap");
                  const r = passTurn(s, me.id);
                  void ctx.move(r.state, r.turn);
                }}
              >
                Lewati
              </button>
            )}
          </div>
          <div className="scroll-row -mx-4 flex gap-2 px-4 pt-3 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
            {hand.map((card, i) => {
              const ok = myTurn && canPlay(s, card) && (!s.drawn || card === s.drawn);
              return (
                <button
                  key={`${card}-${i}`}
                  type="button"
                  aria-label={`${COLOR_NAME[parse(card).c]} ${label(card)}`}
                  onClick={(e) => tapCard(i, e.currentTarget)}
                  className="shrink-0 transition-transform active:scale-95"
                >
                  <UnoCard card={card} dim={myTurn && !ok} lift={ok} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="card flex flex-col gap-3 p-5">
        <span className="font-display text-lg font-medium">Terakhir</span>
        {last ? (
          <div className="flex items-center gap-3">
            {last.card ? <UnoCard card={last.card} size="sm" /> : <CardBack />}
            <p className="text-sm text-ink-soft">
              <b className="text-navy">{whoText(last.by)}</b> {last.card ? `main ${label(last.card)}` : ""}
              {last.note ? `${last.card ? " · " : ""}${last.note}` : ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Belum ada yang jalan.</p>
        )}
        <hr className="border-line" />
        <ul className="flex flex-col gap-1.5 text-[13px] text-ink-soft">
          <li>• Cocokkan <b>warna</b> atau <b>angka/simbol</b>.</li>
          <li>• <b>Lewati</b> &amp; <b>Balik</b>: kamu jalan lagi.</li>
          <li>• <b>+2</b> / <b>+4</b>: lawan ambil kartu, kamu jalan lagi.</li>
          <li>• Tidak ada yang cocok? Ambil 1 kartu.</li>
          <li>• Kartu habis duluan = menang!</li>
        </ul>
      </aside>
    </div>
  );
}
