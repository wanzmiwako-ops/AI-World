"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { createMeeting, deleteMeeting } from "./actions";
import { Cat } from "@/components/cat";
import { Icon } from "@/components/icon";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export type CalendarMeeting = {
  id: string;
  title: string;
  place: string | null;
  note: string | null;
  day: string; // YYYY-MM-DD (Jakarta)
  time: string;
  past: boolean;
  together: string | null; // durasi check-in, kalau ada
};

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function CalendarView({
  monthKey,
  todayKey,
  meetings,
}: {
  monthKey: string;
  todayKey: string;
  meetings: CalendarMeeting[];
}) {
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Senin = 0

  const defaultDay = todayKey.startsWith(monthKey) ? todayKey : meetings[0]?.day ?? `${monthKey}-01`;
  const [selected, setSelected] = useState(defaultDay);
  const [adding, setAdding] = useState(false);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof createMeeting>>, fd: FormData) => {
    const res = await createMeeting(prev, fd);
    if (res?.ok) setAdding(false);
    return res;
  }, undefined);
  const [, startTransition] = useTransition();

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarMeeting[]>();
    meetings.forEach((mt) => map.set(mt.day, [...(map.get(mt.day) ?? []), mt]));
    return map;
  }, [meetings]);

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`),
  ];
  const selectedMeetings = byDay.get(selected) ?? [];
  const selectedDate = new Date(`${selected}T12:00:00+07:00`);
  const selectedLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(selectedDate);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="card flex animate-rise flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <Link href={`/kalender?m=${shiftMonth(monthKey, -1)}`} aria-label="Bulan sebelumnya" className="flex size-11 items-center justify-center rounded-full bg-sky">
            <Icon name="back" size={18} />
          </Link>
          <h2 className="font-display text-xl font-medium">
            {MONTHS[m - 1]} {y}
          </h2>
          <Link href={`/kalender?m=${shiftMonth(monthKey, 1)}`} aria-label="Bulan berikutnya" className="flex size-11 items-center justify-center rounded-full bg-sky">
            <Icon name="next" size={18} />
          </Link>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-bold text-muted">
          {WEEKDAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 justify-items-center gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`b${i}`} className="size-11" />;
            const items = byDay.get(day) ?? [];
            const isSel = day === selected;
            const isToday = day === todayKey;
            const past = day < todayKey;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                aria-pressed={isSel}
                aria-label={`${Number(day.slice(8))} ${MONTHS[m - 1]}${items.length ? `, ${items.length} rencana` : ""}`}
                className={`relative size-11 rounded-full text-[15px] transition-all ${
                  isSel ? "scale-105 bg-ocean font-bold text-white" : isToday ? "bg-tint font-bold" : items.length ? "font-bold" : "font-medium"
                }`}
              >
                {Number(day.slice(8))}
                {items.length > 0 && (
                  <span
                    className={`absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full ${
                      isSel ? "bg-white" : past ? "bg-[#9DB3C6]" : "bg-ocean"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-medium first-letter:uppercase">
            {selectedLabel}
            {selected === todayKey ? " · hari ini" : ""}
          </h2>
          <button type="button" onClick={() => setAdding((v) => !v)} aria-label="Jadwalkan pertemuan" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ocean text-white shadow-ocean">
            <Icon name={adding ? "close" : "plus"} />
          </button>
        </div>

        {adding && (
          <form action={action} className="card flex animate-rise flex-col gap-3 p-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="label">Mau ngapain?</label>
              <input id="title" name="title" required placeholder="Piknik sore" className="field" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="starts_at" className="label">Kapan?</label>
              <input id="starts_at" name="starts_at" type="datetime-local" required defaultValue={`${selected}T19:00`} className="field" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="place" className="label">Di mana? (opsional)</label>
              <input id="place" name="place" placeholder="Kebun Raya" className="field" />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="note" className="label">Catatan (opsional)</label>
              <input id="note" name="note" placeholder="Aku bawa kartu UNO" className="field" />
            </div>
            <FormMessage state={state} />
            <SubmitButton pendingText="Menyimpan…">Simpan jadwal</SubmitButton>
          </form>
        )}

        {selectedMeetings.length === 0 && !adding && (
          <div className="flex flex-col items-center gap-2 rounded-[26px] border-2 border-dashed border-[#C4DCEC] p-6 text-center">
            <Cat variant="mochi" size={70} mood="sleepy" motion="none" />
            <p className="text-[15px] text-muted">Belum ada rencana. Ketuk + untuk ngajak ketemu.</p>
          </div>
        )}

        {selectedMeetings.map((mt) => (
          <article key={mt.id} className="card flex animate-rise flex-col gap-3 p-5">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-xl bg-tint px-3 py-1.5 text-[13px] font-bold text-ocean-dark">{mt.time}</span>
              {mt.together && (
                <span className="rounded-xl bg-aqua-soft px-3 py-1.5 text-[13px] font-bold text-aqua-ink">Check-in · {mt.together}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-[22px] leading-tight font-medium">{mt.title}</h3>
              {mt.place && <p className="text-sm text-muted">{mt.place}</p>}
            </div>
            {mt.note && <p className="text-sm text-ink-soft">{mt.note}</p>}
            <div className="flex gap-2">
              {mt.past ? (
                <Link href="/galeri" className="btn btn-dark flex-1">Buka galeri</Link>
              ) : (
                <Link href="/ide" className="btn btn-primary flex-1">Cari ide aktivitas</Link>
              )}
              <button
                type="button"
                aria-label="Hapus jadwal"
                onClick={() => {
                  if (confirm("Hapus jadwal ini?")) startTransition(() => deleteMeeting(mt.id));
                }}
                className="flex size-[52px] items-center justify-center rounded-full bg-sky text-muted"
              >
                <Icon name="trash" size={20} />
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
