# CLAUDE.md

## 役割分担（ADR 0001）

ユーザーのスキル向上も目的なので、コードは人間が書き、AI は壁打ち・調査・文書作成・依頼時のレビューを担う。この節はスキルの指示より優先する。

- AI が書くのはリポジトリ内の Markdown（`.claude/` 配下のスキルも含む）だけ。ソース・テスト・設定・スクリプト・`pnpm add` は、そのタスクで明示的に依頼されたときだけ AI が行う。
- コードは段階的に示す：方針と公式ドキュメント → 求められたら疑似コードや部分コード → さらに求められたら完成形。定型の設定例は最初から示してよい。
- バグやコンフリクトは、原因と次の一手を示し、編集は人間に任せる。
- レビューは「何が・なぜ問題か」を示し、設計判断・テスト・TypeScript（React / Hono）の書き方を重点に見る。依頼外で気づいた問題は一言添える。
- AI が実行するのは読み取り・検証（build / lint / test / dev）と、依頼時の commit・push。ブランチは最新の `main` から切って PR にする（squash マージなので、マージ済みブランチは再利用しない）。マージとデプロイは人間が行う。
- commit の前に `pnpm check` を通す。`pnpm format` / `pnpm lint` で自動修正できるものは AI が直してよい。それ以外のエラーは commit せず、原因と箇所を示す。

## コードの規約（レビューの基準）

- export は named export。default export はツールが求める場所（設定ファイル、Workers のエントリ）だけ。
- トップレベルの関数は `function` 宣言。アロー関数はコールバック、関数内の関数、型注釈付きの変数（`const f: MiddlewareHandler = ...`）、`React.memo` などで包むときに使う。
- React Compiler が有効なので、手動の `useMemo` / `useCallback` は書かない。
- スクリプト名は、素の名前が修正、`:check` が確認のみ（`lint` / `lint:check`）。
- 2 つ以上のパッケージで使う依存は pnpm の catalog に置き、`catalog:` で参照する。パッケージごとに別バージョンが要るときだけ直接指定にし、理由を PR に書く。

## 依存の安全

- 社内プロキシ（`npm.flatt.tech`）と `minimumReleaseAge` が新しすぎるバージョンを拒否したら、1 つ前のバージョンにする。この制限は回避しない。
- `allowBuilds` は `esbuild` と `workerd` だけ。他のパッケージがインストール時のスクリプトを求めたら、許可せずに理由を調べる。
- `pnpm add` の後は `pnpm-lock.yaml` の差分で、知らないパッケージやインストール時のスクリプトの増加を確かめる。
- `@tanstack/zod-adapter`（2026-05 に乗っ取り被害）と `zod-js` などの類似名パッケージは入れない。TanStack Router は Zod 4 のスキーマをそのまま受け付ける。

## 構成（ADR 0002）

- `packages/api`（`@memotty/api`）が Hono アプリと `AppType` を持ち、`apps/web` は Worker の入口・`wrangler.jsonc`・デプロイを担う。依存は `packages/api` ← `apps/web` の向きだけにし、`packages/api` から `apps/web` の生成物（`worker-configuration.d.ts` など）を参照しない。
- `packages/api` の Workers の型は `@cloudflare/workers-types`。`types` を `@cloudflare/vitest-plugin/types` だけにすると `Request`・`Response` が消え、`hc<AppType>` が `unknown` になる。
- `compatibility_date` は `apps/web/wrangler.jsonc` と `packages/api/vitest.config.ts` でそろえ、インストール済みの workerd の日付（`1.20261006.1` なら `2026-10-06`）以前にする。上げるのは新しいランタイム機能が要るときだけ。

## Hono API

- ルートはサブアプリも含めてメソッドチェーンで定義し、その型を `AppType` にする。後から `app.get(...)` を足すとルートが型から落ち、`hc<AppType>` が `unknown` になる（TS18046）。
- `c.json(body, 200)` のようにステータスを明示する（`InferResponseType<..., 404>` で絞れるように）。
- `onError`・`notFound`・`HTTPException` は RPC の型に載らない。型に載せたいエラーはハンドラ内で `c.json(problem, 404)` として返す（ADR 0005）。
- `hono` は catalog でバージョンをそろえる。サーバーとクライアントでずれると RPC の型が合わない。
- クエリの数値は `z.coerce.number()` で受ける（RPC の入力型は `string | string[]`、ハンドラ内は `number`）。

## テスト

- `packages/api` のテストは `@cloudflare/vitest-plugin` で workerd 上で動かし、対象の隣に `*.test.ts` を置く。
- `hono/testing` の `testClient(app)` で呼ぶ。未定義のパスは `app.request()` で呼ぶ。
- RPC の型崩れは `apps/web` の `pnpm typecheck` で検出するので、型テストは常設しない。一時的な確認は `src/*.test-d.ts` に書く。Vitest の typecheck モードは使わない（TS 7 の出力を読めるか未検証）。

## Agent skills

- Issue tracker：GitHub Issues（takumin0423/memotty）を `gh` で操作する。See `docs/agents/issue-tracker.md`.
- Triage labels：デフォルトの 5 ラベル。See `docs/agents/triage-labels.md`.
- Domain docs：single-context（ルートに `GLOSSARY.md` と `docs/adr/`）。See `docs/agents/domain.md`.
