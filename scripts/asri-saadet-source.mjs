import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const manifest=JSON.parse(fs.readFileSync('sources/asri-saadet-1928/manifest.json','utf8'));
assert.equal(manifest.id,'asri-saadet-siyret-1928');
assert.deepEqual(manifest.volumes.map(x=>x.volume),[1,2,3,4]);
assert.deepEqual(manifest.volumes.map(x=>x.title),[
  'Peygamberimizin Sîreti',
  'Peygamberimizin Risâleti ve Şahsiyeti',
  'Peygamberimizin Rûhânî Hayatı',
  'Peygamberimizin Rûhânî Hayatı'
]);
assert.equal(manifest.releaseApproval.status,'pending');
assert.equal(manifest.output.status,'blocked-until-four-scans-four-transcriptions-and-human-approval');
assert.ok(manifest.sourcePolicy.rejected.some(x=>/Wikilala/i.test(x)));
assert.ok(manifest.sourcePolicy.rejected.some(x=>/Modern simplified/i.test(x)));
assert.equal(fs.existsSync(manifest.output.asset),false,'Asr-i Saadet public reader asset must not exist before source review approval');

const output=execFileSync(process.execPath,['scripts/asri-saadet-ingest.mjs'],{encoding:'utf8'});
const report=JSON.parse(output);
assert.equal(report.allInputsPresent,false);
assert.equal(report.buildAllowed,false);
assert.equal(report.releaseApproval,'pending');
assert.equal(report.volumes.length,4);
assert.ok(report.volumes.every(x=>x.scanPresent===false&&x.transcriptionPresent===false));

console.log('asri-saadet-source: four-volume fail-closed ingest gate passed');
