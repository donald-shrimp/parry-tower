# ローカル専用ファイル

## 一時的にエージェントへ見せるもの

このPCの置き場は `E:\Development\parry-tower\parry-tower\.local-only\`。

| フォルダー | 用途 |
| --- | --- |
| `.local-only/references/` | 参考音声・画像・動画、採用前の入力資料 |
| `.local-only/scratch/` | 一時変換、調査メモ、使い捨て出力 |
| `.local-only/archive/` | 整理時にGit管理から外し、ローカルで残す旧案 |

ファイルを置き、「`.local-only/references/参考音声.mp3` を参考にして」と依頼する。日本語のファイル名でもよい。

2026-10-23の旧原画整理では、使われなくなった22枚を `.local-only/archive/old-art-2026-10-23/` 内に元の相対パスで保管した。元パス・SHA-256は同フォルダーの `manifest.json`、対象一覧は [CLEANUP_CANDIDATES.csv](./CLEANUP_CANDIDATES.csv) にある。戻す場合は必要な画像だけ元パスへコピーする。

このフォルダー全体は `.gitignore` で除外する。中の `.gitignore` も全ファイルを除外する。Gitは空フォルダーや無視対象を新しいcloneへ作らないため、別のPCでは必要なフォルダーを作成する。

## 公開しないための運用

- `.local-only/` と `.codex-remote-attachments/` はGitの通常の追加対象にしない。外側の古いリポジトリにも除外設定を追加済み。
- `output/` はレビュー用の書き出しであり、開発本体のGit管理から除外する。ユーザーの編集JSONや原画の控えを含むため、フォルダーごと捨てない。
- 採用するファイルだけ、ユーザーの指示を受けて必要な権利・用途を確認し、適切な `assets/` 等へコピーする。参考にしただけの音声・動画はコピーしない。
- エージェントは無視対象を `git add -f` で追加したり、手動アップロード・配布用ZIPへ混ぜたりしない。
- `.gitignore` は通常のGit操作への混入を防ぐ設定。手動アップロードや強制追加を禁止するアクセス制御ではなく、既に追跡済みのファイルや過去の履歴も消さない。
- `.local-only/` は既存の `scripts/serve-local.js` と `scripts/serve-playtest.js` がドット始まりのパスとして拒否する。任意の別サーバー（`python -m http.server` 等）の配信対象になることはあるため、そのサーバーの公開用素材置き場にはしない。
- このPCだけのファイルはGitHubへ同期・バックアップされない。失いたくない原本は別途保管する。

除外の確認例（開発本体で実行）:

```powershell
git check-ignore -v -- .local-only/references/参考音声.mp3
git status --short
```

会話添付の既存ファイルは外側の `E:\Development\parry-tower\.codex-remote-attachments\` にある。新しく自分で置く資料は `.local-only/references/` へ統一する。
