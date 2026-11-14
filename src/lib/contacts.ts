/**
 * ไดเรกทอรีลูกค้าและร้านค้าประจำ (Frequent Contacts Directory)
 * บันทึกและดึงข้อมูลจาก localStorage ('marketdrop_frequent_contacts_v1')
 * พร้อม memory fallback สำหรับ SSR และ Unit Tests
 * ช่วยให้บันทึกออเดอร์ได้ใน 1 คลิก ไม่ต้องพิมพ์ชื่อ/เบอร์/ที่อยู่ซ้ำ
 */

export type ContactType = 'customer' | 'vendor';

export interface FrequentContact {
  id: string;
  name: string;
  phone: string;
  locationId?: string; // id อ้างอิงจาก locations.ts เช่น 'ivy-river', 'thanasin'
  building?: string; // e.g. 'ตึก A', 'บ้านเดี่ยว'
  soi?: string; // e.g. 'ซอย 1/1'
  houseNumber?: string; // e.g. '51/124', '800/12'
  defaultNotes?: string; // e.g. 'ฝากนิติคอนโด', 'วางโต๊ะหินอ่อน'
  type: ContactType; // 'customer' สำหรับผู้รับส่ง หรือ 'vendor' สำหรับร้านค้าซื้อของสด
  orderCount?: number; // สถิติจำนวนครั้งที่สั่ง
  lastOrderedAt?: string; // วันที่สั่งล่าสุด (ISO string)
  createdAt: string;
  updatedAt: string;
}

const FREQUENT_CONTACTS_KEY = 'marketdrop_frequent_contacts_v1';

// In-memory cache for SSR / Node / Test environments
let memoryContacts: FrequentContact[] = [];

/**
 * ดึงรายการผู้ติดต่อประจำทั้งหมด หรือกรองตามประเภท (customer / vendor)
 */
export function getFrequentContacts(type?: ContactType): FrequentContact[] {
  if (typeof window === 'undefined') {
    if (type) {
      return memoryContacts.filter(c => c.type === type);
    }
    return [...memoryContacts];
  }

  try {
    const raw = localStorage.getItem(FREQUENT_CONTACTS_KEY);
    if (!raw) return [];

    const parsed: FrequentContact[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    if (type) {
      return parsed.filter(c => c.type === type);
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load frequent contacts:', err);
    return [];
  }
}

/**
 * ดึงผู้ติดต่อประจำตาม ID
 */
export function getFrequentContactById(id: string): FrequentContact | undefined {
  const contacts = getFrequentContacts();
  return contacts.find(c => c.id === id);
}

/**
 * ค้นหาผู้ติดต่อจากเบอร์โทร หรือชื่อ
 */
export function findFrequentContact(query: { phone?: string; name?: string }): FrequentContact | undefined {
  const contacts = getFrequentContacts();
  const cleanPhone = query.phone ? query.phone.replace(/[- ]/g, '') : '';
  const cleanName = query.name ? query.name.trim().toLowerCase() : '';

  return contacts.find(c => {
    if (cleanPhone && c.phone) {
      const storedPhone = c.phone.replace(/[- ]/g, '');
      if (storedPhone === cleanPhone) return true;
    }
    if (cleanName && c.name) {
      if (c.name.trim().toLowerCase() === cleanName) return true;
    }
    return false;
  });
}

/**
 * ค้นหาผู้ติดต่อประจำด้วยคำค้นหา (ชื่อ, เบอร์, บ้านเลขที่, โครงการ)
 */
export function searchFrequentContacts(keyword: string, type?: ContactType): FrequentContact[] {
  const contacts = getFrequentContacts(type);
  const q = keyword.trim().toLowerCase();
  if (!q) return contacts;

  return contacts.filter(c => {
    const matchName = c.name?.toLowerCase().includes(q);
    const matchPhone = c.phone?.replace(/[- ]/g, '').includes(q.replace(/[- ]/g, ''));
    const matchHouse = c.houseNumber?.toLowerCase().includes(q);
    const matchSoi = c.soi?.toLowerCase().includes(q);
    const matchNotes = c.defaultNotes?.toLowerCase().includes(q);
    return matchName || matchPhone || matchHouse || matchSoi || matchNotes;
  });
}

/**
 * บันทึกหรืออัปเดตผู้ติดต่อประจำ
 * หากมี id อยู่แล้วจะทำการแก้ไข หากไม่มีจะสร้าง id ใหม่
 */
export function saveFrequentContact(
  contactData: Partial<FrequentContact> & { name: string; type?: ContactType }
): FrequentContact {
  const contacts = getFrequentContacts();
  const now = new Date().toISOString();

  let targetId = contactData.id;

  // หากไม่มี id ลองค้นหาด้วยเบอร์โทรหรือชื่อก่อน เพื่อป้องกันข้อมูลซ้ำซ้อน
  if (!targetId && (contactData.phone || contactData.name)) {
    const existing = findFrequentContact({ phone: contactData.phone, name: contactData.name });
    if (existing) {
      targetId = existing.id;
    }
  }

  let savedContact: FrequentContact;

  if (targetId) {
    const index = contacts.findIndex(c => c.id === targetId);
    if (index >= 0) {
      const existing = contacts[index];
      savedContact = {
        ...existing,
        ...contactData,
        id: targetId,
        type: contactData.type || existing.type || 'customer',
        updatedAt: now
      };
      contacts[index] = savedContact;
    } else {
      savedContact = {
        id: targetId,
        name: contactData.name,
        phone: contactData.phone || '',
        locationId: contactData.locationId,
        building: contactData.building,
        soi: contactData.soi,
        houseNumber: contactData.houseNumber,
        defaultNotes: contactData.defaultNotes,
        type: contactData.type || 'customer',
        orderCount: contactData.orderCount || 1,
        lastOrderedAt: now,
        createdAt: now,
        updatedAt: now
      };
      contacts.push(savedContact);
    }
  } else {
    const newId = `contact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    savedContact = {
      id: newId,
      name: contactData.name,
      phone: contactData.phone || '',
      locationId: contactData.locationId,
      building: contactData.building,
      soi: contactData.soi,
      houseNumber: contactData.houseNumber,
      defaultNotes: contactData.defaultNotes,
      type: contactData.type || 'customer',
      orderCount: 1,
      lastOrderedAt: now,
      createdAt: now,
      updatedAt: now
    };
    contacts.push(savedContact);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FREQUENT_CONTACTS_KEY, JSON.stringify(contacts));
    } catch (err) {
      console.error('Failed to save frequent contact to localStorage:', err);
    }
  } else {
    memoryContacts = contacts;
  }

  return savedContact;
}

/**
 * ลบผู้ติดต่อประจำตาม ID
 */
export function deleteFrequentContact(id: string): void {
  const contacts = getFrequentContacts();
  const updated = contacts.filter(c => c.id !== id);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FREQUENT_CONTACTS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to delete frequent contact from localStorage:', err);
    }
  } else {
    memoryContacts = updated;
  }
}

/**
 * อัปเดตสถิติการสั่ง (เพิ่ม orderCount และตั้ง lastOrderedAt เป็นปัจจุบัน)
 */
export function recordContactUsage(id: string): void {
  const contacts = getFrequentContacts();
  const contact = contacts.find(c => c.id === id);
  if (!contact) return;

  contact.orderCount = (contact.orderCount || 0) + 1;
  contact.lastOrderedAt = new Date().toISOString();
  contact.updatedAt = new Date().toISOString();

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FREQUENT_CONTACTS_KEY, JSON.stringify(contacts));
    } catch (err) {
      console.error('Failed to update contact usage:', err);
    }
  } else {
    memoryContacts = contacts;
  }
}
