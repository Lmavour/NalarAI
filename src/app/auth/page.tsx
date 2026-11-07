import type { Metadata } from "next";
import { BrainCircuit, CheckCircle2, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
import { CharacterAvatar } from "@/components/character-avatar";

export const metadata: Metadata = {
  title: "Masuk atau daftar",
  description: "Buat akun NalarAI dan mulai jalur belajar personalmu.",
  robots: { index: false, follow: false },
};

type AuthPageProps = {
  searchParams: Promise<{ mode?: string; next?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const mode = params.mode === "login" ? "login" : "signup";
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/app";

  return (
    <main data-app-root className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <section className="safe-wide-x relative hidden min-h-dvh overflow-hidden bg-cobalt py-10 text-white lg:flex lg:flex-col">
        <div className="dot-field absolute inset-0 opacity-20" aria-hidden="true" />
        <div className="relative"><Brand inverse href="/" /></div>
        <div className="relative my-auto mx-auto max-w-lg py-16">
          <div className="flex items-center gap-5">
             <div className="rounded-[32px] border-4 border-white/30 bg-white p-2 shadow-[0_8px_0_#0f52cc]"><CharacterAvatar character="gara" expression="happy" size="lg" className="size-28" priority /></div>
            <div className="rounded-2xl rounded-bl-sm bg-white px-5 py-4 text-sapphire shadow-float">
               <p className="text-lg font-[950]">Hai, aku Gara.</p>
              <p className="mt-1 text-sm font-bold text-copy">Kita selesaikan satu level dulu.</p>
            </div>
          </div>
          <h1 className="mt-10 text-5xl font-[950] leading-[1.03] tracking-[-0.045em]">Satu akun untuk setiap kemenangan kecil.</h1>
          <p className="mt-5 max-w-md text-lg leading-8 text-blue-100">Progres, hearts, streak, dan ligamu akan tetap ada di semua perangkat.</p>
          <ul className="mt-9 space-y-4">
            {[
              [BrainCircuit, "Jalur belajar dibuat sesuai topikmu"],
              [Trophy, "XP dan liga tersimpan otomatis"],
              [ShieldCheck, "Password di-hash dan sesi disimpan aman"],
            ].map(([Icon, label]) => (
              <li key={label as string} className="flex items-center gap-3 font-extrabold text-blue-50">
                <span className="grid size-9 place-items-center rounded-xl bg-white/15"><Icon className="size-5" /></span>
                {label as string}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs font-bold text-blue-200">Belajar aktif. Bertumbuh konsisten.</p>
      </section>

      <section className="safe-x safe-y flex min-h-dvh items-center justify-center">
        <div className="w-full max-w-[480px]">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Brand href="/" />
            <Link href="/" className="inline-flex min-h-12 items-center px-2 text-sm font-extrabold text-copy hover:text-cobalt">Kembali</Link>
          </div>
          <div className="mb-7 flex items-center gap-3 lg:hidden">
             <CharacterAvatar character="gara" expression="happy" size="md" className="size-16" priority />
            <span className="rounded-2xl rounded-bl-sm border border-line bg-white px-4 py-3 text-sm font-extrabold text-sapphire shadow-soft">Satu level lagi hari ini.</span>
          </div>
          <div className="mb-5">
            <span className="eyebrow"><Sparkles className="size-4" /> Akun pelajar</span>
          </div>
          <AuthForm key={mode} defaultMode={mode} nextPath={next} />
          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-ice p-4 text-sm leading-6 text-copy">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            Kami memeriksa format dan domain email sebelum akun dibuat. Verifikasi OTP akan ditambahkan pada iterasi berikutnya.
          </div>
        </div>
      </section>
    </main>
  );
}
