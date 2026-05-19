/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, RotateCcw, Flame, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GameOverModalProps {
  isOpen: boolean;
  streak: number;
  xp: number;
  onRestart: () => void;
}

export default function GameOverModal({ isOpen, streak, xp, onRestart }: GameOverModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Nyawa habis - Mulai sesi baru"
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-full max-w-sm bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border-2 border-rose-200 relative overflow-hidden"
          >
            {/* Decorative background */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-rose-50 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Broken heart icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                className="w-20 h-20 sm:w-24 sm:h-24 bg-rose-100 rounded-full flex items-center justify-center mb-4 border-4 border-rose-200"
              >
                <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400" aria-hidden="true" />
                {/* Crack overlay */}
                <div className="absolute w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-12 sm:h-12 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 21C12 21 4 13.5 4 8.5C4 5.5 6 3 8.5 3C10 3 11 4 12 5C13 4 14 3 15.5 3C18 3 20 5.5 20 8.5C20 13.5 12 21 12 21Z" />
                    <path d="M12 5V12L9 9.5L12 12L15 9.5" strokeWidth="2" opacity="0.6" />
                  </svg>
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl sm:text-3xl font-black text-rose-600 mb-1 tracking-tight"
              >
                Nyawa Habis!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-slate-500 font-bold mb-6 max-w-[240px] leading-relaxed"
              >
                Semua nyawa habis untuk sesi ini. Jangan menyerah — mulai sesi baru dan coba lagi!
              </motion.p>

              {/* Session summary */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-3 w-full mb-6"
              >
                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 flex flex-col items-center">
                  <Flame className="w-5 h-5 text-amber-500 fill-current mb-1" aria-hidden="true" />
                  <span className="text-lg font-black text-amber-600">{streak}</span>
                  <span className="text-[8px] font-black text-amber-300 uppercase tracking-widest">Streak Sesi</span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col items-center">
                  <Trophy className="w-5 h-5 text-slate-400 mb-1" aria-hidden="true" />
                  <span className="text-lg font-black text-slate-600">{xp}</span>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">XP Sesi</span>
                </div>
              </motion.div>

              {/* Restart button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={onRestart}
                className="btn-tactile w-full py-4 bg-brand-primary border-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-500 transition-all flex items-center justify-center gap-2.5 shadow-[0_4px_0_0_rgb(22,163,74)] active:translate-y-1 active:shadow-[0_2px_0_0_rgb(22,163,74)]"
              >
                <RotateCcw className="w-5 h-5" aria-hidden="true" />
                Mulai Sesi Baru
              </motion.button>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-[10px] text-slate-400 font-bold mt-3"
              >
                Sesi akan dimulai dari awal percakapan
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}