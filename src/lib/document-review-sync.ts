import "server-only";
import { applyDocumentQuizOutcome } from "@/lib/flashcards";
import { LessonSession } from "@/models/lesson-session";
import { StudyDocument } from "@/models/study-document";

export async function syncDocumentQuizReview(userId: string, sessionId: string) {
  const session = await LessonSession.findOne({ _id: sessionId, userId, reviewSyncPending: true }).lean();
  if (!session?.documentId || !session.templateId || session.answers.length !== session.questions.length) return;
  if (!await StudyDocument.exists({ _id: session.documentId, userId, status: "ready" })) {
    await LessonSession.deleteOne({ _id: session._id, userId });
    return;
  }
  const answers = session.answers.map((answer) => {
    const materialIndex = session.questions.find((question) => question.id === answer.questionId)?.materialIndex;
    if (materialIndex === undefined || materialIndex === null) throw new Error("Document quiz concept mapping is missing");
    return { materialIndex, correct: answer.correct };
  });
  await applyDocumentQuizOutcome({ userId, documentId: String(session.documentId), templateId: session.templateId, sessionId, answers });
  await LessonSession.updateOne({ _id: session._id, userId, reviewSyncPending: true }, { $set: { reviewSyncPending: false, reviewSyncedAt: new Date(), purgeAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
}

export async function reconcileDocumentReviews(userId: string) {
  const pending = await LessonSession.find({ userId, reviewSyncPending: true }).sort({ createdAt: 1 }).limit(20).select("_id").lean();
  for (const session of pending) await syncDocumentQuizReview(userId, String(session._id));
}
