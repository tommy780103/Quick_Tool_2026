# 会社PC（Windows）で使えるブラウザ系ちょいツール 提案書

> 作成日: 2026-02-21
> 目的: 会社のWindows PCのブラウザで使える便利な無料ツールの調査・提案

---

## 目次

1. [はじめに](#はじめに)
2. [セキュリティ基準について](#セキュリティ基準について)
3. [最優先で導入すべきツール TOP5](#最優先で導入すべきツール-top5)
4. [カテゴリ別ツール一覧](#カテゴリ別ツール一覧)
   - [A. 画像系ツール](#a-画像系ツール)
   - [B. PDF系ツール](#b-pdf系ツール)
   - [C. ドキュメント変換系ツール](#c-ドキュメント変換系ツール)
   - [D. 開発・ユーティリティ系ツール](#d-開発ユーティリティ系ツール)
5. [用途別 早見表](#用途別-早見表)
6. [利用時の注意事項](#利用時の注意事項)

---

## はじめに

本提案書は、会社のWindows PCブラウザで使える無料の便利ツールを調査・整理したものです。**セキュリティ（ファイルの外部送信有無）**を最重要基準として評価しています。

## セキュリティ基準について

各ツールを以下の基準で分類しています。

| レベル | 分類 | 説明 | 機密情報 |
|--------|------|------|----------|
| 🟢 A | **ローカル処理** | ファイルがサーバーに一切送信されない（ブラウザ内完結） | ✅ 使用可 |
| 🟡 B | **サーバー処理（高セキュリティ）** | サーバー送信あるが暗号化・自動削除等の対策あり | ⚠️ 非機密のみ |
| 🔴 C | **サーバー処理（要注意）** | セキュリティ対策の明示が不十分 | ❌ 使用不可 |

> **原則：🟢ローカル処理型ツールを最優先で使用してください。**

---

## 最優先で導入すべきツール TOP5

これだけ入れれば大半の用途をカバーできます。

### 1. DevToys（デスクトップアプリ）— 万能ユーティリティ

| 項目 | 内容 |
|------|------|
| **URL** | https://devtoys.app/ |
| **セキュリティ** | 🟢 完全ローカル・オフライン動作 |
| **料金** | 完全無料（Microsoft Store） |
| **カバー範囲** | JSON/XML整形、Base64、URLエンコード、ハッシュ計算、正規表現テスト、diff比較、カラーピッカー、JWT解析、画像変換・圧縮 等 |
| **導入方法** | Microsoft Store からインストール |

> **これ1つで開発系ユーティリティの大半をカバー。最優先で導入推奨。**

---

### 2. BentoPDF — PDF万能ツール

| 項目 | 内容 |
|------|------|
| **URL** | https://www.bentopdf.com/ |
| **セキュリティ** | 🟢 100%クライアントサイド処理 |
| **料金** | 完全無料（制限なし、登録不要、透かしなし） |
| **カバー範囲** | PDF結合・分割・圧縮・変換・OCR・注釈・署名・フォーム作成・墨消し等 100以上のツール |

> **PDF操作はこれ1つでほぼ全てカバー。ローカル処理で安心。**

---

### 3. Photopea — 画像編集の万能ツール（Photoshop級）

| 項目 | 内容 |
|------|------|
| **URL** | https://www.photopea.com/ |
| **セキュリティ** | 🟢 完全ローカル処理 |
| **料金** | 無料（広告あり） |
| **カバー範囲** | リサイズ・トリミング・変換・圧縮・レイヤー編集等。PSD/AI/SVG等40種以上対応 |
| **日本語対応** | あり |

> **画像編集の万能ツール。Photoshop級の機能がブラウザで無料。**

---

### 4. CyberChef — エンコード・ハッシュの万能ツール

| 項目 | 内容 |
|------|------|
| **URL** | https://gchq.github.io/CyberChef/ |
| **セキュリティ** | 🟢 完全ブラウザ内処理 |
| **料金** | 完全無料・オープンソース |
| **カバー範囲** | Base64、URLエンコード、ハッシュ計算、暗号化/復号化、文字コード変換、正規表現等 300以上の操作 |

> **エンコード/デコード/ハッシュ系の最強ツール。操作をチェーンできる「レシピ」機能が強力。**

---

### 5. draw.io（diagrams.net） — フローチャート・図表作成

| 項目 | 内容 |
|------|------|
| **URL** | https://app.diagrams.net/ |
| **セキュリティ** | 🟢 ブラウザ内処理（lockdown設定で完全遮断可） |
| **料金** | 完全無料・オープンソース |
| **カバー範囲** | フローチャート、ネットワーク図、UML、ER図、ワイヤーフレーム等 |
| **日本語対応** | あり |

> **図表作成のデファクトスタンダード。会員登録不要、ローカル保存可。**

---

## カテゴリ別ツール一覧

---

### A. 画像系ツール

#### A-1. 画像フォーマット変換

| ツール名 | URL | セキュリティ | 対応形式 | 日本語 | 制限 | おすすめ度 |
|----------|-----|-------------|----------|--------|------|-----------|
| **ラッコサーバー WebP変換** | https://rakkoserver.com/plus/tool-webp-converter/ | 🟢 ローカル | PNG/JPEG↔WebP | ✅ | 30枚/回, 50MB/枚 | ★★★★★ |
| **ImageLab** | https://imagelab.westnode.com/ | 🟢 ローカル | PNG/JPG/WebP/ICO/SVG | ❌ | なし | ★★★★★ |
| **AnyWebP** | https://anywebp.com/ | 🟢 ローカル | WebP↔JPG/PNG/BMP/GIF | ❌ | なし | ★★★★ |
| **QuickImager** | https://quickimager.com/ | 🟢 ローカル | JPG/PNG/WebP/AVIF/GIF/TIFF/BMP/ICO | ❌ | なし | ★★★★ |
| Convertio | https://convertio.co/ | 🔴 サーバー | 300種以上 | ✅ | 10件/日, 100MB | ★★☆ |

#### A-2. 画像圧縮

| ツール名 | URL | セキュリティ | 特徴 | おすすめ度 |
|----------|-----|-------------|------|-----------|
| **Squoosh（Google製）** | https://squoosh.app/ | 🟢 ローカル（WASM） | リアルタイム比較プレビュー。オフライン対応 | ★★★★★ |
| **Small.im** | https://small.im/ | 🟢 ローカル | 無制限バッチ処理、サイズ制限なし | ★★★★★ |
| **ImageCompressor.com** | https://imagecompressor.com/ | 🟢 ローカル | JPEG/PNG/WebP/GIF/SVG対応 | ★★★★ |
| **PicTech AI** | https://www.pictech.ai/ja-JP/compressor | 🟢 ローカル | 日本語対応 | ★★★★ |
| TinyPNG | https://tinypng.com/ | 🔴 サーバー | 高品質だがサーバー送信 | ★★☆ |

#### A-3. リサイズ・トリミング

| ツール名 | URL | セキュリティ | 特徴 | おすすめ度 |
|----------|-----|-------------|------|-----------|
| **Photopea** | https://www.photopea.com/ | 🟢 ローカル | Photoshop級の高機能。日本語対応 | ★★★★★ |
| **BIRME** | https://www.birme.net/ | 🟢 ローカル | 一括リサイズ・クロップ特化 | ★★★★★ |
| **ImageLab** | https://imagelab.westnode.com/ | 🟢 ローカル | 変換・圧縮・リサイズを一括で | ★★★★ |
| iLoveIMG | https://www.iloveimg.com/ja/ | 🟡 サーバー | 日本語対応、多機能。ISO 27001取得 | ★★★ |

#### A-4. 背景除去

| ツール名 | URL | セキュリティ | 特徴 | おすすめ度 |
|----------|-----|-------------|------|-----------|
| **PruneBG** | https://prunebg.com/ | 🟢 ローカル（WebML） | 完全無料・無制限・AIブラウザ内処理 | ★★★★★ |
| **PixelCut Pro** | https://pixelcutpro.com/backgroundremover/ | 🟢 ローカル | AIモデル176MB初回DL、以降キャッシュ | ★★★★ |
| remove.bg | https://www.remove.bg/ja | 🟡 サーバー | 精度最高だが低解像度のみ無料 | ★★★ |

#### A-5. 画像結合・コラージュ

| ツール名 | URL | セキュリティ | 特徴 | おすすめ度 |
|----------|-----|-------------|------|-----------|
| **フォトコンバイン** | https://photocombine.net/ | 🟢 ローカル | 日本語対応。結合+リサイズ+文字入れ | ★★★★★ |
| **PEKO STEP** | https://www.peko-step.com/ | 🟢 ローカル | 日本語対応。縦横結合+折り返し設定 | ★★★★ |

---

### B. PDF系ツール

#### B-1. ローカル処理型（最推奨）

| ツール名 | URL | 主要機能 | 制限 | おすすめ度 |
|----------|-----|----------|------|-----------|
| **BentoPDF** | https://www.bentopdf.com/ | 結合/分割/圧縮/変換/OCR/署名/墨消し等100+ | なし | ★★★★★ |
| **SwiftPDFLab** | https://swiftpdflab.com/ | 結合/圧縮/編集/署名/変換/フォーム作成 | なし | ★★★★ |
| **PDFLince** | https://pdflince.com/en | 圧縮/結合/分割/PDF↔画像変換 | なし（OSS） | ★★★★ |
| **BrowserBound** | https://www.browserbound.com/ | 50以上のPDF・画像ツール | なし | ★★★★ |
| **PDFgear** | https://www.pdfgear.com/secure-pdf-tools/ | 基本ツール（初期リリース段階） | 機能限定 | ★★★ |
| **Toolpods PDF結合** | https://toolpods.io/pdf-merge | PDF結合のみ | 結合のみ | ★★★ |

#### B-2. サーバー処理型

| ツール名 | URL | 日本語 | 無料制限 | セキュリティ対策 | おすすめ度 |
|----------|-----|--------|----------|-----------------|-----------|
| **PDF24 Tools** | https://tools.pdf24.org/ja/ | ✅ | 制限なし | EU内サーバー、1h削除 | ★★★★ |
| iLovePDF | https://www.ilovepdf.com/ja | ✅ | サイズ制限あり | ISO 27001、2h削除 | ★★★ |
| Smallpdf | https://smallpdf.com/jp | ✅ | **月2件** | ISO 27001、1h削除 | ★★ |
| Adobe Acrobat | https://www.adobe.com/acrobat/online/ | ✅ | **月1-2件** | Adobe基盤 | ★★ |

#### B-3. セルフホスト型（IT部門の協力が必要）

| ツール名 | URL | 特徴 | おすすめ度 |
|----------|-----|------|-----------|
| **Stirling PDF** | https://github.com/Stirling-Tools/Stirling-PDF | OSS、Docker対応、50+ツール、REST API対応 | ★★★★★ |

---

### C. ドキュメント変換系ツール

#### C-1. ローカル処理型

| ツール名 | URL | 対応変換 | 日本語 | おすすめ度 |
|----------|-----|----------|--------|-----------|
| **Tool Forest** | https://toolforest.jp/excel-csv/ | Excel↔CSV（文字コード指定可） | ✅ | ★★★★★ |
| **PDFConvertEasy** | https://www.pdfconverteasy.com/ | PDF→CSV/Excel（OCR対応） | ❌ | ★★★★ |
| **PDFLince** | https://pdflince.com/en | PDF操作全般（OSS） | ❌ | ★★★★ |

#### C-2. サーバー処理型

| ツール名 | URL | 対応変換 | 無料制限 | 日本語 | おすすめ度 |
|----------|-----|----------|----------|--------|-----------|
| **PDF24 Tools** | https://tools.pdf24.org/ja/ | Office全般↔PDF | 制限なし | ✅ | ★★★★ |
| **iLovePDF** | https://www.ilovepdf.com/ja/ | Office全般↔PDF | 日次制限あり | ✅ | ★★★ |
| **Convertio** | https://convertio.co/ja/ | 300形式以上 | 10件/日 | ✅ | ★★★ |
| Smallpdf | https://smallpdf.com/jp | Office全般↔PDF | **月2件** | ✅ | ★★ |
| Adobe Acrobat | https://www.adobe.com/jp/acrobat/online/ | Office全般↔PDF | **月1-2件** | ✅ | ★☆ |

> **注意：Excel→PDF、Word→PDF変換はMicrosoft Office自体の「名前を付けて保存」→PDF でも可能です。**
> オンラインツールを使う前にまずOfficeの標準機能を検討してください。

---

### D. 開発・ユーティリティ系ツール

#### D-1. 総合ツール

| ツール名 | URL | セキュリティ | カバー範囲 | おすすめ度 |
|----------|-----|-------------|-----------|-----------|
| **DevToys** | https://devtoys.app/ | 🟢 完全ローカル | JSON/Base64/Hash/RegEx/Diff/Color等 | ★★★★★ |
| **CyberChef** | https://gchq.github.io/CyberChef/ | 🟢 ブラウザ内 | 300以上のエンコード/デコード/暗号操作 | ★★★★★ |
| **develop.tools** | https://develop.tools/ | 🟢 ローカル | QR/Diff/Base64等。日本語対応 | ★★★★ |

#### D-2. QRコード生成

| ツール名 | URL | セキュリティ | 日本語 | おすすめ度 |
|----------|-----|-------------|--------|-----------|
| **develop.tools QR** | https://develop.tools/qrcode/ | 🟢 ローカル | ✅ | ★★★★★ |
| QRのススメ | https://qr.quel.jp/ | 🟡 不明 | ✅ | ★★★ |

#### D-3. テキスト差分比較（diff）

| ツール名 | URL | セキュリティ | 日本語 | おすすめ度 |
|----------|-----|-------------|--------|-----------|
| **develop.tools diff** | https://develop.tools/text-diff/ | 🟢 ローカル | ✅ | ★★★★★ |
| **difff（デュフフ）** | https://difff.jp/ | 🟡 不明 | ✅ | ★★★★ |
| Diffchecker | https://www.diffchecker.com/ | 🟡 サーバー | ❌ | ★★★ |

#### D-4. JSON/XMLフォーマッター

| ツール名 | URL | セキュリティ | おすすめ度 |
|----------|-----|-------------|-----------|
| **JSON Editor Online** | https://jsoneditoronline.org/ | 🟢 ブラウザ内 | ★★★★★ |
| JSON Formatter (jam.dev) | https://jam.dev/utilities/json-formatter | 🟢 ブラウザ内 | ★★★★ |
| JSONLint | https://jsonlint.com/ | 🟡 不明 | ★★★ |

#### D-5. Base64エンコード/デコード

| ツール名 | URL | セキュリティ | おすすめ度 |
|----------|-----|-------------|-----------|
| **CyberChef** | https://gchq.github.io/CyberChef/ | 🟢 ローカル | ★★★★★ |
| **Base64.sh** | https://www.base64.sh/ | 🟢 ローカル | ★★★★★ |

#### D-6. 正規表現テスター

| ツール名 | URL | セキュリティ | 日本語 | おすすめ度 |
|----------|-----|-------------|--------|-----------|
| **Regex101** | https://regex101.com/ | 🟡 サーバー送信の可能性 | ❌ | ★★★★★（機能最強） |
| **WEB ARCH LABO** | https://weblabo.oscasierra.net/tools/regex/ | 🟢 ブラウザ内 | ✅ | ★★★★ |

#### D-7. 文字数カウント

| ツール名 | URL | セキュリティ | 日本語 | おすすめ度 |
|----------|-----|-------------|--------|-----------|
| **Sundry Street** | https://sundryst.com/convenienttool/strcount.html | 🟢 ブラウザ内 | ✅ | ★★★★★ |
| ラッコツールズ | https://rakkokeyword.com/techo/count-text/ | 🟢 | ✅ | ★★★★ |

#### D-8. カラーピッカー

| ツール名 | URL | セキュリティ | 日本語 | おすすめ度 |
|----------|-----|-------------|--------|-----------|
| **Google検索「カラーピッカー」** | Google検索 | 🟢 | ✅ | ★★★★★ |
| Webカラーピッカー | https://colorpicker.doratool.com/ | 🟢 ブラウザ内 | ✅ | ★★★★ |

#### D-9. フローチャート・ダイアグラム

| ツール名 | URL | セキュリティ | 日本語 | おすすめ度 |
|----------|-----|-------------|--------|-----------|
| **draw.io** | https://app.diagrams.net/ | 🟢 ブラウザ内 | ✅ | ★★★★★ |
| Miro | https://miro.com/ | 🟡 クラウド | ✅ | ★★★ |

#### D-10. ハッシュ値計算

| ツール名 | URL | セキュリティ | おすすめ度 |
|----------|-----|-------------|-----------|
| **CyberChef** | https://gchq.github.io/CyberChef/ | 🟢 ローカル | ★★★★★ |
| **Hash File Online** | https://hash-file.online/ | 🟢 ローカル | ★★★★★ |

#### D-11. URLエンコード/デコード

| ツール名 | URL | セキュリティ | 日本語 | おすすめ度 |
|----------|-----|-------------|--------|-----------|
| **CyberChef** | https://gchq.github.io/CyberChef/ | 🟢 ローカル | ❌ | ★★★★★ |
| **ベンリスト** | https://chameleons.co.jp/work/url-encode/ | 🟢 ローカル | ✅ | ★★★★ |

---

## 用途別 早見表

「こんな時はこのツール！」一発逆引きガイド。

| やりたいこと | 最推奨ツール | セキュリティ |
|---|---|---|
| 画像をPNG↔JPG↔WebPに変換したい | ラッコサーバー WebP変換 / ImageLab | 🟢 |
| 画像のファイルサイズを小さくしたい | Squoosh / Small.im | 🟢 |
| 画像のサイズ（ピクセル）を変えたい | BIRME（一括）/ Photopea（個別） | 🟢 |
| 画像の背景を消したい | PruneBG | 🟢 |
| 複数の画像を1枚に並べたい | フォトコンバイン | 🟢 |
| 画像を本格的に編集したい | Photopea | 🟢 |
| 複数のPDFを1つにまとめたい | BentoPDF | 🟢 |
| PDFを分割・ページ削除したい | BentoPDF / SwiftPDFLab | 🟢 |
| PDFのファイルサイズを小さくしたい | BentoPDF / PDFLince | 🟢 |
| PDFに注釈・署名を入れたい | BentoPDF / SwiftPDFLab | 🟢 |
| Excel→PDFに変換したい | **Officeの標準機能** / PDF24 Tools | - / 🟡 |
| PDF→Excelに変換したい | PDFConvertEasy / PDF24 Tools | 🟢 / 🟡 |
| CSV↔Excelを変換したい | Tool Forest | 🟢 |
| JSONを整形・検証したい | DevToys / JSON Editor Online | 🟢 |
| Base64のエンコード/デコードしたい | DevToys / CyberChef | 🟢 |
| ハッシュ値を計算したい | DevToys / CyberChef | 🟢 |
| テキストの差分を比較したい | DevToys / develop.tools diff | 🟢 |
| 正規表現をテストしたい | DevToys / Regex101 | 🟢 / 🟡 |
| QRコードを作りたい | develop.tools QR | 🟢 |
| フローチャートを描きたい | draw.io | 🟢 |
| 文字数をカウントしたい | Sundry Street | 🟢 |
| カラーコードを調べたい | Google検索「カラーピッカー」 | 🟢 |
| URLをエンコード/デコードしたい | CyberChef / ベンリスト | 🟢 |

---

## 利用時の注意事項

### 1. セキュリティに関するルール

- **機密情報・個人情報を含むファイル** → 必ず🟢ローカル処理型ツールを使用すること
- **サーバーアップロード型ツール（🟡🔴）** → 機密性の低いファイルにのみ使用すること
- **判断に迷ったら** → ローカル処理型を選択すること

### 2. ブックマーク推奨リスト

以下のツールをブラウザのブックマークバーに登録しておくと便利です：

```
📁 ちょいツール
  ├─ 📁 画像
  │   ├─ Squoosh（圧縮）      https://squoosh.app/
  │   ├─ ImageLab（変換）      https://imagelab.westnode.com/
  │   ├─ Photopea（編集）      https://www.photopea.com/
  │   ├─ BIRME（一括リサイズ）  https://www.birme.net/
  │   └─ PruneBG（背景除去）   https://prunebg.com/
  ├─ 📁 PDF
  │   ├─ BentoPDF（万能）      https://www.bentopdf.com/
  │   └─ PDFLince（軽量）      https://pdflince.com/en
  ├─ 📁 変換
  │   ├─ Tool Forest（CSV↔Excel） https://toolforest.jp/excel-csv/
  │   └─ PDF24 Tools（Office↔PDF） https://tools.pdf24.org/ja/
  ├─ 📁 開発ツール
  │   ├─ CyberChef（万能）     https://gchq.github.io/CyberChef/
  │   ├─ develop.tools          https://develop.tools/
  │   └─ Regex101               https://regex101.com/
  └─ 📁 その他
      ├─ draw.io（図表作成）   https://app.diagrams.net/
      └─ Sundry Street（文字数） https://sundryst.com/convenienttool/strcount.html
```

### 3. インストール推奨アプリ（IT部門に相談）

| アプリ | 入手先 | 理由 |
|--------|--------|------|
| **DevToys** | Microsoft Store | 開発系ユーティリティを完全ローカルで一元管理 |
| **PDF24 Creator** | https://tools.pdf24.org/ja/creator | PDF操作を完全オフラインで実行可能に |
| **draw.io Desktop** | https://github.com/jgraph/drawio-desktop/releases | 図表作成を完全オフラインで |

### 4. IT部門と連携して検討すべき事項

- **Stirling PDF** のセルフホスト導入（Docker環境）→ 社内PDF処理基盤として最強
- **BentoPDF** のセルフホスト（Docker対応）→ 社内専用PDF環境の構築
- 上記ツールのURLをホワイトリストに追加（社内プロキシ等でブロックされている場合）

---

> 本提案書は2026年2月21日時点の調査に基づいています。各ツールの仕様・料金は変更される可能性があります。
