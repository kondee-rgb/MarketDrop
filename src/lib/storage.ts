import { Order, GoogleSheetsConfig } from '@/types/order';
import { INITIAL_SAMPLE_ORDERS } from './sample-data';
import { sortOrders } from './natural-sort';

const ORDERS_KEY = 'marketdrop_orders_v1';
const SHEETS_CONFIG_KEY = 'marketdrop_sheets_config_v1';

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  webhookUrl: '',
  spreadsheetId: '',
  sheetName: 'Sheet1',
  autoSync: true,
  lastSyncTime: null
};

export function loadStoredOrders(): Order[] {
  if (typeof window === 'undefined') {
    return INITIAL_SAMPLE_ORDERS;
  }

  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      // โหลดข้อมูลตัวอย่างเริ่มต้น
      const sorted = sortOrders(INITIAL_SAMPLE_ORDERS, 'NATURAL_HOUSE', 'ASC');
      localStorage.setItem(ORDERS_KEY, JSON.stringify(sorted));
      return sorted;
    }
    const parsed: Order[] = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SAMPLE_ORDERS;
  } catch (err) {
    console.error('Failed to load orders from localStorage:', err);
    return INITIAL_SAMPLE_ORDERS;
  }
}

export function saveStoredOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save orders to localStorage:', err);
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
