import assert from 'node:assert/strict';
import {buildRoute,dayAdd,timeSlotLearning} from '../src/route-engine.mjs';

const start='2026-08-20';
const profile={baseMinutes:20,priorities:['quran','reading','dua'],quranLevel:'regular',reading:'regular',blocker:'variable',pace:'deep',prayerTracking:false,slotOverrides:{},slotSuggestionSnooze:{}};
const records=[];
let suggestionDay=null;
for(let i=0;i<30;i++){
  const date=dayAdd(start,i);
  const route=buildRoute({date,profile,checkin:{minutes:20,energy:3,load:3,mood:'normal',context:'normal'},records});
  // Simulate a person who rarely completes Quran in the morning but reliably completes evening work.
  const done=route.tasks.filter(t=>t.id!=='quran'||t.slot!=='morning').map(t=>t.id);
  records.push({date,route,done,feedback:'ideal',taskFeedback:{}});
  const next=dayAdd(date,1);
  const learning=timeSlotLearning({records,today:next,profile});
  if(!suggestionDay&&learning.suggestions.some(x=>x.taskId==='quran'))suggestionDay=next;
}
assert.ok(suggestionDay,'30-day simulation should eventually learn repeated time-slot friction');
assert.ok(records.every(r=>r.route.totalMinutes<=r.route.budget),'all 30 routes respect capacity');
assert.ok(records.every(r=>new Set(r.route.tasks.map(t=>t.id)).size===r.route.tasks.length),'no duplicate tasks across 30 days');
console.log(`route-engine-30day: 30-day simulation passed; first timing suggestion ${suggestionDay}`);
