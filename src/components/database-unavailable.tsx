"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Brand } from "@/components/brand";
import { CharacterAvatar } from "@/components/character-avatar";

export function DatabaseUnavailable() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <main className="safe-x safe-y grid min-h-dvh place-items-center bg-canvas [@media(max-height:600px)]:pt-[max(12px,var(--safe-top))] [@media(max-height:600px)]:pb-[max(12px,var(--safe-bottom))]" data-database-unavailable>
      <section className="w-full max-w-md rounded-3xl border border-line bg-white p-6 text-center shadow-soft [@media(max-height:600px)]:p-4" aria-labelledby="database-unavailable-title">
        <Brand />
        <div className="mt-4 flex items-center gap-3 text-left">
          <div className="shrink-0 [@media(max-height:600px)]:hidden"><CharacterAvatar character="mang_ujang" expression="thinking" size="md" priority /></div>
          <h1 id="database-unavailable-title" className="text-xl font-black tracking-tight text-ink">Belum dapat terhubung.</h1>
        </div>
        <p role="status" className="mt-3 text-sm leading-6 text-copy">Periksa koneksi lalu coba lagi.</p>
        <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} aria-busy={pending} className="button-primary mt-4 w-full rounded-full">
          <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />{pending ? "Mencoba..." : "Coba lagi"}
        </button>
      </section>
    </main>
  );
}
