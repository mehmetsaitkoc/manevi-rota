const HEX=/^#[0-9a-f]{6}$/i;
const clamp=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const color=value=>HEX.test(String(value||''))?String(value).toLowerCase():'#e6c46f';
const iso=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString()};
const feedback=value=>['heavy','ideal','easy'].includes(value)?value:'ideal';

export const BOOK_HIGHLIGHT_PALETTE=Object.freeze(['#e6c46f','#8fc7a2','#d998a2']);

export function emptyBookReaderState(){
  return {
    page:1,fontScale:1,focusMode:false,highlightColor:'#e6c46f',
    highlights:{},notes:{},noteFor:null,bookmarks:[],
    searchQuery:'',sessions:[],activeSession:null
  };
}

export function bookParagraphKey(page,index){
  return `${Math.max(1,Math.round(Number(page)||1))}:${Math.max(0,Math.round(Number(index)||0))}`;
}

function normalizeReadingSession(value){
  const raw=object(value),startedAt=iso(raw.startedAt),endedAt=iso(raw.endedAt);
  if(!startedAt||!endedAt)return null;
  const startPage=Math.max(1,Math.round(Number(raw.startPage)||1));
  const endPage=Math.max(1,Math.round(Number(raw.endPage)||startPage));
  const minutes=clamp(raw.minutes,1,120,1);
  const pages=Math.max(0,Math.round(Number(raw.pages)||Math.abs(endPage-startPage)));
  return {
    id:String(raw.id||`book-session-${startedAt}`).slice(0,120),
    date:String(raw.date||startedAt.slice(0,10)).slice(0,10),
    startedAt,endedAt,startPage,endPage,pages,minutes,
    feedback:feedback(raw.feedback)
  };
}

function normalizeActiveSession(value){
  const raw=object(value),startedAt=iso(raw.startedAt);
  if(!startedAt)return null;
  const startPage=Math.max(1,Math.round(Number(raw.startPage)||1));
  return {
    startedAt,
    startPage,
    lastPage:Math.max(1,Math.round(Number(raw.lastPage)||startPage))
  };
}

export function normalizeBookReaderState(input={}){
  const base=emptyBookReaderState(),raw=object(input),highlights={},notes={};
  for(const [key,value] of Object.entries(object(raw.highlights))){
    if(/^\d{1,5}:\d{1,4}$/.test(key)&&HEX.test(String(value||'')))highlights[key]=String(value).toLowerCase();
  }
  for(const [key,value] of Object.entries(object(raw.notes))){
    if(!/^\d{1,5}:\d{1,4}$/.test(key))continue;
    const text=String(value||'').trim();
    if(text)notes[key]=text.slice(0,2400);
  }
  const noteFor=String(raw.noteFor||'');
  const bookmarks=[...new Set((Array.isArray(raw.bookmarks)?raw.bookmarks:[]).map(x=>Math.max(1,Math.round(Number(x)||1))))].slice(0,120);
  const sessions=(Array.isArray(raw.sessions)?raw.sessions:[])
    .map(normalizeReadingSession).filter(Boolean)
    .sort((a,b)=>b.endedAt.localeCompare(a.endedAt)).slice(0,120);
  return {
    ...base,...raw,
    page:Math.max(1,Math.round(Number(raw.page)||1)),
    fontScale:clamp(raw.fontScale,.82,1.5,1),
    focusMode:Boolean(raw.focusMode),
    highlightColor:color(raw.highlightColor),
    highlights,notes,
    noteFor:/^\d{1,5}:\d{1,4}$/.test(noteFor)?noteFor:null,
    bookmarks,
    searchQuery:String(raw.searchQuery||'').trim().slice(0,120),
    sessions,
    activeSession:normalizeActiveSession(raw.activeSession)
  };
}

export function bookHighlight(state,page,index){
  return normalizeBookReaderState(state).highlights[bookParagraphKey(page,index)]||'';
}

export function bookNote(state,page,index){
  return normalizeBookReaderState(state).notes[bookParagraphKey(page,index)]||'';
}

export function toggleBookHighlight(state,page,index,chosen){
  const next=normalizeBookReaderState(state),key=bookParagraphKey(page,index),picked=color(chosen||next.highlightColor),highlights={...next.highlights};
  if(highlights[key]===picked)delete highlights[key];else highlights[key]=picked;
  return {...next,highlightColor:picked,highlights};
}

export function setBookNote(state,page,index,text){
  const next=normalizeBookReaderState(state),key=bookParagraphKey(page,index),notes={...next.notes},value=String(text||'').trim();
  if(value)notes[key]=value.slice(0,2400);else delete notes[key];
  return {...next,notes};
}

export function toggleBookPageBookmark(state,page){
  const next=normalizeBookReaderState(state),n=Math.max(1,Math.round(Number(page)||1)),set=new Set(next.bookmarks);
  set.has(n)?set.delete(n):set.add(n);
  return {...next,bookmarks:[...set].sort((a,b)=>a-b)};
}

export function beginBookReadingSession(state,{page=1,at=new Date().toISOString()}={}){
  const next=normalizeBookReaderState(state);
  if(next.activeSession)return next;
  const startedAt=iso(at)||new Date().toISOString(),startPage=Math.max(1,Math.round(Number(page)||1));
  return {...next,activeSession:{startedAt,startPage,lastPage:startPage}};
}

export function touchBookReadingSession(state,page){
  const next=normalizeBookReaderState(state);
  if(!next.activeSession)return next;
  return {...next,activeSession:{...next.activeSession,lastPage:Math.max(1,Math.round(Number(page)||next.activeSession.lastPage))}};
}

export function finishBookReadingSession(state,{page=null,at=new Date().toISOString(),feedback:result='ideal'}={}){
  const next=normalizeBookReaderState(state),active=next.activeSession;
  if(!active)return {state:next,session:null};
  const endedAt=iso(at)||new Date().toISOString();
  const endPage=Math.max(1,Math.round(Number(page)||active.lastPage||active.startPage));
  const elapsed=Math.max(1,Math.round((new Date(endedAt)-new Date(active.startedAt))/60000));
  const minutes=Math.min(120,elapsed);
  const pages=Math.max(0,Math.abs(endPage-active.startPage));
  const session={
    id:`book-session-${Date.parse(endedAt)}-${active.startPage}-${endPage}`,
    date:endedAt.slice(0,10),startedAt:active.startedAt,endedAt,
    startPage:active.startPage,endPage,pages,minutes,feedback:feedback(result)
  };
  return {
    state:{...next,activeSession:null,sessions:[session,...next.sessions].slice(0,120)},
    session
  };
}

export function bookReadingSummary(state,{limit=12}={}){
  const sessions=normalizeBookReaderState(state).sessions.slice(0,Math.max(1,Math.min(60,Number(limit)||12)));
  if(!sessions.length)return {sessions:0,totalMinutes:0,totalPages:0,heavy:0,easy:0,lastDate:null};
  return {
    sessions:sessions.length,
    totalMinutes:sessions.reduce((n,x)=>n+x.minutes,0),
    totalPages:sessions.reduce((n,x)=>n+x.pages,0),
    heavy:sessions.filter(x=>x.feedback==='heavy').length,
    easy:sessions.filter(x=>x.feedback==='easy').length,
    lastDate:sessions[0].date
  };
}

export function searchBookPages(pages,query,{limit=24}={}){
  const q=String(query||'').trim().toLocaleLowerCase('tr-TR');
  if(q.length<2||!Array.isArray(pages))return [];
  const out=[];
  for(let i=0;i<pages.length&&out.length<Math.max(1,Math.min(60,Number(limit)||24));i++){
    const text=String(pages[i]?.text||''),lower=text.toLocaleLowerCase('tr-TR'),at=lower.indexOf(q);
    if(at<0)continue;
    const start=Math.max(0,at-90),end=Math.min(text.length,at+q.length+150);
    out.push({
      page:i+1,
      sourcePage:pages[i]?.page??i+1,
      excerpt:(start>0?'…':'')+text.slice(start,end).replace(/\s+/g,' ').trim()+(end<text.length?'…':'')
    });
  }
  return out;
}
