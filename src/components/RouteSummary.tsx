'use client';

import React from 'react';
import { Home, CheckCircle2, Banknote, Wallet, TrendingUp } from 'lucide-react';
import { Order } from '@/types/order';

interface RouteSummaryProps {
  orders: Order[];
}

export function RouteSummary({ orders }: RouteSummaryProps) {
  const totalStops = orders.length;
  const completedStops = orders.filter(o => o.deliveryStatus === 'DELIVERED').length;
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;

  // ยอด COD ที่ยังรอเก็บ (เฉพาะออเดอร์ที่เป็น COD และยังส่งไม่สำเร็จ)
  const pendingCodAmount = orders
    .filter(o => o.paymentStatus === 'COD' && o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // ยอดเงินที่เก็บได้แล้วจริงวันนี้ (จากทั้งที่ส่งแล้วและเก็บได้)
  const totalCollectedAmount = orders.reduce(
    (sum, o) => sum + (o.collectedAmount || 0),
    0
  );

  // ยอดมูลค่าออเดอร์รวมทั้งสาย
  const totalRouteAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3.5 sm:p-4 mb-4">
      {/* Top row: Progress bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>ความคืบหน้าการส่งวันนี้</span>
        </div>
        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          {completedStops} จาก {totalStops} หลัง ({progressPercent}%)
        </span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-3.5 border border-slate-200/60">
        <div
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: Total Stops */}
        <div className="bg-slate-50 rounded-xl p-2.5 sm:p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium">จุดส่งทั้งหมด</p>
            <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
              {totalStops} <span className="text-xs font-normal text-slate-500">หลัง</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Completed Stops */}
        <div className="bg-emerald-50/70 rounded-xl p-2.5 sm:p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-emerald-700 font-medium">ส่งสำเร็จแล้ว</p>
            <p className="text-base sm:text-lg font-black text-emerald-900 tracking-tight">
              {completedStops} <span className="text-xs font-normal text-emerald-600">หลัง</span>
            </p>
          </div>
        </div>

        {/* Metric 3: COD Pending */}
        <div className="bg-amber-50/80 rounded-xl p-2.5 sm:p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-amber-700 font-semibold">ยอด COD รอเก็บ</p>
            <p className="text-base sm:text-lg font-black text-amber-900 tracking-tight">
              ฿{pendingCodAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Metric 4: Total Collected */}
        <div className="bg-slate-50 rounded-xl p-2.5 sm:p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium">เก็บเงินได้แล้ว</p>
            <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
              ฿{totalCollectedAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
