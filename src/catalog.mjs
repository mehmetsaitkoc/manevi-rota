export const TIME_SLOTS={
  morning:{id:'morning',label:'Sabah',icon:'🌅',order:1},
  after_noon:{id:'after_noon',label:'Öğle sonrası',icon:'☀️',order:2},
  evening:{id:'evening',label:'Akşam',icon:'🌆',order:3},
  after_isha:{id:'after_isha',label:'Yatsı sonrası',icon:'🌙',order:4}
};

export const TASK_CATALOG={
  quran:{id:'quran',icon:'📖',title:'Kur’an',base:6,min:3,max:12,cognitive:1,calm:3,portable:3,defaultSlot:'morning',allowedSlots:['morning','evening','after_isha'],description:'Kısa okuma veya dinleme bölümü.',methods:{micro:'3–4 dakikalık kısa bölüm',normal:'6 dakikalık düzenli bölüm',deep:'10–12 dakikalık daha uzun bölüm'}},
  meal:{id:'meal',icon:'💭',title:'Meal & tefekkür',base:5,min:3,max:10,cognitive:2,calm:2,portable:2,defaultSlot:'after_noon',allowedSlots:['after_noon','evening','morning'],description:'Az miktarda anlam okuması ve kısa düşünme.',methods:{micro:'1–2 ayetin mealine odaklan',normal:'Kısa bir bölüm oku ve tek not çıkar',deep:'Bölümü oku, bir ana fikir not et'}},
  reading:{id:'reading',icon:'📚',title:'Okuma',base:7,min:4,max:14,cognitive:2,calm:2,portable:2,defaultSlot:'evening',allowedSlots:['evening','after_isha','morning'],description:'Seçtiğin güvenilir eserden kısa bölüm.',methods:{micro:'2–3 sayfa',normal:'5–7 sayfa',deep:'10+ sayfa ve tek cümle not'}},
  dua:{id:'dua',icon:'🤲',title:'Dua / tesbihat',base:4,min:3,max:8,cognitive:0,calm:4,portable:4,defaultSlot:'after_isha',allowedSlots:['after_isha','morning','evening'],description:'Kısa ve sakin bir dua/tesbihat bölümü.',methods:{micro:'3 dakikalık kısa bölüm',normal:'4–5 dakikalık bölüm',deep:'6–8 dakikalık sakin bölüm'}},
  learning:{id:'learning',icon:'🎓',title:'Öğrenme',base:8,min:5,max:15,cognitive:3,calm:1,portable:1,defaultSlot:'evening',allowedSlots:['evening','after_noon','morning'],description:'İlmihal, siyer veya hadis alanından küçük bir konu.',methods:{micro:'Tek kavram + 1 not',normal:'Kısa ders + 2 hatırlama sorusu',deep:'Ders + kısa aktif hatırlama'}},
  akhlaq:{id:'akhlaq',icon:'❤️',title:'Davranış hedefi',base:3,min:2,max:5,cognitive:1,calm:2,portable:4,defaultSlot:'after_isha',allowedSlots:['after_isha','evening','after_noon'],description:'Bugün uygulanabilir tek bir güzel davranış hedefi.',methods:{micro:'Tek küçük davranış',normal:'Tek davranış + akşam kısa değerlendirme',deep:'Tek davranış + kısa not'}},
  prayerPlan:{id:'prayerPlan',icon:'🕌',title:'Namaz planı',base:2,min:2,max:3,cognitive:0,calm:3,portable:4,defaultSlot:'morning',allowedSlots:['morning','after_noon'],description:'Vakitlerini gözden geçir; ibadeti puanlamadan gününü planla.',methods:{micro:'Bugünün vakitlerini gözden geçir',normal:'Vakitleri ve uygun molaları planla',deep:'Vakit planı + gün sonunda kişisel not'}}
};

export const PRIORITY_IDS=['quran','meal','reading','dua','learning','akhlaq'];
