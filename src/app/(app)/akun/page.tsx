import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cat } from "@/components/cat";
import { Icon } from "@/components/icon";
import { FormMessage, Page, PageHeader, PageSkeleton } from "@/components/ui";
import { getViewer } from "@/lib/dal";
import { signOut } from "./actions";
import { AvatarEditor, CopyCode, CoupleForm, PasswordForm, ProfileForm } from "./account-forms";

export const metadata: Metadata = { title: "Akun" };

async function AccountContent({ searchParams }: { searchParams: PageProps<"/akun">["searchParams"] }) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {params.password === "baru" && (
        <div className="lg:col-span-2">
          <FormMessage state={{ message: "Kata sandi baru sudah aktif." }} />
        </div>
      )}

      <section className="card flex animate-rise flex-col gap-6 p-6" aria-labelledby="profil">
        <h2 id="profil" className="font-display text-xl font-medium">Profil</h2>
        <AvatarEditor userId={viewer.userId} name={viewer.profile.display_name} url={viewer.profile.avatar_url} />
        <ProfileForm name={viewer.profile.display_name} email={viewer.email} />
      </section>

      <div className="flex flex-col gap-5">
        <section className="card flex animate-rise flex-col gap-4 p-6" aria-labelledby="pasangan">
          <div className="flex items-center justify-between">
            <h2 id="pasangan" className="font-display text-xl font-medium">Pasangan</h2>
            <Cat variant="boba" size={48} mood={viewer.partner ? "love" : "sleepy"} />
          </div>
          {viewer.couple ? (
            <>
              <p className="text-[15px] text-ink-soft">
                {viewer.partner ? (
                  <>Terhubung dengan <b className="text-navy">{viewer.partner.display_name}</b>.</>
                ) : (
                  <>Pasanganmu belum bergabung. Kirim kode ini ke dia:</>
                )}
              </p>
              {!viewer.partner && (
                <div className="rounded-[22px] bg-tint p-2">
                  <CopyCode code={viewer.couple.invite_code} />
                </div>
              )}
              <CoupleForm anniversary={viewer.couple.anniversary} />
            </>
          ) : (
            <Link href="/onboarding" className="btn btn-primary">Sambungkan dengan pasangan</Link>
          )}
        </section>

        <section className="card flex animate-rise flex-col gap-4 p-6" aria-labelledby="sandi">
          <h2 id="sandi" className="flex items-center gap-2 font-display text-xl font-medium">
            <Icon name="lock" size={20} className="text-ocean" /> Ganti kata sandi
          </h2>
          <PasswordForm />
        </section>

        <form action={signOut}>
          <button type="submit" className="btn w-full bg-white text-[#9b1c3a]">
            <Icon name="logout" size={20} /> Keluar
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AkunPage(props: PageProps<"/akun">) {
  return (
    <Page>
      <PageHeader title="Akun" subtitle="Foto profil, nama, dan keamanan" back="/" />
      <Suspense fallback={<PageSkeleton />}>
        <AccountContent searchParams={props.searchParams} />
      </Suspense>
    </Page>
  );
}
