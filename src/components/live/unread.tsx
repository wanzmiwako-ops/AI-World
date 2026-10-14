"use client";

import { useLive } from "@/lib/live";

/**
 * Jumlah pesan belum dibaca yang selalu terkini (ikut realtime & langsung 0 setelah membuka Chat).
 * `initial` dipakai sebelum koneksi live siap.
 */
function useUnread(initial: number) {
  return useLive((s) => (s.ready ? s.unread : initial));
}

export function UnreadBadge({ initial }: { initial: number }) {
  const n = useUnread(initial);
  if (n <= 0) return null;
  return (
    <span
      className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink px-1 text-[11px] font-bold text-white"
      style={{ animation: "pop-in .3s cubic-bezier(.2,.9,.3,1.4) both" }}
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

export function UnreadText({ initial }: { initial: number }) {
  const n = useUnread(initial);
  return <>{n > 0 ? `${n} pesan belum dibaca` : "Kirim kabar manis hari ini"}</>;
}
