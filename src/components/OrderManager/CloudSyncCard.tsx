'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { CLOUD_PIN_KEY, SYNC_EVENT, SyncResult } from '@/lib/cloud-sync';
import { CLOUD_OFF_KEY, isCloudOff, SYNC_NOW_EVENT } from '@/lib/use-cloud-sync';

const MESSAGES: Record<string, string> = {
  not_configured: 'ยังไม่ได้ตั้งค่าฐานข้อมูลใน Vercel',
  bad_pin: 'ร้านตั้งรหัสไว้ ใส่รหัสเพื่อซิงค์',
  offline: 'ต่ออินเทอร์เน็ต/ฐานข้อมูลไม่ได้ จะลองใหม่เอง'
};

/** Status of cross-device sync on this phone, with an off switch (and a PIN box only if the shop set one). */
export function CloudSyncCard() {
  const [off, setOff] = useState(false);
  const [draft, setDraft] = useState('');
  const [last, setLast] = useState<SyncResult | null>(null);

  useEffect(() => {
    setOff(isCloudOff());
    const onResult = (e: Event) => setLast((e as CustomEvent<SyncResult>).detail);
    window.addEventListener(SYNC_EVENT, onResult);
    return () => window.removeEventListener(SYNC_EVENT, onResult);
  }, []);

  const syncNow = () => window.dispatchEvent(new Event(SYNC_NOW_EVENT));
  const setSync = (on: boolean) => {
    if (on) localStorage.removeItem(CLOUD_OFF_KEY);
    else localStorage.setItem(CLOUD_OFF_KEY, '1');
    setOff(!on);
    setLast(null);
    if (on) syncNow();
  };

  const status = off
    ? 'ปิดอยู่ ข้อมูลอยู่ในเครื่องนี้เท่านั้น'
    : !last
      ? 'กำลังซิงค์…'
      : last.ok
        ? `ซิงค์แล้ว ${new Date(last.at!).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.${
            last.pulled || last.pushed ? ` · รับ ${last.pulled} · ส่ง ${last.pushed}` : ''
          }`
        : MESSAGES[last.code || 'offline'] || MESSAGES.offline;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2.5">
      <div className="flex items-start gap-2.5">
        {!off && last?.ok !== false ? (
          <Cloud className="w-5 h-5 text-emerald-600 mt-0.5" aria-hidden="true" />
        ) : (
          <CloudOff className="w-5 h-5 text-slate-400 mt-0.5" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">ซิงค์ข้ามเครื่อง</h3>
          <p className={`text-xs ${!off && last && !last.ok ? 'text-rose-600' : 'text-slate-500'}`} aria-live="polite">
            {status}
          </p>
        </div>
        {!off && (
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

      {!off && last?.code === 'bad_pin' && (
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!draft.trim()) return;
            localStorage.setItem(CLOUD_PIN_KEY, draft.trim());
            setDraft('');
            syncNow();
          }}
          className="flex gap-2"
        >
          <input
            type="password"
            autoComplete="off"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="รหัสร้าน"
            aria-label="รหัสร้านสำหรับซิงค์"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm"
          />
          <button type="submit" className="px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold">
            เชื่อม
          </button>
        </form>
      )}

      <button type="button" onClick={() => setSync(off)} className="text-xs text-slate-500 underline">
        {off ? 'เปิดซิงค์ในเครื่องนี้' : 'ปิดซิงค์ในเครื่องนี้'}
      </button>
      <p className="text-[11px] text-slate-400">
        ออเดอร์ สมุดราคา ลูกค้าประจำ รายการซื้อ ตรงกันทุกเครื่อง · ลบออเดอร์ในเครื่องหนึ่ง เครื่องอื่นก็หายด้วย
      </p>
    </div>
  );
}
