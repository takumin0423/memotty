import { parseResponse } from "hono/client";
import { testClient } from "hono/testing";
import { describe, expect, test } from "vitest";

import { app } from "../index.ts";

describe("GET /api/demo/messages", () => {
  const DEFAULT_LIMIT = 3;
  const MAX_LIMIT = 5;
  const client = testClient(app);

  test("ステータスコードが200で、メッセージの配列を返すこと", async () => {
    const res = await client.api.demo.messages.$get({ query: {} });

    expect(res.status).toBe(200);

    const body = await parseResponse(res);

    expect(body.messages.length).toBeGreaterThan(0);
  });

  test("limitを指定しないと、既定の件数を返すこと", async () => {
    const body = await parseResponse(client.api.demo.messages.$get({ query: {} }));

    expect(body.messages).toHaveLength(DEFAULT_LIMIT);
  });

  test("limit = 2を指定すると、2件だけ返すこと", async () => {
    const body = await parseResponse(client.api.demo.messages.$get({ query: { limit: "2" } }));

    expect(body.messages).toHaveLength(2);
  });

  test.each([
    {
      limit: "0",
    },
    {
      limit: "abc",
    },
    {
      limit: String(MAX_LIMIT + 1),
    },
  ])("limit = $limit の時、ステータスコード400でProblem Detailsを返すこと", async ({ limit }) => {
    const res = await client.api.demo.messages.$get({ query: { limit } });

    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");
    expect(await res.json()).toMatchObject({
      type: "https://memotty.app/problems/validation-error",
      status: 400,
      errors: [
        {
          parameter: "limit",
        },
      ],
    });
  });
});
