"use client";

import Link from "next/link";
import { Cat } from "@/components/cat";
import { Icon } from "@/components/icon";
import { haptic, play } from "@/lib/feel";
import { TALK, TALK_CATS, type NgobrolState } from "@/lib/games/cards";
import type { GameCtx } from "./game-room";

export function NgobrolGame({ ctx }: { ctx: GameCtx<NgobrolState> }) {
  const { game, me, partner } = ctx;
  const s = game.state;
  const playing = game.status === "playing";
  const end = s.idx >= s.deck.length;
  const card = end ? null : TALK[s.deck[s.idx]];
  const answerer = s.players[s.idx % 2];
  const cat = card ? TALK_CATS[card[0]] : null;

  function next() {
    play("pop");
    haptic(10);
    const idx = s.idx + 1;
    if (idx >= s.deck.length) ctx.finish(null);
    else void ctx.move({ ...s, idx }, null);
  }

  return (
    <div className="grid animate-rise gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="flex flex-col items-center gap-5">
        {card && cat ? (
          <div
            key={s.idx}
            className="relative flex min-h-[320px] w-full max-w-[520px] flex-col justify-between gap-6 overflow-hidden rounded-[32px] bg-white p-7 shadow-[0_18px_40px_rgba(11,37,69,0.12)] sm:p-9"
            style={{ animation: "pop-in .45s cubic-bezier(.2,.9,.3,1.2) both" }}
          >
            <span aria-hidden="true" className="absolute -top-6 -right-6 text-[120px] opacity-10">{cat.emoji}</span>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${cat.tone}`}>
                {cat.emoji} {cat.name}
              </span>
              <span className="text-sm font-bold text-muted">
                {s.idx + 1}/{s.deck.length}
              </span>
            </div>
            <p className="font-display text-[26px] leading-snug font-semibold sm:text-[32px]">{card[1]}</p>
            <div className="flex items-center gap-3">
              <Cat variant={answerer === me.id ? "mochi" : "boba"} size={44} motion="bob" mood="joy" />
              <span className="text-[15px] font-bold">
                {answerer === me.id ? "Giliranmu menjawab" : `Giliran ${partner.name} menjawab`}
              </span>
            </div>
          </div>
        ) : (
          <div className="card flex w-full max-w-[520px] flex-col items-center gap-3 p-8 text-center">
            <span className="text-5xl">💌</span>
            <p className="font-display text-2xl font-semibold">Semua kartu sudah dibuka!</p>
            <p className="text-sm text-muted">Terima kasih sudah ngobrol jujur. Main lagi untuk kartu yang diacak ulang.</p>
          </div>
        )}

        {playing && card && (
          <div className="flex w-full max-w-[520px] gap-2">
            <button type="button" className="btn btn-primary flex-1" onClick={next}>
              Kartu berikutnya <Icon name="next" size={18} />
            </button>
            <Link href="/chat" className="btn bg-white px-5 text-navy shadow-soft">
              <Icon name="chat" size={18} /> Chat
            </Link>
          </div>
        )}
      </div>

      <aside className="card flex flex-col gap-3 p-5">
        <span className="font-display text-lg font-medium">Cara main</span>
        <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
          <li>• Buka kartu, yang kebagian giliran menjawab dengan jujur.</li>
          <li>• Kalian berdua melihat kartu yang sama, siapa pun boleh membuka kartu berikutnya.</li>
          <li>• Lagi jauh? Jawab lewat chat atau telepon.</li>
        </ul>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {s.cats.map((c) => (
            <span key={c} className={`rounded-full px-2.5 py-1 text-xs font-bold ${TALK_CATS[c].tone}`}>
              {TALK_CATS[c].emoji} {TALK_CATS[c].name}
            </span>
          ))}
        </div>
      </aside>
    </div>
  );
}
