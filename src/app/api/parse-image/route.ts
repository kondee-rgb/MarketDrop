import { NextRequest, NextResponse } from 'next/server';

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

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

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

    // ตัดส่วน prefix data:image/...;base64, ออกหากมี
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const promptText = `
คุณคือผู้ช่วยจัดการร้านส่งของสดตามบ้าน (MarketDrop)
วิเคราะห์ภาพที่ได้รับ (อาจเป็นภาพแชท LINE, สกรีนช็อตข้อความสั่งซื้อ, โพยตลาด, หรือบิลกระดาษจดด้วยมือภาษาไทย)
ดึงข้อมูลและตอบกลับเป็น JSON เท่านั้นตามโครงสร้างนี้:

{
  "houseNumber": "บ้านเลขที่ เช่น 45/10 หรือ 12/1 (ถ้าไม่มีให้ใส่ว่าง)",
  "soi": "ซอย หรือ หมู่บ้าน หรือ โซน (ถ้าไม่มีให้ใส่ว่าง)",
  "customerName": "ชื่อลูกค้า เช่น คุณวิภา หรือ พี่ก้อย (ถ้าไม่มีให้ใส่ว่าง)",
  "phone": "เบอร์โทรศัพท์ เช่น 081-234-5678 (ถ้าไม่มีให้ใส่ว่าง)",
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

หากในรูปเป็นรายการของสดที่ต้องซื้อในตลาด (Shopping List) ให้สกัดรายการในอาร์เรย์ items ออกมาให้ครบถ้วนที่สุด
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        response_mime_type: 'application/json'
      }
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const resData = await response.json();
    const candidate = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidate) {
      throw new Error('ไม่พบคำตอบจาก Gemini');
    }

    const parsedJson = JSON.parse(candidate);

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
