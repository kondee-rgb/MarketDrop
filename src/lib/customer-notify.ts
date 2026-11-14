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
