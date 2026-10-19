import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { DetailedError } from "hono/client";
import { z } from "zod";

const problemDetailsSchema = z.object({
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
});

function toProblemDetails(error: unknown) {
  if (!(error instanceof DetailedError)) {
    return undefined;
  }

  const result = problemDetailsSchema.safeParse(error.detail?.data);

  return result.success ? result.data : undefined;
}

export function ProblemDetailsError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const problem = toProblemDetails(error);
  const fallbackMessage = error instanceof Error ? error.message : "原因がわからないエラーです";

  return (
    <div role="alert">
      <h1>{problem?.title ?? "エラーが発生しました"}</h1>
      <p>{problem?.detail ?? fallbackMessage}</p>
      <button type="button" onClick={() => router.invalidate()}>
        再読み込み
      </button>
    </div>
  );
}
