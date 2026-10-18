import { createFileRoute } from "@tanstack/react-router";
import { healthQueryOptions } from "../queries/health.ts";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.query(healthQueryOptions),
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(healthQueryOptions);

  return (
    <div>
      <p>status: {data.status}</p>
    </div>
  );
}
