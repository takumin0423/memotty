import { type ClientResponse, parseResponse } from "hono/client";
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

  test("parseResponse()がProblem DetailsをJSONとして読み、DetailedErrorに入れること", async () => {
    // 定義していないパスは RPC のクライアントで呼べないので、app.request() の Response を渡す。
    // ClientResponse は Response に無い redirect() を持つが、parseResponse() は実行時に使わない
    const res = (await app.request("/api/nope")) as unknown as ClientResponse<unknown>;
    const promise = parseResponse(res);

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
