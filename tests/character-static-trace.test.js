'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('static hero trace exists, is real vector art, and is not used by the game yet',()=>{
 const p='assets/character-art/tracing/hero/hero-static.svg';
 const svg=fs.readFileSync(p,'utf8');
 assert.match(svg,/<svg[^>]+viewBox="0 0 628 628"/);
 assert.equal((svg.match(/<path /g)||[]).length,8);
 for(const col of ['#02123a','#0061e4','#fac448'])assert.ok(svg.includes(col),col);
 assert.doesNotMatch(svg,/<(?:image|script|foreignObject)\\b/i);
 const game=fs.readFileSync('assets/game.js','utf8');
 assert.ok(!game.includes('tracing/hero/hero-static.svg'));
});
