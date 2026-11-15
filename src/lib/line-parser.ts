import { OrderItem, ParsedOrderDraft, PaymentStatus } from '@/types/order';
import { detectLocationFromText } from './locations';

/**
 * หน่วยสินค้าที่พบบ่อยในตลาดสด / สินค้าเกษตร
 */
const THAI_UNITS = [
  'กก\\.', 'กิโลกรัม', 'กิโล', 'โล',
  'กรัม', 'ขีด',
  'กำ', 'แผง', 'ถุง', 'ขวด', 'แพ็ค', 'แพค', 'ชิ้น', 'ฟอง',
  'มัด', 'ลูก', 'หัว', 'กล่อง', 'กระป๋อง', 'ถาด', 'ตัว',
  'หวี', 'พวง', 'ต้น', 'จาน', 'ก้อน'
];

const UNIT_REGEX_PART = THAI_UNITS.join('|');

/**
 * แยกข้อความออเดอร์ 1 ชุด ออกเป็นฟิลด์ต่างๆ
 * STRICT RULE: ห้าม Hallucinate หรือเดาบ้านเลขที่, ตึก, หรือซอย หากไม่มีระบุในข้อความเด็ดขาด
 */
export function parseSingleOrderText(text: string): ParsedOrderDraft {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let houseNumber = '';
  let soi = '';
  let building = '';
  let locationId: string | undefined = undefined;
  let customerName = '';
  let phone = '';
  let totalAmount = 0;
  let paymentStatus: PaymentStatus = 'COD'; // ค่าเริ่มต้น
  let notes = '';
  const items: OrderItem[] = [];

  // ตรวจจับสถานที่จริงจากข้อความก่อน (เช่น ไอวี่ริเวอร์, ธนศิลป์, เดอะแพลนท์, คอนโดพลัม)
  const locDetected = detectLocationFromText(text);
  if (locDetected.locationId) {
    locationId = locDetected.locationId;
    if (locDetected.building) {
      building = locDetected.building;
    }
    if (locDetected.soi) {
      soi = locDetected.soi;
    }
    if (locDetected.houseNumber && !houseNumber) {
      houseNumber = locDetected.houseNumber;
    }
  }

  // ตรวจจับ Payment Status ทั่วทั้งข้อความ
  const isPaidPattern = /(?:โอนแล้ว|แนบสลิป|มีสลิป|จ่ายแล้ว|ชำระแล้ว|โอนเงินแล้ว|สแกนแล้ว|โอนเรียบร้อย)/i;
  const isCodPattern = /(?:เก็บปลายทาง|cod|เก็บเงินสด|จ่ายสด|เก็บเงินปลายทาง|เก็บหน้าบ้าน|รอจ่าย|ปลายทาง)/i;

  if (isPaidPattern.test(text)) {
    paymentStatus = 'PAID';
  } else if (isCodPattern.test(text)) {
    paymentStatus = 'COD';
  }

  // 1. ตรวจหาเบอร์โทรศัพท์ (0xx-xxx-xxxx หรือ 0xxxxxxxx)
  const phoneRegex = /(?:โทร(?:\.|ศัพท์)?:?\s*)?(0[689]\d{1}[- ]?\d{3}[- ]?\d{4}|0[689]\d{8})/g;
  const phoneMatch = phoneRegex.exec(text);
  if (phoneMatch) {
    const rawDigits = phoneMatch[1].replace(/[- ]/g, '');
    if (rawDigits.length === 10) {
      phone = `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;
    } else {
      phone = rawDigits;
    }
  }

  // 2. ตรวจจับชื่อลูกค้า (คำนำหน้า คุณ, พี่, ป้า, น้า, ลุง, แม่, ช่าง, น้อง)
  const nameRegex = /(?:^|[^ก-๙])(?:ชื่อ|ลูกค้า|คุณ|พี่|ป้า|น้า|ลุง|แม่|ช่าง|น้อง)\s*([ก-๙a-zA-Z]+(?:\s+[ก-๙a-zA-Z]+)?)/;
  for (const line of lines) {
    const nameMatch = line.match(nameRegex);
    if (nameMatch && !nameMatch[1].match(/^(?:บาท|โล|กก|แผง|โอน|เก็บ|ส่ง|บ้าน|คอนโด)$/)) {
      customerName = nameMatch[0].replace(/^[^ก-๙]/, '').trim(); // drop the '(' / space matched before the prefix
      break;
    }
  }

  // 3. ตรวจจับตึกเพิ่มเติมจากข้อความ (หากยังไม่มี)
  if (!building) {
    const buildingMatch = text.match(/(?:ตึก|อาคาร)\s*([A-Za-z0-9ก-ฮ]+)/i);
    if (buildingMatch) {
      building = `ตึก ${buildingMatch[1].toUpperCase()}`;
    } else if (/(?:บ้านเดี่ยว)/.test(text)) {
      building = 'บ้านเดี่ยว';
    } else if (/(?:ทาวน์โฮม|ทาวน์เฮ้าส์)/.test(text)) {
      building = 'ทาวน์โฮม';
    }
  }

  // 4. วิเคราะห์ทีละบรรทัดเพื่อแยก ที่อยู่, สินค้า, ยอดเงิน, หมายเหตุ
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ข้ามบรรทัดที่เป็นหัวข้อแบ่งออเดอร์
    if (/^(?:ออเดอร์|order|บิล|คิว|ลำดับ|---|\*\*\*|===)/i.test(line)) {
      continue;
    }

    // ตรวจจับบ้านเลขที่และซอยอย่างแม่นยำ (STRICT: ห้ามมั่วจากเศษส่วนหรือจำนวนสินค้า)
    const explicitAddressPrefix = /(?:บ้านเลขที่|บ้าน|เลขที่|ห้อง|ส่งที่|ที่อยู่)\s*([0-9]{1,5}(?:\/[0-9]{1,4})?(?:[A-Za-zก-ฮ])?)\s*(.*)/i;
    const slashAddressPattern = /(?:^|\s)([0-9]{1,5}\/[0-9]{1,4}(?:[A-Za-zก-ฮ])?)\b(?!\s*(?:กก|กิโล|โล|แผง|ถุง|ขวด|ชิ้น|บาท|ลูก|ฟอง|กำ|มัด))/i;

    const explicitMatch = line.match(explicitAddressPrefix);
    const slashMatch = !explicitMatch ? line.match(slashAddressPattern) : null;

    if (!houseNumber && (explicitMatch || slashMatch)) {
      const candidateNumber = explicitMatch ? explicitMatch[1] : (slashMatch ? slashMatch[1] : '');
      const rest = explicitMatch ? explicitMatch[2] : line.replace(slashMatch?.[0] || '', '');

      // ตรวจสอบความปลอดภัย: ไม่ใช่เศษส่วนสินค้า หรือวันที่ เช่น 14/11/2026
      const isDate = /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line);
      const isItemFraction = new RegExp(`[0-9]+\\/[0-9]+\\s*(${UNIT_REGEX_PART})`, 'i').test(line);

      if (!isDate && !isItemFraction && candidateNumber) {
        houseNumber = candidateNumber;

        // แยกซอย ถ้ามีระบุคำว่า ซอย/ซ./มบ./หมู่บ้าน/โครงการ เท่านั้น (STRICT: ห้ามมั่วข้อความอื่นมาใส่ซอย)
        const soiMatch = rest.match(/(?:(?:ซอย|ซ\.|หมู่บ้าน|มบ\.|ม\.|โครงการ)\s*[^,\n()]+)/);
        if (soiMatch && !soi) {
          soi = soiMatch[0].trim();
        }
        continue;
      }
    }

    // หากยังไม่มีซอย ตรวจหาบรรทัดที่ระบุซอยเดี่ยวๆ
    if (!soi) {
      const standaloneSoi = line.match(/(?:^|\s)(ซอย\s*[0-9]+(?:\/[0-9]+)?|ซ\.\s*[0-9]+(?:\/[0-9]+)?)/i);
      if (standaloneSoi) {
        soi = standaloneSoi[1].trim();
      }
    }

    // ตรวจจับยอดเงินรวม
    // เช่น "ยอด 245 บาท", "รวม 380", "ทั้งหมด 520.-", "ยอดรวม 450"
    const totalRegex = /(?:ยอดรวม|ยอด|รวมเงิน|รวม|ราคารวม|ราคา|ทั้งหมด|ค่าของ|บิลนี้)\s*(?:[:=])?\s*฿?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*(?:บาท|.-)?/i;
    const totalMatch = line.match(totalRegex);
    if (totalMatch && !line.includes('กก') && !line.includes('กิโล') && !line.includes('แพ็ค')) {
      const parsedAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        totalAmount = parsedAmount;
        continue;
      }
    }

    // ถ้าบรรทัดมีแค่ตัวเลขตามด้วย "บาท" เช่น "380 บาท"
    const standaloneMoneyMatch = line.match(/^([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*(?:บาท|.-)$/i);
    if (standaloneMoneyMatch && totalAmount === 0) {
      totalAmount = parseFloat(standaloneMoneyMatch[1].replace(/,/g, ''));
      continue;
    }

    // ตรวจจับหมายเหตุการส่ง
    // เช่น "วางไว้ที่รั้วบ้าน", "แขวนไว้หน้าบ้าน", "โทรบอกก่อนถึง"
    if (/(?:วางไว้|แขวน|ฝาก|โทรบอก|ไว้ที่|ประตู|รั้ว|โต๊ะ|หน้าบ้าน|ข้างบ้าน|ติดต่อไปที่|นิติ)/.test(line)) {
      notes = notes ? `${notes} | ${line}` : line;
      continue;
    }

    // ตรวจจับรายการสินค้า
    const cleanItemLine = line.replace(/^[-•*+–—]\s*/, '').trim();

    // ข้ามบรรทัดเบอร์โทรศัพท์ หรือติดต่อ หรือชื่อลูกค้า
    const hasPhonePattern = /(?:โทร(?:\.|ศัพท์|หา|บอก)?:?\s*0|เบอร์โทร|เบอร์ติดต่อ|0[689]\d{1}[- ]?\d{3}[- ]?\d{4}|0[689]\d{8})/.test(line);
    const hasPhoneValue = !!(phone && (line.includes(phone) || line.replace(/[- ]/g, '').includes(phone.replace(/[- ]/g, ''))));
    const isCustomerLine = !!(customerName && line.includes(customerName) && !new RegExp(`(${UNIT_REGEX_PART})`, 'i').test(line));

    if (hasPhonePattern || hasPhoneValue || isCustomerLine) {
      continue;
    }

    // ข้ามบรรทัดสถานะโอนเงินเดี่ยวๆ
    if (isPaidPattern.test(cleanItemLine) || isCodPattern.test(cleanItemLine)) {
      continue;
    }

    // Regex สกัดสินค้า: [ชื่อสินค้า] [จำนวน] [หน่วย] [ราคา(ถ้ามี)]
    const itemWithUnitRegex = new RegExp(
      `^(.*?)(?:\\s+([0-9]+(?:\\.[0-9]+)?|[0-9]+\\/[0-9]+))?\\s+([0-9]+(?:\\.[0-9]+)?|[0-9]+\\/[0-9]+)\\s*(${UNIT_REGEX_PART})(?:\\s+([0-9]+(?:\\.[0-9]+)?)\\s*(?:บาท|.-)?)?$`,
      'i'
    );

    const itemMatch = cleanItemLine.match(itemWithUnitRegex);

    if (itemMatch) {
      const rawName = itemMatch[1].trim();
      const subNum = itemMatch[2] ? itemMatch[2].trim() : '';
      const itemName = subNum ? `${rawName} ${subNum}` : rawName;
      const itemQty = itemMatch[3].trim();
      const itemUnit = itemMatch[4].trim();
      const itemPrice = itemMatch[5] ? parseFloat(itemMatch[5]) : undefined;

      // ตรวจสอบว่าไม่ใช่บรรทัดเบอร์โทรหรือที่อยู่หลุดมา
      if (!itemName.includes('08') && !itemName.includes('09') && !itemName.includes('06') && !/(?:^|[^ก-๙])(?:พี่|คุณ|ป้า|น้า|ลุง)/.test(itemName)) {
        items.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: itemName,
          quantity: itemQty,
          unit: itemUnit,
          price: itemPrice,
          checked: false
        });
        continue;
      }
    }

    // รูปแบบสินค้าไม่มีหน่วยระบุ แต่มีจำนวน เช่น "ไข่ไก่ 2", "โค้ก 1"
    const itemNoUnitMatch = cleanItemLine.match(/^(.+?)\s+([0-9]+)\s*$/);
    if (itemNoUnitMatch && !cleanItemLine.includes('บาท') && !cleanItemLine.includes('ซอย') && !cleanItemLine.includes('ตึก')) {
      const potentialQty = parseInt(itemNoUnitMatch[2], 10);
      const potentialName = itemNoUnitMatch[1].trim();
      if (
        potentialQty <= 100 &&
        !itemNoUnitMatch[2].startsWith('0') &&
        !/(?:^|[^ก-๙])(?:คุณ|พี่|ป้า|น้า|ลุง|แม่|ช่าง|น้อง)/.test(potentialName)
      ) {
        items.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: potentialName,
          quantity: itemNoUnitMatch[2].trim(),
          unit: 'ชิ้น',
          checked: false
        });
        continue;
      }
    }

    // กรณีมีชื่อสินค้าเดี่ยวๆ ไม่มีตัวเลข (เช่น "พริกขี้หนู", "ขิง") ให้ถือเป็น 1 ถุง/ชุด
    if (cleanItemLine.length > 1 && !line.includes('โทร') && !line.includes('บาท') && !line.includes('ตึก') && items.length > 0) {
      items.push({
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: cleanItemLine,
        quantity: 1,
        unit: 'ชุด',
        checked: false
      });
    }
  }

  // หากไม่ได้ระบุยอดเงินรวม แต่แต่ละรายการมีราคา ให้คำนวณรวมอัตโนมัติ
  if (totalAmount === 0 && items.length > 0) {
    const calculatedSum = items.reduce((acc, curr) => acc + (curr.price || 0), 0);
    if (calculatedSum > 0) {
      totalAmount = calculatedSum;
    }
  }

  // หากไม่มีชื่อ ให้ใช้ "ลูกค้าบ้าน " + บ้านเลขที่ (เฉพาะเมื่อมีบ้านเลขที่จริงเท่านั้น ห้ามคิดเลขขึ้นมาเอง)
  if (!customerName) {
    customerName = houseNumber ? `ลูกค้าบ้าน ${houseNumber}` : 'ลูกค้าทั่วไป';
  }

  return {
    houseNumber: houseNumber || '',
    soi: soi || '',
    locationId: locationId || undefined,
    building: building || undefined,
    customerName,
    phone,
    items,
    totalAmount,
    paymentStatus,
    notes,
    rawText: text
  };
}

/**
 * แยกข้อความสั่งซื้อที่อาจมีหลายออเดอร์ติดกัน (Multi-Order Bulk Paste)
 */
export function parseBulkOrderText(text: string): ParsedOrderDraft[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // ตรวจหาตัวแบ่งออเดอร์ เช่น:
  // - "ออเดอร์ 1", "Order #2", "คิวที่ 3"
  // - เส้นแบ่ง "---", "===", "___"
  // - หรือการเว้นวรรค 2 บรรทัดขึ้นไป (\n\s*\n\s*\n)
  const orderSplitRegex = /(?:\n\s*(?:(?:[-=_]{3,})|(?:(?:ออเดอร์|order|คิว|บิล)\s*(?:ที่)?\s*[0-9]+))\s*\n|\n\s*\n\s*\n)/i;

  let chunks = trimmed.split(orderSplitRegex);

  // หากไม่มีตัวแบ่งชัดเจน แต่มีคำว่า "ออเดอร์" หรือ "บ้าน" ซ้ำกันหลายบรรทัด
  if (chunks.length <= 1) {
    const doubleNewlineChunks = trimmed.split(/\n\s*\n/);
    if (doubleNewlineChunks.length > 1) {
      const validChunks = doubleNewlineChunks.filter(c => c.trim().length > 5);
      if (validChunks.length > 1) {
        chunks = validChunks;
      }
    }
  }

  const results: ParsedOrderDraft[] = [];

  for (const chunk of chunks) {
    const cleanChunk = chunk.trim();
    if (cleanChunk.length < 5) continue;

    const parsed = parseSingleOrderText(cleanChunk);
    // เก็บเฉพาะที่มีข้อมูลสาระสำคัญ (มีบ้านเลขที่ หรือมีสินค้า หรือมียอดเงิน)
    if (parsed.houseNumber || parsed.items.length > 0 || parsed.totalAmount > 0) {
      results.push(parsed);
    }
  }

  // กรณี fallback หากไม่สามารถแบ่ง chunk ได้เลย ให้ parse เป็น 1 order
  if (results.length === 0) {
    results.push(parseSingleOrderText(trimmed));
  }

  return results;
}

/**
 * Turn dictated speech into the line-based text the parser expects.
 * Say "คนต่อไป" (or "ต่อไป") between customers and "สั่ง" between the name and the items;
 * "ทับ" becomes "/", "กิโล" becomes "กก.".
 */
export function normalizeSpokenOrder(spoken: string): string {
  return spoken
    .replace(/(\d)\s*ทับ\s*(\d)/g, '$1/$2')
    .replace(/กิโลกรัม|กิโล/g, 'กก.')
    .replace(/\s*(?:คนต่อไป|ออเดอร์ต่อไป|ต่อไป)\s*/g, '\n---\n')
    .replace(/\s+สั่ง\s+/g, '\n')
    // each "<qty> <unit>" ends an item line
    .replace(/(\d+(?:\.\d+)?\s*(?:กก\.|กรัม|ขีด|กำ|แผง|ถุง|ขวด|ชิ้น|ฟอง|ลูก|หัว|มัด|แพ็ค|แพค|กล่อง|ห่อ|ตัว|ไม้|จาน|ชุด|กระป๋อง|ถ้วย))\s+/g, '$1\n')
    // the house number and the customer name start their own lines
    .replace(/\s*(บ้าน(?:เลขที่)?\s*\d+\/\d+)\s+/g, '\n$1\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
