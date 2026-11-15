import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

/**
 * Cloud store for cross-device sync (Supabase, tables in supabase/schema.sql).
 * GET  /api/store?since=ISO → rows changed after `since` + the server time to use next.
 * POST /api/store { kv: [{key, value}], orders: [{id, data, deleted}] } → upsert, stamped with server time.
 * If APP_PIN is set in Vercel, every call needs header x-app-pin = APP_PIN (the shop chose to run without one;
 * setting it later turns protection on without code changes). The Supabase key never leaves the server.
 */

const SUPA_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const APP_PIN = process.env.APP_PIN || '';

const MAX_VALUE = 2_000_000; // chars per key
const MAX_ROWS = 1000;

function configured() {
  return SUPA_URL.startsWith('https://') && !!SUPA_KEY;
}

async function pinOk(req: NextRequest) {
  if (!APP_PIN) return true; // no PIN configured: open to anyone with the link
  const given = Buffer.from(req.headers.get('x-app-pin') || '');
  const want = Buffer.from(APP_PIN);
  const ok = given.length === want.length && timingSafeEqual(given, want);
  if (!ok) await new Promise(r => setTimeout(r, 600)); // slow down guessing
  return ok;
}

const supa = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPA_KEY,
      // legacy service_role keys are JWTs; new sb_secret_ keys go in apikey only
      ...(SUPA_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SUPA_KEY}` } : {}),
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    signal: AbortSignal.timeout(15000),
    cache: 'no-store'
  });

async function guard(req: NextRequest) {
  if (!configured()) {
    return NextResponse.json({ success: false, code: 'not_configured', message: 'ยังไม่ได้ตั้งค่าฐานข้อมูลกลาง' }, { status: 503 });
  }
  if (!(await pinOk(req))) {
    return NextResponse.json({ success: false, code: 'bad_pin', message: 'รหัสไม่ถูกต้อง' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = await guard(req);
  if (blocked) return blocked;

  const since = req.nextUrl.searchParams.get('since') || '';
  if (since && Number.isNaN(Date.parse(since))) {
    return NextResponse.json({ success: false, message: 'since ไม่ถูกต้อง' }, { status: 400 });
  }
  const now = new Date().toISOString();
  const filter = since ? `&updated_at=gt.${encodeURIComponent(since)}` : '';
  try {
    const [kvRes, ordRes] = await Promise.all([
      supa(`app_kv?select=key,value,updated_at${filter}`),
      supa(`app_orders?select=id,data,deleted,updated_at${filter}`)
    ]);
    if (!kvRes.ok || !ordRes.ok) throw new Error(`supabase ${kvRes.status}/${ordRes.status}`);
    return NextResponse.json({ success: true, now, kv: await kvRes.json(), orders: await ordRes.json() });
  } catch (err) {
    console.error('store GET failed', err);
    return NextResponse.json({ success: false, message: 'ติดต่อฐานข้อมูลไม่ได้' }, { status: 502 });
  }
}

interface KvIn {
  key: string;
  value: string;
}
interface OrderIn {
  id: string;
  data: unknown;
  deleted?: boolean;
}

export async function POST(req: NextRequest) {
  const blocked = await guard(req);
  if (blocked) return blocked;

  let body: { kv?: KvIn[]; orders?: OrderIn[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  }
  const kv = Array.isArray(body.kv) ? body.kv : [];
  const orders = Array.isArray(body.orders) ? body.orders : [];
  const badKv = kv.some(
    r => typeof r?.key !== 'string' || !r.key.startsWith('marketdrop_') || typeof r.value !== 'string' || r.value.length > MAX_VALUE
  );
  const badOrder = orders.some(
    r => typeof r?.id !== 'string' || !r.id || r.id.length > 200 || (!r.deleted && (typeof r.data !== 'object' || r.data === null))
  );
  if (badKv || badOrder || kv.length > MAX_ROWS || orders.length > MAX_ROWS) {
    return NextResponse.json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const upsert = (table: string, rows: object[]) =>
    rows.length
      ? supa(`${table}?on_conflict=${table === 'app_kv' ? 'key' : 'id'}`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows)
        })
      : Promise.resolve(new Response(null, { status: 204 }));
  try {
    const [a, b] = await Promise.all([
      upsert('app_kv', kv.map(r => ({ key: r.key, value: r.value, updated_at: now }))),
      upsert(
        'app_orders',
        orders.map(r => ({ id: r.id, data: r.deleted ? null : r.data, deleted: !!r.deleted, updated_at: now }))
      )
    ]);
    if (!a.ok || !b.ok) throw new Error(`supabase ${a.status}/${b.status} ${await a.text()} ${await b.text()}`);
    return NextResponse.json({ success: true, now });
  } catch (err) {
    console.error('store POST failed', err);
    return NextResponse.json({ success: false, message: 'บันทึกขึ้นฐานข้อมูลไม่ได้' }, { status: 502 });
  }
}
