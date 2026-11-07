import { NextResponse } from "next/server";
import { getAuthenticatedDashboard } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dashboard = await getAuthenticatedDashboard();
    if (!dashboard) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ authenticated: true, dashboard }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Session lookup failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ authenticated: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
