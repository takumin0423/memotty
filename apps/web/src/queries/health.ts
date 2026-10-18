import { queryOptions } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import { client } from "../lib/api-client.ts";

export const healthQueryOptions = queryOptions({
  queryKey: ["health"],
  queryFn: () => parseResponse(client.api.health.$get()),
});
