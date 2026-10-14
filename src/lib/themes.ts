/** Tema "dunia" kalian. Warna sebenarnya ada di globals.css ([data-theme="…"]). */

export const THEME_IDS = ["ocean", "flora", "fauna", "hiburan", "misteri", "movie", "galaksi"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeInfo = {
  id: ThemeId;
  name: string;
  tagline: string;
  art: string;
  deco: [string, string, string];
  /** warna utama, gelap, aksen, latar (untuk pratinjau & warna bar browser) */
  colors: { primary: string; dark: string; accent: string; bg: string };
};

export const THEMES: ThemeInfo[] = [
  {
    id: "ocean",
    name: "Samudra Biru",
    tagline: "Segar, tenang, penuh gelembung",
    art: "🐳",
    deco: ["🫧", "🐚", "🐟"],
    colors: { primary: "#0a6ebd", dark: "#08548f", accent: "#7fdbea", bg: "#f2f8fc" },
  },
  {
    id: "flora",
    name: "Taman Bunga",
    tagline: "Manis seperti kencan di kebun",
    art: "🌷",
    deco: ["🌸", "🌼", "🍃"],
    colors: { primary: "#1f8a50", dark: "#166b3d", accent: "#ff9cc2", bg: "#f3faf4" },
  },
  {
    id: "fauna",
    name: "Hutan Safari",
    tagline: "Petualangan bareng hewan lucu",
    art: "🦁",
    deco: ["🐾", "🦒", "🌿"],
    colors: { primary: "#b35a10", dark: "#8c450b", accent: "#a8d982", bg: "#fbf6ee" },
  },
  {
    id: "hiburan",
    name: "Pasar Malam",
    tagline: "Bianglala, balon, dan permen kapas",
    art: "🎡",
    deco: ["🎈", "🍭", "🎠"],
    colors: { primary: "#b52f86", dark: "#8f2269", accent: "#8fe3ff", bg: "#fdf4fa" },
  },
  {
    id: "misteri",
    name: "Misteri Malam",
    tagline: "Bulan, bintang, dan teka-teki",
    art: "🔮",
    deco: ["🌙", "✨", "🗝️"],
    colors: { primary: "#5b3fc4", dark: "#432d99", accent: "#c8b8ff", bg: "#f1effa" },
  },
  {
    id: "movie",
    name: "Malam Bioskop",
    tagline: "Popcorn, karpet merah, kita pemeran utama",
    art: "🎬",
    deco: ["🍿", "🎞️", "⭐"],
    colors: { primary: "#c0283a", dark: "#971d2c", accent: "#ffd56b", bg: "#faf5f1" },
  },
  {
    id: "galaksi",
    name: "Luar Angkasa",
    tagline: "Cinta kita sampai ke bintang",
    art: "🪐",
    deco: ["⭐", "🚀", "☄️"],
    colors: { primary: "#3b4fd8", dark: "#2c3bab", accent: "#8ef0e0", bg: "#eff1fb" },
  },
];

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && (THEME_IDS as readonly string[]).includes(v);
}

export function themeInfo(id: string | null | undefined): ThemeInfo {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export const THEME_STORAGE_KEY = "aiw-theme";

/** Dijalankan sebelum halaman tampil: pasang tema terakhir supaya tidak berkedip. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t&&/^[a-z]{3,10}$/.test(t)){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

/** Pasang tema di halaman sekarang (dan ingat untuk kunjungan berikutnya). */
export function applyTheme(id: ThemeId) {
  const info = themeInfo(id);
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {}
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", info.colors.primary));
}
