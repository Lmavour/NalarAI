import { expect, test } from "@playwright/test";
import { parseLessonContent } from "../src/lib/lesson-content";

const validLesson = {
  title: "Fondasi fotosintesis",
  overview: "Pahami bagaimana tumbuhan menyimpan energi cahaya dalam bentuk energi kimia.",
  estimatedMinutes: 6,
  material: Array.from({ length: 3 }, (_, index) => ({
    title: `Konsep fotosintesis ${index + 1}`,
    content: "Klorofil menangkap energi cahaya, kemudian tumbuhan menggunakan energi tersebut untuk menyusun gula dari air dan karbon dioksida.",
    keyTakeaway: "Fotosintesis mengubah energi cahaya menjadi energi kimia.",
  })),
  quiz: Array.from({ length: 4 }, (_, index) => ({
    question: `Apa peran klorofil dalam fotosintesis pada pertanyaan ${index + 1}?`,
    options: ["Menangkap energi cahaya", "Melepas energi listrik", "Membuat air", "Menghancurkan gula"],
    correctAnswer: 0,
    explanation: "Klorofil menangkap cahaya yang dibutuhkan tumbuhan untuk membentuk gula.",
  })),
};

const raw = JSON.stringify(validLesson);

for (const [name, reply] of [
  ["raw JSON", raw],
  ["a JSON code fence", `\`\`\`json\n${raw}\n\`\`\``],
  ["an unlabelled code fence", `\`\`\`\n${raw}\n\`\`\``],
  ["CRLF and uppercase JSON fences", `\`\`\`JSON\r\n${raw}\r\n\`\`\``],
  ["outer whitespace", ` \n\`\`\`json\n${raw}\n\`\`\`\n `],
]) {
  test(`AI content accepts ${name} without changing the validation contract`, () => {
    expect(parseLessonContent(reply)).toEqual(validLesson);
  });
}

for (const [name, reply] of [
  ["prose before JSON", `Ini pelajaranmu: ${raw}`],
  ["prose after a fence", `\`\`\`json\n${raw}\n\`\`\`\nSemoga membantu`],
  ["two JSON blocks", `\`\`\`json\n${raw}\n\`\`\`\n\`\`\`json\n${raw}\n\`\`\``],
  ["an executable language fence", `\`\`\`javascript\n${raw}\n\`\`\``],
  ["an unfinished fence", `\`\`\`json\n${raw}`],
  ["an array instead of a lesson", `[${raw}]`],
  ["malformed JSON", '{"title":invalid}'],
]) {
  test(`AI content rejects ${name}`, () => {
    expect(() => parseLessonContent(reply)).toThrow();
  });
}

test("AI content still rejects schema drift and invalid answer indices", () => {
  expect(() => parseLessonContent(JSON.stringify({ ...validLesson, extra: true }))).toThrow();
  expect(() => parseLessonContent(JSON.stringify({ ...validLesson, quiz: [] }))).toThrow();
  expect(() => parseLessonContent(JSON.stringify({ ...validLesson, estimatedMinutes: "6" }))).toThrow();
  const lesson = structuredClone(validLesson);
  lesson.quiz[0].correctAnswer = 4;
  expect(() => parseLessonContent(JSON.stringify(lesson))).toThrow();
});

test("AI content preserves code-fence text inside legitimate lesson strings", () => {
  const lesson = structuredClone(validLesson);
  lesson.material[0].content += " Teks seperti ``` tidak diperlakukan sebagai instruksi program.";
  expect(parseLessonContent(`\`\`\`json\n${JSON.stringify(lesson)}\n\`\`\``)).toEqual(lesson);
});
