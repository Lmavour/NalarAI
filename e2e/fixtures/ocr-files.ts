import sharp from "sharp";

export async function makeScanImage() {
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850"><rect width="1200" height="850" fill="white"/><g fill="black" font-family="Arial" font-size="36"><text x="50" y="100">Fotosintesis</text><text x="50" y="200">Klorofil menangkap energi cahaya di dalam daun.</text><text x="50" y="280">Tumbuhan memakai air dan karbon dioksida.</text><text x="50" y="360">Glukosa menyimpan energi kimia untuk tumbuhan.</text><text x="50" y="440">Fotosintesis melepaskan oksigen ke udara.</text></g></svg>`)).png().toBuffer();
}

export async function makeScannedPdf() {
  const image = await sharp(await makeScanImage()).jpeg({ quality: 90 }).toBuffer();
  const drawing = Buffer.from("q\n612 0 0 434 0 200 cm\n/Im1 Do\nQ\n");
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>"),
    Buffer.concat([Buffer.from(`<< /Length ${drawing.length} >>\nstream\n`), drawing, Buffer.from("endstream")]),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1200 /Height 850 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`), image, Buffer.from("\nendstream")]),
  ];
  const parts = [Buffer.from("%PDF-1.4\n")];
  const offsets = [0];
  let position = parts[0].length;
  for (const [index, object] of objects.entries()) {
    offsets.push(position);
    const part = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from("\nendobj\n")]);
    parts.push(part);
    position += part.length;
  }
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`;
  parts.push(Buffer.from(xref));
  return Buffer.concat(parts);
}
