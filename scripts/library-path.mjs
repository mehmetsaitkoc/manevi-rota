import assert from 'node:assert/strict';
import {STARTER_LIBRARY} from '../src/library-catalog.mjs';
import {emptyLibraryPathState,normalizeLibraryPathState,setGenericBookCompleted,isPathBookCompleted,libraryPathSnapshot} from '../src/library-path.mjs';

assert.deepEqual(emptyLibraryPathState(),{completedBooks:[],completedAt:{}});

let state=normalizeLibraryPathState({completedBooks:['islam-dini','islam-dini','quran','bad'],completedAt:{'islam-dini':'2026-09-20T12:00:00Z'}});
assert.deepEqual(state.completedBooks,['islam-dini']);
assert.equal(state.completedAt['islam-dini'],'2026-09-20T12:00:00.000Z');

state=setGenericBookCompleted(state,'islam-dini',true,'2026-09-20T13:00:00Z');
assert.equal(state.completedBooks.includes('islam-dini'),true);
state=setGenericBookCompleted(state,'islam-dini',false);
assert.equal(state.completedBooks.includes('islam-dini'),false);
assert.equal(isPathBookCompleted({book:STARTER_LIBRARY.find(x=>x.id==='quran'),pathState:state}),false);
assert.equal(isPathBookCompleted({book:STARTER_LIBRARY.find(x=>x.id==='kirk-hadis'),pathState:state,hadithCompletedCount:41}),false);
assert.equal(isPathBookCompleted({book:STARTER_LIBRARY.find(x=>x.id==='kirk-hadis'),pathState:state,hadithCompletedCount:42}),true);

const initial=libraryPathSnapshot({pathState:state,hadithCompletedCount:0});
assert.equal(initial.totalLevels,5);
assert.equal(initial.currentLevel,1);
assert.equal(initial.levels[0].status,'current');
assert.equal(initial.levels[0].sourcePending,true,'a missing full text must never be silently treated as completed');

const completedReady=setGenericBookCompleted(state,'islam-dini',true);
const stillLevelOne=libraryPathSnapshot({pathState:completedReady,hadithCompletedCount:42});
assert.equal(stillLevelOne.currentLevel,1,'pending source must keep the level honest even if available works are complete');

console.log('library-path: five-level soft progression and source-honesty checks passed');
