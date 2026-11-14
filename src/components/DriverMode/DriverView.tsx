'use client';

import React, { useState } from 'react';
import { Truck, CheckCircle2, Clock, Filter, AlertCircle } from 'lucide-react';
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
}

export function DriverView({
  orders,
  onToggleItemCheck,
  onConfirmDelivery,
  onRevertDelivery
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
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-display tracking-tight text-white">
                โหมดคนขับส่งของ (Driver Mode)
              </h2>
              <p className="text-xs text-slate-400">
                เหลืออีก <strong className="text-amber-400 font-bold">{pendingOrders.length}</strong> หลัง • ส่งแล้ว {deliveredOrders.length}/{orders.length}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold">COD รอเก็บ</p>
            <p className="text-xl sm:text-2xl font-black text-amber-400 font-display">
              ฿{totalCodPending.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            onClick={() => setFilter('pending')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>รอส่ง ({pendingOrders.length})</span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>ทั้งหมด ({orders.length})</span>
          </button>

          <button
            onClick={() => setFilter('delivered')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === 'delivered'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
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
