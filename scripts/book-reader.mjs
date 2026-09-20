import assert from 'node:assert/strict';
import {
  emptyBookReaderState,normalizeBookReaderState,bookParagraphKey,bookHighlight,bookNote,
  toggleBookHighlight,setBookNote,toggleBookPageBookmark,beginBookReadingSession,
  touchBookReadingSession,finishBookReadingSession,bookReadingSummary,searchBookPages
} from '../src/book-reader.mjs';

const base=emptyBookReaderState();
assert.equal(bookParagraphKey(5,2),'5:2');
let state=normalizeBookReaderState({page:0,fontScale:8,highlightColor:'#8FC7A2',notes:{'2:0':'  not  ',bad:'x'},highlights:{'2:0':'#D998A2'},bookmarks:[2,2,7]});
assert.equal(state.page,1);
assert.equal(state.fontScale,1.5);
assert.equal(state.highlightColor,'#8fc7a2');
assert.deepEqual(state.bookmarks,[2,7]);
assert.equal(state.notes['2:0'],'not');

state=toggleBookHighlight(base,3,1,'#e6c46f');
assert.equal(bookHighlight(state,3,1),'#e6c46f');
state=toggleBookHighlight(state,3,1,'#e6c46f');
assert.equal(bookHighlight(state,3,1),'');

state=setBookNote(state,3,1,'  kişisel not  ');
assert.equal(bookNote(state,3,1),'kişisel not');
state=toggleBookPageBookmark(state,3);
assert.deepEqual(state.bookmarks,[3]);
state=toggleBookPageBookmark(state,3);
assert.deepEqual(state.bookmarks,[]);

state=beginBookReadingSession(state,{page:10,at:'2026-09-20T20:00:00.000Z'});
assert.equal(state.activeSession.startPage,10);
state=touchBookReadingSession(state,14);
assert.equal(state.activeSession.lastPage,14);
const finished=finishBookReadingSession(state,{page:14,at:'2026-09-20T20:08:00.000Z',feedback:'heavy'});
assert.equal(finished.session.minutes,8);
assert.equal(finished.session.pages,4);
assert.equal(finished.session.feedback,'heavy');
assert.equal(finished.state.activeSession,null);
assert.equal(finished.state.sessions.length,1);
assert.deepEqual(bookReadingSummary(finished.state),{sessions:1,totalMinutes:8,totalPages:4,heavy:1,easy:0,lastDate:'2026-09-20'});

const hits=searchBookPages([
  {page:101,text:'İman ve amel arasındaki bağ burada açıklanır.'},
  {page:102,text:'Başka bir bölüm.'},
  {page:103,text:'Amel niyetle anlam kazanır ve davranışa dönüşür.'}
],'amel');
assert.deepEqual(hits.map(x=>x.page),[1,3]);
assert.equal(searchBookPages([{page:1,text:'abc'}],'a').length,0);

console.log('book-reader: premium reader state + search + reading session memory passed');
