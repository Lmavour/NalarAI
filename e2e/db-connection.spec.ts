import { expect, test } from "@playwright/test";
import { DatabaseUnavailableError, isDatabaseUnavailable, resolveDatabaseConnection, type DatabaseConnectionCache } from "../src/lib/db-connection";

type Connection = { ready: boolean; id: number };

function context() {
  const cache: DatabaseConnectionCache<Connection> = { connection: null, promise: null };
  let connects = 0;
  let resets = 0;
  const options = {
    connect: async () => ({ ready: true, id: ++connects }),
    isConnected: (connection: Connection) => connection.ready,
    reset: async () => { resets += 1; },
  };
  return { cache, options, connects: () => connects, resets: () => resets };
}

function transientError() {
  return Object.assign(new Error("private connection details"), { name: "MongooseServerSelectionError", reason: new Map([["internal", { secret: true }]]) });
}

test("ready connections are reused but resolved promises are not retained", async () => {
  const ctx = context();
  const first = await resolveDatabaseConnection(ctx.cache, ctx.options);
  expect(ctx.cache.connection).toBe(first);
  expect(ctx.cache.promise).toBeNull();
  expect(await resolveDatabaseConnection(ctx.cache, ctx.options)).toBe(first);
  expect(ctx.connects()).toBe(1);
  expect(ctx.resets()).toBe(1);
});

test("parallel requests share one connection initialization", async () => {
  const ctx = context();
  const values = await Promise.all(Array.from({ length: 30 }, () => resolveDatabaseConnection(ctx.cache, ctx.options)));
  expect(ctx.connects()).toBe(1);
  expect(values.every((value) => value === values[0])).toBe(true);
  expect(ctx.cache.promise).toBeNull();
});

test("a disconnected cached connection and legacy resolved promise are discarded", async () => {
  const ctx = context();
  const old = { ready: false, id: 99 };
  ctx.cache.connection = old;
  ctx.cache.promise = Promise.resolve(old);
  const connected = await resolveDatabaseConnection(ctx.cache, ctx.options);
  expect(connected.id).toBe(1);
  expect(connected).not.toBe(old);
  expect(ctx.cache.promise).toBeNull();
});

test("transient connection establishment retries once without retrying database writes", async () => {
  const ctx = context();
  let attempts = 0;
  ctx.options.connect = async () => { attempts += 1; if (attempts === 1) throw transientError(); return { ready: true, id: attempts }; };
  expect(await resolveDatabaseConnection(ctx.cache, ctx.options)).toEqual({ ready: true, id: 2 });
  expect(attempts).toBe(2);
  expect(ctx.resets()).toBe(2);
});

test("parallel failed callers share the same bounded retries and clean cache", async () => {
  const ctx = context();
  let attempts = 0;
  ctx.options.connect = async () => { attempts += 1; throw transientError(); };
  const outcomes = await Promise.allSettled(Array.from({ length: 20 }, () => resolveDatabaseConnection(ctx.cache, ctx.options)));
  expect(outcomes.every((outcome) => outcome.status === "rejected")).toBe(true);
  expect(attempts).toBe(2);
  expect(ctx.cache.connection).toBeNull();
  expect(ctx.cache.promise).toBeNull();
});

test("failure strips internal driver classes and private details", async () => {
  const ctx = context();
  ctx.options.connect = async () => { throw transientError(); };
  try {
    await resolveDatabaseConnection(ctx.cache, ctx.options);
    throw new Error("Expected database failure");
  } catch (error) {
    expect(error).toBeInstanceOf(DatabaseUnavailableError);
    const safe = error as DatabaseUnavailableError;
    expect(safe.message).not.toContain("private");
    expect("reason" in safe).toBe(false);
    expect("cause" in safe).toBe(false);
    expect(JSON.stringify(safe)).not.toContain("internal");
  }
});

test("configuration and authentication errors are not retried", async () => {
  const ctx = context();
  let attempts = 0;
  ctx.options.connect = async () => { attempts += 1; throw Object.assign(new Error("private configuration"), { name: "MongoServerError", code: 18 }); };
  await expect(resolveDatabaseConnection(ctx.cache, ctx.options)).rejects.toMatchObject({ name: "DatabaseUnavailableError", code: "DATABASE_UNAVAILABLE" });
  expect(attempts).toBe(1);
  expect(ctx.cache.promise).toBeNull();
});

test("a later request can recover after a failed initialization", async () => {
  const ctx = context();
  const success = ctx.options.connect;
  ctx.options.connect = async () => { throw transientError(); };
  await expect(resolveDatabaseConnection(ctx.cache, ctx.options)).rejects.toBeInstanceOf(DatabaseUnavailableError);
  ctx.options.connect = success;
  expect((await resolveDatabaseConnection(ctx.cache, ctx.options)).ready).toBe(true);
});

test("connections that resolve before becoming ready are not cached", async () => {
  const ctx = context();
  ctx.options.connect = async () => ({ ready: false, id: 1 });
  await expect(resolveDatabaseConnection(ctx.cache, ctx.options)).rejects.toBeInstanceOf(DatabaseUnavailableError);
  expect(ctx.cache.connection).toBeNull();
  expect(ctx.cache.promise).toBeNull();
});

test("safe failure reporting never contains the original driver topology", async () => {
  const ctx = context();
  const reports: unknown[] = [];
  ctx.options.connect = async () => { throw transientError(); };
  await expect(resolveDatabaseConnection(ctx.cache, { ...ctx.options, report: (details) => reports.push(details) })).rejects.toBeInstanceOf(DatabaseUnavailableError);
  expect(reports).toEqual([{ name: "MongooseServerSelectionError", attempt: 1, retrying: true }, { name: "MongooseServerSelectionError", attempt: 2, retrying: false }]);
});

test("database classification distinguishes driver failures from unrelated errors", () => {
  expect(isDatabaseUnavailable(transientError())).toBe(true);
  expect(isDatabaseUnavailable(new DatabaseUnavailableError())).toBe(true);
  expect(isDatabaseUnavailable(new Error("unrelated rendering failure"))).toBe(false);
  expect(isDatabaseUnavailable({ name: "MongoNetworkError" })).toBe(false);
});
