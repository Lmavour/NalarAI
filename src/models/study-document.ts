import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const sourceSchema = new Schema({ id: { type: String, required: true }, label: { type: String, required: true }, text: { type: String, required: true, maxlength: 1800 }, page: Number, section: String }, { _id: false });

const studyDocumentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, maxlength: 160 },
  kind: { type: String, enum: ["pdf", "docx", "image"], required: true },
  extractionMode: { type: String, enum: ["text", "ocr"], default: "text", required: true },
  sha256: { type: String, required: true },
  pageCount: { type: Number, required: true, min: 1, max: 40 },
  segmentCount: { type: Number, required: true },
  sources: { type: [sourceSchema], required: true, select: false },
  status: { type: String, enum: ["ready", "deleted"], default: "ready" },
  templateId: String,
  lessonTemplate: { type: Schema.Types.Mixed, default: null, select: false },
  templateModel: String,
  generationLeaseId: String,
  generationLeaseUntil: Date,
  completedAt: Date,
}, { timestamps: true, versionKey: false, autoIndex: false, autoCreate: false });

studyDocumentSchema.index({ userId: 1, sha256: 1, extractionMode: 1 }, { unique: true });
studyDocumentSchema.index({ userId: 1, createdAt: -1 });

export type StudyDocumentRecord = InferSchemaType<typeof studyDocumentSchema>;
export const StudyDocument = (models.StudyDocument as Model<StudyDocumentRecord> | undefined) ?? model<StudyDocumentRecord>("StudyDocument", studyDocumentSchema);
