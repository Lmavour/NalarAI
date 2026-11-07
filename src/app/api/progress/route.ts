import { NextResponse } from "next/server";
import { getAuthenticatedDashboard } from "@/lib/dashboard";
import { problem } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dashboard = await getAuthenticatedDashboard();
    if (!dashboard) return problem(401, "Masuk untuk melihat progres.", "UNAUTHENTICATED");
    return NextResponse.json(
      { progress: dashboard.progress, stats: dashboard.stats },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Progress lookup failed:", error instanceof Error ? error.name : "UnknownError");
    return problem(503, "Progres belum dapat dimuat.", "SERVICE_UNAVAILABLE");
  }
}
