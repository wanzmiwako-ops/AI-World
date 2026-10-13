import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CatPair } from "@/components/cat";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui";
import { getViewer } from "@/lib/dal";
import { OnboardingForms } from "./onboarding-forms";

export const metadata: Metadata = { title: "Mulai" };

async function Greeting() {
  const viewer = await getViewer();
  if (viewer.couple) redirect("/");
  return (
    <h1 className="font-display text-[32px] leading-tight font-semibold">
      Halo, {viewer.profile.display_name}!
      <br />
      Ayo sambungkan dengan pasanganmu.
    </h1>
  );
}

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 pt-[max(env(safe-area-inset-top),40px)] pb-12">
      <Logo size={40} textClass="text-[22px]" />
      <div className="flex justify-center py-2">
        <CatPair size={110} motion="hop" moods={["joy", "joy"]} />
      </div>
      <Suspense fallback={<Skeleton className="h-20" />}>
        <Greeting />
      </Suspense>
      <OnboardingForms />
    </div>
  );
}
