'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Package, RefreshCw, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { GoogleSheetsConfig } from '@/types/order';

interface HeaderProps {
  activeTab: 'admin' | 'driver';
  setActiveTab: (tab: 'admin' | 'driver') => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  sheetsConfig: GoogleSheetsConfig;
  onOpenSheetsModal: () => void;
  onResetSampleData: () => void;
  pendingDeliveriesCount: number;
}

export function Header({
  activeTab,
  setActiveTab,
  syncStatus,
  sheetsConfig,
  onOpenSheetsModal,
  onResetSampleData,
  pendingDeliveriesCount
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) + ' น.'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 flex-shrink-0">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-display">
                  Market<span className="text-emerald-400">Drop</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.5 rounded border border-emerald-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                ระบบจัดการและส่งของสดตามบ้านแบบเรียลไทม์
              </p>
            </div>
          </div>

          {/* Center Tabs: Admin vs Driver */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/80 shadow-inner">
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>จัดออเดอร์</span>
            </button>
            <button
              onClick={() => setActiveTab('driver')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all relative ${
                activeTab === 'driver'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>เริ่มส่งของ (Driver)</span>
              {pendingDeliveriesCount > 0 && (
                <span className="ml-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingDeliveriesCount}
                </span>
              )}
            </button>
          </div>

          {/* Right Action: Clock & Sheets Sync Indicator */}
          <div className="flex items-center gap-2">
            {timeStr && (
              <span className="hidden md:inline-block text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                🕒 {timeStr}
              </span>
            )}

            {/* Google Sheets Sync Pill */}
            <button
              onClick={onOpenSheetsModal}
              title="ตั้งค่าและซิงค์ Google Sheets"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                syncStatus === 'synced'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">
                {syncStatus === 'synced'
                  ? 'ซิงค์ชีตแล้ว'
                  : syncStatus === 'syncing'
                  ? 'กำลังซิงค์...'
                  : 'Google Sheets'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-400 animate-pulse-dot'
                    : syncStatus === 'syncing'
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-slate-500'
                }`}
              />
            </button>

            {/* Reset sample button */}
            <button
              onClick={onResetSampleData}
              title="รีเซ็ตข้อมูลตัวอย่าง"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
