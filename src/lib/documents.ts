import "server-only";
import { connectToDatabase } from "@/lib/db";
import { StudyDocument, type StudyDocumentRecord } from "@/models/study-document";
import { ensureDocumentModeIndexes } from "@/lib/document-indexes";
import type { ExtractionMode, StudyDocumentDto, StudyDocumentKind } from "@/types/documents";

let indexes: Promise<unknown> | null = null;

export async function ensureDocumentStorage() {
  await connectToDatabase();
  if (!indexes) indexes = ensureDocumentModeIndexes(StudyDocument.collection);
  try { await indexes; } catch (error) { indexes = null; throw error; }
}

export function toStudyDocumentDto(document: StudyDocumentRecord & { _id: unknown }): StudyDocumentDto {
  return { id: String(document._id), name: document.name, kind: document.kind as StudyDocumentKind, extractionMode: (document.extractionMode ?? "text") as ExtractionMode, pageCount: document.pageCount, segmentCount: document.segmentCount, createdAt: document.createdAt.toISOString(), studied: Boolean(document.completedAt) };
}
