# İçe Aktarılan Veriler — LAW Bilirkişilik (Veresiye Yedeği 25.06.2026)

Bu klasör, yüklediğiniz Excel yedeğindeki tüm verilerin sistem şemasına
dönüştürülmüş halidir.

| Dosya | İçerik |
|-------|--------|
| `veri.json` | 499 cari + 620 dava + 4.106 hareket (uygulamanın iç formatı) |
| `Cariler.csv` | Cariler sayfası için (10 sütun: CariNo, Unvan, …) |
| `Dosyalar.csv` | Dosyalar sayfası için (12 sütun: DosyaNo, …, Avukat, …) |
| `Hareketler.csv` | Hareketler sayfası için (11 sütun; DosyaNo'lar dolduruldu) |

## Otomatik açılan davalar

Hareket açıklamalarındaki dava türü ipuçlarından (DK/değer kaybı, HM/hak
mahrumiyeti, HF/hasar farkı, DASK, ayıplı, tüketici) ve dava/plaka/dosya-no
içeren kayıtlardan **620 dava otomatik açıldı** ve ilgili 1.210 hareket
davalara bağlandı:

- Değer Kaybı 215, Hak Mahrumiyeti 119, Diğer 205, DASK 37, Hasar Farkı 31,
  Tüketici 7, Ayıplı 6.
- **Bakiyesi sıfır olan cariler** (kapanmış işler) davaları **“Kapandı”**
  aşamasında açıldı (183 dava); diğerleri **“Başvuru Yapıldı”** (437 dava).
- Avukat alanı boş bırakıldı (kendi avukatlarınızı sonradan atayabilirsiniz);
  karşı taraf yalnızca DASK davalarında “DASK” olarak dolduruldu.

## Veri eşlemesi (önemli)

Eski programınızda **Bakiye = Borç − Alacak** ve **negatif bakiye = müşteri size
borçlu** anlamındaydı. Bu uygulamada **pozitif bakiye = cari size borçlu**. Bu
yüzden kolonlar şöyle eşlendi (her cari bakiyesi birebir korunur):

- Eski **Alacak** (Alacak Dekontu / hizmet-rapor bedeli, Tahsilat) → bu sistemde **Borç** (cari size borçlandı)
- Eski **Borç** (Borç Dekontu, Ödeme) → bu sistemde **Alacak** (kapatma/ödeme)
- `Kategori` alanına eski **Hareket Türü** (Alacak Dekontu, Borç Dekontu, Tahsilat, Ödeme) yazıldı.
- Plaka, yetkili/avukat, il/ilçe gibi ek bilgiler carinin **Notlar** alanına eklendi.

Doğrulama: 499 carinin **tamamında** bakiye eski kartlarla bire bir tutuyor.
(Sadece eski yedekteki isimsiz 1 açılış kaydı = 3.012 ₺ aktarılmadı; bağlanacağı
cari adı yoktu.)

## Hemen görmek için (kurulum gerekmez)
Kök dizindeki **`teminat-verilerim.html`** dosyasını indirip tarayıcıda açın —
499 cari ve tüm hareketler/ekstreler önceden yüklü gelir.

## Gerçek sisteme (Google E-Tablo) aktarma
1. Uygulamayı Apps Script olarak kurun (kök `README.md`). İlk açılışta
   `Cariler`, `Hareketler`, `Dosyalar`, `Ayarlar` sayfaları oluşur.
2. Google E-Tablo'da **Cariler** sayfasını açın → **Dosya → İçe aktar →
   Yükle** → `Cariler.csv` → İçe aktarma konumu: **Geçerli sayfaya ekle** →
   İçe aktar. Sonra eklenen tek fazladan başlık satırını silin.
3. Aynısını **Hareketler** sayfasında `Hareketler.csv` ile yapın.
4. Uygulamayı yenileyin; tüm cariler, bakiyeler ve ekstreler görünür.

> Not: CSV'ler UTF-8 (BOM) kodlamasındadır; Türkçe karakterler doğru gelir.
