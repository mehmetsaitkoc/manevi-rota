import assert from 'node:assert/strict';
import {emptyKirkHadisState,recordHadisSession,dueReviews,recordRecallAttempt,knowledgeSignal,knowledgeOverview,addHadisNote,addDays} from '../src/kirk-hadis.mjs';

const d0='2026-09-19';

// 1) Fresh read is building, not mastered.
{
  const s=emptyKirkHadisState();
  recordHadisSession(s,{hadisId:1,date:d0,minutes:9,feedback:'ideal',completed:true});
  const k=knowledgeSignal(s,1,d0);
  assert.equal(k.key,'building');
  assert.equal(k.label,'Pekişiyor');
}

// 2) Overdue review must surface as recall-needed.
{
  const s=emptyKirkHadisState();
  recordHadisSession(s,{hadisId:1,date:d0,minutes:9,feedback:'ideal',completed:true});
  const k=knowledgeSignal(s,1,addDays(d0,4));
  assert.equal(k.key,'recall');
  assert.equal(k.overdue,1);
}

// 3) Hard day-3 recall creates a next-day recovery review.
{
  const s=emptyKirkHadisState();
  recordHadisSession(s,{hadisId:1,date:d0,minutes:9,feedback:'ideal',completed:true});
  const r=dueReviews(s,addDays(d0,3),5)[0];
  recordRecallAttempt(s,{reviewId:r.id,today:addDays(d0,3),text:'Niyet amelin yönünü belirler.',result:'hard'});
  const recovery=s.reviews.find(x=>x.kind==='recovery'&&!x.done);
  assert.ok(recovery);
  assert.equal(recovery.dueDate,addDays(d0,4));
  const k=knowledgeSignal(s,1,addDays(d0,3));
  assert.equal(k.key,'repair');
}

// 4) Recovery recall can be completed without deleting the original 7-day wave.
{
  const s=emptyKirkHadisState();
  recordHadisSession(s,{hadisId:1,date:d0,minutes:9,feedback:'ideal',completed:true});
  const r3=dueReviews(s,addDays(d0,3),5)[0];
  recordRecallAttempt(s,{reviewId:r3.id,today:addDays(d0,3),text:'Niyet.',result:'forgot'});
  const recovery=dueReviews(s,addDays(d0,4),5)[0];
  assert.equal(recovery.kind,'recovery');
  recordRecallAttempt(s,{reviewId:recovery.id,today:addDays(d0,4),text:'Amelin yönünü niyet belirler.',result:'remembered'});
  assert.ok(s.reviews.some(x=>Number(x.wave)===7&&!x.done));
}

// 5) Remembered 3- and 7-day recalls produce stable evidence.
{
  const s=emptyKirkHadisState();
  recordHadisSession(s,{hadisId:1,date:d0,minutes:9,feedback:'ideal',completed:true});
  let r=dueReviews(s,addDays(d0,3),5).find(x=>Number(x.wave)===3);
  recordRecallAttempt(s,{reviewId:r.id,today:addDays(d0,3),text:'Niyet.',result:'remembered'});
  r=dueReviews(s,addDays(d0,7),5).find(x=>Number(x.wave)===7);
  recordRecallAttempt(s,{reviewId:r.id,today:addDays(d0,7),text:'Niyet amelin yönünü belirler.',result:'remembered'});
  const k=knowledgeSignal(s,1,addDays(d0,7));
  assert.equal(k.key,'stable');
  assert.equal(k.label,'Oturuyor');
}

// 6) Recall text is preserved as learner-owned evidence.
{
  const s=emptyKirkHadisState();
  recordHadisSession(s,{hadisId:1,date:d0,minutes:9,feedback:'ideal',completed:true});
  const r=dueReviews(s,addDays(d0,3),5)[0];
  recordRecallAttempt(s,{reviewId:r.id,today:addDays(d0,3),text:'Kendi cümlemle ana fikir.',result:'remembered'});
  assert.equal(s.recalls.length,1);
  assert.equal(s.recalls[0].text,'Kendi cümlemle ana fikir.');
}

// 7) Notebook tags are kept separately; the app can distinguish research/action notes.
{
  const s=emptyKirkHadisState();
  addHadisNote(s,{hadisId:1,text:'Bu kavramı ayrıca araştır.',date:d0,tag:'research'});
  addHadisNote(s,{hadisId:1,text:'Başlamadan önce niyet et.',date:d0,tag:'practice'});
  assert.deepEqual(s.notes.map(x=>x.tag),['research','practice']);
}

// 8) Overview has one row for each active starter unit and does not invent mastery.
{
  const s=emptyKirkHadisState();
  const o=knowledgeOverview(s,d0);
  assert.equal(o.length,42);
  assert.ok(o.every(x=>x.key==='new'));
}

console.log('kirk-hadis-learning: active recall + knowledge memory + recovery + note tags passed');
