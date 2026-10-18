import { expect, test } from "vitest";
import { app } from "./index.ts";

test("GET /api/healthが200を返す", async () => {
  const response = await app.request("/api/health");

  expect(response.status).toBe(200);
});

test(`GET /api/healthのボディが{"status": "ok"}になる`, async () => {
  const response = await app.request("/api/health");

  expect(await response.json()).toEqual({ status: "ok" });
});
