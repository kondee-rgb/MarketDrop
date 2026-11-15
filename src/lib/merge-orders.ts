/**
 * Merge AI-read order photos that belong to the same customer into one order.
 * Several screenshots of one chat (or one person sending two photos) become a single delivery stop.
 */

export interface ParsedPhotoItem {
  name: string;
  quantity?: string | number;
  unit?: string;
  price?: number;
  category?: string;
}

export interface ParsedPhotoOrder {
  houseNumber?: string;
  soi?: string;
  building?: string;
  customerName?: string;
  phone?: string;
  totalAmount?: number;
  paymentStatus?: 'PAID' | 'COD';
  notes?: string;
  items?: ParsedPhotoItem[];
}

const NAME_PREFIX = /^(คุณ|พี่|น้อง|ป้า|ลุง|น้า|เจ๊|เฮีย|ยาย|ตา|อา)\s*/;

/** Keys a photo can be matched on: the name (without คุณ/พี่/…) and the house number. */
export function customerKeys(o: ParsedPhotoOrder): string[] {
  const keys: string[] = [];
  const name = (o.customerName || '').trim().toLowerCase().replace(/\s+/g, '').replace(NAME_PREFIX, '');
  if (name) keys.push(`n:${name}`);
  const house = (o.houseNumber || '').trim();
  if (house && house !== 'ไม่ระบุ') keys.push(`h:${house}`);
  return keys;
}

const itemKey = (it: ParsedPhotoItem) => `${it.name.trim().toLowerCase()}|${(it.unit || '').trim()}`;

export function mergeParsedOrders(list: ParsedPhotoOrder[]): ParsedPhotoOrder[] {
  const groups: ParsedPhotoOrder[][] = [];
  const index = new Map<string, number>();
  for (const o of list) {
    const keys = customerKeys(o);
    // same customer = same name OR same house number as an earlier photo
    const at = keys.map(k => index.get(k)).find(i => i !== undefined);
    const target = at ?? groups.length;
    if (at === undefined) groups.push([o]);
    else groups[at].push(o);
    keys.forEach(k => {
      if (!index.has(k)) index.set(k, target);
    });
  }

  return groups.map(group => {
    const first = (pick: (o: ParsedPhotoOrder) => string | undefined) =>
      group.map(pick).find(v => v && v.trim() && v !== 'ไม่ระบุ') || '';

    const items: ParsedPhotoItem[] = [];
    const seen = new Map<string, number>();
    for (const it of group.flatMap(o => o.items || [])) {
      if (!it.name?.trim()) continue;
      const k = itemKey(it);
      const at = seen.get(k);
      const qty = parseFloat(String(it.quantity ?? ''));
      if (at !== undefined) {
        const prev = parseFloat(String(items[at].quantity ?? ''));
        // same item on two photos: add the quantities when both are numbers, else keep both lines
        if (Number.isFinite(prev) && Number.isFinite(qty)) {
          items[at] = { ...items[at], quantity: String(prev + qty), price: (items[at].price || 0) + (it.price || 0) };
          continue;
        }
      }
      seen.set(k, items.length);
      items.push({ ...it });
    }

    const totals = group.map(o => (typeof o.totalAmount === 'number' ? o.totalAmount : 0));
    return {
      customerName: first(o => o.customerName),
      houseNumber: first(o => o.houseNumber),
      soi: first(o => o.soi),
      building: first(o => o.building),
      phone: first(o => o.phone),
      totalAmount: totals.reduce((a, b) => a + b, 0),
      // only "paid" when every photo said paid
      paymentStatus: group.every(o => o.paymentStatus === 'PAID') ? 'PAID' : 'COD',
      notes: Array.from(new Set(group.map(o => (o.notes || '').trim()).filter(Boolean))).join(' · '),
      items
    };
  });
}
