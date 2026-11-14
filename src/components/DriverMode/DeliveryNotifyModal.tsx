'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Bell,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Send,
  Phone,
  Clock,
  Sparkles
} from 'lucide-react';
import { Order } from '@/types/order';
import { getDeliveryNotificationData } from '@/lib/customer-notify';

interface DeliveryNotifyModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeliveryNotifyModal({
  order,
  isOpen,
  onClose
}: DeliveryNotifyModalProps) {
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [driverName, setDriverName] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  const notificationData = useMemo(() => {
    if (!order) return null;
    return getDeliveryNotificationData(order, {
      estimatedMinutes,
      driverName: driverName.trim() || undefined,
      customNote: customNote.trim() || undefined
    });
  }, [order, estimatedMinutes, driverName, customNote]);

  if (!isOpen || !order || !notificationData) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notificationData.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleLineShare = () => {
    window.open(notificationData.lineShareUrl, '_blank');
  };

  const handleSendSms = () => {
    window.location.href = notificationData.smsUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-xl border border-emerald-100 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
        {/* Header - Pastel */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 border-b border-emerald-100 text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg font-display text-slate-800">
                แจ้งเตือนลูกค้าก่อนส่งถึงบ้าน
              </h3>
              <p className="text-xs text-slate-500">
                ส่งให้: <strong className="text-slate-800">{order.customerName}</strong> ({order.houseNumber})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick ETA Selector Pills */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>ระบุเวลาใกล้ถึงบ้าน:</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setEstimatedMinutes(undefined)}
                className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                  estimatedMinutes === undefined
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                กำลังนำส่ง
              </button>
              <button
                type="button"
                onClick={() => setEstimatedMinutes(5)}
                className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                  estimatedMinutes === 5
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                อีก 5 นาที
              </button>
              <button
                type="button"
                onClick={() => setEstimatedMinutes(10)}
                className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                  estimatedMinutes === 10
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                อีก 10 นาที
              </button>
              <button
                type="button"
                onClick={() => setEstimatedMinutes(15)}
                className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                  estimatedMinutes === 15
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                อีก 15 นาที
              </button>
            </div>
          </div>

          {/* Payment Status Pill Callout */}
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
              order.paymentStatus === 'COD'
                ? 'bg-amber-50/80 border-amber-200/90 text-amber-950'
                : 'bg-emerald-50/80 border-emerald-200/90 text-emerald-950'
            }`}
          >
            <div>
              <span className="font-bold block">
                {order.paymentStatus === 'COD'
                  ? '🟠 เก็บเงินปลายทาง (COD)'
                  : '🟢 ชำระเงินเรียบร้อยแล้ว'}
              </span>
              <span className="text-[11px] opacity-80">
                {order.paymentStatus === 'COD'
                  ? 'ระบบระบุยอดและขอให้เตรียมเงินสด/QR อัตโนมัติ'
                  : 'ระบุในข้อความว่าโอนแล้ว ไม่ต้องเก็บเงินซ้ำ'}
              </span>
            </div>
            <span className="text-base font-black font-display">
              ฿{(order.totalAmount || 0).toLocaleString()}
            </span>
          </div>

          {/* Message Preview Box */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>ตัวอย่างข้อความที่จะส่ง:</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกข้อความ</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {notificationData.text}
            </div>
          </div>
        </div>

        {/* Action Buttons Footer - 1-Click Notifications */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* 1-Click LINE Share Button */}
            <button
              type="button"
              onClick={handleLineShare}
              className="py-3 px-3 bg-[#06C755] hover:bg-[#05b34c] active:scale-95 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>แชร์เข้า LINE</span>
            </button>

            {/* 1-Click SMS Button */}
            {notificationData.phone ? (
              <button
                type="button"
                onClick={handleSendSms}
                className="py-3 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>ส่ง SMS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopy}
                className="py-3 px-3 bg-slate-700 hover:bg-slate-800 active:scale-95 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Copy className="w-4 h-4" />
                <span>{isCopied ? 'คัดลอกแล้ว!' : 'คัดลอกส่งเอง'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 rounded-xl transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
