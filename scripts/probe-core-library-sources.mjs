import fs from 'node:fs/promises';

const candidates=[
  {
    id:'peygamberimiz-aleyhisselam',
    titles:['Peygamberimiz Aleyhisselam','Peygamberimiz Aleyhisselâm','Peygamber'],
    creators:['Ömer Rıza Doğrul','Omer Riza Dogrul','Mevlana Muhammed Ali','Muhammed Ali']
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
    knownIdentifiers:['KsasIEnbiya1','KsasIEnbiya2','KsasIEnbiya3','KsasIEnbiya4','KsasIEnbiya5','KsasIEnbiya6']
  },
  {
    id:'kurandan-ayetler',
    titles:["Kur'an'dan Ayetler","Kur’ân’dan Âyetler",'Kurandan Ayetler','Kur’an’dan Ayetler ve Nesirler'],
    creators:['Mehmet Akif Ersoy','Mehmed Akif Ersoy','Ömer Rıza Doğrul','Omer Riza Dogrul'],
    probeText:true
  },
  {
    id:'akseki-missing-core',
    titles:['Peygamberimizin Vecizeleri','Kuvvetli İman Kuvvetli İrade','Peygamberimiz Hz. Muhammed ve Müslümanlık','Peygamberimiz Hazreti Muhammed ve Müslümanlık'],
    creators:['Ahmed Hamdi Akseki','Ahmet Hamdi Akseki','A. Hamdi Akseki'],
    extraQueries:[
      'creator:(Akseki) AND mediatype:texts',
      '(Akseki AND Vecizeleri) AND mediatype:texts',
      '(Akseki AND "Kuvvetli İman") AND mediatype:texts',
      '(Akseki AND Peygamberimiz) AND mediatype:texts'
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
      '("Omer Riza" AND Shibli) AND mediatype:texts'
    ],
    probeText:true
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
const clean=s=>String(s||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
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
      return {
        identifier:row.identifier,title:row.title||'',creator:row.creator||'',year:row.year||null,
        metadata:{date:m?.metadata?.date||null,year:m?.metadata?.year||null,language:m?.metadata?.language||null,rights:m?.metadata?.rights||null,licenseurl:m?.metadata?.licenseurl||null},
        files:files.slice(0,20),
        ...(contentProbe?{contentProbe}:{})
      };
    }catch(err){return {identifier:row.identifier,title:row.title||'',error:String(err.message||err)}}
  }));
  return {...c,results};
}
const report={generatedAt:new Date().toISOString(),candidates:[]};
for(const c of candidates)report.candidates.push(await searchOne(c));
await fs.writeFile('core-source-probe.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
