export const CONTENT_RIGHTS_REGISTRY={
  'ilim-yoluna-giris-demo':{
    workId:'ilim-yoluna-giris-demo',
    title:'İlim Yoluna Giriş',
    author:'Manevî Rota Demo İçeriği',
    rightsStatus:'owned-demo',
    fullTextAllowed:true,
    highlightAllowed:true,
    noteAllowed:true,
    audioAllowed:false,
    source:'Manevî Rota için özgün olarak hazırlanmış demo metin',
    licenseNote:'Bu demo metin üçüncü taraf bir kitaptan alınmamıştır.',
    lastChecked:'2026-09-19'
  }
};

const P=(id,page,text)=>({id,page,text});

export const ILIM_BOOKS={
  'ilim-yoluna-giris-demo':{
    id:'ilim-yoluna-giris-demo',
    title:'İlim Yoluna Giriş',
    subtitle:'Okumayı alışkanlıktan birikime dönüştüren başlangıç yolu',
    author:'Manevî Rota',
    level:'Başlangıç',
    field:'Temel ilim adabı',
    estimatedPages:12,
    coverIcon:'📘',
    rightsId:'ilim-yoluna-giris-demo',
    description:'Bu kısa demo eser, İlim Rotası okuyucu deneyimini test etmek için özgün hazırlanmıştır. Amaç çok okumak değil; anlayarak, not alarak ve tekrar ederek sağlam bir düzen kurmaktır.',
    chapters:[
      {id:'c1',title:'1. Niyet ve istikamet',paras:[
        P('p1',1,'İlim yolculuğunun ilk meselesi hız değil, istikamettir. İnsan neden okuduğunu bilmediğinde çok sayfa çevirebilir; fakat okudukları zihninde dağınık kalabilir. Bu yüzden başlangıçta küçük fakat açık bir maksat belirlemek faydalıdır.'),
        P('p2',1,'Bir kitabı bitirmek tek başına hedef değildir. Asıl hedef, okunan fikri anlayabilmek, gerektiğinde hatırlayabilmek ve hayatın doğru yerinde kullanabilmektir. Okuma planı bu nedenle yalnız sayfa sayısını değil, düşünme ve tekrar payını da hesaba katmalıdır.'),
        P('p3',2,'Düzen kurarken en büyük hata, ilk günkü heyecanı sürekli kapasite sanmaktır. Sürdürülebilir bir ilim yolu, insanın normal gününde de devam ettirebildiği ölçü üzerine kurulmalıdır.'),
        P('p4',2,'Az ama düzenli okuma, düzensiz ve ağır okumadan daha iyi bir temel oluşturabilir. Motorun ilk görevi seni zorlamak değil, hangi dozun gerçekten sürdürülebildiğini öğrenmektir.')
      ]},
      {id:'c2',title:'2. Okumanın adabı',paras:[
        P('p5',3,'Metne aceleyle saldırmak yerine önce başlığa, bölümün sorusuna ve ana kavramlarına bakmak zihni hazırlar. Böylece okurken ayrıntılar daha anlamlı bir çerçeveye yerleşir.'),
        P('p6',3,'Her cümlenin altını çizmek, hiçbir şeyin altını çizmemeye dönüşür. Vurgu; şaşırtan, ana fikri taşıyan, tekrar edilmesi gereken veya başka bir bilgiyle bağlantı kuran yerlere ayrılmalıdır.'),
        P('p7',4,'Bir paragraf zor geldiyse hemen hızlandırmak yerine kısa bir duraklama yapmak daha verimlidir. Kendi cümlenle “Burada ne söylendi?” sorusuna cevap verebiliyorsan metin zihninde işlenmeye başlamış demektir.'),
        P('p8',4,'Okuma sırasında anlaşılmayan her ayrıntının peşine düşmek akışı bozabilir. Bazı soruları “araştırılacaklar” listesine bırakmak, hem merakı korur hem de ana metnin bütünlüğünü kaybetmeyi önler.')
      ]},
      {id:'c3',title:'3. Not almak ve düşünmek',paras:[
        P('p9',5,'İyi not, kitabın kopyası değildir. En faydalı not çoğu zaman kısa bir soru, bir bağlantı, bir itiraz veya kendi cümlenle yazılmış bir sonuçtur.'),
        P('p10',5,'Notu metnin tam yanına bağlamak önemlidir. Günler sonra yalnız notu değil, hangi cümle üzerine düşündüğünü de görebilmek zihinsel bağlamı geri getirir.'),
        P('p11',6,'“Bunu biliyorum” hissi ile gerçekten hatırlayabilmek aynı şey değildir. Okumadan sonra metni kapatıp bir veya iki ana fikri hatırlamaya çalışmak, pasif aşinalık ile gerçek öğrenmeyi ayırır.'),
        P('p12',6,'İlim Defteri, biriktirilmiş cümle deposu değil; zamanla oluşan kişisel bir düşünce haritası olmalıdır. Bu nedenle notlara konu etiketi, soru ve tekrar tarihi eklemek değerlidir.')
      ]},
      {id:'c4',title:'4. Tekrar ve hafıza',paras:[
        P('p13',7,'Unutmak başarısızlık değil, öğrenmenin doğal parçasıdır. Problem unutmak değil; önemli bilgiyi hiç geri çağırmamaktır. Tekrar sistemi, bütün kitabı baştan okutmak yerine seçilmiş işaretleri doğru zamanda önüne getirmelidir.'),
        P('p14',7,'İlk tekrar kısa olmalıdır. Birkaç gün sonra yalnız önemli vurgulara ve kendi notlarına dönmek, bütün bölümü yeniden okumaktan daha ekonomik olabilir.'),
        P('p15',8,'Bir not tekrar tekrar anlamlı geliyorsa onu daha uzun aralıklara taşımak mümkündür. Zor hatırlanan veya yeni bağlantılar doğuran notlar ise daha yakın zamanda yeniden görülebilir.'),
        P('p16',8,'Tekrarın amacı ezber baskısı kurmak değil, zihinsel yolları açık tutmaktır. Bazı bilgiler yalnız tanınacak kadar, bazıları ise açıklanabilecek kadar güçlü tutulmalıdır.')
      ]},
      {id:'c5',title:'5. Kaynak ve seviye',paras:[
        P('p17',9,'Her faydalı kitap her başlangıç seviyesine uygun değildir. Zor bir eseri erken okumak bazen kişiye yetersizlik hissi verir; oysa problem kapasite değil, sıralama olabilir.'),
        P('p18',9,'İlim Rotası bu nedenle yalnız “ne okuyacaksın?” sorusunu değil, “hangi sırayla okuyacaksın?” sorusunu da önemser. Bir sonraki eser, önceki temelin üzerine anlamlı biçimde oturmalıdır.'),
        P('p19',10,'Dinî içerikte kaynak güvenilirliği ayrıca önemlidir. Uygulama içinde tam metin gösterilecek eserlerin telif ve lisans durumu ayrı, ilmî uygunluğu ayrı değerlendirilmelidir.'),
        P('p20',10,'Bir kitabın uygulamada bulunması, her cümlesinin otomatik olarak güvenilir veya bağlamdan bağımsız kullanılabilir olduğu anlamına gelmez. Kütüphane; kaynak künyesi, seviye bilgisi ve gerektiğinde editoryal açıklama taşımalıdır.')
      ]},
      {id:'c6',title:'6. Yolculuğu büyütmek',paras:[
        P('p21',11,'İlk haftaların hedefi mümkün olduğunca fazla alan açmak değil, okuma davranışını sağlamlaştırmaktır. Düzen doğrulandıktan sonra yeni alanlar ve daha zor metinler kontrollü biçimde eklenebilir.'),
        P('p22',11,'Bir insan bazı günler on dakika, bazı günler kırk dakika okuyabilir. İyi plan, en güçlü güne göre değil; uzun vadede tekrar edilebilen kapasiteye göre büyür.'),
        P('p23',12,'Zamanla altı çizilen yerler, notlar ve tekrar sonuçları kişinin hangi alanlara ilgi duyduğunu da gösterebilir. Bu veri bir “ilim puanı” üretmek için değil, bir sonraki okuma yolunu daha isabetli seçmek için kullanılmalıdır.'),
        P('p24',12,'İlim yolculuğunun kaliteli olması, uygulamadaki özellik sayısından daha önemlidir. Bir kitap üzerinde gerçekten okuyabilmek, düşünebilmek, not alabilmek ve geri dönebilmek; yüzlerce başlık arasında kaybolmaktan daha değerlidir.')
      ]}
    ]
  }
};

export function getBook(id){return ILIM_BOOKS[id]||null}
export function bookParagraphs(book){return (book?.chapters||[]).flatMap(ch=>ch.paras.map(p=>({...p,chapterId:ch.id,chapterTitle:ch.title}))) }
export function paragraphIndex(book,paraId){return bookParagraphs(book).findIndex(p=>p.id===paraId)}
export function bookWordCount(book){return bookParagraphs(book).reduce((n,p)=>n+p.text.trim().split(/\s+/).filter(Boolean).length,0)}
