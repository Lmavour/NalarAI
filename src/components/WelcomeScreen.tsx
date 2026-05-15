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
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-brand-primary rounded-3xl flex items-center justify-center mb-10 shadow-[0_8px_0_0_rgb(22,163,74)] border-4 border-white"
      >
        <Sparkles className="w-12 h-12 text-white" />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-4xl font-black tracking-tight text-slate-800 mb-2">
          Nalar<span className="text-brand-primary">.ai</span>
        </h1>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Eksperimen Belajar Aktif</p>
      </motion.div>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg text-slate-500 font-bold mb-10 max-w-[280px] leading-relaxed"
      >
        Latih logika dan pemahamanmu melalui dialog yang menantang!
      </motion.p>
      
      <div className="grid grid-cols-1 gap-3 w-full">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + (i * 0.1) }}
            onClick={() => onSelectSuggestion(s.text)}
            className="card-tactile flex items-center gap-4 p-4 text-left active:translate-y-1 transition-all"
          >
            <div className={`p-2 rounded-xl bg-slate-100 ${s.color.split(' ')[1]}`}>
              {s.icon}
            </div>
            <span className="text-sm font-extrabold text-slate-700 leading-tight">
              {s.text}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
