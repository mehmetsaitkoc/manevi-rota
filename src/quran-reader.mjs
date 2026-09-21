const HEX=/^#[0-9a-f]{6}$/i;
const clamp=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback};
const safeObject=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const safeColor=value=>HEX.test(String(value||''))?String(value).toLowerCase():'#e6c46f';
const iso=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString()};
const feedback=value=>['heavy','ideal','easy'].includes(value)?value:'ideal';

export const QURAN_HIGHLIGHT_PALETTE=Object.freeze(['#e6c46f','#8fc7a2','#d998a2']);

export function emptyQuranReaderState(){
  return {surah:1,ayah:1,fontScale:1,focusMode:false,highlightColor:'#e6c46f',highlights:{},notes:{},bookmarks:[],noteFor:null,sessions:[],activeSession:null};
}

export function quranVerseKey(surah,ayah){
  return `${Math.max(1,Math.min(114,Number(surah)||1))}:${Math.max(1,Number(ayah)||1)}`;
}

export function normalizeQuranReaderState(input={}){
  const base=emptyQuranReaderState(),raw=safeObject(input),highlights={},notes={};
  for(const [key,color] of Object.entries(safeObject(raw.highlights))){
    if(/^\d{1,3}:\d{1,3}$/.test(key)&&HEX.test(String(color||'')))highlights[key]=String(color).toLowerCase();
  }
  for(const [key,note] of Object.entries(safeObject(raw.notes))){
    if(!/^\d{1,3}:\d{1,3}$/.test(key))continue;
    const text=String(note||'').trim();
    if(text)notes[key]=text;
  }
  const bookmarks=[...new Set((Array.isArray(raw.bookmarks)?raw.bookmarks:[]).map(String).filter(key=>/^\d{1,3}:\d{1,3}$/.test(key)))].slice(0,500);
  const noteFor=Number(raw.noteFor);
  const sessions=(Array.isArray(raw.sessions)?raw.sessions:[]).map(value=>{
    const row=safeObject(value),startedAt=iso(row.startedAt),endedAt=iso(row.endedAt);
    if(!startedAt||!endedAt)return null;
    const startSurah=Math.max(1,Math.min(114,Math.round(Number(row.startSurah)||1)));
    const endSurah=Math.max(1,Math.min(114,Math.round(Number(row.endSurah)||startSurah)));
    const startAyah=Math.max(1,Math.round(Number(row.startAyah)||1));
    const endAyah=Math.max(1,Math.round(Number(row.endAyah)||startAyah));
    return {
      id:String(row.id||`quran-session-${Date.parse(endedAt)}`).slice(0,120),
      date:String(row.date||endedAt.slice(0,10)).slice(0,10),
      startedAt,endedAt,startSurah,startAyah,endSurah,endAyah,
      verses:Math.max(0,Math.round(Number(row.verses)||0)),
      minutes:clamp(row.minutes,1,120,1),feedback:feedback(row.feedback)
    };
  }).filter(Boolean).sort((a,b)=>b.endedAt.localeCompare(a.endedAt)).slice(0,120);
  const activeRaw=safeObject(raw.activeSession),activeStarted=iso(activeRaw.startedAt);
  const activeSession=activeStarted?{
    startedAt:activeStarted,
    startSurah:Math.max(1,Math.min(114,Math.round(Number(activeRaw.startSurah)||raw.surah||1))),
    startAyah:Math.max(1,Math.round(Number(activeRaw.startAyah)||raw.ayah||1)),
    lastSurah:Math.max(1,Math.min(114,Math.round(Number(activeRaw.lastSurah)||raw.surah||1))),
    lastAyah:Math.max(1,Math.round(Number(activeRaw.lastAyah)||raw.ayah||1))
  }:null;
  return {
    ...base,
    ...raw,
    surah:Math.round(clamp(raw.surah,1,114,1)),
    ayah:Math.max(1,Math.round(Number(raw.ayah)||1)),
    fontScale:clamp(raw.fontScale,.82,1.5,1),
    focusMode:Boolean(raw.focusMode),
    highlightColor:safeColor(raw.highlightColor),
    highlights,
    notes,
    bookmarks,
    noteFor:Number.isFinite(noteFor)&&noteFor>0?Math.round(noteFor):null,
    sessions,
    activeSession
  };
}

export function quranVerseHighlight(state,surah,ayah){
  return normalizeQuranReaderState(state).highlights[quranVerseKey(surah,ayah)]||'';
}

export function quranVerseNote(state,surah,ayah){
  return normalizeQuranReaderState(state).notes[quranVerseKey(surah,ayah)]||'';
}

export function toggleQuranVerseHighlight(state,surah,ayah,color){
  const next=normalizeQuranReaderState(state),key=quranVerseKey(surah,ayah),chosen=safeColor(color||next.highlightColor);
  const highlights={...next.highlights};
  if(highlights[key]===chosen)delete highlights[key];else highlights[key]=chosen;
  return {...next,highlightColor:chosen,highlights};
}

export function setQuranVerseNote(state,surah,ayah,note){
  const next=normalizeQuranReaderState(state),key=quranVerseKey(surah,ayah),notes={...next.notes},text=String(note||'').trim();
  if(text)notes[key]=text;else delete notes[key];
  return {...next,notes};
}


export function quranVerseBookmarked(state,surah,ayah){
  return normalizeQuranReaderState(state).bookmarks.includes(quranVerseKey(surah,ayah));
}

export function toggleQuranVerseBookmark(state,surah,ayah){
  const next=normalizeQuranReaderState(state),key=quranVerseKey(surah,ayah),set=new Set(next.bookmarks);
  set.has(key)?set.delete(key):set.add(key);
  return {...next,bookmarks:[...set]};
}


export function beginQuranReadingSession(state,{surah=null,ayah=null,at=new Date().toISOString()}={}){
  const next=normalizeQuranReaderState(state);
  if(next.activeSession)return next;
  const startedAt=iso(at)||new Date().toISOString();
  const startSurah=Math.max(1,Math.min(114,Math.round(Number(surah)||next.surah)));
  const startAyah=Math.max(1,Math.round(Number(ayah)||next.ayah));
  return {...next,activeSession:{startedAt,startSurah,startAyah,lastSurah:startSurah,lastAyah:startAyah}};
}

export function touchQuranReadingSession(state,{surah=null,ayah=null}={}){
  const next=normalizeQuranReaderState(state);
  if(!next.activeSession)return next;
  const lastSurah=Math.max(1,Math.min(114,Math.round(Number(surah)||next.surah)));
  const lastAyah=Math.max(1,Math.round(Number(ayah)||next.ayah));
  return {...next,activeSession:{...next.activeSession,lastSurah,lastAyah}};
}

export function finishQuranReadingSession(state,{surah=null,ayah=null,at=new Date().toISOString(),feedback:result='ideal'}={}){
  const next=normalizeQuranReaderState(state),active=next.activeSession;
  if(!active)return {state:next,session:null};
  const endedAt=iso(at)||new Date().toISOString();
  const endSurah=Math.max(1,Math.min(114,Math.round(Number(surah)||active.lastSurah||active.startSurah)));
  const endAyah=Math.max(1,Math.round(Number(ayah)||active.lastAyah||active.startAyah));
  const elapsed=Math.max(1,Math.round((new Date(endedAt)-new Date(active.startedAt))/60000));
  const minutes=Math.min(120,elapsed);
  const verses=endSurah===active.startSurah?Math.max(0,Math.abs(endAyah-active.startAyah)):1;
  const session={
    id:`quran-session-${Date.parse(endedAt)}-${active.startSurah}-${active.startAyah}-${endSurah}-${endAyah}`,
    date:endedAt.slice(0,10),startedAt:active.startedAt,endedAt,
    startSurah:active.startSurah,startAyah:active.startAyah,endSurah,endAyah,
    verses,minutes,feedback:feedback(result)
  };
  return {state:{...next,activeSession:null,sessions:[session,...next.sessions].slice(0,120)},session};
}
