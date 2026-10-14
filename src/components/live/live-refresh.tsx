"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { getLive, useLiveEvent } from "@/lib/live";

/**
 * Segarkan isi halaman saat pasangan menambah/mengubah sesuatu (jadwal, foto, mood, …),
 * jadi tidak perlu buka ulang halaman.
 */
export function LiveRefresh({ kinds }: { kinds: string[] }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLiveEvent("activity", (p) => {
    if (!kinds.includes(String(p.kind))) return;
    if (p.by && p.by === getLive().me?.id) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), 700);
  });

  return null;
}
