import { expect, test } from "@playwright/test";

test("browser same-origin POST succeeds with the server bound to all interfaces", async ({ page }) => {
  await page.goto("/auth?mode=login", { waitUntil: "domcontentloaded" });
  const status = await page.evaluate(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    return response.status;
  });
  expect(status).toBe(204);
});

for (const hostname of ["localhost", "127.0.0.1"]) {
  test(`same-origin API requests work through ${hostname}`, async ({ request, baseURL }) => {
    const url = new URL(baseURL!);
    url.hostname = hostname;
    const response = await request.post(`${url.origin}/api/auth/logout`, {
      headers: { Origin: url.origin, "Sec-Fetch-Site": "same-origin" },
    });
    expect(response.status()).toBe(204);
  });
}

test("cross-origin headers cannot claim same-origin access", async ({ request }) => {
  const response = await request.post("/api/auth/logout", {
    headers: {
      Origin: "https://untrusted.example",
      "Sec-Fetch-Site": "same-origin",
      "X-Forwarded-Host": "untrusted.example",
    },
  });
  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({ code: "INVALID_ORIGIN" });
});

test("cross-site fetch metadata is rejected even with a matching origin", async ({ request, baseURL }) => {
  const response = await request.post("/api/auth/logout", {
    headers: { Origin: new URL(baseURL!).origin, "Sec-Fetch-Site": "cross-site" },
  });
  expect(response.status()).toBe(403);
});

test("origin validation rejects a mismatched port and invalid origin values", async ({ request, baseURL }) => {
  const mismatchedPort = new URL(baseURL!);
  mismatchedPort.port = "3001";
  for (const origin of [mismatchedPort.origin, "null", `${baseURL}/not-an-origin`]) {
    const response = await request.post("/api/auth/logout", {
      headers: { Origin: origin, "Sec-Fetch-Site": "same-origin" },
    });
    expect(response.status()).toBe(403);
  }
});
