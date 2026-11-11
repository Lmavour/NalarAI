import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { expect, test } from "@playwright/test";
import { makeTextPdf } from "./fixtures/document-files";

test("live document learning keeps citations cards cache and quiz outbox consistent", async () => {
  test.skip(process.env.LIVE_DOCUMENT_SMOKE !== "1", "Opt in to Gemini generation and temporary owned document data.");
  test.setTimeout(240_000);
  const { extractStudyDocument } = await import("../src/lib/document-extraction");
  const { ensureDocumentStorage } = await import("../src/lib/documents");
  const { prepareDocumentLesson } = await import("../src/lib/document-study");
  const { StudyDocument } = await import("../src/models/study-document");
  const { Flashcard } = await import("../src/models/flashcard");
  const { LessonSession } = await import("../src/models/lesson-session");
  const { listDueFlashcards, reviewFlashcard, FlashcardConflictError, FlashcardNotFoundError } = await import("../src/lib/flashcards");
  const { answerStorageUpdate } = await import("../src/lib/lesson-answer-policy");
  const { syncDocumentQuizReview } = await import("../src/lib/document-review-sync");
  const owner = new Types.ObjectId();
  const foreign = new Types.ObjectId();
  let documentId: string | null = null;
  try {
    await ensureDocumentStorage();
    const extracted = await extractStudyDocument(makeTextPdf([
      "Fotosintesis adalah proses tumbuhan mengubah energi cahaya menjadi energi kimia. Klorofil di daun menangkap cahaya. Tumbuhan memakai air dan karbon dioksida untuk membentuk glukosa.",
      "Glukosa menyimpan energi untuk pertumbuhan tumbuhan. Fotosintesis juga melepaskan oksigen. Air masuk melalui akar, karbon dioksida masuk melalui stomata, dan cahaya ditangkap oleh klorofil.",
    ]), "materi-smoke.pdf", "application/pdf");
    const document = await StudyDocument.create({ userId: owner, ...extracted });
    documentId = String(document._id);
    const generated = await prepareDocumentLesson(String(owner), documentId);
    expect(generated.material.every((item) => item.sourceRefs.length > 0)).toBe(true);
    expect(generated.material.flatMap((item) => item.sourceRefs).every((ref) => ref.documentId === documentId && [1, 2].includes(ref.page!))).toBe(true);
    await expect(prepareDocumentLesson(String(foreign), documentId)).rejects.toMatchObject({ name: "StudyDocumentNotFoundError" });
    const repeated = await prepareDocumentLesson(String(owner), documentId);
    expect(repeated.generation.cached).toBe(true);
    expect(repeated.generation.usage).toBeNull();
    expect(repeated.templateId).toBe(generated.templateId);
    const created = await LessonSession.create({ userId: owner, ...generated, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), purgeAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    for (const [index, question] of generated.questions.entries()) {
      const key = generated.answerKey.find((item) => item.questionId === question.id)!;
      const option = index === 0 ? question.options.find((item) => item.id !== key.correctOptionId)! : question.options.find((item) => item.id === key.correctOptionId)!;
      await LessonSession.updateOne({ _id: created._id, userId: owner, "answers.questionId": { $ne: question.id } }, answerStorageUpdate({ questionId: question.id, optionId: option.id, correct: option.id === key.correctOptionId, answeredAt: new Date() }, true), { updatePipeline: true });
    }
    const pending = await LessonSession.findById(created._id).lean();
    expect(pending?.reviewSyncPending).toBe(true);
    expect(pending?.purgeAt).toBeUndefined();
    await syncDocumentQuizReview(String(owner), String(created._id));
    const revisions = (await Flashcard.find({ userId: owner, documentId }).lean()).map((card) => ({ id: card._id, revision: card.revision }));
    await LessonSession.updateOne({ _id: created._id, userId: owner }, { $set: { reviewSyncPending: true }, $unset: { purgeAt: 1 } });
    await syncDocumentQuizReview(String(owner), String(created._id));
    expect((await Flashcard.find({ userId: owner, documentId }).lean()).map((card) => ({ id: card._id, revision: card.revision }))).toEqual(revisions);
    const queue = await listDueFlashcards(String(owner), documentId);
    expect(queue.totalDue).toBeGreaterThan(0);
    const card = queue.cards[0];
    const input = { reviewId: randomUUID(), expectedRevision: card.revision, rating: "good" as const };
    const receipt = await reviewFlashcard(String(owner), card.id, input);
    expect(await reviewFlashcard(String(owner), card.id, input)).toEqual(receipt);
    await expect(reviewFlashcard(String(owner), card.id, { ...input, rating: "easy" })).rejects.toBeInstanceOf(FlashcardConflictError);
    await expect(reviewFlashcard(String(foreign), card.id, input)).rejects.toBeInstanceOf(FlashcardNotFoundError);
    const synced = await LessonSession.findById(created._id).lean();
    expect(synced?.reviewSyncPending).toBe(false);
    expect(synced?.purgeAt).toBeInstanceOf(Date);
    console.log("Live document learning validated:", { pages: extracted.pageCount, segments: extracted.segmentCount, material: generated.material.length, quizzes: generated.questions.length, cards: revisions.length, cacheReused: true, outboxIdempotent: true });
  } finally {
    await Flashcard.deleteMany({ userId: owner });
    await LessonSession.deleteMany({ userId: owner });
    if (documentId) await StudyDocument.deleteOne({ _id: documentId, userId: owner });
  }
});

test("live document rewards preserve the text path and cannot be farmed by replay", async () => {
  test.skip(process.env.LIVE_DOCUMENT_SMOKE !== "1", "Opt in to temporary isolated document reward data.");
  test.setTimeout(120_000);
  const { ensureDocumentStorage } = await import("../src/lib/documents");
  const { awardDocumentLesson } = await import("../src/lib/rewards");
  const { StudyDocument } = await import("../src/models/study-document");
  const { Gamification } = await import("../src/models/gamification");
  const { UserProgress } = await import("../src/models/user-progress");
  const owner = new Types.ObjectId();
  try {
    await ensureDocumentStorage();
    await UserProgress.create({ userId: owner, topic: "Topik teks yang sudah ada", completedStageIds: ["foundation"], activityDates: [] });
    await Gamification.create({ userId: owner });
    const seed = { userId: owner, name: "reward-smoke.pdf", kind: "pdf" as const, sha256: randomUUID().replace(/-/g, "").padEnd(64, "a"), pageCount: 1, segmentCount: 1, sources: [{ id: "s-0001", label: "Halaman 1", page: 1, text: "Sumber uji reward tidak mengubah topik atau tahap path teks pengguna." }] };
    const document = await StudyDocument.create(seed);
    const input = { userId: String(owner), documentId: String(document._id), lessonSessionId: String(new Types.ObjectId()), stageId: "document", topic: document.name, correctCount: 3, totalQuestions: 4 };
    const first = await awardDocumentLesson(input);
    expect(first.xpEarned).toBe(50);
    expect(first.progress.topic).toBe("Topik teks yang sudah ada");
    expect(first.progress.completedStageIds).toEqual(["foundation"]);
    const replay = await awardDocumentLesson(input);
    expect(replay.xpEarned).toBe(50);
    expect(replay.stats.xp).toBe(50);
    expect(replay.stats.lessonsCompleted).toBe(1);
    const repeat = await awardDocumentLesson({ ...input, lessonSessionId: String(new Types.ObjectId()) });
    expect(repeat.xpEarned).toBe(0);
    expect(repeat.stats.xp).toBe(50);
    await StudyDocument.deleteOne({ _id: document._id, userId: owner });
    const reuploaded = await StudyDocument.create(seed);
    const renamed = await awardDocumentLesson({ ...input, documentId: String(reuploaded._id), lessonSessionId: String(new Types.ObjectId()) });
    expect(renamed.xpEarned).toBe(0);
    expect(renamed.stats.xp).toBe(50);
    console.log("Document reward isolation validated:", { firstXp: 50, replayCredit: 0, textPathPreserved: true });
  } finally {
    await StudyDocument.deleteMany({ userId: owner });
    await Gamification.deleteMany({ userId: owner });
    await UserProgress.deleteMany({ userId: owner });
  }
});
