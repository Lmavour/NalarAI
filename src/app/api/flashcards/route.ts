import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { listDueFlashcards, FlashcardNotFoundError } from "@/lib/flashcards";
import { reconcileDocumentReviews } from "@/lib/document-review-sync";
import { problem } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthSession();
    if (!auth) return problem(401, "Silakan masuk terlebih dahulu.", "AUTH_REQUIRED");
    const documentId = request.nextUrl.searchParams.get("documentId") ?? undefined;
    if (documentId && !/^[a-f0-9]{24}$/i.test(documentId)) return problem(404, "Dokumen tidak ditemukan.", "NOT_FOUND");
    await reconcileDocumentReviews(auth.userId);
    const queue = await listDueFlashcards(auth.userId, documentId);
    return NextResponse.json(queue, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof FlashcardNotFoundError) return problem(404, "Dokumen tidak ditemukan.", "NOT_FOUND");
    console.warn("Review queue failed:", { name: error instanceof Error ? error.name : "UnknownError" });
    return problem(503, "Jadwal ulang belum dapat dimuat. Coba lagi.", "REVIEW_SERVICE_UNAVAILABLE");
  }
}
