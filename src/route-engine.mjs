import {TASK_CATALOG,PRIORITY_IDS,TIME_SLOTS} from './catalog.mjs';

export const MODE={
  COLLECT:'VERİ TOPLUYOR',
  RECOVERY:'SÜRDÜRÜLEBİLİR',
  BALANCED:'DENGELİ',
  DEEPEN:'DERİNLEŞME',
  LIGHT:'HAFİF GÜN'
};

export const ROUTINE_STATE={
  COLLECT:'VERİ TOPLUYOR',
  FRAGILE:'MİKRO DOZ',
  STABLE:'OTURUYOR',
  RETURN:'YUMUŞAK GERİ DÖNÜŞ',
  GROWTH:'DERİNLEŞMEYE HAZIR'
};

export const CAPACITY_PHASE={
  UNKNOWN:'VERİ TOPLUYOR',
  LOWER:'DÜŞÜK KAPASİTE DÖNEMİ',
  STABLE:'DENGELİ DÖNEM',
  RISING:'YÜKSELEN KAPASİTE'
};

export const BEHAVIOR_SHIFT={
  UNKNOWN:'BELİRSİZ',
  DOWN:'GERİLEME SİNYALİ',
  STABLE:'DENGELİ',
  UP:'OLUMLU DEĞİŞİM'
};

export const EVIDENCE_STATUS={
  FRESH:'GÜNCEL',
  AGING:'ZAYIFLIYOR',
  STALE:'ESKİ'
};

export const ROUTINE_VERIFICATION={
  COLLECT:'KANIT TOPLANIYOR',
  BUILDING:'İNŞA EDİLİYOR',
  VERIFIED:'DOĞRULANDI',
  REVALIDATE:'YENİDEN DOĞRULANACAK'
};

export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const mean=(xs)=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
export const median=(xs)=>{if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
export const dayAdd=(iso,n)=>{const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const weekdayOf=iso=>new Date(`${iso}T12:00:00Z`).getUTCDay();
const weekdayNames=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

function validRecord(r){return r&&typeof r==='object'&&r.date;}
function plannedIds(r){return Array.isArray(r?.route?.tasks)?r.route.tasks.map(t=>t.id):[];}
function completedSet(r){return new Set(Array.isArray(r?.done)?r.done:[]);}
function routeTotal(r){return Number(r?.route?.totalMinutes||r?.route?.tasks?.reduce((s,t)=>s+Number(t.duration||0),0)||0);}
function recordCompletion(r){const ids=plannedIds(r),done=completedSet(r);return ids.length?ids.filter(id=>done.has(id)).length/ids.length:0;}
function recentWeight(index){return Math.pow(.92,index);}
function weightedMean(items,getter){let sw=0,s=0;items.forEach((x,i)=>{const w=recentWeight(i);sw+=w;s+=getter(x)*w});return sw?s/sw:0;}
function confidenceFromSamples(n){return n<2?15:n<4?32:n<7?50:n<12?68:n<20?80:90;}

export function evidenceFreshness(days,halfLife=18){
  const age=Math.max(0,Number(days||0));
  return clamp(Math.exp(-Math.LN2*age/Math.max(1,halfLife)),0,1);
}

function evidenceStatusFromFreshness(f){
  return f>=.72?EVIDENCE_STATUS.FRESH:f>=.42?EVIDENCE_STATUS.AGING:EVIDENCE_STATUS.STALE;
}

function weightedByFreshness(rows,today,getter,halfLife=18){
  let sw=0,s=0;
  rows.forEach((r,i)=>{
    const age=daysBetween(r.date,today);
    const w=recentWeight(i)*evidenceFreshness(age,halfLife);
    sw+=w;s+=getter(r)*w;
  });
  return sw?s/sw:0;
}

function routineVerificationSignal(rows,today,id,{completion,hardRate,lastDoneDays}){
  const samples=rows.length;
  const dates=rows.map(r=>r.date).sort();
  const spanDays=samples>=2?daysBetween(dates[0],dates.at(-1))+1:0;
  const recent=rows.filter(r=>daysBetween(r.date,today)<=10);
  const recentCompletion=recent.length?weightedByFreshness(recent,today,r=>taskWasDone(r,id)?1:0,14):completion;
  const avgFreshness=samples?mean(rows.map(r=>evidenceFreshness(daysBetween(r.date,today),18))):0;
  const status=evidenceStatusFromFreshness(avgFreshness);
  const historicalBase=samples>=5&&completion>=.72&&hardRate<.38;
  const broadEnough=samples>=6&&spanDays>=7;
  const recentEnough=recent.length>=3&&lastDoneDays<=5;
  const verified=historicalBase&&broadEnough&&recentEnough&&recentCompletion>=.74&&hardRate<.34&&status!==EVIDENCE_STATUS.STALE;
  let verification=ROUTINE_VERIFICATION.COLLECT;
  if(historicalBase&&(!recentEnough||status===EVIDENCE_STATUS.STALE||lastDoneDays>=8))verification=ROUTINE_VERIFICATION.REVALIDATE;
  else if(verified)verification=ROUTINE_VERIFICATION.VERIFIED;
  else if(samples>=3)verification=ROUTINE_VERIFICATION.BUILDING;
  const breadth=clamp(spanDays/14,0,1),sampleScore=clamp(samples/8,0,1),recentScore=clamp(recent.length/4,0,1);
  const confidence=clamp((sampleScore*.35+breadth*.25+recentScore*.20+avgFreshness*.20)*100,0,95);
  return {verification,verified,status,avgFreshness,recentSamples:recent.length,recentCompletion,spanDays,confidence};
}

function routineState({samples,completion,hardRate,easyRate}){
  if(samples<3)return ROUTINE_STATE.COLLECT;
  if(completion<.58||hardRate>=.42)return ROUTINE_STATE.FRAGILE;
  if(samples>=6&&completion>=.86&&hardRate<=.16&&easyRate>=.28)return ROUTINE_STATE.GROWTH;
  if(samples>=4&&completion>=.74&&hardRate<.34)return ROUTINE_STATE.STABLE;
  return ROUTINE_STATE.COLLECT;
}

function daysBetween(older,newer){
  const a=new Date(`${older}T12:00:00Z`),b=new Date(`${newer}T12:00:00Z`);
  return Math.max(0,Math.round((b-a)/86400000));
}

function taskWasDone(record,id){return completedSet(record).has(id);}
function taskFeedbackValue(record,id){return record?.taskFeedback?.[id]||null;}
function observedTaskMinutes(record,id){
  const sessions=(Array.isArray(record?.readingSessions)?record.readingSessions:[])
    .filter(x=>x?.taskId===id&&Number.isFinite(Number(x?.minutes))&&Number(x.minutes)>0);
  if(sessions.length)return clamp(Math.round(sessions.reduce((n,x)=>n+Number(x.minutes),0)),1,120);
  const planned=record?.route?.tasks?.find(t=>t.id===id)?.duration;
  return Number.isFinite(planned)?Number(planned):null;
}
function taskExposureRows(records=[],id,today){
  return records.filter(validRecord)
    .filter(r=>r.date<today&&plannedIds(r).includes(id)&&!r.lightExcused)
    .sort((a,b)=>b.date.localeCompare(a.date));
}

export function behaviorShiftSignal(records=[],today){
  const planned=records.filter(validRecord).filter(r=>r.date<today&&plannedIds(r).length&&!r.lightExcused).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,14);
  const recent=planned.slice(0,4),baseline=planned.slice(4,10);
  if(recent.length<3||baseline.length<4)return {state:BEHAVIOR_SHIFT.UNKNOWN,known:false,recentSamples:recent.length,baselineSamples:baseline.length,delta:0,recentCompletion:weightedMean(recent,recordCompletion),baselineCompletion:weightedMean(baseline,recordCompletion),reason:null};
  const rc=weightedMean(recent,recordCompletion),bc=weightedMean(baseline,recordCompletion),delta=rc-bc;
  const recentHeavy=recent.filter(r=>r.feedback==='heavy').length/recent.length;
  const baseHeavy=baseline.filter(r=>r.feedback==='heavy').length/baseline.length;
  let state=BEHAVIOR_SHIFT.STABLE,reason='Yakın dönem davranışı önceki döneme yakın.';
  if(delta<=-.22||recentHeavy>=baseHeavy+.30){state=BEHAVIOR_SHIFT.DOWN;reason='Yakın dönemde tamamlama belirgin düştü veya zorlanma arttı.';}
  else if(delta>=.18&&recentHeavy<=Math.max(.15,baseHeavy)){state=BEHAVIOR_SHIFT.UP;reason='Yakın dönemde sürdürülebilirlik önceki döneme göre belirgin yükseldi.';}
  return {state,known:true,recentSamples:recent.length,baselineSamples:baseline.length,delta,recentCompletion:rc,baselineCompletion:bc,recentHeavy,baselineHeavy:baseHeavy,reason};
}

export function capacityPhaseSignal(records=[],today){
  const planned=records.filter(validRecord).filter(r=>r.date<today&&plannedIds(r).length&&!r.lightExcused).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,24);
  const recent=planned.slice(0,5),baseline=planned.slice(5,15);
  if(recent.length<4||baseline.length<5)return {phase:CAPACITY_PHASE.UNKNOWN,known:false,recentSamples:recent.length,baselineSamples:baseline.length,confidence:confidenceFromSamples(recent.length+baseline.length),reason:'Dönemsel kapasite için daha fazla gerçek gün gerekiyor.'};
  const completion=x=>weightedMean(x,recordCompletion);
  const heavy=x=>x.length?x.filter(r=>r.feedback==='heavy').length/x.length:0;
  const strain=x=>{
    const cs=x.map(r=>r.checkin).filter(Boolean);
    if(!cs.length)return null;
    return mean(cs.map(c=>clamp(((3-Number(c.energy||3))*.24)+((Number(c.load||3)-3)*.22)+(c.mood==='low'?.14:0)+(c.context==='busy'?.12:0),-.5,1)));
  };
  const successful=x=>x.filter(r=>recordCompletion(r)>=.65&&r.feedback!=='heavy'&&routeTotal(r)>0);
  const rc=completion(recent),bc=completion(baseline),rh=heavy(recent),bh=heavy(baseline);
  const rs=strain(recent),bs=strain(baseline);
  const rm=successful(recent).length>=2?median(successful(recent).map(routeTotal)):null;
  const bm=successful(baseline).length>=3?median(successful(baseline).map(routeTotal)):null;
  let phase=CAPACITY_PHASE.STABLE,reason='Yakın dönem kapasitesi önceki döneme yakın.';
  const strainDown=rs!==null&&bs!==null&&rs>=bs+.18;
  if(rc<=bc-.18||rh>=bh+.30||strainDown){
    phase=CAPACITY_PHASE.LOWER;
    reason='Son günlerde tamamlama, zorlanma veya günlük yük önceki döneme göre kötüleşti.';
  }else if(rc>=Math.min(.92,bc+.14)&&rh<=Math.max(.10,bh-.10)&&(rs===null||bs===null||rs<=bs+.05)){
    phase=CAPACITY_PHASE.RISING;
    reason='Son günlerde daha yüksek sürdürülebilirlik tekrar eden verilerle doğrulanıyor.';
  }
  return {
    phase,known:true,recentSamples:recent.length,baselineSamples:baseline.length,
    confidence:confidenceFromSamples(recent.length+baseline.length),
    recentCompletion:rc,baselineCompletion:bc,recentHeavy:rh,baselineHeavy:bh,
    recentStrain:rs,baselineStrain:bs,recentSuccessfulMinutes:rm,baselineSuccessfulMinutes:bm,reason
  };
}

export function routineMemory(records=[],today){
  const out={};
  for(const id of Object.keys(TASK_CATALOG)){
    const rows=taskExposureRows(records,id,today).slice(0,24);
    const completion=weightedByFreshness(rows,today,r=>taskWasDone(r,id)?1:0,18);
    const feedbackRows=rows.filter(r=>taskFeedbackValue(r,id));
    const hardRate=feedbackRows.length?weightedByFreshness(feedbackRows,today,r=>taskFeedbackValue(r,id)==='hard'?1:0,18):0;
    const easyRate=feedbackRows.length?weightedByFreshness(feedbackRows,today,r=>taskFeedbackValue(r,id)==='easy'?1:0,18):0;
    const doneRows=rows.filter(r=>taskWasDone(r,id));
    const lastPlannedDays=rows.length?daysBetween(rows[0].date,today):99;
    const lastDoneDays=doneRows.length?daysBetween(doneRows[0].date,today):99;
    const verification=routineVerificationSignal(rows,today,id,{completion,hardRate,lastDoneDays});
    let baseState=routineState({samples:rows.length,completion,hardRate,easyRate});
    // Growth is an earned state: concentrated bursts or stale evidence cannot unlock it.
    if(baseState===ROUTINE_STATE.GROWTH&&!verification.verified)baseState=ROUTINE_STATE.STABLE;
    const established=rows.length>=5&&completion>=.72&&hardRate<.36;
    const returnDue=(established&&lastDoneDays>=8)||verification.verification===ROUTINE_VERIFICATION.REVALIDATE;
    const state=returnDue?ROUTINE_STATE.RETURN:baseState;
    const recent=rows.filter(r=>daysBetween(r.date,today)<=7).slice(0,4),prior=rows.filter(r=>daysBetween(r.date,today)>7).slice(0,6);
    const recentCompletion=recent.length?weightedByFreshness(recent,today,r=>taskWasDone(r,id)?1:0,12):completion;
    const priorCompletion=prior.length?weightedByFreshness(prior,today,r=>taskWasDone(r,id)?1:0,24):completion;
    let shift=BEHAVIOR_SHIFT.UNKNOWN;
    if(recent.length>=2&&prior.length>=3){
      const delta=recentCompletion-priorCompletion;
      shift=delta<=-.30?BEHAVIOR_SHIFT.DOWN:delta>=.24?BEHAVIOR_SHIFT.UP:BEHAVIOR_SHIFT.STABLE;
    }
    const continuity=established?clamp(completion*Math.exp(-Math.max(0,lastDoneDays-3)/10)*verification.avgFreshness,0,1):completion*.50*verification.avgFreshness;
    const completedDurations=doneRows.map(r=>observedTaskMinutes(r,id)).filter(Number.isFinite);
    const minGapDays=state===ROUTINE_STATE.FRAGILE?2:0;
    const frequencyReady=lastPlannedDays>=minGapDays;
    const baseConfidence=confidenceFromSamples(rows.length);
    const confidence=Math.round(clamp(baseConfidence*.55+verification.confidence*.45,0,95)*(.68+.32*verification.avgFreshness));
    out[id]={
      samples:rows.length,completion,hardRate,easyRate,state,baseState,established,returnDue,
      lastPlannedDays,lastDoneDays,continuity,shift,recentCompletion,priorCompletion,
      confidence,typicalMinutes:completedDurations.length?Math.round(median(completedDurations)):null,
      frequencyReady,
      verification:verification.verification,verified:verification.verified,
      verificationConfidence:Math.round(verification.confidence),evidenceStatus:verification.status,
      evidenceFreshness:verification.avgFreshness,recentEvidenceSamples:verification.recentSamples,
      evidenceSpanDays:verification.spanDays
    };
  }
  return out;
}

function interventionContextFrom({record,task,kind}){
  if(task?.policyContext)return task.policyContext;
  if(kind==='gentle-return')return 'return';
  if(kind==='controlled-deepen')return 'growth';
  const c=record?.checkin||{};
  if(kind==='capacity-protect'||kind==='micro-dose'||Number(c.energy||3)<=2||Number(c.load||3)>=4||c.context==='busy')return 'low-capacity';
  return 'normal';
}

function finalizeInterventionBucket(bucket,today){
  bucket.samples=bucket.events.length;
  if(!bucket.samples)return bucket;
  const weighted=bucket.events.map(e=>({...e,freshness:evidenceFreshness(daysBetween(e.date,today),28)}));
  const sw=weighted.reduce((a,e)=>a+e.freshness,0);
  bucket.effectiveSamples=sw;
  bucket.averageEffect=sw?weighted.reduce((a,e)=>a+e.score*e.freshness,0)/sw:0;
  bucket.helpfulRate=sw?weighted.reduce((a,e)=>a+(e.score>=.10?e.freshness:0),0)/sw:0;
  bucket.harmfulRate=sw?weighted.reduce((a,e)=>a+(e.score<=-.10?e.freshness:0),0)/sw:0;
  bucket.latestAgeDays=Math.min(...weighted.map(e=>daysBetween(e.date,today)));
  bucket.freshness=sw/bucket.samples;
  bucket.confidence=Math.round(clamp((bucket.effectiveSamples/4)*.65+(bucket.samples/5)*.20+bucket.freshness*.15,0,.95)*100);
  const stale=bucket.latestAgeDays>24||bucket.freshness<.48;
  if(stale&&bucket.samples>=2)bucket.policy='revalidate';
  else if(bucket.samples>=3&&bucket.effectiveSamples>=1.65&&bucket.averageEffect>=.08&&bucket.helpfulRate>=.58)bucket.policy='repeat';
  else if(bucket.samples>=3&&bucket.effectiveSamples>=1.65&&bucket.averageEffect<=-.08&&bucket.harmfulRate>=.58)bucket.policy='change';
  else if(bucket.effectiveSamples>=1.35)bucket.policy='hold';
  else bucket.policy='collect';
  return bucket;
}

export function interventionEffectModel(records=[],today){
  const past=records.filter(validRecord).filter(r=>r.date<today&&!r.lightExcused).sort((a,b)=>a.date.localeCompare(b.date));
  const byTask={};
  for(const id of Object.keys(TASK_CATALOG))byTask[id]={};
  const taskRows={};
  for(const id of Object.keys(TASK_CATALOG))taskRows[id]=past.filter(r=>plannedIds(r).includes(id));
  for(const id of Object.keys(TASK_CATALOG)){
    const rows=taskRows[id];
    rows.forEach((r,idx)=>{
      const task=r.route?.tasks?.find(t=>t.id===id);
      const intervention=task?.intervention;
      if(!intervention||intervention==='none')return;
      const before=rows.slice(Math.max(0,idx-3),idx);
      const after=rows.slice(idx,Math.min(rows.length,idx+3));
      if(before.length<2||after.length<2)return;
      const beforeCompletion=mean(before.map(x=>taskWasDone(x,id)?1:0));
      const afterCompletion=mean(after.map(x=>taskWasDone(x,id)?1:0));
      const beforeFb=before.map(x=>taskFeedbackValue(x,id)).filter(Boolean);
      const afterFb=after.map(x=>taskFeedbackValue(x,id)).filter(Boolean);
      const beforeHard=beforeFb.length?beforeFb.filter(x=>x==='hard').length/beforeFb.length:0;
      const afterHard=afterFb.length?afterFb.filter(x=>x==='hard').length/afterFb.length:0;
      const score=(afterCompletion-beforeCompletion)-Math.max(0,afterHard-beforeHard)*.20;
      const context=interventionContextFrom({record:r,task,kind:intervention});
      const bucket=byTask[id][intervention]||(byTask[id][intervention]={events:[],contexts:{},samples:0,effectiveSamples:0,averageEffect:0,helpfulRate:0,harmfulRate:0,policy:'collect',confidence:0});
      const event={date:r.date,beforeCompletion,afterCompletion,beforeHard,afterHard,score,context};
      bucket.events.push(event);
      const cb=bucket.contexts[context]||(bucket.contexts[context]={events:[],samples:0,effectiveSamples:0,averageEffect:0,helpfulRate:0,harmfulRate:0,policy:'collect',confidence:0,context});
      cb.events.push(event);
    });
    for(const bucket of Object.values(byTask[id])){
      finalizeInterventionBucket(bucket,today);
      for(const cb of Object.values(bucket.contexts||{}))finalizeInterventionBucket(cb,today);
    }
  }
  return byTask;
}


function slotOfTask(task,profile={}){
  return profile?.slotOverrides?.[task.id]||task.slot||TASK_CATALOG[task.id]?.defaultSlot||'evening';
}

function slotCompletionStats(records=[],today){
  const past=records.filter(validRecord).filter(r=>r.date<today).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
  const slots={};
  const taskSlots={};
  for(const id of Object.keys(TIME_SLOTS))slots[id]={samples:0,completed:0,completion:0};
  for(const taskId of Object.keys(TASK_CATALOG)){
    taskSlots[taskId]={};
    for(const id of Object.keys(TIME_SLOTS))taskSlots[taskId][id]={samples:0,completed:0,completion:0};
  }
  for(const r of past){
    if(r.lightExcused)continue;
    const done=completedSet(r);
    for(const task of r.route?.tasks||[]){
      const slot=task.slot||TASK_CATALOG[task.id]?.defaultSlot;
      if(!slots[slot]||!taskSlots[task.id]?.[slot])continue;
      slots[slot].samples++;
      taskSlots[task.id][slot].samples++;
      if(done.has(task.id)){slots[slot].completed++;taskSlots[task.id][slot].completed++;}
    }
  }
  const finish=x=>{x.completion=x.samples?x.completed/x.samples:0;return x};
  Object.values(slots).forEach(finish);
  Object.values(taskSlots).forEach(row=>Object.values(row).forEach(finish));
  return {slots,taskSlots};
}

export function timeSlotLearning({records=[],today,profile={}}){
  const stats=slotCompletionStats(records,today);
  const suggestions=[];
  const snooze=profile.slotSuggestionSnooze||{};
  for(const [taskId,def] of Object.entries(TASK_CATALOG)){
    if(taskId==='prayerPlan'&&!profile.prayerTracking)continue;
    if(snooze[taskId]&&snooze[taskId]>today)continue;
    const current=profile.slotOverrides?.[taskId]||def.defaultSlot;
    const currentTask=stats.taskSlots[taskId]?.[current]||{samples:0,completion:0};
    if(currentTask.samples<3||currentTask.completion>.5)continue;
    const candidates=(def.allowedSlots||Object.keys(TIME_SLOTS)).filter(s=>s!==current).map(slot=>{
      const own=stats.taskSlots[taskId]?.[slot]||{samples:0,completion:0};
      const overall=stats.slots[slot]||{samples:0,completion:0};
      const learned=own.samples>=2;
      const evidence=learned?own:overall;
      return {slot,learned,samples:evidence.samples,completion:evidence.completion,ownSamples:own.samples,ownCompletion:own.completion};
    }).filter(x=>x.samples>=3).sort((a,b)=>b.completion-a.completion||b.samples-a.samples);
    const best=candidates[0];
    if(!best||best.completion<.65||best.completion<currentTask.completion+.2)continue;
    suggestions.push({
      taskId,from:current,to:best.slot,
      source:best.learned?'task':'personal-slot',
      currentSamples:currentTask.samples,currentCompletion:currentTask.completion,
      targetSamples:best.samples,targetCompletion:best.completion,
      confidence:best.learned&&best.samples>=4?'strong':'moderate'
    });
  }
  suggestions.sort((a,b)=>(a.currentCompletion-b.currentCompletion)||(b.targetCompletion-a.targetCompletion));
  return {...stats,suggestions};
}

/**
 * Builds a deliberately non-moral 30-day learning model. It describes only
 * sustainability of the plan: routine adherence, perceived dose, day patterns
 * and earned room for deeper work. It never creates an "iman" or worship score.
 */
export function longitudinalModel(records=[],today){
  const past=records.filter(validRecord).filter(r=>r.date<today).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,45);
  const planned=past.filter(r=>plannedIds(r).length>0&&!r.lightExcused);
  const completion30=weightedMean(planned.slice(0,30),recordCompletion);
  const completion7=weightedMean(planned.slice(0,7),recordCompletion);
  const completion14=weightedMean(planned.slice(0,14),recordCompletion);
  const heavyRate=planned.length?planned.filter(r=>r.feedback==='heavy').length/planned.length:0;
  const easyRate=planned.length?planned.filter(r=>r.feedback==='easy').length/planned.length:0;
  const successful=planned.filter(r=>recordCompletion(r)>=.7&&r.feedback!=='heavy'&&routeTotal(r)>0);
  const sustainableMinutes=successful.length>=3?Math.round(median(successful.slice(0,12).map(routeTotal))):null;
  const evidenceDays=planned.length;
  const evidenceFreshnessScore=planned.length?weightedMean(planned.slice(0,30),r=>evidenceFreshness(daysBetween(r.date,today),21)):0;
  const effectiveEvidenceDays=planned.slice(0,30).reduce((a,r)=>a+evidenceFreshness(daysBetween(r.date,today),21),0);
  const evidenceStatus=evidenceStatusFromFreshness(evidenceFreshnessScore);
  const confidence=Math.round(confidenceFromSamples(effectiveEvidenceDays)*(.72+.28*evidenceFreshnessScore));

  const memory=routineMemory(records,today);
  const routines={};
  for(const id of Object.keys(TASK_CATALOG)){
    const m=memory[id];
    routines[id]={
      samples:m.samples,
      completion:m.completion,
      hardRate:m.hardRate,
      easyRate:m.easyRate,
      state:m.state,
      baseState:m.baseState,
      confidence:m.confidence,
      typicalMinutes:m.typicalMinutes,
      lastDoneDays:m.lastDoneDays,
      lastPlannedDays:m.lastPlannedDays,
      continuity:m.continuity,
      shift:m.shift,
      established:m.established,
      returnDue:m.returnDue,
      frequencyReady:m.frequencyReady,
      verification:m.verification,
      verified:m.verified,
      verificationConfidence:m.verificationConfidence,
      evidenceStatus:m.evidenceStatus,
      evidenceFreshness:m.evidenceFreshness,
      recentEvidenceSamples:m.recentEvidenceSamples,
      evidenceSpanDays:m.evidenceSpanDays
    };
  }

  const weekday={};
  for(let wd=0;wd<7;wd++){
    const xs=planned.filter(r=>weekdayOf(r.date)===wd).slice(0,6);
    const checkins=xs.map(r=>r.checkin).filter(Boolean);
    weekday[wd]={
      name:weekdayNames[wd],samples:xs.length,
      completion:weightedMean(xs,recordCompletion),
      heavyRate:xs.length?xs.filter(r=>r.feedback==='heavy').length/xs.length:0,
      energy:checkins.length?mean(checkins.map(c=>Number(c.energy||3))):null,
      load:checkins.length?mean(checkins.map(c=>Number(c.load||3))):null,
      minutes:xs.length?Math.round(median(xs.map(routeTotal).filter(Boolean))):null
    };
  }

  const todayPattern=weekday[weekdayOf(today)];
  const baseline=planned.length>=5?completion30:null;
  let weekdayAdjustment=0,weekdayReason=null;
  if(todayPattern.samples>=3&&baseline!==null){
    if(todayPattern.completion<=baseline-.16||todayPattern.heavyRate>=.45){weekdayAdjustment=-.10;weekdayReason=`${todayPattern.name} günlerinde plan daha sık zorlanmış; bugün doz korunuyor.`;}
    else if(todayPattern.completion>=Math.min(.92,baseline+.12)&&todayPattern.heavyRate===0){weekdayAdjustment=.04;weekdayReason=`${todayPattern.name} günlerinde sürdürülebilirlik daha güçlü; yalnız küçük bir esneklik açıldı.`;}
  }

  const capacityPhase=capacityPhaseSignal(records,today);
  const behaviorShift=behaviorShiftSignal(records,today);
  const interventions=interventionEffectModel(records,today);
  const growthAreas=Object.entries(routines).filter(([,x])=>x.state===ROUTINE_STATE.GROWTH).sort((a,b)=>b[1].confidence-a[1].confidence).map(([id])=>id);
  const stableAreas=Object.entries(routines).filter(([,x])=>(x.state===ROUTINE_STATE.STABLE||x.state===ROUTINE_STATE.GROWTH)&&x.verified).map(([id])=>id);
  const fragileAreas=Object.entries(routines).filter(([,x])=>x.state===ROUTINE_STATE.FRAGILE).sort((a,b)=>a[1].completion-b[1].completion).map(([id])=>id);
  const returnAreas=Object.entries(routines).filter(([,x])=>x.state===ROUTINE_STATE.RETURN).sort((a,b)=>b[1].lastDoneDays-a[1].lastDoneDays).map(([id])=>id);
  const timeLearning=timeSlotLearning({records,today,profile:{}});

  return {
    windowDays:45,evidenceDays,effectiveEvidenceDays,evidenceFreshness:evidenceFreshnessScore,evidenceStatus,confidence,completion30,completion14,completion7,heavyRate,easyRate,
    sustainableMinutes,routines,weekday,todayPattern,weekdayAdjustment,weekdayReason,
    growthAreas,stableAreas,fragileAreas,returnAreas,timeLearning,
    capacityPhase,behaviorShift,interventions
  };
}

export function historySignals(records=[],today){
  const past=records.filter(validRecord).filter(r=>r.date<today).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
  const planned=past.filter(r=>plannedIds(r).length>0&&!r.lightExcused);
  const last3=planned.slice(0,3),last7=planned.slice(0,7);
  const completion3=weightedMean(last3,recordCompletion);
  const completion7=weightedMean(last7,recordCompletion);
  const heavy3=last3.filter(r=>r.feedback==='heavy').length;
  const easy3=last3.filter(r=>r.feedback==='easy').length;
  const long=longitudinalModel(records,today);
  return {past,planned,evidenceDays:planned.length,effectiveEvidenceDays:long.effectiveEvidenceDays,evidenceFreshness:long.evidenceFreshness,evidenceStatus:long.evidenceStatus,completion3,completion7,heavy3,easy3,category:long.routines,confidence:long.confidence,long};
}

export function buildStudentModel({profile={},checkin={},history={}}){
  const days=Number(history.evidenceDays||0);
  const effectiveDays=Number(history.effectiveEvidenceDays??days);
  const globalFreshness=Number(history.evidenceFreshness??1);
  const long=history.long||{};
  const priorWeight=clamp(1-(effectiveDays/9),.10,1);
  const recent=Number(history.completion3||0),week=Number(history.completion7||0),month=Number(long.completion30||0);
  const completionBase=days>=7?(.48*week+.32*month+.20*recent):days>=3?(.62*recent+.38*week):recent;
  const heavyRate3=clamp(Number(history.heavy3||0)/Math.max(1,Math.min(3,days)),0,1);
  const checkinStrain=clamp(
    (Number(checkin.load||3)-3)*.15 + (3-Number(checkin.energy||3))*.14 +
    (checkin.mood==='low'?.13:0) + (checkin.context==='busy'?.12:0) + (checkin.context==='travel'?.06:0),
    0,1
  );
  const blockerPrior=['time','overload'].includes(profile.blocker)?(.34*priorWeight):profile.blocker==='start'?(.16*priorWeight):0;
  const recentFriction=clamp((1-recent)*.62 + heavyRate3*.45,0,1);
  const overloadRisk=clamp(recentFriction*.72 + checkinStrain*.22 + blockerPrior,0,1);

  const rhythmPrior={new:.45,irregular:.52,steady:.70,strong:.82}[profile.rhythm]??.60;
  const observedConsistency=days>=3?completionBase:rhythmPrior;
  const consistency=clamp(observedConsistency*(1-priorWeight*.35)+rhythmPrior*(priorWeight*.35),0,1);

  const requested=Number(checkin.minutes||profile.baseMinutes||15);
  const learned=Number(long.sustainableMinutes||0)||null;
  const doseGap=learned?clamp((requested-learned)/Math.max(5,learned),-1,1):0;
  const doseRisk=learned&&days>=7?clamp(Math.max(0,doseGap)*.65 + recentFriction*.35,0,1):recentFriction*.35;

  const growthAreas=Array.isArray(long.growthAreas)?long.growthAreas:[];
  const stableAreas=Array.isArray(long.stableAreas)?long.stableAreas:[];
  const fragileAreas=Array.isArray(long.fragileAreas)?long.fragileAreas:[];
  const returnAreas=Array.isArray(long.returnAreas)?long.returnAreas:[];
  const preferredGrowth=growthAreas.filter(id=>(profile.priorities||[]).includes(id));
  const evidenceCoverage=clamp(effectiveDays/12,0,1);
  const evidenceConfidence=clamp(((Number(history.confidence||0)/100)*.62 + evidenceCoverage*.23 + globalFreshness*.15)*(.72+.28*globalFreshness),0,1);

  const capacityPhase=long.capacityPhase||{phase:CAPACITY_PHASE.UNKNOWN,known:false};
  const behaviorShift=long.behaviorShift||{state:BEHAVIOR_SHIFT.UNKNOWN,known:false};
  const periodPenalty=capacityPhase.phase===CAPACITY_PHASE.LOWER?.18:0;
  const shiftPenalty=behaviorShift.state===BEHAVIOR_SHIFT.DOWN?.16:0;
  const periodSupport=capacityPhase.phase===CAPACITY_PHASE.RISING?.05:0;
  const adjustedOverloadRisk=clamp(overloadRisk+periodPenalty+shiftPenalty,0,1);

  const strongBehavior=days>=6&&week>=.82&&history.heavy3===0;
  const deepenEligible=strongBehavior&&preferredGrowth.length>0&&checkin.energy>=3&&checkin.load<=3&&doseRisk<.42
    &&globalFreshness>=.68&&effectiveDays>=5.2
    &&capacityPhase.phase!==CAPACITY_PHASE.LOWER&&behaviorShift.state!==BEHAVIOR_SHIFT.DOWN;

  const contradictions=[];
  if(days>=5&&profile.rhythm==='strong'&&week<.55)contradictions.push('Başlangıçta güçlü düzen seçildi; son kullanım verisi daha kırılgan bir tempo gösteriyor.');
  if(days>=5&&['new','irregular'].includes(profile.rhythm)&&week>=.84)contradictions.push('Başlangıç profiline göre beklenenden daha istikrarlı kullanım oluştu; gerçek davranış öne alındı.');
  if(days>=7&&learned&&requested>=learned*1.35)contradictions.push(`Bugünkü ${requested} dk isteği, öğrenilen sürdürülebilir dozun (${learned} dk) belirgin üzerinde.`);
  if(capacityPhase.phase===CAPACITY_PHASE.LOWER)contradictions.push('Son günler önceki döneme göre daha düşük kapasite sinyali veriyor; eski güçlü dönem aynen bugüne taşınmadı.');
  if(behaviorShift.state===BEHAVIOR_SHIFT.DOWN)contradictions.push('Yakın dönem davranışı önceki tabana göre belirgin zayıfladı; motor geçici değişimi ayrı bir sinyal olarak izliyor.');
  if(returnAreas.length)contradictions.push(`${returnAreas.length} rutin uzun ara sonrası yeniden doğrulanacak; eski doz otomatik geri yüklenmeyecek.`);
  if(days>=4&&globalFreshness<.55)contradictions.push('Geçmiş kullanım kanıtının önemli bölümü eskidi; eski başarılar bugünkü kararı tek başına taşıyamaz.');

  return {
    evidenceDays:days,effectiveEvidenceDays:effectiveDays,evidenceFreshness:globalFreshness,evidenceStatus:history.evidenceStatus||EVIDENCE_STATUS.FRESH,priorWeight,evidenceConfidence,completionBase,consistency,
    recentCompletion:recent,weeklyCompletion:week,monthlyCompletion:month,
    heavyRate3,checkinStrain,blockerPrior,recentFriction,
    overloadRisk:adjustedOverloadRisk,rawOverloadRisk:overloadRisk,
    requestedMinutes:requested,learnedSustainableMinutes:learned,doseGap,doseRisk,
    growthAreas,stableAreas,fragileAreas,returnAreas,preferredGrowth,deepenEligible,
    capacityPhase,behaviorShift,periodPenalty,periodSupport,shiftPenalty,
    contradictions,
    confidenceLabel:evidenceConfidence<.30?'Veri topluyor':evidenceConfidence<.58?'Gelişiyor':evidenceConfidence<.78?'Orta':'Güçlü'
  };
}

export function deriveMode({profile={},checkin={},history={},lightDay=false,studentModel=null}){
  if(lightDay)return MODE.LIGHT;
  const model=studentModel||buildStudentModel({profile,checkin,history});
  if(model.evidenceDays<3)return MODE.COLLECT;
  const repeatedFriction=model.recentCompletion<.50||Number(history.heavy3||0)>=2;
  const periodDrop=model.capacityPhase?.phase===CAPACITY_PHASE.LOWER;
  const behaviorDrop=model.behaviorShift?.state===BEHAVIOR_SHIFT.DOWN;
  if(repeatedFriction||periodDrop||behaviorDrop||model.overloadRisk>=.62||model.doseRisk>=.68)return MODE.RECOVERY;
  if(model.deepenEligible)return MODE.DEEPEN;
  return MODE.BALANCED;
}

export function capacityBudget({profile={},checkin={},history={},mode,lightDay=false,studentModel=null}){
  const model=studentModel||buildStudentModel({profile,checkin,history});
  let requested=Number(checkin.minutes||profile.baseMinutes||15);
  requested=clamp(requested,5,60);
  let factor=1;
  if(checkin.energy<=2)factor-=.18;
  if(checkin.energy>=4)factor+=.05;
  if(checkin.load>=4)factor-=.17;
  if(checkin.load<=2)factor+=.035;
  if(checkin.mood==='low')factor-=.11;
  if(checkin.mood==='motivated')factor+=.04;
  if(checkin.context==='busy')factor-=.14;
  if(checkin.context==='travel')factor-=.08;
  if(checkin.context==='rest')factor+=.05;
  if(mode===MODE.RECOVERY)factor-=.14;
  if(mode===MODE.DEEPEN)factor+=.05;
  if(mode===MODE.COLLECT)factor-=.04;
  if(lightDay||mode===MODE.LIGHT)factor=Math.min(factor,.62);

  if(model.evidenceDays>=3){
    if(model.recentCompletion<.50)factor-=.11;
    else if(model.weeklyCompletion>=.86&&model.heavyRate3===0)factor+=.025;
  }

  const capacityPhase=model.capacityPhase?.phase;
  if(capacityPhase===CAPACITY_PHASE.LOWER)factor-=.10;
  else if(capacityPhase===CAPACITY_PHASE.RISING&&mode!==MODE.RECOVERY)factor+=.025;
  if(model.behaviorShift?.state===BEHAVIOR_SHIFT.DOWN)factor-=.07;
  else if(model.behaviorShift?.state===BEHAVIOR_SHIFT.UP&&mode===MODE.BALANCED)factor+=.015;

  factor+=Number(history.long?.weekdayAdjustment||0);
  factor=clamp(factor,.40,1.10);
  let budget=Math.max(5,Math.min(requested,Math.round(requested*factor)));

  const learned=model.learnedSustainableMinutes;
  if(learned&&model.evidenceDays>=7&&!lightDay){
    let margin=mode===MODE.DEEPEN?1.22:mode===MODE.RECOVERY?1.02:1.15;
    if(capacityPhase===CAPACITY_PHASE.LOWER)margin=Math.min(margin,.98);
    if(model.behaviorShift?.state===BEHAVIOR_SHIFT.DOWN)margin=Math.min(margin,1.00);
    const ceiling=Math.max(5,Math.round(learned*margin));
    budget=Math.min(budget,ceiling);
  }

  const periodCeiling=model.capacityPhase?.recentSuccessfulMinutes;
  if(model.capacityPhase?.phase===CAPACITY_PHASE.LOWER&&Number.isFinite(periodCeiling)&&model.capacityPhase.recentSamples>=4){
    budget=Math.min(budget,Math.max(5,Math.round(periodCeiling*1.05)));
  }

  return {
    requested,budget,factor,learnedSustainableMinutes:learned||null,doseRisk:model.doseRisk,
    capacityPhase:model.capacityPhase?.phase||CAPACITY_PHASE.UNKNOWN,
    behaviorShift:model.behaviorShift?.state||BEHAVIOR_SHIFT.UNKNOWN
  };
}

function taskVariant({id,signal,mode,checkin,interventionPolicy=null,capacityPhase=CAPACITY_PHASE.UNKNOWN}){
  const def=TASK_CATALOG[id];
  let variant='normal',duration=def.base,intervention='none';

  if(signal.returnDue){
    variant='micro';duration=def.min;intervention='gentle-return';
  }else if(signal.state===ROUTINE_STATE.FRAGILE){
    variant='micro';duration=def.min;intervention='micro-dose';
  }else if(mode===MODE.RECOVERY||mode===MODE.LIGHT||checkin.energy<=2||checkin.load>=4||capacityPhase===CAPACITY_PHASE.LOWER){
    variant='micro';duration=def.min;intervention='capacity-protect';
  }

  if(signal.typicalMinutes&&signal.state===ROUTINE_STATE.STABLE&&variant==='normal'){
    duration=clamp(signal.typicalMinutes,def.min,def.base);
  }

  const earned=signal.state===ROUTINE_STATE.GROWTH&&signal.samples>=6&&signal.verified===true&&signal.evidenceFreshness>=.68;
  if(mode===MODE.DEEPEN&&earned&&checkin.energy>=3&&checkin.load<=3&&capacityPhase!==CAPACITY_PHASE.LOWER){
    variant='deep';duration=Math.min(def.max,Math.max(def.base+2,Math.round(def.base*1.25)));intervention='controlled-deepen';
  }

  if(checkin.context==='busy'||checkin.context==='travel')duration=Math.max(def.min,duration-1);

  // Intervention backtests are deliberately bounded. A negative result does not
  // suddenly enlarge the dose; it only prevents repeated escalation.
  if(interventionPolicy?.policy==='change'&&intervention==='controlled-deepen'){
    variant='normal';duration=Math.min(def.base,duration);intervention='deepen-hold';
  }
  if(interventionPolicy?.policy==='repeat'&&intervention==='micro-dose'){
    duration=def.min;
  }

  return {variant,duration,intervention};
}

function taskScore({id,profile,checkin,history,mode,studentModel,interventionPolicy=null}){
  const def=TASK_CATALOG[id],sig=history.category[id]||{samples:0,completion:0,lastDoneDays:31,lastPlannedDays:31,hardRate:0,easyRate:0,state:ROUTINE_STATE.COLLECT,shift:BEHAVIOR_SHIFT.UNKNOWN,frequencyReady:true};
  let score=10,reasons=[];
  const preferred=(profile.priorities||[]).includes(id);
  if(preferred){score+=30;reasons.push('seçtiğin önceliklerden biri');}
  if(id==='prayerPlan'&&profile.prayerTracking){score+=22;reasons.push('namaz planını takip etmek istiyorsun');}

  if(sig.returnDue){
    score+=12;
    reasons.push(`bu rutin ${sig.lastDoneDays} günlük aradan sonra doğrudan eski doza değil, yumuşak geri dönüşe alınacak`);
  }else if(sig.samples>=4&&sig.completion<.48){
    score-=9;reasons.push('bu rutin son denemelerde sık aksadığı için sıklığı azaltıldı');
  }else if(sig.lastDoneDays>=4){
    score+=5;reasons.push('birkaç gündür tamamlanmadı; küçük bir geri dönüş uygun');
  }

  if(sig.state===ROUTINE_STATE.FRAGILE){
    score-=2;reasons.push('bu alanda mikro doz daha sürdürülebilir görünüyor');
    if(sig.frequencyReady===false){score-=18;reasons.push('kırılgan rutini her gün tekrar zorlamak yerine kısa ara veriliyor');}
  }
  if(sig.state===ROUTINE_STATE.GROWTH&&mode===MODE.DEEPEN){score+=9;reasons.push('gerçek kullanım verisinde kontrollü derinleşme hakkı kazandı');}
  if(sig.state===ROUTINE_STATE.STABLE&&sig.verified){score+=4;reasons.push('bu rutin zamana yayılmış ve güncel kullanım verisiyle doğrulandı');}
  else if(sig.state===ROUTINE_STATE.STABLE){score+=1;reasons.push('bu rutin iyi gidiyor ama henüz zamana yayılmış doğrulama tamamlanmadı');}

  if(sig.shift===BEHAVIOR_SHIFT.DOWN){score-=4;reasons.push('bu rutinin yakın dönem performansı kendi geçmişine göre geriledi');}
  if(sig.shift===BEHAVIOR_SHIFT.UP){score+=3;reasons.push('bu rutinde olumlu davranış değişimi var; artış yine sınırlı tutuluyor');}

  if(interventionPolicy?.policy==='repeat'){score+=2;reasons.push('bu alanda daha önce kullanılan küçük müdahale tekrar eden veride işe yaradı');}
  if(interventionPolicy?.policy==='change'){score-=5;reasons.push('önceki müdahale aynı koşullarda tekrar eden veride yeterince işe yaramadı; aynı yaklaşım körlemesine tekrarlanmayacak');}
  if(interventionPolicy?.policy==='revalidate'){reasons.push('bu müdahaleye dair eski kanıt zayıfladı; politika yeniden doğrulanıyor');}

  if(checkin.energy<=2&&def.cognitive>=3)score-=18;
  if(checkin.energy>=4&&def.cognitive>=2)score+=5;
  if(checkin.load>=4&&def.calm>=3){score+=11;reasons.push('bugünkü zihinsel yüke daha uygun');}
  if(checkin.load>=4&&def.cognitive>=3)score-=17;
  if(checkin.mood==='low'&&def.min<=4){score+=7;reasons.push('başlaması daha kolay');}
  if(checkin.context==='travel'&&def.portable>=3){score+=9;reasons.push('yolculuk gününe taşınabilir');}
  if(checkin.context==='busy'&&def.min<=4)score+=7;
  if(id==='meal'&&profile.quranLevel==='beginner')score-=5;
  if(id==='quran'&&['beginner','rare'].includes(profile.quranLevel||'')){score+=8;reasons.push('Kur’an düzenini sade biçimde kurmaya yardım eder');}
  if(id==='reading'&&profile.reading==='none')score-=2;

  if(sig.samples>=4){
    const observed=(sig.completion-.65)*18;
    score+=clamp(observed,-6,6);
  }
  if(studentModel?.overloadRisk>.65&&def.cognitive>=3)score-=6;
  return {score,reasons,signal:sig};
}

function cognitiveHeavy(id){return (TASK_CATALOG[id]?.cognitive||0)>=3;}

function interventionIntent({sig,mode,capacityPhase,checkin={}}){
  if(sig?.returnDue)return 'gentle-return';
  if(sig?.state===ROUTINE_STATE.FRAGILE)return 'micro-dose';
  if(mode===MODE.DEEPEN&&sig?.state===ROUTINE_STATE.GROWTH)return 'controlled-deepen';
  if(mode===MODE.RECOVERY||capacityPhase===CAPACITY_PHASE.LOWER||Number(checkin.energy||3)<=2||Number(checkin.load||3)>=4||checkin.context==='busy')return 'capacity-protect';
  return null;
}

function interventionPolicyContext({sig,mode,capacityPhase,checkin}){
  if(sig?.returnDue)return 'return';
  if(mode===MODE.DEEPEN&&sig?.state===ROUTINE_STATE.GROWTH)return 'growth';
  if(mode===MODE.RECOVERY||capacityPhase===CAPACITY_PHASE.LOWER||Number(checkin.energy||3)<=2||Number(checkin.load||3)>=4||checkin.context==='busy')return 'low-capacity';
  return 'normal';
}

export function buildRoute({date,profile={},checkin={},records=[],lightDay=false}){
  if(!date)throw new Error('date required');
  if(!checkin.minutes||!checkin.energy||!checkin.load||!checkin.mood||!checkin.context)return null;
  const history=historySignals(records,date);
  const studentModel=buildStudentModel({profile,checkin,history});
  const mode=deriveMode({profile,checkin,history,lightDay,studentModel});
  const cap=capacityBudget({profile,checkin,history,mode,lightDay,studentModel});
  const interventionMap=history.long?.interventions||{};

  const policyFor=(id,sig)=>{
    const options=interventionMap[id]||{};
    const kind=interventionIntent({sig,mode,capacityPhase:cap.capacityPhase,checkin});
    if(!kind)return null;
    const overall=options[kind]||null;
    if(!overall)return null;
    const context=interventionPolicyContext({sig,mode,capacityPhase:cap.capacityPhase,checkin});
    const contextual=overall.contexts?.[context]||null;
    const selected=contextual&&contextual.samples>=2&&contextual.policy!=='collect'?contextual:overall;
    return {...selected,kind,selectedContext:context,source:contextual===selected?'context':'overall'};
  };

  const candidates=Object.keys(TASK_CATALOG)
    .filter(id=>id!=='prayerPlan'||!!profile.prayerTracking)
    .filter(id=>id==='prayerPlan'||PRIORITY_IDS.includes(id))
    .map(id=>{
      const sig=history.category[id]||{};
      const policy=policyFor(id,sig);
      return {id,policy,...taskScore({id,profile,checkin,history,mode,studentModel,interventionPolicy:policy})};
    })
    .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));

  const maxTasks=cap.budget<=8?2:cap.budget<=14?3:cap.budget<=24?4:5;
  const heavyLimit=(cap.budget<=20||checkin.energy<=2||checkin.load>=4||studentModel.overloadRisk>=.58||cap.capacityPhase===CAPACITY_PHASE.LOWER)?1:2;
  const chosen=[];let spent=0,heavy=0;
  for(const c of candidates){
    if(chosen.length>=maxTasks)break;
    if(cognitiveHeavy(c.id)&&heavy>=heavyLimit)continue;
    const variant=taskVariant({
      id:c.id,signal:c.signal,mode,checkin,interventionPolicy:c.policy,
      capacityPhase:cap.capacityPhase
    });
    let duration=variant.duration;
    if(spent+duration>cap.budget){
      if(chosen.length<2&&TASK_CATALOG[c.id].min<=cap.budget-spent){duration=TASK_CATALOG[c.id].min;}
      else continue;
    }
    chosen.push({
      id:c.id,duration,
      slot:profile.slotOverrides?.[c.id]||TASK_CATALOG[c.id].defaultSlot,
      variant:variant.variant,
      intervention:variant.intervention,
      interventionPolicy:c.policy?.policy||'collect',
      interventionPolicyConfidence:c.policy?.confidence||0,
      interventionPolicyContext:c.policy?.selectedContext||interventionPolicyContext({sig:c.signal,mode,capacityPhase:cap.capacityPhase,checkin}),
      interventionPolicySource:c.policy?.source||'none',
      reasons:c.reasons,
      method:TASK_CATALOG[c.id].methods[variant.variant],
      routineState:c.signal.state,
      routineVerification:c.signal.verification||ROUTINE_VERIFICATION.COLLECT,
      routineVerified:!!c.signal.verified,
      routineConfidence:c.signal.confidence,
      routineEvidenceStatus:c.signal.evidenceStatus||EVIDENCE_STATUS.STALE,
      routineEvidenceFreshness:Math.round(Number(c.signal.evidenceFreshness||0)*100),
      routineContinuity:Math.round(Number(c.signal.continuity||0)*100),
      returnDue:!!c.signal.returnDue,
      behaviorShift:c.signal.shift||BEHAVIOR_SHIFT.UNKNOWN
    });
    spent+=duration;if(cognitiveHeavy(c.id))heavy++;
  }
  if(chosen.length===0){
    chosen.push({
      id:'dua',duration:3,slot:profile.slotOverrides?.dua||TASK_CATALOG.dua.defaultSlot,
      variant:'micro',intervention:'capacity-protect',interventionPolicy:'collect',
      reasons:['bugün için en hafif başlangıç'],method:TASK_CATALOG.dua.methods.micro,
      routineState:ROUTINE_STATE.COLLECT,routineVerification:ROUTINE_VERIFICATION.COLLECT,routineVerified:false,routineConfidence:15,routineEvidenceStatus:EVIDENCE_STATUS.STALE,routineEvidenceFreshness:0,routineContinuity:0,returnDue:false,
      behaviorShift:BEHAVIOR_SHIFT.UNKNOWN
    });
    spent=3;
  }

  chosen.sort((a,b)=>(TIME_SLOTS[a.slot]?.order||9)-(TIME_SLOTS[b.slot]?.order||9));
  const timeLearning=timeSlotLearning({records,today:date,profile});

  const interventionInsights=[];
  for(const [taskId,map] of Object.entries(interventionMap)){
    for(const [kind,x] of Object.entries(map||{})){
      if(x.samples>=2&&x.policy!=='collect'){
        interventionInsights.push({
          taskId,kind,samples:x.samples,effectiveSamples:x.effectiveSamples,policy:x.policy,
          confidence:x.confidence,freshness:x.freshness,latestAgeDays:x.latestAgeDays,
          averageEffect:x.averageEffect,helpfulRate:x.helpfulRate,harmfulRate:x.harmfulRate,
          contexts:Object.fromEntries(Object.entries(x.contexts||{}).map(([k,v])=>[k,{samples:v.samples,effectiveSamples:v.effectiveSamples,policy:v.policy,confidence:v.confidence,averageEffect:v.averageEffect,freshness:v.freshness}]))
        });
      }
    }
  }
  interventionInsights.sort((a,b)=>b.samples-a.samples||Math.abs(b.averageEffect)-Math.abs(a.averageEffect));

  const why=[];
  if(mode===MODE.COLLECT)why.push('Motor henüz seni tanıyor; başlangıç cevaplarını yalnız ön kabul olarak kullanıyor ve kesin hüküm vermiyor.');
  if(mode===MODE.RECOVERY)why.push('Gerçek tamamlama, zorlanma, davranış değişimi ve bugünkü kapasite birlikte değerlendirildi; sürdürülebilir doz seçildi.');
  if(mode===MODE.BALANCED)why.push('Geçmiş davranış ile bugünkü kapasite birbirini destekliyor; normal doz seçildi.');
  if(mode===MODE.DEEPEN)why.push('Derinleşme yalnız güçlü davranış kanıtı, uygun dönemsel kapasite ve oturmuş bir öncelik alanı bulunduğu için açıldı.');
  if(mode===MODE.LIGHT)why.push('Hafif gün seçildi; bu tercih geçmişte başarısızlık olarak yorumlanmaz.');
  if(checkin.load>=4)why.push('Zihinsel yük yüksek olduğu için sakin ve düşük bilişsel yüklü görevler öne alındı.');
  if(checkin.energy<=2)why.push('Enerji düşük olduğu için görevler mikro doza çekildi.');
  if(history.heavy3)why.push('Yakın zamanda “ağır geldi” geri bildirimi olduğu için yük artırılmadı.');
  if(history.long.weekdayReason)why.push(history.long.weekdayReason);
  if(cap.learnedSustainableMinutes&&history.long.evidenceDays>=7)why.push(`Gerçek kullanım verisinde sürdürülebilir günlük dozun yaklaşık ${cap.learnedSustainableMinutes} dakika çevresinde görünüyor.`);
  if(timeLearning.suggestions.length)why.push('Zamanlama verisinde tekrar eden bir sürtünme bulundu; görev saati yalnız kullanıcı onayıyla değiştirilecek.');
  if(studentModel.capacityPhase?.known)why.push(`Dönemsel kapasite: ${studentModel.capacityPhase.phase}. ${studentModel.capacityPhase.reason}`);
  if(studentModel.behaviorShift?.known)why.push(`Davranış değişimi: ${studentModel.behaviorShift.state}. ${studentModel.behaviorShift.reason}`);
  if(studentModel.returnAreas?.length)why.push('Uzun ara verilen oturmuş rutinler eski doza dönmeden önce yumuşak geri dönüş ile yeniden doğrulanacak.');
  if(studentModel.evidenceStatus===EVIDENCE_STATUS.STALE||studentModel.evidenceFreshness<.55)why.push('Geçmiş kanıtın tazeliği azaldı; eski başarılı dönemler bugünkü dozu veya derinleşmeyi tek başına belirleyemez.');
  const verifiedCount=Object.values(history.category||{}).filter(x=>x.verified).length;
  if(verifiedCount)why.push(`${verifiedCount} rutin zamana yayılmış, güncel ve düşük zorlanmalı verilerle doğrulandı.`);
  if(interventionInsights.some(x=>x.policy==='repeat'))why.push('Bazı küçük müdahaleler tekrar eden kullanımda olumlu sonuç verdi; motor bunları sınırlı biçimde tekrar kullanabilir.');
  if(interventionInsights.some(x=>x.policy==='change'))why.push('Bazı müdahaleler tekrar eden kullanımda yeterli fayda göstermedi; motor aynı yaklaşımı körlemesine tekrarlamayacak.');
  why.push(...studentModel.contradictions);

  const analysis={
    engineVersion:'2.1',
    evidenceDays:studentModel.evidenceDays,
    effectiveEvidenceDays:Number(studentModel.effectiveEvidenceDays.toFixed?.(1)??studentModel.effectiveEvidenceDays),
    evidenceFreshness:Math.round(studentModel.evidenceFreshness*100),
    evidenceStatus:studentModel.evidenceStatus,
    confidence:Math.round(studentModel.evidenceConfidence*100),
    confidenceLabel:studentModel.confidenceLabel,
    priorWeight:Math.round(studentModel.priorWeight*100),
    recentCompletion:Math.round(studentModel.recentCompletion*100),
    weeklyCompletion:Math.round(studentModel.weeklyCompletion*100),
    consistency:Math.round(studentModel.consistency*100),
    overloadRisk:Math.round(studentModel.overloadRisk*100),
    doseRisk:Math.round(studentModel.doseRisk*100),
    learnedSustainableMinutes:studentModel.learnedSustainableMinutes,
    capacityPhase:studentModel.capacityPhase?.phase||CAPACITY_PHASE.UNKNOWN,
    capacityConfidence:studentModel.capacityPhase?.confidence||0,
    behaviorShift:studentModel.behaviorShift?.state||BEHAVIOR_SHIFT.UNKNOWN,
    behaviorDelta:Math.round(Number(studentModel.behaviorShift?.delta||0)*100),
    observedWins:studentModel.stableAreas,
    verifiedRoutines:Object.entries(history.category||{}).filter(([,x])=>x.verified).map(([id])=>id),
    revalidationRoutines:Object.entries(history.category||{}).filter(([,x])=>x.verification===ROUTINE_VERIFICATION.REVALIDATE).map(([id])=>id),
    fragileAreas:studentModel.fragileAreas,
    returnAreas:studentModel.returnAreas,
    contradictions:studentModel.contradictions,
    interventionInsights:interventionInsights.slice(0,6),
    decision:mode,
    decisionReasons:[...why]
  };

  const returnSafety=chosen.filter(x=>x.returnDue).every(x=>x.variant==='micro'&&x.intervention==='gentle-return');

  return {
    version:6,motorVersion:'2.1',date,mode,confidence:analysis.confidence,confidenceLabel:analysis.confidenceLabel,
    requestedMinutes:cap.requested,budget:cap.budget,totalMinutes:spent,capacityFactor:cap.factor,
    tasks:chosen,why,timeSuggestions:timeLearning.suggestions,analysis,
    evidence:{days:history.evidenceDays,completion3:history.completion3,completion7:history.completion7,heavy3:history.heavy3,easy3:history.easy3},
    learner:{
      sustainableMinutes:history.long.sustainableMinutes,
      completion30:history.long.completion30,
      evidenceFreshness:history.long.evidenceFreshness,
      evidenceStatus:history.long.evidenceStatus,
      effectiveEvidenceDays:history.long.effectiveEvidenceDays,
      growthAreas:history.long.growthAreas,
      stableAreas:history.long.stableAreas,
      fragileAreas:history.long.fragileAreas,
      returnAreas:history.long.returnAreas,
      todayPattern:history.long.todayPattern,
      weekdayReason:history.long.weekdayReason,
      timeSlots:timeLearning.slots,
      capacityPhase:history.long.capacityPhase,
      behaviorShift:history.long.behaviorShift,
      interventions:history.long.interventions
    },
    invariants:{
      withinBudget:spent<=cap.budget,
      heavyCount:chosen.filter(x=>cognitiveHeavy(x.id)).length,
      heavyLimit,
      uniqueTasks:new Set(chosen.map(x=>x.id)).size===chosen.length,
      returnSafety
    }
  };
}

export function weeklyDigest({records=[],today}){
  const h=historySignals(records,today);
  const cats=Object.entries(h.category).filter(([,x])=>x.samples>=2);
  cats.sort((a,b)=>b[1].completion-a[1].completion);
  const strongest=cats[0]?.[0]||null;
  const friction=[...cats].sort((a,b)=>a[1].completion-b[1].completion)[0]?.[0]||null;
  let next='Veri toplamaya devam et.';
  if(h.evidenceDays>=3&&h.completion3<.5)next='Yeni haftada görev sayısını azaltıp süreyi sade tut.';
  else if(h.long.growthAreas.length&&h.evidenceDays>=6&&h.completion7>=.82&&h.heavy3===0)next='Sadece 30 günlük veride hazır görünen bir alanda küçük derinleşme denenebilir.';
  else if(h.evidenceDays>=3)next='Mevcut dozu koru; istikrar oturmadan yeni yük ekleme.';
  return {evidenceDays:h.evidenceDays,completion7:h.completion7,heavy3:h.heavy3,strongest,friction,next,confidence:h.confidence};
}

export function monthlyDigest({records=[],today}){
  const m=longitudinalModel(records,today);
  const routineRows=Object.entries(m.routines).filter(([,x])=>x.samples>=2).sort((a,b)=>b[1].confidence-a[1].confidence);
  const weekdayRows=Object.values(m.weekday).filter(x=>x.samples>=2).sort((a,b)=>b.samples-a.samples);
  const learnedInterventions=[];
  for(const [taskId,map] of Object.entries(m.interventions||{})){
    for(const [kind,x] of Object.entries(map||{})){
      if(x.samples>=2&&x.policy!=='collect')learnedInterventions.push({taskId,kind,...x});
    }
  }
  learnedInterventions.sort((a,b)=>b.samples-a.samples||Math.abs(b.averageEffect)-Math.abs(a.averageEffect));

  let summary='Motor uzun dönem model için veri topluyor.';
  if(m.evidenceDays>=7){
    if(m.capacityPhase?.phase===CAPACITY_PHASE.LOWER)summary='Yakın dönem kapasitesi önceki döneme göre düşmüş görünüyor; eski güçlü doz bugüne aynen taşınmayacak.';
    else if(m.returnAreas.length)summary='Bazı oturmuş rutinlerde uzun ara var; eski doza dönmeden önce yumuşak geri dönüş uygulanacak.';
    else if(m.fragileAreas.length)summary='Bazı rutinlerde daha küçük doz ve daha seyrek temas sürdürülebilir görünüyor; motor baskıyı artırmayacak.';
    else if(m.growthAreas.length)summary='En az bir rutin yeterli kanıtla oturdu; uygun günlerde kontrollü derinleşme açılabilir.';
    else summary='Genel doz dengeli görünüyor; önce istikrarı korumak daha anlamlı.';
  }
  return {...m,routineRows,weekdayRows,learnedInterventions,summary};
}
