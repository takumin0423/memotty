import { flattenErrors, sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { z } from "zod";

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

const VALIDATION_ERROR_TYPE = "https://memotty.app/problems/validation-error";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export const demoMessages = new Hono().get(
  "/",
  sValidator("query", listQuerySchema, (result, c) => {
    if (!result.success) {
      const { formErrors, fieldErrors } = flattenErrors(result.error);

      return c.json(
        {
          type: VALIDATION_ERROR_TYPE,
          title: "リクエストが不正です",
          status: 400,
          detail: "クエリパラメータが不正です",
          errors: [
            ...formErrors.map((detail) => ({ detail })),
            ...Object.entries(fieldErrors).flatMap(([parameter, details]) =>
              details.map((detail) => ({ parameter, detail })),
            ),
          ],
        },
        400,
        { "Content-Type": "application/problem+json" },
      );
    }
  }),
  (c) => {
    const query = c.req.valid("query");

    return c.json({ messages: messages.slice(0, query.limit) }, 200);
  },
);
