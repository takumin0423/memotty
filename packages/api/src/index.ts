import { Hono } from "hono";

import { PROBLEM_JSON_HEADERS, problemDetails } from "./lib/problem-details.ts";

export const app = new Hono()
  .basePath("/api")
  .notFound((c) =>
    c.json(
      problemDetails(404, "Not Found", "指定されたパスは存在しません"),
      404,
      PROBLEM_JSON_HEADERS,
    ),
  )
  .onError((error, c) => {
    console.error(error);

    return c.json(
      problemDetails(500, "Internal Server Error", "サーバーでエラーが発生しました"),
      500,
      PROBLEM_JSON_HEADERS,
    );
  });

export type AppType = typeof app;
