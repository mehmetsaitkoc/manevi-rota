import {STARTER_LIBRARY,STARTER_LIBRARY_STAGES} from './library-catalog.mjs';

const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const uniq=list=>[...new Set(Array.isArray(list)?list.map(String):[])];

export function emptyLibraryPathState(){
  return {completedBooks:[],completedAt:{},acknowledgedLevel:1};
}

export function normalizeLibraryPathState(input={}){
  const raw=object(input),completedBooks=uniq(raw.completedBooks).filter(id=>STARTER_LIBRARY.some(book=>book.id===id&&book.readerType==='generic'));
  const completedAt={};
  for(const id of completedBooks){
    const value=raw.completedAt?.[id];
    if(value){
      const date=new Date(value);
      if(!Number.isNaN(date.getTime()))completedAt[id]=date.toISOString();
    }
  }
  const acknowledgedLevel=Math.max(1,Math.min(5,Math.round(Number(raw.acknowledgedLevel)||1)));
  return {completedBooks,completedAt,acknowledgedLevel};
}

export function setGenericBookCompleted(state,bookId,completed=true,at=new Date().toISOString()){
  const book=STARTER_LIBRARY.find(item=>item.id===bookId);
  const next=normalizeLibraryPathState(state);
  if(!book||book.readerType!=='generic')return next;
  const set=new Set(next.completedBooks),completedAt={...next.completedAt};
  if(completed){
    set.add(bookId);
    const date=new Date(at);
    completedAt[bookId]=Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString();
  }else{
    set.delete(bookId);delete completedAt[bookId];
  }
  return {completedBooks:[...set],completedAt,acknowledgedLevel:next.acknowledgedLevel};
}

export function isPathBookCompleted({book,pathState,hadithCompletedCount=0}){
  if(!book)return false;
  if(book.alwaysOn)return false;
  if(book.readerType==='hadith')return Number(hadithCompletedCount)>=42;
  if(book.readerType==='generic')return normalizeLibraryPathState(pathState).completedBooks.includes(book.id);
  return false;
}

export function libraryPathSnapshot({
  pathState={},
  hadithCompletedCount=0,
  library=STARTER_LIBRARY,
  stages=STARTER_LIBRARY_STAGES
}={}){
  const state=normalizeLibraryPathState(pathState);
  const levelRows=stages.map(stage=>{
    const books=library.filter(book=>book.stage===stage.id);
    const companion=books.filter(book=>book.alwaysOn);
    const required=books.filter(book=>!book.alwaysOn);
    const unavailable=required.filter(book=>book.availability!=='ready');
    const readable=required.filter(book=>book.availability==='ready');
    const completed=required.filter(book=>isPathBookCompleted({book,pathState:state,hadithCompletedCount}));
    const complete=required.length>0&&unavailable.length===0&&completed.length===required.length;
    return {
      id:stage.id,
      order:stage.order,
      title:stage.title,
      subtitle:stage.subtitle,
      goals:Array.isArray(stage.goals)?stage.goals.slice(0,3):[],
      bookIds:books.map(book=>book.id),
      requiredBookIds:required.map(book=>book.id),
      companionBookIds:companion.map(book=>book.id),
      readableCount:readable.length,
      completedCount:completed.length,
      requiredCount:required.length,
      unavailableCount:unavailable.length,
      complete,
      sourcePending:unavailable.length>0
    };
  });
  let currentIndex=levelRows.findIndex(level=>!level.complete);
  if(currentIndex<0)currentIndex=Math.max(0,levelRows.length-1);
  const currentLevel=levelRows[currentIndex]?.order||1;
  const levels=levelRows.map((level,index)=>({
    ...level,
    status:level.complete?'complete':index===currentIndex?'current':index===currentIndex+1?'next':'later'
  }));
  const completedLevels=levels.filter(level=>level.complete).length;
  return {
    currentLevel,
    completedLevels,
    totalLevels:levels.length,
    completedBooks:state.completedBooks,
    acknowledgedLevel:state.acknowledgedLevel,
    transitionReady:currentLevel>state.acknowledgedLevel,
    levels
  };
}


export function acknowledgeLibraryLevel(state,level){
  const next=normalizeLibraryPathState(state);
  return {...next,acknowledgedLevel:Math.max(next.acknowledgedLevel,Math.max(1,Math.min(5,Math.round(Number(level)||1))))};
}
