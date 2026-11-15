'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PriceBookEntry, patchPriceBookEntry } from '@/lib/price-book';
import { REAL_LOCATIONS } from '@/lib/locations';

const list = (text: string) =>
  Array.from(new Set(text.split(/[,،\n]/).map(s => s.trim()).filter(Boolean)));

const input = 'px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs';
const chip = 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-[11px] text-slate-700';

/** More settings for one price-book item: other shops, other names, fillings, place prices, unit conversion. */
export function PriceBookExtras({ entry, onChange }: { entry: PriceBookEntry; onChange: () => void }) {
  const [shopName, setShopName] = useState('');
  const [shopCost, setShopCost] = useState('');
  const [convUnit, setConvUnit] = useState('');
  const [convQty, setConvQty] = useState('');

  const patch = (p: Partial<PriceBookEntry>) => {
    patchPriceBookEntry(entry.id, p);
    onChange();
  };
  const shops = entry.shops || [];
  const conversions = entry.unitConversions || {};

  return (
    <div className="mt-2 pt-2 border-t border-slate-100 space-y-3 text-xs">
      <section className="space-y-1.5">
        <p className="font-semibold text-slate-700">ร้านที่ซื้อได้ (แตะชื่อร้านในหน้าซื้อของเพื่อสลับ)</p>
        <div className="flex flex-wrap gap-1">
          {shops.map(sp => (
            <span key={sp.name} className={chip}>
              {sp.name} ฿{sp.cost}
              <button
                type="button"
                aria-label={`ลบร้าน ${sp.name}`}
                onClick={() => patch({ shops: shops.filter(x => x.name !== sp.name) })}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="ชื่อร้าน" className={`${input} flex-1 min-w-0`} />
          <input
            type="number"
            inputMode="decimal"
            value={shopCost}
            onChange={e => setShopCost(e.target.value)}
            placeholder="ทุน ฿"
            className={`${input} w-20`}
          />
          <button
            type="button"
            onClick={() => {
              const cost = parseFloat(shopCost);
              if (!shopName.trim() || !Number.isFinite(cost)) return;
              patch({ shops: [...shops.filter(x => x.name !== shopName.trim()), { name: shopName.trim(), cost }] });
              setShopName('');
              setShopCost('');
            }}
            className="px-3 rounded-xl bg-slate-900 text-white font-semibold"
          >
            เพิ่ม
          </button>
        </div>
      </section>

      <label className="block space-y-1">
        <span className="font-semibold text-slate-700">ชื่อที่ลูกค้าเรียกต่างกัน (คั่นด้วย ,)</span>
        <input
          defaultValue={(entry.aliases || []).join(', ')}
          onBlur={e => patch({ aliases: list(e.target.value) })}
          placeholder="เช่น ข้าวเหนียวกุ้ง, ขนมข้าวเหนียวดำ"
          className={`${input} w-full`}
        />
      </label>

      <label className="block space-y-1">
        <span className="font-semibold text-slate-700">ไส้ / ท็อปปิ้ง ราคาเดียวกัน (คั่นด้วย ,)</span>
        <input
          defaultValue={(entry.variants || []).join(', ')}
          onBlur={e => patch({ variants: list(e.target.value) })}
          placeholder="เช่น ไส้กุ้ง, ไส้หมู, ไส้มะพร้าว"
          className={`${input} w-full`}
        />
      </label>

      <section className="space-y-1">
        <p className="font-semibold text-slate-700">ราคาขายเฉพาะที่ (เว้นว่าง = ฿{entry.sellingPrice})</p>
        <div className="grid grid-cols-2 gap-1.5">
          {REAL_LOCATIONS.filter(l => l.id !== 'custom').map(l => (
            <label key={l.id} className="flex items-center gap-1.5">
              <span className="flex-1 truncate text-slate-600">{l.shortName}</span>
              <input
                type="number"
                inputMode="decimal"
                defaultValue={entry.locationPrices?.[l.id] ?? ''}
                onBlur={e => {
                  const v = parseFloat(e.target.value);
                  const next = { ...(entry.locationPrices || {}) };
                  if (Number.isFinite(v) && v > 0) next[l.id] = v;
                  else delete next[l.id];
                  patch({ locationPrices: next });
                }}
                placeholder={String(entry.sellingPrice || '')}
                aria-label={`ราคาขายที่ ${l.shortName}`}
                className={`${input} w-20`}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-1.5">
        <p className="font-semibold text-slate-700">แปลงหน่วย (รวมยอดในหน้าซื้อของเป็น {entry.unit})</p>
        <div className="flex flex-wrap gap-1">
          {Object.entries(conversions).map(([u, n]) => (
            <span key={u} className={chip}>
              1 {u} = {n} {entry.unit}
              <button
                type="button"
                aria-label={`ลบหน่วย ${u}`}
                onClick={() => {
                  const next = { ...conversions };
                  delete next[u];
                  patch({ unitConversions: next });
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">1</span>
          <input value={convUnit} onChange={e => setConvUnit(e.target.value)} placeholder="หน่วย เช่น ขีด" className={`${input} w-24`} />
          <span className="text-slate-500">=</span>
          <input
            type="number"
            inputMode="decimal"
            value={convQty}
            onChange={e => setConvQty(e.target.value)}
            placeholder="0.1"
            className={`${input} w-16`}
          />
          <span className="text-slate-500">{entry.unit}</span>
          <button
            type="button"
            onClick={() => {
              const n = parseFloat(convQty);
              if (!convUnit.trim() || !(n > 0) || convUnit.trim() === entry.unit) return;
              patch({ unitConversions: { ...conversions, [convUnit.trim()]: n } });
              setConvUnit('');
              setConvQty('');
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-semibold"
          >
            เพิ่ม
          </button>
        </div>
      </section>
    </div>
  );
}
