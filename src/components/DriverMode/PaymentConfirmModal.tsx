'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Banknote, QrCode, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order, PaymentMethod } from '@/types/order';

interface PaymentConfirmModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelivery: (
    orderId: string,
    collectedAmount: number,
    paymentMethod: PaymentMethod,
    deliveredAt: string,
    partialReason?: string
  ) => void;
}

export function PaymentConfirmModal({
  order,
  isOpen,
  onClose,
  onConfirmDelivery
}: PaymentConfirmModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [partialReason, setPartialReason] = useState<string>('');
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState<string>('');

  useEffect(() => {
    if (order && isOpen) {
      // ถ้าออเดอร์โอนแล้ว ให้ตั้งต้นเป็น TRANSFER
      if (order.paymentStatus === 'PAID') {
        setSelectedMethod('TRANSFER');
        setCollectedAmount(order.totalAmount);
      } else {
        setSelectedMethod('CASH');
        setCollectedAmount(order.totalAmount);
      }
      setPartialReason('');

      const now = new Date();
      const dateFormatted = now.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const timeFormatted = now.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      setCurrentTimeFormatted(`${dateFormatted} เวลา ${timeFormatted} น.`);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const isPaidAlready = order.paymentStatus === 'PAID';

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    if (method === 'TRANSFER' || method === 'CASH' || method === 'QR_SCAN') {
      setCollectedAmount(order.totalAmount);
    } else if (method === 'UNPAID') {
      setCollectedAmount(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // จุดประกาย Confetti ฉลองส่งสำเร็จ!
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    onConfirmDelivery(
      order.id,
      collectedAmount,
      selectedMethod,
      currentTimeFormatted,
      partialReason
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm">
              #{order.stopNumber}
            </span>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg font-display">
                ยืนยันการส่งและบันทึกเงิน
              </h3>
              <p className="text-xs text-slate-400">
                บ้านเลขที่ <span className="text-white font-bold">{order.houseNumber}</span> ({order.soi})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Order Summary Pill */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">ลูกค้า: {order.customerName}</p>
              <p className="text-xs text-slate-500">จำนวนของ: {order.items.length} รายการ</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-500 font-medium">ยอดตามบิล</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight font-display">
                ฿{order.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Payment Selection Options */}
          {isPaidAlready ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">ออเดอร์นี้ลูกค้าโอนเงินเรียบร้อยแล้ว</p>
                  <p className="text-xs text-emerald-700">ไม่ต้องเก็บเงินสดหน้าบ้าน สามารถส่งของได้ทันที</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-800 block">
                เลือกรูปแบบการรับเงินหน้าร้าน / หน้าบ้าน:
              </label>

              {/* Option 1: Cash Complete */}
              <button
                type="button"
                onClick={() => handleSelectMethod('CASH')}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  selectedMethod === 'CASH'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedMethod === 'CASH' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">รับเงินสดครบตามจำนวน</p>
                    <p className="text-xs text-slate-500">นับเงินสดครบ ฿{order.totalAmount} บาท</p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'CASH' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  }`}
                >
                  {selectedMethod === 'CASH' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>

              {/* Option 2: Scan QR */}
              <button
                type="button"
                onClick={() => handleSelectMethod('QR_SCAN')}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  selectedMethod === 'QR_SCAN'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedMethod === 'QR_SCAN' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">ลูกค้าสแกนจ่าย QR หน้าบ้าน</p>
                    <p className="text-xs text-slate-500">สแกน PromptPay ฿{order.totalAmount} และตรวจสลิปแล้ว</p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'QR_SCAN' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  }`}
                >
                  {selectedMethod === 'QR_SCAN' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>

              {/* Option 3: Partial or Debt */}
              <button
                type="button"
                onClick={() => handleSelectMethod('UNPAID')}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  selectedMethod === 'UNPAID'
                    ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedMethod === 'UNPAID' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">ค้างชำระ / จ่ายไม่ครบ / โอนตามทีหลัง</p>
                    <p className="text-xs text-slate-500">ระบุยอดที่จ่ายจริงและเหตุผล</p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'UNPAID' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                  }`}
                >
                  {selectedMethod === 'UNPAID' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            </div>
          )}

          {/* If UNPAID or Partial: show collected amount input & reason */}
          {selectedMethod === 'UNPAID' && (
            <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-amber-950 block">ยอดเงินที่เก็บได้จริง (บาท):</label>
                <input
                  type="number"
                  min="0"
                  max={order.totalAmount}
                  value={collectedAmount}
                  onChange={e => setCollectedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 text-lg font-black rounded-xl border border-amber-400 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-amber-950 block">ระบุสาเหตุ / ข้อความหมายเหตุ:</label>
                <input
                  type="text"
                  value={partialReason}
                  onChange={e => setPartialReason(e.target.value)}
                  placeholder="เช่น ไม่อยู่บ้าน ติดต่อไม่ได้ ขอนัดโอนเย็นนี้"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-amber-400 bg-white"
                />
              </div>
            </div>
          )}

          {/* Timestamp Indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>บันทึกเวลาส่งอัตโนมัติ: <strong className="text-slate-800">{currentTimeFormatted}</strong></span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl font-black text-base sm:text-lg shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 transition-all font-display"
            >
              <CheckCircle className="w-6 h-6" />
              <span>ยืนยันส่งสำเร็จ & บันทึกการเงิน</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
