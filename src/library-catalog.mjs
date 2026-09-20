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
        order:6,stage:'level-3',id:'peygamberimiz-muhammed',title:'Peygamberimiz Hz. Muhammed Aleyhisselâm ve Müslümanlık',author:'Ahmed Hamdi Akseki',field:'Siyer · Sünnet · Ahlâk',level:'Seviye 3',
        readerType:'generic',availability:'source-verified',coverGlyph:'ص',tone:'burgundy',
        shortLabel:'Hz. Peygamber’in hayatı · tebliğ · örneklik · kıssadan hisse',
        sourceLabel:'1934 İdeal Matbaası ilk baskı doğrulandı · yeniden kullanımı uygun tam tarama bekleniyor',
        rightsStatus:'public-domain-turkey-author-term',
        originalYear:1934,authorDeathYear:1951,
        sourceGate:{
          status:'waiting-reusable-historical-scan',
          acceptedEditionYears:[1934],
          preferredScript:'latin',
          selectionReason:'Tam siyer hacmi, öğretici tarih yaklaşımı ve Latin harfli Cumhuriyet dönemi baskısı nedeniyle birinci üretim adayıdır.',
          catalogRecords:[
            {
              institution:'Uludağ Üniversitesi İlahiyat Fakültesi Kütüphanesi',
              callNumber:'297.92 AKS.P',
              inventory:'09768',
              edition:'Ankara · İdeal Matbaası · 1934',
              access:'physical-copy-no-public-reusable-file-confirmed'
            }
          ],
          fallbackCandidates:[
            {
              id:'siyer-i-nebi-mehmed-ziya',
              title:'Siyer-i Nebî',
              author:'İhtifalci Mehmed Ziyâ',
              editionYears:[1924,1926],
              note:'Kamu malı güçlü tam siyer; Osmanlı harfli nüsha nedeniyle üretim için güvenilir literal çevriyazı ve tarama karşılaştırması gerekir.'
            },
            {
              id:'yorukan-peygamberimiz-1926',
              title:'Peygamberimiz',
              author:'Yusuf Ziya Yörükân',
              editionYears:[1926,1927],
              note:'Hacimli başlangıç siyeri; yalnız özgün tarihî baskı kabul edilir, modern sadeleştirme kabul edilmez.'
            }
          ],
          knownRejectedSources:[
            {
              label:'KSÜ SAMER Yörükân sadeleştirmesi',
              url:'https://siyerinebi.ksu.edu.tr/depo/belgeler/64-%20Yusuf%20Ziy%C3%A2%20-%20Peygamberimiz%20(Sadele%C5%9Ftiren%20Merve%20Kantaro%C4%9Flu)_2102231654141093.pdf',
              reason:'Modern sadeleştirme; cümle dizimi ve kelimeler editoryal olarak değiştirilmiştir.'
            },
            {
              label:'Wikilala Mehmed Ziyâ tam metin erişimi',
              url:'https://www.wikilala.com/kitaplar/siyer-i-nebi-liselerin-birinci-devre-ikinci-siniflari-ile-kiz-ve-erkek-muallimleri-icin-en-son-tertib-olunan-programa-tevfikten-kaleme-alinmistir-265649',
              reason:'Production için ticari yeniden kullanım izni doğrulanmamıştır.'
            }
          ],
          reject:[
            'modern transliteration or simplification presented as the historical text',
            'academic thesis transcription as production text',
            'commercial or access-gated platform text without redistribution permission',
            'modern edited reprint without separable author text'
          ]
        },
        rightsNote:'Müellif koruma süresi dışındadır. Reader yalnız kaynak kimliği ve yeniden kullanım hakkı doğrulanmış 1934 tarihî baskıdan veya aynı müellif metnini editoryal katkıdan ayırabildiğimiz kurumsal bir dijital nüshadan üretilecektir.'
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
