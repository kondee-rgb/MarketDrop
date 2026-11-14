import { Order, ShoppingItem, ShoppingAllocation } from '@/types/order';

/**
 * จัดหมวดหมู่ของสดอัตโนมัติตามชื่อสินค้า
 */
export function detectCategory(name: string): ShoppingItem['category'] {
  const n = (name || '').toLowerCase();

  // 1. หมวดไข่และนม (ตรวจก่อนหมวดเนื้อสัตว์ เพื่อไม่ให้ "ไข่ไก่" หรือ "ไข่เป็ด" กลายเป็นเนื้อสัตว์)
  if (/(?:ไข่|นม|เนย|ชีส|เต้าหู้|โยเกิร์ต)/.test(n)) {
    return 'egg_dairy';
  }

  // 2. หมวดเนื้อสัตว์และซีฟู้ด
  if (/(?:หมู|ไก่|เนื้อ|ปลา|กุ้ง|เป็ด|ปู|หมึก|หอย|ตับ|สันคอ|หมูบด|อกไก่|สามชั้น|ซี่โครง|เบคอน|ไส้กรอก|ลูกชิ้น)/.test(n)) {
    return 'meat';
  }

  // 3. หมวดผักสดและเห็ด
  if (/(?:ผัก|คะน้า|กวางตุ้ง|ผักบุ้ง|ผักกาด|แตงกวา|แครอท|บล็อกโคลี่|ชะอม|กะหล่ำ|ถั่วงอก|มะเขือ|เห็ด|ฟักทอง|ต้นหอม|ผักชี|กะเพรา|โหระพา|ขี้เหล็ก)/.test(n)) {
    return 'veg';
  }

  // 4. เครื่องเทศ สมุนไพร เครื่องแกง
  if (/(?:พริก|มะนาว|กระเทียม|หอมแดง|หอมใหญ่|ขิง|ข่า|ตะไคร้|ใบมะกรูด|กะปิ|พริกแกง|พริกไทย|มะขาม)/.test(n)) {
    return 'spice';
  }

  // 5. ของแห้งและเครื่องปรุง
  if (/(?:น้ำมัน|ข้าว|ซอส|น้ำปลา|น้ำตาล|ซีอิ๊ว|มาม่า|วุ้นเส้น|กะทิ|แป้ง|น้ำดื่ม|ขวด)/.test(n)) {
    return 'dry';
  }

  return 'other';
}

export const CATEGORY_LABELS: Record<ShoppingItem['category'], { label: string; icon: string; bg: string }> = {
  meat: { label: 'เนื้อสัตว์ / ซีฟู้ด', icon: '🥩', bg: 'bg-rose-50 border-rose-200 text-rose-800' },
  veg: { label: 'ผักสด / เห็ด', icon: '🥬', bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  egg_dairy: { label: 'ไข่ / นม / เต้าหู้', icon: '🥚', bg: 'bg-amber-50 border-amber-200 text-amber-800' },
  spice: { label: 'พริก / กระเทียม / เครื่องแกง', icon: '🌶️', bg: 'bg-orange-50 border-orange-200 text-orange-800' },
  dry: { label: 'ของแห้ง / เครื่องปรุง', icon: '🥫', bg: 'bg-blue-50 border-blue-200 text-blue-800' },
  other: { label: 'สินค้าทั่วไป / เบ็ดเตล็ด', icon: '📦', bg: 'bg-slate-50 border-slate-200 text-slate-800' }
};

const SHOPPING_STATE_KEY = 'marketdrop_shopping_state_v2';

export interface SavedShoppingState {
  boughtItemIds: string[]; // รายการที่ติ๊กซื้อแล้ว
  manualItems: ShoppingItem[]; // รายการที่ผู้ใช้เพิ่มเองพิเศษ
}

export function loadShoppingState(): SavedShoppingState {
  if (typeof window === 'undefined') {
    return { boughtItemIds: [], manualItems: [] };
  }
  try {
    const raw = localStorage.getItem(SHOPPING_STATE_KEY);
    if (!raw) return { boughtItemIds: [], manualItems: [] };
    return JSON.parse(raw);
  } catch {
    return { boughtItemIds: [], manualItems: [] };
  }
}

export function saveShoppingState(state: SavedShoppingState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SHOPPING_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save shopping state:', err);
  }
}

/**
 * รวบรวมและคำนวณรายการของที่ต้องซื้อจากออเดอร์ทั้งหมด
 */
export function aggregateShoppingList(
  orders: Order[],
  manualItems: ShoppingItem[] = [],
  boughtIds: string[] = []
): ShoppingItem[] {
  const itemMap = new Map<string, ShoppingItem>();

  // 1. วนลูปจากทุกออเดอร์ที่ยังไม่ยกเลิก
  for (const order of orders) {
    if (order.deliveryStatus === 'CANCELLED') continue;

    for (const it of order.items) {
      const cleanName = it.name.trim();
      if (!cleanName) continue;

      // Group key: ชื่อสินค้า + หน่วย เช่น "หมูบด__กก."
      const key = `${cleanName}__${it.unit.trim().toLowerCase()}`;

      if (!itemMap.has(key)) {
        const cat = it.category || detectCategory(cleanName);
        itemMap.set(key, {
          id: `shop_${key.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}`,
          name: cleanName,
          category: cat,
          totalQuantity: 0,
          unit: it.unit.trim() || 'ชิ้น',
          bought: false,
          estimatedPrice: 0,
          allocations: []
        });
      }

      const current = itemMap.get(key)!;
      const numQty = parseFloat(String(it.quantity)) || 1;
      const currentQty = typeof current.totalQuantity === 'number' ? current.totalQuantity : parseFloat(String(current.totalQuantity)) || 0;
      current.totalQuantity = currentQty + numQty;
      current.estimatedPrice = (current.estimatedPrice || 0) + (it.price || 0);

      // บันทึกการแบ่งส่งบ้าน
      current.allocations.push({
        orderId: order.id,
        houseNumber: order.houseNumber,
        customerName: order.customerName,
        quantity: it.quantity,
        unit: it.unit
      });
    }
  }

  // 2. แปลงเป็น array
  const aggregated = Array.from(itemMap.values());

  // 3. รวมรายการ manualItems ที่ผู้ใช้คีย์เอง
  const combined = [...aggregated, ...manualItems];

  // 4. ผูกสถานะ bought จาก boughtIds
  return combined.map(item => ({
    ...item,
    bought: boughtIds.includes(item.id)
  }));
}
