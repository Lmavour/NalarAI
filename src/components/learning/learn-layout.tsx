"use client";

import { FileText, Flame, Heart, Home, Menu, Repeat2, Trophy, UserRound, X, Zap } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import { Brand } from "@/components/brand";
import { MascotCompanion, type CompanionState } from "@/components/learning/mascot-companion";
import { useHydrated } from "@/lib/use-hydrated";
import type { DashboardData, DashboardStats } from "@/types/learning";

export type LearnTab = "path" | "documents" | "review" | "league" | "profile";

const NAV_ITEMS = [
  { id: "path", label: "Jalur", icon: Home },
  { id: "documents", label: "Materi", icon: FileText },
  { id: "review", label: "Ulang", icon: Repeat2 },
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
        <header ref={menuRef} data-mobile-topbar-shell className="relative z-40 shrink-0 px-[max(12px,var(--safe-left))] pb-2 pr-[max(12px,var(--safe-right))] pt-[max(8px,var(--safe-top))] md:hidden">
          <div data-mobile-topbar className="flex min-w-0 items-center gap-2 rounded-[24px] border border-white/90 bg-white/90 p-1.5 shadow-[0_10px_30px_rgba(16,58,114,0.10)] backdrop-blur-xl">
            <div data-mobile-companion data-floating-companion aria-live="polite" className="relative min-w-0 flex-1">
              <MascotCompanion {...companion} compact floating />
              <span aria-label={`Hearts: ${stats.hearts}`} className="absolute left-10 top-0 inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-black leading-none text-white shadow-sm"><Heart className="size-2.5 fill-white" aria-hidden="true" />{stats.hearts}</span>
            </div>
            <button ref={menuTriggerRef} type="button" onClick={() => setMenuOpen((open) => !open)} disabled={!hydrated} aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} aria-controls="app-mobile-menu" className={`grid size-12 shrink-0 place-items-center rounded-[18px] transition disabled:cursor-wait ${menuOpen ? "bg-cobalt text-white shadow-[0_5px_14px_rgba(23,107,255,0.28)]" : "bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-cobalt"}`}>
              {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            </button>
          </div>
          {menuOpen ? <div id="app-mobile-menu" className="absolute right-[max(12px,var(--safe-right))] top-full mt-1 w-[min(280px,calc(100vw-24px))] max-h-[55dvh] overflow-y-auto rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-float backdrop-blur-xl"><LearnerStats stats={stats} compact /><div className="mt-3">{accountActions}</div></div> : null}
        </header>
      ) : null}

      <div className="learn-grid" data-learn-grid>
        <aside data-learn-navigation className="learn-navigation hidden min-h-0 min-w-0 flex-col overflow-y-auto overscroll-contain md:flex">
          <Brand compact href="/app" />
          <nav aria-label="Navigasi aplikasi" className="mt-10 grid gap-2">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => navigate(id)} disabled={navigationDisabled || !hydrated} aria-current={activeTab === id ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-extrabold transition disabled:cursor-wait ${activeTab === id ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-blue-700"}`}>
                <Icon className="size-5 shrink-0" aria-hidden="true" />{label}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-8">{accountActions}</div>
        </aside>

        <main id={mainId} data-learn-main className="relative flex min-h-0 min-w-0 flex-col">
          {header ? <header className="learn-session-header shrink-0">{header}</header> : null}
          <div ref={contentRef} data-learn-scroll tabIndex={-1} className="learn-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full min-w-0 max-w-[760px]">
              {notice}
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
          <section className="learn-card mt-4 p-3 lg:p-4"><MascotCompanion {...companion} /></section>
        </aside>
      </div>

      <nav data-learn-bottom-nav aria-label="Navigasi aplikasi seluler" className="z-30 shrink-0 bg-gradient-to-t from-white via-white/95 to-transparent px-[max(12px,var(--safe-left))] pb-[max(8px,var(--safe-bottom))] pr-[max(12px,var(--safe-right))] pt-2 md:hidden">
        <div data-mobile-dock className="mx-auto grid max-w-md grid-cols-5 gap-0 rounded-[26px] border border-white bg-white/95 p-1.5 shadow-[0_12px_32px_rgba(16,58,114,0.14)] backdrop-blur-xl">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => navigate(id)} disabled={navigationDisabled || !hydrated} aria-current={activeTab === id ? "page" : undefined} className={`flex min-h-14 min-w-12 flex-col items-center justify-center gap-0.5 rounded-[19px] text-[10px] font-extrabold transition disabled:cursor-wait ${activeTab === id ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-[0_6px_16px_rgba(23,107,255,0.24)]" : "text-slate-500 hover:bg-slate-50 hover:text-cobalt"}`}>
              <Icon className="size-5" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
