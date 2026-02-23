# 実装計画 - Gems Auto-Saver (Browser Script Edition)

## 1. 概要
Gemini Gemsのページ上で動作するJavaScriptツール。既存のGemsページにUIをオーバーレイし、自動入力と成果物のダウンロードを実現する。

## 2. 実装方式
- **Runtime**: Browser Developer Console (JavaScript)
- **UI**: HTML/CSS Injection (Vanilla CSS, Glassmorphism)
- **Functions**: DOM Manipulation, Blob API (Download)

## 3. 主要機能
- **自動入力・送信**: 指定したテキストをプロンプト欄にセットし送信。
- **完了検知**: 生成が終わるのを監視。
- **ファイル保存**: 回答内容を抽出し、テキストファイルとして自動ダウンロード。

## 4. UI/UX設計
- 指定されたネオン/ガラスモーフィズムの外観を、Geminiの画面上にフロートパネルとして実装。
