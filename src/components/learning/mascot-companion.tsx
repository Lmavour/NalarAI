"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { CHARACTER_ASSETS, CHARACTER_META, type CharacterExpression, type CharacterName } from "@/components/character-avatar";
import { useReducedMotionPreference } from "@/lib/use-reduced-motion";

export type CompanionEmotion = "idle" | "thinking" | "happy" | "crying" | "shocked";

export type CompanionState = {
  character: CharacterName;
  emotion: CompanionEmotion;
  message: string;
  eventKey: string;
  context?: string;
  celebrate?: boolean;
};

export type MascotCompanionProps = CompanionState & {
  compact?: boolean;
  className?: string;
};

const EXPRESSIONS: Record<CompanionEmotion, CharacterExpression> = {
  idle: "presenting",
  thinking: "thinking",
  happy: "excited",
  crying: "crying",
  shocked: "shocked",
};

const EMOTION_LABELS: Record<CompanionEmotion, string> = {
  idle: "siap menemani",
  thinking: "sedang berpikir",
  happy: "ikut merayakan",
  crying: "memberi semangat",
  shocked: "membantu menenangkan",
};

const CONFETTI_COLORS = ["#3b82f6", "#06b6d4", "#fbbf24", "#34d399", "#f472b6"];

/** A fixed-size stage lets expressions crossfade without shifting the lesson. */
export function MascotCompanion({ character, emotion, message, eventKey, context = "companion", celebrate = false, compact = false, className = "" }: MascotCompanionProps) {
  const reduceMotion = useReducedMotionPreference();
  const expression = EXPRESSIONS[emotion];
  const { displayName } = CHARACTER_META[character];
  const reactionKey = `${eventKey}:${character}:${emotion}`;
  const isMistake = emotion === "crying" || emotion === "shocked";

  return (
    <section
      data-companion
      data-character={character}
      data-expression={expression}
      data-emotion={emotion}
      data-character-moment={character}
      data-character-context={context}
      data-reaction-key={reactionKey}
      aria-label={`Companion ${displayName}`}
      className={`min-w-0 ${compact ? "flex items-center gap-2.5" : "flex flex-col items-center text-center"} ${className}`}
    >
      <div className={`relative isolate shrink-0 overflow-hidden ${compact ? "size-24" : "size-40"}`}>
        <div className="absolute inset-[18%] rounded-full bg-gradient-to-br from-blue-100 to-cyan-50" aria-hidden="true" />
        <div role="img" aria-label={`${displayName}, ${EMOTION_LABELS[emotion]}`} className="absolute inset-0">
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={reactionKey}
              data-companion-frame
              aria-hidden="true"
              className="absolute inset-2"
              initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.86 }}
              animate={reduceMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1, x: isMistake ? [0, -5, 4, -2, 0] : 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              transition={reduceMotion ? { duration: 0 } : {
                opacity: { duration: 0.22 },
                y: { type: "spring", stiffness: 340, damping: emotion === "happy" ? 16 : 22 },
                scale: { type: "spring", stiffness: 340, damping: emotion === "happy" ? 16 : 22 },
                x: { duration: 0.38, ease: "easeInOut" },
              }}
            >
              <Image
                src={CHARACTER_ASSETS[character][expression]}
                alt=""
                width={160}
                height={160}
                unoptimized
                loading="eager"
                className="size-full object-contain drop-shadow-sm"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {celebrate && !reduceMotion ? (
          <div key={reactionKey} data-confetti aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 12 }, (_, index) => (
              <motion.span
                key={index}
                className="absolute left-1/2 top-1/2 h-2 w-1.5 rounded-sm"
                style={{ backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length] }}
                initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                animate={{ opacity: [0, 1, 1, 0], x: (index % 2 ? 1 : -1) * (22 + index * 4), y: [-8, -44 - (index % 3) * 12, 58], rotate: (index % 2 ? 1 : -1) * (120 + index * 24) }}
                transition={{ duration: 0.95, delay: (index % 4) * 0.04, ease: "easeOut" }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className={`min-w-0 ${compact ? "flex-1 rounded-2xl rounded-bl-md border border-blue-100 bg-white px-3 py-2.5" : "mt-1 w-full rounded-3xl border border-blue-100 bg-blue-50/60 px-3 py-4"}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">{displayName}</p>
        <p className="mt-1 text-[13px] font-bold leading-5 text-slate-600 [overflow-wrap:anywhere]">{message}</p>
      </div>
    </section>
  );
}
