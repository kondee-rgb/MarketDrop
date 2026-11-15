'use client';

import React, { useState } from 'react';
import { Order, ShoppingItem } from '@/types/order';
import { canonicalName, findEntry, selectShop } from '@/lib/price-book';

interface Props {
  item: ShoppingItem;
  orders: Order[];
  onUpdateItemCost?: (itemName: string, costPrice: number, shopName?: string, listCost?: number | null) => void;
}

/** Under a shopping item: switch shop (when bought from several) and record a bargained price. */
export function ItemMarketRow({ item, orders, onUpdateItemCost }: Props) {
  const [, rerender] = useState(0);
  const [bargaining, setBargaining] = useState(false);
  const [paidDraft, setPaidDraft] = useState('');
  const entry = findEntry(item.name);
  if (!entry || !onUpdateItemCost) return null;

  const shops = entry.shops || [];
  const asked = entry.costPrice;
  const key = canonicalName(item.name).toLowerCase();
  const line = orders.flatMap(o => o.items).find(it => canonicalName(it.name).toLowerCase() === key && typeof it.listCost === 'number');
  const paid = line?.costPrice;

  const pickShop = (name: string) => {
    const next = selectShop(item.name, name);
    if (next) onUpdateItemCost(item.name, next.costPrice, next.shopName, null);
    rerender(n => n + 1);
  };

  const savePaid = (value: number) => {
    if (!Number.isFinite(value) || value < 0) return;
    if (value >= asked) onUpdateItemCost(item.name, asked, entry.shopName, null); // no discount: clear it
    else onUpdateItemCost(item.name, value, entry.shopName, asked);
    setBargaining(false);
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div className="mt-1 space-y-1" onClick={stop}>
      <div className="flex flex-wrap items-center gap-1">
        {shops.length > 1 &&
          shops.map(sp => (
            <button
              key={sp.name}
              type="button"
              onClick={() => pickShop(sp.name)}
              aria-pressed={sp.name === entry.shopName}
              className={`px-2 py-0.5 rounded-lg text-[11px] ${
                sp.name === entry.shopName ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {sp.name} ฿{sp.cost}
            </button>
          ))}
        {asked > 0 && (
          <button
            type="button"
            onClick={() => {
              setPaidDraft(String(paid ?? asked));
              setBargaining(b => !b);
            }}
            className={`px-2 py-0.5 rounded-lg text-[11px] ${
              typeof paid === 'number' ? 'bg-emerald-50 text-emerald-800' : 'bg-white ring-1 ring-slate-200 text-slate-600'
            }`}
          >
            {typeof paid === 'number' ? `จ่าย ฿${paid} (ต่อได้ ฿${asked - paid})` : 'ต่อราคา'}
          </button>
        )}
      </div>
      {bargaining && (
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 rounded-xl p-2">
          <span className="text-[11px] text-slate-500">ราคาตั้ง ฿{asked}/{entry.unit}</span>
          {[5, 10, 20].map(d =>
            asked - d > 0 ? (
              <button
                key={d}
                type="button"
                onClick={() => savePaid(asked - d)}
                className="px-2 py-1 rounded-lg bg-white ring-1 ring-slate-200 text-xs font-semibold"
              >
                −{d}
              </button>
            ) : null
          )}
          <input
            type="number"
            inputMode="decimal"
            value={paidDraft}
            onChange={e => setPaidDraft(e.target.value)}
            aria-label="ราคาที่จ่ายจริงต่อหน่วย"
            className="w-16 px-2 py-1 rounded-lg bg-white ring-1 ring-slate-300 border-0 text-xs tabular-nums"
          />
          <button
            type="button"
            onClick={() => savePaid(parseFloat(paidDraft))}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
          >
            บันทึก
          </button>
        </div>
      )}
    </div>
  );
}
