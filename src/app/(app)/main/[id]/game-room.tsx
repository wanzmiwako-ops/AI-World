"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteGame } from "../actions";
import { StartGameButton } from "../start-button";
import { CatPair } from "@/components/cat";
import { Icon } from "@/components/icon";
import { AppBar, Avatar } from "@/components/ui";
import { gameInfo, TONE, type GameRow } from "@/lib/games/catalog";
import { haptic, play, rainHearts } from "@/lib/feel";
import { useLive, useLiveEvent, type Person } from "@/lib/live";
import { createClient } from "@/lib/supabase/client";
import type { XoState } from "@/lib/games/xo";
import type { UnoState } from "@/lib/games/uno";
import type { TtsState } from "@/lib/games/tts";
import type { NgobrolState, SehatiState } from "@/lib/games/cards";
import { XoGame } from "./xo";
import { UnoGame } from "./uno";
import { TtsGame } from "./tts";
import { SehatiGame } from "./sehati";
import { NgobrolGame } from "./ngobrol";

export type GameCtx<S = Record<string, unknown>> = {
  game: GameRow<S>;
  me: Person;
  partner: Person;
  partnerHere: boolean;
  /** Langkah bergiliran: kirim state baru (dicek versi & giliran di database). */
  move: (state: S, turn: string | null, opts?: { done?: boolean; winner?: string | null }) => Promise<boolean>;
  /** Isian bersamaan: gabungkan patch ke state[key]. */
  merge: (key: string, patch: Record<string, unknown>) => void;
  finish: (winner?: string | null, patch?: Record<string, unknown>) => void;
};

const COLS = "id, kind, state, turn, status, winner, version, created_by, updated_at";

export function GameRoom({ initial, me, partner }: { initial: GameRow; me: Person; partner: Person }) {
  const [game, setGame] = useState<GameRow>(initial);
  const gameRef = useRef(game);
  const pathname = usePathname();
  const partnerPage = useLive((s) => s.partnerPage);
  const partnerOnline = useLive((s) => s.partnerOnline);
  const partnerHere = partnerOnline && partnerPage === pathname;
  const info = gameInfo(game.kind);
  const [, startDelete] = useTransition();

  const accept = useCallback((next: GameRow) => {
    if (next.version < gameRef.current.version) return;
    gameRef.current = next;
    setGame(next);
  }, []);

  // Perubahan dari pasangan (realtime)
  useLiveEvent("game", (p) => {
    if (p.id !== initial.id) return;
    const next = p as unknown as GameRow;
    const wasDone = gameRef.current.status === "done";
    accept(next);
    if (p.by !== me.id && next.status === "playing") play("tap");
    if (!wasDone && next.status === "done") celebrate(next);
  });

  // Kembali ke aplikasi → ambil data terbaru (siapa tahu ada langkah yang terlewat)
  useEffect(() => {
    const supabase = createClient();
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.from("games").select(COLS).eq("id", initial.id).maybeSingle();
      if (data) accept(data as GameRow);
    }
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [initial.id, accept]);

  function celebrate(g: GameRow) {
    if (!g.winner || g.winner === me.id) {
      play("chime");
      haptic([40, 30, 80]);
      rainHearts(g.winner ? 22 : 16);
    } else {
      play("meow");
    }
  }

  const move = useCallback<GameCtx["move"]>(
    async (state, turn, opts) => {
      const prev = gameRef.current;
      const optimistic: GameRow = {
        ...prev,
        state: state as Record<string, unknown>,
        turn: opts?.done ? null : turn,
        status: opts?.done ? "done" : "playing",
        winner: opts?.winner ?? null,
        version: prev.version + 1,
      };
      gameRef.current = optimistic;
      setGame(optimistic);
      if (opts?.done) celebrate(optimistic);
      const { data, error } = await createClient().rpc("game_move", {
        p_id: prev.id,
        p_version: prev.version,
        p_state: state,
        p_turn: opts?.done ? null : turn,
        p_status: opts?.done ? "done" : "playing",
        p_winner: opts?.winner ?? null,
      });
      const res = data as { ok: boolean; game: GameRow } | null;
      if (error || !res) {
        gameRef.current = prev;
        setGame(prev);
        play("error");
        return false;
      }
      if (!res.ok) {
        gameRef.current = res.game;
        setGame(res.game);
        play("error");
        return false;
      }
      accept(res.game);
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accept],
  );

  const merge = useCallback<GameCtx["merge"]>(
    (key, patch) => {
      const prev = gameRef.current;
      const cur = (prev.state[key] as Record<string, unknown>) ?? {};
      const optimistic: GameRow = { ...prev, state: { ...prev.state, [key]: { ...cur, ...patch } } };
      gameRef.current = optimistic;
      setGame(optimistic);
      void createClient()
        .rpc("game_merge", { p_id: prev.id, p_key: key, p_patch: patch })
        .then(({ data }) => {
          if (data) accept(data as GameRow);
        });
    },
    [accept],
  );

  const finish = useCallback<GameCtx["finish"]>(
    (winner = null, patch) => {
      const prev = gameRef.current;
      if (prev.status === "done") return;
      const optimistic: GameRow = { ...prev, status: "done", winner, turn: null, state: { ...prev.state, ...patch } };
      gameRef.current = optimistic;
      setGame(optimistic);
      celebrate(optimistic);
      void createClient()
        .rpc("game_finish", { p_id: prev.id, p_winner: winner, p_patch: patch ?? null })
        .then(({ data }) => {
          if (data) accept(data as GameRow);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accept],
  );

  const ctx: GameCtx = { game, me, partner, partnerHere, move, merge, finish };
  const done = game.status === "done";
  const winnerName = game.winner === me.id ? "Kamu menang!" : game.winner === partner.id ? `${partner.name} menang!` : null;

  return (
    <>
      <AppBar>
        <Link href="/main" aria-label="Kembali ke Main Bareng" className="tap flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-soft">
          <Icon name="back" size={20} />
        </Link>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-2xl ${TONE[info.tone]}`}>{info.emoji}</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-display text-[22px] leading-tight font-semibold lg:text-[32px]">{info.name}</h1>
          <span className="flex items-center gap-1.5 truncate text-[13px] text-muted">
            <span className={`size-2 rounded-full ${partnerHere ? "bg-[#2FBF71]" : "bg-[#B7C6D3]"}`} />
            {partnerHere ? `${partner.name} lagi di sini` : partnerOnline ? `${partner.name} online, belum masuk game` : `${partner.name} belum buka game`}
          </span>
        </div>
        <span className="hidden items-center sm:flex">
          <Avatar name={me.name} url={me.avatar} size={40} />
          <Avatar name={partner.name} url={partner.avatar} size={40} tone="aqua" className="-ml-3" />
        </span>
      </AppBar>

      {done && (
        <section className="hero relative flex animate-rise flex-col items-center gap-3 overflow-hidden rounded-[28px] p-5 text-center sm:flex-row sm:text-left">
          <CatPair size={64} motion="hop" moods={game.winner && game.winner !== me.id ? ["sad", "joy"] : ["joy", "love"]} />
          <div className="flex flex-1 flex-col">
            <span className="font-display text-2xl font-semibold">{winnerName ?? "Selesai!"}</span>
            <span className="text-sm opacity-90">Main lagi? Pasanganmu langsung dapat ajakan.</span>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <StartGameButton kind={game.kind} variant="white" className="px-6">
              Main lagi
            </StartGameButton>
          </div>
        </section>
      )}

      {game.kind === "xo" && <XoGame ctx={ctx as unknown as GameCtx<XoState>} />}
      {game.kind === "uno" && <UnoGame ctx={ctx as unknown as GameCtx<UnoState>} />}
      {game.kind === "tts" && <TtsGame ctx={ctx as unknown as GameCtx<TtsState>} />}
      {game.kind === "sehati" && <SehatiGame ctx={ctx as unknown as GameCtx<SehatiState>} />}
      {game.kind === "ngobrol" && <NgobrolGame ctx={ctx as unknown as GameCtx<NgobrolState>} />}

      {!done && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            className="btn btn-ghost text-muted"
            onClick={() => {
              if (confirm("Hentikan game ini?")) startDelete(() => deleteGame(game.id));
            }}
          >
            Hentikan game
          </button>
        </div>
      )}
    </>
  );
}
