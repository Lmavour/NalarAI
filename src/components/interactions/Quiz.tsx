import React, { useState } from 'react';
import { CheckCircle2, XCircle, Info, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../../utils/audio';

interface QuizProps {
  data: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  };
  onComplete: (data: { feedback: string; success: boolean }) => void;
}

export default function Quiz({ data, onComplete }: QuizProps) {
  // Ensure we have fallbacks for missing fields
  const safeData = {
    question: data.question || 'Pertanyaan Quiz',
    options: data.options || ['Pilihan 1', 'Pilihan 2', 'Pilihan 3'],
    correct: typeof data.correct === 'number' ? data.correct : 0,
    explanation: data.explanation || 'Tetap semangat belajar!'
  };

  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const playFeedback = (success: boolean) => {
    playSound(success ? 'success' : 'error');
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(success ? 50 : [50, 50, 50]);
    }
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setIsSubmitted(true);
    const isCorrect = selected === safeData.correct;
    playFeedback(isCorrect);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 md:mt-6 p-3 sm:p-4 md:p-5 rounded-2xl md:rounded-3xl bg-white border-2 border-brand-primary/10 shadow-xl shadow-brand-primary/5"
    >
      <div className="flex items-center justify-between">
        <div className="px-2 py-0.5 bg-brand-primary/10 rounded-full text-[7px] font-black uppercase tracking-widest text-brand-primary">
          Quick Quiz
        </div>
      </div>

      <h3 className="text-[11px] md:text-xs font-bold text-slate-800 mb-2 leading-tight">
        {safeData.question}
      </h3>

      <div className="space-y-1">
        {safeData.options.map((option, idx) => {
          const isCorrect = idx === safeData.correct;
          const isSelected = idx === selected;
          const showSuccess = isSubmitted && isCorrect;
          const showError = isSubmitted && isSelected && !isCorrect;

          return (
            <button
              key={idx}
              disabled={isSubmitted}
              onClick={() => setSelected(idx)}
              aria-label={`Pilihan: ${option}`}
              className={`w-full flex items-center justify-between p-1.5 md:p-2 rounded-lg border-2 transition-all text-left btn-tactile group
                ${isSelected && !isSubmitted ? 'border-brand-primary bg-brand-primary/5 shadow-[0_2px_0_0_rgb(22,163,74)]' : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-[0_2px_0_0_rgb(226,232,240)]'}
                ${showSuccess ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-[0_2px_0_0_rgb(16,185,129)]' : ''}
                ${showError ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-[0_2px_0_0_rgb(239,68,68)]' : ''}
              `}
            >
              <span className="text-[10px] md:text-[11px] font-bold group-hover:translate-x-0.5 transition-transform">{option}</span>
              {showSuccess && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
              {showError && <XCircle className="w-2.5 h-2.5 text-rose-500" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {isSubmitted && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-4 pt-4 border-t border-slate-100"
          >
            <div className="flex gap-2 mb-4">
              <div className="mt-1">
                <Info className="w-3 h-3 text-brand-primary" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                {safeData.explanation}
              </p>
            </div>
            
            <button 
              onClick={() => onComplete({ 
                feedback: selected === safeData.correct ? 'Hore, benar!' : 'Salah dikit', 
                success: selected === safeData.correct 
              })}
              className="btn-tactile w-full py-3 bg-slate-900 border-slate-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-[0_3px_0_0_rgb(31,41,55)]"
            >
              Lanjutkan Belajar <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!isSubmitted && (
        <button
          disabled={selected === null}
          onClick={handleSubmit}
          className={`btn-tactile mt-4 w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
            ${selected !== null 
              ? 'bg-brand-primary border-green-600 text-white shadow-[0_3px_0_0_rgb(22,163,74)]' 
              : 'bg-slate-200 border-slate-300 text-slate-400 shadow-[0_3px_0_0_rgb(148,163,184)]'
            }`}
        >
          Kunci Jawaban
        </button>
      )}
    </motion.div>
  );
}
