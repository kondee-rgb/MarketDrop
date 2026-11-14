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
    expect(row.length).toBe(14); // 14 columns A through N
    expect(SHEETS_COLUMNS.length).toBe(14);
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
