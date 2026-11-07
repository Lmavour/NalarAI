import "server-only";
import { NextRequest, NextResponse } from "next/server";

export function problem(status: number, error: string, code?: string) {
  return NextResponse.json(
    { error, ...(code ? { code } : {}) },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/problem+json",
      },
    },
  );
}

export function assertJsonRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType !== "application/json") return false;
  const length = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(length) && length <= 16_384;
}

export function isSameOrigin(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production" || fetchSite === "same-origin" || fetchSite === "none";

  try {
    const source = new URL(origin);
    if (
      !["http:", "https:"].includes(source.protocol) ||
      source.username ||
      source.password ||
      source.pathname !== "/" ||
      source.search ||
      source.hash
    ) return false;

    // Next.js can expose its bind address in nextUrl instead of the browser-facing host.
    const expected = process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_APP_URL
      : `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`;
    if (!expected) return false;

    return source.origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
