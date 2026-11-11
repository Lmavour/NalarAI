import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { DocumentInputError, MAX_DOCUMENT_PAGES, parseDocumentForm } from "../src/lib/document-content";
import { extractStudyDocument } from "../src/lib/document-extraction";
import { ensureDocumentModeIndexes, type DocumentIndexCollection } from "../src/lib/document-indexes";
import { makeDocx, makeTextPdf } from "./fixtures/document-files";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const paragraph = "Chlorophyll captures sunlight in the leaves. Plants use this energy to make sugar from water and carbon dioxide.";

function documentForm(mode?: string): FormData {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(makeTextPdf([paragraph]))], "course.pdf", { type: PDF_MIME }));
  if (mode !== undefined) form.append("extractionMode", mode);
  return form;
}

test.describe("document multipart modes", () => {
  for (const mode of [undefined, "text", "ocr"] as const) {
    test(`${mode ?? "legacy file-only"} multipart preserves the file and selects the expected mode`, async () => {
      const form = documentForm(mode);
      const before = [...form.entries()];
      const parsed = parseDocumentForm(form);
      expect(parsed.extractionMode).toBe(mode ?? "text");
      expect(parsed.file).toBe(form.get("file"));
      expect(parsed.file).toBeInstanceOf(File);
      expect(parsed.file.name).toBe("course.pdf");
      expect(parsed.file.type).toBe(PDF_MIME);
      expect(Buffer.from(await parsed.file.arrayBuffer())).toEqual(makeTextPdf([paragraph]));
      expect([...form.entries()]).toEqual(before);
    });
  }

  test("extractionMode may precede the file without changing the contract", () => {
    const form = new FormData();
    const file = new File([new Uint8Array(makeDocx([paragraph]))], "course.docx", { type: DOCX_MIME });
    form.append("extractionMode", "ocr");
    form.append("file", file);
    expect(parseDocumentForm(form)).toEqual({ file, extractionMode: "ocr" });
  });

  for (const mode of ["", "OCR", "TEXT", "auto", "scan", "ocr ", " text"]) {
    test(`multipart rejects unknown or noncanonical mode ${JSON.stringify(mode)}`, () => {
      expect(() => parseDocumentForm(documentForm(mode))).toThrow(DocumentInputError);
    });
  }

  for (const modes of [["text", "text"], ["ocr", "ocr"], ["text", "ocr"]]) {
    test(`multipart rejects duplicate mode fields ${modes.join("/")}`, () => {
      const form = documentForm(modes[0]);
      form.append("extractionMode", modes[1]);
      expect(() => parseDocumentForm(form)).toThrow(DocumentInputError);
    });
  }

  for (const field of ["mode", "userId", "filename", "mimeType", "file[]", "otherFile"]) {
    test(`multipart rejects unexpected field ${field}`, () => {
      const form = documentForm("ocr");
      form.append(field, "not allowed");
      expect(() => parseDocumentForm(form)).toThrow(DocumentInputError);
    });
  }

  test("multipart requires exactly one actual file, not a string or several values", () => {
    expect(() => parseDocumentForm(new FormData())).toThrow(DocumentInputError);
    const missingFile = new FormData();
    missingFile.append("extractionMode", "ocr");
    expect(() => parseDocumentForm(missingFile)).toThrow(DocumentInputError);
    const stringFile = new FormData();
    stringFile.append("file", "course.pdf");
    expect(() => parseDocumentForm(stringFile)).toThrow(DocumentInputError);
    for (const value of [new File(["another file"], "second.pdf", { type: PDF_MIME }), "course.pdf"]) {
      const form = documentForm();
      form.append("file", value);
      expect(() => parseDocumentForm(form)).toThrow(DocumentInputError);
    }
  });

  test("multipart rejects files masquerading as modes or additional fields", () => {
    const file = new File(["not a mode"], "ocr.txt");
    const modeFile = documentForm();
    modeFile.append("extractionMode", file);
    expect(() => parseDocumentForm(modeFile)).toThrow(DocumentInputError);
    const extraFile = documentForm("ocr");
    extraFile.append("backup", file);
    expect(() => parseDocumentForm(extraFile)).toThrow(DocumentInputError);
  });
});

test.describe("native extraction mode isolation", () => {
  for (const kind of ["pdf", "docx"] as const) {
    for (const mode of [undefined, "text"] as const) {
      test(`${kind} ${mode ?? "default"} mode never invokes a supplied failing OCR callback`, async () => {
        const bytes = kind === "pdf" ? makeTextPdf([paragraph]) : makeDocx([paragraph]);
        const mime = kind === "pdf" ? PDF_MIME : DOCX_MIME;
        let calls = 0;
        const document = await extractStudyDocument(bytes, `native.${kind}`, mime, { mode, ocr: async () => { calls += 1; throw new Error("Native extraction must not use AI"); } });
        expect(calls).toBe(0);
        expect(document).toMatchObject({ kind, extractionMode: "text", pageCount: 1, segmentCount: 1 });
        expect(document.sources[0].text.replace(/\s+/g, " ")).toBe(paragraph);
        if (mode === undefined) expect(await extractStudyDocument(bytes, `native.${kind}`, mime)).toEqual(document);
      });
    }
  }

  for (const pageCount of [11, MAX_DOCUMENT_PAGES]) {
    test(`native text accepts ${pageCount} PDF pages without using the OCR budget`, async () => {
      let calls = 0;
      const document = await extractStudyDocument(makeTextPdf(Array<string>(pageCount).fill(paragraph)), "native.pdf", PDF_MIME, { mode: "text", ocr: async () => { calls += 1; throw new Error("OCR must not run"); } });
      expect(calls).toBe(0);
      expect(document.extractionMode).toBe("text");
      expect(document.pageCount).toBe(pageCount);
      expect(document.sources.at(-1)).toMatchObject({ page: pageCount, label: `Halaman ${pageCount}, bagian 1` });
    });
  }

  test("native text rejects a forty-first PDF page without attempting OCR", async () => {
    let calls = 0;
    await expect(extractStudyDocument(makeTextPdf(Array<string>(41).fill(paragraph)), "long.pdf", PDF_MIME, { mode: "text", ocr: async () => { calls += 1; throw new Error("OCR must not run"); } })).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringContaining("40 halaman") });
    expect(calls).toBe(0);
  });

  for (const [format, extension, mime] of [["png", "png", "image/png"], ["jpeg", "jpg", "image/jpeg"]] as const) {
    for (const mode of [undefined, "text"] as const) {
      test(`${extension} is rejected in ${mode ?? "default text"} mode even with an OCR callback`, async () => {
        const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#ffffff" } }).toFormat(format).toBuffer();
        let calls = 0;
        await expect(extractStudyDocument(bytes, `scan.${extension}`, mime, { mode, ocr: async () => { calls += 1; throw new Error("OCR must not run"); } })).rejects.toMatchObject({ name: "DocumentInputError", status: 415 });
        expect(calls).toBe(0);
      });
    }
  }

  for (const kind of ["pdf", "docx", "image"] as const) {
    test(`${kind} OCR mode requires a configured callback rather than silently becoming text mode`, async () => {
      const bytes = kind === "pdf" ? makeTextPdf([paragraph]) : kind === "docx" ? makeDocx([paragraph]) : await sharp({ create: { width: 2, height: 2, channels: 3, background: "#ffffff" } }).png().toBuffer();
      await expect(extractStudyDocument(bytes, kind === "image" ? "scan.png" : `course.${kind}`, kind === "pdf" ? PDF_MIME : kind === "docx" ? DOCX_MIME : "image/png", { mode: "ocr" })).rejects.toMatchObject({ name: "DocumentInputError", status: 503 });
    });
  }

  test("the same file keeps its byte hash but records text and OCR as distinct modes", async () => {
    const bytes = makeTextPdf([paragraph]);
    const native = await extractStudyDocument(bytes, "course.pdf", PDF_MIME);
    const ocr = await extractStudyDocument(bytes, "course.pdf", PDF_MIME, { mode: "ocr", ocr: async () => [{ index: 1, text: paragraph, status: "readable" }] });
    expect(native.sha256).toBe(ocr.sha256);
    expect(native.extractionMode).toBe("text");
    expect(ocr.extractionMode).toBe("ocr");
    expect(native.sources.map((source) => source.text.replace(/\s+/g, " "))).toEqual(ocr.sources.map((source) => source.text));
  });
});

type IndexRecord = Awaited<ReturnType<DocumentIndexCollection["indexes"]>>[number];
type IndexCall =
  | { operation: "updateMany"; filter: Record<string, unknown>; update: Record<string, unknown> }
  | { operation: "createIndex"; keys: Record<string, number>; options?: { unique: boolean } }
  | { operation: "indexes" }
  | { operation: "dropIndex"; name: string };

class IndexCollectionFake implements DocumentIndexCollection {
  readonly calls: IndexCall[] = [];
  beforeCall?: (call: IndexCall) => void;

  constructor(readonly documents: Array<Record<string, unknown>> = [], readonly indexRecords: IndexRecord[] = []) {}

  private record(call: IndexCall) {
    this.calls.push(structuredClone(call));
    this.beforeCall?.(call);
  }

  async updateMany(filter: Record<string, unknown>, update: Record<string, unknown>) {
    this.record({ operation: "updateMany", filter, update });
    expect(filter).toEqual({ extractionMode: { $exists: false } });
    expect(update).toEqual({ $set: { extractionMode: "text" } });
    let modifiedCount = 0;
    for (const document of this.documents) {
      if (!Object.hasOwn(document, "extractionMode")) {
        document.extractionMode = "text";
        modifiedCount += 1;
      }
    }
    return { matchedCount: modifiedCount, modifiedCount };
  }

  async createIndex(keys: Record<string, number>, options?: { unique: boolean }) {
    this.record({ operation: "createIndex", keys, ...(options ? { options } : {}) });
    const name = Object.entries(keys).map(([key, direction]) => `${key}_${direction}`).join("_");
    if (!this.indexRecords.some((index) => index.name === name)) this.indexRecords.push({ name, key: { ...keys }, ...(options ? { unique: options.unique } : {}) });
    return name;
  }

  async indexes() {
    this.record({ operation: "indexes" });
    return structuredClone(this.indexRecords);
  }

  async dropIndex(name: string) {
    this.record({ operation: "dropIndex", name });
    const index = this.indexRecords.findIndex((record) => record.name === name);
    if (index === -1) throw Object.assign(new Error("Index not found"), { code: 27 });
    this.indexRecords.splice(index, 1);
  }
}

const legacyIndex: IndexRecord = { name: "custom_owned_hash_unique", key: { userId: 1, sha256: 1 }, unique: true };
const modeIndex: IndexRecord = { name: "userId_1_sha256_1_extractionMode_1", key: { userId: 1, sha256: 1, extractionMode: 1 }, unique: true };
const newIndexCall: IndexCall = { operation: "createIndex", keys: { userId: 1, sha256: 1, extractionMode: 1 }, options: { unique: true } };
const createdAtCall: IndexCall = { operation: "createIndex", keys: { userId: 1, createdAt: -1 } };

test.describe("document extraction-mode index migration", () => {
  test("only missing modes are backfilled and only legacy uniqueness is dropped after new uniqueness exists", async () => {
    const savedData = { userId: "owner-a", createdAt: new Date("2026-11-08T00:00:00.000Z"), status: "ready", sources: [{ id: "s-0001", text: paragraph }], lessonTemplate: { title: "Keep cached study content" }, templateId: "template-a", revision: 7, reviewSyncPending: true };
    const documents: Array<Record<string, unknown>> = [
      { ...structuredClone(savedData), _id: "legacy", sha256: "legacy-hash" },
      { ...structuredClone(savedData), _id: "native", sha256: "native-hash", extractionMode: "text" },
      { ...structuredClone(savedData), _id: "ocr", sha256: "ocr-hash", extractionMode: "ocr" },
      { ...structuredClone(savedData), _id: "present-null", sha256: "null-hash", extractionMode: null },
      { ...structuredClone(savedData), _id: "other-owner", userId: "owner-b", sha256: "other-hash" },
    ];
    const beforeDocuments = structuredClone(documents);
    const unrelated: IndexRecord[] = [
      { name: "_id_", key: { _id: 1 }, unique: true },
      modeIndex,
      { name: "nonunique_owned_hash", key: { userId: 1, sha256: 1 } },
      { name: "explicitly_nonunique_owned_hash", key: { userId: 1, sha256: 1 }, unique: false },
      { name: "different_direction", key: { userId: 1, sha256: -1 }, unique: true },
      { name: "owned_hash_topic", key: { userId: 1, sha256: 1, topic: 1 }, unique: true },
      { name: "owned_title", key: { userId: 1, title: 1 }, unique: true },
      { key: { userId: 1, sha256: 1 }, unique: true },
    ];
    const collection = new IndexCollectionFake(documents, structuredClone([legacyIndex, ...unrelated]));
    await ensureDocumentModeIndexes(collection);
    expect(collection.calls).toEqual([
      { operation: "updateMany", filter: { extractionMode: { $exists: false } }, update: { $set: { extractionMode: "text" } } },
      newIndexCall,
      { operation: "indexes" },
      { operation: "dropIndex", name: legacyIndex.name },
      createdAtCall,
    ]);
    expect(documents).toEqual(beforeDocuments.map((document) => Object.hasOwn(document, "extractionMode") ? document : { ...document, extractionMode: "text" }));
    expect(documents).toHaveLength(beforeDocuments.length);
    expect(collection.indexRecords).toEqual([...unrelated, { name: "userId_1_createdAt_-1", key: { userId: 1, createdAt: -1 } }]);
  });

  test("both key orders of the exact old unique owner/hash constraint are safely removed", async () => {
    const reversed: IndexRecord = { name: "sha_first_unique", key: { sha256: 1, userId: 1 }, unique: true };
    const collection = new IndexCollectionFake([], structuredClone([legacyIndex, reversed]));
    await ensureDocumentModeIndexes(collection);
    expect(collection.calls.map((call) => call.operation)).toEqual(["updateMany", "createIndex", "indexes", "dropIndex", "dropIndex", "createIndex"]);
    expect(collection.calls.filter((call) => call.operation === "dropIndex")).toEqual([{ operation: "dropIndex", name: legacyIndex.name }, { operation: "dropIndex", name: reversed.name }]);
    expect(collection.indexRecords).toContainEqual(modeIndex);
  });

  test("rerunning migration does not reset documents, duplicate indexes, or drop unrelated indexes", async () => {
    const documents = [{ _id: "legacy", extractionMode: "ocr", sources: [{ text: paragraph }], lessonTemplate: { title: "Unchanged" }, revision: 9 }];
    const beforeDocuments = structuredClone(documents);
    const unrelated: IndexRecord = { name: "unrelated_unique", key: { externalId: 1 }, unique: true };
    const collection = new IndexCollectionFake(documents, structuredClone([legacyIndex, unrelated]));
    await ensureDocumentModeIndexes(collection);
    await ensureDocumentModeIndexes(collection);
    expect(documents).toEqual(beforeDocuments);
    expect(collection.calls.filter((call) => call.operation === "dropIndex")).toEqual([{ operation: "dropIndex", name: legacyIndex.name }]);
    expect(collection.indexRecords.filter((index) => index.name === modeIndex.name)).toEqual([modeIndex]);
    expect(collection.indexRecords).toContainEqual(unrelated);
    expect(collection.calls.slice(-4)).toEqual([{ operation: "updateMany", filter: { extractionMode: { $exists: false } }, update: { $set: { extractionMode: "text" } } }, newIndexCall, { operation: "indexes" }, createdAtCall]);
  });

  for (const code of [11000, 13, 27]) {
    test(`failed new unique index creation (${code}) never drops the old constraint`, async () => {
      const collection = new IndexCollectionFake([], structuredClone([legacyIndex]));
      const failure = Object.assign(new Error("new index creation failed"), { code });
      collection.beforeCall = (call) => { if (call.operation === "createIndex" && call.keys.extractionMode === 1) throw failure; };
      await expect(ensureDocumentModeIndexes(collection)).rejects.toBe(failure);
      expect(collection.calls).toEqual([{ operation: "updateMany", filter: { extractionMode: { $exists: false } }, update: { $set: { extractionMode: "text" } } }, newIndexCall]);
      expect(collection.indexRecords).toEqual([legacyIndex]);
    });
  }

  for (const stage of ["updateMany", "indexes", "dropIndex", "createdAt"] as const) {
    test(`${stage} permission failures propagate without running later migration stages`, async () => {
      const documents: Array<Record<string, unknown>> = [{ _id: "legacy", sources: [{ text: paragraph }], revision: 4 }];
      const beforeDocuments = structuredClone(documents);
      const collection = new IndexCollectionFake(documents, structuredClone([legacyIndex]));
      const failure = Object.assign(new Error("permission denied"), { code: 13 });
      collection.beforeCall = (call) => {
        if (stage === "createdAt" ? call.operation === "createIndex" && call.keys.createdAt === -1 : call.operation === stage) throw failure;
      };
      await expect(ensureDocumentModeIndexes(collection)).rejects.toBe(failure);
      expect(collection.calls.at(-1)?.operation).toBe(stage === "createdAt" ? "createIndex" : stage);
      if (stage === "updateMany") expect(documents).toEqual(beforeDocuments);
      else expect(documents).toEqual([{ ...beforeDocuments[0], extractionMode: "text" }]);
      if (stage === "updateMany" || stage === "indexes") expect(collection.calls.some((call) => call.operation === "dropIndex")).toBe(false);
      if (stage !== "createdAt") expect(collection.calls).not.toContainEqual(createdAtCall);
    });
  }

  test("an index-not-found deletion race (code 27) is harmless and migration continues", async () => {
    const second: IndexRecord = { name: "second_old_unique", key: { sha256: 1, userId: 1 }, unique: true };
    const collection = new IndexCollectionFake([], structuredClone([legacyIndex, second]));
    collection.beforeCall = (call) => {
      if (call.operation === "dropIndex" && call.name === legacyIndex.name) {
        collection.indexRecords.splice(collection.indexRecords.findIndex((index) => index.name === call.name), 1);
        throw Object.assign(new Error("another worker already dropped this index"), { code: 27 });
      }
    };
    await expect(ensureDocumentModeIndexes(collection)).resolves.toBeUndefined();
    expect(collection.calls.slice(-3)).toEqual([{ operation: "dropIndex", name: legacyIndex.name }, { operation: "dropIndex", name: second.name }, createdAtCall]);
    expect(collection.indexRecords).toEqual([modeIndex, { name: "userId_1_createdAt_-1", key: { userId: 1, createdAt: -1 } }]);
  });

  for (const code of [26, "27", undefined]) {
    test(`deletion errors with code ${JSON.stringify(code)} are not mistaken for numeric race code 27`, async () => {
      const collection = new IndexCollectionFake([], structuredClone([legacyIndex]));
      const failure = Object.assign(new Error("drop failed"), { code });
      collection.beforeCall = (call) => { if (call.operation === "dropIndex") throw failure; };
      await expect(ensureDocumentModeIndexes(collection)).rejects.toBe(failure);
      expect(collection.indexRecords).toContainEqual(legacyIndex);
      expect(collection.calls).not.toContainEqual(createdAtCall);
    });
  }
});
