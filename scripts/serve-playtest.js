/* Read-only, allowlisted game preview for an optional external tunnel. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const PAGES=new Set(['dev.html','credits.html','art-preview.html']);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
 '.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
function createPlaytestServer(root=path.resolve(__dirname,'..'),tracked){
 root=fs.realpathSync(root);
 const files=tracked||execFileSync('git',['ls-files','-z','--','assets',...PAGES],{cwd:root,encoding:'utf8'}).split('\0');
 const allowed=new Set(files.filter(file=>PAGES.has(file)||(file.startsWith('assets/')&&TYPES[path.extname(file)])));
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
  let name;
  try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);}
  catch{res.writeHead(400).end('Bad path');return;}
  if(name===''||name==='index.html'){
   res.writeHead(302,{'Location':'/dev.html?floor=5&enemy=guardian&practice=1'}).end();return;
  }
  if(name.split(/[\\/]/).some(part=>part.startsWith('.'))){res.writeHead(403).end();return;}
  if(!allowed.has(name)){res.writeHead(404).end('Not found');return;}
  try{
   const target=await fs.promises.realpath(path.join(root,name));
   if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   const body=await fs.promises.readFile(target);
   res.writeHead(200,{'Content-Type':TYPES[path.extname(name)],'Content-Length':body.length});
   res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404).end('Not found');}
 });
}
if(require.main===module){
 const port=Number(process.argv[2]||8003);
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
 createPlaytestServer().listen(port,'127.0.0.1',()=>console.log('Read-only playtest: http://127.0.0.1:'+port+'/'))
  .on('error',error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={createPlaytestServer};
