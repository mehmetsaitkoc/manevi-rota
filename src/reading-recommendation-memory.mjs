const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const statuses=new Set(['skipped','completed']);
const feedbacks=new Set(['heavy','ideal','easy']);

const iso=value=>{
  const d=new Date(value);
  return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();
};
const dateOnly=value=>String(value||'').slice(0,10);
const daysBetween=(older,newer)=>{
  const a=new Date(dateOnly(older)+'T12:00:00Z'),b=new Date(dateOnly(newer)+'T12:00:00Z');
  if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime()))return 99;
  return Math.max(0,Math.round((b-a)/86400000));
};
const uid=(prefix='rr')=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

function normalizeActive(value){
  const raw=object(value);
  const bookId=String(raw.bookId||'').trim(),date=dateOnly(raw.date);
  if(!bookId||!/\d{4}-\d{2}-\d{2}/.test(date))return null;
  return {
    id:String(raw.id||uid('rrs')).slice(0,120),
    date,
    bookId,
    kind:String(raw.kind||'book').slice(0,40),
    title:String(raw.title||'').slice(0,220),
    recommendedMinutes:clamp(raw.recommendedMinutes,1,60),
    rank:clamp(raw.rank||1,1,20),
    startedAt:iso(raw.startedAt||new Date().toISOString())
  };
}

function normalizeHistoryRow(value){
  const raw=object(value),status=String(raw.status||'');
  const bookId=String(raw.bookId||'').trim(),date=dateOnly(raw.date);
  if(!statuses.has(status)||!bookId||!/\d{4}-\d{2}-\d{2}/.test(date))return null;
  const row={
    id:String(raw.id||uid('rrh')).slice(0,120),
    date,bookId,status,
    kind:String(raw.kind||'book').slice(0,40),
    title:String(raw.title||'').slice(0,220),
    recommendedMinutes:clamp(raw.recommendedMinutes,1,60),
    rank:clamp(raw.rank||1,1,20),
    createdAt:iso(raw.createdAt||new Date().toISOString())
  };
  if(status==='completed'){
    row.actualMinutes=clamp(raw.actualMinutes||row.recommendedMinutes,1,120);
    row.feedback=feedbacks.has(raw.feedback)?raw.feedback:'ideal';
  }
  return row;
}

export function isMeaningfulRecommendationSession(session){
  const row=object(session);
  return Number(row.minutes||0)>=2||Number(row.pages||0)>=1;
}

export function emptyReadingRecommendationMemory(){
  return {active:null,history:[]};
}

export function normalizeReadingRecommendationMemory(input={}){
  const raw=object(input);
  const active=normalizeActive(raw.active);
  const history=(Array.isArray(raw.history)?raw.history:[])
    .map(normalizeHistoryRow).filter(Boolean)
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
    .slice(0,80);
  return {active,history};
}

export function startReadingRecommendation(memory,recommendation,{date,at=new Date().toISOString()}={}){
  const next=normalizeReadingRecommendationMemory(memory);
  if(!recommendation?.bookId||!date)return next;
  const current=next.active;
  if(current&&current.date===date&&current.bookId===recommendation.bookId&&current.kind===recommendation.kind)return next;
  next.active=normalizeActive({
    id:uid('rrs'),date,bookId:recommendation.bookId,kind:recommendation.kind,title:recommendation.title,
    recommendedMinutes:recommendation.minutes,rank:recommendation.rank||1,startedAt:at
  });
  return next;
}

export function skipReadingRecommendation(memory,recommendation,{date,at=new Date().toISOString()}={}){
  const next=normalizeReadingRecommendationMemory(memory);
  if(!recommendation?.bookId||!date)return next;
  const duplicate=next.history.some(x=>x.status==='skipped'&&x.date===date&&x.bookId===recommendation.bookId&&x.kind===recommendation.kind);
  if(!duplicate){
    next.history.unshift(normalizeHistoryRow({
      id:uid('rrh'),date,bookId:recommendation.bookId,kind:recommendation.kind,title:recommendation.title,
      recommendedMinutes:recommendation.minutes,rank:recommendation.rank||1,status:'skipped',createdAt:at
    }));
    next.history=next.history.slice(0,80);
  }
  if(next.active?.date===date&&next.active?.bookId===recommendation.bookId)next.active=null;
  return next;
}

export function completeReadingRecommendation(memory,{bookId,date,minutes,feedback='ideal',at=new Date().toISOString()}={}){
  const next=normalizeReadingRecommendationMemory(memory),active=next.active;
  if(!active||!bookId||active.bookId!==bookId)return next;
  const completionDate=dateOnly(date||active.date);
  next.history.unshift(normalizeHistoryRow({
    ...active,
    id:uid('rrh'),
    date:completionDate,
    status:'completed',
    actualMinutes:minutes||active.recommendedMinutes,
    feedback,
    createdAt:at
  }));
  next.history=next.history.slice(0,80);
  next.active=null;
  return next;
}

export function recommendationPreferenceSignal(memory,bookId,today,kind=null){
  const state=normalizeReadingRecommendationMemory(memory);
  const rows=state.history.filter(x=>x.bookId===bookId&&(!kind||x.kind===kind)&&daysBetween(x.date,today)<=30);
  let completedWeight=0,skippedWeight=0,heavyWeight=0,easyWeight=0;
  for(const row of rows){
    const freshness=Math.max(.20,1-daysBetween(row.date,today)/30);
    if(row.status==='completed'){
      completedWeight+=freshness;
      if(row.feedback==='heavy')heavyWeight+=freshness;
      if(row.feedback==='easy')easyWeight+=freshness;
    }else if(row.status==='skipped')skippedWeight+=freshness;
  }
  const effectiveSamples=completedWeight+skippedWeight;
  let adjustment=0;
  if(effectiveSamples>=1.5){
    adjustment=Math.round(clamp(completedWeight*3-skippedWeight*3+easyWeight-heavyWeight,-10,10));
  }
  let reason=null;
  if(adjustment>=4)reason='önceki önerilerde bu esere düzenli olarak devam ettin';
  else if(adjustment<=-4)reason='bu eseri birkaç kez başka öneriyle değiştirdin';
  return {
    samples:rows.length,effectiveSamples:Number(effectiveSamples.toFixed(2)),
    completedWeight:Number(completedWeight.toFixed(2)),skippedWeight:Number(skippedWeight.toFixed(2)),
    adjustment,reason
  };
}
