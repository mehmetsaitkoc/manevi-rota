# Manevî Rota v3.0

Manevî Rota; günlük manevî rutin, namaz/kaza takibi ve kişiselleştirilmiş **İlim Rotası**nı tek bir motorda birleştiren ürün prototipidir.

## Şu an çalışan çekirdek

- doğrudan sorularla onboarding ve kişi analizi
- sürdürülebilir günlük rota motoru
- rutin hafızası, kapasite ve zamanlama öğrenimi
- müdahale sonucu öğrenimi
- Yolculuk Durumu ve özel rozetler
- Namaz Merkezi + kaza takibi
- Kırk Hadis: 42 ünite, Arapça kaynak katmanı, özgün Türkçe tercümeler
- not, vurgu, İlim Defteri
- 3/7 günlük aktif geri çağırma ve İlim Hafızası

> Not: Hadis tercümeleri yayın öncesi ehil bir hadis/ilahiyat editörü tarafından tashih edilmelidir. Namaz vakitlerinde prototip servis kullanılmaktadır; üretimde resmî/izinli sağlayıcıya geçilecektir.

## Yerelde çalıştırma

```bash
npm test
npm start
```

Sonra `http://localhost:3000` adresini aç.

Sağlık kontrolü: `GET /healthz`

## Render

Repo kökündeki `render.yaml` Render Blueprint için hazırdır.

1. Bu klasörü yeni bir GitHub reposuna yükle (`manevi-rota`).
2. Render → **New +** → **Blueprint**.
3. GitHub reposunu seç.
4. `render.yaml` otomatik olarak build/start/health-check ayarlarını kurar.

Build sırasında tüm motor testleri çalışır. Testlerden biri bozulursa deploy başarısız olur; böylece canlıya hatalı rota motoru gönderilmez.

## Mimari

- `public/` — kullanıcı arayüzü
- `src/route-engine.mjs` — ana kişiselleştirme motoru
- `src/ilim-engine.mjs` — İlim Rotası ve okuma adaptasyonu
- `src/kirk-hadis.mjs` — Kırk Hadis içerik/öğrenme katmanı
- `src/prayer-center.mjs` — namaz/kaza veri modeli
- `scripts/` — regresyon, sentetik profil ve uzun dönem simülasyonları
- `server.mjs` — Render uyumlu Node statik sunucu

## Ürün ilkesi

Kalite > özellik sayısı. Sistem ibadet veya maneviyatı puanlamaz; kullanıcının kendi hedeflerine göre sürdürülebilir düzen ve ilim yolculuğu kurmasına yardımcı olur.
