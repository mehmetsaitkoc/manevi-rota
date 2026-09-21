import assert from 'node:assert/strict';
import {buildReadingRecommendation} from '../src/reading-recommendation.mjs';
import {emptyKirkHadisState} from '../src/kirk-hadis.mjs';
import {beginBookReadingSession,touchBookReadingSession,finishBookReadingSession} from '../src/book-reader.mjs';
import {
  emptyReadingRecommendationMemory,startReadingRecommendation,completeReadingRecommendation
} from '../src/reading-recommendation-memory.mjs';

const profile={priorities:['reading','learning'],baseMinutes:15};
const checkin={minutes:15,energy:3,load:3,mood:'normal',context:'normal'};
const ilim=emptyKirkHadisState();
const library={
  quran:{surah:1,ayah:1},
  books:{'islam-dini':{page:2,totalPages:250}},
  path:{completedBooks:[],completedAt:{},acknowledgedLevel:1},
  lastBook:'islam-dini',
  recommendationMemory:emptyReadingRecommendationMemory()
};

const day1='2026-09-21';
const first=buildReadingRecommendation({date:day1,profile,checkin,library,ilim,records:[],bookTotals:{'islam-dini':250}});
assert.equal(first.bookId,'islam-dini');
assert.ok(first.minutes>=4);

library.recommendationMemory=startReadingRecommendation(library.recommendationMemory,first,{date:day1,at:day1+'T18:00:00Z'});
let reader=beginBookReadingSession(library.books['islam-dini'],{page:2,at:day1+'T18:00:00Z'});
reader=touchBookReadingSession(reader,5);
const finished=finishBookReadingSession(reader,{page:5,at:day1+'T18:09:00Z',feedback:'heavy'});
assert.equal(finished.session.minutes,9);
assert.equal(finished.session.feedback,'heavy');
library.books['islam-dini']=finished.state;
library.recommendationMemory=completeReadingRecommendation(library.recommendationMemory,{
  bookId:'islam-dini',date:day1,minutes:finished.session.minutes,feedback:finished.session.feedback,at:day1+'T18:09:00Z'
});
assert.equal(library.recommendationMemory.active,null);
assert.equal(library.recommendationMemory.history[0].status,'completed');

const day2='2026-09-22';
const second=buildReadingRecommendation({date:day2,profile,checkin,library,ilim,records:[],bookTotals:{'islam-dini':250}});
assert.equal(second.bookId,'islam-dini');
assert.ok(second.minutes<finished.session.minutes,'the next-day dose should react immediately to the latest heavy real session');
assert.ok(second.minutes<=7,'a 9-minute heavy session should return with a clearly smaller next-day dose');

library.recommendationMemory=startReadingRecommendation(library.recommendationMemory,second,{date:day2,at:day2+'T18:00:00Z'});
reader=beginBookReadingSession(library.books['islam-dini'],{page:5,at:day2+'T18:00:00Z'});
reader=touchBookReadingSession(reader,7);
const secondFinished=finishBookReadingSession(reader,{page:7,at:day2+'T18:05:00Z',feedback:'ideal'});
library.books['islam-dini']=secondFinished.state;
library.recommendationMemory=completeReadingRecommendation(library.recommendationMemory,{
  bookId:'islam-dini',date:day2,minutes:secondFinished.session.minutes,feedback:secondFinished.session.feedback,at:day2+'T18:05:00Z'
});

const day3='2026-09-23';
const third=buildReadingRecommendation({date:day3,profile,checkin,library,ilim,records:[],bookTotals:{'islam-dini':250}});
assert.equal(third.bookId,'islam-dini');
assert.ok(third.preferenceAdjustment>0,'repeated completed recommendations should become a small behavioral selection preference');
assert.ok(third.reasons.some(x=>x.includes('düzenli olarak devam')),'the learned preference must remain explainable');

const quranLibrary={
  quran:{surah:2,ayah:12},
  books:{'islam-dini':{page:2,totalPages:250}},
  path:{completedBooks:[],completedAt:{},acknowledgedLevel:1},
  lastBook:'quran',
  recommendationMemory:emptyReadingRecommendationMemory()
};
const quranRecords=[
  {date:'2026-09-20',readingSessions:[{id:'q1',taskId:'quran',bookId:'quran',minutes:9,verses:5,feedback:'heavy'}]}
];
const quranRec=buildReadingRecommendation({
  date:'2026-09-21',
  profile:{priorities:['quran'],baseMinutes:15},
  checkin,
  library:quranLibrary,
  ilim,
  records:quranRecords
});
assert.equal(quranRec.bookId,'quran');
assert.ok(quranRec.minutes<=7,'Quran recommendation should learn from its own heavy 9-minute session');
assert.ok(quranRec.reasons.some(x=>x.includes('Kur’ân oturumu ağır')));

console.log('reading-recommendation-closed-loop: recommendation -> real session -> next-day adaptation -> preference learning passed');
