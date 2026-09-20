export const STARTER_LIBRARY_VERSION='2026.09';

export const STARTER_LIBRARY_STAGES=[
  {id:'level-1',order:1,title:'Temel Din Bilinci',subtitle:'Kur’ân ile bağ kur; iman, ibadet ve ahlâkın temel çerçevesini öğren.'},
  {id:'level-2',order:2,title:'İbadeti Anlama ve Temeli Pekiştirme',subtitle:'Sade din bilgisiyle temeli pekiştir; namazda okuduklarının anlamına yaklaş.'},
  {id:'level-3',order:3,title:'Sünnet ve Peygamber Örneği',subtitle:'Hadisleri ve Resûlullah’ın örnekliğini hayatla ilişkilendir.'},
  {id:'level-4',order:4,title:'Müslüman Kimliği ve Ahlâk',subtitle:'İnancın karaktere, sorumluluğa ve davranışa nasıl dönüştüğünü işle.'},
  {id:'level-5',order:5,title:'Tefekkür ve Şuur',subtitle:'Hadis ve tefsir okumalarıyla düşünme, muhasebe ve anlam derinliğini artır.'}
];

export const STARTER_LIBRARY=[
  {
        order:1,stage:'level-1',id:'quran',title:'Kur’ân-ı Kerîm',author:'—',field:'Kur’ân',level:'Seviye 1',
        readerType:'quran',alwaysOn:true,availability:'ready',coverGlyph:'ق',tone:'emerald',
        shortLabel:'114 sûre · Arapça metin',
        sourceLabel:'Quran Uthmani Hafs',
        rightsStatus:'scripture-source',
        originalYear:null,authorDeathYear:null,
        rightsNote:'Arapça Kur’ân metni yerel veri olarak paketlenir; meal bu okuyucuya karıştırılmaz.'
      },
  {
        order:2,stage:'level-1',id:'islam-dini',title:'İslâm Dini',author:'Ahmed Hamdi Akseki',field:'İtikat · İbadet · Ahlâk',level:'Seviye 1',
        readerType:'generic',availability:'ready',coverGlyph:'ك',tone:'gold',
        shortLabel:'Temel din bilgisi',
        sourceLabel:'İlk baskı 1933 · kullanılan OCR taraması 20. baskı',
        asset:'public/data/islam-dini.json',
        requiresEditionReview:true,
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1933,authorDeathYear:1951,
        rightsNote:'Müellifin koruma süresi sona ermiştir; kullanılan geç baskı OCR taramasındaki tashih/editoryal katkılar ticari yayın öncesi ayrıca kontrol edilecektir.'
      },
  {
        order:3,stage:'level-2',id:'yavrularimiza-din-dersleri',title:'Yavrularımıza Din Dersleri',author:'Ahmed Hamdi Akseki',field:'Temel din eğitimi',level:'Seviye 2',
        readerType:'generic',availability:'source-verified',coverGlyph:'ي',tone:'sage',
        shortLabel:'Sade ve kademeli din bilgisi',
        sourceLabel:'1940’lar tarihî baskıları doğrulandı',
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1941,authorDeathYear:1951,
        rightsNote:'Tam metin yalnız güvenilir tarihî nüsha doğrulandıktan sonra açılacaktır.'
      },
  {
        order:4,stage:'level-2',id:'namaz-sureleri-tefsiri',title:'Namaz Sûrelerinin Türkçe Terceme ve Tefsiri',author:'Ahmed Hamdi Akseki',field:'Kur’ân · Namaz',level:'Seviye 2',
        readerType:'generic',availability:'ready',coverGlyph:'ن',tone:'navy',
        shortLabel:'Fâtiha · kısa sûreler · dualar',
        sourceLabel:'1949 müellif metni · DİB dijital nüsha',
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1949,authorDeathYear:1951,requiresEditionReview:true,
        asset:'public/data/books/namaz-sureleri-tefsiri.json',
        rightsNote:'Dijital baskının yayınevi ön maddeleri alınmaz; müellif metni AI ile modernize edilmez.'
      },
  {
        order:5,stage:'level-3',id:'kirk-hadis',title:'Kırk Hadis',author:'İmam Nevevî',field:'Hadis',level:'Seviye 3',
        readerType:'hadith',availability:'ready',coverGlyph:'ح',tone:'forest',
        shortLabel:'42 hadis · aktif tekrar',
        sourceLabel:'Nevevî Kırk Hadis',
        rightsStatus:'classical-public-domain',
        originalYear:null,authorDeathYear:1277,
        rightsNote:'Klasik eser; Türkçe tercüme Manevî Rota içinde ayrı editoryal katman olarak tutulur.'
      },
  {
        order:6,stage:'level-3',id:'peygamberimiz-muhammed',title:'Peygamberimiz Hz. Muhammed ve Müslümanlık',author:'Ahmed Hamdi Akseki',field:'Siyer',level:'Seviye 3',
        readerType:'generic',availability:'source-verified',coverGlyph:'ص',tone:'burgundy',
        shortLabel:'Siyer ve temel Müslümanlık bilgisi',
        sourceLabel:'1934 baskısı bibliyografik olarak doğrulandı',
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1934,authorDeathYear:1951,
        rightsNote:'Metin tarihî nüshadan aktarılacak; modern sadeleştirme kullanılmayacaktır.'
      },
  {
        order:7,stage:'level-4',id:'muslumanlik-nedir',title:'Müslümanlık Nedir?',author:'Ömer Rıza Doğrul',field:'İman · Temel esaslar',level:'Seviye 4',
        readerType:'generic',availability:'source-verified',coverGlyph:'م',tone:'clay',
        shortLabel:'155 soru-cevap',
        sourceLabel:'1933 ilk baskı bibliyografik olarak doğrulandı',
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1933,authorDeathYear:1952,
        rightsNote:'Tam metin yalnız ilk/erken baskı taraması doğrulanınca açılacaktır.'
      },
  {
        order:8,stage:'level-4',id:'ahlak-dersleri',title:'Ahlâk Dersleri',author:'Ahmed Hamdi Akseki',field:'Ahlâk',level:'Seviye 4',
        readerType:'generic',availability:'ready',coverGlyph:'ا',tone:'plum',
        shortLabel:'Ahlâk ilmi ve İslâm ahlâkı',
        sourceLabel:'1924 müellif metni · DİB dijital nüsha',
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1924,authorDeathYear:1951,requiresEditionReview:true,
        asset:'public/data/books/ahlak-dersleri.json',
        rightsNote:'Yayınevi ön maddeleri alınmaz; müellif metni özgün dilinde korunur ve AI açıklaması metne karıştırılmaz.'
      },
  {
        order:9,stage:'level-5',id:'peygamberimizin-vecizeleri',title:'Peygamberimizin Vecizeleri',author:'Ahmed Hamdi Akseki',field:'Hadis · Ahlâk',level:'Seviye 5',
        readerType:'generic',availability:'source-verified',coverGlyph:'و',tone:'ink',
        shortLabel:'Hadis metinleri, tercüme ve şerh',
        sourceLabel:'1945 ilk baskı doğrulandı',
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1945,authorDeathYear:1951,
        rightsNote:'İlk baskıda dizgi hataları bulunduğu için metin ayrıca tashih karşılaştırmasından geçmeden canlıya açılmaz.'
      },
  {
        order:10,stage:'level-5',id:'vel-asr-tefsiri',title:'Ve’l-Asr Sûresinin Tefsiri',author:'Ahmed Hamdi Akseki',field:'Tefsir',level:'Seviye 5',
        readerType:'generic',availability:'source-verified',coverGlyph:'ع',tone:'olive',
        shortLabel:'Kısa sûre üzerinden tefsir okuması',
        sourceLabel:'1928 tarihli eser bibliyografik olarak doğrulandı',
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1928,authorDeathYear:1951,
        rightsNote:'Doğrulanmış tarihî tam metin bulunmadan uygulama metin üretmez.'
      }
];

export const STARTER_LIBRARY_BY_ID=Object.fromEntries(STARTER_LIBRARY.map(book=>[book.id,book]));
export const starterBook=id=>STARTER_LIBRARY_BY_ID[id]||null;
export const readyStarterBooks=()=>STARTER_LIBRARY.filter(book=>book.availability==='ready');
export const pendingStarterBooks=()=>STARTER_LIBRARY.filter(book=>book.availability!=='ready');


export const starterBooksByStage=stageId=>STARTER_LIBRARY.filter(book=>book.stage===stageId);
