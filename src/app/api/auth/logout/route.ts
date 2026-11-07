import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, revokeCurrentSession } from "@/lib/auth";
import { isSameOrigin, problem } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return problem(403, "Permintaan lintas situs ditolak.", "INVALID_ORIGIN");
  try {
    await revokeCurrentSession();
  } catch (error) {
    console.error("Logout revocation failed:", error instanceof Error ? error.name : "UnknownError");
  }

  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  clearAuthCookie(response);
  return response;
}
