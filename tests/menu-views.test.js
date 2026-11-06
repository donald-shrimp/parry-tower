'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const shop=require('../assets/shop-view.js');
const codex=require('../assets/codex-view.js');
const progression=require('../assets/progression.js');
const encounters=require('../assets/encounters.js');

function freeze(value){
 for(const child of Object.values(value))if(child&&typeof child==='object')freeze(child);
 return Object.freeze(value);
}
const skillContext=Object.freeze({baseAtk:25,bladeLevel:0,baseHp:65});

test('shop presentation accepts frozen inputs and returns independent display values for every section',()=>{
 const input=freeze({meta:{coins:500,life:0,attack:0,ward:0},permanent:progression.defaults(),skillContext});
 const sections=[['loadout','items'],['base','items'],['seal','items'],['bonus','items'],['bonus','skins']];
 for(const [tab,bonusView] of sections){
  const first=shop.render({...input,tab,bonusView});
  assert.ok(first.listHtml.length>0);
  assert.equal(first.coinsLabel,'500 ✧');
  first.preloadSkins.push('not-a-skin');
  const second=shop.render({...input,tab,bonusView});
  assert.ok(!second.preloadSkins.includes('not-a-skin'));
  assert.equal(second.listHtml,first.listHtml);
 }
 assert.equal(shop.render({...input,tab:'skills',bonusView:'items'}).tab,'loadout');
 assert.equal(shop.render({...input,tab:'special',bonusView:'items'}).tab,'base');
});

test('codex presentation reads immutable discovery data without granting practice or leaking prior output',()=>{
 const book=encounters.emptyBook();
 book.seen['slime:normal']={encounters:1,firstFloor:1};
 const input=freeze({book,unlockedSkills:['heal'],skillContext});
 for(const filter of ['all','discovered','normal','elite','rare']){
  const view=codex.render({...input,tab:'monsters',filter});
  assert.ok(view.listHtml.length>0);
  assert.doesNotMatch(view.listHtml,/data-practice="slime:elite"/);
 }
 const first=codex.render({...input,tab:'skills'});
 assert.match(first.listHtml,/最大HP \+15/);
 first.listHtml='changed';
 const second=codex.render({...input,tab:'skills'});
 assert.match(second.listHtml,/最大HP \+15/);
 assert.equal(Object.keys(book.seen).length,1);
});
