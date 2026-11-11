import { z } from "zod";

export const generatedLessonSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    overview: z.string().trim().min(20).max(600),
    estimatedMinutes: z.number().int().min(3).max(15),
    material: z
      .array(z.object({
        title: z.string().trim().min(3).max(100),
        content: z.string().trim().min(80).max(1_200),
        keyTakeaway: z.string().trim().min(15).max(280),
      }).strict())
      .min(2)
      .max(4),
    quiz: z
      .array(z.object({
        question: z.string().trim().min(10).max(300),
        options: z.array(z.string().trim().min(1).max(180)).length(4),
        correctAnswer: z.number().int().min(0).max(3),
        explanation: z.string().trim().min(15).max(600),
      }).strict())
      .min(3)
      .max(5),
  })
  .strict();

export const LESSON_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "overview", "estimatedMinutes", "material", "quiz"],
  properties: {
    title: { type: "string", minLength: 3, maxLength: 120 },
    overview: { type: "string", minLength: 20, maxLength: 600 },
    estimatedMinutes: { type: "integer", minimum: 3, maximum: 15 },
    material: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "content", "keyTakeaway"],
        properties: {
          title: { type: "string", minLength: 3, maxLength: 100 },
          content: { type: "string", minLength: 80, maxLength: 1200 },
          keyTakeaway: { type: "string", minLength: 15, maxLength: 280 },
        },
      },
    },
    quiz: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "correctAnswer", "explanation"],
        properties: {
          question: { type: "string", minLength: 10, maxLength: 300 },
          options: { type: "array", minItems: 4, maxItems: 4, items: { type: "string", minLength: 1, maxLength: 180 } },
          correctAnswer: { type: "integer", minimum: 0, maximum: 3 },
          explanation: { type: "string", minLength: 15, maxLength: 600 },
        },
      },
    },
  },
} as const;

/** Accept one complete JSON envelope, never prose, multiple blocks, or executable text. */
export function parseJsonEnvelope(reply: string): unknown {
  const text = reply.trim();
  const fence = /^```(?:json)?[\t ]*\r?\n([\s\S]*?)\r?\n```$/i.exec(text);
  const json = fence ? fence[1].trim() : text;
  if (!json.startsWith("{") || !json.endsWith("}")) throw new Error("AI did not return a JSON object");
  return JSON.parse(json) as unknown;
}

export function parseLessonContent(reply: string) {
  return generatedLessonSchema.parse(parseJsonEnvelope(reply));
}

export const LESSON_SYSTEM_PROMPT = "You are NalarAI's secure Indonesian learning-content engine. Follow the requested schema exactly, return only JSON, teach accurately, and never include HTML, URLs, personal data, Markdown, or additional keys.";

export function buildLessonPrompt(topic: string, stageTitle: string, compact = false) {
  return `Create one bite-sized lesson for the topic "${topic}" at the stage "${stageTitle}".
Write all learner-facing text in clear, friendly Indonesian. Teach accurately, use one relatable analogy, and avoid unsupported claims.

Return ONLY raw JSON. Do not use markdown, code fences, comments, or text outside the JSON.
Use exactly this shape:
{"title":"string","overview":"string","estimatedMinutes":6,"material":[{"title":"string","content":"string","keyTakeaway":"string"}],"quiz":[{"question":"string","options":["string","string","string","string"],"correctAnswer":0,"explanation":"string"}]}

Rules:
- Provide 3 material items, each focused on one idea and ${compact ? "80-180" : "80-700"} characters long.
- Provide 4 multiple-choice quiz items with exactly 4 distinct options each.
- correctAnswer must be the zero-based integer index of the correct option.
- Explanations must teach why the answer is correct, not merely repeat it.
- Do not include HTML, URLs, personal data, or additional JSON keys.${compact ? "\n- Keep titles under 40 characters, quiz questions under 100, options under 70, takeaways under 100, and explanations under 120. Be concise so the complete JSON fits a 2048-token completion budget." : ""}`;
}
