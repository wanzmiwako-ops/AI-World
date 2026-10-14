"use client";

import { useState, useTransition } from "react";
import { sendMessage } from "@/app/(app)/chat/actions";
import { attempt } from "@/lib/offline";
import { burstHearts, centerOf, haptic, play } from "@/lib/feel";

const LINES = [
  "Kamu tuh kayak wifi, deket dikit langsung nyambung 📶",
  "Hari ini aku kangen kamu. Besok juga. Lusa apalagi 🥺",
  "Kalau kamu capek, sini senderan. Bahuku gratis kok 🫶",
  "Aku bersyukur banget dunia ini ada kamunya 🌍💗",
  "Jangan lupa makan ya, nanti aku yang khawatir 🍚",
  "Kamu itu notif favoritku 🔔",
  "Senyum dulu dong, biar hariku ikut cerah ☀️",
  "Aku bangga sama kamu, beneran 🏅",
  "Meong. Artinya: aku sayang kamu 🐱",
  "Peluk virtual dulu, peluk aslinya nanti ya 🤗",
  "Kamu lucu, itu bukan opini, itu fakta ilmiah 🔬",
  "Kangen itu berat, biar aku aja… eh kamu juga deh 😆",
  "Semangat hari ini! Aku tim kamu nomor satu 📣",
  "Kalau kamu bintang, aku teleskopnya. Ngeliatin terus 🔭✨",
  "Makasih udah sabar sama aku ya 🌷",
  "Hari ini kamu cakep. Kemarin juga. Selalu sih 😌",
  "Ayo ketemu! Aku udah nabung kangen banyak banget 🐷",
  "Mau jadi alasan kamu senyum hari ini 😊",
  "Kamu + aku = rumah 🏡",
  "Bobo yang cukup ya, biar mimpiin aku 🌙",
];

/** Kartu kata manis: dikocok untuk ganti, lalu bisa langsung dikirim ke pasangan lewat chat. */
export function SweetCard({ partnerName, seed }: { partnerName: string; seed: number }) {
  const [i, setI] = useState(seed % LINES.length);
  const [flip, setFlip] = useState(0);
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function shuffle() {
    let n = Math.floor(Math.random() * LINES.length);
    if (n === i) n = (n + 1) % LINES.length;
    setI(n);
    setFlip((f) => f + 1);
    setError(null);
    play("tap");
    haptic(8);
  }

  function send(el: HTMLElement) {
    const body = LINES[i];
    startTransition(async () => {
      const res = await attempt(() => sendMessage({ kind: "text", body }));
      if ("error" in res && res.error) {
        setError(typeof res.error === "string" ? res.error : "Gagal mengirim, coba lagi.");
        play("error");
        return;
      }
      const c = centerOf(el);
      burstHearts(c.x, c.y, 14);
      haptic([20, 30, 20]);
      play("send");
      setSent(i);
    });
  }

  const done = sent === i;

  return (
    <section className="relative flex animate-rise flex-col gap-3 overflow-hidden rounded-[26px] bg-pink-soft p-5 text-navy">
      <span aria-hidden="true" className="pointer-events-none absolute -top-3 -right-2 text-[64px] opacity-20" style={{ animation: "sway 5s ease-in-out infinite" }}>
        💌
      </span>
      <span className="text-xs font-bold tracking-wide text-[#9b1c3a] uppercase">Kata manis buat {partnerName}</span>
      <button
        type="button"
        onClick={shuffle}
        aria-label="Kocok kata manis lain"
        className="tap relative min-h-[76px] rounded-[20px] rounded-bl-[6px] bg-white px-4 py-3.5 text-left font-display text-[17px] leading-snug font-medium shadow-soft"
      >
        <span key={flip} className="block" style={{ animation: "pop-in .4s ease" }}>
          “{LINES[i]}”
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={shuffle} className="chip tap">
          <span className="inline-block" key={flip} style={{ animation: flip ? "shake .5s ease" : undefined }}>
            🎲
          </span>{" "}
          Kocok lagi
        </button>
        <button
          type="button"
          disabled={pending || done}
          onClick={(e) => send(e.currentTarget)}
          className="tap ml-auto rounded-full bg-pink px-4 py-2 text-sm font-bold text-white shadow-soft disabled:opacity-70"
        >
          {done ? "Terkirim 💞" : pending ? "Mengirim…" : `Kirim ke ${partnerName} 💌`}
        </button>
      </div>
      {error && <p className="text-[13px] font-bold text-[#9b1c3a]">{error}</p>}
    </section>
  );
}
