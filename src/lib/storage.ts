import { Order, GoogleSheetsConfig } from '@/types/order';
import { INITIAL_SAMPLE_ORDERS } from './sample-data';

export const ORDERS_KEY = 'marketdrop_orders_v4';
export const SHEETS_CONFIG_KEY = 'marketdrop_sheets_config_v2';

export const LEGACY_ORDERS_KEYS = [
  'marketdrop_orders_v1',
  'marketdrop_orders_v2',
  'marketdrop_orders_v3'
];

export const MOCK_ORDER_IDS = [
  'ord-101', 'ord-102', 'ord-103', 'ord-104', 'ord-105', 'ord-106'
];

export const MOCK_CUSTOMER_NAMES = [
  'คุณป้ามาลี',
  'พี่หนุ่ม ช่างแอร์',
  'พี่หนุ่ม',
  'คุณก้อย ร้านกาแฟ',
  'คุณวิภาวรรณ',
  'ลุงสมเกียรติ',
  'คุณเมย์ พยาบาล',
  'คุณเมย์'
];

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  webhookUrl: '',
  spreadsheetId: '',
  sheetName: 'Sheet1',
  autoSync: true,
  lastSyncTime: null
};

/**
 * ล้างข้อมูล mock เก่าทั้งหมดที่อาจตกค้างในเบราว์เซอร์ของผู้ใช้
 */
export function purgeMockDataFromBrowser(): void {
  if (typeof window === 'undefined') return;

  try {
    for (const legacyKey of LEGACY_ORDERS_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    localStorage.removeItem('marketdrop_shopping_state_v1');
    localStorage.removeItem('marketdrop_shopping_state_v2');

    const curr = localStorage.getItem(ORDERS_KEY);
    if (curr) {
      try {
        const parsed = JSON.parse(curr);
        if (Array.isArray(parsed)) {
          const hasMock = parsed.some(
            (o: Order) =>
              MOCK_ORDER_IDS.includes(o.id) ||
              MOCK_CUSTOMER_NAMES.some(m => (o.customerName || '').includes(m))
          );
          if (hasMock) {
            localStorage.removeItem(ORDERS_KEY);
            localStorage.removeItem('marketdrop_shopping_state_v3');
          }
        }
      } catch {
        localStorage.removeItem(ORDERS_KEY);
      }
    }
  } catch (err) {
    console.error('Error during purgeMockDataFromBrowser:', err);
  }
}

/**
 * โหลดออเดอร์จาก localStorage
 * - ล้างแคชเวอร์ชันเก่า ('marketdrop_orders_v1..v3') อัตโนมัติ
 * - กวาดล้าง mock orders (ord-101..ord-106, คุณป้ามาลี ฯลฯ) ทันทีหากตรวจพบ
 * - เริ่มต้นด้วย 0 orders เสมอเพื่อการใช้งานจริง
 */
export function loadStoredOrders(): Order[] {
  if (typeof window === 'undefined') {
    return INITIAL_SAMPLE_ORDERS;
  }

  try {
    // 1. ล้างคีย์เวอร์ชันเก่าที่อาจหลงเหลือในเครื่องผู้ใช้
    purgeMockDataFromBrowser();

    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    // 2. ตรวจสอบว่ามีข้อมูล mock หลงเหลืออยู่หรือไม่ หากมีให้ลบทิ้งทันที
    const hasMock = parsed.some((order: Order) =>
      MOCK_ORDER_IDS.includes(order.id) ||
      MOCK_CUSTOMER_NAMES.some(mockName => (order.customerName || '').includes(mockName))
    );

    if (hasMock) {
      console.warn('Mock test data detected in localStorage — purging legacy data.');
      localStorage.removeItem(ORDERS_KEY);
      return [];
    }

    return parsed as Order[];
  } catch (err) {
    console.error('Failed to load orders from localStorage:', err);
    return [];
  }
}

export function saveStoredOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Filter out mock data before saving
    const cleanOrders = orders.filter(
      o =>
        !MOCK_ORDER_IDS.includes(o.id) &&
        !MOCK_CUSTOMER_NAMES.some(m => (o.customerName || '').includes(m))
    );
    localStorage.setItem(ORDERS_KEY, JSON.stringify(cleanOrders));
  } catch (err) {
    console.error('Failed to save orders to localStorage:', err);
  }
}

export function clearStoredOrders(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ORDERS_KEY);
    for (const legacyKey of LEGACY_ORDERS_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    localStorage.setItem(ORDERS_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to clear stored orders:', err);
  }
}

export function hardResetAllData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ORDERS_KEY);
    for (const legacyKey of LEGACY_ORDERS_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    localStorage.removeItem('marketdrop_shopping_state_v1');
    localStorage.removeItem('marketdrop_shopping_state_v2');
    localStorage.removeItem('marketdrop_shopping_state_v3');
    // profit history was kept before, so test days lingered in the P&L charts forever
    localStorage.removeItem('marketdrop_daily_profit_history_v1');
    localStorage.setItem(ORDERS_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to hard reset data:', err);
  }
}

export function loadSheetsConfig(): GoogleSheetsConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_SHEETS_CONFIG;
  }

  try {
    const raw = localStorage.getItem(SHEETS_CONFIG_KEY);
    if (!raw) return DEFAULT_SHEETS_CONFIG;
    return { ...DEFAULT_SHEETS_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SHEETS_CONFIG;
  }
}

export function saveSheetsConfig(config: GoogleSheetsConfig): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save sheets config:', err);
  }
}
