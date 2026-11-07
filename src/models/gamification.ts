import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const gamificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    xp: { type: Number, required: true, default: 0, min: 0 },
    hearts: { type: Number, required: true, default: 5, min: 0, max: 5 },
    heartsUpdatedAt: { type: Date, required: true, default: Date.now },
    streak: { type: Number, required: true, default: 0, min: 0 },
    longestStreak: { type: Number, required: true, default: 0, min: 0 },
    lastActivityDate: { type: String, default: null },
    lessonsCompleted: { type: Number, required: true, default: 0, min: 0 },
    league: { type: String, enum: ["Bronze", "Silver", "Sapphire", "Diamond"], default: "Sapphire" },
    awardedSessionIds: { type: [String], default: [], select: false },
  },
  { timestamps: true },
);

gamificationSchema.index({ userId: 1 }, { unique: true });
gamificationSchema.index({ league: 1, xp: -1 });

export type GamificationDocument = InferSchemaType<typeof gamificationSchema>;
export const Gamification =
  (models.Gamification as Model<GamificationDocument> | undefined) ?? model<GamificationDocument>("Gamification", gamificationSchema);
