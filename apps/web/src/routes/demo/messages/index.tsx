import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import { ProblemDetailsError } from "../../../components/problem-details-error.tsx";
import { demoMessageListOptions } from "../../../queries/demo-messages.ts";

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 5;
const LIMIT_OPTIONS = Array.from({ length: MAX_LIMIT }, (_, i) => i + 1);

const searchSchema = z.object({
  limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).catch(DEFAULT_LIMIT),
});

export const Route = createFileRoute("/demo/messages/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ limit: search.limit }),
  loader: ({ context, deps }) => context.queryClient.query(demoMessageListOptions(deps.limit)),
  pendingComponent: () => <p>読み込み中・・・</p>,
  errorComponent: ProblemDetailsError,
  component: RouteComponent,
});

function RouteComponent() {
  const { limit } = Route.useSearch();
  const { data } = useSuspenseQuery(demoMessageListOptions(limit));

  return (
    <>
      <nav>
        表示件数 :
        {LIMIT_OPTIONS.map((n) => (
          <Link
            key={n}
            to="/demo/messages"
            search={{ limit: n }}
            activeProps={{ style: { fontWeight: "bold" } }}
          >
            {n}
          </Link>
        ))}
      </nav>
      <ul>
        {data.messages.map((message) => (
          <li key={message.id}>
            <Link to="/demo/messages/$id" params={{ id: message.id }}>
              {message.text}
            </Link>{" "}
            ({message.createdAt})
          </li>
        ))}
      </ul>
    </>
  );
}
