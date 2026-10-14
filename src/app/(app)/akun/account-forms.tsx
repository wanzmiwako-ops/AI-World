"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { changePassword, removeAvatar, saveAvatar, updateCouple, updateProfile } from "./actions";
import { attempt } from "@/lib/offline";
import { Avatar, FormMessage } from "@/components/ui";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image";
import type { ActionState } from "@/lib/types";

export function AvatarEditor({ userId, name, url }: { userId: string; name: string; url: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(url);
  const [status, setStatus] = useState<ActionState>();
  const [busy, startTransition] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ error: "Pilih file gambar, ya." });
      return;
    }
    setPreview(URL.createObjectURL(file));
    startTransition(async () => {
      const blob = await resizeImage(file, 512, 0.9);
      const path = `${userId}/avatar.webp`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp", cacheControl: "3600" });
      if (error) {
        setStatus({ error: `Gagal mengunggah: ${error.message}` });
        setPreview(url);
        return;
      }
      setStatus(await attempt(() => saveAvatar(path)));
    });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar name={name} url={preview} size={112} className="border-white shadow-soft" />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-label="Ganti foto profil"
          className="absolute -right-1 -bottom-1 flex size-11 items-center justify-center rounded-full border-4 border-sky bg-ocean text-white"
        >
          <Icon name="camera" size={20} />
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" className="sr-only" onChange={onPick} aria-label="Pilih foto profil" />
      <div className="flex gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="chip">
          {busy ? "Mengunggah…" : "Ganti foto"}
        </button>
        {preview && (
          <button
            type="button"
            disabled={busy}
            className="chip"
            onClick={() =>
              startTransition(async () => {
                setPreview(null);
                setStatus(await attempt(() => removeAvatar()));
              })
            }
          >
            Hapus
          </button>
        )}
      </div>
      <FormMessage state={status} />
    </div>
  );
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="display_name" className="label">Nama panggilan</label>
        <input id="display_name" name="display_name" defaultValue={name} maxLength={40} required className="field" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="label">Email</label>
        <input id="email" value={email} readOnly className="field bg-sky text-muted" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Menyimpan…">Simpan profil</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="current" className="label">Kata sandi lama</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="field" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="next" className="label">Kata sandi baru</label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required placeholder="Minimal 8 karakter" className="field" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirm" className="label">Ulangi kata sandi baru</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="field" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Menyimpan…" className="btn btn-dark w-full">
        Ganti kata sandi
      </SubmitButton>
    </form>
  );
}

export function CoupleForm({ anniversary }: { anniversary: string | null }) {
  const [state, action] = useActionState(updateCouple, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="anniversary" className="label">Tanggal jadian</label>
        <input id="anniversary" name="anniversary" type="date" defaultValue={anniversary ?? ""} className="field" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Menyimpan…">Simpan tanggal</SubmitButton>
    </form>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const text = `Yuk gabung di A&I WORLD! Kode undangan aku: ${code}`;
        try {
          if (navigator.share) await navigator.share({ title: "A&I WORLD", text });
          else await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* dibatalkan */
        }
      }}
      className="flex min-h-14 w-full items-center justify-between rounded-[18px] bg-white px-5 text-navy"
    >
      <span className="font-display text-[28px] font-semibold tracking-[0.3em]">{code}</span>
      <span className="flex items-center gap-1.5 text-sm font-bold text-ocean">
        <Icon name={copied ? "check" : "copy"} size={18} />
        {copied ? "Tersalin" : "Bagikan"}
      </span>
    </button>
  );
}
