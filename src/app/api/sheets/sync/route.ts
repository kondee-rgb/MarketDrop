import { NextRequest, NextResponse } from 'next/server';
import { orderToSheetRow, SHEETS_COLUMNS } from '@/lib/sheets';
import { Order } from '@/types/order';

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

    // หากมี webhookUrl ให้ forward ไปยัง Google Apps Script จาก server-side
    if (effectiveWebhookUrl && effectiveWebhookUrl.startsWith('http')) {
      try {
        const payload = {
          action: 'SYNC_ALL',
          timestamp: lastSyncTimestamp,
          count: targetOrders.length,
          columns: SHEETS_COLUMNS,
          rows: targetOrders.map(orderToSheetRow),
          orders: targetOrders
        };

        const remoteRes = await fetch(effectiveWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const remoteText = await remoteRes.text();
        return NextResponse.json({
          success: true,
          message: 'ซิงค์ข้อมูลกับ Google Sheets Webhook สำเร็จ',
          timestamp: lastSyncTimestamp,
          count: targetOrders.length,
          remoteResponse: remoteText,
          webhookUrl: effectiveWebhookUrl
        });
      } catch (webhookErr: unknown) {
        console.error('Remote webhook error:', webhookErr);
        // Fallback to local server success with notice
        return NextResponse.json({
          success: true,
          isFallback: true,
          message: `ซิงค์กับคลาวด์ท้องถิ่นแล้ว (Webhook ปลายทางเชื่อมต่อไม่ได้: ${webhookErr instanceof Error ? webhookErr.message : 'Error'})`,
          timestamp: lastSyncTimestamp,
          count: targetOrders.length,
          webhookUrl: effectiveWebhookUrl
        });
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
