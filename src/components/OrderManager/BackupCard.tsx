'use client';

import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { buildBackup, parseBackup, restoreBackup } from '@/lib/backup';
import { toLocalDateStr } from '@/lib/historical-profit';

/** One file with everything on this phone (orders, price book, regulars, places, settings). */
export function BackupCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const save = () => {
    const blob = new Blob([JSON.stringify(buildBackup())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketdrop-backup-${toLocalDateStr()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg('บันทึกไฟล์แล้ว เก็บไว้ใน Google Drive / LINE Keep ก็ได้');
  };

  const load = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) return setMsg('ไฟล์ใหญ่เกินไป');
    const backup = parseBackup(await file.text());
    if (typeof backup === 'string') return setMsg(backup);
    const when = new Date(backup.savedAt).toLocaleString('th-TH');
    if (!window.confirm(`โหลดข้อมูลสำรองวันที่ ${when}?\nข้อมูลในเครื่องนี้ตอนนี้จะถูกแทนที่ทั้งหมด`)) return;
    restoreBackup(backup);
    window.location.reload();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2.5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">สำรองข้อมูล</h3>
        <p className="text-xs text-slate-500">
          ออเดอร์ สมุดราคา ลูกค้าประจำ สถานที่ และการตั้งค่า รวมเป็นไฟล์เดียว · ใช้ย้ายไปมือถือใหม่ได้
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={save}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white"
        >
          <Download className="w-4 h-4" aria-hidden="true" /> บันทึกไฟล์สำรอง
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-slate-50 text-slate-700 ring-1 ring-slate-200"
        >
          <Upload className="w-4 h-4" aria-hidden="true" /> โหลดไฟล์สำรอง
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) load(f);
        }}
      />
      {msg && <p className="text-xs text-slate-600" aria-live="polite">{msg}</p>}
    </div>
  );
}
