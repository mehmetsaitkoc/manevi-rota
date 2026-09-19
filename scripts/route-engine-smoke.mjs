import assert from 'node:assert/strict';
import {buildRoute,historySignals,deriveMode,MODE,weeklyDigest} from '../src/route-engine.mjs';

const date='2026-09-19';
const profile={baseMinutes:20,priorities:['quran','reading','learning'],quranLevel:'rare',reading:'rare',blocker:'variable',pace:'balanced',prayerTracking:true};
const check={minutes:20,energy:3,load:3,mood:'normal',context:'normal'};
const rec=(d,done=['quran','reading'],feedback='ideal',tasks=['quran','reading','dua'],taskFeedback={})=>({date:d,done,feedback,taskFeedback,route:{tasks:tasks.map(id=>({id}))}});
const records=[rec('2026-09-18'),rec('2026-09-17'),rec('2026-09-16')];

{
 const r=buildRoute({date,profile,checkin:check,records:[]});
 assert.equal(r.mode,MODE.COLLECT);
 assert.ok(r.totalMinutes<=r.budget);
 assert.equal(r.invariants.uniqueTasks,true);
}
{
 const h=historySignals(records,date);
 assert.equal(h.evidenceDays,3);
 assert.ok(h.completion3>0);
}
{
 const r=buildRoute({date,profile,checkin:{...check,energy:1,load:5},records});
 assert.ok(r.totalMinutes<=r.budget);
 assert.ok(r.invariants.heavyCount<=1);
}
{
 const low=[rec('2026-09-18',['quran'],'heavy'),rec('2026-09-17',[],'heavy'),rec('2026-09-16',['dua'],'ideal')];
 const r=buildRoute({date,profile,checkin:check,records:low});
 assert.equal(r.mode,MODE.RECOVERY);
}
{
 const easyTasks={quran:'easy',reading:'easy',learning:'easy'};
 const strong=[
  rec('2026-09-18',['quran','reading','learning'],'easy',['quran','reading','learning'],easyTasks),
  rec('2026-09-17',['quran','reading','learning'],'ideal',['quran','reading','learning'],easyTasks),
  rec('2026-09-16',['quran','reading','learning'],'easy',['quran','reading','learning'],easyTasks),
  rec('2026-09-15',['quran','reading','learning'],'ideal',['quran','reading','learning'],easyTasks),
  rec('2026-09-14',['quran','reading','learning'],'ideal',['quran','reading','learning'],easyTasks),
  rec('2026-09-13',['quran','reading','learning'],'easy',['quran','reading','learning'],easyTasks),
  rec('2026-09-12',['quran','reading','learning'],'ideal',['quran','reading','learning'],easyTasks)
 ];
 const r=buildRoute({date,profile:{...profile,pace:'deep'},checkin:{...check,energy:4,load:2},records:strong});
 assert.equal(r.mode,MODE.DEEPEN);
}
{
 const r=buildRoute({date,profile,checkin:check,records,lightDay:true});
 assert.equal(r.mode,MODE.LIGHT);
 assert.ok(r.budget<=Math.ceil(check.minutes*.62));
}
{
 assert.equal(buildRoute({date,profile,checkin:{},records}),null);
}
{
 const future=[...records,rec('2026-09-20',[])];
 assert.equal(historySignals(future,date).evidenceDays,3);
}
{
 const d=weeklyDigest({records,today:date});
 assert.equal(d.evidenceDays,3);
 assert.ok(typeof d.next==='string');
}
console.log('route-engine-smoke: 9 checks passed');
