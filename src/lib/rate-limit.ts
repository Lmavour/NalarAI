import "server-only";
import { createHash } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { RateLimit } from "@/models/rate-limit";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export async function consumeRateLimit(rawKey: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  await connectToDatabase();
  const key = createHash("sha256").update(rawKey).digest("hex");
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const existing = await RateLimit.findOne({ key }).lean();
  if (!existing || existing.resetAt <= now) {
    await RateLimit.updateOne({ key }, { $set: { count: 1, resetAt } }, { upsert: true });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000)),
    };
  }

  const result = await RateLimit.updateOne(
    { key, count: { $lt: limit }, resetAt: existing.resetAt },
    { $inc: { count: 1 } },
  );

  return {
    allowed: result.modifiedCount === 1,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000)),
  };
}
