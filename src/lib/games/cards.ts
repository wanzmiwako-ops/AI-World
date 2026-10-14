import { shuffle } from "./catalog";

/* ------------------------------------------------------------------ */
/* Kita Sehati?: pertanyaan "ini atau itu"                             */
/* ------------------------------------------------------------------ */

export const SEHATI_Q: [string, string, string][] = [
  ["Kencan ideal", "Nonton di bioskop", "Jalan-jalan sore"],
  ["Liburan", "Pantai", "Gunung"],
  ["Minuman", "Kopi", "Teh / boba"],
  ["Makan malam", "Masak bareng di rumah", "Cari tempat makan baru"],
  ["Hewan", "Kucing", "Anjing"],
  ["Waktu favorit", "Pagi yang cerah", "Malam yang tenang"],
  ["Kalau marahan", "Langsung diomongin", "Tenang dulu, baru ngobrol"],
  ["Hadiah", "Barang yang dipakai", "Pengalaman bareng"],
  ["Film", "Komedi romantis", "Horor sambil pelukan"],
  ["Musik di jalan", "Nyanyi bareng keras-keras", "Ngobrol aja"],
  ["Foto berdua", "Banyak, buat kenangan", "Secukupnya, nikmati momen"],
  ["Jajan malam", "Martabak", "Sate"],
  ["Rencana weekend", "Sudah diatur dari jauh hari", "Spontan aja"],
  ["Romantis itu", "Kata-kata manis", "Tindakan kecil"],
  ["Hujan-hujan", "Rebahan dan nonton", "Main hujan bareng"],
  ["Rumah impian", "Di kota yang ramai", "Di tempat tenang dekat alam"],
  ["Bahasa cinta", "Pelukan", "Waktu berkualitas"],
  ["Chat", "Pesan panjang", "Telepon / video call"],
  ["Ulang tahun", "Kejutan besar", "Rayakan berdua saja"],
  ["Pagi hari", "Bangun pagi", "Tidur lagi 5 menit"],
  ["Makanan", "Pedas", "Manis"],
  ["Jalan-jalan", "Naik motor", "Naik mobil / kereta"],
  ["Tempat kencan", "Kafe estetik", "Warung kaki lima"],
  ["Kalau bosan", "Main game", "Keluar cari angin"],
  ["Hobi baru bareng", "Olahraga", "Masak / bikin kue"],
  ["Musim", "Kemarau cerah", "Musim hujan sejuk"],
  ["Nonton", "Serial maraton", "Satu film sampai tamat"],
  ["Sarapan", "Nasi uduk / bubur", "Roti dan kopi"],
  ["Masa depan", "Rencanakan detail", "Jalani dan lihat nanti"],
  ["Cara minta maaf", "Bilang langsung", "Kasih kejutan kecil"],
  ["Tidur", "Lampu mati", "Lampu redup"],
  ["Belanja", "Online", "Datang ke toko"],
  ["Destinasi impian", "Jepang", "Eropa"],
  ["Kencan pertama yang ideal", "Makan malam", "Jalan di taman"],
  ["Cara melepas stres", "Cerita ke pasangan", "Me time dulu"],
  ["Lagu", "Galau mellow", "Riang dan ceria"],
  ["Hewan peliharaan", "Satu, dimanja", "Banyak, rame"],
  ["Malam minggu", "Keluar rumah", "Di rumah saja"],
  ["Es krim", "Cokelat", "Vanila / stroberi"],
  ["Pesta", "Ramai-ramai", "Kecil dan akrab"],
];

export type SehatiState = {
  players: [string, string];
  qs: number[];
  answers: Record<string, 0 | 1>;
  score?: number;
};

export function newSehati(a: string, b: string): SehatiState {
  return { players: [a, b], qs: shuffle(SEHATI_Q.map((_, i) => i)).slice(0, 10), answers: {} };
}

/** Indeks ronde berjalan: ronde pertama yang belum dijawab dua-duanya. */
export function sehatiRound(s: SehatiState) {
  for (let i = 0; i < s.qs.length; i++) {
    if (s.answers[`${i}:${s.players[0]}`] === undefined || s.answers[`${i}:${s.players[1]}`] === undefined) return i;
  }
  return s.qs.length;
}

export function sehatiScore(s: SehatiState, upTo = s.qs.length) {
  let n = 0;
  for (let i = 0; i < upTo; i++) {
    const a = s.answers[`${i}:${s.players[0]}`];
    const b = s.answers[`${i}:${s.players[1]}`];
    if (a !== undefined && a === b) n++;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* Kartu Ngobrol                                                       */
/* ------------------------------------------------------------------ */

export type TalkCategory = "manis" | "dalam" | "lucu" | "tantangan";

export const TALK_CATS: Record<TalkCategory, { name: string; emoji: string; tone: string }> = {
  manis: { name: "Manis", emoji: "🍬", tone: "bg-pink-soft text-[#9b1c3a]" },
  dalam: { name: "Dalam", emoji: "🌊", tone: "bg-tint text-ocean-dark" },
  lucu: { name: "Lucu", emoji: "😹", tone: "bg-sand-soft text-sand-ink" },
  tantangan: { name: "Tantangan", emoji: "🔥", tone: "bg-aqua-soft text-aqua-ink" },
};

export const TALK: [TalkCategory, string][] = [
  ["manis", "Kapan pertama kali kamu sadar kamu suka aku?"],
  ["manis", "Momen kita yang paling sering kamu ingat?"],
  ["manis", "Satu hal kecil dariku yang bikin kamu senyum?"],
  ["manis", "Lagu apa yang mengingatkanmu padaku?"],
  ["manis", "Panggilan sayang apa yang paling kamu suka?"],
  ["manis", "Kalau aku jadi makanan, aku makanan apa? Kenapa?"],
  ["manis", "Hadiah paling berkesan yang pernah kamu terima dariku?"],
  ["manis", "Apa yang kamu pikirkan saat kita pertama ketemu?"],
  ["manis", "Bagian mana dari hari ini yang ingin kamu ceritakan ke aku?"],
  ["manis", "Tiga kata yang menggambarkan aku menurutmu?"],
  ["manis", "Kencan impianmu bareng aku seperti apa?"],
  ["manis", "Kapan kamu merasa paling disayang olehku?"],
  ["dalam", "Apa yang paling kamu butuhkan dariku saat kamu sedih?"],
  ["dalam", "Satu hal yang ingin kita perbaiki bersama?"],
  ["dalam", "Apa mimpi besarmu yang belum pernah kamu ceritakan?"],
  ["dalam", "Hal apa yang bikin kamu merasa aman di hubungan ini?"],
  ["dalam", "Kebiasaan keluarga apa yang ingin kamu bawa ke rumah kita nanti?"],
  ["dalam", "Apa ketakutan terbesarmu tentang masa depan?"],
  ["dalam", "Bagaimana caraku bisa lebih mendukungmu bulan ini?"],
  ["dalam", "Kapan terakhir kamu merasa bangga pada dirimu sendiri?"],
  ["dalam", "Apa arti 'rumah' buat kamu?"],
  ["dalam", "Satu pelajaran terbesar dari hubungan kita sejauh ini?"],
  ["dalam", "Lima tahun lagi, kamu ingin kita sedang apa?"],
  ["dalam", "Apa yang ingin kamu dengar dariku lebih sering?"],
  ["lucu", "Kebiasaanku yang paling aneh tapi lucu?"],
  ["lucu", "Kalau kita tukar badan sehari, apa yang pertama kamu lakukan?"],
  ["lucu", "Kalau kita punya kucing, namanya siapa?"],
  ["lucu", "Momen paling memalukan saat bersamaku?"],
  ["lucu", "Kalau hidup kita jadi film, judulnya apa?"],
  ["lucu", "Siapa di antara kita yang lebih rewel kalau lapar?"],
  ["lucu", "Tirukan gaya bicaraku waktu lagi ngambek!"],
  ["lucu", "Kalau aku hewan, aku hewan apa?"],
  ["lucu", "Hal teraneh yang pernah kamu cari di internet?"],
  ["lucu", "Siapa yang bakal menang kalau kita lomba tidur siang?"],
  ["lucu", "Makanan apa yang tidak akan pernah kamu bagi denganku?"],
  ["lucu", "Kalau kita jadi kucing, siapa Mochi dan siapa Boba?"],
  ["tantangan", "Kirim foto selfie paling jelek ke chat sekarang!"],
  ["tantangan", "Puji pasanganmu 30 detik tanpa berhenti."],
  ["tantangan", "Kirim voice note nyanyi satu bait lagu cinta."],
  ["tantangan", "Tulis puisi 4 baris untuk pasanganmu sekarang."],
  ["tantangan", "Rencanakan kencan berikutnya dalam 1 menit, lalu masukkan ke Kalender."],
  ["tantangan", "Ceritakan kenangan kita dengan gaya presenter berita."],
  ["tantangan", "Kirim 'Kangen' dari Beranda tiga kali berturut-turut."],
  ["tantangan", "Tiru suara kucing yang sedang minta makan."],
  ["tantangan", "Sebut 5 hal yang kamu syukuri tentang hubungan ini."],
  ["tantangan", "Ganti tema dunia kalian ke pilihan pasanganmu."],
];

export type NgobrolState = { players: [string, string]; deck: number[]; idx: number; cats: TalkCategory[] };

export function newNgobrol(a: string, b: string, cats: TalkCategory[] = ["manis", "dalam", "lucu", "tantangan"]): NgobrolState {
  const deck = shuffle(TALK.map((_, i) => i).filter((i) => cats.includes(TALK[i][0])));
  return { players: [a, b], deck, idx: 0, cats };
}
