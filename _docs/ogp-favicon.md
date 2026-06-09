# ファビコン・OGP設定

サイトのSNSシェア見栄え（OGP/Twitterカード）と各種ファビコンを整備。

## 追加した `<head>` メタ

- `title` を「ちょいツール｜ブラウザだけで完結する便利ツール集」に変更
- `meta name="description"`（従来なし）を追加
- `meta name="theme-color"` = `#0078d4`
- ファビコン：既存 `favicon.svg` に加え `favicon-32.png`（PNGフォールバック）、`apple-touch-icon.png`（iOS用 180px）
- OGP：`og:type / og:site_name / og:title / og:description / og:image(1200x630) / og:image:width/height/alt / og:locale`
- Twitter：`twitter:card=summary_large_image / title / description / image`

## 生成した画像（`assets/`）

| ファイル | サイズ | 用途 |
|---|---|---|
| `ogp.png` | 1200×630 | OGP/Twitterカード画像 |
| `apple-touch-icon.png` | 180×180 | iOSホーム画面（フルブリード青角丸なし＝iOSが角丸処理） |
| `favicon-32.png` | 32×32 | PNGファビコン（角丸） |
| `icon-512.png` | 512×512 | PWA/maskable用ストック（現状manifestは未作成） |

### 生成方法
- Python + Pillow で描画（スクリプトは `/tmp/gen_ogp.py`、必要なら再生成）。
- 日本語フォント：ヒラギノ角ゴシック W7（太字）/ W5（中字）。`/System/Library/Fonts/ヒラギノ角ゴシック W*.ttc`。
- デザインは既存 `favicon.svg`（青 `#0078d4` 角丸＋白「ち」）に統一。OGPは「アイコン＋ちょいツール」「ブラウザだけで完結する便利ツール集」「26ツール」「ファイルはサーバーに送信されません」の4要素。

## 未完了 / 注意（要対応）

- **本番URL未確定**：`og:url` は未設定、`og:image`/`twitter:image` は相対パス `assets/ogp.png`。
  - X（Twitter）/ Facebook は **絶対URL必須**。本番ドメイン確定後に以下を実施：
    - `<meta property="og:url" content="https://本番ドメイン/">` を追加
    - `og:image` / `twitter:image` を `https://本番ドメイン/assets/ogp.png` に差し替え
  - 該当箇所は index.html の `<head>` 内に `TODO:` コメントで明示済み。
- OGP更新後はキャッシュが残るため、各SNSのデバッガで再取得を推奨：
  - Facebook Sharing Debugger / X Card Validator / LINEは再シェアで反映。
- 「26ツール」はOGP画像にも焼き込まれているため、ツール数が変わったら画像も再生成が必要。
