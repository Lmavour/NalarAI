import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PDFParse } from "pdf-parse";
import { DocumentInputError, MAX_DOCUMENT_BYTES, resolveSourceRefs } from "../src/lib/document-content";
import { extractStudyDocument } from "../src/lib/document-extraction";
import { makeDocx, makeTextPdf } from "./fixtures/document-files";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const paragraphs = [
  "Chlorophyll captures sunlight in the leaves. Plants use this energy to make sugar from water and carbon dioxide.",
  "Roots absorb water from the soil. Leaves take in carbon dioxide, and the sugar stores chemical energy for the plant.",
];

// Incremental revisions keep the original xref valid for image-only and password-locked cases.
function withPdfObject(bytes: Buffer, id: number, body: string, trailer = ""): Buffer {
  const text = bytes.toString("ascii");
  const previous = /startxref\n(\d+)\n%%EOF\n$/.exec(text);
  const size = /\/Size (\d+)/.exec(text);
  if (!previous || !size) throw new Error("Expected a generated PDF fixture");
  const object = Buffer.from(`${id} 0 obj\n${body}\nendobj\n`, "ascii");
  const xref = Buffer.from(`xref\n${id} 1\n${String(bytes.length).padStart(10, "0")} 00000 n \ntrailer\n<< /Size ${Math.max(Number(size[1]), id + 1)} /Root 1 0 R /Prev ${previous[1]} ${trailer} >>\nstartxref\n${bytes.length + object.length}\n%%EOF\n`, "ascii");
  return Buffer.concat([bytes, object, xref]);
}

test("in-memory PDF fixtures have correct object offsets and escape Helvetica literals", async () => {
  const text = `${paragraphs[0]} Sugar (stored energy) uses a \\ symbol in this test.`;
  const bytes = makeTextPdf([text]);
  expect(bytes.equals(makeTextPdf([text]))).toBe(true);
  expect(bytes.length).toBeLessThan(2000);
  const pdf = bytes.toString("ascii");
  const start = /startxref\n(\d+)\n/.exec(pdf);
  if (!start) throw new Error("Missing PDF xref");
  expect(pdf.slice(Number(start[1]), Number(start[1]) + 4)).toBe("xref");
  const xref = pdf.slice(Number(start[1])).split("\n");
  for (let id = 1; id <= 5; id++) {
    const offset = Number(xref[id + 2].slice(0, 10));
    expect(pdf.slice(offset, offset + `${id} 0 obj`.length)).toBe(`${id} 0 obj`);
  }
  const document = await extractStudyDocument(bytes, "literal.pdf", PDF_MIME);
  expect(document.sources[0].text.replace(/\s+/g, " ")).toBe(text);
  expect(() => makeTextPdf([])).toThrow(RangeError);
  expect(() => makeTextPdf(["non-ASCII \u00e9"])).toThrow(TypeError);
});

test("actual PDF extraction retains both real page references and a content hash", async () => {
  const bytes = makeTextPdf(paragraphs);
  const document = await extractStudyDocument(bytes, "C:\\fakepath\\Course.PDF", PDF_MIME);
  expect(document).toMatchObject({ name: "Course.PDF", kind: "pdf", pageCount: 2, segmentCount: 2, sha256: createHash("sha256").update(bytes).digest("hex") });
  expect(document.sources.map((source) => ({ ...source, text: source.text.replace(/\s+/g, " ") }))).toEqual(paragraphs.map((text, index) => ({ id: `s-000${index + 1}`, text, page: index + 1, label: `Halaman ${index + 1}, bagian 1` })));
  expect(resolveSourceRefs("pdf-id", ["s-0002", "s-0001"], document.sources)).toEqual([
    { documentId: "pdf-id", segmentId: "s-0002", label: "Halaman 2, bagian 1", page: 2 },
    { documentId: "pdf-id", segmentId: "s-0001", label: "Halaman 1, bagian 1", page: 1 },
  ]);
  expect((await extractStudyDocument(bytes, "again.pdf", PDF_MIME)).sources).toEqual(document.sources);
});

test("PDF extraction disables eval, worker fetching, font faces, and XFA", async () => {
  const original = PDFParse.prototype.getInfo;
  let observed = 0;
  PDFParse.prototype.getInfo = function (this: PDFParse) {
    observed += 1;
    expect(Reflect.get(this, "options")).toMatchObject({ isEvalSupported: false, useWorkerFetch: false, disableFontFace: true, enableXfa: false, stopAtErrors: true });
    return original.call(this);
  };
  try {
    await extractStudyDocument(makeTextPdf([paragraphs[0]]), "safe.pdf", PDF_MIME);
    expect(observed).toBe(1);
  } finally {
    PDFParse.prototype.getInfo = original;
  }
});

test("actual DOCX extraction uses raw text, XML escaping, stable section references, and CRC-valid ZIPs", async () => {
  const text = `${paragraphs[0]} Literal <script>text</script> & "quoted" words are not HTML.`;
  const input = [text, paragraphs[1]];
  const bytes = makeDocx(input);
  expect(bytes.equals(makeDocx(input))).toBe(true);
  expect(bytes.length).toBeLessThan(4000);
  expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
  const document = await extractStudyDocument(bytes, "Course.DOCX", DOCX_MIME);
  expect(document).toMatchObject({ name: "Course.DOCX", kind: "docx", pageCount: 1, segmentCount: 2, sha256: createHash("sha256").update(bytes).digest("hex") });
  expect(document.sources).toEqual(input.map((text, index) => ({ id: `s-000${index + 1}`, text, label: `Bagian ${index + 1}`, section: `Bagian ${index + 1}` })));
  expect(resolveSourceRefs("docx-id", ["s-0002", "s-0001", "s-0002"], document.sources)).toEqual([
    { documentId: "docx-id", segmentId: "s-0002", label: "Bagian 2" },
    { documentId: "docx-id", segmentId: "s-0001", label: "Bagian 1" },
  ]);
  expect((await extractStudyDocument(bytes, "again.docx", DOCX_MIME)).sources).toEqual(document.sources);
});

test("stored ZIP fixtures have matching local and central headers and a known CRC32", () => {
  const bytes = makeDocx(paragraphs, { entries: [{ name: "word/checksum.bin", data: "123456789" }] });
  const end = bytes.length - 22;
  expect(bytes.readUInt32LE(end)).toBe(0x06054b50);
  expect(bytes.readUInt16LE(end + 10)).toBe(5);
  let offset = bytes.readUInt32LE(end + 16);
  let found = false;
  for (let index = 0; index < 5; index++) {
    expect(bytes.readUInt32LE(offset)).toBe(0x02014b50);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    const local = bytes.readUInt32LE(offset + 42);
    expect(bytes.readUInt32LE(local)).toBe(0x04034b50);
    expect(bytes.readUInt32LE(local + 14)).toBe(bytes.readUInt32LE(offset + 16));
    expect(bytes.readUInt32LE(local + 18)).toBe(bytes.readUInt32LE(offset + 20));
    expect(bytes.readUInt32LE(local + 22)).toBe(bytes.readUInt32LE(offset + 24));
    expect(bytes.subarray(local + 30, local + 30 + nameLength).toString("utf8")).toBe(name);
    if (name === "word/checksum.bin") {
      found = true;
      expect(bytes.readUInt32LE(offset + 16)).toBe(0xcbf43926);
    }
    offset += 46 + nameLength + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
  }
  expect(found).toBe(true);
  expect(offset).toBe(end);
});

for (const kind of ["pdf", "docx"] as const) {
  for (const mime of ["", "application/octet-stream"]) {
    test(`${kind} accepts ${mime || "absent MIME"} only with matching extension and signature`, async () => {
      const bytes = kind === "pdf" ? makeTextPdf([paragraphs[0]]) : makeDocx([paragraphs[0]]);
      expect((await extractStudyDocument(bytes, `course.${kind}`, mime)).kind).toBe(kind);
    });
  }
  test(`${kind} rejects an empty or oversized upload before parsing`, async () => {
    const mime = kind === "pdf" ? PDF_MIME : DOCX_MIME;
    await expect(extractStudyDocument(Buffer.alloc(0), `course.${kind}`, mime)).rejects.toMatchObject({ name: "DocumentInputError", status: 413 });
    await expect(extractStudyDocument(Buffer.alloc(MAX_DOCUMENT_BYTES + 1), `course.${kind}`, mime)).rejects.toMatchObject({ name: "DocumentInputError", status: 413 });
  });
}

for (const extension of ["txt", "doc", "docm", "exe", "pdf.exe", ""]) {
  test(`PDF bytes cannot disguise an unsupported extension ${extension || "(none)"}`, async () => {
    await expect(extractStudyDocument(makeTextPdf([paragraphs[0]]), `course${extension ? `.${extension}` : ""}`, PDF_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 415 });
  });
}
for (const [kind, mime] of [
  ["pdf", "text/plain"], ["pdf", "application/x-pdf"], ["pdf", "application/PDF"],
  ["pdf", `${PDF_MIME}; charset=utf-8`], ["pdf", DOCX_MIME], ["docx", PDF_MIME], ["docx", "application/zip"],
] as const) {
  test(`${kind} rejects the mismatched or unknown MIME ${mime}`, async () => {
    const bytes = kind === "pdf" ? makeTextPdf([paragraphs[0]]) : makeDocx([paragraphs[0]]);
    await expect(extractStudyDocument(bytes, `course.${kind}`, mime)).rejects.toMatchObject({ name: "DocumentInputError", status: 415 });
  });
}

test("matching MIME and extension never override a wrong or displaced magic signature", async () => {
  for (const bytes of [makeDocx(paragraphs), Buffer.from("%PDQ-1.4"), Buffer.concat([Buffer.from("junk"), makeTextPdf(paragraphs)])]) {
    await expect(extractStudyDocument(bytes, "course.pdf", PDF_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/Signature PDF/) });
  }
  for (const bytes of [makeTextPdf(paragraphs), Buffer.from("PK-not-a-zip"), Buffer.concat([Buffer.from("junk"), makeDocx(paragraphs)])]) {
    await expect(extractStudyDocument(bytes, "course.docx", DOCX_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/Signature DOCX/) });
  }
});

test("exactly 4 MiB is accepted for a valid stored DOCX", async () => {
  const empty = makeDocx(paragraphs, { entries: [{ name: "word/padding.bin", data: "" }] });
  const bytes = makeDocx(paragraphs, { entries: [{ name: "word/padding.bin", data: Buffer.alloc(MAX_DOCUMENT_BYTES - empty.length) }] });
  expect(bytes.length).toBe(MAX_DOCUMENT_BYTES);
  expect((await extractStudyDocument(bytes, "limit.docx", DOCX_MIME)).sources).toHaveLength(2);
});

test("PDFs accept 40 pages but reject 41 before extracting their text", async () => {
  const accepted = await extractStudyDocument(makeTextPdf(Array(40).fill(paragraphs[0])), "forty.pdf", PDF_MIME);
  expect(accepted.pageCount).toBe(40);
  expect(accepted.sources.at(-1)).toMatchObject({ id: "s-0040", page: 40, label: "Halaman 40, bagian 1" });
  await expect(extractStudyDocument(makeTextPdf(Array(41).fill("")), "forty-one.pdf", PDF_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/40 halaman/) });
});

test("blank, short, and image-only PDFs are rejected without OCR", async () => {
  const image = "q\n32 0 0 32 50 700 cm\nBI /W 1 /H 1 /CS /RGB /BPC 8 /F /AHx ID FF0000>\nEI\nQ\n";
  const scan = withPdfObject(makeTextPdf([""]), 5, `<< /Length ${Buffer.byteLength(image)} >>\nstream\n${image}endstream`);
  for (const bytes of [makeTextPdf(["", ""]), makeTextPdf(["Too little text."]), scan]) {
    await expect(extractStudyDocument(bytes, "scan.pdf", PDF_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/scan\/OCR/i) });
  }
});

test("corrupt and password-locked PDFs fail closed with a sanitized input error", async () => {
  const zero = "00".repeat(32);
  const locked = withPdfObject(makeTextPdf([paragraphs[0]]), 6, `<< /Filter /Standard /V 1 /R 2 /Length 40 /P -4 /O <${zero}> /U <${zero}> >>`, `/Encrypt 6 0 R /ID [<${"00".repeat(16)}> <${"00".repeat(16)}>]`);
  for (const bytes of [Buffer.from("%PDF-1.4\nThis is not a PDF object tree.\n%%EOF\n"), locked]) {
    await expect(extractStudyDocument(bytes, "locked.pdf", PDF_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/PDF rusak, terkunci/) });
  }
});

test("DOCX files reject corrupt ZIPs, inconsistent stored sizes, and malformed Word XML", async () => {
  const valid = makeDocx(paragraphs);
  for (const bytes of [valid.subarray(0, valid.length - 10), Buffer.from([0x50, 0x4b, 0x03, 0x04]), makeDocx(paragraphs, { entries: [{ name: "word/document.xml", uncompressedSize: 1 }] })]) {
    await expect(extractStudyDocument(bytes, "corrupt.docx", DOCX_MIME)).rejects.toBeInstanceOf(DocumentInputError);
  }
  await expect(extractStudyDocument(makeDocx(paragraphs, { entries: [{ name: "word/document.xml", data: "<w:document>" }] }), "corrupt-xml.docx", DOCX_MIME)).rejects.toThrow();
});

for (const name of ["[Content_Types].xml", "word/document.xml"]) {
  test(`DOCX preflight requires ${name}`, async () => {
    await expect(extractStudyDocument(makeDocx(paragraphs, { omitEntries: [name] }), "missing.docx", DOCX_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/bukan dokumen Word DOCX/) });
  });
}
test("empty Word content and extracted DOCX text above 120k characters are rejected", async () => {
  await expect(extractStudyDocument(makeDocx([]), "empty.docx", DOCX_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/scan\/OCR/i) });
  await expect(extractStudyDocument(makeDocx(["a".repeat(120_001)]), "long.docx", DOCX_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/terlalu panjang/i) });
});

test("DOCX preflight rejects encrypted entries", async () => {
  await expect(extractStudyDocument(makeDocx(paragraphs, { entries: [{ name: "word/document.xml", flags: 0x0801, data: Buffer.alloc(12), uncompressedSize: 0, crc32: 0 }] }), "encrypted.docx", DOCX_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/terenkripsi/) });
});
for (const name of ["word/vbaProject.bin", "word/VBAPROJECT.BIN"]) {
  test(`DOCX preflight rejects macro entry ${name}`, async () => {
    await expect(extractStudyDocument(makeDocx(paragraphs, { entries: [{ name, data: "macro" }] }), "macro.docx", DOCX_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/bermakro/) });
  });
}
for (const name of ["../outside.xml", "word/../../outside.xml", "/absolute.xml", "word\\outside.xml", "C:/outside.xml"]) {
  test(`DOCX preflight rejects unsafe entry path ${name}`, async () => {
    await expect(extractStudyDocument(makeDocx(paragraphs, { entries: [{ name, data: "unsafe" }] }), "traversal.docx", DOCX_MIME)).rejects.toBeInstanceOf(DocumentInputError);
  });
}

test("DOCX entry count is bounded at 1000 including its required parts", async () => {
  const entries = Array.from({ length: 997 }, (_, index) => ({ name: `word/extra-${index}.xml`, data: "" }));
  expect((await extractStudyDocument(makeDocx(paragraphs, { entries: entries.slice(0, 996) }), "thousand.docx", DOCX_MIME)).sources).toHaveLength(2);
  await expect(extractStudyDocument(makeDocx(paragraphs, { entries }), "thousand-one.docx", DOCX_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/terlalu besar/) });
});

test("DOCX preflight rejects declared expanded size over 32 MiB without allocating it", async () => {
  const entries = Array.from({ length: 32 }, (_, index) => ({ name: `word/bomb-${index}.bin`, data: Buffer.from([3, 0]), compressionMethod: 8, uncompressedSize: 1024 * 1024 }));
  const bytes = makeDocx(paragraphs, { entries });
  expect(bytes.length).toBeLessThan(10_000);
  await expect(extractStudyDocument(bytes, "expanded-bomb.docx", DOCX_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/terlalu besar/) });
});

test("DOCX preflight rejects compression ratios over 200 for entries larger than 1 MiB", async () => {
  const bytes = makeDocx(paragraphs, { entries: [{ name: "word/ratio-bomb.bin", data: Buffer.from([3, 0]), compressionMethod: 8, uncompressedSize: 1024 * 1024 + 1 }] });
  expect(bytes.length).toBeLessThan(4000);
  await expect(extractStudyDocument(bytes, "ratio-bomb.docx", DOCX_MIME)).rejects.toMatchObject({ name: "DocumentInputError", status: 422, message: expect.stringMatching(/Rasio kompresi DOCX/) });
});
