import type { AppType } from "@memotty/api";
import { hc } from "hono/client";

export const client = hc<AppType>("/");
