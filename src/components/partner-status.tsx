"use client";

import { useEffect, useState } from "react";
import { useLive } from "@/lib/live";

const PAGES: Record<string, string> = {
  "/": "Beranda",
  "/chat": "Chat",
  "/kalender": "Kalender",
  "/ketemu": "Mode Ketemu",
  "/love-meter": "Love Meter",
  "/ide": "Ide Kencan",
  "/ruang-bicara": "Ruang Bicara",
  "/galeri": "Galeri",
  "/akun": "Akun",
};

function ago(iso: string | null) {
  if (!iso) return null;
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 2) return "baru saja aktif";
  if (min < 60) return `aktif ${min} menit lalu`;
  const h = Math.round(min / 60);
  if (h < 24) return `aktif ${h} jam lalu`;
  return `aktif ${Math.round(h / 24)} hari lalu`;
}

/** "Ica lagi online · buka Galeri" — terasa bareng walau berjauhan. */
export function PartnerStatus({ name, lastActive }: { name: string; lastActive: string | null }) {
  const online = useLive((s) => s.partnerOnline);
  const page = useLive((s) => s.partnerPage);
  const [offlineText, setOfflineText] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setOfflineText(ago(lastActive));
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [lastActive]);

  const pageName = page ? PAGES[page] ?? PAGES[`/${page.split("/")[1]}`] : null;

  return (
    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted" aria-live="polite">
      <span className={`size-2 rounded-full ${online ? "bg-[#2FBF71]" : "bg-[#B7C6D3]"}`} style={online ? { animation: "beat 2s ease-in-out infinite" } : undefined} />
      {online ? (
        <span className="truncate">
          {name} lagi online{pageName ? ` · buka ${pageName}` : ""}
        </span>
      ) : (
        <span className="truncate">
          {name} {offlineText ?? "sedang offline"}
        </span>
      )}
    </span>
  );
}
