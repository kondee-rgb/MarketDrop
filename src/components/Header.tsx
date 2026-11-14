'use client';

import React, { useState, useEffect } from 'react';
import { Truck, ShoppingCart, Package, FileSpreadsheet, RotateCcw, Camera } from 'lucide-react';
import { GoogleSheetsConfig, MainTabType } from '@/types/order';

interface HeaderProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  sheetsConfig: GoogleSheetsConfig;
  onOpenSheetsModal: () => void;
  onOpenPhotoModal: () => void;
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
  onOpenPhotoModal,
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
                  MOBILE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                ระบบของสด: ตลาด ➔ ซื้อ ➔ ส่งหน้าบ้าน
              </p>
            </div>
          </div>

          {/* Desktop/Tablet 3 Main Tabs: ของที่ต้องซื้อ vs ที่ต้องส่ง vs จัดการออเดอร์ */}
          <div className="hidden md:flex bg-slate-800 p-1 rounded-2xl border border-slate-700/80 shadow-inner">
            {/* Tab 1: ของที่ต้องซื้อ */}
            <button
              onClick={() => setActiveTab('shopping')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'shopping'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>🛒 ของที่ต้องซื้อ</span>
              {pendingShoppingCount > 0 && (
                <span className="ml-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingShoppingCount}
                </span>
              )}
            </button>

            {/* Tab 2: ที่ต้องส่ง */}
            <button
              onClick={() => setActiveTab('delivery')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'delivery'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>🛵 ที่ต้องส่ง</span>
              {pendingDeliveriesCount > 0 && (
                <span className="ml-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingDeliveriesCount}
                </span>
              )}
            </button>

            {/* Tab 3: จัดการออเดอร์ */}
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>จัดการออเดอร์</span>
            </button>
          </div>

          {/* Right Action: Camera Snap Button + Sheets Sync */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPhotoModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-950/40 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">ถ่ายรูป / คีย์</span>
            </button>

            {/* Google Sheets Sync Pill */}
            <button
              onClick={onOpenSheetsModal}
              title="ตั้งค่าและซิงค์ Google Sheets"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                syncStatus === 'synced'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">
                {syncStatus === 'synced' ? 'ซิงค์ชีต' : 'Google Sheets'}
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
