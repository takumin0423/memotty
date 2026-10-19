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

## 依存を足すとき

- 社内のプロキシ（`npm.flatt.tech`）と pnpm の `minimumReleaseAge` は、公開から日の浅いバージョンを拒否する。拒否されたら 1 つ前のバージョンを指定する。この制限は回避しない。
- `allowBuilds` は `esbuild` と `workerd` だけ。pnpm 12 はインストール時のスクリプトを既定でブロックし、このスタックで必要なのはこの 2 つだけなので、他のパッケージで許可を求められたら許可せずに理由を調べる。
- `pnpm add` の後は、`pnpm-lock.yaml` の差分で、知らないパッケージやインストール時のスクリプトが増えていないかを見る。
- `@tanstack/zod-adapter`（2026-05 に乗っ取りの被害あり）と、`zod-js` などの名前の似た偽パッケージは入れない。TanStack Router は Zod 4 のスキーマをそのまま受け付けるので、アダプタは要らない。

## パッケージの構成

- `packages/api`（`@memotty/api`）が Hono アプリ本体と `AppType` を持ち、`apps/web` は Worker の入口・`wrangler.jsonc`・デプロイだけを担う（ADR 0002）。依存の向きは `packages/api` ← `apps/web` に保ち、`packages/api` から `apps/web` の生成物（`worker-configuration.d.ts` など）を参照しない。
- `@memotty/api` の `exports` は、ビルドした `.js` ではなく `./src/index.ts` を指す。読み込むのは同じリポジトリの Vite・wrangler・Vitest・`tsc` だけで、どれも `.ts` を直接扱えるので、ビルドの手順は要らない。
- `packages/api` の tsconfig は、Workers の型に `@cloudflare/workers-types` を使う（Cloudflare は共有パッケージにはこちらを勧めている。`wrangler types` の出力は `apps/web` 側で使う）。`types` を `@cloudflare/vitest-plugin/types` だけにすると `Request`・`Response` の型が無くなり、`hc<AppType>` が `unknown` になる。
- `compatibility_date` は `apps/web/wrangler.jsonc` と `packages/api/vitest.config.ts` の 2 か所でそろえる。日付は、インストールされた workerd の日付（`pnpm --filter @memotty/api why workerd` のバージョンが `1.20261006.1` なら `2026-10-06`）以前にする。ローカルの workerd は自分より新しい日付を知らないため。日付を上げると実行時の挙動が変わることがあるので、新しいランタイムの機能が要るときに 2 つを一緒に上げる。
- `apps/web/src/routeTree.gen.ts` は自動生成される。コミットするが、手で編集しない。

## memotty API（Hono）

- ルートはメソッドチェーンで定義し、その結果の型を `AppType` として export する。`app.get(...)` を後から足す書き方ではルートが型に残らず、`hc<AppType>` のクライアント自体が `unknown` になる（TS18046）。`app.route()` でつなぐサブアプリもメソッドチェーンで定義する。
- `c.json(body, 200)` のようにステータスコードを明示する。1 つのエンドポイントが複数のステータスを返すとき、`InferResponseType<..., 404>` のように型を絞れる。
- `onError`・`notFound`・`HTTPException` のレスポンスは RPC の型に載らない。型に載せたいエラーは、ハンドラの中で `c.json(problem, 404, ...)` として返す。
- `hono` は catalog で全パッケージのバージョンをそろえる。サーバーとクライアントでバージョンがずれると RPC の型が合わなくなる。
- クエリの値は文字列で届くので、数値は `z.coerce.number()` で受ける。このとき RPC の入力の型は `string | string[]` になり、ハンドラの中では `number` として扱える。

## テスト

- `packages/api` のテストは、`@cloudflare/vitest-plugin` で本番と同じ workerd 上で動かす。テストファイルは対象のファイルの隣に `*.test.ts` として置く。
- `hono/testing` の `testClient(app)` で呼び、HTTP サーバーは立ち上げない。定義していないパスは `testClient` では呼べないので、`app.request()` を使う。
- RPC の型テストは常設しない。型の崩れは、`hc<AppType>` を使う `apps/web` の `tsc -b`（`pnpm typecheck`）で検出できる。一時的に型を確かめたいときは `src/*.test-d.ts` に書けば `pnpm typecheck` で検査される。Vitest の typecheck モードは、TS 7（tsgo）の出力を正しく読めるか確かめていないので使わない。

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
