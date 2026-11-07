import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { createAuthSession, revokeCurrentSession, setAuthCookie } from "@/lib/auth";
import { credentialsSchema } from "@/lib/auth-validation";
import { connectToDatabase } from "@/lib/db";
import { normalizeAndValidateEmail } from "@/lib/email";
import { assertJsonRequest, getClientIp, isSameOrigin, problem } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";
import { User } from "@/models/user";

export const runtime = "nodejs";

let dummyHashPromise: Promise<string> | null = null;
function getDummyHash() {
  dummyHashPromise ??= bcrypt.hash("nalarai-dummy-password-2026", 12);
  return dummyHashPromise;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return problem(403, "Permintaan lintas situs ditolak.", "INVALID_ORIGIN");
  if (!assertJsonRequest(request)) return problem(415, "Gunakan request JSON yang valid.", "INVALID_CONTENT_TYPE");

  try {
    const ip = getClientIp(request);
    const ipLimit = await consumeRateLimit(`login:ip:${ip}`, 12, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      const response = problem(429, "Terlalu banyak percobaan masuk. Coba lagi nanti.", "RATE_LIMITED");
      response.headers.set("Retry-After", String(ipLimit.retryAfterSeconds));
      return response;
    }

    const parsed = credentialsSchema.safeParse(await request.json());
    if (!parsed.success) return problem(401, "Email atau password salah.", "INVALID_LOGIN");
    const normalized = normalizeAndValidateEmail(parsed.data.email);
    if (!normalized.ok) return problem(401, "Email atau password salah.", "INVALID_LOGIN");

    const emailLimit = await consumeRateLimit(`login:email:${normalized.email}`, 8, 15 * 60 * 1000);
    if (!emailLimit.allowed) return problem(429, "Terlalu banyak percobaan masuk. Coba lagi nanti.", "RATE_LIMITED");

    await connectToDatabase();
    const user = await User.findOne({ email: normalized.email }).select("+passwordHash");
    const passwordHash = user?.passwordHash ?? (await getDummyHash());
    const valid = await bcrypt.compare(parsed.data.password, passwordHash);
    if (!user || !valid) return problem(401, "Email atau password salah.", "INVALID_LOGIN");

    await revokeCurrentSession();
    const token = await createAuthSession(String(user._id));
    const response = NextResponse.json(
      { user: { email: user.email }, message: "Berhasil masuk." },
      { headers: { "Cache-Control": "no-store" } },
    );
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login failed:", error instanceof Error ? error.name : "UnknownError");
    return problem(503, "Layanan masuk belum tersedia. Coba lagi sebentar.", "SERVICE_UNAVAILABLE");
  }
}
