/**
 * Customer Pre-Arrival Notification Generator (ระบบแจ้งเตือนลูกค้าก่อนส่ง)
 * สร้างข้อความแจ้งเตือนอัตโนมัติ 1 คลิก พร้อมปุ่ม SMS, LINE Share, และ Copy Text
 */

import { Order } from '@/types/order';
import { formatFullAddress } from './locations';

export interface DeliveryNotificationOptions {
  driverName?: string;
  customNote?: string;
  estimatedMinutes?: number;
}

export interface DeliveryNotificationData {
  text: string;
  smsUrl: string;
  lineShareUrl: string;
  phone: string;
  customerName: string;
  houseNumber: string;
  paymentStatus: 'PAID' | 'COD';
  totalAmount: number;
}

/**
 * สรุปรายการสินค้าเป็นข้อความสั้นสำหรับแจ้งเตือน
 */
function formatShortItemList(items: Order['items']): string {
  if (!items || items.length === 0) return 'ของสดจากตลาด';
  return items.map(it => `${it.name} ${it.quantity} ${it.unit}`).join(', ');
}

/**
 * สร้างข้อความแจ้งเตือนลูกค้าก่อนคนขับถึงบ้าน
 */
export function generateDeliveryAlertText(
  order: Order,
  options?: DeliveryNotificationOptions
): string {
  const addressText = formatFullAddress({
    locationId: order.locationId,
    building: order.building,
    houseNumber: order.houseNumber,
    soi: order.soi
  }) || (order.houseNumber ? `บ้านเลขที่ ${order.houseNumber}` : 'ปลายทาง');

  const itemsText = formatShortItemList(order.items);
  const timeText = options?.estimatedMinutes
    ? `อีกประมาณ ${options.estimatedMinutes} นาที `
    : 'กำลังนำส่ง';

  const driverSignature = options?.driverName
    ? `\nคนขับ: ${options.driverName}`
    : '';

  if (order.paymentStatus === 'COD') {
    const formattedAmount = (order.totalAmount || 0).toLocaleString('th-TH');
    return (
`สวัสดีครับ/ค่ะ 🛵 ของสดจาก MarketDrop ${timeText}ถึง ${addressText} แล้วนะครับ

📦 รายการของสด:
${itemsText}

💰 ยอดเก็บเงินปลายทาง: ${formattedAmount} บาท
(รบกวนเตรียมเงินสด หรือสแกนจ่าย QR หน้าบ้านได้เลยครับ)
${order.notes ? `\n📍 จุดวาง/หมายเหตุ: ${order.notes}` : ''}${options?.customNote ? `\n💬 ข้อความเพิ่มเติม: ${options.customNote}` : ''}${driverSignature}

ขอบคุณมากครับ 🙏`
    ).trim();
  } else {
    const formattedAmount = (order.totalAmount || 0).toLocaleString('th-TH');
    return (
`สวัสดีครับ/ค่ะ 🛵 ของสดจาก MarketDrop ${timeText}ถึง ${addressText} แล้วนะครับ

📦 รายการของสด:
${itemsText}

✅ ชำระเงินเรียบร้อยแล้ว (ยอด ${formattedAmount} บาท)
${order.notes ? `\n📍 จุดวาง/หมายเหตุ: ${order.notes}` : ''}${options?.customNote ? `\n💬 ข้อความเพิ่มเติม: ${options.customNote}` : ''}${driverSignature}

ขอบคุณมากครับ 🙏`
    ).trim();
  }
}

/**
 * สร้างลิงก์สำหรับส่ง SMS
 */
export function generateSmsLink(phone: string, message: string): string {
  const cleanPhone = (phone || '').replace(/[- ]/g, '').trim();
  return `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
}

/**
 * สร้างลิงก์สำหรับแชร์ข้อความไปยัง LINE App
 */
export function generateLineShareLink(message: string): string {
  return `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
}

/**
 * สร้างชุดข้อมูลแจ้งเตือนครบวงจร (Notification Payload) สำหรับ 1-Click Modal
 */
export function getDeliveryNotificationData(
  order: Order,
  options?: DeliveryNotificationOptions
): DeliveryNotificationData {
  const text = generateDeliveryAlertText(order, options);
  const cleanPhone = (order.phone || '').replace(/[- ]/g, '').trim();

  return {
    text,
    smsUrl: generateSmsLink(cleanPhone, text),
    lineShareUrl: generateLineShareLink(text),
    phone: cleanPhone,
    customerName: order.customerName || 'ลูกค้า',
    houseNumber: order.houseNumber,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount || 0
  };
}

/* ---------------- Quick Messages (ข้อความด่วนที่ส่งประจำ) ---------------- */

const QUICK_MESSAGES_KEY = 'marketdrop_quick_messages_v1';
const DRIVER_NAME_KEY = 'marketdrop_driver_name_v1';

/** ใช้ {ชื่อ} {บ้าน} {ยอด} {รายการ} เป็นช่องเติมอัตโนมัติ */
export const DEFAULT_QUICK_MESSAGES: string[] = [
  'สวัสดีครับ {ชื่อ} 🛵 ถึงหน้าบ้าน {บ้าน} แล้วครับ',
  'วางของไว้หน้าบ้าน {บ้าน} เรียบร้อยแล้วครับ 🙏',
  'รบกวนโอนยอด {ยอด} บาท ได้เลยครับ ขอบคุณครับ',
  'ขออภัยครับ วันนี้ของบางรายการหมด ขอเปลี่ยนเป็นอย่างอื่นได้ไหมครับ',
  'โทรหาแล้วไม่ติด รบกวนติดต่อกลับด้วยครับ 📞',
  'ขอบคุณที่อุดหนุน MarketDrop นะครับ 💚'
];

export function fillMessageTemplate(template: string, order: Order): string {
  return template
    .replaceAll('{ชื่อ}', order.customerName || 'ลูกค้า')
    .replaceAll('{บ้าน}', order.houseNumber || '')
    .replaceAll('{ยอด}', (order.totalAmount || 0).toLocaleString('th-TH'))
    .replaceAll('{รายการ}', formatShortItemList(order.items));
}

export function loadQuickMessages(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_QUICK_MESSAGES];
  try {
    const parsed = JSON.parse(localStorage.getItem(QUICK_MESSAGES_KEY) || 'null');
    return Array.isArray(parsed) ? parsed.filter((m): m is string => typeof m === 'string') : [...DEFAULT_QUICK_MESSAGES];
  } catch {
    return [...DEFAULT_QUICK_MESSAGES];
  }
}

export function saveQuickMessages(list: string[]): void {
  try {
    localStorage.setItem(QUICK_MESSAGES_KEY, JSON.stringify(list));
  } catch {
    // storage full / private mode — keep in memory only
  }
}

export function loadDriverName(): string {
  try {
    return localStorage.getItem(DRIVER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveDriverName(name: string): void {
  try {
    localStorage.setItem(DRIVER_NAME_KEY, name);
  } catch {
    // ignore
  }
}
