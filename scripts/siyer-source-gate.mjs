import assert from 'node:assert/strict';
import {starterBook} from '../src/library-catalog.mjs';

const siyer=starterBook('siyer-i-nebi-mehmed-ziya');
assert.ok(siyer,'selected level-three siyer target must exist');
assert.equal(siyer.stage,'level-3');
assert.equal(siyer.availability,'source-verified');
assert.equal(Boolean(siyer.asset),false,'pending siyer must stay unreadable until a reusable historical scan is approved');
assert.equal(siyer.sourceGate?.status,'waiting-reusable-historical-scan');
assert.deepEqual(siyer.sourceGate?.acceptedEditionYears,[1924,1926]);
assert.ok(siyer.sourceGate?.catalogRecords?.some(x=>x.institution==='Türk Tarih Kurumu Kütüphanesi'&&x.recordId==='761204'&&x.callNumber==='AKM/K/20768'));
assert.ok((siyer.sourceGate?.reject||[]).some(x=>/academic thesis/i.test(x)));
assert.ok((siyer.sourceGate?.reject||[]).some(x=>/modern transliteration|simplification/i.test(x)));

console.log('siyer-source-gate: pending historical source gate passed');
