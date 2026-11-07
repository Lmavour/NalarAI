"use client";

import {
  ArrowRight,
  BrainCircuit,
  Check,
  CircleCheckBig,
  Clock3,
  Flag,
  Layers3,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  PencilLine,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { CharacterAvatar } from "@/components/character-avatar";
import { useHydrated } from "@/lib/use-hydrated";

export const PATH_STAGES = [
  { id: "foundation", title: "Fondasi", subtitle: "Kenali ide utamanya", icon: Lightbulb },
  { id: "core-concept", title: "Konsep kunci", subtitle: "Bangun pemahaman", icon: BrainCircuit },
  { id: "connections", title: "Hubungkan ide", subtitle: "Lihat pola besarnya", icon: Layers3 },
  { id: "application", title: "Latihan nyata", subtitle: "Terapkan konsepmu", icon: Target },
  { id: "mastery", title: "Tantangan akhir", subtitle: "Buktikan penguasaan", icon: Trophy },
] as const;

type LearningPathProps = {
  initialTopic: string;
  completedStageIds: string[];
  activityDates: string[];
  isNewLearner: boolean;
  isGenerating: boolean;
  onStart: (stageId: string, stageTitle: string, topic: string) => void;
};

export function LearningPath({ initialTopic, completedStageIds, activityDates, isNewLearner, isGenerating, onStart }: LearningPathProps) {
  const hydrated = useHydrated();
  const [topic, setTopic] = useState(initialTopic);
  const [draftTopic, setDraftTopic] = useState(initialTopic);
  const completed = new Set(completedStageIds);
  const completedCount = PATH_STAGES.filter((stage) => completed.has(stage.id)).length;
  const activeIndex = PATH_STAGES.findIndex((stage) => !completed.has(stage.id));
  const activeStage = PATH_STAGES[activeIndex];
  const completedToday = activityDates.includes(new Date().toISOString().slice(0, 10));

  function chooseTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTopic = draftTopic.trim();
    if (nextTopic.length >= 2) setTopic(nextTopic);
  }

  return (
    <div className="app-page">
      <section className="learn-card p-5 lg:p-6">
        <div className="grid min-w-0 items-center gap-5">
           <div className="flex min-w-0 items-center gap-2 sm:gap-4">
             <div className="min-w-0">
               <span className="inline-flex items-center gap-2 rounded-full bg-ice px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-cobalt">
                 <Sparkles className="size-3.5" aria-hidden="true" /> Gara memandu
               </span>
               <h1 className="mt-3 text-2xl font-black leading-tight tracking-[-0.035em] text-ink lg:text-3xl">{isNewLearner ? "Mulai bareng Gara." : "Mau belajar apa hari ini?"}</h1>
               <p className="mt-2 max-w-lg text-sm leading-6 text-copy">Satu topik, lima langkah kecil. Mulai dari rasa ingin tahumu.</p>
             </div>
           </div>
          <form onSubmit={chooseTopic} className="min-w-0">
            <label htmlFor="learning-topic" className="mb-2 block text-xs font-extrabold text-sapphire">Topik belajarmu</label>
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <PencilLine className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input id="learning-topic" value={draftTopic} onChange={(event) => setDraftTopic(event.target.value)} minLength={2} maxLength={80} placeholder="Contoh: fotosintesis" className="h-12 w-full min-w-0 rounded-2xl border-2 border-line bg-canvas pl-10 pr-3 text-sm font-bold text-ink outline-none transition focus:border-cobalt focus:bg-white focus:ring-4 focus:ring-blue-100" />
              </div>
              <button type="submit" disabled={!hydrated} className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-700 text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-wait" aria-label="Gunakan topik ini">
                <ArrowRight className="size-5" />
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-5">
        <section className="learn-card min-w-0" aria-labelledby="path-title">
          <header className="border-b border-line p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-cobalt">Jalur saat ini</p>
              <span className="shrink-0 rounded-full bg-ice px-3 py-1.5 text-xs font-extrabold tabular-nums text-sapphire">{completedCount}/{PATH_STAGES.length} level</span>
            </div>
            <h2 id="path-title" className="mt-3 text-xl font-[900] leading-snug tracking-tight text-ink [overflow-wrap:anywhere] sm:text-2xl">{topic}</h2>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-sky" role="progressbar" aria-label="Progres jalur" aria-valuemin={0} aria-valuemax={5} aria-valuenow={completedCount}>
              <div className="h-full rounded-full bg-cobalt transition-[width]" style={{ width: `${(completedCount / PATH_STAGES.length) * 100}%` }} />
            </div>
            {activeStage ? (
              <button type="button" disabled={isGenerating || !hydrated} onClick={() => onStart(activeStage.id, activeStage.title, topic)} className="button-primary mt-5 w-full sm:w-auto">
                {isGenerating ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                Mulai level {activeIndex + 1}
              </button>
            ) : null}
          </header>

          <div className="mx-auto max-w-[520px] px-3 py-3 sm:px-5 sm:py-5">
            <div className="relative">
              <svg viewBox="0 0 400 660" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
                <path d="M60 66C210 66 340 110 340 198S60 242 60 330s280 44 280 132S60 506 60 594" stroke="#E3EDF7" strokeWidth="16" strokeLinecap="round" />
                <path d="M60 66C210 66 340 110 340 198S60 242 60 330s280 44 280 132S60 506 60 594" stroke="#176BFF" strokeWidth="10" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.min(100, (completedCount / (PATH_STAGES.length - 1)) * 100)} 100`} />
              </svg>
              <ol className="relative">
                {PATH_STAGES.map((stage, index) => {
                  const isDone = completed.has(stage.id);
                  const isActive = index === activeIndex;
                  const isLocked = !isDone && !isActive;
                  const reverse = index % 2 === 1;
                  const Icon = stage.icon;
                  return (
                    <li key={stage.id} className={`grid min-h-[132px] items-center ${reverse ? "grid-cols-[minmax(0,1fr)_30%]" : "grid-cols-[30%_minmax(0,1fr)]"}`}>
                  <button type="button" disabled={isLocked || isGenerating || !hydrated} onClick={() => onStart(stage.id, stage.title, topic)} aria-label={`${stage.title}. ${isDone ? "Selesai, ulangi level" : isActive ? "Level berikutnya" : "Terkunci"}`} className={`relative z-10 grid size-16 place-items-center justify-self-center rounded-full border-[5px] border-white transition lg:size-[72px] ${reverse ? "order-2" : ""} ${isDone ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md hover:-translate-y-1" : isActive ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-[0_0_0_6px_#E2EEFF,0_5px_16px_#bfdbfe] hover:-translate-y-1" : "cursor-not-allowed bg-slate-100 text-slate-400 shadow-sm"}`}>
                        {isGenerating && isActive ? <LoaderCircle className="size-6 animate-spin" /> : isDone ? <Check className="size-7 stroke-[3]" /> : isLocked ? <LockKeyhole className="size-6" /> : <Icon className="size-7" />}
                      </button>
                      <div className={`relative z-10 min-w-0 rounded-[18px] border px-3 py-3 sm:px-4 ${reverse ? "order-1 text-right" : ""} ${isActive ? "border-blue-200 bg-ice shadow-[0_4px_14px_rgba(23,107,255,0.06)]" : "border-transparent bg-white/95"}`}>
                        <p className={`text-sm font-[900] leading-5 [overflow-wrap:anywhere] sm:text-base ${isLocked ? "text-muted" : "text-ink"}`}>{stage.title}</p>
                        <p className="mt-1 text-xs font-bold leading-5 text-muted">{stage.subtitle}</p>
                         {isActive ? <div className={`mt-2 flex items-center gap-1.5 ${reverse ? "justify-end" : ""}`}><CharacterAvatar character="gara" expression="presenting" size="md" className="size-12" priority /><span className="rounded-full bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cobalt">Mulai di sini</span></div> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {completedCount === PATH_STAGES.length ? (
            <div className="mx-5 mb-5 flex items-start gap-3 rounded-2xl border border-[#A8E8D3] bg-[#E7FAF5] p-4 sm:mx-6 sm:mb-6">
              <CircleCheckBig className="mt-0.5 size-5 shrink-0 text-success" />
              <p className="min-w-0 text-sm font-extrabold leading-6 text-[#087A5B]">Jalur selesai. Ulangi level untuk menguatkan ingatanmu.</p>
            </div>
          ) : null}
        </section>

        <aside className="grid min-w-0 gap-4 lg:grid-cols-2">
          <section className="min-w-0 rounded-[24px] border border-line bg-white p-5">
             <div className="flex items-center justify-between gap-3">
               <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#FFF4D6] text-[#986000]"><Flag className="size-5" /></span>
               {!completedToday ? <CharacterAvatar character="mang_ujang" expression="happy" size="md" className="-my-5 size-20" priority /> : <CircleCheckBig className="size-8 text-success" aria-hidden="true" />}
             </div>
             <h3 className="mt-4 text-lg font-[900] text-ink">Target harian</h3>
             <p className="mt-2 text-sm leading-6 text-copy">{completedToday ? "Target aman. Gara siap membawamu ke level berikutnya." : "Mang Ujang mengingatkan: satu level kecil sudah cukup untuk menjaga momentum."}</p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#FFF1CC]"><div className={`h-full rounded-full bg-reward transition-[width] ${completedToday ? "w-full" : "w-0"}`} /></div>
            <p className="mt-2 text-xs font-extrabold text-muted">{completedToday ? "Target hari ini selesai" : "0 dari 1 level selesai"}</p>
          </section>
          <section className="min-w-0 rounded-[24px] border border-blue-200 bg-ice p-5">
            <div className="flex items-center gap-3"><Clock3 className="size-5 shrink-0 text-cobalt" /><h3 className="font-[900] text-sapphire">Sedikit, tapi konsisten</h3></div>
            <p className="mt-3 text-sm leading-6 text-copy">Lima hingga delapan menit sudah cukup untuk satu langkah. Ambil jeda ketika fokus mulai turun.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
