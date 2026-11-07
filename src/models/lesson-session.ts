import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const materialSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    keyTakeaway: { type: String, required: true },
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
  },
  { _id: false },
);

const answerKeySchema = new Schema(
  {
    questionId: { type: String, required: true },
    correctOptionId: { type: String, required: true },
    explanation: { type: String, required: true },
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

const lessonSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    stageId: { type: String, required: true, maxlength: 40 },
    topic: { type: String, required: true, maxlength: 80 },
    title: { type: String, required: true, maxlength: 120 },
    overview: { type: String, required: true, maxlength: 600 },
    estimatedMinutes: { type: Number, required: true, min: 3, max: 15 },
    material: { type: [materialSchema], required: true },
    questions: { type: [questionSchema], required: true },
    answerKey: { type: [answerKeySchema], required: true, select: false },
    answers: { type: [submittedAnswerSchema], default: [] },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    completionReceipt: { type: Schema.Types.Mixed, default: null, select: false },
    expiresAt: { type: Date, required: true },
    purgeAt: { type: Date, required: true },
  },
  { timestamps: true },
);

lessonSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
lessonSessionSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export type LessonSessionDocument = InferSchemaType<typeof lessonSessionSchema>;
export const LessonSession =
  (models.LessonSession as Model<LessonSessionDocument> | undefined) ?? model<LessonSessionDocument>("LessonSession", lessonSessionSchema);
