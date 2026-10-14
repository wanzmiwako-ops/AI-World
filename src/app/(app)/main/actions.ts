"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCouple } from "@/lib/dal";
import { notifyPartner } from "@/lib/push";
import { gameInfo, type GameKind, type GameRow } from "@/lib/games/catalog";
import { newNgobrol, newSehati, type TalkCategory } from "@/lib/games/cards";
import { newTts } from "@/lib/games/tts";
import { newUno } from "@/lib/games/uno";
import { newXo } from "@/lib/games/xo";

const KINDS: GameKind[] = ["sehati", "tts", "uno", "xo", "ngobrol"];

/** Mulai game baru (papan/kartu dibuat di server), kabari pasangan, lalu buka halamannya. */
export async function startGame(kind: GameKind, opts?: { first?: "me" | "partner"; cats?: TalkCategory[] }) {
  if (!KINDS.includes(kind)) return { error: "Game tidak dikenal." };
  const viewer = await requireCouple();
  if (!viewer.partner) return { error: "Sambungkan dulu dengan pasanganmu, ya." };

  const me = viewer.userId;
  const partner = viewer.partner.id;
  const first = opts?.first === "partner" ? partner : me;
  const second = first === me ? partner : me;

  let state: unknown;
  let turn: string | null = null;
  switch (kind) {
    case "xo":
      state = newXo(first, second);
      turn = first;
      break;
    case "uno":
      state = newUno(first, second);
      turn = first;
      break;
    case "tts":
      state = newTts();
      break;
    case "sehati":
      state = newSehati(me, partner);
      break;
    case "ngobrol":
      state = newNgobrol(me, partner, opts?.cats?.length ? opts.cats : undefined);
      break;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("game_start", { p_kind: kind, p_state: state, p_turn: turn });
  if (error || !data) return { error: error?.message ?? "Gagal memulai game." };
  const game = data as GameRow;

  const info = gameInfo(kind);
  after(() =>
    notifyPartner(supabase, {
      title: `${viewer.profile.display_name} ngajak main ${info.emoji}`,
      body: `${info.name}: ${info.short}. Yuk!`,
      url: `/main/${game.id}`,
      tag: `game-${game.id}`,
    }),
  );
  redirect(`/main/${game.id}`);
}

export async function deleteGame(id: string) {
  await requireCouple();
  const supabase = await createClient();
  await supabase.from("games").delete().eq("id", id);
  redirect("/main");
}
