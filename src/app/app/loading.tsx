import { Brand } from "@/components/brand";

export default function AppLoading() {
  return (
    <div className="learn-layout" aria-busy="true" aria-label="Memuat jalur belajar">
      <header className="safe-x border-b border-slate-100 bg-white py-3 md:hidden">
        <Brand compact href="/app" />
        <div className="mt-2 grid grid-cols-3 gap-2" aria-hidden="true">
          <div className="skeleton h-10 rounded-2xl" /><div className="skeleton h-10 rounded-2xl" /><div className="skeleton h-10 rounded-2xl" />
        </div>
      </header>
      <div className="learn-grid">
        <aside className="learn-navigation hidden min-w-0 md:block">
          <Brand compact href="/app" />
          <div className="mt-10 space-y-3" aria-hidden="true"><div className="skeleton h-12 rounded-2xl" /><div className="skeleton h-12 rounded-2xl" /><div className="skeleton h-12 rounded-2xl" /></div>
        </aside>
        <main className="min-h-0 min-w-0 overflow-hidden" aria-hidden="true">
          <div className="skeleton mb-4 hidden h-12 w-36 rounded-2xl md:block" />
          <div className="learn-scroll h-full">
            <div className="skeleton mb-4 h-24 rounded-3xl md:hidden" />
            <div className="skeleton h-56 rounded-3xl" />
            <div className="skeleton mt-5 h-[600px] rounded-3xl" />
          </div>
        </main>
        <div className="hidden space-y-4 md:block" aria-hidden="true"><div className="skeleton h-64 rounded-3xl" /><div className="skeleton h-72 rounded-3xl" /></div>
      </div>
      <div className="safe-x shrink-0 border-t border-slate-100 bg-white pb-[max(6px,var(--safe-bottom))] pt-1.5 md:hidden" aria-hidden="true">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <div className="skeleton h-12 rounded-2xl" /><div className="skeleton h-12 rounded-2xl" /><div className="skeleton h-12 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
