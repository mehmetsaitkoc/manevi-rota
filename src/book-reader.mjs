const HEX=/^#[0-9a-f]{6}$/i;
const clamp=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const color=value=>HEX.test(String(value||''))?String(value).toLowerCase():'#e6c46f';

export const BOOK_HIGHLIGHT_PALETTE=Object.freeze(['#e6c46f','#8fc7a2','#d998a2']);

export function emptyBookReaderState(){
  return {page:1,fontScale:1,focusMode:false,highlightColor:'#e6c46f',highlights:{},notes:{},noteFor:null,bookmarks:[]};
}

export function bookParagraphKey(page,index){
  return `${Math.max(1,Math.round(Number(page)||1))}:${Math.max(0,Math.round(Number(index)||0))}`;
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
  return {
    ...base,...raw,
    page:Math.max(1,Math.round(Number(raw.page)||1)),
    fontScale:clamp(raw.fontScale,.82,1.5,1),
    focusMode:Boolean(raw.focusMode),
    highlightColor:color(raw.highlightColor),
    highlights,notes,
    noteFor:/^\d{1,5}:\d{1,4}$/.test(noteFor)?noteFor:null,
    bookmarks
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
