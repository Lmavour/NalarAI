"use client";

import { Flame, Heart, Home, Menu, Sparkles, Trophy, UserRound, X, Zap } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import { Brand } from "@/components/brand";
import { MascotCompanion, type CompanionState } from "@/components/learning/mascot-companion";
import { useHydrated } from "@/lib/use-hydrated";
import type { DashboardData, DashboardStats } from "@/types/learning";

export type LearnTab = "path" | "league" | "profile";

const NAV_ITEMS = [
  { id: "path", label: "Jalur", icon: Home },
  { id: "league", label: "Liga", icon: Trophy },
  { id: "profile", label: "Profil", icon: UserRound },
] as const;

type LearnLayoutProps = {
  children: ReactNode;
  user: DashboardData["user"];
  stats: DashboardStats;
  activeTab: LearnTab;
  onNavigate: (tab: LearnTab) => void;
  companion: CompanionState;
  header?: ReactNode;
  actions?: ReactNode;
  accountActions?: ReactNode;
  notice?: ReactNode;
  contentRef?: Ref<HTMLDivElement>;
  navigationDisabled?: boolean;
};

function LearnerStats({ stats, compact = false }: { stats: DashboardStats; compact?: boolean }) {
  return (
    <div className={compact ? "grid min-w-0 grid-cols-[1fr_1.25fr_1fr] gap-2" : "grid gap-2.5"}>
      {[
        { label: "Streak", value: stats.streak, icon: Flame, tone: "bg-orange-50 text-orange-700", suffix: "hari" },
        { label: "XP", value: stats.xp, icon: Zap, tone: "bg-blue-50 text-blue-700", suffix: "total XP" },
        { label: "Hearts", value: stats.hearts, icon: Heart, tone: "bg-rose-50 text-rose-700", suffix: "tersisa" },
      ].map(({ label, value, icon: Icon, tone, suffix }) => (
        <div key={label} aria-label={`${label}: ${value}`} className={`flex min-w-0 items-center gap-2 rounded-2xl ${compact ? "justify-center bg-slate-50 px-2 py-2" : "bg-slate-50/70 p-2.5"}`}>
          <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full ${compact ? "size-6" : "size-9"} ${tone}`}><Icon className={compact ? "size-3.5" : "size-4"} /></span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black leading-4 tabular-nums text-ink">{value.toLocaleString("id-ID")}</span>
            {!compact ? <span className="mt-0.5 block text-[10px] font-bold text-slate-500">{label === "Streak" ? `${label} ${suffix}` : suffix}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/** One viewport grid owns scrolling, feedback height, and the mobile navigation row. */
export function LearnLayout({ children, user, stats, activeTab, onNavigate, companion, header, actions, accountActions, notice, contentRef, navigationDisabled = false }: LearnLayoutProps) {
  const mainId = useId();
  const hydrated = useHydrated();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuTriggerRef.current?.focus();
    }
    function handlePointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 768px)");
    const handleResize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    desktop.addEventListener("change", handleResize);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
      desktop.removeEventListener("change", handleResize);
    };
  }, [menuOpen]);

  function navigate(tab: LearnTab) {
    setMenuOpen(false);
    onNavigate(tab);
  }

  return (
    <div className="learn-layout" data-learn-layout>
      <a href={`#${mainId}`} className="sr-only z-[200] rounded-full bg-blue-700 px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Lewati ke konten utama</a>

      {!header ? (
        <header ref={menuRef} className="relative z-40 shrink-0 border-b border-slate-100 bg-white px-[max(16px,var(--safe-left))] pb-3 pr-[max(16px,var(--safe-right))] pt-[max(8px,var(--safe-top))] md:hidden">
          <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
            <Brand compact href="/app" />
            <button ref={menuTriggerRef} type="button" onClick={() => setMenuOpen((open) => !open)} disabled={!hydrated} aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} aria-controls="app-mobile-menu" className="grid size-12 place-items-center rounded-full border border-slate-100 bg-slate-50 text-slate-600 disabled:cursor-wait">
              {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            </button>
          </div>
          <LearnerStats stats={stats} compact />
          {menuOpen ? <div id="app-mobile-menu" className="absolute inset-x-4 top-full mt-2 max-h-[55dvh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-lg">{accountActions}</div> : null}
        </header>
      ) : null}

      <div className="learn-grid" data-learn-grid>
        <aside data-learn-navigation className="learn-navigation hidden min-h-0 min-w-0 flex-col overflow-y-auto overscroll-contain md:flex">
          <Brand compact href="/app" />
          <p className="mb-3 mt-10 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ruang belajarmu</p>
          <nav aria-label="Navigasi aplikasi" className="grid gap-2">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => navigate(id)} disabled={navigationDisabled || !hydrated} aria-current={activeTab === id ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-extrabold transition disabled:cursor-wait ${activeTab === id ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-blue-700"}`}>
                <Icon className="size-5 shrink-0" aria-hidden="true" />{label}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-8">{accountActions}</div>
          <p className="mt-6 px-2 text-[10px] font-semibold leading-5 text-slate-400">Sedikit setiap hari.<br />Bertumbuh tanpa henti.</p>
        </aside>

        <main id={mainId} data-learn-main className="flex min-h-0 min-w-0 flex-col">
          {header ? <header className="learn-session-header shrink-0">{header}</header> : (
            <header className="hidden shrink-0 items-center justify-between gap-3 px-1 pb-4 pt-1 md:flex">
              <div className="min-w-0"><p className="text-xs font-extrabold text-slate-500">Selamat datang kembali</p><p className="mt-0.5 truncate text-sm font-black text-ink">{user.displayName}</p></div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-2 text-[10px] font-black text-blue-700"><Sparkles className="size-3.5" aria-hidden="true" /> Ruang fokus</span>
            </header>
          )}
          <div ref={contentRef} data-learn-scroll tabIndex={-1} className="learn-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full min-w-0 max-w-[760px]">
              {notice}
              <div data-mobile-companion className="mb-4 md:hidden"><MascotCompanion {...companion} compact /></div>
              {children}
            </div>
          </div>
          {actions ? <footer data-learn-actions className="learn-actions shrink-0">{actions}</footer> : null}
        </main>

        <aside data-learn-companion className="sticky top-0 hidden min-h-0 min-w-0 overflow-y-auto overscroll-contain md:block" aria-label="Statistik dan companion">
          <section className="learn-card p-3 lg:p-4" aria-label="Statistik pelajar">
            <div className="mb-4 flex min-w-0 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white"><UserRound className="size-4" aria-hidden="true" /></span>
              <div className="min-w-0"><p className="truncate text-xs font-black text-ink">{user.displayName}</p><p className="mt-0.5 text-[10px] font-bold text-slate-500">{stats.league} League</p></div>
            </div>
            <LearnerStats stats={stats} />
          </section>
          <section className="learn-card mt-4 p-3 lg:p-4">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500"><span className="size-1.5 rounded-full bg-emerald-500" /> Teman belajarmu</p>
            <MascotCompanion {...companion} />
          </section>
          <p className="px-3 py-4 text-center text-[11px] font-semibold leading-5 text-slate-500">Fokus pada satu langkah.<br />Progres kecil tetap berarti.</p>
        </aside>
      </div>

      <nav data-learn-bottom-nav aria-label="Navigasi aplikasi seluler" className="z-30 shrink-0 border-t border-slate-100 bg-white px-[max(12px,var(--safe-left))] pb-[max(6px,var(--safe-bottom))] pr-[max(12px,var(--safe-right))] pt-1.5 md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => navigate(id)} disabled={navigationDisabled || !hydrated} aria-current={activeTab === id ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-extrabold transition disabled:cursor-wait ${activeTab === id ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}>
              <Icon className="size-5" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
