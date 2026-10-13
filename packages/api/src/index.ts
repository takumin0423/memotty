import { Hono } from "hono";

const app = new Hono().basePath("/api").get("/health", (c) => {
  return c.json(
    {
      status: "ok",
    },
    200,
  );
});

export default app;
export type AppType = typeof app;
