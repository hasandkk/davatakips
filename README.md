# Teminat Group — Cari, Dava & Muhasebe Web Uygulaması

Google Apps Script + Google E-Tablolar üzerine kurulu, tek kullanıcılı **cari hesap,
dava takip ve muhasebe** web uygulaması. Kişi/firma cari hesaplarını (Borç/Alacak
ekstresi), davaları ve cari hareketlerini yönetir. Tüm modüller tek veri kaynağını
paylaşır: bir cariye girilen ve bir davaya işaretlenen hareket, hem cari ekstresinde
hem de o davanın ekranında otomatik görünür.

## ⚡ Hızlı deneme (Apps Script GEREKMEZ)

Kurulumla uğraşmadan tüm uygulamayı denemek için: **`demo.html`** dosyasını
indirip tarayıcıda (Chrome/Edge) **çift tıklayarak açın**. Veriler tarayıcının
yerel belleğinde tutulur; dosya ekleme, muhasebe, otomatik hesaplama, örnek veri
ve sıfırlama dahil her şey birebir çalışır. Beğenince aşağıdaki adımlarla gerçek
sürümü (Apps Script + E-Tablo) bir kez kurarsınız — kod aynıdır.

## Modüller

- **📈 Özet:** toplam cari, açık dava, toplam tahsilat/borçlandırma, net alacak/borç,
  dava türü dağılımı, en yüksek bakiyeli cariler, son hareketler.
- **👥 Cariler (cari + muhasebe):** kişi/firma ekleme; her cari için **Borç/Alacak
  ekstresi** ve yürüyen bakiye. Cari detayında hareket ekleme, bağlı davalar listesi
  ve **yazdırılabilir/indirilebilir cari dokümanı (ekstre)**.
- **📁 Davalar:** her dava bir cariye (müvekkile) bağlıdır. Dava türü, aşama, karşı
  taraf, tazminat talebi, anlaşılan ücret. Dava detayında o davaya bağlı hareketler
  (tahakkuk / tahsilat / kalan) ve carinin genel bakiyesi görünür.
- **💰 Muhasebe:** tüm cari hareketleri (filtre: cari, yön, arama) + kişi bazında
  cari özet tablosu; her satırdan tek tıkla **ekstre indir**.
- **Cari hareket = Borç / Alacak:** *Borçlandırma* (cari size borçlanır: vekalet
  ücreti, masraf yansıtma) ve *Tahsilat* (ödeme aldınız). Bakiye = Açılış + ΣBorç − ΣAlacak.
- **Veritabanı = Google E-Tablo:** veriler `Cariler`, `Dosyalar`, `Hareketler`,
  `Ayarlar` sayfalarında tutulur. Uygulama ilk açılışta e-tabloyu otomatik oluşturur.

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
- Dava türleri/aşamalar/cari tipleri/kategoriler `Ayarlar` sayfasından özelleştirilebilir.
- Bakiye, dava finansları ve gösterge paneli ham verilerden **istemcide** hesaplanır;
  sunucu yalnızca ham satırları saklar (ayrı bir yeniden hesaplama adımı gerekmez).
- **Örnek veri:** Üst bardaki **🧪 Örnek Veri** butonu deneme için 6 cari, 4 dava ve
  10 hareket ekler. Aynısı editörden `seedSampleData()` ile de çalıştırılabilir.
