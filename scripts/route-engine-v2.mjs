import assert from 'node:assert/strict';
import {
  buildRoute,dayAdd,routineMemory,behaviorShiftSignal,capacityPhaseSignal,
  interventionEffectModel,ROUTINE_STATE,CAPACITY_PHASE,BEHAVIOR_SHIFT,MODE
} from '../src/route-engine.mjs';

const TODAY='2026-09-19';
const profile={rhythm:'steady',baseMinutes:20,priorities:['quran','meal','reading'],quranLevel:'regular',reading:'regular',blocker:'none',pace:'balanced',prayerTracking:false};
const check={minutes:20,energy:3,load:3,mood:'normal',context:'normal'};

function record(date,{tasks=['quran'],done=tasks,feedback='ideal',taskFeedback={},minutes=12,checkin=check,interventions={}}={}){
  return {
    date,done,feedback,taskFeedback,checkin,
    route:{totalMinutes:minutes,tasks:tasks.map(id=>({id,duration:Math.max(3,Math.floor(minutes/tasks.length)),intervention:interventions[id]||'none'}))}
  };
}
function daysAgo(n,opts){return record(dayAdd(TODAY,-n),opts)}

// 1 — An established routine with a long gap must become a gentle return, not stay growth-ready.
{
  const rs=[];
  for(let d=14;d>=9;d--)rs.push(daysAgo(d,{tasks:['quran'],done:['quran'],taskFeedback:{quran:'easy'}}));
  const m=routineMemory(rs,TODAY).quran;
  assert.equal(m.established,true);
  assert.equal(m.returnDue,true);
  assert.equal(m.state,ROUTINE_STATE.RETURN);
  assert.ok(m.continuity<m.completion);
}

// 2 — A return-due priority is reintroduced only as a micro, gentle-return task.
{
  const rs=[];
  for(let d=14;d>=9;d--)rs.push(daysAgo(d,{tasks:['quran'],done:['quran'],taskFeedback:{quran:'easy'}}));
  const r=buildRoute({date:TODAY,profile,checkin:check,records:rs});
  const q=r.tasks.find(x=>x.id==='quran');
  assert.ok(q,'quran should re-enter');
  assert.equal(q.returnDue,true);
  assert.equal(q.variant,'micro');
  assert.equal(q.intervention,'gentle-return');
  assert.equal(r.invariants.returnSafety,true);
}

// 3 — Old strength cannot by itself unlock deepening after a long gap.
{
  const rs=[];
  for(let d=16;d>=10;d--)rs.push(daysAgo(d,{tasks:['quran','reading'],done:['quran','reading'],feedback:'easy',taskFeedback:{quran:'easy',reading:'easy'}}));
  const r=buildRoute({date:TODAY,profile:{...profile,pace:'deep'},checkin:{...check,energy:4,load:2},records:rs});
  assert.notEqual(r.mode,MODE.DEEPEN);
  assert.ok(r.analysis.returnAreas.length>=1);
}

// 4 — Recent behavior deterioration must be detected against the user's own baseline.
{
  const rs=[];
  for(let d=10;d>=5;d--)rs.push(daysAgo(d,{tasks:['quran','meal','reading','dua'],done:['quran','meal','reading','dua'],minutes:20}));
  for(let d=4;d>=1;d--)rs.push(daysAgo(d,{tasks:['quran','meal','reading','dua'],done:['quran'],feedback:d<=2?'heavy':'ideal',minutes:20}));
  const s=behaviorShiftSignal(rs,TODAY);
  assert.equal(s.state,BEHAVIOR_SHIFT.DOWN);
  const r=buildRoute({date:TODAY,profile,checkin:check,records:rs});
  assert.equal(r.mode,MODE.RECOVERY);
}

// 5 — Positive change is recognized but does not bypass evidence gates.
{
  const rs=[];
  for(let d=10;d>=5;d--)rs.push(daysAgo(d,{tasks:['quran','meal','reading','dua'],done:['quran'],minutes:20}));
  for(let d=4;d>=1;d--)rs.push(daysAgo(d,{tasks:['quran','meal','reading','dua'],done:['quran','meal','reading','dua'],minutes:20}));
  const s=behaviorShiftSignal(rs,TODAY);
  assert.equal(s.state,BEHAVIOR_SHIFT.UP);
  const r=buildRoute({date:TODAY,profile:{...profile,priorities:['quran','meal']},checkin:check,records:rs});
  assert.ok([MODE.BALANCED,MODE.DEEPEN].includes(r.mode));
  assert.ok(r.totalMinutes<=r.requestedMinutes);
}

// 6 — A lower-capacity period must be recognized from repeated deterioration, not one day.
{
  const rs=[];
  for(let d=15;d>=6;d--)rs.push(daysAgo(d,{tasks:['quran','meal','reading'],done:['quran','meal','reading'],minutes:24,checkin:{...check,energy:4,load:2}}));
  for(let d=5;d>=1;d--)rs.push(daysAgo(d,{tasks:['quran','meal','reading'],done:d%2?['quran']:['quran','meal'],feedback:d<=3?'heavy':'ideal',minutes:20,checkin:{...check,energy:2,load:5,mood:'low',context:'busy'}}));
  const c=capacityPhaseSignal(rs,TODAY);
  assert.equal(c.phase,CAPACITY_PHASE.LOWER);
  const r=buildRoute({date:TODAY,profile:{...profile,baseMinutes:30},checkin:{...check,minutes:30},records:rs});
  assert.equal(r.analysis.capacityPhase,CAPACITY_PHASE.LOWER);
  assert.equal(r.mode,MODE.RECOVERY);
  assert.ok(r.budget<30);
}

// 7 — Capacity phase is not inferred from a tiny sample.
{
  const rs=[daysAgo(2,{tasks:['quran'],done:[]}),daysAgo(1,{tasks:['quran'],done:[]})];
  const c=capacityPhaseSignal(rs,TODAY);
  assert.equal(c.phase,CAPACITY_PHASE.UNKNOWN);
  assert.equal(c.known,false);
}

function makeInterventionCycles(kind,helpful=true){
  const rs=[];let day=30;
  for(let cycle=0;cycle<3;cycle++){
    // two-item baseline before each intervention
    rs.push(daysAgo(day--,{tasks:['quran'],done:helpful?[]:['quran']}));
    rs.push(daysAgo(day--,{tasks:['quran'],done:helpful?[]:['quran']}));
    rs.push(daysAgo(day--,{tasks:['quran'],done:helpful?['quran']:[],taskFeedback:{quran:helpful?'normal':'hard'},interventions:{quran:kind}}));
    rs.push(daysAgo(day--,{tasks:['quran'],done:helpful?['quran']:[],taskFeedback:{quran:helpful?'normal':'hard'}}));
    rs.push(daysAgo(day--,{tasks:['quran'],done:helpful?['quran']:[],taskFeedback:{quran:helpful?'easy':'hard'}}));
  }
  return rs;
}

// 8 — Repeated helpful micro-dose interventions become a repeat policy.
{
  const m=interventionEffectModel(makeInterventionCycles('micro-dose',true),TODAY).quran['micro-dose'];
  assert.ok(m.samples>=3);
  assert.equal(m.policy,'repeat');
  assert.ok(m.averageEffect>0);
}

// 9 — Repeated harmful interventions become a change policy.
{
  const m=interventionEffectModel(makeInterventionCycles('controlled-deepen',false),TODAY).quran['controlled-deepen'];
  assert.ok(m.samples>=3);
  assert.equal(m.policy,'change');
  assert.ok(m.averageEffect<0);
}

// 10 — Intervention policy cannot flip on one anecdote.
{
  const rs=[
    daysAgo(6,{tasks:['quran'],done:[]}),daysAgo(5,{tasks:['quran'],done:[]}),
    daysAgo(4,{tasks:['quran'],done:['quran'],interventions:{quran:'micro-dose'}}),
    daysAgo(3,{tasks:['quran'],done:['quran']}),daysAgo(2,{tasks:['quran'],done:['quran']})
  ];
  const m=interventionEffectModel(rs,TODAY).quran['micro-dose'];
  assert.equal(m.samples,1);
  assert.equal(m.policy,'collect');
}

// 11 — Fragile routines are not hammered every day; frequency protection is learned.
{
  const rs=[];
  for(let d=6;d>=1;d--)rs.push(daysAgo(d,{tasks:['quran'],done:d===5?['quran']:[],taskFeedback:{quran:'hard'}}));
  const m=routineMemory(rs,TODAY).quran;
  assert.equal(m.state,ROUTINE_STATE.FRAGILE);
  assert.equal(m.frequencyReady,false);
}

// 12 — Routine memory uses per-routine evidence, not a global user label.
{
  const rs=[];
  for(let d=8;d>=1;d--){
    rs.push(daysAgo(d,{tasks:['quran','reading'],done:['quran'],taskFeedback:{quran:'easy',reading:'hard'}}));
  }
  const m=routineMemory(rs,TODAY);
  assert.ok(m.quran.completion>.9);
  assert.ok(m.reading.completion<.1);
  assert.notEqual(m.quran.state,m.reading.state);
}

// 13 — The analysis object exposes the new auditable v2 decisions.
{
  const rs=[];for(let d=8;d>=1;d--)rs.push(daysAgo(d,{tasks:['quran','meal'],done:['quran','meal']}));
  const r=buildRoute({date:TODAY,profile,checkin:check,records:rs});
  for(const key of ['engineVersion','capacityPhase','behaviorShift','returnAreas','interventionInsights']){
    assert.ok(Object.prototype.hasOwnProperty.call(r.analysis,key),`missing analysis.${key}`);
  }
  assert.equal(r.analysis.engineVersion,'2.1');
}

console.log('route-engine-v2: 13 routine-memory/capacity/intervention checks passed');
