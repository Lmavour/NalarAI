import React, { useState } from 'react';
import { CheckCircle2, XCircle, Info, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const playFeedback = (success: boolean) => {
    const audio = new Audio(success ? 'https://www.soundjay.com/buttons/sounds/button-3.mp3' : 'https://www.soundjay.com/buttons/sounds/button-10.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(success ? 50 : [50, 50, 50]);
    }
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setIsSubmitted(true);
    const isCorrect = selected === data.correct;
    playFeedback(isCorrect);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 md:mt-6 p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white border-2 border-brand-primary/10 shadow-xl shadow-brand-primary/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="px-3 py-1 bg-brand-primary/10 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-primary">
          Quick Quiz
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-6 leading-tight">
        {data.question}
      </h3>

      <div className="space-y-3">
        {data.options.map((option, idx) => {
          const isCorrect = idx === data.correct;
          const isSelected = idx === selected;
          const showSuccess = isSubmitted && isCorrect;
          const showError = isSubmitted && isSelected && !isCorrect;

          return (
            <button
              key={idx}
              disabled={isSubmitted}
              onClick={() => setSelected(idx)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left btn-tactile
                ${isSelected && !isSubmitted ? 'border-brand-primary bg-brand-primary/5 shadow-[0_3px_0_0_rgb(22,163,74)]' : 'border-slate-200 bg-white hover:bg-slate-50 shadow-[0_3px_0_0_rgb(226,232,240)]'}
                ${showSuccess ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-[0_3px_0_0_rgb(16,185,129)]' : ''}
                ${showError ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-[0_3px_0_0_rgb(239,68,68)]' : ''}
              `}
            >
              <span className="text-sm font-bold">{option}</span>
              {showSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {showError && <XCircle className="w-5 h-5 text-rose-500" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {isSubmitted && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-6 pt-6 border-t border-slate-100"
          >
            <div className="flex gap-3 mb-6">
              <div className="mt-1">
                <Info className="w-4 h-4 text-brand-primary" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed italic">
                {data.explanation}
              </p>
            </div>
            
            <button 
              onClick={() => onComplete({ 
                feedback: selected === data.correct ? 'Hore, benar!' : 'Salah dikit', 
                success: selected === data.correct 
              })}
              className="btn-tactile w-full py-4 bg-slate-900 border-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-[0_4px_0_0_rgb(31,41,55)]"
            >
              Lanjutkan Belajar <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!isSubmitted && (
        <button
          disabled={selected === null}
          onClick={handleSubmit}
          className={`btn-tactile mt-6 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all
            ${selected !== null 
              ? 'bg-brand-primary border-green-600 text-white shadow-[0_4px_0_0_rgb(22,163,74)]' 
              : 'bg-slate-200 border-slate-300 text-slate-400 shadow-[0_4px_0_0_rgb(148,163,184)]'
            }`}
        >
          Kunci Jawaban
        </button>
      )}
    </motion.div>
  );
}
