import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  Flame,
  Gem,
  Heart,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  WandSparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { CharacterAvatar } from "@/components/character-avatar";
import { InstallAppButton } from "@/components/install-app-button";
import { LandingNavigation } from "@/components/landing-navigation";

const steps = [
  { number: "01", icon: Target, title: "Pilih tujuan", copy: "Tulis topik yang ingin kamu kuasai." },
  { number: "02", icon: BrainCircuit, title: "Ikuti jalurnya", copy: "AI menyusun materi dan kuis singkat." },
  { number: "03", icon: Trophy, title: "Buktikan progres", copy: "Jawab, raih XP, lalu buka level baru." },
] as const;

const learners = [
  { rank: 1, name: "Maya", xp: 2840, initials: "MY", color: "bg-[#E6F0FF] text-cobalt" },
  { rank: 2, name: "Raka", xp: 2710, initials: "RK", color: "bg-[#E7FAF5] text-[#087A5B]" },
  { rank: 3, name: "Kamu", xp: 2480, initials: "KM", color: "bg-[#FFF4D6] text-[#986000]", current: true },
  { rank: 4, name: "Nadia", xp: 2320, initials: "ND", color: "bg-[#F4EDFF] text-[#6D3FC0]" },
] as const;

function MiniStat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 shadow-[0_3px_10px_rgba(16,58,114,0.08)]" aria-label={`${label}: ${value}`}>
      {icon}
      <span className="truncate text-xs font-[950] text-ink">{value}</span>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[470px] lg:mr-0">
      <div className="absolute -inset-4 -z-10 rounded-[40px] bg-blue-100/65 blur-2xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-[28px] border border-blue-200 bg-white p-3.5 shadow-[0_24px_60px_rgba(16,58,114,0.18)] sm:rounded-[34px] sm:p-5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-[900] uppercase tracking-[0.16em] text-cobalt">Jalur aktif</p>
            <p className="mt-0.5 truncate text-base font-[950] text-ink sm:text-lg">Logika dasar</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <MiniStat icon={<Flame className="size-3.5 fill-[#FF8A3D] text-[#FF8A3D]" aria-hidden="true" />} value="12" label="Streak" />
            <MiniStat icon={<Heart className="size-3.5 fill-danger text-danger" aria-hidden="true" />} value="5" label="Hearts" />
          </div>
        </div>

        <div className="mt-3 rounded-[20px] border border-blue-100 bg-canvas p-3.5 sm:mt-4 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-[900] text-sapphire">Progres hari ini</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-[950] text-cobalt">2/5 level</span>
          </div>
          <div className="relative mt-4 grid grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-4 h-1 rounded-full bg-blue-100" aria-hidden="true"><div className="h-full w-1/2 rounded-full bg-cobalt" /></div>
            {[
              { label: "Dasar", state: "done" },
              { label: "Konsep", state: "active" },
              { label: "Latihan", state: "locked" },
            ].map((node) => (
              <div key={node.label} className="relative z-10 flex min-w-0 flex-col items-center text-center">
                <span className={`grid size-9 place-items-center rounded-full border-[3px] border-white text-white shadow-[0_3px_0_#0f52cc] ${node.state === "locked" ? "bg-[#DCE6F1] text-[#8190A4] shadow-[0_3px_0_#C2CDDA]" : "bg-cobalt"}`}>
                  {node.state === "done" ? <Check className="size-4 stroke-[3]" aria-hidden="true" /> : node.state === "active" ? <BrainCircuit className="size-4" aria-hidden="true" /> : <LockKeyhole className="size-3.5" aria-hidden="true" />}
                </span>
                <span className={`mt-2 truncate text-[10px] font-[900] sm:text-xs ${node.state === "locked" ? "text-muted" : "text-sapphire"}`}>{node.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex min-w-0 items-center gap-3 rounded-[18px] bg-cobalt p-3 text-white sm:mt-4 sm:p-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-white/15"><Sparkles className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-[850] uppercase tracking-[0.12em] text-blue-100">Berikutnya, 6 menit</p>
            <p className="truncate text-sm font-[950] sm:text-base">Hubungkan ide</p>
          </div>
          <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function FeatureCopy({ eyebrow, title, mobileTitle, titleId, description, mobileDescription, points }: { eyebrow: string; title: string; mobileTitle: string; titleId?: string; description: string; mobileDescription: string; points: string[] }) {
  return (
    <div className="min-w-0">
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={titleId} className="mt-3 max-w-xl text-2xl font-[950] leading-[1.06] tracking-[-0.04em] text-ink [text-wrap:balance] sm:mt-4 sm:text-4xl">
        <span className="sm:hidden">{mobileTitle}</span><span className="hidden sm:inline">{title}</span>
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-copy sm:mt-4 sm:text-base sm:leading-7">
        <span className="sm:hidden">{mobileDescription}</span><span className="hidden sm:inline">{description}</span>
      </p>
      <ul className="mt-5 grid gap-2.5">
        {points.map((point, index) => (
          <li key={point} className={`${index > 1 ? "hidden sm:flex" : "flex"} items-start gap-2.5 text-sm font-bold text-sapphire`}>
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#E7FAF5] text-success"><Check className="size-3.5 stroke-[3]" aria-hidden="true" /></span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div data-app-root className="min-h-screen bg-canvas">
      <a href="#main-content" className="sr-only z-[200] rounded-xl bg-cobalt px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:left-[max(16px,var(--safe-left))] focus:top-[max(16px,var(--safe-top))]">
        Lewati ke konten utama
      </a>

      <header className="sticky top-0 z-50 border-b border-blue-100/80 bg-canvas/90 pt-[var(--safe-top)] backdrop-blur-xl">
        <LandingNavigation />
      </header>

      <main id="main-content">
        <section data-section="hero" className="relative flex items-start overflow-hidden border-b border-blue-100 bg-canvas pb-7 pt-5 sm:py-10 lg:min-h-[calc(100svh_-_72px_-_var(--safe-top))] lg:items-center lg:py-12">
          <div className="dot-field pointer-events-none absolute inset-0 opacity-35 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" aria-hidden="true" />
          <div className="pointer-events-none absolute left-[7%] top-16 size-14 rotate-12 rounded-[20px] border border-blue-200 bg-white/60" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-12 right-[5%] size-9 rounded-full bg-[#C8F8ED]" aria-hidden="true" />

          <div className="page-shell relative grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-14">
            <div className="min-w-0 text-center lg:text-left">
              <span className="eyebrow"><WandSparkles className="size-4" aria-hidden="true" /> <span className="sm:hidden">Belajar dengan AI</span><span className="hidden sm:inline">Belajar aktif bersama AI</span></span>
              <h1 className="mx-auto mt-4 max-w-3xl text-[clamp(2.35rem,9.5vw,4.8rem)] font-[950] leading-[0.97] tracking-[-0.055em] text-ink [text-wrap:balance] lg:mx-0">
                Paham lebih dalam. <span className="text-cobalt">Naik level</span> setiap hari.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-6 text-copy sm:mt-5 sm:text-lg sm:leading-8 lg:mx-0">
                <span className="sm:hidden">Topikmu jadi level singkat dan kuis aktif.</span><span className="hidden sm:inline">Ubah topik pilihanmu menjadi level singkat, kuis aktif, dan progres yang selalu jelas.</span>
              </p>
              <div className="mx-auto mt-6 grid max-w-xl gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_auto] lg:mx-0 lg:max-w-none lg:justify-start">
                <Link href="/auth?mode=signup" className="button-primary min-h-14 px-5 text-base sm:px-7">
                  <span className="sm:hidden">Mulai belajar</span><span className="hidden sm:inline">Buat jalur belajarmu</span> <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
                <a href="#cara-kerja" className="button-secondary min-h-14 px-4 text-base sm:px-6"><span className="sm:hidden">Cara kerja</span><span className="hidden sm:inline">Lihat caranya</span></a>
              </div>
              <div className="mt-5 hidden flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold text-muted sm:flex lg:justify-start">
                <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" aria-hidden="true" /> Progres tersimpan aman</span>
                <span className="flex items-center gap-2"><Sparkles className="size-4 text-reward" aria-hidden="true" /> Materi sesuai topikmu</span>
              </div>
            </div>

            <HeroPreview />
          </div>
        </section>

        <section data-section="metrics" className="border-b border-line bg-white py-5 sm:py-6" aria-label="Keunggulan ringkas">
          <div className="page-shell grid grid-cols-4 divide-x divide-line text-center">
            {[
              ["5-8 menit", "tiap level"],
              ["AI aktif", "sesuai topik"],
              ["5 hearts", "jaga fokus"],
              ["1 liga", "tumbuh bersama"],
            ].map(([value, label]) => (
              <div key={value} className="min-w-0 px-1.5 sm:px-4">
                <p className="text-sm font-[950] text-sapphire sm:text-xl">{value}</p>
                <p className="mt-1 text-[9px] font-bold leading-tight text-muted sm:text-xs">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="cara-kerja" data-section="steps" className="py-14 sm:py-18 lg:py-20">
          <div className="page-shell">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">Satu loop yang cerdas</span>
              <h2 className="mt-3 text-2xl font-[950] leading-[1.08] tracking-[-0.04em] text-ink [text-wrap:balance] sm:mt-4 sm:text-4xl"><span className="sm:hidden">Tiga langkah untuk mulai</span><span className="hidden sm:inline">Dari penasaran menjadi benar-benar paham</span></h2>
              <p className="mx-auto mt-3 hidden max-w-xl text-[15px] leading-7 text-copy sm:block">Satu tujuan, langkah yang jelas, dan umpan balik cepat.</p>
            </div>

            <div className="relative mt-8 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-3 lg:gap-4">
              <div className="absolute left-[17%] right-[17%] top-9 hidden border-t-2 border-dashed border-blue-200 lg:block" aria-hidden="true" />
              {steps.map((step) => (
                <article key={step.number} className="relative grid min-w-0 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] border border-line bg-white p-4 shadow-[0_3px_0_#E0EAF4] lg:block lg:min-h-52 lg:p-6">
                  <span className="grid size-12 place-items-center rounded-[16px] bg-cobalt text-white shadow-[0_3px_0_#0f52cc] lg:size-14 lg:rounded-2xl">
                    <step.icon className="size-6 lg:size-7" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 lg:mt-6">
                    <h3 className="text-lg font-[950] tracking-tight text-ink lg:text-xl">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-copy lg:mt-2">{step.copy}</p>
                  </div>
                  <span className="self-start text-[10px] font-[950] tracking-[0.12em] text-blue-400 lg:absolute lg:right-6 lg:top-7">{step.number}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="fitur" data-section="lesson-feature" className="border-y border-blue-100 bg-white py-14 sm:py-18 lg:py-20" aria-labelledby="lesson-feature-title">
          <div className="page-shell grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <FeatureCopy
              eyebrow="Materi yang terasa ringan"
              title="Pelajaran kecil. Pemahaman yang melekat."
              mobileTitle="Satu konsep. Langsung paham."
              titleId="lesson-feature-title"
              description="Setiap level fokus pada satu ide penting, lalu langsung mengujinya saat konsep masih segar."
              mobileDescription="Materi ringkas, lalu langsung diuji."
              points={["Materi dibuat dari topik pilihanmu", "Bahasa singkat dan mudah dipindai", "Satu level selesai dalam hitungan menit"]}
            />

            <div className="relative mx-auto w-full max-w-lg rounded-[26px] border border-line bg-canvas p-3.5 shadow-soft sm:p-5">
              <div className="rounded-[20px] border border-blue-100 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-ice px-2.5 py-1 text-[10px] font-[900] text-cobalt">LEVEL 03</span>
                  <span className="text-xs font-[850] text-muted">6 menit</span>
                </div>
                <div className="mt-4 flex min-w-0 items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-cobalt text-white"><BrainCircuit className="size-5" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-[950] text-ink">Mengapa langit tampak biru?</h3>
                    <p className="mt-1.5 text-sm leading-6 text-copy">Atmosfer lebih mudah menyebarkan cahaya biru ke segala arah.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-blue-200 bg-ice p-3.5">
                  <p className="text-[10px] font-[900] uppercase tracking-wider text-cobalt">Inti konsep</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-sapphire"><span className="sm:hidden">Satu ide, satu analogi, lalu tes.</span><span className="hidden sm:inline">Satu ide utama, satu analogi, lalu satu tes pemahaman.</span></p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-sky"><div className="h-full w-3/5 rounded-full bg-cobalt" /></div>
              </div>
              <div className="absolute -bottom-5 right-2 rounded-[20px] border-4 border-white bg-ice p-1.5 shadow-float sm:-right-4"><CharacterAvatar character="gara" expression="thinking" size="md" className="size-12 sm:size-16" /></div>
            </div>
          </div>
        </section>

        <section data-section="feedback-feature" className="py-14 sm:py-18 lg:py-20" aria-labelledby="feedback-feature-title">
          <div className="page-shell grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
            <div className="mx-auto w-full max-w-lg rounded-[26px] border border-line bg-white p-4 shadow-soft sm:p-5 lg:order-1">
              <div className="flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-sky"><div className="h-full w-2/3 rounded-full bg-cobalt" /></div><span className="flex items-center gap-1 text-sm font-[950] text-danger"><Heart className="size-4 fill-danger" aria-hidden="true" /> 4</span></div>
              <p className="mt-5 text-center text-base font-[950] leading-snug text-ink sm:text-lg">Apa fungsi utama fotosintesis?</p>
              <div className="mt-4 grid gap-2 text-center text-xs font-bold sm:text-sm">
                <div className="rounded-xl border-2 border-line px-3 py-2.5 text-muted">Menyerap air dari tanah</div>
                <div className="rounded-xl border-2 border-cobalt bg-cobalt px-3 py-2.5 font-[900] text-white shadow-[0_3px_0_#0f52cc]">Mengubah cahaya menjadi energi kimia</div>
              </div>
              <div className="mt-3 rounded-xl border border-[#A8E8D3] bg-[#E7FAF5] p-3">
                <p className="text-sm font-[950] text-[#087A5B]">Tepat sekali</p>
                <p className="mt-0.5 text-xs leading-5 text-[#286B59]">Klorofil menyimpan energi cahaya di dalam glukosa.</p>
              </div>
            </div>

            <div className="lg:order-2">
              <FeatureCopy
                eyebrow="Umpan balik yang jujur"
                title="Salah bukan berhenti. Salah adalah petunjuk."
                mobileTitle="Salah? Langsung tahu alasannya."
                titleId="feedback-feature-title"
                description="Setiap jawaban menjelaskan apa yang benar dan konsep mana yang perlu dikunjungi lagi."
                mobileDescription="Setiap jawaban selalu disertai alasan."
                points={["Jawaban dikunci sebelum penjelasan muncul", "Alasan benar dan salah selalu terlihat", "Hearts menjaga fokus tanpa mempermalukan"]}
              />
            </div>
          </div>
        </section>

        <section id="liga" data-section="league" className="border-y border-blue-100 bg-[#F3F8FF] py-14 sm:py-18 lg:py-20">
          <div className="page-shell grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="min-w-0">
              <span className="eyebrow"><Users className="size-4" aria-hidden="true" /> Belajar bersama</span>
              <h2 className="mt-3 text-2xl font-[950] leading-[1.06] tracking-[-0.04em] text-ink [text-wrap:balance] sm:mt-4 sm:text-4xl"><span className="sm:hidden">Naik liga bersama.</span><span className="hidden sm:inline">Kompetisi kecil, dorongan yang besar.</span></h2>
              <p className="mt-3 text-sm leading-6 text-copy sm:mt-4 sm:text-[15px] sm:leading-7"><span className="sm:hidden">Kumpulkan XP dan naik bersama.</span><span className="hidden sm:inline">Rayakan konsistensi bersama pelajar lain, bukan siapa yang belajar paling lama.</span></p>
              <Link href="/auth?mode=signup" className="button-primary mt-6 min-h-12 px-5">Masuk liga <ChevronRight className="size-5" aria-hidden="true" /></Link>
            </div>

            <div className="min-w-0 rounded-[26px] border border-line bg-white p-4 shadow-float sm:p-6">
              <div className="flex min-w-0 items-center justify-between gap-3 border-b border-line pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-cobalt text-white shadow-[0_3px_0_#0f52cc]"><Gem className="size-5 fill-[#75D6FF]" aria-hidden="true" /></span>
                  <div className="min-w-0"><p className="text-[9px] font-[900] uppercase tracking-[0.13em] text-muted">Liga sekarang</p><h3 className="truncate text-lg font-[950] text-ink sm:text-xl">Sapphire League</h3></div>
                </div>
                <span className="shrink-0 rounded-full bg-[#E7FAF5] px-2.5 py-1 text-[10px] font-[900] text-[#087A5B]">Top 10 naik</span>
              </div>
              <div className="mt-3 grid gap-1.5">
                {learners.map((learner, index) => (
                  <div key={learner.name} className={`min-w-0 grid-cols-[20px_34px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2.5 py-2.5 ${index === 3 ? "hidden sm:grid" : "grid"} ${"current" in learner && learner.current ? "border-2 border-cobalt bg-ice" : "border border-transparent"}`}>
                    <span className={`text-center text-xs font-[950] ${learner.rank <= 3 ? "text-cobalt" : "text-muted"}`}>{learner.rank}</span>
                    <span className={`grid size-[34px] place-items-center rounded-xl text-[10px] font-[950] ${learner.color}`}>{learner.initials}</span>
                    <span className="min-w-0 truncate text-sm font-[900] text-ink">{learner.name}</span>
                    <span className="flex items-center gap-1 whitespace-nowrap text-xs font-[950] text-sapphire"><Zap className="size-3.5 fill-reward text-reward" aria-hidden="true" /> {learner.xp.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section data-section="cta" className="bg-cobalt py-10 text-white sm:py-12">
          <div className="page-shell grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="shrink-0 rounded-[22px] border-4 border-white/30 bg-white p-1.5 shadow-[0_5px_0_#0f52cc]"><CharacterAvatar character="gara" expression="excited" size="md" className="size-16" /></div>
              <div className="min-w-0">
                <p className="text-xs font-[900] uppercase tracking-[0.15em] text-blue-100">Giliranmu memulai</p>
                <h2 className="mt-1 text-2xl font-[950] leading-tight tracking-[-0.03em] sm:text-3xl">Selesaikan level pertamamu hari ini.</h2>
                <p className="mt-2 hidden text-sm leading-6 text-blue-100 sm:block">Pilih satu topik. NalarAI mengurus langkah berikutnya.</p>
              </div>
            </div>
            <div className="grid gap-2 min-[360px]:grid-cols-2 lg:grid-cols-1">
              <Link href="/auth?mode=signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 font-[950] text-cobalt shadow-[0_4px_0_#B9D6FF] transition hover:-translate-y-0.5">Mulai gratis <ArrowRight className="size-5" aria-hidden="true" /></Link>
              <InstallAppButton inverse className="min-h-12" />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0C294F] py-8 text-white sm:py-10">
        <div className="page-shell flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Brand inverse />
            <p className="mt-2 max-w-sm text-xs leading-5 text-blue-100">Tutor belajar aktif untuk pelajar Indonesia.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 text-xs font-bold text-blue-100">
            <Link href="/auth?mode=login" className="inline-flex min-h-12 min-w-12 items-center justify-center hover:text-white">Masuk</Link>
            <a href="#fitur" className="inline-flex min-h-12 min-w-12 items-center justify-center hover:text-white">Fitur</a>
            <a href="mailto:partnership@nalar-ai.web.id" className="inline-flex min-h-12 min-w-12 items-center justify-center hover:text-white">Kemitraan</a>
            <span>&copy; {new Date().getFullYear()} NalarAI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
