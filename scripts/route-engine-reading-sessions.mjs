import assert from 'node:assert/strict';
import {routineMemory} from '../src/route-engine.mjs';

const route=duration=>({tasks:[{id:'reading',duration,slot:'evening'}]});
const records=[
  {date:'2026-09-14',route:route(12),done:['reading'],taskFeedback:{reading:'normal'},readingSessions:[{taskId:'reading',minutes:6}]},
  {date:'2026-09-15',route:route(12),done:['reading'],taskFeedback:{reading:'normal'},readingSessions:[{taskId:'reading',minutes:7}]},
  {date:'2026-09-16',route:route(12),done:['reading'],taskFeedback:{reading:'easy'},readingSessions:[{taskId:'reading',minutes:8}]},
  {date:'2026-09-17',route:route(12),done:['reading'],taskFeedback:{reading:'normal'},readingSessions:[{taskId:'reading',minutes:7}]}
];

const memory=routineMemory(records,'2026-09-18');
assert.equal(memory.reading.samples,4);
assert.equal(memory.reading.typicalMinutes,7,'actual reader session minutes should override planned task duration');
assert.ok(memory.reading.completion>.9);

const fallback=routineMemory([
  {date:'2026-09-14',route:route(11),done:['reading'],taskFeedback:{reading:'normal'}},
  {date:'2026-09-15',route:route(9),done:['reading'],taskFeedback:{reading:'normal'}}
],'2026-09-16');
assert.equal(fallback.reading.typicalMinutes,10,'planned duration remains fallback when no reader session exists');

console.log('route-engine-reading-sessions: actual reading duration learning passed');
