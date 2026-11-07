/* Generate static game entrypoints and diagnostics from the ordered asset manifest. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const normalize=text=>text.replace(/\r\n/g,'\n');
const forPage=(entries,page)=>entries.filter(entry=>!entry.pages||entry.pages.includes(page));

function validate(manifest){
 assert.match(manifest.build,/^v\d+\.\d+\.\d+$/,'invalid build');
 assert.deepEqual(manifest.pages,['index.html','dev.html'],'entrypoint scope changed');
 const entries=[...manifest.styles,...manifest.scripts],files=new Set(),modules=new Set(),globals=new Set();
 assert.ok(manifest.styles.every(entry=>entry.file.endsWith('.css'))&&manifest.scripts.every(entry=>entry.file.endsWith('.js')),'asset type mismatch');
 for(const entry of entries){
  assert.match(entry.file,/^[a-z][a-z0-9-]*\.(?:js|css)$/,'invalid asset path');
  assert.ok(!files.has(entry.file),'duplicate asset: '+entry.file);files.add(entry.file);
  if(entry.pages){
   assert.ok(entry.pages.length>0&&new Set(entry.pages).size===entry.pages.length,'invalid page scope');
   assert.ok(entry.pages.every(page=>manifest.pages.includes(page)),'unknown page');
  }
  if(entry.diagnose||entry.module)assert.ok(!entry.pages,'shared diagnostics cannot require a Dev-only asset');
  if(entry.module){
   assert.match(entry.module.name,/^[a-zA-Z][a-zA-Z0-9]*$/);
   assert.match(entry.module.global,/^Parry[A-Za-z0-9]+$/);
   assert.ok(!modules.has(entry.module.name)&&!globals.has(entry.module.global),'duplicate module');
   modules.add(entry.module.name);globals.add(entry.module.global);
  }
 }
 for(const page of manifest.pages){
  const scripts=forPage(manifest.scripts,page).map(entry=>entry.file),game=scripts.indexOf('game.js');
  assert.ok(game>=0&&scripts[0]==='diagnostics.js','missing game/early diagnostics');
  for(const entry of forPage(manifest.scripts,page)){
   for(const dependency of entry.after||[])assert.ok(scripts.indexOf(dependency)>=0&&scripts.indexOf(dependency)<scripts.indexOf(entry.file),
    page+': '+dependency+' must load before '+entry.file);
   if(!entry.pages&&entry.file!=='game.js')assert.ok(scripts.indexOf(entry.file)<game,'shared asset after game: '+entry.file);
  }
 }
 assert.ok(!forPage(manifest.scripts,'index.html').some(entry=>entry.file==='dev-tools.js'),'Dev script in production');
 assert.ok(forPage(manifest.scripts,'dev.html').some(entry=>entry.file==='dev-tools.js'),'missing Dev script');
}
function assetUrl(file,build,contents){
 // Git uses CRLF on Windows and LF in CI. Hash the same canonical text on both.
 const revision=crypto.createHash('sha256').update(normalize(contents)).digest('hex').slice(0,12);
 return './assets/'+file+'?v='+build+'&r='+revision;
}
function replaceRegion(text,start,end,content){
 const a=text.indexOf(start),b=text.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>=0&&text.indexOf(start,a+start.length)<0&&text.indexOf(end,b+end.length)<0,'missing/duplicate generated region: '+start);
 return text.slice(0,a+start.length)+'\n'+content+'\n'+text.slice(b);
}
function outputs(root=ROOT){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/game-assets.json'),'utf8'));
 validate(manifest);
 const read=file=>normalize(fs.readFileSync(path.join(root,file),'utf8')),result=new Map();
 const entries=[...manifest.styles,...manifest.scripts];
 const diagnosticContract=[
  " const BUILD='"+manifest.build+"';",
  ' const REQUIRED_ASSETS='+JSON.stringify(entries.filter(entry=>entry.diagnose).map(entry=>entry.file))+';',
  ' const MODULES='+JSON.stringify(Object.fromEntries(entries.filter(entry=>entry.module).map(entry=>[entry.module.name,entry.module.global])))+';'
 ].join('\n');
 const diagnostic=replaceRegion(read('assets/diagnostics.js'),' // BEGIN GENERATED ASSET CONTRACT',' // END GENERATED ASSET CONTRACT',diagnosticContract);
 result.set('assets/diagnostics.js',diagnostic);
 const contents=new Map(entries.map(entry=>[entry.file,entry.file==='diagnostics.js'?diagnostic:read('assets/'+entry.file)]));
 assert.ok(contents.get('game.js').includes("window.ParryDiagnostics?.registerGame('"+manifest.build+"',window.__parryV05)"),'game build marker must match manifest');
 for(const page of manifest.pages){
  let text=read(page);
  assert.ok(text.includes('<meta name="parry-build" content="'+manifest.build+'">'),'HTML build marker must match manifest');
  if(page==='index.html')assert.ok(!text.includes('dev.html')&&!text.includes('dev-tools'),'Dev navigation/script in production');
  else assert.ok(text.includes('data-parry-dev="true"'),'missing Dev isolation marker');
  for(const [kind,list]of [['STYLES',manifest.styles],['SCRIPTS',manifest.scripts]]){
   const tags=forPage(list,page).map(entry=>{
    const url=assetUrl(entry.file,manifest.build,contents.get(entry.file));
    return kind==='STYLES'?'<link rel="stylesheet" href="'+url+'">':'<script src="'+url+'" defer></script>';
   }).join('\n');
   text=replaceRegion(text,'<!-- BEGIN GENERATED GAME '+kind+' -->','<!-- END GENERATED GAME '+kind+' -->',tags);
  }
  const actualScripts=[...text.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1]);
  const expectedScripts=forPage(manifest.scripts,page).map(entry=>assetUrl(entry.file,manifest.build,contents.get(entry.file)));
  assert.deepEqual(actualScripts,expectedScripts,page+': unmanaged/duplicate script outside generated region');
  result.set(page,text);
 }
 return result;
}
function generate({root=ROOT,check=false}={}){
 const stale=[];
 for(const [file,content]of outputs(root)){
  if(normalize(fs.readFileSync(path.join(root,file),'utf8'))===content)continue;
  stale.push(file);
  if(!check)fs.writeFileSync(path.join(root,file),content);
 }
 if(check&&stale.length)throw Error('Generated assets are stale: '+stale.join(', ')+'. Run node scripts/build-game-entries.js');
 return stale;
}
if(require.main===module){
 try{
  const check=process.argv.includes('--check'),changed=generate({check});
  console.log(check?'Game entries and diagnostics match manifest/content hashes':changed.length?'Generated '+changed.join(', '):'Game entries already current');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={validate,assetUrl,outputs,generate};
