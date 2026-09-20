import assert from 'node:assert/strict';
import {pilotEventToSupabaseRow,pilotEventsToSupabaseRows} from '../src/pilot-supabase.mjs';

const route=pilotEventToSupabaseRow({
  schemaVersion:1,eventId:'evt_12345678',pilotId:'pilot_12345678',type:'route_created',
  occurredAt:'2026-09-20T12:00:00Z',appVersion:'3.0.0',
  payload:{mode:'DENGELİ',plannedCount:3,totalMinutes:18,budget:20,lightDay:false,evidenceDays:7,effectiveEvidenceDays:5.4,evidenceFreshness:84,confidence:71,priorWeight:22,overloadRisk:31,recentCompletion:78,learnedSustainableMinutes:17,capacityPhase:'DENGELİ DÖNEM',behaviorShift:'DENGELİ',checkinMinutes:20,energy:3,load:2,mood:'normal',context:'normal'}
});
assert.equal(route.event_type,'route_created');
assert.equal(route.day_context,'normal');
assert.equal(route.completed_count,undefined);
assert.equal(route.note,undefined);

const day=pilotEventToSupabaseRow({
  schemaVersion:1,eventId:'evt_87654321',pilotId:'pilot_12345678',type:'day_progress',
  occurredAt:'2026-09-20T12:10:00Z',appVersion:'3.0.0',
  payload:{action:'task-feedback',mode:'DENGELİ',plannedCount:3,completedCount:2,completionPct:67,totalMinutes:18,dayFeedback:'ideal',taskFeedbackCounts:{hard:0,normal:1,easy:1},lightDay:false}
});
assert.equal(day.completed_count,2);
assert.equal(day.task_feedback_easy,1);
assert.equal(day.energy,undefined);
assert.equal(pilotEventsToSupabaseRows([route,day]).length,2);

console.log('pilot-supabase: row mapping passed');
