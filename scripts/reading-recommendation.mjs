import assert from 'node:assert/strict';
import {buildReadingRecommendation,rankReadingRecommendations} from '../src/reading-recommendation.mjs';
import {emptyKirkHadisState,scheduleHadisReviews} from '../src/kirk-hadis.mjs';

const date='2026-09-21';
const baseProfile={priorities:['reading','learning'],baseMinutes:15};
const baseCheckin={minutes:15,energy:3,load:3,mood:'normal',context:'normal'};
const library=(extra={})=>({quran:{surah:1,ayah:1},books:{},path:{completedBooks:[],completedAt:{},acknowledgedLevel:1},lastBook:'hadith',...extra});
const session=(date,minutes=8,feedback='ideal',endPage=2)=>({id:`s-${date}-${endPage}`,date,startedAt:`${date}T18:00:00.000Z`,endedAt:`${date}T18:0${minutes}:00.000Z`,startPage:1,endPage,pages:Math.max(1,endPage-1),minutes,feedback});

// A — new user, level 1
let rec=buildReadingRecommendation({date,profile:baseProfile,checkin:baseCheckin,library:library(),ilim:emptyKirkHadisState(),records:[]});
assert.equal(rec.bookId,'islam-dini','new level-one user should get the foundational book before unrelated books');
assert.ok(rec.minutes<=15&&rec.minutes>=4);

// B — continue Islam Dini around page 120 with 7–9 minute history
let lib=library({lastBook:'islam-dini',books:{'islam-dini':{page:120,totalPages:250,sessions:[
  session('2026-09-17',7,'ideal',112),session('2026-09-18',8,'ideal',115),session('2026-09-19',9,'easy',118),session('2026-09-20',8,'ideal',120)
]}}});
rec=buildReadingRecommendation({date,profile:baseProfile,checkin:{...baseCheckin,minutes:10},library:lib,ilim:emptyKirkHadisState(),records:[]});
assert.equal(rec.bookId,'islam-dini');
assert.ok(rec.minutes>=7&&rec.minutes<=9,'learned book dose should stay close to actual sessions');
assert.ok(rec.reasons.some(x=>x.includes('kaldığın yere')));

// C — two heavy sessions reduce dose
lib=library({lastBook:'islam-dini',books:{'islam-dini':{page:30,totalPages:250,sessions:[
  session('2026-09-19',9,'heavy',28),session('2026-09-20',9,'heavy',30)
]}}});
rec=buildReadingRecommendation({date,profile:baseProfile,checkin:{...baseCheckin,energy:2},library:lib,ilim:emptyKirkHadisState(),records:[]});
assert.equal(rec.bookId,'islam-dini');
assert.ok(rec.minutes<=6,'heavy feedback plus low energy should reduce reading dose');

// D — overdue hadith reviews outrank new reading
const ilim=emptyKirkHadisState();
scheduleHadisReviews(ilim,1,'2026-09-10');
rec=buildReadingRecommendation({date,profile:{...baseProfile,priorities:['learning','reading']},checkin:baseCheckin,library:library(),ilim,records:[]});
assert.equal(rec.kind,'hadith-review');
assert.equal(rec.action.type,'open-reviews');

// E — four consecutive sessions in the same book allow same-level diversity
lib=library({lastBook:'islam-dini',books:{
  'islam-dini':{page:80,totalPages:250,sessions:[
    session('2026-09-17',8,'ideal',72),session('2026-09-18',8,'ideal',75),session('2026-09-19',8,'ideal',78),session('2026-09-20',8,'ideal',80)
  ]}
}});
const ranked=rankReadingRecommendations({date,profile:baseProfile,checkin:baseCheckin,library:lib,ilim:emptyKirkHadisState(),records:[]});
assert.ok(ranked.findIndex(x=>x.bookId!=='islam-dini'&&x.activeLevel===1)<ranked.length-1,'diversity candidate should remain viable after a long same-book streak');

// F — final 10% increases continuation priority
lib=library({lastBook:'islam-dini',books:{'islam-dini':{page:230,totalPages:250,sessions:[session('2026-09-20',8,'ideal',230)]}}});
rec=buildReadingRecommendation({date,profile:baseProfile,checkin:baseCheckin,library:lib,ilim:emptyKirkHadisState(),records:[],bookTotals:{'islam-dini':250}});
assert.equal(rec.bookId,'islam-dini');
assert.ok(rec.reasons.some(x=>x.includes('son bölümüne')));

// G — lapsed reader gets a micro return
lib=library({lastBook:'islam-dini',books:{'islam-dini':{page:44,totalPages:250,sessions:[session('2026-09-10',10,'ideal',44)]}}});
rec=buildReadingRecommendation({date,profile:baseProfile,checkin:{...baseCheckin,minutes:20},library:lib,ilim:emptyKirkHadisState(),records:[]});
assert.equal(rec.bookId,'islam-dini');
assert.ok(rec.minutes<=5,'returning after a gap should use a micro dose');
assert.ok(rec.reasons.some(x=>x.includes('mikro')));

// Route-engine learned duration can cap the general reading recommendation.
const route=d=>({tasks:[{id:'reading',duration:12,slot:'evening'}]});
const records=[
  {date:'2026-09-16',route:route(12),done:['reading'],taskFeedback:{reading:'normal'},readingSessions:[{id:'r1',taskId:'reading',bookId:'islam-dini',minutes:6}]},
  {date:'2026-09-17',route:route(12),done:['reading'],taskFeedback:{reading:'normal'},readingSessions:[{id:'r2',taskId:'reading',bookId:'islam-dini',minutes:7}]},
  {date:'2026-09-18',route:route(12),done:['reading'],taskFeedback:{reading:'easy'},readingSessions:[{id:'r3',taskId:'reading',bookId:'islam-dini',minutes:8}]},
  {date:'2026-09-19',route:route(12),done:['reading'],taskFeedback:{reading:'normal'},readingSessions:[{id:'r4',taskId:'reading',bookId:'islam-dini',minutes:7}]}
];
rec=buildReadingRecommendation({date,profile:baseProfile,checkin:{...baseCheckin,minutes:10},library:library({lastBook:'islam-dini'}),ilim:emptyKirkHadisState(),records});
assert.equal(rec.routeTypicalMinutes,7);

console.log('reading-recommendation: scenarios A-G and learned reading dose passed');
