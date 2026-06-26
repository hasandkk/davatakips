/**
 * Teminat Group - Cari, Dava & Muhasebe Web Uygulaması
 * -----------------------------------------------------
 * Google E-Tablolar'ı veritabanı olarak kullanan, tek kullanıcılı uygulama.
 *
 * Modüller (tek veri kaynağını paylaşır, otomatik senkron):
 *   - Cariler    : kişi/firma cari hesapları (Borç/Alacak/Bakiye)
 *   - Hareketler : cari hareketleri (Borç/Alacak); bir davaya bağlanabilir
 *   - Dosyalar   : davalar (her dava bir cariye/müvekkile bağlı)
 *   - Ayarlar    : dava türleri, aşamalar, cari tipleri, kategoriler
 *
 * Bakiye ve özetler arayüz tarafında ham verilerden hesaplanır; sunucu
 * yalnızca CRUD ve ham satırları döndürür (tek doğruluk kaynağı = tablolar).
 */

/* ============================ SABİTLER ============================ */

var SPREADSHEET_NAME = 'Teminat Group - Cari, Dava & Muhasebe';
var PROP_SHEET_ID = 'TEMINAT_DB_ID';

var SHEET_CARILER   = 'Cariler';
var SHEET_HAREKETLER= 'Hareketler';
var SHEET_DOSYALAR  = 'Dosyalar';
var SHEET_AYARLAR   = 'Ayarlar';

var CARI_HEADERS = ['CariNo','Unvan','Tip','Telefon','Email','KimlikVergiNo','Adres','AcilisBakiye','Notlar','KayitTarihi'];
var HAREKET_HEADERS = ['IslemID','Tarih','CariNo','DosyaNo','Yon','Kategori','Tutar','OdemeYontemi','BelgeNo','Aciklama','KayitTarihi'];
var DOSYA_HEADERS = ['DosyaNo','AcilisTarihi','CariNo','MuvekkilAd','Avukat','DavaTuru','KarsiTaraf','Asama','TazminatTalebi','AnlasilanUcret','Aciklama','SonGuncelleme'];

var DEFAULT_DAVA_TURLERI = ['Değer Kaybı','Hak Mahrumiyeti','Hasar Farkı','Kazanç Kaybı','DASK','Ayıplı Mal','Tüketici Hakem Heyeti','Diğer'];
var DEFAULT_ASAMALAR = ['Yeni Başvuru','Evrak Toplama','Başvuru Yapıldı','Dava Açıldı','Bilirkişi','Karar Bekleniyor','Karar Çıktı','Tahsilat','Kapandı','Reddedildi'];
var DEFAULT_CARI_TIPLERI = ['Müvekkil','Karşı Taraf','Tedarikçi','Diğer'];
var DEFAULT_BORC_KAT = ['Vekalet Ücreti','Masraf Yansıtma','Dava Harcı','Bilirkişi Ücreti','Danışmanlık','Diğer'];
var DEFAULT_ALACAK_KAT = ['Tahsilat','Avans','İade','Diğer'];
var DEFAULT_ODEME = ['Nakit','Havale/EFT','Kredi Kartı','Çek'];
var DEFAULT_AVUKATLAR = ['Nida Gamsız','Sadık Sarıbıyık','Alperen Codey'];

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
  if (!ss) { ss = SpreadsheetApp.create(SPREADSHEET_NAME); props.setProperty(PROP_SHEET_ID, ss.getId()); }
  ensureSheets_(ss);
  return ss;
}

function ensureSheets_(ss) {
  ensureSheetWithHeaders_(ss, SHEET_CARILER, CARI_HEADERS);
  ensureSheetWithHeaders_(ss, SHEET_HAREKETLER, HAREKET_HEADERS);
  ensureSheetWithHeaders_(ss, SHEET_DOSYALAR, DOSYA_HEADERS);
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
    ['DavaTurleri', DEFAULT_DAVA_TURLERI], ['Asamalar', DEFAULT_ASAMALAR],
    ['CariTipleri', DEFAULT_CARI_TIPLERI], ['BorcKategori', DEFAULT_BORC_KAT],
    ['AlacakKategori', DEFAULT_ALACAK_KAT], ['OdemeYontemi', DEFAULT_ODEME], ['Avukatlar', DEFAULT_AVUKATLAR]
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
  for (var r = 1; r < values.length; r++) { var v = ('' + values[r][col]).trim(); if (v) out.push(v); }
  return out;
}

/* ====================== YARDIMCI ====================== */

function getSheet_(name) { return getDB_().getSheetByName(name); }

function rowsToObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0], out = [];
  for (var r = 1; r < values.length; r++) {
    var obj = { _row: r + 1 }, empty = true;
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

function formatDate_(d) { if (!d) return ''; if (!(d instanceof Date)) return d; return Utilities.formatDate(d, 'Europe/Istanbul', 'yyyy-MM-dd'); }
function nowStamp_() { return Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd HH:mm'); }
function toNumber_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  var s = ('' + v).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
  var n = parseFloat(s); return isNaN(n) ? 0 : n;
}
function findRowByValue_(sheet, headerName, value) {
  var values = sheet.getDataRange().getValues();
  var col = values[0].indexOf(headerName);
  if (col === -1) return -1;
  for (var r = 1; r < values.length; r++) if ('' + values[r][col] === '' + value) return r + 1;
  return -1;
}

/* ====================== META / AYARLAR ====================== */

function getMeta() {
  var ss = getDB_(), ayar = ss.getSheetByName(SHEET_AYARLAR);
  return {
    spreadsheetUrl: ss.getUrl(),
    davaTurleri: getColumnList_(ayar, 'DavaTurleri'),
    asamalar: getColumnList_(ayar, 'Asamalar'),
    cariTipleri: getColumnList_(ayar, 'CariTipleri'),
    borcKategori: getColumnList_(ayar, 'BorcKategori'),
    alacakKategori: getColumnList_(ayar, 'AlacakKategori'),
    odemeYontemi: getColumnList_(ayar, 'OdemeYontemi'),
    avukatlar: getColumnList_(ayar, 'Avukatlar')
  };
}

function bootstrapData() {
  return {
    cariler: rowsToObjects_(getSheet_(SHEET_CARILER)),
    cases: rowsToObjects_(getSheet_(SHEET_DOSYALAR)),
    hareketler: rowsToObjects_(getSheet_(SHEET_HAREKETLER))
  };
}

/**
 * Bir sayfayı { cols:[başlıklar], rows:[[...],[...]] } biçiminde (matris)
 * döndürür. İsteğe bağlı colName/value ile filtreler. Nesne yerine dizi
 * gönderildiği için JSON çok daha küçük ve serileştirme hızlıdır.
 */
function sheetMatrixFilter_(name, colName, value) {
  var values = getSheet_(name).getDataRange().getValues();
  if (!values.length) return { cols: [], rows: [] };
  var cols = values[0], fIdx = colName ? cols.indexOf(colName) : -1, rows = [];
  for (var r = 1; r < values.length; r++) {
    var src = values[r];
    if (fIdx >= 0 && '' + src[fIdx] !== '' + value) continue;
    var out = [], empty = true;
    for (var c = 0; c < cols.length; c++) {
      var v = src[c];
      if (v instanceof Date) v = Utilities.formatDate(v, 'Europe/Istanbul', 'yyyy-MM-dd');
      out.push(v);
      if (v !== '' && v !== null) empty = false;
    }
    if (!empty) rows.push(out);
  }
  return { cols: cols, rows: rows };
}
function sheetMatrix_(name) { return sheetMatrixFilter_(name, null, null); }

/** Bir cariye ait hareketler (matris) — ekstre açılırken tembel yüklenir. */
function getCariHareketler(cariNo) { return sheetMatrixFilter_(SHEET_HAREKETLER, 'CariNo', cariNo); }
/** Tüm hareketler (matris) — Muhasebe/Rapor sekmesi ilk açıldığında yüklenir. */
function getAllHareketler() { return sheetMatrix_(SHEET_HAREKETLER); }

/**
 * Açılış verisi: ayarlar + cariler + davalar + SUNUCUDA hesaplanmış özetler
 * (cari ve dava bazında borç/alacak + son işlem tarihi) + son 8 hareket.
 * 4106 hareketin tamamı GÖNDERİLMEZ; sayfa çok hızlı açılır.
 */
function initData() {
  var harVals = getSheet_(SHEET_HAREKETLER).getDataRange().getValues();
  var aggC = {}, aggD = {}, lastAct = {}, sonHar = [];
  if (harVals.length > 1) {
    var h = harVals[0], ci = h.indexOf('CariNo'), di = h.indexOf('DosyaNo'),
        yi = h.indexOf('Yon'), ti = h.indexOf('Tutar'), tri = h.indexOf('Tarih');
    for (var r = 1; r < harVals.length; r++) {
      var row = harVals[r], cariNo = '' + row[ci];
      var t = toNumber_(row[ti]);
      var isB = ('' + row[yi]).toLowerCase().indexOf('alacak') === -1;
      if (cariNo !== '') { var ac = aggC[cariNo] || (aggC[cariNo] = [0, 0]); if (isB) ac[0] += t; else ac[1] += t; }
      var dosyaNo = '' + row[di];
      if (dosyaNo !== '') {
        var ad = aggD[dosyaNo] || (aggD[dosyaNo] = [0, 0]); if (isB) ad[0] += t; else ad[1] += t;
        var dt = row[tri]; if (dt instanceof Date) dt = Utilities.formatDate(dt, 'Europe/Istanbul', 'yyyy-MM-dd'); dt = '' + dt;
        if (dt && (!lastAct[dosyaNo] || dt > lastAct[dosyaNo])) lastAct[dosyaNo] = dt;
      }
    }
    for (var r2 = Math.max(1, harVals.length - 8); r2 < harVals.length; r2++) {
      var o = {};
      for (var c = 0; c < h.length; c++) { var v = harVals[r2][c]; if (v instanceof Date) v = Utilities.formatDate(v, 'Europe/Istanbul', 'yyyy-MM-dd'); o[h[c]] = v; }
      sonHar.push(o);
    }
    sonHar.reverse();
  }
  return {
    meta: getMeta(),
    cariler: sheetMatrix_(SHEET_CARILER),
    cases: sheetMatrix_(SHEET_DOSYALAR),
    aggC: aggC, aggD: aggD, lastAct: lastAct, sonHar: sonHar,
    harCount: Math.max(0, harVals.length - 1)
  };
}

/* ====================== CARİLER (CRUD) ====================== */

function generateCariNo_(sheet) {
  var values = sheet.getDataRange().getValues(), max = 0;
  for (var r = 1; r < values.length; r++) {
    var m = ('' + values[r][0]).match(/(\d+)\s*$/); if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'C-' + ('0000' + (max + 1)).slice(-4);
}

function addCari(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_CARILER);
    var cariNo = (data.CariNo && ('' + data.CariNo).trim()) || generateCariNo_(sh);
    sh.appendRow([cariNo, data.Unvan || '', data.Tip || 'Müvekkil', data.Telefon || '', data.Email || '',
      data.KimlikVergiNo || '', data.Adres || '', toNumber_(data.AcilisBakiye), data.Notlar || '', nowStamp_()]);
    return { ok: true, cariNo: cariNo };
  } finally { lock.releaseLock(); }
}

function updateCari(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_CARILER);
    var rowIdx = findRowByValue_(sh, 'CariNo', data.CariNo);
    if (rowIdx === -1) return { ok: false, error: 'Cari bulunamadı.' };
    var headers = CARI_HEADERS, cur = sh.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
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
    // Bağlı hareket veya dava varsa silmeyi engelle (veri bütünlüğü)
    var har = getSheet_(SHEET_HAREKETLER).getDataRange().getValues();
    var hc = har[0].indexOf('CariNo');
    for (var r = 1; r < har.length; r++) if ('' + har[r][hc] === '' + cariNo) return { ok: false, error: 'Bu cariye ait hareketler var. Önce hareketleri silin.' };
    var dos = getSheet_(SHEET_DOSYALAR).getDataRange().getValues();
    var dc = dos[0].indexOf('CariNo');
    for (var r2 = 1; r2 < dos.length; r2++) if ('' + dos[r2][dc] === '' + cariNo) return { ok: false, error: 'Bu cariye bağlı dava(lar) var. Önce davaları silin/değiştirin.' };
    var sh = getSheet_(SHEET_CARILER), rowIdx = findRowByValue_(sh, 'CariNo', cariNo);
    if (rowIdx === -1) return { ok: false, error: 'Cari bulunamadı.' };
    sh.deleteRow(rowIdx);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ====================== DOSYALAR (CRUD) ====================== */

function generateDosyaNo_(sheet) {
  var year = new Date().getFullYear(), values = sheet.getDataRange().getValues(), max = 0;
  for (var r = 1; r < values.length; r++) { var m = ('' + values[r][0]).match(/(\d+)\s*$/); if (m) max = Math.max(max, parseInt(m[1], 10)); }
  return 'D-' + year + '-' + ('000' + (max + 1)).slice(-4);
}

function addCase(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_DOSYALAR);
    var dosyaNo = (data.DosyaNo && ('' + data.DosyaNo).trim()) || generateDosyaNo_(sh);
    sh.appendRow([dosyaNo, data.AcilisTarihi || formatDate_(new Date()), data.CariNo || '', data.MuvekkilAd || '',
      data.Avukat || '', data.DavaTuru || '', data.KarsiTaraf || '', data.Asama || 'Yeni Başvuru',
      toNumber_(data.TazminatTalebi), toNumber_(data.AnlasilanUcret), data.Aciklama || '', nowStamp_()]);
    return { ok: true, dosyaNo: dosyaNo };
  } finally { lock.releaseLock(); }
}

function updateCase(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_DOSYALAR), rowIdx = findRowByValue_(sh, 'DosyaNo', data.DosyaNo);
    if (rowIdx === -1) return { ok: false, error: 'Dosya bulunamadı.' };
    var headers = DOSYA_HEADERS, cur = sh.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
    var map = { AcilisTarihi: data.AcilisTarihi, CariNo: data.CariNo, MuvekkilAd: data.MuvekkilAd, Avukat: data.Avukat, DavaTuru: data.DavaTuru,
      KarsiTaraf: data.KarsiTaraf, Asama: data.Asama, TazminatTalebi: toNumber_(data.TazminatTalebi),
      AnlasilanUcret: toNumber_(data.AnlasilanUcret), Aciklama: data.Aciklama, SonGuncelleme: nowStamp_() };
    for (var c = 0; c < headers.length; c++) if (map.hasOwnProperty(headers[c]) && map[headers[c]] !== undefined) cur[c] = map[headers[c]];
    sh.getRange(rowIdx, 1, 1, headers.length).setValues([cur]);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function deleteCase(dosyaNo) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_DOSYALAR), rowIdx = findRowByValue_(sh, 'DosyaNo', dosyaNo);
    if (rowIdx === -1) return { ok: false, error: 'Dosya bulunamadı.' };
    sh.deleteRow(rowIdx);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ====================== HAREKETLER (CRUD) ====================== */

function addHareket(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_HAREKETLER);
    var id = 'H' + new Date().getTime();
    var yon = (('' + data.Yon).toLowerCase().indexOf('alacak') !== -1) ? 'Alacak' : 'Borç';
    sh.appendRow([id, data.Tarih || formatDate_(new Date()), data.CariNo || '', data.DosyaNo || '', yon,
      data.Kategori || '', toNumber_(data.Tutar), data.OdemeYontemi || '', data.BelgeNo || '', data.Aciklama || '', nowStamp_()]);
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
}

function updateHareket(data) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_HAREKETLER), values = sh.getDataRange().getValues();
    var headers = values[0], idCol = headers.indexOf('IslemID');
    for (var r = 1; r < values.length; r++) {
      if ('' + values[r][idCol] === '' + data.IslemID) {
        var cur = sh.getRange(r + 1, 1, 1, headers.length).getValues()[0];
        var yon = (('' + data.Yon).toLowerCase().indexOf('alacak') !== -1) ? 'Alacak' : 'Borç';
        var map = { Tarih: data.Tarih, CariNo: data.CariNo, DosyaNo: data.DosyaNo, Yon: yon, Kategori: data.Kategori,
          Tutar: toNumber_(data.Tutar), OdemeYontemi: data.OdemeYontemi, BelgeNo: data.BelgeNo, Aciklama: data.Aciklama };
        for (var c = 0; c < headers.length; c++) if (map.hasOwnProperty(headers[c]) && map[headers[c]] !== undefined) cur[c] = map[headers[c]];
        sh.getRange(r + 1, 1, 1, headers.length).setValues([cur]);
        return { ok: true };
      }
    }
    return { ok: false, error: 'Hareket bulunamadı.' };
  } finally { lock.releaseLock(); }
}

function deleteHareket(islemId) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEET_HAREKETLER), values = sh.getDataRange().getValues();
    var idCol = values[0].indexOf('IslemID');
    for (var r = 1; r < values.length; r++) if ('' + values[r][idCol] === '' + islemId) { sh.deleteRow(r + 1); return { ok: true }; }
    return { ok: false, error: 'Hareket bulunamadı.' };
  } finally { lock.releaseLock(); }
}

/* ====================== ÖRNEK VERİ ====================== */

function seedSampleData() {
  var cariler = [
    { Unvan: 'Ahmet Yılmaz', Tip: 'Müvekkil', Telefon: '0532 111 22 33', Email: 'ahmet@example.com', KimlikVergiNo: '12345678901', Adres: 'İstanbul', AcilisBakiye: 0, Notlar: '' },
    { Unvan: 'Ayşe Demir', Tip: 'Müvekkil', Telefon: '0541 222 33 44', Email: '', KimlikVergiNo: '23456789012', Adres: 'Ankara', AcilisBakiye: 0, Notlar: '' },
    { Unvan: 'Mehmet Kaya', Tip: 'Müvekkil', Telefon: '0505 333 44 55', Email: '', KimlikVergiNo: '34567890123', Adres: 'İzmir', AcilisBakiye: 0, Notlar: '' },
    { Unvan: 'Fatma Şahin', Tip: 'Müvekkil', Telefon: '0533 444 55 66', Email: '', KimlikVergiNo: '45678901234', Adres: 'Bursa', AcilisBakiye: 0, Notlar: '' },
    { Unvan: 'XYZ Bilirkişilik Ltd.', Tip: 'Tedarikçi', Telefon: '0212 000 00 00', Email: '', KimlikVergiNo: '1112223334', Adres: 'İstanbul', AcilisBakiye: 0, Notlar: 'Bilirkişi hizmeti' }
  ];
  var cariNos = cariler.map(function (c) { return addCari(c).cariNo; });

  var davalar = [
    { CariNo: cariNos[0], MuvekkilAd: 'Ahmet Yılmaz', Avukat: 'Nida Gamsız', DavaTuru: 'Değer Kaybı', KarsiTaraf: 'Anadolu Sigorta', Asama: 'Dava Açıldı', TazminatTalebi: 45000, AnlasilanUcret: 9000, AcilisTarihi: '2026-01-15', Aciklama: '34 ABC 123 plakalı araç.' },
    { CariNo: cariNos[1], MuvekkilAd: 'Ayşe Demir', Avukat: 'Sadık Sarıbıyık', DavaTuru: 'Hasar Farkı', KarsiTaraf: 'Axa Sigorta', Asama: 'Bilirkişi', TazminatTalebi: 28000, AnlasilanUcret: 5600, AcilisTarihi: '2026-02-03', Aciklama: 'Eksik hasar bedeli farkı.' },
    { CariNo: cariNos[2], MuvekkilAd: 'Mehmet Kaya', Avukat: 'Alperen Codey', DavaTuru: 'Kazanç Kaybı', KarsiTaraf: 'Allianz', Asama: 'Karar Bekleniyor', TazminatTalebi: 60000, AnlasilanUcret: 12000, AcilisTarihi: '2026-01-28', Aciklama: 'Ticari taksi 45 gün çalışamama.' },
    { CariNo: cariNos[3], MuvekkilAd: 'Fatma Şahin', Avukat: 'Nida Gamsız', DavaTuru: 'DASK', KarsiTaraf: 'DASK', Asama: 'Tahsilat', TazminatTalebi: 80000, AnlasilanUcret: 12000, AcilisTarihi: '2025-12-10', Aciklama: 'Deprem hasarı eksik ödeme.' }
  ];
  var dosyaNos = davalar.map(function (d) { return addCase(d).dosyaNo; });

  var hareketler = [
    { CariNo: cariNos[0], DosyaNo: dosyaNos[0], Yon: 'Borç', Kategori: 'Vekalet Ücreti', Tutar: 9000, Tarih: '2026-01-15', OdemeYontemi: '', BelgeNo: '', Aciklama: 'Vekalet ücreti tahakkuku' },
    { CariNo: cariNos[0], DosyaNo: dosyaNos[0], Yon: 'Alacak', Kategori: 'Avans', Tutar: 3000, Tarih: '2026-01-16', OdemeYontemi: 'Havale/EFT', BelgeNo: 'MKB-001', Aciklama: 'Açılış avansı' },
    { CariNo: cariNos[0], DosyaNo: dosyaNos[0], Yon: 'Borç', Kategori: 'Dava Harcı', Tutar: 1200, Tarih: '2026-01-20', OdemeYontemi: '', BelgeNo: '', Aciklama: 'Mahkeme harcı yansıtma' },
    { CariNo: cariNos[1], DosyaNo: dosyaNos[1], Yon: 'Borç', Kategori: 'Vekalet Ücreti', Tutar: 5600, Tarih: '2026-02-03', OdemeYontemi: '', BelgeNo: '', Aciklama: 'Vekalet ücreti' },
    { CariNo: cariNos[1], DosyaNo: dosyaNos[1], Yon: 'Alacak', Kategori: 'Tahsilat', Tutar: 2000, Tarih: '2026-02-05', OdemeYontemi: 'Nakit', BelgeNo: 'MKB-002', Aciklama: 'Peşin tahsilat' },
    { CariNo: cariNos[2], DosyaNo: dosyaNos[2], Yon: 'Borç', Kategori: 'Vekalet Ücreti', Tutar: 12000, Tarih: '2026-01-28', OdemeYontemi: '', BelgeNo: '', Aciklama: '' },
    { CariNo: cariNos[2], DosyaNo: dosyaNos[2], Yon: 'Alacak', Kategori: 'Avans', Tutar: 4000, Tarih: '2026-02-01', OdemeYontemi: 'Kredi Kartı', BelgeNo: 'MKB-003', Aciklama: '' },
    { CariNo: cariNos[3], DosyaNo: dosyaNos[3], Yon: 'Borç', Kategori: 'Vekalet Ücreti', Tutar: 12000, Tarih: '2025-12-10', OdemeYontemi: '', BelgeNo: '', Aciklama: '' },
    { CariNo: cariNos[3], DosyaNo: dosyaNos[3], Yon: 'Alacak', Kategori: 'Tahsilat', Tutar: 12000, Tarih: '2026-03-15', OdemeYontemi: 'Havale/EFT', BelgeNo: 'MKB-004', Aciklama: 'Tam tahsilat' },
    { CariNo: cariNos[4], DosyaNo: '', Yon: 'Alacak', Kategori: 'Tahsilat', Tutar: 2000, Tarih: '2026-02-12', OdemeYontemi: 'Havale/EFT', BelgeNo: '', Aciklama: 'Bilirkişi ödemesi (tedarikçi)' }
  ];
  hareketler.forEach(function (h) { addHareket(h); });

  return { ok: true, cari: cariNos.length, dosya: dosyaNos.length, hareket: hareketler.length };
}

function kurulumYap() { var ss = getDB_(); Logger.log('Veritabanı hazır: ' + ss.getUrl()); return ss.getUrl(); }
