import assert from 'node:assert/strict';
import {emptyBookReaderState,normalizeBookReaderState,bookParagraphKey,bookHighlight,bookNote,toggleBookHighlight,setBookNote,toggleBookPageBookmark} from '../src/book-reader.mjs';

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

console.log('book-reader: premium reader state passed');
