import "server-only";
import type { NextRequest } from "next/server";
import { DocumentInputError, MAX_DOCUMENT_BYTES, parseDocumentForm } from "@/lib/document-content";

export async function readDocumentUpload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) throw new DocumentInputError("Gunakan upload multipart/form-data.", 415);
  const limit = MAX_DOCUMENT_BYTES + 65_536;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isSafeInteger(declared) || declared < 0 || declared > limit) throw new DocumentInputError("Ukuran upload maksimal 4 MB.", 413);
  if (!request.body) throw new DocumentInputError("File belum dipilih.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); throw new DocumentInputError("Ukuran upload maksimal 4 MB.", 413); }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  let form;
  try { form = await new Response(body, { headers: { "Content-Type": contentType } }).formData(); }
  catch { throw new DocumentInputError("Format upload tidak valid."); }
  return parseDocumentForm(form);
}
