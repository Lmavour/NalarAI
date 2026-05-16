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
    icon: <BrainCircuit className="w-5 h-5" />,
    title: 'Belajar Aktif',
    description: 'AI membimbing kamu menemukan jawaban sendiri melalui pertanyaan sokratik — bukan sekadar memberi jawaban langsung.',
    color: 'bg-purple-100 text-purple-700',
    border: 'border-purple-200',
    shadow: 'shadow-[0_4px_0_0_rgba(168,85,247,0.3)]',
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: 'Tantangan Interaktif',
    description: 'Quiz, gap-fill, dan paraphrase yang menantang pemahamanmu setelah setiap topik dibahas.',
    color: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    shadow: 'shadow-[0_4px_0_0_rgba(59,130,246,0.3)]',
  },
  {
    icon: <Flame className="w-5 h-5" />,
    title: 'Progress & Gamification',
    description: 'Kumpulkan XP, jaga streak, dan kelola nyawa — belajar jadi seru seperti bermain game!',
    color: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
    shadow: 'shadow-[0_4px_0_0_rgba(245,158,11,0.3)]',
  },
  {
    icon: <Award className="w-5 h-5" />,
    title: 'Sertifikat Pembelajaran',
    description: 'Raih sertifikat sebagai bukti kemajuan belajar kamu — motivasi nyata untuk terus berkembang.',
    color: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
    shadow: 'shadow-[0_4px_0_0_rgba(16,185,129,0.3)]',
  },
];

const STEPS = [
  {
    icon: <MessageCircle className="w-7 h-7" />,
    title: 'Tanyakan Apa Saja',
    description: 'Ketik pertanyaan atau topik yang ingin kamu pelajari — dari sains hingga sejarah.',
    step: '1',
  },
  {
    icon: <BrainCircuit className="w-7 h-7" />,
    title: 'AI Bimbing Kamu',
    description: 'Nalar.ai memandu kamu berpikir kritis dengan pertanyaan sokratik, analogi, dan eksplorasi.',
    step: '2',
  },
  {
    icon: <Trophy className="w-7 h-7" />,
    title: 'Selesaikan Tantangan',
    description: 'Quiz, gap-fill, dan paraphrase menguji pemahamanmu — kumpulkan XP dan raih sertifikat!',
    step: '3',
  },
];

const SUBJECTS = [
  { icon: <BookOpen className="w-4 h-4" />, text: 'Sains & Matematika', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { icon: <GraduationCap className="w-4 h-4" />, text: 'Sejarah & Bahasa', color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { icon: <Zap className="w-4 h-4" />, text: 'Logika & Pemrograman', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { icon: <Heart className="w-4 h-4" />, text: 'Ekonomi & Sosial', color: 'bg-amber-50 text-amber-600 border-amber-200' },
];

/* ─── Landing Page Component ────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Skip to main content - accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-brand-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:font-bold focus:text-sm"
      >
        Langsung ke konten utama
      </a>

      {/* ─── Navigation ──────────────────────────────────────────── */}
      <header>
        <nav
          className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100"
          role="navigation"
          aria-label="Navigasi utama"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group" aria-label="Nalar.ai — Halaman utama">
              <div className="w-9 h-9 bg-brand-primary rounded-xl flex items-center justify-center shadow-[0_3px_0_0_rgb(22,163,74)] border-2 border-white group-hover:scale-105 transition-transform">
                <Sparkles className="w-4.5 h-4.5 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-800">
                Nalar<span className="text-brand-primary">.ai</span>
              </span>
            </a>
            <a
              href="/chat.html"
              className="btn-tactile bg-brand-primary text-white font-bold px-5 py-2.5 rounded-xl border-b-[3px] border-green-700 hover:bg-green-600 active:bg-green-700 transition-colors text-sm flex items-center gap-2"
              aria-label="Mulai chat dengan tutor AI"
            >
              Mulai Sekarang
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </nav>
      </header>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <main id="main-content">
        {/* ─── Hero Section ────────────────────────────────────────── */}
        <section
          className="relative pt-8 sm:pt-12 lg:pt-16 pb-10 sm:pb-14 lg:pb-16 overflow-hidden"
          aria-label="Hero"
        >
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-green-50/30 pointer-events-none" aria-hidden="true" />
          {/* Subtle decorative blobs */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-primary/3 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-brand-secondary/3 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 sm:gap-10 lg:gap-16">
              
              {/* ─── Left: Text Content ──────────────────────────── */}
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex-1 text-center lg:text-left"
              >
                {/* Brand badge */}
                <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 mb-5 sm:mb-6 shadow-sm">
                  <div className="w-5 h-5 bg-brand-primary rounded-lg flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 tracking-wide">Eksperimen Belajar Aktif</span>
                </div>

                {/* Heading */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-800 mb-3 sm:mb-4 leading-[1.05]">
                  Belajar dengan{' '}
                  <span className="text-brand-primary">Nalar</span>
                  <br />
                  bukan sekadar{' '}
                  <span className="relative inline-block">
                    menghafal
                    <svg className="absolute -bottom-1 left-0 w-full h-2 sm:h-3 text-brand-accent" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="#FFC800" strokeWidth="6" strokeLinecap="round" />
                    </svg>
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-500 font-medium mb-6 sm:mb-8 max-w-md lg:max-w-none leading-relaxed">
                  Tutor AI yang mendorong kamu <strong className="text-slate-700">berpikir kritis</strong> melalui metode sokratik — AI membimbing kamu menemukan jawaban sendiri, bukan memberikannya begitu saja.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center lg:items-start gap-2.5 sm:gap-3 mb-6 sm:mb-8">
                  <a
                    href="/chat.html"
                    className="btn-tactile bg-brand-primary text-white font-bold px-6 sm:px-7 py-2.5 sm:py-3 rounded-2xl border-b-[4px] border-green-700 hover:bg-green-600 active:bg-green-700 active:top-[2px] transition-all text-base sm:text-lg flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center"
                    aria-label="Mulai belajar dengan Nalar.ai"
                  >
                    Mulai Sekarang — Gratis
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </a>
                  <a
                    href="#features"
                    className="btn-tactile bg-white text-slate-600 font-bold px-5 sm:px-6 py-2 sm:py-2.5 rounded-2xl border-b-[4px] border-slate-200 hover:bg-slate-50 active:bg-slate-100 active:top-[2px] transition-all text-sm sm:text-base border-2 border-slate-200 flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    Pelajari Lebih Lanjut
                  </a>
                </div>

                {/* Subject Tags */}
                <div
                  className="flex flex-wrap justify-center lg:justify-start gap-2"
                  aria-label="Mata pelajaran yang tersedia"
                  role="list"
                >
                  {SUBJECTS.map((s, i) => (
                    <div
                      key={i}
                      className={`${s.color} border rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-bold`}
                      role="listitem"
                    >
                      {s.icon}
                      {s.text}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ─── Right: Visual Illustration ──────────────────── */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="flex-1 flex items-center justify-center"
                aria-hidden="true"
              >
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72">
                  {/* Main card */}
                  <div className="absolute inset-0 bg-white rounded-[40px] shadow-xl border border-slate-100 flex items-center justify-center">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-brand-primary rounded-[28px] sm:rounded-[32px] flex items-center justify-center shadow-[0_6px_0_0_rgb(22,163,74)]">
                      <Sparkles className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-white" />
                    </div>
                  </div>
                  {/* Floating card 1 — Quiz */}
                  <motion.div
                    animate={{ y: [-4, 4, -4] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-white rounded-2xl shadow-lg border border-slate-100 px-3 py-2 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Target className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-800 leading-none">Quiz</div>
                      <div className="text-[8px] font-bold text-slate-400 leading-none">Interaktif</div>
                    </div>
                  </motion.div>
                  {/* Floating card 2 — XP */}
                  <motion.div
                    animate={{ y: [3, -3, 3] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -bottom-3 -left-3 sm:-bottom-4 sm:-left-4 bg-white rounded-2xl shadow-lg border border-slate-100 px-3 py-2 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-800 leading-none">+15 XP</div>
                      <div className="text-[8px] font-bold text-slate-400 leading-none">Per tantangan</div>
                    </div>
                  </motion.div>
                  {/* Floating card 3 — Socratic */}
                  <motion.div
                    animate={{ y: [-3, 3, -3] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-1/2 -right-6 sm:-right-8 -translate-y-1/2 bg-white rounded-2xl shadow-lg border border-slate-100 px-3 py-2 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BrainCircuit className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-800 leading-none">Sokratik</div>
                      <div className="text-[8px] font-bold text-slate-400 leading-none">Metode</div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ─── Features Section ────────────────────────────────────── */}
        <section id="features" className="py-12 sm:py-16 lg:py-20 bg-slate-50/50" aria-label="Fitur utama Nalar.ai">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="fluid-text-section font-black tracking-tight text-slate-800 mb-2 sm:mb-3">
                Kenapa <span className="text-brand-primary">Nalar.ai</span>?
              </h2>
              <p className="fluid-text-body text-slate-500 font-medium max-w-md mx-auto">
                Belajar yang benar bukan menerima jawaban — tapi menemukan sendiri jalan pikirnya.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ delay: i * 0.1 }}
                  className={`card-tactile ${f.border} p-5 sm:p-6 ${f.shadow}`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${f.color} flex items-center justify-center mb-3 sm:mb-4`} aria-hidden="true">
                    {React.cloneElement(f.icon as React.ReactElement<any>, { className: 'w-5 h-5 sm:w-6 sm:h-6' })}
                  </div>
                  <h3 className="fluid-text-card-title font-black text-slate-800 mb-1.5 sm:mb-2 tracking-tight">
                    {f.title}
                  </h3>
                  <p className="fluid-text-body text-slate-500 font-medium leading-relaxed">
                    {f.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works Section ────────────────────────────────── */}
        <section id="how-it-works" className="py-12 sm:py-16 lg:py-20" aria-label="Cara kerja Nalar.ai">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="fluid-text-section font-black tracking-tight text-slate-800 mb-2 sm:mb-3">
                Cara Kerja <span className="text-brand-primary">Nalar.ai</span>
              </h2>
              <p className="fluid-text-body text-slate-500 font-medium max-w-md mx-auto">
                Tiga langkah simpel untuk mulai belajar aktif.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
              {/* Connector line (desktop only) */}
              <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent rounded-full" aria-hidden="true" />

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
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white font-black text-base sm:text-lg shadow-[0_4px_0_0_rgb(22,163,74)] border-2 border-white mb-3 sm:mb-4 relative z-10" aria-label={`Langkah ${s.step}`}>
                    {s.step}
                  </div>
                  {/* Icon */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-3 sm:mb-4 border-2 border-slate-100" aria-hidden="true">
                    {React.cloneElement(s.icon as React.ReactElement<any>, { className: 'w-7 h-7 sm:w-8 sm:h-8 text-brand-primary' })}
                  </div>
                  <h3 className="fluid-text-card-title font-black text-slate-800 mb-1.5 tracking-tight">
                    {s.title}
                  </h3>
                  <p className="fluid-text-body text-slate-500 font-medium leading-relaxed max-w-xs">
                    {s.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Demo Preview Section ────────────────────────────────── */}
        <section className="py-12 sm:py-16 lg:py-20 bg-slate-50/50" aria-label="Contoh dialog Nalar.ai">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="fluid-text-section font-black tracking-tight text-slate-800 mb-2 sm:mb-3">
                Lihat Nalar.ai <span className="text-brand-primary">Bekerja</span>
              </h2>
              <p className="fluid-text-body text-slate-500 font-medium max-w-md mx-auto">
                Contoh dialog bagaimana Nalar.ai membimbing siswa memahami fotosintesis.
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-30px' }}
              className="max-w-xl mx-auto space-y-3 sm:space-y-4"
              role="region"
              aria-label="Contoh percakapan"
            >
              {/* User message */}
              <div className="flex justify-end">
                <div className="user-bubble px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm font-bold text-white">Jelaskan tentang fotosintesis</p>
                </div>
              </div>
              {/* AI response */}
              <div className="flex justify-start">
                <div className="ai-bubble px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">
                    Oke, sebelum kita bahas langsung — coba pikirkan: <strong>tumbuhan bisa hidup tanpa makan seperti manusia, tapi mereka tetap butuh energi. Dari mana mereka mendapatkan energi itu?</strong> 🤔
                  </p>
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Quiz interaktif tersedia setelah jawaban
                  </div>
                </div>
              </div>
              {/* User follow-up */}
              <div className="flex justify-end">
                <div className="user-bubble px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm font-bold text-white">Dari sinar matahari?</p>
                </div>
              </div>
              {/* AI follow-up */}
              <div className="flex justify-start">
                <div className="ai-bubble px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">
                    Benar! 🌞 Tapi sinar matahari saja tidak cukup — tumbuhan juga butuh <strong>bahan baku</strong> untuk mengubah energi cahaya menjadi energi kimia. Bayangkan kamu mau memasak, kamu butuh bukan hanya kompor (energi), tapi juga bahan makanan. Apa "bahan makanan" tumbuhan itu?
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── Final CTA Section ───────────────────────────────────── */}
        <section className="py-12 sm:py-16 lg:py-20 relative overflow-hidden" aria-label="Mulai belajar">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-green-600" aria-hidden="true" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-20 -right-20 w-[250px] h-[250px] border-[30px] border-white/10 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
              className="absolute -bottom-20 -left-20 w-[200px] h-[200px] border-[24px] border-white/10 rounded-full"
            />
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-50px' }}
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-3xl flex items-center justify-center mb-5 sm:mb-6 shadow-[0_6px_0_0_rgb(22,163,74)] border-4 border-green-400 mx-auto" aria-hidden="true">
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-brand-primary" />
              </div>
              <h2 className="fluid-text-cta font-black tracking-tight text-white mb-3 sm:mb-4">
                Mulai Belajar Sekarang
              </h2>
              <p className="fluid-text-body text-white/80 font-semibold mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed">
                Gratis. Tanpa registrasi. Langsung chat dengan AI tutor yang membimbing kamu berpikir.
              </p>
              <a
                href="/chat.html"
                className="btn-tactile bg-white text-brand-primary font-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl border-b-[4px] border-slate-200 hover:bg-slate-50 active:bg-slate-100 active:top-[2px] transition-all text-base sm:text-lg inline-flex items-center gap-2 shadow-lg"
                aria-label="Chat dengan tutor AI Nalar.ai"
              >
                Chat dengan Nalar.ai
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </a>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-slate-50 border-t border-slate-100 py-6 sm:py-8" role="contentinfo">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-brand-primary rounded-lg flex items-center justify-center shadow-[0_2px_0_0_rgb(22,163,74)] border border-white" aria-hidden="true">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-black text-slate-800">
                Nalar<span className="text-brand-primary">.ai</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium text-center">
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