'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createPlaytestServer}=require('../scripts/serve-playtest');
test('external playtest serves tracked runtime assets and directs visitors to isolated practice',async()=>{
 const server=createPlaytestServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const root=await fetch(base,{redirect:'manual'});assert.equal(root.status,302);
  assert.equal(root.headers.get('location'),'/dev.html?floor=5&enemy=guardian&practice=1');
  const page=await fetch(base+'/dev.html');assert.equal(page.status,200);
  assert.match(await page.text(),/data-parry-dev="true"/);assert.equal(page.headers.get('cache-control'),'no-store');
  const sound=await fetch(base+'/assets/combat-sfx.js?v=playtest',{method:'HEAD'});
  assert.equal(sound.status,200);assert.match(sound.headers.get('content-type'),/javascript/);
  assert.ok(Number(sound.headers.get('content-length'))>0);assert.equal(await sound.text(),'');
  assert.equal((await fetch(base+'/assets/character-art/studio-project.json')).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('external playtest rejects writes, editor endpoints, repository data and untracked paths',async()=>{
 const server=createPlaytestServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const name of ['/__art-studio/project','/docs/HANDOFF.md','/output/review.pptx','/scripts/serve-local.js','/test-results/shield-feedback/playable.png'])
   assert.equal((await fetch(base+name)).status,404,name);
  for(const name of ['/dev.html','/assets/game.js','/__art-studio/project'])
   assert.equal((await fetch(base+name,{method:'POST',body:'{}'})).status,405,name);
  assert.equal((await fetch(base+'/.git/config')).status,403);
  assert.equal((await fetch(base+'/assets/%2eprivate.json')).status,403);
  assert.equal((await fetch(base+'/%zz')).status,400);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
