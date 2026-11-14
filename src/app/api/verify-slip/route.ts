import { NextRequest, NextResponse } from 'next/server';
import { geminiImageToJson, getGeminiApiKey } from '@/lib/gemini';
import { sanitizeSlipData } from '@/lib/slip-check';

const SLIP_PROMPT = `
คุณคือระบบอ่านสลิปโอนเงินธนาคารไทย / พร้อมเพย์ (PromptPay)
ดูภาพแล้วตอบเป็น JSON เท่านั้น:
{
  "isSlip": true หรือ false, // เป็นสลิปโอนเงินจริงหรือไม่
  "amount": 0, // จำนวนเงินที่โอน (ตัวเลข บาท)
  "transRef": "เลขที่รายการ / รหัสอ้างอิง / Ref",
  "transferredAt": "วันที่และเวลาตามที่เขียนในสลิป",
  "senderName": "ชื่อผู้โอน",
  "receiverName": "ชื่อผู้รับ",
  "bank": "ชื่อธนาคาร/แอปที่ออกสลิป"
}
กฎ: ห้ามเดา อ่านไม่ออกให้ใส่ "" หรือ 0 · ถ้าไม่ใช่สลิปให้ isSlip เป็น false
`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ success: false, message: 'กรุณาแนบรูปสลิป' }, { status: 400 });
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน .env.local — ตรวจสลิปด้วยตาไปก่อน' },
        { status: 503 }
      );
    }

    const raw = await geminiImageToJson(SLIP_PROMPT, imageBase64, String(mimeType), apiKey);
    return NextResponse.json({ success: true, data: sanitizeSlipData(raw) });
  } catch (error: unknown) {
    console.error('Verify slip error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'ตรวจสลิปไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
