"use client";

import { useEffect, useState, useTransition } from "react";
import { sendNudge } from "@/app/(app)/live-actions";
import { attempt } from "@/lib/offline";
import { CatPair } from "@/components/cat";
import { haptic, play, rainHearts } from "@/lib/feel";
import { setLive, useLive } from "@/lib/live";

const TEXT: Record<string, string> = {
  kangen: "kangen kamu!",
  peluk: "mengirim pelukan hangat",
  cium: "mengirim cium",
  semangat: "bilang: semangat ya hari ini!",
};

/** Saat pasangan "kirim kangen": layar penuh hati + kucing melompat. */
export function NudgeOverlay({ partnerName }: { partnerName: string }) {
  const nudge = useLive((s) => s.nudge);
  const [repliedAt, setRepliedAt] = useState<number | null>(null);
  const replied = nudge ? repliedAt === nudge.at : false;
  const [, start] = useTransition();

  useEffect(() => {
    if (!nudge) return;
    play("meow");
    haptic([60, 40, 60, 40, 140]);
    rainHearts(26);
    const t = setTimeout(() => setLive({ nudge: null }), 5200);
    return () => clearTimeout(t);
  }, [nudge]);

  if (!nudge) return null;
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-6" role="dialog" aria-label={`${partnerName} ${TEXT[nudge.kind] ?? ""}`}>
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-navy/50" onClick={() => setLive({ nudge: null })} style={{ animation: "fade-in .2s ease both" }} />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-3 rounded-[32px] bg-white px-6 pt-8 pb-6 text-center shadow-[0_20px_60px_rgba(11,37,69,0.3)]" style={{ animation: "pop-in .45s cubic-bezier(.2,.9,.3,1.3) both" }}>
        <CatPair size={96} motion="hop" moods={["love", "love"]} />
        <p className="pt-2 font-display text-[26px] leading-tight font-semibold">
          {partnerName} {TEXT[nudge.kind] ?? "mencolek kamu"}
        </p>
        <div className="mt-2 grid w-full grid-cols-2 gap-2">
          <button type="button" className="btn bg-sky px-3 text-base text-navy" onClick={() => setLive({ nudge: null })}>
            Aww
          </button>
          <button
            type="button"
            disabled={replied}
            className="btn btn-primary px-3 text-base whitespace-nowrap"
            onClick={() => {
              setRepliedAt(nudge.at);
              play("send");
              haptic(20);
              start(async () => {
                await attempt(() => sendNudge("kangen"));
                setTimeout(() => setLive({ nudge: null }), 600);
              });
            }}
          >
            {replied ? "Terkirim!" : "Balas kangen"}
          </button>
        </div>
      </div>
    </div>
  );
}
