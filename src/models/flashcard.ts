import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { MAX_FLASHCARD_EVENTS, type FlashcardEventReceipt } from "@/lib/flashcard-events";
import { MAX_REVIEW_INTERVAL_DAYS, MIN_REVIEW_EASE, RECALL_RATINGS, type ReviewSchedule } from "@/lib/review-schedule";

const integer = { validator: (value: number | null | undefined) => value == null || Number.isSafeInteger(value), message: "Must be a safe integer" };
const scheduleFields = {
  dueAt: { type: Date, required: true },
  intervalDays: { type: Number, required: true, min: 0, max: MAX_REVIEW_INTERVAL_DAYS },
  repetitions: { type: Number, required: true, min: 0, validate: integer },
  ease: { type: Number, required: true, min: MIN_REVIEW_EASE },
  lapses: { type: Number, required: true, min: 0, validate: integer },
  lastReviewedAt: { type: Date, default: null },
  revision: { type: Number, required: true, min: 0, validate: integer },
} as const;

const scheduleSchema = new Schema<ReviewSchedule>(scheduleFields, { _id: false });
const receiptSchema = new Schema<FlashcardEventReceipt>({
  id: { type: String, required: true, maxlength: 180 },
  kind: { type: String, enum: ["review", "quiz"], required: true },
  rating: { type: String, enum: RECALL_RATINGS, default: null },
  expectedRevision: { type: Number, min: 0, validate: integer, default: null },
  correct: { type: Boolean, default: null },
  result: { type: scheduleSchema, required: true },
}, { _id: false });

const sourceReferenceSchema = new Schema({
  documentId: { type: String, required: true },
  segmentId: { type: String, required: true },
  label: { type: String, required: true },
  page: { type: Number, min: 1, validate: integer },
}, { _id: false });

const flashcardSchema = new Schema({
  _id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  documentId: { type: Schema.Types.ObjectId, ref: "StudyDocument", required: true },
  templateId: { type: String, required: true, maxlength: 128 },
  materialIndex: { type: Number, required: true, min: 0, max: 3, validate: integer },
  question: { type: String, required: true, maxlength: 200 },
  answer: { type: String, required: true, maxlength: 400 },
  sourceRefs: { type: [sourceReferenceSchema], required: true },
  ...scheduleFields,
  events: { type: [receiptSchema], required: true, select: false, validate: { validator: (events: FlashcardEventReceipt[]) => events.length <= MAX_FLASHCARD_EVENTS, message: "Flashcard event limit reached" } },
}, { timestamps: true, versionKey: false, autoIndex: false, autoCreate: false });

flashcardSchema.index({ userId: 1, dueAt: 1, _id: 1 });
flashcardSchema.index({ userId: 1, documentId: 1, dueAt: 1, _id: 1 });
flashcardSchema.index({ userId: 1, documentId: 1, templateId: 1, materialIndex: 1 });

export type FlashcardRecord = InferSchemaType<typeof flashcardSchema>;
export const Flashcard = (models.Flashcard as Model<FlashcardRecord> | undefined) ?? model<FlashcardRecord>("Flashcard", flashcardSchema);
export default Flashcard;
