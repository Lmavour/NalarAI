import { expect, test } from "@playwright/test";
import { aggregateDocumentQuizAnswers, applyFlashcardEvent, FlashcardConflictError, FlashcardInputError, FlashcardNotFoundError, MAX_FLASHCARD_CAS_ATTEMPTS, MAX_FLASHCARD_EVENTS, type FlashcardEvent, type FlashcardEventReceipt, type FlashcardEventSnapshot, type FlashcardEventStore } from "../src/lib/flashcard-events";
import { createReviewSchedule, MAX_REVIEW_INTERVAL_DAYS, MIN_REVIEW_EASE, scheduleQuizOutcome, scheduleReview, type ReviewSchedule } from "../src/lib/review-schedule";
import { Flashcard } from "../src/models/flashcard";
import type { RecallRating } from "../src/types/documents";

const NOW = new Date("2026-11-08T03:00:00.000Z");
const DAY_MS = 86_400_000;

function review(id = 1, expectedRevision = 0, rating: RecallRating = "good"): FlashcardEvent {
  return { id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`, kind: "review", expectedRevision, rating };
}

function quiz(sessionId = "session-1", correct = true, materialIndex = 0): FlashcardEvent {
  return { id: `quiz:${sessionId}:${materialIndex}`, kind: "quiz", correct };
}

type MemoryCard = FlashcardEventSnapshot & { question: string; answer: string };

class MemoryEventStore implements FlashcardEventStore<MemoryCard> {
  state: MemoryCard | null;
  reads = 0;
  swaps = 0;
  failComparisons = 0;
  beforeCompare?: (snapshot: MemoryCard, receipt: FlashcardEventReceipt) => void;
  afterCommit?: (receipt: FlashcardEventReceipt) => void;

  constructor(schedule: ReviewSchedule = createReviewSchedule(NOW)) {
    this.state = { ...structuredClone(schedule), events: [], question: "A copied question", answer: "A durable copied answer" };
  }

  async read() {
    this.reads += 1;
    return structuredClone(this.state);
  }

  commit(receipt: FlashcardEventReceipt) {
    if (!this.state) throw new Error("Missing fake card");
    this.state = { ...this.state, ...structuredClone(receipt.result), events: [...this.state.events, structuredClone(receipt)] };
  }

  async compareAndSwap(snapshot: MemoryCard, receipt: FlashcardEventReceipt) {
    this.swaps += 1;
    this.beforeCompare?.(snapshot, receipt);
    if (this.failComparisons > 0) { this.failComparisons -= 1; return false; }
    // This synchronous block models the production revision/event-absence/capacity guards.
    if (!this.state || this.state.revision !== snapshot.revision || this.state.events.some((event) => event.id === receipt.id) || this.state.events.length >= MAX_FLASHCARD_EVENTS) return false;
    this.commit(receipt);
    this.afterCommit?.(receipt);
    return true;
  }
}

function memoryCard(store: MemoryEventStore): MemoryCard {
  if (!store.state) throw new Error("Missing fake card");
  return store.state;
}

function retainedReceipt(index: number, schedule = createReviewSchedule(NOW)): FlashcardEventReceipt {
  return { id: `quiz:retained-${index}:0`, kind: "quiz", rating: null, expectedRevision: null, correct: true, result: structuredClone(schedule) };
}

test("new cards are due immediately, and scheduling never aliases the supplied clock", () => {
  const now = new Date(NOW);
  const state = createReviewSchedule(now);
  expect(state).toEqual({ dueAt: NOW, intervalDays: 0, repetitions: 0, ease: 2.5, lapses: 0, lastReviewedAt: null, revision: 0 });
  now.setUTCFullYear(2000);
  expect(state.dueAt).toEqual(NOW);
});

test("good follows 1d, 3d, then the ease multiplier", () => {
  let state = createReviewSchedule(NOW);
  for (const interval of [1, 3, 8, 20]) {
    const now = new Date(state.dueAt);
    state = scheduleReview(state, "good", now);
    expect(state.intervalDays).toBe(interval);
    expect(state.dueAt.getTime()).toBe(now.getTime() + interval * DAY_MS);
  }
  expect(state).toMatchObject({ repetitions: 4, revision: 4, ease: 2.5, lapses: 0 });
});

test("again resets repetitions, records one lapse, and is due in exactly ten minutes", () => {
  const previous = { ...createReviewSchedule(NOW), repetitions: 7, intervalDays: 30, lapses: 2, revision: 9 };
  const before = structuredClone(previous);
  const result = scheduleReview(previous, "again", NOW);
  expect(result).toMatchObject({ repetitions: 0, lapses: 3, revision: 10, ease: 2.3, lastReviewedAt: NOW });
  expect(result.dueAt.getTime()).toBe(NOW.getTime() + 600_000);
  expect(result.intervalDays * DAY_MS).toBeCloseTo(600_000);
  expect(previous).toEqual(before);
  expect(scheduleReview(result, "good", result.dueAt).intervalDays).toBe(1);
});

test("hard starts at six hours and advances less than a good established review", () => {
  const initial = scheduleReview(createReviewSchedule(NOW), "hard", NOW);
  expect(initial.intervalDays).toBe(0.25);
  expect(initial.dueAt.getTime()).toBe(NOW.getTime() + 6 * 60 * 60_000);
  const established = { ...initial, repetitions: 4, intervalDays: 20, ease: 2.5 };
  const hard = scheduleReview(established, "hard", NOW);
  expect(hard).toMatchObject({ intervalDays: 24, ease: 2.35, repetitions: 5 });
  expect(hard.intervalDays).toBeLessThan(scheduleReview(established, "good", NOW).intervalDays);
});

test("easy graduates at four days and then advances faster without falling back to three days", () => {
  const first = scheduleReview(createReviewSchedule(NOW), "easy", NOW);
  expect(first).toMatchObject({ intervalDays: 4, repetitions: 2, ease: 2.65 });
  const good = scheduleReview(first, "good", first.dueAt);
  const easy = scheduleReview(first, "easy", first.dueAt);
  expect(good.intervalDays).toBe(11);
  expect(easy.intervalDays).toBe(14);
  expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
});

for (const rating of ["hard", "good", "easy"] as const) {
  test(`${rating} never exceeds a 365-day interval`, () => {
    const state = { ...createReviewSchedule(NOW), repetitions: 20, intervalDays: 365, ease: 3 };
    const result = scheduleReview(state, rating, NOW);
    expect(result.intervalDays).toBe(MAX_REVIEW_INTERVAL_DAYS);
    expect(result.dueAt.getTime()).toBe(NOW.getTime() + MAX_REVIEW_INTERVAL_DAYS * DAY_MS);
  });
}

test("repeated failures and hard ratings never lower ease below 1.3", () => {
  let state = createReviewSchedule(NOW);
  for (let index = 0; index < 80; index++) {
    state = scheduleReview(state, index % 2 ? "hard" : "again", state.dueAt);
    expect(state.ease).toBeGreaterThanOrEqual(MIN_REVIEW_EASE);
  }
  expect(state.ease).toBe(MIN_REVIEW_EASE);
  expect(state.lapses).toBe(40);
});

test("durations are UTC elapsed time across midnight, leap days, and DST boundaries", () => {
  for (const instant of ["2026-12-31T23:59:59.999Z", "2028-02-28T12:00:00.000Z", "2026-11-01T05:30:00.000Z"]) {
    const now = new Date(instant);
    expect(scheduleReview(createReviewSchedule(now), "good", now).dueAt.getTime() - now.getTime()).toBe(DAY_MS);
    expect(scheduleReview(createReviewSchedule(now), "again", now).dueAt.getTime() - now.getTime()).toBe(600_000);
  }
});

test("schedule validation rejects invalid dates, nonfinite values, and unsafe counters", () => {
  const initial = createReviewSchedule(NOW);
  const invalid: ReviewSchedule[] = [
    { ...initial, dueAt: new Date(NaN) },
    { ...initial, lastReviewedAt: new Date(NaN) },
    { ...initial, intervalDays: NaN },
    { ...initial, intervalDays: -1 },
    { ...initial, intervalDays: 366 },
    { ...initial, ease: Infinity },
    { ...initial, ease: 1.29 },
    { ...initial, repetitions: 1.5 },
    { ...initial, lapses: -1 },
    { ...initial, revision: Number.MAX_SAFE_INTEGER },
  ];
  for (const state of invalid) expect(() => scheduleReview(state, "good", NOW)).toThrow(RangeError);
  expect(() => createReviewSchedule(new Date(NaN))).toThrow(RangeError);
  expect(() => scheduleReview(initial, "good", new Date(NaN))).toThrow(RangeError);
  expect(() => scheduleReview(initial, "incorrect" as RecallRating, NOW)).toThrow(RangeError);
  expect(() => scheduleQuizOutcome(initial, "yes" as unknown as boolean, NOW)).toThrow(RangeError);
});

test("a correct quiz initializes a new card once without masquerading as a self review", () => {
  const first = scheduleQuizOutcome(createReviewSchedule(NOW), true, NOW);
  expect(first).toMatchObject({ intervalDays: 1, repetitions: 1, revision: 1, lastReviewedAt: null, lapses: 0 });
  expect(first.dueAt.getTime()).toBe(NOW.getTime() + DAY_MS);
  const later = new Date(NOW.getTime() + 3 * DAY_MS);
  const second = scheduleQuizOutcome(first, true, later);
  expect(second).toEqual({ ...first, revision: 2 });
  expect(second.dueAt).not.toBe(first.dueAt);
});

test("canonical scheduling results exclude card metadata and existing receipts", () => {
  const snapshot = memoryCard(new MemoryEventStore());
  const keys = Object.keys(createReviewSchedule(NOW)).sort();
  for (const result of [scheduleReview(snapshot, "good", NOW), scheduleQuizOutcome(snapshot, true, NOW), scheduleQuizOutcome(snapshot, false, NOW)]) {
    expect(Object.keys(result).sort()).toEqual(keys);
    expect(result).not.toHaveProperty("events");
    expect(result).not.toHaveProperty("question");
    expect(result).not.toHaveProperty("answer");
  }
});

test("a correct quiz preserves established cadence even after a self-review lapse", () => {
  const reviewed = scheduleReview(createReviewSchedule(NOW), "easy", NOW);
  expect(scheduleQuizOutcome(reviewed, true, reviewed.dueAt)).toEqual({ ...reviewed, revision: reviewed.revision + 1 });
  const lapsed = scheduleReview(reviewed, "again", NOW);
  expect(scheduleQuizOutcome(lapsed, true, lapsed.dueAt)).toEqual({ ...lapsed, revision: lapsed.revision + 1 });
});

test("a wrong quiz brings a future review forward and resets repetitions with one lapse", () => {
  const reviewed = scheduleReview(createReviewSchedule(NOW), "easy", NOW);
  const result = scheduleQuizOutcome(reviewed, false, NOW);
  expect(result).toEqual({ ...reviewed, dueAt: NOW, intervalDays: 0, repetitions: 0, lapses: 1, revision: 2 });
  expect(result.lastReviewedAt).not.toBe(reviewed.lastReviewedAt);
});

test("a wrong quiz never postpones an already-overdue card", () => {
  const overdue = { ...createReviewSchedule(NOW), dueAt: new Date(NOW.getTime() - DAY_MS) };
  const result = scheduleQuizOutcome(overdue, false, NOW);
  expect(result.dueAt).toEqual(overdue.dueAt);
  expect(result).toMatchObject({ repetitions: 0, lapses: 1, revision: 1, intervalDays: 0 });
});

test("quiz aggregation is per material index, independent of order, with any wrong winning", () => {
  const answers = [{ materialIndex: 2, correct: true }, { materialIndex: 0, correct: true }, { materialIndex: 2, correct: false }, { materialIndex: 2, correct: true }, { materialIndex: 1, correct: false }];
  expect([...aggregateDocumentQuizAnswers(answers)].sort()).toEqual([[0, true], [1, false], [2, false]]);
  expect([...aggregateDocumentQuizAnswers([...answers].reverse())].sort()).toEqual([[0, true], [1, false], [2, false]]);
  for (const invalid of [[], [{ materialIndex: -1, correct: true }], [{ materialIndex: 4, correct: true }], [{ materialIndex: 0.5, correct: true }], [{ materialIndex: 0, correct: "yes" as unknown as boolean }]]) {
    expect(() => aggregateDocumentQuizAnswers(invalid)).toThrow(FlashcardInputError);
  }
});

test("review receipts retain the exact scheduling state and replay before stale revision checks", async () => {
  const store = new MemoryEventStore();
  const event = review();
  const first = await applyFlashcardEvent(store, event, NOW);
  expect(first.applied).toBe(true);
  expect(first.receipt).toMatchObject({ ...event, correct: null, result: { revision: 1, intervalDays: 1 } });
  await applyFlashcardEvent(store, review(2, 1, "easy"), new Date(NOW.getTime() + DAY_MS));
  const replay = await applyFlashcardEvent(store, event, new Date(NOW.getTime() + 200 * DAY_MS));
  expect(replay.applied).toBe(false);
  expect(replay.receipt).toEqual(first.receipt);
  expect(replay.snapshot.revision).toBe(2);
  expect(replay.receipt.result.revision).toBe(1);
  expect(store.swaps).toBe(2);
  expect(memoryCard(store).events).toHaveLength(2);
  expect(memoryCard(store)).toMatchObject({ question: "A copied question", answer: "A durable copied answer" });
});

test("UUID casing is canonical and cannot create a second intent", async () => {
  const store = new MemoryEventStore();
  const lower: FlashcardEvent = { id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", kind: "review", rating: "good", expectedRevision: 0 };
  const first = await applyFlashcardEvent(store, { ...lower, id: lower.id.toUpperCase() }, NOW);
  const replay = await applyFlashcardEvent(store, lower, NOW);
  expect(first.receipt.id).toBe(lower.id);
  expect(replay.applied).toBe(false);
  expect(store.swaps).toBe(1);
});

for (const changed of ["rating", "expectedRevision", "kind"] as const) {
  test(`reusing a review ID with changed ${changed} rejects without changing the card`, async () => {
    const store = new MemoryEventStore();
    const original = review();
    await applyFlashcardEvent(store, original, NOW);
    const before = structuredClone(memoryCard(store));
    const altered: FlashcardEvent = changed === "kind" ? { id: original.id, kind: "quiz", correct: true } : changed === "rating" ? review(1, 0, "hard") : review(1, 1);
    await expect(applyFlashcardEvent(store, altered, NOW)).rejects.toMatchObject({ name: "FlashcardConflictError", code: "event_payload_changed" });
    expect(memoryCard(store)).toEqual(before);
    expect(store.swaps).toBe(1);
  });
}

test("invalid review intents are rejected before the store is accessed", async () => {
  const store = new MemoryEventStore();
  const invalid: FlashcardEvent[] = [
    { id: "not-a-uuid", kind: "review", rating: "good", expectedRevision: 0 },
    { id: review().id, kind: "review", rating: "good", expectedRevision: -1 },
    { id: review().id, kind: "review", rating: "good", expectedRevision: 0.5 },
    { id: review().id, kind: "review", rating: "good", expectedRevision: Number.MAX_SAFE_INTEGER + 1 },
    { id: review().id, kind: "review", rating: "bad" as RecallRating, expectedRevision: 0 },
    { id: "", kind: "quiz", correct: true },
    { id: "x".repeat(181), kind: "quiz", correct: true },
    { id: "quiz:x:0", kind: "quiz", correct: 1 as unknown as boolean },
  ];
  for (const event of invalid) await expect(applyFlashcardEvent(store, event, NOW)).rejects.toBeInstanceOf(FlashcardInputError);
  expect(store.reads).toBe(0);
  expect(store.swaps).toBe(0);
});

test("missing cards and stale distinct intents return safe errors without mutation", async () => {
  const missing = new MemoryEventStore();
  missing.state = null;
  await expect(applyFlashcardEvent(missing, review(), NOW)).rejects.toBeInstanceOf(FlashcardNotFoundError);
  const stale = new MemoryEventStore();
  await expect(applyFlashcardEvent(stale, review(1, 1), NOW)).rejects.toMatchObject({ code: "revision_changed" });
  expect(stale.swaps).toBe(0);
  expect(memoryCard(stale).revision).toBe(0);
});

test("simultaneous retries of one review intent commit once and return one canonical receipt", async () => {
  const store = new MemoryEventStore();
  const results = await Promise.all(Array.from({ length: 24 }, () => applyFlashcardEvent(store, review(), NOW)));
  expect(results.filter((result) => result.applied)).toHaveLength(1);
  expect(results.every((result) => JSON.stringify(result.receipt) === JSON.stringify(results[0].receipt))).toBe(true);
  expect(memoryCard(store)).toMatchObject({ revision: 1, repetitions: 1, lapses: 0 });
  expect(memoryCard(store).events).toHaveLength(1);
});

test("simultaneous distinct review intents with one expected revision cannot lose updates", async () => {
  const store = new MemoryEventStore();
  const results = await Promise.allSettled([applyFlashcardEvent(store, review(1), NOW), applyFlashcardEvent(store, review(2, 0, "again"), NOW)]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find((result) => result.status === "rejected");
  if (rejected?.status !== "rejected") throw new Error("Expected a CAS loser");
  expect(rejected.reason).toBeInstanceOf(FlashcardConflictError);
  expect(rejected.reason).toMatchObject({ code: "revision_changed" });
  expect(memoryCard(store).revision).toBe(1);
  expect(memoryCard(store).events).toHaveLength(1);
});

test("concurrent reuse with conflicting payloads accepts one payload and rejects the other", async () => {
  const store = new MemoryEventStore();
  const results = await Promise.allSettled([applyFlashcardEvent(store, review(1, 0, "easy"), NOW), applyFlashcardEvent(store, review(1, 0, "hard"), NOW)]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find((result) => result.status === "rejected");
  if (rejected?.status !== "rejected") throw new Error("Expected conflicting reuse");
  expect(rejected.reason).toMatchObject({ code: "event_payload_changed" });
  expect(memoryCard(store).events).toHaveLength(1);
});

test("quiz retries are deterministic and changed aggregate correctness is a payload conflict", async () => {
  const store = new MemoryEventStore();
  const first = await applyFlashcardEvent(store, quiz("completed-session", false, 2), NOW);
  expect(first.receipt).toMatchObject({ id: "quiz:completed-session:2", kind: "quiz", correct: false, rating: null, expectedRevision: null, result: { lapses: 1, repetitions: 0 } });
  const retry = await applyFlashcardEvent(store, quiz("completed-session", false, 2), new Date(NOW.getTime() + DAY_MS));
  expect(retry.receipt).toEqual(first.receipt);
  expect(retry.applied).toBe(false);
  await expect(applyFlashcardEvent(store, quiz("completed-session", true, 2), NOW)).rejects.toMatchObject({ code: "event_payload_changed" });
  expect(memoryCard(store)).toMatchObject({ revision: 1, lapses: 1 });
});

test("distinct quiz events retry CAS and retain the first initialized cadence", async () => {
  const store = new MemoryEventStore();
  const results = await Promise.all([applyFlashcardEvent(store, quiz("a"), NOW), applyFlashcardEvent(store, quiz("b"), new Date(NOW.getTime() + 5 * DAY_MS))]);
  expect(results.every((result) => result.applied)).toBe(true);
  expect(memoryCard(store)).toMatchObject({ revision: 2, intervalDays: 1, repetitions: 1 });
  expect(memoryCard(store).dueAt.getTime()).toBe(NOW.getTime() + DAY_MS);
  expect(memoryCard(store).events).toHaveLength(2);
  expect(store.swaps).toBe(3);
});

test("quiz CAS loss to a manual review recomputes instead of overwriting the established schedule", async () => {
  const store = new MemoryEventStore();
  store.beforeCompare = () => {
    store.beforeCompare = undefined;
    const result = scheduleReview(memoryCard(store), "easy", NOW);
    store.commit({ id: review(5).id, kind: "review", rating: "easy", expectedRevision: 0, correct: null, result });
  };
  const result = await applyFlashcardEvent(store, quiz(), new Date(NOW.getTime() + DAY_MS));
  expect(result.applied).toBe(true);
  expect(result.receipt.result).toMatchObject({ revision: 2, intervalDays: 4, repetitions: 2, lastReviewedAt: NOW });
  expect(result.receipt.result.dueAt.getTime()).toBe(NOW.getTime() + 4 * DAY_MS);
  expect(store.swaps).toBe(2);
});

test("CAS retries are bounded at three writes, with a final read to recover a competing receipt", async () => {
  const exhausted = new MemoryEventStore();
  exhausted.failComparisons = 10;
  await expect(applyFlashcardEvent(exhausted, quiz(), NOW)).rejects.toMatchObject({ code: "concurrent_update" });
  expect(exhausted.swaps).toBe(MAX_FLASHCARD_CAS_ATTEMPTS);
  expect(exhausted.reads).toBe(MAX_FLASHCARD_CAS_ATTEMPTS + 1);
  expect(memoryCard(exhausted).revision).toBe(0);

  const recovered = new MemoryEventStore();
  recovered.failComparisons = 3;
  recovered.beforeCompare = (_snapshot, receipt) => { if (recovered.swaps === 3) recovered.commit(receipt); };
  const result = await applyFlashcardEvent(recovered, quiz(), NOW);
  expect(result.applied).toBe(false);
  expect(recovered.swaps).toBe(3);
  expect(memoryCard(recovered).events).toHaveLength(1);
});

test("the event cap refuses new events but retains canonical replies for the oldest receipt", async () => {
  const store = new MemoryEventStore();
  const events = Array.from({ length: MAX_FLASHCARD_EVENTS }, (_, index) => retainedReceipt(index));
  const oldest = events[0];
  store.state = { ...memoryCard(store), revision: MAX_FLASHCARD_EVENTS, events };
  const before = structuredClone(memoryCard(store));
  await expect(applyFlashcardEvent(store, review(1, MAX_FLASHCARD_EVENTS), NOW)).rejects.toMatchObject({ code: "event_limit" });
  const retry = await applyFlashcardEvent(store, { id: oldest.id, kind: "quiz", correct: true }, NOW);
  expect(retry.applied).toBe(false);
  expect(retry.receipt).toEqual(oldest);
  expect(memoryCard(store)).toEqual(before);
  expect(store.swaps).toBe(0);
});

test("the atomic event-absence and capacity guards also protect changes after a read", async () => {
  const duplicate = new MemoryEventStore();
  duplicate.beforeCompare = (_snapshot, receipt) => {
    duplicate.beforeCompare = undefined;
    duplicate.state = { ...memoryCard(duplicate), events: [structuredClone(receipt)] };
  };
  const retry = await applyFlashcardEvent(duplicate, review(), NOW);
  expect(retry.applied).toBe(false);
  expect(memoryCard(duplicate).events).toHaveLength(1);
  expect(duplicate.swaps).toBe(1);

  const capped = new MemoryEventStore();
  capped.beforeCompare = () => {
    capped.beforeCompare = undefined;
    capped.state = { ...memoryCard(capped), events: Array.from({ length: MAX_FLASHCARD_EVENTS }, (_, index) => retainedReceipt(index)) };
  };
  await expect(applyFlashcardEvent(capped, review(), NOW)).rejects.toMatchObject({ code: "event_limit" });
  expect(memoryCard(capped).revision).toBe(0);
});

test("a failure before commit leaves no receipt and a caller retry can safely apply the event", async () => {
  const store = new MemoryEventStore();
  store.beforeCompare = () => { store.beforeCompare = undefined; throw new Error("Injected before commit"); };
  await expect(applyFlashcardEvent(store, review(), NOW)).rejects.toThrow("Injected before commit");
  expect(memoryCard(store)).toMatchObject({ revision: 0, events: [] });
  expect((await applyFlashcardEvent(store, review(), NOW)).applied).toBe(true);
  expect(memoryCard(store).events).toHaveLength(1);
});

test("a lost acknowledgement after commit replays the original receipt after restart", async () => {
  const store = new MemoryEventStore();
  store.afterCommit = () => { store.afterCommit = undefined; throw new Error("Injected lost acknowledgement"); };
  await expect(applyFlashcardEvent(store, review(1, 0, "again"), NOW)).rejects.toThrow("Injected lost acknowledgement");
  const persisted = structuredClone(memoryCard(store));
  const restarted = new MemoryEventStore();
  restarted.state = persisted;
  const replay = await applyFlashcardEvent(restarted, review(1, 0, "again"), new Date(NOW.getTime() + DAY_MS));
  expect(replay.applied).toBe(false);
  expect(replay.receipt).toEqual(persisted.events[0]);
  expect(memoryCard(restarted)).toMatchObject({ revision: 1, lapses: 1 });
  expect(restarted.swaps).toBe(0);
});

test("a durable outbox can replay a partial multi-card quiz without applying the first card twice", async () => {
  const stores = [new MemoryEventStore(), new MemoryEventStore()];
  stores[1].beforeCompare = () => { stores[1].beforeCompare = undefined; throw new Error("Injected partial batch crash"); };
  async function applyBatch(now: Date) {
    const results = [];
    for (const store of stores) results.push(await applyFlashcardEvent(store, quiz("completed-session", false, 0), now));
    return results;
  }
  await expect(applyBatch(NOW)).rejects.toThrow("Injected partial batch crash");
  expect(stores.map((store) => memoryCard(store).revision)).toEqual([1, 0]);
  const retried = await applyBatch(new Date(NOW.getTime() + DAY_MS));
  expect(retried.map((result) => result.applied)).toEqual([false, true]);
  expect(stores.map((store) => memoryCard(store).lapses)).toEqual([1, 1]);
  expect(stores.every((store) => memoryCard(store).events.length === 1)).toBe(true);
});

test("the schema uses deterministic string identity, retained embedded receipts, and non-TTL due indexes", () => {
  expect(Flashcard.schema.path("_id").instance).toBe("String");
  expect(Flashcard.schema.path("events").options.select).toBe(false);
  expect(Flashcard.schema.options.autoIndex).toBe(false);
  expect(Flashcard.schema.options.autoCreate).toBe(false);
  expect(Flashcard.schema.options.versionKey).toBe(false);
  const indexes = Flashcard.schema.indexes();
  expect(indexes.map(([key]) => key)).toEqual([
    { userId: 1, dueAt: 1, _id: 1 },
    { userId: 1, documentId: 1, dueAt: 1, _id: 1 },
    { userId: 1, documentId: 1, templateId: 1, materialIndex: 1 },
  ]);
  expect(indexes.every(([, options]) => options.expireAfterSeconds === undefined)).toBe(true);
});

test("the offline schema validates copied QA, references, and receipt results without any session", async () => {
  const documentId = "1234567890abcdef12345678";
  const model = new Flashcard({
    _id: `${documentId}:template-1:0`,
    userId: "abcdef1234567890abcdef12",
    documentId,
    templateId: "template-1",
    materialIndex: 0,
    question: "What is the main concept?",
    answer: "The complete answer copied from the document lesson.",
    sourceRefs: [{ documentId, segmentId: "s-0001", label: "Page 1", page: 1 }],
    ...createReviewSchedule(NOW),
    events: [retainedReceipt(1)],
  });
  await expect(model.validate()).resolves.toBeUndefined();
  expect(model.question).toBe("What is the main concept?");
  expect(model.sourceRefs[0].documentId).toBe(documentId);
  expect(model.events[0].result.dueAt).toEqual(NOW);
  model.intervalDays = 366;
  model.ease = 1.2;
  model.revision = 1.5;
  await expect(model.validate()).rejects.toMatchObject({ errors: { intervalDays: expect.anything(), ease: expect.anything(), revision: expect.anything() } });
});
