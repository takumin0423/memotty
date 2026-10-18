import { Hono } from "hono";

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

export const demoMessages = new Hono().get("/", (c) => c.json({ messages }, 200));
