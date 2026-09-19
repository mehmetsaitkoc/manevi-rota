import assert from 'node:assert/strict';
import {buildRoute,buildStudentModel,historySignals,MODE,dayAdd} from '../src/route-engine.mjs';

const TODAY='2026-09-19';
const baseProfile={rhythm:'steady',baseMinutes:20,priorities:['quran','meal','reading'],quranLevel:'regular',reading:'regular',blocker:'none',pace:'balanced',prayerTracking:false};
const check={minutes:20,energy:3,load:3,mood:'normal',context:'normal'};
function records(n,{completion=.75,feedback='ideal',minutes=20,tasks=['quran','meal','reading','dua'],taskFeedback={}}={}){
  return Array.from({length:n},(_,i)=>{
    const take=Math.round(tasks.length*completion);
    return {date:dayAdd(TODAY,-(i+1)),done:tasks.slice(0,take),feedback,taskFeedback,checkin:{...check,minutes},route:{totalMinutes:minutes,tasks:tasks.map(id=>({id,duration:Math.max(3,Math.floor(minutes/tasks.length))}))}};
  });
}

// 1. Onboarding blocker is a prior; sustained real behavior can override it.
{
  const r=buildRoute({date:TODAY,profile:{...baseProfile,blocker:'time'},checkin:check,records:records(10,{completion:.8})});
  assert.notEqual(r.mode,MODE.RECOVERY);
  assert.ok(r.analysis.priorWeight<=10);
}

// 2. Repeated low completion is strong enough to trigger recovery.
{
  const r=buildRoute({date:TODAY,profile:baseProfile,checkin:check,records:records(4,{completion:.25})});
  assert.equal(r.mode,MODE.RECOVERY);
  assert.ok(r.analysis.recentCompletion<50);
}

// 3. Repeated heavy feedback triggers recovery even with decent completion.
{
  const r=buildRoute({date:TODAY,profile:baseProfile,checkin:check,records:records(4,{completion:.8,feedback:'heavy'})});
  assert.equal(r.mode,MODE.RECOVERY);
}

// 4. Learned sustainable dose caps a sudden jump after enough evidence.
{
  const hist=records(10,{completion:.9,minutes:15});
  const r=buildRoute({date:TODAY,profile:{...baseProfile,baseMinutes:45},checkin:{...check,minutes:45},records:hist});
  assert.ok(r.learner.sustainableMinutes>=14&&r.learner.sustainableMinutes<=16);
  assert.ok(r.budget<=Math.round(r.learner.sustainableMinutes*1.22));
}

// 5. Strong self-description cannot hide contradictory real behavior.
{
  const profile={...baseProfile,rhythm:'strong'};
  const hist=records(6,{completion:.35});
  const h=historySignals(hist,TODAY);
  const m=buildStudentModel({profile,checkin:check,history:h});
  assert.ok(m.contradictions.some(x=>x.includes('Başlangıçta güçlü düzen')));
  assert.ok(m.consistency<.7);
}

// 6. Real behavior can positively override an initially irregular self-description.
{
  const profile={...baseProfile,rhythm:'irregular'};
  const hist=records(8,{completion:1,feedback:'easy',taskFeedback:{quran:'easy',meal:'easy',reading:'easy',dua:'easy'}});
  const h=historySignals(hist,TODAY);
  const m=buildStudentModel({profile,checkin:{...check,energy:4,load:2},history:h});
  assert.ok(m.contradictions.some(x=>x.includes('beklenenden daha istikrarlı')));
  assert.ok(m.consistency>.75);
}

// 7. High load keeps cognitive-heavy work bounded.
{
  const r=buildRoute({date:TODAY,profile:{...baseProfile,priorities:['learning','reading','meal']},checkin:{...check,load:5,energy:2},records:records(7,{completion:.8})});
  assert.ok(r.invariants.heavyCount<=1);
  assert.ok(r.totalMinutes<=r.budget);
}

// 8. The engine exposes an auditable analysis object for UI and tests.
{
  const r=buildRoute({date:TODAY,profile:baseProfile,checkin:check,records:records(5,{completion:.75})});
  for(const key of ['evidenceDays','confidence','priorWeight','recentCompletion','weeklyCompletion','consistency','overloadRisk','doseRisk','decision','decisionReasons']){
    assert.ok(Object.prototype.hasOwnProperty.call(r.analysis,key),`missing analysis.${key}`);
  }
  assert.equal(r.analysis.decision,r.mode);
  assert.ok(Array.isArray(r.analysis.decisionReasons));
}

console.log('route-engine-analysis: 8 evidence/calibration checks passed');
