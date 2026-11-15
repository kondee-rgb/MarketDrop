import { describe, it, expect } from 'bun:test';
import { parseSingleOrderText, parseBulkOrderText } from '../src/lib/line-parser';
import {
  compareHouseNumbers,
  compareSoiNames,
  sortOrders,
  groupOrdersBySoi,
  reorderOrders,
  parseHouseNumberParts
} from '../src/lib/natural-sort';
import {
  orderToSheetRow,
  exportOrdersToCsv,
  formatItemsSummary,
  formatPaymentMethodThai,
  formatPaymentStatusThai,
  formatDeliveryStatusThai,
  SHEETS_COLUMNS
} from '../src/lib/sheets';
import { Order } from '../src/types/order';

describe('1. LINE Order Parser Tests', () => {
  it('should parse single order with Thai address, items, money, and paid status', () => {
    const raw = `บ้าน 45/12 ซอย 3
คุณวิภา 081-9988776
- หมูบด 1 กก.
- ผักบุ้ง 2 กำ
- ไข่ไก่เบอร์ 2 1 แผง
ยอด 245 บาท โอนแล้วครับ
แขวนไว้ที่รั้วบ้าน`;

    const parsed = parseSingleOrderText(raw);
    expect(parsed.houseNumber).toBe('45/12');
    expect(parsed.soi).toContain('ซอย 3');
    expect(parsed.customerName).toContain('วิภา');
    expect(parsed.phone).toBe('081-998-8776');
    expect(parsed.totalAmount).toBe(245);
    expect(parsed.paymentStatus).toBe('PAID');
    expect(parsed.notes).toContain('แขวนไว้ที่รั้วบ้าน');
    expect(parsed.items.length).toBe(3);
    expect(parsed.items[0].name).toBe('หมูบด');
    expect(parsed.items[0].quantity).toBe('1');
    expect(parsed.items[0].unit).toBe('กก.');
    expect(parsed.items[2].name).toBe('ไข่ไก่เบอร์ 2');
    expect(parsed.items[2].quantity).toBe('1');
    expect(parsed.items[2].unit).toBe('แผง');
  });

  it('should parse single order with COD status and different Thai units', () => {
    const raw = `ส่งบ้านเลขที่ 12/4 หมู่บ้านพฤกษา 5
พี่ก้อย 0895551234
หมูสามชั้น 2 โล
คะน้า 500 กรัม
มะนาว 1 ถุง
รวม 380 เก็บปลายทางจ้า`;

    const parsed = parseSingleOrderText(raw);
    expect(parsed.houseNumber).toBe('12/4');
    expect(parsed.soi).toContain('หมู่บ้านพฤกษา');
    expect(parsed.customerName).toContain('ก้อย');
    expect(parsed.phone).toBe('089-555-1234');
    expect(parsed.totalAmount).toBe(380);
    expect(parsed.paymentStatus).toBe('COD');
    expect(parsed.items.length).toBe(3);
  });

  it('should parse multi-order bulk paste cleanly', () => {
    const bulk = `ออเดอร์ 1
บ้าน 12/10 ซอย 2 คุณเอก 0841112233
กะเพรา 3 กำ
อกไก่ 1 กก.
รวม 160 บาท โอนแล้ว

ออเดอร์ 2
บ้าน 12/2 ซอย 2 น้าพร 0867778899
แตงกวา 1 โล
พริกขี้หนู 1 ขีด
รวม 95 เก็บปลายทาง`;

    const orders = parseBulkOrderText(bulk);
    expect(orders.length).toBe(2);
    expect(orders[0].houseNumber).toBe('12/10');
    expect(orders[0].paymentStatus).toBe('PAID');
    expect(orders[0].totalAmount).toBe(160);

    expect(orders[1].houseNumber).toBe('12/2');
    expect(orders[1].paymentStatus).toBe('COD');
    expect(orders[1].totalAmount).toBe(95);
  });

  it('should handle casual Thai orders without strict prefixes', () => {
    const raw = `15/8 ซ.4 (ป้าเพ็ญ 082-3344556)
น้ำมันพืช 2 ขวด
ไข่เป็ด 1 แผง
รวม 225 บาท แนบสลิปแล้วนะคะ`;

    const parsed = parseSingleOrderText(raw);
    expect(parsed.houseNumber).toBe('15/8');
    expect(parsed.customerName).toContain('ป้าเพ็ญ');
    expect(parsed.phone).toBe('082-334-4556');
    expect(parsed.totalAmount).toBe(225);
    expect(parsed.paymentStatus).toBe('PAID');
    expect(parsed.items.length).toBe(2);
  });
});

describe('2. Natural House Sorting & Route Planning Tests', () => {
  it('should correctly parse house number parts', () => {
    const parts1 = parseHouseNumberParts('12/10 ก');
    expect(parts1.mainNum).toBe(12);
    expect(parts1.subNum).toBe(10);
    expect(parts1.subSuffix).toBe('ก');

    const parts2 = parseHouseNumberParts('45/2');
    expect(parts2.mainNum).toBe(45);
    expect(parts2.subNum).toBe(2);
  });

  it('should sort house numbers naturally (12/1 < 12/2 < 12/10 < 13/1)', () => {
    const houses = ['12/10', '45/10', '12/2', '45/1', '12/1', '13/1', '45/2'];
    houses.sort(compareHouseNumbers);
    expect(houses).toEqual(['12/1', '12/2', '12/10', '13/1', '45/1', '45/2', '45/10']);
  });

  it('should compare soi names naturally (ซอย 2 < ซอย 10)', () => {
    const sois = ['ซอย 10', 'ซอย 1', 'ซอย 2'];
    sois.sort(compareSoiNames);
    expect(sois).toEqual(['ซอย 1', 'ซอย 2', 'ซอย 10']);
  });

  it('should handle manual reorder (move up/down) correctly', () => {
    const sample = [
      { id: '1', stopNumber: 1, houseNumber: '10' } as Order,
      { id: '2', stopNumber: 2, houseNumber: '20' } as Order,
      { id: '3', stopNumber: 3, houseNumber: '30' } as Order
    ];

    // Move index 2 (house 30) up to index 1
    const reordered = reorderOrders(sample, 2, 1);
    expect(reordered.map(o => o.houseNumber)).toEqual(['10', '30', '20']);
    expect(reordered.map(o => o.stopNumber)).toEqual([1, 2, 3]);
  });

  it('should group orders by soi and sort groups properly', () => {
    const sample = [
      { id: '1', houseNumber: '12/1', soi: 'ซอย 2' } as Order,
      { id: '2', houseNumber: '12/2', soi: 'ซอย 1' } as Order,
      { id: '3', houseNumber: '12/3', soi: 'ซอย 2' } as Order
    ];

    const grouped = groupOrdersBySoi(sample);
    expect(grouped.length).toBe(2);
    expect(grouped[0].soi).toBe('ซอย 1');
    expect(grouped[0].orders.length).toBe(1);
    expect(grouped[1].soi).toBe('ซอย 2');
    expect(grouped[1].orders.length).toBe(2);
  });
});

describe('3. Google Sheets Integration & Column Mapping Tests', () => {
  it('should format order to match columns A through N exactly', () => {
    const mockOrder: Order = {
      id: 'test-1',
      stopNumber: 1,
      houseNumber: '45/12',
      soi: 'ซอย 3',
      customerName: 'คุณวิภา',
      phone: '081-998-8776',
      items: [
        { id: 'i1', name: 'หมูบด', quantity: '1', unit: 'กก.' },
        { id: 'i2', name: 'ผักบุ้ง', quantity: '2', unit: 'กำ' }
      ],
      totalAmount: 245,
      paymentStatus: 'PAID',
      collectedAmount: 245,
      paymentMethod: 'TRANSFER',
      deliveryStatus: 'DELIVERED',
      deliveredAt: '14/11/2026 20:30',
      notes: 'วางไว้หน้าบ้าน',
      createdAt: '2026-11-14T20:30:00.000Z',
      updatedAt: '2026-11-14T20:30:00.000Z'
    };

    const row = orderToSheetRow(mockOrder);
    expect(row.length).toBe(18); // 18 columns A through R (including Cost, Fuel, Gross & Net Profit)
    expect(SHEETS_COLUMNS.length).toBe(18);
    expect(row[1]).toBe(1); // Stop No.
    expect(row[2]).toBe('45/12'); // House No.
    expect(row[3]).toBe('ซอย 3'); // Soi
    expect(row[4]).toBe('คุณวิภา'); // Customer
    expect(row[5]).toBe('081-998-8776'); // Phone
    expect(row[6]).toBe('หมูบด 1 กก., ผักบุ้ง 2 กำ'); // Items
    expect(row[7]).toBe(245); // Total Amount
    expect(row[8]).toBe('โอนแล้ว'); // Payment Status
    expect(row[9]).toBe(245); // Collected Amount
    expect(row[10]).toBe('โอนเงินล่วงหน้า'); // Payment Method
    expect(row[11]).toBe('ส่งสำเร็จ'); // Delivery Status
    expect(row[12]).toBe('14/11/2026 20:30'); // Delivered At
    expect(row[13]).toBe('วางไว้หน้าบ้าน'); // Notes
    expect(typeof row[14]).toBe('number'); // O: Cost
    expect(typeof row[15]).toBe('number'); // P: Gross Profit
    expect(typeof row[16]).toBe('number'); // Q: Fuel Share
    expect(typeof row[17]).toBe('number'); // R: Net Profit
  });

  it('should format status values in Thai accurately', () => {
    expect(formatPaymentStatusThai('PAID')).toBe('โอนแล้ว');
    expect(formatPaymentStatusThai('COD')).toBe('เก็บปลายทาง (COD)');

    expect(formatPaymentMethodThai('CASH')).toBe('เงินสด');
    expect(formatPaymentMethodThai('QR_SCAN')).toBe('สแกนจ่าย QR หน้าบ้าน');
    expect(formatPaymentMethodThai('UNPAID')).toBe('ค้างชำระ / จ่ายไม่ครบ');

    expect(formatDeliveryStatusThai('PENDING')).toBe('รอส่ง');
    expect(formatDeliveryStatusThai('DELIVERED')).toBe('ส่งสำเร็จ');
  });

  it('should generate valid UTF-8 BOM CSV', () => {
    const mockOrder: Order = {
      id: 'test-1',
      stopNumber: 1,
      houseNumber: '45/12',
      soi: 'ซอย 3',
      customerName: 'คุณวิภา',
      phone: '081-998-8776',
      items: [{ id: 'i1', name: 'หมูบด', quantity: '1', unit: 'กก.' }],
      totalAmount: 245,
      paymentStatus: 'PAID',
      collectedAmount: 245,
      paymentMethod: 'TRANSFER',
      deliveryStatus: 'DELIVERED',
      deliveredAt: '20:30',
      notes: 'วางไว้หน้าบ้าน',
      createdAt: '',
      updatedAt: ''
    };

    const csv = exportOrdersToCsv([mockOrder]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('คุณวิภา');
    expect(csv).toContain('หมูบด 1 กก.');
  });
});

describe('4. Market Shopping Aggregator & Category Detection Tests', () => {
  it('should detect category for Thai fresh market goods', async () => {
    const { detectCategory } = await import('../src/lib/shopping-aggregator');
    expect(detectCategory('หมูบดอนามัย')).toBe('meat');
    expect(detectCategory('สันคอหมู')).toBe('meat');
    expect(detectCategory('อกไก่สด')).toBe('meat');
    expect(detectCategory('ปลากะพง')).toBe('meat');

    expect(detectCategory('ผักบุ้งจีน')).toBe('veg');
    expect(detectCategory('คะน้าฮ่องกง')).toBe('veg');
    expect(detectCategory('แตงกวา')).toBe('veg');

    expect(detectCategory('ไข่ไก่สดเบอร์ 1')).toBe('egg_dairy');
    expect(detectCategory('นมสดพาสเจอร์ไรส์')).toBe('egg_dairy');

    expect(detectCategory('พริกขี้หนูสวน')).toBe('spice');
    expect(detectCategory('กระเทียมไทย')).toBe('spice');
    expect(detectCategory('มะนาวแป้น')).toBe('spice');

    expect(detectCategory('น้ำมันพืช')).toBe('dry');
  });

  it('should consolidate identical items from different houses and maintain allocation breakdown', async () => {
    const { aggregateShoppingList } = await import('../src/lib/shopping-aggregator');

    const mockOrders: Order[] = [
      {
        id: 'ord-1',
        stopNumber: 1,
        houseNumber: '12/1',
        soi: 'ซอย 1',
        customerName: 'บ้าน 1',
        phone: '',
        items: [
          { id: 'i1', name: 'หมูบด', quantity: 2, unit: 'กก.' },
          { id: 'i2', name: 'ผักบุ้ง', quantity: 3, unit: 'กำ' }
        ],
        totalAmount: 200,
        paymentStatus: 'PAID',
        collectedAmount: 200,
        paymentMethod: 'TRANSFER',
        deliveryStatus: 'PENDING',
        deliveredAt: null,
        notes: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'ord-2',
        stopNumber: 2,
        houseNumber: '45/10',
        soi: 'ซอย 2',
        customerName: 'บ้าน 2',
        phone: '',
        items: [
          { id: 'i3', name: 'หมูบด', quantity: 3, unit: 'กก.' }
        ],
        totalAmount: 300,
        paymentStatus: 'COD',
        collectedAmount: 0,
        paymentMethod: null,
        deliveryStatus: 'PENDING',
        deliveredAt: null,
        notes: '',
        createdAt: '',
        updatedAt: ''
      }
    ];

    const shoppingList = aggregateShoppingList(mockOrders);
    // หมูบด should be aggregated to 2 + 3 = 5 กก.
    const pork = shoppingList.find(i => i.name === 'หมูบด');
    expect(pork).toBeDefined();
    expect(pork?.totalQuantity).toBe(5);
    expect(pork?.unit).toBe('กก.');
    expect(pork?.allocations.length).toBe(2);
    expect(pork?.allocations[0].houseNumber).toBe('12/1');
    expect(pork?.allocations[1].houseNumber).toBe('45/10');

    // ผักบุ้ง should have 3 กำ
    const morningGlory = shoppingList.find(i => i.name === 'ผักบุ้ง');
    expect(morningGlory?.totalQuantity).toBe(3);
  });
});

describe('5. Real Locations Directory & Helpers Tests', () => {
  it('should verify all required real locations exist with correct zones and sub-options', async () => {
    const { REAL_LOCATIONS, getLocationById } = await import('../src/lib/locations');

    // 1. Ivy River
    const ivy = getLocationById('ivy-river');
    expect(ivy).toBeDefined();
    expect(ivy?.zone).toBe('suksawat');
    expect(ivy?.type).toBe('condo');
    expect(ivy?.subOptions?.map(o => o.id)).toEqual(['A', 'D', 'C']);
    expect(ivy?.subOptions?.find(o => o.id === 'A')?.prefix).toBe('51/');
    expect(ivy?.subOptions?.find(o => o.id === 'D')?.prefix).toBe('57/');
    expect(ivy?.subOptions?.find(o => o.id === 'C')?.prefix).toBe('53/');

    // 2. Cher Suksawat
    const cher = getLocationById('cher-suksawat');
    expect(cher).toBeDefined();
    expect(cher?.zone).toBe('suksawat');
    expect(cher?.type).toBe('housing_estate');
    expect(cher?.defaultPrefix).toContain('65/146');

    // 3. Thanasin Ramintra
    const thanasin = getLocationById('thanasin');
    expect(thanasin).toBeDefined();
    expect(thanasin?.zone).toBe('ramintra');
    expect(thanasin?.type).toBe('housing_estate');
    expect(thanasin?.defaultPrefix).toBe('800/');
    expect(thanasin?.allowNewHouseNumbers).toBe(true);
    expect(thanasin?.sois?.length).toBeGreaterThanOrEqual(10);
    expect(thanasin?.sois).toContain('ซอย 1/1');
    expect(thanasin?.sois).toContain('ซอย 4/2');

    // 4. The Plant
    const thePlant = getLocationById('the-plant');
    expect(thePlant).toBeDefined();
    expect(thePlant?.zone).toBe('ramintra');
    expect(thePlant?.subOptions?.find(o => o.id === 'single')?.prefix).toBe('81/');
    expect(thePlant?.subOptions?.find(o => o.id === 'townhome')?.prefix).toBe('79/');

    // 5. Plum Condo
    const plum = getLocationById('plum-condo');
    expect(plum).toBeDefined();
    expect(plum?.zone).toBe('ramintra');
    expect(plum?.type).toBe('condo');
    expect(plum?.subOptions?.map(o => o.id)).toEqual(['A', 'B', 'C']);

    // 6. Custom
    const custom = getLocationById('custom');
    expect(custom).toBeDefined();
    expect(custom?.zone).toBe('other');
  });

  it('should compute prefix for location correctly', async () => {
    const { getPrefixForLocation } = await import('../src/lib/locations');

    expect(getPrefixForLocation('ivy-river', 'A')).toBe('51/');
    expect(getPrefixForLocation('ivy-river', 'ตึก D')).toBe('57/');
    expect(getPrefixForLocation('ivy-river', 'C')).toBe('53/');
    expect(getPrefixForLocation('the-plant', 'single')).toBe('81/');
    expect(getPrefixForLocation('the-plant', 'ทาวน์โฮม')).toBe('79/');
    expect(getPrefixForLocation('cher-suksawat')).toBe('65/146');
    expect(getPrefixForLocation('thanasin')).toBe('800/');
    expect(getPrefixForLocation('plum-condo', 'B')).toBe('');
  });

  it('should format full address cleanly for cards and drivers', async () => {
    const { formatFullAddress } = await import('../src/lib/locations');

    const addr1 = formatFullAddress({
      locationId: 'ivy-river',
      building: 'ตึก A',
      houseNumber: '51/204'
    });
    expect(addr1).toBe('ไอวี่ริเวอร์ ตึก A 51/204');

    const addr2 = formatFullAddress({
      locationId: 'thanasin',
      houseNumber: '800/15',
      soi: 'ซอย 2/1'
    });
    expect(addr2).toBe('หมู่บ้านธนศิลป์ 800/15 ซอย 2/1');

    const addr3 = formatFullAddress({
      locationId: 'the-plant',
      building: 'ทาวน์โฮม',
      houseNumber: '79/33',
      soi: 'ซอย 3'
    });
    expect(addr3).toBe('เดอะแพลนท์ ทาวน์โฮม 79/33 ซอย 3');
  });

  it('should detect real locations from Thai message text', async () => {
    const { detectLocationFromText } = await import('../src/lib/locations');

    const loc1 = detectLocationFromText('ส่งที่ไอวี่ริเวอร์ ตึก D 57/120 ครับ');
    expect(loc1.locationId).toBe('ivy-river');
    expect(loc1.building).toBe('ตึก D');
    expect(loc1.houseNumber).toBe('57/120');

    const loc2 = detectLocationFromText('บ้านธนศิลป์ ซอย 2/1 บ้านเลขที่ 800/44');
    expect(loc2.locationId).toBe('thanasin');
    expect(loc2.soi).toBe('ซอย 2/1');
    expect(loc2.houseNumber).toBe('800/44');

    const loc3 = detectLocationFromText('เดอะแพลนท์ ทาวน์โฮม 79/11');
    expect(loc3.locationId).toBe('the-plant');
    expect(loc3.building).toBe('ทาวน์โฮม');
    expect(loc3.houseNumber).toBe('79/11');
  });
});

describe('6. Frequent Contacts Directory Tests', () => {
  it('should create, find, search, and delete frequent contacts', async () => {
    const {
      getFrequentContacts,
      saveFrequentContact,
      deleteFrequentContact,
      searchFrequentContacts,
      findFrequentContact
    } = await import('../src/lib/contacts');

    // Save contact
    const created = saveFrequentContact({
      name: 'คุณนก ไอวี่',
      phone: '081-111-2233',
      locationId: 'ivy-river',
      building: 'ตึก A',
      houseNumber: '51/104',
      defaultNotes: 'ฝากนิติคอนโด',
      type: 'customer'
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('คุณนก ไอวี่');
    expect(created.locationId).toBe('ivy-river');

    // Find contact by phone
    const found = findFrequentContact({ phone: '0811112233' });
    expect(found).toBeDefined();
    expect(found?.name).toBe('คุณนก ไอวี่');

    // Search contacts
    const searchRes = searchFrequentContacts('นก');
    expect(searchRes.length).toBeGreaterThanOrEqual(1);

    // Delete contact
    deleteFrequentContact(created.id);
    const afterDelete = findFrequentContact({ phone: '0811112233' });
    expect(afterDelete).toBeUndefined();
  });
});

describe('7. Initial Sample Orders & Clean Storage State Tests', () => {
  it('INITIAL_SAMPLE_ORDERS should be empty array', async () => {
    const { INITIAL_SAMPLE_ORDERS } = await import('../src/lib/sample-data');
    expect(INITIAL_SAMPLE_ORDERS).toBeDefined();
    expect(INITIAL_SAMPLE_ORDERS.length).toBe(0);
  });

  it('loadStoredOrders should start empty without dummy orders', async () => {
    const { loadStoredOrders } = await import('../src/lib/storage');
    const orders = loadStoredOrders();
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBe(0);
  });
});

describe('8. Strict Non-Hallucination LINE Parser Tests', () => {
  it('should NOT invent house number, building, or soi when absent from text', () => {
    const textWithoutAddress = `หมูบด 1 กก.
คะน้า 2 กำ
คุณสมชาย 081-234-5678
ยอด 180 บาท โอนแล้ว`;

    const parsed = parseSingleOrderText(textWithoutAddress);
    expect(parsed.houseNumber).toBe('');
    expect(parsed.soi).toBe('');
    expect(parsed.building).toBeUndefined();
    expect(parsed.customerName).toBe('คุณสมชาย');
    expect(parsed.phone).toBe('081-234-5678');
    expect(parsed.totalAmount).toBe(180);
    expect(parsed.paymentStatus).toBe('PAID');
    expect(parsed.items.length).toBe(2);
  });

  it('should NOT confuse item fractions like 1/2 กก. with house numbers', () => {
    const textWithFractions = `แตงโม 1/2 ลูก
เนื้อหมู 1/2 กก.
รวม 120 บาท เก็บปลายทาง`;

    const parsed = parseSingleOrderText(textWithFractions);
    expect(parsed.houseNumber).toBe('');
    expect(parsed.soi).toBe('');
    expect(parsed.building).toBeUndefined();
    expect(parsed.totalAmount).toBe(120);
    expect(parsed.paymentStatus).toBe('COD');
  });

  it('should parse real location orders with accurate building and house number without hallucinating', () => {
    const rawIvy = `ไอวี่ริเวอร์ ตึก D ห้อง 57/402
คุณแพร 089-876-5432
ไข่ไก่ 1 แผง
กล้วยหอม 1 หวี
ยอด 190 โอนแล้ว
ฝากไว้ที่นิติบุคคล`;

    const parsed = parseSingleOrderText(rawIvy);
    expect(parsed.locationId).toBe('ivy-river');
    expect(parsed.building).toBe('ตึก D');
    expect(parsed.houseNumber).toBe('57/402');
    expect(parsed.customerName).toBe('คุณแพร');
    expect(parsed.paymentStatus).toBe('PAID');
    expect(parsed.notes).toContain('นิติบุคคล');
  });
});

describe('9. Storage v4 Migration & Mock Data Purge Tests', () => {
  it('should use v4 storage keys and initialize cleanly at 0 orders and 0 shopping items', async () => {
    const { ORDERS_KEY, SHEETS_CONFIG_KEY, loadStoredOrders } = await import('../src/lib/storage');
    const { SHOPPING_STATE_KEY, loadShoppingState } = await import('../src/lib/shopping-aggregator');

    expect(ORDERS_KEY).toBe('marketdrop_orders_v4');
    expect(SHEETS_CONFIG_KEY).toBe('marketdrop_sheets_config_v2');
    expect(SHOPPING_STATE_KEY).toBe('marketdrop_shopping_state_v3');

    const orders = loadStoredOrders();
    expect(orders.length).toBe(0);

    const shopState = loadShoppingState();
    expect(shopState.boughtItemIds.length).toBe(0);
    expect(shopState.manualItems.length).toBe(0);
  });
});

describe('10. Shopping Allocation & Linking to Delivery Stops Tests', () => {
  it('should allocate item to an existing house order', async () => {
    const { allocateItemToHouse } = await import('../src/lib/shopping-aggregator');

    const initialOrders: Order[] = [
      {
        id: 'ord-test-1',
        stopNumber: 1,
        houseNumber: '51/104',
        soi: '',
        locationId: 'ivy-river',
        building: 'ตึก A',
        customerName: 'คุณนก',
        phone: '081-111-2222',
        items: [{ id: 'it-1', name: 'ผักบุ้ง', quantity: '2', unit: 'กำ', price: 30 }],
        totalAmount: 30,
        paymentStatus: 'COD',
        collectedAmount: 0,
        paymentMethod: null,
        deliveryStatus: 'PENDING',
        deliveredAt: null,
        notes: '',
        createdAt: '',
        updatedAt: ''
      }
    ];

    // Allocate 1 kg pork to this existing order
    const updated = allocateItemToHouse(initialOrders, 'หมูบด', 'กก.', {
      houseNumber: '51/104',
      locationId: 'ivy-river',
      quantity: 1,
      unit: 'กก.',
      price: 140
    });

    expect(updated.length).toBe(1);
    expect(updated[0].items.length).toBe(2);
    expect(updated[0].items.some(i => i.name === 'หมูบด' && i.quantity === 1)).toBe(true);
    expect(updated[0].totalAmount).toBe(170);
  });

  it('should create new delivery stop when allocating item to a new house', async () => {
    const { allocateItemToHouse } = await import('../src/lib/shopping-aggregator');

    const initialOrders: Order[] = [];

    const updated = allocateItemToHouse(initialOrders, 'ไข่ไก่เบอร์ 1', 'แผง', {
      houseNumber: '800/22',
      soi: 'ซอย 2/1',
      locationId: 'thanasin',
      customerName: 'พี่หนุ่ม',
      quantity: 2,
      unit: 'แผง',
      price: 270
    });

    expect(updated.length).toBe(1);
    expect(updated[0].houseNumber).toBe('800/22');
    expect(updated[0].soi).toBe('ซอย 2/1');
    expect(updated[0].customerName).toBe('พี่หนุ่ม');
    expect(updated[0].items.length).toBe(1);
    expect(updated[0].items[0].name).toBe('ไข่ไก่เบอร์ 1');
    expect(updated[0].items[0].quantity).toBe(2);
    expect(updated[0].totalAmount).toBe(270);
  });

  it('should remove allocation and reallocate cleanly', async () => {
    const {
      allocateItemToHouse,
      removeAllocationFromHouse,
      reallocateItemHouse
    } = await import('../src/lib/shopping-aggregator');

    let orders: Order[] = [];
    orders = allocateItemToHouse(orders, 'แตงกวา', 'กก.', {
      houseNumber: '79/12',
      customerName: 'บ้าน 1',
      quantity: 1,
      unit: 'กก.'
    });

    expect(orders.length).toBe(1);
    expect(orders[0].items[0].name).toBe('แตงกวา');

    // Reallocate to another house
    orders = reallocateItemHouse(orders, 'แตงกวา', 'กก.', '79/12', {
      houseNumber: '81/55',
      customerName: 'บ้าน 2',
      quantity: 1,
      unit: 'กก.'
    });

    expect(orders.length).toBe(1);
    expect(orders[0].houseNumber).toBe('81/55');
    expect(orders[0].customerName).toBe('บ้าน 2');

    // Remove allocation
    orders = removeAllocationFromHouse(orders, 'แตงกวา', 'กก.', '81/55');
    expect(orders.length).toBe(0);
  });
});

describe('11. Price Memory & Catalog Engine Tests', () => {
  it('should save, lookup, update cost price, search and delete price book entries', async () => {
    const {
      savePriceBookEntry,
      lookupPriceBook,
      updateCostPriceForProduct,
      searchPriceBook,
      deletePriceBookEntry,
      getPriceBook
    } = await import('../src/lib/price-book');

    // 1. Save entry
    const saved = savePriceBookEntry({
      itemName: 'หมูบดอนามัย',
      shopName: 'เขียงหมูเจ๊พร',
      costPrice: 120,
      sellingPrice: 140,
      unit: 'กก.',
      notes: 'สั่งล่วงหน้า 1 วัน'
    });

    expect(saved.id).toBeDefined();
    expect(saved.itemName).toBe('หมูบดอนามัย');
    expect(saved.costPrice).toBe(120);
    expect(saved.shopName).toBe('เขียงหมูเจ๊พร');

    // 2. Lookup exact and partial match
    const exact = lookupPriceBook('หมูบดอนามัย');
    expect(exact).toBeDefined();
    expect(exact?.costPrice).toBe(120);

    const partial = lookupPriceBook('หมูบด');
    expect(partial).toBeDefined();
    expect(partial?.costPrice).toBe(120);

    // 3. Update cost price
    updateCostPriceForProduct('หมูบดอนามัย', 125, 'เขียงหมูเจ๊พร สาขา 2');
    const updated = lookupPriceBook('หมูบดอนามัย');
    expect(updated?.costPrice).toBe(125);
    expect(updated?.shopName).toBe('เขียงหมูเจ๊พร สาขา 2');

    // 4. Search
    const searchResults = searchPriceBook('เจ๊พร');
    expect(searchResults.length).toBeGreaterThanOrEqual(1);

    // 5. Delete entry
    deletePriceBookEntry(saved.id);
    const afterDelete = lookupPriceBook('หมูบดอนามัย');
    expect(afterDelete).toBeNull();
  });
});

describe('12. Fuel & Transport Expense Calculator Tests', () => {
  it('should calculate fuel consumption and total expenses accurately', async () => {
    const { calculateFuelExpense, saveFuelConfig, getFuelConfig } = await import('../src/lib/fuel-calc');

    // Distance: 30 km, 15 km/L, 38.5 ฿/L, Other: 50 ฿
    const testConfig = {
      distanceKm: 30,
      consumptionKmPerLiter: 15,
      fuelPricePerLiter: 38.5,
      otherExpenses: 50,
      otherExpenseNotes: 'ค่าทางด่วน'
    };

    const result = calculateFuelExpense(testConfig);
    // 30 / 15 = 2.00 liters
    expect(result.litersUsed).toBe(2);
    // 2 * 38.5 = 77.00 baht
    expect(result.fuelCost).toBe(77);
    // 77 + 50 = 127.00 baht
    expect(result.totalExpense).toBe(127);

    // Test saving and loading config
    saveFuelConfig(testConfig);
    const loaded = getFuelConfig();
    expect(loaded.distanceKm).toBe(30);
    expect(loaded.consumptionKmPerLiter).toBe(15);
    expect(loaded.otherExpenses).toBe(50);
  });
});

describe('13. Profit & Loss (P&L) Aggregation Engine Tests', () => {
  it('should compute comprehensive daily profit with item breakdown, margins, and fuel expense', async () => {
    const { calculateDailyProfit } = await import('../src/lib/profit-aggregator');
    const { savePriceBookEntry } = await import('../src/lib/price-book');

    // Pre-populate price book for auto-cost lookup
    savePriceBookEntry({
      itemName: 'ผักบุ้ง',
      shopName: 'แผงผักป้าแตน',
      costPrice: 15, // Cost 15 baht per bunch
      unit: 'กำ'
    });

    const mockOrders: Order[] = [
      {
        id: 'ord-profit-1',
        stopNumber: 1,
        houseNumber: '51/104',
        soi: 'ตึก A',
        customerName: 'คุณนก',
        phone: '0812345678',
        items: [
          // Item with explicit costPrice
          { id: 'i1', name: 'หมูบด', quantity: 2, unit: 'กก.', price: 300, costPrice: 120, shopName: 'เขียงหมูเจ๊พร' },
          // Item without explicit costPrice (should fallback to price book: 15 baht)
          { id: 'i2', name: 'ผักบุ้ง', quantity: 3, unit: 'กำ', price: 60 }
        ],
        totalAmount: 360,
        paymentStatus: 'PAID',
        collectedAmount: 360,
        paymentMethod: 'TRANSFER',
        deliveryStatus: 'DELIVERED',
        deliveredAt: '2026-11-14 20:00',
        notes: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'ord-profit-2',
        stopNumber: 2,
        houseNumber: '800/12',
        soi: 'ซอย 1/1',
        customerName: 'พี่หนุ่ม',
        phone: '',
        items: [
          { id: 'i3', name: 'หมูบด', quantity: 1, unit: 'กก.', price: 150, costPrice: 120, shopName: 'เขียงหมูเจ๊พร' }
        ],
        totalAmount: 150,
        paymentStatus: 'COD',
        collectedAmount: 0,
        paymentMethod: null,
        deliveryStatus: 'PENDING',
        deliveredAt: null,
        notes: '',
        createdAt: '',
        updatedAt: ''
      }
    ];

    const fuelConfig = {
      distanceKm: 28,
      consumptionKmPerLiter: 14,
      fuelPricePerLiter: 38.5,
      otherExpenses: 20
    };
    // Fuel expense: 28 / 14 = 2 liters * 38.5 = 77 baht + 20 other = 97 baht total

    const profitSummary = calculateDailyProfit(mockOrders, fuelConfig);

    // Revenue: 360 + 150 = 510 baht
    expect(profitSummary.totalRevenue).toBe(510);

    // Produce Cost:
    // หมูบด: (2 + 1) * 120 = 360 baht
    // ผักบุ้ง: 3 * 15 = 45 baht
    // Total produce cost: 360 + 45 = 405 baht
    expect(profitSummary.totalProduceCost).toBe(405);

    // Gross produce profit: 510 - 405 = 105 baht
    expect(profitSummary.grossProduceProfit).toBe(105);

    // Fuel cost: 77 baht, Other expenses: 20 baht
    expect(profitSummary.totalFuelCost).toBe(77);
    expect(profitSummary.totalOtherExpense).toBe(20);
    expect(profitSummary.totalExpenses).toBe(502); // 405 + 77 + 20 = 502

    // Net profit: 510 - 502 = 8 baht
    expect(profitSummary.netProfit).toBe(8);
    expect(profitSummary.profitMarginPercent).toBeGreaterThan(0);

    // Check item breakdown
    expect(profitSummary.itemsBreakdown.length).toBe(2);
    const pork = profitSummary.itemsBreakdown.find(i => i.name === 'หมูบด');
    expect(pork).toBeDefined();
    expect(pork?.quantity).toBe(3);
    expect(pork?.costPrice).toBe(120);
    expect(pork?.totalCost).toBe(360);
    expect(pork?.totalRevenue).toBe(450);
    expect(pork?.profit).toBe(90);

    const morningGlory = profitSummary.itemsBreakdown.find(i => i.name === 'ผักบุ้ง');
    expect(morningGlory).toBeDefined();
    expect(morningGlory?.isCostEstimated).toBe(true);
    expect(morningGlory?.costPrice).toBe(15);
  });
});

describe('14. One-Click Customer Notification Tests', () => {
  it('should generate pre-arrival alert for COD and PAID orders, and produce SMS and LINE links', async () => {
    const {
      generateDeliveryAlertText,
      generateSmsLink,
      generateLineShareLink,
      getDeliveryNotificationData
    } = await import('../src/lib/customer-notify');

    const codOrder: Order = {
      id: 'ord-notify-1',
      stopNumber: 1,
      houseNumber: '51/104',
      soi: '',
      locationId: 'ivy-river',
      building: 'ตึก A',
      customerName: 'คุณนก',
      phone: '081-234-5678',
      items: [
        { id: 'i1', name: 'หมูบด', quantity: 1, unit: 'กก.' },
        { id: 'i2', name: 'ผักบุ้ง', quantity: 2, unit: 'กำ' }
      ],
      totalAmount: 180,
      paymentStatus: 'COD',
      collectedAmount: 0,
      paymentMethod: null,
      deliveryStatus: 'IN_TRANSIT',
      deliveredAt: null,
      notes: 'วางไว้โต๊ะหน้าบ้าน',
      createdAt: '',
      updatedAt: ''
    };

    const codText = generateDeliveryAlertText(codOrder, { driverName: 'สมศักดิ์', estimatedMinutes: 10 });
    expect(codText).toContain('ไอวี่ริเวอร์ ตึก A 51/104');
    expect(codText).toContain('หมูบด 1 กก., ผักบุ้ง 2 กำ');
    expect(codText).toContain('ยอดเก็บเงินปลายทาง: 180 บาท');
    expect(codText).toContain('สแกนจ่าย QR');
    expect(codText).toContain('คนขับ: สมศักดิ์');

    // Test PAID order text
    const paidOrder: Order = {
      ...codOrder,
      paymentStatus: 'PAID'
    };
    const paidText = generateDeliveryAlertText(paidOrder);
    expect(paidText).toContain('ชำระเงินเรียบร้อยแล้ว (ยอด 180 บาท)');
    expect(paidText).not.toContain('ยอดเก็บเงินปลายทาง');

    // Test SMS link and LINE link
    const smsLink = generateSmsLink('081-234-5678', codText);
    expect(smsLink.startsWith('sms:0812345678?body=')).toBe(true);

    const lineLink = generateLineShareLink(codText);
    expect(lineLink.startsWith('https://line.me/R/msg/text/?')).toBe(true);

    // Test full notification payload
    const payload = getDeliveryNotificationData(codOrder);
    expect(payload.phone).toBe('0812345678');
    expect(payload.smsUrl).toBeDefined();
    expect(payload.lineShareUrl).toBeDefined();
    expect(payload.totalAmount).toBe(180);
  });
});

describe('15. Historical Profit Analytics & Snapshots Tests', () => {
  it('should save daily profit snapshots, retrieve by date, and compute period analytics with trends', async () => {
    const {
      saveDailyProfitSnapshot,
      getProfitRecordByDate,
      getProfitAnalyticsByPeriod,
      clearProfitHistory
    } = await import('../src/lib/historical-profit');

    clearProfitHistory();

    const mockSummaryDay1 = {
      totalRevenue: 1000,
      totalProduceCost: 700,
      grossProfit: 300,
      grossProduceProfit: 300,
      grossMarginPercent: 30,
      totalFuelCost: 100,
      totalOtherExpense: 20,
      totalTransportExpense: 120,
      totalExpenses: 820,
      netProfit: 180,
      profitMarginPercent: 18,
      netMarginPercent: 18,
      totalDeliveredOrders: 5,
      totalOrders: 5,
      orderCount: 5,
      fuelResult: { litersUsed: 2.6, fuelCost: 100, otherExpenses: 20, totalExpense: 120, costPerKm: 4 },
      itemsBreakdown: [{ name: 'หมูบด', category: 'meat' as const, shopName: 'เจ๊พร', quantity: 5, unit: 'กก.', costPrice: 120, sellingPrice: 150, totalRevenue: 750, totalCost: 600, profit: 150, margin: 20, marginPercent: 20, orderCount: 3, isCostEstimated: false }]
    };

    const mockSummaryDay2 = {
      ...mockSummaryDay1,
      totalRevenue: 1500,
      totalProduceCost: 1000,
      grossProfit: 500,
      grossProduceProfit: 500,
      netProfit: 380,
      orderCount: 8,
      totalOrders: 8
    };

    // Save 2 daily snapshots
    saveDailyProfitSnapshot('2026-11-13', mockSummaryDay1);
    saveDailyProfitSnapshot('2026-11-14', mockSummaryDay2);

    // Retrieve by date
    const record = getProfitRecordByDate('2026-11-14');
    expect(record).toBeDefined();
    expect(record?.totalRevenue).toBe(1500);
    expect(record?.netProfit).toBe(380);
    expect(record?.orderCount).toBe(8);

    // Period Analytics: 'all'
    const analyticsAll = getProfitAnalyticsByPeriod('all');
    expect(analyticsAll.daysRecorded).toBe(2);
    expect(analyticsAll.totalRevenue).toBe(2500); // 1000 + 1500
    expect(analyticsAll.netProfit).toBe(560); // 180 + 380
    expect(analyticsAll.totalOrders).toBe(13); // 5 + 8
    expect(analyticsAll.averageDailyRevenue).toBe(1250);
    expect(analyticsAll.dailyTrends.length).toBe(2);
    expect(analyticsAll.dailyTrends[0].date).toBe('2026-11-13');
    expect(analyticsAll.dailyTrends[1].date).toBe('2026-11-14');
  });
});

describe('16. Store/Stall-based Shopping Consolidation Tests', () => {
  it('should group shopping items by stalls and calculate stall completion', async () => {
    const { groupShoppingItemsByShop } = await import('../src/lib/shopping-aggregator');

    const sampleItems: ShoppingItem[] = [
      {
        id: 's1',
        name: 'สันคอหมู',
        category: 'meat',
        totalQuantity: 2,
        unit: 'กก.',
        bought: false,
        estimatedPrice: 280,
        allocations: []
      },
      {
        id: 's2',
        name: 'หมูบด',
        category: 'meat',
        totalQuantity: 3,
        unit: 'กก.',
        bought: true,
        estimatedPrice: 420,
        allocations: []
      },
      {
        id: 's3',
        name: 'คะน้าฮ่องกง',
        category: 'veg',
        totalQuantity: 5,
        unit: 'กก.',
        bought: true,
        estimatedPrice: 150,
        allocations: []
      },
      {
        id: 's4',
        name: 'กวางตุ้ง',
        category: 'veg',
        totalQuantity: 3,
        unit: 'กำ',
        bought: true,
        estimatedPrice: 45,
        allocations: []
      }
    ];

    const stallGroups = groupShoppingItemsByShop(sampleItems);
    expect(stallGroups.length).toBe(2);

    // Meat stall has 1 unbought item -> isCompleted: false
    const meatStall = stallGroups.find(g => g.category === 'meat');
    expect(meatStall).toBeDefined();
    expect(meatStall?.items.length).toBe(2);
    expect(meatStall?.totalItemsCount).toBe(2);
    expect(meatStall?.boughtItemsCount).toBe(1);
    expect(meatStall?.isCompleted).toBe(false);

    // Veg stall has all items bought -> isCompleted: true
    const vegStall = stallGroups.find(g => g.category === 'veg');
    expect(vegStall).toBeDefined();
    expect(vegStall?.items.length).toBe(2);
    expect(vegStall?.boughtItemsCount).toBe(2);
    expect(vegStall?.isCompleted).toBe(true);

    // Verify incomplete stalls sort before completed stalls
    expect(stallGroups[0].isCompleted).toBe(false);
    expect(stallGroups[1].isCompleted).toBe(true);
  });
});

describe('17. Slip OCR Verification, Quick Messages, Collection Stats & Local Dates', () => {
  const baseOrder: Order = {
    id: 'ord-17',
    stopNumber: 1,
    houseNumber: '45/10',
    soi: '',
    customerName: 'พี่นก',
    phone: '',
    items: [{ id: 'i1', name: 'หมูบด', quantity: 1, unit: 'กก.' }],
    totalAmount: 250,
    paymentStatus: 'COD',
    collectedAmount: 0,
    paymentMethod: null,
    deliveryStatus: 'PENDING',
    deliveredAt: null,
    notes: '',
    createdAt: '',
    updatedAt: ''
  };

  it('should sanitize model output and evaluate slips (match / mismatch / duplicate / not a slip)', async () => {
    const { sanitizeSlipData, evaluateSlip } = await import('../src/lib/slip-check');

    const slip = sanitizeSlipData({ isSlip: true, amount: '1,250.00', transRef: '0153 1234-ABC', bank: 'KBank' });
    expect(slip.amount).toBe(1250);
    expect(slip.senderName).toBe('');

    expect(evaluateSlip(slip, 1250).verdict).toBe('MATCH');
    const short = evaluateSlip(slip, 1300);
    expect(short.verdict).toBe('AMOUNT_MISMATCH');
    expect(short.diff).toBe(-50);
    expect(evaluateSlip(slip, 1250, ['01531234abc']).verdict).toBe('DUPLICATE');
    expect(evaluateSlip(sanitizeSlipData({ isSlip: false }), 100).verdict).toBe('NOT_A_SLIP');
    expect(evaluateSlip(sanitizeSlipData('garbage'), 100).verdict).toBe('NOT_A_SLIP');
  });

  it('should fill quick message templates with order data', async () => {
    const { fillMessageTemplate, DEFAULT_QUICK_MESSAGES } = await import('../src/lib/customer-notify');
    expect(DEFAULT_QUICK_MESSAGES.length).toBeGreaterThan(0);
    const text = fillMessageTemplate('{ชื่อ} บ้าน {บ้าน} ยอด {ยอด} บาท ({รายการ})', { ...baseOrder, totalAmount: 1250 });
    expect(text).toBe('พี่นก บ้าน 45/10 ยอด 1,250 บาท (หมูบด 1 กก.)');
  });

  it('should split collected vs outstanding money by payment method', async () => {
    const { calculateCollectionStats } = await import('../src/lib/profit-aggregator');
    const stats = calculateCollectionStats([
      { ...baseOrder, id: 'a', deliveryStatus: 'DELIVERED', paymentMethod: 'CASH', collectedAmount: 250 },
      { ...baseOrder, id: 'b', deliveryStatus: 'DELIVERED', paymentMethod: 'UNPAID', collectedAmount: 100 },
      { ...baseOrder, id: 'c', paymentStatus: 'PAID' }, // prepaid, not yet delivered
      { ...baseOrder, id: 'd' }, // COD pending
      { ...baseOrder, id: 'e', deliveryStatus: 'CANCELLED' }
    ]);
    expect(stats.billed).toBe(1000);
    expect(stats.byMethod).toEqual({ TRANSFER: 250, CASH: 250, QR_SCAN: 0, PARTIAL: 100 });
    expect(stats.collected).toBe(600);
    expect(stats.outstanding).toBe(400);
    expect(stats.avgOrderValue).toBe(250);
  });

  it('should format local dates without UTC shift (early-morning market runs)', async () => {
    const { toLocalDateStr } = await import('../src/lib/historical-profit');
    expect(toLocalDateStr(new Date(2026, 10, 15, 1, 30))).toBe('2026-11-15');
    expect(toLocalDateStr(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('18. Gemini model fallback', () => {
  const ok = (text: string) =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });

  const withFetch = async (handler: (model: string) => Response, run: () => Promise<void>) => {
    const realFetch = globalThis.fetch;
    const realError = console.error;
    const called: string[] = [];
    globalThis.fetch = (async (url: string) => {
      const model = String(url).split('/models/')[1].split(':')[0];
      called.push(model);
      return handler(model);
    }) as unknown as typeof fetch;
    console.error = () => {};
    try {
      await run();
    } finally {
      globalThis.fetch = realFetch;
      console.error = realError;
    }
    return called;
  };

  it('moves to the next model when one is busy, in the configured order', async () => {
    const { geminiImageToJson, GEMINI_MODELS } = await import('../src/lib/gemini');
    let result: unknown;
    const called = await withFetch(
      m => (m === GEMINI_MODELS[0] ? new Response('busy', { status: 503 }) : ok('{"ok":true}')),
      async () => {
        result = await geminiImageToJson('p', 'data:image/jpeg;base64,AAAA', 'image/jpeg', 'k');
      }
    );
    expect(result).toEqual({ ok: true });
    expect(called).toEqual(GEMINI_MODELS.slice(0, 2));
  });

  it('gives a Thai "busy" message after every model fails, and stops at once on a 400', async () => {
    const { geminiImageToJson, GEMINI_MODELS, GEMINI_BUSY_MESSAGE } = await import('../src/lib/gemini');
    const allBusy = await withFetch(
      () => new Response('busy', { status: 503 }),
      async () => {
        await expect(geminiImageToJson('p', 'AAAA', 'image/jpeg', 'k')).rejects.toThrow(GEMINI_BUSY_MESSAGE);
      }
    );
    expect(allBusy).toEqual(GEMINI_MODELS);

    const badRequest = await withFetch(
      () => new Response('bad image', { status: 400 }),
      async () => {
        await expect(geminiImageToJson('p', 'AAAA', 'image/jpeg', 'k')).rejects.toThrow('Gemini 400');
      }
    );
    expect(badRequest.length).toBe(1);
  });
});

describe('19. Trip planner (route → km for fuel)', () => {
  it('builds legs from start → stops → back, using saved km, coordinate estimates, or missing', async () => {
    const { buildTripLegs, tripTotalKm, legKey } = await import('../src/lib/trip');
    const places = [
      { id: 'home', name: 'บ้าน', lat: 13.7, lng: 100.5 },
      { id: 'market', name: 'ตลาด', lat: 13.71, lng: 100.5 }, // ~1.11 km north
      { id: 'condo', name: 'คอนโด' } // no coordinates
    ];
    const legs = buildTripLegs(
      { startId: 'home', stopIds: ['market', 'condo'], roundTrip: true },
      places,
      { [legKey('condo', 'market')]: 4.5 } // saved in the other direction: pairs are symmetric
    );
    expect(legs.map(l => [l.fromId, l.toId, l.source])).toEqual([
      ['home', 'market', 'estimate'],
      ['market', 'condo', 'saved'],
      ['condo', 'home', 'missing']
    ]);
    expect(legs[0].km).toBe(1.4); // 1.11 km straight × 1.3 road factor
    expect(tripTotalKm(legs)).toBe(5.9);

    const oneWay = buildTripLegs({ startId: 'home', stopIds: ['market'], roundTrip: false }, places, {});
    expect(oneWay.length).toBe(1);
    expect(buildTripLegs({ startId: 'home', stopIds: [], roundTrip: true }, places, {})).toEqual([]);
  });

  it('reads coordinates from Google Maps links and builds a directions URL', async () => {
    const { parseLatLng, buildMapsDirectionsUrl } = await import('../src/lib/trip');
    expect(parseLatLng('https://www.google.com/maps/place/X/@13.6789,100.4567,17z')).toEqual({ lat: 13.6789, lng: 100.4567 });
    expect(parseLatLng('https://maps.google.com/?q=13.65,100.49')).toEqual({ lat: 13.65, lng: 100.49 });
    expect(parseLatLng(' 13.7, 100.5 ')).toEqual({ lat: 13.7, lng: 100.5 });
    expect(parseLatLng('https://maps.app.goo.gl/abc123')).toBeNull();
    expect(parseLatLng('999.1, 100.5')).toBeNull();

    const url = buildMapsDirectionsUrl(
      { startId: 'home', stopIds: ['market', 'condo'], roundTrip: true },
      [
        { id: 'home', name: 'บ้าน', lat: 13.7, lng: 100.5 },
        { id: 'market', name: 'ตลาด' },
        { id: 'condo', name: 'คอนโด' }
      ]
    )!;
    const q = new URL(url).searchParams;
    expect(q.get('origin')).toBe('13.7,100.5');
    expect(q.get('destination')).toBe('13.7,100.5');
    expect(q.get('waypoints')).toBe('ตลาด|คอนโด');
  });
});

describe('20. Google Sheets v2 (history upsert + summaries)', () => {
  // Minimal in-memory stand-in for SpreadsheetApp: just enough to run the real script text
  const makeFakeSpreadsheet = () => {
    const sheets: Record<string, { cells: unknown[][] }> = {};
    const chain = (obj: object): object =>
      new Proxy(obj, { get: (t, k) => (k in t ? (t as Record<string | symbol, unknown>)[k] : () => chain(obj)) });
    const makeSheet = (name: string) => {
      const sh = { cells: [] as unknown[][] };
      sheets[name] = sh;
      const api = {
        getLastRow: () => sh.cells.length,
        getRange: (r: number, c: number, nr = 1, nc = 1): object =>
          chain({
            getValues: () =>
              Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sh.cells[r - 1 + i]?.[c - 1 + j] ?? '')),
            setValues: (vals: unknown[][]) => {
              vals.forEach((row, i) =>
                row.forEach((v, j) => {
                  (sh.cells[r - 1 + i] ||= [])[c - 1 + j] = v;
                })
              );
              return api.getRange(r, c, nr, nc);
            },
            clearContent: () => {
              sh.cells.splice(r - 1, nr);
              return api.getRange(r, c, nr, nc);
            }
          }),
        clear: () => {
          sh.cells = [];
        },
        setFrozenRows: () => undefined
      };
      return api;
    };
    const apis: Record<string, ReturnType<typeof makeSheet>> = {};
    const ss = {
      getSheetByName: (n: string) => apis[n] || null,
      insertSheet: (n: string) => (apis[n] = makeSheet(n))
    };
    return { ss, sheets };
  };

  const loadScript = async (ss: unknown) => {
    const { APPS_SCRIPT_CODE } = await import('../src/lib/apps-script');
    const run = new Function('SpreadsheetApp', 'ContentService', 'LockService', `${APPS_SCRIPT_CODE}; return { doPost, doGet };`);
    return run(
      { getActiveSpreadsheet: () => ss },
      { createTextOutput: (t: string) => ({ setMimeType: () => t }), MimeType: { JSON: 'json' } },
      { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) }
    ) as { doPost: (e: unknown) => string; doGet: (e: unknown) => string };
  };

  const order = (id: string, date: string, customer: string, total: number, cost: number, status = 'ส่งสำเร็จ') => ({
    id, date, customerName: customer, houseNumber: '51/1', location: 'ไอวี่ริเวอร์', phone: '', items: 'หมูบด 1 กก.',
    total, paid: total, due: 0, paymentMethod: 'เงินสด', status, cost, profit: total - cost, notes: '', updatedAt: ''
  });
  const post = (script: { doPost: (e: unknown) => string }, body: unknown) =>
    JSON.parse(script.doPost({ postData: { contents: JSON.stringify(body) } }));

  it('keeps history across syncs, updates by Order ID, and builds customer + P&L tabs', async () => {
    const { ss, sheets } = makeFakeSpreadsheet();
    const script = await loadScript(ss);

    // Day 1
    expect(
      post(script, {
        action: 'UPSERT_ORDERS',
        orders: [order('a', '2026-11-14', 'พี่นก', 200, 120), order('b', '2026-11-14', 'คุณเอ', 300, 200)],
        expenses: [{ date: '2026-11-14', fuel: 30, other: 10, km: 12 }]
      }).status
    ).toBe('success');

    // Day 2: app was reset, so only today's orders are sent. Day 1 must survive; 'a' re-sent with a new total.
    post(script, {
      action: 'UPSERT_ORDERS',
      orders: [
        order('c', '2026-11-15', 'พี่นก', 150, 100),
        order('a', '2026-11-14', 'พี่นก', 250, 120),
        order('x', '2026-11-15', 'ลูกค้ายกเลิก', 999, 0, 'ยกเลิก')
      ],
      expenses: [{ date: '2026-11-15', fuel: 20, other: 0, km: 8 }]
    });

    const orders = sheets['ออเดอร์'].cells.slice(1);
    expect(orders.length).toBe(4); // a, b, c, x: nothing wiped, nothing duplicated
    expect(orders.find(r => r[14] === 'a')![6]).toBe(250); // updated in place
    expect(orders[0][0]).toBe('2026-11-15'); // newest day first

    const customers = sheets['ลูกค้า'].cells.slice(1);
    const nok = customers.find(r => r[0] === 'พี่นก')!;
    expect(nok[2]).toBe(2);
    expect(nok[3]).toBe('15 พ.ย. 2026, 14 พ.ย. 2026');
    expect(nok[4]).toBe(400);
    expect(customers.some(r => r[0] === 'ลูกค้ายกเลิก')).toBe(false); // cancelled excluded

    const summary = sheets['สรุปกำไร'].cells;
    const rowOf = (label: string) => summary.find(r => r?.[0] === label)!.slice(1, 6);
    // revenue 700, produce cost 420, travel 60 → net 220
    expect(rowOf('ปี 2026')).toEqual([3, 700, 420, 60, 220]);
    expect(rowOf('พ.ย. 2026')).toEqual([3, 700, 420, 60, 220]);
    expect(rowOf('14 พ.ย. 2026')).toEqual([2, 550, 320, 40, 190]);
    expect(rowOf('15 พ.ย. 2026')).toEqual([1, 150, 100, 20, 30]);
    // 14 Nov 2026 is a Saturday, 15 Nov a Sunday: both in the week starting Monday 9 Nov
    expect(rowOf('สัปดาห์เริ่ม 9 พ.ย. 2026')).toEqual([3, 700, 420, 60, 220]);

    // Tapping a day in the app asks for that day's orders (cancelled ones included, flagged by status)
    const day = JSON.parse(script.doGet({ parameter: { date: '2026-11-14' } }));
    expect(day.orders.map((o: { id: string }) => o.id).sort()).toEqual(['a', 'b']);
    expect(day.orders.find((o: { id: string }) => o.id === 'a').total).toBe(250);
    expect(JSON.parse(script.doGet({ parameter: {} })).version).toBe(2);
  });

  it('builds the app payload: order day, paid/due, cost and travel cost', async () => {
    const { buildSheetsPayload } = await import('../src/lib/sheets');
    const base = {
      stopNumber: 1, soi: '', locationId: 'ivy-river', customerName: 'พี่นก', phone: '', notes: '', deliveredAt: null,
      createdAt: new Date(2026, 10, 14, 6, 30).toISOString(), updatedAt: '',
      items: [{ id: 'i', name: 'หมูบด', quantity: 2, unit: 'กก.', costPrice: 100 }]
    };
    const p = buildSheetsPayload(
      [
        { ...base, id: 'cod', houseNumber: '51/1', totalAmount: 300, paymentStatus: 'COD', collectedAmount: 0, paymentMethod: null, deliveryStatus: 'PENDING' },
        { ...base, id: 'part', houseNumber: '51/2', totalAmount: 300, paymentStatus: 'COD', collectedAmount: 100, paymentMethod: 'UNPAID', deliveryStatus: 'DELIVERED', partialReason: 'โอนเย็นนี้' },
        { ...base, id: 'pre', houseNumber: '51/3', totalAmount: 300, paymentStatus: 'PAID', collectedAmount: 0, paymentMethod: null, deliveryStatus: 'PENDING' }
      ] as Order[],
      { distanceKm: 14, consumptionKmPerLiter: 14, fuelPricePerLiter: 40, otherExpenses: 20 },
      '2026-11-15'
    );
    expect(p.orders.map(o => [o.id, o.date, o.paid, o.due, o.cost, o.profit])).toEqual([
      ['cod', '2026-11-14', 0, 300, 200, 100],
      ['part', '2026-11-14', 100, 200, 200, 100],
      ['pre', '2026-11-14', 300, 0, 200, 100]
    ]);
    expect(p.orders[0].location).toBe('ไอวี่ริเวอร์');
    expect(p.orders[1].notes).toContain('โอนเย็นนี้');
    expect(p.expenses).toEqual([{ date: '2026-11-15', fuel: 40, other: 20, km: 14 }]);
  });

  it('explains a rejected webhook in Thai', async () => {
    const { interpretSheetsReply } = await import('../src/lib/sheets-reply');
    expect(interpretSheetsReply(200, '{"status":"success","message":"x"}').ok).toBe(true);
    const denied = interpretSheetsReply(403, '<html>การเข้าถึงถูกปฏิเสธ</html>');
    expect(denied.ok).toBe(false);
    expect(denied.message).toContain('ทุกคน');
    expect(interpretSheetsReply(200, '{"status":"error","message":"boom"}').message).toContain('boom');
  });
});

describe('21. Drag-to-reorder (delivery + shopping)', () => {
  it('computes where a dragged row lands', async () => {
    const { computeDropIndex } = await import('../src/components/SortableList');
    const mids = [50, 150, 250, 350]; // row midpoints
    expect(computeDropIndex(mids, 0, 50)).toBe(0); // not moved
    expect(computeDropIndex(mids, 0, 260)).toBe(2); // first row dropped past the 3rd
    expect(computeDropIndex(mids, 3, 40)).toBe(0); // last row dragged to the top
    expect(computeDropIndex(mids, 1, 999)).toBe(3);
  });

  it('keeps a dragged shopping order and puts new items after it', async () => {
    const { applyItemOrder, moveInOrder } = await import('../src/lib/shopping-aggregator');
    const item = (id: string) => ({ id, name: id, category: 'other' as const, totalQuantity: 1, unit: 'ชิ้น', bought: false, allocations: [] });
    const order = moveInOrder(['a', 'b', 'c'], 'c', 'a'); // drag c to the top
    expect(order).toEqual(['c', 'a', 'b']);
    expect(applyItemOrder([item('a'), item('new'), item('b'), item('c')], order).map(i => i.id)).toEqual(['c', 'a', 'b', 'new']);
    expect(applyItemOrder([item('x'), item('y')], []).map(i => i.id)).toEqual(['x', 'y']);
    expect(moveInOrder(['a', 'b'], 'zz', 'a')).toEqual(['a', 'b']);
  });

  it('reorders delivery stops and renumbers them', async () => {
    const { reorderOrders } = await import('../src/lib/natural-sort');
    const o = (id: string) => ({ id, stopNumber: 0 }) as unknown as Order;
    const next = reorderOrders([o('a'), o('b'), o('c')], 2, 0);
    expect(next.map(x => [x.id, x.stopNumber])).toEqual([['c', 1], ['a', 2], ['b', 3]]);
  });
});

describe('22. Daily profit counts only that day\'s orders', () => {
  const mk = (id: string, created: Date, total: number, cost: number) =>
    ({
      id, stopNumber: 1, houseNumber: '1', soi: '', customerName: id, phone: '', notes: '', deliveredAt: null,
      totalAmount: total, paymentStatus: 'COD', collectedAmount: 0, paymentMethod: null, deliveryStatus: 'PENDING',
      createdAt: created.toISOString(), updatedAt: '',
      items: [{ id: id + 'i', name: 'ของทดสอบ' + id, quantity: 1, unit: 'ชิ้น', price: total, costPrice: cost }]
    }) as Order;

  it('splits orders by their creation day and keeps past travel cost', async () => {
    const h = await import('../src/lib/historical-profit');
    h.clearProfitHistory();
    const today = '2026-11-15';
    const yesterdayOrder = mk('y', new Date(2026, 10, 14, 18, 0), 200, 120);
    const todayOrder = mk('t', new Date(2026, 10, 15, 6, 0), 300, 180);

    // yesterday was recorded on its own day with ฿40 of travel
    h.saveDailyProfitSnapshot('2026-11-14', {
      totalRevenue: 200, totalProduceCost: 120, grossProfit: 80, grossProduceProfit: 80, grossMarginPercent: 40,
      totalFuelCost: 30, totalOtherExpense: 10, totalTransportExpense: 40, totalExpenses: 160, netProfit: 40,
      profitMarginPercent: 20, netMarginPercent: 20, totalDeliveredOrders: 0, totalOrders: 1, orderCount: 1,
      itemsBreakdown: [], fuelResult: { litersUsed: 0, fuelCost: 30, otherExpenses: 10, totalExpense: 40, costPerKm: 0 }
    });

    expect(h.ordersOnDate([yesterdayOrder, todayOrder], today, today).map(o => o.id)).toEqual(['t']);

    h.syncSnapshotsFromOrders(
      [yesterdayOrder, todayOrder],
      { distanceKm: 14, consumptionKmPerLiter: 14, fuelPricePerLiter: 50, otherExpenses: 0 },
      [],
      today
    );
    const t = h.getProfitRecordByDate(today)!;
    expect([t.orderCount, t.totalRevenue, t.totalProduceCost, t.totalFuelCost, t.netProfit]).toEqual([1, 300, 180, 50, 70]);
    const y = h.getProfitRecordByDate('2026-11-14')!;
    expect([y.orderCount, y.totalRevenue, y.totalFuelCost, y.netProfit]).toEqual([1, 200, 30, 40]);

    // no orders today any more → today's record goes away (fuel alone isn't a real loss)
    h.syncSnapshotsFromOrders([yesterdayOrder], { distanceKm: 14, consumptionKmPerLiter: 14, fuelPricePerLiter: 50, otherExpenses: 0 }, [], today);
    expect(h.getProfitRecordByDate(today)).toBeNull();
    h.clearProfitHistory();
  });
});

describe('23. PromptPay QR payload', () => {
  it('uses CRC-16/CCITT-FALSE and builds a valid EMVCo payload with the amount', async () => {
    const { crc16, buildPromptPayPayload, classifyPromptPayId, maskPromptPayId } = await import('../src/lib/promptpay');
    expect(crc16('123456789')).toBe('29B1'); // standard check value

    const p = buildPromptPayPayload('081-234-5678', 320);
    expect(p.startsWith('000201010212')).toBe(true); // one-time QR with amount
    expect(p).toContain('29370016A000000677010111011300668123456785802TH5303764');
    expect(p).toContain('5406320.00');
    expect(p.slice(-8, -4)).toBe('6304');
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)));

    const id = buildPromptPayPayload('1-2345-67890-12-3');
    expect(id).toContain('0213123456789012'); // national ID under sub-tag 02
    expect(id.startsWith('000201010211')).toBe(true); // no amount → reusable QR

    expect(classifyPromptPayId('12345')).toBeNull();
    expect(() => buildPromptPayPayload('abc', 10)).toThrow();
    expect(maskPromptPayId('0812345678')).toBe('081-xxx-5678');
  });
});

describe('24. Voice orders, house-number → location, unit memory', () => {
  it('turns dictated speech into separate orders with items, units and location', async () => {
    const { normalizeSpokenOrder, parseBulkOrderText } = await import('../src/lib/line-parser');
    const drafts = parseBulkOrderText(
      normalizeSpokenOrder('บ้าน 51 ทับ 3 คุณวิภา สั่ง หมูบด 1 กิโล ผักบุ้ง 2 กำ คนต่อไป บ้าน 57 ทับ 10 พี่นก สั่ง ไข่ไก่ 1 แผง ยอด 180 บาท โอนแล้ว')
    );
    expect(drafts.length).toBe(2);
    expect([drafts[0].houseNumber, drafts[0].customerName, drafts[0].locationId, drafts[0].building]).toEqual(['51/3', 'คุณวิภา', 'ivy-river', 'ตึก A']);
    expect(drafts[0].items.map(i => `${i.name} ${i.quantity} ${i.unit}`)).toEqual(['หมูบด 1 กก.', 'ผักบุ้ง 2 กำ']);
    expect([drafts[1].customerName, drafts[1].totalAmount, drafts[1].paymentStatus, drafts[1].building]).toEqual(['พี่นก', 180, 'PAID', 'ตึก D']);
  });

  it('picks the location from the house-number prefix (longest prefix wins)', async () => {
    const { detectLocationFromHouseNumber } = await import('../src/lib/locations');
    expect(detectLocationFromHouseNumber('57/12')).toMatchObject({ locationId: 'ivy-river', building: 'ตึก D' });
    expect(detectLocationFromHouseNumber('79/5')).toMatchObject({ locationId: 'the-plant', building: 'ทาวน์โฮม' });
    expect(detectLocationFromHouseNumber('65/14612').locationId).toBe('cher-suksawat');
    expect(detectLocationFromHouseNumber('800/3').locationId).toBe('thanasin');
    expect(detectLocationFromHouseNumber('12/1')).toEqual({});
    expect(detectLocationFromHouseNumber('')).toEqual({});
  });
});

describe('25. Merge order photos from the same customer', () => {
  it('groups by customer name (ignoring คุณ/พี่) or house number and adds up items and totals', async () => {
    const { mergeParsedOrders } = await import('../src/lib/merge-orders');
    const merged = mergeParsedOrders([
      { customerName: 'คุณวิภา', houseNumber: '51/3', totalAmount: 200, paymentStatus: 'PAID', items: [{ name: 'หมูบด', quantity: '1', unit: 'กก.' }] },
      { customerName: 'พี่นก', houseNumber: '57/10', totalAmount: 120, paymentStatus: 'COD', items: [{ name: 'ไข่ไก่', quantity: '1', unit: 'แผง' }] },
      { customerName: 'วิภา', houseNumber: '', totalAmount: 100, paymentStatus: 'COD', notes: 'วางหน้าบ้าน', items: [{ name: 'หมูบด', quantity: '0.5', unit: 'กก.' }, { name: 'คะน้า', quantity: '2', unit: 'กำ' }] },
      { customerName: '', houseNumber: '57/10', totalAmount: 30, items: [{ name: 'ผักชี', quantity: '1', unit: 'กำ' }] }
    ]);
    expect(merged.length).toBe(2); // วิภา ×2 by name; the unnamed '57/10' photo joins พี่นก by house number
    expect(merged[1].items!.map(i => i.name)).toEqual(['ไข่ไก่', 'ผักชี']);
    const wipa = merged[0];
    expect([wipa.customerName, wipa.houseNumber, wipa.totalAmount, wipa.paymentStatus, wipa.notes]).toEqual(['คุณวิภา', '51/3', 300, 'COD', 'วางหน้าบ้าน']);
    expect(wipa.items!.map(i => `${i.name} ${i.quantity} ${i.unit}`)).toEqual(['หมูบด 1.5 กก.', 'คะน้า 2 กำ']);
    expect(mergeParsedOrders([{ houseNumber: '81/2' }, { houseNumber: '81/2' }]).length).toBe(1);
    expect(mergeParsedOrders([{}, {}]).length).toBe(2); // nothing to match on → keep apart
  });
});

describe('26. Price book: shops, aliases, fillings, place prices, unit conversion, bargains', () => {
  const order = (id: string, items: Partial<import('../src/types/order').OrderItem>[], locationId?: string): Order =>
    ({
      id, stopNumber: 1, houseNumber: id, soi: '', locationId, customerName: id, phone: '', totalAmount: 0,
      paymentStatus: 'COD', collectedAmount: 0, paymentMethod: null, deliveryStatus: 'PENDING', deliveredAt: null,
      notes: '', createdAt: '', updatedAt: '',
      items: items.map((it, i) => ({ id: `${id}_${i}`, name: '', quantity: 1, unit: '', ...it }))
    }) as Order;

  it('resolves aliases/fillings, location price, shop switch, conversions; shopping and profit follow', async () => {
    const pb = await import('../src/lib/price-book');
    const { aggregateShoppingList, shoppingIdFor } = await import('../src/lib/shopping-aggregator');
    const { bargainSavings, calculateDailyProfit } = await import('../src/lib/profit-aggregator');
    pb.clearPriceBook();
    const khao = pb.savePriceBookEntry({ itemName: 'ข้าวเหนียวดำ', shopName: 'ป้าศรี', costPrice: 25, sellingPrice: 40, unit: 'ห่อ', category: 'other' });
    pb.savePriceBookEntry({ itemName: 'ข้าวเหนียวดำ', shopName: 'ร้านแม่มา', costPrice: 22, sellingPrice: 40, unit: 'ห่อ', category: 'other' });
    const moo = pb.savePriceBookEntry({ itemName: 'หมูบด', shopName: 'เจ๊พร', costPrice: 120, sellingPrice: 180, unit: 'กก.', category: 'meat' });
    pb.patchPriceBookEntry(khao.id, { variants: ['ไส้กุ้ง', 'ไส้หมู'], locationPrices: { 'the-plant': 45 }, unitConversions: { แพ็ค: 6 } });
    pb.patchPriceBookEntry(moo.id, { unitConversions: { ขีด: 0.1 } });

    // two shops remembered; picking one sets the cost
    expect(pb.findEntry('ข้าวเหนียวดำ')!.shops!.map(s => s.name)).toEqual(['ป้าศรี', 'ร้านแม่มา']);
    expect(pb.selectShop('ข้าวเหนียวดำ', 'ป้าศรี')).toMatchObject({ shopName: 'ป้าศรี', costPrice: 25 });

    // "did you mean" → alias remembered
    expect(pb.suggestCanonical('ข้าวเหนียวดำกุ้ง')).toBe('ข้าวเหนียวดำ');
    expect(pb.suggestCanonical('ผักบุ้ง')).toBeNull();
    pb.addAlias('ข้าวเหนียวดำ', 'ขนมข้าวเหนียว');
    expect(pb.canonicalName('ขนมข้าวเหนียว · ไส้กุ้ง')).toBe('ข้าวเหนียวดำ · ไส้กุ้ง');

    // filling keeps the price; some places sell higher
    expect(pb.lookupExactProduct('ข้าวเหนียวดำ · ไส้หมู')).toMatchObject({ unit: 'ห่อ', sellingPrice: 40, variants: ['ไส้กุ้ง', 'ไส้หมู'] });
    expect(pb.lookupExactProduct('ข้าวเหนียวดำ', 'the-plant')!.sellingPrice).toBe(45);
    expect(pb.lookupExactProduct('ข้าวเหนียวดำ', 'ivy-river')!.sellingPrice).toBe(40);

    // shopping list: alias + other unit are added together; fillings stay separate lines
    const orders = [
      order('a', [{ name: 'หมูบด', quantity: 1, unit: 'กก.' }, { name: 'ข้าวเหนียวดำ · ไส้กุ้ง', quantity: 2, unit: 'ห่อ' }]),
      order('b', [{ name: 'หมูบด', quantity: 5, unit: 'ขีด' }, { name: 'ขนมข้าวเหนียว · ไส้กุ้ง', quantity: 1, unit: 'แพ็ค' }])
    ];
    const list = aggregateShoppingList(orders, [], [shoppingIdFor('หมูบด', 'ขีด')]);
    expect(list.map(i => `${i.name} ${i.totalQuantity} ${i.unit} ${i.bought}`)).toEqual([
      'หมูบด 1.5 กก. true',
      'ข้าวเหนียวดำ · ไส้กุ้ง 8 ห่อ false'
    ]);

    // bargain: asked 120, paid 110 for 1 kg → saved 10, and profit uses the paid cost
    orders[0].items[0] = { ...orders[0].items[0], costPrice: 110, listCost: 120 };
    expect(bargainSavings(orders)).toBe(10);
    orders[1].items[0] = { ...orders[1].items[0], costPrice: 110, listCost: 120 };
    expect(bargainSavings(orders)).toBe(15); // + 5 ขีด = 0.5 กก. × ฿10
    const fuel = { pricePerLiter: 0, kmPerLiter: 1, distanceKm: 0, otherExpenses: 0 } as unknown as import('../src/lib/fuel-calc').FuelConfig;
    const moo1 = calculateDailyProfit([orders[0]], fuel).itemsBreakdown.find(i => i.name === 'หมูบด')!;
    expect(moo1.costPrice).toBe(110);
    const mooB = calculateDailyProfit([orders[1]], fuel).itemsBreakdown.find(i => i.name === 'หมูบด')!;
    expect([mooB.quantity, mooB.unit, mooB.totalCost]).toEqual([0.5, 'กก.', 55]); // 5 ขีด at the bargained ฿110/กก.
    pb.clearPriceBook();
  });
});
