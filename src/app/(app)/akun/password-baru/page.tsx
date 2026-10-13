"use client";

import { useActionState } from "react";
import { setNewPassword } from "../actions";
import { Cat } from "@/components/cat";
import { FormMessage, Page, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default function PasswordBaruPage() {
  const [state, action] = useActionState(setNewPassword, undefined);
  return (
    <Page className="max-w-md">
      <PageHeader title="Kata sandi baru" subtitle="Buat kata sandi baru untuk akunmu" back="/akun" />
      <div className="flex justify-center">
        <Cat variant="mochi" size={100} mood="happy" />
      </div>
      <form action={action} className="card flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="next" className="label">Kata sandi baru</label>
          <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required placeholder="Minimal 8 karakter" className="field" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="confirm" className="label">Ulangi kata sandi baru</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="field" />
        </div>
        <FormMessage state={state} />
        <SubmitButton pendingText="Menyimpan…">Simpan kata sandi</SubmitButton>
      </form>
    </Page>
  );
}
