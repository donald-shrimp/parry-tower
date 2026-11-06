# Sol開始指示：2A 新規ラン状態の抽出

この指示はユーザーのゴーサイン後に渡す。モデルは **gpt-6.1-sol / high**。計画準備中に実装を始めない。

## 作業場所と基準

- 物理repo：`E:/Development/parry-tower/parry-tower`
- 現作業ツリー：`E:/Development/parry-tower/parry-tower/.local-only/worktrees/shop-upgrade-display`
- 現ブランチ：`refactor/audio-foundation`。ここに音声基盤の3変更がある。
- コード比較元：`3a16cc5`。開始時のHEADはこれに計画文書コミットが加わる想定。
- 未コミット差分を確認し、既存ユーザー変更を保持する。親と同じworktreeで重複編集しない。

AGENTS、HANDOFF、[実行計画](./REFACTOR_EXECUTION.md)の2A、ARCHITECTUREを読む。最初は2Aだけが実装範囲。親が方針・レビューを担当し、あなたはコードと検証を担当する。Gitコミットと文書の最終更新は親が行う。

## 目標

`game.js` の `start` から標準ランの生成を `assets/run-state.js` の `ParryRunState.create(options,now)` へ抽出する。APIの入力・HP式・稽古の例外は実行計画に定義済み。新規状態は現在のフィールド名・値を保持し、DOM/AudioContext/storage/時計/乱数なしで生成できるようにする。

## 手順

1. HEADと差分を確認し、親へ着手範囲を一度報告する。親が用意した `refactor/run-state` がなければその作成を親へ依頼する。公開mainを基準にしない。
2. 現行 `start` の生成直後の状態を比較用に記録し、factoryへ標準状態を移す。配列/辞書を共有しない。副作用の順序は維持する。
3. factoryの後にDevのtempo/survival/merchant特例を従来の順で適用する。title/restore/spawnEnemy/戦闘式は移動しない。
4. index/dev、診断、CIのアセット順と `tests/helpers/game-harness.js` を更新する。
5. 小さな表駆動テストで旧状態との一致・非共有を確認。既存のゲーム検証は維持する。
6. 構文/静的参照、全Node、耐久試算を確認して親へ報告する。新しい仕様を通すために既存期待値を変えない。

## 維持事項

- セーブversion/キー、BPM、1.5拍の溜め、拍上の接触、入力判定、奥義の通常PARRY発動、戦闘バランス、原画/ポーズを維持。
- 稽古でも現行どおりの生命/障壁/基礎攻撃/bonusesを用いる。初期スキル/封印/追加引き直しだけを既存条件で扱う。
- `game` は開始ごとに新しいオブジェクト。アート読込完了の旧ランへの誤適用を防ぐ参照判定を壊さない。
- 新factoryで敵/テンポを抽選しない。現在のrandom呼出数・順序を維持。
- 保存復元と新規初期化を混ぜない。後続の2B/2Cを先回りしない。
- 新フレームワーク、包括的なフォーマット変更、新しいグローバルgame、任意eval APIを追加しない。

## 検証コマンド

```powershell
node --test tests/*.test.js
node scripts/survival-analysis.js
node scripts/balance-simulation.js
git diff --check
```

変更したJSの `node --check` とCI相当の静的アセット検査も行う。耐久JSONの比較はrevision以外の結果を維持する。基準はNode501件/約39秒の直近成功記録。比較用一時ファイルは物理repoの `.local-only/scratch/` に保存し、Git対象にしない。

## 親への完了報告

変更ファイルとAPI、守った初期化順序、旧状態との比較条件、実行した検証と結果、未検証/問題点を簡潔に報告。ゲーム側に残した処理も明記する。親が現在のdiffを直接読めるため全文貼付は不要。

期待値変更・保存互換破壊・乱数消費差が必要になったら、理由と最小の代案を返す。親のレビュー完了まで2Bへ進まない。push/PR作成/merge/公開はこの指示の範囲外。
