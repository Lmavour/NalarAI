import { Clock3, Crown, Gem, Shield, Sparkles, Trophy, Zap } from "lucide-react";
import type { DashboardData } from "@/types/learning";

const sampleLearners = [
  { name: "Alya", initials: "AL", xp: 3450, color: "bg-[#FFF1C2] text-[#8A5700]" },
  { name: "Dimas", initials: "DM", xp: 3190, color: "bg-[#E7FAF5] text-[#087A5B]" },
  { name: "Rafi", initials: "RF", xp: 2960, color: "bg-[#F4EDFF] text-[#6D3FC0]" },
  { name: "Nadia", initials: "ND", xp: 2650, color: "bg-[#FDECEF] text-[#9F1F40]" },
  { name: "Bima", initials: "BM", xp: 2410, color: "bg-[#E6F0FF] text-cobalt" },
] as const;

export function LeagueView({ dashboard }: { dashboard: DashboardData }) {
  const leaderboard = [
    ...sampleLearners.map((learner) => ({ ...learner, isCurrent: false })),
    { name: dashboard.user.displayName, initials: dashboard.user.displayName.slice(0, 2).toUpperCase(), xp: dashboard.stats.xp, color: "bg-cobalt text-white", isCurrent: true },
    { name: "Sinta", initials: "SN", xp: 2230, color: "bg-[#EEF3F8] text-copy", isCurrent: false },
  ].sort((a, b) => b.xp - a.xp);
  const nextTarget = Math.ceil((dashboard.stats.xp + 1) / 500) * 500;
  const targetProgress = ((dashboard.stats.xp % 500) / 500) * 100;

  return (
    <div className="app-page">
      <section className="learn-card min-w-0">
        <header className="relative rounded-t-[28px] border-b border-line bg-ice p-6 text-center sm:p-8">
          <div className="dot-field pointer-events-none absolute inset-0 rounded-t-[28px] opacity-20" aria-hidden="true" />
          <div className="relative">
            <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-cobalt text-white shadow-[0_5px_0_#0f52cc]"><Gem className="size-8 fill-[#75D6FF]" /></span>
            <span className="mt-5 inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-cobalt">Pratinjau liga mingguan</span>
             <h1 className="mt-3 text-2xl font-[900] tracking-[-0.035em] text-ink [overflow-wrap:anywhere] sm:text-3xl">{dashboard.stats.league} League</h1>
             <p className="mt-2 flex items-center justify-center gap-2 text-sm leading-6 text-copy"><Clock3 className="size-4 shrink-0" /> Konsistensi kecil. Kemajuan bersama.</p>
           </div>
        </header>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)]">
          <div className="min-w-0 p-3 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1"><h2 className="text-lg font-[900] text-ink">Papan peringkat contoh</h2><span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-extrabold text-muted">{leaderboard.length} peserta</span></div>
            <ol className="space-y-2">
              {leaderboard.map((learner, index) => (
                <li key={`${learner.name}-${index}`} className={`grid min-h-16 min-w-0 grid-cols-[20px_36px_minmax(0,1fr)_auto] items-center gap-2 rounded-[18px] border px-2.5 py-3 sm:grid-cols-[24px_44px_minmax(0,1fr)_auto] sm:gap-3 sm:px-3 ${learner.isCurrent ? "border-cobalt bg-ice shadow-[0_3px_0_#D7E8FF]" : "border-transparent hover:bg-canvas"}`}>
                  <span className={`text-center text-xs font-[950] ${index < 3 ? "text-cobalt" : "text-muted"}`}>{index + 1}</span>
                  <span className={`grid size-9 place-items-center rounded-xl text-[11px] font-[950] sm:size-11 sm:rounded-[15px] ${learner.color}`}>{learner.initials}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-[900] text-ink" title={learner.name}>{learner.isCurrent ? "Kamu" : learner.name}</p><p className="mt-0.5 truncate text-[11px] text-muted">{learner.isCurrent ? learner.name : index < 3 ? "Zona podium" : "Pelajar aktif"}</p></div>
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs font-[900] tabular-nums text-sapphire sm:text-sm" aria-label={`${learner.xp} XP`}><Zap className="size-3 shrink-0 fill-reward text-reward sm:size-3.5" /> {learner.xp.toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-2xl bg-canvas p-3 text-xs leading-5 text-copy">Peringkat ini adalah pratinjau tampilan liga. XP pada baris kamu menggunakan progres akunmu.</p>
          </div>

          <aside className="grid min-w-0 gap-4 rounded-b-[28px] border-t border-line bg-slate-50 p-5 lg:grid-cols-2">
            <section className="min-w-0 rounded-[22px] border border-line bg-white p-4">
              <Sparkles className="size-5 text-reward" />
              <h3 className="mt-3 text-base font-[900] text-ink">Target XP berikutnya</h3>
              <p className="mt-2 text-sm leading-6 text-copy">{(nextTarget - dashboard.stats.xp).toLocaleString("id-ID")} XP lagi menuju {nextTarget.toLocaleString("id-ID")} XP.</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-sky" role="progressbar" aria-label="Target XP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(targetProgress)}><div className="h-full rounded-full bg-cobalt" style={{ width: `${targetProgress}%` }} /></div>
            </section>
            <section className="min-w-0 rounded-[22px] border border-line bg-white p-4">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Rencana hadiah liga</h3>
              <div className="mt-4 space-y-4">
                {[
                  { icon: Crown, title: "Podium", copy: "Rayakan pencapaian", color: "bg-[#FFF4D6] text-[#986000]" },
                  { icon: Trophy, title: "Promosi", copy: "Terus naik bersama", color: "bg-ice text-cobalt" },
                  { icon: Shield, title: "Konsistensi", copy: "Usaha kecil setiap hari", color: "bg-[#E7FAF5] text-success" },
                ].map((reward) => <div key={reward.title} className="flex min-w-0 items-center gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${reward.color}`}><reward.icon className="size-4" /></span><div className="min-w-0"><p className="text-sm font-extrabold text-ink">{reward.title}</p><p className="mt-0.5 text-xs leading-5 text-muted">{reward.copy}</p></div></div>)}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
