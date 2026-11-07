import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { AiServiceError, generateLesson } from "@/lib/ai";
import { getAuthSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { refreshHearts } from "@/lib/dashboard";
import { assertJsonRequest, isSameOrigin, problem } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";
import { LessonSession } from "@/models/lesson-session";

export const runtime = "nodejs";

const lessonRequestSchema = z
  .object({
    topic: z.string().trim().min(2).max(80).regex(/^[^<>\u0000-\u001F\u007F]+$/),
    stageId: z.enum(["foundation", "core-concept", "connections", "application", "mastery"]),
    stageTitle: z.string().trim().min(2).max(40),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return problem(403, "Permintaan lintas situs ditolak.", "INVALID_ORIGIN");
  if (!assertJsonRequest(request)) return problem(415, "Gunakan request JSON yang valid.", "INVALID_CONTENT_TYPE");

  try {
    const session = await getAuthSession();
    if (!session) return problem(401, "Masuk untuk membuat level belajar.", "UNAUTHENTICATED");

    const limit = await consumeRateLimit(`lesson:${session.userId}`, 12, 60 * 60 * 1000);
    if (!limit.allowed) {
      const response = problem(429, "Batas pembuatan level tercapai. Lanjutkan level yang sudah dibuat dulu.", "RATE_LIMITED");
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }

    const parsed = lessonRequestSchema.safeParse(await request.json());
    if (!parsed.success) return problem(422, "Topik atau level belum valid.", "INVALID_LESSON_REQUEST");

    await connectToDatabase();
    const stats = await refreshHearts(session.userId);
    if (stats.hearts <= 0) {
      return problem(403, "Hearts-mu sedang habis. Satu heart akan pulih setiap empat jam.", "NO_HEARTS");
    }

    const generated = await generateLesson(parsed.data.topic, parsed.data.stageTitle);
    const now = Date.now();
    const lesson = await LessonSession.create({
      userId: new Types.ObjectId(session.userId),
      stageId: parsed.data.stageId,
      topic: parsed.data.topic,
      ...generated,
      expiresAt: new Date(now + 2 * 60 * 60 * 1000),
      purgeAt: new Date(now + 24 * 60 * 60 * 1000),
    });

    return NextResponse.json(
      {
        sessionId: String(lesson._id),
        stageId: lesson.stageId,
        title: lesson.title,
        overview: lesson.overview,
        estimatedMinutes: lesson.estimatedMinutes,
        material: lesson.material,
        questions: lesson.questions,
        expiresAt: lesson.expiresAt.toISOString(),
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AiServiceError) {
      console.warn("AI lesson generation failed:", { kind: error.kind, status: error.status, reason: error.message });
      const status = error.kind === "timeout" ? 504 : 502;
      const code = error.kind === "timeout" ? "AI_TIMEOUT" : error.kind === "upstream" ? "AI_UPSTREAM_UNAVAILABLE" : "AI_INVALID_RESPONSE";
      const message = error.kind === "upstream" ? "Layanan AI sedang tidak dapat dihubungi. Coba lagi sebentar." : "AI belum dapat menyusun level yang valid. Coba lagi sebentar.";
      return problem(status, message, code);
    }
    console.error("Lesson generation failed:", error instanceof Error ? error.name : "UnknownError");
    return problem(503, "Level belum dapat dibuat. Coba lagi sebentar.", "SERVICE_UNAVAILABLE");
  }
}
