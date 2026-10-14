"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/icon";

/** Panel yang naik dari bawah layar (seperti aplikasi native). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center lg:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-navy/45" style={{ animation: "fade-in .2s ease both" }} />
      <div
        className="relative flex max-h-[92svh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-[32px] bg-sky px-6 pt-3 pb-[max(env(safe-area-inset-bottom),24px)] lg:rounded-[32px] lg:pt-6"
        style={{ animation: "sheet-up .32s cubic-bezier(.2,.9,.3,1) both", overscrollBehavior: "contain" }}
      >
        <span aria-hidden="true" className="mx-auto h-1.5 w-12 shrink-0 rounded-full bg-line lg:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[22px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-10 items-center justify-center rounded-full bg-white">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
