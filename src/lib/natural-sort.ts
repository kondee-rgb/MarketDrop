import { Order, SortDirection, SortMode } from '@/types/order';

interface HouseNumberParts {
  mainNum: number;
  mainSuffix: string;
  subNum: number | null;
  subSuffix: string;
  raw: string;
}

/**
 * แยกส่วนประกอบของบ้านเลขที่ เช่น "45/10 ก" -> mainNum=45, subNum=10, subSuffix="ก"
 */
export function parseHouseNumberParts(houseStr: string): HouseNumberParts {
  const clean = (houseStr || '').trim().replace(/^(?:บ้านเลขที่|เลขที่|บ้าน|ที่อยู่)\s*/, '');
  const parts = clean.split('/');

  const mainPart = parts[0] || '';
  const subPart = parts[1] || '';

  // สกัดตัวเลขและตัวอักษรของส่วนหน้า
  const mainNumMatch = mainPart.match(/^(\d+)(.*)$/);
  const mainNum = mainNumMatch ? parseInt(mainNumMatch[1], 10) : 0;
  const mainSuffix = mainNumMatch ? mainNumMatch[2].trim() : mainPart;

  // สกัดตัวเลขและตัวอักษรของส่วนหลัง (ถ้ามีเครื่องหมายทับ)
  let subNum: number | null = null;
  let subSuffix = '';

  if (parts.length > 1) {
    const subNumMatch = subPart.match(/^(\d+)(.*)$/);
    if (subNumMatch) {
      subNum = parseInt(subNumMatch[1], 10);
      subSuffix = subNumMatch[2].trim();
    } else {
      subSuffix = subPart.trim();
    }
  }

  return {
    mainNum,
    mainSuffix,
    subNum,
    subSuffix,
    raw: houseStr
  };
}

/**
 * ฟังก์ชันเปรียบเทียบบ้านเลขที่แบบ Natural Numeric Sort
 * ผลลัพธ์: 12/1 < 12/2 < 12/10 < 13/1 < 45/2 < 45/10
 */
export function compareHouseNumbers(a: string, b: string): number {
  const parsedA = parseHouseNumberParts(a);
  const parsedB = parseHouseNumberParts(b);

  // 1. เปรียบเทียบเลขหลักหน้าทับ
  if (parsedA.mainNum !== parsedB.mainNum) {
    return parsedA.mainNum - parsedB.mainNum;
  }

  // 2. ถ้าเลขหลักเท่ากัน เปรียบเทียบส่วนต่อท้ายของเลขหลัก (เช่น 12ก กับ 12ข)
  if (parsedA.mainSuffix !== parsedB.mainSuffix) {
    return parsedA.mainSuffix.localeCompare(parsedB.mainSuffix, 'th');
  }

  // 3. เปรียบเทียบกรณีมีทับ กับไม่มีทับ (เช่น 12 มาก่อน 12/1)
  if (parsedA.subNum === null && parsedB.subNum !== null) return -1;
  if (parsedA.subNum !== null && parsedB.subNum === null) return 1;
  if (parsedA.subNum === null && parsedB.subNum === null) return 0;

  // 4. เปรียบเทียบเลขหลังทับแบบตัวเลขจริง (2 มาก่อน 10)
  if (parsedA.subNum !== null && parsedB.subNum !== null) {
    if (parsedA.subNum !== parsedB.subNum) {
      return parsedA.subNum - parsedB.subNum;
    }
  }

  // 5. เปรียบเทียบส่วนต่อท้ายหลังทับ
  return parsedA.subSuffix.localeCompare(parsedB.subSuffix, 'th');
}

/**
 * ฟังก์ชันเปรียบเทียบชื่อซอย/หมู่บ้าน แบบ Natural Sort (เช่น ซอย 2 มาก่อน ซอย 10)
 */
export function compareSoiNames(a: string, b: string): number {
  const cleanA = (a || 'ไม่ระบุซอย').trim();
  const cleanB = (b || 'ไม่ระบุซอย').trim();

  // ดึงตัวเลขในชื่อซอยออกมาเปรียบเทียบ เช่น "ซอย 2" กับ "ซอย 10"
  const numA = cleanA.match(/\d+/);
  const numB = cleanB.match(/\d+/);

  const prefixA = cleanA.replace(/\d+.*$/, '').trim();
  const prefixB = cleanB.replace(/\d+.*$/, '').trim();

  if (prefixA === prefixB && numA && numB) {
    const nA = parseInt(numA[0], 10);
    const nB = parseInt(numB[0], 10);
    if (nA !== nB) return nA - nB;
  }

  return cleanA.localeCompare(cleanB, 'th', { numeric: true });
}

/**
 * จัดเรียงออเดอร์ตามเงื่อนไขที่เลือก และรันเลข Stop Number ใหม่ (1, 2, 3...)
 */
export function sortOrders(
  orders: Order[],
  mode: SortMode,
  direction: SortDirection = 'ASC'
): Order[] {
  if (mode === 'MANUAL') {
    // ในโหมด Manual ให้อัปเดตเฉพาะ stopNumber ตามลำดับปัจจุบัน
    return orders.map((ord, idx) => ({
      ...ord,
      stopNumber: idx + 1
    }));
  }

  const sorted = [...orders].sort((a, b) => {
    let diff = 0;

    if (mode === 'SOI_THEN_HOUSE') {
      // 1. เรียงตามซอยก่อน
      diff = compareSoiNames(a.soi, b.soi);
      // 2. ถ้าซอยเดียวกัน ให้เรียงตามบ้านเลขที่
      if (diff === 0) {
        diff = compareHouseNumbers(a.houseNumber, b.houseNumber);
      }
    } else {
      // โหมด NATURAL_HOUSE: เรียงตามบ้านเลขที่โดยตรง
      diff = compareHouseNumbers(a.houseNumber, b.houseNumber);
      // ถ้าบ้านเลขที่เดียวกัน เรียงตามซอย
      if (diff === 0) {
        diff = compareSoiNames(a.soi, b.soi);
      }
    }

    return direction === 'ASC' ? diff : -diff;
  });

  // รัน stopNumber ใหม่เรียงจาก 1 ถึง N
  return sorted.map((ord, idx) => ({
    ...ord,
    stopNumber: idx + 1
  }));
}

/**
 * ฟังก์ชันย้ายตำแหน่งออเดอร์ (Move Up / Move Down / Reorder) สำหรับ Manual Mode
 */
export function reorderOrders(orders: Order[], fromIndex: number, toIndex: number): Order[] {
  if (fromIndex < 0 || fromIndex >= orders.length || toIndex < 0 || toIndex >= orders.length) {
    return orders;
  }
  const result = [...orders];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);

  return result.map((ord, idx) => ({
    ...ord,
    stopNumber: idx + 1
  }));
}

/**
 * จัดกลุ่มออเดอร์ตามซอย/โซน เพื่อแสดงผลเป็นหมวดหมู่
 */
export function groupOrdersBySoi(orders: Order[]): { soi: string; orders: Order[] }[] {
  const groups: { [key: string]: Order[] } = {};

  for (const order of orders) {
    const soiKey = (order.soi || 'ไม่ระบุซอย/โซน').trim();
    if (!groups[soiKey]) {
      groups[soiKey] = [];
    }
    groups[soiKey].push(order);
  }

  return Object.keys(groups)
    .sort(compareSoiNames)
    .map(soi => ({
      soi,
      orders: groups[soi]
    }));
}
