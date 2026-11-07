import "server-only";
import { randomUUID } from "node:crypto";
import { getGeminiConfig } from "@/lib/env";
import { AiServiceError, requestGeminiLesson } from "@/lib/gemini";
import { buildLessonPrompt, LESSON_SYSTEM_PROMPT, parseLessonContent } from "@/lib/lesson-content";

export { AiServiceError };

export async function generateLesson(topic: string, stageTitle: string) {
  const { apiKey, model } = getGeminiConfig();
  const reply = await requestGeminiLesson({ apiKey, model, prompt: buildLessonPrompt(topic, stageTitle), systemInstruction: LESSON_SYSTEM_PROMPT });

  let generated: ReturnType<typeof parseLessonContent>;
  try {
    generated = parseLessonContent(reply);
  } catch {
    throw new AiServiceError("AI lesson JSON failed validation", "invalid-response");
  }

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
  };
}
