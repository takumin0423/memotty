import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { DetailedError } from "hono/client";

import { ProblemDetailsError } from "../../../components/problem-details-error.tsx";
import { demoMessageDetailOptions } from "../../../queries/demo-messages.ts";

export const Route = createFileRoute("/demo/messages/$id")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query(demoMessageDetailOptions(params.id));
    } catch (error) {
      if (error instanceof DetailedError && error.statusCode === 404) {
        throw notFound();
      }

      throw error;
    }
  },
  pendingComponent: () => <p>読み込み中・・・</p>,
  errorComponent: ProblemDetailsError,
  notFoundComponent: () => (
    <div>
      <h1>メッセージが見つかりません</h1>
      <Link to="/demo/messages">一覧に戻る</Link>
    </div>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(demoMessageDetailOptions(id));

  return (
    <article>
      <h1>{data.message.text}</h1>
      <p>作成日時 : {data.message.createdAt}</p>
      <Link to="/demo/messages">一覧に戻る</Link>
    </article>
  );
}
