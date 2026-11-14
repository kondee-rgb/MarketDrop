'use client';

import React from 'react';
import {
  Phone,
  Navigation,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { Order, OrderItem } from '@/types/order';

interface DriverStopCardProps {
  order: Order;
  onToggleItemCheck: (orderId: string, itemId: string) => void;
  onOpenConfirmModal: (order: Order) => void;
  onRevertDelivery: (orderId: string) => void;
}

export function DriverStopCard({
  order,
  onToggleItemCheck,
  onOpenConfirmModal,
  onRevertDelivery
}: DriverStopCardProps) {
  const isDelivered = order.deliveryStatus === 'DELIVERED';
  const isPaid = order.paymentStatus === 'PAID';
  const checkedItemsCount = order.items.filter(it => it.checked).length;
  const allItemsChecked = order.items.length > 0 && checkedItemsCount === order.items.length;

  const handleOpenGoogleMaps = () => {
    const query = `${order.houseNumber} ${order.soi}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className={`rounded-3xl border-2 transition-all overflow-hidden ${
        isDelivered
          ? 'bg-slate-50 border-emerald-300 opacity-90'
          : 'bg-white border-slate-300 shadow-lg hover:border-emerald-500 shadow-slate-200/50'
      }`}
    >
      {/* Top Banner: Stop Number & Status Pill */}
      <div
        className={`px-4 sm:px-5 py-3 flex items-center justify-between text-white ${
          isDelivered
            ? 'bg-emerald-700'
            : isPaid
            ? 'bg-slate-900'
            : 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="bg-white text-slate-950 font-black text-xs sm:text-sm px-2.5 py-1 rounded-lg tracking-wider font-display">
            STOP #{order.stopNumber}
          </span>
          <span className="text-xs text-slate-300 font-medium">
            {isDelivered ? '✓ ส่งสำเร็จแล้ว' : 'รอส่ง'}
          </span>
        </div>

        {/* Payment Tag */}
        {isPaid ? (
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3 py-1 rounded-full text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>โอนแล้ว (ไม่ต้องเก็บเงิน)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-amber-500 text-slate-950 px-3 py-1 rounded-full text-xs font-black shadow-sm">
            <span>💰 เก็บ COD: ฿{order.totalAmount}</span>
          </div>
        )}
      </div>

      {/* Main Body: Extra Large House Number & Address */}
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">บ้านเลขที่</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-display leading-none mt-1">
              {order.houseNumber}
            </h2>
            <p className="text-sm sm:text-base font-bold text-slate-700 mt-1.5 flex items-center gap-1">
              📍 {order.soi || 'ไม่ระบุซอย'}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ลูกค้า: <strong className="text-slate-800">{order.customerName}</strong>
            </p>
          </div>

          {/* Large Payment Badge Box */}
          <div className="text-right">
            {isPaid ? (
              <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 p-2.5 sm:p-3 rounded-2xl text-right">
                <p className="text-[10px] font-black uppercase text-emerald-700">สถานะเงิน</p>
                <p className="text-lg sm:text-xl font-black text-emerald-800 leading-tight">โอนแล้ว</p>
                <p className="text-xs font-semibold text-emerald-600">฿{order.totalAmount}</p>
              </div>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-500 text-amber-950 p-2.5 sm:p-3 rounded-2xl text-right animate-pulse-subtle">
                <p className="text-[10px] font-black uppercase text-amber-800">ยอดต้องเก็บเงินสด</p>
                <p className="text-xl sm:text-2xl font-black text-amber-950 leading-tight">
                  ฿{order.totalAmount.toLocaleString()}
                </p>
                <p className="text-[11px] font-bold text-amber-700">เก็บปลายทาง (COD)</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Driver Action Buttons: Call & Maps */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {order.phone ? (
            <a
              href={`tel:${order.phone}`}
              className="flex items-center justify-center gap-2 py-3 px-3 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-2xl font-bold text-xs sm:text-sm active:scale-95 transition-all"
            >
              <Phone className="w-4 h-4 text-blue-600" />
              <span>โทร {order.phone}</span>
            </a>
          ) : (
            <div className="flex items-center justify-center gap-1 py-3 px-3 bg-slate-50 text-slate-400 rounded-2xl text-xs font-medium border border-slate-200">
              ไม่มีเบอร์โทร
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-2xl font-bold text-xs sm:text-sm active:scale-95 transition-all"
          >
            <Navigation className="w-4 h-4 text-emerald-600" />
            <span>นำทาง Maps</span>
          </button>
        </div>

        {/* Delivery Notes Pill */}
        {order.notes && (
          <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-3 text-xs sm:text-sm text-amber-950 flex items-start gap-2 font-medium">
            <span className="text-base flex-shrink-0">📝</span>
            <div className="min-w-0">
              <strong className="font-bold text-amber-900">หมายเหตุจากลูกค้า: </strong>
              <span>{order.notes}</span>
            </div>
          </div>
        )}

        {/* Packing Checklist */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>🧺 ตรวจเช็ครายการของสด ({order.items.length} รายการ)</span>
            </span>
            <span
              className={`font-black px-2 py-0.5 rounded-full ${
                allItemsChecked
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {allItemsChecked ? '✓ ตรวจครบแล้ว' : `ตรวจแล้ว ${checkedItemsCount}/${order.items.length}`}
            </span>
          </div>

          <div className="space-y-1.5">
            {order.items.map(it => (
              <button
                type="button"
                key={it.id}
                onClick={() => onToggleItemCheck(order.id, it.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors ${
                  it.checked
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {it.checked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-semibold truncate ${it.checked ? 'line-through text-slate-400' : ''}`}>
                    {it.name}
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 ml-2 flex-shrink-0">
                  {it.quantity} {it.unit}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Big Bottom Action: One-Tap Confirmation */}
        <div className="pt-2">
          {isDelivered ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-extrabold text-sm sm:text-base font-display">ส่งสำเร็จแล้ว</p>
                  <p className="text-xs text-emerald-700">
                    เวลา {order.deliveredAt} • {order.paymentMethod === 'TRANSFER' ? 'โอนล่วงหน้า' : order.paymentMethod === 'CASH' ? 'เงินสด' : order.paymentMethod === 'QR_SCAN' ? 'สแกน QR' : 'ค้างจ่าย'} (฿{order.collectedAmount})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRevertDelivery(order.id)}
                title="แก้ไข / ยกเลิกสถานะส่ง"
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenConfirmModal(order)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-emerald-700/25 flex items-center justify-center gap-2 transition-all font-display tracking-wide"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>ยืนยันส่งสำเร็จ (One-Tap)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
