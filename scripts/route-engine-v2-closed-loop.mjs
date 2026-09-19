import assert from 'node:assert/strict';
import {buildRoute,dayAdd,CAPACITY_PHASE,MODE} from '../src/route-engine.mjs';

const start='2026-07-22';
const profile={rhythm:'irregular',baseMinutes:24,priorities:['quran','reading','learning'],quranLevel:'regular',reading:'regular',blocker:'variable',pace:'deep',prayerTracking:true};
const records=[],snapshots=[];

for(let i=0;i<60;i++){
  const date=dayAdd(start,i);
  let check,completion,feedback,taskFeel='normal';
  if(i<5){check={minutes:24,energy:2,load:4,mood:'low',context:'busy'};completion=.45;feedback=i<2?'heavy':'ideal';}
  else if(i<24){check={minutes:24,energy:3,load:3,mood:'normal',context:'normal'};completion=.88;feedback='ideal';if(i>=16)taskFeel='easy';}
  else if(i<34){check={minutes:24,energy:2,load:5,mood:'low',context:'busy'};completion=.42;feedback='heavy';taskFeel='hard';}
  else if(i<49){check={minutes:24,energy:3,load:2,mood:'calm',context:'normal'};completion=.90;feedback='ideal';}
  else {check={minutes:24,energy:4,load:2,mood:'motivated',context:'rest'};completion=1;feedback='easy';taskFeel='easy';}

  const route=buildRoute({date,profile,checkin:check,records});
  const take=Math.max(0,Math.min(route.tasks.length,Math.round(route.tasks.length*completion)));
  const done=route.tasks.slice(0,take).map(x=>x.id);
  const taskFeedback={};for(const id of done)taskFeedback[id]=taskFeel;
  records.push({date,route,done,feedback,taskFeedback,checkin:check});
  snapshots.push({date,mode:route.mode,budget:route.budget,total:route.totalMinutes,capacity:route.analysis.capacityPhase,behavior:route.analysis.behaviorShift,analysis:route.analysis,invariants:route.invariants});
}

assert.ok(snapshots.slice(0,4).some(x=>x.mode===MODE.COLLECT),'must begin with evidence collection');
assert.ok(snapshots.slice(24,35).some(x=>x.mode===MODE.RECOVERY),'stress period must trigger recovery');
assert.ok(snapshots.slice(24,35).some(x=>x.capacity===CAPACITY_PHASE.LOWER),'repeated stress must register lower capacity period');
const pre=snapshots.slice(14,24).reduce((a,x)=>a+x.budget,0)/10;
const low=snapshots.slice(27,34).reduce((a,x)=>a+x.budget,0)/7;
assert.ok(low<pre,'budget should shrink during repeated lower-capacity period');
assert.ok(snapshots.slice(38,50).some(x=>x.mode===MODE.BALANCED),'recovery should return to balanced mode after evidence improves');
assert.ok(snapshots.slice(50).some(x=>x.mode===MODE.DEEPEN),'deepening should return only after sustained improvement');
assert.ok(snapshots.every(x=>x.invariants.withinBudget&&x.invariants.uniqueTasks&&x.invariants.returnSafety),'core safety invariants must hold for all 60 days');
assert.ok(snapshots.every(x=>x.total<=x.budget&&x.budget<=24),'never exceed route budget or user availability');
assert.equal(snapshots.at(-1).analysis.engineVersion,'2.1');

console.log('route-engine-v2-closed-loop: 60-day behavior/capacity recovery simulation passed');
