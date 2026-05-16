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
      className="mt-4 md:mt-6 p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white border-2 border-brand-accent/10 shadow-xl shadow-brand-accent/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="px-3 py-1 bg-brand-primary/10 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-primary">
          Tantangan Nalar
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-brand-primary" />
          Uji Pemahamanmu
        </h3>
        
        <AnimatePresence mode="wait">
          {!isReady ? (
            <motion.div
              key="context"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 shadow-[0_3px_0_0_rgb(226,232,240)] italic text-sm text-slate-600 leading-relaxed relative">
                <Quote className="absolute -top-2 -left-2 w-6 h-6 text-slate-200" />
                {safeData.context}
              </div>
              <button
                onClick={() => setIsReady(true)}
                className="btn-tactile w-full py-4 bg-brand-primary border-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-500 transition-all flex items-center justify-center gap-2 shadow-[0_4px_0_0_rgb(22,163,74)]"
              >
                <EyeOff className="w-4 h-4" /> Saya Siap (Tutup & Jelaskan)
              </button>
            </motion.div>
          ) : (
            !isSubmitted && (
                <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Eye className="w-3 h-3" /> Teks Sumber Disembunyikan
                  </div>
                  <button 
                    onClick={() => setIsReady(false)}
                    className="ml-auto text-brand-primary font-black hover:underline px-3 py-1 rounded-lg min-h-[44px] flex items-center"
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
          className="space-y-4"
        >
          <p className="text-xs font-bold text-slate-500 italic">
            Sekarang, jelaskan materi tadi dengan bahasamu sendiri tanpa mengintip:
          </p>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ketik penjelasanmu di sini..."
            aria-label="Ketik penjelasanmu"
            className="w-full h-32 bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-base font-bold text-slate-800 focus:border-brand-primary transition-all outline-none resize-none"
          />

          <button
            onClick={handleSubmit}
            disabled={!userInput.trim() || userInput.length < 10}
            className={`btn-tactile w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2
              ${userInput.trim() && userInput.length >= 10
                ? 'bg-brand-primary border-green-600 text-white shadow-[0_4px_0_0_rgb(22,163,74)]' 
                : 'bg-slate-200 border-slate-300 text-slate-400 shadow-[0_4px_0_0_rgb(148,163,184)]'
              }`}
          >
            Kirim Penjelasan <Send className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {isSubmitted && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
            <Sparkles className="w-8 h-8" />
          </div>
          <p className="font-black text-slate-800 mb-2 tracking-tight">Penjelasan Terkirim!</p>
          <p className="text-xs text-slate-500 max-w-[200px]">Nalar.ai sedang memproses jawabanmu untuk mendiskusikan pemahamanmu lebih lanjut.</p>
        </div>
      )}
    </motion.div>
  );
}
