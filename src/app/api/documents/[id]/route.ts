import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { isSameOrigin, problem } from "@/lib/http";
import { StudyDocument } from "@/models/study-document";
import { LessonSession } from "@/models/lesson-session";
import { Flashcard } from "@/models/flashcard";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return problem(403, "Permintaan lintas situs ditolak.", "INVALID_ORIGIN");
  try {
    const auth = await getAuthSession();
    if (!auth) return problem(401, "Silakan masuk terlebih dahulu.", "AUTH_REQUIRED");
    const { id } = await params;
    if (!/^[a-f0-9]{24}$/i.test(id)) return problem(404, "Dokumen tidak ditemukan.", "NOT_FOUND");
    const document = await StudyDocument.findOneAndUpdate({ _id: id, userId: auth.userId }, { $set: { status: "deleted", sources: [], lessonTemplate: null }, $unset: { generationLeaseId: 1, generationLeaseUntil: 1 } }, { returnDocument: "after" });
    if (!document) return new NextResponse(null, { status: 204 });
    await Flashcard.deleteMany({ userId: auth.userId, documentId: id });
    await LessonSession.deleteMany({ userId: auth.userId, documentId: id });
    await StudyDocument.deleteOne({ _id: id, userId: auth.userId, status: "deleted" });
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch { return problem(503, "Dokumen belum dapat dihapus. Coba lagi.", "DOCUMENT_DELETE_UNAVAILABLE"); }
}
