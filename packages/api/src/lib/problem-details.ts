// RFC 9457 Problem Details。type は省略して about:blank とする（ADR 0005）

export const PROBLEM_JSON_HEADERS = { "Content-Type": "application/problem+json" };

export function problemDetails(status: number, title: string, detail: string) {
  return { title, status, detail };
}
