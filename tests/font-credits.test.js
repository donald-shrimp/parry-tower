const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(base, name), 'utf8');

test('display font asset is a self-hosted WOFF2 file', () => {
 const bytes = fs.readFileSync(path.join(base, 'assets/fonts/cp-period-display.woff2'));
 assert.equal(bytes.subarray(0, 4).toString('ascii'), 'wOF2');
 assert.ok(bytes.length > 1000 && bytes.length < 30000);
});

test('credits is linked on main and dev pages and cites the author', () => {
 for (const page of ['index.html', 'dev.html']) {
  const html = read(page);
  assert.match(html, /<footer class="site-footer">/);
  assert.match(html, /href="\.\/credits\.html"/);
  assert.match(html, /style\.css\?v=v0\.9\.1-1&font=1/);
 }
 const credits = read('credits.html');
 assert.match(credits, /チェックポイント．（ピリオド）/);
 assert.match(credits, /マルセ/);
 assert.match(credits, /https:\/\/yokutobanaitori\.web\.fc2\.com\//);
 assert.match(credits, /WOFF2/);
});

test('large fixed display copy is opted in, reading copy is not', () => {
 const css = read('assets/style.css');
 assert.match(css, /font-family:"Checkpoint Period Display"/);
 assert.match(css, /#titleCover h2,#routeCover h2,#deathCover h2/);
 assert.match(css, /\.floorlabel strong,\.stat \.num:not\(#chargeStat\)/);
 const rule = css.slice(css.lastIndexOf('.brand h1,#titleCover h2'), css.lastIndexOf('.brand h1 span'));
 assert.doesNotMatch(rule, /\.help|\.rdesc|\.smallnote|\.routeSkill|\.roomCover/);
 assert.match(css, /url\("\.\/fonts\/cp-period-display\.woff2"\)/);
});
