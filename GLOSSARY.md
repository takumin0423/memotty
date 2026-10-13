# memotty

メモを取るためのプロダクト。複数のクライアントから、共通の memotty API を通じて同じメモを扱う。

## Language

### クライアントと API

**クライアント**:
memotty API を使って memotty を利用するアプリの総称。Web アプリ・Chrome 拡張・Mac アプリの 3 つがある。
_Avoid_: フロント、フロントエンド

**Web アプリ**:
ブラウザで `memotty.app` を開いて使うクライアント。
_Avoid_: SPA、フロント、画面

**Chrome 拡張**:
Chrome に組み込んで使うクライアント。
_Avoid_: 拡張機能、エクステンション

**Mac アプリ**:
macOS にインストールして使うクライアント。memotty の主要なクライアント。
_Avoid_: デスクトップアプリ、ネイティブアプリ

**memotty API**:
すべてのクライアントが共通で使う、`memotty.app/api/*` で提供される API。
_Avoid_: バックエンド、サーバー
