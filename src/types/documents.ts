export type SourceSegment = {
  id: string;
  label: string;
  text: string;
  page?: number;
  section?: string;
};

export type SourceReference = {
  documentId: string;
  segmentId: string;
  label: string;
  page?: number;
};

export type StudyDocumentDto = {
  id: string;
  name: string;
  kind: StudyDocumentKind;
  extractionMode?: ExtractionMode;
  pageCount: number;
  segmentCount: number;
  createdAt: string;
  studied: boolean;
};

export type RecallRating = "again" | "hard" | "good" | "easy";

export type FlashcardDto = {
  id: string;
  documentId: string;
  documentName: string;
  question: string;
  answer: string;
  sourceRefs: SourceReference[];
  dueAt: string;
  revision: number;
  intervalDays: number;
};
export type ExtractionMode = "text" | "ocr";
export type StudyDocumentKind = "pdf" | "docx" | "image";
