"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Brand } from "@/components/brand";
import { CharacterAvatar } from "@/components/character-avatar";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="safe-x safe-y grid min-h-dvh place-items-center bg-canvas">
      <div className="w-full max-w-lg rounded-[28px] border border-line bg-white p-6 text-center shadow-soft sm:p-10">
        <Brand />
        <CharacterAvatar character="gara" expression="thinking" size="lg" className="mx-auto mt-10 size-32" priority />
        <AlertCircle className="mx-auto mt-5 size-7 text-danger" />
        <h1 className="mt-3 text-3xl font-[950] tracking-tight text-ink">Jalurmu belum dapat dimuat.</h1>
        <p className="mt-3 leading-7 text-copy">Progresmu tetap aman. Coba muat ulang setelah memastikan koneksi database tersedia.</p>
        <button type="button" onClick={reset} className="button-primary mt-7 min-h-12"><RefreshCw className="size-5" /> Coba lagi</button>
      </div>
    </main>
  );
}
