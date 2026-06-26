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
1. Uygulamayı açın, üst bardaki **📊 E-Tablo** ile veritabanı e-tablosunu açın
   (`Cariler`, `Dosyalar`, `Hareketler`, `Ayarlar` sayfaları vardır).
2. Alttan **Cariler** sekmesine geçin → **Dosya → İçe aktar → Yükle** →
   `Cariler.csv` seçin.
3. İçe aktarma ayarları:
   - İçe aktarma konumu: **Geçerli sayfayı değiştir**
   - Ayırıcı türü: **Algıla** (veya Virgül)
   - **“Metni sayılara, tarihlere ve formüllere dönüştür” seçeneğinin işaretini KALDIRIN**
     (sayı/tarih biçimleri bozulmasın diye) → **Verileri içe aktar**.
4. Aynısını **Dosyalar** sekmesinde `Dosyalar.csv`, **Hareketler** sekmesinde
   `Hareketler.csv` ile yapın (her seferinde doğru sekmede olun).
5. Web uygulamasını yenileyin; 499 cari, 620 dava, tüm hareketler/ekstreler gelir.

> Notlar:
> - CSV'ler UTF-8 (BOM); Türkçe karakterler doğru gelir.
> - Tutarlar Türk biçiminde (örn. `400,00`) yazıldı; uygulama bunları doğru okur.
> - `Ayarlar` sayfasına dokunmayın (dava türleri/avukatlar orada).
