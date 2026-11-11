import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { DocumentInputError, MAX_DOCUMENT_BYTES } from "@/lib/document-content";
import { extractStudyDocument } from "@/lib/document-extraction";
import { readDocumentUpload } from "@/lib/document-upload";
import { ensureDocumentStorage, toStudyDocumentDto } from "@/lib/documents";
import { isSameOrigin, problem } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";
import { StudyDocument } from "@/models/study-document";
import { getGeminiConfig } from "@/lib/env";
import { requestDocumentOcr } from "@/lib/document-ocr";
import type { ExtractionMode } from "@/types/documents";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return problem(401, "Silakan masuk terlebih dahulu.", "AUTH_REQUIRED");
    const documents = await StudyDocument.find({ userId: session.userId, status: "ready" }).sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({ documents: documents.map(toStudyDocumentDto) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return problem(503, "Layanan dokumen belum dapat dihubungi.", "DOCUMENT_SERVICE_UNAVAILABLE"); }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return problem(403, "Permintaan lintas situs tidak diizinkan.", "ORIGIN_DENIED");
  let extractionMode: ExtractionMode = "text";
  let supportsTextFallback = false;
  try {
    const session = await getAuthSession();
    if (!session) return problem(401, "Silakan masuk terlebih dahulu.", "AUTH_REQUIRED");
    const limit = await consumeRateLimit(`document-upload:${session.userId}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) return problem(429, "Batas upload tercapai. Coba lagi nanti.", "UPLOAD_RATE_LIMIT");
    const upload = await readDocumentUpload(request);
    const file = upload.file;
    extractionMode = upload.extractionMode;
    supportsTextFallback = /\.(pdf|docx)$/i.test(file.name);
    if (file.size > MAX_DOCUMENT_BYTES) throw new DocumentInputError("Ukuran dokumen maksimal 4 MB.", 413);
    const bytes = Buffer.from(await file.arrayBuffer());
    await ensureDocumentStorage();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const existing = await StudyDocument.findOne({ userId: session.userId, sha256, extractionMode, status: "ready" }).lean();
    if (existing) return NextResponse.json(toStudyDocumentDto(existing), { headers: { "Cache-Control": "no-store" } });
    if (await StudyDocument.countDocuments({ userId: session.userId, status: "ready" }) >= 20) return problem(409, "Simpan maksimal 20 dokumen. Hapus dokumen lama untuk menambah yang baru.", "DOCUMENT_LIMIT");
    if (extractionMode === "ocr") {
      const ocrRate = await consumeRateLimit(`document-ocr:${session.userId}`, 3, 60 * 60 * 1000);
      if (!ocrRate.allowed) return NextResponse.json({ error: "Batas OCR tercapai. Coba nanti atau pilih Ekstrak Teks.", code: "OCR_RATE_LIMIT", fallbackMode: supportsTextFallback ? "text" : null }, { status: 429, headers: { "Cache-Control": "no-store" } });
    }
    const extracted = await extractStudyDocument(bytes, file.name, file.type, {
      mode: extractionMode,
      ...(extractionMode === "ocr" ? { ocr: (input) => requestDocumentOcr(input, getGeminiConfig()) } : {}),
    });
    try {
      const created = await StudyDocument.create({ userId: session.userId, ...extracted });
      return NextResponse.json(toStudyDocumentDto(created), { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const duplicate = await StudyDocument.findOne({ userId: session.userId, sha256, extractionMode, status: "ready" }).lean();
      if (!duplicate) throw error;
      return NextResponse.json(toStudyDocumentDto(duplicate), { headers: { "Cache-Control": "no-store" } });
    }
  } catch (error) {
    if (error instanceof DocumentInputError) return NextResponse.json({ error: error.message, code: extractionMode === "ocr" ? "OCR_INCOMPLETE" : "INVALID_DOCUMENT", fallbackMode: extractionMode === "ocr" && supportsTextFallback ? "text" : null }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    console.warn("Document upload failed:", { name: error instanceof Error ? error.name : "UnknownError" });
    if (extractionMode === "ocr") return NextResponse.json({ error: "OCR Gemini belum tersedia atau hasilnya belum valid. Coba lagi atau pilih Ekstrak Teks jika dokumen memiliki lapisan teks.", code: "OCR_SERVICE_UNAVAILABLE", fallbackMode: supportsTextFallback ? "text" : null }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return problem(503, "Dokumen belum dapat diproses. Coba lagi sebentar.", "DOCUMENT_SERVICE_UNAVAILABLE");
  }
}
