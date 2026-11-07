/* Storage access only. Normalization, checkpoint capture and UI stay with callers. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.ParrySaveStore=factory();
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';

 function create({storage,writable=true}){
  const success=value=>({ok:true,value,skipped:false,error:null});
  const failure=(error,value=null)=>({ok:false,value,skipped:false,error});

  function readText(key){
   try{return success(storage().getItem(key));}
   catch(error){return failure(error);}
  }

  function readJson(key,fallback=null){
   const result=readText(key);
   if(!result.ok)return failure(result.error,fallback);
   try{return success(result.value?JSON.parse(result.value):fallback);}
   catch(error){return failure(error,fallback);}
  }

  function mutate(operation){
   // Dev may read existing progress, but must not touch persistent data.
   if(!writable)return {ok:true,value:null,skipped:true,error:null};
   try{operation(storage());return success(null);}
   catch(error){return failure(error);}
  }

  const writeText=(key,value)=>mutate(target=>target.setItem(key,String(value)));
  const writeJson=(key,value)=>mutate(target=>target.setItem(key,JSON.stringify(value)));
  const remove=key=>mutate(target=>target.removeItem(key));

  function writeCheckpoint(key,value,{discardOnFailure=false}={}){
   const result=writeJson(key,value);
   // Auto-save discards stale progress. Manual suspension keeps it and stays paused.
   if(!result.ok&&discardOnFailure)return {...result,cleanup:remove(key)};
   return result;
  }

  return {readText,readJson,writeText,writeJson,remove,writeCheckpoint};
 }

 return {create};
});
