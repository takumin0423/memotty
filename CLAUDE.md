# CLAUDE.md

memotty は pnpm workspace のモノレポ（`apps/*`・`packages/*`）。スクリプトはルートと各パッケージの `package.json` を見る。

## コードの規約

- パッケージマネージャは pnpm のみ。lint は oxlint、フォーマッタは oxfmt。
- 依存は、1 つのパッケージでしか使わないうちは直接指定する。2 つ目のパッケージで使い始めた時点で pnpm の catalog に移し、`catalog:` で参照する（最初から複数のパッケージに入れるなら `pnpm add <pkg> --save-catalog`）。パッケージごとに別のバージョンが要るときだけ直接指定のままにし、理由を PR に書く。
- スクリプト名は「素の名前は修正する、`:check` は確認のみ」でそろえる（`lint` / `lint:check`）。
- 相対 import には拡張子を付ける（`./foo.ts`）。oxlint で検出するが、`--fix` では直らない。
- export は named export にそろえる。default export はツールが求める場所（設定ファイル、Workers のエントリ）だけで使う。import する側の名前が揺れないようにするため。
- トップレベルの関数は `function` 宣言で書く。アロー関数は、コールバック、関数の中の関数、変数に型を付けたいとき（`const f: MiddlewareHandler = ...`）、`React.memo` などで包むときに使う。
- React Compiler が有効なので、手動の `useMemo` / `useCallback` は基本的に書かない。

## 開発の進め方

ユーザーのスキル向上も目的なので、コードは人間が書き、AI は壁打ち・調査・文書作成・依頼時のレビューを担う（`docs/adr/0001-human-writes-code-ai-assists.md`）。この節はスキルの指示より優先する。

- AI が書くファイルはリポジトリ内の Markdown（`.claude/` 配下のスキルも含む）。ソース・テスト・設定・スクリプト・`pnpm add` は人間が行う。例外はユーザーがそのタスクで明示的に依頼したときだけで、実装の代行は AI から提案しない。
- コードの示し方は段階的に：方針と公式ドキュメント → 求められたら疑似コードや部分コード → さらに求められたら完成形。定型の設定例は最初から示してよい。
- AI が実行するのは読み取り・検証（build / lint / test / dev）と、依頼時の commit・push。ブランチは常に最新の `main` から切って PR にする。PR は squash マージされるので、マージ済みブランチは再利用しない。マージと本番デプロイは人間が行う。
  - commit の前に `pnpm check` を通す。`pnpm format` と `pnpm lint` で自動修正できるものは AI が直してよい。それ以外のエラーがあれば commit せず、原因と箇所を示して人間の修正を待つ。
- バグやコンフリクトは、AI が原因と次の一手を示し、編集は人間が行う。
- レビューは「何が・なぜ問題か」を示し、設計判断・テスト・TypeScript（React / Hono）の書き方を重点に見る。依頼外で気づいた問題は一言添える。

## Agent skills

- Issue tracker：GitHub Issues（takumin0423/memotty）を `gh` で操作する。See `docs/agents/issue-tracker.md`.
- Triage labels：デフォルトの 5 ラベルをそのまま使う。See `docs/agents/triage-labels.md`.
- Domain docs：single-context（ルートに `GLOSSARY.md` と `docs/adr/`）。See `docs/agents/domain.md`.
