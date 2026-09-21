import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {STARTER_LIBRARY} from '../src/library-catalog.mjs';
import {KIRK_HADIS_META,KIRK_HADIS_UNITS} from '../src/kirk-hadis.mjs';

const root=process.cwd();
const genericBooks=STARTER_LIBRARY.filter(x=>x.availability==='ready'&&x.readerType==='generic');
const warnings=[];
const blockers=[];
const info=[];

const normalizeText=value=>String(value||'').replace(/\s+/g,' ').trim();
const pct=(n,d)=>d?Number((n/d*100).toFixed(2)):0;
const preview=value=>normalizeText(value).slice(0,150);

const expectedStarts={
  'islam-dini':/ÖNSÖZ/i,
  'yavrularimiza-din-dersleri':/ÖNSÖZ|BİRİNCİ DERS/i,
  'namaz-sureleri-tefsiri':/ÖN SÖZ/i,
  'islam-fitri-tabii-umumi':/ÖN SÖZ/i,
  'ahlak-dersleri':/GİRİŞ/i,
  'kurandan-ayetler':/On Söz|ÖN SÖZ/i,
  'tanri-buyrugu':/BİRİNCİ BÖLÜM/i
};

const frontMatterNoise=/GÜZEL SANATLAR MATBAASI|MATBAASI A\.?\s*Ş|DİYANET İŞLERİ BAŞKANLIĞI YAYIN|YAYIN YÖNETMENİ|Karton Kapak\.indd|Semih Ofset|ISBN\s*[:\d-]/i;
const suspiciousExactLine=/^\d{6,}$/;
const obviousGarbage=/(?:^|\n)\s*(?:Cc|CC|C€|S5)\s*[—-]|\bMüneala\b|(?:^|\n)\s*KEK\s*(?:\n|$)/im;
const promoNoise=/Yazan ve Tertipleyen|mevzuunda tek eser|Yavrularınıza sevdirerek|SAHİH-İ MÜSLİM VE TERCEMESİ|her iki cildin tamamı\s+\d+\s*Lira/i;

function auditGeneric(book){
  const full=path.join(root,book.asset||'');
  if(!book.asset||!fs.existsSync(full)){
    blockers.push(`${book.id}: asset missing`);
    return null;
  }
  let data;
  try{data=JSON.parse(fs.readFileSync(full,'utf8'))}
  catch(err){blockers.push(`${book.id}: invalid JSON (${err.message})`);return null}

  if(data.id!==book.id)blockers.push(`${book.id}: data.id mismatch (${data.id})`);
  if(!Array.isArray(data.pages)||!data.pages.length){
    blockers.push(`${book.id}: pages missing`);
    return null;
  }

  const pages=data.pages;
  const ids=pages.map(x=>Number(x?.page));
  const invalidIds=ids.filter(x=>!Number.isFinite(x)||x<1).length;
  const duplicateIds=ids.length-new Set(ids).size;
  if(invalidIds)blockers.push(`${book.id}: ${invalidIds} invalid page ids`);
  if(duplicateIds)blockers.push(`${book.id}: ${duplicateIds} duplicate page ids`);

  const texts=pages.map(x=>String(x?.text||''));
  const blank=texts.filter(x=>!normalizeText(x)).length;
  const short=texts.filter(x=>normalizeText(x).length>0&&normalizeText(x).length<80).length;
  const normalized=texts.map(normalizeText);
  const duplicateBodies=normalized.filter((x,i)=>x&&normalized.indexOf(x)!==i).length;
  const replacementChars=texts.reduce((n,x)=>n+(x.match(/�/g)||[]).length,0);
  const softHyphenMarks=texts.reduce((n,x)=>n+(x.match(/¬/g)||[]).length,0);
  const lineEndHyphens=texts.reduce((n,x)=>n+(x.match(/[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]-\n[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]/g)||[]).length,0);
  const numericArtifactPages=pages.flatMap((p,i)=>{
    const hits=String(p?.text||'').split(/\r?\n/).map(x=>x.trim()).filter(line=>suspiciousExactLine.test(line));
    return hits.length?[{readerPage:i+1,sourcePage:p?.page??null,hits:hits.slice(0,5)}]:[];
  });
  const garbagePages=pages.flatMap((p,i)=>obviousGarbage.test(String(p?.text||''))?[{readerPage:i+1,sourcePage:p?.page??null,preview:preview(p.text)}]:[]);
  const tailPromoPages=pages.flatMap((p,i)=>i>=Math.max(0,pages.length-12)&&promoNoise.test(String(p?.text||''))?[{readerPage:i+1,sourcePage:p?.page??null,preview:preview(p.text)}]:[]);
  const qualityReviewPages=Array.isArray(data.qualityReviewPages)?data.qualityReviewPages:[];
  const invalidQualityReviewPages=qualityReviewPages.filter(row=>!pages.some(p=>Number(p.page)===Number(row?.page)));
  const numericArtifacts=numericArtifactPages.reduce((n,x)=>n+x.hits.length,0);
  const obviousGarbageHits=garbagePages.length;
  const first=String(texts[0]||'');
  const firstThree=texts.slice(0,3).join('\n');
  const startOk=(expectedStarts[book.id]||/.+/).test(first);
  const frontNoise=frontMatterNoise.test(firstThree);
  const sections=Array.isArray(data.sections)?data.sections:[];
  const invalidSections=sections.filter(section=>!pages.some(p=>Number(p.page)===Number(section?.page))).length;

  if(blank)warnings.push(`${book.id}: ${blank} blank reader pages`);
  if(duplicateBodies)warnings.push(`${book.id}: ${duplicateBodies} duplicate page bodies`);
  if(!startOk)warnings.push(`${book.id}: reader start does not match expected author-text start; first="${preview(first)}"`);
  if(frontNoise)warnings.push(`${book.id}: publisher/layout front-matter noise appears in first 3 reader pages`);
  if(replacementChars)warnings.push(`${book.id}: ${replacementChars} Unicode replacement characters`);
  if(numericArtifacts)warnings.push(`${book.id}: ${numericArtifacts} standalone 6+ digit OCR artifacts`);
  if(obviousGarbageHits)warnings.push(`${book.id}: ${obviousGarbageHits} pages contain known obvious OCR garbage patterns`);
  if(tailPromoPages.length)warnings.push(`${book.id}: ${tailPromoPages.length} tail pages look like publisher/promotional material`);
  if(qualityReviewPages.length)warnings.push(`${book.id}: ${qualityReviewPages.length} source pages are explicitly flagged for scan/OCR verification`);
  if(invalidQualityReviewPages.length)blockers.push(`${book.id}: qualityReviewPages contains missing source pages`);
  if(invalidSections)blockers.push(`${book.id}: ${invalidSections} section links point to missing reader pages`);
  if(!data.source?.sourceLabel)blockers.push(`${book.id}: sourceLabel missing`);
  if(!data.source?.textPolicy)blockers.push(`${book.id}: textPolicy missing`);
  if(book.requiresEditionReview&&!data.source?.reviewNote)warnings.push(`${book.id}: edition review required but source.reviewNote missing`);

  return {
    id:book.id,title:book.title,pages:pages.length,
    sourceFirstPage:ids[0],sourceLastPage:ids.at(-1),
    blankPages:blank,shortPages:short,shortPct:pct(short,pages.length),
    duplicatePageBodies:duplicateBodies,
    replacementChars,softHyphenMarks,lineEndHyphens,numericArtifacts,obviousGarbageHits,
    numericArtifactPages,garbagePages,tailPromoPages,qualityReviewPages,
    frontMatterNoise:frontNoise,startOk,sections:sections.length,invalidSections,
    firstPreview:preview(first),lastPreview:preview(texts.at(-1)),
    sourceLabel:data.source?.sourceLabel||null,
    sourceEditionYear:data.source?.sourceEditionYear||data.source?.originalYear||null
  };
}

function auditQuran(){
  const dir=path.join(root,'public/data/quran');
  const missing=[],badChapter=[],badSequence=[],nonArabic=[];
  let totalVerses=0;
  for(let chapter=1;chapter<=114;chapter++){
    const file=path.join(dir,`${chapter}.json`);
    if(!fs.existsSync(file)){missing.push(chapter);continue}
    let data;
    try{data=JSON.parse(fs.readFileSync(file,'utf8'))}
    catch{badChapter.push(chapter);continue}
    if(Number(data.chapter)!==chapter||!Array.isArray(data.verses)||!data.verses.length){badChapter.push(chapter);continue}
    totalVerses+=data.verses.length;
    const sequenceOk=data.verses.every((v,i)=>Number(v.verse)===i+1);
    if(!sequenceOk)badSequence.push(chapter);
    if(data.verses.some(v=>!/[\u0600-\u06FF]/.test(String(v.text||''))))nonArabic.push(chapter);
  }
  if(missing.length)blockers.push(`quran: missing chapter files ${missing.join(',')}`);
  if(badChapter.length)blockers.push(`quran: malformed chapter files ${badChapter.join(',')}`);
  if(badSequence.length)blockers.push(`quran: non-contiguous verse numbers in chapters ${badSequence.join(',')}`);
  if(nonArabic.length)blockers.push(`quran: verses without Arabic script in chapters ${nonArabic.join(',')}`);
  if(totalVerses!==6236)blockers.push(`quran: expected 6236 verses, got ${totalVerses}`);
  const sourcePath=path.join(dir,'source.json');
  let source=null;
  try{source=JSON.parse(fs.readFileSync(sourcePath,'utf8'))}catch{}
  if(!source?.edition||!source?.label||!source?.source)blockers.push('quran: source metadata incomplete');
  return {id:'quran',chapters:114,totalVerses,source};
}

function auditHadith(){
  if(KIRK_HADIS_META.totalUnits!==42||KIRK_HADIS_UNITS.length!==42){
    blockers.push(`kirk-hadis: expected 42 units, got ${KIRK_HADIS_UNITS.length}`);
  }
  const missing=[];
  const duplicateIds=KIRK_HADIS_UNITS.length-new Set(KIRK_HADIS_UNITS.map(x=>x.id)).size;
  for(const h of KIRK_HADIS_UNITS){
    const required=['title','source','translation','meaning','why','reflection','practice'];
    const absent=required.filter(k=>!normalizeText(h?.[k]));
    if(absent.length||!Array.isArray(h.sections)||h.sections.length<2)missing.push({id:h.id,absent,sections:h.sections?.length||0});
  }
  if(duplicateIds)blockers.push(`kirk-hadis: ${duplicateIds} duplicate unit ids`);
  if(missing.length)blockers.push(`kirk-hadis: incomplete units ${missing.map(x=>x.id).join(',')}`);
  warnings.push('kirk-hadis: Turkish translations/editorial explanations still require qualified human hadith/editor review before commercial release');
  return {
    id:'kirk-hadis',units:KIRK_HADIS_UNITS.length,
    avgTranslationChars:Math.round(KIRK_HADIS_UNITS.reduce((n,x)=>n+normalizeText(x.translation).length,0)/Math.max(1,KIRK_HADIS_UNITS.length)),
    incompleteUnits:missing.length,
    rightsMode:KIRK_HADIS_META.rightsMode
  };
}

const generic=genericBooks.map(auditGeneric).filter(Boolean);
const quran=auditQuran();
const hadith=auditHadith();

assert.equal(STARTER_LIBRARY.filter(x=>x.availability==='ready').length,9,'audit assumes nine ready works');
info.push(...generic.map(x=>`${x.id}: ${x.pages} pages; start=${x.startOk?'ok':'review'}; frontMatter=${x.frontMatterNoise?'review':'ok'}; OCR(repl=${x.replacementChars}, numeric=${x.numericArtifacts}, obvious=${x.obviousGarbageHits}, hyphen=${x.lineEndHyphens}, soft=${x.softHyphenMarks})`));
info.push(`quran: ${quran.chapters} chapters / ${quran.totalVerses} verses`);
info.push(`kirk-hadis: ${hadith.units} units / avg translation ${hadith.avgTranslationChars} chars`);

console.log('LIBRARY CONTENT AUDIT');
for(const row of info)console.log('INFO',row);
for(const row of warnings)console.log('REVIEW',row);
for(const row of blockers)console.log('BLOCK',row);
console.log('AUDIT_SUMMARY',JSON.stringify({
  readyWorks:9,generic,quran,hadith,
  warningCount:warnings.length,blockerCount:blockers.length,
  warnings,blockers
}));

if(blockers.length){
  process.exitCode=1;
}else{
  console.log('library-content-audit: structural/source integrity passed; review findings printed above');
}
