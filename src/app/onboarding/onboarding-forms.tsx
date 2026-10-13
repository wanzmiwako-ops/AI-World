"use client";

import { useActionState, useState } from "react";
import { createCouple, joinCouple } from "./actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function OnboardingForms() {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [createState, createAction] = useActionState(createCouple, undefined);
  const [joinState, joinAction] = useActionState(joinCouple, undefined);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-1 rounded-[18px] bg-tint p-1" role="tablist">
        {(
          [
            ["create", "Aku yang mulai"],
            ["join", "Aku punya kode"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
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

      {tab === "create" ? (
        <form action={createAction} className="card flex animate-rise flex-col gap-4 p-5">
          <p className="text-[15px] text-ink-soft">
            Buat ruang kalian berdua. Setelah itu kamu dapat <b>kode undangan</b> untuk dikirim ke pasangan.
          </p>
          <div className="flex flex-col gap-2">
            <label htmlFor="anniversary" className="label">Tanggal jadian (opsional)</label>
            <input id="anniversary" name="anniversary" type="date" className="field" />
          </div>
          <FormMessage state={createState} />
          <SubmitButton pendingText="Membuat…">Buat ruang berdua</SubmitButton>
        </form>
      ) : (
        <form action={joinAction} className="card flex animate-rise flex-col gap-4 p-5">
          <p className="text-[15px] text-ink-soft">Masukkan 6 karakter kode dari pasanganmu.</p>
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="label">Kode undangan</label>
            <input
              id="code"
              name="code"
              required
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="A1B2C3"
              className="field text-center font-display text-2xl tracking-[0.3em] uppercase"
            />
          </div>
          <FormMessage state={joinState} />
          <SubmitButton pendingText="Menyambungkan…">Sambungkan</SubmitButton>
        </form>
      )}
    </div>
  );
}
