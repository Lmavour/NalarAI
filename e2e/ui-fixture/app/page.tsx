import { LearningShell } from "../../../src/components/learning/learning-shell";
import { DatabaseUnavailable } from "../../../src/components/database-unavailable";
import { dashboardFixture } from "../../fixtures/learning";

export default async function FixturePage({ searchParams }: { searchParams: Promise<{ completed?: string; new?: string; preMastery?: string; streak?: string; database?: string }> }) {
  const { completed, new: newLearner, preMastery, streak, database } = await searchParams;
  if (database === "unavailable") return <DatabaseUnavailable />;
  const completedStageIds = completed === "1"
    ? ["foundation", "core-concept", "connections", "application", "mastery"]
    : preMastery === "1"
      ? ["foundation", "core-concept", "connections", "application"]
      : newLearner === "1"
        ? []
        : dashboardFixture.progress.completedStageIds;
  const dashboard = {
    ...dashboardFixture,
    stats: {
      ...dashboardFixture.stats,
      lessonsCompleted: newLearner === "1" ? 0 : dashboardFixture.stats.lessonsCompleted,
      streak: streak ? Number(streak) : dashboardFixture.stats.streak,
    },
    progress: { ...dashboardFixture.progress, completedStageIds },
  };
  return <LearningShell initialDashboard={dashboard} />;
}
