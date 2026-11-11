import "server-only";
import { randomUUID } from "node:crypto";
import { getAiProvidersConfig } from "@/lib/env";
import { AiServiceError } from "@/lib/ai-error";
import { generateWithProviders } from "@/lib/ai-router";
import { getGroqTokenLedger } from "@/lib/groq-budget-store";

export { AiServiceError };

export async function generateLesson(topic: string, stageTitle: string) {
  const { content: generated, generation } = await generateWithProviders(topic, stageTitle, getAiProvidersConfig(), { getLedger: getGroqTokenLedger });

  const questions = generated.quiz.map((question) => {
    const questionId = randomUUID();
    const options = question.options.map((text) => ({ id: randomUUID(), text }));
    return {
      publicQuestion: { id: questionId, prompt: question.question, options },
      answer: {
        questionId,
        correctOptionId: options[question.correctAnswer].id,
        explanation: question.explanation,
      },
    };
  });

  return {
    title: generated.title,
    overview: generated.overview,
    estimatedMinutes: generated.estimatedMinutes,
    material: generated.material.map((item) => ({ id: randomUUID(), ...item })),
    questions: questions.map((item) => item.publicQuestion),
    answerKey: questions.map((item) => item.answer),
    generation,
  };
}
