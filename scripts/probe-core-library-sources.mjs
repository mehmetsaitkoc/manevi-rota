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
    creators:['Ahmed Cevdet Paşa','Ahmet Cevdet Paşa','Cevdet Paşa','Ahmed Cevdet']
  },
  {
    id:'kurandan-ayetler',
    titles:["Kur'an'dan Ayetler","Kur’ân’dan Âyetler",'Kurandan Ayetler','Kur’an’dan Ayetler ve Nesirler'],
    creators:['Mehmet Akif Ersoy','Mehmed Akif Ersoy','Ömer Rıza Doğrul','Omer Riza Dogrul']
  }
];

const enc=encodeURIComponent,UA='Manevi-Rota-Core-Source-Probe/1.0';
async function json(url){
  const r=await fetch(url,{headers:{'user-agent':UA,'accept':'application/json'},signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
async function searchOne(c){
  const queries=[];
  for(const title of c.titles){
    queries.push(`title:"${title}" AND mediatype:texts`);
    for(const creator of c.creators)queries.push(`title:"${title}" AND creator:"${creator}" AND mediatype:texts`);
  }
  const docs=new Map();
  await Promise.all(queries.map(async q=>{
    try{
      const u=`https://archive.org/advancedsearch.php?q=${enc(q)}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=year&fl%5B%5D=mediatype&rows=20&page=1&output=json`;
      const d=await json(u);
      for(const row of d?.response?.docs||[])if(row?.identifier&&!docs.has(row.identifier))docs.set(row.identifier,row);
    }catch{}
  }));
  const selected=[...docs.values()].slice(0,20);
  const results=await Promise.all(selected.map(async row=>{
    try{
      const m=await json(`https://archive.org/metadata/${row.identifier}`);
      const files=(m?.files||[]).filter(f=>/(djvu\.txt|\.txt$|\.pdf$|\.epub$)/i.test(String(f?.name||''))).map(f=>({
        name:f.name,size:Number(f.size||0)||null,format:f.format||null,source:f.source||null
      }));
      return {
        identifier:row.identifier,title:row.title||'',creator:row.creator||'',year:row.year||null,
        metadata:{date:m?.metadata?.date||null,year:m?.metadata?.year||null,language:m?.metadata?.language||null,rights:m?.metadata?.rights||null,licenseurl:m?.metadata?.licenseurl||null},
        files:files.slice(0,20)
      };
    }catch(err){return {identifier:row.identifier,title:row.title||'',error:String(err.message||err)}}
  }));
  return {...c,results};
}
const report={generatedAt:new Date().toISOString(),candidates:[]};
for(const c of candidates)report.candidates.push(await searchOne(c));
await fs.writeFile('core-source-probe.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
