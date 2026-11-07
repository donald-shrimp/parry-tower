/* Draw dispatch only. The caller owns pose clocks, gameplay and loading cancellation. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.ParryCharacterRenderer=factory();
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function modes(search=''){
  const selected=name=>new RegExp('(?:^|[?&])art='+name+'(?:&|$)').test(search);
  return Object.freeze({
   illustrated:!/(?:^|[?&])art=/.test(search)||selected('illustrated'),
   rework:selected('rework'),impact:selected('impact'),knightTrace:selected('knight-trace'),
   ready:selected('ready'),trace:selected('trace'),flat:selected('flat'),svg:selected('svg'),prototype:selected('prototype')
  });
 }
 function create({modes:enabled,illustrated,rig,impact,ready,trace,flat,svg,prototype,knightTrace,enemyPuppet}){
  function heroWorld(ctx,{illustrated:useIllustrated,legacy},frame){
   if(useIllustrated&&illustrated?.drawHero(ctx,frame))return true;
   const {width,height,e,m,now,pose}=frame;
   if(!legacy&&enabled.rework&&rig?.drawHero(ctx,{width,height,e,m:e?m:{reach:110},now,pose}))return true;
   if(!legacy&&enabled.impact&&impact?.drawHero(ctx,{width,height,e,now,pose}))return true;
   return false;
  }
  function heroLocal(ctx,{legacy},frame){
   if(legacy)return false;
   if(enabled.ready&&ready?.drawHero(ctx,frame))return true;
   if(enabled.trace&&trace?.drawHero(ctx,frame))return true;
   if(enabled.flat&&flat?.drawHero(ctx,frame))return true;
   if(enabled.svg&&svg?.drawHero(ctx,frame))return true;
   if(enabled.prototype&&prototype?.drawHero(ctx,frame))return true;
   return false;
  }
  function enemyWorld(ctx,{illustrated:useIllustrated,legacy,heavy},frame,drawAura){
   if(useIllustrated&&illustrated?.readyFor(frame.e)){
    const sampleFn=enemyPuppet?.supports?.(frame.e)?enemyPuppet.sample:illustrated.sample;
    const sampled=heavy&&sampleFn?sampleFn(frame):null;
    if(sampled)drawAura(sampled,frame.e,frame.now,false);
    if(illustrated.drawEnemy(ctx,frame)){
     if(sampled)drawAura(sampled,frame.e,frame.now,true);
     return true;
    }
   }
   if(!legacy&&enabled.rework&&rig?.drawEnemy(ctx,frame))return true;
   if(!legacy&&enabled.impact&&impact?.drawEnemy(ctx,frame))return true;
   return false;
  }
  function enemyLocal(ctx,{legacy},frame){
   if(legacy)return false;
   if(enabled.knightTrace&&knightTrace?.drawEnemy(ctx,frame))return true;
   if(enabled.prototype&&prototype?.drawEnemy(ctx,frame))return true;
   return false;
  }
  return Object.freeze({heroWorld,heroLocal,enemyWorld,enemyLocal});
 }
 return Object.freeze({modes,create});
});
