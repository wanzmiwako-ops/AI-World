"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default function DaftarPage() {
  const [state, action] = useActionState(signup, undefined);

  return (
    <div className="flex animate-rise flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[30px] font-semibold">Buat akun</h2>
        <p className="text-[15px] text-muted">Setelah daftar, kamu dapat kode undangan untuk pasanganmu.</p>
      </div>

      {state?.ok ? (
        <FormMessage state={state} />
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="label">Nama panggilan</label>
            <input id="name" name="name" autoComplete="nickname" required maxLength={40} placeholder="Misal: Andi" className="field" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" className="field" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="label">Kata sandi</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Minimal 8 karakter" className="field" />
          </div>
          <FormMessage state={state} />
          <SubmitButton pendingText="Mendaftarkan…">Daftar</SubmitButton>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-bold text-ocean">Masuk</Link>
      </p>
    </div>
  );
}
