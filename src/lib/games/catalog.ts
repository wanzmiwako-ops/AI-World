export type GameKind = "sehati" | "tts" | "uno" | "xo" | "ngobrol";

export type GameRow<S = Record<string, unknown>> = {
  id: string;
  kind: GameKind;
  state: S;
  turn: string | null;
  status: "playing" | "done";
  winner: string | null;
  version: number;
  created_by: string;
  updated_at: string;
};

export type GameInfo = {
  kind: GameKind;
  name: string;
  emoji: string;
  short: string;
  desc: string;
  mode: string;
  time: string;
  tone: "pink" | "aqua" | "sand" | "ocean";
};

export const GAMES: GameInfo[] = [
  {
    kind: "sehati",
    name: "Kita Sehati?",
    emoji: "💞",
    short: "Pilih jawaban bersamaan, lihat seberapa kompak",
    desc: "10 pertanyaan \"ini atau itu\". Kalian memilih diam-diam, jawaban baru terbuka setelah dua-duanya memilih. Berapa yang sama?",
    mode: "Bareng",
    time: "3 menit",
    tone: "pink",
  },
  {
    kind: "tts",
    name: "Teka-Teki Silang",
    emoji: "🧩",
    short: "Isi kotak bareng, saling bantu tebak",
    desc: "TTS yang selalu baru setiap main. Isi bersama di satu papan: huruf yang kamu ketik langsung muncul di layar pasanganmu.",
    mode: "Kerja sama",
    time: "5–10 menit",
    tone: "aqua",
  },
  {
    kind: "uno",
    name: "UNO Kucing",
    emoji: "🃏",
    short: "Kartu warna & angka, habiskan kartumu duluan",
    desc: "Cocokkan warna atau angka. Ada kartu Lewati, Balik, +2, Ganti Warna, dan +4. Yang kartunya habis duluan menang.",
    mode: "Tanding",
    time: "5–10 menit",
    tone: "sand",
  },
  {
    kind: "xo",
    name: "XO Kucing",
    emoji: "🐾",
    short: "Tiga jejak sejajar, menang!",
    desc: "Tic-tac-toe versi kucing: jejak Mochi lawan jejak Boba. Cepat, seru, cocok buat taruhan kecil.",
    mode: "Tanding",
    time: "1 menit",
    tone: "ocean",
  },
  {
    kind: "ngobrol",
    name: "Kartu Ngobrol",
    emoji: "💌",
    short: "Pertanyaan manis, dalam, lucu, dan tantangan",
    desc: "Buka kartu bergantian dan jawab jujur. Ada pertanyaan manis, obrolan dalam, hal lucu, dan tantangan ringan.",
    mode: "Bareng",
    time: "Sesukanya",
    tone: "ocean",
  },
];

export const TONE: Record<GameInfo["tone"], string> = {
  pink: "bg-pink-soft",
  aqua: "bg-aqua-soft",
  sand: "bg-sand-soft",
  ocean: "bg-tint",
};

export function gameInfo(kind: string): GameInfo {
  return GAMES.find((g) => g.kind === kind) ?? GAMES[0];
}

export function gameName(kind: string) {
  return gameInfo(kind).name;
}

/** Acak urutan array (Fisher–Yates). */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
