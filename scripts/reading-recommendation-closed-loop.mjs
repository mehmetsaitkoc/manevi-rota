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

console.log('reading-recommendation-closed-loop: recommendation -> real session -> next-day adaptation passed');
