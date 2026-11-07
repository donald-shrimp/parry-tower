'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const shop=require('../assets/shop-view.js');
const codex=require('../assets/codex-view.js');
const progression=require('../assets/progression.js');
const encounters=require('../assets/encounters.js');
const rewards=require('../assets/rewards-view.js');
const rooms=require('../assets/room-view.js');

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
 for(const filter of ['all','discovered','nonboss','boss']){
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

test('codex separates boss species from all other species including rares and elite-only discoveries',()=>{
 const book=encounters.emptyBook();
 for(const e of encounters.codexEntries())book.seen[e.bookKey]={encounters:1,firstFloor:1};
 const names=filter=>[...codex.render({tab:'monsters',filter,book}).listHtml.matchAll(/<strong>([^<]+)<\/strong>/g)].map(match=>match[1]);
 assert.deepEqual(names('all'),encounters.all.map(m=>m.name));
 assert.deepEqual(names('nonboss'),[...encounters.monsters,...encounters.rares].map(m=>m.name));
 assert.deepEqual(names('boss'),encounters.bosses.map(m=>m.name));
 assert.deepEqual(names('discovered'),names('all'));
 const selected=[encounters.monsters[0],encounters.bosses[0],...encounters.rares];
 book.seen=Object.fromEntries(selected.map(m=>[m.id+':'+(m.rare?'rare':'elite'),{encounters:1,firstFloor:1}]));
 const known=filter=>names(filter).filter(name=>name!=='未遭遇');
 assert.deepEqual(known('discovered'),selected.map(m=>m.name));
 assert.deepEqual(known('nonboss'),[encounters.monsters[0],...encounters.rares].map(m=>m.name));
 assert.deepEqual(known('boss'),[encounters.bosses[0].name]);
});

test('reward presentation uses frozen choices and current skill values without consuming the offer',()=>{
 const heal=require('../assets/skills.js').SKILLS.find(skill=>skill.id==='heal');
 const input=freeze({choices:[{...heal}],levels:{heal:1},skillContext:{baseAtk:46,bladeLevel:0,baseHp:235},
  floor:80,finalClear:true,rerolls:1,maxHp:254,lastDiscovered:true,rare:false});
 const view=rewards.skills(input);
 assert.match(view.cardsHtml,/現在：最大HP \+19/);
 assert.match(view.cardsHtml,/最大HP \+38/);
 assert.match(view.title,/80F制覇/);
 assert.equal(view.rerollDisabled,false);
 assert.deepEqual(rewards.skills(input),view);
 assert.match(rewards.eventSkills({...input,title:'選択中'}).cardsHtml,/data-route-skill="heal"/);
 assert.equal(input.choices.length,1);
});

test('room presentation consumes frozen eligibility and preserves target data across repeat renders',()=>{
 const EV=require('../assets/events.js'),RT=require('../assets/routes.js');
 const input=freeze({room:RT.ROOMS.merchant,status:{coins:80,hp:50.5,maxHp:65,shield:2.5},
  items:[{item:EV.ITEMS_BY_ID.training,already:false,available:false,affordable:true}]});
 const before=rooms.render(input);
 assert.match(before.actionsHtml,/対象なし/);
 assert.match(before.actionsHtml,/disabled/);
 assert.equal(before.note,'🪙 塔貨 80　♡ 51 / 65　🛡 3');
 before.actionsHtml='changed';
 assert.doesNotMatch(rooms.render(input).actionsHtml,/changed/);
 assert.equal(input.items[0].already,false);
});
