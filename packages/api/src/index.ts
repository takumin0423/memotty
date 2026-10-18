import { Hono } from "hono";
import { demoMessages } from "./demo/messages.ts";

export const app = new Hono().basePath("/api").route("/demo/messages", demoMessages);

export type AppType = typeof app;
