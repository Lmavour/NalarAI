import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId, Types } from "mongoose";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { assertJsonRequest, isSameOrigin, problem } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";
import { awardCompletedLesson } from "@/lib/rewards";
import { LessonSession } from "@/models/lesson-session";
import type { AnswerResult, DashboardProgress } from "@/types/learning";

export const runtime = "nodejs";

const answerSchema = z
  .object({
    questionId: z.string().uuid(),
    optionId: z.string().uuid(),
  })
  .strict();

type CompletionReceipt = {
  award: NonNullable<AnswerResult["award"]>;
  progress: DashboardProgress;
};

function receiptFrom(value: unknown): CompletionReceipt | null {
  if (!value || typeof value !== "object" || !("award" in value) || !("progress" in value)) return null;
  return value as CompletionReceipt;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return problem(403, "Permintaan lintas situs ditolak.", "INVALID_ORIGIN");
  if (!assertJsonRequest(request)) return problem(415, "Gunakan request JSON yang valid.", "INVALID_CONTENT_TYPE");

  try {
    const auth = await getAuthSession();
    if (!auth) return problem(401, "Masuk untuk melanjutkan pelajaran.", "UNAUTHENTICATED");
    const { id } = await context.params;
    if (!isValidObjectId(id)) return problem(404, "Sesi pelajaran tidak ditemukan.", "NOT_FOUND");
    const lessonId = new Types.ObjectId(id);
    const userId = new Types.ObjectId(auth.userId);

    const limit = await consumeRateLimit(`answer:${auth.userId}`, 120, 60 * 60 * 1000);
    if (!limit.allowed) return problem(429, "Terlalu banyak jawaban dikirim. Tunggu sebentar.", "RATE_LIMITED");

    const parsed = answerSchema.safeParse(await request.json());
    if (!parsed.success) return problem(422, "Pilihan jawaban tidak valid.", "INVALID_ANSWER");

    await connectToDatabase();
    let lesson = await LessonSession.findOne({ _id: lessonId, userId })
      .select("+answerKey +completionReceipt")
      .lean();
    if (!lesson) return problem(404, "Sesi pelajaran tidak ditemukan.", "NOT_FOUND");
    if (lesson.expiresAt <= new Date()) return problem(410, "Sesi pelajaran sudah berakhir. Buat level baru.", "LESSON_EXPIRED");

    const question = lesson.questions.find((item) => item.id === parsed.data.questionId);
    const answerKey = lesson.answerKey.find((item) => item.questionId === parsed.data.questionId);
    const optionExists = question?.options.some((option) => option.id === parsed.data.optionId);
    if (!question || !answerKey || !optionExists) return problem(422, "Pertanyaan atau pilihan tidak valid.", "INVALID_ANSWER");

    let submitted = lesson.answers.find((answer) => answer.questionId === parsed.data.questionId);
    if (!submitted) {
      if (lesson.status === "completed") return problem(409, "Pelajaran ini sudah selesai.", "LESSON_COMPLETED");
      const nextAnswer = {
        questionId: parsed.data.questionId,
        optionId: parsed.data.optionId,
        correct: parsed.data.optionId === answerKey.correctOptionId,
        answeredAt: new Date(),
      };
      const updated = await LessonSession.findOneAndUpdate(
        {
          _id: lessonId,
          userId,
          status: "active",
          "answers.questionId": { $ne: parsed.data.questionId },
        },
        { $push: { answers: nextAnswer } },
        { returnDocument: "after" },
      )
        .select("+answerKey +completionReceipt")
        .lean();

      if (updated) {
        lesson = updated;
        submitted = lesson.answers.find((answer) => answer.questionId === parsed.data.questionId);
      } else {
        lesson = await LessonSession.findOne({ _id: lessonId, userId })
          .select("+answerKey +completionReceipt")
          .lean();
        submitted = lesson?.answers.find((answer) => answer.questionId === parsed.data.questionId);
      }
    }

    if (!lesson || !submitted) return problem(409, "Jawaban tidak dapat disimpan. Coba lagi.", "ANSWER_CONFLICT");
    const completed = lesson.answers.length === lesson.questions.length;
    let receipt = receiptFrom(lesson.completionReceipt);

    if (completed && !receipt) {
      const reward = await awardCompletedLesson({
        userId: auth.userId,
        lessonSessionId: id,
        stageId: lesson.stageId,
        topic: lesson.topic,
        correctCount: lesson.answers.filter((answer) => answer.correct).length,
        totalQuestions: lesson.questions.length,
      });
      receipt = {
        award: {
          xpEarned: reward.xpEarned,
          score: reward.score,
          stats: reward.stats,
          completedStageIds: reward.progress.completedStageIds,
        },
        progress: reward.progress,
      };
      const stored = await LessonSession.updateOne(
        { _id: lessonId, userId, completionReceipt: null },
        { $set: { status: "completed", completionReceipt: receipt } },
      );
      if (stored.modifiedCount === 0) {
        const completedLesson = await LessonSession.findOne({ _id: lessonId, userId })
          .select("+completionReceipt")
          .lean();
        receipt = receiptFrom(completedLesson?.completionReceipt) ?? receipt;
      }
    }

    return NextResponse.json(
      {
        questionId: submitted.questionId,
        correct: submitted.correct,
        correctOptionId: answerKey.correctOptionId,
        explanation: answerKey.explanation,
        completed,
        ...(receipt ? { award: receipt.award, progress: receipt.progress } : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Answer submission failed:", error instanceof Error ? error.name : "UnknownError");
    return problem(503, "Jawaban belum dapat disimpan. Coba lagi.", "SERVICE_UNAVAILABLE");
  }
}
