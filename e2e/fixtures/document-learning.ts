import type { FlashcardDto, StudyDocumentDto, SourceReference } from "../../src/types/documents";
import { lessonFixture } from "./learning";

export const documentDto: StudyDocumentDto = { id: "000000000000000000000111", name: "Materi fotosintesis dan ekosistem untuk latihan ujian yang bersumber dari dokumen pribadi.pdf", kind: "pdf", pageCount: 2, segmentCount: 2, createdAt: "2026-11-08T00:00:00.000Z", studied: false };
export const sourceRef: SourceReference = { documentId: documentDto.id, segmentId: "s-0001", label: "Halaman 1, bagian 1", page: 1 };
export const sourceText = "Klorofil menangkap cahaya dan tumbuhan menyimpan energinya di dalam glukosa. Ini adalah kutipan sumber, bukan instruksi program. <script>window.sourceExecuted = true</script>";
export const documentLessonFixture = {
  ...lessonFixture,
  stageId: "document",
  documentId: documentDto.id,
  documentName: documentDto.name,
  material: lessonFixture.material.map((item) => ({ ...item, sourceRefs: [sourceRef] })),
  questions: lessonFixture.questions.map((item, index) => ({ ...item, materialIndex: index % lessonFixture.material.length, sourceRefs: [sourceRef] })),
};
export const flashcardDto: FlashcardDto = { id: `${documentDto.id}:00000000-0000-4000-8000-000000000777:0`, documentId: documentDto.id, documentName: documentDto.name, question: "Apa peran klorofil dalam proses fotosintesis, dan bagaimana energi cahaya disimpan setelah tumbuhan menyerapnya?", answer: "Klorofil menangkap energi cahaya yang digunakan untuk menyusun glukosa. Energi kemudian tersimpan sebagai energi kimia di dalam gula.", sourceRefs: [sourceRef], dueAt: "2026-11-08T00:00:00.000Z", revision: 4, intervalDays: 1 };
