const HEX=/^#[0-9a-f]{6}$/i;
const clamp=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback};
const safeObject=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const safeColor=value=>HEX.test(String(value||''))?String(value).toLowerCase():'#e6c46f';

export const QURAN_HIGHLIGHT_PALETTE=Object.freeze(['#e6c46f','#8fc7a2','#d998a2']);

export function emptyQuranReaderState(){
  return {surah:1,ayah:1,fontScale:1,focusMode:false,highlightColor:'#e6c46f',highlights:{},notes:{},noteFor:null};
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
  const noteFor=Number(raw.noteFor);
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
    noteFor:Number.isFinite(noteFor)&&noteFor>0?Math.round(noteFor):null
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
