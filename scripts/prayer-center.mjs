import assert from 'node:assert/strict';
import {cleanTime,normalizePrayerPayload,prayerStatus,emptyQada,setQadaBalance,recordQada,undoQada,qadaRemaining,qadaTodayCount} from '../src/prayer-center.mjs';

assert.equal(cleanTime('05:17 (TRT)'), '05:17');
const normalized=normalizePrayerPayload({data:{timings:{Fajr:'05:10',Sunrise:'06:28',Dhuhr:'12:39',Asr:'16:07',Maghrib:'18:49',Isha:'20:05'},meta:{timezone:'Europe/Istanbul',method:{name:'Diyanet test'}}}});
assert.equal(normalized.times.maghrib,'18:49');
assert.equal(normalized.timezone,'Europe/Istanbul');

const day={...normalized,times:{fajr:'05:10',dhuhr:'12:39',asr:'16:07',maghrib:'18:49',isha:'20:05'}};
const tomorrow={...day,times:{...day.times,fajr:'05:11'}};
const fakeNoon=new Date('2026-09-19T10:00:00Z'); // 13:00 Istanbul
let status=prayerStatus(day,tomorrow,fakeNoon);
assert.equal(status.next.id,'asr');
assert.equal(status.current.id,'dhuhr');
assert.ok(status.minutesUntil>0);
const fakeLate=new Date('2026-09-19T20:00:00Z'); // 23:00 Istanbul
status=prayerStatus(day,tomorrow,fakeLate);
assert.equal(status.next.id,'fajr');
assert.equal(status.tomorrow,true);

let q=emptyQada();q.enabled=true;q=setQadaBalance(q,'fajr',2);q=setQadaBalance(q,'dhuhr',1);
assert.equal(qadaRemaining(q),3);
q=recordQada(q,'fajr','2026-09-19');
assert.equal(q.balances.fajr,1);
assert.equal(qadaTodayCount(q,'2026-09-19'),1);
q=undoQada(q);
assert.equal(q.balances.fajr,2);
assert.equal(qadaTodayCount(q,'2026-09-19'),0);
console.log('prayer-center: 11 checks passed');
