type StoredAnswer = { questionId: string; optionId: string; correct: boolean; answeredAt: Date };

/** Completion and its review outbox are marked in the same write that saves the answer. */
export function answerStorageUpdate(answer: StoredAnswer, document: boolean) {
  if (!document) return { $push: { answers: answer } };
  return [
    { $set: { answers: { $concatArrays: ["$answers", { $literal: [answer] }] } } },
    { $set: { reviewSyncPending: { $eq: [{ $size: "$answers" }, { $size: "$questions" }] }, purgeAt: { $cond: [{ $eq: [{ $size: "$answers" }, { $size: "$questions" }] }, "$$REMOVE", "$purgeAt"] } } },
  ];
}
