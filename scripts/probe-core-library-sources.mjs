import fs from 'node:fs/promises';

const candidates=[
  {
    id:'peygamberimiz-aleyhisselam',
    titles:['Peygamberimiz Aleyhisselam','Peygamberimiz Aleyhisselâm','Peygamber'],
    creators:['Ömer Rıza Doğrul','Omer Riza Dogrul','Mevlana Muhammed Ali','Muhammed Ali'],
    extraQueries:[
      '(creator:("Omer Riza") OR creator:("Ömer Rıza")) AND year:1925 AND mediatype:texts',
      '(creator:("Muhammed Ali") AND year:1925) AND mediatype:texts',
      '(title:(Peygamberimiz) AND year:[1924 TO 1926]) AND mediatype:texts'
    ],
    expectedYears:[1925],
    secondaryProbe:true,
    catalogEvidence:[
      {label:'İBB Kütüphaneleri',url:'https://kutuphane.osmanlica.com/tr/search',note:'1925 / Mahmud Bey Matbaası / Osmanlıca bibliyografik kayıt'},
      {label:'Sakarya Üniversitesi bibliyografyası',url:'https://acikerisim.sakarya.edu.tr/',note:'Peygamberimiz Aleyhisselam, 1341-1342, 300+4 s.'}
    ]
  },
  {
    id:'safahat',
    titles:['Safahat'],
    creators:['Mehmet Akif Ersoy','Mehmed Akif','Mehmet Âkif']
  },
  {
    id:'tanri-buyrugu',
    titles:['Tanrı Buyruğu','Tanri Buyrugu'],
    creators:['Ömer Rıza Doğrul','Omer Riza Dogrul']
  },
  {
    id:'kisas-cevdet',
    titles:['Kısas-ı Enbiya','Kısas-ı Enbiyâ','Kısas-ı Enbiya ve Tevarih-i Hulefa','Peygamber Efendimizin Hayatı'],
    creators:['Ahmed Cevdet Paşa','Ahmet Cevdet Paşa','Cevdet Paşa','Ahmed Cevdet'],
    knownIdentifiers:['KsasIEnbiya1','KsasIEnbiya2','KsasIEnbiya3','KsasIEnbiya4','KsasIEnbiya5','KsasIEnbiya6'],
    rejectTextSignatures:['Mahir IZ','Mahir İz','KULTUR VE TURIZM BAKANLIGI','KÜLTÜR VE TURİZM BAKANLIĞI','1985','sadeleştiren','Sadeleştiren']
  },
  {
    id:'kurandan-ayetler',
    titles:["Kur'an'dan Ayetler","Kur’ân’dan Âyetler",'Kurandan Ayetler','Kur’an’dan Ayetler ve Nesirler'],
    creators:['Mehmet Akif Ersoy','Mehmed Akif Ersoy','Ömer Rıza Doğrul','Omer Riza Dogrul'],
    probeText:true
  },
  {
    id:'akseki-peygamberimiz-1934',
    titles:['Peygamberimiz Hz. Muhammed Aleyhisselam ve Müslümanlık','Peygamberimiz Hazreti Muhammed Aleyhisselam ve Müslümanlık','Peygamberimiz Hz. Muhammed ve Müslümanlık'],
    creators:['Ahmed Hamdi Akseki','Ahmet Hamdi Akseki','A. Hamdi Akseki'],
    extraQueries:[
      '(title:(Peygamberimiz) AND creator:(Akseki) AND year:1934) AND mediatype:texts',
      '(creator:(Akseki) AND year:1934) AND mediatype:texts',
      '("Peygamberimiz" AND "Müslümanlık" AND year:1934) AND mediatype:texts'
    ],
    expectedYears:[1934],
    secondaryProbe:true,
    probeText:true,
    preferredScript:'latin',
    knownCatalogRecords:[
      {
        institution:'Uludağ Üniversitesi İlahiyat Fakültesi Kütüphanesi',
        callNumber:'297.92 AKS.P',
        inventory:'09768',
        edition:'Ankara · İdeal Matbaası · 1934 · 244 s.',
        access:'physical-copy-no-public-reusable-file-confirmed'
      }
    ],
    productionGate:{
      require:'reusable 1934 historical scan or a separable institutional digital copy of the author text',
      reject:['modern edited reprint','modern simplification','preview/snippet-only source','gated text without redistribution permission']
    },
    catalogEvidence:[
      {label:'TDV İslâm Ansiklopedisi',url:'https://islamansiklopedisi.org.tr/akseki-ahmet-hamdi',note:'Peygamberimiz Hz. Muhammed ve Müslümanlık, Ankara 1934'},
      {label:'Uludağ Üniversitesi İlahiyat Fakültesi Kütüphanesi',url:'https://ilahiyatkutuphane.uludag.edu.tr/yordam/',note:'1934 basılı nüsha · 297.92 AKS.P · demirbaş 09768'}
    ]
  },
  {
    id:'akseki-missing-core',
    secondaryProbe:true,
    titles:['Peygamberimizin Vecizeleri','Kuvvetli İman Kuvvetli İrade'],
    creators:['Ahmed Hamdi Akseki','Ahmet Hamdi Akseki','A. Hamdi Akseki'],
    extraQueries:[
      'creator:(Akseki) AND mediatype:texts',
      '(Akseki AND Vecizeleri) AND mediatype:texts',
      '(Akseki AND "Kuvvetli İman") AND mediatype:texts'
    ],
    probeText:true
  },
  {
    id:'asri-saadet-siyret',
    titles:['İslâm Tarihi Asr-ı Saadet Peygamberimizin Siyreti','İslam Tarihi Asr-ı Saadet Peygamberimizin Siyreti','Peygamberimizin Siyreti','Asr-ı Saadet'],
    creators:['Mevlana Şibli','Şibli Numanî','Şibli Numani','Ömer Rıza Doğrul','Omer Riza Dogrul'],
    extraQueries:[
      'title:(Saadet) AND mediatype:texts',
      'title:(Siyreti) AND mediatype:texts',
      '("Ömer Rıza" AND Şibli) AND mediatype:texts',
      '("Omer Riza" AND Shibli) AND mediatype:texts',
      '(creator:("Omer Riza") AND year:1928) AND mediatype:texts',
      '(creator:(Şibli) AND year:1928) AND mediatype:texts',
      '(title:("Islam Tarihi") AND year:1928) AND mediatype:texts'
    ],
    expectedYears:[1928],
    secondaryProbe:true,
    catalogEvidence:[
      {label:'TDV İslâm Ansiklopedisi',url:'https://islamansiklopedisi.org.tr/asr-i-saadet--literatur',note:'Şiblî/Nedvî, Ömer Rıza Doğrul tercümesi, İstanbul 1928'},
      {label:'Wikilala katalog kaydı',url:'https://www.wikilala.com/kitaplar/islam-tarihi-asr-i-saadet-peygamberimizin-siyreti-281596',note:'1928 nüsha, 281 sayfa; yeniden kullanım lisansı ayrıca doğrulanmalı'}
    ],
    probeText:true
  },
  {
    id:'yorukan-peygamberimiz-1926',
    titles:['Peygamberimiz','Din Dersleri Peygamberimiz','Din Dersleri: Peygamberimiz'],
    creators:['Yusuf Ziya Yörükan','Yusuf Ziya Yörükân','Yusuf Ziya'],
    extraQueries:[
      '(title:(Peygamberimiz) AND creator:("Yusuf Ziya") AND year:[1926 TO 1927]) AND mediatype:texts',
      '(creator:(Yörükan) AND year:[1926 TO 1927]) AND mediatype:texts',
      '("Din Dersleri" AND Peygamberimiz AND year:[1926 TO 1927]) AND mediatype:texts'
    ],
    expectedYears:[1926,1927],
    secondaryProbe:true,
    probeText:true,
    knownCatalogRecords:[
      {
        institution:'Türk Tarih Kurumu Kütüphanesi',
        recordId:'466358',
        callNumber:'A.II/9030',
        edition:'1. baskı · İstanbul · Kanaat Kütüphanesi · 1926 · 235+[4] s.',
        access:'catalog-only-no-public-reusable-file-confirmed'
      }
    ],
    catalogEvidence:[
      {label:'TDV İslâm Ansiklopedisi',url:'https://islamansiklopedisi.org.tr/yorukan-yusuf-ziya',note:'Yusuf Ziya Yörükân (ö. 1954), Peygamberimiz, İstanbul 1926'},
      {label:'Marmara din eğitimi araştırması',url:'https://katalog.marmara.edu.tr/veriler/yordambt/cokluortam/3A/0FB88DCF-A7A7-F54B-8363-CCBC21E0C7BE.pdf',note:'1926 ilk neşir; 1927 ikinci baskı; orta mektep ikinci sınıf din dersleri bağlamı'}
    ]
  },
  {
    id:'mehmed-ziya-siyer-1924',
    titles:['Siyer-i Nebî','Siyer-i Nebi'],
    creators:['İhtifalci Mehmed Ziyâ','İhtifalci Mehmed Ziya','Mehmed Ziya','Mehmet Ziya'],
    extraQueries:[
      '(title:("Siyer-i Nebi") AND creator:("Mehmed Ziya") AND year:[1924 TO 1926]) AND mediatype:texts',
      '(title:(Siyer) AND creator:("Mehmed Ziya") AND year:[1924 TO 1926]) AND mediatype:texts',
      '(creator:("Mehmed Ziya") AND year:[1924 TO 1926]) AND mediatype:texts'
    ],
    expectedYears:[1924,1926],
    secondaryProbe:true,
    probeText:true,
    knownCatalogRecords:[
      {
        institution:'Türk Tarih Kurumu Kütüphanesi',
        recordId:'761204',
        callNumber:'AKM/K/20768',
        edition:'2. baskı · İstanbul · Kitâbhâne-i Hilmi · 1926–1927 · 185 s.',
        access:'catalog-only-no-public-reusable-file-confirmed'
      }
    ],
    productionGate:{
      acceptedEditionYears:[1924,1926],
      require:'reusable historical scan with edition identity and text-vs-scan review',
      reject:['modern transliteration','simplified reprint','academic thesis transcription','gated commercial text without redistribution permission']
    },
    catalogEvidence:[
      {label:'TDV İslâm Ansiklopedisi',url:'https://islamansiklopedisi.org.tr/ihtifalci-mehmed-ziya',note:'Mehmed Ziyâ (ö. 1930), Siyer-i Nebî, İstanbul 1340/1924'},
      {label:'Marmara Üniversitesi araştırması',url:'https://openaccess.marmara.edu.tr/entities/publication/e47e8b5d-bac7-4aa4-b069-3f7ac3687995',note:'1924 birinci ve 1926 ikinci baskı; tam kronolojik siyer ders kitabı olarak incelenmiştir'}
    ]
  },
  {
    id:'latin-siyer-public-domain-window',
    titles:[],
    creators:[],
    extraQueries:[
      'title:(Peygamberimiz) AND mediatype:texts AND language:tur AND year:[1928 TO 1955]',
      'title:(Muhammed) AND mediatype:texts AND language:tur AND year:[1928 TO 1955]',
      '(Peygamberimiz AND Muhammed) AND mediatype:texts AND year:[1928 TO 1955]',
      '(Hazreti AND Muhammed) AND mediatype:texts AND language:tur AND year:[1928 TO 1955]'
    ],
    probeText:true
  },
  {
    id:'akseki-siyer-fallbacks',
    secondaryProbe:true,
    titles:['Ondört Asır Evvel Doğan Güneş','14 Asır Evvel Doğan Güneş','Öğretmen ve Öğrencilere Yardımcı Açıklamalı Din Dersleri','Açıklamalı Din Dersleri'],
    creators:['Ahmed Hamdi Akseki','Ahmet Hamdi Akseki','A. Hamdi Akseki','Hamdi Akseki'],
    extraQueries:[
      '("Ondört Asır" AND Akseki) AND mediatype:texts',
      '("14 Asır" AND Akseki) AND mediatype:texts',
      '("Açıklamalı Din Dersleri" AND Akseki) AND mediatype:texts',
      '("Peygamberimiz" AND Akseki) AND mediatype:texts',
      'creator:(Akseki) AND title:(Din Dersleri) AND mediatype:texts'
    ],
    probeText:true
  }
];

const enc=encodeURIComponent,UA='Manevi-Rota-Core-Source-Probe/1.0';
async function json(url,timeout=10000){
  const r=await fetch(url,{headers:{'user-agent':UA,'accept':'application/json'},signal:AbortSignal.timeout(timeout)});
  if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
async function googleBooksJsonWithBackoff(url){
  let lastStatus=null;
  for(let attempt=1;attempt<=3;attempt++){
    const r=await fetch(url,{headers:{'user-agent':UA,'accept':'application/json'},signal:AbortSignal.timeout(15000)});
    lastStatus=r.status;
    if(r.ok)return {ok:true,data:await r.json(),attempt};
    if(r.status!==429)return {ok:false,status:r.status,error:`${r.status} ${r.statusText}`,attempt};
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,attempt*1500));
  }
  return {ok:false,status:lastStatus,error:'429 Too Many Requests',rateLimited:true,attempt:3};
}

async function googleCandidates(c){
  if(!c.secondaryProbe)return [];
  const title=c.titles[0]||'';
  const creator=c.creators[0]||'';
  if(!title&&!creator)return [];
  const q=title&&creator?`intitle:"${title}" inauthor:"${creator}"`:title?`intitle:"${title}"`:`inauthor:"${creator}"`;
  const url='https://www.googleapis.com/books/v1/volumes?q='+enc(q)+'&maxResults=20&printType=books';
  try{
    const response=await googleBooksJsonWithBackoff(url);
    if(!response.ok)return [{query:q,error:response.error,status:response.status,rateLimited:Boolean(response.rateLimited),attempts:response.attempt}];
    const seen=new Set(),out=[];
    for(const item of response.data?.items||[]){
      if(!item?.id||seen.has(item.id))continue;
      seen.add(item.id);
      const v=item.volumeInfo||{},a=item.accessInfo||{};
      out.push({
        id:item.id,title:v.title||'',authors:v.authors||[],publishedDate:v.publishedDate||null,
        publisher:v.publisher||null,pageCount:v.pageCount||null,viewability:a.viewability||null,
        publicDomain:Boolean(a.publicDomain),embeddable:Boolean(a.embeddable),
        pdfAvailable:Boolean(a.pdf?.isAvailable),pdfDownloadLink:a.pdf?.downloadLink||null,
        epubAvailable:Boolean(a.epub?.isAvailable),epubDownloadLink:a.epub?.downloadLink||null,
        webReaderLink:a.webReaderLink||null,infoLink:v.infoLink||null,query:q,attempts:response.attempt
      });
    }
    return out.slice(0,20);
  }catch(err){
    return [{query:q,error:String(err.message||err),status:null,rateLimited:false}];
  }
}

async function openLibraryCandidates(c){
  if(!c.secondaryProbe)return [];
  const queries=[...new Set([
    c.titles[0]?'title="'+c.titles[0]+'"':null,
    c.titles[0]&&c.creators[0]?'title="'+c.titles[0]+'" author="'+c.creators[0]+'"':null,
    c.creators[0]?'author="'+c.creators[0]+'"':null
  ].filter(Boolean))].slice(0,3);
  const seen=new Set(),out=[];
  for(const q of queries){
    try{
      const d=await json('https://openlibrary.org/search.json?q='+enc(q)+'&limit=20&fields=key,title,author_name,first_publish_year,edition_key,ia,public_scan_b,ebook_access,publish_year,publisher',15000);
      for(const row of d?.docs||[]){
        const key=row?.key||JSON.stringify([row?.title,row?.first_publish_year]);
        if(seen.has(key))continue;
        seen.add(key);
        out.push({key:row.key||null,title:row.title||'',authors:row.author_name||[],firstPublishYear:row.first_publish_year||null,publishYears:row.publish_year||[],publishers:row.publisher||[],editionKeys:row.edition_key||[],iaIdentifiers:row.ia||[],publicScan:Boolean(row.public_scan_b),ebookAccess:row.ebook_access||null});
      }
    }catch(err){out.push({query:q,error:String(err.message||err)})}
  }
  return out.slice(0,20);
}
const clean=s=>String(s||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
const lowerTr=s=>String(s||'').toLocaleLowerCase('tr-TR');
function assessResult(candidate,result){
  if(result?.error)return {status:'probe-error',reason:result.error};
  const files=result?.files||[];
  const hasFullText=files.some(f=>/djvu\.txt$|\.txt$|\.pdf$|\.epub$/i.test(String(f?.name||'')));
  if(!hasFullText)return {status:'reject-no-fulltext',reason:'No PDF/TXT/EPUB full-text file exposed by source.'};
  const license=lowerTr([result?.metadata?.licenseurl,result?.metadata?.rights].filter(Boolean).join(' '));
  if(/by-nc|noncommercial|non-commercial|nc-nd|by-nd|no derivatives/.test(license)){
    return {status:'reject-restrictive-license',reason:'Source metadata indicates NC/ND or equivalent redistribution restriction.'};
  }
  const probe=lowerTr([result?.contentProbe?.head,...Object.values(result?.contentProbe?.hits||{}).map(x=>x?.context||'')].join('\n'));
  const blocked=(candidate.rejectTextSignatures||[]).find(sig=>probe.includes(lowerTr(sig)));
  if(blocked)return {status:'reject-modern-editorial-layer',reason:`Detected modern/editorial signature: ${blocked}`};
  const year=Number(result?.year||result?.metadata?.year||String(result?.metadata?.date||'').match(/\d{4}/)?.[0]||0)||null;
  if(candidate.expectedYears?.length&&year&&!candidate.expectedYears.includes(year)){
    return {status:'review-year-mismatch',reason:`Expected ${candidate.expectedYears.join('/')} historical witness; source reports ${year}.`};
  }
  if(result?.contentProbe?.charCount>5000){
    return {status:'manual-rights-and-text-review',reason:'Substantial full text detected; verify edition identity, rights and OCR against scan before production.'};
  }
  return {status:'manual-source-review',reason:'Source needs human edition/rights verification before production use.'};
}
const ctx=(src,index,radius=220)=>index<0?null:clean(src.slice(Math.max(0,index-radius),Math.min(src.length,index+radius)));
async function textProbe(identifier,files){
  const djvu=files.find(f=>/djvu\.txt$/i.test(String(f?.name||'')));
  if(!djvu?.name)return null;
  try{
    const u=`https://archive.org/download/${identifier}/${encodeURIComponent(djvu.name)}`;
    const r=await fetch(u,{headers:{'user-agent':UA,'accept':'text/plain,*/*'},signal:AbortSignal.timeout(30000)});
    if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
    const text=await r.text();
    const needles=['Ahmed Cevdet','Ahmet Cevdet','Cevdet Paşa','Kısas-ı Enbiya','Kısas-ı Enbiyâ','Hazreti Muhammed','Hz. Muhammed','Muhammed aleyhisselam','Resûlullah','Peygamberimiz'];
    const hits={};
    for(const needle of needles){
      const i=text.toLocaleLowerCase('tr-TR').indexOf(needle.toLocaleLowerCase('tr-TR'));
      if(i>=0)hits[needle]={index:i,context:ctx(text,i)};
    }
    return {url:u,charCount:text.length,head:clean(text.slice(0,1800)),hits};
  }catch(err){return {error:String(err.message||err)}}
}
async function searchOne(c){
  const queries=[];
  for(const title of c.titles){
    queries.push(`title:"${title}" AND mediatype:texts`);
    for(const creator of c.creators)queries.push(`title:"${title}" AND creator:"${creator}" AND mediatype:texts`);
  }
  for(const q of c.extraQueries||[])queries.push(q);
  const docs=new Map();
  await Promise.all(queries.map(async q=>{
    try{
      const u=`https://archive.org/advancedsearch.php?q=${enc(q)}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=year&fl%5B%5D=mediatype&rows=20&page=1&output=json`;
      const d=await json(u);
      for(const row of d?.response?.docs||[])if(row?.identifier&&!docs.has(row.identifier))docs.set(row.identifier,row);
    }catch{}
  }));
  for(const identifier of c.knownIdentifiers||[]){
    if(!docs.has(identifier))docs.set(identifier,{identifier,title:identifier,creator:'',year:null});
  }
  const selected=[...docs.values()].slice(0,20);
  const results=await Promise.all(selected.map(async row=>{
    try{
      const m=await json(`https://archive.org/metadata/${row.identifier}`,30000);
      const files=(m?.files||[]).filter(f=>/(djvu\.txt|\.txt$|\.pdf$|\.epub$)/i.test(String(f?.name||''))).map(f=>({
        name:f.name,size:Number(f.size||0)||null,format:f.format||null,source:f.source||null
      }));
      const contentProbe=(c.id==='kisas-cevdet'||c.probeText)?await textProbe(row.identifier,files):null;
      const result={
        identifier:row.identifier,title:row.title||'',creator:row.creator||'',year:row.year||null,
        metadata:{date:m?.metadata?.date||null,year:m?.metadata?.year||null,language:m?.metadata?.language||null,rights:m?.metadata?.rights||null,licenseurl:m?.metadata?.licenseurl||null},
        files:files.slice(0,20),
        ...(contentProbe?{contentProbe}:{})
      };
      result.assessment=assessResult(c,result);
      return result;
    }catch(err){return {identifier:row.identifier,title:row.title||'',error:String(err.message||err)}}
  }));
  const [googleBooks,openLibrary]=await Promise.all([googleCandidates(c),openLibraryCandidates(c)]);
  return {...c,results,googleBooks,openLibrary};
}
const report={
  generatedAt:new Date().toISOString(),
  policy:{
    readyRule:'A search hit is never enough: production requires edition identity, commercially reusable rights, and text-vs-scan review.',
    hardReject:['modern editorial/simplification layer','NC/ND or equivalent restrictive license','snippet/preview/catalog-only source'],
    note:'catalogEvidence is discovery evidence only; it never authorizes copying text into production.'
  },
  candidates:[]
};
for(const c of candidates)report.candidates.push(await searchOne(c));
await fs.writeFile('core-source-probe.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
