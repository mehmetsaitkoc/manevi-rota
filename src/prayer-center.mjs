export const PRAYERS=[
  {id:'fajr',label:'Sabah',api:'Fajr',icon:'🌅'},
  {id:'dhuhr',label:'Öğle',api:'Dhuhr',icon:'☀️'},
  {id:'asr',label:'İkindi',api:'Asr',icon:'🌤️'},
  {id:'maghrib',label:'Akşam',api:'Maghrib',icon:'🌇'},
  {id:'isha',label:'Yatsı',api:'Isha',icon:'🌙'}
];

export const emptyQada=()=>({
  enabled:false,
  balances:Object.fromEntries(PRAYERS.map(p=>[p.id,0])),
  dailyTarget:1,
  logs:[],
  initializedAt:null
});

export const cleanTime=value=>String(value||'').match(/\b\d{1,2}:\d{2}\b/)?.[0]||'';
export const toMinutes=value=>{const t=cleanTime(value);if(!t)return null;const [h,m]=t.split(':').map(Number);return h*60+m;};
export const formatDuration=mins=>{mins=Math.max(0,Math.round(mins));const h=Math.floor(mins/60),m=mins%60;return h?`${h} sa ${m} dk`:`${m} dk`;};

export function normalizePrayerPayload(data){
  const raw=data?.data?.timings||data?.timings||{};
  const meta=data?.data?.meta||data?.meta||{};
  const date=data?.data?.date||data?.date||{};
  const times={};
  for(const p of PRAYERS)times[p.id]=cleanTime(raw[p.api]);
  return {
    times,
    sunrise:cleanTime(raw.Sunrise),
    imsak:cleanTime(raw.Imsak),
    timezone:meta.timezone||'Europe/Istanbul',
    method:meta.method?.name||meta.method?.method||'',
    gregorian:date.gregorian?.date||'',
    hijri:date.hijri?.date||''
  };
}

function zoneMinute(now,timeZone='Europe/Istanbul'){
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hour12:false});
  const parts=Object.fromEntries(fmt.formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return Number(parts.hour)*60+Number(parts.minute);
}

export function prayerStatus(day,nextDay=null,now=new Date()){
  if(!day?.times)return {next:null,current:null,minutesUntil:null};
  const nowMin=zoneMinute(now,day.timezone);
  const list=PRAYERS.map(p=>({...p,time:day.times[p.id],minute:toMinutes(day.times[p.id])})).filter(x=>x.minute!==null);
  let next=list.find(x=>x.minute>nowMin)||null;
  const passed=list.filter(x=>x.minute<=nowMin);
  const current=passed.length?passed[passed.length-1]:null;
  let minutesUntil=next?next.minute-nowMin:null;
  let tomorrow=false;
  if(!next&&nextDay?.times?.fajr){
    const fm=toMinutes(nextDay.times.fajr);
    if(fm!==null){next={...PRAYERS[0],time:nextDay.times.fajr,minute:fm};minutesUntil=(24*60-nowMin)+fm;tomorrow=true;}
  }
  return {next,current,minutesUntil,tomorrow};
}

export const qadaRemaining=qada=>PRAYERS.reduce((s,p)=>s+Math.max(0,Number(qada?.balances?.[p.id]||0)),0);
export const qadaTodayCount=(qada,date)=>Array.isArray(qada?.logs)?qada.logs.filter(x=>x.date===date&&x.delta>0).reduce((s,x)=>s+x.delta,0):0;
export const qadaTargetProgress=(qada,date)=>({done:qadaTodayCount(qada,date),target:Math.max(0,Number(qada?.dailyTarget||0))});

export function setQadaBalance(qada,prayerId,value){
  const next=structuredClone(qada||emptyQada());
  if(!PRAYERS.some(p=>p.id===prayerId))return next;
  next.balances[prayerId]=Math.max(0,Math.floor(Number(value)||0));
  if(!next.initializedAt)next.initializedAt=new Date().toISOString();
  return next;
}

export function recordQada(qada,prayerId,date){
  const next=structuredClone(qada||emptyQada());
  const balance=Math.max(0,Number(next.balances?.[prayerId]||0));
  if(!next.enabled||balance<=0||!PRAYERS.some(p=>p.id===prayerId))return next;
  next.balances[prayerId]=balance-1;
  next.logs=Array.isArray(next.logs)?next.logs:[];
  next.logs.push({id:`q-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date,prayerId,delta:1,at:new Date().toISOString()});
  return next;
}

export function undoQada(qada){
  const next=structuredClone(qada||emptyQada());
  next.logs=Array.isArray(next.logs)?next.logs:[];
  const last=next.logs.at(-1);
  if(!last)return next;
  next.logs.pop();
  if(last.delta>0&&PRAYERS.some(p=>p.id===last.prayerId))next.balances[last.prayerId]=Math.max(0,Number(next.balances?.[last.prayerId]||0))+last.delta;
  return next;
}
