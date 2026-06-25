/**
 * Teminat Group - Dava & Muhasebe Web Uygulaması
 * ------------------------------------------------
 * Google E-Tablolar'ı veritabanı olarak kullanan, tek kullanıcılı
 * dava takip + muhasebe web uygulaması.
 *
 * Mimari:
 *   - "Dosyalar"  sayfası: dava/dosya kayıtları (müvekkil, dava türü, aşama, finans özetleri)
 *   - "Muhasebe"  sayfası: gelir/gider hareketleri (dosyaya bağlanabilir)
 *   - "Ayarlar"   sayfası: dava türleri, dosya aşamaları, kategoriler
 *
 * Bir muhasebe hareketi eklendiğinde / silindiğinde ilgili dosyanın
 * finans özetleri (Tahsil Edilen, Kalan Bakiye, Toplam Gider, Net Kâr)
 * otomatik olarak yeniden hesaplanır.
 */

/* ============================ SABİTLER ============================ */

var SPREADSHEET_NAME = 'Teminat Group - Dava & Muhasebe Veritabanı';
var PROP_SHEET_ID = 'TEMINAT_DB_ID';

var SHEET_DOSYALAR = 'Dosyalar';
var SHEET_MUHASEBE = 'Muhasebe';
var SHEET_AYARLAR  = 'Ayarlar';

var DOSYA_HEADERS = [
  'DosyaNo', 'AcilisTarihi', 'MuvekkilAd', 'Telefon', 'TC',
  'DavaTuru', 'KarsiTaraf', 'Asama', 'TazminatTalebi', 'AnlasilanUcret',
  'TahsilEdilen', 'KalanBakiye', 'ToplamGider', 'NetKar', 'Aciklama', 'SonGuncelleme'
];

var MUHASEBE_HEADERS = [
  'IslemID', 'Tarih', 'DosyaNo', 'Tur', 'Kategori',
  'Tutar', 'OdemeYontemi', 'Aciklama', 'KayitTarihi'
];

// Varsayılan ayarlar (Ayarlar sayfası boşsa bunlar kullanılır)
var DEFAULT_DAVA_TURLERI = [
  'Değer Kaybı', 'Hak Mahrumiyeti', 'Hasar Farkı', 'Kazanç Kaybı',
  'DASK', 'Ayıplı Mal', 'Tüketici Hakem Heyeti', 'Diğer'
];
var DEFAULT_ASAMALAR = [
  'Yeni Başvuru', 'Evrak Toplama', 'Başvuru Yapıldı', 'Dava Açıldı',
  'Bilirkişi', 'Karar Bekleniyor', 'Karar Çıktı', 'Tahsilat', 'Kapandı', 'Reddedildi'
];
var DEFAULT_GELIR_KAT = ['Avans', 'Tahsilat', 'Vekalet Ücreti', 'Diğer Gelir'];
var DEFAULT_GIDER_KAT = ['Mahkeme Harcı', 'Bilirkişi Ücreti', 'Posta/Tebligat', 'Yol/Ulaşım', 'Danışmanlık', 'Ofis Gideri', 'Diğer Gider'];
var DEFAULT_ODEME = ['Nakit', 'Havale/EFT', 'Kredi Kartı', 'Çek'];

/* ============================ WEB APP ============================ */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Teminat Group | Dava & Muhasebe')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://www.google.com/images/icons/product/sheets-32.png');
}

/* ====================== VERİTABANI KURULUMU ====================== */

/**
 * Veritabanı e-tablosunu döndürür; yoksa oluşturur ve Script Properties'e
 * ID'sini kaydeder. İlk çalıştırmada otomatik olarak başlık satırlarını yazar.
 */
function getDB_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_SHEET_ID);
  var ss = null;

  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    props.setProperty(PROP_SHEET_ID, ss.getId());
  }
  ensureSheets_(ss);
  return ss;
}

function ensureSheets_(ss) {
  // Varsayılan "Sayfa1" varsa ve boşsa temizlik için bırakıyoruz.
  ensureSheetWithHeaders_(ss, SHEET_DOSYALAR, DOSYA_HEADERS);
  ensureSheetWithHeaders_(ss, SHEET_MUHASEBE, MUHASEBE_HEADERS);
  ensureAyarlar_(ss);

  // İlk kurulumda kalan varsayılan boş sayfayı sil
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sayfa1');
  if (def && ss.getSheets().length > 1) {
    try { ss.deleteSheet(def); } catch (e) {}
  }
}

function ensureSheetWithHeaders_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var firstRow = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  var needsHeader = firstRow.join('') === '' || firstRow[0] !== headers[0];
  if (needsHeader) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function ensureAyarlar_(ss) {
  var sh = ss.getSheetByName(SHEET_AYARLAR);
  if (sh) return sh;
  sh = ss.insertSheet(SHEET_AYARLAR);
  var cols = [
    ['DavaTurleri', DEFAULT_DAVA_TURLERI],
    ['Asamalar', DEFAULT_ASAMALAR],
    ['GelirKategori', DEFAULT_GELIR_KAT],
    ['GiderKategori', DEFAULT_GIDER_KAT],
    ['OdemeYontemi', DEFAULT_ODEME]
  ];
  var maxLen = Math.max.apply(null, cols.map(function (c) { return c[1].length; }));
  var data = [];
  data.push(cols.map(function (c) { return c[0]; })); // başlık
  for (var r = 0; r < maxLen; r++) {
    data.push(cols.map(function (c) { return c[1][r] || ''; }));
  }
  sh.getRange(1, 1, data.length, cols.length).setValues(data);
  sh.getRange(1, 1, 1, cols.length).setFontWeight('bold')
    .setBackground('#1f2937').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  return sh;
}

function getColumnList_(sheet, headerName) {
  var values = sheet.getDataRange().getValues();
  if (values.length === 0) return [];
  var headers = values[0];
  var col = headers.indexOf(headerName);
  if (col === -1) return [];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var v = ('' + values[r][col]).trim();
    if (v) out.push(v);
  }
  return out;
}

/* ====================== YARDIMCI FONKSİYONLAR ====================== */

function getSheet_(name) { return getDB_().getSheetByName(name); }

function rowsToObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var obj = { _row: r + 1 };
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      var val = values[r][c];
      if (val instanceof Date) val = formatDate_(val);
      obj[headers[c]] = val;
      if (val !== '' && val !== null) empty = false;
    }
    if (!empty) out.push(obj);
  }
  return out;
}

function formatDate_(d) {
  if (!d) return '';
  if (!(d instanceof Date)) return d;
  return Utilities.formatDate(d, 'Europe/Istanbul', 'yyyy-MM-dd');
}

function nowStamp_() {
  return Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd HH:mm');
}

function toNumber_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  var s = ('' + v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/* ====================== AYARLAR / META ====================== */

function getMeta() {
  var ss = getDB_();
  var ayar = ss.getSheetByName(SHEET_AYARLAR);
  return {
    spreadsheetUrl: ss.getUrl(),
    davaTurleri: getColumnList_(ayar, 'DavaTurleri'),
    asamalar: getColumnList_(ayar, 'Asamalar'),
    gelirKategori: getColumnList_(ayar, 'GelirKategori'),
    giderKategori: getColumnList_(ayar, 'GiderKategori'),
    odemeYontemi: getColumnList_(ayar, 'OdemeYontemi')
  };
}

/**
 * Arayüzün tek çağrıda ihtiyaç duyduğu tüm verileri döndürür
 * (dosyalar + muhasebe + gösterge paneli). Round-trip sayısını azaltır.
 */
function bootstrapData() {
  return {
    cases: getCases(),
    tx: getTransactions(),
    dash: getDashboard()
  };
}

/* ====================== DOSYALAR (CRUD) ====================== */

function getCases() {
  return rowsToObjects_(getSheet_(SHEET_DOSYALAR));
}

function generateDosyaNo_(sheet) {
  var year = new Date().getFullYear();
  var values = sheet.getDataRange().getValues();
  var max = 0;
  for (var r = 1; r < values.length; r++) {
    var no = '' + values[r][0];
    var m = no.match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  var next = ('000' + (max + 1)).slice(-4);
  return 'D-' + year + '-' + next;
}

function addCase(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_DOSYALAR);
    var dosyaNo = (data.DosyaNo && ('' + data.DosyaNo).trim()) || generateDosyaNo_(sh);
    var row = [
      dosyaNo,
      data.AcilisTarihi || formatDate_(new Date()),
      data.MuvekkilAd || '',
      data.Telefon || '',
      data.TC || '',
      data.DavaTuru || '',
      data.KarsiTaraf || '',
      data.Asama || 'Yeni Başvuru',
      toNumber_(data.TazminatTalebi),
      toNumber_(data.AnlasilanUcret),
      0, 0, 0, 0, // finans özetleri (recalc ile dolacak)
      data.Aciklama || '',
      nowStamp_()
    ];
    sh.appendRow(row);
    recalcCase_(dosyaNo);
    return { ok: true, dosyaNo: dosyaNo };
  } finally {
    lock.releaseLock();
  }
}

function updateCase(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_DOSYALAR);
    var rowIdx = findRowByValue_(sh, 'DosyaNo', data.DosyaNo);
    if (rowIdx === -1) return { ok: false, error: 'Dosya bulunamadı: ' + data.DosyaNo };
    var headers = sh.getRange(1, 1, 1, DOSYA_HEADERS.length).getValues()[0];
    var current = sh.getRange(rowIdx, 1, 1, headers.length).getValues()[0];

    var map = {
      AcilisTarihi: data.AcilisTarihi, MuvekkilAd: data.MuvekkilAd, Telefon: data.Telefon,
      TC: data.TC, DavaTuru: data.DavaTuru, KarsiTaraf: data.KarsiTaraf, Asama: data.Asama,
      TazminatTalebi: toNumber_(data.TazminatTalebi), AnlasilanUcret: toNumber_(data.AnlasilanUcret),
      Aciklama: data.Aciklama, SonGuncelleme: nowStamp_()
    };
    for (var c = 0; c < headers.length; c++) {
      if (map.hasOwnProperty(headers[c]) && map[headers[c]] !== undefined) {
        current[c] = map[headers[c]];
      }
    }
    sh.getRange(rowIdx, 1, 1, headers.length).setValues([current]);
    recalcCase_(data.DosyaNo);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function deleteCase(dosyaNo) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_DOSYALAR);
    var rowIdx = findRowByValue_(sh, 'DosyaNo', dosyaNo);
    if (rowIdx === -1) return { ok: false, error: 'Dosya bulunamadı.' };
    sh.deleteRow(rowIdx);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function findRowByValue_(sheet, headerName, value) {
  var values = sheet.getDataRange().getValues();
  var col = values[0].indexOf(headerName);
  if (col === -1) return -1;
  for (var r = 1; r < values.length; r++) {
    if ('' + values[r][col] === '' + value) return r + 1;
  }
  return -1;
}

/* ====================== MUHASEBE (CRUD) ====================== */

function getTransactions() {
  return rowsToObjects_(getSheet_(SHEET_MUHASEBE));
}

function addTransaction(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_MUHASEBE);
    var id = 'M' + new Date().getTime();
    var row = [
      id,
      data.Tarih || formatDate_(new Date()),
      data.DosyaNo || '',
      data.Tur || 'Gelir',
      data.Kategori || '',
      toNumber_(data.Tutar),
      data.OdemeYontemi || '',
      data.Aciklama || '',
      nowStamp_()
    ];
    sh.appendRow(row);
    if (data.DosyaNo) recalcCase_(data.DosyaNo);
    return { ok: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

function deleteTransaction(islemId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_MUHASEBE);
    var values = sh.getDataRange().getValues();
    var idCol = values[0].indexOf('IslemID');
    var dosyaCol = values[0].indexOf('DosyaNo');
    for (var r = 1; r < values.length; r++) {
      if ('' + values[r][idCol] === '' + islemId) {
        var dosyaNo = values[r][dosyaCol];
        sh.deleteRow(r + 1);
        if (dosyaNo) recalcCase_(dosyaNo);
        return { ok: true };
      }
    }
    return { ok: false, error: 'İşlem bulunamadı.' };
  } finally {
    lock.releaseLock();
  }
}

/* ============== FİNANS YENİDEN HESAPLAMA (ÇEKİRDEK) ============== */

/**
 * Verilen dosya için tüm muhasebe hareketlerini toplayıp dosyanın
 * Tahsil Edilen / Kalan Bakiye / Toplam Gider / Net Kâr alanlarını günceller.
 * Muhasebe değiştiğinde dosya bilgisinin de güncellenmesini sağlar.
 */
function recalcCase_(dosyaNo) {
  var dosyaSh = getSheet_(SHEET_DOSYALAR);
  var rowIdx = findRowByValue_(dosyaSh, 'DosyaNo', dosyaNo);
  if (rowIdx === -1) return;

  var muh = getSheet_(SHEET_MUHASEBE).getDataRange().getValues();
  var headers = muh[0];
  var cDosya = headers.indexOf('DosyaNo');
  var cTur = headers.indexOf('Tur');
  var cTutar = headers.indexOf('Tutar');

  var gelir = 0, gider = 0;
  for (var r = 1; r < muh.length; r++) {
    if ('' + muh[r][cDosya] === '' + dosyaNo) {
      var tutar = toNumber_(muh[r][cTutar]);
      if (('' + muh[r][cTur]).toLowerCase().indexOf('gider') !== -1) gider += tutar;
      else gelir += tutar;
    }
  }

  var dh = DOSYA_HEADERS;
  var anlasilan = toNumber_(dosyaSh.getRange(rowIdx, dh.indexOf('AnlasilanUcret') + 1).getValue());
  var kalan = anlasilan - gelir;
  var netKar = gelir - gider;

  dosyaSh.getRange(rowIdx, dh.indexOf('TahsilEdilen') + 1).setValue(gelir);
  dosyaSh.getRange(rowIdx, dh.indexOf('KalanBakiye') + 1).setValue(kalan);
  dosyaSh.getRange(rowIdx, dh.indexOf('ToplamGider') + 1).setValue(gider);
  dosyaSh.getRange(rowIdx, dh.indexOf('NetKar') + 1).setValue(netKar);
  dosyaSh.getRange(rowIdx, dh.indexOf('SonGuncelleme') + 1).setValue(nowStamp_());
}

/** Tüm dosyaların finans özetlerini yeniden hesaplar (bakım amaçlı). */
function recalcAll() {
  var cases = getCases();
  cases.forEach(function (c) { recalcCase_(c.DosyaNo); });
  return { ok: true, count: cases.length };
}

/* ====================== GÖSTERGE PANELİ ====================== */

function getDashboard() {
  var cases = getCases();
  var tx = getTransactions();

  var toplamGelir = 0, toplamGider = 0;
  tx.forEach(function (t) {
    var tutar = toNumber_(t.Tutar);
    if (('' + t.Tur).toLowerCase().indexOf('gider') !== -1) toplamGider += tutar;
    else toplamGelir += tutar;
  });

  var acikDosya = 0, kapaliDosya = 0;
  var turDagilim = {};
  var asamaDagilim = {};
  var toplamBakiye = 0;
  cases.forEach(function (c) {
    var asama = '' + (c.Asama || '');
    if (asama === 'Kapandı' || asama === 'Reddedildi') kapaliDosya++; else acikDosya++;
    var tur = '' + (c.DavaTuru || 'Belirtilmemiş');
    turDagilim[tur] = (turDagilim[tur] || 0) + 1;
    asamaDagilim[asama || 'Belirtilmemiş'] = (asamaDagilim[asama || 'Belirtilmemiş'] || 0) + 1;
    toplamBakiye += toNumber_(c.KalanBakiye);
  });

  // Son 8 işlem (en yeni en üstte)
  var sonIslemler = tx.slice(-8).reverse();

  return {
    toplamDosya: cases.length,
    acikDosya: acikDosya,
    kapaliDosya: kapaliDosya,
    toplamGelir: toplamGelir,
    toplamGider: toplamGider,
    netKar: toplamGelir - toplamGider,
    toplamAlacak: toplamBakiye,
    turDagilim: turDagilim,
    asamaDagilim: asamaDagilim,
    sonIslemler: sonIslemler
  };
}

/* ====================== ÖRNEK / DENEME VERİSİ ====================== */

/**
 * Deneme amaçlı örnek dosya ve muhasebe hareketleri ekler.
 * Hem editörden hem de arayüzdeki "Örnek Veri" butonundan çalıştırılabilir.
 */
function seedSampleData() {
  var ornekDosyalar = [
    { MuvekkilAd: 'Ahmet Yılmaz', Telefon: '0532 111 22 33', TC: '12345678901',
      DavaTuru: 'Değer Kaybı', KarsiTaraf: 'Anadolu Sigorta', Asama: 'Dava Açıldı',
      TazminatTalebi: 45000, AnlasilanUcret: 9000, AcilisTarihi: '2026-01-15',
      Aciklama: '34 ABC 123 plakalı araç, kavşakta arkadan çarpma.' },
    { MuvekkilAd: 'Ayşe Demir', Telefon: '0541 222 33 44', TC: '23456789012',
      DavaTuru: 'Hasar Farkı', KarsiTaraf: 'Axa Sigorta', Asama: 'Bilirkişi',
      TazminatTalebi: 28000, AnlasilanUcret: 5600, AcilisTarihi: '2026-02-03',
      Aciklama: 'Eksper hasar bedelini düşük belirledi, fark talebi.' },
    { MuvekkilAd: 'Mehmet Kaya', Telefon: '0505 333 44 55', TC: '34567890123',
      DavaTuru: 'Kazanç Kaybı', KarsiTaraf: 'Allianz', Asama: 'Karar Bekleniyor',
      TazminatTalebi: 60000, AnlasilanUcret: 12000, AcilisTarihi: '2026-01-28',
      Aciklama: 'Ticari taksi, kaza nedeniyle 45 gün çalışamama.' },
    { MuvekkilAd: 'Fatma Şahin', Telefon: '0533 444 55 66', TC: '45678901234',
      DavaTuru: 'DASK', KarsiTaraf: 'DASK', Asama: 'Tahsilat',
      TazminatTalebi: 80000, AnlasilanUcret: 12000, AcilisTarihi: '2025-12-10',
      Aciklama: 'Deprem hasarı, eksik ödeme itirazı. Karar lehe çıktı.' },
    { MuvekkilAd: 'Hasan Çelik', Telefon: '0544 555 66 77', TC: '56789012345',
      DavaTuru: 'Tüketici Hakem Heyeti', KarsiTaraf: 'XYZ Mobilya', Asama: 'Yeni Başvuru',
      TazminatTalebi: 15000, AnlasilanUcret: 3000, AcilisTarihi: '2026-06-01',
      Aciklama: 'Ayıplı koltuk takımı, iade/bedel iadesi.' },
    { MuvekkilAd: 'Zeynep Arslan', Telefon: '0537 666 77 88', TC: '67890123456',
      DavaTuru: 'Hak Mahrumiyeti', KarsiTaraf: 'Ray Sigorta', Asama: 'Kapandı',
      TazminatTalebi: 35000, AnlasilanUcret: 7000, AcilisTarihi: '2025-11-05',
      Aciklama: 'Dosya tamamlandı, ücret tahsil edildi.' }
  ];

  var dosyaNolar = [];
  ornekDosyalar.forEach(function (d) {
    var res = addCase(d);
    dosyaNolar.push(res.dosyaNo);
  });

  // Örnek muhasebe hareketleri (dosyalara bağlı + genel)
  var ornekHareketler = [
    { DosyaNo: dosyaNolar[0], Tarih: '2026-01-16', Tur: 'Gelir', Kategori: 'Avans', Tutar: 3000, OdemeYontemi: 'Havale/EFT', Aciklama: 'Dosya açılış avansı' },
    { DosyaNo: dosyaNolar[0], Tarih: '2026-01-20', Tur: 'Gider', Kategori: 'Mahkeme Harcı', Tutar: 1200, OdemeYontemi: 'Havale/EFT', Aciklama: 'Dava açılış harcı' },
    { DosyaNo: dosyaNolar[1], Tarih: '2026-02-05', Tur: 'Gelir', Kategori: 'Avans', Tutar: 2000, OdemeYontemi: 'Nakit', Aciklama: 'Peşin avans' },
    { DosyaNo: dosyaNolar[1], Tarih: '2026-02-12', Tur: 'Gider', Kategori: 'Bilirkişi Ücreti', Tutar: 1500, OdemeYontemi: 'Havale/EFT', Aciklama: 'Bilirkişi avansı' },
    { DosyaNo: dosyaNolar[2], Tarih: '2026-02-01', Tur: 'Gelir', Kategori: 'Avans', Tutar: 4000, OdemeYontemi: 'Kredi Kartı', Aciklama: '' },
    { DosyaNo: dosyaNolar[3], Tarih: '2026-03-15', Tur: 'Gelir', Kategori: 'Tahsilat', Tutar: 12000, OdemeYontemi: 'Havale/EFT', Aciklama: 'Tazminat tahsil edildi, vekalet ücreti' },
    { DosyaNo: dosyaNolar[3], Tarih: '2025-12-15', Tur: 'Gider', Kategori: 'Bilirkişi Ücreti', Tutar: 2000, OdemeYontemi: 'Havale/EFT', Aciklama: '' },
    { DosyaNo: dosyaNolar[5], Tarih: '2025-11-20', Tur: 'Gelir', Kategori: 'Tahsilat', Tutar: 7000, OdemeYontemi: 'Havale/EFT', Aciklama: 'Tam tahsilat' },
    { DosyaNo: dosyaNolar[5], Tarih: '2025-11-08', Tur: 'Gider', Kategori: 'Posta/Tebligat', Tutar: 350, OdemeYontemi: 'Nakit', Aciklama: '' },
    { DosyaNo: '', Tarih: '2026-06-01', Tur: 'Gider', Kategori: 'Ofis Gideri', Tutar: 4500, OdemeYontemi: 'Havale/EFT', Aciklama: 'Aylık ofis kirası (genel gider)' }
  ];
  ornekHareketler.forEach(function (h) { addTransaction(h); });

  return { ok: true, dosya: dosyaNolar.length, hareket: ornekHareketler.length };
}

/* ====================== BAŞLANGIÇ KURULUMU ====================== */

/**
 * Editörden tek seferlik çalıştırılabilir: veritabanını oluşturur ve
 * e-tablo URL'sini loglar. Web app ilk açıldığında da otomatik kurulur.
 */
function kurulumYap() {
  var ss = getDB_();
  Logger.log('Veritabanı hazır: ' + ss.getUrl());
  return ss.getUrl();
}
