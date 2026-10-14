"use client";

import { useActionState } from "react";
import { joinCouple } from "@/app/onboarding/actions";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

/** Kolom untuk memasukkan kode undangan dari pasangan. */
export function JoinCodeForm({ compact = false }: { compact?: boolean }) {
  const [state, action] = useActionState(joinCouple, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor={compact ? "code-mini" : "code"} className="label">
        Kode dari pasanganmu
      </label>
      <div className={compact ? "flex gap-2" : "flex flex-col gap-3"}>
        <input
          id={compact ? "code-mini" : "code"}
          name="code"
          required
          minLength={6}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="A1B2C3"
          className="field min-w-0 flex-1 text-center font-display text-2xl tracking-[0.3em] uppercase"
        />
        <SubmitButton pendingText="Menyambungkan…" className={compact ? "btn btn-primary shrink-0" : "btn btn-primary w-full"}>
          Sambungkan
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
