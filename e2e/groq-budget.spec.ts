import { expect, test } from "@playwright/test";
import { GROQ_MODELS, type GroqModel, type TokenUsage } from "../src/lib/ai-config";
import { getQuotaDay, GroqTokenLedger } from "../src/lib/groq-budget";
import { FakeQuotaCollection, type FakeQuotaWriteHook } from "./fixtures/fake-groq-ledger";

const NOW = new Date("2026-11-07T12:00:00.000Z");
const MODELS = [...GROQ_MODELS];
const LIMIT = 200_000;
const WRITE_CONCERN = { w: "majority" as const, j: true, wtimeout: 5000 };

function setup(limit = LIMIT) {
  const collection = new FakeQuotaCollection();
  return { collection, ledger: new GroqTokenLedger(collection, limit) };
}

function usage(totalTokens: number, inputTokens = totalTokens): TokenUsage {
  return { inputTokens, outputTokens: totalTokens - inputTokens, totalTokens };
}

function document(collection: FakeQuotaCollection, model = MODELS[0], now = NOW) {
  const value = collection.documents.get(`groq:${model}:${getQuotaDay(now)}`);
  if (!value) throw new Error(`Missing quota document for ${model}`);
  return value;
}

async function reserve(ledger: GroqTokenLedger, amount: number, id: string, models: GroqModel[] = [MODELS[0]], now = NOW) {
  const reservation = await ledger.reserve(models, amount, now, id);
  if (!reservation) throw new Error(`Expected reservation ${id}`);
  return reservation;
}

test("accepts exactly 200000 tokens and rejects a single reservation one token over", async () => {
  const { collection, ledger } = setup();
  expect(await ledger.reserve([MODELS[0]], LIMIT + 1, NOW, "too-large")).toBeNull();
  expect(collection.writes).toHaveLength(0);
  const reservation = await reserve(ledger, LIMIT, "exact-cap");
  expect(document(collection).reservedTokens).toBe(LIMIT);
  expect(await ledger.reserve([MODELS[0]], 1, NOW, "one-over")).toBeNull();
  expect(await ledger.settle(reservation, usage(LIMIT, 150_000), NOW)).toBe(true);
  expect(document(collection)).toMatchObject({ accountedTokens: LIMIT, reservedTokens: 0, measuredInputTokens: 150_000, measuredOutputTokens: 50_000 });
  expect(await ledger.reserve([MODELS[0]], 1, NOW, "measured-one-over")).toBeNull();
});

test("guards the sum of accounted and outstanding tokens at the exact cap", async () => {
  const { collection, ledger } = setup();
  const first = await reserve(ledger, LIMIT - 1, "first");
  await ledger.settle(first, usage(LIMIT - 1), NOW);
  expect(await ledger.reserve([MODELS[0]], 2, NOW, "two")).toBeNull();
  await reserve(ledger, 1, "last-token");
  expect(document(collection)).toMatchObject({ accountedTokens: LIMIT - 1, reservedTokens: 1, reservationCount: 2 });
  expect(await ledger.reserve([MODELS[0]], 1, NOW, "overflow")).toBeNull();
});

test("concurrent reservations across ledger instances never exceed the daily cap", async () => {
  const { collection, ledger } = setup();
  const second = new GroqTokenLedger(collection);
  const results = await Promise.all(Array.from({ length: 96 }, (_, index) =>
    (index % 2 ? ledger : second).reserve([MODELS[0]], 2500, NOW, `concurrent-${index}`)));
  const authorized = results.filter((result) => result !== null);
  expect(authorized).toHaveLength(80);
  expect(new Set(authorized.map((result) => result.id)).size).toBe(80);
  expect(document(collection)).toMatchObject({ accountedTokens: 0, reservedTokens: LIMIT, reservationCount: 80 });
  expect(document(collection).reservations).toHaveLength(80);
});

test("rotates among all three least-accounted models, including outstanding reservations", async () => {
  const { collection, ledger } = setup();
  const reservations = [];
  for (let index = 0; index < 6; index++) {
    reservations.push(await reserve(ledger, 100, `rotation-${index}`, MODELS, new Date(NOW.getTime() + index * 1000)));
  }
  expect(reservations.map((entry) => entry.model)).toEqual([...MODELS, ...MODELS]);
  for (const model of MODELS) expect(document(collection, model).reservedTokens).toBe(200);
  await ledger.settle(reservations[4], usage(10), NOW);
  expect((await reserve(ledger, 50, "least-accounted", MODELS)).model).toBe(MODELS[1]);
  expect(document(collection, MODELS[1])).toMatchObject({ accountedTokens: 10, reservedTokens: 150 });
});

test("initialization is idempotent, deduplicates models, and preserves Dates and history", async () => {
  const { collection, ledger } = setup();
  const first = await reserve(ledger, 100, "initial", [MODELS[0], MODELS[0]]);
  await ledger.settle(first, usage(40, 15), NOW);
  await reserve(new GroqTokenLedger(collection), 20, "next");
  const value = document(collection);
  expect(collection.documents.size).toBe(1);
  expect(collection.writes.filter((write) => write.options.upsert)).toHaveLength(2);
  expect(value).toMatchObject({ accountedTokens: 40, reservedTokens: 20, measuredInputTokens: 15, measuredOutputTokens: 25, reservationCount: 2 });
  expect(value.reservations.map((entry) => entry.id)).toEqual(["initial", "next"]);
  expect(value.reservations[0]).toMatchObject({ state: "settled", createdAt: NOW, settledAt: NOW });
  expect(value.purgeAt).toEqual(new Date("2026-12-08T00:00:00.000Z"));
  const snapshots = await collection.findByIds([first.dayId]);
  expect(snapshots[0].lastReservedAt).toBeInstanceOf(Date);
  snapshots[0].lastReservedAt.setUTCFullYear(2000);
  expect(document(collection).lastReservedAt).toEqual(NOW);
});

for (const identity of ["keyPattern", "keyValue"] as const) {
  test(`retries an expected initialization _id E11000 identified by ${identity}`, async () => {
    const { collection, ledger } = setup();
    collection.failAfterWrite = (write) => {
      if (!write.options.upsert) return;
      collection.failAfterWrite = undefined;
      throw Object.assign(new Error("E11000 competing initializer"), {
        code: 11000,
        ...(identity === "keyPattern" ? { keyPattern: { _id: 1 } } : { keyValue: { _id: write.filter._id } }),
      });
    };
    await reserve(ledger, 100, "initialization-race");
    expect(collection.writes.filter((write) => write.options.upsert)).toHaveLength(2);
    expect(document(collection)).toMatchObject({ reservedTokens: 100, reservationCount: 1 });
  });
}

test("does not treat an unrelated E11000 as successful initialization", async () => {
  const { collection, ledger } = setup();
  collection.failBeforeWrite = () => {
    throw Object.assign(new Error("E11000 unrelated index"), { code: 11000, keyPattern: { "reservations.id": 1 } });
  };
  await expect(ledger.reserve(MODELS, 100, NOW, "unrelated-duplicate")).rejects.toMatchObject({ code: 11000 });
  expect(collection.writes).toHaveLength(1);
  expect(collection.documents.size).toBe(0);
});

test("duplicate IDs cannot authorize another reservation on the same or different models", async () => {
  const { collection, ledger } = setup();
  const first = await reserve(ledger, 100, "global-id");
  expect(await ledger.reserve([MODELS[0]], 100, NOW, first.id)).toBeNull();
  expect(await ledger.reserve([MODELS[1]], 100, NOW, first.id)).toBeNull();
  expect(await ledger.reserve(MODELS, 100, NOW, first.id)).toBeNull();
  await ledger.settle(first, usage(10), NOW);
  expect(await ledger.reserve(MODELS, 100, NOW, first.id)).toBeNull();
  expect(await ledger.reserve(MODELS, 100, new Date("2026-11-08T12:00:00.000Z"), first.id)).toBeNull();
  expect([...collection.documents.values()].reduce((sum, value) => sum + value.reservationCount, 0)).toBe(1);
  expect(document(collection)).toMatchObject({ accountedTokens: 10, reservedTokens: 0 });
  expect(document(collection).reservations[0]).toMatchObject({ id: first.id, state: "settled" });
});

test("concurrent duplicate IDs across three models authorize exactly one reservation", async () => {
  const { collection, ledger } = setup();
  const results = await Promise.all(Array.from({ length: 30 }, (_, index) =>
    ledger.reserve([MODELS[index % MODELS.length]], 100, NOW, "concurrent-duplicate")));
  expect(results.filter((result) => result !== null)).toHaveLength(1);
  expect([...collection.documents.values()].map((value) => value.reservedTokens).sort((a, b) => a - b)).toEqual([0, 0, 100]);
  expect([...collection.documents.values()].reduce((sum, value) => sum + value.reservationCount, 0)).toBe(1);
});

test("the fake rolls back all mutations on a global terminal-ID index collision", async () => {
  const { collection, ledger } = setup();
  const first = await reserve(ledger, 100, "terminal-id");
  await ledger.settle(first, usage(40), NOW);
  const second = await reserve(ledger, 20, "other-id", [MODELS[1]]);
  const before = structuredClone([...collection.documents]);
  await expect(collection.updateOne({ _id: second.dayId }, {
    $inc: { reservedTokens: 100, reservationCount: 1 },
    $push: { reservations: { id: first.id, amount: 100, state: "reserved", createdAt: NOW } },
    $set: { lastReservedAt: new Date(NOW.getTime() + 1000) },
  }, { upsert: false, writeConcern: WRITE_CONCERN })).rejects.toMatchObject({ code: 11000, keyPattern: { "reservations.id": 1 } });
  expect([...collection.documents]).toEqual(before);
  expect(collection.writes.at(-1)?.committed).toBe(false);
  await expect(collection.updateOne({ _id: first.dayId, blocked: true }, { $setOnInsert: { blocked: true } }, {
    upsert: true, writeConcern: WRITE_CONCERN,
  })).rejects.toMatchObject({ code: 11000, keyPattern: { _id: 1 }, keyValue: { _id: first.dayId } });
  expect([...collection.documents]).toEqual(before);
});

test("concurrent duplicate settlements charge measured usage exactly once", async () => {
  const { collection, ledger } = setup();
  const reservation = await reserve(ledger, 100, "settlement-race");
  const results = await Promise.all(Array.from({ length: 24 }, () => ledger.settle(reservation, usage(37, 12), NOW)));
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(document(collection)).toMatchObject({ accountedTokens: 37, reservedTokens: 0, measuredInputTokens: 12, measuredOutputTokens: 25, reservationCount: 1 });
  expect(document(collection).reservations).toEqual([{ id: reservation.id, amount: 100, state: "settled", createdAt: NOW, settledAt: NOW, chargedTokens: 37, inputTokens: 12, outputTokens: 25 }]);
});

for (const unknownFirst of [false, true]) {
  test(`known and unknown settlement race is terminal when ${unknownFirst ? "unknown" : "known"} wins`, async () => {
    const { collection, ledger } = setup();
    const reservation = await reserve(ledger, 100, "known-unknown-race");
    const reports = unknownFirst ? [null, usage(37, 12)] : [usage(37, 12), null];
    expect(await Promise.all(reports.map((report) => ledger.settle(reservation, report, NOW)))).toEqual([true, false]);
    expect(document(collection)).toMatchObject({ accountedTokens: unknownFirst ? 100 : 37, reservedTokens: 0, measuredInputTokens: unknownFirst ? 0 : 12, measuredOutputTokens: unknownFirst ? 0 : 25 });
    expect(document(collection).reservations[0]).toMatchObject({ state: unknownFirst ? "charged" : "settled", chargedTokens: unknownFirst ? 100 : 37 });
  });
}

test("settlement elemMatch binds ID, amount, and state to the same positional reservation", async () => {
  const { collection, ledger } = setup();
  const first = await reserve(ledger, 100, "first-element");
  const second = await reserve(ledger, 200, "second-element");
  expect(await ledger.settle({ ...first, amount: 200 }, usage(10), NOW)).toBe(false);
  expect(document(collection)).toMatchObject({ accountedTokens: 0, reservedTokens: 300 });
  expect(await ledger.settle(first, usage(10), NOW)).toBe(true);
  expect(await ledger.settle(first, null, NOW)).toBe(false);
  expect(document(collection).reservations.map((entry) => entry.state)).toEqual(["settled", "reserved"]);
  expect(await ledger.settle(second, usage(20), NOW)).toBe(true);
  expect(document(collection)).toMatchObject({ accountedTokens: 30, reservedTokens: 0 });
  expect(document(collection).reservations.map((entry) => entry.chargedTokens)).toEqual([10, 20]);
});

test("unknown usage and crashed reservations remain charged or held after a new ledger is constructed", async () => {
  const { collection, ledger } = setup();
  const crashed = await reserve(ledger, 100_000, "crashed");
  const unknown = await reserve(ledger, 90_000, "unknown");
  await ledger.settle(unknown, null, NOW);
  const restarted = new GroqTokenLedger(collection);
  const later = new Date("2026-11-07T23:59:59.000Z");
  expect(await restarted.reserve([MODELS[0]], 10_001, later, "no-refund")).toBeNull();
  expect(await restarted.settle(unknown, usage(1), later)).toBe(false);
  expect(await restarted.reserve([MODELS[0]], 1, later, crashed.id)).toBeNull();
  await reserve(restarted, 10_000, "remaining-cap", [MODELS[0]], later);
  expect(document(collection)).toMatchObject({ accountedTokens: 90_000, reservedTokens: 110_000, reservationCount: 3, measuredInputTokens: 0, measuredOutputTokens: 0 });
  expect(document(collection).reservations[0]).toMatchObject({ id: crashed.id, state: "reserved", createdAt: NOW });
  expect(document(collection).reservations[1]).toMatchObject({ id: unknown.id, state: "charged", chargedTokens: 90_000 });
  expect(document(collection).reservations[1].inputTokens).toBeUndefined();
});

for (const known of [false, true]) {
  test(`${known ? "known" : "unknown"} settlement after midnight updates only the original UTC day`, async () => {
    const { collection, ledger } = setup();
    const beforeMidnight = new Date("2026-11-07T23:59:59.999Z");
    const afterMidnight = new Date("2026-11-08T00:00:00.001Z");
    const original = await reserve(ledger, 100, "old-day", [MODELS[0]], beforeMidnight);
    const restarted = new GroqTokenLedger(collection);
    await reserve(restarted, LIMIT, "new-day", [MODELS[0]], afterMidnight);
    expect(await restarted.settle(original, known ? usage(25, 10) : null, afterMidnight)).toBe(true);
    expect(document(collection, MODELS[0], beforeMidnight)).toMatchObject({ utcDay: "2026-11-07", accountedTokens: known ? 25 : 100, reservedTokens: 0 });
    expect(document(collection, MODELS[0], beforeMidnight).reservations[0].settledAt).toEqual(afterMidnight);
    expect(document(collection, MODELS[0], afterMidnight)).toMatchObject({ utcDay: "2026-11-08", accountedTokens: 0, reservedTokens: LIMIT });
  });
}

test("rejects malformed token counts before any settlement write", async () => {
  const { collection, ledger } = setup();
  const reservation = await reserve(ledger, 100, "malformed-usage");
  const before = structuredClone(document(collection));
  const writes = collection.writes.length;
  const malformed: TokenUsage[] = [
    { inputTokens: -1, outputTokens: 1, totalTokens: 0 },
    { inputTokens: 1, outputTokens: -1, totalTokens: 0 },
    { inputTokens: 0, outputTokens: 0, totalTokens: -1 },
    { inputTokens: 0.5, outputTokens: 0.5, totalTokens: 1 },
    { inputTokens: 1, outputTokens: 1, totalTokens: 2.5 },
    { inputTokens: NaN, outputTokens: 0, totalTokens: 0 },
    { inputTokens: 0, outputTokens: Infinity, totalTokens: Infinity },
    { inputTokens: Number.MAX_SAFE_INTEGER + 1, outputTokens: 0, totalTokens: Number.MAX_SAFE_INTEGER + 1 },
    { inputTokens: 1, outputTokens: 2, totalTokens: 4 },
  ];
  for (const report of malformed) await expect(ledger.settle(reservation, report, NOW)).rejects.toThrow(/consistent nonnegative integers/);
  expect(document(collection)).toEqual(before);
  expect(collection.writes).toHaveLength(writes);
});

test("acknowledged overrun records actual usage, quarantines the model, and remains terminal", async () => {
  const { collection, ledger } = setup();
  const reservation = await reserve(ledger, LIMIT, "overrun");
  await expect(ledger.settle(reservation, usage(LIMIT + 1, LIMIT - 10), NOW)).rejects.toThrow(/exceeded its reservation; model quarantined/);
  expect(document(collection)).toMatchObject({ accountedTokens: LIMIT + 1, reservedTokens: 0, measuredInputTokens: LIMIT - 10, measuredOutputTokens: 11, blocked: true, overrunTokens: 1 });
  expect(document(collection).reservations[0]).toMatchObject({ id: reservation.id, state: "overrun", chargedTokens: LIMIT + 1 });
  expect(await ledger.settle(reservation, usage(LIMIT + 1, LIMIT - 10), NOW)).toBe(false);
  expect(await ledger.reserve([MODELS[0]], 1, NOW, "quarantined")).toBeNull();
  expect(await ledger.reserve([MODELS[1]], 1, NOW, reservation.id)).toBeNull();
  expect((await reserve(ledger, 1, "healthy-model", MODELS)).model).toBe(MODELS[1]);
});

test("bounds the retained ledger at 4096 even when settled usage is zero", async () => {
  const { collection, ledger } = setup();
  const initial = await reserve(ledger, 1, "completed-0");
  await ledger.settle(initial, usage(0), NOW);
  const value = document(collection);
  value.reservations = Array.from({ length: 4095 }, (_, index) => ({
    id: `completed-${index}`, amount: 1, state: "settled", createdAt: new Date(NOW), settledAt: new Date(NOW), chargedTokens: 0, inputTokens: 0, outputTokens: 0,
  }));
  value.reservationCount = 4095;
  const last = await reserve(ledger, 1, "last-slot");
  await ledger.settle(last, usage(0), NOW);
  expect(await ledger.reserve([MODELS[0]], 1, NOW, "ledger-full")).toBeNull();
  expect(document(collection)).toMatchObject({ reservationCount: 4096, accountedTokens: 0, reservedTokens: 0 });
  expect(document(collection).reservations).toHaveLength(4096);
  expect(document(collection).reservations[0].id).toBe("completed-0");
  expect(document(collection).reservations.at(-1)).toMatchObject({ id: "last-slot", state: "settled" });
});

test("rejects invalid limits and amounts without writes, and supports a smaller configured cap", async () => {
  const { collection, ledger } = setup();
  for (const value of [0, -1, 0.5, NaN, Infinity, LIMIT + 1]) expect(() => new GroqTokenLedger(collection, value)).toThrow(/Invalid Groq daily token limit/);
  for (const value of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) await expect(ledger.reserve([MODELS[0]], value, NOW, "invalid")).rejects.toThrow(/positive integer/);
  await expect(ledger.reserve(["unlisted" as GroqModel], 1, NOW, "invalid-model")).rejects.toThrow(/Invalid Groq model/);
  expect(await ledger.reserve([], 1, NOW, "empty-models")).toBeNull();
  expect(collection.writes).toHaveLength(0);
  const restricted = new GroqTokenLedger(collection, 1);
  await reserve(restricted, 1, "small-cap");
  expect(await restricted.reserve([MODELS[0]], 1, NOW, "small-overflow")).toBeNull();
});

test("rejects negative stored balances and insufficient reserved settlement balances", async () => {
  for (const field of ["accountedTokens", "reservedTokens"] as const) {
    const { collection, ledger } = setup();
    const reservation = await reserve(ledger, 100, `corrupt-${field}`);
    document(collection)[field] = -1;
    const before = structuredClone(document(collection));
    expect(await ledger.reserve([MODELS[0]], 1, NOW, "unsafe-balance")).toBeNull();
    expect(document(collection)).toEqual(before);
    if (field === "reservedTokens") {
      expect(await ledger.settle(reservation, usage(10), NOW)).toBe(false);
      expect(document(collection)).toEqual(before);
    }
  }
});

test("all mutations use majority+journaled writes and guarded writes never upsert", async () => {
  const { collection, ledger } = setup();
  const first = await reserve(ledger, 100, "safe-known");
  await ledger.settle(first, usage(30), NOW);
  const second = await reserve(ledger, 100, "safe-unknown");
  await ledger.settle(second, null, NOW);
  const third = await reserve(ledger, 100, "safe-overrun");
  await expect(ledger.settle(third, usage(101), NOW)).rejects.toThrow(/quarantined/);
  expect(await ledger.settle({ ...first, id: "absent" }, null, NOW)).toBe(false);
  for (const write of collection.writes) {
    expect(write.options.writeConcern).toEqual(WRITE_CONCERN);
    if ("$setOnInsert" in write.update) {
      expect(write.options.upsert).toBe(true);
      expect(Object.keys(write.filter)).toEqual(["_id"]);
      expect(Object.keys(write.update)).toEqual(["$setOnInsert"]);
    } else {
      expect(write.options.upsert).toBe(false);
      expect(write.filter._id).toBe(first.dayId);
      if ("$push" in write.update) {
        expect(write.filter).toMatchObject({ blocked: false, reservationCount: { $lt: 4096 }, "reservations.id": { $ne: expect.any(String) }, $expr: { $and: [
          { $gte: ["$accountedTokens", 0] }, { $gte: ["$reservedTokens", 0] }, { $lte: [{ $add: ["$accountedTokens", "$reservedTokens", 100] }, LIMIT] },
        ] } });
      } else {
        expect(write.filter).toMatchObject({ reservedTokens: { $gte: 100 }, reservations: { $elemMatch: { id: expect.any(String), amount: 100, state: "reserved" } } });
      }
    }
  }
});

const failures: { name: string; hook: FakeQuotaWriteHook; error: RegExp }[] = [
  { name: "unacknowledged", hook: () => ({ acknowledged: false, modifiedCount: 0 }), error: /not acknowledged/ },
  { name: "missing acknowledgement", hook: () => ({ modifiedCount: 1 }), error: /not acknowledged/ },
  { name: "lost response", hook: () => { throw new Error("indeterminate Mongo write"); }, error: /indeterminate Mongo write/ },
];

for (const phase of ["before", "after"] as const) {
  for (const stage of ["initialization", "reservation"] as const) {
    for (const failure of failures) {
      test(`${failure.name} ${stage} ${phase} commit grants zero dispatch authorization`, async () => {
        const { collection, ledger } = setup();
        const hook: FakeQuotaWriteHook = (write) => {
          if (write.options.upsert === (stage === "initialization")) return failure.hook(write);
        };
        collection[phase === "before" ? "failBeforeWrite" : "failAfterWrite"] = hook;
        let dispatches = 0;
        const attempt = async () => {
          const reservation = await ledger.reserve([MODELS[0]], 100, NOW, "uncertain-reserve");
          if (reservation) dispatches++;
        };
        await expect(attempt()).rejects.toThrow(failure.error);
        expect(dispatches).toBe(0);
        if (stage === "initialization" && phase === "before") {
          expect(collection.documents.size).toBe(0);
        } else {
          expect(document(collection)).toMatchObject({ accountedTokens: 0, reservedTokens: stage === "reservation" && phase === "after" ? 100 : 0 });
        }
        expect(collection.writes.some((write) => !write.options.upsert)).toBe(stage === "reservation");
        if (stage === "reservation" && phase === "after") {
          collection.failAfterWrite = undefined;
          expect(await new GroqTokenLedger(collection).reserve(MODELS, 100, NOW, "uncertain-reserve")).toBeNull();
          expect(document(collection)).toMatchObject({ reservedTokens: 100, reservationCount: 1 });
        }
      });
    }
  }

  for (const modifiedCount of [undefined, 0, 2]) {
    test(`ambiguous modifiedCount=${modifiedCount} ${phase} reservation commit authorizes no dispatch`, async () => {
      const { collection, ledger } = setup();
      collection[phase === "before" ? "failBeforeWrite" : "failAfterWrite"] = (write) => {
        if (!write.options.upsert) return { acknowledged: true, ...(modifiedCount === undefined ? {} : { modifiedCount }) };
      };
      let dispatches = 0;
      const reservation = await ledger.reserve([MODELS[0]], 100, NOW, "ambiguous-count");
      if (reservation) dispatches++;
      expect(reservation).toBeNull();
      expect(dispatches).toBe(0);
      expect(document(collection)).toMatchObject({ reservedTokens: phase === "after" ? 100 : 0, reservationCount: phase === "after" ? 1 : 0 });
      if (phase === "after") {
        collection.failAfterWrite = undefined;
        expect(await ledger.reserve(MODELS, 100, NOW, "ambiguous-count")).toBeNull();
      }
    });
  }

  test(`missing settlement acknowledgement ${phase} commit never refunds or replays a charge`, async () => {
    for (const report of [usage(37, 12), null]) {
      const { collection, ledger } = setup();
      const reservation = await reserve(ledger, 100, "uncertain-settlement");
      collection[phase === "before" ? "failBeforeWrite" : "failAfterWrite"] = () => ({ modifiedCount: 1 });
      await expect(ledger.settle(reservation, report, NOW)).rejects.toThrow(/settlement was not acknowledged/);
      const charged = report?.totalTokens ?? 100;
      expect(document(collection)).toMatchObject({ reservedTokens: phase === "after" ? 0 : 100, accountedTokens: phase === "after" ? charged : 0 });
      collection.failBeforeWrite = undefined;
      collection.failAfterWrite = undefined;
      if (phase === "after") {
        expect(await new GroqTokenLedger(collection).settle(reservation, usage(1), NOW)).toBe(false);
        expect(document(collection).accountedTokens).toBe(charged);
      }
    }
  });

  test(`overrun with missing acknowledgement ${phase} commit reports uncertainty rather than acknowledged quarantine`, async () => {
    const { collection, ledger } = setup();
    const reservation = await reserve(ledger, 100, "uncertain-overrun");
    collection[phase === "before" ? "failBeforeWrite" : "failAfterWrite"] = () => ({ acknowledged: false, modifiedCount: 1 });
    await expect(ledger.settle(reservation, usage(101), NOW)).rejects.toThrow(/settlement was not acknowledged/);
    expect(document(collection)).toMatchObject({ blocked: phase === "after", reservedTokens: phase === "after" ? 0 : 100, accountedTokens: phase === "after" ? 101 : 0 });
  });
}
