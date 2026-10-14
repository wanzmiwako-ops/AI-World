"use client";

import { useState, useTransition, type ReactNode } from "react";
import { startGame } from "./actions";
import { attempt } from "@/lib/offline";
import type { GameKind } from "@/lib/games/catalog";
import { haptic, play } from "@/lib/feel";

export function StartGameButton({
  kind,
  children,
  disabled,
  variant = "primary",
  className = "",
}: {
  kind: GameKind;
  children: ReactNode;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "white";
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const style =
    variant === "primary" ? "btn-primary flex-1" : variant === "white" ? "bg-white text-ocean flex-1" : "bg-sky text-navy px-5";
  return (
    <>
      <button
        type="button"
        disabled={disabled || pending}
        className={`btn min-h-12 text-base ${style} ${className}`}
        onClick={() => {
          play("pop");
          haptic(12);
          setError(null);
          start(async () => {
            const res = await attempt(() => startGame(kind));
            if (res && "error" in res && res.error) setError(res.error);
          });
        }}
      >
        {pending ? "Menyiapkan…" : children}
      </button>
      {error && (
        <p role="alert" className="basis-full text-sm font-semibold text-[#9b1c3a]">
          {error}
        </p>
      )}
    </>
  );
}
