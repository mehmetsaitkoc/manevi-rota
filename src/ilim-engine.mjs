import {getBook,bookParagraphs} from './ilim-library.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const dayMs=86400000;
export function dayAddISO(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function daysBetween(a,b){return Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/dayMs)}

export function defaultIlimState(){return {
  activeBookId:'ilim-yoluna-giris-demo',
  progress:{'ilim-yoluna-giris-demo':{paraIndex:0,lastParaId:'p1',page:1,completed:false}},
  sessions:[],highlights:[],notes:[],reviews:[],reader:{fontScale:1,focus:false},
  profile:{level:'beginner',dailyMinutes:null}
}}

export function normalizeIlimState(raw={}){
  const base=defaultIlimState();return {
    ...base,...raw,
    progress:{...base.progress,...(raw.progress||{})},
    sessions:Array.isArray(raw.sessions)?raw.sessions:[],
    highlights:Array.isArray(raw.highlights)?raw.highlights:[],
    notes:Array.isArray(raw.notes)?raw.notes:[],
    reviews:Array.isArray(raw.reviews)?raw.reviews:[],
    reader:{...base.reader,...(raw.reader||{})},profile:{...base.profile,...(raw.profile||{})}
  }
}

function recentSessions(state,bookId,today,days=14){return state.sessions.filter(s=>s.bookId===bookId&&s.date&&daysBetween(s.date,today)>=0&&daysBetween(s.date,today)<=days)}
function sessionCompletion(s){return s.completed===false?0:1}
function sessionDifficulty(s){return s.feedback==='heavy'?1:s.feedback==='easy'?-1:0}
export function readingStats({state,bookId,today}){
  const all=state.sessions.filter(s=>s.bookId===bookId),recent=recentSessions(state,bookId,today,14),last7=recent.filter(s=>daysBetween(s.date,today)<=7);
  const completion=last7.length?last7.reduce((a,s)=>a+sessionCompletion(s),0)/last7.length:null;
  const heavy=last7.filter(s=>s.feedback==='heavy').length,easy=last7.filter(s=>s.feedback==='easy').length;
  const speeds=all.filter(s=>s.wordsRead>=80&&s.minutes>=2).map(s=>s.wordsRead/s.minutes).sort((a,b)=>a-b);
  const speed=speeds.length?speeds[Math.floor(speeds.length/2)]:125;
  return {sessions:all.length,recentSessions:last7.length,completion,heavy,easy,speed:Math.round(speed)}
}

export function buildReadingPlan({state,bookId,today,baseMinutes=15,availableMinutes=null}){
  const book=getBook(bookId);if(!book)throw new Error('Kitap bulunamadı');
  const paras=bookParagraphs(book),progress=state.progress[bookId]||{paraIndex:0,page:1},stats=readingStats({state,bookId,today});
  let minutes=clamp(Math.round((state.profile.dailyMinutes||Math.max(6,Math.round(baseMinutes*.45)))),5,20);
  const reasons=[];
  if(stats.recentSessions<3)reasons.push('İlk günlerde küçük dozla gerçek okuma ritmi ölçülüyor.');
  if(stats.completion!==null&&stats.recentSessions>=3){
    if(stats.completion<.6||stats.heavy>=2){minutes=Math.max(5,Math.round(minutes*.7));reasons.push('Yakın dönemde yük yüksek göründüğü için okuma dozu küçültüldü.');}
    else if(stats.completion>=.85&&stats.heavy===0&&stats.easy>=2&&stats.recentSessions>=5){minutes=Math.min(20,Math.round(minutes*1.15));reasons.push('Düzenli ve rahat okuma kanıtı oluştuğu için doz kontrollü artırıldı.');}
  }
  if(Number.isFinite(availableMinutes)){const cap=Math.max(4,Math.floor(availableMinutes*.55));if(minutes>cap){minutes=cap;reasons.push('Bugünkü toplam kapasiteni aşmamak için ilim dozu sınırlandı.');}}
  const start=clamp(Number(progress.paraIndex||0),0,Math.max(0,paras.length-1));
  const targetWords=Math.max(120,Math.round(minutes*stats.speed));let total=0,end=start;
  while(end<paras.length&&total<targetWords){total+=words(paras[end].text);end++;}
  end=Math.max(start+1,end);
  const slice=paras.slice(start,end),startPage=slice[0]?.page||progress.page||1,endPage=slice.at(-1)?.page||startPage;
  const done=end>=paras.length;
  return {bookId,date:today,minutes,startIndex:start,endIndex:end,startParaId:paras[start]?.id||null,endParaId:paras[Math.max(start,end-1)]?.id||null,startPage,endPage,words:total,estimatedSpeed:stats.speed,stats,reasons,finishesBook:done};
}

export function recordReadingSession(state,{bookId,date,plan,actualEndIndex,minutes,feedback='ideal'}){
  const book=getBook(bookId),paras=bookParagraphs(book);if(!book)throw new Error('Kitap bulunamadı');
  const start=clamp(Number(plan?.startIndex||0),0,paras.length),end=clamp(Number(actualEndIndex??plan?.endIndex??start),start,paras.length);
  const read=paras.slice(start,end),wordsRead=read.reduce((n,p)=>n+words(p.text),0),last=paras[Math.max(0,end-1)];
  const session={id:`rs-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,bookId,date,startIndex:start,endIndex:end,minutes:Math.max(1,Number(minutes||plan?.minutes||1)),feedback,wordsRead,completed:end>=Number(plan?.endIndex||end),createdAt:new Date().toISOString()};
  state.sessions.push(session);state.progress[bookId]={paraIndex:end,lastParaId:paras[end]?.id||last?.id||null,page:paras[end]?.page||last?.page||1,completed:end>=paras.length};return session;
}

function uid(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
export function addHighlight(state,{bookId,paraId,start,end,text,color='amber',review=false,date}){
  start=Math.max(0,Number(start));end=Math.max(start,Number(end));if(!text||end<=start)throw new Error('Geçerli bir metin seçmelisin.');
  const h={id:uid('hl'),bookId,paraId,start,end,text,color,createdAt:new Date().toISOString()};state.highlights.push(h);
  if(review)state.reviews.push({id:uid('rv'),highlightId:h.id,bookId,createdDate:date,nextDate:dayAddISO(date,1),stage:0,done:false});return h;
}
export function addNote(state,{bookId,paraId,highlightId=null,text,date,tags=[]}){if(!String(text||'').trim())throw new Error('Not boş olamaz.');const n={id:uid('nt'),bookId,paraId,highlightId,text:String(text).trim(),tags,createdDate:date,createdAt:new Date().toISOString()};state.notes.push(n);return n}
export function addHighlightToReview(state,{highlightId,bookId,date}){if(state.reviews.some(r=>r.highlightId===highlightId&&!r.done))return null;const r={id:uid('rv'),highlightId,bookId,createdDate:date,nextDate:dayAddISO(date,1),stage:0,done:false};state.reviews.push(r);return r}
export function dueReviews(state,today,limit=5){return state.reviews.filter(r=>!r.done&&r.nextDate<=today).sort((a,b)=>a.nextDate.localeCompare(b.nextDate)).slice(0,limit)}
export function completeReview(state,reviewId,today,result='remembered'){
  const r=state.reviews.find(x=>x.id===reviewId);if(!r)return null;
  const intervals=result==='hard'?[1,2,4,7]:[1,3,7,21];r.stage=Math.min(r.stage+1,intervals.length);if(r.stage>=intervals.length){r.done=true;r.completedDate=today;}else r.nextDate=dayAddISO(today,intervals[r.stage]);r.lastResult=result;return r;
}
export function bookProgressPct(state,bookId){const book=getBook(bookId),n=bookParagraphs(book).length,i=state.progress[bookId]?.paraIndex||0;return n?Math.round(clamp(i/n,0,1)*100):0}
export function readingLevelLabel(state,bookId,today){const s=readingStats({state,bookId,today});if(s.sessions<3)return 'Ritmi tanıyoruz';if(s.completion!==null&&s.completion<.6)return 'Dozu sadeleştiriyoruz';if(s.sessions>=8&&s.completion>=.85&&s.heavy===0)return 'İstikrar oluşuyor';return 'Ritim kuruluyor'}
