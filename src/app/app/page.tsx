import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { LearningShell } from "@/components/learning/learning-shell";
import { isDatabaseUnavailable } from "@/lib/db-connection";
import { getAuthenticatedDashboard } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Jalur belajar",
  description: "Jalur belajar personal, kuis, progres, dan liga NalarAI.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CoreAppPage() {
  let dashboard;
  try {
    dashboard = await getAuthenticatedDashboard();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      console.warn("Dashboard database is unavailable:", { name: error.name });
      return <DatabaseUnavailable />;
    }
    throw error;
  }
  if (!dashboard) redirect("/auth?mode=login&next=/app");

  return <LearningShell initialDashboard={dashboard} />;
}
