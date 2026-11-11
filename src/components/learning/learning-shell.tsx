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
import { DocumentLibrary } from "@/components/learning/document-library";
import { ReviewDeck } from "@/components/learning/review-deck";
import type { CompanionState } from "@/components/learning/mascot-companion";
import type { DashboardData, DashboardProgress, DashboardStats, LeagueTier, LessonSessionDto } from "@/types/learning";
import type { StudyDocumentDto } from "@/types/documents";

const LEAGUE_ORDER: LeagueTier[] = ["Bronze", "Silver", "Sapphire", "Diamond"];

type ApiProblem = { error?: string; code?: string };

function lessonProblem(status: number, data: ApiProblem | null, fromDocument: boolean) {
  if (data?.code === "NO_HEARTS") return "Heart-mu habis. Coba lagi nanti.";
  if (data?.code === "DOCUMENT_BUSY") return "Materi ini sedang disiapkan. Coba lagi sebentar.";
  if (["NOT_FOUND", "DOCUMENT_NOT_FOUND"].includes(data?.code ?? "")) return "Materi tidak ditemukan.";
  if (["RATE_LIMITED", "AI_DAILY_TOKEN_LIMIT", "AI_PROVIDER_RATE_LIMIT"].includes(data?.code ?? "")) return "Pembuatan materi sedang sibuk. Coba lagi nanti.";
  if (status === 403) return "Aksi ini belum dapat dilakukan.";
  if (status === 422) return "Topik belum dapat diproses. Coba topik lain.";
  return fromDocument ? "Materi belum dapat disiapkan. Coba lagi." : "Level belum dapat dibuat. Coba lagi.";
}

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

  async function startLesson(stageId: string, stageTitle: string, topic: string, document?: StudyDocumentDto) {
    if (creatingLesson.current) return;
    if (!online) {
      setError("Kamu sedang offline. Sambungkan internet lalu coba lagi.");
      return;
    }

    setError(null);
    creatingLesson.current = true;
    setGeneratingTopic(topic);
    try {
      const response = await fetch(document ? `/api/documents/${encodeURIComponent(document.id)}/study` : "/api/lesson-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(document ? {} : { stageId, stageTitle, topic }),
      });
      const data = (await response.json().catch(() => null)) as (LessonSessionDto & ApiProblem) | null;
      if (response.status === 401) {
        router.push("/auth?mode=login&next=/app");
        return;
      }
      if (!response.ok || !data) {
        setError(lessonProblem(response.status, data, Boolean(document)));
        return;
      }
      setLesson(data);
      if (!document) setDashboard((current) => ({ ...current, progress: { ...current.progress, topic } }));
    } catch {
      setError("Koneksi terputus. Coba lagi.");
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
    message: isNewLearner ? "Mau belajar apa hari ini?" : "Siap lanjut? Aku temani.",
    eventKey: `dashboard:${activeTab}`,
    context: isNewLearner ? "onboarding" : "path-guide",
  };
  if (!online) {
    companion = { character: "mang_ujang", emotion: "thinking", message: "Koneksi terputus. Kita lanjut setelah kembali.", eventKey: "offline", context: "offline" };
  } else if (activeTab === "profile" && dashboard.stats.streak >= 30) {
    companion = { character: "nenek_sri", emotion: "idle", message: `${dashboard.stats.streak} hari! Jaga ritmemu.`, eventKey: `streak:${dashboard.stats.streak}`, context: "long-streak" };
  } else if (activeTab === "league" && recentPromotion) {
    companion = { character: "putri", emotion: "happy", message: `Naik ke ${recentPromotion} League! Lanjutkan.`, eventKey: `promotion:${recentPromotion}`, context: "league-promotion", celebrate: true };
  }
  if (online && activeTab === "documents") companion = { character: "gara", emotion: "idle", message: "Pilih materi. Aku bantu.", eventKey: "documents", context: "document-guide" };
  if (online && activeTab === "review") companion = { character: "nenek_sri", emotion: "idle", message: "Ingat dulu, lalu buka.", eventKey: "review", context: "review-guide" };
  if (online && activeTab === "league" && !recentPromotion) companion = { character: "putri", emotion: "idle", message: "Yuk, naik peringkat!", eventKey: "league", context: "league-guide" };
  if (online && activeTab === "profile" && dashboard.stats.streak < 30) companion = { character: "gara", emotion: "happy", message: "Progresmu hebat. Lanjutkan!", eventKey: "profile", context: "profile-guide" };

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
            {!online ? <div role="status" className="mb-4 flex items-start gap-2 rounded-2xl bg-slate-800 p-3 text-xs font-bold leading-5 text-white"><WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Kamu offline.</div> : null}
            {error ? <div className="mb-4 flex min-w-0 items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900" role="alert"><AlertTriangle className="mt-1 size-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{error}</span><button type="button" onClick={() => setError(null)} className="grid size-12 shrink-0 place-items-center rounded-full hover:bg-white/70" aria-label="Tutup pesan"><X className="size-4" aria-hidden="true" /></button></div> : null}
          </>
        )}
      >
        {activeTab === "path" ? <LearningPath initialTopic={dashboard.progress.topic} completedStageIds={dashboard.progress.completedStageIds} activityDates={dashboard.progress.activityDates} isNewLearner={isNewLearner} isGenerating={Boolean(generatingTopic)} onStart={startLesson} /> : null}
        {activeTab === "documents" ? <DocumentLibrary isGenerating={Boolean(generatingTopic)} onStudy={(document) => { void startLesson("document", "Materi dokumen", document.name, document); }} /> : null}
        {activeTab === "review" ? <ReviewDeck /> : null}
        {activeTab === "league" ? <LeagueView dashboard={dashboard} /> : null}
        {activeTab === "profile" ? <ProfileView dashboard={dashboard} /> : null}
      </LearnLayout>
      {generatingTopic ? <LessonLoading topic={generatingTopic} /> : null}
      {lesson ? <LessonPlayer key={lesson.sessionId} lesson={lesson} dashboard={dashboard} initialCompletedStageIds={dashboard.progress.completedStageIds} onClose={() => setLesson(null)} onNavigate={(tab) => { setLesson(null); navigate(tab); }} onCompleted={applyCompletion} /> : null}
    </>
  );
}
