import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const sourceReferenceSchema = new Schema({ documentId: String, segmentId: String, label: String, page: Number }, { _id: false });

const materialSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    keyTakeaway: { type: String, required: true },
    sourceRefs: { type: [sourceReferenceSchema], default: undefined },
  },
  { _id: false },
);

const optionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    materialIndex: { type: Number, min: 0, max: 3 },
    sourceRefs: { type: [sourceReferenceSchema], default: undefined },
  },
  { _id: false },
);

const answerKeySchema = new Schema(
  {
    questionId: { type: String, required: true },
    correctOptionId: { type: String, required: true },
    explanation: { type: String, required: true },
    sourceRefs: { type: [sourceReferenceSchema], default: undefined },
  },
  { _id: false },
);

const submittedAnswerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    optionId: { type: String, required: true },
    correct: { type: Boolean, required: true },
    answeredAt: { type: Date, required: true },
  },
  { _id: false },
);

const generationUsageSchema = new Schema({
  inputTokens: { type: Number, required: true, min: 0 },
  outputTokens: { type: Number, required: true, min: 0 },
  totalTokens: { type: Number, required: true, min: 0 },
}, { _id: false });

const generationSchema = new Schema({
  provider: { type: String, enum: ["groq", "gemini"], required: true },
  model: { type: String, required: true, maxlength: 120 },
  usage: { type: generationUsageSchema, default: null },
  reservationId: String,
  quotaDay: String,
  cached: Boolean,
}, { _id: false });

const lessonSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    stageId: { type: String, required: true, maxlength: 40 },
    topic: { type: String, required: true, maxlength: 80 },
    documentId: { type: Schema.Types.ObjectId, ref: "StudyDocument" },
    documentName: String,
    templateId: String,
    title: { type: String, required: true, maxlength: 120 },
    overview: { type: String, required: true, maxlength: 600 },
    estimatedMinutes: { type: Number, required: true, min: 3, max: 15 },
    material: { type: [materialSchema], required: true },
    questions: { type: [questionSchema], required: true },
    answerKey: { type: [answerKeySchema], required: true, select: false },
    answers: { type: [submittedAnswerSchema], default: [] },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    completionReceipt: { type: Schema.Types.Mixed, default: null, select: false },
    generation: { type: generationSchema, default: null, select: false },
    expiresAt: { type: Date, required: true },
    reviewSyncPending: { type: Boolean, default: false },
    reviewSyncedAt: Date,
    purgeAt: Date,
  },
  { timestamps: true },
);

lessonSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
lessonSessionSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
lessonSessionSchema.index({ userId: 1, reviewSyncPending: 1 });

export type LessonSessionDocument = InferSchemaType<typeof lessonSessionSchema>;
export const LessonSession =
  (models.LessonSession as Model<LessonSessionDocument> | undefined) ?? model<LessonSessionDocument>("LessonSession", lessonSessionSchema);
