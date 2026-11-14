/**
 * Google Apps Script the user pastes into their sheet (Extensions → Apps Script).
 * Keeps history: orders are upserted by Order ID (never wiped), then the customer and
 * profit summary tabs are rebuilt from the full history on every sync.
 * Tested in test/marketdrop.test.ts by running it against a fake SpreadsheetApp.
 */
export const APPS_SCRIPT_CODE = `/**
 * MarketDrop → Google Sheets (v2)
 * แท็บ: ออเดอร์ · ลูกค้า · ค่าเดินทาง · สรุปกำไร
 * Deploy: ทำให้ใช้งานได้ → เว็บแอป → ดำเนินการเป็น "ฉัน" · ผู้มีสิทธิ์เข้าถึง "ทุกคน"
 */
var ORDER_HEADERS = ['วันที่', 'ลูกค้า', 'บ้านเลขที่', 'โครงการ/ซอย', 'เบอร์โทร', 'รายการสินค้า',
  'ยอดบิล', 'จ่ายแล้ว', 'ค้างจ่าย', 'ช่องทางชำระ', 'สถานะ', 'ต้นทุนของ', 'กำไรขั้นต้น',
  'หมายเหตุ', 'Order ID', 'อัปเดตล่าสุด'];
var COL = { date: 0, customer: 1, house: 2, total: 6, paid: 7, due: 8, status: 10, cost: 11, profit: 12, id: 14 };
var EXPENSE_HEADERS = ['วันที่', 'ค่าน้ำมัน', 'ค่าใช้จ่ายอื่น', 'ระยะทาง (กม.)'];
var CUSTOMER_HEADERS = ['ลูกค้า', 'บ้านเลขที่', 'จำนวนครั้ง', 'วันที่สั่ง', 'ยอดซื้อรวม', 'จ่ายแล้ว', 'ค้างจ่าย', 'ต้นทุน', 'กำไร'];
var SUMMARY_HEADERS = ['ช่วงเวลา', 'ออเดอร์', 'รายได้', 'ต้นทุนของ', 'ค่าเดินทาง', 'กำไรสุทธิ', '% กำไร'];
var TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
var HEADER_BG = '#f1f5f9';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (data.action === 'PING') return json_({ status: 'success', message: 'pong' });
    var orders = data.orders || [];
    upsertOrders_(ss, orders);
    upsertExpenses_(ss, data.expenses || []);
    var all = readOrders_(ss);
    var expenses = readExpenses_(ss);
    rebuildCustomers_(ss, all);
    rebuildSummary_(ss, all, expenses);
    return json_({ status: 'success', message: 'บันทึก ' + orders.length + ' ออเดอร์', totalOrders: all.length });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ status: 'success', app: 'MarketDrop', version: 2 });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground(HEADER_BG);
  sh.setFrozenRows(1);
  return sh;
}

// Sheets turns "2026-11-15" into a Date object; read it back as text either way
function ymd_(v) {
  if (v instanceof Date) {
    return v.getFullYear() + '-' + pad_(v.getMonth() + 1) + '-' + pad_(v.getDate());
  }
  return String(v || '');
}
function pad_(n) { return (n < 10 ? '0' : '') + n; }
function num_(v) { var n = Number(v); return isFinite(n) ? n : 0; }

function bodyRows_(sh, width) {
  var last = sh.getLastRow();
  return last > 1 ? sh.getRange(2, 1, last - 1, width).getValues() : [];
}

function writeBody_(sh, rows, width, textCols) {
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, width).clearContent();
  if (!rows.length) return;
  for (var i = 0; i < textCols.length; i++) {
    sh.getRange(2, textCols[i] + 1, rows.length, 1).setNumberFormat('@');
  }
  sh.getRange(2, 1, rows.length, width).setValues(rows);
}

function upsertOrders_(ss, orders) {
  var sh = sheet_(ss, 'ออเดอร์', ORDER_HEADERS);
  var w = ORDER_HEADERS.length;
  var rows = bodyRows_(sh, w);
  var index = {};
  for (var i = 0; i < rows.length; i++) { rows[i][COL.date] = ymd_(rows[i][COL.date]); index[String(rows[i][COL.id])] = i; }
  for (var j = 0; j < orders.length; j++) {
    var o = orders[j];
    if (!o || !o.id) continue;
    var row = [o.date, o.customerName, o.houseNumber, o.location, o.phone, o.items,
      num_(o.total), num_(o.paid), num_(o.due), o.paymentMethod, o.status,
      num_(o.cost), num_(o.profit), o.notes, String(o.id), o.updatedAt];
    if (index.hasOwnProperty(String(o.id))) rows[index[String(o.id)]] = row;
    else { index[String(o.id)] = rows.length; rows.push(row); }
  }
  rows.sort(function (a, b) {
    if (a[COL.date] !== b[COL.date]) return a[COL.date] < b[COL.date] ? 1 : -1;
    return String(a[COL.customer]).localeCompare(String(b[COL.customer]));
  });
  writeBody_(sh, rows, w, [COL.date, 2, 4, COL.id]);
  if (rows.length) sh.getRange(2, COL.total + 1, rows.length, 3).setNumberFormat('#,##0');
  if (rows.length) sh.getRange(2, COL.cost + 1, rows.length, 2).setNumberFormat('#,##0');
}

function readOrders_(ss) {
  var sh = ss.getSheetByName('ออเดอร์');
  var rows = sh ? bodyRows_(sh, ORDER_HEADERS.length) : [];
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[COL.id] || r[COL.status] === 'ยกเลิก') continue;
    out.push({ date: ymd_(r[COL.date]), customer: String(r[COL.customer] || '-'), house: String(r[COL.house] || ''),
      total: num_(r[COL.total]), paid: num_(r[COL.paid]), due: num_(r[COL.due]), cost: num_(r[COL.cost]), profit: num_(r[COL.profit]) });
  }
  return out;
}

function upsertExpenses_(ss, expenses) {
  var sh = sheet_(ss, 'ค่าเดินทาง', EXPENSE_HEADERS);
  var w = EXPENSE_HEADERS.length;
  var rows = bodyRows_(sh, w);
  var index = {};
  for (var i = 0; i < rows.length; i++) { rows[i][0] = ymd_(rows[i][0]); index[rows[i][0]] = i; }
  for (var j = 0; j < expenses.length; j++) {
    var x = expenses[j];
    if (!x || !x.date) continue;
    var row = [x.date, num_(x.fuel), num_(x.other), num_(x.km)];
    if (index.hasOwnProperty(x.date)) rows[index[x.date]] = row;
    else { index[x.date] = rows.length; rows.push(row); }
  }
  rows.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; });
  writeBody_(sh, rows, w, [0]);
}

function readExpenses_(ss) {
  var rows = bodyRows_(ss.getSheetByName('ค่าเดินทาง'), EXPENSE_HEADERS.length);
  var byDate = {};
  for (var i = 0; i < rows.length; i++) byDate[ymd_(rows[i][0])] = num_(rows[i][1]) + num_(rows[i][2]);
  return byDate;
}

function rebuildCustomers_(ss, orders) {
  var sh = sheet_(ss, 'ลูกค้า', CUSTOMER_HEADERS);
  var map = {}, keys = [];
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    var k = o.customer + '|' + o.house;
    if (!map[k]) { map[k] = { name: o.customer, house: o.house, n: 0, dates: [], total: 0, paid: 0, due: 0, cost: 0, profit: 0 }; keys.push(k); }
    var c = map[k];
    c.n++; c.total += o.total; c.paid += o.paid; c.due += o.due; c.cost += o.cost; c.profit += o.profit;
    if (c.dates.indexOf(o.date) < 0) c.dates.push(o.date);
  }
  var rows = keys.map(function (k) {
    var c = map[k];
    c.dates.sort().reverse();
    return [c.name, c.house, c.n, c.dates.map(thaiDate_).join(', '), c.total, c.paid, c.due, c.cost, c.profit];
  });
  rows.sort(function (a, b) { return b[4] - a[4]; });
  writeBody_(sh, rows, CUSTOMER_HEADERS.length, [1]);
  if (rows.length) sh.getRange(2, 5, rows.length, 5).setNumberFormat('#,##0');
}

function thaiDate_(s) {
  var p = String(s).split('-');
  return p.length === 3 ? Number(p[2]) + ' ' + TH_MONTHS[Number(p[1]) - 1] + ' ' + p[0] : String(s);
}

function weekStart_(s) {
  var p = s.split('-');
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
  return ymd_(d);
}

function group_(orders, expenses, keyFn, labelFn) {
  var g = {}, keys = [];
  function bucket(k) {
    if (!g[k]) { g[k] = { n: 0, rev: 0, cost: 0, travel: 0 }; keys.push(k); }
    return g[k];
  }
  for (var i = 0; i < orders.length; i++) {
    var b = bucket(keyFn(orders[i].date));
    b.n++; b.rev += orders[i].total; b.cost += orders[i].cost;
  }
  for (var d in expenses) {
    if (expenses.hasOwnProperty(d) && expenses[d]) bucket(keyFn(d)).travel += expenses[d];
  }
  keys.sort().reverse();
  return keys.map(function (k) {
    var b = g[k];
    var net = b.rev - b.cost - b.travel;
    return [labelFn(k), b.n, b.rev, b.cost, b.travel, net, b.rev ? Math.round((net / b.rev) * 1000) / 10 : 0];
  });
}

function rebuildSummary_(ss, orders, expenses) {
  var sh = ss.getSheetByName('สรุปกำไร') || ss.insertSheet('สรุปกำไร', 0);
  sh.clear();
  var w = SUMMARY_HEADERS.length;
  var sections = [
    ['รายปี', group_(orders, expenses, function (d) { return d.slice(0, 4); }, function (k) { return 'ปี ' + k; })],
    ['รายเดือน', group_(orders, expenses, function (d) { return d.slice(0, 7); }, function (k) { return TH_MONTHS[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4); })],
    ['รายสัปดาห์', group_(orders, expenses, weekStart_, function (k) { return 'สัปดาห์เริ่ม ' + thaiDate_(k); })],
    ['รายวัน', group_(orders, expenses, function (d) { return d; }, thaiDate_)]
  ];
  sh.getRange(1, 1, 1, 1).setValues([['สรุปกำไร-ขาดทุน MarketDrop']]).setFontWeight('bold').setFontSize(14);
  var r = 3;
  for (var s = 0; s < sections.length; s++) {
    var rows = sections[s][1];
    sh.getRange(r, 1, 1, 1).setValues([[sections[s][0]]]).setFontWeight('bold').setFontSize(12);
    sh.getRange(r + 1, 1, 1, w).setValues([SUMMARY_HEADERS]).setFontWeight('bold').setBackground(HEADER_BG);
    if (rows.length) {
      sh.getRange(r + 2, 1, rows.length, w).setValues(rows);
      sh.getRange(r + 2, 3, rows.length, 4).setNumberFormat('#,##0');
      for (var i = 0; i < rows.length; i++) {
        sh.getRange(r + 2 + i, 6, 1, 1).setFontColor(rows[i][5] < 0 ? '#e11d48' : '#047857');
      }
    }
    r += rows.length + 4;
  }
}
`;
