import type { CourseData, CourseQuestion } from '../types';

const COURSE_API_URL = 'https://nekolabs.my.id/v1/ai/cloudai';

export function buildCoursePrompt(topic: string): string {
  return `You are an educational AI. Create a micro-course about: ${topic}. You MUST output ONLY valid raw JSON without any markdown formatting or code blocks. JSON Schema: { "material": ["short paragraph 1", "short paragraph 2"], "quiz": [ { "question": "...", "options": ["A","B","C","D"], "correctAnswer": "A", "explanation": "..." } ] }`;
}

function isCourseQuestion(value: unknown): value is CourseQuestion {
  if (!value || typeof value !== 'object') return false;

  const question = value as Record<string, unknown>;
  return (
    typeof question.question === 'string' &&
    question.question.trim().length > 0 &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every(option => typeof option === 'string' && option.trim().length > 0) &&
    typeof question.correctAnswer === 'string' &&
    question.correctAnswer.trim().length > 0 &&
    typeof question.explanation === 'string' &&
    question.explanation.trim().length > 0
  );
}

function validateCourse(value: unknown): CourseData {
  if (!value || typeof value !== 'object') {
    throw new Error('The AI returned an invalid course. Please try again.');
  }

  const course = value as Record<string, unknown>;
  const hasMaterials =
    Array.isArray(course.material) &&
    course.material.length > 0 &&
    course.material.every(item => typeof item === 'string' && item.trim().length > 0);
  const hasQuiz =
    Array.isArray(course.quiz) &&
    course.quiz.length > 0 &&
    course.quiz.every(isCourseQuestion);

  if (!hasMaterials || !hasQuiz) {
    throw new Error('The AI returned an incomplete course. Please try again.');
  }

  const validatedCourse = {
    material: (course.material as string[]).map(item => item.trim()),
    quiz: (course.quiz as CourseQuestion[]).map(question => ({
      question: question.question.trim(),
      options: question.options.map(option => option.trim()),
      correctAnswer: question.correctAnswer.trim(),
      explanation: question.explanation.trim(),
    })),
  };

  if (validatedCourse.quiz.some(question => getCorrectOptionIndex(question) < 0)) {
    throw new Error('The AI returned a quiz without a valid answer key. Please try again.');
  }

  return validatedCourse;
}

function parseCourseReply(aiText: string): CourseData {
  try {
    return validateCourse(JSON.parse(aiText));
  } catch (error) {
    const cleanedText = aiText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    if (cleanedText === aiText.trim()) throw error;
    return validateCourse(JSON.parse(cleanedText));
  }
}

export async function generateCourse(topic: string, signal?: AbortSignal): Promise<CourseData> {
  const content = buildCoursePrompt(topic);
  const url = `${COURSE_API_URL}?content=${encodeURIComponent(content)}&conversationId=&deviceId=&needSearch=0`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`The course service is unavailable right now (${response.status}).`);
  }

  const data: unknown = await response.json();
  const aiText =
    data && typeof data === 'object'
      ? (data as { result?: { reply?: unknown } }).result?.reply
      : undefined;

  if (typeof aiText !== 'string' || !aiText.trim()) {
    throw new Error('The AI returned an empty response. Please try again.');
  }

  return parseCourseReply(aiText);
}

export function getCorrectOptionIndex(question: CourseQuestion): number {
  const answer = question.correctAnswer.trim();
  const directMatch = question.options.findIndex(
    option => option.trim().toLocaleLowerCase() === answer.toLocaleLowerCase(),
  );

  if (directMatch >= 0) return directMatch;

  const letterMatch = answer.match(/^([A-D])(?:[.)\s:]|$)/i);
  if (letterMatch) return letterMatch[1].toUpperCase().charCodeAt(0) - 65;

  return -1;
}
