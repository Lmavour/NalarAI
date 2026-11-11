import type { RecallRating } from "../types/documents";
import { RECALL_RATINGS, scheduleQuizOutcome, scheduleReview, type ReviewSchedule } from "./review-schedule";

export const MAX_FLASHCARD_EVENTS = 4096;
export const MAX_FLASHCARD_CAS_ATTEMPTS = 3;

export class FlashcardNotFoundError extends Error {
  constructor() { super("Flashcard or ready document not found"); this.name = "FlashcardNotFoundError"; }
}

export class FlashcardInputError extends Error {
  constructor() { super("Invalid flashcard input"); this.name = "FlashcardInputError"; }
}

export class FlashcardConflictError extends Error {
  constructor(public readonly code: "revision_changed" | "event_payload_changed" | "event_limit" | "concurrent_update" | "cards_not_ready") {
    super(code === "event_payload_changed" ? "Event ID was already used with a different payload" : code === "event_limit" ? "Flashcard event limit reached" : code === "cards_not_ready" ? "Document flashcards are not ready" : "Flashcard revision conflict");
    this.name = "FlashcardConflictError";
  }
}

export type ReviewFlashcardInput = { reviewId: string; expectedRevision: number; rating: RecallRating };
export type DocumentQuizAnswer = { materialIndex: number; correct: boolean };
export type FlashcardEvent =
  | { id: string; kind: "review"; rating: RecallRating; expectedRevision: number }
  | { id: string; kind: "quiz"; correct: boolean };

export type FlashcardEventReceipt = {
  id: string;
  kind: "review" | "quiz";
  rating: RecallRating | null;
  expectedRevision: number | null;
  correct: boolean | null;
  result: ReviewSchedule;
};

export type FlashcardEventSnapshot = ReviewSchedule & { events: readonly FlashcardEventReceipt[] };

export interface FlashcardEventStore<T extends FlashcardEventSnapshot> {
  read(): Promise<T | null>;
  // The adapter must guard revision, event absence, and event capacity in one atomic write.
  compareAndSwap(snapshot: T, receipt: FlashcardEventReceipt): Promise<boolean>;
}

/** A completed quiz has one concept outcome: any wrong answer for that concept wins. */
export function aggregateDocumentQuizAnswers(answers: DocumentQuizAnswer[]): Map<number, boolean> {
  if (!Array.isArray(answers) || answers.length === 0) throw new FlashcardInputError();
  const outcomes = new Map<number, boolean>();
  for (const answer of answers) {
    if (!answer || !Number.isInteger(answer.materialIndex) || answer.materialIndex < 0 || answer.materialIndex > 3 || typeof answer.correct !== "boolean") throw new FlashcardInputError();
    outcomes.set(answer.materialIndex, (outcomes.get(answer.materialIndex) ?? true) && answer.correct);
  }
  return outcomes;
}

/** Environment-free event orchestration; receipts and scheduling must share a document. */
export async function applyFlashcardEvent<T extends FlashcardEventSnapshot>(store: FlashcardEventStore<T>, input: FlashcardEvent, now: Date): Promise<{ snapshot: T; receipt: FlashcardEventReceipt; applied: boolean }> {
  if (!input || typeof input.id !== "string" || input.id.length === 0 || input.id.length > 180 || !["review", "quiz"].includes(input.kind)) throw new FlashcardInputError();
  if (input.kind === "review" && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 || !RECALL_RATINGS.includes(input.rating))) throw new FlashcardInputError();
  if (input.kind === "quiz" && typeof input.correct !== "boolean") throw new FlashcardInputError();
  const event = input.kind === "review" ? { ...input, id: input.id.toLowerCase() } : input;

  for (let attempts = 0; ; attempts += 1) {
    const snapshot = await store.read();
    if (!snapshot) throw new FlashcardNotFoundError();
    const prior = snapshot.events.find((receipt) => receipt.id === event.id);
    if (prior) {
      const samePayload = prior.kind === event.kind && (event.kind === "review" ? prior.rating === event.rating && prior.expectedRevision === event.expectedRevision : prior.correct === event.correct);
      if (!samePayload) throw new FlashcardConflictError("event_payload_changed");
      return { snapshot, receipt: prior, applied: false };
    }
    // Receipt lookup deliberately precedes revision, capacity, and retry-limit checks.
    if (event.kind === "review" && event.expectedRevision !== snapshot.revision) throw new FlashcardConflictError("revision_changed");
    if (snapshot.events.length >= MAX_FLASHCARD_EVENTS) throw new FlashcardConflictError("event_limit");
    if (attempts >= MAX_FLASHCARD_CAS_ATTEMPTS) throw new FlashcardConflictError("concurrent_update");
    const receipt: FlashcardEventReceipt = {
      id: event.id,
      kind: event.kind,
      rating: event.kind === "review" ? event.rating : null,
      expectedRevision: event.kind === "review" ? event.expectedRevision : null,
      correct: event.kind === "quiz" ? event.correct : null,
      result: event.kind === "review" ? scheduleReview(snapshot, event.rating, now) : scheduleQuizOutcome(snapshot, event.correct, now),
    };
    if (await store.compareAndSwap(snapshot, receipt)) return { snapshot, receipt, applied: true };
  }
}
