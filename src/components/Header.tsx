'use client';

import React, { useState, useEffect } from 'react';
import { Truck, ShoppingCart, Package, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { GoogleSheetsConfig, MainTabType } from '@/types/order';

interface HeaderProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  sheetsConfig: GoogleSheetsConfig;
  onOpenSheetsModal: () => void;
  onOpenPhotoModal?: () => void;
  onResetSampleData: () => void;
  pendingDeliveriesCount: number;
  pendingShoppingCount: number;
}

export function Header({
  activeTab,
  setActiveTab,
  syncStatus,
  sheetsConfig,
  onOpenSheetsModal,
  onResetSampleData,
  pendingDeliveriesCount,
  pendingShoppingCount
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md text-slate-800 shadow-xs border-b border-emerald-100/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xs shadow-emerald-200 flex-shrink-0">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-800 font-display">
                  Market<span className="text-emerald-600">Drop</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                  MOBILE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                ระบบจัดการและส่งของสดตามบ้าน • เรียลไทม์ {timeStr}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile - mobile uses bottom nav) */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
            {/* Tab 1: ของที่ต้องซื้อ */}
            <button
              onClick={() => setActiveTab('shopping')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'shopping'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold border border-emerald-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>🛒 ของที่ต้องซื้อ</span>
              {pendingShoppingCount > 0 && (
                <span className="ml-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {pendingShoppingCount}
                </span>
              )}
            </button>

            {/* Tab 2: ที่ต้องส่ง */}
            <button
              onClick={() => setActiveTab('delivery')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'delivery'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold border border-emerald-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Truck className="w-4 h-4 text-teal-600" />
              <span>🛵 ที่ต้องส่ง</span>
              {pendingDeliveriesCount > 0 && (
                <span className="ml-1 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {pendingDeliveriesCount}
                </span>
              )}
            </button>

            {/* Tab 3: จัดการออเดอร์ */}
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold border border-emerald-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Package className="w-4 h-4 text-slate-500" />
              <span>จัดการออเดอร์</span>
            </button>
          </div>

          {/* Right Action: Sheets Sync + Reset Data Button */}
          <div className="flex items-center gap-2">
            {/* Google Sheets Sync Pill */}
            <button
              onClick={onOpenSheetsModal}
              title="ตั้งค่าและซิงค์ Google Sheets"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/80'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">
                {syncStatus === 'synced' ? 'ซิงค์ชีต' : 'Google Sheets'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-500 animate-pulse-dot'
                    : syncStatus === 'syncing'
                    ? 'bg-amber-500 animate-spin'
                    : 'bg-slate-400'
                }`}
              />
            </button>

            {/* Reset / Clear Data button */}
            <button
              onClick={onResetSampleData}
              title="ล้างข้อมูลทั้งหมด / รีเซ็ต"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
