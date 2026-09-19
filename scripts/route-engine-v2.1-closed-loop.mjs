import assert from 'node:assert/strict';
import {buildRoute,dayAdd,MODE} from '../src/route-engine.mjs';

const start='2026-06-22';
const profile={rhythm:'steady',baseMinutes:24,priorities:['quran','reading','learning'],quranLevel:'regular',reading:'regular',blocker:'variable',pace:'deep',prayerTracking:false};
const records=[],snapshots=[];

function runDay(i,{completion=1,feedback='ideal',taskFeel='normal',check={minutes:24,energy:3,load:3,mood:'normal',context:'normal'},record=true}={}){
  const date=dayAdd(start,i);
  const route=buildRoute({date,profile,checkin:check,records});
  snapshots.push({i,date,mode:route.mode,budget:route.budget,total:route.totalMinutes,analysis:route.analysis,learner:route.learner,tasks:route.tasks,invariants:route.invariants});
  if(!record)return route;
  const take=Math.max(0,Math.min(route.tasks.length,Math.round(route.tasks.length*completion)));
  const done=route.tasks.slice(0,take).map(x=>x.id);
  const taskFeedback={};for(const id of done)taskFeedback[id]=taskFeel;
  records.push({date,route,done,feedback,taskFeedback,checkin:check});
  return route;
}

// Build a genuinely strong, current baseline.
for(let i=0;i<28;i++)runDay(i,{completion:i<4?.75:1,feedback:i<4?'ideal':'easy',taskFeel:i<4?'normal':'easy'});
assert.ok(snapshots.slice(12,28).some(x=>x.mode===MODE.DEEPEN),'sustained fresh evidence should eventually earn deepening');

// User disappears for 14 calendar days: no records are created.
const beforeGapRecords=records.length;
for(let i=28;i<42;i++){
  // no app open, no generated route and no record
}
assert.equal(records.length,beforeGapRecords);

// First day back must not inherit the old deep dose as if nothing happened.
const firstBack=runDay(42,{completion:1,feedback:'ideal',taskFeel:'normal'});
assert.notEqual(firstBack.mode,MODE.DEEPEN,'long inactivity must suspend deepening');
assert.ok(firstBack.analysis.revalidationRoutines.length>=1,'old routines should require revalidation');
assert.ok(firstBack.tasks.some(t=>t.returnDue&&t.variant==='micro'),'at least one established routine should use gentle return');
assert.equal(firstBack.invariants.returnSafety,true);

// Rebuild current evidence gradually.
for(let i=43;i<58;i++)runDay(i,{completion:1,feedback:'ideal',taskFeel:i>=50?'easy':'normal'});
const rebuilt=snapshots.filter(x=>x.i>=49&&x.i<58);
assert.ok(rebuilt.some(x=>x.analysis.verifiedRoutines.length>=1),'recent evidence should reverify routines');
assert.ok(rebuilt.some(x=>x.analysis.evidenceFreshness>=68),'freshness should recover with real use');

// A later sustained strong phase may earn deepening again.
for(let i=58;i<70;i++)runDay(i,{completion:1,feedback:'easy',taskFeel:'easy',check:{minutes:24,energy:4,load:2,mood:'motivated',context:'normal'}});
assert.ok(snapshots.filter(x=>x.i>=58&&x.i<70).some(x=>x.mode===MODE.DEEPEN),'deepening may return only after revalidation');

// A real lower-capacity period should still override the old strong history.
for(let i=70;i<80;i++)runDay(i,{completion:.35,feedback:'heavy',taskFeel:'hard',check:{minutes:24,energy:2,load:5,mood:'low',context:'busy'}});
assert.ok(snapshots.filter(x=>x.i>=72&&x.i<80).some(x=>x.mode===MODE.RECOVERY),'repeated current friction should trigger recovery');

// Safety invariants across every generated route.
assert.ok(snapshots.every(x=>x.invariants.withinBudget&&x.invariants.uniqueTasks&&x.invariants.returnSafety));
assert.ok(snapshots.every(x=>x.total<=x.budget&&x.budget<=24));
assert.ok(snapshots.every(x=>x.analysis.engineVersion==='2.1'));

console.log('route-engine-v2.1-closed-loop: inactivity -> revalidation -> rebuild -> deepening -> recovery passed');
