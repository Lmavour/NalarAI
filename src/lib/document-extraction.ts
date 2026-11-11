import { createHash } from "node:crypto";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { fromBuffer } from "yauzl";
import sharp from "sharp";
import { DocumentInputError, makeSourceSegments, MAX_DOCUMENT_BYTES, MAX_DOCUMENT_CHARACTERS, MAX_DOCUMENT_PAGES, MAX_OCR_PAGES } from "@/lib/document-content";
import type { ExtractionMode, StudyDocumentKind } from "@/types/documents";
import type { OcrInput, OcrUnit } from "@/lib/document-ocr";

async function validateDocxArchive(bytes: Buffer) {
  await new Promise<void>((resolve, reject) => {
    fromBuffer(bytes, { lazyEntries: true, autoClose: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) { reject(new DocumentInputError("DOCX tidak valid.")); return; }
      let finished = false;
      let count = 0;
      let expanded = 0;
      let hasDocument = false;
      let hasTypes = false;
      const finish = (failure?: Error) => {
        if (finished) return;
        finished = true;
        zip.close();
        if (failure) reject(failure); else resolve();
      };
      zip.on("error", () => finish(new DocumentInputError("Arsip DOCX rusak.")));
      zip.on("entry", (entry) => {
        count += 1;
        expanded += entry.uncompressedSize;
        if (count > 1000 || !Number.isSafeInteger(expanded) || expanded > 32 * 1024 * 1024 || (entry.generalPurposeBitFlag & 1) !== 0 || /vbaProject\.bin$/i.test(entry.fileName)) {
          finish(new DocumentInputError("DOCX terenkripsi, bermakro, atau terlalu besar untuk diproses.")); return;
        }
        if (entry.uncompressedSize > 1024 * 1024 && entry.uncompressedSize / Math.max(1, entry.compressedSize) > 200) {
          finish(new DocumentInputError("Rasio kompresi DOCX tidak aman.")); return;
        }
        hasDocument ||= entry.fileName === "word/document.xml";
        hasTypes ||= entry.fileName === "[Content_Types].xml";
        zip.readEntry();
      });
      zip.on("end", () => finish(hasDocument && hasTypes ? undefined : new DocumentInputError("File bukan dokumen Word DOCX.")));
      zip.readEntry();
    });
  });
}

export async function extractStudyDocument(bytes: Buffer, filename: string, mime: string, options: { mode?: ExtractionMode; ocr?: (input: OcrInput) => Promise<OcrUnit[]> } = {}) {
  const mode = options.mode ?? "text";
  if (mode !== "text" && mode !== "ocr") throw new DocumentInputError("Mode ekstraksi tidak valid.");
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) throw new DocumentInputError("Ukuran dokumen maksimal 4 MB.", 413);
  const name = filename.split(/[\\/]/).at(-1)?.replace(/[\u0000-\u001f]/g, "").slice(0, 160) ?? "";
  const extension = name.split(".").at(-1)?.toLowerCase();
  const kind = extension === "pdf" ? "pdf" : extension === "docx" ? "docx" : ["png", "jpg", "jpeg"].includes(extension ?? "") ? "image" : null;
  const expected = kind === "pdf" ? "application/pdf" : kind === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : extension === "png" ? "image/png" : "image/jpeg";
  if (!kind || (mime && mime !== expected && mime !== "application/octet-stream")) throw new DocumentInputError("Unggah PDF, DOCX, atau gambar PNG/JPG yang valid.", 415);
  if (kind === "image" && mode !== "ocr") throw new DocumentInputError("File gambar memerlukan mode OCR Penuh.", 415);
  if (mode === "ocr" && !options.ocr) throw new DocumentInputError("Layanan OCR belum dikonfigurasi. Pilih Ekstrak Teks atau coba lagi.", 503);

  let pageCount = 1;
  let sources;
  if (kind === "docx") {
    if (bytes.subarray(0, 4).toString("hex") !== "504b0304") throw new DocumentInputError("Signature DOCX tidak valid.");
    await validateDocxArchive(bytes);
    const extracted = await mammoth.extractRawText({ buffer: bytes });
    if (extracted.value.length > MAX_DOCUMENT_CHARACTERS) throw new DocumentInputError("DOCX terlalu panjang. Pisahkan dokumen.");
    if (mode === "ocr") {
      const units = await options.ocr!({ bytes, mimeType: expected, kind, pageCount: 1, baselineText: extracted.value });
      sources = makeSourceSegments(units.map((unit) => ({ text: unit.text })), kind);
    } else sources = makeSourceSegments([{ text: extracted.value }], kind);
  } else if (kind === "image") {
    const info = await sharp(bytes, { limitInputPixels: 20_000_000 }).metadata().catch(() => null);
    if (!info || !["png", "jpeg"].includes(info.format ?? "") || !info.width || !info.height || info.width * info.height > 20_000_000 || (extension === "png" ? info.format !== "png" : info.format !== "jpeg")) throw new DocumentInputError("Gambar tidak valid atau melebihi batas 20 megapiksel.");
    const units = await options.ocr!({ bytes, mimeType: expected, kind, pageCount: 1 });
    sources = makeSourceSegments(units.map((unit) => ({ text: unit.text })), kind);
  } else {
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new DocumentInputError("Signature PDF tidak valid.");
    const parser = new PDFParse({ data: new Uint8Array(bytes), isEvalSupported: false, useWorkerFetch: false, disableFontFace: true, enableXfa: false, stopAtErrors: true, verbosity: 0 });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let ocrStarted = false;
    try {
      const info = await Promise.race([
        parser.getInfo(),
        new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new DocumentInputError("Dokumen memerlukan waktu terlalu lama untuk diproses.")), 20_000); }),
      ]);
      if (timeout) clearTimeout(timeout);
      pageCount = info.total;
      if (pageCount > (mode === "ocr" ? MAX_OCR_PAGES : MAX_DOCUMENT_PAGES)) throw new DocumentInputError(mode === "ocr" ? "OCR Penuh maksimal 10 halaman PDF. Pisahkan dokumen atau pilih Ekstrak Teks." : "PDF maksimal 40 halaman. Pisahkan dokumen yang lebih panjang.");
      if (mode === "ocr") {
        ocrStarted = true;
        const units = await options.ocr!({ bytes, mimeType: expected, kind, pageCount });
        sources = makeSourceSegments(units.map((unit) => ({ text: unit.text, page: unit.index })), kind);
      } else {
        const extracted = await Promise.race([
          parser.getText(),
          new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new DocumentInputError("Dokumen memerlukan waktu terlalu lama untuk diproses.")), 20_000); }),
        ]);
        sources = makeSourceSegments(extracted.pages.map((page) => ({ text: page.text, page: page.num })), kind);
      }
    } catch (error) {
      if (error instanceof DocumentInputError || ocrStarted) throw error;
      throw new DocumentInputError("PDF rusak, terkunci, atau teksnya tidak dapat dibaca.");
    } finally {
      if (timeout) clearTimeout(timeout);
      await parser.destroy();
    }
  }
  return { name, kind: kind as StudyDocumentKind, extractionMode: mode, pageCount, segmentCount: sources.length, sources, sha256: createHash("sha256").update(bytes).digest("hex") };
}
