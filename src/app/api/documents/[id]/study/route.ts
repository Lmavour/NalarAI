import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { assertJsonRequest, isSameOrigin, problem, readBoundedJson } from "@/lib/http";
import { prepareDocumentLesson, DocumentStudyBusyError, StudyDocumentNotFoundError } from "@/lib/document-study";
import { consumeRateLimit } from "@/lib/rate-limit";
import { LessonSession } from "@/models/lesson-session";
import { StudyDocument } from "@/models/study-document";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return problem(403, "Permintaan lintas situs ditolak.", "INVALID_ORIGIN");
  if (!assertJsonRequest(request)) return problem(415, "Gunakan request JSON.", "INVALID_CONTENT_TYPE");
  try {
    const auth = await getAuthSession();
    if (!auth) return problem(401, "Silakan masuk terlebih dahulu.", "AUTH_REQUIRED");
    const { id } = await params;
    if (!/^[a-f0-9]{24}$/i.test(id)) return problem(404, "Dokumen tidak ditemukan.", "NOT_FOUND");
    const body = await readBoundedJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) return problem(422, "Request dokumen tidak valid.", "INVALID_REQUEST");
    const rate = await consumeRateLimit(`document-study:${auth.userId}`, 12, 60 * 60 * 1000);
    if (!rate.allowed) return problem(429, "Batas pembuatan sesi tercapai.", "RATE_LIMITED");
    const generated = await prepareDocumentLesson(auth.userId, id);
    const created = await LessonSession.create({ userId: auth.userId, ...generated, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), purgeAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    if (!await StudyDocument.exists({ _id: id, userId: auth.userId, status: "ready" })) { await LessonSession.deleteOne({ _id: created._id, userId: auth.userId }); throw new StudyDocumentNotFoundError(); }
    return NextResponse.json({ sessionId: String(created._id), stageId: created.stageId, documentId: id, documentName: created.documentName, title: created.title, overview: created.overview, estimatedMinutes: created.estimatedMinutes, material: generated.material, questions: generated.questions, expiresAt: created.expiresAt.toISOString() }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return problem(422, "Request JSON tidak valid.", "INVALID_REQUEST");
    if (error instanceof RangeError) return problem(413, "Request terlalu besar.", "REQUEST_TOO_LARGE");
    if (error instanceof StudyDocumentNotFoundError) return problem(404, error.message, "NOT_FOUND");
    if (error instanceof DocumentStudyBusyError) return problem(409, error.message, "DOCUMENT_BUSY");
    console.warn("Document study failed:", { name: error instanceof Error ? error.name : "UnknownError" });
    return problem(503, "Materi dokumen belum dapat disusun. Pastikan Gemini dan database tersedia.", "DOCUMENT_STUDY_UNAVAILABLE");
  }
}
