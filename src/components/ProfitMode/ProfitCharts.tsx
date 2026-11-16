'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { DailyTrendPoint, formatThaiShortDate, shiftDate, toLocalDateStr } from '@/lib/historical-profit';

// Palette checked with the dataviz validator (light surface): passes lightness, chroma, CVD and
// normal-vision separation. Contrast is below 3:1 so every segment also has a visible text label.
const PROFIT = '#047857'; // emerald-700
const LOSS = '#fb7185'; // rose-400
const SPLIT = { cost: '#6366f1', travel: '#f59e0b', profit: '#10b981' };

const baht = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;

/** Where each baht of sales went: produce cost / travel / what's left. */
export function MoneySplitBar({ revenue, cost, travel }: { revenue: number; cost: number; travel: number }) {
  if (revenue <= 0) return null;
  const profit = revenue - cost - travel;
  const parts = [
    { key: 'cost', label: 'ต้นทุนของ', value: cost, color: SPLIT.cost },
    { key: 'travel', label: 'ค่าเดินทาง', value: travel, color: SPLIT.travel },
    {
      key: 'profit',
      label: 'กำไร',
      value: Math.max(0, profit),
      color: SPLIT.profit
    }
  ].filter(p => p.value > 0);
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const pct = (v: number) => Math.round((v / revenue) * 100);

  return (
    <div
      className="space-y-2"
      role="img"
      aria-label={`จากยอดขาย ${baht(revenue)}: ${parts.map(p => `${p.label} ${baht(p.value)}`).join(', ')}`}
    >
      <p className="text-xs text-slate-500">ยอดขาย 100 บาท ไปไหนบ้าง</p>
      <div className="flex h-4 w-full overflow-hidden rounded-full gap-[2px] bg-white">
        {parts.map(p => (
          <div
            key={p.key}
            className="animate-grow first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(p.value / total) * 100}%`,
              background: p.color
            }}
            title={`${p.label} ${baht(p.value)}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'ต้นทุนของ', value: cost, color: SPLIT.cost },
          { label: 'ค่าเดินทาง', value: travel, color: SPLIT.travel },
          {
            label: profit < 0 ? 'ขาดทุน' : 'กำไร',
            value: profit,
            color: profit < 0 ? LOSS : SPLIT.profit
          }
        ].map(p => (
          <div key={p.label} className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              {p.label}
            </p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums truncate">
              {pct(Math.abs(p.value))}% <span className="text-xs font-normal text-slate-500">{baht(Math.abs(p.value))}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Daily net profit columns around a zero line; tap a column to read that day. */
export function ProfitTrendChart({
  data,
  onDeleteDay,
  renderDetail
}: {
  data: DailyTrendPoint[];
  onDeleteDay?: (date: string) => void;
  renderDetail?: (date: string) => React.ReactNode;
}) {
  const today = toLocalDateStr();
  const [selected, setSelected] = useState<string>(today); // opens on today, even with no orders yet
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(0, ...data.map(d => d.netProfit));
  const min = Math.min(0, ...data.map(d => d.netProfit));
  const range = max - min || 1;
  const zeroFromTop = (max / range) * 100; // % of plot height above the zero line
  const day = data.find(d => d.date === selected) || {
    date: selected,
    displayDate: formatThaiShortDate(selected),
    revenue: 0,
    netProfit: 0,
    orders: 0,
    marginPercent: 0
  };
  const arrow =
    'w-8 h-8 shrink-0 rounded-xl bg-white ring-1 ring-slate-200 text-slate-600 flex items-center justify-center disabled:opacity-30';
  const total = data.reduce((s, d) => s + d.netProfit, 0);

  return (
    <div className="space-y-3">
      {/* Selected day readout (tap target replaces hover on phones) */}
      <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-2 py-3">
        <button type="button" onClick={() => setSelected(shiftDate(day.date, -1))} aria-label="วันก่อนหน้า" className={arrow}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] text-slate-500">
              {day.date === today ? 'วันนี้ · ' : ''}
              {day.displayDate} · {day.orders} ออเดอร์
            </p>
            <p className="text-lg font-semibold tabular-nums" style={{ color: day.netProfit < 0 ? '#e11d48' : PROFIT }}>
              {day.netProfit < 0 ? 'ขาดทุน ' : 'กำไร '}
              {baht(Math.abs(day.netProfit))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 tabular-nums">
              ขาย {baht(day.revenue)}
              <br />
              อัตรากำไร {day.marginPercent}%
            </p>
            {/* today's figures are live and re-saved, so only past days can be removed */}
            {onDeleteDay && day.date !== today && data.some(d => d.date === day.date) && (
              <button
                type="button"
                onClick={() => onDeleteDay(day.date)}
                className="mt-1 text-[11px] text-slate-400 hover:text-rose-600 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> ลบออกจากประวัติ
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSelected(shiftDate(day.date, 1))}
          disabled={day.date >= today}
          aria-label="วันถัดไป"
          className={arrow}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {data.length === 0 && (
        <p className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
          ยังไม่มีประวัติ — ระบบบันทึกให้อัตโนมัติทุกวันที่มีออเดอร์
        </p>
      )}

      {/* Columns */}
      {data.length > 0 && (
        <>
          <div className="relative h-36" role="img" aria-label={`กำไรสุทธิรายวัน ${data.length} วัน รวม ${baht(total)}`}>
            <div className="absolute inset-x-0 border-t border-slate-300" style={{ top: `${zeroFromTop}%` }} />
            <div className="absolute inset-0 flex items-stretch gap-1">
              {data.map(d => {
                const h = (Math.abs(d.netProfit) / range) * 100;
                const isSel = d.date === day.date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelected(d.date)}
                    aria-label={`${d.displayDate} ${d.netProfit < 0 ? 'ขาดทุน' : 'กำไร'} ${baht(Math.abs(d.netProfit))}`}
                    aria-pressed={isSel}
                    className={`relative flex-1 min-w-0 rounded-md ${isSel ? 'bg-slate-100' : ''}`}
                  >
                    <span
                      className="absolute left-1/2 -translate-x-1/2 w-[60%] max-w-6 transition-opacity"
                      style={{
                        background: d.netProfit < 0 ? LOSS : PROFIT,
                        opacity: isSel ? 1 : 0.7,
                        height: `${Math.max(h, d.netProfit === 0 ? 0 : 2)}%`,
                        ...(d.netProfit >= 0
                          ? {
                              bottom: `${100 - zeroFromTop}%`,
                              borderRadius: '4px 4px 0 0'
                            }
                          : {
                              top: `${zeroFromTop}%`,
                              borderRadius: '0 0 4px 4px'
                            })
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between text-[10.5px] text-slate-400 tabular-nums">
            <span>{data[0].displayDate}</span>
            {data.length > 2 && <span>{data[Math.floor(data.length / 2)].displayDate}</span>}
            <span>{data[data.length - 1].displayDate}</span>
          </div>
        </>
      )}

      {renderDetail?.(day.date)}

      <button type="button" onClick={() => setShowTable(v => !v)} className="text-xs text-slate-500 hover:text-slate-800">
        {showTable ? 'ซ่อนตาราง' : 'ดูเป็นตาราง'}
      </button>
      {showTable && (
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="text-slate-500 text-left">
              <th className="font-medium py-1">วัน</th>
              <th className="font-medium py-1 text-right">ออเดอร์</th>
              <th className="font-medium py-1 text-right">ยอดขาย</th>
              <th className="font-medium py-1 text-right">กำไรสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map(d => (
              <tr key={d.date} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-700">{d.displayDate}</td>
                <td className="py-1.5 text-right text-slate-600">{d.orders}</td>
                <td className="py-1.5 text-right text-slate-600">{baht(d.revenue)}</td>
                <td className={`py-1.5 text-right font-medium ${d.netProfit < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {baht(d.netProfit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Top items as bars: length = profit, relative to the best item. */
export function TopItemBars({
  items
}: {
  items: {
    name: string;
    profit: number;
    marginPercent: number;
    orderCount: number;
  }[];
}) {
  const best = Math.max(1, ...items.map(i => i.profit));
  return (
    <div className="space-y-2.5">
      {items.map(it => (
        <div key={it.name} className="space-y-1">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-slate-700 truncate">
              {it.name} <span className="text-slate-400">· {it.orderCount} บ้าน</span>
            </span>
            <span className="font-semibold text-slate-900 tabular-nums shrink-0 ml-2">
              {baht(it.profit)} <span className="font-normal text-slate-400">({it.marginPercent}%)</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full animate-grow"
              style={{
                width: `${(it.profit / best) * 100}%`,
                background: SPLIT.profit
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
