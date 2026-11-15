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
  shops?: ShopPrice[]; // every shop this item is bought from, with its cost
  aliases?: string[]; // other names customers use for the same menu
  locationPrices?: Record<string, number>; // selling price at a specific location id
  variants?: string[]; // fillings/toppings at the same price, e.g. ไส้กุ้ง, ไส้หมู
  unitConversions?: Record<string, number>; // 1 <unit> = n <entry.unit>, e.g. { ขีด: 0.1 }
}

export interface ShopPrice {
  name: string;
  cost: number;
}

/** Item name with a filling picked: "ข้าวเหนียวดำ · ไส้กุ้ง" */
export const VARIANT_SEP = ' · ';

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

  // keep the per-shop cost list in step with the shop/cost just saved
  if (updatedEntry.shopName && updatedEntry.shopName !== 'ตลาดสด') {
    const shops = (updatedEntry.shops || []).filter(sp => sp.name !== updatedEntry.shopName);
    updatedEntry.shops = [...shops, { name: updatedEntry.shopName, cost: updatedEntry.costPrice }];
  }

  writeBook(current);
  return updatedEntry;
}

function writeBook(list: PriceBookEntry[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PRICE_BOOK_KEY, JSON.stringify(list));
    } catch (err) {
      console.error('Failed to save price book:', err);
    }
  } else {
    memoryPriceBook = [...list];
  }
}

/** Change extra fields (aliases, variants, location prices, conversions, shops) of one entry. */
export function patchPriceBookEntry(id: string, patch: Partial<PriceBookEntry>): void {
  writeBook(getPriceBook().map(e => (e.id === id ? { ...e, ...patch, lastUpdated: new Date().toISOString() } : e)));
}

/**
 * ค้นหาราคาต้นทุน/ราคาขายจากสมุดราคาตามชื่อสินค้า
 * รองรับทั้ง Exact Match และ Fuzzy/Substring Match
 */
export function lookupPriceBook(itemName: string): PriceBookEntry | null {
  if (!itemName || !itemName.trim()) return null;
  const list = getPriceBook();
  const query = itemName.trim().toLowerCase();

  // 1. ตรวจสอบแบบตรงตัวก่อน (Exact Match) รวมชื่อเรียกอื่น
  const exact = findEntry(itemName);
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

/* ---------------- Unit memory (จำหน่วยของสินค้าแต่ละอย่าง) ---------------- */

const UNIT_MEMORY_KEY = 'marketdrop_unit_memory_v1';

function readUnitMemory(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(UNIT_MEMORY_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

/** Remember the unit each product was last ordered in. */
export function rememberUnits(items: { name: string; unit?: string }[]): void {
  const memory = readUnitMemory();
  for (const it of items) {
    const name = it.name.trim().toLowerCase();
    if (name && it.unit?.trim()) memory[name] = it.unit.trim();
  }
  try {
    localStorage.setItem(UNIT_MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // ignore
  }
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');

/** Split "ข้าวเหนียวดำ · ไส้กุ้ง" into base name and filling. */
export function splitVariant(name: string): { base: string; variant?: string } {
  const at = name.indexOf(VARIANT_SEP);
  return at < 0 ? { base: name.trim() } : { base: name.slice(0, at).trim(), variant: name.slice(at + VARIANT_SEP.length).trim() };
}

/** Entry whose name or alias is exactly this name (filling ignored). */
export function findEntry(itemName: string): PriceBookEntry | null {
  const q = norm(splitVariant(itemName || '').base);
  if (!q) return null;
  const list = getPriceBook();
  return (
    list.find(e => norm(e.itemName) === q) ||
    list.find(e => (e.aliases || []).some(a => norm(a) === q)) ||
    null
  );
}

/** The main name for an item (aliases → main name), filling kept. */
export function canonicalName(itemName: string): string {
  const { base, variant } = splitVariant(itemName || '');
  const entry = findEntry(base);
  const main = entry ? entry.itemName : base;
  return variant ? `${main}${VARIANT_SEP}${variant}` : main;
}

const bigrams = (s: string) => {
  const t = norm(s);
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
};

/** Closest price-book name for a name that isn't known yet (asks "did you mean …?"). */
export function suggestCanonical(itemName: string): string | null {
  const base = splitVariant(itemName || '').base;
  if (norm(base).length < 3 || findEntry(base)) return null;
  const a = bigrams(base);
  let best: { name: string; score: number } | null = null;
  for (const e of getPriceBook()) {
    const b = bigrams(e.itemName);
    const pool = [...b];
    let hit = 0;
    for (const g of a) {
      const i = pool.indexOf(g);
      if (i >= 0) {
        hit++;
        pool.splice(i, 1);
      }
    }
    const score = (2 * hit) / (a.length + b.length || 1); // Dice similarity
    const contains = norm(e.itemName).includes(norm(base)) || norm(base).includes(norm(e.itemName));
    const s = contains ? Math.max(score, 0.7) : score;
    if (s >= 0.6 && (!best || s > best.score)) best = { name: e.itemName, score: s };
  }
  return best?.name ?? null;
}

/** Remember that `alias` means the price-book item `mainName`. */
export function addAlias(mainName: string, alias: string): void {
  const entry = findEntry(mainName);
  const clean = splitVariant(alias).base;
  if (!entry || !clean || norm(clean) === norm(entry.itemName)) return;
  if ((entry.aliases || []).some(a => norm(a) === norm(clean))) return;
  patchPriceBookEntry(entry.id, { aliases: [...(entry.aliases || []), clean] });
}

/** Quantity in the item's main unit when a conversion is known (1 แพ็ค = 6 ห่อ, 1 ขีด = 0.1 กก.). */
export function toBaseUnit(itemName: string, qty: number, unit: string): { qty: number; unit: string } {
  const entry = findEntry(itemName);
  const u = (unit || '').trim();
  if (!entry || !u || u === entry.unit) return { qty, unit: u };
  const factor = entry.unitConversions?.[u];
  return factor ? { qty: Math.round(qty * factor * 1000) / 1000, unit: entry.unit } : { qty, unit: u };
}

/** Pick which shop to buy this item from: its cost becomes the current cost. */
export function selectShop(itemName: string, shopName: string): PriceBookEntry | null {
  const entry = findEntry(itemName);
  const shop = entry?.shops?.find(sp => sp.name === shopName);
  if (!entry || !shop) return null;
  patchPriceBookEntry(entry.id, { shopName: shop.name, costPrice: shop.cost });
  return { ...entry, shopName: shop.name, costPrice: shop.cost };
}

/** Exact-name lookup for autofill (no partial matching: typing "หมู" must not grab "หมูบด"). */
export function lookupExactProduct(
  itemName: string,
  locationId?: string
): { unit?: string; sellingPrice?: number; mainName?: string; variants?: string[] } | null {
  const name = (itemName || '').trim().toLowerCase();
  if (!name) return null;
  const entry = findEntry(itemName);
  const unit = entry?.unit || readUnitMemory()[name];
  if (!entry && !unit) return null;
  const local = locationId ? entry?.locationPrices?.[locationId] : undefined;
  return {
    unit,
    sellingPrice: local || entry?.sellingPrice || undefined,
    mainName: entry?.itemName,
    variants: entry?.variants?.length ? entry.variants : undefined
  };
}
