"use client";

import { motion } from "framer-motion";
import { Lightbulb, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { CharacterName } from "@/components/character-avatar";
import { MascotCompanion } from "@/components/learning/mascot-companion";
import { useReducedMotionPreference } from "@/lib/use-reduced-motion";
import type { LessonMaterial } from "@/types/learning";
import { SourceLinks } from "@/components/learning/source-links";

type HintSheetProps = {
  material: LessonMaterial[];
  questionId: string;
  character?: CharacterName;
  onClose: () => void;
};

export function HintSheet({ material, questionId, character = "nenek_sri", onClose }: HintSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const reduceMotion = useReducedMotionPreference();

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    closeRef.current?.focus();
    return () => {
      dialog?.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  return (
    <motion.dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'))
          .filter((element) => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable.at(-1);
        if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
      className="app-dialog fixed inset-0 m-0 flex h-dvh max-h-none w-full max-w-none flex-col items-center justify-end overflow-hidden border-0 bg-transparent p-0 pl-[var(--safe-left)] pr-[var(--safe-right)] text-ink md:justify-center md:p-6"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
    >
      <motion.section
        className="flex max-h-[88dvh] w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-t-[32px] border border-slate-200 bg-white shadow-xl md:rounded-[32px]"
        initial={reduceMotion ? false : { y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: reduceMotion ? 0 : 60 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30 }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4">
          <h2 id={titleId} className="flex items-center gap-2 text-lg font-black"><Lightbulb className="size-5 text-amber-600" aria-hidden="true" /> Petunjuk konsep</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Tutup petunjuk" className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100"><X className="size-5" aria-hidden="true" /></button>
        </header>
        <div tabIndex={0} aria-label="Materi petunjuk" className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
          <MascotCompanion character={character} emotion="thinking" message="" eventKey={`hint:${questionId}`} context="hint" compact minimal className="my-2" />
          <ul className="grid gap-3">
            {material.map((card) => (
              <li key={card.id} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-xs font-black text-blue-800 [overflow-wrap:anywhere]">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{card.keyTakeaway}</p>
                <SourceLinks refs={card.sourceRefs} className="mt-3" />
              </li>
            ))}
          </ul>
        </div>
        <footer className="shrink-0 border-t border-slate-100 px-5 pb-[max(20px,var(--safe-bottom))] pt-4">
          <button type="button" onClick={onClose} className="button-primary w-full rounded-full">Kembali ke soal</button>
        </footer>
      </motion.section>
    </motion.dialog>
  );
}
