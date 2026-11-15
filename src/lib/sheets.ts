import { Order } from '@/types/order';
import { FuelConfig, calculateFuelExpense, fuelForDay, getFuelConfig } from './fuel-calc';
import { lookupPriceBook } from './price-book';
import { getLocationById } from './locations';
import { toLocalDateStr } from './historical-profit';
export { APPS_SCRIPT_CODE as SAMPLE_APPS_SCRIPT_CODE } from './apps-script';

export const SHEETS_COLUMNS = [
  'A: Timestamp',
  'B: ลำดับส่ง (Stop No.)',
  'C: บ้านเลขที่ (House No.)',
  'D: ซอย/หมู่บ้าน/โซน (Soi/Zone)',
  'E: ชื่อลูกค้า (Customer Name)',
  'F: เบอร์โทร (Phone)',
  'G: รายการสินค้า (Items)',
  'H: ยอดเงินรวม (Total Amount)',
  'I: สถานะการชำระเงิน (Payment Status)',
  'J: ยอดเงินที่เก็บได้จริง (Collected Amount)',
  'K: ช่องทางชำระ (Payment Method)',
  'L: สถานะการจัดส่ง (Delivery Status)',
  'M: เวลาที่ส่งเสร็จ (Delivered At)',
  'N: หมายเหตุ (Notes)',
  'O: ต้นทุนสินค้า (Produce Cost)',
  'P: กำไรขั้นต้น (Gross Profit)',
  'Q: เฉลี่ยค่าน้ำมัน (Fuel Cost Share)',
  'R: กำไรสุทธิ (Net Profit)'
];

/**
 * คำนวณต้นทุนสินค้าของออเดอร์นั้นๆ โดยอิงจาก item.costPrice หรือดึงจาก Price Book
 */
export function calculateOrderCost(order: Order): number {
  if (!order.items || order.items.length === 0) return 0;
  return order.items.reduce((sum, item) => {
    const qty = parseFloat(String(item.quantity)) || 1;
    let cost = typeof item.costPrice === 'number' && item.costPrice > 0 ? item.costPrice : 0;
    if (cost === 0) {
      const bookEntry = lookupPriceBook(item.name);
      if (bookEntry && bookEntry.costPrice > 0) {
        cost = bookEntry.costPrice;
      }
    }
    return sum + (qty * cost);
  }, 0);
}

/**
 * แปลงรายการสินค้าให้เป็นข้อความอ่านง่าย 1 ช่องใน Google Sheets
 * เช่น "หมูบด 1 กก., ผักบุ้ง 2 กำ, ไข่ไก่ 1 แผง"
 */
export function formatItemsSummary(items: Order['items']): string {
  if (!items || items.length === 0) return '-';
  return items.map(item => `${item.name} ${item.quantity} ${item.unit}`).join(', ');
}

/**
 * แปลงสถานะชำระเงินเป็นภาษาไทย
 */
export function formatPaymentStatusThai(status: Order['paymentStatus']): string {
  return status === 'PAID' ? 'โอนแล้ว' : 'เก็บปลายทาง (COD)';
}

/**
 * แปลงช่องทางการชำระเงินเป็นภาษาไทย
 */
export function formatPaymentMethodThai(method: Order['paymentMethod']): string {
  switch (method) {
    case 'TRANSFER':
      return 'โอนเงินล่วงหน้า';
    case 'CASH':
      return 'เงินสด';
    case 'QR_SCAN':
      return 'สแกนจ่าย QR หน้าบ้าน';
    case 'UNPAID':
      return 'ค้างชำระ / จ่ายไม่ครบ';
    default:
      return 'ยังไม่ชำระ';
  }
}

/**
 * แปลงสถานะการจัดส่งเป็นภาษาไทย
 */
export function formatDeliveryStatusThai(status: Order['deliveryStatus']): string {
  switch (status) {
    case 'PENDING':
      return 'รอส่ง';
    case 'IN_TRANSIT':
      return 'กำลังส่ง';
    case 'DELIVERED':
      return 'ส่งสำเร็จ';
    case 'CANCELLED':
      return 'ยกเลิก';
    default:
      return status;
  }
}

/**
 * แปลง Order 1 รายการ ให้เป็น Array ของค่าใน 1 แถวของ Google Sheets (คอลัมน์ A ถึง R รวมกำไร-ขาดทุน)
 */
export function orderToSheetRow(order: Order, fuelCostPerOrder: number = 0): (string | number)[] {
  const now = new Date();
  const timestampStr = order.updatedAt || now.toISOString();

  // คำนวณกำไร-ต้นทุน
  const produceCost = Math.round(calculateOrderCost(order) * 100) / 100;
  const grossProfit = Math.round(((order.totalAmount || 0) - produceCost) * 100) / 100;
  const fuelShare = Math.round(fuelCostPerOrder * 100) / 100;
  const netProfit = Math.round((grossProfit - fuelShare) * 100) / 100;

  return [
    timestampStr,                                   // A: Timestamp
    order.stopNumber,                               // B: ลำดับส่ง
    order.houseNumber,                              // C: บ้านเลขที่
    order.soi || '-',                               // D: ซอย/หมู่บ้าน/โซน
    order.customerName,                             // E: ชื่อลูกค้า
    order.phone || '-',                             // F: เบอร์โทร
    formatItemsSummary(order.items),                // G: รายการสินค้า
    order.totalAmount,                              // H: ยอดเงินรวม
    formatPaymentStatusThai(order.paymentStatus),   // I: สถานะการชำระเงิน
    order.collectedAmount || 0,                     // J: ยอดเงินที่เก็บได้จริง
    formatPaymentMethodThai(order.paymentMethod),   // K: ช่องทางชำระ
    formatDeliveryStatusThai(order.deliveryStatus), // L: สถานะการจัดส่ง
    order.deliveredAt || '-',                       // M: เวลาที่ส่งเสร็จ
    order.notes ? (order.partialReason ? `${order.notes} [ค้างชำระ: ${order.partialReason}]` : order.notes) : (order.partialReason || '-'), // N: หมายเหตุ
    produceCost,                                    // O: ต้นทุนสินค้า
    grossProfit,                                    // P: กำไรขั้นต้น
    fuelShare,                                      // Q: เฉลี่ยค่าน้ำมัน
    netProfit                                       // R: กำไรสุทธิ
  ];
}

export interface SheetsOrderRow {
  id: string;
  date: string; // YYYY-MM-DD (order day, local time)
  customerName: string;
  houseNumber: string;
  location: string;
  phone: string;
  items: string;
  total: number;
  paid: number;
  due: number;
  paymentMethod: string;
  status: string;
  cost: number;
  profit: number;
  notes: string;
  updatedAt: string;
}

export interface SheetsPayload {
  action: 'UPSERT_ORDERS';
  version: 2;
  orders: SheetsOrderRow[];
  expenses: { date: string; fuel: number; other: number; km: number }[];
}

/** Shape the app's orders for the v2 Apps Script (history-keeping upsert by Order ID). */
export function buildSheetsPayload(orders: Order[], fuelConfig: FuelConfig, today: string = toLocalDateStr()): SheetsPayload {
  const rows = orders.map(o => {
    const created = o.createdAt ? new Date(o.createdAt) : null;
    const date = created && !isNaN(created.getTime()) ? toLocalDateStr(created) : today;
    const total = o.totalAmount || 0;
    const paid = o.deliveryStatus === 'DELIVERED' ? o.collectedAmount || 0 : o.paymentStatus === 'PAID' ? total : 0;
    const cost = Math.round(calculateOrderCost(o));
    return {
      id: o.id,
      date,
      customerName: o.customerName || '-',
      houseNumber: o.houseNumber || '',
      location: getLocationById(o.locationId)?.shortName || o.soi || '',
      phone: o.phone || '',
      items: formatItemsSummary(o.items),
      total,
      paid,
      due: Math.max(0, total - paid),
      paymentMethod: o.deliveryStatus === 'DELIVERED' || o.paymentStatus === 'PAID'
        ? formatPaymentMethodThai(o.paymentMethod || (o.paymentStatus === 'PAID' ? 'TRANSFER' : null))
        : 'เก็บปลายทาง (ยังไม่เก็บ)',
      status: formatDeliveryStatusThai(o.deliveryStatus),
      cost,
      profit: total - cost,
      notes: [o.notes, o.partialReason && `ค้างชำระ: ${o.partialReason}`].filter(Boolean).join(' · '),
      updatedAt: o.updatedAt || ''
    };
  });

  const dayCfg = fuelForDay(fuelConfig, today); // travel from another day isn't today's expense
  const fuel = calculateFuelExpense(dayCfg);
  const expenses =
    dayCfg.distanceKm > 0 || fuel.otherExpenses > 0
      ? [{ date: today, fuel: fuel.fuelCost, other: fuel.otherExpenses, km: dayCfg.distanceKm }]
      : [];

  return { action: 'UPSERT_ORDERS', version: 2, orders: rows, expenses };
}

/**
 * ส่งออเดอร์ไป Google Sheets ผ่าน server (/api/sheets/sync) — server อ่านคำตอบจากชีตได้
 * จึงรู้ว่าบันทึกสำเร็จจริงหรือไม่ (ยิงตรงแบบ no-cors เดิมรายงาน "สำเร็จ" เสมอแม้ชีตปฏิเสธ)
 */
export async function syncToGoogleSheets(
  orders: Order[],
  webhookUrl?: string,
  fuelConfig?: FuelConfig
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const timestamp = new Date().toISOString();
  const payload = buildSheetsPayload(orders, fuelConfig || getFuelConfig());

  try {
    const res = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders, webhookUrl, payload })
    });
    const data = await res.json().catch(() => ({}));
    return {
      success: res.ok && data.success !== false,
      message: data.message || (res.ok ? 'ซิงค์เรียบร้อย' : `ซิงค์ไม่สำเร็จ (${res.status})`),
      timestamp
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown sync error';
    return {
      success: false,
      message: `ซิงค์ไม่สำเร็จ (${errorMsg}) ข้อมูลยังอยู่ในเครื่อง`,
      timestamp
    };
  }
}

/**
 * สร้างไฟล์ CSV พร้อม UTF-8 BOM สำหรับดาวน์โหลดไปเปิดใน Excel / Google Sheets
 */
export function exportOrdersToCsv(orders: Order[], fuelConfig?: FuelConfig): string {
  const headers = [
    'Timestamp',
    'Stop No.',
    'House No.',
    'Soi/Zone',
    'Customer Name',
    'Phone',
    'Items',
    'Total Amount',
    'Payment Status',
    'Collected Amount',
    'Payment Method',
    'Delivery Status',
    'Delivered At',
    'Notes',
    'Produce Cost',
    'Gross Profit',
    'Fuel Share',
    'Net Profit'
  ];

  const activeCfg = fuelConfig || getFuelConfig();
  const fuelCalc = calculateFuelExpense(activeCfg);
  const activeOrdersCount = orders.filter(o => o.deliveryStatus !== 'CANCELLED').length;
  const fuelCostPerOrder = activeOrdersCount > 0 ? fuelCalc.fuelCost / activeOrdersCount : 0;

  const rows = orders.map(o => orderToSheetRow(o, fuelCostPerOrder));

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(','))
  ].join('\r\n');

  // ใส่ UTF-8 BOM (\uFEFF) เพื่อให้ภาษาไทยใน Excel และชีตไม่เป็นภาษาต่างดาว
  return '\uFEFF' + csvContent;
}
