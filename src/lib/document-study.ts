import "server-only";
import { randomUUID } from "node:crypto";
import { getGeminiConfig } from "@/lib/env";
import { requestGeminiLesson } from "@/lib/gemini";
import { buildDocumentPrompt, documentResponseSchema, parseDocumentLesson, resolveSourceRefs } from "@/lib/document-content";
import { LESSON_SYSTEM_PROMPT } from "@/lib/lesson-content";
import { ensureDocumentFlashcards } from "@/lib/flashcards";
import { StudyDocument } from "@/models/study-document";
import type { TokenUsage } from "@/lib/ai-config";
import type { SourceSegment } from "@/types/documents";

export class StudyDocumentNotFoundError extends Error {
  constructor() { super("Dokumen tidak ditemukan."); this.name = "StudyDocumentNotFoundError"; }
}

export class DocumentStudyBusyError extends Error {
  constructor() { super("Materi dokumen sedang disusun. Coba lagi sebentar."); this.name = "DocumentStudyBusyError"; }
}

export async function prepareDocumentLesson(userId: string, documentId: string) {
  let document = await StudyDocument.findOne({ _id: documentId, userId, status: "ready" }).select("+sources +lessonTemplate").lean();
  if (!document) throw new StudyDocumentNotFoundError();
  let usage: TokenUsage | null = null;
  let cached = true;

  if (!document.lessonTemplate) {
    const leaseId = randomUUID();
    const leased = await StudyDocument.findOneAndUpdate({
      _id: documentId, userId, status: "ready", lessonTemplate: null,
      $or: [{ generationLeaseUntil: { $exists: false } }, { generationLeaseUntil: { $lte: new Date() } }],
    }, { $set: { generationLeaseId: leaseId, generationLeaseUntil: new Date(Date.now() + 4 * 60 * 1000) } }, { returnDocument: "after" }).select("+sources +lessonTemplate").lean();
    if (!leased) {
      document = await StudyDocument.findOne({ _id: documentId, userId, status: "ready" }).select("+sources +lessonTemplate").lean();
      if (!document) throw new StudyDocumentNotFoundError();
      if (!document.lessonTemplate) throw new DocumentStudyBusyError();
    } else {
      try {
        const { apiKey, model } = getGeminiConfig();
        const sources = leased.sources as SourceSegment[];
        const reply = await requestGeminiLesson({ apiKey, model, prompt: buildDocumentPrompt(leased.name, sources), systemInstruction: LESSON_SYSTEM_PROMPT, responseJsonSchema: documentResponseSchema(sources), onUsage: (value) => { usage = value; } });
        const template = parseDocumentLesson(reply, sources);
        document = await StudyDocument.findOneAndUpdate({ _id: documentId, userId, status: "ready", generationLeaseId: leaseId }, { $set: { lessonTemplate: template, templateId: randomUUID(), templateModel: model }, $unset: { generationLeaseId: 1, generationLeaseUntil: 1 } }, { returnDocument: "after" }).select("+sources +lessonTemplate").lean();
        if (!document) throw new StudyDocumentNotFoundError();
        cached = false;
      } catch (error) {
        await StudyDocument.updateOne({ _id: documentId, userId, generationLeaseId: leaseId }, { $unset: { generationLeaseId: 1, generationLeaseUntil: 1 } });
        throw error;
      }
    }
  }

  const sources = document.sources as SourceSegment[];
  const template = parseDocumentLesson(JSON.stringify(document.lessonTemplate), sources);
  const templateId = document.templateId;
  if (!templateId) throw new Error("Document template has no stable identity");
  await ensureDocumentFlashcards({ userId, documentId, templateId, lesson: template, sources });
  if (!await StudyDocument.exists({ _id: documentId, userId, status: "ready" })) throw new StudyDocumentNotFoundError();
  const material = template.material.map(({ sourceIds, ...item }) => ({ id: randomUUID(), ...item, sourceRefs: resolveSourceRefs(documentId, sourceIds, sources) }));
  const questions = template.quiz.map((item) => {
    const id = randomUUID();
    const options = item.options.map((text) => ({ id: randomUUID(), text }));
    const sourceRefs = material[item.materialIndex].sourceRefs;
    return { question: { id, prompt: item.question, options, materialIndex: item.materialIndex, sourceRefs }, answer: { questionId: id, correctOptionId: options[item.correctAnswer].id, explanation: item.explanation, sourceRefs } };
  });
  return {
    stageId: "document", topic: document.name.slice(0, 80), documentId, documentName: document.name, templateId,
    title: template.title, overview: template.overview, estimatedMinutes: template.estimatedMinutes,
    material, questions: questions.map((item) => item.question), answerKey: questions.map((item) => item.answer),
    generation: { provider: "gemini" as const, model: document.templateModel ?? getGeminiConfig().model, usage: (cached ? null : usage) as TokenUsage | null, cached },
  };
}
