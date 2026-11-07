import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Types } from "mongoose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSessionPepper } from "@/lib/env";
import { AuthSession } from "@/models/auth-session";

const SESSION_COOKIE = "nalar_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).update(".").update(getSessionPepper()).digest("hex");
}

function parseToken(token: string | undefined) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{32,100}$/.test(parts[1])) return null;
  return { sessionId: parts[0], secret: parts[1] };
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function createAuthSession(userId: string) {
  await connectToDatabase();
  const sessionId = randomBytes(18).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  await AuthSession.create({
    sessionId,
    secretHash: hashSecret(secret),
    userId: new Types.ObjectId(userId),
    lastSeenAt: now,
    expiresAt,
  });

  return `${sessionId}.${secret}`;
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, cookieOptions());
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function getAuthSession() {
  const cookieStore = await cookies();
  const parsed = parseToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!parsed) return null;

  await connectToDatabase();
  const session = await AuthSession.findOne({
    sessionId: parsed.sessionId,
    expiresAt: { $gt: new Date() },
  })
    .select("+secretHash")
    .lean();
  if (!session) return null;

  const expected = Buffer.from(session.secretHash, "hex");
  const actual = Buffer.from(hashSecret(parsed.secret), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  if (Date.now() - session.lastSeenAt.getTime() > 15 * 60 * 1000) {
    await AuthSession.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  }

  return { sessionId: session.sessionId, userId: String(session.userId) };
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const parsed = parseToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!parsed) return;
  await connectToDatabase();
  await AuthSession.deleteOne({ sessionId: parsed.sessionId });
}
