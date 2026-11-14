import { NextRequest, NextResponse } from 'next/server';

/** GET /api/sheets/day?date=YYYY-MM-DD → that day's orders from the Google Sheet history. */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ success: false, message: 'รูปแบบวันที่ไม่ถูกต้อง' }, { status: 400 });
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.SHEETS_WEBHOOK_URL || '';
  if (!webhookUrl.startsWith('https://script.google.com/')) {
    return NextResponse.json({ success: false, message: 'ยังไม่ได้เชื่อม Google Sheets', orders: [] }, { status: 200 });
  }

  try {
    const res = await fetch(`${webhookUrl}?date=${date}`, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const data = await res.json().catch(() => null);
    if (!data || data.status !== 'success' || !Array.isArray(data.orders)) {
      return NextResponse.json({
        success: false,
        message: 'ชีตยังไม่รองรับการดูรายวัน — อัปเดตสคริปต์ในชีตเป็นเวอร์ชันล่าสุด',
        orders: []
      });
    }
    return NextResponse.json({ success: true, orders: data.orders });
  } catch {
    return NextResponse.json({ success: false, message: 'ติดต่อ Google Sheets ไม่ได้', orders: [] }, { status: 502 });
  }
}
