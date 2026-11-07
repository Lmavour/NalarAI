import "server-only";
import { Types } from "mongoose";
import { getAuthSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Gamification } from "@/models/gamification";
import { User } from "@/models/user";
import { UserProgress } from "@/models/user-progress";
import type { DashboardData, DashboardStats, LeagueTier } from "@/types/learning";

const HEART_REFILL_MS = 4 * 60 * 60 * 1000;

export function toDashboardStats(stats: {
  xp: number;
  hearts: number;
  streak: number;
  longestStreak: number;
  lessonsCompleted: number;
  league: string;
}): DashboardStats {
  return {
    xp: stats.xp,
    hearts: stats.hearts,
    streak: stats.streak,
    longestStreak: stats.longestStreak,
    lessonsCompleted: stats.lessonsCompleted,
    league: stats.league as LeagueTier,
  };
}

export function displayNameFromEmail(email: string) {
  const local = email.split("@", 1)[0] || "Pelajar";
  const words = local.replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const name = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  return name || "Pelajar";
}

export async function refreshHearts(userId: string) {
  const objectId = new Types.ObjectId(userId);
  const stats = await Gamification.findOneAndUpdate(
    { userId: objectId },
    { $setOnInsert: { userId: objectId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (!stats) throw new Error("Unable to initialize gamification stats");

  const elapsed = Date.now() - stats.heartsUpdatedAt.getTime();
  const regenerated = Math.floor(elapsed / HEART_REFILL_MS);
  if (regenerated > 0 && stats.hearts < 5) {
    stats.hearts = Math.min(5, stats.hearts + regenerated);
    stats.heartsUpdatedAt = new Date(stats.heartsUpdatedAt.getTime() + regenerated * HEART_REFILL_MS);
    await stats.save();
  } else if (stats.hearts >= 5 && elapsed >= HEART_REFILL_MS) {
    stats.heartsUpdatedAt = new Date();
    await stats.save();
  }
  return stats;
}

export async function getAuthenticatedDashboard(): Promise<DashboardData | null> {
  const session = await getAuthSession();
  if (!session) return null;
  await connectToDatabase();

  const user = await User.findById(session.userId).lean();
  if (!user) return null;

  const [progress, stats] = await Promise.all([
    UserProgress.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).lean(),
    refreshHearts(String(user._id)),
  ]);
  if (!progress) throw new Error("Unable to initialize user progress");

  return {
    user: {
      email: user.email,
      displayName: displayNameFromEmail(user.email),
      joinedAt: user.createdAt.toISOString(),
    },
    stats: toDashboardStats(stats),
    progress: {
      topic: progress.topic,
      completedStageIds: [...progress.completedStageIds],
      activityDates: [...progress.activityDates],
    },
  };
}
