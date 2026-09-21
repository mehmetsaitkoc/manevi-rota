import assert from 'node:assert/strict';
import {todayExperienceSnapshot,yesterdayReadingSummary,completedRecommendationForDate,readingFeedbackLabel} from '../src/today-experience.mjs';

const memory={
  active:null,
  history:[
    {
      id:'today',date:'2026-09-21',bookId:'islam-dini',kind:'book',title:'İslâm Dini',
      recommendedMinutes:7,rank:1,status:'completed',actualMinutes:6,feedback:'ideal',createdAt:'2026-09-21T18:06:00Z'
    },
    {
      id:'yesterday',date:'2026-09-20',bookId:'islam-dini',kind:'book',title:'İslâm Dini',
      recommendedMinutes:8,rank:1,status:'completed',actualMinutes:7,feedback:'easy',createdAt:'2026-09-20T18:07:00Z'
    }
  ]
};
const records=[
  {date:'2026-09-20',readingSessions:[{bookId:'islam-dini',minutes:7,pages:4,feedback:'easy'}]}
];

assert.equal(readingFeedbackLabel('heavy'),'Ağır geldi');
assert.equal(completedRecommendationForDate(memory,'2026-09-21').actualMinutes,6);

const yesterday=yesterdayReadingSummary({memory,records,date:'2026-09-21'});
assert.equal(yesterday.hasActivity,true);
assert.equal(yesterday.minutes,7);
assert.equal(yesterday.pages,4);
assert.equal(yesterday.feedbackLabel,'Rahat geldi');
assert.equal(yesterday.verses,0);

const snapshot=todayExperienceSnapshot({memory,records,date:'2026-09-21'});
assert.equal(snapshot.primaryState,'completed');
assert.equal(snapshot.completed.title,'İslâm Dini');

const empty=todayExperienceSnapshot({memory:{active:null,history:[]},records:[],date:'2026-09-21'});
assert.equal(empty.primaryState,'recommendation');
assert.equal(empty.yesterday.hasActivity,false);
assert.equal(empty.yesterday.title,'Dün kayıtlı okuma yok');

console.log('today-experience: completion and yesterday summary passed');
