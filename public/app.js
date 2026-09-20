import {TASK_CATALOG,TIME_SLOTS} from '../src/catalog.mjs';
import {buildRoute,weeklyDigest,dayAdd,timeSlotLearning} from '../src/route-engine.mjs';
import {PRAYERS,emptyQada,normalizePrayerPayload,prayerStatus,formatDuration,qadaRemaining,qadaTargetProgress,setQadaBalance,recordQada,undoQada} from '../src/prayer-center.mjs';
import {KIRK_HADIS_META,KIRK_HADIS_UNITS,emptyKirkHadisState,normalizeKirkHadisState,getHadis,progressPct as hadisProgressPct,todayHadisPlan,recordHadisSession,scheduleHadisReviews,dueReviews as dueHadisReviews,recordRecallAttempt,recallPromptFor,knowledgeSignal,knowledgeOverview,addHadisHighlight,addHadisNote,toggleHadisBookmark,notebookEntries} from '../src/kirk-hadis.mjs';
import {emptyQuranReaderState,normalizeQuranReaderState,quranVerseHighlight,quranVerseNote,toggleQuranVerseHighlight,setQuranVerseNote} from '../src/quran-reader.mjs';
import {STARTER_LIBRARY,STARTER_LIBRARY_STAGES,starterBook,starterBooksByStage} from '../src/library-catalog.mjs';
import {normalizeBookReaderState,bookHighlight,bookNote,toggleBookHighlight,setBookNote,toggleBookPageBookmark,beginBookReadingSession,touchBookReadingSession,finishBookReadingSession,bookReadingSummary,searchBookPages} from '../src/book-reader.mjs';
import {emptyLibraryPathState,normalizeLibraryPathState,setGenericBookCompleted,isPathBookCompleted,libraryPathSnapshot,acknowledgeLibraryLevel} from '../src/library-path.mjs';
import {emptyPilotState,normalizePilotState,createPilotId,createPilotEvent,pilotRoutePayload,pilotDayPayload} from '../src/pilot-telemetry.mjs';

const KEY='manevi-rota-v2.7';
const LEGACY_KEYS=['manevi-rota-v2','manevi-rota-v1.4','manevi-rota-v1.3','manevi-rota-v1.2','manevi-rota-v1.1','manevi-rota-v1-pro'];
const app=document.querySelector('#app'),nav=document.querySelector('#nav');
const fresh=()=>({onboardStep:0,onboardDone:false,profile:{priorities:[],slotOverrides:{},slotSuggestionSnooze:{}},daily:{},view:'today',prayer:{location:{city:'',country:'Turkey',lat:null,lng:null,label:''},today:null,tomorrow:null,lastFetched:null,error:null},qada:emptyQada(),ilim:emptyKirkHadisState(),library:{quran:emptyQuranReaderState(),islam:{page:2,fontScale:1},books:{},path:emptyLibraryPathState(),lastBook:'hadith'},pilot:emptyPilotState()});
function load(){try{const own=localStorage.getItem(KEY);if(own)return JSON.parse(own);for(const k of LEGACY_KEYS){const v=localStorage.getItem(k);if(v)return {...fresh(),...JSON.parse(v)}}}catch{}return fresh()}
let S=load();
S.profile=S.profile||{priorities:[]};S.profile.slotOverrides=S.profile.slotOverrides||{};S.profile.slotSuggestionSnooze=S.profile.slotSuggestionSnooze||{};
S.daily=S.daily||{};S.prayer=S.prayer||fresh().prayer;S.prayer.location=S.prayer.location||fresh().prayer.location;S.qada={...emptyQada(),...(S.qada||{}),balances:{...emptyQada().balances,...(S.qada?.balances||{})}};S.ilim=normalizeKirkHadisState(S.ilim||{});const libraryBase=fresh().library;S.library={...libraryBase,...(S.library||{}),quran:normalizeQuranReaderState({...libraryBase.quran,...(S.library?.quran||{})}),islam:{...libraryBase.islam,...(S.library?.islam||{})},books:{...(S.library?.books||{})}};
S.library.books=Object.fromEntries(Object.entries(S.library.books||{}).map(([id,state])=>[id,normalizeBookReaderState(state)]));
S.library.path=normalizeLibraryPathState(S.library.path||{});
if(!S.library.books['islam-dini'])S.library.books['islam-dini']=normalizeBookReaderState({page:S.library.lastBook==='islam'?(S.library.islam?.page||2):2,fontScale:S.library.islam?.fontScale||1});
S.pilot=normalizePilotState(S.pilot||{});
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
const APP_VERSION='3.0.0';
let pilotFlushBusy=false;
const randomId=()=>createPilotId(globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID.bind(globalThis.crypto):null);
function ensurePilotId(){if(!S.pilot.pilotId)S.pilot.pilotId=randomId();return S.pilot.pilotId}
function pilotEnqueue(type,payload){
 if(!S.pilot.enabled)return;
 const event=createPilotEvent({eventId:randomId(),pilotId:ensurePilotId(),type,appVersion:APP_VERSION,payload});
 if(!event)return;
 S.pilot.queue=[...(S.pilot.queue||[]),event].slice(-200);
 S.pilot.lastError=null;save();
 setTimeout(()=>flushPilotQueue(),30);
}
function pilotRecordRoute(route,checkin,lightDay=false){if(route)pilotEnqueue('route_created',pilotRoutePayload(route,checkin,lightDay))}
function pilotRecordDay(action,day){if(day?.route)pilotEnqueue('day_progress',pilotDayPayload(day,action))}
async function flushPilotQueue(){
 if(pilotFlushBusy||!S.pilot.enabled||!(S.pilot.queue||[]).length)return;
 pilotFlushBusy=true;
 const batch=S.pilot.queue.slice(0,20);
 try{
   const res=await fetch('/api/pilot/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({events:batch})});
   const body=await res.json().catch(()=>({}));
   if(res.ok&&body.collectorConfigured&&Number(body.accepted)>0){
     const accepted=Math.min(batch.length,Number(body.accepted)||0);
     S.pilot.queue=S.pilot.queue.slice(accepted);
     S.pilot.transport='connected';S.pilot.lastFlushAt=new Date().toISOString();S.pilot.lastError=null;
   }else if(res.ok&&body.collectorConfigured===false){
     S.pilot.transport='local';S.pilot.lastError=null;
   }else{
     S.pilot.transport='error';S.pilot.lastError='Pilot verisi şu anda gönderilemedi; cihazdaki kuyruk korunuyor.';
   }
 }catch{
   S.pilot.transport='error';S.pilot.lastError='Pilot bağlantısına ulaşılamadı; cihazdaki kuyruk korunuyor.';
 }finally{pilotFlushBusy=false;save()}
}
function exportPilotQueue(){
 const payload={schemaVersion:1,exportedAt:new Date().toISOString(),pilotId:S.pilot.pilotId||null,events:S.pilot.queue||[]};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='manevi-rota-pilot-v1.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

const today=()=>{const d=new Date();const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)};
const records=()=>Object.entries(S.daily).map(([date,x])=>({date,...x}));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=x=>Math.round((x||0)*100);
const slotLabel=id=>TIME_SLOTS[id]?.label||id;
const slotIcon=id=>TIME_SLOTS[id]?.icon||'🕰️';
const policyContextLabel=id=>({return:'Geri dönüş','low-capacity':'Düşük kapasite',normal:'Normal gün',growth:'Derinleşme'}[id]||id||'—');
const apiDate=iso=>iso.split('-').reverse().join('-');

// v2.7 — Nevevî Kırk Hadis: Arapça metin + Manevî Rota özgün Türkçe tam tercüme.
// Kaynak: fawazahmed0/hadith-api, ara-nawawi edition. Prototipte ağdan alınır ve oturum boyunca önbelleğe alınır.
const NAWAWI_ARABIC_URL='https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-nawawi.min.json';
let nawawiArabic={};
let nawawiArabicLoading=null;
let nawawiArabicError='';
const cleanHadithHtml=t=>String(t||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,'').trim();
async function loadNawawiArabic(){
 if(Object.keys(nawawiArabic).length===42)return nawawiArabic;
 if(nawawiArabicLoading)return nawawiArabicLoading;
 nawawiArabicError='';
 nawawiArabicLoading=fetch(NAWAWI_ARABIC_URL,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(data=>{
   const rows=Array.isArray(data?.hadiths)?data.hadiths:[];
   nawawiArabic=Object.fromEntries(rows.filter(x=>x?.hadithnumber&&x?.text).map(x=>[Number(x.hadithnumber),cleanHadithHtml(x.text)]));
   if(Object.keys(nawawiArabic).length!==42)throw new Error('42 hadis bekleniyordu');
   return nawawiArabic;
 }).catch(err=>{nawawiArabicError='Hadisin Arapça metni şu anda yüklenemedi. İnternet bağlantını kontrol edip tekrar deneyebilirsin.';throw err}).finally(()=>{nawawiArabicLoading=null});
 return nawawiArabicLoading;
}
const arabicHadith=id=>nawawiArabic[Number(id)]||'';

const QURAN_META=[[1,"Fâtiha","الفاتحة",7],[2,"Bakara","البقرة",286],[3,"Âl-i İmrân","آل عمران",200],[4,"Nisâ","النساء",176],[5,"Mâide","المائدة",120],[6,"En’âm","الأنعام",165],[7,"A’râf","الأعراف",206],[8,"Enfâl","الأنفال",75],[9,"Tevbe","التوبة",129],[10,"Yûnus","يونس",109],[11,"Hûd","هود",123],[12,"Yûsuf","يوسف",111],[13,"Ra’d","الرعد",43],[14,"İbrâhim","إبراهيم",52],[15,"Hicr","الحجر",99],[16,"Nahl","النحل",128],[17,"İsrâ","الإسراء",111],[18,"Kehf","الكهف",110],[19,"Meryem","مريم",98],[20,"Tâhâ","طه",135],[21,"Enbiyâ","الأنبياء",112],[22,"Hac","الحج",78],[23,"Mü’minûn","المؤمنون",118],[24,"Nûr","النور",64],[25,"Furkân","الفرقان",77],[26,"Şuarâ","الشعراء",227],[27,"Neml","النمل",93],[28,"Kasas","القصص",88],[29,"Ankebût","العنكبوت",69],[30,"Rûm","الروم",60],[31,"Lokmân","لقمان",34],[32,"Secde","السجدة",30],[33,"Ahzâb","الأحزاب",73],[34,"Sebe’","سبأ",54],[35,"Fâtır","فاطر",45],[36,"Yâsîn","يس",83],[37,"Sâffât","الصافات",182],[38,"Sâd","ص",88],[39,"Zümer","الزمر",75],[40,"Mü’min (Gâfir)","غافر",85],[41,"Fussilet","فصلت",54],[42,"Şûrâ","الشورى",53],[43,"Zuhruf","الزخرف",89],[44,"Duhân","الدخان",59],[45,"Câsiye","الجاثية",37],[46,"Ahkâf","الأحقاف",35],[47,"Muhammed","محمد",38],[48,"Fetih","الفتح",29],[49,"Hucurât","الحجرات",18],[50,"Kâf","ق",45],[51,"Zâriyât","الذاريات",60],[52,"Tûr","الطور",49],[53,"Necm","النجم",62],[54,"Kamer","القمر",55],[55,"Rahmân","الرحمن",78],[56,"Vâkıa","الواقعة",96],[57,"Hadîd","الحديد",29],[58,"Mücâdele","المجادلة",22],[59,"Haşr","الحشر",24],[60,"Mümtehine","الممتحنة",13],[61,"Saf","الصف",14],[62,"Cuma","الجمعة",11],[63,"Münâfikûn","المنافقون",11],[64,"Tegâbün","التغابن",18],[65,"Talâk","الطلاق",12],[66,"Tahrîm","التحريم",12],[67,"Mülk","الملك",30],[68,"Kalem","القلم",52],[69,"Hâkka","الحاقة",52],[70,"Meâric","المعارج",44],[71,"Nûh","نوح",28],[72,"Cin","الجن",28],[73,"Müzzemmil","المزمل",20],[74,"Müddessir","المدثر",56],[75,"Kıyâmet","القيامة",40],[76,"İnsan","الإنسان",31],[77,"Mürselât","المرسلات",50],[78,"Nebe’","النبأ",40],[79,"Nâziât","النازعات",46],[80,"Abese","عبس",42],[81,"Tekvîr","التكوير",29],[82,"İnfitâr","الإنفطار",19],[83,"Mutaffifîn","المطففين",36],[84,"İnşikâk","الانشقاق",25],[85,"Burûc","البروج",22],[86,"Târık","الطارق",17],[87,"A’lâ","الأعلى",19],[88,"Gâşiye","الغاشية",26],[89,"Fecr","الفجر",30],[90,"Beled","البلد",20],[91,"Şems","الشمس",15],[92,"Leyl","الليل",21],[93,"Duhâ","الضحى",11],[94,"İnşirâh","الشرح",8],[95,"Tîn","التين",8],[96,"Alak","العلق",19],[97,"Kadr","القدر",5],[98,"Beyyine","البينة",8],[99,"Zilzâl","الزلزلة",8],[100,"Âdiyât","العاديات",11],[101,"Kâria","القارعة",11],[102,"Tekâsür","التكاثر",8],[103,"Asr","العصر",3],[104,"Hümeze","الهمزة",9],[105,"Fîl","الفيل",5],[106,"Kureyş","قريش",4],[107,"Mâûn","الماعون",7],[108,"Kevser","الكوثر",3],[109,"Kâfirûn","الكافرون",6],[110,"Nasr","النصر",3],[111,"Tebbet (Mesed)","المسد",5],[112,"İhlâs","الإخلاص",4],[113,"Felak","الفلق",5],[114,"Nâs","الناس",6]];
const quranChapterCache=new Map();
const genericBookCache=new Map();
let islamDiniLibrary=null,islamDiniLoading=null;
let quranProgressObserver=null;
const quranMeta=id=>{const x=QURAN_META.find(v=>v[0]===Number(id))||QURAN_META[0];return {id:x[0],turkish:x[1],arabic:x[2],verseCount:x[3]}};
async function loadQuranChapter(id){
 const n=Math.max(1,Math.min(114,Number(id)||1));if(quranChapterCache.has(n))return quranChapterCache.get(n);
 const r=await fetch(`public/data/quran/${n}.json`,{cache:'force-cache'});if(!r.ok)throw new Error('Kur’ân metni yüklenemedi.');
 const j=await r.json();if(!Array.isArray(j?.verses))throw new Error('Kur’ân veri biçimi geçersiz.');quranChapterCache.set(n,j);return j;
}
async function loadIslamDini(){
 if(islamDiniLibrary)return islamDiniLibrary;if(islamDiniLoading)return islamDiniLoading;
 islamDiniLoading=fetch('public/data/islam-dini.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('İslâm Dini metni yüklenemedi.');return r.json()}).then(j=>{if(!Array.isArray(j?.pages))throw new Error('İslâm Dini veri biçimi geçersiz.');islamDiniLibrary=j;return j}).finally(()=>{islamDiniLoading=null});return islamDiniLoading;
}
async function loadGenericBook(id){
 const book=starterBook(id);
 if(!book||book.readerType!=='generic'||book.availability!=='ready'||!book.asset)throw new Error('Bu eser henüz uygulama içi okumaya hazır değil.');
 if(genericBookCache.has(id))return genericBookCache.get(id);
 const r=await fetch(book.asset,{cache:'force-cache'});
 if(!r.ok)throw new Error('Kitap metni yüklenemedi.');
 const data=await r.json();
 if(!Array.isArray(data?.pages)||!data.pages.length)throw new Error('Kitap veri biçimi geçersiz.');
 genericBookCache.set(id,data);return data;
}
function genericBookState(id){
 S.library.books=S.library.books||{};
 S.library.books[id]=normalizeBookReaderState(S.library.books[id]||{});
 return S.library.books[id];
}
function genericBookBlocks(text){
 const normalized=String(text||'').replace(/\r/g,'')
   .replace(/¬\s*\n\s*/g,'')
   .replace(/([A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû])[\-‐‑‒–—]\s*\n\s*([A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû])/g,'$1$2');
 const raw=normalized.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 const out=[];
 for(const block of raw){
   const clean=block.split(/\n+/).map(x=>x.trim()).filter(Boolean).join(' ').replace(/[ \t]{2,}/g,' ').trim();
   if(!clean)continue;
   if(clean.length<=900){out.push(clean);continue}
   const sentences=clean.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.map(x=>x.trim()).filter(Boolean)||[clean];
   let group='';
   for(const sentence of sentences){
     if(group&&group.length+sentence.length>650){out.push(group);group=sentence}
     else group=(group?group+' ':'')+sentence;
   }
   if(group)out.push(group);
 }
 return out.length?out:[String(text||'').trim()].filter(Boolean);
}
function genericBookHeading(text){
 const value=String(text||'').trim();
 return value.length>0&&value.length<=130&&/[A-ZÇĞİÖŞÜÂÎÛ]/.test(value)&&value===value.toLocaleUpperCase('tr-TR');
}
function genericBookAnnotationSummary(state){
 const s=normalizeBookReaderState(state||{});
 return {notes:Object.keys(s.notes||{}).length,highlights:Object.keys(s.highlights||{}).length,bookmarks:(s.bookmarks||[]).length};
}
function syncGenericReadingSession(bookId,session){
 if(!session)return;
 const date=today(),d=ensure(date),row={...session,bookId,date};
 d.readingSessions=[row,...(d.readingSessions||[])].slice(0,40);
 const planned=(d.route?.tasks||[]).map(x=>x.id);
 const target=planned.includes('reading')?'reading':planned.includes('learning')?'learning':null;
 if(target&&(session.minutes>=2||session.pages>=1)){
   const done=new Set(d.done||[]);done.add(target);d.done=[...done];
   d.taskFeedback=d.taskFeedback||{};
   d.taskFeedback[target]=session.feedback==='heavy'?'hard':session.feedback==='easy'?'easy':'normal';
 }
 save();
}
function finalizeGenericBookSession(bookId,page,feedback='ideal'){
 const current=genericBookState(bookId),result=finishBookReadingSession(current,{page,at:new Date().toISOString(),feedback});
 S.library.books[bookId]=result.state;
 if(result.session)syncGenericReadingSession(bookId,result.session);
 return result.session;
}
function openStarterBook(id){
 const book=starterBook(id);if(!book||book.availability!=='ready')return;
 S.library.lastBook=id;save();
 if(book.readerType==='quran')return ilimGo('quran');
 if(book.readerType==='hadith')return ilimGo('reader',S.ilim.currentId);
 if(book.readerType==='islam')return ilimGo('islam');
 if(book.readerType==='generic'){
   const state=genericBookState(id);
   S.library.books[id]=beginBookReadingSession(state,{page:state.page,at:new Date().toISOString()});
   S.ilim.ui={...(S.ilim.ui||{}),screen:'book',bookId:id};
   save();return renderIlim();
 }
}
function renderLibraryLoading(title,subtitle='Metin hazırlanıyor…'){
 app.innerHTML=`<section class="readerTop"><button class="readerBack" id="libraryBack">←</button><div><small>İLİM KÜTÜPHANESİ</small><b>${esc(title)}</b></div></section><section class="libraryReaderLoading"><i></i><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></section>`;
 document.querySelector('#libraryBack').onclick=()=>ilimGo('home');
}
function renderLibraryError(title,message,retry){
 app.innerHTML=`<section class="readerTop"><button class="readerBack" id="libraryBack">←</button><div><small>İLİM KÜTÜPHANESİ</small><b>${esc(title)}</b></div></section><section class="card libraryLoadError"><div class="eyebrow">METİN AÇILAMADI</div><h2>${esc(title)}</h2><p>${esc(message)}</p><button class="btn primary" id="libraryRetry">Tekrar dene</button></section>`;
 document.querySelector('#libraryBack').onclick=()=>ilimGo('home');document.querySelector('#libraryRetry').onclick=retry;
}

const onboarding=[
 {k:'rhythm',q:'Manevî düzenin şu an nasıl?',o:[['new','Sıfırdan başlıyorum','Küçük ve net bir başlangıç istiyorum'],['irregular','Düzensizim','İstikrarı kurmak istiyorum'],['steady','Bir düzenim var','Daha dengeli ilerlemek istiyorum'],['strong','Düzenliyim','Kontrollü biçimde derinleşmek istiyorum']]},
 {k:'baseMinutes',q:'Normal bir günde gerçekçi olarak kaç dakika ayırabilirsin?',num:true,o:[[10,'10 dakika','Çok sade'],[15,'15 dakika','Kısa'],[20,'20 dakika','Dengeli'],[30,'30 dakika','Kapsamlı'],[45,'45 dakika','Derin']]},
 {k:'quranLevel',q:'Kur’an okuma düzenin nasıl?',o:[['beginner','Yeni başlıyorum','Alışkanlık kurmak istiyorum'],['rare','Ara sıra','Düzen kazanmak istiyorum'],['regular','Düzenli','Meal/tefekkür ekleyebilirim'],['advanced','Güçlü','Daha derin ilerleyebilirim']]},
 {k:'reading',q:'Düzenli okuma alışkanlığın?',o:[['none','Yok','Kısa başlamak istiyorum'],['rare','Ara sıra','İstikrar kurmak istiyorum'],['regular','Düzenli','Korumak istiyorum'],['strong','Güçlü','Derinleşebilirim']]},
 {k:'priorities',q:'Önceliklerin hangileri?',multi:true,o:[['quran','Kur’an'],['meal','Meal / tefekkür'],['reading','Okuma'],['dua','Dua / tesbihat'],['learning','İlmihal / siyer / hadis'],['akhlaq','Ahlâk / davranış']]},
 {k:'prayerTracking',q:'Namaz vakitleri rotanın içinde yer alsın mı?',bool:true,o:[[true,'Evet','Vakitleri ayrı Namaz Merkezi’nde göreyim ve günlük rotamla bağlantılı olsun'],[false,'Şimdilik hayır','Daha sonra profilden açabilirim']]},
 {k:'blocker',q:'Seni en sık ne aksatıyor?',o:[['time','Vakit','Plan fazla uzun geliyor'],['forget','Unutmak','Gün içinde kaynıyor'],['start','Başlamak','İlk adım zor geliyor'],['overload','Fazla hedef','Program şişiyor'],['variable','Değişken günler','Her gün aynı değil'],['none','Belirgin engel yok','Daha ileri gidebilirim']]},
 {k:'pace',q:'Rota sana nasıl yaklaşsın?',o:[['gentle','Yavaş ve sürdürülebilir','Önce düzen otursun'],['balanced','Dengeli','Kapasiteme göre ayarla'],['deep','Derinleşmeye açık','Sadece veri destekliyorsa artır']]}
];

function ensure(date=today()){return S.daily[date]||(S.daily[date]={checkin:{},done:[],taskFeedback:{},feedback:null,route:null,lightDay:false})}
function validOnboard(x){const v=S.profile[x.k];if(x.multi)return Array.isArray(v)&&v.length>=2;if(x.bool)return typeof v==='boolean';return v!==undefined&&v!==null&&v!==''}
function validCheck(c){return !!(c.minutes&&c.energy&&c.load&&c.mood&&c.context)}
function render(){if(!S.onboardDone){nav.classList.add('hidden');return renderOnboard()}nav.classList.remove('hidden');document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===S.view));if(S.view==='checkin')return renderCheckin();if(S.view==='prayer')return renderPrayer();if(S.view==='ilim')return renderIlim();if(S.view==='week')return renderWeek();if(S.view==='profile')return renderProfile();return renderToday()}

function renderOnboard(){
 const x=onboarding[S.onboardStep],v=S.profile[x.k];
 const options=x.multi?`<div class="chips">${x.o.map(o=>`<button class="chip ${(v||[]).includes(o[0])?'sel':''}" data-m="${o[0]}">${o[1]}</button>`).join('')}</div>`:`<div class="grid">${x.o.map(o=>`<button class="opt ${v===o[0]?'sel':''}" data-o="${o[0]}"><b>${o[1]}</b><small>${o[2]}</small></button>`).join('')}</div>`;
 app.innerHTML=`<section class="card onboardingCard"><div class="eyebrow">Manevî Rota · ${S.onboardStep+1}/${onboarding.length}</div><div class="steps">${onboarding.map((_,i)=>`<i class="step ${i<=S.onboardStep?'on':''}"></i>`).join('')}</div><h1>${x.q}</h1><p class="lead">İlk profilin oluşacak. Motor ilk günlerde kesin hüküm vermeyecek; gerçek kullanım verisi geldikçe dozunu ayarlayacak.</p>${options}<div class="actions"><button class="btn ghost" id="back" ${S.onboardStep===0?'disabled':''}>Geri</button><button class="btn primary" id="next" ${validOnboard(x)?'':'disabled'}>${S.onboardStep===onboarding.length-1?'Bugüne geç':'Devam'}</button></div></section>`;
 document.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{let raw=b.dataset.o;S.profile[x.k]=x.bool?raw==='true':x.num?Number(raw):raw;save();renderOnboard()});
 document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const a=new Set(S.profile.priorities||[]),k=b.dataset.m;a.has(k)?a.delete(k):(a.size<4&&a.add(k));S.profile.priorities=[...a];save();renderOnboard()});
 document.querySelector('#back').onclick=()=>{if(S.onboardStep){S.onboardStep--;save();renderOnboard()}};
 document.querySelector('#next').onclick=()=>{if(!validOnboard(x))return;if(S.onboardStep<onboarding.length-1){S.onboardStep++;save();renderOnboard()}else{S.onboardDone=true;S.view='checkin';save();render()}};
}

function renderCheckin(){
 const d=ensure(),c=d.checkin||{};
 const pick=(key,opts)=>opts.map(o=>`<button class="opt ${c[key]===o[0]?'sel':''}" data-c="${key}" data-v="${o[0]}"><b>${o[1]}</b><small>${o[2]}</small></button>`).join('');
 app.innerHTML=`<section class="card"><div class="eyebrow">Bugünkü durum</div><h1>Bugün sana göre.</h1><p class="lead">Profil tek başına yetmez. Motor bugünkü kapasiteni ve geçmiş davranışı birlikte okur.</p></section>
 <section class="card"><h3>Bugün gerçekten kaç dakikan var?</h3><div class="chips">${[5,10,15,20,30,45,60].map(n=>`<button class="chip ${c.minutes===n?'sel':''}" data-c="minutes" data-v="${n}">${n} dk</button>`).join('')}</div></section>
 <section class="card"><h3>Enerji</h3><p class="small">1 çok düşük · 5 çok yüksek</p><div class="range">${[1,2,3,4,5].map(n=>`<button class="${c.energy===n?'sel':''}" data-c="energy" data-v="${n}">${n}</button>`).join('')}</div></section>
 <section class="card"><h3>Zihinsel yük</h3><p class="small">1 sakin · 5 çok yoğun</p><div class="range">${[1,2,3,4,5].map(n=>`<button class="${c.load===n?'sel':''}" data-c="load" data-v="${n}">${n}</button>`).join('')}</div></section>
 <section class="card"><h3>Mod</h3><div class="grid">${pick('mood',[['low','Düşük','Başlamak zor'],['calm','Sakin','Sade gidebilirim'],['normal','Normal','Dengeli'],['motivated','İstekliyim','Biraz daha yapabilirim']])}</div></section>
 <section class="card"><h3>Günün yapısı</h3><div class="grid">${pick('context',[['busy','Yoğun gün','Kısa ve net'],['normal','Normal gün','Dengeli'],['travel','Yolculuk / dışarıda','Taşınabilir görevler'],['rest','Sakin gün','Derinleşmeye daha uygun']])}</div></section>
 <div class="actions"><button class="btn ghost" id="normalDay">Normal günümü kullan</button><button class="btn primary" id="go" ${validCheck(c)?'':'disabled'}>Rotayı analiz et</button></div>`;
 document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const k=b.dataset.c,v=['minutes','energy','load'].includes(k)?Number(b.dataset.v):b.dataset.v;d.checkin={...d.checkin,[k]:v};d.route=null;save();renderCheckin()});
 document.querySelector('#normalDay').onclick=()=>{d.checkin={minutes:S.profile.baseMinutes||15,energy:3,load:3,mood:'normal',context:'normal'};d.route=null;save();renderCheckin()};
 document.querySelector('#go').onclick=()=>startRouteAnalysis();
}

function startRouteAnalysis(){
 const d=ensure();if(!validCheck(d.checkin))return;
 d.route=makeRoute(true);save();pilotRecordRoute(d.route,d.checkin,d.lightDay);
 renderRouteAnalysis(d.route,0);
}
function renderRouteAnalysis(route,step=0){
 nav.classList.add('hidden');
 const stages=[
  ['Profilin okunuyor','Önceliklerin ve başlangıç tercihlerin yalnızca başlangıç varsayımı olarak değerlendiriliyor.'],
  ['Bugünkü kapasite hesaplanıyor','Enerji, zihinsel yük, gerçek süre ve günün yapısı birlikte okunuyor.'],
  ['Rutin hafızası kontrol ediliyor',route.evidence?.days?`${route.evidence.days} gerçek kullanım günü; her rutin ayrı ayrı inceleniyor.`:'Henüz geçmiş yok; motor hiçbir rutine kalıcı etiket vermiyor.'],
  ['Kanıt tazeliği ölçülüyor',route.analysis?.evidenceDays?`${route.analysis.evidenceStatus} · etkin kanıt ${route.analysis.effectiveEvidenceDays} gün · tazelik %${route.analysis.evidenceFreshness}`:'Geçmiş kanıt henüz oluşmadı.'],
  ['Rutin doğrulaması yapılıyor',route.analysis?.verifiedRoutines?.length?`${route.analysis.verifiedRoutines.length} rutin zamana yayılmış güncel veriyle doğrulandı.`:route.analysis?.revalidationRoutines?.length?`${route.analysis.revalidationRoutines.length} rutin yeniden doğrulama bekliyor.`:'Rutinlerin oturup oturmadığını söylemek için daha fazla veri gerekiyor.'],
  ['Davranış değişimi karşılaştırılıyor',route.analysis?.behaviorShift&&route.analysis.behaviorShift!=='BELİRSİZ'?`Yakın dönem, kendi önceki düzeninle karşılaştırılıyor: ${route.analysis.behaviorShift}.`:'Davranış değişimi için yeterli karşılaştırmalı veri bekleniyor.'],
  ['Dönemsel kapasite değerlendiriliyor',route.analysis?.capacityPhase?`${route.analysis.capacityPhase}; eski güçlü dönem bugüne otomatik taşınmıyor.`:'Dönemsel kapasite için veri toplanıyor.'],
  ['Müdahale sonuçları ölçülüyor',route.analysis?.interventionInsights?.length?`${route.analysis.interventionInsights.length} müdahale örüntüsü geçmiş sonuçlarıyla karşılaştırıldı.`:'Motor önce hangi küçük müdahalelerin işe yaradığını öğrenmek için kanıt topluyor.'],
  ['Doz ve zamanlama dengeleniyor',route.learner?.sustainableMinutes?`Öğrenilmiş sürdürülebilir doz yaklaşık ${route.learner.sustainableMinutes} dk; bugünkü kapasiteyle sınırlandırılıyor.`:'İlk doz bugünkü kapasite ve güvenli başlangıç kurallarıyla belirleniyor.'],
  ['Sana uygun rota belirlendi',`${route.mode} · ${route.totalMinutes} dk · ${route.tasks.length} görev`]
 ];
 const final=step>=stages.length-1;
 const doneCount=Math.min(step,stages.length-1);
 app.innerHTML=`<section class="analysisLoading"><div class="analysisMark ${final?'ready':''}">${final?'✓':'<i></i>'}</div><div class="eyebrow">Manevî Rota Motoru</div><h1>${esc(stages[step][0])}</h1><p>${esc(stages[step][1])}</p><div class="analysisProgress"><i style="width:${Math.round((step+1)/stages.length*100)}%"></i></div><div class="analysisSteps">${stages.map((x,i)=>`<div class="analysisStep ${i<step?'done':i===step?'active':''}"><span>${i<step?'✓':i===step?'•':'○'}</span><div><b>${esc(x[0])}</b>${i===step?`<small>${esc(x[1])}</small>`:''}</div></div>`).join('')}</div><div class="analysisPrivacy">Bu analiz maneviyatına puan vermez; yalnızca planın sürdürülebilirliğini ve bugünkü kapasiteyi değerlendirir.</div></section>`;
 if(final){setTimeout(()=>{S.view='today';save();render()},650);return}
 setTimeout(()=>renderRouteAnalysis(route,step+1),430);
}

function makeRoute(force=true){const d=ensure();if(d.route&&!force)return d.route;const route=buildRoute({date:today(),profile:S.profile,checkin:d.checkin,records:records(),lightDay:d.lightDay});d.route=route;save();return route}
function prayerSummary(){if(!S.prayer.today)return null;const st=prayerStatus(S.prayer.today,S.prayer.tomorrow,new Date());return st.next?{...st,label:S.prayer.location.label||S.prayer.location.city||'Seçili konum'}:null}

function renderToday(){
 const d=ensure();if(!validCheck(d.checkin)){S.view='checkin';save();return render()}
 const r=makeRoute(false),done=new Set(d.done||[]),progress=r.tasks.length?Math.round(r.tasks.filter(x=>done.has(x.id)).length/r.tasks.length*100):0;
 const a=r.analysis||{},behaviorReady=Number(a.evidenceDays||0)>=3;
 const hidden=new Set(d.dismissedTimeSuggestions||[]),suggestion=(r.timeSuggestions||[]).find(x=>!hidden.has(x.taskId));
 const grouped=Object.keys(TIME_SLOTS).map(slot=>({slot,tasks:r.tasks.filter(x=>x.slot===slot)})).filter(g=>g.tasks.length);
 const ps=prayerSummary(),qp=qadaTargetProgress(S.qada,today());
 const taskHtml=x=>{const t=TASK_CATALOG[x.id],isDone=done.has(x.id),fb=d.taskFeedback?.[x.id],ilimLink=['learning','reading'].includes(x.id);return `<section class="task premiumTask ${isDone?'done':''}"><div class="taskTop"><div class="ico">${t.icon}</div><div class="taskMain"><div class="taskTitleLine"><h3>${t.title}</h3><span>${x.duration} dk</span></div><div class="reason">${esc(t.description)}</div><div class="method">${esc(x.method)}</div>${ilimLink?`<button class="taskDeepLink" data-open-ilim="1">Kitaplığı aç →</button>`:''}<details class="taskWhy"><summary>Neden bugün?</summary><p>${x.reasons.length?x.reasons.map(esc).join(' · '):'Genel denge için'}</p></details></div><button class="toggle" data-task="${x.id}" aria-label="Görevi tamamla">✓</button></div>${isDone?`<div class="taskFeedback"><button class="${fb==='hard'?'sel':''}" data-tf="${x.id}:hard">Zor</button><button class="${fb==='normal'?'sel':''}" data-tf="${x.id}:normal">Tam kıvamında</button><button class="${fb==='easy'?'sel':''}" data-tf="${x.id}:easy">Rahat</button></div>`:''}</section>`};
 app.innerHTML=`<section class="card hero premiumTodayHero"><div class="premiumHeroTop"><div><div class="eyebrow">MANEVÎ ROTA · BUGÜN</div><h1>Bugünün Rotası</h1><p>Küçük adımlar, sürdürülebilir bir düzen.</p></div><div class="heroProgress"><b>${progress}%</b><span>tamamlandı</span></div></div><div class="premiumRouteSummary"><span>${r.mode}</span><span>${r.totalMinutes} dk</span><span>${r.tasks.length} görev</span><span>Motor: ${r.confidenceLabel}</span></div><div class="metrics"><div class="metric"><b>${r.totalMinutes} dk</b><span>Plan</span></div><div class="metric"><b>${r.tasks.length}</b><span>Görev</span></div><div class="metric"><b>${progress}%</b><span>Tamamlandı</span></div><div class="metric"><b>${r.evidence.days}</b><span>Kanıt günü</span></div></div><div class="explain">🧠 ${r.why.map(esc).join(' ')}</div></section>
 <section class="card engineAnalysis compactEngine"><details><summary><span>🧠 Rota neden böyle?</span><b>${esc(a.decision||r.mode)}</b></summary><div class="engineGrid"><div><small>Kanıt</small><b>${a.evidenceDays||0} gün</b></div><div><small>Etkin kanıt</small><b>${a.effectiveEvidenceDays??0} gün</b></div><div><small>Kanıt tazeliği</small><b>${esc(a.evidenceStatus||'—')} · %${a.evidenceFreshness??0}</b></div><div><small>Motor güveni</small><b>${a.confidence??r.confidence}%</b></div><div><small>Başlangıç profili etkisi</small><b>%${a.priorWeight??100}</b></div><div><small>Aşırı yük riski</small><b>%${a.overloadRisk??0}</b></div><div><small>Dönemsel kapasite</small><b>${esc(a.capacityPhase||'Veri topluyor')}</b></div><div><small>Davranış değişimi</small><b>${esc(a.behaviorShift||'Belirsiz')}</b></div><div><small>Yakın dönem tamamlama</small><b>${behaviorReady?`%${a.recentCompletion}`:'Veri bekliyor'}</b></div><div><small>Öğrenilmiş günlük doz</small><b>${a.learnedSustainableMinutes?`${a.learnedSustainableMinutes} dk`:'Henüz yok'}</b></div><div><small>Doğrulanmış rutin</small><b>${a.verifiedRoutines?.length||0}</b></div><div><small>Yeniden doğrulama</small><b>${a.revalidationRoutines?.length||0}</b></div><div><small>Yumuşak geri dönüş</small><b>${a.returnAreas?.length?`${a.returnAreas.length} rutin`:'Yok'}</b></div><div><small>Müdahale hafızası</small><b>${a.interventionInsights?.length?`${a.interventionInsights.length} örüntü`:'Veri topluyor'}</b></div></div>${a.contradictions?.length?`<div class="analysisSignals">${a.contradictions.map(x=>`<p>↳ ${esc(x)}</p>`).join('')}</div>`:''}${a.interventionInsights?.length?`<div class="analysisSignals"><p><b>Motorun öğrendiği müdahaleler</b></p>${a.interventionInsights.slice(0,3).map(x=>{const ctx=Object.entries(x.contexts||{}).sort((a,b)=>(b[1].samples||0)-(a[1].samples||0))[0];const ctxText=ctx?` · ${policyContextLabel(ctx[0])}: ${ctx[1].policy==='repeat'?'işe yarıyor':ctx[1].policy==='change'?'yaklaşımı değiştir':ctx[1].policy==='revalidate'?'yeniden doğrula':'izleniyor'}`:'';return `<p>↳ ${esc(TASK_CATALOG[x.taskId]?.title||x.taskId)} · ${esc(x.kind)} · ${x.policy==='repeat'?'tekrar edilebilir':x.policy==='change'?'yaklaşımı değiştir':x.policy==='revalidate'?'yeniden doğrula':'izleniyor'}${esc(ctxText)} (${x.samples} örnek)</p>`}).join('')}</div>`:''}<p class="small">Başlangıç cevapların kalıcı etiket değildir. Motor v2.1 eski kanıtı zamanla zayıflatır; bir rutini ancak zamana yayılmış güncel verilerle doğrular ve müdahale sonuçlarını benzer koşullarda ayrı öğrenir.</p></details></section>
 ${S.profile.prayerTracking?`<section class="prayerStrip" data-view="prayer"><div><span class="prayerStripIcon">🕌</span><div><small>NAMAZ MERKEZİ</small><b>${ps?`${ps.next.label} · ${ps.next.time}`:'Vakitlerini bağla'}</b><span>${ps?`${formatDuration(ps.minutesUntil)} kaldı · ${esc(ps.label)}`:'Konum veya şehir seçerek bugünün vakitlerini getir.'}</span></div></div><div class="qadaMini">${S.qada.enabled?`Kaza hedefi <b>${qp.done}/${qp.target}</b>`:'Aç →'}</div></section>`:''}
 <div class="actions" style="margin:0 0 12px"><button class="btn ghost" id="edit">Bugünkü durumu değiştir</button><button class="btn ${d.lightDay?'primary':'ghost'}" id="light">${d.lightDay?'Hafif gün açık':'Bugünü hafiflet'}</button></div>
 ${suggestion?`<section class="card timingSuggestion"><div class="eyebrow">Zamanlama önerisi</div><h3>${TASK_CATALOG[suggestion.taskId].icon} ${TASK_CATALOG[suggestion.taskId].title} için saat değişikliği</h3><p><b>${slotLabel(suggestion.from)}</b> diliminde son ${suggestion.currentSamples} planda tamamlama %${pct(suggestion.currentCompletion)}. <b>${slotLabel(suggestion.to)}</b> dilimi sende %${pct(suggestion.targetCompletion)} tamamlama gösteriyor.</p><div class="explain">Bu bir manevî değerlendirme değil; yalnızca rutinin hangi saatte daha sürdürülebilir göründüğünü karşılaştırır. Değişiklik ancak sen onaylarsan uygulanır.</div><div class="actions"><button class="btn primary" id="acceptTiming" data-id="${suggestion.taskId}" data-slot="${suggestion.to}">${slotLabel(suggestion.to)}na taşı</button><button class="btn ghost" id="snoozeTiming" data-id="${suggestion.taskId}">Şimdilik kalsın</button></div></section>`:''}
 ${grouped.map(g=>`<section class="slotGroup"><div class="slotHead"><span>${slotIcon(g.slot)}</span><div><b>${slotLabel(g.slot)}</b><small>${g.tasks.reduce((a,x)=>a+x.duration,0)} dk</small></div></div>${g.tasks.map(taskHtml).join('')}</section>`).join('')}
 <section class="card"><h3>Bugünkü rota nasıldı?</h3><p>Seçmezsen motor bir şey varsaymaz.</p><div class="dayFeedback">${[['heavy','Ağır geldi'],['ideal','Tam kıvamında'],['easy','Kolaydı']].map(([k,l])=>`<button class="rating ${d.feedback===k?'sel':''}" data-dayf="${k}">${l}</button>`).join('')}</div></section>`;
 document.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>{const set=new Set(d.done||[]),id=b.dataset.task;set.has(id)?(set.delete(id),delete d.taskFeedback[id]):set.add(id);d.done=[...set];save();pilotRecordDay('task-toggle',d);renderToday()});
 document.querySelectorAll('[data-open-ilim]').forEach(b=>b.onclick=()=>{S.view='ilim';S.ilim.ui={...S.ilim.ui,screen:'home'};save();render()});
 document.querySelectorAll('[data-tf]').forEach(b=>b.onclick=()=>{const [id,v]=b.dataset.tf.split(':');d.taskFeedback=d.taskFeedback||{};d.taskFeedback[id]=d.taskFeedback[id]===v?null:v;if(!d.taskFeedback[id])delete d.taskFeedback[id];save();pilotRecordDay('task-feedback',d);renderToday()});
 document.querySelectorAll('[data-dayf]').forEach(b=>b.onclick=()=>{d.feedback=d.feedback===b.dataset.dayf?null:b.dataset.dayf;save();pilotRecordDay('day-feedback',d);renderToday()});
 document.querySelector('#edit').onclick=()=>{S.view='checkin';save();render()};
 document.querySelector('#light').onclick=()=>{d.lightDay=!d.lightDay;d.route=null;d.done=[];d.taskFeedback={};makeRoute(true);save();pilotRecordRoute(d.route,d.checkin,d.lightDay);pilotRecordDay('light-day',d);renderToday()};
 const accept=document.querySelector('#acceptTiming');if(accept)accept.onclick=()=>{const id=accept.dataset.id,slot=accept.dataset.slot;S.profile.slotOverrides[id]=slot;delete S.profile.slotSuggestionSnooze[id];d.route=null;makeRoute(true);save();renderToday()};
 const snooze=document.querySelector('#snoozeTiming');if(snooze)snooze.onclick=()=>{const id=snooze.dataset.id;S.profile.slotSuggestionSnooze[id]=dayAdd(today(),7);d.dismissedTimeSuggestions=[...new Set([...(d.dismissedTimeSuggestions||[]),id])];save();renderToday()};
}

async function fetchPrayerTimes(location=S.prayer.location){
 S.prayer.error=null;save();
 const iso=today(),tomorrow=dayAdd(iso,1);const dates=[iso,tomorrow];
 try{
  const get=async date=>{
   const d=apiDate(date);let url;
   if(Number.isFinite(Number(location.lat))&&Number.isFinite(Number(location.lng)))url=`https://api.aladhan.com/v1/timings/${d}?latitude=${encodeURIComponent(location.lat)}&longitude=${encodeURIComponent(location.lng)}&method=13`;
   else if(location.city)url=`https://api.aladhan.com/v1/timingsByCity/${d}?city=${encodeURIComponent(location.city)}&country=${encodeURIComponent(location.country||'Turkey')}&method=13`;
   else throw new Error('Önce şehir veya konum seçmelisin.');
   const res=await fetch(url,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error(`Vakit servisi ${res.status} hatası verdi.`);const json=await res.json();if(Number(json.code)!==200)throw new Error(json.status||'Vakitler alınamadı.');return normalizePrayerPayload(json);
  };
  const [a,b]=await Promise.all(dates.map(get));S.prayer.today=a;S.prayer.tomorrow=b;S.prayer.lastFetched=new Date().toISOString();S.prayer.error=null;save();return true;
 }catch(err){S.prayer.error=String(err.message||err);save();return false}
}

function renderPrayer(){
 const p=S.prayer,has=!!p.today,st=has?prayerStatus(p.today,p.tomorrow,new Date()):null,remaining=qadaRemaining(S.qada),qp=qadaTargetProgress(S.qada,today());
 const locationLabel=p.location.label||p.location.city||'Konum seçilmedi';
 app.innerHTML=`${has?`<section class="prayerHero"><div class="prayerHeroTop"><div><div class="eyebrow lightEye">Sıradaki vakit · ${esc(locationLabel)}</div><h1>${st?.next?`${st.next.label} ${st.next.time}`:'Bugünün vakitleri'}</h1><p>${st?.next?`${formatDuration(st.minutesUntil)} kaldı${st.tomorrow?' · yarın':''}`:'Vakit akışı için sayfayı yenileyebilirsin.'}</p></div><button class="roundButton" id="refreshPrayer" aria-label="Vakitleri yenile">↻</button></div><div class="prayerSource">Hesaplama: Diyanet yöntemi · çevrimiçi vakit servisi</div></section>`:`<section class="card prayerSetup"><div class="eyebrow">Namaz Merkezi</div><h1>Vakitler, sade ve güvenilir.</h1><p class="lead">Konum izni vermek zorunda değilsin. Şehir seçebilir veya istersen yalnızca bu işlem için cihaz konumunu kullanabilirsin.</p><div class="formGrid"><label><span>Şehir</span><input id="city" placeholder="Örn. Mersin" value="${esc(p.location.city||'')}" /></label><label><span>Ülke</span><input id="country" placeholder="Turkey" value="${esc(p.location.country||'Turkey')}" /></label></div><div class="actions"><button class="btn ghost" id="useLocation">Konumumu kullan</button><button class="btn primary" id="saveLocation">Vakitleri getir</button></div>${p.error?`<div class="errorBox">${esc(p.error)}</div>`:''}<div class="sourceNote"><b>Üretim planı:</b> Diyanet’in resmî Awqat Salah API’si kimlik doğrulama gerektiriyor. Prototip çevrimiçi çalışabilsin diye Diyanet hesaplama yöntemini destekleyen yedek servis kullanıyor; resmî API erişimi alındığında sağlayıcıyı değiştireceğiz.</div></section>`}
 ${has?`<section class="card prayerTimesCard"><div class="sectionHead"><div><div class="eyebrow">Bugünün vakitleri</div><h2>${esc(locationLabel)}</h2></div><button class="textButton" id="changeLocation">Konumu değiştir</button></div><div class="prayerGrid">${PRAYERS.map(x=>`<div class="prayerTime ${st?.next?.id===x.id?'next':''}"><span>${x.icon}</span><small>${x.label}</small><b>${esc(p.today.times[x.id]||'—')}</b>${st?.next?.id===x.id?'<i>SIRADAKİ</i>':''}</div>`).join('')}</div><div class="sunriseLine"><span>Güneş</span><b>${esc(p.today.sunrise||'—')}</b><span class="spacer"></span><span>${p.today.hijri?`${esc(p.today.hijri)} Hicrî`:''}</span></div>${p.error?`<div class="errorBox">${esc(p.error)}</div>`:''}</section>`:''}
 <section class="card qadaCard"><div class="sectionHead"><div><div class="eyebrow">Kaza namazı takibi</div><h2>${S.qada.enabled?'Kendi kaydın, kendi hedefin.':'İstersen özel olarak takip et.'}</h2></div><button class="switch ${S.qada.enabled?'on':''}" id="toggleQada" aria-pressed="${S.qada.enabled}"><i></i></button></div><p>${S.qada.enabled?'Sistem borç miktarını kendisi hesaplamaz ve fıkhî hüküm üretmez. Girdiğin yaklaşık sayıyı takip eder.':'Bu alan varsayılan olarak kapalıdır. Açarsan veriler yalnızca bu cihazın tarayıcı saklama alanında tutulur.'}</p>
 ${S.qada.enabled?`<div class="qadaSummary"><div><span>Kalan kayıt</span><b>${remaining.toLocaleString('tr-TR')}</b></div><div><span>Bugünkü hedef</span><b>${qp.done}/${qp.target}</b></div></div><div class="targetRow"><span>Günlük hedef</span><div class="chips compact">${[1,2,3,5].map(n=>`<button class="chip ${Number(S.qada.dailyTarget)===n?'sel':''}" data-qtarget="${n}">${n}</button>`).join('')}</div></div><div class="qadaList">${PRAYERS.map(x=>`<div class="qadaRow"><div><span>${x.icon}</span><div><b>${x.label}</b><small>Kalan</small></div></div><input class="qadaInput" inputmode="numeric" type="number" min="0" data-qbalance="${x.id}" value="${Math.max(0,Number(S.qada.balances[x.id]||0))}" aria-label="${x.label} kalan kaza sayısı"/><button class="qadaDone" data-qdone="${x.id}" ${Number(S.qada.balances[x.id]||0)<=0?'disabled':''}>1 kıldım</button></div>`).join('')}</div><div class="actions"><button class="btn ghost" id="undoQada" ${S.qada.logs.length?'':'disabled'}>Son işlemi geri al</button></div>`:''}
 <div class="privacyNote">🔒 Kaza kayıtları bu prototipte yalnızca cihazında saklanır. Liderlik tablosu, puan veya başkalarıyla karşılaştırma yoktur.</div></section>
 <section class="card sourceCard"><details><summary>Vakit kaynağı hakkında</summary><p>Prototipte AlAdhan’ın <b>method 13</b> seçeneği kullanılır. Bu seçenek Diyanet İşleri Başkanlığı yöntemini “experimental” olarak tanımlar; bu nedenle resmî Diyanet yayınlarıyla dakika farkı olabilir. Üretimde resmî Diyanet Awqat Salah API’sini ana sağlayıcı yapmayı planlıyoruz.</p></details></section>`;
 const saveLoc=document.querySelector('#saveLocation');if(saveLoc)saveLoc.onclick=async()=>{const city=document.querySelector('#city').value.trim(),country=document.querySelector('#country').value.trim()||'Turkey';S.prayer.location={city,country,lat:null,lng:null,label:city};save();saveLoc.disabled=true;saveLoc.textContent='Getiriliyor…';await fetchPrayerTimes();renderPrayer()};
 const useLocation=document.querySelector('#useLocation');if(useLocation)useLocation.onclick=()=>{if(!navigator.geolocation){S.prayer.error='Bu tarayıcı konum özelliğini desteklemiyor.';save();return renderPrayer()}useLocation.disabled=true;useLocation.textContent='Konum alınıyor…';navigator.geolocation.getCurrentPosition(async pos=>{S.prayer.location={city:'',country:'',lat:pos.coords.latitude,lng:pos.coords.longitude,label:'Cihaz konumu'};save();await fetchPrayerTimes();renderPrayer()},err=>{S.prayer.error=err.message||'Konum alınamadı.';save();renderPrayer()},{enableHighAccuracy:false,timeout:10000,maximumAge:3600000})};
 const refresh=document.querySelector('#refreshPrayer');if(refresh)refresh.onclick=async()=>{refresh.disabled=true;await fetchPrayerTimes();renderPrayer()};
 const change=document.querySelector('#changeLocation');if(change)change.onclick=()=>{S.prayer.today=null;S.prayer.tomorrow=null;S.prayer.error=null;save();renderPrayer()};
 document.querySelector('#toggleQada').onclick=()=>{S.qada.enabled=!S.qada.enabled;if(!S.qada.initializedAt)S.qada.initializedAt=new Date().toISOString();save();renderPrayer()};
 document.querySelectorAll('[data-qtarget]').forEach(b=>b.onclick=()=>{S.qada.dailyTarget=Number(b.dataset.qtarget);save();renderPrayer()});
 document.querySelectorAll('[data-qbalance]').forEach(i=>i.onchange=()=>{S.qada=setQadaBalance(S.qada,i.dataset.qbalance,i.value);save();renderPrayer()});
 document.querySelectorAll('[data-qdone]').forEach(b=>b.onclick=()=>{S.qada=recordQada(S.qada,b.dataset.qdone,today());save();renderPrayer()});
 const undo=document.querySelector('#undoQada');if(undo)undo.onclick=()=>{S.qada=undoQada(S.qada);save();renderPrayer()};
}

function renderWeek(){
 const k=today();
 const range=S.profile.progressRange||'7';
 const windowDays=range==='7'?7:range==='30'?30:null;
 const allDates=Object.keys(S.daily||{}).sort();
 const startDate=windowDays?dayAdd(k,-(windowDays-1)):(allDates[0]||k);
 const inRange=date=>date>=startDate&&date<=k;
 const dateCount=windowDays||Math.max(1,Math.round((new Date(k+'T00:00:00')-new Date(startDate+'T00:00:00'))/86400000)+1);

 const dayRows=[];
 for(let i=dateCount-1;i>=0;i--){
   const date=dayAdd(k,-i),d=S.daily[date],tasks=d?.route?.tasks||[],doneSet=new Set(d?.done||[]);
   dayRows.push({date,total:tasks.length,done:tasks.filter(x=>doneSet.has(x.id)).length,feedback:d?.feedback||null,mode:d?.route?.mode||'',light:!!d?.lightDay});
 }

 const evidenceRows=dayRows.filter(x=>x.total>0);
 const totalTasks=evidenceRows.reduce((a,x)=>a+x.total,0);
 const totalDone=evidenceRows.reduce((a,x)=>a+x.done,0);
 const consistency=totalTasks?Math.round(totalDone/totalTasks*100):null;

 const understandingSessions=(S.ilim.sessions||[]).filter(x=>x.date&&inRange(x.date)&&Number.isFinite(Number(x.understanding)));
 const understanding=understandingSessions.length?Math.round(understandingSessions.reduce((a,x)=>a+(Number(x.understanding)-1)/4*100,0)/understandingSessions.length):null;

 const recalls=(S.ilim.recalls||[]).filter(x=>x.date&&inRange(x.date));
 const recall=recalls.length?Math.round(recalls.reduce((a,x)=>a+(x.result==='remembered'?100:x.result==='hard'?55:0),0)/recalls.length):null;

 const dayFeedback=dayRows.filter(x=>x.feedback).map(x=>x.feedback==='easy'?100:x.feedback==='ideal'?78:x.feedback==='heavy'?38:null).filter(x=>x!==null);
 const taskFeedback=[];
 for(const [date,d] of Object.entries(S.daily||{})){
   if(!inRange(date))continue;
   for(const v of Object.values(d.taskFeedback||{})) taskFeedback.push(v==='easy'?100:v==='normal'?78:v==='hard'?38:null);
 }
 const loadSamples=[...dayFeedback,...taskFeedback.filter(x=>x!==null)];
 const loadTolerance=loadSamples.length?Math.round(loadSamples.reduce((a,b)=>a+b,0)/loadSamples.length):null;

 const evidenceDays=new Set([
   ...evidenceRows.map(x=>x.date),
   ...(S.ilim.sessions||[]).filter(x=>x.date&&inRange(x.date)).map(x=>x.date),
   ...recalls.map(x=>x.date)
 ]).size;
 const confidence=evidenceDays<3?'Düşük':evidenceDays<7?'Orta':'Güçlü';

 const priorStart=dayAdd(startDate,-dateCount);
 const priorEnd=dayAdd(startDate,-1);
 const priorRows=Object.entries(S.daily||{}).filter(([date])=>date>=priorStart&&date<=priorEnd).map(([date,d])=>{const tasks=d?.route?.tasks||[],doneSet=new Set(d?.done||[]);return {total:tasks.length,done:tasks.filter(x=>doneSet.has(x.id)).length}});
 const priorTotal=priorRows.reduce((a,x)=>a+x.total,0),priorDone=priorRows.reduce((a,x)=>a+x.done,0);
 const priorConsistency=priorTotal?Math.round(priorDone/priorTotal*100):null;
 const consistencyDelta=consistency!==null&&priorConsistency!==null?consistency-priorConsistency:null;

 const chartRows=dayRows.slice(-(range==='7'?7:30));
 const chartMax=Math.max(1,...chartRows.map(x=>x.total||0));
 const barHtml=chartRows.map((x,i)=>{const pctVal=x.total?Math.round(x.done/x.total*100):0;const h=x.total?Math.max(12,pctVal):5;const label=(i===0||i===chartRows.length-1||chartRows.length<=7)?x.date.slice(5).replace('-','/'):'';return `<div class="journeyBarCol" title="${esc(x.date)} · ${x.done}/${x.total}"><div class="journeyBarTrack"><i style="height:${h}%"></i></div><small>${label}</small></div>`}).join('');

 const metricCard=(icon,title,value,sub,cls='')=>`<article class="journeyMetric ${cls}"><div class="journeyMetricIcon">${icon}</div><div><small>${title}</small><b>${value===null?'—':value+'%'}</b><span>${value===null?'Veri bekliyor':sub}</span></div></article>`;

 const insights=[];
 if(evidenceDays<3) insights.push('Motor hâlâ kalibrasyonda. Birkaç günlük gerçek kullanım gelmeden güçlü sonuç üretmiyor.');
 if(consistencyDelta!==null&&consistencyDelta>=8) insights.push(`İstikrar önceki döneme göre ${consistencyDelta} puan yükseldi.`);
 else if(consistencyDelta!==null&&consistencyDelta<=-8) insights.push(`İstikrar önceki döneme göre ${Math.abs(consistencyDelta)} puan düştü; yükü büyütmek yerine ritmi korumak daha değerli.`);
 if(recall!==null&&recall<50) insights.push('Hatırlama sinyali düşük. Yeni içerikten önce geri çağırma tekrarlarının payı artırılmalı.');
 if(recall!==null&&recall>=75) insights.push('Hatırlama sinyali güçlü; yeni içeriğe küçük adımlarla ilerlemek için alan var.');
 if(loadTolerance!==null&&loadTolerance<50) insights.push('Yük toleransı zorlanma gösteriyor; görevleri kısaltmak daha sürdürülebilir görünüyor.');
 if(loadTolerance!==null&&loadTolerance>=75) insights.push('Mevcut yük çoğunlukla taşınabiliyor; ani artış yapmadan mevcut tempo korunabilir.');
 if(understanding===null) insights.push('Anlama yüzdesi üretilmedi; okuyucuda doğrudan anlama kaydı geldikçe bu kart gerçek veriye dönecek.');
 if(!insights.length) insights.push('Bu dönemde belirgin bir sapma yok; mevcut ritim dengeli görünüyor.');

 const timing=timeSlotLearning({records:records(),today:k,profile:S.profile});
 const slotRows=Object.entries(timing.slots).filter(([,x])=>x.samples>=2).sort((a,b)=>b[1].samples-a[1].samples);

 app.innerHTML=`
 <section class="card progressHero premiumProgressHero">
   <div class="progressTopline">
     <div><div class="eyebrow">İLERLEME</div><h1>${range==='7'?'Son 7 günlük':range==='30'?'Son 30 günlük':'Genel'} yolculuğun</h1><p class="lead">Yargı değil; ritim, öğrenme ve yük ayarı.</p></div>
     <span class="progressConfidence">${confidence} güven</span>
   </div>
   <div class="progressTabs">
     <button class="${range==='7'?'active':''}" data-progress-range="7">7 Gün</button>
     <button class="${range==='30'?'active':''}" data-progress-range="30">30 Gün</button>
     <button class="${range==='all'?'active':''}" data-progress-range="all">Genel</button>
   </div>
   <div class="journeyChartCard">
     <div class="journeyChartHead"><div><small>RİTİM GRAFİĞİ</small><b>${evidenceDays} veri günü</b></div><span>${consistency===null?'Henüz ölçülmedi':'%'+consistency+' tamamlama'}</span></div>
     <div class="journeyChart">${chartRows.length?chartRows.map((x,i)=>{const pv=x.total?Math.round(x.done/x.total*100):0;const h=x.total?Math.max(12,pv):5;const label=(i===0||i===chartRows.length-1||chartRows.length<=7)?x.date.slice(5).replace('-','/'):'';return `<div class="journeyBarCol" title="${esc(x.date)} · ${x.done}/${x.total}"><div class="journeyBarTrack"><i style="height:${h}%"></i></div><small>${label}</small></div>`}).join(''):'<div class="progressEmpty">Henüz grafik oluşturacak kullanım verisi yok.</div>'}</div>
   </div>
 </section>

 <section class="journeyMetricGrid">
   ${metricCard('↗','İSTİKRAR',consistency,consistencyDelta===null?'Mevcut ritim':consistencyDelta>0?`+${consistencyDelta} puan`:consistencyDelta<0?`${consistencyDelta} puan`:'Değişmedi','consistency')}
   ${metricCard('◉','ANLAMA',understanding,understandingSessions.length+' doğrudan kayıt','understanding')}
   ${metricCard('↻','HATIRLAMA',recall,recalls.length+' geri çağırma','recall')}
   ${metricCard('◒','YÜK TOLERANSI',loadTolerance,loadSamples.length+' geri bildirim','load')}
 </section>

 <section class="card periodInsight">
   <div class="sectionHead"><div><div class="eyebrow">BU DÖNEMDE NE DEĞİŞTİ?</div><h2>Motorun kısa okuması</h2></div><span class="sourcePill">${confidence} güven</span></div>
   <div class="insightCards">${insights.slice(0,4).map((x,i)=>`<div class="periodInsightRow"><span>${i+1}</span><p>${esc(x)}</p></div>`).join('')}</div>
 </section>

 ${slotRows.length?`<section class="card progressDetails"><details><summary>Zamanlama öğrenimini göster</summary><div class="slotStats">${slotRows.map(([slot,x])=>`<div class="slotStat"><span>${slotIcon(slot)}</span><div><b>${slotLabel(slot)}</b><small>${x.completed}/${x.samples} tamamlandı</small></div><strong>%${pct(x.completion)}</strong></div>`).join('')}</div></details></section>`:''}

 <section class="card progressDetails"><details><summary>Bu yüzdeler nasıl hesaplanıyor?</summary><p class="small"><b>İstikrar</b> gerçek rota görevlerinin tamamlanmasından; <b>Anlama</b> okuyucuda isteğe bağlı bırakılan 1–5 doğrudan anlama kaydından; <b>Hatırlama</b> geri çağırma sonuçlarından; <b>Yük toleransı</b> günlük ve görev sonrası Zor/Normal/Rahat geri bildirimlerinden gelir. Veri yoksa sistem yüzde üretmez.</p><p class="small">Bunlar maneviyat veya dinî değer puanı değildir.</p></details></section>`;

 document.querySelectorAll('[data-progress-range]').forEach(b=>b.onclick=()=>{S.profile.progressRange=b.dataset.progressRange;save();renderWeek()});
}
function renderProfile(){
 const p=S.profile,overrides=Object.entries(p.slotOverrides||{}),pilot=normalizePilotState(S.pilot||{});
 S.pilot=pilot;
 const pilotStatus=!pilot.enabled?'Kapalı':pilot.transport==='connected'?'Collector bağlı':pilot.transport==='error'?'Bağlantı bekliyor':'Cihaz kuyruğu';
 app.innerHTML=`<section class="card"><div class="eyebrow">Profil</div><h1>Motor seni böyle tanıyor.</h1><p><b>Normal gün:</b> ${p.baseMinutes||'-'} dk</p><p><b>Öncelikler:</b> ${(p.priorities||[]).map(id=>TASK_CATALOG[id]?.title).filter(Boolean).join(', ')||'—'}</p><p><b>Yaklaşım:</b> ${p.pace||'—'}</p><p><b>En sık engel:</b> ${p.blocker||'—'}</p><div class="toggleLine"><div><b>Namaz Merkezi</b><small>Vakitleri Bugün ekranına bağlar.</small></div><button class="switch ${p.prayerTracking?'on':''}" id="profilePrayer"><i></i></button></div>${overrides.length?`<div class="divider"></div><h3>Öğrenilmiş zaman tercihleri</h3><div class="preferenceList">${overrides.map(([id,slot])=>`<div><span>${TASK_CATALOG[id]?.icon} ${TASK_CATALOG[id]?.title}</span><b>${slotLabel(slot)}</b></div>`).join('')}</div>`:''}<div class="explain">Profil kalıcıdır; günlük rota ayrıca bugünkü durum, geçmiş kullanım ve zamanlama sinyallerini kullanır. Zaman değişiklikleri yalnızca sen kabul edersen kalıcı olur.</div><div class="actions"><button class="btn ghost" id="resetTiming">Zaman tercihlerini sıfırla</button><button class="btn ghost" id="resetToday">Bugünü sıfırla</button><button class="btn warn" id="resetAll">Her şeyi sıfırla</button></div></section>
 <section class="card pilotCard">
   <div class="pilotHead"><div><div class="eyebrow">PİLOT v1</div><h2>Motoru gerçek kullanımla kalibre et</h2></div><button class="switch ${pilot.enabled?'on':''}" id="pilotToggle" aria-label="Pilot veri paylaşımı"><i></i></button></div>
   <p class="lead">İsteğe bağlıdır. Yalnız planın sürdürülebilirliğini ölçen teknik sinyaller paylaşılır.</p>
   <div class="pilotPrivacyGrid">
     <div><span>✓</span><p><b>Paylaşılabilir</b><small>Rota modu, süre, görev sayısı/tamamlama oranı, enerji-yük, geri bildirim ve motor güveni.</small></p></div>
     <div><span>×</span><p><b>Gönderilmez</b><small>Notların, okuduğun metin/âyet/hadis, namaz-kaza ayrıntıları, şehir/konum veya kişisel yazıların.</small></p></div>
   </div>
   <div class="pilotStatusRow"><div><small>DURUM</small><b>${pilotStatus}</b></div><div><small>CİHAZDA BEKLEYEN</small><b>${pilot.queue.length} olay</b></div></div>
   ${pilot.lastError?`<div class="pilotError">${esc(pilot.lastError)}</div>`:''}
   <div class="actions"><button class="btn ghost" id="pilotExport" ${pilot.queue.length?'':'disabled'}>Pilot verisini indir</button><button class="btn ghost" id="pilotFlush" ${pilot.enabled&&pilot.queue.length?'':'disabled'}>Şimdi gönder</button><button class="btn ghost" id="pilotClear" ${pilot.queue.length?'':'disabled'}>Kuyruğu sil</button></div>
   <p class="small">Pilot kapalıyken yeni olay oluşturulmaz. Kapatırsan gönderilmemiş cihaz kuyruğu da silinir.</p>
 </section>`;
 document.querySelector('#profilePrayer').onclick=()=>{p.prayerTracking=!p.prayerTracking;const d=ensure();d.route=null;save();renderProfile()};
 document.querySelector('#resetTiming').onclick=()=>{S.profile.slotOverrides={};S.profile.slotSuggestionSnooze={};const d=ensure();d.route=null;save();renderProfile()};
 document.querySelector('#resetToday').onclick=()=>{delete S.daily[today()];S.view='checkin';save();render()};
 document.querySelector('#resetAll').onclick=()=>{if(confirm('Profil ve tüm yerel veriler silinsin mi?')){localStorage.removeItem(KEY);location.reload()}};
 document.querySelector('#pilotToggle').onclick=()=>{
   if(!S.pilot.enabled){
     const ok=confirm('Pilot v1’e katılmak ister misin? Yalnız rota süresi, tamamlanma oranı, enerji/yük, geri bildirim ve motor karar sinyalleri paylaşılır. Notların, okuma içeriklerin, namaz/kaza ayrıntıların ve konumun gönderilmez.');
     if(!ok)return;
     S.pilot.enabled=true;ensurePilotId();S.pilot.lastError=null;save();
     const d=ensure();if(d.route)pilotRecordRoute(d.route,d.checkin,d.lightDay);
     flushPilotQueue();renderProfile();
   }else{
     S.pilot={...S.pilot,enabled:false,queue:[],lastError:null,transport:'local'};save();renderProfile();
   }
 };
 document.querySelector('#pilotExport').onclick=()=>exportPilotQueue();
 document.querySelector('#pilotFlush').onclick=async()=>{await flushPilotQueue();renderProfile()};
 document.querySelector('#pilotClear').onclick=()=>{if(confirm('Gönderilmemiş pilot kuyruğu silinsin mi?')){S.pilot.queue=[];S.pilot.lastError=null;save();renderProfile()}};
}


function renderIlim(){
 const ui=S.ilim.ui||{};
 const fullReader=['reader','quran','islam','book'].includes(ui.screen);
 nav.classList.toggle('hidden',fullReader);
 if(ui.screen==='reader')return renderIlimReader(ui.selectedId||S.ilim.currentId);
 if(ui.screen==='notebook')return renderIlimNotebook();
 if(ui.screen==='reviews')return renderIlimReviews();
 if(ui.screen==='quran')return renderQuranReader();
 if(ui.screen==='islam')return renderIslamDiniReader();
 if(ui.screen==='book')return renderGenericBookReader();
 return renderIlimHome();
}
function ilimGo(screen,selectedId=null){S.ilim.ui={...(S.ilim.ui||{}),screen,...(selectedId?{selectedId:Number(selectedId)}:{})};save();renderIlim()}
function sentenceSplit(text){return String(text||'').match(/[^.!?]+[.!?]?/g)?.map(x=>x.trim()).filter(Boolean)||[String(text||'')]}
function sectionHighlight(hadisId,sectionIndex,text){return S.ilim.highlights.find(x=>x.hadisId===Number(hadisId)&&x.sectionIndex===Number(sectionIndex)&&x.text===text)||null}
function hexToRgba(hex,alpha=.45){let h=String(hex||'#e6c46f').replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');const n=parseInt(h,16);if(!Number.isFinite(n))return `rgba(230,196,111,${alpha})`;return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`}
function highlightVars(h){const color=h?.color||'#e6c46f';return `style="--hl:${hexToRgba(color,.46)};--hl-line:${hexToRgba(color,.95)}"`}

function renderStarterBookCard(book,completedCount,completedBookIds=[]){
 const ready=book.availability==='ready';
 const completed=book.readerType==='generic'?completedBookIds.includes(book.id):isPathBookCompleted({book,pathState:S.library.path,hadithCompletedCount:completedCount});
 const saved=book.readerType==='generic'?normalizeBookReaderState(S.library.books?.[book.id]||{}):null;
 const annotations=saved?genericBookAnnotationSummary(saved):{notes:0,highlights:0,bookmarks:0};
 const annotationText=[annotations.notes?annotations.notes+' not':'',annotations.highlights?annotations.highlights+' vurgu':'',annotations.bookmarks?annotations.bookmarks+' yer imi':''].filter(Boolean).join(' · ');
 const progress=completed
   ?'Tamamlandı'
   :book.id==='kirk-hadis'
   ?`${completedCount}/42 okundu`
   :book.id==='quran'
     ?`${esc(quranMeta(S.library.quran.surah).turkish)} · ${S.library.quran.ayah}. âyet`
     :ready&&book.readerType==='generic'
       ?`Okuma ${saved?.page||1} · kaldığın yerden`
       :book.availability==='source-verified'?'Tam metin nüshası bekleniyor':'Kaynak doğrulanıyor';
 const byline=book.author==='—'?'Arapça metin':book.author;
 return `<button class="starterBookCard tone-${esc(book.tone||'forest')} ${ready?'ready':'pending'} ${completed?'completed':''}" data-starter-book="${esc(book.id)}" ${ready?'':'disabled'} aria-label="${esc(book.title)}">
   <div class="starterBookOrder">${completed?'✓':book.order}</div>
   <div class="starterBookCover"><span>${esc(book.coverGlyph||'ك')}</span><small>${esc(book.field)}</small></div>
   <div class="starterBookInfo">
     <div class="starterBookBadges"><span>${esc(book.level)}</span>${book.alwaysOn?'<span class="alwaysOn">Her seviyede</span>':''}<span class="${completed?'done':ready?'available':'checking'}">${completed?'Tamamlandı':ready?'Okunabilir':book.availability==='source-verified'?'Kaynak doğrulandı':'Kaynak doğrulanıyor'}</span></div>
     <b>${esc(book.title)}</b><small>${esc(byline)}</small><p>${esc(book.shortLabel)}</p><em>${progress}</em>${annotationText?`<span class="starterBookAnnotations">${esc(annotationText)}</span>`:''}
   </div>
   <i>${ready?'›':'·'}</i>
 </button>`;
}
function renderStarterPath(completedCount,pathSnapshot){
 return STARTER_LIBRARY_STAGES.map(stage=>{
   const books=starterBooksByStage(stage.id),ready=books.filter(book=>book.availability==='ready').length;
   const level=pathSnapshot.levels.find(x=>x.id===stage.id);
   const statusLabel=level?.status==='complete'?'Tamamlandı':level?.status==='current'?'Şu an':level?.status==='next'?'Sıradaki':'İleride';
   return `<section class="starterStage ${esc(level?.status||'later')}" data-starter-stage="${esc(stage.id)}">
     <div class="starterStageHead">
       <div class="starterStageNumber">${level?.status==='complete'?'✓':stage.order}</div>
       <div><small>SEVİYE ${stage.order}</small><b>${esc(stage.title)}</b><p>${esc(stage.subtitle)}</p></div>
       <span class="starterStageStatus ${esc(level?.status||'later')}">${statusLabel}</span>
     </div>
     <div class="starterStageMeta"><span>${level?.completedCount||0}/${level?.requiredCount||0} tamamlandı</span><span>${ready}/${books.length} metin hazır</span>${level?.sourcePending?'<span class="sourcePending">Tam metin hazırlanıyor</span>':''}</div>
     <details class="starterStageGoals" ${level?.status==='current'?'open':''}>
       <summary>Bu seviyenin şuur hedefleri</summary>
       <ol>${(stage.goals||[]).map(goal=>`<li>${esc(goal)}</li>`).join('')}</ol>
       <p>Bu maddeler sınav veya maneviyat puanı değildir; okurken neyi fark etmeye çalışacağını hatırlatır.</p>
     </details>
     <div class="starterLibraryGrid">${books.map(book=>renderStarterBookCard(book,completedCount,pathSnapshot.completedBooks)).join('')}</div>
   </section>`;
 }).join('');
}


function libraryResume(currentHadis,completedCount){
 const last=starterBook(S.library.lastBook)||starterBook('kirk-hadis');
 if(last?.availability==='ready'){
   if(last.readerType==='quran'){
     const meta=quranMeta(S.library.quran.surah);
     return {book:last,glyph:last.coverGlyph,label:'KUR’ÂN-I KERÎM',title:meta.turkish,description:`${meta.arabic} · ${S.library.quran.ayah}. âyet`,meta:`${meta.id}/114 sûre`,action:()=>openStarterBook('quran')};
   }
   if(last.readerType==='generic'){
     const state=normalizeBookReaderState(S.library.books?.[last.id]||{});
     return {book:last,glyph:last.coverGlyph,label:'KALDIĞIN KİTAP',title:last.title,description:last.shortLabel,meta:`Okuma ${state.page||1}`,action:()=>openStarterBook(last.id)};
   }
 }
 const hadis=currentHadis;
 return {book:starterBook('kirk-hadis'),glyph:'ح',label:'KALDIĞIN YER',title:hadis.title,description:hadis.meaning,meta:`Hadis ${hadis.id}/${KIRK_HADIS_META.totalUnits} · ${completedCount} tamamlandı`,action:()=>ilimGo('reader',S.ilim.currentId)};
}

function renderIlimHome(){
 loadNawawiArabic().catch(()=>{});
 const plan=todayHadisPlan(S.ilim,today()),h=plan.hadis,p=hadisProgressPct(S.ilim),due=dueHadisReviews(S.ilim,today(),9),entries=notebookEntries(S.ilim),overview=knowledgeOverview(S.ilim,today());
 const counts=overview.reduce((a,x)=>(a[x.key]=(a[x.key]||0)+1,a),{});
 const completedCount=S.ilim.completed.filter(x=>x<=KIRK_HADIS_META.totalUnits).length;
 const pathSnapshot=libraryPathSnapshot({pathState:S.library.path,hadithCompletedCount:completedCount});
 const activeLevel=pathSnapshot.levels.find(level=>level.order===pathSnapshot.currentLevel)||pathSnapshot.levels[0];
 const activeLevelNotice=activeLevel.sourcePending?`Bu seviyede ${activeLevel.unavailableCount} tam metin hazırlanıyor.`:'Seviye geçişi okuma/tamamlama verisine dayanır.';
 const previousLevel=pathSnapshot.levels.find(level=>level.order===pathSnapshot.currentLevel-1)||null;
 const transitionCard=pathSnapshot.transitionReady&&previousLevel?`<section class="card levelTransitionCard"><div class="levelTransitionMark">✓</div><div><div class="eyebrow">SEVİYE ${previousLevel.order} TAMAMLANDI</div><h2>${esc(previousLevel.title)}</h2><p>Okuma yolunda yeni bir bölüme geçtin. Bu bir maneviyat puanı değil; tamamladığın eserlerin ardından sıradaki öğrenme odağını açar.</p><div class="levelTransitionNext"><small>SIRADAKİ ODAK</small><b>Seviye ${activeLevel.order} · ${esc(activeLevel.title)}</b><span>${esc(activeLevel.subtitle)}</span><ul>${(activeLevel.goals||[]).slice(0,2).map(goal=>`<li>${esc(goal)}</li>`).join('')}</ul></div><button class="btn primary" id="ackLibraryLevel">Seviye ${activeLevel.order} yoluna geç →</button></div></section>`:'';
 const current=getHadis(S.ilim.currentId)||h;
 const resume=libraryResume(current,completedCount);
 const nextDue=due[0];
 const readyBookCount=STARTER_LIBRARY.filter(x=>x.availability==='ready').length;
 const starterShelf=renderStarterPath(completedCount,pathSnapshot);
 const genericStates=Object.values(S.library.books||{}).map(normalizeBookReaderState);
 const libraryNotes=genericStates.reduce((n,x)=>n+Object.keys(x.notes||{}).length,0);
 const libraryHighlights=genericStates.reduce((n,x)=>n+Object.keys(x.highlights||{}).length,0);
 const levelRail=pathSnapshot.levels.map(level=>`<button class="libraryRailStep ${esc(level.status)}" data-level-rail="${level.order}"><span>${level.status==='complete'?'✓':level.order}</span><div><small>SEVİYE ${level.order}</small><b>${esc(level.title)}</b></div></button>`).join('');
 app.innerHTML=`
 <section class="card libraryHero">
   <div class="libraryHeroTop">
     <div>
       <div class="eyebrow">İLİM KÜTÜPHANESİ</div>
       <h1>Bugün ne okuyacağını düşünme.</h1>
       <p class="lead">Kaldığın yer, bekleyen tekrar ve notların tek ekranda. Motor yalnızca öğrenme yükünü düzenler.</p>
     </div>
     <div class="ilimProgressRing" style="--p:${p}"><b>${p}%</b><span>Kırk Hadis</span></div>
   </div>
 </section>

 <section class="libraryV2Rail" aria-label="Okuma yolu seviyeleri">
   <div class="libraryRailHeader"><div><small>5 AŞAMALI YOL</small><b>Temelden şuura ilerleyen okuma rotası</b></div><div class="libraryRailStats"><span><b>${readyBookCount}/10</b> okunabilir</span><span><b>${libraryNotes}</b> not</span><span><b>${libraryHighlights}</b> vurgu</span></div></div>
   <div class="libraryRailTrack">${levelRail}</div>
 </section>

 <section class="card libraryLevelCard">
   <div class="libraryLevelTop">
     <div><div class="eyebrow">OKUMA YOLUN</div><h2>Seviye ${pathSnapshot.currentLevel} · ${esc(activeLevel.title)}</h2><p>${esc(activeLevel.subtitle)}</p></div>
     <div class="libraryLevelBadge"><b>${pathSnapshot.completedLevels}/${pathSnapshot.totalLevels}</b><span>seviye tamamlandı</span></div>
   </div>
   <div class="libraryLevelProgress"><i style="width:${Math.round((pathSnapshot.completedLevels/pathSnapshot.totalLevels)*100)}%"></i></div>
   <div class="libraryLevelMeta"><span>${activeLevel.completedCount}/${activeLevel.requiredCount} eser tamamlandı</span><span>${esc(activeLevelNotice)}</span></div>
   <div class="libraryAwarenessGoals"><small>BU SEVİYEDE ODAKLAN</small><ol>${(activeLevel.goals||[]).map(goal=>`<li>${esc(goal)}</li>`).join('')}</ol></div>
   <p class="small">Bu hedefler ve seviye bir maneviyat veya iman puanı değildir; yalnızca 10 kitaplık okuma yolunda neyi anlamaya çalışacağını gösterir. Sonraki seviyelerdeki hazır eserleri de istediğin zaman açabilirsin.</p>
   <button class="btn ghost" id="jumpCurrentLevel">Aktif seviyeye git ↓</button>
 </section>

 ${transitionCard}

 <section class="continueReadingCard">
   <div class="continueCover"><span>${esc(resume.glyph||'ك')}</span><small>DEVAM ET</small></div>
   <div class="continueBody">
     <div class="eyebrow">${esc(resume.label)}</div>
     <h2>${esc(resume.title)}</h2>
     <p>${esc(resume.description)}</p>
     <div class="continueMeta"><span>${esc(resume.meta)}</span><span>${esc(resume.book?.field||'İlim')}</span></div>
     <button class="btn primary wide" id="continueLibrary">Okumaya devam →</button>
   </div>
 </section>

 <section class="libraryTodayGrid">
   <article class="libraryMiniCard todayFocus">
     <div><span class="libraryIcon">✦</span><div><small>BUGÜNÜN OKUMASI</small><b>${esc(h.title)}</b><p>${plan.reviewFirst?'Önce kısa tekrar, sonra yeni okuma.':`${plan.minutes} dakikalık hafif okuma.`}</p></div></div>
     <button id="openTodayHadis">Aç →</button>
   </article>
   <article class="libraryMiniCard">
     <div><span class="libraryIcon">↻</span><div><small>TEKRARLAR</small><b>${due.length?due.length+' tekrar hazır':'Bugün temiz'}</b><p>${nextDue?esc(recallPromptFor(nextDue.hadisId)):'Bekleyen geri çağırma yok.'}</p></div></div>
     <button id="ilimReviews">${due.length?'Başla →':'Görüntüle'}</button>
   </article>
   <article class="libraryMiniCard">
     <div><span class="libraryIcon">✎</span><div><small>İLİM DEFTERİ</small><b>${S.ilim.notes.length} not · ${S.ilim.highlights.length} vurgu</b><p>Çizdiklerin, notların ve kaydettiklerin.</p></div></div>
     <button id="ilimNotebook">Aç →</button>
   </article>
 </section>

 <section class="card libraryShelf premiumStarterShelf">
   <div class="sectionHead starterShelfHead">
     <div><div class="eyebrow">BAŞLANGIÇ KÜTÜPHANESİ</div><h2>10 kitaplık gelişim yolu</h2><p>Seviye 1’den 5’e; temel bilgi, Kur’ân ve ibadet, sünnet, siyer, ahlâk ve tefekkür. Hazır olmayan tam metin okunabilir gösterilmez.</p></div>
     <span class="sourcePill">${readyBookCount} okunabilir · ${STARTER_LIBRARY.length-readyBookCount} tam metin bekliyor</span>
   </div>
   <div class="starterPath">${starterShelf}</div>
 </section>

 <section class="card memorySummary compactMemory">
   <div class="sectionHead"><div><div class="eyebrow">İLİM HAFIZASI</div><h2>Okudukların ne durumda?</h2></div><span class="sourcePill">${counts.stable||0} oturuyor</span></div>
   <div class="memoryGrid"><div><b>${counts.new||0}</b><span>Yeni</span></div><div><b>${counts.building||0}</b><span>Pekişiyor</span></div><div><b>${counts.recall||0}</b><span>Geri çağır</span></div><div><b>${counts.repair||0}</b><span>Yeniden bak</span></div><div><b>${counts.stable||0}</b><span>Oturuyor</span></div></div>
 </section>

 <section class="card sourceCard"><details><summary>Metin ve kaynak politikası</summary><p>${esc(KIRK_HADIS_META.rightsNote)}</p><p>${esc(KIRK_HADIS_META.editorialNote)}</p></details></section>`;
 const open=()=>ilimGo('reader',S.ilim.currentId);
 document.querySelector('#continueLibrary').onclick=resume.action;
 const ackLevel=document.querySelector('#ackLibraryLevel');if(ackLevel)ackLevel.onclick=()=>{S.library.path=acknowledgeLibraryLevel(S.library.path,pathSnapshot.currentLevel);save();renderIlimHome();setTimeout(()=>document.querySelector(`[data-starter-stage="level-${pathSnapshot.currentLevel}"]`)?.scrollIntoView({behavior:'smooth',block:'start'}),60)};
 document.querySelector('#jumpCurrentLevel').onclick=()=>document.querySelector(`[data-starter-stage="level-${pathSnapshot.currentLevel}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});
 document.querySelectorAll('[data-level-rail]').forEach(btn=>btn.onclick=()=>document.querySelector(`[data-starter-stage="level-${btn.dataset.levelRail}"]`)?.scrollIntoView({behavior:'smooth',block:'start'}));
 document.querySelector('#openTodayHadis').onclick=()=>ilimGo('reader',h.id);
 document.querySelectorAll('[data-starter-book]').forEach(btn=>btn.onclick=()=>openStarterBook(btn.dataset.starterBook));
 document.querySelector('#ilimReviews').onclick=()=>ilimGo('reviews');
 document.querySelector('#ilimNotebook').onclick=()=>ilimGo('notebook');
}

async function renderGenericBookReader(){
 const bookId=S.ilim.ui?.bookId,book=starterBook(bookId),screen=S.ilim.ui?.screen;
 if(!book||book.readerType!=='generic'||book.availability!=='ready'){
   S.ilim.ui={...(S.ilim.ui||{}),screen:'home',bookId:null};save();return renderIlimHome();
 }
 if(!genericBookCache.has(bookId)){
   renderLibraryLoading(book.title,'Kitap uygulama içinde hazırlanıyor…');
   try{await loadGenericBook(bookId)}catch(err){if(S.ilim.ui?.screen==='book')renderLibraryError(book.title,err.message||String(err),renderGenericBookReader);return}
   if(S.ilim.ui?.screen==='book'&&screen==='book')return renderGenericBookReader();return;
 }
 const data=genericBookCache.get(bookId),total=data.pages.length;
 let state=genericBookState(bookId);
 if(!state.activeSession){state=beginBookReadingSession(state,{page:state.page,at:new Date().toISOString()});S.library.books[bookId]=state;save();}
 const pageNo=Math.max(1,Math.min(total,Number(state.page)||1)),page=data.pages[pageNo-1],scale=Number(state.fontScale||1);
 const completed=isPathBookCompleted({book,pathState:S.library.path,hadithCompletedCount:S.ilim.completed.filter(x=>x<=KIRK_HADIS_META.totalUnits).length});
 const completionEligible=completed||pageNo>=Math.ceil(total*.85);
 const selectedColor=state.highlightColor||'#e6c46f',blocks=genericBookBlocks(page?.text||''),bookmarked=state.bookmarks.includes(pageNo);
 const progressPct=Math.max(1,Math.round(pageNo/Math.max(1,total)*100));
 const annotations=genericBookAnnotationSummary(state),readingSummary=bookReadingSummary(state,{limit:12});
 const searchResults=searchBookPages(data.pages,state.searchQuery,{limit:18});
 const activeStarted=state.activeSession?.startedAt?new Date(state.activeSession.startedAt):null;
 const activeMinutes=activeStarted?Math.max(1,Math.round((Date.now()-activeStarted.getTime())/60000)):0;
 const palette=['#e6c46f','#8fc7a2','#d998a2'].map(color=>`<button class="bookColorSwatch ${selectedColor===color?'sel':''}" data-book-color="${color}" style="--sw:${color}" aria-label="Vurgu rengi"></button>`).join('');
 const sectionOptions=(data.sections||[]).map(section=>{
   const target=data.pages.findIndex(x=>Number(x.page)===Number(section.page));
   return target>=0?`<option value="${target+1}">${esc(section.title)}</option>`:'';
 }).join('');
 const content=blocks.map((text,index)=>{
   const highlight=bookHighlight(state,pageNo,index),note=bookNote(state,pageNo,index),key=`${pageNo}:${index}`,editing=state.noteFor===key,heading=genericBookHeading(text);
   const style=highlight?` style="--book-hl:${hexToRgba(highlight,.29)};--book-hl-line:${hexToRgba(highlight,.92)}"`:'';
   return `<article class="genericBookBlock ${heading?'sourceHeading':''} ${highlight?'highlighted':''}" data-book-block="${index}"${style}>
     ${heading?`<h2 dir="auto">${esc(text)}</h2>`:`<p dir="auto" style="font-size:${(1.04*scale).toFixed(2)}rem">${esc(text)}</p>`}
     <div class="genericBookBlockTools"><button data-book-highlight="${index}" class="${highlight?'active':''}">✦ Vurgu</button><button data-book-note="${index}" class="${note?'active':''}">✎ Not</button></div>
     ${note?`<aside class="genericBookUserNote"><small>KİŞİSEL NOT</small><p>${esc(note)}</p></aside>`:''}
     ${editing?`<div class="genericBookNoteEditor"><label for="genericBookNoteInput">Kişisel notun</label><textarea id="genericBookNoteInput" rows="4" maxlength="2400" placeholder="Bu alan eser metninden ayrıdır.">${esc(note)}</textarea><div><button class="btn ghost" id="genericBookNoteCancel">Vazgeç</button><button class="btn primary" id="genericBookNoteSave">Kaydet</button></div></div>`:''}
   </article>`;
 }).join('');
 app.innerHTML=`<section class="readerTop genericBookTop"><button class="readerBack" id="genericBookBack">←</button><div><small>BAŞLANGIÇ KÜTÜPHANESİ · ${book.order}/10</small><b>${esc(book.title)}</b></div><div class="readerTools"><button id="genericBookBookmark" class="${bookmarked?'active':''}" aria-label="Sayfa yer imi">${bookmarked?'★':'☆'}</button><button id="genericBookFocus" class="${state.focusMode?'active':''}">${state.focusMode?'Çık':'Odak'}</button><button id="genericBookFontDown">A−</button><button id="genericBookFontUp">A+</button></div></section>
 <section class="genericBookReaderShell ${state.focusMode?'genericBookFocusMode':''}">
   <div class="genericBookNav">
     <button id="genericPrevPage" ${pageNo<=1?'disabled':''}>←</button>
     <label>Okuma <input id="genericBookPageInput" type="number" inputmode="numeric" min="1" max="${total}" value="${pageNo}"> / ${total}</label>
     <button id="genericNextPage" ${pageNo>=total?'disabled':''}>→</button>
   </div>
   ${sectionOptions?`<div class="genericBookSectionJump"><select id="genericBookSectionSelect"><option value="">Bölüme git…</option>${sectionOptions}</select></div>`:''}
   <header class="genericBookTitleCard">
     <div class="genericBookMonogram tone-${esc(book.tone||'forest')}">${esc(book.coverGlyph||'ك')}</div>
     <div><div class="eyebrow">${esc(book.field)} · ${esc(book.level)}</div><h1>${esc(book.title)}</h1><p>${esc(book.author)} · Okuma ${pageNo}/${total}</p><small class="genericBookEdition">${esc(data.source?.sourceLabel||book.sourceLabel||'Kaynak nüsha')}</small></div>
   </header>
   <div class="genericBookMarkupBar"><div><span>Vurgu rengi</span><div class="bookColorPalette">${palette}<input id="genericBookCustomColor" type="color" value="${esc(selectedColor)}" aria-label="Özel vurgu rengi"></div></div><small>Vurgular ve notlar kaynak metne karıştırılmaz.</small></div>
   <article class="genericBookPaper"><div class="genericBookPageMarker">OKUMA ${pageNo} · KAYNAK SAYFA ${page?.page||pageNo}</div>${content||'<div class="emptyState">Bu sayfada aktarılabilir metin bulunamadı.</div>'}</article>
   <section class="genericBookCompletion ${completed?'done':''}">
     <div><small>OKUMA DURUMU</small><b>${completed?'Bu kitabı tamamladın':completionEligible?'Kitabın son bölümündesin':'Okumaya devam et'}</b><p>${completed?'Bu işaret yalnız okuma yolundaki ilerlemeni gösterir; manevî değer veya başarı puanı değildir.':completionEligible?'Gerçekten bitirdiysen tamamlandı olarak işaretleyebilirsin.':'Tamamlama düğmesi kitabın son %15’lik bölümüne geldiğinde açılır.'}</p></div>
     <button class="btn ${completed?'ghost':'primary'}" id="genericBookComplete" ${completionEligible?'':'disabled'}>${completed?'Tamamlandı işaretini kaldır':'Kitabı tamamladım'}</button>
   </section>
   <details class="readerSourceNote genericBookSource"><summary>Kaynak ve metin politikası</summary><p><b>${esc(data.source?.sourceLabel||book.sourceLabel||'Kaynak nüsha')}</b></p><p>${esc(data.source?.textPolicy||book.rightsNote||'Eser metni değiştirilmeden gösterilir.')}</p>${data.source?.reviewNote?`<p>${esc(data.source.reviewNote)}</p>`:''}</details>
 </section>`;
 const persist=()=>{S.library.books[bookId]=normalizeBookReaderState(S.library.books[bookId]);S.library.lastBook=bookId;save()};
 const goPage=value=>{S.library.books[bookId]=normalizeBookReaderState({...S.library.books[bookId],page:Math.max(1,Math.min(total,Number(value)||pageNo)),noteFor:null});persist();renderGenericBookReader()};
 document.querySelector('#genericBookBack').onclick=()=>ilimGo('home');
 document.querySelector('#genericBookComplete').onclick=()=>{if(!completionEligible)return;S.library.path=setGenericBookCompleted(S.library.path,bookId,!completed);save();renderGenericBookReader()};
 document.querySelector('#genericPrevPage').onclick=()=>goPage(pageNo-1);document.querySelector('#genericNextPage').onclick=()=>goPage(pageNo+1);
 document.querySelector('#genericBookPageInput').onchange=e=>goPage(e.target.value);
 const jump=document.querySelector('#genericBookSectionSelect');if(jump)jump.onchange=e=>{if(e.target.value)goPage(e.target.value)};
 document.querySelector('#genericBookFontDown').onclick=()=>{S.library.books[bookId]=normalizeBookReaderState({...state,fontScale:Math.max(.82,scale-.08)});persist();renderGenericBookReader()};
 document.querySelector('#genericBookFontUp').onclick=()=>{S.library.books[bookId]=normalizeBookReaderState({...state,fontScale:Math.min(1.5,scale+.08)});persist();renderGenericBookReader()};
 document.querySelector('#genericBookFocus').onclick=()=>{S.library.books[bookId]=normalizeBookReaderState({...state,focusMode:!state.focusMode,noteFor:null});persist();renderGenericBookReader()};
 document.querySelector('#genericBookBookmark').onclick=()=>{S.library.books[bookId]=toggleBookPageBookmark(state,pageNo);persist();renderGenericBookReader()};
 document.querySelectorAll('[data-book-color]').forEach(btn=>btn.onclick=()=>{S.library.books[bookId]=normalizeBookReaderState({...state,highlightColor:btn.dataset.bookColor});persist();renderGenericBookReader()});
 document.querySelector('#genericBookCustomColor').onchange=e=>{S.library.books[bookId]=normalizeBookReaderState({...state,highlightColor:e.target.value});persist();renderGenericBookReader()};
 document.querySelectorAll('[data-book-highlight]').forEach(btn=>btn.onclick=()=>{S.library.books[bookId]=toggleBookHighlight(S.library.books[bookId],pageNo,Number(btn.dataset.bookHighlight),S.library.books[bookId].highlightColor);persist();renderGenericBookReader()});
 document.querySelectorAll('[data-book-note]').forEach(btn=>btn.onclick=()=>{const index=Number(btn.dataset.bookNote);S.library.books[bookId]=normalizeBookReaderState({...S.library.books[bookId],noteFor:`${pageNo}:${index}`});persist();renderGenericBookReader();setTimeout(()=>document.querySelector('#genericBookNoteInput')?.focus(),30)});
 const noteSave=document.querySelector('#genericBookNoteSave'),noteCancel=document.querySelector('#genericBookNoteCancel');
 if(noteSave)noteSave.onclick=()=>{const [p,i]=String(S.library.books[bookId].noteFor||'').split(':').map(Number);S.library.books[bookId]=setBookNote(S.library.books[bookId],p,i,document.querySelector('#genericBookNoteInput')?.value||'');S.library.books[bookId]=normalizeBookReaderState({...S.library.books[bookId],noteFor:null});persist();renderGenericBookReader()};
 if(noteCancel)noteCancel.onclick=()=>{S.library.books[bookId]=normalizeBookReaderState({...S.library.books[bookId],noteFor:null});persist();renderGenericBookReader()};
}
async function renderQuranReader(){
 S.library.quran=normalizeQuranReaderState(S.library.quran);
 const state=S.library.quran,meta=quranMeta(state.surah),screen=S.ilim.ui?.screen;
 if(!quranChapterCache.has(meta.id)){
   renderLibraryLoading('Kur’ân-ı Kerîm',`${meta.turkish} sûresi hazırlanıyor…`);
   try{await loadQuranChapter(meta.id)}catch(err){if(S.ilim.ui?.screen==='quran')renderLibraryError('Kur’ân-ı Kerîm',err.message||String(err),renderQuranReader);return}
   if(S.ilim.ui?.screen==='quran'&&screen==='quran')return renderQuranReader();return;
 }
 const data=quranChapterCache.get(meta.id),scale=Number(state.fontScale||1),selectedColor=state.highlightColor||'#e6c46f';
 if(quranProgressObserver){quranProgressObserver.disconnect();quranProgressObserver=null}
 const palette=['#e6c46f','#8fc7a2','#d998a2'].map(color=>`<button class="quranColorSwatch ${selectedColor===color?'sel':''}" data-quran-color="${color}" style="--sw:${color}" aria-label="Vurgu rengi ${color}"></button>`).join('');
 const verses=data.verses.map(v=>{
   const highlight=quranVerseHighlight(state,meta.id,v.verse),note=quranVerseNote(state,meta.id,v.verse),editing=Number(state.noteFor)===Number(v.verse);
   const highlightStyle=highlight?` style="--quran-hl:${hexToRgba(highlight,.30)};--quran-hl-line:${hexToRgba(highlight,.92)}"`:'';
   return `<article class="quranAyah ${Number(state.ayah)===Number(v.verse)?'savedAyah':''} ${highlight?'highlightedAyah':''}" data-quran-ayah="${v.verse}"${highlightStyle}>
     <span class="quranAyahNo">${v.verse}</span>
     <p dir="rtl" lang="ar" style="font-size:${(1.72*scale).toFixed(2)}rem">${esc(v.text)}</p>
     <div class="quranAyahMeta"><small>Kaldığın yer · ${meta.id}:${v.verse}</small><div class="quranAyahTools"><button data-quran-highlight="${v.verse}" class="${highlight?'active':''}" title="Âyeti vurgula">✦ Vurgu</button><button data-quran-note="${v.verse}" class="${note?'active':''}" title="Kişisel not">✎ Not</button></div></div>
     ${note?`<aside class="quranUserNote"><small>KİŞİSEL NOT</small><p>${esc(note)}</p></aside>`:''}
     ${editing?`<div class="quranNoteEditor"><label for="quranNoteInput">Kişisel notun</label><textarea id="quranNoteInput" rows="3" maxlength="1200" placeholder="Bu not yalnızca sana aittir.">${esc(note)}</textarea><div><button class="btn ghost" id="quranNoteCancel">Vazgeç</button><button class="btn primary" id="quranNoteSave">Kaydet</button></div></div>`:''}
   </article>`;
 }).join('');
 app.innerHTML=`<section class="readerTop quranReaderTop"><button class="readerBack" id="quranBack">←</button><div><small>KUR’ÂN-I KERÎM · ${meta.id}/114</small><b>${esc(meta.turkish)} · ${esc(meta.arabic)}</b></div><div class="readerTools"><button id="quranFocus" class="${state.focusMode?'active':''}" aria-pressed="${state.focusMode?'true':'false'}">${state.focusMode?'Çık':'Odak'}</button><button id="quranFontDown">A−</button><button id="quranFontUp">A+</button></div></section>
 <section class="quranReaderShell ${state.focusMode?'quranFocusMode':''}">
   <div class="quranNavBar"><button id="prevSurah" ${meta.id<=1?'disabled':''}>←</button><select id="surahSelect" aria-label="Sûre seç">${QURAN_META.map(x=>`<option value="${x[0]}" ${x[0]===meta.id?'selected':''}>${x[0]}. ${esc(x[1])}</option>`).join('')}</select><button id="nextSurah" ${meta.id>=114?'disabled':''}>→</button></div>
   <header class="quranSurahHead"><div class="eyebrow">SÛRE ${meta.id}</div><h1>${esc(meta.arabic)}</h1><p>${esc(meta.turkish)} · ${meta.verseCount} âyet</p></header>
   <div class="quranMarkupBar"><div><span>Vurgu rengi</span><div class="quranColorPalette">${palette}<input id="quranCustomColor" type="color" value="${esc(selectedColor)}" aria-label="Özel vurgu rengi"></div></div><small>Vurgu ve kişisel notlar eser metninden ayrı tutulur.</small></div>
   <div class="quranVerseList">${verses}</div>
   <details class="readerSourceNote quranSourceDetails"><summary>Metin kaynağı</summary><p>Yerel edisyon: <b>ara-quranuthmanihaf</b> — Quran Uthmani Hafs. Kaynak metadata Quran Complex’i işaret eder; uygulama kopyayı <b>fawazahmed0/quran-api</b> üzerinden paketler. Meal, açıklama veya Manevî Rota/AI yorumu bu okuyucuda gösterilmez.</p></details>
 </section>`;
 const goSurah=n=>{S.library.quran=normalizeQuranReaderState({...S.library.quran,surah:Math.max(1,Math.min(114,Number(n)||1)),ayah:1,noteFor:null});S.library.lastBook='quran';save();renderQuranReader()};
 document.querySelector('#quranBack').onclick=()=>ilimGo('home');
 document.querySelector('#surahSelect').onchange=e=>goSurah(e.target.value);
 document.querySelector('#prevSurah').onclick=()=>goSurah(meta.id-1);document.querySelector('#nextSurah').onclick=()=>goSurah(meta.id+1);
 document.querySelector('#quranFontDown').onclick=()=>{S.library.quran=normalizeQuranReaderState({...S.library.quran,fontScale:Math.max(.82,scale-.08)});save();renderQuranReader()};
 document.querySelector('#quranFontUp').onclick=()=>{S.library.quran=normalizeQuranReaderState({...S.library.quran,fontScale:Math.min(1.5,scale+.08)});save();renderQuranReader()};
 document.querySelector('#quranFocus').onclick=()=>{S.library.quran=normalizeQuranReaderState({...S.library.quran,focusMode:!state.focusMode,noteFor:null});save();renderQuranReader()};
 document.querySelectorAll('[data-quran-color]').forEach(el=>el.onclick=e=>{e.stopPropagation();S.library.quran=normalizeQuranReaderState({...S.library.quran,highlightColor:el.dataset.quranColor});save();renderQuranReader()});
 document.querySelector('#quranCustomColor').onchange=e=>{S.library.quran=normalizeQuranReaderState({...S.library.quran,highlightColor:e.target.value});save();renderQuranReader()};
 document.querySelectorAll('[data-quran-highlight]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();S.library.quran=toggleQuranVerseHighlight(S.library.quran,meta.id,Number(btn.dataset.quranHighlight),S.library.quran.highlightColor);S.library.lastBook='quran';save();renderQuranReader()});
 document.querySelectorAll('[data-quran-note]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const n=Number(btn.dataset.quranNote);S.library.quran=normalizeQuranReaderState({...S.library.quran,ayah:n,noteFor:n});S.library.lastBook='quran';save();renderQuranReader();setTimeout(()=>document.querySelector('#quranNoteInput')?.focus(),40)});
 const noteSave=document.querySelector('#quranNoteSave'),noteCancel=document.querySelector('#quranNoteCancel');
 if(noteSave)noteSave.onclick=e=>{e.stopPropagation();const n=Number(S.library.quran.noteFor);S.library.quran=setQuranVerseNote(S.library.quran,meta.id,n,document.querySelector('#quranNoteInput')?.value||'');S.library.quran=normalizeQuranReaderState({...S.library.quran,noteFor:null,ayah:n});save();renderQuranReader()};
 if(noteCancel)noteCancel.onclick=e=>{e.stopPropagation();S.library.quran=normalizeQuranReaderState({...S.library.quran,noteFor:null});save();renderQuranReader()};
 document.querySelectorAll('[data-quran-ayah]').forEach(el=>el.onclick=()=>{S.library.quran=normalizeQuranReaderState({...S.library.quran,ayah:Number(el.dataset.quranAyah)});S.library.lastBook='quran';save();document.querySelectorAll('.quranAyah').forEach(x=>x.classList.toggle('savedAyah',x===el))});
 const saved=document.querySelector(`[data-quran-ayah="${Math.max(1,Number(state.ayah)||1)}"]`);if(saved)setTimeout(()=>saved.scrollIntoView({block:'center'}),40);
 if('IntersectionObserver'in window){
   quranProgressObserver=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting&&e.intersectionRatio>=.62).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(!visible)return;const n=Number(visible.target.dataset.quranAyah);if(n&&n!==S.library.quran.ayah){S.library.quran=normalizeQuranReaderState({...S.library.quran,ayah:n});S.library.lastBook='quran';save()}},{threshold:[.62]});
   document.querySelectorAll('[data-quran-ayah]').forEach(el=>quranProgressObserver.observe(el));
 }
}
function cleanIslamOcrParagraph(text){
 return String(text||'')
   .replace(/¬\s*\n\s*/g,'')
   .replace(/([A-Za-zÇĞİÖŞÜçğıöşüÂÎâî])-\s*\n\s*([A-Za-zÇĞİÖŞÜçğıöşüÂÎâî])/g,'$1$2')
   .replace(/\s*\n\s*/g,' ')
   .replace(/[ \t]{2,}/g,' ')
   .trim();
}
async function renderIslamDiniReader(){
 const screen=S.ilim.ui?.screen;
 if(!islamDiniLibrary){
   renderLibraryLoading('İslâm Dini','Tam metin okuyucu hazırlanıyor…');
   try{await loadIslamDini()}catch(err){if(S.ilim.ui?.screen==='islam')renderLibraryError('İslâm Dini',err.message||String(err),renderIslamDiniReader);return}
   if(S.ilim.ui?.screen==='islam'&&screen==='islam')return renderIslamDiniReader();return;
 }
 const state=S.library.islam,total=islamDiniLibrary.pages.length,pageNo=Math.max(1,Math.min(total,Number(state.page)||5)),page=islamDiniLibrary.pages[pageNo-1],scale=Number(state.fontScale||1),sections=islamDiniLibrary.sections||[];
 const paragraphs=String(page?.text||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 app.innerHTML=`<section class="readerTop islamReaderTop"><button class="readerBack" id="islamBack">←</button><div><small>İSLÂM DİNİ · OKUMA ${pageNo}/${total}</small><b>Ahmed Hamdi Akseki</b></div><div class="readerTools"><button id="islamFontDown">A−</button><button id="islamFontUp">A+</button></div></section>
 <section class="islamReaderShell">
   <div class="islamReaderNav"><button id="prevIslamPage" ${pageNo<=1?'disabled':''}>← Önceki</button><label>Okuma <input id="islamPageInput" inputmode="numeric" type="number" min="1" max="${total}" value="${pageNo}"> / ${total}</label><button id="nextIslamPage" ${pageNo>=total?'disabled':''}>Sonraki →</button></div>
   <div class="islamChapterJump"><select id="islamChapterSelect" aria-label="Bölüme git"><option value="">Bölüme git…</option>${sections.map(x=>`<option value="${x.page}">${esc(x.title)}</option>`).join('')}</select></div>
   <article class="islamPagePaper"><div class="readerMarker">İSLÂM DİNİ · OKUMA SAYFASI ${pageNo}</div>${paragraphs.length?paragraphs.map((p,i)=>{const display=cleanIslamOcrParagraph(p),heading=display.length<120&&display===display.toLocaleUpperCase('tr-TR')&&/[A-ZÇĞİÖŞÜÎÂ]/.test(display);return heading?`<h2>${esc(display)}</h2>`:`<p style="font-size:${(1.02*scale).toFixed(2)}rem">${esc(display)}</p>`}).join(''):'<div class="emptyState">Bu tarama sayfasında metin bulunamadı.</div>'}</article>
   <div class="readerSourceNote">Kaynak metin eski baskının OCR aktarımıdır. Okuma sayfaları uygulama için bölünmüştür; Manevî Rota metne açıklama veya yorum eklemez. Tarama/dizgi hataları bulunabilir.</div>
 </section>`;
 const goPage=n=>{S.library.islam.page=Math.max(1,Math.min(total,Number(n)||pageNo));S.library.lastBook='islam';save();renderIslamDiniReader()};
 document.querySelector('#islamBack').onclick=()=>ilimGo('home');
 document.querySelector('#prevIslamPage').onclick=()=>goPage(pageNo-1);document.querySelector('#nextIslamPage').onclick=()=>goPage(pageNo+1);
 document.querySelector('#islamPageInput').onchange=e=>goPage(e.target.value);document.querySelector('#islamChapterSelect').onchange=e=>{if(e.target.value)goPage(e.target.value)};
 document.querySelector('#islamFontDown').onclick=()=>{S.library.islam.fontScale=Math.max(.82,scale-.08);save();renderIslamDiniReader()};
 document.querySelector('#islamFontUp').onclick=()=>{S.library.islam.fontScale=Math.min(1.5,scale+.08);save();renderIslamDiniReader()};
}

function renderIlimReader(id){
 const h=getHadis(id);if(!h){S.ilim.ui.screen='home';save();return renderIlimHome()}
 const plan=todayHadisPlan(S.ilim,today()),isCurrent=Number(id)===Number(S.ilim.currentId),done=S.ilim.completed.includes(h.id),bookmarked=S.ilim.bookmarks.includes(h.id),noteFor=S.ilim.ui?.noteFor;
 const scale=Number(S.ilim.settings.fontScale||1);
 const arabic=arabicHadith(h.id);
 const highlightColor=S.ilim.settings.highlightColor||'#e6c46f';
 const highlightPalette=`<div class="highlightPalette"><span>Vurgu rengi</span><div><button class="highlightSwatch ${highlightColor==='#e6c46f'?'sel':''}" data-highlight-color="#e6c46f" style="--sw:#e6c46f" aria-label="Altın"></button><button class="highlightSwatch ${highlightColor==='#8fc7a2'?'sel':''}" data-highlight-color="#8fc7a2" style="--sw:#8fc7a2" aria-label="Yeşil"></button><button class="highlightSwatch ${highlightColor==='#d998a2'?'sel':''}" data-highlight-color="#d998a2" style="--sw:#d998a2" aria-label="Pembe"></button><input id="customHighlightColor" class="customHighlightColor" type="color" value="${esc(highlightColor)}" aria-label="Özel vurgu rengi"/></div><small>Cümleye dokunduğunda bu renk uygulanır. Aynı renkte tekrar dokunursan vurgu kalkar.</small></div>`;
 const arabicBlock=arabic
   ? `<section class="hadithOriginal"><div class="hadithOriginalHead"><small>ORİJİNAL HADİS METNİ</small><span>Arapça · Hadis ${h.id}</span></div><p dir="rtl" lang="ar" style="font-size:${(1.42*scale).toFixed(2)}rem">${esc(arabic).replace(/\n/g,'<br>')}</p></section>`
   : `<section class="hadithOriginal loading"><div class="hadithOriginalHead"><small>ORİJİNAL HADİS METNİ</small><span>Arapça · Hadis ${h.id}</span></div><p>${esc(nawawiArabicError||'Metin kaynağı yükleniyor…')}</p>${nawawiArabicError?'<button class="textButton" id="retryArabic">Tekrar dene</button>':''}</section>`;
 const sections=h.sections.map((text,si)=>{const sentences=sentenceSplit(text);const noteCount=S.ilim.notes.filter(n=>n.hadisId===h.id&&n.sectionIndex===si).length;return `<article class="ilimParagraph" data-section="${si}"><p style="font-size:${(1.03*scale).toFixed(2)}rem">${sentences.map((st,idx)=>{const hl=sectionHighlight(h.id,si,st);return `<span class="ilimSentence ${hl?'underlined':''}" ${hl?highlightVars(hl):''} data-highlight="${h.id}:${si}:${idx}" title="Vurgula">${esc(st)} </span>`}).join('')}</p><div class="paraTools"><span>Bir cümleye dokun → seçtiğin renkle vurgula</span><button data-note-for="${h.id}:${si}">✎ Not ${noteCount?`(${noteCount})`:''}</button></div>${noteFor===`${h.id}:${si}`?`<div class="noteComposer"><textarea id="ilimNoteText" rows="3" placeholder="Kendi cümlenle not al…"></textarea><div class="noteTags">${[['not','Not'],['research','Araştır'],['practice','Uygula']].map(([k,l])=>`<button type="button" class="${(S.ilim.ui.noteTag||'not')===k?'sel':''}" data-note-tag="${k}">${l}</button>`).join('')}</div><div class="actions"><button class="btn ghost" id="cancelIlimNote">Vazgeç</button><button class="btn primary" id="saveIlimNote" data-hadis="${h.id}" data-section="${si}">Notu kaydet</button></div></div>`:''}</article>`}).join('');
 app.innerHTML=`<section class="readerTop ${S.ilim.settings.focus?'focusTop':''}"><button class="readerBack" id="ilimBack">←</button><div><small>${h.id}/${KIRK_HADIS_META.totalUnits} · ${esc(KIRK_HADIS_META.title)}</small><b>${esc(h.title)}</b></div><div class="readerTools"><button id="fontDown">A−</button><button id="fontUp">A+</button><button id="focusReader">${S.ilim.settings.focus?'Çık':'Odak'}</button></div></section>
 <section class="hadisReader ${S.ilim.settings.focus?'focusReader':''}"><div class="readerMarker">HADİS ${String(h.id).padStart(2,'0')}</div><h1>${esc(h.title)}</h1><div class="sourcePill">${esc(h.source)}</div>${highlightPalette}${arabicBlock}<div class="translationCard"><small>TÜRKÇE TAM TERCÜME</small><p style="font-size:${(1.05*scale).toFixed(2)}rem">${esc(h.translation||'Türkçe tercüme hazırlanıyor.').replace(/\n/g,'<br>')}</p><i>Bu tercüme, Arapça metinden Manevî Rota için özgün olarak hazırlanmıştır; modern bir yayınevi tercümesi kopyalanmamıştır.</i></div><div class="meaningCard"><small>KISA AÇIKLAMA</small><p>${esc(h.meaning)}</p></div><div class="whyCard"><small>NEDEN ŞİMDİ?</small><p>${esc(h.why)}</p></div><div class="readingText">${sections}</div><section class="reflectionCard"><small>BUGÜN NEYİ FARK ET?</small><h3>${esc(h.reflection)}</h3><p><b>Hayata küçük adım:</b> ${esc(h.practice)}</p><button class="textButton" id="overallNote">Bu hadis için not al</button>${noteFor===`${h.id}:all`?`<div class="noteComposer"><textarea id="ilimNoteText" rows="3" placeholder="Bu hadisten bende kalan…"></textarea><div class="noteTags">${[['not','Not'],['research','Araştır'],['practice','Uygula']].map(([k,l])=>`<button type="button" class="${(S.ilim.ui.noteTag||'not')===k?'sel':''}" data-note-tag="${k}">${l}</button>`).join('')}</div><div class="actions"><button class="btn ghost" id="cancelIlimNote">Vazgeç</button><button class="btn primary" id="saveIlimNote" data-hadis="${h.id}" data-section="all">Notu kaydet</button></div></div>`:''}</section>
 <div class="readerActionRow"><button class="btn ghost" id="bookmarkHadis">${bookmarked?'★ Kaydedildi':'☆ Kaydet'}</button><button class="btn ghost" id="scheduleHadis">🔁 3/7 tekrara ekle</button></div>
 <section class="card finishRead"><div class="eyebrow">OKUMAYI KAPAT</div><h3>${done?'Tekrar okumasını kaydet':'Bugünkü okumayı tamamla'}</h3><p>Motor bir şey varsaymaz. Önce okuma yükünü, istersen de anlama düzeyini işaretle.</p><div class="dayFeedback">${[['heavy','Ağır geldi'],['ideal','Tam kıvamında'],['easy','Rahat geldi']].map(([k,l])=>`<button class="rating ${S.ilim.ui?.feedback===k?'sel':''}" data-ilim-feedback="${k}">${l}</button>`).join('')}</div><div class="understandingBlock"><div><b>Anlama sinyali</b><small>İsteğe bağlı · ilerleme ekranında yalnız gerçek kayıt kullanılır.</small></div><div class="understandingScale">${[1,2,3,4,5].map(n=>`<button class="${Number(S.ilim.ui?.understanding)===n?'sel':''}" data-understanding="${n}">${n}</button>`).join('')}</div></div><button class="btn primary wide" id="finishHadis" ${S.ilim.ui?.feedback?'':'disabled'}>${done?'Tekrarı kaydet':'Tamamla ve rotaya dön'}</button></section></section>`;
 if(!arabic&&!nawawiArabicError){loadNawawiArabic().then(()=>{if(S.ilim.ui?.screen==='reader'&&Number(S.ilim.ui?.selectedId)===Number(h.id))renderIlimReader(h.id)}).catch(()=>{if(S.ilim.ui?.screen==='reader'&&Number(S.ilim.ui?.selectedId)===Number(h.id))renderIlimReader(h.id)})}
 const retryArabic=document.querySelector('#retryArabic');if(retryArabic)retryArabic.onclick=()=>{nawawiArabicError='';loadNawawiArabic().then(()=>renderIlimReader(h.id)).catch(()=>renderIlimReader(h.id))};
 document.querySelectorAll('[data-highlight-color]').forEach(b=>b.onclick=()=>{S.ilim.settings.highlightColor=b.dataset.highlightColor;save();renderIlimReader(h.id)});
 const customHighlight=document.querySelector('#customHighlightColor');if(customHighlight)customHighlight.oninput=()=>{S.ilim.settings.highlightColor=customHighlight.value;save()};
 document.querySelector('#ilimBack').onclick=()=>ilimGo('home');document.querySelector('#fontDown').onclick=()=>{S.ilim.settings.fontScale=Math.max(.9,Number(S.ilim.settings.fontScale||1)-.1);save();renderIlimReader(h.id)};document.querySelector('#fontUp').onclick=()=>{S.ilim.settings.fontScale=Math.min(1.5,Number(S.ilim.settings.fontScale||1)+.1);save();renderIlimReader(h.id)};document.querySelector('#focusReader').onclick=()=>{S.ilim.settings.focus=!S.ilim.settings.focus;save();renderIlimReader(h.id)};
 document.querySelectorAll('[data-highlight]').forEach(sp=>sp.onclick=()=>{const [hid,si,idx]=sp.dataset.highlight.split(':');const txt=sentenceSplit(getHadis(hid).sections[Number(si)])[Number(idx)];addHadisHighlight(S.ilim,{hadisId:hid,sectionIndex:si,text:txt,date:today(),color:S.ilim.settings.highlightColor||'#e6c46f'});save();renderIlimReader(h.id)});
 document.querySelectorAll('[data-note-for]').forEach(b=>b.onclick=()=>{S.ilim.ui.noteFor=b.dataset.noteFor;save();renderIlimReader(h.id)});document.querySelector('#overallNote').onclick=()=>{S.ilim.ui.noteFor=`${h.id}:all`;save();renderIlimReader(h.id)};
 document.querySelectorAll('[data-note-tag]').forEach(b=>b.onclick=()=>{S.ilim.ui.noteTag=b.dataset.noteTag;save();renderIlimReader(h.id)});const cancel=document.querySelector('#cancelIlimNote');if(cancel)cancel.onclick=()=>{S.ilim.ui.noteFor=null;save();renderIlimReader(h.id)};const saveNote=document.querySelector('#saveIlimNote');if(saveNote)saveNote.onclick=()=>{const txt=document.querySelector('#ilimNoteText').value.trim();if(!txt)return;addHadisNote(S.ilim,{hadisId:saveNote.dataset.hadis,sectionIndex:saveNote.dataset.section==='all'?null:Number(saveNote.dataset.section),text:txt,date:today(),tag:S.ilim.ui.noteTag||'not'});S.ilim.ui.noteFor=null;S.ilim.ui.noteTag='not';save();renderIlimReader(h.id)};
 document.querySelector('#bookmarkHadis').onclick=()=>{toggleHadisBookmark(S.ilim,h.id);save();renderIlimReader(h.id)};document.querySelector('#scheduleHadis').onclick=()=>{scheduleHadisReviews(S.ilim,h.id,today());save();renderIlimReader(h.id)};
 document.querySelectorAll('[data-ilim-feedback]').forEach(b=>b.onclick=()=>{S.ilim.ui.feedback=b.dataset.ilimFeedback;save();renderIlimReader(h.id)});
 document.querySelectorAll('[data-understanding]').forEach(b=>b.onclick=()=>{S.ilim.ui.understanding=Number(b.dataset.understanding);save();renderIlimReader(h.id)});
 document.querySelector('#finishHadis').onclick=()=>{const fb=S.ilim.ui.feedback;if(!fb)return;recordHadisSession(S.ilim,{hadisId:h.id,date:today(),minutes:isCurrent?plan.minutes:8,feedback:fb,completed:true,understanding:S.ilim.ui?.understanding??null});const d=ensure(),routeTasks=d.route?.tasks||[];const linked=routeTasks.find(x=>x.id==='learning')||routeTasks.find(x=>x.id==='reading');if(linked){d.done=[...new Set([...(d.done||[]),linked.id])];d.taskFeedback=d.taskFeedback||{};d.taskFeedback[linked.id]=fb==='heavy'?'hard':fb==='easy'?'easy':'normal'}S.ilim.ui={...S.ilim.ui,screen:'home',feedback:null,understanding:null,noteFor:null};save();renderIlimHome()};
}
function renderIlimReviews(){
 const due=dueHadisReviews(S.ilim,today(),20),upcoming=S.ilim.reviews.filter(r=>!r.done&&r.dueDate>today()).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,8),openId=S.ilim.ui?.reviewOpenId;
 const selected=due.find(r=>r.id===openId)||null;
 if(selected){
   const h=getHadis(selected.hadisId),reveal=!!S.ilim.ui.reviewReveal,draft=S.ilim.ui.recallDraft||'',wave=selected.kind==='recovery'?'KISA GERİ ÇAĞIRMA':`${selected.wave}. GÜN TEKRARI`;
   app.innerHTML=`<section class="card"><button class="textButton" id="backReviews">← Tekrarlara dön</button><div class="eyebrow">${wave}</div><h1>Önce hafızandan getir.</h1><p class="lead">Özet görünmeden önce kendi cümleni kur. Amaç sınav olmak değil; neyin gerçekten sende kaldığını görmek.</p></section>
   <section class="card activeRecall"><div class="sourcePill">Hadis ${h.id} · ${esc(h.title)}</div><h2>${esc(recallPromptFor(h.id))}</h2>${!reveal?`<textarea id="recallDraft" rows="5" placeholder="Hatırladığın kadarıyla yaz…">${esc(draft)}</textarea><div class="actions"><button class="btn ghost" id="cantRecall">Hatırlayamıyorum</button><button class="btn primary" id="revealRecall">Cevabımı karşılaştır →</button></div>`:`<div class="yourRecall"><small>SENİN HATIRLADIĞIN</small><p>${draft?esc(draft):'<i>Bir cevap yazılmadı.</i>'}</p></div><div class="recallReveal"><small>KAYNAĞA DÖN</small><h3>${esc(h.meaning)}</h3><p>${esc(h.why)}</p><div class="sourcePill">${esc(h.source)}</div></div><p class="small">Şimdi kendini değerlendir. Bu değerlendirme “ilim puanı” değildir; yalnızca bir sonraki tekrar dozunu ayarlar.</p><div class="reviewButtons triple"><button data-recall-result="forgot">Hatırlayamadım</button><button data-recall-result="hard">Zor hatırladım</button><button data-recall-result="remembered">Hatırladım</button></div>`}</section>`;
   document.querySelector('#backReviews').onclick=()=>{S.ilim.ui.reviewOpenId=null;S.ilim.ui.reviewReveal=false;S.ilim.ui.recallDraft='';save();renderIlimReviews()};
   if(!reveal){const ta=document.querySelector('#recallDraft');document.querySelector('#revealRecall').onclick=()=>{S.ilim.ui.recallDraft=ta.value.trim();S.ilim.ui.reviewReveal=true;save();renderIlimReviews()};document.querySelector('#cantRecall').onclick=()=>{S.ilim.ui.recallDraft='';S.ilim.ui.reviewReveal=true;save();renderIlimReviews()}}
   else document.querySelectorAll('[data-recall-result]').forEach(b=>b.onclick=()=>{recordRecallAttempt(S.ilim,{reviewId:selected.id,today:today(),text:S.ilim.ui.recallDraft||'',result:b.dataset.recallResult});S.ilim.ui.reviewOpenId=null;S.ilim.ui.reviewReveal=false;S.ilim.ui.recallDraft='';save();renderIlimReviews()});
   return;
 }
 const card=r=>{const h=getHadis(r.hadisId),k=knowledgeSignal(S.ilim,r.hadisId,today()),wave=r.kind==='recovery'?'Kısa geri çağırma':`${r.wave}. gün`;return `<button class="reviewStartCard" data-open-review="${r.id}"><div><small>${wave} · ${esc(r.dueDate)}</small><b>${esc(h?.title||'Hadis')}</b><p>${esc(recallPromptFor(r.hadisId))}</p></div><span class="knowledgeChip ${k.key}">${esc(k.label)}</span><i>›</i></button>`};
 app.innerHTML=`<section class="card"><button class="textButton" id="ilimHome">← İlim Rotası</button><div class="eyebrow">AKTİF GERİ ÇAĞIRMA</div><h1>Okuduğun şey geri gelsin.</h1><p class="lead">Önce hafızandan anlat, sonra kaynağı aç. 3. ve 7. gün tekrarları böylece sadece yeniden okumaya dönüşmez.</p></section><section class="card"><h2>Bugün</h2>${due.length?due.map(card).join(''):'<div class="emptyState">Bugün bekleyen tekrar yok.</div>'}</section><section class="card"><h3>Yaklaşanlar</h3>${upcoming.length?upcoming.map(r=>`<div class="upcomingReview"><span>${esc(r.dueDate)}</span><b>${esc(getHadis(r.hadisId)?.title||'Hadis')}</b><small>${r.kind==='recovery'?'geri çağırma':`${r.wave}. gün`}</small></div>`).join(''):'<p class="small">Henüz yaklaşan tekrar yok.</p>'}</section>`;
 document.querySelector('#ilimHome').onclick=()=>ilimGo('home');document.querySelectorAll('[data-open-review]').forEach(b=>b.onclick=()=>{S.ilim.ui.reviewOpenId=b.dataset.openReview;S.ilim.ui.reviewReveal=false;S.ilim.ui.recallDraft='';save();renderIlimReviews()});
}
function renderIlimNotebook(){
 const entries=notebookEntries(S.ilim);
 app.innerHTML=`<section class="card"><button class="textButton" id="ilimHome">← İlim Rotası</button><div class="eyebrow">İLİM DEFTERİ</div><h1>Altını çizdikların, kendi cümlelerin.</h1><p class="lead">Kitabın kopyası değil; zamanla oluşan kişisel düşünce haritan.</p></section>${entries.length?entries.map(e=>`<section class="card notebookGroup"><div class="sectionHead"><div><small>HADİS ${e.hadis.id}</small><h3>${esc(e.hadis.title)}</h3></div>${e.bookmarked?'<span class="sourcePill">★ Kayıtlı</span>':''}</div>${e.highlights.map(x=>`<blockquote>${esc(x.text)}</blockquote>`).join('')}${e.notes.map(n=>`<div class="userNote"><span>📝</span><div><em class="noteTag ${n.tag||'not'}">${n.tag==='research'?'Araştır':n.tag==='practice'?'Uygula':'Not'}</em><p>${esc(n.text)}</p></div><small>${esc(n.date||'')}</small></div>`).join('')}<button class="textButton" data-open-hadis="${e.hadis.id}">Metne dön →</button></section>`).join(''):'<section class="card emptyState">Henüz not veya çizili yer yok. Okurken bir cümleye dokunarak başlayabilirsin.</section>'}`;
 document.querySelector('#ilimHome').onclick=()=>ilimGo('home');document.querySelectorAll('[data-open-hadis]').forEach(b=>b.onclick=()=>ilimGo('reader',b.dataset.openHadis));
}

document.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b&&S.onboardDone){S.view=b.dataset.view;save();render()}});
render();
if(S.pilot.enabled&&S.pilot.queue.length)setTimeout(()=>flushPilotQueue(),700);
