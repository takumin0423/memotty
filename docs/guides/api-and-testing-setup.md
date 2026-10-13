# Hono API・TanStack Router / Query・Vitest の導入と素振り

memotty に memotty API（Hono）を追加して Web アプリと連携させ、技術スタックの素振りを TDD で進めるための手順書。設計の判断は ADR 0002〜0005 と `GLOSSARY.md` にまとめてある。ADR 0001 に従い、この手順書に載せるのは方針・公式ドキュメント・定型の設定例までで、アプリケーションのコードは載せない。

## ゴール

- ローカルで次の 3 つの画面が動く：`/`（`GET /api/health` の結果）、`/demo/messages`（一覧）、`/demo/messages/$id`（詳細）
- `packages/api` のテストを TDD のサイクルで書き、`pnpm test` で通る
- `*.workers.dev` に仮でデプロイし、本番環境でも同じように動くことを確認する

素振りのコード（`/api/demo/*` と `/demo/*`）は使い捨てにする。本格的に開発を始める時点で、`/api/health` 以外は削除する。

## 最終的な構成

```
apps/web/                  … デプロイの単位（1 Worker）
  wrangler.jsonc
  worker/index.ts          … @memotty/api の app を export するだけの入口
  src/routes/              … TanStack Router のルート（ファイルベース）
  src/routeTree.gen.ts     … 自動生成されるファイル（コミットするが、手で編集しない）
packages/api/              … @memotty/api（Hono アプリ本体と AppType）
  src/index.ts             … Hono アプリと AppType を export する
  src/index.test.ts        … テストは対象のファイルの隣に置く
  tsconfig.json
  vitest.config.ts
```

## 0. 事前に知っておくこと

### バージョンとサプライチェーン攻撃への対策

- 主なパッケージの調査時点（2026-10）でのバージョン：hono 4.13、zod 4.6、@hono/zod-validator 0.9、@cloudflare/vite-plugin 1.63、wrangler 4.150、vitest 5.0、@cloudflare/vitest-plugin 1.4、@tanstack/react-router 1.170、@tanstack/router-plugin 1.168、@tanstack/react-query 5.104
- 社内のプロキシ（`npm.flatt.tech`）と pnpm の `minimumReleaseAge`（既定値は 1440 分）は、公開から日の浅いバージョンを拒否する。拒否されたら、1 つ前のバージョンを指定する。**この制限は回避しない。**
- 入れるのは `zod` と `@hono/zod-validator` だけ。`@tanstack/zod-adapter`（2026-05 に乗っ取りの被害あり）と、`zod-js` などの名前の似た偽パッケージは入れない。TanStack Router は Zod 4 のスキーマをそのまま受け付けるので、アダプタは要らない。
- pnpm 12 は、依存パッケージがインストール時に実行するスクリプトを既定でブロックする（`strictDepBuilds: true`）。このスタックで許可が必要なのは `esbuild` と `workerd` の 2 つだけ。他のパッケージで許可を求められたら、そのまま許可せずに理由を調べる。

```yaml
# pnpm-workspace.yaml に追加する
allowBuilds:
  esbuild: true
  workerd: true
```

- `pnpm add` の後は、`pnpm-lock.yaml` の差分で、知らないパッケージやインストール時のスクリプトが増えていないかを確認する。

### Hono RPC で型を効かせるための条件

- ルートはメソッドチェーンで定義し、その結果の型を `AppType` として export する
- `c.json(body, 200)` のように、ステータスコードを明示する
- `strict` を有効にする（サーバー側とクライアント側の両方。TS 7 では既定で有効になっているが、明示しておく）
- `hono` のバージョンを `packages/api` と `apps/web` で揃える（pnpm の catalog で一元管理する）
- `onError`・`notFound`・`HTTPException` で返したレスポンスは、RPC の型に反映されない。クライアントは `parseResponse()` が投げる `DetailedError` の `detail.data` から、Problem Details を読む。

公式ドキュメント：<https://hono.dev/docs/guides/rpc>

## TDD の進め方

1. `packages/api` で `pnpm test`（`vitest` のウォッチモード）を起動したままにする
2. **Red**：下に挙げるテストケースを **1 つだけ** 書き、期待した理由で失敗するのを確認する（import のエラーで落ちるのは期待した失敗ではない。最初のテストの前に、`basePath("/api")` だけを付けた空のアプリを export しておけば、「ルートが無いので 404 が返る」という期待した理由で落ちる）
3. **Green**：テストを通すための最小限のコードを書く。ベタ書きでもかまわない
4. **Refactor**：テストが通ったままの状態で、名前・構造・重複を整える
5. 次のテストケースに進む。新しいテストケースが浮かんだら、すぐに書かずにリストに足しておく

テストは `app.request(path, init)` でアプリを直接呼んで書く。HTTP サーバーは立ち上げない。テストファイルは、テスト対象のファイルの隣に `*.test.ts` として置く。

公式ドキュメント：<https://hono.dev/docs/guides/testing>、<https://vitest.dev/guide/>

---

## Step 1. `packages/api` を作り、最初のテストを workerd 上で通す

**方針**

- `packages/api/package.json`：`name` を `@memotty/api`、`type` を `module` にし、`exports` で Hono アプリと `AppType` を公開する。`scripts` には `"test": "vitest"` を書く。
  - `exports` はビルドした `.js` ではなく、TypeScript のソース（`./src/index.ts`）を直接指す。`@memotty/api` を読み込むのは同じリポジトリの Vite・wrangler・Vitest・`tsc` だけで、どれも `.ts` をそのまま扱えるので、`packages/api` にビルドの手順は要らない。
- 依存を追加する前に、「事前に知っておくこと」の `allowBuilds` を `pnpm-workspace.yaml` に書いておく（書き忘れて `ERR_PNPM_IGNORED_BUILDS` が出たら、`pnpm approve-builds` で `esbuild` と `workerd` だけを許可する）。
  - `pnpm --filter @memotty/api add hono`
  - `pnpm --filter @memotty/api add -D vitest @cloudflare/vitest-plugin @cloudflare/workers-types typescript`（`typescript` は `apps/web` と同じバージョンにそろえる）
- アプリには `basePath("/api")` を付ける。`/api` まで含めて `packages/api` の責任範囲にし、`apps/web` の入口は何も足さずに export するだけにする。
- ルートの `package.json` に `"test": "pnpm -r --if-present test"` を追加する。
- `@cloudflare/vitest-plugin` には wrangler の設定ファイルを渡さず、`miniflare` オプションに直接設定を書く。`compatibilityDate` は Step 4 で作る `wrangler.jsonc` と同じ値にそろえる。
  - 日付は、インストールされた workerd の日付以前にする。ローカルの workerd は自分の日付より新しい互換性の日付を知らないので、今日の日付にするとはみ出すことがある。workerd の日付は `pnpm --filter @memotty/api why workerd` で表示されるバージョン（例：`1.20261006.1` なら `2026-10-06`）で分かる。
  - 日付を上げると実行時の挙動が変わることがあるので、新しいランタイムの機能が必要になったときに、2 つの値を一緒に上げる。
- `packages/api` の tsconfig は、Workers のランタイムの型に `@cloudflare/workers-types` を使う。Cloudflare は Worker 本体には `wrangler types` の出力を勧めているが、ライブラリや共有パッケージには `@cloudflare/workers-types` を勧めている。`packages/api` は wrangler の設定ファイルを持たず、`apps/web` の生成物にも依存させない（依存の向きを `packages/api` ← `apps/web` に保つ）ので、こちらを使う。
  - `types` に `"@cloudflare/vitest-plugin/types"` だけを指定すると、`Request` や `Response` の型が見つからず、`hc<AppType>` のクライアントが `unknown` になる（RPC の型が壊れる）。
  - `lib` に `DOM` は入れない（Workers はブラウザではない）。

**設定例**

```ts
// packages/api/vitest.config.ts
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      // apps/web/wrangler.jsonc の compatibility_date と同じ値にそろえる
      miniflare: { compatibilityDate: "<YYYY-MM-DD>" },
    }),
  ],
});
```

```jsonc
// packages/api/tsconfig.json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-plugin/types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "moduleDetection": "force",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
  },
  "include": ["src"],
}
```

```jsonc
// packages/api/package.json（依存は pnpm add で追記される）
{
  "name": "@memotty/api",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest" },
}
```

**最初のテストケース**

1. `GET /api/health` が 200 を返す
2. `GET /api/health` のボディが `{ "status": "ok" }` になる

**確認すること**：テストが workerd 上で動くこと、Vitest 5・TS 7・`@cloudflare/vitest-plugin` の組み合わせが動くこと。ここでつまずいた場合は、`cloudflareTest()` を外して Node 上で動かす構成に一時的に戻して、先に進んでかまわない（テストのコードは変えずに済む）。

公式ドキュメント：<https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/>、<https://developers.cloudflare.com/workers/languages/typescript/>、<https://developers.cloudflare.com/workers/configuration/compatibility-dates/>、<https://nodejs.org/api/packages.html#exports>

## Step 2. RPC の型テストを書く

**方針**

- `hc<AppType>` で `/api/health` を呼んだときのレスポンス型が `{ status: string }` になることを、`expectTypeOf` で確かめる（`"ok"` のリテラル型として推論させたいなら、`as const` などで明示する）。
- `expectTypeOf` は実行時には何もしない。型を検査するのは Vitest の typecheck モードで、`*.test-d.ts` というファイル名が対象になる。typecheck のプロジェクトは workerd のプロジェクトと分けて、`test.projects` に `typecheck: { enabled: true, only: true }` のプロジェクトとして追加しておくのが安全。
- Vitest は `tsc` を別のプロセスとして起動する。TS 7 の `tsc`（tsgo）の出力を Vitest が正しく読めるかは、まだ確認されていない。読めなかった場合は、`*.test-d.ts` を `tsc --noEmit` の対象に含めて、型の検査を tsc に任せる形に切り替える。

**テストケース**

1. `InferResponseType<typeof client.api.health.$get, 200>` が `{ status: ... }` になる
2. （わざと壊して確認する）ハンドラのステータスコードを外すと、型テストが失敗する

**確認すること**：Hono RPC の型推論が TS 7 で効くこと。効かなかった場合は、ADR 0004 の前提が崩れるので、先に進まずに相談する。

公式ドキュメント：<https://vitest.dev/guide/testing-types>

## Step 3. 素振り用の API を TDD で作る

**方針**

- `/api/demo/messages` は、`app.route()` で別のサブアプリとしてつなぐ。サブアプリもメソッドチェーンで定義する。
- データはコードに直接書いた固定の配列にする（書き込みはしない）。
- クエリは `zValidator("query", schema)` で検証する。クエリの値は文字列で届くので、数値には `z.coerce.number()` を使う。
  - このとき、RPC の入力の型は `string | string[]` になる。ハンドラの中では `number` として扱える。
- バリデーションに失敗したときは、zValidator の第 3 引数の hook で、Problem Details（ADR 0005）を `400` で返す。`c.json(problem, 400, { "Content-Type": "application/problem+json" })` と書けば Content-Type も上書きでき、`InferResponseType<..., 400>` で型も付く。
- 存在しない ID への 404 は、ハンドラの中で `c.json(problem, 404, ...)` として返す。こうすると RPC の型に 404 が載る。
- アプリ全体の `onError`（500）と `notFound`（定義していないパス）も、Problem Details で返す。

**テストケース**（上から順に 1 つずつ）

1. `GET /api/demo/messages` が 200 でメッセージの配列を返す
2. `limit` を指定しないと、既定の件数を返す
3. `limit=2` を指定すると、2 件だけ返す
4. `limit=0`、`limit=abc`、`limit` が上限を超えるときは、400 で Problem Details を返す（`Content-Type` が `application/problem+json` になり、`status` が 400 になる）
5. `GET /api/demo/messages/:id` が、該当するメッセージを 200 で返す
6. 存在しない ID のときは、404 で Problem Details を返す
7. 定義していないパス（例：`/api/nope`）は、404 で Problem Details を返す
8. （型テスト）`messages.$get` の入力の型に `query.limit` が現れる

公式ドキュメント：<https://hono.dev/docs/guides/validation>、<https://hono.dev/docs/api/routing>、<https://www.rfc-editor.org/rfc/rfc9457>

## Step 4. `apps/web` を Worker にする

**方針**

- `apps/web` に `@cloudflare/vite-plugin`・`wrangler`・`hono`・`@memotty/api`（`workspace:*`）を追加する。
- `worker/index.ts` は `@memotty/api` の app を export するだけにする。
- `wrangler types --env-interface CloudflareBindings` で `worker-configuration.d.ts` を生成し、`worker/` 用の tsconfig（`tsconfig.worker.json`）を作って、`tsconfig.json` の references に追加する。今は bindings が無いが、D1 を導入するときの土台になる。
- `package.json` に `"deploy": "vite build && wrangler deploy"` と `"cf-typegen": "wrangler types --env-interface CloudflareBindings"` を追加する。

**設定例**

```jsonc
// apps/web/wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "memotty",
  "main": "./worker/index.ts",
  "compatibility_date": "<YYYY-MM-DD>", // packages/api/vitest.config.ts と同じ値にそろえる
  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"], // 真偽値ではなく配列で指定する（ADR 0002）
  },
  "upload_source_maps": true,
  // Step 7 までは routes を書かない（workers.dev で公開する）
}
```

```ts
// apps/web/vite.config.ts の plugins（順番が重要。Step 5 で tanstackRouter を先頭に追加する）
plugins: [react(), babel({ presets: [reactCompilerPreset()] }), cloudflare()];
```

**確認すること**：`pnpm dev` を起動して、次の 3 点を確かめる。

- ブラウザで `/api/health` を開くと JSON が返る（`index.html` が返らない）
- `/` では、今までどおりテンプレートの画面が出る
- `pnpm build` が通る

公式ドキュメント：<https://developers.cloudflare.com/workers/vite-plugin/get-started/>、<https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/>、<https://developers.cloudflare.com/workers/languages/typescript/>

## Step 5. TanStack Router と Query を入れ、`/` に health を表示する

**方針**

- `@tanstack/react-router`・`@tanstack/router-plugin`・`@tanstack/react-query` を追加する。
- `tanstackRouter({ target: "react", autoCodeSplitting: true })` は、**plugins の先頭（`react()` より前）に置く**。順番を間違えても警告は出ず、ルートの生成とコード分割が黙って失敗する。
- ルートは `src/routes/` に置く。自動生成される `src/routeTree.gen.ts` はコミットするが、手で編集しない。
  - oxlint の `ignorePatterns` と、ルートの `.oxfmtrc.json` の `ignorePatterns` にこのファイルを追加する。
- QueryClient は Router の context に渡す。ルートのルートは `createRootRouteWithContext<{ queryClient: QueryClient }>()` で作る。
  - `createRouter` には `defaultPreload: "intent"` と `defaultPreloadStaleTime: 0` を指定する（データが新しいかどうかの判断は Query に任せる）。
  - `QueryClientProvider` で全体を包む（SSR 用の統合パッケージは不要）。
- API クライアントは `hc<AppType>("/")` で作り、`queryOptions` のファクトリにまとめる。`queryFn` では `parseResponse()` を使う。
- loader では `context.queryClient.query(healthQuery)` で先読みし、コンポーネントでは `useSuspenseQuery(healthQuery)` で読む。
  - `staleTime` は `healthQuery`（`queryOptions` のファクトリ）の中に書く。`query()` に渡した `staleTime` はその 1 回の取得にしか効かないので、loader だけに書くと、`useSuspenseQuery` は既定の `staleTime: 0` で動き、マウントした直後にもう一度取りに行く。health はほぼ変わらないので `"static"` でよい。
  - `ensureQueryData` と `prefetchQuery` は非推奨になったので使わない（ネット上の例はまだ古い書き方が多い）。
- `__root` にレイアウトとナビゲーション（`Link`）を置く。

**確認すること**：`pnpm dev` で `/` を開き、`status: ok` が表示されること。開発者ツールの Network タブで、`/api/health` へのリクエストが 1 回だけ出ていること。

公式ドキュメント：<https://tanstack.com/router/latest/docs/framework/react/installation/with-vite>、<https://tanstack.com/router/latest/docs/integrations/query>、<https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading>、<https://tanstack.com/query/latest/docs/framework/react/guides/prefetching>

## Step 6. 素振り用の画面を作る

**方針**

- `/demo/messages`：`validateSearch` に Zod のスキーマをそのまま渡す（`limit`。不正な値は `.catch()` で既定の値に戻す）。`loaderDeps` で `limit` を loader に渡す。
- `/demo/messages/$id`：パスパラメータの型付きの読み方を確かめる。API が 404 を返したら、Router の `notFound()` につなぐ。
- `pendingComponent`・`errorComponent`・`notFoundComponent` をそれぞれ 1 回ずつ実装し、表示されるところを確かめる。開発者ツールで通信を遅くしたり、API をわざと壊したりして確認する。
- `Link` を使い、一覧から詳細へ移動する。`limit` を切り替えるリンクも作る。

**確認すること**

- URL の `?limit=` を手で書き換えても、型と値の両方が守られること
- `/demo/messages/999` を直接開くと、notFound の画面になること
- リンクにマウスを乗せると先読みが走ること

公式ドキュメント：<https://tanstack.com/router/latest/docs/framework/react/guide/search-params>、<https://tanstack.com/router/latest/docs/framework/react/guide/not-found-errors>、<https://tanstack.com/router/latest/docs/framework/react/guide/data-loading>

## Step 7. `workers.dev` に仮でデプロイする（人間が実行する）

**方針**

- `apps/web` で `pnpm run deploy` を実行する（`vite build` の後に `wrangler deploy`）。`routes` を書いていないので、`https://memotty.<アカウントのサブドメイン>.workers.dev` で公開される。
- Free プランの上限は「1 日 10 万リクエスト」と「1 回の実行につき CPU 時間 10ms」。上限を超えると、`run_worker_first` に一致したリクエスト（`/api/*`）は静的アセットに切り替わらず 429 を返すが、請求は発生しない。静的アセットへのリクエストは無料で回数の制限も無く、上限に数えられるのは `/api/*` へのリクエストだけ。

**確認すること**

- `/api/health` と `/api/demo/messages` が JSON を返す
- `/demo/messages/1` を直接開くと（再読み込みしても）画面が出る
- `/api/nope` が Problem Details を返す（`index.html` が返らない）

**確認が終わったら**

`memotty.app` に移るのは MVP として動くようになってからなので（ADR 0002）、それまでは `workers.dev` が開発中の公開先になる。素振りを終えた後は、Worker をそのまま残して開発を続けてもかまわない。一時的に公開をやめたいときは、次のどちらかを行う。

- 止める：`wrangler.jsonc` に `"workers_dev": false` を書いて再デプロイするか、ダッシュボードで `workers.dev` の公開をオフにする。元に戻すのも簡単。
- 消す：`pnpm wrangler delete` を実行する。もう一度 `deploy` すれば、同じ名前・同じ URL で作り直せる。消えるのはデプロイの履歴と、Worker に登録した secrets や環境変数（今回は無い）。

公式ドキュメント：<https://developers.cloudflare.com/workers/configuration/routing/workers-dev/>、<https://developers.cloudflare.com/workers/platform/limits/>、<https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/>

## Step 8. 後片付け

- CLAUDE.md の「テストフレームワークはまだ導入されていない」と「`packages/` はまだ無い」の記述を、`pnpm test` などの今の状態に合わせて更新する（AI に依頼してよい）。
- 素振りで気づいたことや、ハマったところ（TS 7 で起きたことなど）を、Issue か ADR に残す。

## 今回はやらないこと（後で検討する）

- 認証と CORS（Chrome 拡張と Mac アプリに着手する前。Tauri の `plugin-http` を使うかどうかも含む）
- 古すぎるクライアントを弾く仕組み（Mac アプリを最初にリリースする前）
- D1（スキーマ、マイグレーションの置き場所、`wrangler types` との連携）。`packages/api` は `apps/web` に依存させないので、bindings の型は `apps/web` に生成される `worker-configuration.d.ts` を参照せず、`packages/api` の側で持つ方法を決める
- `memotty.app` のカスタムドメイン（MVP として動くようになってから）と staging 環境
- UI のテストと E2E、`apps/web` への Vitest の導入
