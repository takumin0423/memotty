import { Hono } from "hono";

export const app = new Hono().basePath("/api").get("/health", (c) => {
  return c.json(
    {
      status: "ok",
    },
    200,
  );
});

export type AppType = typeof app;
