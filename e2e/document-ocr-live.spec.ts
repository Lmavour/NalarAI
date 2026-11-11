import { expect, test } from "@playwright/test";
import { makeScanImage, makeScannedPdf } from "./fixtures/ocr-files";
import { makeDocx } from "./fixtures/document-files";
import { Types } from "mongoose";

for (const kind of ["pdf", "image", "docx"] as const) {
  test(`live OCR ${kind} uses direct Gemini input and keeps source locators`, async () => {
    test.skip(process.env.LIVE_OCR_SMOKE !== "1", "Opt in to real Gemini OCR calls with synthetic documents.");
    test.setTimeout(210_000);
    const { extractStudyDocument } = await import("../src/lib/document-extraction");
    const { requestDocumentOcr } = await import("../src/lib/document-ocr");
    const { getGeminiConfig } = await import("../src/lib/env");
    const bytes = kind === "pdf" ? await makeScannedPdf() : kind === "image" ? await makeScanImage() : makeDocx(["Fotosintesis menyimpan energi cahaya sebagai energi kimia. Klorofil menangkap cahaya di daun.", "Tumbuhan memakai air dan karbon dioksida untuk membentuk glukosa dan menghasilkan oksigen."]);
    const filename = kind === "pdf" ? "scan.pdf" : kind === "image" ? "scan.png" : "scan.docx";
    const mime = kind === "pdf" ? "application/pdf" : kind === "image" ? "image/png" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (kind === "pdf") await expect(extractStudyDocument(bytes, filename, mime)).rejects.toMatchObject({ name: "DocumentInputError" });
    const result = await extractStudyDocument(bytes, filename, mime, { mode: "ocr", ocr: (input) => requestDocumentOcr(input, getGeminiConfig()) });
    expect(result.extractionMode).toBe("ocr");
    expect(result.sources.map((source) => source.text).join(" ")).toMatch(/klorofil/i);
    expect(result.sources.every((source) => kind === "pdf" ? source.page === 1 : source.page === undefined)).toBe(true);
    console.log("Live OCR validated:", { kind, mode: result.extractionMode, segments: result.segmentCount, recognizedCharacters: result.sources.reduce((count, source) => count + source.text.length, 0) });
  });
}

test("live extraction-mode migration preserves legacy sources and allows isolated OCR versions", async () => {
  test.skip(process.env.LIVE_OCR_STORAGE_SMOKE !== "1", "Opt in to additive mode-index migration and isolated document fixtures.");
  test.setTimeout(120_000);
  const { connectToDatabase } = await import("../src/lib/db");
  const { StudyDocument } = await import("../src/models/study-document");
  const { ensureDocumentStorage } = await import("../src/lib/documents");
  const owner = new Types.ObjectId();
  const legacyId = new Types.ObjectId();
  const sha256 = legacyId.toHexString().padEnd(64, "a");
  await connectToDatabase();
  try {
    const source = { id: "s-0001", label: "Halaman 1", text: "Teks sumber lama tetap utuh ketika metadata mode ekstraksi ditambahkan.", page: 1 };
    await StudyDocument.collection.insertOne({ _id: legacyId, userId: owner, name: "legacy-mode.pdf", kind: "pdf", sha256, pageCount: 1, segmentCount: 1, sources: [source], status: "ready", templateId: "unchanged-template", lessonTemplate: { marker: "unchanged" }, completedAt: new Date("2026-11-01T00:00:00Z"), createdAt: new Date(), updatedAt: new Date() });
    await ensureDocumentStorage();
    const legacy = await StudyDocument.findById(legacyId).select("+sources +lessonTemplate").lean();
    expect(legacy?.extractionMode).toBe("text");
    expect(legacy?.sources[0].text).toBe(source.text);
    expect(legacy?.templateId).toBe("unchanged-template");
    expect(legacy?.lessonTemplate).toEqual({ marker: "unchanged" });
    await StudyDocument.create({ userId: owner, name: "ocr-mode.pdf", kind: "pdf", sha256, extractionMode: "ocr", pageCount: 1, segmentCount: 1, sources: [source] });
    expect(await StudyDocument.countDocuments({ userId: owner, sha256 })).toBe(2);
    await expect(StudyDocument.create({ userId: owner, name: "duplicate-mode.pdf", kind: "pdf", sha256, extractionMode: "ocr", pageCount: 1, segmentCount: 1, sources: [source] })).rejects.toMatchObject({ code: 11000 });
    console.log("Document mode storage validated:", { legacyPreserved: true, twoModes: true, uniquePerMode: true });
  } finally { await StudyDocument.deleteMany({ userId: owner }); }
});
