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

export async function readBoundedJson(request: NextRequest) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16_384) { await reader.cancel(); throw new RangeError("JSON request exceeds 16 KiB"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
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
