/* Dependency-free local preview. node scripts/serve-local.js [port] */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {normalize}=require('../assets/character-edit');
const {render}=require('./build-art-defaults');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png',
 '.json':'application/json; charset=utf-8','.woff2':'font/woff2'};
function createPreviewServer(root=path.resolve(__dirname,'..')){
 let saving=false;
 return http.createServer(async(req,res)=>{
 if(req.url==='/__art-studio/project'){
  if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end('{"writable":true}');return;}
  if(req.method!=='POST'){res.writeHead(405,{'Allow':'GET, POST'}).end();return;}
  const host=req.headers.host||'',origin=req.headers.origin;
  if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||origin!=='http://'+host||req.headers['x-parry-art-studio']!=='1'){
   res.writeHead(403).end('Same-origin editor request required');return;
  }
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){res.writeHead(415).end('JSON required');return;}
  if(saving){res.writeHead(409).end('A save is in progress');return;}
  saving=true;let temporary;
  try{
   let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024){res.writeHead(413).end('Project too large');return;}body+=chunk.toString('utf8');}
   const project=normalize(JSON.parse(body));
   const folder=path.join(root,'assets','character-art'),target=path.join(folder,'studio-project.json');
   await fs.promises.mkdir(folder,{recursive:true});
   try{const old=await fs.promises.readFile(target);await fs.promises.writeFile(path.join(folder,'studio-project.backup.json'),old);}catch(error){if(error.code!=='ENOENT')throw error;}
   temporary=path.join(folder,'.studio-project-'+process.pid+'-'+Date.now()+'.tmp');
   await fs.promises.writeFile(temporary,JSON.stringify(project,null,2)+'\n','utf8');await fs.promises.rename(temporary,target);temporary=null;
   await fs.promises.writeFile(path.join(root,'assets','character-art-defaults.js'),render(project),'utf8');
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({saved:true,updatedAt:project.updatedAt}));
  }catch(error){res.writeHead(error instanceof SyntaxError?400:422,{'Content-Type':'text/plain; charset=utf-8'}).end(error.message);}
  finally{saving=false;if(temporary)await fs.promises.unlink(temporary).catch(()=>{});}
  return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
 let filename;
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname.split(/[\\/]/).some(part=>part.startsWith('.'))){res.writeHead(403).end();return;}
  filename=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 }catch{res.writeHead(400).end();return;}
 if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(filename,(err,data)=>{
  if(err){res.writeHead(404).end('Not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:data);
 });
 });
}
if(require.main===module){
 const port=Number(process.argv[2]||8000);
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Port must be an integer from 1024 to 65535');
 createPreviewServer().listen(port,'127.0.0.1',()=>console.log('Parry Tower studio: http://127.0.0.1:'+port+'/art-studio.html'))
  .on('error',err=>{console.error(err.message);process.exitCode=1;});
}
module.exports={createPreviewServer};
