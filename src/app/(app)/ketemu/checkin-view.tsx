"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { addCheckinPhoto, finishCheckin, saveCheckinNote, startCheckin, type CheckinSummary } from "./actions";
import { Cat, CatPair } from "@/components/cat";
import { Icon } from "@/components/icon";
import { Avatar, Bubbles, FormMessage } from "@/components/ui";
import { useCoupleChannel } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import { randomId, resizeImage } from "@/lib/image";

type Person = { id: string; name: string; avatar: string | null };

const MOODS = ["Seneng", "Seru", "Santai", "Baper"];

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  if (!("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function CheckinView({
  coupleId,
  me,
  partner,
  session,
  iAmIn,
  partnerIn,
  plan,
  initialPhotos,
}: {
  coupleId: string;
  me: Person;
  partner: Person | null;
  session: { id: string; together_at: string | null; place: string | null } | null;
  iAmIn: boolean;
  partnerIn: boolean;
  plan: { title: string; place: string | null } | null;
  initialPhotos: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [summary, setSummary] = useState<CheckinSummary | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const finishedId = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const partnerName = partner?.name ?? "pasanganmu";

  useCoupleChannel(`couple:${coupleId}:events`, { checkin: () => router.refresh() });

  const active = Boolean(session && iAmIn && session.together_at);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const phase = summary ? "done" : !session || !iAmIn ? "idle" : !session.together_at ? "waiting" : "active";

  function doCheckin() {
    setError(undefined);
    startTransition(async () => {
      const coords = await getPosition();
      const res = await startCheckin(coords, session?.place ?? plan?.place ?? null);
      if (res.error) setError(res.error);
    });
  }

  function doFinish() {
    if (!session) return;
    finishedId.current = session.id;
    startTransition(async () => {
      const res = await finishCheckin(session.id, mood, null);
      if (res.error) setError(res.error);
      else if (res.summary) setSummary(res.summary);
    });
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session) return;
    startTransition(async () => {
      const blob = await resizeImage(file);
      const path = `${coupleId}/ketemu/${session.id}/${randomId()}.webp`;
      const { error: upErr } = await createClient().storage.from("gallery").upload(path, blob, { contentType: "image/webp" });
      if (upErr) return setError(`Gagal mengunggah: ${upErr.message}`);
      const res = await addCheckinPhoto(path, session.id);
      if (res.error) setError(res.error);
      else setPhotos((n) => n + 1);
    });
  }

  if (phase === "done" && summary) {
    return (
      <div className="mx-auto flex w-full max-w-lg animate-rise flex-col gap-4">
        <section className="relative flex flex-col items-center gap-2 overflow-hidden rounded-[30px] bg-white px-6 pt-10 pb-6 text-center shadow-soft">
          {[
            ["8%", "#7FDBEA", 0],
            ["22%", "#F5B83D", 0.6],
            ["40%", "#0A6EBD", 1.2],
            ["58%", "#FF9FB2", 0.3],
            ["74%", "#7FDBEA", 1.6],
            ["88%", "#F5B83D", 0.9],
          ].map(([left, color, delay], i) => (
            <span
              key={i}
              aria-hidden="true"
              className="absolute top-0 size-2.5 rounded-sm opacity-0"
              style={{ left: left as string, background: color as string, animation: `fall 3.4s linear ${delay}s infinite` }}
            />
          ))}
          <CatPair size={84} motion="hop" moods={["joy", "joy"]} />
          <h2 className="pt-2 font-display text-[34px] leading-tight font-semibold">Ketemuan ke-{summary.number}!</h2>
          <p className="text-sm text-muted">Tersimpan ke kalender &amp; galeri</p>
          <div className="mt-3 grid w-full grid-cols-3 gap-2">
            {[
              [summary.duration, "durasi"],
              [String(summary.photos), "foto"],
              [summary.mood ?? "–", "mood"],
            ].map(([v, l]) => (
              <div key={l} className="flex flex-col gap-0.5 rounded-[18px] bg-sky px-2 py-3">
                <span className="font-display text-lg font-semibold">{v}</span>
                <span className="text-xs text-muted">{l}</span>
              </div>
            ))}
          </div>
        </section>
        <div className="flex flex-col gap-2">
          <label htmlFor="note" className="label">Catatan kecil buat hari ini</label>
          <textarea
            id="note"
            rows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteSaved(false);
            }}
            placeholder="Momen paling lucu hari ini…"
            className="field min-h-24 resize-none py-3"
          />
          {note.trim() && (
            <button
              type="button"
              className="chip self-start"
              onClick={() =>
                startTransition(async () => {
                  await saveCheckinNote(finishedId.current!, note.trim());
                  setNoteSaved(true);
                })
              }
            >
              {noteSaved ? "Tersimpan" : "Simpan catatan"}
            </button>
          )}
        </div>
        <Link href="/galeri" className="btn btn-primary">Lihat galeri</Link>
        <button type="button" onClick={() => setSummary(null)} className="btn btn-ghost">Selesai</button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <FormMessage state={{ error }} />

      {phase === "idle" && (
        <div className="flex animate-rise flex-col gap-6">
          {plan && (
            <div className="flex items-center gap-2 self-start rounded-2xl bg-white px-4 py-2.5 text-sm font-bold shadow-soft">
              <Icon name="calendar" size={18} className="text-ocean" />
              Rencana: {plan.title}
              {plan.place ? ` · ${plan.place}` : ""}
            </div>
          )}
          {partnerIn && (
            <p className="rounded-2xl bg-aqua-soft px-4 py-3 text-sm font-bold text-aqua-ink">
              {partnerName} sudah check-in! Ketuk tombol di bawah untuk bergabung.
            </p>
          )}
          <div className="relative mx-auto size-[230px]">
            <span aria-hidden="true" className="absolute inset-0 rounded-full border-[3px] border-ocean opacity-0" style={{ animation: "pulse-ring 2.4s ease-out infinite" }} />
            <span aria-hidden="true" className="absolute inset-0 rounded-full border-[3px] border-aqua opacity-0" style={{ animation: "pulse-ring 2.4s ease-out 1.2s infinite" }} />
            <button
              type="button"
              onClick={doCheckin}
              disabled={pending}
              aria-label="Check-in sekarang"
              className="relative flex size-full items-center justify-center rounded-full bg-tint transition-transform active:scale-95"
            >
              <span className="flex size-[178px] items-center justify-center rounded-full bg-[#C4E3F7]">
                <span className="flex size-[132px] flex-col items-center justify-center gap-1 rounded-full bg-ocean font-display text-xl font-semibold text-white shadow-ocean">
                  <span style={{ animation: "bob 1.8s ease-in-out infinite" }}>
                    <Icon name="pin" size={32} />
                  </span>
                  {pending ? "Sebentar…" : "Check-in"}
                </span>
              </span>
            </button>
          </div>
          <p className="text-center text-sm text-muted">
            Ketuk saat kalian sudah bareng. Check-in sah kalau lokasi HP kalian berdekatan (izinkan akses lokasi).
          </p>
          <div className="card flex flex-col px-4 py-1.5">
            {[
              { p: me, label: `${me.name} (kamu)`, ok: iAmIn, tone: "sand" as const },
              ...(partner ? [{ p: partner, label: partner.name, ok: partnerIn, tone: "aqua" as const }] : []),
            ].map(({ p, label, ok, tone }, i) => (
              <div key={p.id} className={`flex h-16 items-center gap-3 ${i === 0 && partner ? "border-b border-[#E8F0F6]" : ""}`}>
                <Avatar name={p.name} url={p.avatar} size={40} tone={tone} className="border-white" />
                <span className="flex-1 font-bold">{label}</span>
                <span className={`rounded-xl px-3 py-1 text-[13px] font-bold ${ok ? "bg-aqua-soft text-aqua-ink" : "bg-[#EEF2F6] text-muted"}`}>
                  {ok ? "Sudah" : "Belum"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "waiting" && (
        <div className="flex animate-rise flex-col items-center gap-6 pt-6 text-center">
          <div className="flex items-center gap-3" aria-hidden="true">
            <Cat variant="mochi" size={104} />
            <span className="flex gap-1.5">
              {[0, 0.2, 0.4].map((d) => (
                <span key={d} className="size-2.5 rounded-full bg-ocean" style={{ animation: `dot 1.2s ease-in-out ${d}s infinite` }} />
              ))}
            </span>
            <span className="opacity-40">
              <Cat variant="boba" size={104} mood="sleepy" delay={0.6} />
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[26px] font-semibold">Nunggu {partnerName} check-in…</h2>
            <p className="text-[15px] text-muted">Begitu {partnerName} check-in, halaman ini langsung berubah sendiri.</p>
          </div>
          <Link href="/chat" className="btn btn-primary w-full">Kabari lewat chat</Link>
        </div>
      )}

      {phase === "active" && session?.together_at && (
        <div className="flex animate-rise flex-col gap-5">
          <section className="relative flex flex-col items-center gap-2 overflow-hidden rounded-[30px] bg-ocean px-6 py-7 text-white">
            <Bubbles />
            <CatPair size={64} />
            <p className="relative flex items-center gap-2 text-sm font-bold">
              <span className="size-2.5 rounded-full bg-[#7FF0C8]" style={{ animation: "beat 1.6s ease-in-out infinite" }} />
              Lagi ketemu{session.place ? ` · ${session.place}` : ""}
            </p>
            <p className="relative font-display text-[60px] leading-none font-semibold tabular-nums">
              {clock(now - new Date(session.together_at).getTime())}
            </p>
            <p className="relative text-sm opacity-90">sudah bareng hari ini</p>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => fileInput.current?.click()} disabled={pending} className="card flex h-24 flex-col items-center justify-center gap-1.5">
              <Icon name="camera" size={26} className="text-ocean" />
              <span className="text-sm font-bold">Foto berdua · {photos}</span>
            </button>
            <input ref={fileInput} type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPhoto} aria-label="Ambil foto" />
            <Link href="/ide" className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-[26px] bg-sand-soft">
              <Icon name="sparkle" size={26} />
              <span className="text-sm font-bold">Ide aktivitas</span>
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            <h2 className="font-display text-lg font-medium">Lagi ngerasa…</h2>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button key={m} type="button" aria-pressed={mood === m} onClick={() => setMood(m)} className="chip">
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={doFinish} disabled={pending} className="btn btn-dark">
            {pending ? "Menyimpan…" : "Selesai ketemu"}
          </button>
        </div>
      )}
    </div>
  );
}
