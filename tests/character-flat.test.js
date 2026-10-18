'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const flat=require('../assets/character-flat.js');
test('flat renderer is safe before image preload',()=>{
 assert.equal(flat.ready(),false);
 assert.equal(flat.drawHero({},{}),false);
 assert.equal(flat.status(),'idle');
});

test('flat hero SVG has seven independently selectable semantic groups',()=>{
 const data=fs.readFileSync('assets/character-art/svg/hero-flat.svg','utf8');
 assert.match(data,/<svg[^>]+viewBox="0 0 1024 1024"/);
 const ids=['cape','sword','body','right-arm','shield','left-arm','head'];
 for(const id of ids)assert.match(data,new RegExp('<g id="'+id+'">'));
 assert.equal((data.match(/<g id="/g)||[]).length,ids.length);
 assert.doesNotMatch(data,/<(?:script|foreignObject|image)\b/);
 assert.doesNotMatch(data,/<rect width="1024" height="1024" fill="#ffffff"/);
 assert.match(data,/<g id="shield">[\s\S]*?fill="#0b66f0"[\s\S]*?<\/g>/);
});

test('flat mode is opt-in and does not remove earlier renderers',()=>{
 const game=fs.readFileSync('assets/game.js','utf8');
 assert.match(game,/art=flat/);
 assert.match(game,/CHARACTER_FLAT_ENABLED&&CHARACTER_FLAT\?\.drawHero/);
 assert.match(game,/CHARACTER_SVG_ENABLED&&CHARACTER_SVG\?\.drawHero/);
 assert.match(game,/CHARACTER_ART_ENABLED&&CHARACTER_ART\?\.drawHero/);
 for(const path of ['index.html','dev.html']){
  const html=fs.readFileSync(path,'utf8');
  assert.ok(html.indexOf('assets/character-svg.js')<html.indexOf('assets/character-flat.js'));
  assert.ok(html.indexOf('assets/character-flat.js')<html.indexOf('assets/game.js'));
 }
});
