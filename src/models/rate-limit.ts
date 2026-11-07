import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const rateLimitSchema = new Schema(
  {
    key: { type: String, required: true },
    count: { type: Number, required: true, default: 1 },
    resetAt: { type: Date, required: true },
  },
  { versionKey: false },
);

rateLimitSchema.index({ key: 1 }, { unique: true });
rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitDocument = InferSchemaType<typeof rateLimitSchema>;
export const RateLimit =
  (models.RateLimit as Model<RateLimitDocument> | undefined) ?? model<RateLimitDocument>("RateLimit", rateLimitSchema);
