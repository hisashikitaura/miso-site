# 手前味噌 — miso-site

米麹・大豆・塩だけで仕込む、手作り味噌の記録サイト。仕込み → 熟成 → 完成をタイムラインで公開し、iPhone から管理画面で投稿する個人学習プロジェクト。

- 公開ページ `/` : 和モダン（墨色 × 生成り）。仕込みからの日数カウンター、素材と配合、工程タイムライン、写真ライトボックス。
- 管理画面 `/admin` : Google ログイン（オーナーのみ）。記録の作成・編集・削除、段階・日付・本文・写真（最大12枚、端末側で長辺1800pxのJPEGに縮小）、公開/下書き、サイト設定（仕込み日・分量など）。

## 構成

| 役割 | 使うもの |
| --- | --- |
| フロント | Vite + React + TypeScript（`index.html` と `admin/index.html` のマルチページ） |
| データ | Firebase（project `kith-diary`）: Firestore `miso_entries` / `miso_settings`、Storage `miso/` |
| 認証 | Firebase Auth（Google） |
| 配信 | AWS S3（非公開）+ CloudFront（OAC, HTTPS, HTTP/3）— CDK スタック `MisoSite`（`infra/`） |

公開ページはブラウザから Firestore を直接読むので、投稿は再デプロイなしで即反映される。

### セキュリティルール

ルールは Kith Diary と同じ Firebase プロジェクトで共有しているため、**このリポジトリには置かず** `hisashikitaura/kith-diary-web` の `firestore.rules.template` / `storage.rules.template` に統合している（オーナーのメールは `.env.local` から `npm run gen:rules` で埋め込み、生成物は gitignore）。

- `miso_entries`: `published == true` は誰でも読める。作成・更新・削除はオーナー（メール一致 + `email_verified`）のみ。フィールドと `stage` を検証。
- `miso_settings/main`: 誰でも読める / オーナーのみ書ける。`miso_settings/owner` はオーナーだけが読める「権限確認用」ドキュメント（管理画面がこれで判定するので、メールをフロントに埋め込まない）。
- Storage `miso/**`: 誰でも読める / オーナーのみ画像（10MB 未満）を書ける。

## セットアップ

```sh
npm ci
npm run env:pull        # firebase login 済みなら .env.local を生成（.env.example 参照）
npm run dev             # http://localhost:5173/?demo でサンプル表示（dev のみ）
npm run build
```

## デプロイ（AWS）

```sh
aws sso login --profile kith
(cd infra && npm ci)
npm run deploy          # build → cdk deploy MisoSite --profile kith
```

出力の `SiteUrl` の `xxxx.cloudfront.net` を Firebase Console → Authentication → 設定 → 承認済みドメイン に追加すると、管理画面の Google ログインが通る。

## iPhone から投稿

1. Safari で `https://<CloudFront>/admin` を開き、Google でログイン。
2. 共有 → 「ホーム画面に追加」でアプリのように使える。
3. 「＋ 新しい記録」→ 段階・日付・見出し・本文・写真 → 「投稿する」。
