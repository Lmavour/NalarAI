import React, { useState } from 'react';
import { Send, Quote, Sparkles, BrainCircuit, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ParaphraseProps {
  data: {
    context: string;
  };
  onComplete: (data: { feedback: string; success: boolean }) => void;
}

export default function Paraphrase({ data, onComplete }: ParaphraseProps) {
  const safeData = {
    context: data.context || 'Jelaskan konsep yang baru saja kita bahas.'
  };

  const [userInput, setUserInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = () => {
    if (!userInput.trim() || userInput.length < 10) return;
    setIsSubmitted(true);
    onComplete({ 
      feedback: `Saya menjelaskan ulang (paraphrase) materi ini: "${userInput}"`, 
      success: true 
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 md:mt-6 p-3 sm:p-4 md:p-5 rounded-2xl md:rounded-3xl bg-white border-2 border-brand-accent/10 shadow-xl shadow-brand-accent/5"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="px-2 py-0.5 bg-brand-primary/10 rounded-full text-[7px] font-black uppercase tracking-widest text-brand-primary">
          Tantangan Nalar
        </div>
      </div>

      <div className="mb-3">
        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
          <BrainCircuit className="w-3 h-3 text-brand-primary" />
          Uji Pemahamanmu
        </h3>
        
        <AnimatePresence mode="wait">
          {!isReady ? (
            <motion.div
              key="context"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="p-2 bg-slate-50 rounded-lg border-2 border-slate-200 shadow-[0_2px_0_0_rgb(226,232,240)] italic text-[9px] text-slate-600 leading-relaxed relative">
                <Quote className="absolute -top-1 -left-1 w-3 h-3 text-slate-200" />
                {safeData.context}
              </div>
              <button
                onClick={() => setIsReady(true)}
                className="btn-tactile w-full py-1.5 bg-brand-primary border-green-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-green-500 transition-all flex items-center justify-center gap-2 shadow-[0_2px_0_0_rgb(22,163,74)]"
              >
                <EyeOff className="w-2.5 h-2.5" /> Saya Siap
              </button>
            </motion.div>
          ) : (
            !isSubmitted && (
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                  <div className="flex items-center gap-1.5 text-[7px] font-bold text-slate-500 uppercase tracking-widest px-1">
                    <Eye className="w-2.5 h-2.5" /> Sumber Tersembunyi
                  </div>
                  <button 
                    onClick={() => setIsReady(false)}
                    className="ml-auto text-brand-primary text-[8px] font-black hover:underline px-2 py-0.5 rounded flex items-center"
                  >
                    Lihat Lagi
                  </button>
                </div>
            )
          )}
        </AnimatePresence>
      </div>

      {!isSubmitted && isReady && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-[8px] font-bold text-slate-500 italic">
            Jelaskan dengan bahasamu sendiri tanpa mengintip:
          </p>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ketik penjelasanmu di sini..."
            aria-label="Ketik penjelasanmu"
            className="w-full h-20 bg-slate-50 border-2 border-slate-200 rounded-lg px-3 py-1.5 text-[12px] font-bold text-slate-800 focus:border-brand-primary transition-all outline-none resize-none"
          />

          <button
            onClick={handleSubmit}
            disabled={!userInput.trim() || userInput.length < 10}
            className={`btn-tactile w-full py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5
              ${userInput.trim() && userInput.length >= 10
                ? 'bg-brand-primary border-green-600 text-white shadow-[0_2px_0_0_rgb(22,163,74)]' 
                : 'bg-slate-200 border-slate-300 text-slate-400 shadow-[0_2px_0_0_rgb(148,163,184)]'
              }`}
          >
            Kirim <Send className="w-2.5 h-2.5" />
          </button>
        </motion.div>
      )}

      {isSubmitted && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3 text-emerald-600">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="font-black text-sm text-slate-800 mb-1 tracking-tight">Penjelasan Terkirim!</p>
          <p className="text-[10px] text-slate-500 max-w-[180px]">Nalar.ai sedang memproses jawabanmu untuk mendiskusikan pemahamanmu lebih lanjut.</p>
        </div>
      )}
    </motion.div>
  );
}
