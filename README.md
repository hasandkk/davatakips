# Teminat Group — Dava & Muhasebe Web Uygulaması

Google Apps Script + Google E-Tablolar üzerine kurulu, tek kullanıcılı **dava takip
ve muhasebe** web uygulaması. Müvekkil dosyalarını, dava türlerini ve aşamalarını
yönetir; gelir/gider hareketlerini kaydeder ve her muhasebe hareketinde ilgili
dosyanın finans özetlerini (tahsilat, kalan bakiye, gider, net kâr) otomatik günceller.

## Özellikler

- **📈 Özet panosu:** toplam dosya/açık dosya, toplam gelir-gider-net kâr, toplam
  alacak, dava türü ve aşama dağılımları, son hareketler.
- **📁 Dosya yönetimi:** müvekkil bilgileri, dava türü, aşama, karşı taraf/sigorta,
  tazminat talebi, anlaşılan ücret. Arama ve tür/aşama filtreleri. Dosya detayında
  ilgili tüm muhasebe hareketleri listelenir.
- **💰 Muhasebe modülü:** gelir/gider hareketleri, kategori ve ödeme yöntemi,
  dosyaya bağlama (masraf-dosya eşleştirme). Dosyaya bağlanan her hareket dosyanın
  finansını otomatik günceller.
- **Veritabanı = Google E-Tablo:** veriler `Dosyalar`, `Muhasebe`, `Ayarlar`
  sayfalarında tutulur. Uygulama ilk açılışta e-tabloyu otomatik oluşturur.

## Dava Türleri (varsayılan)
Değer Kaybı · Hak Mahrumiyeti · Hasar Farkı · Kazanç Kaybı · DASK · Ayıplı Mal ·
Tüketici Hakem Heyeti · Diğer

> Türleri, aşamaları ve kategorileri değiştirmek için oluşturulan e-tablodaki
> **Ayarlar** sayfasını düzenlemeniz yeterli — uygulama yeniden yüklenince listeler güncellenir.

## Kurulum (Apps Script editörü ile — en kolay)

1. https://script.google.com → **Yeni proje**.
2. `Code.gs` içeriğini editördeki `Code.gs` dosyasına yapıştırın.
3. **Dosya ekle → HTML** ile `Index`, `Stylesheet`, `JavaScript` adında üç HTML
   dosyası oluşturup bu repodaki ilgili `.html` içeriklerini yapıştırın.
   (Dosya adları tam olarak `Index`, `Stylesheet`, `JavaScript` olmalı.)
4. Proje ayarlarından `appsscript.json`'ı bu repodaki ile değiştirin
   (Ayarlar → "appsscript.json manifest dosyasını editörde göster" işaretli olmalı).
5. **Dağıt → Yeni dağıtım → Web uygulaması** seçin.
   - Yürütme: **Beni (kendi hesabınız)**
   - Erişim: **Yalnızca ben**
6. İlk açılışta izinleri onaylayın. Uygulama veritabanı e-tablosunu otomatik oluşturur;
   e-tabloya üst bardaki **📊 E-Tablo** bağlantısından ulaşabilirsiniz.

## Kurulum (clasp ile)

```bash
npm install -g @google/clasp
clasp login
clasp create --type webapp --title "Teminat Group - Dava & Muhasebe"
# .clasp.json otomatik oluşur. Ardından:
clasp push
clasp deploy
```

> `clasp create` çalıştırınca üretilen `.clasp.json` içindeki `scriptId`'yi
> kullanın. Bu repodaki `.clasp.json.example` yalnızca örnektir.

## Dosya yapısı

| Dosya | Açıklama |
|-------|----------|
| `Code.gs` | Backend: veritabanı kurulumu, CRUD, finans yeniden hesaplama, dashboard |
| `Index.html` | Arayüz iskeleti (sekmeler, tablolar, modallar) |
| `Stylesheet.html` | Tüm CSS |
| `JavaScript.html` | İstemci mantığı (`google.script.run` çağrıları) |
| `appsscript.json` | Manifest (zaman dilimi: Europe/Istanbul, web app ayarları) |

## Notlar

- Uygulama **tek kullanıcı** için tasarlandı; giriş/rol sistemi yoktur. Erişim,
  web app dağıtımındaki "Yalnızca ben" ayarıyla korunur.
- Dava türleri/aşamalar/kategoriler `Ayarlar` sayfasından özelleştirilebilir.
- `recalcAll()` fonksiyonu (editörden çalıştırılır) tüm dosyaların finans
  özetlerini elle yeniden hesaplar — bakım amaçlı.
