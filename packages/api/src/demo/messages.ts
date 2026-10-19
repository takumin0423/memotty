import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { z } from "zod";

import { PROBLEM_JSON_HEADERS, problemDetails } from "../lib/problem-details.ts";

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 5;

type Message = {
  id: string;
  text: string;
  createdAt: string;
};

const messages: Message[] = [
  { id: "1", text: "おはようございます", createdAt: "2026-10-01T09:00:00Z" },
  { id: "2", text: "今日の予定を確認する", createdAt: "2026-10-01T09:15:00Z" },
  { id: "3", text: "Hono のルーティングを読む", createdAt: "2026-10-02T13:30:00Z" },
  { id: "4", text: "Zod のスキーマを書く", createdAt: "2026-10-03T10:45:00Z" },
  { id: "5", text: "TanStack Router を試す", createdAt: "2026-10-04T16:20:00Z" },
];

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export const demoMessages = new Hono()
  .get(
    "/",
    sValidator("query", listQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          problemDetails(400, "Bad Request", `limit は 1〜${MAX_LIMIT} の整数で指定してください`),
          400,
          PROBLEM_JSON_HEADERS,
        );
      }
    }),
    (c) => {
      const query = c.req.valid("query");

      return c.json({ messages: messages.slice(0, query.limit) }, 200);
    },
  )
  .get("/:id", (c) => {
    const id = c.req.param("id");
    const message = messages.find((m) => m.id === id);

    if (!message) {
      return c.json(
        problemDetails(404, "Not Found", "指定されたメッセージは存在しません"),
        404,
        PROBLEM_JSON_HEADERS,
      );
    }

    return c.json({ message }, 200);
  });
