import assert from 'node:assert/strict';
import {STARTER_LIBRARY,starterBook,readyStarterBooks,pendingStarterBooks} from '../src/library-catalog.mjs';

assert.equal(STARTER_LIBRARY.length,10,'starter library must contain exactly 10 curated works');
assert.equal(new Set(STARTER_LIBRARY.map(x=>x.id)).size,10,'book ids must be unique');
assert.deepEqual(STARTER_LIBRARY.map(x=>x.order),[1,2,3,4,5,6,7,8,9,10]);
assert.ok(STARTER_LIBRARY.every(x=>x.title&&x.author&&x.field&&x.level&&x.rightsStatus));
assert.ok(STARTER_LIBRARY.every(x=>x.rightsStatus!=='unknown'));
assert.equal(readyStarterBooks().length,5,'first premium wave should expose five genuinely readable works');
assert.equal(pendingStarterBooks().length,5);
assert.equal(starterBook('namaz-sureleri-tefsiri').asset,'public/data/books/namaz-sureleri-tefsiri.json');
assert.equal(starterBook('ahlak-dersleri').availability,'ready');
assert.ok(STARTER_LIBRARY.filter(x=>x.authorDeathYear).every(x=>x.authorDeathYear<=1952));

console.log('library-catalog: 10-work beginner path and rights metadata passed');
