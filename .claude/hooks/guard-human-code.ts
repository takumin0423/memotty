// PreToolUse hook: リポジトリ内の Markdown 以外を AI が Edit / Write するときに人間の承認を求める。
// 背景: docs/adr/0001-human-writes-code-ai-assists.md
import path from "node:path";
import { text } from "node:stream/consumers";

type Decision = { kind: "pass" } | { kind: "ask"; reason: string };

const REASON_HUMAN_WRITES =
  "コードと設定は人間が書くルールです（CLAUDE.md「開発の進め方」）。ユーザーが明示的に依頼した場合のみ許可してください";
const REASON_UNKNOWN_INPUT = "書き込み先を判定できませんでした。内容を確認して許可してください";

function extractFilePath(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null || !("tool_input" in data)) return undefined;
  const toolInput = data.tool_input;
  if (typeof toolInput !== "object" || toolInput === null || !("file_path" in toolInput)) {
    return undefined;
  }
  return typeof toolInput.file_path === "string" ? toolInput.file_path : undefined;
}

function isOutside(projectDir: string, filePath: string): boolean {
  const rel = path.relative(projectDir, filePath);
  return rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
}

export function decide(filePath: string | undefined, projectDir: string | undefined): Decision {
  if (!filePath || !projectDir) return { kind: "ask", reason: REASON_UNKNOWN_INPUT };
  if (isOutside(projectDir, filePath)) return { kind: "pass" };
  if (path.extname(filePath).toLowerCase() === ".md") return { kind: "pass" };
  return { kind: "ask", reason: REASON_HUMAN_WRITES };
}

let data: unknown;
try {
  data = JSON.parse(await text(process.stdin));
} catch {
  data = undefined;
}

const decision = decide(extractFilePath(data), process.env.CLAUDE_PROJECT_DIR);

if (decision.kind === "ask") {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: decision.reason,
      },
    }),
  );
}
