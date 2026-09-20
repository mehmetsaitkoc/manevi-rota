const SCHEMA_VERSION=1;
const EVENT_TYPES=new Set(['route_created','day_progress']);
const MODES=new Set(['VERİ TOPLUYOR','SÜRDÜRÜLEBİLİR','DENGELİ','DERİNLEŞME','HAFİF GÜN']);
const DAY_FEEDBACK=new Set(['heavy','ideal','easy',null]);
const MOODS=new Set(['low','calm','normal','motivated']);
const CONTEXTS=new Set(['busy','normal','travel','rest']);
const CAPACITY_PHASES=new Set(['VERİ TOPLUYOR','DÜŞÜK KAPASİTE DÖNEMİ','DENGELİ DÖNEM','YÜKSELEN KAPASİTE']);
const BEHAVIOR_SHIFTS=new Set(['BELİRSİZ','GERİLEME SİNYALİ','DENGELİ','OLUMLU DEĞİŞİM']);

const num=(value,min,max,fallback=0)=>{
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
};
const int=(value,min,max,fallback=0)=>Math.round(num(value,min,max,fallback));
const oneOf=(value,set,fallback)=>set.has(value)?value:fallback;
const safeId=value=>/^[a-zA-Z0-9_-]{8,96}$/.test(String(value||''))?String(value):'';
const iso=value=>{
  const d=new Date(value||Date.now());
  return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();
};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};

export const PILOT_SCHEMA_VERSION=SCHEMA_VERSION;

export function emptyPilotState(){
  return {enabled:false,pilotId:'',queue:[],lastFlushAt:null,lastError:null,transport:'local'};
}

export function normalizePilotState(input={}){
  const raw=object(input);
  const queue=Array.isArray(raw.queue)
    ? raw.queue.map(sanitizePilotEvent).filter(Boolean).slice(-200)
    : [];
  return {
    enabled:Boolean(raw.enabled),
    pilotId:safeId(raw.pilotId),
    queue,
    lastFlushAt:raw.lastFlushAt?iso(raw.lastFlushAt):null,
    lastError:raw.lastError?String(raw.lastError).slice(0,160):null,
    transport:['local','connected','error'].includes(raw.transport)?raw.transport:'local'
  };
}

export function createPilotId(randomUUID){
  const raw=typeof randomUUID==='function'?randomUUID():`p_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return String(raw).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,96);
}

function sanitizeRoutePayload(payload={}){
  const p=object(payload);
  return {
    mode:oneOf(p.mode,MODES,'VERİ TOPLUYOR'),
    plannedCount:int(p.plannedCount,0,8),
    totalMinutes:int(p.totalMinutes,0,90),
    budget:int(p.budget,0,90),
    lightDay:Boolean(p.lightDay),
    evidenceDays:int(p.evidenceDays,0,60),
    effectiveEvidenceDays:num(p.effectiveEvidenceDays,0,60),
    evidenceFreshness:int(p.evidenceFreshness,0,100),
    confidence:int(p.confidence,0,100),
    priorWeight:int(p.priorWeight,0,100),
    overloadRisk:int(p.overloadRisk,0,100),
    recentCompletion:int(p.recentCompletion,0,100),
    learnedSustainableMinutes:p.learnedSustainableMinutes==null?null:int(p.learnedSustainableMinutes,0,90),
    capacityPhase:oneOf(p.capacityPhase,CAPACITY_PHASES,'VERİ TOPLUYOR'),
    behaviorShift:oneOf(p.behaviorShift,BEHAVIOR_SHIFTS,'BELİRSİZ'),
    checkinMinutes:int(p.checkinMinutes,0,90),
    energy:int(p.energy,1,5,3),
    load:int(p.load,1,5,3),
    mood:oneOf(p.mood,MOODS,'normal'),
    context:oneOf(p.context,CONTEXTS,'normal')
  };
}

function sanitizeDayPayload(payload={}){
  const p=object(payload);
  const planned=int(p.plannedCount,0,8);
  const completed=int(p.completedCount,0,planned||8);
  const tf=object(p.taskFeedbackCounts);
  return {
    action:['task-toggle','task-feedback','day-feedback','light-day'].includes(p.action)?p.action:'task-toggle',
    mode:oneOf(p.mode,MODES,'VERİ TOPLUYOR'),
    plannedCount:planned,
    completedCount:completed,
    completionPct:planned?int((completed/planned)*100,0,100):0,
    totalMinutes:int(p.totalMinutes,0,90),
    dayFeedback:oneOf(p.dayFeedback,DAY_FEEDBACK,null),
    taskFeedbackCounts:{
      hard:int(tf.hard,0,8),
      normal:int(tf.normal,0,8),
      easy:int(tf.easy,0,8)
    },
    lightDay:Boolean(p.lightDay)
  };
}

export function sanitizePilotEvent(input={}){
  const raw=object(input);
  const type=String(raw.type||'');
  const pilotId=safeId(raw.pilotId),eventId=safeId(raw.eventId);
  if(!EVENT_TYPES.has(type)||!pilotId||!eventId)return null;
  return {
    schemaVersion:SCHEMA_VERSION,
    eventId,
    pilotId,
    type,
    occurredAt:iso(raw.occurredAt),
    appVersion:String(raw.appVersion||'').slice(0,24)||'unknown',
    payload:type==='route_created'?sanitizeRoutePayload(raw.payload):sanitizeDayPayload(raw.payload)
  };
}

export function createPilotEvent({eventId,pilotId,type,occurredAt=new Date().toISOString(),appVersion='unknown',payload={}}){
  return sanitizePilotEvent({schemaVersion:SCHEMA_VERSION,eventId,pilotId,type,occurredAt,appVersion,payload});
}

export function sanitizePilotBatch(input){
  const raw=object(input);
  const events=Array.isArray(raw.events)?raw.events.slice(0,25):[];
  return events.map(sanitizePilotEvent).filter(Boolean);
}

export function pilotRoutePayload(route={},checkin={},lightDay=false){
  const a=object(route.analysis);
  return sanitizeRoutePayload({
    mode:route.mode,
    plannedCount:Array.isArray(route.tasks)?route.tasks.length:0,
    totalMinutes:route.totalMinutes,
    budget:route.budget,
    lightDay,
    evidenceDays:a.evidenceDays,
    effectiveEvidenceDays:a.effectiveEvidenceDays,
    evidenceFreshness:a.evidenceFreshness,
    confidence:a.confidence,
    priorWeight:a.priorWeight,
    overloadRisk:a.overloadRisk,
    recentCompletion:a.recentCompletion,
    learnedSustainableMinutes:a.learnedSustainableMinutes,
    capacityPhase:a.capacityPhase,
    behaviorShift:a.behaviorShift,
    checkinMinutes:checkin.minutes,
    energy:checkin.energy,
    load:checkin.load,
    mood:checkin.mood,
    context:checkin.context
  });
}

export function pilotDayPayload(day={},action='task-toggle'){
  const route=object(day.route);
  const tasks=Array.isArray(route.tasks)?route.tasks:[];
  const done=new Set(Array.isArray(day.done)?day.done:[]);
  const counts={hard:0,normal:0,easy:0};
  for(const value of Object.values(object(day.taskFeedback))){
    if(value in counts)counts[value]++;
  }
  return sanitizeDayPayload({
    action,
    mode:route.mode,
    plannedCount:tasks.length,
    completedCount:tasks.filter(task=>done.has(task.id)).length,
    totalMinutes:route.totalMinutes,
    dayFeedback:day.feedback||null,
    taskFeedbackCounts:counts,
    lightDay:day.lightDay
  });
}
