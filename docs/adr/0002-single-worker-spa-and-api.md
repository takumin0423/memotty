# SPA と API を 1 つの Cloudflare Worker・1 つのドメインで配信する

memotty の Web アプリ（React SPA）と API（Hono）は、`apps/web` からデプロイする 1 つの Cloudflare Worker にまとめ、ドメインは `memotty.app` だけにして API は `/api/*` に集約する。Workers Static Assets で SPA を配信し、`assets.run_worker_first: ["/api/*"]` に一致したリクエストだけを Hono に渡す。SPA と API が同じオリジンになるので、Web アプリには CORS も API の URL の設定も要らず、SPA と API は常に同時にデプロイされるのでバージョンがずれない。

## Considered Options

- **Pages（SPA）と別 Worker（API）、または `api.memotty.app` のサブドメインに分ける**：SPA と API を別々にデプロイできるが、Web アプリにもクロスオリジンの通信（CORS、Cookie の扱い）が必要になり、デプロイ単位が 2 つになる。
- **すべてのリクエストを Hono で受けて静的ファイルも返す**：ルーティングを全部コードで扱えるが、アセットの配信のたびに Worker が実行され、コストとレイテンシの面で不利になる。

## Consequences

- `run_worker_first` は真偽値ではなく配列で指定する。`not_found_handling: "single-page-application"` だけだと、ブラウザで `/api/...` を直接開いたときに `index.html` が返ってしまうことがある。
- Chrome 拡張と Tauri 製の Mac アプリにとっては `memotty.app` が別オリジンになるので、それらに着手する前に CORS（Tauri なら `@tauri-apps/plugin-http` を使うかどうかも）と認証の方式を決める必要がある。
- `memotty.app` に移るのは、機能が一通りそろって MVP として動くようになってから。それまでは `*.workers.dev` の URL で公開する。Chrome 拡張と Mac アプリがその前に memotty API を呼ぶ可能性があるので、クライアントの API の URL は 1 か所で設定できるようにしておく。
- Hono アプリ本体は `packages/api` に置いて全クライアントと型を共有し、`apps/web` は Worker の入口・`wrangler.jsonc`・デプロイだけを担う。
