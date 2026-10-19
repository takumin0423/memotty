# memotty API のエラーは RFC 9457 Problem Details の形で返す

memotty API がエラーを返すときは、RFC 9457 Problem Details の形（`title`・`status`・`detail`）を使う。エラーの形はすべてのクライアントとの契約になり、ADR 0003 で破壊的変更をしないと決めたので後から変えにくい。そのため独自の形ではなく、標準化されていて第三者にも意味が通じる形を選んだ。

## Considered Options

- **独自の形（`{ error: { code, message } }`）**：シンプルだが、項目の意味を自分で定義して説明し続ける必要がある。大手の公開 API（Google・Microsoft・Vercel など）で最も多い形だが、提供元ごとに中身が違い、決まった仕様は無い。
- **フレームワークやバリデータの既定の形のまま**：TS の主要なフレームワーク（Hono・Express・Fastify・NestJS・tRPC・oRPC・Elysia）は、どれも既定では Problem Details を返さず、形はばらばら。`@hono/standard-validator` の既定の 400 は入力をそのまま `data` に入れて返すので、パスワードなどが漏れる。形もライブラリの都合で変わりうる。
- **`hono-problem-details` を使う**：機能はそろっているが、メンテナが 1 人の若い 0.x のパッケージで、`@hono/standard-validator` の peer dependency が `^0.2.0` と合わず、RPC の型に 400 が載るかも分からない。必要な処理は数行なので自前で書く。
- **バリデーションエラーに項目ごとの `errors` を付ける**：どの項目が不正かを機械的に読めるが、RFC 9457 では拡張メンバーごとに問題の種類（`type` の URI と定義）が要り、組み立ても複雑になる。今のクライアントは `title` と `detail` を表示するだけなので付けない。

TS のエコシステムでは Problem Details は主流ではない（2026-10 時点。専用のライブラリの週間 DL は数千）。それでも、標準化された形はこれだけで、どの形を選んでも自分で組み立てる手間は変わらないため、Problem Details を選んだ。

## Consequences

- `type` は省略する。RFC 9457 では省略すると `about:blank`（ステータスコード以上の意味が無い）とみなされるので、`title` は HTTP のステータスの名前（`Bad Request`・`Not Found` など）にし、何が問題でどう直すかは `detail` に書く。
- バリデーションの失敗は、`sValidator` の第 3 引数の hook で 400 の Problem Details を返す（既定の 400 は入力をそのまま返すため）。
- `onError` は `HTTPException` も 500 にする。`HTTPException` を投げるエンドポイントを作るときは、`onError` に分岐を足す。
- `Content-Type` は `application/problem+json`。Hono RPC の `parseResponse()` はこれも JSON として読み、`DetailedError` の `detail.data` に入れることをテストで確かめた。
- 項目ごとのエラーなどの拡張メンバーが必要になったら、問題の種類を `https://memotty.app/problems/` の下の URI で定義し、`type`・`title`・ステータスコード・拡張メンバーをこの ADR に書いてから足す（RFC 9457 §3.2・§4）。フィールドの追加なので ADR 0003 の互換性は壊れない。
