import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const authSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true },
    secretHash: { type: String, required: true, select: false },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastSeenAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

authSessionSchema.index({ sessionId: 1 }, { unique: true });
authSessionSchema.index({ userId: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AuthSessionDocument = InferSchemaType<typeof authSessionSchema>;
export const AuthSession =
  (models.AuthSession as Model<AuthSessionDocument> | undefined) ?? model<AuthSessionDocument>("AuthSession", authSessionSchema);
