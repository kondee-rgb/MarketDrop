'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Order } from '@/types/order';
import { buildSheetsPayload, SheetsOrderRow } from '@/lib/sheets';
import { getFuelConfig } from '@/lib/fuel-calc';

const baht = (n: number) => `฿${Math.round(Number(n) || 0).toLocaleString('th-TH')}`;

/** Orders of one day: history from Google Sheets merged with orders still in the app (app wins). */
export function DayOrders({ date, localOrders }: { date: string; localOrders: Order[] }) {
  const [remote, setRemote] = useState<SheetsOrderRow[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRemote(null);
    setNote(null);
    fetch(`/api/sheets/day?date=${date}`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        setRemote(Array.isArray(d.orders) ? d.orders : []);
        if (!d.success && d.message) setNote(d.message);
      })
      .catch(() => alive && setRemote([]));
    return () => {
      alive = false;
    };
  }, [date]);

  const local = buildSheetsPayload(localOrders, getFuelConfig()).orders.filter(o => o.date === date);
  const merged = new Map<string, SheetsOrderRow>();
  (remote || []).forEach(o => merged.set(String(o.id), o));
  local.forEach(o => merged.set(o.id, o));
  const rows = [...merged.values()].filter(o => o.status !== 'ยกเลิก');
  const loading = remote === null && rows.length === 0;

  return (
    <div className="space-y-2 animate-in fade-in duration-200">
      <p className="text-xs font-semibold text-slate-700 px-1">
        รายการออเดอร์ {rows.length > 0 && <span className="font-normal text-slate-500">({rows.length} รายการ)</span>}
        {remote === null && rows.length > 0 && <Loader2 className="inline w-3 h-3 ml-1.5 animate-spin text-slate-400" />}
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-400 px-1 py-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังดึงจาก Google Sheets...
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-3">
          ไม่พบออเดอร์ของวันที่เลือก{note ? ` · ${note}` : ' (ออเดอร์จะเก็บในชีตเมื่อกดซิงค์)'}
        </p>
      )}

      {rows.map(o => (
        <div key={o.id} className="rounded-2xl bg-slate-50 px-3.5 py-3 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {o.customerName} <span className="font-normal text-slate-500">· {o.houseNumber}</span>
              </p>
              {o.location && <p className="text-[11px] text-slate-400 truncate">{o.location}</p>}
            </div>
            <p className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">{baht(o.total)}</p>
          </div>
          <p className="text-xs text-slate-600 leading-snug">{o.items}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 tabular-nums">
            <span>จ่ายแล้ว {baht(o.paid)}</span>
            {Number(o.due) > 0 && <span className="text-amber-700">ค้าง {baht(o.due)}</span>}
            <span>ต้นทุน {baht(o.cost)}</span>
            <span className={Number(o.profit) < 0 ? 'text-rose-600' : 'text-emerald-700'}>กำไร {baht(o.profit)}</span>
            <span>{o.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
