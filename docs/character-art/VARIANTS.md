# 派生種・レア敵・ボスの差分指示

ゲームの正確な敵ID・分類は `assets/encounters.js` の定義を優先する。本ページは**既存の基本指示書に重ねる差分**。色だけでなく重要なシルエットや装備の違いも描き、ただし元種と同じ可動系統を維持する。

画像生成時には「共通STYLE_GUIDE + 元の`prompts/<base>.md` + 以下の差分」を読む。採用後は **派生IDで別の参照画像**を登録（例: `references/ember_slime/approved.png`）。SVG担当も派生IDで出力する。

| ゲームID | 名前 | 元の指示書 | 追加の見た目の差分 |
| --- | --- | --- | --- |
| `ember_slime` | 灼熱スライム | [slime](./prompts/slime.md) | 燃える核、煤色のゲル、熱の筋。前方突起を保持 |
| `molten_sentinel` | 熔鉄の番兵 | [sentinel](./prompts/sentinel.md) | 炉鉄色の大盾、赤熱した継ぎ目、重さは維持 |
| `frost_wraith` | 氷霞の亡霊 | [wraith](./prompts/wraith.md) | 霜の裂け目、結晶化した爪、淡い青白さ |
| `silver_duelist` | 白銀の双剣士 | [duelist](./prompts/duelist.md) | 銀青の二刀、冷たい金属のエッジ、軽快さ |
| `star_cantor` | 星屑の詠み手 | [cantor](./prompts/cantor.md) | 星図の術式、点光、暗い天球色のローブ |
| `orbital_clockwork` | 天球の機兵 | [clockwork](./prompts/clockwork.md) | 天球儀の環、真鍮・薄紫・天体の機構 |
| `void_knight` | 影喰いの騎士 | [knight](./prompts/knight.md) | 黒紫の装甲、光を呑む目線、亀裂の意匠 |
| `last_assassin` | 終幕の刺客 | [rogue](./prompts/rogue.md) | 鈍い紫紅、細い鋭刃、終盤らしい不穏さ |
| `ironwarden` | 鉄血の監督官 | [guardian](./prompts/guardian.md) | 兵舎の指揮官、鉄錆赤の軍装、連撃型の構え |
| `dirgekeeper` | 弔鐘の司祭 | [guardian](./prompts/guardian.md) | 葬儀・鐘・祭服の意匠、剣のシルエットは維持 |
| `timewarden` | 時の監視者 | [guardian](./prompts/guardian.md) | 時計針と時間の印、非対称な小装飾 |
| `forge_master` | 炉心の管理者 | [guardian](./prompts/guardian.md) | 炉心コア、鋳造の重い鎧、橙の内部光 |
| `frost_priest` | 氷冠の司祭 | [guardian](./prompts/guardian.md) | 氷冠、冷青と白金、宗教的な重装 |
| `star_warden` | 星界の監視者 | [guardian](./prompts/guardian.md) | 星の軌道や天球環、肩まわりの象徴的意匠 |
| `endking` | 終刻の王 | [guardian](./prompts/guardian.md) | 黒金紫の王冠、最終ボスにふさわしい大剣。第二楽章でも輪郭保持 |
| `golden_tone` | 黄金の音叉 | [wraith](./prompts/wraith.md) | 黄金の音叉や鐘の意匠、レア敵の光。霊体の形は共通 |
| `gem_slime` | 宝石スライム | [slime](./prompts/slime.md) | 大きく澄んだ宝石核、結晶ハイライト、ゲル輪郭維持 |

**重要**: これは現在のゲームデータに合わせた初期差分案。画像の採否は必ず人間が決める。ボス名が異なっても、ゲーム側のkindが同一なら元モーションの時刻・着弾点を崩さない。
