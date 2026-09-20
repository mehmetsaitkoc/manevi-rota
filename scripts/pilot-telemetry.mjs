import assert from 'node:assert/strict';
import {PILOT_SCHEMA_VERSION,emptyPilotState,normalizePilotState,createPilotEvent,sanitizePilotBatch,pilotRoutePayload,pilotDayPayload} from '../src/pilot-telemetry.mjs';

assert.equal(PILOT_SCHEMA_VERSION,1);
assert.equal(emptyPilotState().enabled,false);

const route=pilotRoutePayload({
  mode:'DENGELİ',totalMinutes:18,budget:20,tasks:[{id:'quran'},{id:'reading'}],
  analysis:{evidenceDays:7,effectiveEvidenceDays:5.4,evidenceFreshness:84,confidence:71,priorWeight:22,overloadRisk:31,recentCompletion:78,learnedSustainableMinutes:17,capacityPhase:'DENGELİ DÖNEM',behaviorShift:'DENGELİ'}
},{minutes:20,energy:3,load:2,mood:'normal',context:'normal'});
assert.deepEqual(route,{mode:'DENGELİ',plannedCount:2,totalMinutes:18,budget:20,lightDay:false,evidenceDays:7,effectiveEvidenceDays:5.4,evidenceFreshness:84,confidence:71,priorWeight:22,overloadRisk:31,recentCompletion:78,learnedSustainableMinutes:17,capacityPhase:'DENGELİ DÖNEM',behaviorShift:'DENGELİ',checkinMinutes:20,energy:3,load:2,mood:'normal',context:'normal'});

const day=pilotDayPayload({route:{mode:'DENGELİ',totalMinutes:18,tasks:[{id:'quran'},{id:'reading'}]},done:['quran'],feedback:'ideal',taskFeedback:{quran:'easy'},lightDay:false},'day-feedback');
assert.equal(day.completedCount,1);
assert.equal(day.completionPct,50);
assert.deepEqual(day.taskFeedbackCounts,{hard:0,normal:0,easy:1});

const event=createPilotEvent({eventId:'evt_12345678',pilotId:'pilot_12345678',type:'route_created',appVersion:'3.0.0',occurredAt:'2026-09-20T12:00:00Z',payload:{...route,note:'SHOULD_NOT_LEAK',city:'SHOULD_NOT_LEAK'}});
assert.equal(event.schemaVersion,1);
assert.equal(event.payload.note,undefined);
assert.equal(event.payload.city,undefined);
assert.equal(JSON.stringify(event).includes('SHOULD_NOT_LEAK'),false);

const bad=sanitizePilotBatch({events:[
  event,
  {eventId:'x',pilotId:'x',type:'route_created',payload:{}},
  {eventId:'evt_99999999',pilotId:'pilot_99999999',type:'unknown',payload:{secret:'x'}}
]});
assert.equal(bad.length,1);

const state=normalizePilotState({enabled:true,pilotId:'pilot_12345678',queue:[event,{garbage:true}],lastError:'x'.repeat(500),transport:'connected'});
assert.equal(state.queue.length,1);
assert.equal(state.lastError.length,160);
assert.equal(state.transport,'connected');

console.log('pilot-telemetry: privacy schema and calibration payloads passed');
