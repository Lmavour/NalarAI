import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  BrainCircuit,
  Target,
  Trophy,
  Heart,
  Flame,
  BookOpen,
  MessageCircle,
  Award,
  ArrowRight,
  CheckCircle2,
  Zap,
  GraduationCap,
} from 'lucide-react';

/* ─── Feature Data ──────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: <BrainCircuit className="w-6 h-6" />,
    title: 'Belajar Aktif',
    description: 'AI membimbing kamu menemukan jawaban sendiri melalui pertanyaan sokratik — bukan sekadar memberi jawaban langsung.',
    color: 'bg-purple-100 text-purple-700',
    border: 'border-purple-200',
    shadow: 'shadow-[0_4px_0_0_rgba(168,85,247,0.3)]',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Tantangan Interaktif',
    description: 'Quiz, gap-fill, dan paraphrase yang menantang pemahamanmu setelah setiap topik dibahas.',
    color: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    shadow: 'shadow-[0_4px_0_0_rgba(59,130,246,0.3)]',
  },
  {
    icon: <Flame className="w-6 h-6" />,
    title: 'Progress & Gamification',
    description: 'Kumpulkan XP, jaga streak, dan kelola nyawa — belajar jadi seru seperti bermain game!',
    color: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
    shadow: 'shadow-[0_4px_0_0_rgba(245,158,11,0.3)]',
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: 'Sertifikat Pembelajaran',
    description: 'Raih sertifikat sebagai bukti kemajuan belajar kamu — motivasi nyata untuk terus berkembang.',
    color: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
    shadow: 'shadow-[0_4px_0_0_rgba(16,185,129,0.3)]',
  },
];

const STEPS = [
  {
    icon: <MessageCircle className="w-8 h-8" />,
    title: 'Tanyakan Apa Saja',
    description: 'Ketik pertanyaan atau topik yang ingin kamu pelajari — dari sains hingga sejarah.',
    step: '1',
  },
  {
    icon: <BrainCircuit className="w-8 h-8" />,
    title: 'AI Bimbing Kamu',
    description: 'Nalar.ai memandu kamu berpikir kritis dengan pertanyaan sokratik, analogi, dan eksplorasi.',
    step: '2',
  },
  {
    icon: <Trophy className="w-8 h-8" />,
    title: 'Selesaikan Tantangan',
    description: 'Quiz, gap-fill, dan paraphrase menguji pemahamanmu — kumpulkan XP dan raih sertifikat!',
    step: '3',
  },
];

const SUBJECTS = [
  { icon: <BookOpen className="w-5 h-5" />, text: 'Sains & Matematika', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { icon: <GraduationCap className="w-5 h-5" />, text: 'Sejarah & Bahasa', color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { icon: <Zap className="w-5 h-5" />, text: 'Logika & Pemrograman', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { icon: <Heart className="w-5 h-5" />, text: 'Ekonomi & Sosial', color: 'bg-amber-50 text-amber-600 border-amber-200' },
];

/* ─── Landing Page Component ────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ─── Navigation ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_3px_0_0_rgb(22,163,74)] border-2 border-white group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-800">
              Nalar<span className="text-brand-primary">.ai</span>
            </span>
          </a>
          <a
            href="/chat.html"
            className="btn-tactile bg-brand-primary text-white font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl border-b-[3px] border-green-700 hover:bg-green-600 active:bg-green-700 transition-colors text-sm sm:text-base flex items-center gap-2"
          >
            Mulai Sekarang
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ─── Hero Section ────────────────────────────────────────── */}
      <section className="relative pt-12 sm:pt-20 lg:pt-28 pb-16 sm:pb-24 lg:pb-32">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-brand-secondary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-accent/3 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col items-center text-center">
            {/* Animated Logo */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 bg-brand-primary rounded-[32px] sm:rounded-[40px] flex items-center justify-center mb-8 sm:mb-12 shadow-[0_8px_0_0_rgb(22,163,74)] border-4 border-white relative"
            >
              <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 lg:w-18 lg:h-18 text-white" />
              {/* Floating particles */}
              <motion.div
                animate={{ y: [-8, 8, -8], x: [-4, 4, -4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-3 -right-3 w-6 h-6 bg-brand-accent rounded-full border-2 border-white shadow-lg"
              />
              <motion.div
                animate={{ y: [6, -6, 6], x: [4, -4, 4] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-2 -left-2 w-5 h-5 bg-brand-secondary rounded-full border-2 border-white shadow-lg"
              />
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-slate-800 mb-3 sm:mb-4">
                Nalar<span className="text-brand-primary">.ai</span>
              </h1>
              <p className="text-xs sm:text-sm lg:text-base font-bold text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.25em] mb-6 sm:mb-8">
                Eksperimen Belajar Aktif
              </p>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-lg sm:text-xl lg:text-2xl text-slate-600 font-semibold mb-8 sm:mb-12 max-w-xl sm:max-w-2xl leading-relaxed"
            >
              Tutor AI yang mendorong kamu <span className="text-brand-primary font-bold">berpikir kritis</span> — bukan sekadar menerima jawaban.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
            >
              <a
                href="/chat.html"
                className="btn-tactile bg-brand-primary text-white font-bold px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl border-b-[4px] border-green-700 hover:bg-green-600 active:bg-green-700 active:top-[2px] transition-all text-lg sm:text-xl flex items-center gap-3 shadow-lg"
              >
                Mulai Sekarang
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </a>
              <a
                href="#features"
                className="btn-tactile bg-white text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl border-b-[4px] border-slate-200 hover:bg-slate-50 active:bg-slate-100 active:top-[2px] transition-all text-base sm:text-lg border-2 border-slate-200 flex items-center gap-2"
              >
                Pelajari Lebih Lanjut
              </a>
            </motion.div>

            {/* Subject Tags */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-10 sm:mt-14 max-w-lg sm:max-w-2xl"
            >
              {SUBJECTS.map((s, i) => (
                <div
                  key={i}
                  className={`${s.color} border rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 text-xs sm:text-sm font-bold`}
                >
                  {s.icon}
                  {s.text}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Features Section ────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-800 mb-3 sm:mb-4">
              Kenapa <span className="text-brand-primary">Nalar.ai</span>?
            </h2>
            <p className="text-base sm:text-lg text-slate-500 font-medium max-w-xl mx-auto">
              Belajar yang benar bukan menerima jawaban — tapi menemukan sendiri jalan pikirnya.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 lg:gap-8">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.1 }}
                className={`card-tactile ${f.border} p-6 sm:p-7 lg:p-8 ${f.shadow}`}
              >
                <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${f.color} flex items-center justify-center mb-4 sm:mb-5`}>
                  {React.cloneElement(f.icon as React.ReactElement<any>, { className: 'w-6 h-6 sm:w-7 sm:h-7' })}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-2 sm:mb-3 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works Section ────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-800 mb-3 sm:mb-4">
              Cara Kerja <span className="text-brand-primary">Nalar.ai</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-500 font-medium max-w-xl mx-auto">
              Tiga langkah simpel untuk mulai belajar aktif.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent rounded-full" />

            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center text-center relative"
              >
                {/* Step number badge */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-primary rounded-2xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-[0_4px_0_0_rgb(22,163,74)] border-2 border-white mb-4 sm:mb-6 relative z-10">
                  {s.step}
                </div>
                {/* Icon */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 sm:mb-5 border-2 border-slate-100">
                  {React.cloneElement(s.icon as React.ReactElement<any>, { className: 'w-8 h-8 sm:w-10 sm:h-10 text-brand-primary' })}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-2 tracking-tight">
                  {s.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed max-w-xs">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Demo Preview Section ────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-800 mb-3 sm:mb-4">
              Lihat Nalar.ai <span className="text-brand-primary">Bekerja</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-500 font-medium max-w-xl mx-auto">
              Contoh dialog bagaimana Nalar.ai membimbing siswa memahami fotosintesis.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-30px' }}
            className="max-w-2xl mx-auto space-y-4 sm:space-y-5"
          >
            {/* User message */}
            <div className="flex justify-end">
              <div className="user-bubble px-4 sm:px-5 py-3 sm:py-4 max-w-[85%]">
                <p className="text-sm sm:text-base font-bold text-white">Jelaskan tentang fotosintesis</p>
              </div>
            </div>
            {/* AI response */}
            <div className="flex justify-start">
              <div className="ai-bubble px-4 sm:px-5 py-3 sm:py-4 max-w-[85%]">
                <p className="text-sm sm:text-base font-medium text-slate-700 leading-relaxed">
                  Oke, sebelum kita bahas langsung — coba pikirkan: <strong>tumbuhan bisa hidup tanpa makan seperti manusia, tapi mereka tetap butuh energi. Dari mana mereka mendapatkan energi itu?</strong> 🤔
                </p>
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Quiz interaktif tersedia setelah jawaban
                </div>
              </div>
            </div>
            {/* User follow-up */}
            <div className="flex justify-end">
              <div className="user-bubble px-4 sm:px-5 py-3 sm:py-4 max-w-[85%]">
                <p className="text-sm sm:text-base font-bold text-white">Dari sinar matahari?</p>
              </div>
            </div>
            {/* AI follow-up */}
            <div className="flex justify-start">
              <div className="ai-bubble px-4 sm:px-5 py-3 sm:py-4 max-w-[85%]">
                <p className="text-sm sm:text-base font-medium text-slate-700 leading-relaxed">
                  Benar! 🌞 Tapi sinar matahari saja tidak cukup — tumbuhan juga butuh <strong>bahan baku</strong> untuk mengubah energi cahaya menjadi energi kimia. Bayangkan kamu mau memasak, kamu butuh bukan hanya kompor (energi), tapi juga bahan makanan. Apa "bahan makanan" tumbuhan itu?
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Final CTA Section ───────────────────────────────────── */}
      <section className="py-16 sm:py-24 lg:py-32 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-green-600" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-20 -right-20 w-[300px] h-[300px] border-[40px] border-white/10 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-20 -left-20 w-[250px] h-[250px] border-[30px] border-white/10 rounded-full"
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-50px' }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-3xl flex items-center justify-center mb-6 sm:mb-8 shadow-[0_6px_0_0_rgb(22,163,74)] border-4 border-green-400 mx-auto">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-brand-primary" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4 sm:mb-6">
              Mulai Belajar Sekarang
            </h2>
            <p className="text-lg sm:text-xl text-white/80 font-semibold mb-8 sm:mb-10 max-w-lg mx-auto leading-relaxed">
              Gratis. Tanpa registrasi. Langsung chat dengan AI tutor yang membimbing kamu berpikir.
            </p>
            <a
              href="/chat.html"
              className="btn-tactile bg-white text-brand-primary font-black px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl border-b-[4px] border-slate-200 hover:bg-slate-50 active:bg-slate-100 active:top-[2px] transition-all text-lg sm:text-xl inline-flex items-center gap-3 shadow-lg"
            >
              Chat dengan Nalar.ai
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-slate-50 border-t border-slate-100 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand-primary rounded-lg flex items-center justify-center shadow-[0_2px_0_0_rgb(22,163,74)] border border-white">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-black text-slate-800">
                Nalar<span className="text-brand-primary">.ai</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium text-center">
              Tutor AI untuk pembelajaran aktif & berpikir kritis
            </p>
            <p className="text-xs text-slate-400 font-medium">
              © {new Date().getFullYear()} Nalar.ai
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}