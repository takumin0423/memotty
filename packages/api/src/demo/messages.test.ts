import { parseResponse } from "hono/client";
import { testClient } from "hono/testing";
import { describe, expect, test } from "vitest";

import { app } from "../index.ts";

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 5;
const client = testClient(app);

describe("GET /api/demo/messages", () => {
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
      title: "Bad Request",
      status: 400,
    });
  });
});

describe("GET /api/demo/messages/:id", () => {
  test.each([
    {
      id: "1",
      expected: {
        id: "1",
        text: "おはようございます",
        createdAt: "2026-10-01T09:00:00Z",
      },
    },
    {
      id: "3",
      expected: {
        id: "3",
        text: "Hono のルーティングを読む",
        createdAt: "2026-10-02T13:30:00Z",
      },
    },
  ])(
    "id = $id の時、ステータスコード200で該当するメッセージを返すこと",
    async ({ id, expected }) => {
      const res = await client.api.demo.messages[":id"].$get({
        param: {
          id,
        },
      });

      expect(res.status).toBe(200);

      const body = await parseResponse(res);

      expect(body.message).toEqual(expected);
    },
  );

  test("存在しないidの時、ステータスコード404でProblem Detailsを返すこと", async () => {
    const res = await client.api.demo.messages[":id"].$get({
      param: {
        id: "999",
      },
    });

    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");
    expect(await res.json()).toMatchObject({
      title: "Not Found",
      status: 404,
    });
  });

  test("parseResponse()がProblem DetailsをJSONとして読み、DetailedErrorに入れること", async () => {
    const promise = parseResponse(
      client.api.demo.messages[":id"].$get({
        param: {
          id: "999",
        },
      }),
    );

    await expect(promise).rejects.toMatchObject({
      statusCode: 404,
      detail: {
        data: {
          title: "Not Found",
          status: 404,
        },
      },
    });
  });
});
