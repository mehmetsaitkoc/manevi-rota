import assert from 'node:assert/strict';
import {STARTER_LIBRARY,STARTER_LIBRARY_STAGES,starterBook,starterBooksByStage,readyStarterBooks,pendingStarterBooks} from '../src/library-catalog.mjs';

assert.equal(STARTER_LIBRARY.length,10,'starter library must contain exactly 10 curated works');
assert.equal(new Set(STARTER_LIBRARY.map(x=>x.id)).size,10,'book ids must be unique');
assert.deepEqual(STARTER_LIBRARY.map(x=>x.order),[1,2,3,4,5,6,7,8,9,10]);
assert.equal(STARTER_LIBRARY_STAGES.length,5,'starter path must contain five deliberate levels');
assert.deepEqual(STARTER_LIBRARY_STAGES.map(x=>x.id),['level-1','level-2','level-3','level-4','level-5']);
assert.deepEqual(STARTER_LIBRARY.map(x=>x.stage),['level-1','level-1','level-2','level-2','level-3','level-3','level-4','level-4','level-5','level-5']);
assert.deepEqual(STARTER_LIBRARY_STAGES.map(x=>starterBooksByStage(x.id).length),[2,2,2,2,2]);
assert.ok(STARTER_LIBRARY_STAGES.every(x=>Array.isArray(x.goals)&&x.goals.length===3),'every level must carry exactly three awareness goals');
assert.ok(STARTER_LIBRARY_STAGES.flatMap(x=>x.goals).every(goal=>typeof goal==='string'&&goal.length>=40),'awareness goals must be substantive guidance, not labels');
assert.ok(STARTER_LIBRARY.every(x=>x.title&&x.author&&x.field&&x.level&&x.rightsStatus));
assert.ok(STARTER_LIBRARY.every(x=>x.level===`Seviye ${x.order<=2?1:x.order<=4?2:x.order<=6?3:x.order<=8?4:5}`));
assert.ok(STARTER_LIBRARY.every(x=>x.rightsStatus!=='unknown'));
assert.equal(readyStarterBooks().length,9,'premium library should expose nine genuinely readable works');
assert.equal(pendingStarterBooks().length,1);
assert.equal(starterBook('yavrularimiza-din-dersleri').asset,'public/data/books/yavrularimiza-din-dersleri.json');
assert.equal(starterBook('yavrularimiza-din-dersleri').requiresEditionReview,true);
assert.equal(starterBook('namaz-sureleri-tefsiri').asset,'public/data/books/namaz-sureleri-tefsiri.json');
assert.equal(starterBook('islam-fitri-tabii-umumi').asset,'public/data/books/islam-fitri-tabii-umumi.json');
assert.equal(starterBook('islam-fitri-tabii-umumi').availability,'ready');
assert.equal(starterBook('kurandan-ayetler').asset,'public/data/books/kurandan-ayetler.json');
assert.equal(starterBook('kurandan-ayetler').availability,'ready');
assert.equal(starterBook('kurandan-ayetler').requiresEditionReview,true);
assert.equal(starterBook('kurandan-ayetler').sourceLabel.includes('1944'),true);
assert.equal(starterBook('tanri-buyrugu').asset,'public/data/books/tanri-buyrugu.json');
assert.equal(starterBook('tanri-buyrugu').requiresEditionReview,true);
assert.equal(starterBook('ahlak-dersleri').availability,'ready');
const TURKEY_RIGHTS_AS_OF_YEAR=2026;
const publicDomainInTurkeyByYear=deathYear=>Number.isInteger(deathYear)&&(deathYear+71)<=TURKEY_RIGHTS_AS_OF_YEAR;
assert.ok(
  STARTER_LIBRARY.filter(x=>x.rightsStatus==='public-domain-turkey-author-term')
    .every(x=>publicDomainInTurkeyByYear(x.authorDeathYear)),
  'every Turkish author-term work must be public domain by the audit year'
);

console.log('library-catalog: 10-work beginner path and rights metadata passed');
