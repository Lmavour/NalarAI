import type { RecallRating } from "../types/documents";

export const RECALL_RATINGS = ["again", "hard", "good", "easy"] as const;
export const MAX_REVIEW_INTERVAL_DAYS = 365;
export const MIN_REVIEW_EASE = 1.3;
const DAY_MS = 86_400_000;
const AGAIN_INTERVAL_DAYS = 10 / (24 * 60);

export type ReviewSchedule = {
  dueAt: Date;
  intervalDays: number;
  repetitions: number;
  ease: number;
  lapses: number;
  lastReviewedAt: Date | null;
  revision: number;
};

function checkedDate(date: Date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new RangeError("Invalid scheduling date");
  return new Date(date.getTime());
}

function checkedSchedule(schedule: ReviewSchedule, now: Date): ReviewSchedule {
  checkedDate(now);
  if (!Number.isFinite(schedule.intervalDays) || schedule.intervalDays < 0 || schedule.intervalDays > MAX_REVIEW_INTERVAL_DAYS ||
      !Number.isFinite(schedule.ease) || schedule.ease < MIN_REVIEW_EASE ||
      [schedule.repetitions, schedule.lapses, schedule.revision].some((value) => !Number.isSafeInteger(value) || value < 0 || value >= Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Invalid review schedule");
  }
  return {
    dueAt: checkedDate(schedule.dueAt),
    intervalDays: schedule.intervalDays,
    repetitions: schedule.repetitions,
    ease: schedule.ease,
    lapses: schedule.lapses,
    lastReviewedAt: schedule.lastReviewedAt === null ? null : checkedDate(schedule.lastReviewedAt),
    revision: schedule.revision,
  };
}

function dueAfter(now: Date, intervalDays: number) {
  return checkedDate(new Date(now.getTime() + Math.round(intervalDays * DAY_MS)));
}

/** New cards are immediately due; the clock is supplied by the caller. */
export function createReviewSchedule(now: Date): ReviewSchedule {
  return { dueAt: checkedDate(now), intervalDays: 0, repetitions: 0, ease: 2.5, lapses: 0, lastReviewedAt: null, revision: 0 };
}

/** A bounded SM-2-inspired transition, independent of persistence and rewards. */
export function scheduleReview(schedule: ReviewSchedule, rating: RecallRating, now: Date): ReviewSchedule {
  const current = checkedSchedule(schedule, now);
  if (!RECALL_RATINGS.includes(rating)) throw new RangeError("Invalid recall rating");
  let intervalDays: number;
  let repetitions = current.repetitions + 1;
  let ease = current.ease;
  let lapses = current.lapses;

  switch (rating) {
    case "again":
      intervalDays = AGAIN_INTERVAL_DAYS;
      repetitions = 0;
      ease -= 0.2;
      lapses += 1;
      break;
    case "hard":
      intervalDays = current.repetitions === 0 ? 0.25 : Math.max(0.25, Math.round(current.intervalDays * 1.2 * 100) / 100);
      ease -= 0.15;
      break;
    case "good":
      intervalDays = current.repetitions === 0 ? 1 : current.repetitions === 1 ? 3 : Math.max(1, Math.round(current.intervalDays * ease));
      break;
    case "easy":
      intervalDays = current.repetitions === 0 ? 4 : Math.max(4, Math.round(current.intervalDays * ease * 1.3));
      // Easy graduates past the initial 1d/3d steps rather than shortening a 4d interval next time.
      repetitions = Math.max(2, repetitions);
      ease += 0.15;
      break;
  }

  intervalDays = Math.min(MAX_REVIEW_INTERVAL_DAYS, intervalDays);
  ease = Math.max(MIN_REVIEW_EASE, Number(ease.toFixed(2)));
  return { dueAt: dueAfter(now, intervalDays), intervalDays, repetitions, ease, lapses, lastReviewedAt: checkedDate(now), revision: current.revision + 1 };
}

/** Quiz evidence initializes new cards, but a correct answer cannot postpone established reviews. */
export function scheduleQuizOutcome(schedule: ReviewSchedule, correct: boolean, now: Date): ReviewSchedule {
  const current = checkedSchedule(schedule, now);
  if (typeof correct !== "boolean") throw new RangeError("Invalid quiz outcome");
  if (!correct) {
    return { ...current, dueAt: new Date(Math.min(current.dueAt.getTime(), now.getTime())), intervalDays: 0, repetitions: 0, lapses: current.lapses + 1, revision: current.revision + 1 };
  }
  if (current.lastReviewedAt === null && current.repetitions === 0 && current.intervalDays === 0) {
    return { ...current, dueAt: dueAfter(now, 1), intervalDays: 1, repetitions: 1, revision: current.revision + 1 };
  }
  return { ...current, revision: current.revision + 1 };
}
