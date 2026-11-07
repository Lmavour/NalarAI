"use client";

import {
  AlertTriangle,
  LogOut,
  WifiOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { InstallAppButton } from "@/components/install-app-button";
import { LearnLayout, type LearnTab } from "@/components/learning/learn-layout";
import { LeagueView } from "@/components/learning/league-view";
import { LearningPath } from "@/components/learning/learning-path";
import { LessonLoading, LessonPlayer } from "@/components/learning/lesson-player";
import { ProfileView } from "@/components/learning/profile-view";
import type { CompanionState } from "@/components/learning/mascot-companion";
import type { DashboardData, DashboardProgress, DashboardStats, LeagueTier, LessonSessionDto } from "@/types/learning";

const LEAGUE_ORDER: LeagueTier[] = ["Bronze", "Silver", "Sapphire", "Diamond"];

export function LearningShell({ initialDashboard }: { initialDashboard: DashboardData }) {
  const router = useRouter();
  const mainRef = useRef<HTMLDivElement>(null);
  const creatingLesson = useRef(false);
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [activeTab, setActiveTab] = useState<LearnTab>("path");
  const [lesson, setLesson] = useState<LessonSessionDto | null>(null);
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [recentPromotion, setRecentPromotion] = useState<LeagueTier | null>(null);
  const [isLoggingOut, startLogout] = useTransition();

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  async function startLesson(stageId: string, stageTitle: string, topic: string) {
    if (creatingLesson.current) return;
    if (!online) {
      setError("Kamu sedang offline. Sambungkan internet untuk membuat level AI baru.");
      return;
    }

    setError(null);
    creatingLesson.current = true;
    setGeneratingTopic(topic);
    try {
      const response = await fetch("/api/lesson-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, stageTitle, topic }),
      });
      const data = (await response.json().catch(() => null)) as (LessonSessionDto & { error?: string }) | null;
      if (response.status === 401) {
        router.push("/auth?mode=login&next=/app");
        return;
      }
      if (!response.ok || !data) {
        setError(data?.error ?? "Level belum dapat dibuat. Coba lagi sebentar.");
        return;
      }
      setLesson(data);
      setDashboard((current) => ({ ...current, progress: { ...current.progress, topic } }));
    } catch {
      setError("Tidak dapat terhubung ke layanan pembelajaran. Periksa koneksimu lalu coba lagi.");
    } finally {
      creatingLesson.current = false;
      setGeneratingTopic(null);
    }
  }

  function applyCompletion(stats: DashboardStats, progress: DashboardProgress) {
    if (LEAGUE_ORDER.indexOf(stats.league) > LEAGUE_ORDER.indexOf(dashboard.stats.league)) setRecentPromotion(stats.league);
    setDashboard((current) => ({
      ...current,
      stats,
      progress: {
        ...current.progress,
        ...progress,
        activityDates: progress.activityDates.length > 0 ? progress.activityDates : current.progress.activityDates,
      },
    }));
  }

  function logout() {
    startLogout(async () => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
      router.replace("/");
      router.refresh();
    });
  }

  function navigate(tab: LearnTab) {
    setActiveTab(tab);
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => {
      const heading = mainRef.current?.querySelector<HTMLElement>("h1, h2");
      if (!heading) return;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
  }

  const isNewLearner = dashboard.stats.lessonsCompleted === 0 && dashboard.progress.completedStageIds.length === 0;
  let companion: CompanionState = {
    character: "gara",
    emotion: isNewLearner ? "happy" : "idle",
    message: isNewLearner ? "Halo! Pilih satu topik, kita mulai bareng." : "Aku di sini. Kita taklukkan satu langkah lagi.",
    eventKey: `dashboard:${activeTab}`,
    context: isNewLearner ? "onboarding" : "path-guide",
  };
  if (!online) {
    companion = { character: "mang_ujang", emotion: "thinking", message: "Koneksi sedang istirahat. Kita lanjut begitu online.", eventKey: "offline", context: "offline" };
  } else if (activeTab === "profile" && dashboard.stats.streak >= 30) {
    companion = { character: "nenek_sri", emotion: "idle", message: `${dashboard.stats.streak} hari bukan kebetulan. Jaga ritme dan tetap beristirahat.`, eventKey: `streak:${dashboard.stats.streak}`, context: "long-streak" };
  } else if (activeTab === "league" && recentPromotion) {
    companion = { character: "putri", emotion: "happy", message: `Naik ke ${recentPromotion} League! Pertahankan ritmemu.`, eventKey: `promotion:${recentPromotion}`, context: "league-promotion", celebrate: true };
  }

  return (
    <>
      <LearnLayout
        user={dashboard.user}
        stats={dashboard.stats}
        activeTab={activeTab}
        onNavigate={navigate}
        contentRef={mainRef}
        companion={companion}
        accountActions={(
          <div className="grid gap-2">
            <InstallAppButton className="w-full rounded-full px-2 text-xs" />
            <button type="button" onClick={logout} disabled={isLoggingOut} className="flex min-h-12 items-center justify-center gap-2 rounded-full text-xs font-extrabold text-slate-500 hover:bg-rose-50 hover:text-rose-700"><LogOut className="size-4" aria-hidden="true" />{isLoggingOut ? "Keluar..." : "Keluar"}</button>
          </div>
        )}
        notice={(
          <>
            {!online ? <div role="status" className="mb-4 flex items-start gap-2 rounded-2xl bg-slate-800 p-3 text-xs font-bold leading-5 text-white"><WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Kamu offline. Pelajaran AI memerlukan koneksi internet.</div> : null}
            {error ? <div className="mb-4 flex min-w-0 items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900" role="alert"><AlertTriangle className="mt-1 size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{error}</span><button type="button" onClick={() => setError(null)} className="grid size-12 shrink-0 place-items-center rounded-full hover:bg-white/70" aria-label="Tutup pesan"><X className="size-4" aria-hidden="true" /></button></div> : null}
          </>
        )}
      >
        {activeTab === "path" ? <LearningPath initialTopic={dashboard.progress.topic} completedStageIds={dashboard.progress.completedStageIds} activityDates={dashboard.progress.activityDates} isNewLearner={isNewLearner} isGenerating={Boolean(generatingTopic)} onStart={startLesson} /> : null}
        {activeTab === "league" ? <LeagueView dashboard={dashboard} /> : null}
        {activeTab === "profile" ? <ProfileView dashboard={dashboard} /> : null}
      </LearnLayout>
      {generatingTopic ? <LessonLoading topic={generatingTopic} /> : null}
      {lesson ? <LessonPlayer key={lesson.sessionId} lesson={lesson} dashboard={dashboard} initialCompletedStageIds={dashboard.progress.completedStageIds} onClose={() => setLesson(null)} onNavigate={(tab) => { setLesson(null); navigate(tab); }} onCompleted={applyCompletion} /> : null}
    </>
  );
}
