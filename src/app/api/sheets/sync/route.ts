import { NextRequest, NextResponse } from 'next/server';
import { orderToSheetRow, SHEETS_COLUMNS } from '@/lib/sheets';
import { Order } from '@/types/order';
import { interpretSheetsReply } from '@/lib/sheets-reply';

// In-memory cache for demo / server persistence during runtime
let serverSyncedOrders: Order[] = [];
let lastSyncTimestamp: string | null = null;
let serverSavedWebhookUrl: string =
  process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.SHEETS_WEBHOOK_URL || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orders, webhookUrl, order } = body;

    const targetOrders: Order[] = orders || (order ? [order] : []);

    if (targetOrders.length === 0) {
      return NextResponse.json(
        { success: false, message: 'ไม่มีข้อมูลออเดอร์สำหรับซิงค์' },
        { status: 400 }
      );
    }

    lastSyncTimestamp = new Date().toISOString();
    serverSyncedOrders = targetOrders;

    // Use passed webhookUrl, or server's stored webhook, or env var
    const effectiveWebhookUrl =
      webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('http')
        ? webhookUrl.trim()
        : serverSavedWebhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.SHEETS_WEBHOOK_URL || '';

    if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('http')) {
      serverSavedWebhookUrl = webhookUrl.trim();
    }

    // หากมี webhookUrl ให้ forward ไปยัง Google Apps Script จาก server-side แล้วอ่านคำตอบจริง
    if (effectiveWebhookUrl && effectiveWebhookUrl.startsWith('http')) {
      const payload = body.payload || {
        action: 'SYNC_ALL',
        timestamp: lastSyncTimestamp,
        count: targetOrders.length,
        columns: SHEETS_COLUMNS,
        rows: targetOrders.map(o => orderToSheetRow(o)),
        orders: targetOrders
      };

      try {
        const remoteRes = await fetch(effectiveWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          redirect: 'follow',
          signal: AbortSignal.timeout(25000)
        });
        const remoteText = await remoteRes.text();
        const result = interpretSheetsReply(remoteRes.status, remoteText);
        if (!result.ok) console.error('Sheets webhook rejected:', remoteRes.status, remoteText.slice(0, 300));
        return NextResponse.json(
          { success: result.ok, message: result.message, timestamp: lastSyncTimestamp, count: targetOrders.length },
          { status: result.ok ? 200 : 502 }
        );
      } catch (webhookErr: unknown) {
        console.error('Remote webhook error:', webhookErr);
        return NextResponse.json(
          { success: false, message: 'ติดต่อ Google Sheets ไม่ได้ (หมดเวลา) — ลองใหม่อีกครั้ง', timestamp: lastSyncTimestamp },
          { status: 502 }
        );
      }
    }

    // กรณีโหมด Local / Mock Google Sheets Sync
    return NextResponse.json({
      success: true,
      message: `บันทึกข้อมูลเรียบร้อย (${targetOrders.length} ออเดอร์ พร้อมซิงค์ Google Sheets)`,
      timestamp: lastSyncTimestamp,
      count: targetOrders.length
    });
  } catch (error: unknown) {
    console.error('Sync route error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการประมวลผล'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const envWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.SHEETS_WEBHOOK_URL || '';
  return NextResponse.json({
    success: true,
    count: serverSyncedOrders.length,
    lastSyncTimestamp,
    orders: serverSyncedOrders,
    webhookUrl: serverSavedWebhookUrl || envWebhook || ''
  });
}

export async function PUT(req: NextRequest) {
  try {
    const { webhookUrl } = await req.json();
    if (webhookUrl && typeof webhookUrl === 'string') {
      serverSavedWebhookUrl = webhookUrl.trim();
    }
    return NextResponse.json({
      success: true,
      message: 'บันทึก Webhook URL บนเซิร์ฟเวอร์เรียบร้อย',
      webhookUrl: serverSavedWebhookUrl
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  }
}
