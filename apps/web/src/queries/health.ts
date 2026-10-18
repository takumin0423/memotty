import { queryOptions } from "@tanstack/react-query";
import { client } from "../lib/api-client.ts";

export const healthQueryOptions = queryOptions({
  queryKey: ["health"],
  queryFn: async () => {
    const res = await client.api.health.$get();

    if (!res.ok) {
      throw new Error(`GET /api/health failed: ${res.status}`);
    }

    return res.json();
  },
});
