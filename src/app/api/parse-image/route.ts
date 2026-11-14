import { NextRequest, NextResponse } from 'next/server';
import { geminiImageToJson, getGeminiApiKey } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = 'image/jpeg', targetMode = 'delivery' } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, message: 'กรุณาแนบรูปภาพ' },
        { status: 400 }
      );
    }

    const apiKey = getGeminiApiKey();

    // ถ้าไม่มี API Key ให้ตอบกลับข้อมูลโครงสร้างพื้นฐานเพื่อให้ผู้ใช้คีย์มือต่อ
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        isFallback: true,
        message: 'ไม่ได้ตั้งค่า API Key — ส่งโครงสร้างร่างให้กรอกข้อมูลต่อ',
        data: {
          houseNumber: '',
          soi: '',
          customerName: '',
          phone: '',
          items: [{ name: '', quantity: '1', unit: 'กก.' }],
          totalAmount: 0,
          paymentStatus: 'COD',
          notes: ''
        }
      });
    }

    const promptText = `
คุณคือผู้ช่วยจัดการร้านส่งของสดตามบ้าน (MarketDrop)
วิเคราะห์ภาพที่ได้รับ (อาจเป็นภาพแชท LINE, สกรีนช็อตข้อความสั่งซื้อ, โพยตลาด, หรือบิลกระดาษจดด้วยมือภาษาไทย)
ดึงข้อมูลและตอบกลับเป็น JSON เท่านั้นตามโครงสร้างนี้:

{
  "houseNumber": "บ้านเลขที่ เช่น 45/10 หรือ 12/1 (ถ้าไม่มีให้ใส่ว่าง \"\")",
  "soi": "ซอย หรือ หมู่บ้าน หรือ โซน (ถ้าไม่มีให้ใส่ว่าง \"\")",
  "building": "ตึก หรือ อาคาร เช่น ตึก A หรือ ตึก D (ถ้าไม่มีให้ใส่ว่าง \"\")",
  "customerName": "ชื่อลูกค้า เช่น คุณวิภา หรือ พี่ก้อย (ถ้าไม่มีให้ใส่ว่าง \"\")",
  "phone": "เบอร์โทรศัพท์ เช่น 081-234-5678 (ถ้าไม่มีให้ใส่ว่าง \"\")",
  "totalAmount": 0, // ตัวเลขยอดเงินรวมทั้งบิล (ถ้ามี)
  "paymentStatus": "PAID" หรือ "COD", // PAID หากมีคำว่าโอนแล้ว/แนบสลิป, COD หากเก็บปลายทางหรือเงินสด
  "notes": "หมายเหตุการส่ง เช่น วางไว้หน้าบ้าน, แขวนรั้ว",
  "items": [
    {
      "name": "ชื่อสินค้าสด เช่น หมูบด, ผักบุ้ง, ไข่ไก่",
      "quantity": "จำนวน เช่น 1, 2, 500",
      "unit": "หน่วย เช่น กก., โล, กำ, แผง, ถุง, ขวด, ขีด, กรัม, ชิ้น",
      "price": 0, // ราคาถ้ามีระบุ
      "category": "meat" | "veg" | "egg_dairy" | "spice" | "dry" | "other"
    }
  ]
}

กฎเหล็กสำคัญที่สุด (STRICT RULES):
- ห้ามคิดค้น, แต่งเติม, หรือคาดเดาบ้านเลขที่, ตึก, อาคาร หรือซอยโดยเด็ดขาด หากในภาพไม่ปรากฏชัดเจน ให้ส่งเป็นสตริงว่าง "" เท่านั้น
- ห้ามนำจำนวนสินค้า หรือเศษส่วน เช่น 1/2 กก. หรือเบอร์โทร มาใส่เป็นบ้านเลขที่
- หากในรูปเป็นรายการของสดที่ต้องซื้อในตลาด (Shopping List) ให้สกัดรายการในอาร์เรย์ items ออกมาให้ครบถ้วนที่สุด
`;

    const parsedJson = await geminiImageToJson(promptText, imageBase64, mimeType, apiKey);

    return NextResponse.json({
      success: true,
      data: parsedJson
    });
  } catch (error: unknown) {
    console.error('Parse image error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'ไม่สามารถประมวลผลรูปภาพได้'
    }, { status: 500 });
  }
}
