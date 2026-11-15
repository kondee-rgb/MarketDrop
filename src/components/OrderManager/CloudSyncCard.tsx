'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { CLOUD_PIN_KEY, SYNC_EVENT, SyncResult } from '@/lib/cloud-sync';
import { getCloudPin, SYNC_NOW_EVENT } from '@/lib/use-cloud-sync';

const MESSAGES: Record<string, string> = {
  not_configured: 'ยังไม่ได้ตั้งค่าฐานข้อมูลใน Vercel',
  bad_pin: 'รหัสไม่ถูกต้อง',
  offline: 'ต่ออินเทอร์เน็ต/ฐานข้อมูลไม่ได้ จะลองใหม่เอง',
  no_pin: 'ยังไม่ได้ใส่รหัส'
};

/** Turn on cross-device sync for this phone with the shop's PIN. */
export function CloudSyncCard() {
  const [hasPin, setHasPin] = useState(false);
  const [draft, setDraft] = useState('');
  const [last, setLast] = useState<SyncResult | null>(null);

  useEffect(() => {
    setHasPin(!!getCloudPin());
    const onResult = (e: Event) => setLast((e as CustomEvent<SyncResult>).detail);
    window.addEventListener(SYNC_EVENT, onResult);
    return () => window.removeEventListener(SYNC_EVENT, onResult);
  }, []);

  const syncNow = () => window.dispatchEvent(new Event(SYNC_NOW_EVENT));

  const savePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.trim().length < 6) return;
    localStorage.setItem(CLOUD_PIN_KEY, draft.trim());
    setDraft('');
    setHasPin(true);
    syncNow();
  };

  const stop = () => {
    localStorage.removeItem(CLOUD_PIN_KEY);
    setHasPin(false);
    setLast(null);
  };

  const status = !last
    ? hasPin
      ? 'กำลังซิงค์…'
      : 'ข้อมูลอยู่ในเครื่องนี้เท่านั้น'
    : last.ok
      ? `ซิงค์แล้ว ${new Date(last.at!).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.${
          last.pulled || last.pushed ? ` · รับ ${last.pulled} · ส่ง ${last.pushed}` : ''
        }`
      : MESSAGES[last.code || 'offline'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2.5">
      <div className="flex items-start gap-2.5">
        {hasPin && last?.ok !== false ? (
          <Cloud className="w-5 h-5 text-emerald-600 mt-0.5" aria-hidden="true" />
        ) : (
          <CloudOff className="w-5 h-5 text-slate-400 mt-0.5" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">ซิงค์ข้ามเครื่อง</h3>
          <p className={`text-xs ${last && !last.ok ? 'text-rose-600' : 'text-slate-500'}`} aria-live="polite">
            {status}
          </p>
        </div>
        {hasPin && (
          <button
            type="button"
            onClick={syncNow}
            aria-label="ซิงค์ตอนนี้"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {!hasPin || last?.code === 'bad_pin' ? (
        <form onSubmit={savePin} className="flex gap-2">
          <input
            type="password"
            inputMode="text"
            autoComplete="off"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="รหัสร้าน (อย่างน้อย 6 ตัว)"
            aria-label="รหัสร้านสำหรับซิงค์"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm"
          />
          <button
            type="submit"
            disabled={draft.trim().length < 6}
            className="px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-40"
          >
            เชื่อม
          </button>
        </form>
      ) : (
        <button type="button" onClick={stop} className="text-xs text-slate-500 underline">
          เลิกซิงค์เครื่องนี้
        </button>
      )}
      <p className="text-[11px] text-slate-400">
        ออเดอร์ สมุดราคา ลูกค้าประจำ รายการซื้อ ตรงกันทุกเครื่องที่ใส่รหัสเดียวกัน · ลบออเดอร์ในเครื่องหนึ่ง เครื่องอื่นก็หายด้วย
      </p>
    </div>
  );
}
