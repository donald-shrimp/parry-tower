'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const manifest=require('../scripts/game-assets.json');
const {validate,assetUrl,generate}=require('../scripts/build-game-entries.js');

test('checked-in entrypoints and diagnostics are already reproducible from the asset manifest',()=>{
 assert.deepEqual(generate({check:true}),[]);
 for(const page of manifest.pages){
  const html=fs.readFileSync(page,'utf8');
  const scripts=[...html.matchAll(/<script src="\.\/assets\/([^?"]+)\?/g)].map(match=>match[1]);
  assert.deepEqual(scripts,manifest.scripts.filter(entry=>!entry.pages||entry.pages.includes(page)).map(entry=>entry.file));
 }
});

test('asset manifest rejects dependency reversal, duplicate assets and a Dev module in production',()=>{
 const clone=()=>JSON.parse(JSON.stringify(manifest));
 let invalid=clone();
 const music=invalid.scripts.findIndex(entry=>entry.file==='music.js');
 invalid.scripts.unshift(invalid.scripts.splice(music,1)[0]);
 assert.throws(()=>validate(invalid));
 invalid=clone();invalid.scripts.push({...invalid.scripts[1]});
 assert.throws(()=>validate(invalid),/duplicate asset/);
 invalid=clone();delete invalid.scripts.find(entry=>entry.file==='dev-tools.js').pages;
 assert.throws(()=>validate(invalid),/shared asset after game|Dev script/);
});

test('cache revision changes with content but stays reproducible across Git line endings',()=>{
 const a=assetUrl('game.js',manifest.build,"const x=1;\n");
 assert.equal(a,assetUrl('game.js',manifest.build,"const x=1;\r\n"));
 assert.notEqual(a,assetUrl('game.js',manifest.build,"const x=2;\n"));
 assert.match(a,/\?v=v1\.0\.2&r=[a-f0-9]{12}$/);
});
