import React from 'react';
import { Sparkles, BookOpen, Search, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';

const SUGGESTIONS = [
  { icon: <BookOpen className="w-4 h-4" />, text: "Jelaskan tentang fotosintesis", color: "bg-blue-100 text-blue-700" },
  { icon: <BrainCircuit className="w-4 h-4" />, text: "Bagaimana cara kerja atom?", color: "bg-purple-100 text-purple-700" },
  { icon: <Search className="w-4 h-4" />, text: "Sejarah kemerdekaan Indonesia", color: "bg-emerald-100 text-emerald-700" }
];

interface WelcomeScreenProps {
  onSelectSuggestion: (text: string) => void;
}

export default function WelcomeScreen({ onSelectSuggestion }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6 sm:mb-10"
      >
        <img src="/nalarailogo.jpg" alt="Nalar.ai Logo" className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover shadow-[0_6px_0_0_rgb(22,163,74)] sm:shadow-[0_8px_0_0_rgb(22,163,74)] border-4 border-white" />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-800 mb-2">
          Nalar<span className="text-brand-primary">.ai</span>
        </h1>
        <p className="text-[10px] sm:text-sm lg:text-base font-bold text-slate-400 uppercase tracking-widest mb-6 sm:mb-8 md:mb-10 lg:mb-12">Eksperimen Belajar Aktif</p>
      </motion.div>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-base sm:text-lg lg:text-xl text-slate-500 font-bold mb-8 sm:mb-10 md:mb-12 lg:mb-16 max-w-[260px] sm:max-w-[280px] lg:max-w-md md:px-4 leading-relaxed"
      >
        Latih logika dan pemahamanmu melalui dialog yang menantang!
      </motion.p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 w-full max-w-4xl">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + (i * 0.1) }}
            onClick={() => onSelectSuggestion(s.text)}
            className="card-tactile flex items-center md:flex-row md:items-center md:justify-start gap-4 p-4 md:p-5 lg:p-6 text-left active:translate-y-1 transition-all min-h-[80px] md:min-h-0"
          >
            <div className={`flex-shrink-0 p-2.5 rounded-xl bg-slate-100 ${s.color.split(' ')[1]}`}>
              {React.cloneElement(s.icon as React.ReactElement<any>, { className: 'w-5 h-5 md:w-6 md:h-6' })}
            </div>
            <span className="text-sm md:text-base font-extrabold text-slate-700 leading-tight">
              {s.text}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
