import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { documentLessonSchema, resolveSourceRefs, type DocumentLesson } from "@/lib/document-content";
import { aggregateDocumentQuizAnswers, applyFlashcardEvent, FlashcardConflictError, FlashcardInputError, FlashcardNotFoundError, MAX_FLASHCARD_EVENTS, type DocumentQuizAnswer, type FlashcardEvent, type FlashcardEventSnapshot, type ReviewFlashcardInput } from "@/lib/flashcard-events";
import { createReviewSchedule, type ReviewSchedule } from "@/lib/review-schedule";
import { Flashcard, type FlashcardRecord } from "@/models/flashcard";
import { StudyDocument } from "@/models/study-document";
import type { FlashcardDto, SourceSegment } from "@/types/documents";

export { FlashcardConflictError, FlashcardInputError, FlashcardNotFoundError } from "@/lib/flashcard-events";
export type { DocumentQuizAnswer, ReviewFlashcardInput } from "@/lib/flashcard-events";

const WRITE_CONCERN = { w: "majority" as const, j: true, wtimeout: 5000 };
let indexPromise: Promise<unknown> | null = null;

/** Additive provisioning is explicit because production disables automatic indexes. */
export async function ensureFlashcardIndexes(): Promise<void> {
  await connectToDatabase();
  const pending = indexPromise ??= Flashcard.createIndexes();
  try {
    await pending;
  } catch (error) {
    if (indexPromise === pending) indexPromise = null;
    throw error;
  }
}

function objectId(value: string) {
  if (typeof value !== "string" || !/^[0-9a-f]{24}$/i.test(value)) throw new FlashcardNotFoundError();
  return new Types.ObjectId(value);
}

function identifier(value: string) {
  if (typeof value !== "string" || value.length === 0 || value.length > 128 || value.trim() !== value || value.includes("\0")) throw new FlashcardInputError();
  return value;
}

function parentFilter(userId: Types.ObjectId, documentId: Types.ObjectId, templateId?: string) {
  return { _id: documentId, userId, status: "ready" as const, ...(templateId === undefined ? {} : { templateId }) };
}

type PublicCard = Pick<FlashcardRecord, "_id" | "documentId" | "question" | "answer" | "sourceRefs" | "dueAt" | "revision" | "intervalDays">;

function toDto(card: PublicCard, documentName: string, schedule: Pick<ReviewSchedule, "dueAt" | "revision" | "intervalDays"> = card): FlashcardDto {
  return {
    id: card._id,
    documentId: card.documentId.toString(),
    documentName,
    question: card.question,
    answer: card.answer,
    sourceRefs: card.sourceRefs.map((ref) => ({ documentId: ref.documentId, segmentId: ref.segmentId, label: ref.label, ...(ref.page == null ? {} : { page: ref.page }) })),
    dueAt: schedule.dueAt.toISOString(),
    revision: schedule.revision,
    intervalDays: schedule.intervalDays,
  };
}

export async function ensureDocumentFlashcards({ userId, documentId, templateId, lesson, sources }: { userId: string; documentId: string; templateId: string; lesson: DocumentLesson; sources: SourceSegment[] }): Promise<void> {
  const owner = objectId(userId);
  const document = objectId(documentId);
  identifier(templateId);
  await ensureFlashcardIndexes();
  if (!await StudyDocument.exists(parentFilter(owner, document, templateId))) throw new FlashcardNotFoundError();
  const now = new Date();
  const cards = lesson.flashcards.map((card, index) => {
    const material = lesson.material[card.materialIndex];
    if (!material) throw new FlashcardInputError();
    return {
      _id: `${document.toString()}:${templateId}:${index}`,
      userId: owner,
      documentId: document,
      templateId,
      materialIndex: card.materialIndex,
      question: card.question,
      answer: card.answer,
      sourceRefs: resolveSourceRefs(document.toString(), material.sourceIds, sources),
      ...createReviewSchedule(now),
      events: [],
    };
  });
  await Promise.all(cards.map(async (card) => {
    try {
      const result = await Flashcard.updateOne({ _id: card._id }, { $setOnInsert: card }, { upsert: true, runValidators: true, writeConcern: WRITE_CONCERN });
      if (!result.acknowledged) throw new Error("Flashcard creation was not acknowledged");
    } catch (error) {
      const duplicate = error as { code?: number; keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> };
      const duplicateId = duplicate.code === 11000 && (duplicate.keyPattern?._id === 1 || duplicate.keyValue?._id === card._id);
      if (!duplicateId || !await Flashcard.exists({ _id: card._id, userId: owner, documentId: document, templateId }).readConcern("majority")) throw error;
    }
  }));
}

export async function listDueFlashcards(userId: string, documentId?: string): Promise<{ cards: FlashcardDto[]; totalDue: number }> {
  const owner = objectId(userId);
  const document = documentId === undefined ? undefined : objectId(documentId);
  await ensureFlashcardIndexes();
  if (document && !await StudyDocument.exists(parentFilter(owner, document))) throw new FlashcardNotFoundError();
  type DueResult = { cards: Array<PublicCard & { documentName: string }>; count: Array<{ total: number }> };
  const [result] = await Flashcard.aggregate<DueResult>([
    { $match: { userId: owner, dueAt: { $lte: new Date() }, ...(document ? { documentId: document } : {}) } },
    { $sort: { dueAt: 1, _id: 1 } },
    { $lookup: { from: StudyDocument.collection.name, let: { parentId: "$documentId" }, pipeline: [
      { $match: { userId: owner, status: "ready", $expr: { $eq: ["$_id", "$$parentId"] } } },
      { $project: { name: 1 } },
    ], as: "document" } },
    { $unwind: "$document" },
    { $facet: {
      cards: [{ $limit: 20 }, { $project: { _id: 1, documentId: 1, question: 1, answer: 1, sourceRefs: 1, dueAt: 1, revision: 1, intervalDays: 1, documentName: "$document.name" } }],
      count: [{ $count: "total" }],
    } },
  ]);
  return { cards: (result?.cards ?? []).map((card) => toDto(card, card.documentName)), totalDue: result?.count[0]?.total ?? 0 };
}

type CardSnapshot = FlashcardEventSnapshot & FlashcardRecord & { documentName: string };

async function applyOwnedCardEvent(owner: Types.ObjectId, cardId: string, event: FlashcardEvent, now: Date, target?: { documentId: Types.ObjectId; templateId: string; materialIndex: number }) {
  const filter = { _id: cardId, userId: owner, ...target };
  return applyFlashcardEvent<CardSnapshot>({
    async read() {
      const card = await Flashcard.findOne(filter).select("+events").readConcern("majority").lean();
      if (!card) return null;
      const parent = await StudyDocument.findOne(parentFilter(owner, card.documentId, target?.templateId)).select("name").lean();
      if (!parent) return null;
      return { ...card, lastReviewedAt: card.lastReviewedAt ?? null, documentName: parent.name };
    },
    async compareAndSwap(snapshot, receipt) {
      if (!await StudyDocument.exists(parentFilter(owner, snapshot.documentId, target?.templateId))) throw new FlashcardNotFoundError();
      const result = await Flashcard.updateOne({
        ...filter,
        documentId: snapshot.documentId,
        templateId: snapshot.templateId,
        revision: snapshot.revision,
        "events.id": { $ne: receipt.id },
        $expr: { $lt: [{ $size: "$events" }, MAX_FLASHCARD_EVENTS] },
      }, { $set: receipt.result, $push: { events: receipt } }, { upsert: false, runValidators: true, writeConcern: WRITE_CONCERN });
      if (!result.acknowledged) throw new Error("Flashcard update was not acknowledged");
      return result.modifiedCount === 1;
    },
  }, event, now);
}

export async function reviewFlashcard(userId: string, cardId: string, input: ReviewFlashcardInput): Promise<FlashcardDto> {
  const owner = objectId(userId);
  if (typeof cardId !== "string" || cardId.length === 0 || cardId.length > 180) throw new FlashcardNotFoundError();
  if (!input) throw new FlashcardInputError();
  await ensureFlashcardIndexes();
  const result = await applyOwnedCardEvent(owner, cardId, { id: input.reviewId, kind: "review", rating: input.rating, expectedRevision: input.expectedRevision }, new Date());
  if (!await StudyDocument.exists(parentFilter(owner, result.snapshot.documentId))) throw new FlashcardNotFoundError();
  return toDto(result.snapshot, result.snapshot.documentName, result.receipt.result);
}

export async function applyDocumentQuizOutcome({ userId, documentId, templateId, sessionId, answers }: { userId: string; documentId: string; templateId: string; sessionId: string; answers: DocumentQuizAnswer[] }): Promise<{ applied: number; alreadyApplied: number }> {
  const owner = objectId(userId);
  const document = objectId(documentId);
  identifier(templateId);
  identifier(sessionId);
  const outcomes = aggregateDocumentQuizAnswers(answers);
  await ensureFlashcardIndexes();
  const parent = await StudyDocument.findOne(parentFilter(owner, document, templateId)).select("+lessonTemplate").readConcern("majority").lean();
  if (!parent) throw new FlashcardNotFoundError();
  const parsed = documentLessonSchema.safeParse(parent.lessonTemplate);
  if (!parsed.success) throw new FlashcardConflictError("cards_not_ready");
  const now = new Date();
  let applied = 0;
  let alreadyApplied = 0;
  // Derive all target IDs from the durable template so partially created cards cannot be silently skipped.
  for (const [index, card] of parsed.data.flashcards.entries()) {
    const correct = outcomes.get(card.materialIndex);
    if (correct === undefined) continue;
    const result = await applyOwnedCardEvent(owner, `${document.toString()}:${templateId}:${index}`, { id: `quiz:${sessionId}:${card.materialIndex}`, kind: "quiz", correct }, now, { documentId: document, templateId, materialIndex: card.materialIndex });
    if (result.applied) applied += 1;
    else alreadyApplied += 1;
  }
  return { applied, alreadyApplied };
}
