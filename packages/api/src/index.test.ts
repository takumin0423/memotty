import { describe, expect, test } from "vitest";

import { app } from "./index.ts";

describe("定義していないパス", () => {
  test("ステータスコード404でProblem Detailsを返すこと", async () => {
    const res = await app.request("/api/nope");

    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");
    expect(await res.json()).toMatchObject({
      title: "Not Found",
      status: 404,
    });
  });
});
