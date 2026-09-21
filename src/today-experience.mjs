import {normalizeReadingRecommendationMemory} from './reading-recommendation-memory.mjs';

const dayMs=86400000;
const shiftDay=(date,delta)=>{
  const d=new Date(String(date).slice(0,10)+'T12:00:00Z');
  if(Number.isNaN(d.getTime()))return String(date||'').slice(0,10);
  d.setUTCDate(d.getUTCDate()+delta);
  return d.toISOString().slice(0,10);
};

export const readingFeedbackLabel=value=>({
  heavy:'Ağır geldi',
  ideal:'Tam kıvamındaydı',
  easy:'Rahat geldi'
}[value]||'Geri bildirim yok');

export function completedRecommendationForDate(memory,date){
  const state=normalizeReadingRecommendationMemory(memory);
  return state.history.find(row=>row.status==='completed'&&row.date===date)||null;
}

export function yesterdayReadingSummary({memory={},records=[],date}={}){
  const yesterday=shiftDay(date,-1);
  const state=normalizeReadingRecommendationMemory(memory);
  const completed=state.history.find(row=>row.status==='completed'&&row.date===yesterday)||null;
  const record=(Array.isArray(records)?records:[]).find(row=>row?.date===yesterday)||null;
  const sessions=Array.isArray(record?.readingSessions)?record.readingSessions:[];
  const matched=completed
    ?sessions.find(row=>row?.bookId===completed.bookId)||sessions[0]||null
    :sessions[0]||null;

  if(!completed&&!matched){
    return {
      date:yesterday,hasActivity:false,title:'Dün kayıtlı okuma yok',
      minutes:0,pages:0,feedback:null,feedbackLabel:null,bookId:null,kind:null
    };
  }

  const minutes=Math.max(1,Number(completed?.actualMinutes||matched?.minutes||completed?.recommendedMinutes||1));
  const pages=Math.max(0,Number(matched?.pages||0));
  const feedback=completed?.feedback||matched?.feedback||null;
  return {
    date:yesterday,hasActivity:true,
    title:String(completed?.title||'Okuma'),
    minutes,pages,feedback,feedbackLabel:readingFeedbackLabel(feedback),
    bookId:completed?.bookId||matched?.bookId||null,
    kind:completed?.kind||'book'
  };
}

export function todayExperienceSnapshot({memory={},records=[],date}={}){
  const completed=completedRecommendationForDate(memory,date);
  const yesterday=yesterdayReadingSummary({memory,records,date});
  return {
    completed,
    yesterday,
    primaryState:completed?'completed':'recommendation'
  };
}
