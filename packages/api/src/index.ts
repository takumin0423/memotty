import { Hono } from "hono";

import { demoMessages } from "./demo/messages.ts";
import { PROBLEM_JSON_HEADERS, problemDetails } from "./lib/problem-details.ts";

export const app = new Hono()
  .basePath("/api")
  .route("/demo/messages", demoMessages)
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
