import assert from 'node:assert/strict';
import {ILIM_BOOKS,CONTENT_RIGHTS_REGISTRY,bookParagraphs,bookWordCount} from '../src/ilim-library.mjs';
import {defaultIlimState,buildReadingPlan,recordReadingSession,addHighlight,addNote,addHighlightToReview,dueReviews,completeReview,bookProgressPct,readingStats} from '../src/ilim-engine.mjs';

const book=ILIM_BOOKS['ilim-yoluna-giris-demo'];
assert.equal(book.chapters.length,6);
assert.equal(bookParagraphs(book).length,24);
assert.ok(bookWordCount(book)>500);
assert.equal(CONTENT_RIGHTS_REGISTRY[book.rightsId].fullTextAllowed,true);

let state=defaultIlimState();
let plan=buildReadingPlan({state,bookId:book.id,today:'2026-09-19',baseMinutes:20,availableMinutes:20});
assert.ok(plan.minutes>=5&&plan.minutes<=11,'first dose should be intentionally modest');
assert.equal(plan.startIndex,0);
assert.ok(plan.endIndex>plan.startIndex);

recordReadingSession(state,{bookId:book.id,date:'2026-09-19',plan,actualEndIndex:plan.endIndex,minutes:plan.minutes,feedback:'heavy'});
plan=buildReadingPlan({state,bookId:book.id,today:'2026-09-20',baseMinutes:20,availableMinutes:20});
recordReadingSession(state,{bookId:book.id,date:'2026-09-20',plan,actualEndIndex:plan.endIndex,minutes:plan.minutes,feedback:'heavy'});
plan=buildReadingPlan({state,bookId:book.id,today:'2026-09-21',baseMinutes:20,availableMinutes:20});
recordReadingSession(state,{bookId:book.id,date:'2026-09-21',plan,actualEndIndex:plan.startIndex,minutes:Math.max(1,plan.minutes-2),feedback:'heavy'});
const shrink=buildReadingPlan({state,bookId:book.id,today:'2026-09-22',baseMinutes:20,availableMinutes:20});
assert.ok(shrink.reasons.some(x=>/küçültüldü/.test(x)),'repeated friction should shrink dose');

const h=addHighlight(state,{bookId:book.id,paraId:'p1',start:0,end:4,text:'İlim',date:'2026-09-22'});
assert.equal(state.highlights.length,1);
addNote(state,{bookId:book.id,paraId:'p1',highlightId:h.id,text:'Bu kavramı ileride tekrar düşün.',date:'2026-09-22'});
assert.equal(state.notes.length,1);
addHighlightToReview(state,{highlightId:h.id,bookId:book.id,date:'2026-09-22'});
assert.equal(dueReviews(state,'2026-09-23').length,1);
completeReview(state,state.reviews[0].id,'2026-09-23','remembered');
assert.equal(state.reviews[0].nextDate,'2026-09-26');
assert.ok(bookProgressPct(state,book.id)>=0&&bookProgressPct(state,book.id)<=100);
assert.ok(readingStats({state,bookId:book.id,today:'2026-09-23'}).sessions===3);
console.log('ilim-engine: 14 library/planning/highlight/note/review checks passed');
