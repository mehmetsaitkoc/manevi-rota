import fs from 'node:fs/promises';

const works=[
  {id:'yavrularimiza-din-dersleri',title:'Yavrularımıza Din Dersleri',author:'Ahmet Hamdi Akseki',aliases:['Yavrularımıza Din Dersleri']},
  {id:'peygamberimiz-muhammed',title:'Peygamberimiz Hz. Muhammed ve Müslümanlık',author:'Ahmet Hamdi Akseki',aliases:['Peygamberimiz Hz. Muhammed ve Müslümanlık','Peygamberimiz Hazreti Muhammed ve Müslümanlık','Peygamberimiz Muhammed ve Müslümanlık','Peygamberimiz ve Müslümanlık']},
  {id:'muslumanlik-nedir',title:'Müslümanlık Nedir',author:'Ömer Rıza Doğrul',aliases:['Müslümanlık Nedir','Muslumanlik Nedir','Müslümanlık Nedir?']},
  {id:'peygamberimizin-vecizeleri',title:'Peygamberimizin Vecizeleri',author:'Ahmet Hamdi Akseki',aliases:['Peygamberimizin Vecizeleri','Kuvvetli İman Kuvvetli İrade','Peygamberimizin Vecizeleri Kuvvetli İman']},
  {id:'vel-asr-tefsiri',title:"Ve'l-Asr Suresinin Tefsiri",author:'Ahmet Hamdi Akseki',aliases:["Ve'l-Asr Suresinin Tefsiri",'Vel Asr Suresinin Tefsiri','Asr Suresinin Tefsiri','Velasr Suresinin Tefsiri']},
  {id:'alt-islam-fitri',title:'İslam Fıtri Tabii ve Umumi Bir Dindir',author:'Ahmet Hamdi Akseki',aliases:['İslam Fıtri Tabii ve Umumi Bir Dindir','İslam Fıtrî Tabiî ve Umumî Bir Dindir']},
  {id:'alt-ibni-sina-ihlas',title:'İbni Sina İhlas Suresi',author:'Ahmet Hamdi Akseki',aliases:['Ibni Sina Ihlas Suresi','İbn Sina İhlas Suresi','İhlas Suresi Akseki']},
  {id:'alt-askere-din',title:'Askere Din Dersleri',author:'Ahmet Hamdi Akseki',aliases:['Askere Din Dersleri','Askere Din Kitabı']},
  {id:'alt-koyluye-din',title:'Köylüye Din Dersleri',author:'Ahmet Hamdi Akseki',aliases:['Köylüye Din Dersleri']},
  {id:'alt-dini-dersler',title:'Dini Dersler',author:'Ahmet Hamdi Akseki',aliases:['Dini Dersler','Dinî Dersler']}
];

const UA='Manevi-Rota-Source-Audit/1.0';
async function getJson(url){
  const res=await fetch(url,{headers:{'user-agent':UA,'accept':'application/json'},signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}
const enc=encodeURIComponent;

async function archiveCandidates(work){
  const titles=[...new Set([work.title,...(work.aliases||[])])];
  const queries=titles.flatMap(title=>[
    `title:"${title}" AND creator:"${work.author}"`,
    `title:"${title}"`,
    `"${title}" AND "${work.author}"`
  ]);
  const docs=new Map(),errors=[];
  await Promise.all(queries.map(async q=>{
    try{
      const url=`https://archive.org/advancedsearch.php?q=${enc(q)}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=year&fl%5B%5D=mediatype&fl%5B%5D=licenseurl&rows=12&page=1&output=json`;
      const data=await getJson(url);
      for(const doc of data?.response?.docs||[]){
        if(doc?.identifier&&!docs.has(doc.identifier))docs.set(doc.identifier,doc);
      }
    }catch(err){errors.push({error:String(err.message||err),query:q})}
  }));
  const chosen=[...docs.values()].slice(0,12);
  const enriched=await Promise.all(chosen.map(async doc=>{
    let metadata=null;
    try{
      const meta=await getJson(`https://archive.org/metadata/${doc.identifier}`);
      const files=(meta?.files||[]).filter(file=>/\.(pdf|djvu\.txt|txt|epub)$/i.test(String(file?.name||''))).map(file=>({
        name:file.name,size:Number(file.size||0)||null,format:file.format||null,source:file.source||null
      })).slice(0,20);
      metadata={
        title:meta?.metadata?.title||null,creator:meta?.metadata?.creator||null,date:meta?.metadata?.date||null,
        year:meta?.metadata?.year||null,licenseurl:meta?.metadata?.licenseurl||null,rights:meta?.metadata?.rights||null,
        uploader:meta?.metadata?.uploader||null,files
      };
    }catch(err){metadata={error:String(err.message||err)}}
    return {
      identifier:doc.identifier,title:doc.title||'',creator:doc.creator||'',year:doc.year||null,
      mediatype:doc.mediatype||'',licenseurl:doc.licenseurl||null,
      detailsUrl:`https://archive.org/details/${doc.identifier}`,
      metadataUrl:`https://archive.org/metadata/${doc.identifier}`,
      metadata
    };
  }));
  return [...enriched,...errors].slice(0,12);
}

async function googleCandidates(work){
  const titles=[...new Set([work.title,...(work.aliases||[])])];
  const qs=titles.flatMap(title=>[
    `intitle:"${title}" inauthor:"${work.author}"`,
    `"${title}" "${work.author}"`
  ]);
  const seen=new Set(),out=[],errors=[];
  await Promise.all(qs.map(async q=>{
    try{
      const data=await getJson(`https://www.googleapis.com/books/v1/volumes?q=${enc(q)}&maxResults=12&printType=books`);
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
    }catch(err){errors.push({error:String(err.message||err),query:q})}
  }));
  return [...out,...errors].slice(0,12);
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
