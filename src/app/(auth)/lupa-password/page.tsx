"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default function LupaPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="flex animate-rise flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[30px] font-semibold">Lupa kata sandi?</h2>
        <p className="text-[15px] text-muted">Kami kirim link ke email kamu untuk membuat kata sandi baru.</p>
      </div>
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" className="field" />
        </div>
        <FormMessage state={state} />
        <SubmitButton pendingText="Mengirim…">Kirim link</SubmitButton>
      </form>
      <Link href="/login" className="btn btn-ghost">Kembali ke halaman masuk</Link>
    </div>
  );
}
