import { OrderItem, ParsedOrderDraft, PaymentStatus } from '@/types/order';

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
 */
export function parseSingleOrderText(text: string): ParsedOrderDraft {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let houseNumber = '';
  let soi = '';
  let customerName = '';
  let phone = '';
  let totalAmount = 0;
  let paymentStatus: PaymentStatus = 'COD'; // ค่าเริ่มต้น
  let notes = '';
  const items: OrderItem[] = [];

  // ตรวจจับ Payment Status ทั่วทั้งข้อความ
  const lowerText = text.toLowerCase();
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
    phone = phoneMatch[1].replace(/[- ]/g, '');
    // ฟอร์แมตเบอร์โทรเป็น 0xx-xxx-xxxx
    if (phone.length === 10) {
      phone = `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
  }

  // 2. ตรวจจับชื่อลูกค้า (คำนำหน้า คุณ, พี่, ป้า, น้า, ลุง, แม่, ช่าง, น้อง)
  const nameRegex = /(?:ชื่อ|ลูกค้า|คุณ|พี่|ป้า|น้า|ลุง|แม่|ช่าง|น้อง)\s*([ก-๙a-zA-Z]+(?:\s+[ก-๙a-zA-Z]+)?)/;
  for (const line of lines) {
    const nameMatch = line.match(nameRegex);
    if (nameMatch && !nameMatch[1].match(/^(?:บาท|โล|กก|แผง|โอน|เก็บ|ส่ง)$/)) {
      customerName = nameMatch[0].trim();
      break;
    }
  }

  // 3. วิเคราะห์ทีละบรรทัดเพื่อแยก ที่อยู่, สินค้า, ยอดเงิน, หมายเหตุ
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ข้ามบรรทัดที่เป็นหัวข้อแบ่งออเดอร์
    if (/^(?:ออเดอร์|order|บิล|คิว|ลำดับ|---|\*\*\*|===)/i.test(line)) {
      continue;
    }

    // ตรวจจับบ้านเลขที่และซอย
    // รูปแบบ เช่น: "บ้าน 45/12 ซอย 3", "บ้านเลขที่ 12/4 มบ.พฤกษา", "99/2 ซอยมิตรภาพ 5", "15/8 ซ.4"
    const houseRegex = /(?:บ้านเลขที่|บ้าน|เลขที่|ที่อยู่|ส่งที่)?\s*([0-9]{1,5}(?:\/[0-9]{1,4})?(?:[A-Za-zก-ฮ])?)\s*(.*)/;
    const houseMatch = line.match(houseRegex);

    if (!houseNumber && houseMatch && houseMatch[1] && (line.includes('/') || /(?:บ้าน|เลขที่|ที่อยู่|ซอย|ซ\.|ม\.)/.test(line))) {
      // ตรวจสอบว่าไม่ใช่บรรทัดราคาสินค้า เช่น "ไข่ 1/2 แผง" หรือวันที่
      if (!/(?:แผง|กก|กิโล|โล|บาท)/.test(line) || /(?:บ้าน|เลขที่|ซอย|ซ\.|ม\.)/.test(line)) {
        houseNumber = houseMatch[1];
        const restOfAddress = houseMatch[2] || '';

        // แยกซอย / หมู่บ้าน จากข้อความที่เหลือ
        const soiMatch = restOfAddress.match(/(?:(?:ซอย|ซ\.|หมู่บ้าน|มบ\.|ม\.|โครงการ|โซน)\s*[^,\n()]+)/);
        if (soiMatch) {
          soi = soiMatch[0].trim();
        } else if (restOfAddress.trim()) {
          // หากไม่มีคำว่าซอย แต่นำหน้าด้วยข้อความอื่นหลังบ้านเลขที่
          const cleanRest = restOfAddress.replace(phone || '', '').replace(customerName || '', '').trim();
          if (cleanRest && !cleanRest.startsWith('-') && !cleanRest.includes('บาท')) {
            soi = cleanRest;
          }
        }
        continue;
      }
    }

    // ตรวจจับยอดเงินรวม
    // เช่น "ยอด 245 บาท", "รวม 380", "150 บาท", "ทั้งหมด 520.-", "ยอดรวม 450"
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
    if (/(?:วางไว้|แขวน|ฝาก|โทรบอก|ไว้ที่|ประตู|รั้ว|โต๊ะ|หน้าบ้าน|ข้างบ้าน|ติดต่อไปที่)/.test(line)) {
      notes = notes ? `${notes} | ${line}` : line;
      continue;
    }

    // ตรวจจับรายการสินค้า
    // รูปแบบสินค้าทั่วไป เช่น:
    // "- หมูบด 1 กก."
    // "ผักบุ้ง 2 กำ"
    // "ไข่ไก่เบอร์ 2 1 แผง"
    // "หมูสามชั้น 2 โล 240"
    // "แตงกวา 500 กรัม"
    // "มะนาว 1 ถุง"
    // "น้ำมันพืช 1 ขวด"
    const cleanItemLine = line.replace(/^[-•*+–—]\s*/, '').trim();

    // ข้ามบรรทัดเบอร์โทรศัพท์ หรือติดต่อ หรือชื่อลูกค้าเดี่ยวๆ
    if (/(?:โทร(?:\.|ศัพท์|หา|บอก)?:?\s*0|เบอร์โทร|เบอร์ติดต่อ|0[689]\d{8})/.test(line) || (phone && line.includes(phone.replace(/-/g, '')))) {
      continue;
    }

    // ข้ามบรรทัดสถานะโอนเงินเดี่ยวๆ
    if (isPaidPattern.test(cleanItemLine) || isCodPattern.test(cleanItemLine)) {
      continue;
    }

    // Regex สกัดสินค้า: [ชื่อสินค้า] [จำนวน] [หน่วย] [ราคา(ถ้ามี)]
    // รองรับกรณีมีตัวเลขในชื่อสินค้า เช่น "ไข่ไก่เบอร์ 2 1 แผง"
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
      if (!itemName.includes('08') && !itemName.includes('09') && !itemName.includes('06') && !/(?:พี่|คุณ|ป้า|น้า|ลุง)/.test(itemName)) {
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
    if (itemNoUnitMatch && !cleanItemLine.includes('บาท') && !cleanItemLine.includes('ซอย')) {
      const potentialQty = parseInt(itemNoUnitMatch[2], 10);
      const potentialName = itemNoUnitMatch[1].trim();
      // ถ้าตัวเลขมากกว่า 100 หรือขึ้นต้นด้วย 0 หรือเป็นชื่อคน มักเป็นเบอร์โทร ไม่ใช่จำนวนสินค้าสด
      if (
        potentialQty <= 100 &&
        !itemNoUnitMatch[2].startsWith('0') &&
        !/(?:คุณ|พี่|ป้า|น้า|ลุง|แม่|ช่าง|น้อง)/.test(potentialName)
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
    if (cleanItemLine.length > 1 && !line.includes('โทร') && !line.includes('บาท') && items.length > 0) {
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

  // หากไม่มีชื่อ ให้ใช้ "ลูกค้าบ้าน " + บ้านเลขที่
  if (!customerName) {
    customerName = houseNumber ? `ลูกค้าบ้าน ${houseNumber}` : 'ลูกค้า (ไม่ระบุชื่อ)';
  }

  return {
    houseNumber: houseNumber || '',
    soi: soi || '',
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
    // ลองแบ่งด้วย 2 บรรทัดว่าง
    const doubleNewlineChunks = trimmed.split(/\n\s*\n/);
    if (doubleNewlineChunks.length > 1) {
      // ตรวจสอบว่าแต่ละ chunk มีลักษณะเป็นออเดอร์ (มีบ้านเลขที่ หรือรายการสินค้า)
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
