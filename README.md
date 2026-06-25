# Teminat Group — Dava & Muhasebe Web Uygulaması

Google Apps Script + Google E-Tablolar üzerine kurulu, tek kullanıcılı **dava takip
ve muhasebe** web uygulaması. Müvekkil dosyalarını, dava türlerini ve aşamalarını
yönetir; gelir/gider hareketlerini kaydeder ve her muhasebe hareketinde ilgili
dosyanın finans özetlerini (tahsilat, kalan bakiye, gider, net kâr) otomatik günceller.

## ⚡ Hızlı deneme (Apps Script GEREKMEZ)

Kurulumla uğraşmadan tüm uygulamayı denemek için: **`demo.html`** dosyasını
indirip tarayıcıda (Chrome/Edge) **çift tıklayarak açın**. Veriler tarayıcının
yerel belleğinde tutulur; dosya ekleme, muhasebe, otomatik hesaplama, örnek veri
ve sıfırlama dahil her şey birebir çalışır. Beğenince aşağıdaki adımlarla gerçek
sürümü (Apps Script + E-Tablo) bir kez kurarsınız — kod aynıdır.

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
3. **Dosya ekle → HTML** ile **`Index`** adında TEK bir HTML dosyası oluşturup
   bu repodaki `Index.html` içeriğini yapıştırın. (Dosya adı tam olarak `Index`
   olmalı; CSS ve JavaScript bu dosyanın içinde gömülüdür, ayrı dosya gerekmez.)
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
| `Index.html` | Tüm arayüz (HTML + CSS + JavaScript tek dosyada) |
| `appsscript.json` | Manifest (zaman dilimi: Europe/Istanbul, web app ayarları) |
| `demo.html` | Apps Script gerektirmeyen, tarayıcıda çalışan deneme sürümü (localStorage) |

## Notlar

- Uygulama **tek kullanıcı** için tasarlandı; giriş/rol sistemi yoktur. Erişim,
  web app dağıtımındaki "Yalnızca ben" ayarıyla korunur.
- Dava türleri/aşamalar/kategoriler `Ayarlar` sayfasından özelleştirilebilir.
- `recalcAll()` fonksiyonu (editörden çalıştırılır) tüm dosyaların finans
  özetlerini elle yeniden hesaplar — bakım amaçlı.
- **Örnek veri:** Üst bardaki **🧪 Örnek Veri** butonu deneme için 6 dosya ve 10
  muhasebe hareketi ekler. Aynısı editörden `seedSampleData()` ile de çalıştırılabilir.
  Denemeyi bitirince bu kayıtları arayüzden silebilir veya E-Tablo'daki satırları
  temizleyebilirsiniz.
