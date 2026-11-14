'use client';

import React from 'react';
import { ShoppingCart, Truck, TrendingUp, Package } from 'lucide-react';
import { MainTabType } from '@/types/order';

interface MobileBottomNavProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  onOpenPhotoModal?: () => void;
  pendingShoppingCount: number;
  pendingDeliveryCount: number;
}

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  pendingShoppingCount,
  pendingDeliveryCount
}: MobileBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg pb-safe">
      <div className="max-w-md mx-auto px-2 py-1.5 grid grid-cols-4 gap-1">
        {/* Tab 1: ของที่ต้องซื้อ */}
        <button
          type="button"
          onClick={() => setActiveTab('shopping')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
            activeTab === 'shopping'
              ? 'bg-emerald-50 text-emerald-800 font-bold shadow-xs border border-emerald-100'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="relative">
            <ShoppingCart className={`w-5 h-5 ${activeTab === 'shopping' ? 'text-emerald-700' : 'text-slate-400'}`} />
            {pendingShoppingCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9px] min-w-3.5 h-3.5 px-0.5 rounded-full flex items-center justify-center">
                {pendingShoppingCount > 99 ? '99+' : pendingShoppingCount}
              </span>
            )}
          </div>
          <span className="text-[10.5px] mt-0.5 tracking-tight font-medium">ของที่ต้องซื้อ</span>
        </button>

        {/* Tab 2: ที่ต้องส่ง */}
        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
            activeTab === 'delivery'
              ? 'bg-emerald-50 text-emerald-800 font-bold shadow-xs border border-emerald-100'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="relative">
            <Truck className={`w-5 h-5 ${activeTab === 'delivery' ? 'text-emerald-700' : 'text-slate-400'}`} />
            {pendingDeliveryCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9px] min-w-3.5 h-3.5 px-0.5 rounded-full flex items-center justify-center">
                {pendingDeliveryCount}
              </span>
            )}
          </div>
          <span className="text-[10.5px] mt-0.5 tracking-tight font-medium">ที่ต้องส่ง</span>
        </button>

        {/* Tab 3: สรุปกำไร */}
        <button
          type="button"
          onClick={() => setActiveTab('profit')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
            activeTab === 'profit'
              ? 'bg-emerald-50 text-emerald-800 font-bold shadow-xs border border-emerald-100'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className={`w-5 h-5 ${activeTab === 'profit' ? 'text-emerald-700' : 'text-slate-400'}`} />
          <span className="text-[10.5px] mt-0.5 tracking-tight font-medium">สรุปกำไร</span>
        </button>

        {/* Tab 4: จัดการ/ชีต */}
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
            activeTab === 'admin'
              ? 'bg-emerald-50 text-emerald-800 font-bold shadow-xs border border-emerald-100'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Package className={`w-5 h-5 ${activeTab === 'admin' ? 'text-emerald-700' : 'text-slate-400'}`} />
          <span className="text-[10.5px] mt-0.5 tracking-tight font-medium">จัดการ/ชีต</span>
        </button>
      </div>
    </div>
  );
}
