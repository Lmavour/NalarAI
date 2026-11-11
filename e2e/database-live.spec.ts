import { expect, test } from "@playwright/test";

test("live database connector authenticates and reuses a ready connection", async () => {
  test.skip(process.env.LIVE_DATABASE_SMOKE !== "1", "Opt in to a read-only database connection check.");
  test.setTimeout(75_000);
  const { connectToDatabase } = await import("../src/lib/db");
  const { AuthSession } = await import("../src/models/auth-session");
  const started = Date.now();
  const [first, second] = await Promise.all([connectToDatabase(), connectToDatabase()]);
  expect(first).toBe(second);
  expect(first.connection.readyState).toBe(1);
  const result = await first.connection.db!.command({ ping: 1 }, { timeoutMS: 5000 });
  expect(result.ok).toBe(1);
  const absent = await AuthSession.findOne({ sessionId: "database-smoke-nonexistent-session" }).select("_id").lean();
  expect(absent).toBeNull();
  expect(await connectToDatabase()).toBe(first);
  console.log("Database connection validated:", { readyState: first.connection.readyState, ping: result.ok, modelQuery: true, elapsedMs: Date.now() - started });
});
