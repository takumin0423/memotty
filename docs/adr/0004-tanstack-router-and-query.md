# クライアントのルーティングとデータ取得に TanStack Router と TanStack Query を併用する

Web アプリ（と、同じ構成の SPA になる Chrome 拡張・Mac アプリ）は、フレームワークを使わずに React 単体で作るので、ルーターとデータ取得のライブラリを自分で選ぶ必要がある。そこで TanStack Router と TanStack Query を併用することにした。役割の分担は、Router が「URL → 画面」と loader での先読みを、Query がキャッシュの共有・ミューテーション・無効化を受け持つ形にする。決め手は型安全性で、Hono RPC による「memotty API → クライアント」の型と、TanStack Router による「URL（params / search params）→ 画面」の型をつなげ、端から端まで型が通るようにするため。

## Considered Options

- **React Router（v8）の data mode**：react.dev は TanStack Router と同列に勧めており、利用者も最も多い（2026-10 時点で npm の週間ダウンロード数は約 3 倍、State of React 2025 での利用率は 72%）。ただ、生成された型による強い型安全性は Framework mode 限定で、SPA として使う data mode では params や search params の型が弱い。
- **TanStack Router だけを使う**：Router 単体の loader のキャッシュは画面間で共有できず、ミューテーションや楽観的更新の仕組みも持たない。Router のドキュメント自身が「画面間でデータをあまり共有しない、小〜中規模のアプリ向け」としている。
- **TanStack Query と最小限のルーター（wouter など）**：loader で先読みできないので waterfall が起きやすく、params にも型が付かない。

## Consequences

- データは loader で `queryClient` を使って先読みし、コンポーネントでは `useSuspenseQuery` で読む。QueryClient は Router の context に渡す。
- Query 5.104 で `ensureQueryData` や `prefetchQuery` が非推奨になり、`queryClient.query(...)` への移行が進んでいる。古い書き方の例が多いので注意する。
- `queryFn` では Hono の `parseResponse()` を使い、レスポンスが ok でないときは例外を投げて Query のエラーとして扱う。
- loader と `useSuspenseQuery` には、`queryOptions` のファクトリで作った同じ options を渡す（引数があるクエリは、引数を取る関数にする）。
- `staleTime` は `QueryClient` の `defaultOptions` で全体に設定し、必要なクエリだけ `queryOptions` の中で上書きする。loader の `query()` に渡した `staleTime` はその 1 回の取得にしか効かないので、そこだけに書くと、`useSuspenseQuery` は既定の `staleTime` で動いてマウントの直後にもう一度取りに行く。
- `createRouter` には `defaultPreloadStaleTime: 0` を指定し、データが新しいかどうかの判断を Query に任せる。
