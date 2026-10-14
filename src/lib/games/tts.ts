import { shuffle } from "./catalog";

/** Bank kata: tema cinta, kucing, kencan, dan sehari-hari. Huruf A–Z saja. */
const BANK: [string, string][] = [
  ["RINDU", "Rasa ingin cepat ketemu"],
  ["KANGEN", "Bahasa sehari-hari untuk rindu"],
  ["PELUK", "Dekapan hangat"],
  ["CIUM", "Kecupan sayang"],
  ["SAYANG", "Panggilan manis untuk pasangan"],
  ["CINTA", "Perasaan paling besar di hati"],
  ["KENCAN", "Janji jalan berdua"],
  ["MESRA", "Romantis dan dekat"],
  ["SETIA", "Tidak berpaling"],
  ["JODOH", "Pasangan yang ditakdirkan"],
  ["HATI", "Tempat menyimpan perasaan"],
  ["RAYU", "Gombal, membujuk dengan kata manis"],
  ["GOMBAL", "Kata-kata manis yang berlebihan"],
  ["JANJI", "Ucapan yang harus ditepati"],
  ["MANJA", "Ingin selalu diperhatikan"],
  ["CEMBURU", "Tidak suka dia dekat orang lain"],
  ["BAPER", "Bawa perasaan"],
  ["SENYUM", "Lengkung bibir saat bahagia"],
  ["TAWA", "Suara saat geli atau lucu"],
  ["MIMPI", "Bunga tidur"],
  ["BULAN", "Bersinar di langit malam"],
  ["BINTANG", "Berkelip jauh di langit"],
  ["SENJA", "Langit oranye sore hari"],
  ["PANTAI", "Tempat pasir dan ombak bertemu"],
  ["OMBAK", "Gelombang air laut"],
  ["GUNUNG", "Tinggi, enak didaki berdua"],
  ["PIKNIK", "Makan bersama di taman beralas tikar"],
  ["BIOSKOP", "Tempat nonton film di layar besar"],
  ["POPCORN", "Camilan jagung saat nonton"],
  ["KOPI", "Minuman hitam berkafein"],
  ["TEH", "Minuman dari daun, bisa manis"],
  ["MARTABAK", "Jajanan manis atau telur, dijual malam"],
  ["BAKSO", "Bulatan daging berkuah"],
  ["SATE", "Daging tusuk dibakar"],
  ["SEBLAK", "Kerupuk basah pedas khas Bandung"],
  ["BOBA", "Bulatan kenyal di minuman, nama kucing oren"],
  ["MOCHI", "Kue kenyal Jepang, nama kucing biru"],
  ["KUCING", "Hewan peliharaan pengeong"],
  ["MEONG", "Suara kucing"],
  ["KUMIS", "Rambut tipis di pipi kucing"],
  ["EKOR", "Bagian belakang kucing yang suka bergoyang"],
  ["CAKAR", "Kuku tajam kucing"],
  ["IKAN", "Makanan kesukaan kucing"],
  ["BULU", "Penutup tubuh kucing yang lembut"],
  ["TIDUR", "Kegiatan favorit kucing di siang hari"],
  ["MANIS", "Rasa gula, atau senyum dia"],
  ["LUCU", "Menggemaskan"],
  ["GEMAS", "Ingin mencubit karena imut"],
  ["IMUT", "Kecil dan menggemaskan"],
  ["BUNGA", "Hadiah klasik untuk orang tersayang"],
  ["MAWAR", "Bunga merah lambang cinta"],
  ["COKELAT", "Hadiah manis Hari Valentine"],
  ["KADO", "Hadiah dibungkus"],
  ["SURAT", "Tulisan untuk dikirim"],
  ["FOTO", "Kenangan yang dipotret"],
  ["LAGU", "Bisa jadi 'lagu kita'"],
  ["DANSA", "Menari berdua"],
  ["HUJAN", "Air jatuh dari awan, enak untuk berteduh berdua"],
  ["PAYUNG", "Pelindung saat hujan"],
  ["PELANGI", "Busur warna-warni setelah hujan"],
  ["RUMAH", "Tempat pulang"],
  ["MASAK", "Mengolah makanan bersama"],
  ["JALAN", "Pergi keluar bersama"],
  ["MOTOR", "Kendaraan roda dua untuk boncengan"],
  ["KERETA", "Kendaraan di atas rel"],
  ["TIKET", "Karcis masuk"],
  ["LIBUR", "Hari tanpa kerja"],
  ["PAGI", "Waktu matahari terbit"],
  ["MALAM", "Waktu bulan dan bintang muncul"],
  ["TELEPON", "Bicara jarak jauh lewat HP"],
  ["PESAN", "Chat yang dikirim"],
  ["JARAK", "Jauh dekatnya dua tempat"],
  ["TEMU", "Kata dasar dari 'ketemu'"],
  ["BAHAGIA", "Sangat senang"],
  ["RESTU", "Izin dan doa orang tua"],
  ["CINCIN", "Perhiasan di jari, tanda ikatan"],
  ["NIKAH", "Ikatan resmi berdua"],
  ["MADU", "Cairan manis dari lebah"],
  ["ES", "Air yang membeku"],
  ["AWAN", "Kapas putih di langit"],
];

type Dir = "a" | "d";
export type TtsWord = { n: number; dir: Dir; r: number; c: number; answer: string; clue: string };
export type TtsCell = { l: string; by: string };
export type TtsState = { w: number; h: number; words: TtsWord[]; cells: Record<string, TtsCell>; hints?: number; solved?: boolean };

type Placed = { word: string; clue: string; dir: Dir; r: number; c: number };

const MAX = 11;

function tryBuild(): Placed[] {
  const pool = shuffle(BANK.filter(([w]) => w.length >= 3 && w.length <= 8)).slice(0, 26);
  pool.sort((a, b) => b[0].length - a[0].length);
  const grid = new Map<string, string>();
  const placed: Placed[] = [];
  const key = (r: number, c: number) => `${r},${c}`;

  const put = (p: Placed) => {
    for (let i = 0; i < p.word.length; i++) {
      const r = p.r + (p.dir === "d" ? i : 0);
      const c = p.c + (p.dir === "a" ? i : 0);
      grid.set(key(r, c), p.word[i]);
    }
    placed.push(p);
  };

  const bounds = (extra?: Placed) => {
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    const all = extra ? [...placed, extra] : placed;
    for (const p of all) {
      minR = Math.min(minR, p.r);
      minC = Math.min(minC, p.c);
      maxR = Math.max(maxR, p.r + (p.dir === "d" ? p.word.length - 1 : 0));
      maxC = Math.max(maxC, p.c + (p.dir === "a" ? p.word.length - 1 : 0));
    }
    return { h: maxR - minR + 1, w: maxC - minC + 1 };
  };

  /** Jumlah persilangan, atau -1 kalau tidak sah. */
  const score = (p: Placed) => {
    const dr = p.dir === "d" ? 1 : 0;
    const dc = p.dir === "a" ? 1 : 0;
    const L = p.word.length;
    if (grid.has(key(p.r - dr, p.c - dc)) || grid.has(key(p.r + dr * L, p.c + dc * L))) return -1;
    let cross = 0;
    for (let i = 0; i < L; i++) {
      const r = p.r + dr * i;
      const c = p.c + dc * i;
      const cur = grid.get(key(r, c));
      if (cur) {
        if (cur !== p.word[i]) return -1;
        // jangan menumpuk kata searah
        if (placed.some((q) => q.dir === p.dir && cellOf(q, r, c))) return -1;
        cross++;
      } else {
        // sel baru: tetangga samping harus kosong
        if (grid.has(key(r + dc, c + dr)) || grid.has(key(r - dc, c - dr))) return -1;
      }
    }
    if (cross === 0) return -1;
    const b = bounds(p);
    if (b.w > MAX || b.h > MAX) return -1;
    return cross;
  };

  const cellOf = (q: Placed, r: number, c: number) => {
    if (q.dir === "a") return r === q.r && c >= q.c && c < q.c + q.word.length;
    return c === q.c && r >= q.r && r < q.r + q.word.length;
  };

  const used = new Set<string>();
  const [w0, c0] = pool[0];
  put({ word: w0, clue: c0, dir: "a", r: 0, c: 0 });
  used.add(w0);

  for (let pass = 0; pass < 2; pass++) {
    for (const [word, clue] of pool) {
      if (used.has(word) || placed.length >= 10) continue;
      let best: Placed | null = null;
      let bestScore = 0;
      for (const q of placed) {
        for (let i = 0; i < q.word.length; i++) {
          for (let j = 0; j < word.length; j++) {
            if (q.word[i] !== word[j]) continue;
            const dir: Dir = q.dir === "a" ? "d" : "a";
            const qr = q.r + (q.dir === "d" ? i : 0);
            const qc = q.c + (q.dir === "a" ? i : 0);
            const cand: Placed = { word, clue, dir, r: dir === "d" ? qr - j : qr, c: dir === "a" ? qc - j : qc };
            const s = score(cand);
            if (s > bestScore || (s === bestScore && s > 0 && Math.random() < 0.3)) {
              best = cand;
              bestScore = s;
            }
          }
        }
      }
      if (best) {
        put(best);
        used.add(word);
      }
    }
  }
  return placed;
}

/** Buat TTS baru secara acak (dipilih yang katanya paling banyak dari beberapa percobaan). */
export function newTts(): TtsState {
  let best: Placed[] = [];
  for (let i = 0; i < 40 && best.length < 9; i++) {
    const p = tryBuild();
    if (p.length > best.length) best = p;
  }
  const minR = Math.min(...best.map((p) => p.r));
  const minC = Math.min(...best.map((p) => p.c));
  const norm = best.map((p) => ({ ...p, r: p.r - minR, c: p.c - minC }));
  const h = Math.max(...norm.map((p) => p.r + (p.dir === "d" ? p.word.length : 1)));
  const w = Math.max(...norm.map((p) => p.c + (p.dir === "a" ? p.word.length : 1)));

  // Penomoran: urut baris lalu kolom; kata mendatar & menurun yang mulai di sel sama berbagi nomor
  const starts = [...new Set(norm.map((p) => `${p.r},${p.c}`))].sort((a, b) => {
    const [ar, ac] = a.split(",").map(Number);
    const [br, bc] = b.split(",").map(Number);
    return ar - br || ac - bc;
  });
  const words: TtsWord[] = norm
    .map((p) => ({ n: starts.indexOf(`${p.r},${p.c}`) + 1, dir: p.dir, r: p.r, c: p.c, answer: p.word, clue: p.clue }))
    .sort((a, b) => (a.dir === b.dir ? a.n - b.n : a.dir === "a" ? -1 : 1));
  return { w, h, words, cells: {}, hints: 0 };
}

/** Kunci jawaban per sel: "r,c" → huruf. */
export function solution(s: TtsState) {
  const map = new Map<string, string>();
  for (const w of s.words) {
    for (let i = 0; i < w.answer.length; i++) {
      const r = w.r + (w.dir === "d" ? i : 0);
      const c = w.c + (w.dir === "a" ? i : 0);
      map.set(`${r},${c}`, w.answer[i]);
    }
  }
  return map;
}

export function wordCells(w: TtsWord) {
  return Array.from({ length: w.answer.length }, (_, i) => `${w.r + (w.dir === "d" ? i : 0)},${w.c + (w.dir === "a" ? i : 0)}`);
}

export function isSolved(s: TtsState, sol = solution(s)) {
  for (const [k, l] of sol) if (s.cells[k]?.l !== l) return false;
  return true;
}
