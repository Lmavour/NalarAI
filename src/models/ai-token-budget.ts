import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";
import { GROQ_MODELS } from "@/lib/ai-config";

const reservationSchema = new Schema({
  id: { type: String, required: true, maxlength: 128 },
  amount: { type: Number, required: true, min: 1 },
  state: { type: String, enum: ["reserved", "settled", "charged", "overrun"], required: true },
  createdAt: { type: Date, required: true },
  settledAt: Date,
  chargedTokens: { type: Number, min: 0 },
  inputTokens: { type: Number, min: 0 },
  outputTokens: { type: Number, min: 0 },
}, { _id: false });

const aiTokenBudgetSchema = new Schema({
  _id: { type: String, required: true },
  provider: { type: String, enum: ["groq"], required: true },
  modelId: { type: String, enum: GROQ_MODELS, required: true },
  utcDay: { type: String, required: true },
  accountedTokens: { type: Number, required: true, min: 0 },
  reservedTokens: { type: Number, required: true, min: 0 },
  measuredInputTokens: { type: Number, required: true, min: 0 },
  measuredOutputTokens: { type: Number, required: true, min: 0 },
  reservationCount: { type: Number, required: true, min: 0 },
  reservations: { type: [reservationSchema], required: true },
  blocked: { type: Boolean, required: true },
  lastReservedAt: { type: Date, required: true },
  overrunTokens: Number,
  purgeAt: { type: Date, required: true },
}, { versionKey: false, autoIndex: false, autoCreate: false });

aiTokenBudgetSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
aiTokenBudgetSchema.index({ "reservations.id": 1 }, { unique: true, partialFilterExpression: { "reservations.id": { $exists: true } } });

export type AiTokenBudgetDocument = InferSchemaType<typeof aiTokenBudgetSchema>;
export const AiTokenBudget = (models.AiTokenBudget as Model<AiTokenBudgetDocument> | undefined) ?? model<AiTokenBudgetDocument>("AiTokenBudget", aiTokenBudgetSchema);
