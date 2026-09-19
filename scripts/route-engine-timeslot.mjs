import assert from 'node:assert/strict';
import {buildRoute,timeSlotLearning,dayAdd} from '../src/route-engine.mjs';
import {TASK_CATALOG} from '../src/catalog.mjs';

const TODAY='2026-09-19';
const profile={baseMinutes:20,priorities:['quran','reading','meal'],quranLevel:'regular',reading:'regular',blocker:'variable',pace:'balanced',prayerTracking:false,slotOverrides:{},slotSuggestionSnooze:{}};
const check={minutes:20,energy:3,load:3,mood:'normal',context:'normal'};

const record=(date,{quranDone=false,readingDone=true,quranSlot='morning',readingSlot='evening'}={})=>({
  date,
  done:[...(quranDone?['quran']:[]),...(readingDone?['reading']:[])],
  feedback:'ideal',taskFeedback:{},
  route:{tasks:[{id:'quran',slot:quranSlot,duration:6},{id:'reading',slot:readingSlot,duration:7}]}
});

{
 const r=buildRoute({date:TODAY,profile,checkin:check,records:[]});
 for(const task of r.tasks){
   assert.ok(task.slot,'every task has a time slot');
   assert.ok(TASK_CATALOG[task.id].allowedSlots.includes(task.slot),'assigned slot is allowed for task');
 }
}

{
 const records=[1,2,3,4].map(i=>record(dayAdd(TODAY,-i),{quranDone:i===4,readingDone:true}));
 const m=timeSlotLearning({records,today:TODAY,profile});
 const s=m.suggestions.find(x=>x.taskId==='quran');
 assert.ok(s,'repeated morning friction should create a suggestion');
 assert.equal(s.from,'morning');
 assert.equal(s.to,'evening');
 assert.ok(s.currentSamples>=3);
 assert.ok(s.currentCompletion<=.5);
 assert.ok(s.targetCompletion>=.65);
}

{
 const records=[1,2].map(i=>record(dayAdd(TODAY,-i),{quranDone:false,readingDone:true}));
 const m=timeSlotLearning({records,today:TODAY,profile});
 assert.ok(!m.suggestions.some(x=>x.taskId==='quran'),'fewer than 3 attempts must not trigger a move');
}

{
 const records=[1,2,3,4].map(i=>record(dayAdd(TODAY,-i),{quranDone:false,readingDone:true}));
 const moved={...profile,slotOverrides:{quran:'evening'}};
 const r=buildRoute({date:TODAY,profile:moved,checkin:check,records});
 const q=r.tasks.find(x=>x.id==='quran');
 if(q)assert.equal(q.slot,'evening','accepted override must be applied');
 assert.ok(!r.timeSuggestions.some(x=>x.taskId==='quran'&&x.from==='morning'),'engine must not keep suggesting obsolete morning slot after acceptance');
}

{
 const records=[1,2,3,4].map(i=>record(dayAdd(TODAY,-i),{quranDone:false,readingDone:true}));
 const snoozed={...profile,slotSuggestionSnooze:{quran:dayAdd(TODAY,7)}};
 const m=timeSlotLearning({records,today:TODAY,profile:snoozed});
 assert.ok(!m.suggestions.some(x=>x.taskId==='quran'),'snoozed suggestion stays quiet');
}

{
 const records=[
   record(dayAdd(TODAY,-1),{quranDone:false,readingDone:false}),
   record(dayAdd(TODAY,-2),{quranDone:false,readingDone:false}),
   record(dayAdd(TODAY,-3),{quranDone:false,readingDone:false}),
   record(dayAdd(TODAY,-4),{quranDone:false,readingDone:false})
 ];
 const m=timeSlotLearning({records,today:TODAY,profile});
 assert.ok(!m.suggestions.some(x=>x.taskId==='quran'),'no move is recommended when alternative slot has no evidence of being better');
}

console.log('route-engine-timeslot: 6 timing-learning checks passed');
