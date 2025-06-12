# Yahoo! ルビ振りAPI クライアント

このリポジトリは[Yahoo! Developer Network](https://developer.yahoo.co.jp/webapi/jlp/furigana/v2/furigana.html)のルビ振りAPIを使用し、テキストにふりがなを付けるWebアプリケーションを構築するためのものです。

## 機能

- 漢字かな交じり文に、ひらがなのふりがな（ルビ）を付けます。
- 2種類のルビスタイルをサポート（墨つき括弧とXHTML）。
- 学年別の漢字にふりがなを付ける制御。
- 一度ルビを付与した漢字は指定した文字数の間、再度ルビを付与しない機能。ただし「｛改頁｝」という文字列が出現すると、スキップカウントがリセットされます。
- 4KB以上のテキストを自動的に分割して処理。ただし括弧や句読点、英文が現れたら、そこで分割します。

## 使用技術

- TypeScript
- React
- Next.js
- Tailwind CSS
- Axios

## 開発方法

### 必要条件

- Node.js 14.6.0以上
- Yahoo! Developer NetworkのアプリケーションID

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/yahoo-ruby-api-claude.git
cd yahoo-ruby-api-claude
```

## デプロイ

このアプリケーションはVercelにデプロイすることを想定しています。

## 使用方法

1. Yahoo! Developer Networkからアプリケーションを作成し、アプリケーションIDを取得してください。
2. アプリケーションIDを入力フィールドに入力します（必要に応じてブラウザに保存できます）。
3. ルビを付与するテキストを入力します。
4. ルビを付与する基準（学年レベル）を選択します。
5. ルビのスタイル（墨つき括弧またはXHTML）を選択します。
6. 「ルビをふる」ボタンをクリックします。
7. 結果が表示されます。必要に応じてクリップボードにコピーできます。

## ライセンス

MITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 謝辞

このアプリケーションは、Yahoo! JAPAN Developer NetworkのAPIを使用しています。