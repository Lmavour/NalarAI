import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Share2, RefreshCw } from 'lucide-react';

interface CertificateModalProps {
  isOpen: boolean;
  xp: number;
  onClose: () => void;
}

export default function CertificateModal({ isOpen, xp, onClose }: CertificateModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border-4 border-brand-primary/20"
          >
            <div className="bg-brand-primary p-8 text-center text-white relative overflow-hidden">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 w-full h-full opacity-10 flex items-center justify-center"
              >
                <RefreshCw className="w-64 h-64" />
              </motion.div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border-2 border-white/40">
                  <Trophy className="w-10 h-10 text-white fill-current" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Sertifikat Nalar</h2>
                <div className="flex items-center justify-center gap-1 mt-1 opacity-80">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Pencapaian Sesi</span>
                  <Star className="w-3 h-3 fill-current" />
                </div>
              </div>
            </div>

            <div className="p-8 text-center">
              <p className="text-slate-500 text-sm font-medium mb-2">Diberikan kepada</p>
              <h3 className="text-xl font-black text-slate-800 mb-6 tracking-tight">Siswa Terampil</h3>
              
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100 flex items-center justify-around mb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total XP</p>
                  <p className="text-lg font-black text-brand-primary">{xp}</p>
                </div>
                <div className="w-[1px] h-8 bg-slate-200" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-lg font-black text-brand-accent italic">Master</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-21.mp3');
                    audio.play().catch(() => {});
                    onClose();
                  }}
                  className="btn-tactile w-full py-4 bg-brand-primary border-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_4px_0_0_rgb(22,163,74)]"
                >
                  Terima Sertifikat
                </button>
                <button className="flex items-center justify-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest py-2">
                  <Share2 className="w-3 h-3" /> Bagikan Pencapaian
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
