"use client";

import { Check, Lightbulb, X } from "lucide-react";
import { useId, type KeyboardEvent, type Ref } from "react";
import type { AnswerResult, LessonQuestion } from "@/types/learning";

export type QuestionCardProps = {
  question: LessonQuestion;
  number: number;
  total: number;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  onHint: () => void;
  feedback?: AnswerResult | null;
  disabled?: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
};

export function QuestionCard({ question, number, total, selectedOptionId, onSelect, onHint, feedback, disabled = false, headingRef }: QuestionCardProps) {
  const headingId = useId();
  const locked = disabled || Boolean(feedback);

  function moveOptionFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (locked || !["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const count = question.options.length;
    const next = event.key === "Home" ? 0 : event.key === "End" ? count - 1
      : (index + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + count) % count;
    onSelect(question.options[next].id);
    event.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role='radio']")[next]?.focus();
  }

  return (
    <section data-question-card className="learn-card min-w-0 p-4 sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black tracking-wide text-blue-700">SOAL {number} / {total}</span>
        <button type="button" onClick={onHint} disabled={locked} aria-haspopup="dialog" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-extrabold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
          <Lightbulb className="size-4 shrink-0" aria-hidden="true" /> Petunjuk
        </button>
      </div>
      <h1 id={headingId} ref={headingRef} tabIndex={-1} className="mt-4 text-xl font-black leading-snug tracking-[-0.025em] text-ink [overflow-wrap:anywhere] lg:text-2xl">{question.prompt}</h1>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Pilih satu jawaban yang paling tepat.</p>

      <div role="radiogroup" aria-labelledby={headingId} className="mt-5 grid min-w-0 gap-3">
        {question.options.map((option, index) => {
          const selected = selectedOptionId === option.id;
          const correct = feedback?.correctOptionId === option.id;
          const wrong = Boolean(feedback && selected && !feedback.correct);
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              disabled={locked}
              aria-checked={selected}
              tabIndex={selectedOptionId ? (selected ? 0 : -1) : index === 0 ? 0 : -1}
              onClick={() => onSelect(option.id)}
              onKeyDown={(event) => moveOptionFocus(event, index)}
              className={`flex min-h-16 w-full min-w-0 items-center gap-3 rounded-[2rem] border-2 px-3 py-3 text-left transition-colors lg:px-4 ${
                correct ? "border-emerald-300 bg-emerald-50 text-emerald-900" : wrong ? "border-rose-300 bg-rose-50 text-rose-900"
                  : selected ? "border-blue-500 bg-blue-50 text-blue-900 shadow-sm" : "border-slate-100 bg-slate-50/60 text-slate-600 enabled:hover:border-blue-200 enabled:hover:bg-white"
              }`}
            >
              <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${correct ? "bg-emerald-600 text-white" : wrong ? "bg-rose-600 text-white" : selected ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-500"}`}>
                {correct ? <Check className="size-4" /> : wrong ? <X className="size-4" /> : String.fromCharCode(65 + index)}
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold leading-6 [overflow-wrap:anywhere]">{option.text}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
