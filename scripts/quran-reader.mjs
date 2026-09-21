import assert from 'node:assert/strict';
import {emptyQuranReaderState,normalizeQuranReaderState,quranVerseKey,quranVerseHighlight,quranVerseNote,quranVerseBookmarked,toggleQuranVerseHighlight,setQuranVerseNote,toggleQuranVerseBookmark,beginQuranReadingSession,touchQuranReadingSession,finishQuranReadingSession} from '../src/quran-reader.mjs';

const base=emptyQuranReaderState();
assert.deepEqual(base.highlights,{});
assert.deepEqual(base.notes,{});
assert.deepEqual(base.bookmarks,[]);
assert.equal(quranVerseKey(2,255),'2:255');

const migrated=normalizeQuranReaderState({surah:999,ayah:0,fontScale:9,focusMode:1,highlightColor:'#8FC7A2',highlights:{'2:5':'#D998A2',bad:'red'},notes:{'2:5':'  kişisel not  ','x':'sil'},bookmarks:['2:5','2:5','bad']});
assert.equal(migrated.surah,114);
assert.equal(migrated.ayah,1);
assert.equal(migrated.fontScale,1.5);
assert.equal(migrated.focusMode,true);
assert.equal(migrated.highlightColor,'#8fc7a2');
assert.equal(migrated.highlights['2:5'],'#d998a2');
assert.equal(migrated.notes['2:5'],'kişisel not');
assert.deepEqual(migrated.bookmarks,['2:5']);

let s=toggleQuranVerseHighlight(base,1,1,'#e6c46f');
assert.equal(quranVerseHighlight(s,1,1),'#e6c46f');
s=toggleQuranVerseHighlight(s,1,1,'#e6c46f');
assert.equal(quranVerseHighlight(s,1,1),'');

s=setQuranVerseNote(s,1,1,'  sadece kullanıcı notu  ');
assert.equal(quranVerseNote(s,1,1),'sadece kullanıcı notu');
s=setQuranVerseNote(s,1,1,'   ');
assert.equal(quranVerseNote(s,1,1),'');

s=toggleQuranVerseBookmark(s,2,255);
assert.equal(quranVerseBookmarked(s,2,255),true);
s=toggleQuranVerseBookmark(s,2,255);
assert.equal(quranVerseBookmarked(s,2,255),false);

let sessionState=beginQuranReadingSession(base,{surah:2,ayah:1,at:'2026-09-21T18:00:00Z'});
sessionState=touchQuranReadingSession(sessionState,{surah:2,ayah:5});
const finished=finishQuranReadingSession(sessionState,{surah:2,ayah:5,at:'2026-09-21T18:06:00Z',feedback:'ideal'});
assert.equal(finished.session.minutes,6);
assert.equal(finished.session.verses,4);
assert.equal(finished.session.feedback,'ideal');
assert.equal(finished.state.activeSession,null);
assert.equal(finished.state.sessions.length,1);

console.log('quran-reader tests: ok');
