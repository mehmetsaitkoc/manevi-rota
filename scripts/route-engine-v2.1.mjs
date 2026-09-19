import assert from 'node:assert/strict';
import {
  buildRoute,dayAdd,evidenceFreshness,routineMemory,interventionEffectModel,
  MODE,EVIDENCE_STATUS,ROUTINE_VERIFICATION,ROUTINE_STATE
} from '../src/route-engine.mjs';

const TODAY='2026-09-19';
const profile={rhythm:'steady',baseMinutes:24,priorities:['quran','reading','learning'],quranLevel:'regular',reading:'regular',blocker:'none',pace:'deep',prayerTracking:false};
const check={minutes:24,energy:3,load:3,mood:'normal',context:'normal'};

function rec(daysAgo,{tasks=['quran'],done=tasks,feedback='ideal',taskFeedback={},minutes=12,interventions={},contexts={},checkin=check}={}){
  const date=dayAdd(TODAY,-daysAgo);
  return {
    date,done,feedback,taskFeedback,checkin,
    route:{totalMinutes:minutes,tasks:tasks.map(id=>({id,duration:Math.max(2,Math.floor(minutes/tasks.length)),intervention:interventions[id]||'none',policyContext:contexts[id]}))}
  };
}

// 1 — evidence freshness must decay monotonically.
assert.ok(evidenceFreshness(1)>evidenceFreshness(10));
assert.ok(evidenceFreshness(10)>evidenceFreshness(30));

// 2 — seven recent, spread-out successful exposures can verify a routine.
{
  const rs=[];for(let d=7;d>=1;d--)rs.push(rec(d,{taskFeedback:{quran:'easy'}}));
  const m=routineMemory(rs,TODAY).quran;
  assert.equal(m.verified,true);
  assert.equal(m.verification,ROUTINE_VERIFICATION.VERIFIED);
  assert.equal(m.evidenceStatus,EVIDENCE_STATUS.FRESH);
  assert.ok(m.evidenceSpanDays>=7);
}

// 3 — five concentrated good days are promising, but not yet verified.
{
  const rs=[];for(let d=5;d>=1;d--)rs.push(rec(d,{taskFeedback:{quran:'easy'}}));
  const m=routineMemory(rs,TODAY).quran;
  assert.equal(m.verified,false);
  assert.equal(m.verification,ROUTINE_VERIFICATION.BUILDING);
  assert.notEqual(m.state,ROUTINE_STATE.GROWTH);
}

// 4 — high completion with repeated hard feedback cannot be called verified.
{
  const rs=[];for(let d=8;d>=1;d--)rs.push(rec(d,{taskFeedback:{quran:'hard'}}));
  const m=routineMemory(rs,TODAY).quran;
  assert.equal(m.verified,false);
  assert.equal(m.state,ROUTINE_STATE.FRAGILE);
}

// 5 — old strong evidence becomes revalidation, not current growth.
{
  const rs=[];for(let d=34;d>=25;d--)rs.push(rec(d,{taskFeedback:{quran:'easy'}}));
  const m=routineMemory(rs,TODAY).quran;
  assert.equal(m.verification,ROUTINE_VERIFICATION.REVALIDATE);
  assert.equal(m.state,ROUTINE_STATE.RETURN);
  assert.equal(m.evidenceStatus,EVIDENCE_STATUS.STALE);
}

// 6 — stale historic strength alone cannot unlock deepening.
{
  const rs=[];for(let d=34;d>=25;d--)rs.push(rec(d,{tasks:['quran','reading','learning'],done:['quran','reading','learning'],feedback:'easy',taskFeedback:{quran:'easy',reading:'easy',learning:'easy'},minutes:24}));
  const r=buildRoute({date:TODAY,profile,checkin:{...check,energy:4,load:2},records:rs});
  assert.notEqual(r.mode,MODE.DEEPEN);
  assert.ok(r.analysis.evidenceFreshness<70);
  assert.ok(r.analysis.revalidationRoutines.length>=1);
}

// 7 — fresh sustained evidence can still earn deepening.
{
  const rs=[];for(let d=8;d>=1;d--)rs.push(rec(d,{tasks:['quran','reading','learning'],done:['quran','reading','learning'],feedback:'easy',taskFeedback:{quran:'easy',reading:'easy',learning:'easy'},minutes:24}));
  const r=buildRoute({date:TODAY,profile,checkin:{...check,energy:4,load:2},records:rs});
  assert.equal(r.mode,MODE.DEEPEN);
  assert.ok(r.analysis.verifiedRoutines.includes('quran'));
  assert.ok(r.analysis.evidenceFreshness>=70);
}

function appendCycle(rs,startDay,{helpful,context,kind='micro-dose'}){
  const baseDone=helpful?[]:['quran'];
  const afterDone=helpful?['quran']:[];
  rs.push(rec(startDay,{done:baseDone,taskFeedback:{quran:helpful?'normal':'easy'}}));
  rs.push(rec(startDay-1,{done:baseDone,taskFeedback:{quran:helpful?'normal':'easy'}}));
  rs.push(rec(startDay-2,{done:afterDone,taskFeedback:{quran:helpful?'normal':'hard'},interventions:{quran:kind},contexts:{quran:context}}));
  rs.push(rec(startDay-3,{done:afterDone,taskFeedback:{quran:helpful?'easy':'hard'}}));
  rs.push(rec(startDay-4,{done:afterDone,taskFeedback:{quran:helpful?'easy':'hard'}}));
}

// 8 — the same intervention can learn different policies in different contexts.
{
  const rs=[];
  appendCycle(rs,30,{helpful:true,context:'low-capacity'});
  appendCycle(rs,25,{helpful:true,context:'low-capacity'});
  appendCycle(rs,20,{helpful:true,context:'low-capacity'});
  appendCycle(rs,15,{helpful:false,context:'normal'});
  appendCycle(rs,10,{helpful:false,context:'normal'});
  appendCycle(rs,5,{helpful:false,context:'normal'});
  const m=interventionEffectModel(rs,TODAY).quran['micro-dose'];
  assert.equal(m.contexts['low-capacity'].policy,'repeat');
  assert.equal(m.contexts.normal.policy,'change');
  assert.notEqual(m.contexts['low-capacity'].averageEffect,m.contexts.normal.averageEffect);
}

// 9 — intervention evidence itself ages and must be revalidated.
{
  const rs=[];
  appendCycle(rs,55,{helpful:true,context:'low-capacity'});
  appendCycle(rs,50,{helpful:true,context:'low-capacity'});
  appendCycle(rs,45,{helpful:true,context:'low-capacity'});
  const m=interventionEffectModel(rs,TODAY).quran['micro-dose'];
  assert.equal(m.policy,'revalidate');
  assert.ok(m.latestAgeDays>24);
}

// 10 — current low-capacity routes expose the context used for policy lookup.
{
  const rs=[];for(let d=7;d>=1;d--)rs.push(rec(d,{tasks:['quran','reading'],done:d%2?['quran']:[],taskFeedback:{quran:'hard',reading:'hard'},minutes:12}));
  const r=buildRoute({date:TODAY,profile:{...profile,priorities:['quran','reading']},checkin:{...check,energy:2,load:5,context:'busy'},records:rs});
  assert.ok(r.tasks.length);
  assert.ok(r.tasks.every(t=>typeof t.interventionPolicyContext==='string'));
  assert.ok(r.tasks.some(t=>t.interventionPolicyContext==='low-capacity'));
}

// 11 — a route task exposes verification and freshness for auditability.
{
  const rs=[];for(let d=8;d>=1;d--)rs.push(rec(d,{taskFeedback:{quran:'easy'}}));
  const r=buildRoute({date:TODAY,profile:{...profile,priorities:['quran']},checkin:check,records:rs});
  const q=r.tasks.find(t=>t.id==='quran');
  assert.ok(q);
  for(const key of ['routineVerification','routineVerified','routineEvidenceStatus','routineEvidenceFreshness'])assert.ok(Object.prototype.hasOwnProperty.call(q,key));
}

// 12 — analysis exposes freshness, effective evidence and verification lists.
{
  const rs=[];for(let d=8;d>=1;d--)rs.push(rec(d,{tasks:['quran','reading'],done:['quran','reading'],taskFeedback:{quran:'easy',reading:'easy'}}));
  const r=buildRoute({date:TODAY,profile,checkin:check,records:rs});
  for(const key of ['effectiveEvidenceDays','evidenceFreshness','evidenceStatus','verifiedRoutines','revalidationRoutines'])assert.ok(Object.prototype.hasOwnProperty.call(r.analysis,key));
  assert.equal(r.analysis.engineVersion,'2.1');
}

// 13 — old evidence keeps some reference value but reduces effective evidence.
{
  const rs=[];for(let d=30;d>=21;d--)rs.push(rec(d,{taskFeedback:{quran:'easy'}}));
  const r=buildRoute({date:TODAY,profile,checkin:check,records:rs});
  assert.ok(r.analysis.effectiveEvidenceDays<r.analysis.evidenceDays);
  assert.ok(r.analysis.priorWeight>10);
}

// 14 — return safety remains intact under the new verification layer.
{
  const rs=[];for(let d=18;d>=11;d--)rs.push(rec(d,{taskFeedback:{quran:'easy'}}));
  const r=buildRoute({date:TODAY,profile:{...profile,priorities:['quran']},checkin:check,records:rs});
  const q=r.tasks.find(t=>t.id==='quran');
  assert.ok(q);
  assert.equal(q.returnDue,true);
  assert.equal(q.variant,'micro');
  assert.equal(r.invariants.returnSafety,true);
}

// 15 — core safety remains: no route exceeds its budget.
{
  const rs=[];for(let d=12;d>=1;d--)rs.push(rec(d,{tasks:['quran','meal','reading','learning'],done:['quran','meal','reading','learning'],feedback:'easy',taskFeedback:{quran:'easy',meal:'easy',reading:'easy',learning:'easy'},minutes:30}));
  const r=buildRoute({date:TODAY,profile:{...profile,baseMinutes:45},checkin:{...check,minutes:45,energy:5,load:1,context:'rest'},records:rs});
  assert.ok(r.totalMinutes<=r.budget);
  assert.equal(r.invariants.uniqueTasks,true);
}

console.log('route-engine-v2.1: 15 evidence-decay/verification/context-policy checks passed');
