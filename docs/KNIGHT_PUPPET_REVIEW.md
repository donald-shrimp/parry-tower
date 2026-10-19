# 騎士の原画可動化・確認記録（2026-10-18）

## 実装と素材

- 比較：<http://127.0.0.1:8000/art-preview.html>
- 実戦：<http://127.0.0.1:8000/dev.html?floor=2&enemy=knight&art=illustrated>
- [ランタイム](../assets/character-knight-puppet.js)：元PNGをCanvas2Dでマスク分割。8層。追加ライブラリなし。
- [原画](../assets/character-art/rework/knight/knight-ready-candidate-v3.png)：1445×1088 RGBA。保持した原画から直接描画する。
- [補修した頭飾り](../assets/character-art/rework/knight/knight-plume-repaired.png)：1445×1088 RGBA。腕で隠れた部分まで一本につないだ透過素材。内蔵画像生成を使用。[プロンプトと配置](../assets/character-art/rework/knight/PLUME-REPAIR.md)。
- [マニフェスト](../assets/character-art/rework/knight/puppet-manifest.json)：原画座標、pivot、マスク、crop、所有優先順位、描画順、布の配置。JSと一致をテスト。
- 再生成アトラスは構えが変わったため不採用。ファイルは履歴として残す。

## 動きと重なり

待機は元原画の構え。右手の剣と腕を最奥、左手の盾を最前面へ。下半身は原画の一枚を使い、膝や靴を独立して動かさない。全身が予備動作で8単位後退し、接触時は元位置より6単位前へ滑り、回復とともに戻る。スケールが掛かる前のローカル座標での値。

赤布は旧原画の該当部分を除き、補修した一本の素材を腕より手前、胴より奥で描く。以前の末端だけを引っ張る処理は削除。肩→肘→手→剣の接触解法に全身移動量も加え、既存の攻撃時刻に盾へ届かせる。38msの接触姿勢保持と回復は既存描画タイムラインを使用。ゲーム時間は止めない。

## 検証

- 全232 Nodeテスト成功。新描画9テストには、原画/補修PNGとマニフェスト、各素材のロード失敗、敵未設定のタイトル、原画の待機座標、実際の8層描画順を含む。
- 320/360/560/880/1180px幅で連続フレームの足姿勢固定、後退→前進→戻り、剣の振りと回復の画面内収まりを検証。色違い・受け方にかかわらず既存時刻の盾接触が一致。
- ゲームVMは11敵種のジャスト・パリィ・ガード・被弾で従来表示と状態・音声イベント時刻・保存を比較。
- 20 JS構文、47 HTML参照の確認成功。
- git diff --check 成功。スマホ比較UIの横はみ出しを修正し、360px指定時のdocument幅とscrollWidthが一致することを確認。
- ブラウザで原画比較、待機・振り・接触、一本の赤布、8部品、360px表示、実戦起動と描画を確認。最新ロード後のconsole errorなし。
- 待機の再合成と原画の比較は、旧布のマスクと新布の不透明画素だけ除外して計測。一致99.77%。残る差は分割輪郭のアンチエイリアス等を含み、完全一致とは扱わない。

画像証跡（Git管理外）：test-results/character-art/knight-plume-idle.jpg、knight-plume-swing.jpg、knight-plume-contact.jpg、knight-plume-mobile.jpg、knight-plume-battle.jpg。

## 残る範囲

全キャラの画風統一は未完了。現在の新原画は騎士系のみ。実スマホのタッチ・音声遅延は未検証。布の見た目とスライド量の最終採用はユーザー評価が必要。未コミット・未push、PR #28はDraftのまま。
