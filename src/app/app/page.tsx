import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LearningShell } from "@/components/learning/learning-shell";
import { getAuthenticatedDashboard } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Jalur belajar",
  description: "Jalur belajar personal, kuis, progres, dan liga NalarAI.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CoreAppPage() {
  const dashboard = await getAuthenticatedDashboard();
  if (!dashboard) redirect("/auth?mode=login&next=/app");

  return <LearningShell initialDashboard={dashboard} />;
}
