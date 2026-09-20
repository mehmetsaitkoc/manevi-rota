const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value||'').trim();
const lower=value=>text(value).toLocaleLowerCase('tr-TR');

export function genericNotebookRefs(state={}){
  const raw=object(state),notes=object(raw.notes),highlights=object(raw.highlights);
  const rows=new Map();
  const ensure=(page,index=null)=>{
    const key=index===null?`${page}:*`:`${page}:${index}`;
    if(!rows.has(key))rows.set(key,{key,page:Number(page),index:index===null?null:Number(index),note:'',highlight:'',bookmarked:false});
    return rows.get(key);
  };
  for(const [key,note] of Object.entries(notes)){
    const m=key.match(/^(\d+):(\d+)$/);if(!m)continue;
    ensure(m[1],m[2]).note=text(note);
  }
  for(const [key,color] of Object.entries(highlights)){
    const m=key.match(/^(\d+):(\d+)$/);if(!m)continue;
    ensure(m[1],m[2]).highlight=text(color);
  }
  for(const page of Array.isArray(raw.bookmarks)?raw.bookmarks:[])ensure(page,null).bookmarked=true;
  return [...rows.values()].sort((a,b)=>a.page-b.page||((a.index??-1)-(b.index??-1)));
}

export function quranNotebookRefs(state={}){
  const raw=object(state),notes=object(raw.notes),highlights=object(raw.highlights);
  const keys=new Set([...Object.keys(notes),...Object.keys(highlights),...(Array.isArray(raw.bookmarks)?raw.bookmarks.map(String):[])]);
  return [...keys].map(key=>{
    const m=key.match(/^(\d+):(\d+)$/);if(!m)return null;
    return {
      key,surah:Number(m[1]),ayah:Number(m[2]),
      note:text(notes[key]),highlight:text(highlights[key]),
      bookmarked:Array.isArray(raw.bookmarks)&&raw.bookmarks.map(String).includes(key)
    };
  }).filter(Boolean).sort((a,b)=>a.surah-b.surah||a.ayah-b.ayah);
}

export function normalizeNotebookEntry(entry={}){
  const raw=object(entry);
  return {
    id:text(raw.id),
    bookId:text(raw.bookId),
    bookTitle:text(raw.bookTitle),
    bookOrder:Number(raw.bookOrder)||999,
    kind:text(raw.kind)||'book',
    locator:text(raw.locator),
    title:text(raw.title),
    note:text(raw.note),
    highlight:text(raw.highlight),
    bookmarked:Boolean(raw.bookmarked),
    color:text(raw.color),
    searchText:text(raw.searchText)
  };
}

export function filterNotebookEntries(entries=[],filters={}){
  const query=lower(filters.query),bookId=text(filters.bookId||'all'),kind=text(filters.kind||'all');
  return entries.map(normalizeNotebookEntry).filter(entry=>{
    if(bookId!=='all'&&entry.bookId!==bookId)return false;
    if(kind!=='all'){
      if(kind==='note'&&!entry.note)return false;
      if(kind==='highlight'&&!entry.highlight)return false;
      if(kind==='bookmark'&&!entry.bookmarked)return false;
    }
    if(!query)return true;
    return lower([
      entry.bookTitle,entry.locator,entry.title,entry.note,entry.highlight,entry.searchText
    ].join(' ')).includes(query);
  });
}

export function groupNotebookEntries(entries=[]){
  const groups=new Map();
  for(const entry of entries.map(normalizeNotebookEntry)){
    const key=entry.bookId||entry.bookTitle;
    if(!groups.has(key))groups.set(key,{bookId:entry.bookId,bookTitle:entry.bookTitle,bookOrder:entry.bookOrder,entries:[]});
    groups.get(key).entries.push(entry);
  }
  return [...groups.values()].sort((a,b)=>a.bookOrder-b.bookOrder||a.bookTitle.localeCompare(b.bookTitle,'tr'));
}

export function notebookSummary(entries=[]){
  const normalized=entries.map(normalizeNotebookEntry);
  return {
    entries:normalized.length,
    books:new Set(normalized.map(x=>x.bookId).filter(Boolean)).size,
    notes:normalized.filter(x=>x.note).length,
    highlights:normalized.filter(x=>x.highlight).length,
    bookmarks:normalized.filter(x=>x.bookmarked).length
  };
}
