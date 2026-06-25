/**
 * Teminat Group - Cari, Dava & Muhasebe Web Uygulaması
 * -----------------------------------------------------
 * Google E-Tablolar'ı veritabanı olarak kullanan, tek kullanıcılı uygulama.
 *
 * Modüller (tek veri kaynağını paylaşır → otomatik senkron):
 *   - Cariler   : kişi/firma cari hesapları (Borç/Alacak ekstresi)
 *   - Dosyalar  : davalar; her dava bir cariye (müvekkile) bağlıdır
 *   - Hareketler: cari hareketleri (Borç/Alacak); isteğe bağlı bir davaya bağlanır
 *
 * Bakiye, dava finansları ve gösterge paneli ham verilerden İSTEMCİDE
 * hesaplanır; sunucu yalnızca ham satırları saklar/okur (recalc gerekmez).
 */

/* ============================ SABİTLER ============================ */

var SPREADSHEET_NAME = 'Teminat Group - Cari, Dava & Muhasebe';
var PROP_SHEET_ID = 'TEMINAT_DB_ID';

var SHEET_CARILER   = 'Cariler';
var SHEET_DOSYALAR  = 'Dosyalar';
var SHEET_HAREKET   = 'Hareketler';
var SHEET_AYARLAR   = 'Ayarlar';

var CARI_HEADERS = [
  'CariNo', 'Unvan', 'Tip', 'Telefon', 'Email',
  'KimlikVergiNo', 'Adres', 'AcilisBakiye', 'Notlar', 'KayitTarihi'
];

var DOSYA_HEADERS = [
  'DosyaNo', 'AcilisTarihi', 'CariNo', 'MuvekkilAd', 'DavaTuru',
  'KarsiTaraf', 'Asama', 'TazminatTalebi', 'AnlasilanUcret', 'Aciklama', 'SonGuncelleme'
];

var HAREKET_HEADERS = [
  'IslemID', 'Tarih', 'CariNo', 'DosyaNo', 'Yon',
  'Kategori', 'Tutar', 'OdemeYontemi', 'BelgeNo', 'Aciklama', 'KayitTarihi'
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
var DEFAULT_CARI_TIPLERI = ['Müvekkil', 'Karşı Taraf', 'Tedarikçi', 'Diğer'];
var DEFAULT_BORC_KAT = ['Vekalet Ücreti', 'Masraf Yansıtma', 'Dava Harcı', 'Bilirkişi Ücreti', 'Danışmanlık', 'Diğer'];
var DEFAULT_ALACAK_KAT = ['Tahsilat', 'Avans', 'İade', 'Diğer'];
var DEFAULT_ODEME = ['Nakit', 'Havale/EFT', 'Kredi Kartı', 'Çek'];

/* ============================ WEB APP ============================ */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Teminat Group | Cari, Dava & Muhasebe')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://www.google.com/images/icons/product/sheets-32.png');
}

/* ====================== VERİTABANI KURULUMU ====================== */

function getDB_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_SHEET_ID);
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    props.setProperty(PROP_SHEET_ID, ss.getId());
  }
  ensureSheets_(ss);
  return ss;
}

function ensureSheets_(ss) {
  ensureSheetWithHeaders_(ss, SHEET_CARILER, CARI_HEADERS);
  ensureSheetWithHeaders_(ss, SHEET_DOSYALAR, DOSYA_HEADERS);
  ensureSheetWithHeaders_(ss, SHEET_HAREKET, HAREKET_HEADERS);
  ensureAyarlar_(ss);
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sayfa1');
  if (def && ss.getSheets().length > 1) { try { ss.deleteSheet(def); } catch (e) {} }
}

function ensureSheetWithHeaders_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var firstRow = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  if (firstRow.join('') === '' || firstRow[0] !== headers[0]) {
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
    ['CariTipleri', DEFAULT_CARI_TIPLERI],
    ['BorcKategori', DEFAULT_BORC_KAT],
    ['AlacakKategori', DEFAULT_ALACAK_KAT],
    ['OdemeYontemi', DEFAULT_ODEME]
  ];
  var maxLen = Math.max.apply(null, cols.map(function (c) { return c[1].length; }));
  var data = [cols.map(function (c) { return c[0]; })];
  for (var r = 0; r < maxLen; r++) data.push(cols.map(function (c) { return c[1][r] || ''; }));
  sh.getRange(1, 1, data.length, cols.length).setValues(data);
  sh.getRange(1, 1, 1, cols.length).setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  return sh;
}

function getColumnList_(sheet, headerName) {
  var values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  var col = values[0].indexOf(headerName);
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
    var obj = {}, empty = true;
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
function nowStamp_() { return Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd HH:mm'); }
function today_() { return Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd'); }

function toNumber_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  var s = ('' + v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
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

/* ====================== META / BOOTSTRAP ====================== */

function getMeta() {
  var ss = getDB_();
  var a = ss.getSheetByName(SHEET_AYARLAR);
  return {
    spreadsheetUrl: ss.getUrl(),
    davaTurleri: getColumnList_(a, 'DavaTurleri'),
    asamalar: getColumnList_(a, 'Asamalar'),
    cariTipleri: getColumnList_(a, 'CariTipleri'),
    borcKategori: getColumnList_(a, 'BorcKategori'),
    alacakKategori: getColumnList_(a, 'AlacakKategori'),
    odemeYontemi: getColumnList_(a, 'OdemeYontemi')
  };
}

function bootstrapData() {
  return {
    cariler: rowsToObjects_(getSheet_(SHEET_CARILER)),
    cases: rowsToObjects_(getSheet_(SHEET_DOSYALAR)),
    hareketler: rowsToObjects_(getSheet_(SHEET_HAREKET))
  };
}

/* ====================== CARİLER (CRUD) ====================== */

function generateCariNo_(sheet) {
  var values = sheet.getDataRange().getValues(), max = 0;
  for (var r = 1; r < values.length; r++) {
    var m = ('' + values[r][0]).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'C-' + ('000' + (max + 1)).slice(-4);
}

function addCari(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_CARILER);
    var cariNo = (data.CariNo && ('' + data.CariNo).trim()) || generateCariNo_(sh);
    sh.appendRow([
      cariNo, data.Unvan || '', data.Tip || 'Müvekkil', data.Telefon || '', data.Email || '',
      data.KimlikVergiNo || '', data.Adres || '', toNumber_(data.AcilisBakiye), data.Notlar || '', nowStamp_()
    ]);
    return { ok: true, cariNo: cariNo };
  } finally { lock.releaseLock(); }
}

function updateCari(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_CARILER);
    var rowIdx = findRowByValue_(sh, 'CariNo', data.CariNo);
    if (rowIdx === -1) return { ok: false, error: 'Cari bulunamadı.' };
    var headers = CARI_HEADERS;
    var cur = sh.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
    var map = { Unvan: data.Unvan, Tip: data.Tip, Telefon: data.Telefon, Email: data.Email,
      KimlikVergiNo: data.KimlikVergiNo, Adres: data.Adres, AcilisBakiye: toNumber_(data.AcilisBakiye), Notlar: data.Notlar };
    for (var c = 0; c < headers.length; c++) if (map.hasOwnProperty(headers[c]) && map[headers[c]] !== undefined) cur[c] = map[headers[c]];
    sh.getRange(rowIdx, 1, 1, headers.length).setValues([cur]);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function deleteCari(cariNo) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    // Bağlı dava veya hareket varsa silmeyi engelle (veri tutarlılığı).
    var hareket = getSheet_(SHEET_HAREKET).getDataRange().getValues();
    var hc = hareket[0].indexOf('CariNo');
    for (var r = 1; r < hareket.length; r++) if ('' + hareket[r][hc] === '' + cariNo)
      return { ok: false, error: 'Bu cariye ait hareketler var. Önce onları silin.' };
    var dosya = getSheet_(SHEET_DOSYALAR).getDataRange().getValues();
    var dc = dosya[0].indexOf('CariNo');
    for (var r2 = 1; r2 < dosya.length; r2++) if ('' + dosya[r2][dc] === '' + cariNo)
      return { ok: false, error: 'Bu cariye bağlı dava(lar) var. Önce davaları silin/değiştirin.' };
    var sh = getSheet_(SHEET_CARILER);
    var idx = findRowByValue_(sh, 'CariNo', cariNo);
    if (idx === -1) return { ok: false, error: 'Cari bulunamadı.' };
    sh.deleteRow(idx);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ====================== DOSYALAR (CRUD) ====================== */

function generateDosyaNo_(sheet) {
  var year = new Date().getFullYear();
  var values = sheet.getDataRange().getValues(), max = 0;
  for (var r = 1; r < values.length; r++) {
    var m = ('' + values[r][0]).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'D-' + year + '-' + ('000' + (max + 1)).slice(-4);
}

function addCase(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_DOSYALAR);
    var dosyaNo = (data.DosyaNo && ('' + data.DosyaNo).trim()) || generateDosyaNo_(sh);
    sh.appendRow([
      dosyaNo, data.AcilisTarihi || today_(), data.CariNo || '', data.MuvekkilAd || '',
      data.DavaTuru || '', data.KarsiTaraf || '', data.Asama || 'Yeni Başvuru',
      toNumber_(data.TazminatTalebi), toNumber_(data.AnlasilanUcret), data.Aciklama || '', nowStamp_()
    ]);
    return { ok: true, dosyaNo: dosyaNo };
  } finally { lock.releaseLock(); }
}

function updateCase(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_DOSYALAR);
    var rowIdx = findRowByValue_(sh, 'DosyaNo', data.DosyaNo);
    if (rowIdx === -1) return { ok: false, error: 'Dosya bulunamadı.' };
    var headers = DOSYA_HEADERS;
    var cur = sh.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
    var map = { AcilisTarihi: data.AcilisTarihi, CariNo: data.CariNo, MuvekkilAd: data.MuvekkilAd,
      DavaTuru: data.DavaTuru, KarsiTaraf: data.KarsiTaraf, Asama: data.Asama,
      TazminatTalebi: toNumber_(data.TazminatTalebi), AnlasilanUcret: toNumber_(data.AnlasilanUcret),
      Aciklama: data.Aciklama, SonGuncelleme: nowStamp_() };
    for (var c = 0; c < headers.length; c++) if (map.hasOwnProperty(headers[c]) && map[headers[c]] !== undefined) cur[c] = map[headers[c]];
    sh.getRange(rowIdx, 1, 1, headers.length).setValues([cur]);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function deleteCase(dosyaNo) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_DOSYALAR);
    var idx = findRowByValue_(sh, 'DosyaNo', dosyaNo);
    if (idx === -1) return { ok: false, error: 'Dosya bulunamadı.' };
    sh.deleteRow(idx);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ====================== HAREKETLER (CRUD) ====================== */

function addHareket(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_HAREKET);
    var id = 'H' + new Date().getTime();
    var yon = (('' + data.Yon).toLowerCase().indexOf('alacak') !== -1) ? 'Alacak' : 'Borç';
    sh.appendRow([
      id, data.Tarih || today_(), data.CariNo || '', data.DosyaNo || '', yon,
      data.Kategori || '', toNumber_(data.Tutar), data.OdemeYontemi || '', data.BelgeNo || '', data.Aciklama || '', nowStamp_()
    ]);
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
}

function deleteHareket(islemId) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_HAREKET);
    var idx = findRowByValue_(sh, 'IslemID', islemId);
    if (idx === -1) return { ok: false, error: 'Hareket bulunamadı.' };
    sh.deleteRow(idx);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ====================== ÖRNEK / DENEME VERİSİ ====================== */

function seedSampleData() {
  var cariler = [
    { Unvan: 'Ahmet Yılmaz', Tip: 'Müvekkil', Telefon: '0532 111 22 33', Email: 'ahmet@example.com', KimlikVergiNo: '12345678901', Adres: 'Kadıköy / İstanbul', AcilisBakiye: 0, Notlar: '' },
    { Unvan: 'Ayşe Demir', Tip: 'Müvekkil', Telefon: '0541 222 33 44', Email: 'ayse@example.com', KimlikVergiNo: '23456789012', Adres: 'Çankaya / Ankara', AcilisBakiye: 0, Notlar: '' },
    { Unvan: 'Mehmet Kaya', Tip: 'Müvekkil', Telefon: '0505 333 44 55', Email: '', KimlikVergiNo: '34567890123', Adres: 'Konak / İzmir', AcilisBakiye: 0, Notlar: 'Ticari taksi sahibi' },
    { Unvan: 'Fatma Şahin', Tip: 'Müvekkil', Telefon: '0533 444 55 66', Email: '', KimlikVergiNo: '45678901234', Adres: 'Nilüfer / Bursa', AcilisBakiye: 0, Notlar: '' },
    { Unvan: 'Anadolu Sigorta A.Ş.', Tip: 'Karşı Taraf', Telefon: '0850 000 00 00', Email: '', KimlikVergiNo: '0000000000', Adres: '', AcilisBakiye: 0, Notlar: '' },
    { Unvan: 'XYZ Bilirkişilik', Tip: 'Tedarikçi', Telefon: '0212 999 88 77', Email: '', KimlikVergiNo: '1112223334', Adres: '', AcilisBakiye: 0, Notlar: 'Eksper/bilirkişi' }
  ];
  var cNo = cariler.map(function (c) { return addCari(c).cariNo; });

  var davalar = [
    { CariNo: cNo[0], MuvekkilAd: 'Ahmet Yılmaz', DavaTuru: 'Değer Kaybı', KarsiTaraf: 'Anadolu Sigorta', Asama: 'Dava Açıldı', TazminatTalebi: 45000, AnlasilanUcret: 9000, AcilisTarihi: '2026-01-15', Aciklama: '34 ABC 123, arkadan çarpma.' },
    { CariNo: cNo[1], MuvekkilAd: 'Ayşe Demir', DavaTuru: 'Hasar Farkı', KarsiTaraf: 'Axa Sigorta', Asama: 'Bilirkişi', TazminatTalebi: 28000, AnlasilanUcret: 5600, AcilisTarihi: '2026-02-03', Aciklama: 'Eksik hasar bedeli farkı.' },
    { CariNo: cNo[2], MuvekkilAd: 'Mehmet Kaya', DavaTuru: 'Kazanç Kaybı', KarsiTaraf: 'Allianz', Asama: 'Karar Bekleniyor', TazminatTalebi: 60000, AnlasilanUcret: 12000, AcilisTarihi: '2026-01-28', Aciklama: 'Ticari taksi, 45 gün çalışamama.' },
    { CariNo: cNo[3], MuvekkilAd: 'Fatma Şahin', DavaTuru: 'DASK', KarsiTaraf: 'DASK', Asama: 'Tahsilat', TazminatTalebi: 80000, AnlasilanUcret: 12000, AcilisTarihi: '2025-12-10', Aciklama: 'Deprem hasarı eksik ödeme.' }
  ];
  var dNo = davalar.map(function (d) { return addCase(d).dosyaNo; });

  var hareketler = [
    // Ahmet — vekalet ücreti borçlandırma + avans tahsilat + masraf
    { CariNo: cNo[0], DosyaNo: dNo[0], Yon: 'Borç', Kategori: 'Vekalet Ücreti', Tutar: 9000, Tarih: '2026-01-15', OdemeYontemi: '', BelgeNo: 'VU-001', Aciklama: 'Vekalet ücreti tahakkuku' },
    { CariNo: cNo[0], DosyaNo: dNo[0], Yon: 'Alacak', Kategori: 'Avans', Tutar: 3000, Tarih: '2026-01-16', OdemeYontemi: 'Havale/EFT', BelgeNo: 'MKB-101', Aciklama: 'Açılış avansı' },
    { CariNo: cNo[0], DosyaNo: dNo[0], Yon: 'Borç', Kategori: 'Dava Harcı', Tutar: 1200, Tarih: '2026-01-20', OdemeYontemi: '', BelgeNo: '', Aciklama: 'Dava açılış harcı (yansıtma)' },
    // Ayşe
    { CariNo: cNo[1], DosyaNo: dNo[1], Yon: 'Borç', Kategori: 'Vekalet Ücreti', Tutar: 5600, Tarih: '2026-02-03', OdemeYontemi: '', BelgeNo: 'VU-002', Aciklama: '' },
    { CariNo: cNo[1], DosyaNo: dNo[1], Yon: 'Alacak', Kategori: 'Avans', Tutar: 2000, Tarih: '2026-02-05', OdemeYontemi: 'Nakit', BelgeNo: 'MKB-102', Aciklama: 'Peşin avans' },
    // Mehmet
    { CariNo: cNo[2], DosyaNo: dNo[2], Yon: 'Borç', Kategori: 'Vekalet Ücreti', Tutar: 12000, Tarih: '2026-01-28', OdemeYontemi: '', BelgeNo: 'VU-003', Aciklama: '' },
    { CariNo: cNo[2], DosyaNo: dNo[2], Yon: 'Alacak', Kategori: 'Avans', Tutar: 4000, Tarih: '2026-02-01', OdemeYontemi: 'Kredi Kartı', BelgeNo: 'MKB-103', Aciklama: '' },
    // Fatma — tamamlanan dosya, tam tahsilat
    { CariNo: cNo[3], DosyaNo: dNo[3], Yon: 'Borç', Kategori: 'Vekalet Ücreti', Tutar: 12000, Tarih: '2025-12-10', OdemeYontemi: '', BelgeNo: 'VU-004', Aciklama: '' },
    { CariNo: cNo[3], DosyaNo: dNo[3], Yon: 'Alacak', Kategori: 'Tahsilat', Tutar: 12000, Tarih: '2026-03-15', OdemeYontemi: 'Havale/EFT', BelgeNo: 'MKB-104', Aciklama: 'Karar sonrası tam tahsilat' },
    // Tedarikçi (bilirkişi) — biz ona borçluyuz
    { CariNo: cNo[5], DosyaNo: dNo[1], Yon: 'Alacak', Kategori: 'Diğer', Tutar: 1500, Tarih: '2026-02-12', OdemeYontemi: 'Havale/EFT', BelgeNo: '', Aciklama: 'Bilirkişi ücreti ödendi' }
  ];
  hareketler.forEach(function (h) { addHareket(h); });

  return { ok: true, cari: cNo.length, dosya: dNo.length, hareket: hareketler.length };
}

/** Editörden tek seferlik çalıştırmak için. */
function kurulumYap() {
  var ss = getDB_();
  Logger.log('Veritabanı hazır: ' + ss.getUrl());
  return ss.getUrl();
}
