import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getViewerEvenIfLocked } from "@/lib/dal";
import { safeNext } from "@/lib/pin";
import { LockScreen } from "./lock-screen";

export const metadata: Metadata = { title: "Masukkan PIN" };

async function Lock({ searchParams }: { searchParams: PageProps<"/kunci">["searchParams"] }) {
  const [viewer, params] = await Promise.all([getViewerEvenIfLocked(), searchParams]);
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  if (!viewer.pinEnabled || viewer.unlocked) redirect(next);
  return <LockScreen name={viewer.profile.display_name} avatar={viewer.profile.avatar_url} next={next} />;
}

export default function KunciPage(props: PageProps<"/kunci">) {
  return (
    <Suspense fallback={<div className="min-h-svh bg-ocean" />}>
      <Lock searchParams={props.searchParams} />
    </Suspense>
  );
}
