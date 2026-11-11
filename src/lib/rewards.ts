import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { refreshHearts, toDashboardStats } from "@/lib/dashboard";
import { Gamification } from "@/models/gamification";
import { UserProgress } from "@/models/user-progress";
import { StudyDocument } from "@/models/study-document";
import type { DashboardProgress } from "@/types/learning";

type AwardLessonInput = {
  userId: string;
  lessonSessionId: string;
  stageId: string;
  topic: string;
  correctCount: number;
  totalQuestions: number;
};

function utcDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export async function awardCompletedLesson(input: AwardLessonInput) {
  await connectToDatabase();
  const userId = new Types.ObjectId(input.userId);
  const today = utcDate();
  const yesterday = utcDate(-1);

  await UserProgress.updateOne(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  const firstCompletionResult = await UserProgress.updateOne(
    { userId, completedStageIds: { $ne: input.stageId } },
    {
      $set: { topic: input.topic },
      $addToSet: { completedStageIds: input.stageId, activityDates: today },
    },
  );
  const firstCompletion = firstCompletionResult.modifiedCount === 1;
  if (!firstCompletion) {
    await UserProgress.updateOne(
      { userId },
      { $set: { topic: input.topic }, $addToSet: { activityDates: today } },
    );
  }

  const currentStats = await refreshHearts(input.userId);
  const withAwards = await Gamification.findById(currentStats._id).select("+awardedSessionIds").lean();
  if (!withAwards) throw new Error("Gamification stats disappeared during reward calculation");

  const correct = Math.max(0, Math.min(input.totalQuestions, input.correctCount));
  const wrong = input.totalQuestions - correct;
  const xpEarned = firstCompletion ? 20 + correct * 10 : correct * 5;
  const alreadyAwarded = withAwards.awardedSessionIds.includes(input.lessonSessionId);

  let updatedStats = currentStats;
  if (!alreadyAwarded) {
    const nextStreak =
      currentStats.lastActivityDate === today
        ? currentStats.streak
        : currentStats.lastActivityDate === yesterday
          ? currentStats.streak + 1
          : 1;
    const nextXp = currentStats.xp + xpEarned;
    const setValues: Record<string, unknown> = {
      hearts: Math.max(0, currentStats.hearts - wrong),
      streak: nextStreak,
      longestStreak: Math.max(currentStats.longestStreak, nextStreak),
      lastActivityDate: today,
      league: nextXp >= 5_000 ? "Diamond" : "Sapphire",
    };
    if (wrong > 0) setValues.heartsUpdatedAt = new Date();

    const awarded = await Gamification.findOneAndUpdate(
      { userId, awardedSessionIds: { $ne: input.lessonSessionId } },
      {
        $set: setValues,
        $inc: { xp: xpEarned, lessonsCompleted: firstCompletion ? 1 : 0 },
        $push: { awardedSessionIds: { $each: [input.lessonSessionId], $slice: -100 } },
      },
      { returnDocument: "after" },
    );
    if (awarded) updatedStats = awarded;
    else {
      const existingAward = await Gamification.findOne({ userId });
      if (existingAward) updatedStats = existingAward;
    }
  }

  const progressDocument = await UserProgress.findOne({ userId }).lean();
  if (!progressDocument) throw new Error("User progress disappeared during reward calculation");
  const progress: DashboardProgress = {
    topic: progressDocument.topic,
    completedStageIds: [...progressDocument.completedStageIds],
    activityDates: [...progressDocument.activityDates],
  };

  return {
    xpEarned: alreadyAwarded ? 0 : xpEarned,
    score: Math.round((correct / input.totalQuestions) * 100),
    stats: toDashboardStats(updatedStats),
    progress,
  };
}

export async function awardDocumentLesson(input: AwardLessonInput & { documentId: string }) {
  await connectToDatabase();
  const userId = new Types.ObjectId(input.userId);
  const document = await StudyDocument.findOne({ _id: input.documentId, userId, status: "ready" }).lean();
  if (!document) throw new Error("Document is unavailable");
  const today = utcDate();
  const yesterday = utcDate(-1);
  await UserProgress.updateOne({ userId }, { $setOnInsert: { userId }, $addToSet: { activityDates: today } }, { upsert: true, setDefaultsOnInsert: true });
  await refreshHearts(input.userId);
  const correct = Math.max(0, Math.min(input.totalQuestions, input.correctCount));
  const wrong = input.totalQuestions - correct;
  const xp = 20 + correct * 10;
  const score = Math.round(correct / input.totalQuestions * 100);
  const streak = { $cond: [{ $eq: ["$lastActivityDate", today] }, "$streak", { $cond: [{ $eq: ["$lastActivityDate", yesterday] }, { $add: ["$streak", 1] }, 1] }] };

  // The first reward for this file hash and its receipt are committed in one stats write.
  const awarded = await Gamification.findOneAndUpdate({ userId, "documentAwards.hash": { $ne: document.sha256 }, $expr: { $lt: [{ $size: { $ifNull: ["$documentAwards", []] } }, 10000] } }, [
    { $set: { xp: { $add: ["$xp", xp] }, lessonsCompleted: { $add: ["$lessonsCompleted", 1] }, hearts: { $max: [0, { $subtract: ["$hearts", wrong] }] }, heartsUpdatedAt: wrong > 0 ? new Date() : "$heartsUpdatedAt", streak, lastActivityDate: today, documentAwards: { $concatArrays: [{ $ifNull: ["$documentAwards", []] }, [{ hash: document.sha256, sessionId: input.lessonSessionId, xpEarned: xp, score }]] } } },
    { $set: { longestStreak: { $max: ["$longestStreak", "$streak"] }, league: { $cond: [{ $gte: ["$xp", 5000] }, "Diamond", "Sapphire"] } } },
  ], { returnDocument: "after", updatePipeline: true }).select("+documentAwards").lean();
  if (!awarded) {
    await Gamification.updateOne({ userId }, [{ $set: { streak, lastActivityDate: today } }, { $set: { longestStreak: { $max: ["$longestStreak", "$streak"] } } }], { updatePipeline: true });
  }
  const stats = awarded ?? await Gamification.findOne({ userId }).select("+documentAwards").lean();
  const progress = await UserProgress.findOne({ userId }).lean();
  if (!stats || !progress) throw new Error("Document reward state is unavailable");
  await StudyDocument.updateOne({ _id: input.documentId, userId, status: "ready" }, { $set: { completedAt: new Date() } });
  const receipt = (stats.documentAwards ?? []).find((item) => item.hash === document.sha256 && item.sessionId === input.lessonSessionId);
  return { xpEarned: receipt?.xpEarned ?? 0, score, stats: toDashboardStats(stats), progress: { topic: progress.topic, completedStageIds: [...progress.completedStageIds], activityDates: [...progress.activityDates] } };
}
