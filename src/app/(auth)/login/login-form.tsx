"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, sendMagicLink } from "../actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ linkError }: { linkError?: boolean }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loginState, loginAction] = useActionState(login, undefined);
  const [magicState, magicAction] = useActionState(sendMagicLink, undefined);

  return (
    <div className="flex animate-rise flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[30px] font-semibold">Hai lagi!</h2>
        <p className="text-[15px] text-muted">Masuk pakai email yang terhubung ke pasanganmu.</p>
      </div>

      {linkError && <FormMessage state={{ error: "Link sudah kedaluwarsa atau tidak valid. Minta link baru, ya." }} />}

      {mode === "password" ? (
        <form action={loginAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" className="field" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="password" className="label">Kata sandi</label>
              <Link href="/lupa-password" className="text-[13px] font-bold text-ocean">Lupa?</Link>
            </div>
            <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Minimal 8 karakter" className="field" />
          </div>
          <FormMessage state={loginState} />
          <SubmitButton pendingText="Masuk…">Masuk</SubmitButton>
        </form>
      ) : (
        <form action={magicAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="magic-email" className="label">Email</label>
            <input id="magic-email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" className="field" />
          </div>
          <FormMessage state={magicState} />
          <SubmitButton pendingText="Mengirim…">Kirim link masuk</SubmitButton>
        </form>
      )}

      <button
        type="button"
        onClick={() => setMode(mode === "password" ? "magic" : "password")}
        className="btn btn-ghost"
      >
        {mode === "password" ? "Masuk tanpa kata sandi (link ke email)" : "Masuk pakai kata sandi"}
      </button>

      <p className="text-center text-sm text-muted">
        Baru di sini?{" "}
        <Link href="/daftar" className="font-bold text-ocean">
          Daftar &amp; undang pasangan
        </Link>
      </p>
    </div>
  );
}
