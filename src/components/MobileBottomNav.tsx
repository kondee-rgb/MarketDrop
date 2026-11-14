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
  const tabs = [
    { id: 'shopping' as const, label: 'ของที่ต้องซื้อ', Icon: ShoppingCart, badge: pendingShoppingCount },
    { id: 'delivery' as const, label: 'ที่ต้องส่ง', Icon: Truck, badge: pendingDeliveryCount },
    { id: 'profit' as const, label: 'สรุปกำไร', Icon: TrendingUp, badge: 0 },
    { id: 'admin' as const, label: 'จัดการ/ชีต', Icon: Package, badge: 0 }
  ];

  const handleSelect = (tab: MainTabType) => {
    if (tab === activeTab) return;
    // Light haptic tick on Android (iOS Safari ignores vibrate)
    try { navigator.vibrate?.(8); } catch { /* ignore */ }
    setActiveTab(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-t border-slate-200/70 pb-safe">
      <div className="max-w-md mx-auto px-2 pt-1.5 pb-1 grid grid-cols-4 gap-1">
        {tabs.map(({ id, label, Icon, badge }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              aria-current={active ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl"
            >
              <span
                className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-all duration-300 ${
                  active ? 'bg-emerald-100/90 scale-100' : 'bg-transparent scale-90'
                }`}
              >
                <Icon
                  className={`w-[21px] h-[21px] transition-colors duration-200 ${active ? 'text-emerald-700' : 'text-slate-400'}`}
                  strokeWidth={active ? 2.4 : 2}
                />
                {badge > 0 && (
                  <span
                    key={badge}
                    className="animate-in zoom-in-95 fade-in duration-200 absolute -top-1 right-0.5 bg-rose-500 text-white font-semibold text-[9.5px] min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center ring-2 ring-white tabular-nums"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span
                className={`text-[10.5px] mt-0.5 transition-colors duration-200 ${
                  active ? 'text-emerald-800 font-semibold' : 'text-slate-500 font-medium'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
