import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trophy, Heart, Flame, Target, Award, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../types';
import MessageItem from './MessageItem';
import WelcomeScreen from './WelcomeScreen';
import CertificateModal from './CertificateModal';
import { playSound, preloadSounds } from '../utils/audio';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hearts, setHearts] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nalar_hearts');
      return saved !== null ? parseInt(saved, 10) : 5;
    }
    return 5;
  });
  const [xp, setXp] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nalar_xp');
      return saved !== null ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [streak, setStreak] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nalar_streak');
      return saved !== null ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [showCertificate, setShowCertificate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Preload sounds on mount
  useEffect(() => {
    preloadSounds();
    
    // Keyboard viewport resize handling
    if (window.visualViewport) {
      const onResize = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      };
      window.visualViewport.addEventListener('resize', onResize);
      return () => window.visualViewport.removeEventListener('resize', onResize);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input]);

  // Persist progress to localStorage
  useEffect(() => {
    localStorage.setItem('nalar_hearts', hearts.toString());
    localStorage.setItem('nalar_xp', xp.toString());
    localStorage.setItem('nalar_streak', streak.toString());
  }, [hearts, xp, streak]);

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    playSound('pop');
    triggerHaptic();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || 'Gagal terhubung ke Nalar.ai. Coba beberapa saat lagi.');
      }
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**Aduh!** 😅\n\n${error.message || 'Sepertinya ada sedikit kendala teknis. Coba ketik lagi ya!'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInteractionComplete = useCallback((result: { feedback: string; success: boolean }) => {
    if (result.success) {
      setXp(prev => {
        const nextXp = prev + 15;
        if (nextXp >= 100 && prev < 100) {
          setShowCertificate(true);
        }
        return nextXp;
      });
      setStreak(prev => prev + 1);
      playSound('success');
    } else {
      setHearts(prev => Math.max(0, prev - 1));
      setStreak(0);
      playSound('error');
    }
    handleSendMessage(result.feedback);
  }, [xp]);



  return (
    <div className="flex items-center justify-center h-dvh bg-white p-0 overflow-hidden">
      <div className="flex flex-col lg:flex-row h-full w-full bg-white overflow-hidden relative">
              {/* LG Sidebar (Desktop Only) */}
        <aside className="hidden lg:flex flex-col w-[320px] border-r border-slate-100 bg-slate-50/50 p-8 pt-10 overflow-y-auto scrollbar-hide">
          <div className="mb-8">
            <h1 className="text-2xl font-black tracking-tight text-slate-800 mb-6">
              Nalar<span className="text-brand-primary">.ai</span>
            </h1>
            
            {/* Level Info */}
            <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-[0_4px_0_0_rgb(241,245,249)] mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level {Math.floor(xp / 100) + 1}</span>
                <Award className="w-4 h-4 text-brand-primary" />
              </div>
              <div className="text-sm font-black text-slate-800 mb-4 tracking-tight">
                {xp < 50 ? 'Nalar Rookie' : xp < 100 ? 'Nalar Apprentice' : 'Nalar Master'}
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((xp % 100 / 100) * 100, 100)}%` }}
                  className="h-full bg-brand-primary shadow-[inset_0_-3px_0_0_rgba(0,0,0,0.1)]"
                />
              </div>
              <div className="mt-2 text-[10px] font-bold text-slate-500 text-right uppercase tracking-tighter">
                {xp % 100} / 100 XP
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100 flex flex-col items-center justify-center">
                <Heart className={`w-6 h-6 text-brand-error fill-current mb-1 ${hearts <= 1 ? 'animate-pulse' : ''}`} />
                <span className="text-lg font-black text-brand-error">{hearts}</span>
                <span className="text-[8px] font-black text-rose-300 uppercase tracking-widest mt-1">Nyawa</span>
              </div>
              <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 flex flex-col items-center justify-center">
                <Flame className="w-6 h-6 text-brand-accent fill-current mb-1" />
                <span className="text-lg font-black text-brand-accent">{streak}</span>
                <span className="text-[8px] font-black text-amber-300 uppercase tracking-widest mt-1">Streak</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-10">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Aktivitas Hari Ini</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-2xl border border-slate-100/50">
                <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-brand-primary" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-800">Target Tercapai</div>
                  <div className="text-[9px] font-bold text-slate-400">{Math.min(xp % 100, 100)}% selesai</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-2xl border border-slate-100/50">
                <div className="w-8 h-8 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-brand-accent" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-800">Total XP</div>
                  <div className="text-[9px] font-bold text-slate-400">{xp} points</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pb-4">
             <div className="p-5 bg-gradient-to-br from-brand-primary to-green-600 rounded-[32px] text-white overflow-hidden relative group cursor-default">
                <Target className="absolute -right-4 -bottom-4 w-20 h-20 text-white/10 group-hover:scale-110 transition-transform duration-500" />
                <div className="relative z-10">
                  <div className="text-[10px] font-black text-white/80 uppercase tracking-widest mb-1">Eksperimen AI</div>
                  <div className="text-sm font-bold leading-tight">Belajar interaktif bersama Nalar.ai</div>
                </div>
             </div>
          </div>
        </aside>

        {/* Main Interface Content Area */}
        <div className="flex flex-col flex-1 h-full relative overflow-hidden">
          {/* Header / Progress Bar */}
          <header className="flex-shrink-0 bg-white border-b border-slate-100 z-20 py-2 sm:py-3 px-4 sm:px-6 md:px-10">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
              {/* Left Section: Level & Progress */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col">
                  <div className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Lvl {Math.floor(xp / 100) + 1}</div>
                  <div className="text-[10px] md:text-xs font-black text-slate-800 truncate leading-none">
                    {xp < 50 ? 'Rookie' : xp < 100 ? 'Apprentice' : 'Master'}
                  </div>
                </div>
                <div className="hidden sm:block w-20 md:w-28 h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((xp % 100 / 100) * 100, 100)}%` }}
                    className="h-full bg-brand-primary"
                  />
                </div>
              </div>

              {/* Center Progress (Mobile only) */}
              <div className="flex-1 sm:hidden h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((xp % 100 / 100) * 100, 100)}%` }}
                  className="h-full bg-brand-primary shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.1)]"
                />
              </div>

              {/* Right Section: Stats Hub */}
              <div className="flex items-center gap-2.5 sm:gap-5">
                <div className="flex items-center gap-1 text-brand-error font-black px-1" aria-label={`Nyawa: ${hearts}`}>
                  <Heart className={`w-3.5 h-3.5 md:w-4 md:h-4 fill-current ${hearts <= 1 ? 'animate-pulse' : ''}`} />
                  <span className="text-[11px] md:text-sm">{hearts}</span>
                </div>
                
                <div className="flex items-center gap-1 text-brand-accent font-black px-1" aria-label={`Streak: ${streak}`}>
                  <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
                  <span className="text-[11px] md:text-sm">{streak}</span>
                </div>
                
                <div className="hidden xs:flex items-center gap-1 text-slate-400 font-black px-1" aria-label={`Total XP: ${xp}`}>
                  <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="text-[11px] md:text-sm">{xp}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Message Area */}
          <main 
            ref={scrollRef}
            className="flex-grow overflow-y-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 lg:py-12 scroll-smooth bg-white lg:bg-white/50"
          >
            <div className="w-full max-w-3xl mx-auto h-full">
              {messages.length === 0 ? (
                <WelcomeScreen onSelectSuggestion={handleSendMessage} />
              ) : (
                <div className="space-y-6 md:space-y-10">
                  <AnimatePresence mode="popLayout">
                    {messages.map((m, idx) => (
                      <MessageItem 
                        key={m.id} 
                        message={m} 
                        onInteractionComplete={
                          idx === messages.length - 1 && m.role === 'assistant' 
                            ? handleInteractionComplete 
                            : undefined
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-start items-center gap-3 mt-4 mb-8"
                >
                  <div className="ai-bubble p-4 px-6 flex items-center gap-3">
                    <div className="flex gap-1">
                      <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-brand-primary" />
                      <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-brand-primary" />
                      <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-brand-primary" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </main>

          {/* Input Area */}
          <footer 
            className="flex-shrink-0 bg-white border-t border-slate-100 p-4 md:p-6 lg:p-10 z-10 transition-all"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
          >
            <div className="max-w-3xl mx-auto w-full">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(input);
                      }
                    }}
                    placeholder="Ketik jawabanmu..."
                    className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-3 md:py-3.5 focus:ring-0 focus:bg-white focus:border-brand-primary transition-all resize-none min-h-[50px] md:min-h-[56px] max-h-32 md:max-h-48 text-[15px] md:text-base font-bold text-slate-800 placeholder:text-slate-400"
                    rows={1}
                    aria-label="Ketik pesan pesan"
                  />
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleSendMessage(input)}
                      disabled={!input.trim() || isLoading}
                      aria-label="Kirim pesan"
                      className={`btn-tactile w-[50px] h-[50px] md:w-[56px] md:h-[56px] rounded-2xl flex items-center justify-center transition-all
                        ${input.trim() && !isLoading 
                          ? 'bg-brand-primary border-green-600 text-white shadow-[0_3px_0_0_rgb(22,163,74)]' 
                          : 'bg-slate-200 border-slate-300 text-slate-400 shadow-[0_3px_0_0_rgb(148,163,184)]'
                        }`}
                    >
                      <Send className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Certificate Modal */}
      <CertificateModal 
        isOpen={showCertificate} 
        xp={xp} 
        onClose={() => setShowCertificate(false)} 
      />
    </div>
  );
}
