# 主人公の原画カット・可動化（2026-10-19）

最新の参考動画による剣腕修整は [HERO_VIDEO_MOTION](./HERO_VIDEO_MOTION.md)。現在は手首で剣/握り手を前腕から分けた7層で、動画の下→後方→畳んで戻す軌道を使う。盾/胴/脚の既存動作と240msは維持。以下は初期実装の記録。

ユーザーが原画を評価し、今回の騎士と同じ直接カット方式による可動化、正回転360°への変更、その後「斬るときに腕を真っすぐ伸ばす」修正を依頼。さらに主人公はほぼ定位置に留まり、敵が襲いかかる見せ方を指定した。

## 実装

- 原画：assets/character-art/rework/hero/hero-ready-candidate.png（1445×1088 RGBA、元ファイル保持）。新たな原画生成やSVG化はせず、同じ画素を直接使用。
- assets/character-hero-puppet.js が読み込み時に6層へマスク分割。奥からマント→下半身→左腕と盾→胴・兜・肩→右上腕→前腕・握り手・剣。主人公は右側面が手前なので剣腕が最前面。
- 腕のマスクは隣の装甲へ触れた飛び地を除き、本体へ戻す。隠れたマントの小範囲だけ、同じ原画の隣接する布を複製して切り口の背面へ補完。別の絵柄で描き直していない。
- 肩→肘→手→剣の剛体接続。上腕と前腕を独立に回し、反撃の位相0.34～0.42で肩・肘・手が一直線になる。前後は滑らかに曲げ伸ばしして原画の待機へ戻る。
- 元の240msで正回転+360°。反撃直前の短い溜め→伸ばした腕の斬撃→畳む回復。足の形は固定。反撃だけなら全身移動はローカル最大2単位（通常表示で数px）に抑制。
- 載せ替えは art=illustrated のみ。従来の art=ready/impact の逆回転モーションは保持。
- assets/character-knight-puppet.js が新主人公と既存騎士を同じ配置へ合わせる。主人公の新しい盾前面を打点に採用し、敵の剣先も一致。ほかの敵は既存描画と接近・後退を維持し、共有レイアウトを渡す。
- 元PNGの再合成：全画素比較で99.91%一致。完全一致とは扱わず、輪郭のアンチエイリアス等を含む。
- 原画、マスク、pivot、crop、順序、240ms、回転方向は assets/character-art/rework/hero/puppet-manifest.json に記録。

## 確認

- 全241 Nodeテスト成功。主人公9テスト：素材と記録、ロード失敗、待機座標、正回転、剛体接続、伸びた腕の一直線、足と定位置、全画面幅と敵の接触・収まり、実描画の順序、未改修敵の接近動作。
- ゲームVMは11敵種×ジャスト/パリィ/ガード/被弾で状態・音声イベント時刻・保存内容を従来表示と比較。読み込み完了を待ち、新描画が実際に呼ばれたことも確認するよう強化。
- 21 JS構文、50 HTMLアセット参照、git diff --check 成功。
- 実ブラウザのPC/360pxで待機、原画並列比較、部品、反撃・腕の伸び・骨格を確認。360px指定時のdocument幅とscrollWidthが一致。
- 実戦で新主人公と騎士の描画、長押しガードでHP65→60を確認。console errorなし。実スマホのタッチ・音声遅延は未検証。
- 証跡（Git管理外）：test-results/character-art/hero-puppet-source-comparison.jpg、hero-puppet-parts-final.jpg、hero-puppet-extension-final.jpg、hero-puppet-extended-arm-debug.jpg、hero-puppet-mobile-final.jpg、hero-puppet-battle-final.jpg。

## 確認URL

<http://127.0.0.1:8000/art-preview.html> の「腕の伸び」「骨格を見る」「スロー」で確認できる。同じ描画は <http://127.0.0.1:8000/dev.html?floor=2&enemy=knight&art=illustrated> で使用。最終的な動きの採否はユーザー評価が必要。未コミット・未push。
