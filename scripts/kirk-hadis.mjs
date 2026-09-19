import assert from 'node:assert/strict';
import {KIRK_HADIS_UNITS,KIRK_HADIS_META,emptyKirkHadisState,normalizeKirkHadisState,todayHadisPlan,recordHadisSession,dueReviews,addHadisHighlight,addHadisNote,toggleHadisBookmark,notebookEntries,progressPct,addDays} from '../src/kirk-hadis.mjs';

assert.equal(KIRK_HADIS_META.totalUnits,42);
assert.equal(KIRK_HADIS_UNITS.length,42);
for(const [i,h] of KIRK_HADIS_UNITS.entries()){
  assert.equal(h.id,i+1);assert.ok(h.title&&h.source&&h.translation&&h.meaning&&h.reflection&&h.practice);assert.ok(h.translation.length>=20);assert.ok(Array.isArray(h.sections)&&h.sections.length>=2);
}
const s=emptyKirkHadisState();
let p=todayHadisPlan(s,'2026-09-19');assert.equal(p.hadis.id,1);assert.equal(p.mode,'Dengeli');
recordHadisSession(s,{hadisId:1,date:'2026-09-19',minutes:9,feedback:'ideal',completed:true});
assert.equal(s.currentId,2);assert.equal(progressPct(s),2);assert.equal(s.reviews.length,2);assert.deepEqual(s.reviews.map(x=>x.dueDate),['2026-09-22','2026-09-26']);
assert.equal(dueReviews(s,'2026-09-21').length,0);assert.equal(dueReviews(s,'2026-09-22').length,1);
addHadisHighlight(s,{hadisId:1,sectionIndex:0,text:KIRK_HADIS_UNITS[0].sections[0],date:'2026-09-19'});assert.equal(s.highlights.length,1);
addHadisNote(s,{hadisId:1,sectionIndex:0,text:'Niyetimi her başlangıçta yenilemek istiyorum.',date:'2026-09-19'});assert.equal(s.notes.length,1);
assert.equal(toggleHadisBookmark(s,1),true);assert.equal(notebookEntries(s).length,1);
const clone=normalizeKirkHadisState(JSON.parse(JSON.stringify(s)));assert.equal(clone.notes.length,1);
for(let i=0;i<2;i++)recordHadisSession(s,{hadisId:2+i,date:addDays('2026-09-20',i),minutes:12,feedback:'heavy',completed:true});
p=todayHadisPlan(s,'2026-09-22');assert.equal(p.mode,'Sadeleştirilmiş');assert.equal(p.minutes,7);
assert.equal(KIRK_HADIS_UNITS.length,42);
assert.equal(KIRK_HADIS_UNITS[41].id,42);
console.log('kirk-hadis: 42 units + Turkish full translations + 3/7 review + notes/highlights/adaptation passed');
