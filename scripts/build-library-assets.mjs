import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile as execFileCb} from 'node:child_process';
import {promisify} from 'node:util';

const execFile=promisify(execFileCb);

const ROOT=process.cwd();
const OUT=path.join(ROOT,'public','data');
const QOUT=path.join(OUT,'quran');
const BOUT=path.join(OUT,'books');
const QURAN_URL='https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranuthmanihaf.min.json';
const ISLAM_URL='https://archive.org/download/islamdinia.hamdiakseki1933.pdf_201912/%C4%B0slam%20Dini%20A.Hamdi%20Akseki1933.pdf_djvu.txt';
const YAVRULAR_URL='https://archive.org/download/yavrularimiza-di-n-dersleri-ahmet-hamdi-akseki/YAVRULARIMIZA%20D%C4%B0N%20DERSLER%C4%B0%20-%20AHMET%20HAMD%C4%B0%20AKSEK%C4%B0_djvu.txt';
const ISLAM_FITRI_URL='https://archive.org/download/i-slam-fitri-tabii-ve-umumi-bi-r-di-ndi-r-ahmed-hamdi-akseki-di-yanet/%C4%B0SLAM%20FITR%C4%B0%20TAB%C4%B0%C4%B0%20VE%20UMUM%C4%B0%20B%C4%B0R%20D%C4%B0ND%C4%B0R%20-%20AHMED%20HAMD%C4%B0%20AKSEK%C4%B0%20-%20D%C4%B0YANET_djvu.txt';
const IBN_SINA_IHLAS_URL='https://archive.org/download/ibnisinaihlassuresi/Ibni%20Sina%20Ihlas%20Suresi_djvu.txt';
const ASKERE_DIN_URL='https://archive.org/download/McGillLibrary-isl_askere-din-kitabi_BP1883S6A41945-18890/isl_askere-din-kitabi_BP1883S6A41945_djvu.txt';

async function fetchOk(url,type='text'){
  const r=await fetch(url,{headers:{'user-agent':'Manevi-Rota-Library-Builder/1.1'}});
  if(!r.ok)throw new Error(`${r.status} ${r.statusText} — ${url}`);
  if(type==='json')return r.json();
  if(type==='buffer')return Buffer.from(await r.arrayBuffer());
  return r.text();
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
await fs.mkdir(BOUT,{recursive:true});

const normalizePdfPage=text=>String(text||'')
  .replace(/\r/g,'')
  .replace(/\u00ad/g,'')
  .replace(/\u0000/g,'')
  .split('\n')
  .map(line=>line.replace(/[ \t]+/g,' ').trim())
  .filter(line=>!/^\d{1,4}$/.test(line))
  .filter(line=>!/^(?:Namaz Sûrelerinin Türkçe Terceme ve Tefsiri|AHLÂK DERSLERİ|Ahlâk Dersleri)$/i.test(line))
  .filter(line=>!/\.indd\b/i.test(line))
  .filter(line=>!/Semih Ofset/i.test(line))
  .join('\n')
  .replace(/([A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû])[\-‐‑‒–—]\s*\n\s*([A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû])/g,'$1$2')
  .replace(/\n{3,}/g,'\n\n')
  .trim();

const normalizeArchivePage=text=>String(text||'')
  .replace(/\r/g,'')
  .replace(/\u00ad/g,'')
  .replace(/\u0000/g,'')
  .split('\n')
  .map(line=>line.replace(/[ \t]+/g,' ').trim())
  .filter(line=>!/^\d{1,4}$/.test(line))
  .filter(line=>!/^(?:YAVRULARIMIZA D[Iİ]N DERSLER[Iİ]|AHMET HAMD[Iİ] AKSEK[Iİ])$/i.test(line))
  .join('\n')
  .replace(/([A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû])-\n([A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû])/g,'$1$2')
  .replace(/\n{3,}/g,'\n\n')
  .trim();

async function buildTextBook({
  id,title,subtitle,author,url,minReaderPages,minChars,originalYear,sourceEditionYear,sourceLabel,
  signature,startAtMatcher=null,sectionMatchers=[]
}){
  console.log(`Preparing ${title} from OCR text…`);
  const raw=await fetchOk(url,'text');
  if(/^\s*<!doctype html/i.test(raw)||/<html[\s>]/i.test(raw.slice(0,2000)))throw new Error(`${title}: source returned HTML`);
  if(signature&&!signature.test(raw.slice(0,50000)))throw new Error(`${title}: source signature not found`);
  let rawPages=raw.split('\f');
  if(rawPages.length<minReaderPages){
    console.warn(`${title}: form-feed pagination too small (${rawPages.length}); using reader chunks.`);
    rawPages=chunkFallback(raw,1900);
  }
  let pages=rawPages.map((page,i)=>({page:i+1,text:normalizeArchivePage(page)})).filter(x=>x.text);
  if(startAtMatcher){
    const start=pages.findIndex(x=>startAtMatcher.test(x.text));
    if(start>=0){
      pages=pages.slice(start).map((x,i)=>({...x,page:i+1,sourcePage:x.sourcePage||x.page}));
      const first=pages[0],match=first?.text?.match(startAtMatcher);
      if(match?.index>0)pages[0]={...first,text:first.text.slice(match.index).trim()};
    }
  }
  const joined=pages.map(x=>x.text).join('\n\n');
  if(pages.length<minReaderPages)throw new Error(`${title}: reader pages too small (${pages.length})`);
  if(joined.length<minChars)throw new Error(`${title}: extracted text too small (${joined.length})`);
  const sections=sectionMatchers.map(({title:label,re})=>{
    const hit=pages.find(x=>re.test(x.text));
    return hit?{title:label,page:hit.page}:null;
  }).filter(Boolean).filter((x,i,a)=>a.findIndex(y=>y.page===x.page)===i);
  const asset={
    id,title,subtitle,author,pages,sections,
    source:{
      kind:'public-domain-author-text-from-historical-scan-ocr',
      sourceLabel,url,originalYear,sourceEditionYear,
      textPolicy:'Historical OCR is normalized only for line-break noise. Author text is preserved; no AI summary, modernization or commentary is mixed into the work.',
      reviewNote:'The author is outside the Turkish copyright term, but this reader uses OCR from a later historical edition. Commercial release must retain a final human comparison for publisher/editorial additions and OCR errors.'
    }
  };
  await fs.writeFile(path.join(BOUT,`${id}.json`),JSON.stringify(asset),'utf8');
  console.log(`${title}: ${pages.length} reader pages, ${joined.length} chars`);
  return asset;
}

async function buildPdfBook({
  id,title,subtitle,author,url,startPage,minReaderPages,minChars,originalYear,sourceLabel,sectionMatchers=[]
}){
  console.log(`Preparing ${title}…`);
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),`manevi-rota-${id}-`));
  const pdf=path.join(tmp,`${id}.pdf`),txt=path.join(tmp,`${id}.txt`);
  try{
    await fs.writeFile(pdf,await fetchOk(url,'buffer'));
    await execFile('pdftotext',['-f',String(startPage),'-layout','-enc','UTF-8',pdf,txt],{maxBuffer:32*1024*1024});
    const raw=await fs.readFile(txt,'utf8');
    const rawPages=raw.split('\f');
    const pages=rawPages.map((page,i)=>({page:i+1,text:normalizePdfPage(page)})).filter(x=>x.text);
    const joined=pages.map(x=>x.text).join('\n\n');
    if(pages.length<minReaderPages)throw new Error(`${title}: reader pages too small (${pages.length})`);
    if(joined.length<minChars)throw new Error(`${title}: extracted text too small (${joined.length})`);
    const sections=sectionMatchers.map(({title:label,re})=>{
      const hit=pages.find(x=>re.test(x.text));
      return hit?{title:label,page:hit.page}:null;
    }).filter(Boolean).filter((x,i,a)=>a.findIndex(y=>y.page===x.page)===i);
    const asset={
      id,title,subtitle,author,
      pages,sections,
      source:{
        kind:'public-domain-author-text-from-digital-edition',
        sourceLabel,url,originalYear,digitalEditionYear:2016,
        bodyStartsAtPdfPage:startPage,
        textPolicy:'Publisher front matter excluded. Author text is preserved; no AI summary, modernization or commentary is mixed into the work.',
        reviewNote:'Commercial release should retain a final human rights/editorial review because the digital edition may contain publisher tashih.'
      }
    };
    await fs.writeFile(path.join(BOUT,`${id}.json`),JSON.stringify(asset),'utf8');
    console.log(`${title}: ${pages.length} reader pages, ${joined.length} chars`);
    return asset;
  }finally{
    await fs.rm(tmp,{recursive:true,force:true});
  }
}

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
  id:'islam-dini',
  title:'İslâm Dini',
  subtitle:'İtikat, İbâdet ve Ahlâk',
  author:'Ahmet Hamdi Akseki',
  pages,
  sections,
  source:{
    kind:'historical-scan-ocr',
    url:ISLAM_URL,
    sourceLabel:'İlk baskı 1933 · kullanılan OCR taraması 20. baskı',
    originalYear:1933,
    textPolicy:'Müellif metni OCR aktarımı olarak korunur; no AI summary, modernizasyon veya Manevî Rota yorumu eser metnine karıştırılmaz.',
    reviewNote:'Kullanılan tarama künye sayfasında 20. baskı olarak görünür. OCR/dizgi ve muhtemel tashih katkıları ticari yayın öncesi insan editör tarafından karşılaştırılmalıdır; kullanıcı notları eser metninden ayrı tutulur.'
  }
}), 'utf8');


const yavrularimiza=await buildTextBook({
  id:'yavrularimiza-din-dersleri',
  title:'Yavrularımıza Din Dersleri',
  subtitle:'Kademeli temel din bilgisi',
  author:'Ahmed Hamdi Akseki',
  url:YAVRULAR_URL,
  minReaderPages:180,
  minChars:180000,
  originalYear:1941,
  sourceEditionYear:1967,
  sourceLabel:'Internet Archive · 1967 Üçdal Neşriyat tarihî taraması · 512 sayfa',
  signature:/YAVRULARIMIZA\s+D[Iİ]N\s+DERSLER[Iİ]/i,
  startAtMatcher:/(?:ÖN\s*SÖZ|B[Iİ]R[Iİ]NC[Iİ]\s+K[Iİ]TAP)/i,
  sectionMatchers:[
    {title:'Birinci Kitap',re:/B[Iİ]R[Iİ]NC[Iİ]\s+K[Iİ]TAP/i},
    {title:'İkinci Kitap',re:/[İI]K[Iİ]NC[Iİ]\s+K[Iİ]TAP/i},
    {title:'Üçüncü Kitap',re:/[ÜU][ÇC][ÜU]NC[ÜU]\s+K[Iİ]TAP/i},
    {title:'Dördüncü Kitap',re:/D[ÖO]RD[ÜU]NC[ÜU]\s+K[Iİ]TAP/i},
    {title:'Beşinci Kitap',re:/BE[ŞS][İI]NC[Iİ]\s+K[Iİ]TAP/i}
  ]
});

const askereDin=await buildTextBook({
  id:'askere-din-kitabi',
  title:'Askere Din Kitabı',
  subtitle:'İman, ibadet, ahlâk ve günlük sorumluluk',
  author:'Ahmed Hamdi Akseki',
  url:ASKERE_DIN_URL,
  minReaderPages:180,
  minChars:180000,
  originalYear:1945,
  sourceEditionYear:1945,
  sourceLabel:'McGill University Library · 1945 tarihî baskı taraması',
  signature:/ASKERE\s+D[Iİ]N\s+K[Iİ]TAB[Iİ]/i,
  startAtMatcher:/(?:ÖN\s*SÖZ|G[Iİ]R[Iİ][ŞS]|B[Iİ]R[Iİ]NC[Iİ]\s+(?:DERS|B[ÖO]L[ÜU]M))/i,
  sectionMatchers:[
    {title:'Başlangıç',re:/G[Iİ]R[Iİ][ŞS]|BA[ŞS]LANGI[ÇC]/i},
    {title:'İman',re:/\b[Iİ]MAN\b/i},
    {title:'İbadet',re:/\b[Iİ]BADET/i},
    {title:'Ahlâk',re:/AHL[ÂA]K/i}
  ]
});

const islamFitri=await buildTextBook({
  id:'islam-fitri-tabii-umumi',
  title:'İslâm Fıtrî, Tabiî ve Umumî Bir Dindir',
  subtitle:'İslâmın insan, akıl ve hayatla ilişkisi',
  author:'Ahmed Hamdi Akseki',
  url:ISLAM_FITRI_URL,
  minReaderPages:280,
  minChars:450000,
  originalYear:1943,
  sourceEditionYear:null,
  sourceLabel:'Internet Archive · Diyanet kaynaklı tarihî tarama',
  signature:/[İI]SLAM\s+F[Iİ]TR[Iİ]|ISLAM\s+FITRI/i,
  startAtMatcher:/(?:ÖN\s*SÖZ|G[Iİ]R[Iİ][ŞS]|MUKADD[Iİ]ME|B[Iİ]R[Iİ]NC[Iİ]\s+B[ÖO]L[ÜU]M)/i,
  sectionMatchers:[
    {title:'Giriş',re:/\bG[Iİ]R[Iİ][ŞS]\b|MUKADD[Iİ]ME/i},
    {title:'Din',re:/\bD[Iİ]N\b/i},
    {title:'İslâm',re:/\b[Iİ]SL[ÂA]M\b/i},
    {title:'İman',re:/\b[Iİ]MAN\b/i}
  ]
});

const ibnSinaIhlas=await buildTextBook({
  id:'ibn-sina-ihlas-tefsiri',
  title:'İbn Sînâ’nın İhlâs Sûresi Tefsiri',
  subtitle:'Tercüme ve şerh',
  author:'Ahmed Hamdi Akseki',
  url:IBN_SINA_IHLAS_URL,
  minReaderPages:35,
  minChars:35000,
  originalYear:1937,
  sourceEditionYear:1986,
  sourceLabel:'Internet Archive · 1986 tarihli neşir taraması',
  signature:/[İI]HLAS\s+SURES[Iİ]|IHLAS\s+SURESI/i,
  startAtMatcher:/(?:ÖN\s*SÖZ|[İI]HLAS\s+SURES[Iİ]|[İI]BN[Iİ]?\s+S[Iİ]NA)/i,
  sectionMatchers:[
    {title:'Giriş',re:/ÖN\s*SÖZ|G[Iİ]R[Iİ][ŞS]/i},
    {title:'İhlâs Sûresi',re:/[İI]HL[ÂA]S\s+S[ÛU]RES[Iİ]/i},
    {title:'Tercüme ve Şerh',re:/TERC[ÜU]ME|[ŞS]ERH/i}
  ]
});

const namazSureleri=await buildPdfBook({
  id:'namaz-sureleri-tefsiri',
  title:'Namaz Sûrelerinin Türkçe Terceme ve Tefsiri',
  subtitle:'Fâtiha, kısa sûreler ve namaz duaları',
  author:'Ahmed Hamdi Akseki',
  url:'https://dijital.diyanet.gov.tr/File/Download?id=432&path=432_1.pdf',
  startPage:6,
  minReaderPages:60,
  minChars:45000,
  originalYear:1949,
  sourceLabel:'Diyanet İşleri Başkanlığı dijital nüshası',
  sectionMatchers:[
    {title:'Ön Söz',re:/\bÖN SÖZ\b/i},
    {title:'Fâtiha Sûresi',re:/FÂT[Iİ]HA S[ÛU]RES[Iİ]/i},
    {title:'Fîl Sûresi',re:/F[Iİ]L S[ÛU]RES[Iİ]/i},
    {title:'Kureyş Sûresi',re:/KUREY[ŞS] S[ÛU]RES[Iİ]/i},
    {title:'Mâûn Sûresi',re:/M[ÂA][ÛU]N S[ÛU]RES[Iİ]/i},
    {title:'Kevser Sûresi',re:/KEVSER S[ÛU]RES[Iİ]/i},
    {title:'Kâfirûn Sûresi',re:/K[ÂA]F[Iİ]R[ÛU]N S[ÛU]RES[Iİ]/i},
    {title:'Nasr Sûresi',re:/NASR S[ÛU]RES[Iİ]/i},
    {title:'İhlâs Sûresi',re:/[İI]HL[ÂA]S S[ÛU]RES[Iİ]/i},
    {title:'Felâk Sûresi',re:/FEL[ÂA]K S[ÛU]RES[Iİ]/i},
    {title:'Nâs Sûresi',re:/N[ÂA]S S[ÛU]RES[Iİ]/i},
    {title:'Âyetü’l-Kürsî',re:/[ÂA]YET[ÜU].?L.K[ÜU]RS[ÎI]/i},
    {title:'Namaz Duaları',re:/NAMAZLARDA OKUNAN DUALAR/i}
  ]
});

const ahlakDersleri=await buildPdfBook({
  id:'ahlak-dersleri',
  title:'Ahlâk Dersleri',
  subtitle:'Ahlâk ilmi ve İslâm ahlâkı',
  author:'Ahmed Hamdi Akseki',
  url:'https://dijital.diyanet.gov.tr/File/Download?id=363&path=ahlak_dersleri.pdf',
  startPage:15,
  minReaderPages:350,
  minChars:250000,
  originalYear:1924,
  sourceLabel:'Diyanet İşleri Başkanlığı dijital nüshası',
  sectionMatchers:[
    {title:'Giriş',re:/\bG[Iİ]R[Iİ][ŞS]\b/i},
    {title:'Birinci Ders — İlm-i Ahlâk',re:/B[Iİ]R[Iİ]NC[Iİ] DERS[\s\S]{0,120}[İI]LM.?[İI] AHL[ÂA]K/i},
    {title:'Üçüncü Ders — Ahlâk-ı Vazife',re:/[ÜU][ÇC][ÜU]NC[ÜU] DERS[\s\S]{0,120}AHL[ÂA]K.?I VAZ[Iİ]FE/i},
    {title:'Dokuzuncu Ders — Ahlâk-ı İslâmiyye',re:/DOKUZUNCU DERS[\s\S]{0,160}AHL[ÂA]K.?I [İI]SL[ÂA]M[Iİ]YYE/i},
    {title:'On İkinci Ders — Fezâil ve Rezâil',re:/ON [İI]K[Iİ]NC[Iİ] DERS[\s\S]{0,120}FEZ[ÂA][İI]L VE REZ[ÂA][İI]L/i},
    {title:'On Beşinci Ders — Aile Vazifeleri',re:/ON BE[ŞS][İI]NC[Iİ] DERS[\s\S]{0,120}VEZ[ÂA][İI]F.?[İI] [ÂA][İI]L[Iİ]YYE/i}
  ]
});

console.log(`Library assets ready: Quran ${byChapter.size} surahs; Islam Dini ${pages.length}; Yavrularımıza ${yavrularimiza.pages.length}; Askere Din ${askereDin.pages.length}; Islam Fıtri ${islamFitri.pages.length}; Ibn Sina Ihlas ${ibnSinaIhlas.pages.length}; Namaz Sûreleri ${namazSureleri.pages.length}; Ahlâk Dersleri ${ahlakDersleri.pages.length}.`);

