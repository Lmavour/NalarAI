import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trophy, Heart, Flame, Target, Award, Zap, Sparkles, Home } from 'lucide-react';
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
      // Return focus to textarea after message is sent
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
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
      {/* Skip to main content - accessibility */}
      <a
        href="#chat-messages"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-brand-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:font-bold focus:text-sm"
      >
        Langsung ke chat
      </a>

      <div className="flex flex-col lg:flex-row h-full w-full bg-white overflow-hidden relative">
              {/* LG Sidebar (Desktop Only) */}
        <aside className="hidden lg:flex flex-col w-[280px] border-r border-slate-100 bg-slate-50/50 p-6 pt-8 overflow-y-auto scrollbar-hide" aria-label="Panel progress belajar">
          <div className="mb-6">
            <a href="/" className="text-xl font-black tracking-tight text-slate-800 mb-4 block hover:opacity-80 transition-opacity" aria-label="Kembali ke halaman utama Nalar.ai">
              Nalar<span className="text-brand-primary">.ai</span>
            </a>
            
            {/* Level Info */}
            <div className="bg-white rounded-3xl p-4 border-2 border-slate-100 shadow-[0_4px_0_0_rgb(241,245,249)] mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level {Math.floor(xp / 100) + 1}</span>
                <Award className="w-4 h-4 text-brand-primary" aria-hidden="true" />
              </div>
              <div className="text-sm font-black text-slate-800 mb-3 tracking-tight">
                {xp < 50 ? 'Nalar Rookie' : xp < 100 ? 'Nalar Apprentice' : 'Nalar Master'}
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200" role="progressbar" aria-valuenow={xp % 100} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress XP: ${xp % 100} dari 100`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((xp % 100 / 100) * 100, 100)}%` }}
                  className="h-full bg-brand-primary shadow-[inset_0_-3px_0_0_rgba(0,0,0,0.1)]"
                />
              </div>
              <div className="mt-1.5 text-[10px] font-bold text-slate-500 text-right uppercase tracking-tighter">
                {xp % 100} / 100 XP
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="bg-rose-50/50 rounded-2xl p-3 border border-rose-100 flex flex-col items-center justify-center" aria-label={`Nyawa: ${hearts}`}>
                <Heart className={`w-5 h-5 text-brand-error fill-current mb-0.5 ${hearts <= 1 ? 'animate-pulse' : ''}`} aria-hidden="true" />
                <span className="text-base font-black text-brand-error">{hearts}</span>
                <span className="text-[8px] font-black text-rose-300 uppercase tracking-widest mt-0.5">Nyawa</span>
              </div>
              <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100 flex flex-col items-center justify-center" aria-label={`Streak: ${streak}`}>
                <Flame className="w-5 h-5 text-brand-accent fill-current mb-0.5" aria-hidden="true" />
                <span className="text-base font-black text-brand-accent">{streak}</span>
                <span className="text-[8px] font-black text-amber-300 uppercase tracking-widest mt-0.5">Streak</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-2">Aktivitas Hari Ini</h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 p-2.5 bg-white/50 rounded-2xl border border-slate-100/50">
                <div className="w-7 h-7 rounded-xl bg-brand-primary/10 flex items-center justify-center" aria-hidden="true">
                  <Zap className="w-3.5 h-3.5 text-brand-primary" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-800">Target Tercapai</div>
                  <div className="text-[9px] font-bold text-slate-400">{Math.min(xp % 100, 100)}% selesai</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-white/50 rounded-2xl border border-slate-100/50">
                <div className="w-7 h-7 rounded-xl bg-brand-accent/10 flex items-center justify-center" aria-hidden="true">
                  <Trophy className="w-3.5 h-3.5 text-brand-accent" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-800">Total XP</div>
                  <div className="text-[9px] font-bold text-slate-400">{xp} points</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pb-4">
             <div className="p-4 bg-gradient-to-br from-brand-primary to-green-600 rounded-[28px] text-white overflow-hidden relative group cursor-default" aria-hidden="true">
                <Target className="absolute -right-4 -bottom-4 w-16 h-16 text-white/10 group-hover:scale-110 transition-transform duration-500" />
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
          <header className="flex-shrink-0 bg-white border-b border-slate-100 z-20 py-2 sm:py-3 px-4 sm:px-6 md:px-8" role="banner">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            {/* Left Section: Home Link + Level & Progress */}
            <div className="flex items-center gap-3 min-w-0">
              <a href="/" className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:bg-slate-300 transition-colors" aria-label="Kembali ke halaman utama" title="Halaman Utama">
                <Home className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" aria-hidden="true" />
              </a>
                <div className="flex flex-col">
                  <div className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Lvl {Math.floor(xp / 100) + 1}</div>
                  <div className="text-[10px] md:text-xs font-black text-slate-800 truncate leading-none">
                    {xp < 50 ? 'Rookie' : xp < 100 ? 'Apprentice' : 'Master'}
                  </div>
                </div>
                <div className="hidden sm:block w-20 md:w-28 h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200" role="progressbar" aria-valuenow={xp % 100} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress level: ${xp % 100} dari 100 XP`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((xp % 100 / 100) * 100, 100)}%` }}
                    className="h-full bg-brand-primary"
                  />
                </div>
              </div>

              {/* Center Progress (Mobile only) */}
              <div className="flex-1 sm:hidden h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200" role="progressbar" aria-valuenow={xp % 100} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress level: ${xp % 100} dari 100 XP`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((xp % 100 / 100) * 100, 100)}%` }}
                  className="h-full bg-brand-primary shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.1)]"
                />
              </div>

              {/* Right Section: Stats Hub */}
              <div className="flex items-center gap-2.5 sm:gap-4" aria-label="Statistik belajar">
                <div className="flex items-center gap-1 text-brand-error font-black px-1" aria-label={`Nyawa: ${hearts}`}>
                  <Heart className={`w-3.5 h-3.5 md:w-4 md:h-4 fill-current ${hearts <= 1 ? 'animate-pulse' : ''}`} aria-hidden="true" />
                  <span className="text-[11px] md:text-sm">{hearts}</span>
                </div>
                
                <div className="flex items-center gap-1 text-brand-accent font-black px-1" aria-label={`Streak: ${streak}`}>
                  <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" aria-hidden="true" />
                  <span className="text-[11px] md:text-sm">{streak}</span>
                </div>
                
                <div className="hidden xs:flex items-center gap-1 text-slate-400 font-black px-1" aria-label={`Total XP: ${xp}`}>
                  <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" aria-hidden="true" />
                  <span className="text-[11px] md:text-sm">{xp}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Message Area */}
          <main 
            id="chat-messages"
            ref={scrollRef}
            className="flex-grow overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 lg:py-8 scroll-smooth bg-white lg:bg-white/50"
            role="main"
            aria-label="Area pesan chat"
          >
            <div className="w-full max-w-2xl mx-auto h-full">
              {messages.length === 0 ? (
                <WelcomeScreen onSelectSuggestion={handleSendMessage} />
              ) : (
                <div className="space-y-4 md:space-y-6" aria-live="polite" aria-label="Daftar pesan chat">
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
                  className="flex justify-start items-center gap-3 mt-4 mb-6"
                  aria-label="AI sedang berpikir"
                  role="status"
                >
                  <div className="ai-bubble p-3 px-5 flex items-center gap-3">
                    <div className="flex gap-1">
                      <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-brand-primary" aria-hidden="true" />
                      <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-brand-primary" aria-hidden="true" />
                      <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-brand-primary" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold text-slate-500">Nalar.ai sedang berpikir...</span>
                  </div>
                </motion.div>
              )}
            </div>
          </main>

          {/* Input Area */}
          <footer 
            className="flex-shrink-0 bg-white border-t border-slate-100 p-3 md:p-4 lg:p-6 z-10 transition-all"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
            role="contentinfo"
            aria-label="Area input pesan"
          >
            <div className="max-w-2xl mx-auto w-full">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <label htmlFor="chat-input" className="sr-only">Ketik pesan</label>
                  <textarea
                    id="chat-input"
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
                    className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-2.5 md:py-3 focus:ring-0 focus:bg-white focus:border-brand-primary transition-all resize-none min-h-[44px] md:min-h-[48px] max-h-32 text-[15px] md:text-base font-bold text-slate-800 placeholder:text-slate-400"
                    rows={1}
                    aria-label="Ketik pesan"
                    disabled={isLoading}
                  />
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleSendMessage(input)}
                      disabled={!input.trim() || isLoading}
                      aria-label="Kirim pesan"
                      type="submit"
                      className={`btn-tactile w-[44px] h-[44px] md:w-[48px] md:h-[48px] rounded-2xl flex items-center justify-center transition-all
                        ${input.trim() && !isLoading 
                          ? 'bg-brand-primary border-green-600 text-white shadow-[0_3px_0_0_rgb(22,163,74)]' 
                          : 'bg-slate-200 border-slate-300 text-slate-400 shadow-[0_3px_0_0_rgb(148,163,184)]'
                        }`}
                    >
                      <Send className="w-5 h-5" aria-hidden="true" />
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
