# Asr-ı Saâdet 1928 — üretim kaynağı

Bu klasör, Manevî Rota Seviye 3 için seçilen **İslâm Tarihi: Asr-ı Saâdet — Peygamberimizin Sîreti** eserinin üretim zincirini tanımlar.

## Kapsam

Çekirdek siyer gövdesi yalnız I–IV ciltlerdir:

1. **Peygamberimizin Sîreti** — Şiblî Nu‘mânî
2. **Peygamberimizin Risâleti ve Şahsiyeti** — Şiblî Nu‘mânî
3. **Peygamberimizin Rûhânî Hayatı** — Süleyman Nedvî
4. **Peygamberimizin Rûhânî Hayatı** — Süleyman Nedvî

Türkçe tercüme: **Ömer Rıza Doğrul**. Üretim hedefi 1928 Osmanlıca baskıdır.

V. cilt Hz. Âişe bu başlangıç reader'ının zorunlu parçası değildir.

## Kabul edilen kaynak

Tercih edilen yol:

- 1928 fizikî I–IV ciltleri temin et.
- Her cildi kendimiz tarayalım.
- Tarama PDF'lerini aşağıdaki adlarla yerleştir:
  - `raw/volume-1.pdf`
  - `raw/volume-2.pdf`
  - `raw/volume-3.pdf`
  - `raw/volume-4.pdf`
- Literal Latin aktarımı aşağıdaki dosyalara gir:
  - `transcription/volume-1.txt`
  - `transcription/volume-2.txt`
  - `transcription/volume-3.txt`
  - `transcription/volume-4.txt`

Bu raw/transcription dosyaları kaynak büyüklüğü nedeniyle normal Git geçmişine körlemesine eklenmemelidir. Önce yerel doğrulama yapılmalıdır.

## Kesinlikle yapılmayacaklar

- Wikilala PDF/OCR metnini yazılı ticari izin olmadan production asset'e kopyalamak.
- Modern sadeleştirmeyi 1928 metni gibi sunmak.
- Akademik tez çevriyazısını production metni yapmak.
- OCR çıktısını taramayla karşılaştırmadan yayımlamak.
- Dil modernizasyonu, sadeleştirme veya AI ile yeniden yazım yapmak.

## Doğrulama

Kaynaklar henüz yokken:

```bash
npm run asri:audit
```

Dört cilt ve dört aktarım hazırlandıktan sonra da aynı komut SHA-256 izlerini ve temel bütünlük durumunu raporlar.

Reader asset ancak `manifest.json` içindeki insan onayı `approved` yapıldıktan sonra:

```bash
npm run asri:build
```

ile üretilebilir.

Çıktı:

`public/data/books/asri-saadet-siyret.json`

## READY kuralı

Katalogdaki kitap şu dört koşul birlikte gerçekleşmeden `ready` yapılamaz:

1. I–IV 1928 taramaları mevcut.
2. I–IV literal Latin aktarımları mevcut.
3. Tarama ↔ aktarım insan tarafından sayfa sayfa kontrol edilmiş.
4. Son ticari yayın/hak incelemesi tamamlanmış.

