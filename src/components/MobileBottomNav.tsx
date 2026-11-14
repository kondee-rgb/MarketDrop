'use client';

import React from 'react';
import { ShoppingCart, Truck, Camera, Settings, Package } from 'lucide-react';
import { MainTabType } from '@/types/order';

interface MobileBottomNavProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  onOpenPhotoModal: () => void;
  pendingShoppingCount: number;
  pendingDeliveryCount: number;
}

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  onOpenPhotoModal,
  pendingShoppingCount,
  pendingDeliveryCount
}: MobileBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between">
        {/* Tab 1: ของที่ต้องซื้อ */}
        <button
          onClick={() => setActiveTab('shopping')}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
            activeTab === 'shopping'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {pendingShoppingCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {pendingShoppingCount > 99 ? '99+' : pendingShoppingCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1">ของที่ต้องซื้อ</span>
        </button>

        {/* Center Button: ถ่ายรูป / สแกนโพย */}
        <div className="flex flex-col items-center -mt-6">
          <button
            onClick={onOpenPhotoModal}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-xl shadow-emerald-950/70 flex items-center justify-center active:scale-90 transition-transform border-4 border-slate-900 hover:scale-105"
            title="ถ่ายรูปโพย / ออเดอร์"
          >
            <Camera className="w-7 h-7" />
          </button>
          <span className="text-[10px] text-emerald-400 font-bold mt-1">ถ่ายรูป</span>
        </div>

        {/* Tab 2: ที่ต้องส่ง */}
        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
            activeTab === 'delivery'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Truck className="w-5 h-5" />
            {pendingDeliveryCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {pendingDeliveryCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1">ที่ต้องส่ง</span>
        </button>

        {/* Tab 3: จัดการออเดอร์ */}
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
            activeTab === 'admin'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[11px] mt-1">จัดการ/ชีต</span>
        </button>
      </div>
    </div>
  );
}
