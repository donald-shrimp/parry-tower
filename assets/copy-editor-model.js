/* B-table copy drafts only; does not read or modify game saves. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ParryCopyEditor=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const row=(id,name,upper,lower,sample={value:24},kind='choice',body=null)=>({id,name,kind,sample,
  fields:[{id:'upper',label:'上段',text:upper},...(body===null?[]:[{id:'body',label:'効果',text:body}]),{id:'lower',label:'下段',text:lower}]});
 const entries=[
  row('B01','聖堂・共鳴','所持スキルの共鳴相方を引き当てる','共鳴相方のスキルを引き当てて1つ習得。'),
  row('B02','聖堂・強化','所持スキル1つを強化（+1Lv）','習得済みスキル1つをLv.+1。'),
  row('B03','聖堂・祈り','静かに祈り、HP25%回復','最大HPの25%を回復。'),
  row('B04','金床・研磨','未研磨の所持遺物1つを無料で研磨','未研磨の所持遺物1つを研磨（✦）。'),
  row('B05','金床・武具強化','塔貨15枚で基礎攻撃力+3・障壁+15','塔貨15枚を消費し、この挑戦の基礎攻撃力+3・障壁+15。'),
  row('B06','金床・鉄屑','鉄屑を拾い、塔貨+{value}','塔貨+{value}。',{value:14}),
  row('B07','祭器・魂へ交換','塔貨16枚を捧げ、魂の欠片+20 ✧','塔貨16枚を消費し、魂の欠片+{value} ✧を得る。',{value:20}),
  row('B08','祭器・HPを支払う','現在HP20%を捧げ、塔貨+{value}・引き直し+1','現在HPの20%（死亡しない）を払い、塔貨+{value}・引き直し+1。'),
  row('B09','祭器・立ち去る','祭器に触れず先へ進む（障壁+10）','障壁+10を得て先へ進む。'),
  row('B10','スキル報酬カード','魔法障壁 Lv.{nextLevel}','Lv.{level} → Lv.{nextLevel}（現在：ジャストで障壁を {currentValue} 獲得）',
   {level:3,nextLevel:4,currentValue:12,nextValue:15},'skill','ジャストで障壁を {nextValue} 獲得'),
  row('B11','スキンの見出し','主人公スキン','主人公スキン',{},'heading'),
  row('B12-relic','商人・遺物取得後','行商人の隠れ処','遺物箱から遺物を手に入れた！',{},'result'),
  row('B12-skill','商人・巻物取得後','行商人の隠れ処','{skill}がLv.{level}になった！',{skill:'不屈',level:2},'result')
 ];
 function defaults(){
  return {schema:'parry-copy-b',version:1,updatedAt:0,entries:Object.fromEntries(entries.map(entry=>[entry.id,
   Object.fromEntries(entry.fields.map(field=>[field.id,{text:field.text,visible:true}]))]))};
 }
 function normalize(raw){
  if(!raw||raw.schema!=='parry-copy-b'||raw.version!==1||!raw.entries||Array.isArray(raw.entries))throw Error('B表の編集ファイルではありません。');
  const result=defaults();
  for(const [id,fields]of Object.entries(raw.entries)){
   const entry=entries.find(entry=>entry.id===id);
   if(!entry||!fields||typeof fields!=='object'||Array.isArray(fields))throw Error('不明な編集項目です。');
   for(const [key,value]of Object.entries(fields)){
    if(!entry.fields.some(field=>field.id===key)||!value||typeof value.text!=='string'||value.text.length>1000||typeof value.visible!=='boolean')throw Error('文言か表示設定が不正です。');
    result.entries[id][key]={text:value.text,visible:value.visible};
   }
  }
  result.updatedAt=Number.isSafeInteger(raw.updatedAt)&&raw.updatedAt>=0?raw.updatedAt:0;
  return result;
 }
 function format(text,sample){return text.replace(/\{([A-Za-z]+)\}/g,(all,key)=>Object.hasOwn(sample,key)?String(sample[key]):all);}
 return {entries,defaults,normalize,format};
});
