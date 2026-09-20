import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STARTER_LIBRARY} from '../src/library-catalog.mjs';

const readyGeneric=STARTER_LIBRARY.filter(x=>x.availability==='ready'&&x.readerType==='generic');
assert.equal(readyGeneric.length,7);

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
const yavrular=JSON.parse(fs.readFileSync('public/data/books/yavrularimiza-din-dersleri.json','utf8'));
assert.match(yavrular.pages[0].text,/ÖNSÖZ|BİRİNCİ DERS/i);
assert.ok(yavrular.pages.length>=180);
assert.equal(yavrular.source?.sourceEditionYear,1967);
assert.match(yavrular.source?.reviewNote||'',/Commercial release|ticari|human/i);
const islamFitri=JSON.parse(fs.readFileSync('public/data/books/islam-fitri-tabii-umumi.json','utf8'));
assert.match(islamFitri.pages[0].text,/ÖN SÖZ/i);
assert.ok(islamFitri.pages.length>=650);
assert.match(islamFitri.pages.slice(0,12).map(x=>x.text).join('\n'),/fıtr|fitr|vahiy|peygamber/i);
assert.equal(islamFitri.id,'islam-fitri-tabii-umumi');
const kurandanAyetler=JSON.parse(fs.readFileSync('public/data/books/kurandan-ayetler.json','utf8'));
assert.equal(kurandanAyetler.id,'kurandan-ayetler');
assert.ok(kurandanAyetler.pages.length>=300);
assert.match(kurandanAyetler.pages[0].text,/On Söz|ÖN SÖZ/i);
assert.match(kurandanAyetler.pages.slice(0,8).map(x=>x.text).join('\n'),/Mehmet Akif|Mehmet Âkif|Kur.?an/i);
assert.equal(kurandanAyetler.source?.sourceEditionYear,1944);
assert.equal(kurandanAyetler.source?.normalizationVersion,5);
assert.match(kurandanAyetler.pages[0].text,/Kur’an onun hem semavî kitabı idi/i);
assert.match(kurandanAyetler.pages[0].text,/Mehmet Akif de aynı yolu tutan/i);
assert.doesNotMatch(kurandanAyetler.pages[0].text,/Kur W onum|Kur'ao|Mehmet Akilde|Kur an|Kuranı|Kuran bakımından|Hazret\*/);
assert.match(kurandanAyetler.source?.reviewNote||'',/Commercial release|human|edit/i);
const tanriBuyrugu=JSON.parse(fs.readFileSync('public/data/books/tanri-buyrugu.json','utf8'));
assert.equal(tanriBuyrugu.id,'tanri-buyrugu');
assert.ok(tanriBuyrugu.pages.length>=1500);
assert.match(tanriBuyrugu.pages[0].text,/BİRİNCİ BÖLÜM/i);
assert.match(tanriBuyrugu.pages.slice(0,10).map(x=>x.text).join('\n'),/KUR.?AN/i);
assert.equal(tanriBuyrugu.source?.sourceEditionYear,1955);
assert.match(tanriBuyrugu.source?.reviewNote||'',/Commercial release|human|edit/i);
assert.equal(fs.existsSync('public/data/books/safahat.json'),false,'modern edited Safahat asset must not ship');
const namaz=JSON.parse(fs.readFileSync('public/data/books/namaz-sureleri-tefsiri.json','utf8'));
assert.match(namaz.pages[0].text,/ÖN SÖZ/);
assert.ok(namaz.sections.some(x=>/Fâtiha/i.test(x.title)));
const ahlak=JSON.parse(fs.readFileSync('public/data/books/ahlak-dersleri.json','utf8'));
assert.match(ahlak.pages[0].text,/GİRİŞ/i);
assert.equal(ahlak.pages.some(x=>/Karton Kapak\.indd/i.test(x.text)),false);

console.log('premium-library: generated reader assets and source hygiene passed');
