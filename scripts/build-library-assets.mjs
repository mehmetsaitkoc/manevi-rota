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
function chunkFallback(text,size=5200){
  const src=String(text||'').replace(/\r/g,'').trim(),out=[];let pos=0;
  while(pos<src.length){
    let end=Math.min(src.length,pos+size);
    if(end<src.length){const cut=src.lastIndexOf('\n\n',end);if(cut>pos+1800)end=cut}
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

console.log('Downloading Ahmet Hamdi Akseki — Islam Dini OCR…');
const islamText=await fetchOk(ISLAM_URL,'text');
if(/^\s*<!doctype html/i.test(islamText)||/<html[\s>]/i.test(islamText.slice(0,2000)))throw new Error('Islam Dini source returned HTML instead of OCR text');
if(!/İSL[ÂA]M|ISL[ÂA]M/i.test(islamText.slice(0,12000)))throw new Error('Islam Dini source text signature not found');
let rawPages=islamText.split('\f');
if(rawPages.length<250){
  console.warn(`No reliable form-feed pagination (${rawPages.length}); using reader chunks.`);
  rawPages=chunkFallback(islamText);
}
const pages=rawPages.map((p,i)=>({page:i+1,text:normalizePage(p)}));
while(pages.length&&pages[pages.length-1].text==='')pages.pop();
const firstPageMatching=(re,fallback)=>pages.find(x=>re.test(x.text))?.page||fallback;
const sections=[
  {title:'Önsöz',page:firstPageMatching(/ÖNSÖZ/i,3)},
  {title:'Birinci Bölüm — Dinler ve Mezhebler Hakkında Umumî Malûmat',page:firstPageMatching(/BİRİNCİ\s+BÖLÜM/i,5)},
  {title:'İkinci Bölüm',page:firstPageMatching(/İKİNCİ\s+BÖLÜM/i,30)},
  {title:'Üçüncü Bölüm — İslâmın Beş Direği (Şartları)',page:firstPageMatching(/ÜÇÜNCÜ\s+BÖLÜM/i,60)},
  {title:'Dördüncü Bölüm — İslâm Ahlâkı',page:firstPageMatching(/DÖRDÜNCÜ\s+BÖLÜM/i,125)},
  {title:'İçindekiler',page:firstPageMatching(/İÇİNDEKİLER/i,Math.max(1,pages.length-15))}
].filter((x,i,a)=>x.page>=1&&x.page<=pages.length&&a.findIndex(y=>y.page===x.page)===i);
if(pages.filter(x=>x.text).length<100)throw new Error(`Islam Dini reader blocks too small: ${pages.length}`);
await fs.writeFile(path.join(OUT,'islam-dini.json'),JSON.stringify({
  title:'İslâm Dini',
  subtitle:'İtikat, İbâdet ve Ahlâk',
  author:'Ahmet Hamdi Akseki',
  pages,
  sections,
  source:{kind:'historical-scan-ocr',url:ISLAM_URL}
}), 'utf8');

console.log(`Library assets ready: Quran ${byChapter.size} surahs; Islam Dini ${pages.length} reader pages.`);
