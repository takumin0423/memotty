# SPA と API を 1 つの Cloudflare Worker・1 つのドメインで配信する

memotty の Web アプリ（React SPA）と API（Hono）は、`apps/web` からデプロイする 1 つの Cloudflare Worker にまとめ、ドメインは `memotty.app` だけにして API は `/api/*` に集約する。Workers Static Assets で SPA を配信し、`assets.run_worker_first: ["/api/*"]` に一致したリクエストだけを Hono に渡す。SPA と API が同じオリジンになるので、Web アプリには CORS も API の URL の設定も要らず、SPA と API は常に同時にデプロイされるのでバージョンがずれない。

## Considered Options

- **Pages（SPA）と別 Worker（API）、または `api.memotty.app` のサブドメインに分ける**：SPA と API を別々にデプロイできるが、Web アプリにもクロスオリジンの通信（CORS、Cookie の扱い）が必要になり、デプロイ単位が 2 つになる。
- **すべてのリクエストを Hono で受けて静的ファイルも返す**：ルーティングを全部コードで扱えるが、アセットの配信のたびに Worker が実行され、コストとレイテンシの面で不利になる。

## Consequences

- `run_worker_first` は真偽値ではなく配列で指定する。`not_found_handling: "single-page-application"` だけだと、ブラウザで `/api/...` を直接開いたときに `index.html` が返ってしまうことがある。
- Chrome 拡張と Tauri 製の Mac アプリにとっては `memotty.app` が別オリジンになるので、それらに着手する前に CORS（Tauri なら `@tauri-apps/plugin-http` を使うかどうかも）と認証の方式を決める必要がある。
- 本番へのデプロイは、機能が MVP レベルでそろい、ローカル（`pnpm build` のあと `pnpm preview`）で動作を確かめてから初めて行う。それまでは `*.workers.dev` も含めてどこにも公開しない。`pnpm preview` は本番と同じビルドを workerd で動かすので、`run_worker_first` や SPA へのフォールバックを本番に近い形で確かめられる。
  - 初回のデプロイでは、`routes`（`memotty.app`）と、`workers.dev` の URL を公開するかどうか（`workers_dev`）を決める。`routes` が無いと `workers.dev` で公開される。
  - Workers の Free プランの上限は「1 日 10 万リクエスト」と「1 回の実行につき CPU 時間 10ms」。上限に数えられるのは `run_worker_first` に一致した `/api/*` へのリクエストだけで、超えると 429 を返す。請求は発生しない。静的アセットは無料で回数の制限も無い。
- Chrome 拡張と Mac アプリは、開発中はローカルの memotty API を、リリース後は `memotty.app` の API を呼ぶので、クライアントの API の URL は 1 か所で設定できるようにしておく。
- Hono アプリ本体は `packages/api` に置いて全クライアントと型を共有し、`apps/web` は Worker の入口・`wrangler.jsonc`・デプロイだけを担う。D1 などの bindings の型は、`apps/web` に生成される `worker-configuration.d.ts` を参照せず、`packages/api` の側で持つ方法を D1 の導入時に決める。
