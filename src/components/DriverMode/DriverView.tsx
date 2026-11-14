'use client';

import React, { useState } from 'react';
import { Truck, CheckCircle2, Clock, Filter, AlertCircle, Camera } from 'lucide-react';
import { Order, PaymentMethod } from '@/types/order';
import { DriverStopCard } from './DriverStopCard';
import { PaymentConfirmModal } from './PaymentConfirmModal';

interface DriverViewProps {
  orders: Order[];
  onToggleItemCheck: (orderId: string, itemId: string) => void;
  onConfirmDelivery: (
    orderId: string,
    collectedAmount: number,
    paymentMethod: PaymentMethod,
    deliveredAt: string,
    partialReason?: string
  ) => void;
  onRevertDelivery: (orderId: string) => void;
  onOpenPhotoModal?: () => void;
}

export function DriverView({
  orders,
  onToggleItemCheck,
  onConfirmDelivery,
  onRevertDelivery,
  onOpenPhotoModal
}: DriverViewProps) {
  const [filter, setFilter] = useState<'pending' | 'all' | 'delivered'>('pending');
  const [activeConfirmOrder, setActiveConfirmOrder] = useState<Order | null>(null);

  const pendingOrders = orders.filter(o => o.deliveryStatus !== 'DELIVERED');
  const deliveredOrders = orders.filter(o => o.deliveryStatus === 'DELIVERED');

  const displayedOrders =
    filter === 'pending'
      ? pendingOrders
      : filter === 'delivered'
      ? deliveredOrders
      : orders;

  const totalCodPending = pendingOrders
    .filter(o => o.paymentStatus === 'COD')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-10">
      {/* Driver Quick Status Dashboard */}
      <div className="bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/60 text-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs border border-teal-100/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-100/80 text-teal-700 flex items-center justify-center border border-teal-200 shadow-xs">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight text-slate-800">
                โหมดคนขับส่งของ (Driver Mode)
              </h2>
              <p className="text-xs text-slate-500">
                เหลืออีก <strong className="text-amber-800 font-bold">{pendingOrders.length}</strong> หลัง • ส่งแล้ว {deliveredOrders.length}/{orders.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onOpenPhotoModal && (
              <button
                type="button"
                onClick={onOpenPhotoModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-2xl font-bold text-xs shadow-xs border border-teal-300 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4 text-teal-700" />
                <span>📸 สแกนออเดอร์ส่ง</span>
              </button>
            )}

            <div className="text-right bg-amber-50/80 border border-amber-200/80 px-3 py-1.5 rounded-2xl">
              <p className="text-[10px] text-amber-800 uppercase font-bold">COD รอเก็บ</p>
              <p className="text-lg sm:text-xl font-bold text-amber-900 font-display">
                ฿{totalCodPending.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-teal-100/80">
          <button
            onClick={() => setFilter('pending')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === 'pending'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>รอส่ง ({pendingOrders.length})</span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === 'all'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <span>ทั้งหมด ({orders.length})</span>
          </button>

          <button
            onClick={() => setFilter('delivered')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === 'delivered'
                ? 'bg-teal-100 text-teal-900 border border-teal-300 shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
            <span>ส่งแล้ว ({deliveredOrders.length})</span>
          </button>
        </div>
      </div>

      {/* List of Stops */}
      {displayedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 font-display">
            {filter === 'pending' ? 'ส่งครบทุกหลังแล้ววันนี้! 🎉' : 'ไม่มีรายการส่งในหมวดนี้'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filter === 'pending'
              ? 'คนขับส่งสินค้าเสร็จสิ้นทุกออเดอร์แล้ว ยอดเงินบันทึกเรียบร้อย'
              : 'สลับไปยังแท็บ &quot;จัดออเดอร์&quot; เพื่อเพิ่มรายการใหม่'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map(order => (
            <DriverStopCard
              key={order.id}
              order={order}
              onToggleItemCheck={onToggleItemCheck}
              onOpenConfirmModal={orderToConfirm => setActiveConfirmOrder(orderToConfirm)}
              onRevertDelivery={onRevertDelivery}
            />
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <PaymentConfirmModal
        order={activeConfirmOrder}
        isOpen={!!activeConfirmOrder}
        onClose={() => setActiveConfirmOrder(null)}
        onConfirmDelivery={onConfirmDelivery}
      />
    </div>
  );
}
