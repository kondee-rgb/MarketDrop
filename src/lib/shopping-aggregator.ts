import { Order, OrderItem, ShoppingItem } from '@/types/order';
import { lookupPriceBook } from './price-book';

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

export const SHOPPING_STATE_KEY = 'marketdrop_shopping_state_v3';
const LEGACY_SHOPPING_KEYS = [
  'marketdrop_shopping_state_v1',
  'marketdrop_shopping_state_v2'
];

export interface SavedShoppingState {
  boughtItemIds: string[]; // รายการที่ติ๊กซื้อแล้ว
  manualItems: ShoppingItem[]; // รายการที่ผู้ใช้เพิ่มเองพิเศษ
  itemOrder?: string[]; // ลำดับที่ลากจัดเอง (id ของรายการ)
}

/** Put items in the user's dragged order; items not in the list keep their place after the ordered ones. */
export function applyItemOrder(items: ShoppingItem[], order: string[] = []): ShoppingItem[] {
  if (!order.length) return items;
  const rank = new Map(order.map((id, i) => [id, i]));
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => (rank.get(a.it.id) ?? order.length + a.i) - (rank.get(b.it.id) ?? order.length + b.i))
    .map(x => x.it);
}

/** Move one id to another id's slot in an id list. */
export function moveInOrder(ids: string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

export function loadShoppingState(): SavedShoppingState {
  if (typeof window === 'undefined') {
    return { boughtItemIds: [], manualItems: [] };
  }
  try {
    // ล้างแคชคีย์เก่า v1, v2
    for (const legacyKey of LEGACY_SHOPPING_KEYS) {
      if (localStorage.getItem(legacyKey) !== null) {
        localStorage.removeItem(legacyKey);
      }
    }

    const raw = localStorage.getItem(SHOPPING_STATE_KEY);
    if (!raw) return { boughtItemIds: [], manualItems: [] };

    const parsed = JSON.parse(raw);
    return {
      boughtItemIds: Array.isArray(parsed.boughtItemIds) ? parsed.boughtItemIds : [],
      manualItems: Array.isArray(parsed.manualItems) ? parsed.manualItems : [],
      itemOrder: Array.isArray(parsed.itemOrder) ? parsed.itemOrder : []
    };
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

      // บันทึกการแบ่งส่งบ้าน พร้อมรายละเอียดโครงการและซอย
      current.allocations.push({
        orderId: order.id,
        houseNumber: order.houseNumber,
        customerName: order.customerName,
        soi: order.soi,
        locationId: order.locationId,
        building: order.building,
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

/**
 * ข้อมูลสำหรับการจัดสรรสินค้าไปยังบ้านลูกค้า (House Allocation)
 */
export interface HouseAllocationParams {
  orderId?: string; // ถ้ามี จะระบุตรงไปยังออเดอร์นั้น
  houseNumber: string; // เลขที่บ้าน เช่น "51/104", "800/22"
  customerName?: string; // ชื่อลูกค้า เช่น "คุณนก", "พี่ก้อย"
  soi?: string; // ซอย เช่น "ซอย 1/1"
  locationId?: string; // โครงการ เช่น 'ivy-river', 'thanasin'
  building?: string; // ตึก เช่น 'ตึก A', 'บ้านเดี่ยว'
  phone?: string;
  quantity: string | number; // จำนวน เช่น 1, 2, "0.5"
  unit?: string; // หน่วย เช่น "กก.", "กำ"
  price?: number; // ราคา (ถ้ามี)
  costPrice?: number; // ราคาทุนที่ซื้อจากตลาด (บาท)
  shopName?: string; // ร้านค้า/แผงค้าในตลาดสด
}

/**
 * ผูกหรือจัดสรรสินค้าจากหน้า Shopping ไปยังบ้านลูกค้าใน `orders`
 * - หากมีออเดอร์ของบ้านนั้นอยู่แล้ว จะเพิ่มรายการสินค้าเข้าไปในออเดอร์เดิม
 * - หากยังไม่มีออเดอร์ จะสร้างออเดอร์จุดส่ง (Delivery Stop) ใหม่ให้ทันที
 */
export function allocateItemToHouse(
  orders: Order[],
  itemName: string,
  defaultUnit: string,
  allocation: HouseAllocationParams
): Order[] {
  const cleanItemName = itemName.trim();
  const cleanUnit = (allocation.unit || defaultUnit || 'ชิ้น').trim();
  const now = new Date().toISOString();

  // 1. ค้นหาออเดอร์เป้าหมาย
  let targetOrderIndex = -1;

  if (allocation.orderId) {
    targetOrderIndex = orders.findIndex(o => o.id === allocation.orderId);
  }

  if (targetOrderIndex === -1 && allocation.houseNumber) {
    targetOrderIndex = orders.findIndex(
      o => o.houseNumber.trim() === allocation.houseNumber.trim() &&
           (!allocation.locationId || o.locationId === allocation.locationId)
    );
  }

  // 2. กรณีพบออเดอร์เดิม -> อัปเดตรายการสินค้าในออเดอร์นั้น
  if (targetOrderIndex >= 0) {
    const updatedOrders = [...orders];
    const order = { ...updatedOrders[targetOrderIndex] };
    const items = [...order.items];

    // ตรวจสอบว่ามีสินค้านี้อยู่แล้วหรือไม่
    const existingItemIndex = items.findIndex(
      it => it.name.trim().toLowerCase() === cleanItemName.toLowerCase() &&
            it.unit.trim().toLowerCase() === cleanUnit.toLowerCase()
    );

    if (existingItemIndex >= 0) {
      const existing = items[existingItemIndex];
      const prevQty = parseFloat(String(existing.quantity)) || 0;
      const addQty = parseFloat(String(allocation.quantity)) || 0;
      items[existingItemIndex] = {
        ...existing,
        quantity: prevQty + addQty,
        price: (existing.price || 0) + (allocation.price || 0),
        costPrice: allocation.costPrice ?? existing.costPrice,
        shopName: allocation.shopName ?? existing.shopName
      };
    } else {
      const newItem: OrderItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: cleanItemName,
        quantity: allocation.quantity,
        unit: cleanUnit,
        price: allocation.price,
        costPrice: allocation.costPrice,
        shopName: allocation.shopName,
        checked: false,
        category: detectCategory(cleanItemName)
      };
      items.push(newItem);
    }

    order.items = items;
    order.totalAmount = items.reduce((sum, it) => sum + (it.price || 0), 0);
    order.updatedAt = now;
    if (allocation.customerName && (!order.customerName || order.customerName.includes('ลูกค้าบ้าน'))) {
      order.customerName = allocation.customerName;
    }
    if (allocation.soi && !order.soi) {
      order.soi = allocation.soi;
    }

    updatedOrders[targetOrderIndex] = order;
    return updatedOrders;
  }

  // 3. กรณียังไม่มีออเดอร์ -> สร้างจุดส่งใหม่ให้บ้านลูกค้านี้
  const newOrder: Order = {
    id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    stopNumber: orders.length + 1,
    houseNumber: allocation.houseNumber.trim(),
    soi: allocation.soi || '',
    locationId: allocation.locationId,
    building: allocation.building,
    customerName: allocation.customerName?.trim() || `ลูกค้าบ้าน ${allocation.houseNumber.trim()}`,
    phone: allocation.phone || '',
    items: [
      {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: cleanItemName,
        quantity: allocation.quantity,
        unit: cleanUnit,
        price: allocation.price,
        costPrice: allocation.costPrice,
        shopName: allocation.shopName,
        checked: false,
        category: detectCategory(cleanItemName)
      }
    ],
    totalAmount: allocation.price || 0,
    paymentStatus: 'COD',
    collectedAmount: 0,
    paymentMethod: null,
    deliveryStatus: 'PENDING',
    deliveredAt: null,
    notes: '',
    createdAt: now,
    updatedAt: now
  };

  return [...orders, newOrder];
}

/**
 * ลบการจัดสรรสินค้าออกจากบ้านเป้าหมาย
 */
export function removeAllocationFromHouse(
  orders: Order[],
  itemName: string,
  unit: string,
  orderIdOrHouseNumber: string
): Order[] {
  const cleanItemName = itemName.trim().toLowerCase();
  const cleanUnit = unit.trim().toLowerCase();
  const now = new Date().toISOString();

  return orders
    .map(order => {
      const isTarget = order.id === orderIdOrHouseNumber || order.houseNumber.trim() === orderIdOrHouseNumber.trim();
      if (!isTarget) return order;

      const filteredItems = order.items.filter(
        it => !(it.name.trim().toLowerCase() === cleanItemName && it.unit.trim().toLowerCase() === cleanUnit)
      );

      return {
        ...order,
        items: filteredItems,
        totalAmount: filteredItems.reduce((sum, it) => sum + (it.price || 0), 0),
        updatedAt: now
      };
    })
    .filter(order => order.items.length > 0); // หากไม่มีสินค้าเหลือในบิล ให้ลบ stop ออกเพื่อความสะอาด
}

/**
 * ย้ายการจัดสรรสินค้าจากบ้านหนึ่งไปยังอีกบ้านหนึ่ง
 */
export function reallocateItemHouse(
  orders: Order[],
  itemName: string,
  unit: string,
  fromOrderIdOrHouse: string,
  toAllocation: HouseAllocationParams
): Order[] {
  const afterRemove = removeAllocationFromHouse(orders, itemName, unit, fromOrderIdOrHouse);
  return allocateItemToHouse(afterRemove, itemName, unit, toAllocation);
}

/**
 * กลุ่มร้านค้า / แผงค้าในตลาดสด (Stall / Shop Grouping)
 * ช่วยให้เดินจ่ายตลาดทีละแผงได้สะดวก รวดเร็ว ไม่ต้องสลับไปมา
 */
export interface ShopStallGroup {
  shopName: string; // เช่น "🥩 เขียงหมูเจ๊พร", "🥬 แผงผักสด"
  cleanShopName: string; // ชื่อร้านแบบไม่มี emoji
  category: ShoppingItem['category'];
  items: ShoppingItem[];
  totalItemsCount: number;
  boughtItemsCount: number;
  isCompleted: boolean;
  estimatedTotalCost: number;
}

export function groupShoppingItemsByShop(
  items: ShoppingItem[],
  priceBookLookup?: (name: string) => { shopName?: string } | null
): ShopStallGroup[] {
  const stallMap = new Map<string, ShopStallGroup>();

  for (const item of items) {
    let stallName = '';
    const category = item.category || detectCategory(item.name);

    // 1. ตรวจสอบจาก Price Book หรือฟังก์ชัน lookup
    let lookupEntry: { shopName?: string } | null = null;
    if (priceBookLookup) {
      lookupEntry = priceBookLookup(item.name);
    } else {
      try {
        lookupEntry = lookupPriceBook(item.name);
      } catch {}
    }

    if (lookupEntry?.shopName && lookupEntry.shopName !== 'ตลาดสด') {
      stallName = lookupEntry.shopName.trim();
    }

    // 2. ถ้าไม่มีร้านค้าเฉพาะ ให้จัดเข้าแผงตามหมวดหมู่
    if (!stallName) {
      switch (category) {
        case 'meat':
          stallName = '🥩 เขียงเนื้อสัตว์ / ซีฟู้ด';
          break;
        case 'veg':
          stallName = '🥬 แผงผักสด / เห็ด';
          break;
        case 'egg_dairy':
          stallName = '🥚 ร้านไข่สด / นม / เต้าหู้';
          break;
        case 'spice':
          stallName = '🌶️ แผงพริก / กระเทียม / เครื่องแกง';
          break;
        case 'dry':
          stallName = '🥫 ร้านของแห้ง / เครื่องปรุง';
          break;
        default:
          stallName = '🛒 แผงทั่วไป / เบ็ดเตล็ด';
          break;
      }
    } else {
      // เติม icon นำหน้าให้สวยงามหากยังไม่มี
      if (!stallName.match(/^[\u{1F300}-\u{1F9FF}]/u)) {
        const icon = CATEGORY_LABELS[category]?.icon || '🏪';
        stallName = `${icon} ${stallName}`;
      }
    }

    const cleanName = stallName.replace(/^[\u{1F300}-\u{1F9FF}\s]+/u, '').trim() || stallName;

    if (!stallMap.has(stallName)) {
      stallMap.set(stallName, {
        shopName: stallName,
        cleanShopName: cleanName,
        category,
        items: [],
        totalItemsCount: 0,
        boughtItemsCount: 0,
        isCompleted: false,
        estimatedTotalCost: 0
      });
    }

    const group = stallMap.get(stallName)!;
    group.items.push(item);
    group.totalItemsCount += 1;
    if (item.bought) {
      group.boughtItemsCount += 1;
    }
    group.estimatedTotalCost += (item.estimatedPrice || 0);
  }

  // คำนวณ isCompleted และแปลงเป็น array
  const groups = Array.from(stallMap.values()).map(g => ({
    ...g,
    isCompleted: g.totalItemsCount > 0 && g.boughtItemsCount === g.totalItemsCount,
    estimatedTotalCost: Math.round(g.estimatedTotalCost * 100) / 100
  }));

  // เรียงแผงที่ยังซื้อไม่เสร็จไว้ด้านบน แผงที่เสร็จแล้วไว้ด้านล่าง
  // ที่เหลือคงลำดับตามรายการแรกของแผง (จึงตามลำดับที่ผู้ใช้ลากจัดไว้ เช่น ทางเดินในตลาด)
  groups.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    return 0; // stable sort keeps first-appearance order
  });

  return groups;
}
