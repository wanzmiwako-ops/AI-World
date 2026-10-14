"use client";

import { useRouter } from "next/navigation";
import { Cat } from "@/components/cat";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/ui";
import { dismissToast, useLive } from "@/lib/live";

const TONE = {
  ocean: "border-l-ocean",
  pink: "border-l-pink",
  sand: "border-l-[#F5B83D]",
  aqua: "border-l-[#2BB3C9]",
} as const;

/** Notifikasi di dalam aplikasi: muncul dari atas, bisa diketuk. */
export function Toaster() {
  const toasts = useLive((s) => s.toasts);
  const router = useRouter();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-3 lg:items-end lg:px-6"
      style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[22px] border-l-4 bg-white py-3 pr-2 pl-3 shadow-[0_12px_32px_rgba(11,37,69,0.18)] ${TONE[t.tone ?? "ocean"]}`}
          style={{ animation: "toast-in .38s cubic-bezier(.2,.9,.3,1.2) both" }}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={() => {
              dismissToast(t.id);
              if (t.href) router.push(t.href);
            }}
          >
            {t.avatar ? (
              <Avatar name={t.title} url={t.avatar} size={42} tone="aqua" className="border-white" />
            ) : (
              <span className="shrink-0">
                <Cat variant={t.cat ?? "boba"} size={42} motion="none" mood="joy" />
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-bold">{t.title}</span>
              {t.body && <span className="truncate text-[13px] text-ink-soft">{t.body}</span>}
            </span>
          </button>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Tutup notifikasi" className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted">
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
