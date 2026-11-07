import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { createAuthSession, setAuthCookie } from "@/lib/auth";
import { credentialsSchema, validateNewPassword } from "@/lib/auth-validation";
import { connectToDatabase } from "@/lib/db";
import { validateEmailDomain } from "@/lib/email";
import { assertJsonRequest, getClientIp, isSameOrigin, problem } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";
import { Gamification } from "@/models/gamification";
import { User } from "@/models/user";
import { UserProgress } from "@/models/user-progress";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return problem(403, "Permintaan lintas situs ditolak.", "INVALID_ORIGIN");
  if (!assertJsonRequest(request)) return problem(415, "Gunakan request JSON yang valid.", "INVALID_CONTENT_TYPE");

  try {
    const ipLimit = await consumeRateLimit(`register:ip:${getClientIp(request)}`, 8, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      const response = problem(429, "Terlalu banyak percobaan. Coba lagi nanti.", "RATE_LIMITED");
      response.headers.set("Retry-After", String(ipLimit.retryAfterSeconds));
      return response;
    }

    const parsed = credentialsSchema.safeParse(await request.json());
    if (!parsed.success || !validateNewPassword(parsed.data.password)) {
      return problem(422, "Email atau password belum memenuhi persyaratan.", "INVALID_CREDENTIALS");
    }

    const emailResult = await validateEmailDomain(parsed.data.email);
    if (!emailResult.ok) {
      if (emailResult.reason === "temporary") {
        return problem(503, "Domain email belum dapat diperiksa. Coba lagi sebentar.", "EMAIL_CHECK_UNAVAILABLE");
      }
      return problem(422, "Gunakan alamat email aktif dengan domain yang menerima email.", "INVALID_EMAIL");
    }

    const emailLimit = await consumeRateLimit(`register:email:${emailResult.email}`, 4, 30 * 60 * 1000);
    if (!emailLimit.allowed) {
      const response = problem(429, "Terlalu banyak percobaan untuk email ini.", "RATE_LIMITED");
      response.headers.set("Retry-After", String(emailLimit.retryAfterSeconds));
      return response;
    }

    await connectToDatabase();
    const existing = await User.exists({ email: emailResult.email });
    if (existing) {
      return problem(409, "Akun tidak dapat dibuat. Coba masuk jika email sudah terdaftar.", "ACCOUNT_EXISTS");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({ email: emailResult.email, passwordHash });

    await Promise.all([
      UserProgress.updateOne({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true }),
      Gamification.updateOne({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true }),
    ]);

    const token = await createAuthSession(String(user._id));
    const response = NextResponse.json(
      { user: { email: user.email }, message: "Akun berhasil dibuat." },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    const duplicate = typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
    if (duplicate) return problem(409, "Akun tidak dapat dibuat. Coba masuk jika email sudah terdaftar.", "ACCOUNT_EXISTS");
    console.error("Registration failed:", error instanceof Error ? error.name : "UnknownError");
    return problem(503, "Pendaftaran belum tersedia. Coba lagi sebentar.", "SERVICE_UNAVAILABLE");
  }
}
