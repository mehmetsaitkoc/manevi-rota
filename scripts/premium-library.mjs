import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STARTER_LIBRARY} from '../src/library-catalog.mjs';

const readyGeneric=STARTER_LIBRARY.filter(x=>x.availability==='ready'&&x.readerType==='generic');
assert.equal(readyGeneric.length,2);

for(const book of readyGeneric){
  assert.ok(book.asset,book.id+' asset path missing');
  assert.ok(fs.existsSync(book.asset),book.id+' generated asset missing');
  const data=JSON.parse(fs.readFileSync(book.asset,'utf8'));
  assert.equal(data.id,book.id);
  assert.equal(data.title,book.title);
  assert.ok(Array.isArray(data.pages)&&data.pages.length>=60,book.id+' has too few reader pages');
  assert.ok(data.source?.sourceLabel,book.id+' source label missing');
  assert.ok(data.source?.textPolicy?.includes('no AI summary'),book.id+' source policy missing');
  const joined=data.pages.slice(0,20).map(x=>x.text).join('\n');
  assert.equal(/Karton Kapak\.indd|Semih Ofset|Yayın Yönetmeni|©\s*Diyanet/i.test(joined),false,book.id+' contains publisher/layout noise');
}
const namaz=JSON.parse(fs.readFileSync('public/data/books/namaz-sureleri-tefsiri.json','utf8'));
assert.match(namaz.pages[0].text,/ÖN SÖZ/);
assert.ok(namaz.sections.some(x=>/Fâtiha/i.test(x.title)));
const ahlak=JSON.parse(fs.readFileSync('public/data/books/ahlak-dersleri.json','utf8'));
assert.match(ahlak.pages[0].text,/GİRİŞ/i);
assert.equal(ahlak.pages.some(x=>/Karton Kapak\.indd/i.test(x.text)),false);

console.log('premium-library: generated reader assets and source hygiene passed');
