import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3000);
const version='3.0.0';
const types={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp'
};

function safe(url){
  const pathname=decodeURIComponent((url||'/').split('?')[0]);
  const rel=pathname==='/'?'public/index.html':pathname.replace(/^\//,'');
  const full=path.resolve(root,rel);
  return full.startsWith(root)?full:null;
}

function commonHeaders(extra={}){
  return {
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'X-Frame-Options':'SAMEORIGIN',
    ...extra
  };
}

http.createServer((req,res)=>{
  if(req.url?.split('?')[0]==='/healthz'){
    res.writeHead(200,commonHeaders({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}));
    return res.end(JSON.stringify({ok:true,service:'manevi-rota',version}));
  }

  let full=safe(req.url);
  if(!full){res.writeHead(403,commonHeaders());return res.end('Forbidden');}
  if(!fs.existsSync(full)||fs.statSync(full).isDirectory()){
    if(!path.extname(full)) full=path.join(root,'public/index.html');
  }
  if(!fs.existsSync(full)){res.writeHead(404,commonHeaders());return res.end('Not found');}

  const ext=path.extname(full);
  const isHtml=ext==='.html';
  const cache=isHtml?'no-cache':'public, max-age=300';
  res.writeHead(200,commonHeaders({'Content-Type':types[ext]||'application/octet-stream','Cache-Control':cache}));
  if(req.method==='HEAD') return res.end();
  fs.createReadStream(full).pipe(res);
}).listen(port,'0.0.0.0',()=>console.log(`Manevî Rota v${version} running on http://0.0.0.0:${port}`));
