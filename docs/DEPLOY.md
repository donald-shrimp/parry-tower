# GitHub Pages 公開手順

> このプロジェクトは**ビルド不要**です。GitHub Actionsからのデプロイは使わず、`main` ブランチのルートをそのまま公開します。

## A: GitHubウェブ画面だけで公開

1. GitHubにサインインし、<https://github.com/new> で新規リポジトリを作成する。
   - **Owner:** `donald-shrimp`
   - **Repository name:** `parry-tower`
   - **Visibility:** `Public`（GitHub FreeならPages利用には通常Publicが必要）
   - `Add a README` をオンにして作っても構いません。
2. 同梱の `parry-tower-source.zip` を展開する。**ZIPのままアップロードせず**、展開後の `index.html`、`assets/`、`docs/`、`.github/` 等のファイル・フォルダーをリポジトリルートにアップロードする。ブラウザ上で `Add file` → `Upload files` を選び、フォルダーごとドラッグしてコミットする。
3. `Settings` → `Pages` → `Build and deployment` を開く。
4. `Source` = **Deploy from a branch**、`Branch` = **main**、`Folder` = **/(root)** を選択して **Save**。
5. 公開が完了したら <https://donald-shrimp.github.io/parry-tower/> にアクセスして再生・タップ・BGMを確認する。

※ `main` のルートに `index.html` があることが必須です。**公開されるまでの時間は変動します**。公開が反映されない場合はPages設定とActionsの実行履歴を確認してください。

## B: Git履歴（v0.1〜v0.5）ごと移行する方法

Gitがインストールされた端末で、同梱の `parry-tower-history.bundle` を使用します。空のリポジトリ（READMEを自動生成しない）をGitHubで作り、以下を実行してください。

```bash
git clone parry-tower-history.bundle parry-tower
cd parry-tower
git remote remove origin
git remote add origin https://github.com/donald-shrimp/parry-tower.git
git push -u origin main
git push origin --tags
```

> `git clone <bundle>` のパスはbundleファイルの実際の保存場所に合わせてください。GitHub認証を求められます。**AとBはどちらか一方を選んでください**（両方を混ぜない）。

## 更新方法

以後は `main` に変更をpushするとPagesが更新されます。変更のレビューを行う場合は `feat/xxx` ブランチからPRを作成して `main` にマージします。

## 公開前チェック

- PC/Android Chromeでゲーム画面が読み込まれる
- BGMがユーザー操作後に鳴り、モーションと着弾が拍に合う
- 稽古場で敵5種類を切り替えられる
- ジャストパリィ/被弾/勝利/報酬/ボス/死亡/再挑戦を通せる
- Pages配下の相対パス `./assets/...` が正しく読み込まれる
- ブラウザのDevTools Consoleにエラーがない

## 備考

- Pagesは静的ホスティングです。このゲームの実装ではサーバーを必要としません。
- 公開URLは一般に誰でもアクセスできます。GitHub上に秘密情報をコミットしないでください。
- `file://` と公開URLでは `localStorage` は共用されず、従来の恒久強化は原則引き継がれません。
