import assert from 'node:assert/strict';
import {genericNotebookRefs,quranNotebookRefs,filterNotebookEntries,groupNotebookEntries,notebookSummary} from '../src/ilim-notebook.mjs';

const generic=genericNotebookRefs({
  notes:{'3:0':'İman notum','8:2':'Ahlâk notu'},
  highlights:{'3:0':'#e6c46f','5:1':'#8fc7a2'},
  bookmarks:[5,9]
});
assert.deepEqual(generic.map(x=>x.key),['3:0','5:*','5:1','8:2','9:*']);
assert.equal(generic.find(x=>x.key==='3:0').note,'İman notum');
assert.equal(generic.find(x=>x.key==='5:*').bookmarked,true);

const quran=quranNotebookRefs({
  notes:{'2:255':'Âyetü’l-Kürsî notu'},
  highlights:{'1:1':'#e6c46f'},
  bookmarks:['2:255','36:1']
});
assert.deepEqual(quran.map(x=>x.key),['1:1','2:255','36:1']);
assert.equal(quran.find(x=>x.key==='2:255').bookmarked,true);

const entries=[
  {id:'a',bookId:'quran',bookTitle:'Kur’ân-ı Kerîm',bookOrder:1,kind:'quran',locator:'Bakara 255',note:'Âyetü’l-Kürsî notu'},
  {id:'b',bookId:'kirk-hadis',bookTitle:'Kırk Hadis',bookOrder:5,kind:'hadith',locator:'Hadis 1',highlight:'Ameller niyetlere göredir'},
  {id:'c',bookId:'ahlak-dersleri',bookTitle:'Ahlâk Dersleri',bookOrder:8,kind:'book',locator:'Okuma 44',bookmarked:true}
];

assert.equal(filterNotebookEntries(entries,{query:'niyet'}).length,1);
assert.equal(filterNotebookEntries(entries,{bookId:'quran'}).length,1);
assert.equal(filterNotebookEntries(entries,{kind:'bookmark'}).length,1);
assert.deepEqual(groupNotebookEntries(entries).map(x=>x.bookId),['quran','kirk-hadis','ahlak-dersleri']);
assert.deepEqual(notebookSummary(entries),{entries:3,books:3,notes:1,highlights:1,bookmarks:1});

console.log('ilim-notebook: unified annotations, filters and grouping passed');
