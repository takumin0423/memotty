import { queryOptions } from "@tanstack/react-query";
import { parseResponse } from "hono/client";

import { client } from "../lib/api-client.ts";

export function demoMessageListOptions(limit: number) {
  return queryOptions({
    queryKey: ["demo", "messages", "list", { limit }],
    queryFn: () =>
      parseResponse(client.api.demo.messages.$get({ query: { limit: String(limit) } })),
  });
}

export function demoMessageDetailOptions(id: string) {
  return queryOptions({
    queryKey: ["demo", "messages", "detail", id],
    queryFn: () => parseResponse(client.api.demo.messages[":id"].$get({ param: { id } })),
  });
}
