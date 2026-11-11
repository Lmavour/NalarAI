import { Buffer } from "node:buffer";

export type DocxEntry = {
  name: string;
  data?: string | Buffer;
  flags?: number;
  compressionMethod?: number;
  compressedSize?: number;
  uncompressedSize?: number;
  crc32?: number;
};

export type DocxOptions = {
  entries?: DocxEntry[];
  omitEntries?: string[];
};

/** Build a deterministic, uncompressed PDF with ASCII Helvetica text and a real xref. */
export function makeTextPdf(pages: string[]): Buffer {
  if (!pages.length) throw new RangeError("A PDF fixture needs at least one page");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  for (const [index, page] of pages.entries()) {
    if (/[^\x09\x0a\x0d\x20-\x7e]/.test(page)) throw new TypeError("PDF fixture text must be ASCII");
    const lines = page.replace(/\r\n?/g, "\n").replace(/\t/g, " ").split("\n").flatMap((line) => {
      const wrapped: string[] = [];
      let remaining = line;
      while (remaining.length > 56) {
        const space = remaining.lastIndexOf(" ", 56);
        const end = space > 0 ? space : 56;
        wrapped.push(remaining.slice(0, end));
        remaining = remaining.slice(end + (space > 0 ? 1 : 0));
      }
      return [...wrapped, remaining];
    });
    const text = lines.map((line) => `(${line.replace(/[\\()]/g, "\\$&")}) Tj`).join("\nT*\n");
    const stream = `BT\n/F1 10 Tf\n14 TL\n50 750 Td\n${text}\nET\n`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}endstream`,
    );
  }
  const chunks = [Buffer.from("%PDF-1.4\n", "ascii")];
  const offsets: number[] = [];
  let offset = chunks[0].length;
  for (const [index, object] of objects.entries()) {
    offsets.push(offset);
    const chunk = Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`, "ascii");
    chunks.push(chunk);
    offset += chunk.length;
  }
  chunks.push(Buffer.from(
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((value) => `${String(value).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`,
    "ascii",
  ));
  return Buffer.concat(chunks);
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Build minimal OOXML in a stored ZIP; overrides deliberately permit hostile header metadata. */
export function makeDocx(paragraphs: string[], options: DocxOptions = {}): Buffer {
  const xml = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
  const entries: DocxEntry[] = [
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
    { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: "word/document.xml", data: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map((paragraph) => `<w:p><w:r><w:t xml:space="preserve">${xml(paragraph)}</w:t></w:r></w:p>`).join("")}<w:sectPr/></w:body></w:document>` },
    { name: "word/_rels/document.xml.rels", data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>' },
  ].filter((entry) => !options.omitEntries?.includes(entry.name));
  for (const entry of options.entries ?? []) {
    const index = entries.findIndex((item) => item.name === entry.name);
    if (index === -1) entries.push(entry);
    else entries[index] = { ...entries[index], ...entry };
  }
  if (entries.length > 0xffff) throw new RangeError("ZIP64 is not supported by these fixtures");
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data ?? "", "utf8");
    const checksum = entry.crc32 ?? crc32(data);
    const compressed = entry.compressedSize ?? data.length;
    const expanded = entry.uncompressedSize ?? data.length;
    const flags = entry.flags ?? 0x0800;
    const method = entry.compressionMethod ?? 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0x0021, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed, 18);
    local.writeUInt32LE(expanded, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0x0021, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed, 20);
    central.writeUInt32LE(expanded, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    localChunks.push(local, name, data);
    centralChunks.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const central = Buffer.concat(centralChunks);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localChunks, central, end]);
}
