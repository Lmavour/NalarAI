"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useReducedMotionPreference } from "@/lib/use-reduced-motion";

export type CharacterName = "gara" | "rara" | "bima" | "nenek_sri" | "mang_ujang" | "putri";
export type CharacterExpression = "happy" | "thinking" | "crying" | "shocked" | "presenting" | "excited";
export type CharacterSize = "md" | "lg";

export const CHARACTER_META: Record<CharacterName, { displayName: string; tone: string }> = {
  gara: { displayName: "Gara", tone: "border-blue-200 bg-ice text-sapphire" },
  rara: { displayName: "Rara", tone: "border-[#F2CBD4] bg-[#FFF1F4] text-[#7F3147]" },
  bima: { displayName: "Bima", tone: "border-[#F2D293] bg-[#FFF7E6] text-[#744C00]" },
  nenek_sri: { displayName: "Nenek Sri", tone: "border-[#B9E3D5] bg-[#EEFBF6] text-[#286B59]" },
  mang_ujang: { displayName: "Mang Ujang", tone: "border-[#D8D0C0] bg-[#FAF7F0] text-[#5E4A32]" },
  putri: { displayName: "Putri", tone: "border-[#F3C4E4] bg-[#FFF0FA] text-[#853262]" },
};

export const CHARACTER_ASSETS: Record<CharacterName, Record<CharacterExpression, string>> = {
  gara: {
    happy: "/assets/stickers/gara_thumbs_up.png",
    thinking: "/assets/stickers/gara_confused.png",
    crying: "/assets/stickers/gara_crying.png",
    shocked: "/assets/stickers/gara_shocked.png",
    presenting: "/assets/stickers/gara_double_thumbs_up.png",
    excited: "/assets/stickers/gara_cheering.png",
  },
  rara: {
    happy: "/assets/stickers/rara_vibing.png",
    thinking: "/assets/stickers/rara_skeptical.png",
    crying: "/assets/stickers/rara_facepalm.png",
    shocked: "/assets/stickers/rara_shocked.png",
    presenting: "/assets/stickers/rara_smirking.png",
    excited: "/assets/stickers/rara_gasping.png",
  },
  bima: {
    happy: "/assets/stickers/bima_relieved.png",
    thinking: "/assets/stickers/bima_studying.png",
    crying: "/assets/stickers/bima_crying.png",
    shocked: "/assets/stickers/bima_panicking.png",
    presenting: "/assets/stickers/bima_focused.png",
    excited: "/assets/stickers/bima_celebrating.png",
  },
  nenek_sri: {
    happy: "/assets/stickers/nenek_sri_grateful.png",
    thinking: "/assets/stickers/nenek_sri_thinking.png",
    crying: "/assets/stickers/nenek_sri_tired.png",
    shocked: "/assets/stickers/nenek_sri_shocked.png",
    presenting: "/assets/stickers/nenek_sri_advising.png",
    excited: "/assets/stickers/nenek_sri_cheering.png",
  },
  mang_ujang: {
    happy: "/assets/stickers/mang_ujang_happy_coffee.png",
    thinking: "/assets/stickers/mang_ujang_sipping_coffee.png",
    crying: "/assets/stickers/mang_ujang_worried.png",
    shocked: "/assets/stickers/mang_ujang_shocked.png",
    presenting: "/assets/stickers/mang_ujang_explaining.png",
    excited: "/assets/stickers/mang_ujang_thumbs_up.png",
  },
  putri: {
    happy: "/assets/stickers/putri_thumbs_up.png",
    thinking: "/assets/stickers/putri_confused.png",
    crying: "/assets/stickers/putri_laughing_crying.png",
    shocked: "/assets/stickers/putri_confused.png",
    presenting: "/assets/stickers/putri_happy_pointing.png",
    excited: "/assets/stickers/putri_celebrating.png",
  },
};

type CharacterAvatarProps = {
  character: CharacterName;
  expression: CharacterExpression;
  size?: CharacterSize;
  className?: string;
  priority?: boolean;
};

export function CharacterAvatar({ character, expression, size = "md", className = "", priority = false }: CharacterAvatarProps) {
  const reduceMotion = useReducedMotionPreference();
  const pixels = size === "lg" ? 144 : 96;
  const meta = CHARACTER_META[character];

  return (
    <motion.div
      data-character={character}
      data-expression={expression}
      className={`relative shrink-0 ${size === "lg" ? "size-36" : "size-24"} ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.88, rotate: -3 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.92 }}
      transition={reduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 330, damping: 23 }}
    >
      <Image
        src={CHARACTER_ASSETS[character][expression]}
        alt={`${meta.displayName} ${expression}`}
        width={pixels}
        height={pixels}
        sizes={`${pixels}px`}
        priority={priority}
        className="size-full object-contain drop-shadow-[0_8px_10px_rgba(17,59,115,0.12)]"
      />
    </motion.div>
  );
}

type CharacterMomentProps = CharacterAvatarProps & {
  message: string;
  context: string;
  label?: string;
  className?: string;
};

export function CharacterMoment({ character, expression, message, context, label, size = "md", className = "" }: CharacterMomentProps) {
  const reduceMotion = useReducedMotionPreference();
  const meta = CHARACTER_META[character];

  return (
    <motion.aside
      data-character-moment={character}
      data-character-context={context}
      className={`flex min-w-0 items-center gap-2 rounded-[20px] border p-2.5 pr-4 shadow-[0_4px_14px_rgba(17,59,115,0.07)] sm:gap-3 ${meta.tone} ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
      transition={reduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 300, damping: 25 }}
      aria-label={`${meta.displayName}: ${message}`}
    >
      <CharacterAvatar character={character} expression={expression} size={size} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-[950] uppercase tracking-[0.12em] opacity-75">{label ?? meta.displayName}</p>
        <p className="mt-1 text-sm font-extrabold leading-5 [overflow-wrap:anywhere]">{message}</p>
      </div>
    </motion.aside>
  );
}
