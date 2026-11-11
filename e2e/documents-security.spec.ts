import { expect, test } from "@playwright/test";

test("private documents sources and flashcards require authentication", async ({ request, baseURL }) => {
  for (const path of ["/api/documents", "/api/documents/000000000000000000000111/sources/s-0001", "/api/flashcards"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  for (const path of ["/api/documents/000000000000000000000111/study", "/api/flashcards/owned-card/review"]) {
    const response = await request.post(path, { headers: { Origin: new URL(baseURL!).origin }, data: {} });
    expect(response.status()).toBe(401);
  }
});

test("cross-site document and review mutations fail before data access", async ({ request }) => {
  for (const path of ["/api/documents", "/api/documents/000000000000000000000111/study", "/api/flashcards/owned-card/review"]) {
    const response = await request.post(path, { headers: { Origin: "https://foreign.example" }, data: {} });
    expect(response.status()).toBe(403);
  }
  const deletion = await request.delete("/api/documents/000000000000000000000111", { headers: { Origin: "https://foreign.example" } });
  expect(deletion.status()).toBe(403);
});
