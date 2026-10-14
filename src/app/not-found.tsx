import Link from "next/link";
import { Cat } from "@/components/cat";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Cat variant="boba" size={120} mood="sleepy" />
      <h1 className="font-display text-[28px] font-semibold">Halaman ini nggak ada</h1>
      <p className="text-[15px] text-muted">Mungkin kucingnya lagi tidur di atas tautannya.</p>
      <Link href="/" className="btn btn-primary">
        Kembali ke beranda
      </Link>
    </div>
  );
}
