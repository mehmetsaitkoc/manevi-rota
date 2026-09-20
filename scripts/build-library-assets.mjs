import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'public','data');
const QOUT=path.join(OUT,'quran');
const QURAN_URL='https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranuthmanihaf.min.json';
const ISLAM_URL='https://archive.org/download/islamdinia.hamdiakseki1933.pdf_201912/%C4%B0slam%20Dini%20A.Hamdi%20Akseki1933.pdf_djvu.txt';

async function fetchOk(url,type='text'){
  const r=await fetch(url,{headers:{'user-agent':'Manevi-Rota-Library-Builder/1.0'}});
  if(!r.ok)throw new Error(`${r.status} ${r.statusText} — ${url}`);
  return type==='json'?r.json():r.text();
}
function normalizePage(text){
  return String(text||'').replace(/\r/g,'').split('\n').map(line=>line.replace(/[ \t]+/g,' ').trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function chunkFallback(text,size=2400){
  const src=String(text||'').replace(/\r/g,'').trim(),out=[];let pos=0;
  while(pos<src.length){
    let end=Math.min(src.length,pos+size);
    if(end<src.length){const cut=src.lastIndexOf('\n\n',end);if(cut>pos+800)end=cut}
    out.push(src.slice(pos,end).trim());pos=end;
  }
  return out;
}

await fs.mkdir(QOUT,{recursive:true});

console.log('Downloading Quran Uthmani Hafs…');
const q=await fetchOk(QURAN_URL,'json');
const rows=Array.isArray(q?.quran)?q.quran:Array.isArray(q?.chapter)?q.chapter:Array.isArray(q)?q:[];
if(rows.length<6200)throw new Error(`Quran rows too small: ${rows.length}`);
const byChapter=new Map();
for(const row of rows){
  const chapter=Number(row.chapter),verse=Number(row.verse),text=String(row.text||'').trim();
  if(!chapter||!verse||!text)continue;
  if(!byChapter.has(chapter))byChapter.set(chapter,[]);
  byChapter.get(chapter).push({verse,text});
}
if(byChapter.size!==114)throw new Error(`Expected 114 surahs, found ${byChapter.size}`);
for(let n=1;n<=114;n++){
  const verses=(byChapter.get(n)||[]).sort((a,b)=>a.verse-b.verse);
  await fs.writeFile(path.join(QOUT,`${n}.json`),JSON.stringify({chapter:n,verses}), 'utf8');
}
await fs.writeFile(path.join(QOUT,'source.json'),JSON.stringify({
  edition:'ara-quranuthmanihaf',
  label:'Quran Uthmani Hafs',
  source:'https://qurancomplex.gov.sa/',
  api:'fawazahmed0/quran-api'
}), 'utf8');

console.log('Preparing Ahmet Hamdi Akseki — Islam Dini OCR…');
const existingIslamPath=path.join(OUT,'islam-dini.json');
let islamText='';
try{
  const existing=JSON.parse(await fs.readFile(existingIslamPath,'utf8'));
  const localPages=Array.isArray(existing?.pages)?existing.pages:[];
  const joined=localPages.map(x=>String(x?.text||'').trim()).filter(Boolean).join('\n\n');
  if(localPages.length>=100&&joined.length>300000&&!/^\s*<!doctype html/i.test(joined)&&!/\<html[\s>]/i.test(joined.slice(0,2000))&&/İSL[ÂA]M|ISL[ÂA]M/i.test(joined.slice(0,12000))){
    islamText=joined;
    console.log(`Using verified local Islam Dini OCR cache (${localPages.length} reader blocks).`);
  }
}catch{}
if(!islamText){
  console.log('Local OCR cache unavailable; downloading source…');
  let lastErr;
  for(let attempt=1;attempt<=3&&!islamText;attempt++){
    try{islamText=await fetchOk(ISLAM_URL,'text')}
    catch(err){lastErr=err;if(attempt<3)await new Promise(r=>setTimeout(r,attempt*1500))}
  }
  if(!islamText)throw lastErr||new Error('Islam Dini source unavailable');
}
if(/^\s*<!doctype html/i.test(islamText)||/<html[\s>]/i.test(islamText.slice(0,2000)))throw new Error('Islam Dini source returned HTML instead of OCR text');
if(!/İSL[ÂA]M|ISL[ÂA]M/i.test(islamText.slice(0,12000)))throw new Error('Islam Dini source text signature not found');
let rawPages=islamText.split('\f');
if(rawPages.length<250){
  console.warn(`No reliable form-feed pagination (${rawPages.length}); using reader chunks.`);
  rawPages=chunkFallback(islamText);
}
const pages=rawPages.map((p,i)=>({page:i+1,text:normalizePage(p)}));
while(pages.length&&pages[pages.length-1].text==='')pages.pop();
const firstPageMatching=(re,minPage=1,fallback=minPage)=>pages.find(x=>x.page>=minPage&&re.test(x.text))?.page||fallback;
const p1=firstPageMatching(/BİRİNCİ\s+BÖLÜM/i,3,3);
const p2=firstPageMatching(/İKİNCİ\s+BÖLÜM/i,p1+10,Math.round(pages.length*.17));
const p3=firstPageMatching(/ÜÇÜNCÜ\s+BÖLÜM/i,p2+10,Math.round(pages.length*.34));
const p4=firstPageMatching(/DÖRDÜNCÜ\s+BÖLÜM/i,p3+20,Math.round(pages.length*.70));
const sections=[
  {title:'Önsöz',page:firstPageMatching(/ÖNSÖZ/i,1,1)},
  {title:'Birinci Bölüm — Dinler ve Mezhebler Hakkında Umumî Malûmat',page:p1},
  {title:'İkinci Bölüm',page:p2},
  {title:'Üçüncü Bölüm — İslâmın Beş Direği (Şartları)',page:p3},
  {title:'Dördüncü Bölüm — İslâm Ahlâkı',page:p4},
  {title:'İçindekiler',page:firstPageMatching(/İÇİNDEKİLER/i,Math.max(p4+1,pages.length-40),Math.max(1,pages.length-15))}
].filter((x,i,a)=>x.page>=1&&x.page<=pages.length&&a.findIndex(y=>y.page===x.page)===i);
if(pages.filter(x=>x.text).length<250)throw new Error(`Islam Dini reader blocks too small: ${pages.length}`);
await fs.writeFile(path.join(OUT,'islam-dini.json'),JSON.stringify({
  title:'İslâm Dini',
  subtitle:'İtikat, İbâdet ve Ahlâk',
  author:'Ahmet Hamdi Akseki',
  pages,
  sections,
  source:{kind:'historical-scan-ocr',url:ISLAM_URL}
}), 'utf8');

console.log(`Library assets ready: Quran ${byChapter.size} surahs; Islam Dini ${pages.length} reader pages.`);
