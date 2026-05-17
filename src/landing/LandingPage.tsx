import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Handshake,
  Building2,
  Star,
  Quote,
  ChevronLeft,
  ChevronRight,
  Github,
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

/* ─── Testimonial Data ─────────────────────────────────────────── */

const TESTIMONIALS = [
  {
    name: 'Alya Rahmawati',
    role: 'Siswi SMA Kelas 11',
    avatar: 'AR',
    color: 'bg-pink-100 text-pink-700',
    rating: 5,
    quote: 'Nalar.ai bener-bener bikin aku lebih kritis! Dulu cuma hafalan doang, sekarang aku paham konsepnya. Quiz interaktifnya seru banget, kayak main game tapi belajar.',
  },
  {
    name: 'Dimas Prasetyo',
    role: 'Mahasiswa Teknik',
    avatar: 'DP',
    color: 'bg-blue-100 text-blue-700',
    rating: 5,
    quote: 'Metode sokratiknya bikin mikir keras. Awalnya agak challenging, tapi lama-lama nagih! XP dan streak-nya bikin semangat belajar tiap hari.',
  },
  {
    name: 'Siti Nurhaliza',
    role: 'Guru Biologi SMP',
    avatar: 'SN',
    color: 'bg-emerald-100 text-emerald-700',
    rating: 5,
    quote: 'Saya rekomendasikan ke murid-murid saya. Nalar.ai melatih mereka berpikir mandiri, bukan sekadar menerima jawaban. Fitur gap-fill sangat membantu!',
  },
  {
    name: 'Rizky Fadhillah',
    role: 'Siswa SMK Kelas 12',
    avatar: 'RF',
    color: 'bg-purple-100 text-purple-700',
    rating: 4,
    quote: 'Belajar pemrograman jadi lebih mudah. AI-nya nggak kasih jawaban langsung, tapi nuntun step by step. Berasa punya tutor pribadi 24/7!',
  },
  {
    name: 'Nadia Putri',
    role: 'Mahasiswi Ekonomi',
    avatar: 'NP',
    color: 'bg-amber-100 text-amber-700',
    rating: 5,
    quote: 'Gamification-nya bikin ketagihan! Kumpulin XP, jaga streak, sampe dapet sertifikat. Rasanya kayak punya personal coach yang sabar banget.',
  },
  {
    name: 'Budi Santoso',
    role: 'Siswa SMA Kelas 10',
    avatar: 'BS',
    color: 'bg-rose-100 text-rose-700',
    rating: 5,
    quote: 'Awalnya takut belajar sains, tapi Nalar.ai bikin semuanya jadi masuk akal. Analogi-analoginya keren, gampang dipahami. Recommended banget!',
  },
];

/* ─── Testimonial Carousel Component ───────────────────────────── */

function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const perPage = { mobile: 1, tablet: 2, desktop: 3 };
  const [slidesPerView, setSlidesPerView] = useState(perPage.desktop);

  useEffect(() => {
    const updateSlides = () => {
      const w = window.innerWidth;
      if (w < 640) setSlidesPerView(perPage.mobile);
      else if (w < 1024) setSlidesPerView(perPage.tablet);
      else setSlidesPerView(perPage.desktop);
    };
    updateSlides();
    window.addEventListener('resize', updateSlides);
    return () => window.removeEventListener('resize', updateSlides);
  }, []);

  const maxIndex = TESTIMONIALS.length - slidesPerView;

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrent(prev => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrent(prev => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  // Auto-scroll every 4s
  useEffect(() => {
    const timer = setInterval(goNext, 15000);
    return () => clearInterval(timer);
  }, [goNext]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="relative">
      {/* Carousel */}
      <div className="overflow-hidden">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {TESTIMONIALS.slice(current, current + slidesPerView).map((t, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-100 rounded-2xl p-5 sm:p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Quote icon */}
              <Quote className="w-5 h-5 text-slate-300 mb-3" aria-hidden="true" />
              {/* Stars */}
              <div className="flex gap-0.5 mb-3" aria-label={`Rating ${t.rating} dari 5`}>
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star
                    key={si}
                    className={`w-3.5 h-3.5 ${si < t.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              {/* Quote text */}
              <p className="text-sm text-slate-600 font-medium leading-relaxed flex-1 mb-4">
                "{t.quote}"
              </p>
              {/* User info */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <div className={`w-9 h-9 rounded-xl ${t.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-xs font-black">{t.avatar}</span>
                </div>
                <div>
                  <div className="text-sm font-black text-slate-800 leading-tight">{t.name}</div>
                  <div className="text-[11px] font-bold text-slate-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          onClick={goPrev}
          className="w-10 h-10 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
          aria-label="Testimoni sebelumnya"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" aria-hidden="true" />
        </button>
        {/* Dots */}
        <div className="flex gap-1.5 mx-2" aria-hidden="true">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-brand-primary w-5' : 'bg-slate-300 hover:bg-slate-400'}`}
              aria-label={`Halaman testimoni ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={goNext}
          className="w-10 h-10 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
          aria-label="Testimoni selanjutnya"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" aria-hidden="true" />
        </button>
      </div>

      {/* CTA: Review Nalar.ai */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: '-30px' }}
        className="text-center mt-8 sm:mt-10"
      >
        <a
          href="https://forms.gle/wxU5Geh9TUM8hVQK7"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-tactile inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl border-b-[4px] border-blue-700 hover:bg-blue-500 active:bg-blue-600 active:top-[2px] transition-all text-sm sm:text-base shadow-lg"
          aria-label="Review Nalar.ai sekarang (buka di tab baru)"
        >
          <Star className="w-4 h-4 fill-white" aria-hidden="true" />
          Review Nalar.ai Sekarang
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </a>
        <p className="text-xs text-slate-400 font-medium mt-2">
          Bantu kami jadi lebih baik dengan memberikan ulasanmu!
        </p>
      </motion.div>
    </div>
  );
}

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
              <img src="/nalarailogo.jpg" alt="Nalar.ai Logo" className="w-9 h-9 rounded-xl object-cover shadow-[0_3px_0_0_rgb(22,163,74)] border-2 border-white group-hover:scale-105 transition-transform" />
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
          className="relative pt-6 sm:pt-8 lg:pt-10 pb-8 sm:pb-10 lg:pb-12 overflow-hidden"
          aria-label="Hero"
        >
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-green-50/30 pointer-events-none" aria-hidden="true" />
          {/* Subtle decorative blobs */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-primary/3 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-brand-secondary/3 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 sm:gap-8 lg:gap-12">
              
              {/* ─── Left: Text Content ──────────────────────────── */}
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex-1 text-center lg:text-left"
              >
                {/* Brand badge */}
                <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 mb-5 sm:mb-6 shadow-sm">
                  <img src="/nalarailogo.jpg" alt="Nalar.ai Logo" className="w-5 h-5 rounded-lg object-cover" />
                  <span className="text-xs font-bold text-slate-500 tracking-wide">Eksperimen Belajar Aktif</span>
                </div>

                {/* Heading */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-800 mb-2 sm:mb-3 leading-[1.08]">
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
                <p className="text-sm sm:text-base text-slate-500 font-medium mb-4 sm:mb-6 max-w-md lg:max-w-none leading-relaxed">
                  Tutor AI yang mendorong kamu <strong className="text-slate-700">berpikir kritis</strong> melalui metode sokratik — AI membimbing kamu menemukan jawaban sendiri, bukan memberikannya begitu saja.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 sm:gap-3 mb-4 sm:mb-5">
                  <a
                    href="/chat.html"
                    className="btn-tactile bg-brand-primary text-white font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl border-b-[4px] border-green-700 hover:bg-green-600 active:bg-green-700 active:top-[2px] transition-all text-sm sm:text-base flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center"
                    aria-label="Mulai belajar dengan Nalar.ai"
                  >
                    Mulai Sekarang — Gratis
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                  <a
                    href="#features"
                    className="btn-tactile bg-white text-slate-600 font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border-b-[4px] border-slate-200 hover:bg-slate-50 active:bg-slate-100 active:top-[2px] transition-all text-sm sm:text-sm border-2 border-slate-200 flex items-center gap-2 w-full sm:w-auto justify-center"
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
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64">
                  {/* Main card */}
                  <div className="absolute inset-0 bg-white rounded-[40px] shadow-xl border border-slate-100 flex items-center justify-center">
                    <img src="/nalarailogo.jpg" alt="Nalar.ai Logo" className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-[24px] sm:rounded-[28px] object-cover shadow-[0_5px_0_0_rgb(22,163,74)]" />
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

        {/* ─── Testimonials Section ──────────────────────────────────── */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white" aria-label="Testimoni pengguna Nalar.ai">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              className="text-center mb-8 sm:mb-10"
            >
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-4">
                <Star className="w-4 h-4 text-blue-600 fill-blue-600" aria-hidden="true" />
                <span className="text-xs font-bold text-blue-700 tracking-wide">Testimoni</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-800 mb-2 sm:mb-3">
                Apa Kata <span className="text-brand-primary">Mereka</span>?
              </h2>
              <p className="text-sm sm:text-base text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Pengalaman nyata pelajar yang telah menggunakan Nalar.ai untuk belajar aktif.
              </p>
            </motion.div>

            <TestimonialCarousel />
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
              <img src="/nalarailogo.jpg" alt="Nalar.ai Logo" className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl object-cover mb-5 sm:mb-6 shadow-[0_6px_0_0_rgb(22,163,74)] border-4 border-green-400 mx-auto" aria-hidden="true" />
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
        {/* ─── Partners Section ─────────────────────────────────────── */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white" aria-label="Partner dan kolaborasi">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              className="text-center mb-8 sm:mb-10"
            >
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 mb-4">
                <Handshake className="w-4 h-4 text-amber-600" aria-hidden="true" />
                <span className="text-xs font-bold text-amber-700 tracking-wide">Partnership</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-800 mb-2 sm:mb-3">
                Partner <span className="text-brand-primary">Kami</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Berkolaborasi bersama berbagai institusi dan organisasi untuk menghadirkan pembelajaran aktif terbaik.
              </p>
            </motion.div>

            {/* Empty partner slots */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-30px' }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 sm:mb-10"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-brand-primary/30 hover:bg-green-50/20 transition-colors min-h-[100px] sm:min-h-[120px]"
                >
                  <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 mb-2" aria-hidden="true" />
                  <span className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider text-center">
                    Partner
                  </span>
                </div>
              ))}
            </motion.div>

            {/* Become Partner CTA */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <a
                href="mailto:partnership@nalar-ai.web.id"
                className="btn-tactile inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl border-b-[4px] border-amber-600 hover:bg-amber-400 active:bg-amber-500 active:top-[2px] transition-all text-sm sm:text-base shadow-lg"
                aria-label="Jadi partner Nalar.ai"
              >
                <Handshake className="w-4 h-4" aria-hidden="true" />
                Jadi Partner
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <p className="text-xs text-slate-400 font-medium mt-3">
                Ingin berkolaborasi? Hubungi kami di{' '}
                <a href="mailto:partnership@nalar-ai.web.id" className="text-brand-primary font-bold hover:underline">
                  partnership@nalar-ai.web.id
                </a>
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-slate-50 border-t border-slate-100 py-6 sm:py-8" role="contentinfo">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <img src="/nalarailogo.jpg" alt="Nalar.ai Logo" className="w-6 h-6 rounded-lg object-cover shadow-[0_2px_0_0_rgb(22,163,74)] border border-white" aria-hidden="true" />
              <span className="text-sm font-black text-slate-800">
                Nalar<span className="text-brand-primary">.ai</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium text-center">
              Tutor AI untuk pembelajaran aktif & berpikir kritis
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Lmavour/NalarAI"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile inline-flex items-center gap-1.5 bg-slate-800 text-white font-bold px-3.5 py-1.5 rounded-xl border-b-[3px] border-slate-900 hover:bg-slate-700 active:bg-slate-800 active:top-[1px] transition-all text-xs shadow-md"
                aria-label="Kontribusi di GitHub (buka di tab baru)"
              >
                <Github className="w-3.5 h-3.5" aria-hidden="true" />
                Contribute
              </a>
              <p className="text-xs text-slate-400 font-medium">
                © {new Date().getFullYear()} Nalar.ai
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}