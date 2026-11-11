"use client";

import { motion } from "framer-motion";
import { ArrowRight, CircleCheckBig, XCircle, Zap } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useReducedMotionPreference } from "@/lib/use-reduced-motion";
import type { AnswerResult } from "@/types/learning";
import { SourceLinks } from "@/components/learning/source-links";

export type FloatingFeedbackBarProps = {
  feedback: AnswerResult;
  onContinue: () => void;
};

/** Lives in the layout's action row, so neither answers nor mobile nav are covered. */
export function FloatingFeedbackBar({ feedback, onContinue }: FloatingFeedbackBarProps) {
  const reduceMotion = useReducedMotionPreference();
  const continueRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const xp = feedback.award?.xpEarned;

  useEffect(() => {
    continueRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.section
      data-feedback={feedback.correct ? "correct" : "incorrect"}
      aria-labelledby={titleId}
      className={`flex max-h-[42dvh] min-w-0 flex-col gap-2 rounded-t-3xl border px-4 py-3 shadow-sm md:rounded-3xl lg:px-5 ${feedback.correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 30 }}
    >
      <div role="status" aria-live="polite" aria-atomic="true" className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id={titleId} className={`flex items-center gap-2 text-sm font-black ${feedback.correct ? "text-emerald-900" : "text-rose-900"}`}>
          {feedback.correct ? <CircleCheckBig className="size-5 shrink-0" aria-hidden="true" /> : <XCircle className="size-5 shrink-0" aria-hidden="true" />}
          {feedback.correct ? "Tepat sekali" : "Belum tepat"}
        </h2>
        {xp !== undefined ? (
          <span data-awarded-xp={xp} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-black text-amber-900"><Zap className="size-3.5 fill-amber-400 text-amber-500" aria-hidden="true" /> +{xp} XP level</span>
        ) : null}
      </div>
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <p tabIndex={0} aria-label="Penjelasan jawaban" className="text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{feedback.explanation}</p>
        <SourceLinks refs={feedback.sourceRefs} className="mt-2" />
      </div>
      <button ref={continueRef} type="button" onClick={onContinue} className="button-primary mt-1 w-full shrink-0 rounded-full md:ml-auto md:w-auto md:min-w-36">
        {feedback.completed ? "Lihat hasil" : "Lanjut"} <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
      </button>
    </motion.section>
  );
}
