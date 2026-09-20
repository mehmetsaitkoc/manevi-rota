import assert from 'node:assert/strict';
import {STARTER_LIBRARY} from '../src/library-catalog.mjs';
import {emptyLibraryPathState,normalizeLibraryPathState,setGenericBookCompleted,isPathBookCompleted,libraryPathSnapshot,acknowledgeLibraryLevel} from '../src/library-path.mjs';

assert.deepEqual(emptyLibraryPathState(),{completedBooks:[],completedAt:{},acknowledgedLevel:1});

let state=normalizeLibraryPathState({completedBooks:['islam-dini','islam-dini','quran','bad'],completedAt:{'islam-dini':'2026-09-20T12:00:00Z'}});
assert.deepEqual(state.completedBooks,['islam-dini']);
assert.equal(state.acknowledgedLevel,1);
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
assert.equal(initial.levels[0].goals.length,3);
assert.ok(initial.levels[0].goals.every(goal=>goal.length>=40));
assert.equal(initial.levels[0].sourcePending,false,'level one must be fully readable so the path can genuinely begin');

const completedReady=setGenericBookCompleted(state,'islam-dini',true);
const levelTwo=libraryPathSnapshot({pathState:completedReady,hadithCompletedCount:0});
assert.equal(levelTwo.currentLevel,2,'finishing the level-one required book should move guidance to level two');
assert.equal(levelTwo.levels[0].complete,true);
assert.equal(levelTwo.transitionReady,true,'a newly reached level should wait for an explicit transition acknowledgement');
const acknowledged=acknowledgeLibraryLevel(levelTwo.completedBooks?.length?{...completedReady,acknowledgedLevel:1}:completedReady,2);
const acknowledgedSnapshot=libraryPathSnapshot({pathState:acknowledged,hadithCompletedCount:0});
assert.equal(acknowledgedSnapshot.transitionReady,false);
assert.equal(acknowledgedSnapshot.acknowledgedLevel,2);
assert.equal(levelTwo.levels[1].sourcePending,false,'level two must become fully readable once Yavrularımız is packaged');
const withYavrular=setGenericBookCompleted(completedReady,'yavrularimiza-din-dersleri',true);
const withLevelTwo=setGenericBookCompleted(withYavrular,'namaz-sureleri-tefsiri',true);
const levelThree=libraryPathSnapshot({pathState:withLevelTwo,hadithCompletedCount:42});
assert.equal(levelThree.currentLevel,3,'completing both level-two books should move guidance to level three');
assert.equal(levelThree.levels[1].complete,true);
assert.equal(levelThree.levels[2].sourcePending,true,'level three must still disclose the pending siyer full text');

console.log('library-path: five-level soft progression and source-honesty checks passed');
