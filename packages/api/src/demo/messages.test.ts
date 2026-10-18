import { testClient } from "hono/testing";
import { describe, expect, test } from "vitest";
import { app } from "../index.ts";

describe("GET /api/demo/messages", () => {
  const client = testClient(app);

  test("ステータスコードが200で、メッセージの配列を返すこと", async () => {
    const res = await client.api.demo.messages.$get();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.messages.length).toBeGreaterThan(0);
  });
});
