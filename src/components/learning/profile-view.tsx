import { BookOpenCheck, CalendarDays, Check, Clock3, Gem, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import type { DashboardData } from "@/types/learning";

function buildActivity(activityDates: string[]) {
  const active = new Set(activityDates);
  return Array.from({ length: 56 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (55 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, active: active.has(key) };
  });
}

export function ProfileView({ dashboard }: { dashboard: DashboardData }) {
  const activity = buildActivity(dashboard.progress.activityDates);
  const nextLevelXp = Math.ceil((dashboard.stats.xp + 1) / 500) * 500;
  const levelStart = Math.max(0, nextLevelXp - 500);
  const levelProgress = Math.min(100, ((dashboard.stats.xp - levelStart) / 500) * 100);
  const badges = [
    { icon: Sparkles, title: "Langkah pertama", unlocked: dashboard.stats.lessonsCompleted > 0, color: "bg-[#FFF4D6] text-[#986000]" },
    { icon: Zap, title: "500 XP", unlocked: dashboard.stats.xp >= 500, color: "bg-ice text-cobalt" },
    { icon: Trophy, title: "Streak 7", unlocked: dashboard.stats.longestStreak >= 7, color: "bg-[#E7FAF5] text-success" },
    { icon: Gem, title: "Diamond", unlocked: dashboard.stats.league === "Diamond", color: "bg-[#F4EDFF] text-[#6D3FC0]" },
  ];
  const summary = [
    { icon: Target, label: "Topik aktif", value: dashboard.progress.topic, color: "text-success" },
    { icon: Gem, label: "Liga sekarang", value: `${dashboard.stats.league} League`, color: "text-cobalt" },
    { icon: Clock3, label: "Streak terbaik", value: `${dashboard.stats.longestStreak} hari`, color: "text-[#E16B2F]" },
    { icon: CalendarDays, label: "Bergabung", value: new Date(dashboard.user.joinedAt).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }), color: "text-muted" },
  ];

  return (
    <div className="app-page">
      <section className="learn-card min-w-0">
        <header className="relative rounded-t-[28px] border-b border-line bg-ice p-5 sm:p-7">
          <div className="dot-field pointer-events-none absolute inset-0 rounded-t-[28px] opacity-20" aria-hidden="true" />
          <div className="relative flex min-w-0 flex-col gap-5">
            <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:gap-4 sm:text-left">
               <div className="shrink-0 rounded-full border-4 border-white bg-white p-1 shadow-soft"><CharacterAvatar character="gara" expression="happy" size="md" className="size-20" priority /></div>
              <div className="min-w-0">
                <h1 className="text-2xl font-[900] tracking-[-0.035em] text-ink [overflow-wrap:anywhere] sm:text-3xl">{dashboard.user.displayName}</h1>
                <p className="mt-1 text-xs font-bold leading-5 text-copy [overflow-wrap:anywhere] sm:text-sm">{dashboard.user.email}</p>
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid min-w-0 grid-cols-2 gap-3">
            <div className="min-w-0 rounded-[20px] border border-blue-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-copy"><Zap className="size-4 shrink-0 fill-reward text-reward" /> Total XP</div>
              <p className="mt-2 text-xl font-[950] leading-tight tabular-nums text-cobalt [overflow-wrap:anywhere] sm:text-3xl">{dashboard.stats.xp.toLocaleString("id-ID")}</p>
            </div>
            <div className="min-w-0 rounded-[20px] border border-blue-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-copy"><BookOpenCheck className="size-4 shrink-0 text-cobalt" /> Level selesai</div>
              <p className="mt-2 text-xl font-[950] leading-tight tabular-nums text-cobalt sm:text-3xl">{dashboard.stats.lessonsCompleted}</p>
            </div>
          </div>
          <div className="relative mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold"><span className="text-sapphire">Level {Math.floor(dashboard.stats.xp / 500) + 1}</span><span className="tabular-nums text-copy">{dashboard.stats.xp.toLocaleString("id-ID")} / {nextLevelXp.toLocaleString("id-ID")} XP</span></div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-label="Progres level profil" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(levelProgress)}><div className="h-full rounded-full bg-cobalt" style={{ width: `${levelProgress}%` }} /></div>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)]">
          <div className="min-w-0 space-y-7 p-5 sm:p-7">
            <section className="min-w-0" aria-labelledby="activity-title">
               <div className="flex flex-wrap items-start justify-between gap-3">
                 <h2 id="activity-title" className="text-xl font-[900] text-ink sm:text-2xl">Aktivitas 8 minggu</h2>
                 <span className="flex items-center gap-1.5 rounded-full bg-ice px-2.5 py-1.5 text-xs font-extrabold text-sapphire"><CalendarDays className="size-3.5" /> {dashboard.stats.streak} hari streak</span>
               </div>
               <ol className="mt-5 grid max-w-lg grid-cols-14 gap-1 sm:gap-1.5" aria-label="Kalender aktivitas 8 minggu">
                {activity.map((day) => <li key={day.key} aria-label={`${new Date(`${day.key}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}: ${day.active ? "belajar" : "tidak ada aktivitas"}`} className={`aspect-square min-w-0 rounded-[4px] ${day.active ? "bg-cobalt" : "bg-[#E8EFF7]"}`} />)}
              </ol>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-[11px] font-bold text-muted"><span className="size-3 rounded bg-[#E8EFF7]" aria-hidden="true" /><span>Belum belajar</span><span className="ml-2 size-3 rounded bg-cobalt" aria-hidden="true" /><span>Aktif</span></div>
            </section>

            <section className="min-w-0" aria-labelledby="achievement-title">
               <div className="flex flex-wrap items-end justify-between gap-2"><h2 id="achievement-title" className="text-xl font-[900] text-ink sm:text-2xl">Pencapaian</h2><span className="text-xs font-bold text-muted">{badges.filter((badge) => badge.unlocked).length} terbuka</span></div>
              <div className="mt-4 grid min-w-0 grid-cols-2 gap-3">
                {badges.map((badge) => (
                  <article key={badge.title} className={`min-w-0 rounded-[20px] border p-3.5 sm:p-4 ${badge.unlocked ? "border-line bg-white" : "border-[#E2E9F0] bg-[#F6F8FB]"}`}>
                    <span className={`grid size-10 place-items-center rounded-2xl ${badge.unlocked ? badge.color : "bg-[#E2E8EF] text-[#8795A6]"}`}><badge.icon className="size-5" /></span>
                    <h3 className="mt-3 text-sm font-[900] leading-5 text-ink [overflow-wrap:anywhere]">{badge.title}</h3>
                    <span className={`mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold ${badge.unlocked ? "text-success" : "text-muted"}`}>{badge.unlocked ? <Check className="size-3.5" /> : null}{badge.unlocked ? "Terbuka" : "Terkunci"}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="min-w-0 rounded-b-[28px] border-t border-line bg-slate-50 p-5 lg:p-7">
            <h2 className="text-lg font-[900] text-ink">Ringkasan belajar</h2>
            <div className="mt-4 min-w-0 divide-y divide-line rounded-[22px] border border-line bg-white px-4">
              {summary.map((item) => (
                <div key={item.label} className="flex min-w-0 items-start gap-3 py-4">
                  <item.icon className={`mt-0.5 size-4 shrink-0 ${item.color}`} />
                  <div className="min-w-0 flex-1"><p className="text-xs font-bold text-muted">{item.label}</p><p className="mt-1 text-sm font-extrabold leading-6 text-ink [overflow-wrap:anywhere]">{item.value}</p></div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
