import { expect, test } from "@playwright/test";
import { answerStorageUpdate } from "../src/lib/lesson-answer-policy";

const answer = { questionId: "00000000-0000-4000-8000-000000000001", optionId: "00000000-0000-4000-8000-000000000002", correct: false, answeredAt: new Date("2026-11-08T12:00:00Z") };

test("text answers preserve their existing append behavior", () => {
  expect(answerStorageUpdate(answer, false)).toEqual({ $push: { answers: answer } });
});

test("document completion retains its outbox and source evidence atomically", () => {
  const pipeline = answerStorageUpdate(answer, true);
  expect(pipeline).toEqual([
    { $set: { answers: { $concatArrays: ["$answers", { $literal: [answer] }] } } },
    { $set: { reviewSyncPending: { $eq: [{ $size: "$answers" }, { $size: "$questions" }] }, purgeAt: { $cond: [{ $eq: [{ $size: "$answers" }, { $size: "$questions" }] }, "$$REMOVE", "$purgeAt"] } } },
  ]);
});
