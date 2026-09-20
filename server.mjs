import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PILOT_SCHEMA_VERSION,sanitizePilotBatch} from './src/pilot-telemetry.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3000);
const version='3.0.0';
const pilotIngestUrl=String(process.env.PILOT_INGEST_URL||'').trim();
const pilotIngestToken=String(process.env.PILOT_INGEST_TOKEN||'').trim();
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

function json(res,status,body){
  res.writeHead(status,commonHeaders({
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store'
  }));
  res.end(JSON.stringify(body));
}

function readJson(req,limit=65536){
  return new Promise((resolve,reject)=>{
    let size=0,raw='';
    req.setEncoding('utf8');
    req.on('data',chunk=>{
      size+=Buffer.byteLength(chunk);
      if(size>limit){
        const err=new Error('payload_too_large');
        err.code='PAYLOAD_TOO_LARGE';
        reject(err);
        req.destroy();
        return;
      }
      raw+=chunk;
    });
    req.on('end',()=>{
      if(!raw)return resolve({});
      try{resolve(JSON.parse(raw));}
      catch{const err=new Error('invalid_json');err.code='INVALID_JSON';reject(err);}
    });
    req.on('error',reject);
  });
}

async function handlePilotEvents(req,res){
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')){
    return json(res,415,{ok:false,error:'application_json_required'});
  }
  let body;
  try{body=await readJson(req);}
  catch(err){
    if(err?.code==='PAYLOAD_TOO_LARGE')return json(res,413,{ok:false,error:'payload_too_large'});
    return json(res,400,{ok:false,error:'invalid_json'});
  }
  const events=sanitizePilotBatch(body);
  if(!events.length)return json(res,400,{ok:false,error:'no_valid_events'});
  if(!pilotIngestUrl){
    return json(res,202,{ok:true,accepted:0,collectorConfigured:false,schemaVersion:PILOT_SCHEMA_VERSION});
  }
  try{
    const headers={'content-type':'application/json'};
    if(pilotIngestToken)headers.authorization=`Bearer ${pilotIngestToken}`;
    const upstream=await fetch(pilotIngestUrl,{
      method:'POST',
      headers,
      body:JSON.stringify({source:'manevi-rota',schemaVersion:PILOT_SCHEMA_VERSION,events}),
      signal:AbortSignal.timeout(8000)
    });
    if(!upstream.ok)return json(res,502,{ok:false,error:'collector_rejected',collectorConfigured:true});
    return json(res,200,{ok:true,accepted:events.length,collectorConfigured:true,schemaVersion:PILOT_SCHEMA_VERSION});
  }catch{
    return json(res,503,{ok:false,error:'collector_unavailable',collectorConfigured:true});
  }
}

http.createServer(async(req,res)=>{
  const pathname=(req.url||'/').split('?')[0];
  if(pathname==='/healthz'){
    return json(res,200,{ok:true,service:'manevi-rota',version,pilotCollectorConfigured:Boolean(pilotIngestUrl)});
  }
  if(pathname==='/api/pilot/status'&&req.method==='GET'){
    return json(res,200,{ok:true,schemaVersion:PILOT_SCHEMA_VERSION,collectorConfigured:Boolean(pilotIngestUrl)});
  }
  if(pathname==='/api/pilot/events'&&req.method==='POST'){
    return handlePilotEvents(req,res);
  }
  if(pathname.startsWith('/api/')){
    return json(res,404,{ok:false,error:'not_found'});
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
