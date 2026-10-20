const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const build = 'v0.9.3-9';

test('self-hosted subset is a valid-size WOFF2 and retains the license notice', () => {
 const font = fs.readFileSync(path.join(root, 'assets/fonts/cp-period-display.woff2'));
 assert.equal(font.subarray(0, 4).toString('ascii'), 'wOF2');
 assert.ok(font.length > 8000 && font.length < 30000, 'subset should include scene names and Latin effects');
 assert.match(read('assets/fonts/NOTICE.txt'), /よく飛ばない鳥/);
});

test('credits are reachable from both entrypoints', () => {
 for (const file of ['index.html', 'dev.html']) {
  const html = read(file);
  assert.match(html, /<footer class="site-footer">/);
  assert.match(html, /href="\.\/credits\.html"/);
  assert.ok(html.includes('./assets/style.css?v='+build+'&font=4'));
  assert.doesNotMatch(html, /class="brandmark"/);
  assert.match(html, /class="title-logo">パリィ<span class="title-no">の<\/span>塔<\/h2>/);
  assert.doesNotMatch(html, /id="titleCover"[^]*?<div class="modal"><div class="modal-symbol">⚔️/);
  assert.match(html, /class="combo-heading">COMBO/);
 }
 const credits = read('credits.html');
 assert.match(credits, /チェックポイント．（ピリオド）/);
 assert.match(credits, /マルセ/);
 assert.match(credits, /https:\/\/yokutobanaitori\.web\.fc2\.com\//);
 assert.match(credits, /WOFF2/);
});

test('visual headlines and all RUN STATUS counters use pixel face, explanatory copy does not', () => {
 const css = read('assets/style.css');
 const selectors = [
  '.brand h1','.modal h2','.floorlabel','.panel-title',
  '.modal-kicker','.stat .num','.stat .label',
  '.righthead .combo-heading','#trackLabel',
 ];
 const opening = css.slice(css.lastIndexOf('.brand h1,.modal h2'));
 const rule = opening.split('}')[0];
 for(const selector of selectors)assert.ok(rule.includes(selector),selector);
 for(const selector of ['.help','.rdesc','.smallnote','.reward-card','.primary','.secondary']){
  assert.ok(!rule.includes(selector),selector+' should retain readable font');
 }
 assert.match(css, /\.stat #chargeStat/);
 assert.match(css, /#titleCover h2\.title-logo[^{]*\{[^}]*font-size:clamp\(46px,14vw,82px\)/);
 assert.match(css, /#titleCover h2 \.title-no[^{]*\{[^}]*font-size:\.7em;[^}]*vertical-align:baseline/);
 assert.match(css, /\.brand h1 \.title-no[^{]*\{[^}]*font-size:\.7em;[^}]*vertical-align:baseline/);
 assert.match(css, /url\("\.\/fonts\/cp-period-display\.woff2"\)/);
});

test('canvas battle text uses display font without changing combat effects', () => {
 const game = read('assets/game.js');
 assert.match(game, /function textDraw\([^]*?ctx\.font=`\$\{weight\} \$\{size\}px "Checkpoint Period Display"/);
 assert.match(game, /document\.fonts\?\.load/);
 assert.match(game, /feedback\(perfect\?'JUST PARRY!':'PARRY!'/);
});
