import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { reviewFlashcard, FlashcardConflictError, FlashcardInputError, FlashcardNotFoundError } from "@/lib/flashcards";
import { assertJsonRequest, isSameOrigin, problem, readBoundedJson } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const reviewSchema = z.object({ reviewId: z.string().uuid(), expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), rating: z.enum(["again", "hard", "good", "easy"]) }).strict();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return problem(403, "Permintaan lintas situs ditolak.", "INVALID_ORIGIN");
  if (!assertJsonRequest(request)) return problem(415, "Gunakan request JSON.", "INVALID_CONTENT_TYPE");
  try {
    const auth = await getAuthSession();
    if (!auth) return problem(401, "Silakan masuk terlebih dahulu.", "AUTH_REQUIRED");
    const { id } = await params;
    const parsed = reviewSchema.safeParse(await readBoundedJson(request));
    if (!parsed.success) return problem(422, "Penilaian kartu tidak valid.", "INVALID_REVIEW");
    const rate = await consumeRateLimit(`card-review:${auth.userId}`, 120, 60 * 60 * 1000);
    if (!rate.allowed) return problem(429, "Batas review tercapai. Tunggu sebentar.", "RATE_LIMITED");
    const result = await reviewFlashcard(auth.userId, id, parsed.data);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof FlashcardNotFoundError) return problem(404, "Kartu tidak ditemukan.", "CARD_NOT_FOUND");
    if (error instanceof FlashcardConflictError) return problem(409, "Jadwal kartu sudah berubah. Muat ulang antrean.", "REVIEW_CONFLICT");
    if (error instanceof FlashcardInputError || error instanceof SyntaxError) return problem(422, "Penilaian kartu tidak valid.", "INVALID_REVIEW");
    if (error instanceof RangeError) return problem(413, "Request terlalu besar.", "REQUEST_TOO_LARGE");
    return problem(503, "Review belum dapat disimpan. Coba lagi.", "REVIEW_SERVICE_UNAVAILABLE");
  }
}
