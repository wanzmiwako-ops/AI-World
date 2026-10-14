export const TZ = "Asia/Jakarta";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { timeZone: TZ, ...opts });

export const formatDay = (d: string | Date) => fmt({ weekday: "long", day: "numeric", month: "long" }).format(new Date(d));
export const formatShort = (d: string | Date) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(new Date(d));
export const formatTime = (d: string | Date) => fmt({ hour: "2-digit", minute: "2-digit" }).format(new Date(d)).replace(".", ":");
export const formatMonth = (d: string | Date) => fmt({ month: "long", year: "numeric" }).format(new Date(d));

/** Tanggal (YYYY-MM-DD) di zona waktu Jakarta. */
export function dayKey(d: string | Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(d));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Selisih hari kalender (Jakarta) dari a ke b. */
export function daysBetween(a: string | Date, b: string | Date) {
  const toUtc = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(dayKey(b)) - toUtc(dayKey(a))) / 86_400_000);
}

export function durationText(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}j ${m.toString().padStart(2, "0")}m` : `${m} menit`;
}

/** "2026-10-17T15:00" (input datetime-local, waktu Jakarta) → ISO UTC */
export function jakartaLocalToIso(local: string) {
  return new Date(`${local.slice(0, 16)}:00+07:00`).toISOString();
}

/** ISO timestamp n jam yang lalu. */
export function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}
