'use client';

import React, { useState } from 'react';
import {
  Phone,
  Navigation,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Bell
} from 'lucide-react';
import { Order } from '@/types/order';
import { getLocationById } from '@/lib/locations';
import { DeliveryNotifyModal } from './DeliveryNotifyModal';

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
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const isDelivered = order.deliveryStatus === 'DELIVERED';
  const isPaid = order.paymentStatus === 'PAID';
  const checkedItemsCount = order.items.filter(it => it.checked).length;
  const allItemsChecked = order.items.length > 0 && checkedItemsCount === order.items.length;
  const locConfig = getLocationById(order.locationId);

  const handleOpenGoogleMaps = () => {
    const parts = [
      locConfig?.name || '',
      order.building ? `ตึก ${order.building}` : '',
      order.soi ? `ซอย ${order.soi}` : '',
      `บ้านเลขที่ ${order.houseNumber}`
    ].filter(Boolean);
    const query = parts.join(' ') || `${order.houseNumber} ${order.soi}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className={`rounded-3xl border-2 transition-all overflow-hidden ${
        isDelivered
          ? 'bg-slate-50 border-emerald-300 opacity-90'
          : 'bg-white border-slate-300 shadow-md hover:border-emerald-500 shadow-slate-200/50'
      }`}
    >
      {/* Top Banner: Stop Number & Status Pill */}
      <div
        className={`px-4 sm:px-5 py-3 flex items-center justify-between border-b ${
          isDelivered
            ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
            : isPaid
            ? 'bg-slate-50 text-slate-800 border-slate-200'
            : 'bg-amber-50/90 text-amber-950 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="bg-white text-slate-800 border border-slate-200/80 font-bold text-xs sm:text-sm px-2.5 py-1 rounded-xl tracking-wider font-display shadow-xs">
            STOP #{order.stopNumber}
          </span>
          {locConfig && (
            <span className="text-xs font-bold text-slate-700 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
              {locConfig.type === 'condo' ? '🏢' : '🏡'} {locConfig.name}
            </span>
          )}
          <span className="text-xs text-slate-500 font-medium">
            {isDelivered ? '✓ ส่งสำเร็จแล้ว' : 'รอส่ง'}
          </span>
        </div>

        {/* Payment Tag */}
        {isPaid ? (
          <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>โอนแล้ว (ไม่ต้องเก็บเงิน)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
            <span>💰 เก็บ COD: ฿{order.totalAmount}</span>
          </div>
        )}
      </div>

      {/* Main Body: Extra Large House Number & Address */}
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">บ้านเลขที่ / ห้อง</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-display leading-none mt-1">
              {order.houseNumber}
            </h2>
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-700 mt-1.5">
              {order.building && (
                <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md text-xs font-bold">
                  {order.building}
                </span>
              )}
              {order.soi ? (
                <span>📍 {order.soi}</span>
              ) : (
                <span className="text-xs text-slate-400 font-normal">ไม่ระบุซอย</span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              ผู้รับ (ส่งให้ใคร): <strong className="text-slate-900 font-bold">{order.customerName}</strong>
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
              <div className="bg-amber-50 border-2 border-amber-500 text-amber-950 p-2.5 sm:p-3 rounded-2xl text-right">
                <p className="text-[10px] font-black uppercase text-amber-800">ยอดต้องเก็บเงินสด</p>
                <p className="text-xl sm:text-2xl font-black text-amber-950 leading-tight">
                  ฿{order.totalAmount.toLocaleString()}
                </p>
                <p className="text-[11px] font-bold text-amber-700">เก็บปลายทาง (COD)</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Driver Action Buttons: Call, Maps & Pre-Arrival Alert */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {order.phone ? (
            <a
              href={`tel:${order.phone}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-2xl font-bold text-xs sm:text-sm active:scale-95 transition-all"
            >
              <Phone className="w-4 h-4 text-blue-600" />
              <span>โทร</span>
            </a>
          ) : (
            <div className="flex items-center justify-center gap-1 py-2.5 px-2 bg-slate-50 text-slate-400 rounded-2xl text-xs font-medium">
              ไม่มีเบอร์
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-2xl font-bold text-xs sm:text-sm active:scale-95 transition-all"
          >
            <Navigation className="w-4 h-4 text-emerald-600" />
            <span>แผนที่</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNotifyModalOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-2xl font-bold text-xs sm:text-sm active:scale-95 transition-all shadow-xs"
            title="แจ้งเตือนลูกค้าก่อนส่งถึงบ้าน (LINE / SMS / Copy)"
          >
            <Bell className="w-4 h-4 text-emerald-600" />
            <span>แจ้งเตือน</span>
          </button>
        </div>

        {/* Item Checklist for this House (ของที่ต้องส่งให้บ้านนี้) */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wide">
              📦 รายการของที่ต้องส่ง ({checkedItemsCount}/{order.items.length})
            </span>
            {allItemsChecked && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> ครบทุกชิ้นแล้ว
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {order.items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleItemCheck(order.id, item.id)}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] ${
                  item.checked
                    ? 'bg-emerald-50/70 border-emerald-300 text-slate-500'
                    : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.checked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className={`font-semibold text-sm sm:text-base ${item.checked ? 'line-through text-slate-400' : ''}`}>
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                    item.checked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {item.quantity} {item.unit}
                  </span>
                  {item.price ? (
                    <span className="text-xs text-slate-500 font-medium">฿{item.price}</span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Customer Notes */}
        {order.notes && (
          <div className="p-3 bg-amber-50/70 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">หมายเหตุลูกค้า:</strong> {order.notes}
            </div>
          </div>
        )}

        {/* Action Button: Confirm Delivery / Revert */}
        <div className="pt-2">
          {isDelivered ? (
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-emerald-950">ส่งสำเร็จแล้ว</p>
                  <p className="text-[11px] text-emerald-700">
                    เวลา {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString('th-TH') : '-'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRevertDelivery(order.id)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ยกเลิก</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenConfirmModal(order)}
              className={`w-full py-4 px-4 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                allItemsChecked
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 animate-pulse-subtle'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'
              }`}
            >
              <span>{isPaid ? '✓ บันทึกว่าส่งของแล้ว' : '💰 ยืนยันการเก็บเงิน & บันทึกส่ง'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Customer Pre-Arrival Alert Modal */}
      <DeliveryNotifyModal
        order={order}
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
      />
    </div>
  );
}
