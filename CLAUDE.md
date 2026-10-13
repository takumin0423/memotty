# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

memotty は pnpm workspace によるモノレポ。現時点では `apps/web`（Vite + React のテンプレートから作成したばかりのフロントエンド）のみが存在する。`pnpm-workspace.yaml` は `apps/*` と `packages/*` を対象にしているが、`packages/` はまだ無い。

## ツールチェーン

- Node / pnpm のバージョンは `mise.toml` で固定（node 26.10.0, pnpm 12.7.0）。`mise install` で揃える。
- パッケージマネージャは pnpm のみ（`packageManager` / `devEngines` で指定）。npm / yarn は使わない。
- Lint は ESLint ではなく **oxlint**（`apps/web/.oxlintrc.json`）、フォーマッタは Prettier ではなく **oxfmt**（ルートの `.oxfmtrc.json`）。VS Code では `oxc.oxc-vscode` で保存時フォーマット。
- TypeScript は 7 系。`apps/web` の tsconfig は `verbatimModuleSyntax` と `erasableSyntaxOnly` が有効なので、型のみの import は `import type` を使い、`enum` や `namespace` などの非消去構文は使わない。`noUnusedLocals` / `noUnusedParameters` も有効。
- React Compiler が `@rolldown/plugin-babel` 経由で有効（`apps/web/vite.config.ts`）。手動の `useMemo` / `useCallback` は基本的に不要。

## コマンド

ルートから:

```sh
pnpm install
pnpm dev            # apps/web の Vite dev サーバー
pnpm build          # apps/web の型チェック (tsc -b) + vite build
pnpm exec oxfmt     # フォーマット（ルートに専用スクリプトは無い）
```

`apps/web` 固有のスクリプト（lint, preview など）は filter 経由で実行する:

```sh
pnpm --filter @memotty/web lint
pnpm --filter @memotty/web preview
```

テストフレームワークはまだ導入されていない。

## 開発の進め方

ユーザーのスキル向上も目的なので、コードは人間が書き、AI は壁打ち・調査・文書作成・依頼時のレビューを担う（`docs/adr/0001-human-writes-code-ai-assists.md`）。この節はスキルの指示より優先する。

- AI が書くファイルはリポジトリ内の Markdown（`.claude/` 配下のスキルも含む）。ソース・テスト・設定・スクリプト・`pnpm add` は人間が行う。例外はユーザーがそのタスクで明示的に依頼したときだけで、実装の代行は AI から提案しない。
- コードの示し方は段階的に：方針と公式ドキュメント → 求められたら疑似コードや部分コード → さらに求められたら完成形。定型の設定例は最初から示してよい。
- AI が実行するのは読み取り・検証（build / lint / test / dev）と、依頼時の commit・push（ブランチ + PR。マージと本番デプロイは人間）。
- バグやコンフリクトは、AI が原因と次の一手を示し、編集は人間が行う。
- レビューは「何が・なぜ問題か」を示し、設計判断・テスト・TypeScript（React / Hono）の書き方を重点に見る。依頼外で気づいた問題は一言添える。

## Agent skills

### Issue tracker

Issue は GitHub Issues（takumin0423/memotty）で管理し、`gh` CLI で操作する。See `docs/agents/issue-tracker.md`.

### Triage labels

デフォルトの5ラベル（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）をそのまま使う。See `docs/agents/triage-labels.md`.

### Domain docs

single-context（ルートに `GLOSSARY.md` と `docs/adr/`）。See `docs/agents/domain.md`.
