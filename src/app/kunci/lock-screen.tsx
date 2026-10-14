"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { resetPinWithPassword, signOutFromLock, unlockWithPin } from "./actions";
import { Cat, type CatMood } from "@/components/cat";
import { PinPad } from "@/components/pin-pad";
import { Avatar, Bubbles } from "@/components/ui";
import { burstHearts, haptic, play } from "@/lib/feel";

export function LockScreen({ name, avatar, next }: { name: string; avatar: string | null; next: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shake, setShake] = useState(0);
  const [typed, setTyped] = useState(0);
  const [mood, setMood] = useState<CatMood>("happy");
  const [message, setMessage] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [forgot, setForgot] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockedUntil) {
        setLockedUntil(null);
        setMessage(null);
      }
    }, 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  function onComplete(pin: string) {
    start(async () => {
      const res = await unlockWithPin(pin);
      if (res.ok) {
        setMood("love");
        play("unlock");
        haptic([10, 40, 20]);
        burstHearts(window.innerWidth / 2, window.innerHeight * 0.3, 14);
        setTimeout(() => router.replace(next), 380);
        return;
      }
      setMood("sad");
      setMessage(res.error ?? "PIN salah.");
      if ("lockedUntil" in res && res.lockedUntil) setLockedUntil(new Date(res.lockedUntil).getTime());
      setShake((s) => s + 1);
      setTimeout(() => setMood("happy"), 1400);
    });
  }

  const waitSec = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  // Kucing menutup mata saat PIN diketik, biar nggak "ngintip"
  const catMood: CatMood = mood !== "happy" ? mood : typed > 0 ? "joy" : "happy";

  return (
    <div className="relative flex min-h-svh flex-col items-center overflow-hidden bg-ocean px-6 pt-[max(env(safe-area-inset-top),40px)] pb-[max(env(safe-area-inset-bottom),24px)] text-white">
      <span aria-hidden="true" className="absolute -top-20 -right-20 size-72 rounded-full bg-aqua/30" />
      <Bubbles />

      <div className="relative mt-4 flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <Cat variant="mochi" size={104} mood={catMood} motion={mood === "love" ? "hop" : "bob"} />
          <span className="absolute -right-3 -bottom-1">
            <Avatar name={name} url={avatar} size={40} className="border-ocean" />
          </span>
        </div>
        <h1 className="font-display text-[26px] leading-tight font-semibold">Hai {name}, masukkan PIN</h1>
        <p className="min-h-6 text-sm font-semibold text-white/85" role="alert">
          {waitSec > 0 ? `Coba lagi dalam ${waitSec} detik` : message ?? "Biar dunia kecil kalian tetap rahasia"}
        </p>
      </div>

      <div className="relative mt-auto mb-6">
        {forgot ? (
          <form
            className="flex w-[300px] flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await resetPinWithPassword(password);
                if (res.ok) {
                  play("unlock");
                  router.replace(next);
                } else {
                  setMessage(res.error ?? "Gagal");
                  setShake((s) => s + 1);
                }
              });
            }}
          >
            <label htmlFor="pw" className="text-sm font-bold">
              Kata sandi akun
            </label>
            <input
              id="pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field border-white/30 bg-white text-navy"
              autoFocus
            />
            <button type="submit" disabled={pending} className="btn bg-white text-ocean">
              {pending ? "Memeriksa…" : "Hapus PIN & masuk"}
            </button>
            <p className="text-center text-xs text-white/80">PIN akan dihapus. Kamu bisa membuat PIN baru di halaman Akun.</p>
          </form>
        ) : (
          <PinPad dark onComplete={onComplete} disabled={pending || waitSec > 0} shakeKey={shake} onDigit={setTyped} />
        )}
      </div>

      <div className="relative flex gap-2">
        <button type="button" onClick={() => setForgot((v) => !v)} className="min-h-11 rounded-full px-4 text-sm font-bold text-white/90">
          {forgot ? "Pakai PIN" : "Lupa PIN?"}
        </button>
        <form action={signOutFromLock}>
          <button type="submit" className="min-h-11 rounded-full px-4 text-sm font-bold text-white/70">
            Keluar
          </button>
        </form>
      </div>
    </div>
  );
}
