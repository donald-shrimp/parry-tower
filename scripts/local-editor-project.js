/* Shared localhost-only draft store for the copy and layout editors. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
function createEditorProjectHandler(root,{folder,header,normalize}){
 const directory=path.join(root,'.local-only',folder),target=path.join(directory,'project.json');
 let saving=false;
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'){
   try{
    let project=null;
    try{project=normalize(JSON.parse(await fs.promises.readFile(target,'utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}
    res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({writable:true,project}));
   }catch{res.writeHead(422).end('Saved editor project cannot be read');}return;
  }
  if(req.method!=='POST'){res.writeHead(405,{'Allow':'GET, POST'}).end();return;}
  const host=req.headers.host||'';
  if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||req.headers.origin!=='http://'+host||req.headers[header]!=='1'){
   res.writeHead(403).end('Same-origin editor request required');return;
  }
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){res.writeHead(415).end('JSON required');return;}
  if(saving){res.writeHead(409).end('A save is in progress');return;}
  saving=true;let temporary;
  try{
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>200000){res.writeHead(413).end('Project too large');return;}chunks.push(chunk);}
   const project=normalize(JSON.parse(Buffer.concat(chunks).toString('utf8')));
   await fs.promises.mkdir(directory,{recursive:true});
   try{await fs.promises.copyFile(target,path.join(directory,'project.backup.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
   temporary=path.join(directory,'project-'+process.pid+'.tmp');
   await fs.promises.writeFile(temporary,JSON.stringify(project,null,2)+'\n','utf8');
   await fs.promises.rename(temporary,target);temporary=null;
   res.writeHead(200,{'Content-Type':'application/json'}).end('{"saved":true}');
  }catch(error){res.writeHead(error instanceof SyntaxError?400:422).end(error.message);}
  finally{saving=false;if(temporary)await fs.promises.unlink(temporary).catch(()=>{});}
 };
}
module.exports={createEditorProjectHandler};
