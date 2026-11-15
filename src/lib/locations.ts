/**
 * ไดเรกทอรีและโครงสร้างสถานที่จริง (Real Locations Directory)
 * สำหรับเลือกล่วงหน้า ป้องกันการพิมพ์ผิด และกรอก Prefix บ้านเลขที่/ตึกอัตโนมัติ
 */

export type LocationZoneId = 'suksawat' | 'ramintra' | 'other';
export type LocationType = 'condo' | 'housing_estate' | 'custom';

export interface LocationSubOption {
  id: string; // e.g. 'A', 'D', 'C', 'detached', 'townhome', 'cher-146', 'standard-800'
  name: string; // e.g. 'ตึก A', 'ตึก D', 'บ้านเดี่ยว', 'ทาวน์โฮม'
  prefix?: string; // e.g. '51/', '57/', '53/', '65/146', '800/', '81/', '79/'
  label: string; // e.g. 'ตึก A (เลขที่ 51/...)', 'บ้านเดี่ยว (81/...)'
  description?: string;
}

export interface LocationConfig {
  id: string;
  name: string;
  shortName: string;
  englishName?: string;
  zone: LocationZoneId;
  zoneLabel: string;
  type: LocationType;
  defaultPrefix: string;
  subOptionLabel?: string; // 'เลือกตึก', 'แบบบ้าน', 'รูปแบบบ้านเลขที่'
  subOptions?: LocationSubOption[];
  sois?: string[];
  allowNewHouseNumbers?: boolean;
  notesPrompt?: string;
}

export const LOCATION_ZONES: { id: LocationZoneId; name: string }[] = [
  { id: 'suksawat', name: 'โซนสุขสวัสดิ์ / ริมน้ำ' },
  { id: 'ramintra', name: 'โซนรามอินทรา' },
  { id: 'other', name: 'กำหนดเอง / อื่นๆ' }
];

export const REAL_LOCATIONS: LocationConfig[] = [
  // 1. โซนสุขสวัสดิ์ / ริมน้ำ
  {
    id: 'ivy-river',
    name: 'ไอวี่ริเวอร์ (Ivy River)',
    shortName: 'ไอวี่ริเวอร์',
    englishName: 'Ivy River',
    zone: 'suksawat',
    zoneLabel: 'สุขสวัสดิ์ / ริมน้ำ',
    type: 'condo',
    defaultPrefix: '51/',
    subOptionLabel: 'เลือกตึก',
    subOptions: [
      { id: 'A', name: 'ตึก A', prefix: '51/', label: 'ตึก A (เลขที่ 51/...)' },
      { id: 'D', name: 'ตึก D', prefix: '57/', label: 'ตึก D (เลขที่ 57/...)' },
      { id: 'C', name: 'ตึก C', prefix: '53/', label: 'ตึก C (เลขที่ 53/...)' }
    ],
    notesPrompt: 'เช่น ชั้น 12 ห้อง 51/123 หรือฝากนิติด้านล่าง'
  },
  {
    id: 'cher-suksawat',
    name: 'หมู่บ้านเฌอ สุขสวัสดิ์',
    shortName: 'เฌอ สุขสวัสดิ์',
    englishName: 'Cher Suksawat',
    zone: 'suksawat',
    zoneLabel: 'สุขสวัสดิ์ / ริมน้ำ',
    type: 'housing_estate',
    defaultPrefix: '65/146',
    subOptionLabel: 'รูปแบบบ้านเลขที่',
    subOptions: [
      { id: 'cher-146', name: 'ขึ้นต้นด้วย 65/146', prefix: '65/146', label: 'บ้านเลขที่ 65/146...' },
      { id: 'cher-65', name: 'ขึ้นต้นด้วย 65/', prefix: '65/', label: 'บ้านเลขที่ 65/...' }
    ],
    notesPrompt: 'เช่น ซอย 2 แขวนหน้ารั้ว'
  },

  // 2. โซนรามอินทรา
  {
    id: 'thanasin',
    name: 'หมู่บ้านธนศิลป์ (รามอินทรา)',
    shortName: 'หมู่บ้านธนศิลป์',
    englishName: 'Thanasin',
    zone: 'ramintra',
    zoneLabel: 'รามอินทรา',
    type: 'housing_estate',
    defaultPrefix: '800/',
    subOptionLabel: 'รูปแบบบ้านเลขที่',
    allowNewHouseNumbers: true,
    subOptions: [
      { id: 'standard-800', name: 'เลขที่เดิม 800/...', prefix: '800/', label: 'บ้านเลขที่ 800/...' },
      { id: 'new-house-num', name: 'บ้านเลขที่ใหม่ (กำหนดเอง)', prefix: '', label: 'บ้านเลขที่ใหม่ (กำหนดเอง)' }
    ],
    sois: [
      'ซอย 1/1', 'ซอย 1/2', 'ซอย 1',
      'ซอย 2/1', 'ซอย 2/2', 'ซอย 2',
      'ซอย 3/1', 'ซอย 3/2', 'ซอย 3',
      'ซอย 4/1', 'ซอย 4/2', 'ซอย 4'
    ],
    notesPrompt: 'ระบุซอย 1/1 ถึง 4/... หรือตำแหน่งจุดรับ'
  },
  {
    id: 'the-plant',
    name: 'หมู่บ้านเดอะแพลนท์ (The Plant)',
    shortName: 'เดอะแพลนท์',
    englishName: 'The Plant',
    zone: 'ramintra',
    zoneLabel: 'รามอินทรา',
    type: 'housing_estate',
    defaultPrefix: '81/',
    subOptionLabel: 'แบบบ้าน',
    subOptions: [
      { id: 'single', name: 'บ้านเดี่ยว', prefix: '81/', label: 'บ้านเดี่ยว (ขึ้นต้น 81/...)' },
      { id: 'townhome', name: 'ทาวน์โฮม', prefix: '79/', label: 'ทาวน์โฮม (ขึ้นต้น 79/...)' }
    ],
    notesPrompt: 'เช่น บ้านเดี่ยว ซอย 3 แขวนประตูรั้ว'
  },
  {
    id: 'plum-condo',
    name: 'คอนโดพลัม (Plum Condo)',
    shortName: 'คอนโดพลัม',
    englishName: 'Plum Condo',
    zone: 'ramintra',
    zoneLabel: 'รามอินทรา',
    type: 'condo',
    defaultPrefix: '',
    subOptionLabel: 'เลือกตึก',
    subOptions: [
      { id: 'A', name: 'ตึก A', prefix: '', label: 'ตึก A' },
      { id: 'B', name: 'ตึก B', prefix: '', label: 'ตึก B' },
      { id: 'C', name: 'ตึก C', prefix: '', label: 'ตึก C' }
    ],
    notesPrompt: 'เช่น ตึก B ห้อง 124 ชั้น 5 ฝากล็อบบี้'
  },

  // 3. กำหนดเอง / อื่นๆ
  {
    id: 'custom',
    name: 'กำหนดเอง / อื่นๆ',
    shortName: 'กำหนดเอง',
    zone: 'other',
    zoneLabel: 'กำหนดเอง',
    type: 'custom',
    defaultPrefix: ''
  }
];

/**
 * ดึงรายการสถานที่ทั้งหมด
 */
export function getAllLocations(): LocationConfig[] {
  return REAL_LOCATIONS;
}

/**
 * ดึงข้อมูลสถานที่ตาม ID
 */
export function getLocationById(id?: string): LocationConfig | undefined {
  if (!id) return undefined;
  return REAL_LOCATIONS.find(loc => loc.id === id);
}

/**
 * ดึงรายการสถานที่ตามโซน
 */
export function getLocationsByZone(zone: LocationZoneId): LocationConfig[] {
  return REAL_LOCATIONS.filter(loc => loc.zone === zone);
}

/**
 * คำนวณ Prefix บ้านเลขที่อัตโนมัติจาก Location และตัวเลือกย่อย (ตึก / แบบบ้าน)
 */
export function getPrefixForLocation(locationId?: string, subOptionIdOrName?: string): string {
  if (!locationId) return '';
  const loc = getLocationById(locationId);
  if (!loc) return '';

  if (loc.id === 'ivy-river') {
    if (!subOptionIdOrName) return '51/';
    const match = loc.subOptions?.find(
      opt => opt.id.toLowerCase() === subOptionIdOrName.toLowerCase() ||
             opt.name.toLowerCase() === subOptionIdOrName.toLowerCase() ||
             subOptionIdOrName.toUpperCase().includes(opt.id)
    );
    return match?.prefix || '51/';
  }

  if (loc.id === 'the-plant') {
    if (!subOptionIdOrName) return '81/';
    const lower = subOptionIdOrName.toLowerCase();
    if (lower === 'townhome' || lower.includes('ทาวน์') || lower.includes('79')) {
      return '79/';
    }
    return '81/';
  }

  if (loc.id === 'cher-suksawat') {
    if (subOptionIdOrName === 'cher-65' || subOptionIdOrName === '65/') {
      return '65/';
    }
    return loc.defaultPrefix || '65/146';
  }

  if (loc.id === 'thanasin') {
    if (subOptionIdOrName === 'new-house-num' || subOptionIdOrName === 'custom') {
      return '';
    }
    return loc.defaultPrefix || '800/';
  }

  if (loc.id === 'plum-condo') {
    return '';
  }

  return loc.defaultPrefix || '';
}

/**
 * จัดรูปแบบที่อยู่แบบเต็ม (Full Address) สำหรับแสดงผลในบัตรออเดอร์ คนขับ และชีต
 */
export interface FormatAddressParams {
  locationId?: string;
  building?: string;
  soi?: string;
  houseNumber?: string;
  customLocationName?: string;
}

export function formatFullAddress(params: FormatAddressParams): string {
  const { locationId, building, soi, houseNumber, customLocationName } = params;
  const loc = getLocationById(locationId);

  const parts: string[] = [];

  if (loc && loc.id !== 'custom') {
    parts.push(loc.shortName);

    if (building) {
      parts.push(building);
    }

    if (houseNumber) {
      parts.push(houseNumber);
    }

    if (soi && soi !== loc.shortName) {
      parts.push(soi);
    }
  } else {
    if (customLocationName) {
      parts.push(customLocationName);
    }
    if (building) {
      parts.push(building);
    }
    if (houseNumber) {
      parts.push(houseNumber);
    }
    if (soi) {
      parts.push(soi);
    }
  }

  return parts.filter(Boolean).join(' ').trim();
}

/**
 * ตรวจจับสถานที่จริงจากข้อความ (LINE Text / OCR)
 * คืนค่า locationId, building, soi, houseNumber โดยไม่สร้างข้อมูลเท็จ
 */
export function detectLocationFromText(text: string): {
  locationId?: string;
  building?: string;
  subType?: string;
  soi?: string;
  houseNumber?: string;
} {
  const lower = text.toLowerCase();

  // 1. ตรวจจับ Ivy River
  if (lower.includes('ไอวี่') || lower.includes('ivy')) {
    let building = '';
    let prefix = '51/';
    if (/ตึก\s*d|ตึก\s*ดี|อาคาร\s*d|\b57\//i.test(text)) {
      building = 'ตึก D';
      prefix = '57/';
    } else if (/ตึก\s*c|ตึก\s*ซี|อาคาร\s*c|\b53\//i.test(text)) {
      building = 'ตึก C';
      prefix = '53/';
    } else if (/ตึก\s*a|ตึก\s*เอ|อาคาร\s*a|\b51\//i.test(text)) {
      building = 'ตึก A';
      prefix = '51/';
    }

    // สกัดเลขที่ถ้ามี
    const houseMatch = text.match(/(?:51|57|53)\/[0-9]+/);
    return {
      locationId: 'ivy-river',
      building,
      houseNumber: houseMatch ? houseMatch[0] : (building ? prefix : '')
    };
  }

  // 2. ตรวจจับ Cher Suksawat
  if (lower.includes('เฌอ') || lower.includes('cher')) {
    const houseMatch = text.match(/65\/(?:146)?[0-9]+/);
    return {
      locationId: 'cher-suksawat',
      houseNumber: houseMatch ? houseMatch[0] : '65/146'
    };
  }

  // 3. ตรวจจับ Thanasin
  if (lower.includes('ธนศิลป์') || lower.includes('thanasin')) {
    // สกัดซอย 1/1 ถึง 4/...
    const soiMatch = text.match(/ซอย\s*[1-4](?:\/[1-9])?/i);
    const houseMatch = text.match(/800\/[0-9]+/);
    return {
      locationId: 'thanasin',
      soi: soiMatch ? soiMatch[0].trim() : undefined,
      houseNumber: houseMatch ? houseMatch[0] : '800/'
    };
  }

  // 4. ตรวจจับ The Plant
  if (lower.includes('เดอะแพลนท์') || lower.includes('the plant') || lower.includes('แพลนท์')) {
    const isTownhome = lower.includes('ทาวน์') || lower.includes('79/');
    const isSingle = lower.includes('บ้านเดี่ยว') || lower.includes('81/');
    const building = isTownhome ? 'ทาวน์โฮม' : (isSingle ? 'บ้านเดี่ยว' : '');
    const houseMatch = text.match(/(?:81|79)\/[0-9]+/);
    return {
      locationId: 'the-plant',
      building,
      subType: isTownhome ? 'townhome' : 'single',
      houseNumber: houseMatch ? houseMatch[0] : (isTownhome ? '79/' : '81/')
    };
  }

  // 5. ตรวจจับ Plum Condo
  if (lower.includes('พลัม') || lower.includes('plum')) {
    let building = '';
    if (/ตึก\s*a|อาคาร\s*a/i.test(text)) building = 'ตึก A';
    else if (/ตึก\s*b|อาคาร\s*b/i.test(text)) building = 'ตึก B';
    else if (/ตึก\s*c|อาคาร\s*c/i.test(text)) building = 'ตึก C';

    return {
      locationId: 'plum-condo',
      building
    };
  }

  // 6. No project name in the text: fall back to the house-number prefix (e.g. "57/12" → Ivy River ตึก D)
  const houseOnly = text.match(/(?:^|[^\d/])(\d{2,4}\/\d+)/);
  if (houseOnly) {
    const byPrefix = detectLocationFromHouseNumber(houseOnly[1]);
    if (byPrefix.locationId) return { ...byPrefix, houseNumber: houseOnly[1] };
  }

  return {};
}

/**
 * เดาสถานที่จากเลขบ้าน: เลขขึ้นต้นตรงกับ prefix ของสถานที่ไหน เลือกที่นั่น (prefix ยาวสุดชนะ เช่น 65/146 ก่อน 65/)
 */
export function detectLocationFromHouseNumber(houseNumber: string): { locationId?: string; building?: string; subType?: string } {
  const house = (houseNumber || '').trim();
  if (!/^\d+\//.test(house)) return {};
  let best: { locationId: string; building?: string; subType?: string; len: number } | null = null;
  for (const loc of REAL_LOCATIONS) {
    const options = loc.subOptions?.length ? loc.subOptions : [{ id: '', name: '', prefix: loc.defaultPrefix }];
    for (const opt of options) {
      const prefix = opt.prefix || '';
      if (!prefix || !house.startsWith(prefix)) continue;
      if (!best || prefix.length > best.len) {
        const isBuilding = loc.id === 'ivy-river' || loc.id === 'the-plant';
        best = { locationId: loc.id, building: isBuilding ? opt.name : undefined, subType: opt.id || undefined, len: prefix.length };
      }
    }
  }
  if (!best) return {};
  return { locationId: best.locationId, building: best.building, subType: best.subType };
}
