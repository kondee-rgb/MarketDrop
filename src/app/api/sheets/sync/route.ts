import { NextRequest, NextResponse } from 'next/server';
import { orderToSheetRow, SHEETS_COLUMNS } from '@/lib/sheets';
import { Order } from '@/types/order';

// In-memory cache for demo / server persistence during runtime
let serverSyncedOrders: Order[] = [];
let lastSyncTimestamp: string | null = null;

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

    // หากมีการระบุ webhookUrl ให้ forward ไปยัง Google Apps Script จาก server-side
    if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('http')) {
      try {
        const payload = {
          action: 'SYNC_ALL',
          timestamp: lastSyncTimestamp,
          count: targetOrders.length,
          columns: SHEETS_COLUMNS,
          rows: targetOrders.map(orderToSheetRow),
          orders: targetOrders
        };

        const remoteRes = await fetch(webhookUrl, {
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
          remoteResponse: remoteText
        });
      } catch (webhookErr: unknown) {
        console.error('Remote webhook error:', webhookErr);
        // Fallback to local server success with notice
        return NextResponse.json({
          success: true,
          isFallback: true,
          message: `ซิงค์กับคลาวด์ท้องถิ่นแล้ว (Webhook ปลายทางเชื่อมต่อไม่ได้: ${webhookErr instanceof Error ? webhookErr.message : 'Error'})`,
          timestamp: lastSyncTimestamp,
          count: targetOrders.length
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
  return NextResponse.json({
    success: true,
    count: serverSyncedOrders.length,
    lastSyncTimestamp,
    orders: serverSyncedOrders
  });
}
