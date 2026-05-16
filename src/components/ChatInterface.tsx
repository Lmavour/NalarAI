import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trophy, Heart, Flame } from 'lucide-react';
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
  const [hearts, setHearts] = useState(5);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
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
    <div className="flex flex-col h-dvh bg-white font-sans w-full max-w-md mx-auto relative md:shadow-2xl overflow-hidden">
      {/* Header / Progress Bar */}
      <header className="flex-shrink-0 pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6 bg-white border-b border-slate-100 z-20">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
          <div 
            className="flex items-center gap-1 text-brand-error font-black min-h-[44px] px-1"
            aria-label={`Nyawa: ${hearts}`}
          >
            <Heart className={`w-5 h-5 fill-current ${hearts <= 1 ? 'animate-pulse' : ''}`} />
            <span className="text-sm">{hearts}</span>
          </div>
          
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((xp % 100 / 100) * 100, 100)}%` }}
              className="h-full bg-brand-primary shadow-[inset_0_-3px_0_0_rgba(0,0,0,0.1)] will-change-[width]"
            />
          </div>

          <div 
            className="flex items-center gap-1 text-brand-accent font-black min-h-[44px] px-1"
            aria-label={`Streak: ${streak}`}
          >
            <Flame className="w-5 h-5 fill-current" />
            <span className="text-sm">{streak}</span>
          </div>
          
          <div 
            className="flex items-center gap-1 text-slate-400 font-black min-h-[44px] px-1"
            aria-label={`Total XP: ${xp}`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-sm">{xp}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level {Math.floor(xp / 100) + 1}</span>
            <span className="text-xs font-black text-slate-800">
              {xp < 50 ? 'Nalar Rookie' : xp < 100 ? 'Nalar Apprentice' : 'Nalar Master'}
            </span>
          </div>
          <div className="text-[10px] font-black py-1 px-2 bg-slate-100 rounded-lg text-slate-500 uppercase tracking-tighter">
            Target: {xp % 100}/100 XP
          </div>
        </div>
      </header>

      {/* Message Area */}
      <main 
        ref={scrollRef}
        className="flex-grow overflow-y-auto px-4 py-6 scroll-smooth bg-white"
      >
        <div className="w-full">
          {messages.length === 0 ? (
            <WelcomeScreen onSelectSuggestion={handleSendMessage} />
          ) : (
            <div className="space-y-4">
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
        className="flex-shrink-0 bg-white border-t-2 border-slate-100 p-4 z-10 transition-all"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <div className="flex flex-col gap-3">
          <div className="relative">
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
              className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl px-5 py-4 pr-12 focus:ring-0 focus:bg-white focus:border-brand-primary transition-all resize-none min-h-[56px] max-h-32 text-base font-bold text-slate-800 placeholder:text-slate-400"
              rows={1}
              aria-label="Ketik pesan pesan"
            />
            <div className="absolute right-3 bottom-3">
              <button
                onClick={() => handleSendMessage(input)}
                disabled={!input.trim() || isLoading}
                aria-label="Kirim pesan"
                className={`btn-tactile w-10 h-10 rounded-xl flex items-center justify-center transition-all
                  ${input.trim() && !isLoading 
                    ? 'bg-brand-primary border-green-600 text-white shadow-[0_3px_0_0_rgb(22,163,74)]' 
                    : 'bg-slate-200 border-slate-300 text-slate-400 shadow-[0_3px_0_0_rgb(148,163,184)]'
                  }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </footer>
      {/* Certificate Modal */}
      <CertificateModal 
        isOpen={showCertificate} 
        xp={xp} 
        onClose={() => setShowCertificate(false)} 
      />
    </div>
  );
}
