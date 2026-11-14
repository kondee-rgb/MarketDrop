import { ShoppingItem } from '@/types/order';
import { detectCategory } from './shopping-aggregator';

export interface PriceBookEntry {
  id: string;
  itemName: string; // ชื่อสินค้า เช่น "หมูบดอนามัย", "ผักบุ้งจีน"
  shopName: string; // ร้านค้า/แผงค้า เช่น "เขียงหมูเจ๊พร", "ร้านผักป้าแต๋ว"
  costPrice: number; // ต้นทุนต่อหน่วย (บาท)
  sellingPrice: number; // ราคาขายต่อหน่วย (บาท)
  unit: string; // หน่วย เช่น "กก.", "กำ", "แผง"
  category: ShoppingItem['category'];
  notes?: string;
  lastUpdated: string;
}

export const PRICE_BOOK_KEY = 'marketdrop_price_book_v1';

// In-memory cache for SSR / Node / Test environments
let memoryPriceBook: PriceBookEntry[] = [];

/**
 * ดึงรายการสมุดราคาและความจำต้นทุนทั้งหมดจาก localStorage
 */
export function getPriceBook(): PriceBookEntry[] {
  if (typeof window === 'undefined') {
    return [...memoryPriceBook];
  }

  try {
    const raw = localStorage.getItem(PRICE_BOOK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load price book from localStorage:', err);
    return [];
  }
}

/**
 * บันทึกหรืออัปเดตข้อมูลราคาสินค้าในสมุดความจำ
 */
export function savePriceBookEntry(
  entry: Omit<PriceBookEntry, 'id' | 'lastUpdated'> & { id?: string }
): PriceBookEntry {
  const current = getPriceBook();
  const cleanName = entry.itemName.trim();
  const now = new Date().toISOString();

  const existingIndex = current.findIndex(
    it => it.itemName.trim().toLowerCase() === cleanName.toLowerCase()
  );

  let updatedEntry: PriceBookEntry;

  if (existingIndex >= 0) {
    updatedEntry = {
      ...current[existingIndex],
      ...entry,
      itemName: cleanName,
      category: entry.category || current[existingIndex].category || detectCategory(cleanName),
      lastUpdated: now
    };
    current[existingIndex] = updatedEntry;
  } else {
    updatedEntry = {
      id: entry.id || `pb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemName: cleanName,
      shopName: entry.shopName?.trim() || 'ตลาดสด',
      costPrice: entry.costPrice || 0,
      sellingPrice: entry.sellingPrice || 0,
      unit: entry.unit?.trim() || 'กก.',
      category: entry.category || detectCategory(cleanName),
      notes: entry.notes || '',
      lastUpdated: now
    };
    current.push(updatedEntry);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PRICE_BOOK_KEY, JSON.stringify(current));
    } catch (err) {
      console.error('Failed to save price book entry:', err);
    }
  } else {
    memoryPriceBook = [...current];
  }

  return updatedEntry;
}

/**
 * ค้นหาราคาต้นทุน/ราคาขายจากสมุดราคาตามชื่อสินค้า
 * รองรับทั้ง Exact Match และ Fuzzy/Substring Match
 */
export function lookupPriceBook(itemName: string): PriceBookEntry | null {
  if (!itemName || !itemName.trim()) return null;
  const list = getPriceBook();
  const query = itemName.trim().toLowerCase();

  // 1. ตรวจสอบแบบตรงตัวก่อน (Exact Match)
  const exact = list.find(it => it.itemName.toLowerCase() === query);
  if (exact) return exact;

  // 2. ตรวจสอบแบบข้อความย่อย (Contains / Substring)
  const partial = list.find(it => {
    const target = it.itemName.toLowerCase();
    return target.includes(query) || query.includes(target);
  });

  return partial || null;
}

/**
 * อัปเดตราคาต้นทุนและร้านค้าอย่างรวดเร็ว (เมื่อซื้อของในตลาด)
 * ระบบจะจดจำไว้ใช้งานครั้งต่อไปโดยอัตโนมัติ
 */
export function updateCostAndSellingPrice(
  itemName: string,
  costPrice?: number,
  sellingPrice?: number,
  unit?: string,
  shopName?: string
): PriceBookEntry {
  const existing = lookupPriceBook(itemName);
  return savePriceBookEntry({
    id: existing?.id,
    itemName,
    costPrice: costPrice ?? (existing?.costPrice || 0),
    sellingPrice: sellingPrice ?? (existing?.sellingPrice || 0),
    shopName: shopName ?? (existing?.shopName || 'ตลาดสด'),
    unit: unit ?? (existing?.unit || 'กก.'),
    category: existing?.category || detectCategory(itemName)
  });
}

/**
 * อัปเดตราคาต้นทุนอย่างรวดเร็วสำหรับสินค้า
 */
export function updateCostPriceForProduct(
  itemName: string,
  costPrice: number,
  shopName?: string
): PriceBookEntry {
  return updateCostAndSellingPrice(itemName, costPrice, undefined, undefined, shopName);
}

/**
 * ค้นหาสินค้าในสมุดราคาด้วยคำค้นหา
 */
export function searchPriceBook(keyword: string): PriceBookEntry[] {
  const entries = getPriceBook();
  const q = keyword.trim().toLowerCase();
  if (!q) return entries;

  return entries.filter(e =>
    e.itemName.toLowerCase().includes(q) ||
    (e.shopName && e.shopName.toLowerCase().includes(q)) ||
    (e.notes && e.notes.toLowerCase().includes(q))
  );
}

/**
 * ลบรายการราคาออกจากสมุด
 */
export function deletePriceBookEntry(id: string): void {
  const current = getPriceBook();
  const filtered = current.filter(it => it.id !== id);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PRICE_BOOK_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Failed to delete price book entry:', err);
    }
  } else {
    memoryPriceBook = [...filtered];
  }
}

/**
 * ล้างสมุดราคาทั้งหมด
 */
export function clearPriceBook(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(PRICE_BOOK_KEY);
    } catch {}
  } else {
    memoryPriceBook = [];
  }
}
