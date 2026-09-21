import assert from 'node:assert/strict';
import {
  emptyReadingRecommendationMemory,normalizeReadingRecommendationMemory,
  startReadingRecommendation,skipReadingRecommendation,completeReadingRecommendation,
  recommendationPreferenceSignal,isMeaningfulRecommendationSession
} from '../src/reading-recommendation-memory.mjs';

const rec={bookId:'islam-dini',kind:'book',title:'İslâm Dini',minutes:8,rank:1};
let state=emptyReadingRecommendationMemory();
assert.deepEqual(state,{active:null,history:[]});
assert.equal(isMeaningfulRecommendationSession({minutes:1,pages:0}),false);
assert.equal(isMeaningfulRecommendationSession({minutes:2,pages:0}),true);
assert.equal(isMeaningfulRecommendationSession({minutes:1,pages:1}),true);

state=startReadingRecommendation(state,rec,{date:'2026-09-21',at:'2026-09-21T18:00:00Z'});
assert.equal(state.active.bookId,'islam-dini');
assert.equal(state.active.recommendedMinutes,8);

state=completeReadingRecommendation(state,{bookId:'islam-dini',date:'2026-09-21',minutes:6,feedback:'ideal',at:'2026-09-21T18:06:00Z'});
assert.equal(state.active,null);
assert.equal(state.history[0].status,'completed');
assert.equal(state.history[0].actualMinutes,6);

state=skipReadingRecommendation(state,rec,{date:'2026-09-22',at:'2026-09-22T18:00:00Z'});
state=skipReadingRecommendation(state,rec,{date:'2026-09-22',at:'2026-09-22T18:01:00Z'});
assert.equal(state.history.filter(x=>x.status==='skipped'&&x.date==='2026-09-22').length,1,'same-day repeated alternate clicks must not multiply negative evidence');

state=skipReadingRecommendation(state,rec,{date:'2026-09-23',at:'2026-09-23T18:00:00Z'});
state=skipReadingRecommendation(state,rec,{date:'2026-09-24',at:'2026-09-24T18:00:00Z'});
const negative=recommendationPreferenceSignal(state,'islam-dini','2026-09-25');
assert.ok(negative.adjustment<0,'repeated explicit skips should create a modest negative selection signal');
assert.ok(negative.reason?.includes('başka öneri'));

let positive=emptyReadingRecommendationMemory();
for(const [date,feedback] of [['2026-09-20','ideal'],['2026-09-21','easy']]){
  positive=startReadingRecommendation(positive,rec,{date,at:`${date}T18:00:00Z`});
  positive=completeReadingRecommendation(positive,{bookId:'islam-dini',date,minutes:8,feedback,at:`${date}T18:08:00Z`});
}
const signal=recommendationPreferenceSignal(positive,'islam-dini','2026-09-22');
assert.ok(signal.adjustment>0,'repeated completed recommendations should create a positive selection signal');
assert.ok(signal.reason?.includes('devam'));

let kindMemory=emptyReadingRecommendationMemory();
const review={bookId:'kirk-hadis',kind:'hadith-review',title:'1 kısa hadis tekrarı',minutes:4,rank:1};
for(const date of ['2026-09-20','2026-09-21']){
  kindMemory=startReadingRecommendation(kindMemory,review,{date,at:date+'T18:00:00Z'});
  kindMemory=completeReadingRecommendation(kindMemory,{bookId:'kirk-hadis',date,minutes:4,feedback:'ideal',at:date+'T18:04:00Z'});
}
assert.ok(recommendationPreferenceSignal(kindMemory,'kirk-hadis','2026-09-22','hadith-review').adjustment>0);
assert.equal(recommendationPreferenceSignal(kindMemory,'kirk-hadis','2026-09-22','hadith').adjustment,0,'review completion must not leak into new-hadith selection preference');

const normalized=normalizeReadingRecommendationMemory({active:{bad:true},history:[{status:'nonsense'}]});
assert.deepEqual(normalized,{active:null,history:[]});

console.log('reading-recommendation-memory: start, skip, completion, kind isolation and preference learning passed');
