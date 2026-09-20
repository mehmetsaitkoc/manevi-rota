import fs from 'node:fs/promises';

const works=[
  {id:'yavrularimiza-din-dersleri',title:'Yavrularımıza Din Dersleri',author:'Ahmet Hamdi Akseki'},
  {id:'peygamberimiz-muhammed',title:'Peygamberimiz Hz. Muhammed ve Müslümanlık',author:'Ahmet Hamdi Akseki'},
  {id:'muslumanlik-nedir',title:'Müslümanlık Nedir',author:'Ömer Rıza Doğrul'},
  {id:'peygamberimizin-vecizeleri',title:'Peygamberimizin Vecizeleri',author:'Ahmet Hamdi Akseki'},
  {id:'vel-asr-tefsiri',title:"Ve'l-Asr Suresinin Tefsiri",author:'Ahmet Hamdi Akseki'}
];

const UA='Manevi-Rota-Source-Audit/1.0';
async function getJson(url){
  const res=await fetch(url,{headers:{'user-agent':UA,'accept':'application/json'},signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}
const enc=encodeURIComponent;

async function archiveCandidates(work){
  const queries=[
    `title:"${work.title}" AND creator:"${work.author}"`,
    `"${work.title}" AND "${work.author}"`
  ];
  const seen=new Set(),out=[];
  for(const q of queries){
    try{
      const url=`https://archive.org/advancedsearch.php?q=${enc(q)}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=year&fl%5B%5D=mediatype&fl%5B%5D=licenseurl&rows=20&page=1&output=json`;
      const data=await getJson(url);
      for(const doc of data?.response?.docs||[]){
        if(!doc?.identifier||seen.has(doc.identifier))continue;
        seen.add(doc.identifier);
        out.push({
          identifier:doc.identifier,title:doc.title||'',creator:doc.creator||'',year:doc.year||null,
          mediatype:doc.mediatype||'',licenseurl:doc.licenseurl||null,
          detailsUrl:`https://archive.org/details/${doc.identifier}`,
          metadataUrl:`https://archive.org/metadata/${doc.identifier}`
        });
      }
    }catch(err){out.push({error:String(err.message||err),query:q})}
  }
  return out.slice(0,12);
}

async function googleCandidates(work){
  const qs=[
    `intitle:"${work.title}" inauthor:"${work.author}"`,
    `"${work.title}" "${work.author}"`
  ];
  const seen=new Set(),out=[];
  for(const q of qs){
    try{
      const data=await getJson(`https://www.googleapis.com/books/v1/volumes?q=${enc(q)}&maxResults=20&printType=books`);
      for(const item of data?.items||[]){
        if(!item?.id||seen.has(item.id))continue;
        seen.add(item.id);
        const v=item.volumeInfo||{},a=item.accessInfo||{};
        out.push({
          id:item.id,title:v.title||'',authors:v.authors||[],publishedDate:v.publishedDate||null,
          publisher:v.publisher||null,pageCount:v.pageCount||null,
          viewability:a.viewability||null,publicDomain:Boolean(a.publicDomain),
          embeddable:Boolean(a.embeddable),epubAvailable:Boolean(a.epub?.isAvailable),
          pdfAvailable:Boolean(a.pdf?.isAvailable),webReaderLink:a.webReaderLink||null,
          infoLink:v.infoLink||null
        });
      }
    }catch(err){out.push({error:String(err.message||err),query:q})}
  }
  return out.slice(0,12);
}

const report={generatedAt:new Date().toISOString(),policy:{
  target:'public-domain author text with a commercially reusable source or a source that can be independently transcribed',
  reject:['preview/snippet-only records','modern copyrighted editions without redistribution permission','non-commercial-only archive copies as production assets']
},works:[]};

for(const work of works){
  const [archive,google]=await Promise.all([archiveCandidates(work),googleCandidates(work)]);
  report.works.push({...work,archive,google});
}
await fs.writeFile('source-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
