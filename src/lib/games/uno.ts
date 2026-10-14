import { shuffle } from "./catalog";

/**
 * UNO untuk berdua. Kartu ditulis "warna:nilai":
 *   warna r/y/g/b, nilai 0–9, s (lewati), r (balik), d (+2)
 *   kartu bebas: "w:w" (ganti warna), "w:4" (+4)
 * Berdua: Lewati & Balik sama-sama membuat kamu jalan lagi.
 */
export type Color = "r" | "y" | "g" | "b";
export type UnoState = {
  players: [string, string];
  hands: Record<string, string[]>;
  deck: string[];
  pile: string[];
  color: Color;
  drawn: string | null;
  last: { by: string; card: string | null; note: string } | null;
};

export const COLORS: Color[] = ["r", "y", "g", "b"];
export const COLOR_NAME: Record<string, string> = { r: "Merah", y: "Kuning", g: "Hijau", b: "Biru", w: "Bebas" };

export function fullDeck(): string[] {
  const deck: string[] = [];
  for (const c of COLORS) {
    deck.push(`${c}:0`);
    for (const v of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "s", "r", "d"]) deck.push(`${c}:${v}`, `${c}:${v}`);
  }
  for (let i = 0; i < 4; i++) deck.push("w:w", "w:4");
  return deck;
}

export function parse(card: string) {
  const [c, v] = card.split(":");
  return { c: c as Color | "w", v };
}

export function label(card: string) {
  const { c, v } = parse(card);
  if (c === "w") return v === "4" ? "+4" : "Warna";
  return v === "s" ? "Lewati" : v === "r" ? "Balik" : v === "d" ? "+2" : v;
}

export function other(s: UnoState, me: string) {
  return s.players[0] === me ? s.players[1] : s.players[0];
}

export function top(s: UnoState) {
  return s.pile[s.pile.length - 1];
}

export function canPlay(s: UnoState, card: string) {
  const { c, v } = parse(card);
  if (c === "w") return true;
  const t = parse(top(s));
  return c === s.color || v === t.v;
}

function clone(s: UnoState): UnoState {
  return { ...s, hands: Object.fromEntries(Object.entries(s.hands).map(([k, v]) => [k, v.slice()])), deck: s.deck.slice(), pile: s.pile.slice() };
}

/** Ambil n kartu dari tumpukan; kalau habis, kartu buangan dikocok ulang. */
function take(s: UnoState, who: string, n: number) {
  for (let i = 0; i < n; i++) {
    if (!s.deck.length) {
      const keep = s.pile.pop()!;
      s.deck = shuffle(s.pile);
      s.pile = [keep];
      if (!s.deck.length) return;
    }
    s.hands[who].push(s.deck.pop()!);
  }
}

export function newUno(a: string, b: string): UnoState {
  const deck = shuffle(fullDeck());
  const hands: Record<string, string[]> = { [a]: [], [b]: [] };
  for (let i = 0; i < 7; i++) {
    hands[a].push(deck.pop()!);
    hands[b].push(deck.pop()!);
  }
  // Kartu pertama harus kartu angka
  let idx = deck.findIndex((c) => /^[rygb]:\d$/.test(c));
  if (idx < 0) idx = 0;
  const first = deck.splice(idx, 1)[0];
  return { players: [a, b], hands, deck, pile: [first], color: parse(first).c as Color, drawn: null, last: null };
}

export type UnoResult = { state: UnoState; turn: string; winner: string | null };

export function playCard(prev: UnoState, me: string, index: number, chosen?: Color): UnoResult | null {
  const card = prev.hands[me]?.[index];
  if (!card || !canPlay(prev, card)) return null;
  if (prev.drawn && card !== prev.drawn) return null;
  const s = clone(prev);
  const opp = other(s, me);
  s.hands[me].splice(index, 1);
  s.pile.push(card);
  s.drawn = null;
  const { c, v } = parse(card);
  s.color = c === "w" ? (chosen ?? "r") : c;

  let turn = opp;
  let note = "";
  if (v === "s" || v === "r") {
    turn = me;
    note = "lawan dilewati";
  } else if (c !== "w" && v === "d") {
    take(s, opp, 2);
    turn = me;
    note = "lawan ambil 2 kartu";
  } else if (c === "w" && v === "4") {
    take(s, opp, 4);
    turn = me;
    note = `lawan ambil 4 kartu · warna ${COLOR_NAME[s.color]}`;
  } else if (c === "w") {
    note = `ganti warna ${COLOR_NAME[s.color]}`;
  }
  s.last = { by: me, card, note };
  const winner = s.hands[me].length === 0 ? me : null;
  return { state: s, turn: winner ? me : turn, winner };
}

export function drawCard(prev: UnoState, me: string): UnoResult {
  const s = clone(prev);
  const opp = other(s, me);
  take(s, me, 1);
  const got = s.hands[me][s.hands[me].length - 1];
  if (got && canPlay(s, got)) {
    s.drawn = got;
    s.last = { by: me, card: null, note: "ambil 1 kartu" };
    return { state: s, turn: me, winner: null };
  }
  s.drawn = null;
  s.last = { by: me, card: null, note: "ambil 1 kartu & lewat" };
  return { state: s, turn: opp, winner: null };
}

export function passTurn(prev: UnoState, me: string): UnoResult {
  const s = clone(prev);
  s.drawn = null;
  s.last = { by: me, card: null, note: "lewat" };
  return { state: s, turn: other(s, me), winner: null };
}
