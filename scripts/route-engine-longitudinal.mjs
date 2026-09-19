import assert from 'node:assert/strict';
import {buildRoute,dayAdd,MODE} from '../src/route-engine.mjs';

const profile={baseMinutes:20,priorities:['quran','reading','learning'],quranLevel:'rare',reading:'rare',blocker:'variable',pace:'deep',prayerTracking:true};
const records=[];const start='2026-09-01';let modes=[];let totals=[];
for(let i=0;i<14;i++){
 const date=dayAdd(start,i);
 const check={minutes:20,energy:i<3?2:4,load:i<3?4:2,mood:i<3?'low':'motivated',context:'normal'};
 const route=buildRoute({date,profile,checkin:check,records});
 modes.push(route.mode);totals.push(route.totalMinutes);
 const success=i<3?.45:i<7?.75:.95;
 const done=route.tasks.slice(0,Math.max(1,Math.round(route.tasks.length*success))).map(x=>x.id);
 const taskFeedback={};if(i>=8)for(const id of done)taskFeedback[id]='easy';
 records.push({date,route,done,feedback:i<2?'heavy':i>=8?'easy':'ideal',taskFeedback});
}
assert.ok(modes.slice(0,3).includes(MODE.COLLECT),'starts by collecting evidence');
assert.ok(modes.includes(MODE.RECOVERY)||modes.includes(MODE.BALANCED),'adapts after evidence');
assert.ok(modes.slice(-5).includes(MODE.DEEPEN),'eventually allows earned deepening');
assert.ok(totals.every((x,i)=>x<=records[i].route.budget),'every day respects budget');
assert.ok(totals.every(x=>x<=20),'never exceeds stated 20-minute availability');
console.log('route-engine-longitudinal: 14-day adaptation simulation passed');
