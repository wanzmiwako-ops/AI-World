"use client";

import { Cat } from "@/components/cat";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70svh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Cat variant="mochi" size={120} mood="sad" />
      <h1 className="font-display text-[28px] font-semibold">Ups, ada yang error</h1>
      <p className="text-[15px] text-muted">
        {error.message.includes("fetch") ? "Koneksi internet sepertinya putus." : "Coba muat ulang halaman ini, ya."}
      </p>
      <button type="button" onClick={reset} className="btn btn-primary">
        Coba lagi
      </button>
    </div>
  );
}
