export type PaymentStatus = 'PAID' | 'COD'; // โอนแล้ว / เก็บเงินปลายทาง
export type PaymentMethod = 'TRANSFER' | 'CASH' | 'QR_SCAN' | 'UNPAID'; // โอนแล้ว / เงินสด / สแกนหน้าบ้าน / ค้างชำระ
export type DeliveryStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'; // รอส่ง / กำลังส่ง / ส่งสำเร็จ / ยกเลิก

export interface OrderItem {
  id: string;
  name: string;
  quantity: string | number;
  unit: string;
  checked?: boolean; // สำหรับ Driver checklist
  price?: number;
  category?: 'meat' | 'veg' | 'egg_dairy' | 'spice' | 'dry' | 'other';
}

export interface Order {
  id: string;
  stopNumber: number; // ลำดับส่ง 1, 2, 3...
  houseNumber: string; // เช่น "12/1", "45/10", "99/2"
  soi: string; // เช่น "ซอย 3", "ซอยมิตรภาพ 5", "หมู่บ้านพฤกษา"
  customerName: string; // เช่น "คุณสมชาย", "พี่นก"
  phone: string; // เช่น "081-234-5678"
  items: OrderItem[];
  totalAmount: number; // ยอดรวมทั้งบิล (บาท)
  paymentStatus: PaymentStatus; // โอนแล้ว / เก็บปลายทาง
  collectedAmount: number; // ยอดที่คนขับเก็บได้จริง (บาท)
  paymentMethod: PaymentMethod | null;
  deliveryStatus: DeliveryStatus;
  deliveredAt: string | null; // วันเวลาที่ส่งเสร็จ เช่น "2026-11-14 20:30"
  notes: string; // หมายเหตุ เช่น "วางไว้โต๊ะหน้าบ้าน", "แขวนรั้ว"
  slipImage?: string | null; // รูปภาพสลิปหรือรูปถ่ายออเดอร์
  partialReason?: string; // หมายเหตุกรณีจ่ายไม่ครบ / ค้างจ่าย
  syncedToSheets?: boolean; // สถานะการซิงค์ลง Google Sheet
  createdAt: string;
  updatedAt: string;
}

export interface ParsedOrderDraft {
  houseNumber: string;
  soi: string;
  customerName: string;
  phone: string;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: PaymentStatus;
  notes: string;
  rawText?: string;
  imageUrl?: string;
}

/**
 * โครงสร้างสำหรับแท็บ "ของที่ต้องซื้อ" (Market Shopping List)
 */
export interface ShoppingAllocation {
  orderId: string;
  houseNumber: string;
  customerName: string;
  quantity: string | number;
  unit: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: 'meat' | 'veg' | 'egg_dairy' | 'spice' | 'dry' | 'other';
  totalQuantity: string | number;
  unit: string;
  bought: boolean;
  estimatedPrice?: number;
  allocations: ShoppingAllocation[];
  sourceNote?: string;
  imageUrl?: string;
}

export interface GoogleSheetsConfig {
  webhookUrl: string;
  spreadsheetId?: string;
  sheetName?: string;
  autoSync: boolean;
  lastSyncTime?: string | null;
}

export type SortMode = 'NATURAL_HOUSE' | 'SOI_THEN_HOUSE' | 'MANUAL';
export type SortDirection = 'ASC' | 'DESC';

export type MainTabType = 'shopping' | 'delivery' | 'admin';
