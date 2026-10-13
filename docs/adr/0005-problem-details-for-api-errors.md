# memotty API のエラーは RFC 9457 Problem Details の形で返す

memotty API がエラーを返すときは、RFC 9457 Problem Details の形（`type`・`title`・`status`・`detail`。バリデーションエラーのときは、どの項目がなぜ不正かを並べた `errors` も付ける）を使う。エラーの形はすべてのクライアントとの契約になり、ADR 0003 で破壊的変更をしないと決めたので後から変えにくい。そのため独自の形ではなく、標準化されていて第三者にも意味が通じる形を選んだ。

## Considered Options

- **独自の形（`{ error: { code, message } }`）**：シンプルだが、項目の意味を自分で定義して説明し続ける必要がある。

## Consequences

- `Content-Type: application/problem+json` を使ったときに、Hono RPC の `parseResponse()` と型推論が期待どおり動くかは、実装を始める前に確認する。動かない場合は、形は RFC 9457 に合わせたまま、Content-Type だけ `application/json` にする。
