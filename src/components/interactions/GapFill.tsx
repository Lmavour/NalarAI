import React, { useState } from 'react';
import { CheckCircle2, XCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GapFillProps {
  data: {
    sentence: string;
    answer: string;
    hint: string;
  };
  onComplete: (data: { feedback: string; success: boolean }) => void;
}

export default function GapFill({ data, onComplete }: GapFillProps) {
  const [userInput, setUserInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const playFeedback = (success: boolean) => {
    const audio = new Audio(success ? 'https://www.soundjay.com/buttons/sounds/button-3.mp3' : 'https://www.soundjay.com/buttons/sounds/button-10.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(success ? 50 : [50, 50, 50]);
    }
  };

  const handleSubmit = () => {
    if (!userInput.trim()) return;
    const correct = userInput.trim().toLowerCase() === data.answer.toLowerCase();
    setIsCorrect(correct);
    setIsSubmitted(true);
    playFeedback(correct);
  };

  const parts = data.sentence.split('___');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 md:mt-6 p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white border-2 border-brand-secondary/10 shadow-xl shadow-brand-secondary/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="px-3 py-1 bg-brand-secondary/10 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-secondary">
          Melengkapi Kalimat
        </div>
      </div>

      <div className="text-lg font-medium text-slate-800 mb-8 leading-relaxed">
        {parts[0]}
        <span className="inline-block mx-2 min-w-[120px] border-b-2 border-brand-primary px-2 text-brand-primary font-bold italic">
          {isSubmitted ? data.answer : (userInput || '...')}
        </span>
        {parts[1]}
      </div>

      {!isSubmitted ? (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Isi jawabanmu..."
              className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 focus:border-brand-primary transition-all outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!userInput.trim()}
              className={`btn-tactile flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all
                ${userInput.trim() 
                  ? 'bg-brand-primary border-green-600 text-white shadow-[0_4px_0_0_rgb(22,163,74)]' 
                  : 'bg-slate-200 border-slate-300 text-slate-400 shadow-[0_4px_0_0_rgb(148,163,184)]'
                }`}
            >
              Cek Jawaban
            </button>
            <button
              onClick={() => setShowHint(!showHint)}
              className="btn-tactile p-4 bg-white border-2 border-slate-200 text-slate-400 rounded-2xl hover:text-brand-primary shadow-[0_4px_0_0_rgb(226,232,240)]"
            >
              <Lightbulb className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence>
            {showHint && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100"
              >
                <p className="text-[10px] uppercase font-black text-emerald-600 mb-1">Bocoran (Hint)</p>
                <p className="text-xs text-emerald-800 italic">{data.hint}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className={`p-6 rounded-2xl flex items-start gap-4 
            ${isCorrect ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
            )}
            <div>
              <p className={`font-black text-sm mb-1 ${isCorrect ? 'text-emerald-900' : 'text-rose-900'}`}>
                {isCorrect ? 'Mantap! Jawabanmu Tepat.' : 'Hampir Benar!'}
              </p>
              <p className={`text-xs leading-relaxed ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isCorrect 
                  ? 'Mari lanjut ke pembahasan berikutnya.' 
                  : `Jawaban yang benar adalah: "${data.answer}". Jangan menyerah, ayo coba lagi di tantangan berikutnya!`}
              </p>
            </div>
          </div>

          <button 
            onClick={() => onComplete({
              feedback: isCorrect ? 'Sempurna!' : 'Coba lagi lain kali',
              success: isCorrect
            })}
            className="btn-tactile w-full py-4 bg-slate-900 border-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-[0_4px_0_0_rgb(31,41,55)]"
          >
            Lanjut Diskusi <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
