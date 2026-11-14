'use client';

import React, { useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  Filter,
  AlertCircle,
  Camera,
  ClipboardList,
  Phone,
  Navigation,
  MapPin,
  Building,
  Home,
  ShieldCheck,
  ChevronRight,
  Package,
  Plus,
  FileText,
  Bell
} from 'lucide-react';
import { Order, PaymentMethod } from '@/types/order';
import { DriverStopCard } from './DriverStopCard';
import { PaymentConfirmModal } from './PaymentConfirmModal';
import { DeliveryNotifyModal } from './DeliveryNotifyModal';
import { REAL_LOCATIONS, getLocationById } from '@/lib/locations';

interface DriverViewProps {
  orders: Order[];
  onToggleItemCheck: (orderId: string, itemId: string) => void;
  onConfirmDelivery: (
    orderId: string,
    collectedAmount: number,
    paymentMethod: PaymentMethod,
    deliveredAt: string,
    partialReason?: string,
    slipRef?: string
  ) => void;
  onRevertDelivery: (orderId: string) => void;
  onOpenPhotoModal?: () => void;
  onOpenPasteModal?: () => void;
  onOpenManualModal?: () => void;
}

export function DriverView({
  orders,
  onToggleItemCheck,
  onConfirmDelivery,
  onRevertDelivery,
  onOpenPhotoModal,
  onOpenPasteModal,
  onOpenManualModal
}: DriverViewProps) {
  // Sub-tab: 'manifest' (สรุปเส้นทาง & เลขที่บ้าน) vs 'cards' (คิวส่งทีละบ้าน)
  const [subTab, setSubTab] = useState<'manifest' | 'cards'>('manifest');

  // Filter for status
  const [filter, setFilter] = useState<'pending' | 'all' | 'delivered'>('pending');

  // Filter for location zone in manifest
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

  // Modal for payment confirmation
  const [activeConfirmOrder, setActiveConfirmOrder] = useState<Order | null>(null);

  // Modal for customer pre-arrival notification
  const [activeNotifyOrder, setActiveNotifyOrder] = useState<Order | null>(null);

  // Jump to specific stop card
  const [targetCardId, setTargetCardId] = useState<string | null>(null);

  const pendingOrders = orders.filter(o => o.deliveryStatus !== 'DELIVERED');
  const deliveredOrders = orders.filter(o => o.deliveryStatus === 'DELIVERED');

  const filteredByStatusOrders =
    filter === 'pending'
      ? pendingOrders
      : filter === 'delivered'
      ? deliveredOrders
      : orders;

  const displayedOrders =
    selectedLocationId === 'all'
      ? filteredByStatusOrders
      : filteredByStatusOrders.filter(o => (o.locationId || 'custom') === selectedLocationId);

  const totalCodPending = pendingOrders
    .filter(o => o.paymentStatus === 'COD')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Jump from Manifest to Cards view
  const handleJumpToCard = (orderId: string) => {
    setTargetCardId(orderId);
    setSubTab('cards');
    setTimeout(() => {
      const el = document.getElementById(`stop-card-${orderId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleOpenGoogleMaps = (order: Order) => {
    const loc = getLocationById(order.locationId);
    const parts = [
      loc?.name || '',
      order.building ? `ตึก ${order.building}` : '',
      order.soi ? `ซอย ${order.soi}` : '',
      `บ้านเลขที่ ${order.houseNumber}`
    ].filter(Boolean);
    const query = parts.join(' ') || `${order.houseNumber} ${order.soi}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3.5 max-w-2xl mx-auto pb-12">
      {/* Driver Quick Status & Quick Input Header - Clean Modern Styling */}
      <div className="bg-white text-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-slate-900 leading-tight">
                ที่ต้องส่งวันนี้
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                เหลืออีก <strong className="text-amber-800 font-bold">{pendingOrders.length}</strong> หลัง • ส่งแล้ว {deliveredOrders.length}/{orders.length}
              </p>
            </div>
          </div>

          {/* COD Pending Box */}
          <div className="text-right bg-amber-50/80 px-3 py-1.5 rounded-2xl">
            <p className="text-[10px] text-amber-800 uppercase font-bold">COD รอเก็บ</p>
            <p className="text-base sm:text-lg font-black text-amber-950 font-display leading-tight">
              ฿{totalCodPending.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Quick Actions: Direct Input on Delivery Tab (LINE Paste, Manual Key, Photo Scan) */}
        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-slate-100">
          {onOpenPasteModal && (
            <button
              type="button"
              onClick={onOpenPasteModal}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all"
              title="ก็อปข้อความจาก LINE มาวางสกัดออเดอร์ทันที"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>วางแชท LINE</span>
            </button>
          )}

          {onOpenManualModal && (
            <button
              type="button"
              onClick={onOpenManualModal}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all"
              title="พิมพ์เพิ่มบ้านเลขที่หรือลูกค้าใหม่ด้วยตัวเอง"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>คีย์เอง</span>
            </button>
          )}

          {onOpenPhotoModal && (
            <button
              type="button"
              onClick={onOpenPhotoModal}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all"
              title="ถ่ายรูปโพยหรือรูปออเดอร์ให้ AI สแกน"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>สแกนรูป</span>
            </button>
          )}
        </div>

        {/* Sub-tabs Selection Header */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setSubTab('manifest')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                subTab === 'manifest'
                  ? 'bg-white text-emerald-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <span>📋 สรุปเส้นทาง & เลขที่บ้าน</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('cards')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                subTab === 'cards'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4 text-teal-600" />
              <span>🛵 คิวส่งทีละบ้าน ({pendingOrders.length})</span>
            </button>
          </div>
        </div>

        {/* Filter Pills (Status: Pending, All, Delivered) */}
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          <button
            onClick={() => setFilter('pending')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === 'pending'
                ? 'bg-amber-100/90 text-amber-900 border border-amber-300 shadow-xs font-bold'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>รอส่ง ({pendingOrders.length})</span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === 'all'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs font-bold'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>ทั้งหมด ({orders.length})</span>
          </button>

          <button
            onClick={() => setFilter('delivered')}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              filter === 'delivered'
                ? 'bg-teal-100 text-teal-900 border border-teal-300 shadow-xs font-bold'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
            <span>ส่งแล้ว ({deliveredOrders.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: 📋 สรุปเส้นทาง & เลขที่บ้าน (House Manifest Summary) */}
      {subTab === 'manifest' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Location filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedLocationId('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                selectedLocationId === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              ทั้งหมด ({filteredByStatusOrders.length})
            </button>
            {REAL_LOCATIONS.map(loc => {
              const count = filteredByStatusOrders.filter(o => o.locationId === loc.id).length;
              if (count === 0) return null;
              const isSel = selectedLocationId === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocationId(loc.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border flex items-center gap-1 ${
                    isSel
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <span>{loc.type === 'condo' ? '🏢' : '🏡'}</span>
                  <span>{loc.name.split(' (')[0]}</span>
                  <span className="opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {displayedOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800">ยังไม่มีรายการส่งของในระบบ</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                คุณสามารถกด <strong>"วางแชท LINE"</strong>, <strong>"คีย์เอง"</strong> หรือ <strong>"สแกนรูป"</strong> ด้านบนเพื่อเพิ่มออเดอร์ได้ทันที
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedOrders.map(order => {
                const isDelivered = order.deliveryStatus === 'DELIVERED';
                const isPaid = order.paymentStatus === 'PAID';
                const locConfig = getLocationById(order.locationId);

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                      isDelivered
                        ? 'border-emerald-200 bg-emerald-50/15'
                        : 'border-slate-200/80 shadow-xs hover:border-emerald-400'
                    }`}
                  >
                    {/* Manifest Card Header */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        {/* Stop Number & House Number */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-800 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-xl tracking-wider">
                              STOP #{order.stopNumber}
                            </span>
                            {locConfig && (
                              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                {locConfig.type === 'condo' ? '🏢' : '🏡'} {locConfig.name}
                              </span>
                            )}
                          </div>

                          {/* Large Prominent House Number */}
                          <div className="pt-1">
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight leading-none">
                              {order.houseNumber}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                              {order.building && (
                                <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-semibold">
                                  {order.building}
                                </span>
                              )}
                              {order.soi && (
                                <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                                  {order.soi}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Payment & Delivery Status Badges */}
                        <div className="text-right space-y-1.5 flex flex-col items-end">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> โอนแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full text-xs font-bold">
                              💰 COD ฿{order.totalAmount.toLocaleString()}
                            </span>
                          )}

                          <div>
                            {isDelivered ? (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                ✓ ส่งสำเร็จ {order.deliveredAt?.split('T')[1]?.slice(0, 5) || ''}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                ⏳ รอส่ง
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Customer Info (ส่งให้ใคร) */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="text-xs">
                          <span className="text-slate-400">ผู้รับ: </span>
                          <strong className="text-slate-800 font-bold">{order.customerName}</strong>
                          {order.phone && (
                            <span className="text-slate-500 ml-1.5">({order.phone})</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {order.phone && (
                            <a
                              href={`tel:${order.phone}`}
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all"
                              title="โทรหาลูกค้า"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenGoogleMaps(order)}
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-all"
                            title="เปิด Google Maps"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveNotifyOrder(order)}
                            className="p-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl transition-all"
                            title="แจ้งเตือนลูกค้าก่อนส่ง (LINE / SMS / Copy)"
                          >
                            <Bell className="w-3.5 h-3.5 text-amber-700" />
                          </button>
                        </div>
                      </div>

                      {/* Items List (ส่งอะไรบ้าง) */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-500" /> ของที่ต้องส่ง ({order.items.length} รายการ):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {order.items.map(item => (
                            <span
                              key={item.id}
                              className={`text-xs px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                                item.checked
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                  : 'bg-emerald-50/70 text-emerald-900 border-emerald-200 font-medium'
                              }`}
                            >
                              <span>{item.name}</span>
                              <strong className="font-bold text-emerald-800">
                                {item.quantity} {item.unit}
                              </strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Jump to Stop Card Action Button */}
                      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleJumpToCard(order.id)}
                          className="w-full py-2 px-3 bg-slate-50 hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 hover:border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <span>🛵 เปิดการ์ดส่งของบ้านนี้ (ติ๊กของ / บันทึกส่ง)</span>
                          <ChevronRight className="w-4 h-4 text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: 🛵 คิวส่งทีละบ้าน (Detailed Driver Stop Cards) */}
      {subTab === 'cards' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {displayedOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800">ไม่มีรายการส่งของในสถานะนี้</h3>
              <p className="text-xs text-slate-500">
                เมื่อมีออเดอร์ในระบบ คุณสามารถตรวจเช็กของทีละชิ้น และกดยืนยันการชำระเงิน One-Tap ได้ทันที
              </p>
            </div>
          ) : (
            displayedOrders.map(order => (
              <div key={order.id} id={`stop-card-${order.id}`}>
                <DriverStopCard
                  order={order}
                  onToggleItemCheck={onToggleItemCheck}
                  onOpenConfirmModal={orderToConfirm => setActiveConfirmOrder(orderToConfirm)}
                  onRevertDelivery={onRevertDelivery}
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {activeConfirmOrder && (
        <PaymentConfirmModal
          order={activeConfirmOrder}
          isOpen={Boolean(activeConfirmOrder)}
          onClose={() => setActiveConfirmOrder(null)}
          usedSlipRefs={orders.map(o => o.slipRef).filter((r): r is string => Boolean(r))}
          onConfirmDelivery={(orderId, collectedAmount, paymentMethod, deliveredAt, partialReason, slipRef) => {
            onConfirmDelivery(orderId, collectedAmount, paymentMethod, deliveredAt, partialReason, slipRef);
            setActiveConfirmOrder(null);
          }}
        />
      )}

      {/* Customer Pre-Arrival Notification Modal */}
      {activeNotifyOrder && (
        <DeliveryNotifyModal
          order={activeNotifyOrder}
          isOpen={Boolean(activeNotifyOrder)}
          onClose={() => setActiveNotifyOrder(null)}
        />
      )}
    </div>
  );
}
