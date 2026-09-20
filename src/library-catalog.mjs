export const STARTER_LIBRARY_VERSION='2026.09';

export const STARTER_LIBRARY_STAGES=[
  {
    id:'level-1',order:1,title:'Temel Din Bilinci',
    subtitle:'Kur’ân ile bağ kur; iman, ibadet ve ahlâkın temel çerçevesini öğren.',
    goals:[
      'İman, ibadet ve ahlâkın farklı ama birbirini tamamlayan alanlar olduğunu kendi cümlenle açıklayabilmek.',
      'Temel din bilgisinden günlük hayata dokunan en az bir soru veya çıkarım üretebilmek.',
      'Okuduğun bir temel kavramı kaynak metindeki bağlamıyla hatırlayabilmek.'
    ]
  },
  {
    id:'level-2',order:2,title:'İbadeti Anlama ve Temeli Pekiştirme',
    subtitle:'Sade din bilgisiyle temeli pekiştir; namazda okuduklarının anlamına yaklaş.',
    goals:[
      'Namazda sık okunan sûre ve duaların ana anlamlarını tanımaya başlamak.',
      'İbadetin şekli ile anlamı arasındaki bağı okuduğun metin üzerinden fark edebilmek.',
      'Öğrendiğin bir anlamı kendi ibadet rutinine dair düşünsel bir notla ilişkilendirebilmek.'
    ]
  },
  {
    id:'level-3',order:3,title:'Sünnet ve Peygamber Örneği',
    subtitle:'Hadisleri ve Resûlullah’ın örnekliğini hayatla ilişkilendir.',
    goals:[
      'Okuduğun bir hadisin ana mesajını kısa biçimde kendi cümlenle ifade edebilmek.',
      'Bir hadis ile Hz. Peygamber’in örnekliği arasında temel bir bağlantı kurabilmek.',
      'Metindeki bir ilkeden günlük davranışa yönelik somut bir düşünce çıkarabilmek.'
    ]
  },
  {
    id:'level-4',order:4,title:'Müslüman Kimliği ve Ahlâk',
    subtitle:'İnancın karaktere, sorumluluğa ve davranışa nasıl dönüştüğünü işle.',
    goals:[
      'İnanç ile ahlâkî davranış arasındaki ilişkiyi metinden örneklerle ayırt edebilmek.',
      'Niyet, sorumluluk ve davranış arasındaki bağı düşünerek açıklayabilmek.',
      'Bir ahlâk konusundaki doğru ve problemli davranış örneklerini metne dayanarak karşılaştırabilmek.'
    ]
  },
  {
    id:'level-5',order:5,title:'Tefekkür ve Şuur',
    subtitle:'Kur’ân merkezli tefsir ve şuur okumalarıyla düşünme, muhasebe ve anlam derinliğini artır.',
    goals:[
      'Bir metnin ana fikri, gerekçesi ve sonucu arasında bağlantı kurabilmek.',
      'Zaman, sorumluluk ve davranış temalarını birlikte değerlendirebilmek.',
      'Tefsir veya şuur okumasından kendi araştırma ya da muhasebe sorunu üretebilmek.'
    ]
  }
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
        readerType:'generic',availability:'ready',coverGlyph:'ي',tone:'sage',
        shortLabel:'Sade ve kademeli din bilgisi',
        sourceLabel:'1967 tarihî tarama · Internet Archive',
        asset:'public/data/books/yavrularimiza-din-dersleri.json',
        requiresEditionReview:true,
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1941,authorDeathYear:1951,
        rightsNote:'Müellifin koruma süresi sona ermiştir. Okuyucu 1967 tarihli taramanın OCR aktarımını kullanır; muhtemel yayınevi/tashih katkıları ve OCR hataları ticari yayın öncesi insan editör tarafından karşılaştırılmalıdır.'
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
        order:6,stage:'level-3',id:'peygamberimiz-muhammed',title:'İslâm Tarihi: Asr-ı Saâdet — Peygamberimizin Sîreti',author:'Şiblî Nu‘mânî · Süleyman Nedvî',translator:'Ömer Rıza Doğrul',field:'Siyer · Sünnet · Peygamber örnekliği',level:'Seviye 3',
        readerType:'generic',availability:'source-verified',coverGlyph:'ص',tone:'burgundy',
        shortLabel:'Hz. Peygamber’in hayatı · risalet · şahsiyet · tahlil',
        sourceLabel:'1928 özgün baskı doğrulandı · fizikî kaynak edinimi mümkün · kendi taramamız bekleniyor',
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1928,authorDeathYear:1953,
        sourceGate:{
          status:'selected-physical-source-available',
          selectedWorkId:'asri-saadet-siyret',
          acceptedEditionYears:[1928],
          preferredScript:'ottoman-turkish',
          selectionReason:'Seviye 3 için nihai siyer seçimi budur: TDV değerlendirmesinde İslâm kaynaklarının ciddi tahlil ve tenkidine dayanan, çağdaş çalışmalarla mukayese yapan ve dönemin önemli ilim adamlarınca takdir edilmiş güçlü bir çalışma olarak öne çıkar.',
          productionPlan:'Özgün 1928 I–IV ciltler fizikî olarak temin edilip Manevî Rota için yeniden taranacak; OCR yalnız yardımcı katman olacak, Osmanlıca metin güvenilir literal Latin çevriyazıyla taramaya karşı satır/sayfa kontrolüyle aktarılacak. Üçüncü taraf pazar yeri görselleri veya modern sadeleştirmeler production asset olarak kullanılmayacak.',
          ingest:{
            manifest:'sources/asri-saadet-1928/manifest.json',
            auditCommand:'npm run asri:audit',
            buildCommand:'npm run asri:build',
            outputAsset:'public/data/books/asri-saadet-siyret.json',
            failClosed:true
          },
          acquisitionPlan:{
            status:'physical-originals-available',
            auditedAt:'2026-09-21',
            preferredStrategy:'buy-volumes-1-to-4-and-self-digitize',
            requiredVolumes:[1,2,3,4],
            rightsReview:{
              jurisdiction:'Türkiye',
              rule:'FSEK m.27 · ölümden itibaren 70 yıl',
              latestRelevantContributorDeathYear:1953,
              apparentPublicDomainFrom:'2024-01-01',
              commercialLaunchReviewRequired:true
            },
            currentListings:[
              {
                volume:1,
                title:'Peygamberimizin Sîreti',
                marketplace:'Kitantik',
                edition:'Amedî Matbaası · İstanbul · 1928 · 560 s.',
                url:'https://www.kitantik.com/product/Islam-Tarihi-Asr-i-Saadet-Birinci-1-Cilt-Peygamberimizin-sireti-Mevlana-Sibli-cev-Omer-Riza-Osmanlica-kitap-Ottoman-Book_1br9qfymor5m0ll1nvj',
                observedPriceTRY:645,
                access:'physical-copy-for-self-digitization'
              },
              {
                volume:2,
                title:'Peygamberimizin Risâleti ve Şahsiyeti',
                marketplace:'NadirKitap',
                edition:'Amedî Matbaası · İstanbul · 1928',
                url:'https://www.nadirkitap.com/islam-tarihi-asr-i-saadet-2-cilt-peygamberimizin-risaleti-ve-sahsiyeti-mevlana-sibli-kitap42035521.html',
                observedPriceTRY:450,
                access:'physical-copy-for-self-digitization'
              },
              {
                volume:3,
                title:'Peygamberimizin Ruhanî Hayatı',
                marketplace:'NadirKitap',
                edition:'Amedî Matbaası · İstanbul · 1928',
                url:'https://www.nadirkitap.com/kitapara.php?ara=aramayap&birincibaski=0&ceviren=&cilt=0&dil=0&eskiyeni=0&fiyat1=&fiyat2=&guzelciltli=0&hazirlayan=&imzali=0&isbn=&kategori=0&kitap_Adi=&listele=&ortakkargo=0&page=4&satici=0&siralama=&tarih1=0&tarih2=0&tip=kitap&yayin_Evi=Amedi+Matbaas%C4%B1&yayin_Yeri=&yazar=',
                observedPriceTRY:450,
                access:'physical-copy-for-self-digitization'
              },
              {
                volume:4,
                title:'Peygamberimizin Ruhanî Hayatı',
                marketplace:'NadirKitap',
                edition:'Amedî Matbaası · İstanbul · 1928',
                url:'https://www.nadirkitap.com/kitapara.php?ara=kitapdetay&birincibaski=0&ceviren=&cilt=0&dil=0&eskiyeni=0&fiyat1=&fiyat2=&guzelciltli=0&hazirlayan=&imzali=0&isbn=&kategori=3&kitap_Adi=islam+tarihi+18+cilt+takim&listele=&ortakkargo=0&page=7&satici=0&siralama=&tarih1=0&tarih2=0&tip=kitap&yayin_Evi=&yayin_Yeri=&yazar=m.asim+koksal',
                observedPriceTRY:475.97,
                access:'physical-copy-for-self-digitization'
              }
            ],
            fallbackBundle:{
              marketplace:'NadirKitap',
              title:'İslam Tarihi – Asr-ı Saadet – Sadr-ı İslam – 9 Cilt',
              edition:'1928 tarihî seri',
              observedPriceTRY:3570,
              note:'I–IV ciltleri tek alımda güvenceye almak için yedek seçenek; yalnız gerekli ciltler production taramasına alınır.'
            }
          },
          contentQualityGate:{
            status:'selected',
            approvalRequiredBeforeReady:false,
            evidence:[
              'TDV İslâm Ansiklopedisi Asr-ı Saâdet literatür maddesi',
              'TDV Ömer Rıza Doğrul maddesi'
            ],
            decision:'Akseki 1934 yerine çekirdek Seviye 3 siyeri olarak Asr-ı Saâdet seçildi; artık açık mesele eser seçimi değil, yeniden kullanılabilir kaynak taramasıdır.'
          },
          catalogRecords:[
            {
              institution:'Wikilala',
              edition:'İstanbul · 1928 · 281 sayfa görüntü · Osmanlıca PDF',
              url:'https://www.wikilala.com/kitaplar/islam-tarihi-asr-i-saadet-peygamberimizin-siyreti-281596',
              access:'discovery-only-commercial-reuse-prohibited-without-written-permission',
              productionAllowed:false
            },
            {
              institution:'Sakarya Üniversitesi Mehmet Uzun (Baboğlu) Koleksiyonu',
              inventory:'0104734',
              edition:'İstanbul · Amidi Matbaası · 1346/1928 · 1. cilt · 560 s.',
              access:'physical-copy-no-public-reusable-file-confirmed'
            },
            {
              institution:'Uludağ Üniversitesi İlahiyat Fakültesi Kütüphanesi',
              inventory:'56411/56412',
              edition:'1346/1928 · 1. cilt · Peygamberimizin sireti',
              access:'physical-copy-no-public-reusable-file-confirmed'
            }
          ],
          alternateCandidates:[
            {
              id:'akseki-peygamberimiz-1934',
              title:'Peygamberimiz Hz. Muhammed Aleyhisselâm ve Müslümanlık',
              author:'Ahmed Hamdi Akseki',
              editionYears:[1934,1955],
              status:'not-selected',
              reason:'Latin harfli ve erişilebilirlik açısından pratik olsa da güncel kalite denetiminde tarihî iddia ve pedagojik üslup endişeleri bulunduğu için çekirdek seçim yapılmadı.'
            },
            {
              id:'siyer-i-nebi-mehmed-ziya',
              title:'Siyer-i Nebî',
              author:'İhtifalci Mehmed Ziyâ',
              editionYears:[1924,1926],
              status:'fallback',
              reason:'Kamu malı güçlü ders kitabı; özgün tarihî tarama ve güvenilir literal çevriyazı gerektirir.'
            },
            {
              id:'yorukan-peygamberimiz-1926',
              title:'Peygamberimiz',
              author:'Yusuf Ziya Yörükân',
              editionYears:[1926,1927],
              status:'fallback',
              reason:'Başlangıç düzeyine uygun hacimli eser; yalnız özgün tarihî baskı kabul edilir.'
            }
          ],
          knownRejectedSources:[
            {
              label:'Wikilala 1928 Asr-ı Saâdet PDF/OCR üretim kaynağı',
              url:'https://www.wikilala.com/kitaplar/islam-tarihi-asr-i-saadet-peygamberimizin-siyreti-281596',
              reason:'Wikilala kullanım şartları yazılı izin olmadan platform içeriklerinin ticari kullanımını yasaklar; bu kayıt yalnız bibliyografik ve görsel doğrulama için kullanılabilir.'
            },
            {
              label:'Modern sadeleştirme / Latin harfli yeni baskılar',
              reason:'Modern editoryal sadeleştirme, tashih ve yeniden yazım katmanları özgün 1928 metni yerine production asset olarak kullanılamaz.'
            }
          ],
          reject:[
            'Wikilala full text copied into production without written commercial permission',
            'modern transliteration or simplification presented as the historical text',
            'academic thesis transcription as production text',
            'commercial or access-gated platform text without redistribution permission',
            'modern edited reprint without separable historical text'
          ]
        },
        rightsNote:'Şiblî Nu‘mânî (ö. 1914), Süleyman Nedvî (ö. 1953) ve mütercim Ömer Rıza Doğrul (ö. 1952) bakımından müellif/mütercim koruma süreleri sona ermiştir. Ancak production asset yalnız dijital kaynağın yeniden kullanım şartları ayrıca uygun olduğunda oluşturulacaktır.'
      },
  {
        order:7,stage:'level-4',id:'islam-fitri-tabii-umumi',title:'İslâm Fıtrî, Tabiî ve Umumî Bir Dindir',author:'Ahmed Hamdi Akseki',field:'İman · İslâm düşüncesi',level:'Seviye 4',
        readerType:'generic',availability:'ready',coverGlyph:'ف',tone:'clay',
        shortLabel:'Din · fıtrat · akıl · vahiy',
        sourceLabel:'Tarihî tarama · Internet Archive',
        asset:'public/data/books/islam-fitri-tabii-umumi.json',
        requiresEditionReview:true,
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1943,authorDeathYear:1951,
        rightsNote:'Müellifin koruma süresi sona ermiştir. Tarihî taramanın OCR aktarımı kullanılır; dizgi/OCR ve muhtemel editoryal katkılar ticari yayın öncesi insan editör tarafından karşılaştırılmalıdır.'
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
        order:9,stage:'level-5',id:'kurandan-ayetler',title:'Kur’an’dan Âyetler ve Nesirler',author:'Mehmet Âkif Ersoy · Ömer Rıza Doğrul',field:'Kur’ân · Ahlâk · Tefekkür',level:'Seviye 5',
        readerType:'generic',availability:'ready',coverGlyph:'و',tone:'ink',
        shortLabel:'Âyetler üzerinden ahlâk, sorumluluk ve şuur',
        sourceLabel:'1944 Yüksel Yayınevi tarihî taraması · Internet Archive',
        asset:'public/data/books/kurandan-ayetler.json',
        requiresEditionReview:true,
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1944,authorDeathYear:1952,
        rightsNote:'Mehmet Âkif Ersoy (ö. 1936) ile eseri toplayıp ekler ve notlarla neşreden Ömer Rıza Doğrul (ö. 1952) koruma süresi dışındadır. 1944 tarihî baskının OCR aktarımı kullanılır; OCR ve baskı kaynaklı hatalar ticari yayın öncesi insan editör tarafından taramayla karşılaştırılmalıdır.'
      },
  {
        order:10,stage:'level-5',id:'tanri-buyrugu',title:'Tanrı Buyruğu',author:'Ömer Rıza Doğrul',field:'Kur’ân · Tefsir',level:'Seviye 5',
        readerType:'generic',availability:'ready',coverGlyph:'ت',tone:'olive',
        shortLabel:'Kur’ân’ın tertibi, anlamı ve tefsir okumaları',
        sourceLabel:'1955 üçüncü baskı tarihî tarama · Internet Archive',
        asset:'public/data/books/tanri-buyrugu.json',
        requiresEditionReview:true,
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1934,authorDeathYear:1952,
        rightsNote:'Müellifin koruma süresi sona ermiştir. Okuyucu 1955 üçüncü baskının OCR aktarımını kullanır; baskıya özgü editoryal katkılar ve OCR hataları ticari yayın öncesi insan editör tarafından karşılaştırılmalıdır.'
      }
];

export const STARTER_LIBRARY_BY_ID=Object.fromEntries(STARTER_LIBRARY.map(book=>[book.id,book]));
export const starterBook=id=>STARTER_LIBRARY_BY_ID[id]||null;
export const readyStarterBooks=()=>STARTER_LIBRARY.filter(book=>book.availability==='ready');
export const pendingStarterBooks=()=>STARTER_LIBRARY.filter(book=>book.availability!=='ready');


export const starterBooksByStage=stageId=>STARTER_LIBRARY.filter(book=>book.stage===stageId);
