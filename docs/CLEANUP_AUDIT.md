# GitHub整理候補（2026-10-23）

## 今回の実行結果：旧案22枚をGit管理から削除

ユーザーの「モーションと立ち絵の情報も含めて変更点をコミット、いらんものは削除」という指示で、Aの旧原画22枚（29,137,136 bytes / 27.79 MiB）を整理した。棚卸しのblob SHAと全ファイルの一致、現行pixel manifest非対象、実行コード・生成処理・テストのパス参照なしを再確認した。

旧案は `.local-only/archive/old-art-2026-10-23/` 以下へ元の相対パスで移動し、全SHA-256一致を確認。`manifest.json` に元パス・保管先・SHA-256・bytesを保存。Gitでは削除として記録し、PC内の原本は保持した。過去の制作記録には保管先を注記し、削除画像へのリンクと旧atlasを現役扱いする説明を修正した。

工房の最新保存JSONと同期JSは完全一致を検証し、既存15体70レイヤーと14モーションキーを保持。全Node464件・Python画像8件、構文／diff検査と独立レビュー成功。B/Cの比較画像、採用原画、工房データ、output、添付、試聴音声・検証出力は維持。リモートブランチや履歴は変更せず、push/公開も今回の対象外。以下は整理前の棚卸し記録で、CSVのAの状態は実行済みへ更新した。

## 対象と結論

目的は「外部に公開する必要のないものを公開場所から外すこと」。容量削減やPC内の整理は目的ではない。GitHubの公開ファイル・ブランチとGitHub Pagesの公開内容を対象にし、ローカルにしかない添付・スクリーンショット・検証出力は削除候補から除外する。ローカルの原本や控えはそのまま残してよい。

対象は [donald-shrimp/parry-tower](https://github.com/donald-shrimp/parry-tower)。GitHub APIでmain `aac6377c57b9f25e4470959c7d44c4f7323263ca` の全tree、30ブランチ、open PRを確認した。mainは448ファイル、合計82,837,314 bytes（79.00 MiB）。これは現在のファイル合計であり、Git履歴を含む容量ではない。

実際の開発本体は `E:/Development/parry-tower/parry-tower`。外側にも古い別Gitリポジトリがあるため混同しない。初回棚卸しのローカル枝は `codex/final-boss-music`。その時点では棚卸しと非公開置き場の作成のみで、既存ファイル/枝の削除・移動、履歴改変、commit/push/公開は行っていなかった。

| 優先度 | 候補 | 数量・容量 | 判断 |
| --- | --- | --- | --- |
| A | 旧原画案：下記PNG | 22枚 / 27.79 MiB | ローカルに保管してGitHubから外す第一候補 |
| A | mainへ取り込み済みのリモートブランチ | 26本 | mainへの包含とopen PRの非対象を確認。削除候補 |
| B | `pixel-candidates/{balanced,retro}/` | 40枚 / 0.94 MiB | 比較画面を続けるか決めてから |
| B | `palette-candidates/{balanced,retro}/` | 34枚 / 0.78 MiB | 同上 |
| C | `palette-candidates/original/` | 17枚 / 15.57 MiB | 原寸の配色済み出力。再編集用途があり、ローカル保管/再生成確認が先 |

画像のパスはいずれも `assets/character-art/` 以下。GitHub上の個別ファイル候補113件は [CLEANUP_CANDIDATES.csv](./CLEANUP_CANDIDATES.csv) にパス・bytes・理由・前提・blob SHAを記録した。A/B/Cの画像は重複しない。すべて候補であり、削除を実施してよいという確定判定ではない。

## 参考音声・スクリーンショットの確認結果（整理対象外）

参考MP3 3本と、スマホでゲームのタイトル画面を撮った添付スクリーンショットは、いずれもローカルにだけ存在しGit除外済み。検証スクリーンショットや比較用WAVもGit管理対象外。外部公開の整理には関係しないため、これらは削除しない。

mainの全treeと、ローカルで取得済みの全refから到達できるGitオブジェクトに音声/動画拡張子のファイルは見つからず、mainの画像177枚はすべて `assets/character-art/` 以下だった。確認したスマホスクショは含まれていない。本編の効果音/BGMはWeb Audioで合成するコード。これはこのリポジトリの確認結果であり、他のリポジトリ、過去に削除されたリモート枝だけの履歴、Issue/PR添付、到達不能オブジェクトの全調査は行っていない。

## A：旧原画PNG 22枚

現行の `pixel-candidates/manifest.json` が列挙する原画20枚には含まれない。現作業枝のJS/HTML/CSS/生成スクリプト/テストには以下のファイル名の直接参照を検出せず、一部は過去の制作プロンプトJSON・Markdownから参照される。動的なパス生成や古い比較URLまで完全に不要と証明したものではない。削除時は制作記録の参照整理と生成・テスト確認を行う。

すべて `assets/character-art/rework/` 以下：

| パス | MiB |
| --- | ---: |
| `dirgekeeper/dirgekeeper-ready-anatomy-v2.png` | 1.34 |
| `dirgekeeper/dirgekeeper-ready-candidate.png` | 1.35 |
| `dirgekeeper/dirgekeeper-ready-guard-v3.png` | 1.42 |
| `dirgekeeper/dirgekeeper-ready-low-v3.png` | 1.18 |
| `gem_slime/gem_slime-ready-candidate.png` | 1.80 |
| `guardian/guardian-contact-v6.png` | 0.92 |
| `guardian/guardian-ready-anatomy-v2.png` | 1.29 |
| `guardian/guardian-ready-candidate.png` | 1.35 |
| `guardian/guardian-ready-guard-v3.png` | 1.23 |
| `guardian/guardian-ready-guard-v6.png` | 1.05 |
| `ironwarden/ironwarden-ready-anatomy-v2.png` | 1.35 |
| `ironwarden/ironwarden-ready-candidate.png` | 1.36 |
| `ironwarden/ironwarden-ready-guard-v3.png` | 1.34 |
| `knight/knight-parts-v2.png` | 1.17 |
| `knight/knight-parts.png` | 1.18 |
| `knight/knight-ready-candidate-v2.png` | 1.05 |
| `knight/knight-ready-candidate.png` | 0.85 |
| `sentinel/sentinel-ready-anatomy-v2.png` | 1.36 |
| `sentinel/sentinel-ready-candidate.png` | 1.37 |
| `timewarden/timewarden-ready-anatomy-v2.png` | 1.34 |
| `timewarden/timewarden-ready-candidate.png` | 1.35 |
| `timewarden/timewarden-ready-guard-v3.png` | 1.16 |

古い文書 `knight/PARTS-EDIT.md` にはv2 atlasをruntimeが使う旨の当時の記述が残る。現在の騎士puppetはcandidate-v3＋plume-repairedを使うため、整理時に古い説明も更新する。

## B/C：比較用・原寸出力

本編の `assets/character-style.js` はfineを採用するが、比較画面はbalanced/retro/originalを利用する。関連は `pixel-compare.html`、`assets/pixel-art-preview.js`、`assets/palette-candidates.js`、両manifest、`scripts/build-pixel-art.py`、`scripts/build-palette-art.py` と画像/Nodeテスト。

ファイルだけ消すと比較や再生成・CIが壊れる。比較機能を整理するなら一緒に更新する。原寸出力17枚は加工し直す用途があるため、捨てずにローカル保管を優先する。

## ブランチ候補

GitHub APIの各先端SHAがローカルrefと一致すること、次の26本がmainの祖先であることを `git merge-base --is-ancestor` で確認した。現open PR #29のheadは含めていない。

```text
analysis/v093-phase3-balance-simulation
chore/release-v053-labels
chore/release-v054-labels
chore/release-v055-labels
chore/release-v056-labels
experiment/character-art-canvas-v1
feature/floor-bestiary-arena
feature/parry-feedback-flashy-v052
feature/parry-feedback-v052
feature/v054-enemy-motion-devtools
feature/v055-ui-copy-cleanup
feature/v056-permanent-progression
feature/v057-damage-lifesteal
feature/v058-new-skills-fate-seal
feature/v060-relic-system
feature/v070-tower-crossroads
feature/v080-deep-zones
feature/v090-final-stages
feature/v091-mysterious-blood-trial
feature/v092-hold-guard-attack-curve
feature/v093-permanent-stat-tiers
feature/v093-phase2-survival-and-rescue
fix/death-screen-grace-500ms
fix/death-screen-tap-grace
fix/floor-combo-hud-overlap
fix/v071-build-diagnostics-cache-guard
```

以下は祖先判定では取り込みを確認できなかったため削除対象から除外：

- `chore/rename-loadout-tab`
- `feat/cp-period-display-credits`
- `experiment/character-art-svg-preview-20261018`：openのDraft [PR #29](https://github.com/donald-shrimp/parry-tower/pull/29)。採否判断が必要。

最初の2本はsquash等で同等変更が入っている可能性があるが、今回は追加調査せず保留。ローカルの未公開開発枝は削除候補に含めない。

## 今回は保持するもの

- `pixel-candidates/fine/`（20枚）と `palette-candidates/fine/`（17枚）：名前にcandidateがあっても本編採用済み。
- 現行manifestの原画20枚、`approved/endking/` のproject.jsonと両PNG、使用中のスキン原画/加工画像：再編集・再生成の元データ。
- `studio-project.json` と `character-art-defaults.js`：ユーザー編集中の未コミット変更あり。正本/保存済みポーズ。
- `output/`（4ファイル / 42.09 MiB）：レビューPPTXと終王の編集JSON/PNG。後者は採用素材の控えでもあり、一括削除しない。今回Git除外を追加した。
- `test-results/final-boss-music/`：現在の曲試聴待ちの音声/証跡。旧参考音声と混同しない。
- `test-results/hero-video/`（94.57 MiB）など：検証用画像だけでなくユーザー作業のバックアップを含むフォルダーもある。`test-results/` 全体を不要扱いしない。
- mainに残る旧 `assets/character-art/references/` やSVG/trace比較素材：容量は小さく、比較URL/旧実装からの依存整理が必要なため今回の第一候補には含めない。
- フォント本体/NOTICE/credits、ソース、テスト、CI、現在の仕様書。

`docs/HANDOFF.md`、`docs/PLAN.md`、`docs/character-art/DEVELOPMENT_HISTORY.md` は過去経緯が累積している。制作プロンプトや内部作業メモも含め、外部公開する必要があるかは容量と別に検討する。今回は依存・継続情報の整理前なので削除確定にはしない。

## 置き場と次の進め方

検証済み：Git除外（日本語名・入れ子・外側の既存添付・output）、通常の `git add --dry-run` で私用ファイルが拒否されること、両プレビューサーバーへの8リクエストがすべて403になること。既存サーバーテスト3件成功、`git diff --check` 成功。初回のlocalhost通信はsandboxのEACCESで失敗し、許可後の再実行で成功した。原画同期JSと工房JSONの既存変更は作業前後のGit blob hash一致を確認。コード変更はないためゲーム全体の回帰テストは今回再実行していない。HTTP/Git追加の確認結果は `.local-only/scratch/privacy-verification.json`。

[LOCAL_FILES.md](./LOCAL_FILES.md) の `.local-only/references/` を用意済み。内外の.gitignoreで一時資料と会話添付を除外した。既存ファイルは移動していない。

推奨順序は「取り込み済み26ブランチ」→「旧案22枚をローカル保管してGit管理から外す」→「比較機能や制作資料を外部公開する必要があるか判断」。参考音声・スクリーンショットなどのローカル整理は行わない。

通常の削除コミットやブランチ削除だけでは過去コミットの画像は消えず、Git履歴のサイズが同じだけ減るとは限らない。履歴全体から消す書き換え・force pushは今回の対象外。削除実行前には対象のSHA/利用状況がこの棚卸しから変わっていないことを再確認する。
