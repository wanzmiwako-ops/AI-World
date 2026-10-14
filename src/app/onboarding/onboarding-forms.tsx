"use client";

import { useActionState, useState } from "react";
import { createCouple } from "./actions";
import { FormMessage } from "@/components/ui";
import { JoinCodeForm } from "@/components/join-code-form";
import { SubmitButton } from "@/components/submit-button";

export function OnboardingForms() {
  const [tab, setTab] = useState<"join" | "create">("join");
  const [createState, createAction] = useActionState(createCouple, undefined);

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-2xl bg-sand-soft px-4 py-3 text-sm text-sand-ink">
        <b>Cukup satu orang yang membuat kode.</b> Yang satunya lagi tinggal memasukkan kode itu.
      </p>

      <div className="grid grid-cols-2 gap-1 rounded-[18px] bg-tint p-1" role="tablist">
        {(
          [
            ["join", "Masukkan kode"],
            ["create", "Buat kode undangan"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-11 rounded-[14px] text-sm font-bold transition-colors ${
              tab === key ? "bg-white text-navy" : "text-ink-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "join" ? (
        <div className="card flex animate-rise flex-col gap-4 p-5">
          <p className="text-[15px] text-ink-soft">
            Pasanganmu sudah daftar duluan? Minta <b>kode undangan 6 karakter</b> dari dia (ada di Beranda atau halaman Akun-nya), lalu masukkan di sini.
          </p>
          <JoinCodeForm />
        </div>
      ) : (
        <form action={createAction} className="card flex animate-rise flex-col gap-4 p-5">
          <p className="text-[15px] text-ink-soft">
            Kamu yang mulai? Buat ruang berdua, lalu kirim <b>kode undangan</b> yang muncul ke pasanganmu.
          </p>
          <div className="flex flex-col gap-2">
            <label htmlFor="anniversary" className="label">Tanggal jadian (opsional)</label>
            <input id="anniversary" name="anniversary" type="date" className="field" />
          </div>
          <FormMessage state={createState} />
          <SubmitButton pendingText="Membuat…">Buat kode undangan</SubmitButton>
        </form>
      )}
    </div>
  );
}
