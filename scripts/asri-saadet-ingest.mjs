import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const MANIFEST_PATH=path.join(ROOT,'sources','asri-saadet-1928','manifest.json');
const args=new Set(process.argv.slice(2));
const buildRequested=args.has('--build');
const requireReady=args.has('--require-ready');

const normalizeLiteralText=text=>String(text||'')
  .replace(/\r/g,'')
  .replace(/\u0000/g,'')
  .replace(/\u00ad/g,'')
  .split('\n')
  .map(line=>line.replace(/[ \t]+$/g,''))
  .join('\n')
  .replace(/\n{4,}/g,'\n\n\n')
  .trim();

const chunkLiteralText=(text,target=2400)=>{
  const src=normalizeLiteralText(text);
  if(!src)return [];
  const formPages=src.split('\f').map(x=>x.trim()).filter(Boolean);
  if(formPages.length>=10)return formPages;
  const paras=src.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
  const out=[]; let buf='';
  for(const para of paras){
    if(buf && (buf.length+para.length+2)>target){out.push(buf.trim());buf='';}
    buf+= (buf?'\n\n':'')+para;
  }
  if(buf.trim())out.push(buf.trim());
  return out;
};

const exists=async p=>{try{await fs.access(p);return true}catch{return false}};
const sha256=async p=>crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex');

const manifestRaw=await fs.readFile(MANIFEST_PATH,'utf8');
const manifest=JSON.parse(manifestRaw);
if(manifest.id!=='asri-saadet-siyret-1928')throw new Error('Unexpected Asr-i Saadet manifest id');
if(!Array.isArray(manifest.volumes)||manifest.volumes.length!==4)throw new Error('Exactly four siyer volumes are required');
if(JSON.stringify(manifest.volumes.map(x=>x.volume))!==JSON.stringify([1,2,3,4]))throw new Error('Volumes must be ordered I–IV');

const report={
  id:manifest.id,
  manifestSha256:crypto.createHash('sha256').update(manifestRaw).digest('hex'),
  releaseApproval:manifest.releaseApproval?.status||'missing',
  volumes:[],
  allInputsPresent:true,
  allInputsPlausible:true,
  buildAllowed:false
};

for(const volume of manifest.volumes){
  const scanPath=path.join(ROOT,volume.scan);
  const transcriptionPath=path.join(ROOT,volume.transcription);
  const scanPresent=await exists(scanPath);
  const transcriptionPresent=await exists(transcriptionPath);
  const row={
    volume:volume.volume,
    title:volume.title,
    scanPresent,
    transcriptionPresent,
    scanPath:volume.scan,
    transcriptionPath:volume.transcription
  };
  if(scanPresent){
    const stat=await fs.stat(scanPath);
    row.scanBytes=stat.size;
    row.scanSha256=await sha256(scanPath);
    if(stat.size<100000)row.scanWarning='scan-too-small';
  }
  if(transcriptionPresent){
    const text=normalizeLiteralText(await fs.readFile(transcriptionPath,'utf8'));
    row.transcriptionChars=text.length;
    row.transcriptionSha256=await sha256(transcriptionPath);
    if(text.length<10000)row.transcriptionWarning='transcription-too-small';
  }
  if(!scanPresent||!transcriptionPresent)report.allInputsPresent=false;
  if(row.scanWarning||row.transcriptionWarning)report.allInputsPlausible=false;
  report.volumes.push(row);
}

report.buildAllowed=
  report.allInputsPresent &&
  report.allInputsPlausible &&
  manifest.releaseApproval?.status==='approved';

console.log(JSON.stringify(report,null,2));

if(requireReady && !report.buildAllowed)process.exit(2);
if(!buildRequested)process.exit(0);
if(!report.allInputsPresent)throw new Error('Build blocked: all four scans and all four literal Latin transcriptions are required');
if(!report.allInputsPlausible)throw new Error('Build blocked: one or more source files fail minimum plausibility checks');
if(manifest.releaseApproval?.status!=='approved')throw new Error('Build blocked: human page-by-page review approval is still pending');

const pages=[];
const sections=[];
let readerPage=1;
for(const volume of manifest.volumes){
  const text=await fs.readFile(path.join(ROOT,volume.transcription),'utf8');
  const chunks=chunkLiteralText(text);
  if(chunks.length<10)throw new Error(`Volume ${volume.volume}: too few reader chunks (${chunks.length})`);
  sections.push({title:`Cilt ${volume.volume} — ${volume.title}`,page:readerPage,volume:volume.volume});
  for(let i=0;i<chunks.length;i++){
    pages.push({
      page:readerPage++,
      volume:volume.volume,
      sourceSequence:i+1,
      text:chunks[i]
    });
  }
}

const asset={
  id:'asri-saadet-siyret',
  title:manifest.title,
  subtitle:'1928 Osmanlıca baskının kontrol edilmiş literal Latin aktarımı',
  author:'Şiblî Nu‘mânî · Süleyman Nedvî',
  translator:'Ömer Rıza Doğrul',
  pages,
  sections,
  source:{
    kind:'self-digitized-public-domain-historical-edition',
    edition:manifest.edition,
    manifestSha256:report.manifestSha256,
    volumes:report.volumes.map(v=>({
      volume:v.volume,
      scanSha256:v.scanSha256,
      transcriptionSha256:v.transcriptionSha256
    })),
    textPolicy:'Only technical whitespace/control-character cleanup is applied. No modernization, simplification, paraphrase or AI-authored text is mixed into the historical work.',
    reviewApproval:manifest.releaseApproval
  }
};

const outputPath=path.join(ROOT,manifest.output.asset);
await fs.mkdir(path.dirname(outputPath),{recursive:true});
await fs.writeFile(outputPath,JSON.stringify(asset), 'utf8');
console.log(`Asr-i Saadet reader asset written: ${manifest.output.asset} · ${pages.length} reader pages`);
