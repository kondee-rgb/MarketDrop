'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Edit3, Trash2, Phone, MapPin, CheckCircle, Clock } from 'lucide-react';
import { Order } from '@/types/order';

interface OrderCardAdminProps {
  order: Order;
  index: number;
  totalOrders: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelectForDriver: () => void;
}

export function OrderCardAdmin({
  order,
  index,
  totalOrders,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  onSelectForDriver
}: OrderCardAdminProps) {
  const isDelivered = order.deliveryStatus === 'DELIVERED';

  return (
    <div
      className={`bg-white rounded-2xl border transition-all p-3.5 sm:p-4 shadow-sm hover:shadow-md ${
        isDelivered
          ? 'border-emerald-200 bg-emerald-50/20'
          : 'border-slate-200/90 hover:border-emerald-400'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Stop Number & Reorder Controls */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm tracking-tight shadow-sm ${
                isDelivered
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-white'
              }`}
            >
              #{order.stopNumber}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              title="เลื่อนขึ้น"
              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalOrders - 1}
              title="เลื่อนลง"
              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* House Number & Soi */}
          <div className="ml-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-display tracking-tight">
                {order.houseNumber}
              </span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {order.soi || 'ไม่ระบุซอย'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{order.customerName}</span>
              {order.phone && (
                <a
                  href={`tel:${order.phone}`}
                  className="text-emerald-700 hover:underline flex items-center gap-0.5"
                >
                  <Phone className="w-3 h-3" /> {order.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right: Payment badge & Delivery status */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {/* Payment Badge */}
          {order.paymentStatus === 'PAID' ? (
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
              <span>🟢 โอนแล้ว</span>
              <span className="font-black">฿{order.totalAmount}</span>
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
              <span>🟠 COD</span>
              <span className="font-black">฿{order.totalAmount}</span>
            </span>
          )}

          {/* Delivery Status Badge */}
          {isDelivered ? (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
              <CheckCircle className="w-3 h-3 text-emerald-600" /> ส่งแล้ว ({order.deliveredAt || 'เสร็จสิ้น'})
            </span>
          ) : (
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
              <Clock className="w-3 h-3 text-amber-500" /> รอส่ง
            </span>
          )}
        </div>
      </div>

      {/* Items list pill preview */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">ของที่ต้องส่ง:</span>
          {order.items.map((it, idx) => (
            <span
              key={it.id || idx}
              className="text-xs bg-slate-100 text-slate-700 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium"
            >
              {it.name} <span className="font-bold text-slate-900">{it.quantity} {it.unit}</span>
            </span>
          ))}
        </div>

        {/* Action icons: Edit / Delete / Open in Driver */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSelectForDriver}
            className="text-xs bg-slate-900 hover:bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
          >
            เปิดโหมดคนขับ 🛵
          </button>
          <button
            onClick={onEdit}
            title="แก้ไขออเดอร์"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            title="ลบออเดอร์"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notes if any */}
      {order.notes && (
        <div className="mt-2 text-xs bg-amber-50/70 border border-amber-200/60 text-amber-900 px-2.5 py-1 rounded-lg">
          <span className="font-bold">📝 หมายเหตุ:</span> {order.notes}
        </div>
      )}
    </div>
  );
}
