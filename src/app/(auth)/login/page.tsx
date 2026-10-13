import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

async function LoginWithParams({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  return <LoginForm linkError={params.error === "link"} />;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginForm />}>
      <LoginWithParams searchParams={props.searchParams} />
    </Suspense>
  );
}
