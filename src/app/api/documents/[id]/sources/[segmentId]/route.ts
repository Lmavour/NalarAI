import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { problem } from "@/lib/http";
import { StudyDocument } from "@/models/study-document";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; segmentId: string }> }) {
  try {
    const session = await getAuthSession();
    if (!session) return problem(401, "Silakan masuk terlebih dahulu.", "AUTH_REQUIRED");
    const { id, segmentId } = await params;
    if (!/^[a-f0-9]{24}$/i.test(id) || !/^s-\d{4,6}$/.test(segmentId)) return problem(404, "Sumber tidak ditemukan.", "SOURCE_NOT_FOUND");
    const document = await StudyDocument.findOne({ _id: id, userId: session.userId, status: "ready" }).select("+sources").lean();
    const source = document?.sources.find((item) => item.id === segmentId);
    if (!document || !source) return problem(404, "Sumber tidak ditemukan.", "SOURCE_NOT_FOUND");
    return NextResponse.json({ documentName: document.name, ...source }, { headers: { "Cache-Control": "no-store" } });
  } catch { return problem(503, "Sumber belum dapat dimuat.", "SOURCE_SERVICE_UNAVAILABLE"); }
}
