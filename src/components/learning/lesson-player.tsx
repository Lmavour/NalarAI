"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CircleCheckBig,
  Clock3,
  Heart,
  Lightbulb,
  LoaderCircle,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CHARACTER_ASSETS } from "@/components/character-avatar";
import { FloatingFeedbackBar } from "@/components/learning/floating-feedback-bar";
import { HintSheet } from "@/components/learning/hint-sheet";
import { LearnLayout, type LearnTab } from "@/components/learning/learn-layout";
import { MascotCompanion, type CompanionState } from "@/components/learning/mascot-companion";
import { QuestionCard } from "@/components/learning/question-card";
import { SourceLinks } from "@/components/learning/source-links";
import type { AnswerResult, DashboardData, DashboardProgress, DashboardStats, LessonSessionDto } from "@/types/learning";

type LessonPlayerProps = {
  lesson: LessonSessionDto;
  dashboard: DashboardData;
  initialCompletedStageIds: string[];
  onClose: () => void;
  onNavigate: (tab: LearnTab) => void;
  onCompleted: (stats: DashboardStats, progress: DashboardProgress) => void;
};

type AnswerProblem = { error?: string; code?: string };

function answerProblem(status: number, data: AnswerProblem | null) {
  if (data?.code === "LESSON_EXPIRED") return "Pelajaran berakhir. Buat level baru untuk melanjutkan.";
  if (["NOT_FOUND", "DOCUMENT_NOT_FOUND"].includes(data?.code ?? "")) return "Pelajaran ini sudah tidak tersedia.";
  if (status === 429) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (status === 401) return "Sesi berakhir. Masuk kembali untuk melanjutkan.";
  return "Jawaban belum dapat diperiksa. Coba lagi.";
}

export function LessonLoading({ topic }: { topic: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    dialog?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog ref={dialogRef} tabIndex={-1} onCancel={(event) => event.preventDefault()} className="app-dialog safe-x fixed inset-0 z-[90] m-0 flex h-dvh max-h-none w-full max-w-none overflow-y-auto border-0 bg-[#F7FBFF]/95 pb-[calc(24px+var(--safe-bottom))] pt-[calc(24px+var(--safe-top))] text-ink backdrop-blur-lg" aria-labelledby="lesson-loading-title">
      <div className="m-auto w-full min-w-0 max-w-md text-center">
        <div role="status" aria-live="polite">
          <MascotCompanion character="mang_ujang" emotion="thinking" message="" eventKey="lesson-loading" context="loading" minimal className="mx-auto" />
          <h2 id="lesson-loading-title" className="mt-4 text-2xl font-[900] tracking-tight text-ink [overflow-wrap:anywhere] sm:text-3xl">Menyiapkan {topic}...</h2>
          <div className="mx-auto mt-8 h-3 max-w-xs overflow-hidden rounded-full bg-sky">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-cobalt" />
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function LessonPlayer({ lesson, dashboard, initialCompletedStageIds, onClose, onNavigate, onCompleted }: LessonPlayerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const requestPending = useRef(false);
  const advancedQuestionId = useRef<string | null>(null);
  const [startedWithMastery] = useState(() => initialCompletedStageIds.includes("mastery"));
  const [phase, setPhase] = useState<"material" | "quiz" | "complete">("material");
  const [materialIndex, setMaterialIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [award, setAward] = useState<AnswerResult["award"]>(undefined);
  const [wrongAnswerCount, setWrongAnswerCount] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);

  const totalSteps = lesson.material.length + lesson.questions.length;
  const currentStep = phase === "material" ? materialIndex + 1 : lesson.material.length + questionIndex + 1;
  const progress = phase === "complete" ? 100 : Math.round((currentStep / totalSteps) * 100);
  const material = lesson.material[materialIndex];
  const question = lesson.questions[questionIndex];

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    // Warm the small reaction set while the learner reads, before a crossfade is needed.
    for (const src of [CHARACTER_ASSETS.gara.thinking, CHARACTER_ASSETS.gara.excited, CHARACTER_ASSETS.putri.excited, CHARACTER_ASSETS.rara.crying, CHARACTER_ASSETS.bima.shocked]) {
      const image = new window.Image();
      image.src = src;
    }
  }, []);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
    const frame = requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [phase, materialIndex, questionIndex]);

  useEffect(() => {
    if (!feedback) return;
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [feedback]);

  function nextMaterial() {
    if (materialIndex < lesson.material.length - 1) {
      setMaterialIndex((index) => index + 1);
      return;
    }
    setPhase("quiz");
  }

  function previousMaterial() {
    if (materialIndex > 0) setMaterialIndex((index) => index - 1);
  }

  async function checkAnswer() {
    if (!selectedOptionId || !question || requestPending.current || feedback) return;
    requestPending.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/lesson-sessions/${lesson.sessionId}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `${lesson.sessionId}:${question.id}`,
        },
        body: JSON.stringify({ questionId: question.id, optionId: selectedOptionId }),
      });
      const data = (await response.json().catch(() => null)) as (AnswerResult & AnswerProblem) | null;
      if (!response.ok || !data || data.questionId !== question.id || (data.completed && !data.award)) {
        setError(answerProblem(response.status, data));
        return;
      }

      setFeedback(data);
      if (data.submittedOptionId) setSelectedOptionId(data.submittedOptionId);
      if (!data.correct) setWrongAnswerCount((count) => count + 1);
      if (data.completed && data.award) {
        setAward(data.award);
        const returnedProgress = data.progress ?? {
          topic: dashboard.progress.topic,
          completedStageIds: data.award.completedStageIds,
          activityDates: [],
        };
        onCompleted(data.award.stats, returnedProgress);
      }
    } catch {
      setError("Koneksi terputus. Pilihanmu tetap tersimpan.");
    } finally {
      requestPending.current = false;
      setIsSubmitting(false);
    }
  }

  function continueQuiz() {
    // An exiting feedback bar retains its button; advance each question only once.
    if (!feedback || advancedQuestionId.current === question.id) return;
    if (feedback.completed && award) {
      advancedQuestionId.current = question.id;
      setPhase("complete");
      return;
    }
    if (questionIndex === lesson.questions.length - 1) {
      setError("Hasil level belum siap. Tutup level dan coba kembali.");
      return;
    }
    advancedQuestionId.current = question.id;
    setQuestionIndex((index) => index + 1);
    setSelectedOptionId(null);
    setFeedback(null);
    setError(null);
  }

  const difficultModule = /\b(algoritma|coding|fisika|kalkulus|matematika|pemrograman|statistika)\b/i.test(`${lesson.title} ${lesson.overview}`);
  const firstMasteryVictory = lesson.stageId === "mastery" && !startedWithMastery && Boolean(award?.completedStageIds.includes("mastery"));
  let companion: CompanionState = {
    character: difficultModule && phase === "quiz" ? "bima" : "gara",
    emotion: phase === "material" ? "idle" : "thinking",
    message: phase === "material" ? "Pelajari satu konsep." : "Pilih jawabanmu.",
    eventKey: `${lesson.sessionId}:${phase}:${phase === "material" ? material?.id : question?.id}`,
    context: phase === "material" ? "flashcard" : "question",
  };
  if (isSubmitting) {
    companion = { ...companion, character: "gara", emotion: "thinking", message: "Memeriksa...", context: "checking", eventKey: `${question.id}:checking` };
  } else if (phase === "quiz" && feedback) {
    const needsReassurance = wrongAnswerCount >= 3 || difficultModule;
    companion = {
      character: feedback.correct ? "putri" : needsReassurance ? "bima" : "rara",
      emotion: feedback.correct ? "happy" : needsReassurance ? "shocked" : "crying",
      message: feedback.correct ? "Tepat!" : needsReassurance ? "Coba pecah konsepnya." : "Baca penjelasannya, lalu lanjut.",
      eventKey: `${question.id}:answered`,
      context: feedback.correct ? "answer-correct" : wrongAnswerCount >= 3 ? "repeated-wrong" : "answer-wrong",
      celebrate: feedback.correct,
    };
  } else if (phase === "complete") {
    companion = { character: firstMasteryVictory ? "gara" : "putri", emotion: "happy", message: firstMasteryVictory ? "Jalur selesai!" : "Level selesai!", eventKey: `${lesson.sessionId}:complete`, context: "lesson-complete", celebrate: true };
  }

  return (
    <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); if (!isSubmitting && !hintOpen) onClose(); }} className="app-dialog fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-slate-50 p-0 text-ink" aria-label={`Pelajaran ${lesson.title}`}>
      <LearnLayout
        user={dashboard.user}
        stats={dashboard.stats}
        activeTab={lesson.documentId ? "documents" : "path"}
        onNavigate={onNavigate}
        navigationDisabled={isSubmitting}
        contentRef={contentRef}
        companion={companion}
        accountActions={<button type="button" onClick={onClose} disabled={isSubmitting} className="button-secondary w-full text-xs">Tinggalkan level</button>}
        header={(
        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="grid size-12 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-wait" aria-label="Tutup pelajaran"><X className="size-5" aria-hidden="true" /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 text-[11px] font-black"><span className="truncate text-sapphire">{phase === "material" ? "Materi" : phase === "quiz" ? `Soal ${questionIndex + 1}/${lesson.questions.length}` : "Level selesai"}</span><span className="text-slate-500">{progress}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-label="Progres pelajaran" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
          </div>
          <div data-mobile-lesson-companion className="relative -my-1 shrink-0 md:hidden">
            <MascotCompanion {...companion} compact floating minimal />
            <span className="absolute right-0 top-0 inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-black leading-none text-white shadow-sm" aria-label={`${dashboard.stats.hearts} hearts tersisa`}><Heart className="size-2.5 fill-white" aria-hidden="true" />{dashboard.stats.hearts}</span>
          </div>
        </div>
        )}
        actions={(
          <AnimatePresence initial={false} mode="wait">
            {phase === "quiz" && feedback ? (
              <FloatingFeedbackBar key={`feedback:${question.id}`} feedback={feedback} onContinue={continueQuiz} />
            ) : (
              <div key="lesson-actions" className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 md:rounded-3xl md:border md:shadow-sm">
                {phase === "material" ? <button type="button" onClick={previousMaterial} disabled={materialIndex === 0} aria-label="Kembali ke materi sebelumnya" className="button-secondary size-12 shrink-0 px-0"><ArrowLeft className="size-4" aria-hidden="true" /></button> : null}
                {phase === "material" ? (
                  <button type="button" onClick={nextMaterial} className="button-primary min-w-0 flex-1 px-4">{materialIndex === lesson.material.length - 1 ? "Mulai kuis" : "Lanjut"}<ArrowRight className="size-4 shrink-0" aria-hidden="true" /></button>
                ) : phase === "quiz" ? (
                  <button type="button" onClick={checkAnswer} disabled={!selectedOptionId || isSubmitting} className="button-primary w-full" aria-busy={isSubmitting}>{isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{isSubmitting ? "Memeriksa..." : "Periksa jawaban"}</button>
                ) : (
                  <button type="button" onClick={onClose} className="button-primary w-full">{lesson.documentId ? "Kembali ke materi" : "Kembali ke jalur"} <ArrowRight className="size-4 shrink-0" aria-hidden="true" /></button>
                )}
              </div>
            )}
          </AnimatePresence>
        )}
      >
        {phase === "material" && material ? (
          <article className="learn-card w-full min-w-0 p-5 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-13 place-items-center rounded-[18px] bg-ice text-cobalt"><BookOpenCheck className="size-6" /></span>
              <span className="flex items-center gap-2 rounded-full bg-canvas px-3 py-2 text-xs font-[900] text-muted"><Clock3 className="size-4" /> {lesson.estimatedMinutes} menit</span>
            </div>
            <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-xl font-black leading-snug tracking-[-0.025em] text-ink [overflow-wrap:anywhere] lg:text-2xl">{material.title}</h1>
            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-copy [overflow-wrap:anywhere] lg:text-base">{material.content}</p>
            <SourceLinks refs={material.sourceRefs} className="mt-4" />
            <div className="mt-6 flex min-w-0 items-start gap-3 rounded-2xl border border-blue-200 bg-ice p-4">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-cobalt" />
              <div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-wider text-cobalt">Ingat ini</p><p className="mt-1 text-sm font-extrabold leading-6 text-sapphire [overflow-wrap:anywhere] sm:text-base">{material.keyTakeaway}</p></div>
            </div>
          </article>
        ) : null}

        {phase === "quiz" && question ? (
          <QuestionCard
            question={question}
            selectedOptionId={selectedOptionId}
            onSelect={setSelectedOptionId}
            onHint={() => setHintOpen(true)}
            feedback={feedback}
            disabled={isSubmitting}
            headingRef={headingRef}
          />
        ) : null}

        {error ? <div role="alert" className="mt-4 flex min-w-0 items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-900"><AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p className="min-w-0 [overflow-wrap:anywhere]">{error}</p></div> : null}

        {phase === "complete" ? (
          <section className="learn-card w-full min-w-0 p-5 text-center lg:p-8">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CircleCheckBig className="size-8" aria-hidden="true" /></span>
            <h1 ref={headingRef} tabIndex={-1} className="mt-5 text-2xl font-black leading-tight tracking-[-0.035em] text-ink lg:text-3xl">Level selesai</h1>
            <p className="mt-2 text-sm font-bold text-copy [overflow-wrap:anywhere]">{lesson.title}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[22px] border border-line bg-white p-5"><Zap className="mx-auto size-6 fill-reward text-reward" /><p className="mt-2 text-2xl font-[950] text-ink">+{award?.xpEarned ?? 0}</p><p className="text-xs font-bold text-muted">XP didapat</p></div>
              <div className="rounded-[22px] border border-line bg-white p-5"><CircleCheckBig className="mx-auto size-6 text-success" /><p className="mt-2 text-2xl font-[950] text-ink">{award?.score ?? 0}%</p><p className="text-xs font-bold text-muted">Ketepatan</p></div>
            </div>
            {lesson.documentId ? <button type="button" onClick={() => onNavigate("review")} className="button-secondary mt-5 w-full">Buka kartu ulang</button> : null}
          </section>
        ) : null}
      </LearnLayout>
      <AnimatePresence>
        {hintOpen ? <HintSheet key={question.id} questionId={question.id} material={question.materialIndex === undefined ? lesson.material : lesson.material.filter((_item, index) => index === question.materialIndex)} character={dashboard.stats.streak >= 30 ? "nenek_sri" : "mang_ujang"} onClose={() => setHintOpen(false)} /> : null}
      </AnimatePresence>
    </dialog>
  );
}
