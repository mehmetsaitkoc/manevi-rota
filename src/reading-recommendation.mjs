import {STARTER_LIBRARY,starterBook} from './library-catalog.mjs';
import {normalizeBookReaderState} from './book-reader.mjs';
import {libraryPathSnapshot} from './library-path.mjs';
import {normalizeKirkHadisState,todayHadisPlan,dueReviews,getHadis} from './kirk-hadis.mjs';
import {routineMemory} from './route-engine.mjs';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const median=list=>{const a=[...list].map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const dayMs=86400000;
const daysBetween=(older,newer)=>{
  const a=new Date(String(older).slice(0,10)+'T12:00:00Z');
  const b=new Date(String(newer).slice(0,10)+'T12:00:00Z');
  if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime()))return 99;
  return Math.max(0,Math.round((b-a)/dayMs));
};
const levelOf=book=>Math.max(1,Math.min(5,Number(String(book?.stage||'level-1').match(/\d+/)?.[0]||1)));
const feedbackPenalty=value=>value==='heavy'?-8:value==='easy'?4:0;
const readerKind=book=>book?.readerType==='quran'?'quran':book?.readerType==='hadith'?'hadith':'book';
const priorityBoost=(profile,book)=>{
  const set=new Set(Array.isArray(profile?.priorities)?profile.priorities:[]);
  if(book?.readerType==='quran')return set.has('quran')?16:0;
  if(book?.readerType==='hadith')return set.has('learning')?14:0;
  return (set.has('reading')?13:0)+(set.has('learning')&&/İlm|Siyer|Hadis|Din|Ahlâk/i.test(String(book?.field||''))?5:0);
};
const titleFor=book=>book?.title||'Okuma';
const stageLabel=n=>`Seviye ${n}`;

function genericSessions(library={}){
  const out=[];
  for(const book of STARTER_LIBRARY.filter(x=>x.readerType==='generic'&&x.availability==='ready')){
    const state=normalizeBookReaderState(library?.books?.[book.id]||{});
    for(const session of state.sessions||[])out.push({...session,bookId:book.id});
  }
  return out.sort((a,b)=>String(b.endedAt||b.date).localeCompare(String(a.endedAt||a.date)));
}

function readingEvents({library={},ilim={},records=[]}={}){
  const out=genericSessions(library);
  const hs=normalizeKirkHadisState(ilim).sessions||[];
  for(const session of hs)out.push({
    id:session.id||`hadith-${session.date}-${session.hadisId}`,
    bookId:'kirk-hadis',
    date:session.date,
    endedAt:session.createdAt||session.date,
    minutes:Number(session.minutes)||10,
    feedback:session.feedback||'ideal'
  });
  for(const record of records||[]){
    for(const session of Array.isArray(record?.readingSessions)?record.readingSessions:[]){
      if(!session?.bookId)continue;
      if(out.some(x=>x.id&&session.id&&x.id===session.id))continue;
      out.push({...session,date:session.date||record.date});
    }
  }
  return out.sort((a,b)=>String(b.endedAt||b.date).localeCompare(String(a.endedAt||a.date)));
}

function perBookStats(events,bookId,date){
  const rows=events.filter(x=>x.bookId===bookId);
  const latest=rows[0]||null;
  const recent=rows.filter(x=>daysBetween(x.date||x.endedAt,date)<=7);
  const completedMinutes=recent.map(x=>Number(x.minutes)).filter(x=>Number.isFinite(x)&&x>0);
  const lastTwo=recent.slice(0,2);
  return {
    rows,recent,latest,
    daysSince:latest?daysBetween(latest.date||latest.endedAt,date):99,
    typicalMinutes:completedMinutes.length?Math.round(median(completedMinutes)):null,
    heavyLastTwo:lastTwo.length===2&&lastTwo.every(x=>x.feedback==='heavy'),
    easyRate:recent.length?recent.filter(x=>x.feedback==='easy').length/recent.length:0
  };
}

function streak(events){
  if(!events.length)return {bookId:null,count:0};
  const id=events[0].bookId;let count=0;
  for(const row of events){if(row.bookId!==id)break;count++}
  return {bookId:id,count};
}

function learnedMinutes(records,date){
  const memory=routineMemory(records,date);
  const values=[memory.reading?.typicalMinutes,memory.learning?.typicalMinutes].filter(Number.isFinite);
  return values.length?Math.round(median(values)):null;
}

function recommendationMinutes({book,stats,checkin,routeTypical,returning}){
  const available=clamp(checkin?.minutes||15,5,60);
  const base=stats?.typicalMinutes||routeTypical||(book?.readerType==='hadith'?10:book?.readerType==='quran'?6:8);
  let minutes=clamp(Math.round(base),4,15);
  if(stats?.heavyLastTwo)minutes=Math.max(4,Math.min(minutes-2,6));
  if(Number(checkin?.energy||3)<=2||Number(checkin?.load||3)>=4)minutes=Math.max(4,Math.min(minutes,6));
  if(returning)minutes=Math.max(4,Math.min(minutes,5));
  return Math.max(3,Math.min(minutes,available));
}

function genericLocator(state){
  return `Okuma ${Math.max(1,Number(state?.page)||1)}`;
}

function bookCompletion(state,total){
  const page=Math.max(1,Number(state?.page)||1),count=Number(total||state?.totalPages||0);
  return count>0?clamp(page/count,0,1):null;
}

function bookCandidates({date,profile,checkin,library,ilim,records,bookTotals,path,events,routeTypical}){
  const lastBook=String(library?.lastBook||'');
  const sameBook=streak(events);
  const allRecent=events.filter(x=>daysBetween(x.date||x.endedAt,date)<=7);
  const lastAny=events[0]||null;
  const returning=!!lastAny&&daysBetween(lastAny.date||lastAny.endedAt,date)>=5;
  const out=[];

  for(const book of STARTER_LIBRARY.filter(x=>x.availability==='ready')){
    if(book.id==='kirk-hadis')continue;
    const level=levelOf(book);
    const scoreReasons=[];
    let score=50;
    if(level===path.currentLevel){score+=30;scoreReasons.push('aktif seviyene uygun');}
    else if(level===path.currentLevel+1)score+=4;
    else if(level>path.currentLevel+1)score-=10;

    const pBoost=priorityBoost(profile,book);score+=pBoost;
    if(pBoost)scoreReasons.push('başlangıç önceliklerinle uyumlu');

    if(book.id===lastBook){score+=22;scoreReasons.push('kaldığın yere devam');}

    if(book.readerType==='quran'){
      const q=library?.quran||{};
      if(Number(q.surah||1)>1||Number(q.ayah||1)>1){score+=8;scoreReasons.push('Kur’ân’da kaldığın yer kayıtlı');}
      if(sameBook.bookId==='quran'&&sameBook.count>=4){score-=18;scoreReasons.push('son okumalarında Kur’ân ağırlığı zaten yüksek');}
      const minutes=recommendationMinutes({book,stats:null,checkin,routeTypical,returning});
      out.push({
        kind:'quran',bookId:book.id,title:book.title,minutes,score,
        locator:`${Number(q.surah||1)}. sûre · ${Number(q.ayah||1)}. âyet`,
        reasons:scoreReasons.slice(0,4),
        action:{type:'open-book',bookId:book.id}
      });
      continue;
    }

    const state=normalizeBookReaderState(library?.books?.[book.id]||{});
    const stats=perBookStats(events,book.id,date);
    const completion=bookCompletion(state,bookTotals?.[book.id]);
    const started=Number(state.page||1)>1||stats.rows.length>0;
    if(started){score+=14;scoreReasons.push('bu esere daha önce başladın');}
    if(stats.daysSince<=2){score+=9;scoreReasons.push('yakın zamanda bu eseri okudun');}
    else if(stats.daysSince>=7&&stats.daysSince<99&&started){score+=7;scoreReasons.push('bir süredir bu esere dönmedin');}
    if(stats.heavyLastTwo){score-=6;scoreReasons.push('son iki oturum ağır geldi; dozu küçült');}
    score+=Math.round(stats.easyRate*5);

    if(completion!==null&&completion>=.85){
      score+=18;scoreReasons.unshift('kitabın son bölümüne yaklaştın');
    }

    if(sameBook.bookId===book.id&&sameBook.count>=4&&!(completion!==null&&completion>=.85)){
      score-=24;scoreReasons.push('son okumalarında aynı eser çok baskın');
    }else if(sameBook.count>=4&&sameBook.bookId!==book.id&&level===path.currentLevel){
      score+=10;scoreReasons.push('aynı seviyede hafif çeşitlilik sağlayabilir');
    }

    if(returning){score+=book.id===lastBook?8:0;scoreReasons.unshift('mikro bir geri dönüş daha sürdürülebilir');}
    const minutes=recommendationMinutes({book,stats,checkin,routeTypical,returning});
    out.push({
      kind:'book',bookId:book.id,title:titleFor(book),minutes,score,
      locator:genericLocator(state),progress:completion,
      reasons:scoreReasons.slice(0,5),
      action:{type:'open-book',bookId:book.id}
    });
  }

  if(!allRecent.length&&!events.length){
    const starter=starterBook('islam-dini');
    const row=out.find(x=>x.bookId==='islam-dini');
    if(row&&starter&&path.currentLevel===1){
      row.score+=24;
      row.reasons=['başlangıç için kısa ve temel bir eser','aktif seviyenin ana kitabı',...row.reasons].slice(0,5);
    }
  }
  return out;
}

function hadithCandidates({date,profile,checkin,ilim,events,routeTypical,path}){
  const state=normalizeKirkHadisState(ilim);
  const due=dueReviews(state,date,6);
  const plan=todayHadisPlan(state,date);
  const stats=perBookStats(events,'kirk-hadis',date);
  const out=[];
  if(due.length){
    const oldest=due[0],overdue=Math.max(0,daysBetween(oldest.dueDate,date));
    const urgent=due.length>=2||overdue>=1;
    out.push({
      kind:'hadith-review',bookId:'kirk-hadis',title:due.length===1?'1 kısa hadis tekrarı':`${Math.min(2,due.length)} kısa hadis tekrarı`,
      minutes:Math.min(clamp(checkin?.minutes||10,5,60),due.length>=2?6:4),
      score:urgent?160:96,
      locator:oldest?.hadisId?`Hadis ${oldest.hadisId}`:'Kırk Hadis',
      reasons:[
        due.length>=2?`${due.length} tekrar bekliyor`:'bekleyen tekrar var',
        overdue>=1?`en eski tekrar ${overdue} gün gecikmiş`:'tekrar tarihi bugün',
        'yeni okumadan önce kısa geri çağırma'
      ],
      action:{type:'open-reviews'}
    });
  }

  const h=plan.hadis||getHadis(state.currentId);
  if(h){
    let score=48+priorityBoost(profile,starterBook('kirk-hadis'));
    const reasons=[];
    if(path.currentLevel===3){score+=30;reasons.push('aktif seviyene uygun');}
    if(state.completed.length){score+=6;reasons.push('Kırk Hadis rotan devam ediyor');}
    if(stats.heavyLastTwo){score-=7;reasons.push('son iki hadis oturumu ağır geldi');}
    if(due.length>=2)score-=45;
    const minutes=recommendationMinutes({book:starterBook('kirk-hadis'),stats,checkin,routeTypical,returning:false});
    out.push({
      kind:'hadith',bookId:'kirk-hadis',title:h.title,minutes:Math.min(minutes,plan.minutes||minutes),score,
      locator:`Hadis ${h.id}`,reasons:[plan.why,...reasons].filter(Boolean).slice(0,4),
      action:{type:'open-book',bookId:'kirk-hadis'}
    });
  }
  return out;
}

export function rankReadingRecommendations({
  date,
  profile={},
  checkin={},
  library={},
  ilim={},
  records=[],
  bookTotals={}
}={}){
  if(!date)throw new Error('date required');
  const state=normalizeKirkHadisState(ilim);
  const path=libraryPathSnapshot({pathState:library?.path||{},hadithCompletedCount:state.completed.length});
  const events=readingEvents({library,ilim:state,records});
  const routeTypical=learnedMinutes(records,date);
  const candidates=[
    ...hadithCandidates({date,profile,checkin,ilim:state,events,routeTypical,path}),
    ...bookCandidates({date,profile,checkin,library,ilim:state,records,bookTotals,path,events,routeTypical})
  ];
  return candidates
    .filter(x=>Number.isFinite(x.score))
    .sort((a,b)=>b.score-a.score||a.minutes-b.minutes||String(a.title).localeCompare(String(b.title),'tr'))
    .map((x,index)=>({...x,rank:index+1,activeLevel:path.currentLevel,routeTypicalMinutes:routeTypical}));
}

export function buildReadingRecommendation(input={}){
  return rankReadingRecommendations(input)[0]||null;
}
