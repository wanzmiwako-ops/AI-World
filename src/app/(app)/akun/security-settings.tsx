"use client";

import { useState, useTransition } from "react";
import { lockNow, removePin, saveLockMinutes, savePin } from "./actions";
import { Cat } from "@/components/cat";
import { Icon } from "@/components/icon";
import { PinPad } from "@/components/pin-pad";
import { Sheet } from "@/components/sheet";
import { FormMessage } from "@/components/ui";
import { burstHearts, play } from "@/lib/feel";

type Flow = "create" | "change" | "remove" | null;
type Step = "current" | "new" | "confirm";

const MINUTES = [1, 5, 15];

export function SecuritySettings({ pinEnabled, lockMinutes }: { pinEnabled: boolean; lockMinutes: number }) {
  const [flow, setFlow] = useState<Flow>(null);
  const [step, setStep] = useState<Step>("new");
  const [current, setCurrent] = useState<string | null>(null);
  const [first, setFirst] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(lockMinutes);
  const [pending, start] = useTransition();

  function open(f: Exclude<Flow, null>) {
    setFlow(f);
    setStep(f === "create" ? "new" : "current");
    setCurrent(null);
    setFirst(null);
    setHint(null);
    setDone(null);
  }

  function fail(msg: string) {
    setHint(msg);
    setShake((s) => s + 1);
  }

  function onPin(pin: string) {
    if (step === "current") {
      if (flow === "remove") {
        start(async () => {
          const res = await removePin(pin);
          if (res.error) return fail(res.error);
          setFlow(null);
          setDone("PIN dimatikan.");
        });
        return;
      }
      setCurrent(pin);
      setStep("new");
      setHint(null);
      return;
    }
    if (step === "new") {
      setFirst(pin);
      setStep("confirm");
      setHint(null);
      return;
    }
    if (pin !== first) {
      setStep("new");
      setFirst(null);
      return fail("PIN tidak sama. Ulangi dari awal, ya.");
    }
    start(async () => {
      const res = await savePin(pin, current, minutes);
      if (res.error) {
        setStep(flow === "change" ? "current" : "new");
        return fail(res.error);
      }
      play("chime");
      burstHearts(window.innerWidth / 2, window.innerHeight / 2, 14);
      setFlow(null);
      setDone(flow === "change" ? "PIN berhasil diganti." : "PIN aktif! Aplikasi akan meminta PIN saat dibuka.");
    });
  }

  const titles: Record<Step, string> = {
    current: flow === "remove" ? "Masukkan PIN untuk mematikan" : "Masukkan PIN lama",
    new: "Buat PIN baru (4 angka)",
    confirm: "Ulangi PIN baru",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-[20px] bg-sky p-4">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${pinEnabled ? "bg-aqua-soft text-aqua-ink" : "bg-white text-muted"}`}>
          <Icon name="lock" size={22} />
        </span>
        <div className="flex flex-1 flex-col">
          <span className="font-bold">{pinEnabled ? "PIN aktif" : "PIN belum dipasang"}</span>
          <span className="text-[13px] text-muted">
            {pinEnabled ? `Terkunci otomatis setelah ${minutes} menit ditinggal` : "Minta PIN setiap aplikasi dibuka"}
          </span>
        </div>
      </div>

      {done && <FormMessage state={{ message: done }} />}

      {pinEnabled ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="label">Kunci otomatis setelah ditinggal</span>
            <div className="flex gap-2">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={minutes === m}
                  className="chip flex-1 justify-center"
                  onClick={() => {
                    setMinutes(m);
                    start(() => saveLockMinutes(m).then(() => undefined));
                  }}
                >
                  {m} menit
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn bg-white px-3 text-base whitespace-nowrap text-navy shadow-soft" onClick={() => open("change")}>
              Ganti PIN
            </button>
            <form action={lockNow}>
              <button type="submit" className="btn btn-dark w-full px-3 text-base whitespace-nowrap">
                Kunci sekarang
              </button>
            </form>
          </div>
          <button type="button" className="btn btn-ghost text-[#9b1c3a]" onClick={() => open("remove")}>
            Matikan PIN
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => open("create")}>
          Pasang PIN
        </button>
      )}

      <Sheet open={flow !== null} onClose={() => setFlow(null)} title={flow === "remove" ? "Matikan PIN" : flow === "change" ? "Ganti PIN" : "Pasang PIN"}>
        <div className="flex flex-col items-center gap-2 text-center">
          <Cat variant="boba" size={72} mood={hint ? "sad" : "happy"} />
          <p className="font-display text-lg font-medium">{titles[step]}</p>
          <p className="min-h-5 text-sm font-semibold text-[#9b1c3a]" role="alert">
            {hint}
          </p>
        </div>
        <div className="flex justify-center pb-2">
          <PinPad key={`${flow}-${step}`} onComplete={onPin} disabled={pending} shakeKey={shake} />
        </div>
      </Sheet>
    </div>
  );
}
