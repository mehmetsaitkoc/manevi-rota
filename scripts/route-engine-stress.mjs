import assert from 'node:assert/strict';
import {buildRoute,MODE,dayAdd} from '../src/route-engine.mjs';

const TODAY='2026-09-19';
const baseProfile={baseMinutes:20,priorities:['quran','meal','reading'],quranLevel:'regular',reading:'regular',blocker:'none',pace:'balanced',prayerTracking:false};
const baseCheck={minutes:20,energy:3,load:3,mood:'normal',context:'normal'};
const mk=(n,{completion=.75,feedback='ideal',taskFeedback={},tasks=['quran','meal','reading','dua']}={})=>Array.from({length:n},(_,i)=>{
 const ids=tasks;const take=Math.round(ids.length*completion);return {date:dayAdd(TODAY,-(i+1)),done:ids.slice(0,take),feedback,taskFeedback,route:{tasks:ids.map(id=>({id}))}};
});
const cases=[];
const add=(name,profile,check,records,verify,extra={})=>cases.push({name,profile:{...baseProfile,...profile},check:{...baseCheck,...check},records,verify,extra});
add('new low energy',{}, {energy:1,load:4},[],r=>{assert.equal(r.mode,MODE.COLLECT);assert.ok(r.totalMinutes<=r.budget)});
add('recovery low completion',{}, {},mk(4,{completion:.25}),r=>assert.equal(r.mode,MODE.RECOVERY));
add('recovery heavy feedback',{}, {},mk(4,{completion:.8,feedback:'heavy'}),r=>assert.equal(r.mode,MODE.RECOVERY));
add('balanced normal',{}, {},mk(5,{completion:.72}),r=>assert.equal(r.mode,MODE.BALANCED));
add('deepen earned',{pace:'deep'},{energy:4,load:2},mk(7,{completion:1,feedback:'easy',taskFeedback:{quran:'easy',meal:'easy',reading:'easy'}}),r=>assert.equal(r.mode,MODE.DEEPEN));
add('busy shrinks',{}, {context:'busy'},mk(5,{completion:.7}),r=>assert.ok(r.budget<=20));
add('travel portable',{}, {context:'travel'},mk(5,{completion:.7}),r=>assert.ok(r.tasks.some(x=>['quran','dua','akhlaq'].includes(x.id))));
add('high load calm',{}, {load:5},mk(5,{completion:.7}),r=>assert.ok(r.invariants.heavyCount<=1));
add('low energy heavy cap',{}, {energy:1},mk(5,{completion:.7}),r=>assert.ok(r.invariants.heavyCount<=1));
add('priority preserved',{priorities:['learning','quran']},{},mk(5,{completion:.7}),r=>assert.ok(r.tasks.some(x=>x.id==='learning'||x.id==='quran')));
add('prayer plan optional',{prayerTracking:true},{},mk(5,{completion:.7}),r=>assert.ok(r.tasks.some(x=>x.id==='prayerPlan')||r.tasks.length>=2));
add('no prayer task',{prayerTracking:false},{},mk(5,{completion:.7}),r=>assert.ok(!r.tasks.some(x=>x.id==='prayerPlan')));
add('time blocker decays behind behavior',{blocker:'time'},{},mk(5,{completion:.7}),r=>assert.notEqual(r.mode,MODE.RECOVERY));
add('overload blocker decays behind strong behavior',{blocker:'overload'},{},mk(5,{completion:.9}),r=>assert.notEqual(r.mode,MODE.RECOVERY));
add('five minute day',{}, {minutes:5},mk(5,{completion:.7}),r=>assert.ok(r.totalMinutes<=5));
add('sixty minute cap',{}, {minutes:60,energy:5,load:1,context:'rest'},mk(5,{completion:.9}),r=>assert.ok(r.totalMinutes<=r.budget&&r.budget<=60));
add('light day',{}, {},mk(5,{completion:.9}),r=>assert.equal(r.mode,MODE.LIGHT),{lightDay:true});
add('unique tasks',{}, {},mk(5,{completion:.7}),r=>assert.equal(new Set(r.tasks.map(x=>x.id)).size,r.tasks.length));
add('within budget',{}, {minutes:15},mk(5,{completion:.7}),r=>assert.ok(r.totalMinutes<=r.budget));
add('no false deepen with 2 days',{pace:'deep'},{energy:5,load:1},mk(2,{completion:1,feedback:'easy'}),r=>assert.notEqual(r.mode,MODE.DEEPEN));
add('no false deepen with heavy',{pace:'deep'},{energy:5,load:1},mk(6,{completion:1,feedback:'heavy'}),r=>assert.notEqual(r.mode,MODE.DEEPEN));
add('deep task bounded',{pace:'deep'},{energy:4,load:2},mk(7,{completion:1,feedback:'easy',taskFeedback:{quran:'easy',meal:'easy',reading:'easy'}}),r=>assert.ok(r.tasks.every(x=>x.duration<=15)));
add('micro on hard category',{}, {},mk(5,{completion:.4,taskFeedback:{learning:'hard'}}),r=>assert.ok(r.tasks.every(x=>x.duration>=2)));
add('no backlog explosion',{}, {},mk(7,{completion:.1}),r=>assert.ok(r.tasks.length<=5));

let passed=0;const failures=[];
for(const c of cases){try{const r=buildRoute({date:TODAY,profile:c.profile,checkin:c.check,records:c.records,...c.extra});c.verify(r);assert.equal(r.invariants.uniqueTasks,true);assert.ok(r.totalMinutes<=r.budget);passed++;}catch(e){failures.push({name:c.name,error:e.message});}}
if(failures.length)console.error(failures);
assert.equal(failures.length,0,`${failures.length} stress cases failed`);
assert.equal(passed,cases.length);
console.log(`route-engine-stress: ${passed} synthetic profiles passed`);
