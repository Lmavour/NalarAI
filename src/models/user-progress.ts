import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

const userProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    topic: { type: String, required: true, default: "Berpikir kritis", maxlength: 80 },
    completedStageIds: { type: [String], default: [] },
    activityDates: { type: [String], default: [] },
  },
  { timestamps: true },
);

userProgressSchema.index({ userId: 1 }, { unique: true });

export type UserProgressDocument = InferSchemaType<typeof userProgressSchema>;
export const UserProgress =
  (models.UserProgress as Model<UserProgressDocument> | undefined) ?? model<UserProgressDocument>("UserProgress", userProgressSchema);
