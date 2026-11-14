'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Bell,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Send,
  Clock,
  Zap,
  Plus,
  RotateCcw,
  User
} from 'lucide-react';
import { Order } from '@/types/order';
import {
  getDeliveryNotificationData,
  generateLineShareLink,
  generateSmsLink,
  fillMessageTemplate,
  loadQuickMessages,
  saveQuickMessages,
  loadDriverName,
  saveDriverName
} from '@/lib/customer-notify';

interface DeliveryNotifyModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const ETA_OPTIONS: { label: string; value: number | undefined }[] = [
  { label: 'กำลังนำส่ง', value: undefined },
  { label: 'อีก 5 นาที', value: 5 },
  { label: 'อีก 10 นาที', value: 10 },
  { label: 'อีก 15 นาที', value: 15 }
];

export function DeliveryNotifyModal({
  order,
  isOpen,
  onClose
}: DeliveryNotifyModalProps) {
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [driverName, setDriverName] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [quickMessages, setQuickMessages] = useState<string[]>([]);
  const [isEditingQuick, setIsEditingQuick] = useState(false);

  useEffect(() => {
    setQuickMessages(loadQuickMessages());
    setDriverName(loadDriverName());
  }, []);

  const notificationData = useMemo(() => {
    if (!order) return null;
    return getDeliveryNotificationData(order, {
      estimatedMinutes,
      driverName: driverName.trim() || undefined
    });
  }, [order, estimatedMinutes, driverName]);

  // New customer → start from the auto text again
  const lastAutoText = useRef('');
  useEffect(() => {
    setMessage('');
  }, [order?.id]);

  // Refresh the auto text (ETA / driver name), but never overwrite what the user typed
  useEffect(() => {
    if (!notificationData) return;
    const prevAuto = lastAutoText.current;
    lastAutoText.current = notificationData.text;
    setMessage(m => (m === '' || m === prevAuto ? notificationData.text : m));
  }, [notificationData]);

  if (!isOpen || !order || !notificationData) return null;

  const finalText = message.trim() || notificationData.text;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // clipboard blocked — user can still long-press the textarea
    }
  };

  const handleLineShare = () => {
    window.open(generateLineShareLink(finalText), '_blank');
  };

  const handleSendSms = () => {
    window.location.href = generateSmsLink(notificationData.phone, finalText);
  };

  const updateQuickMessages = (next: string[]) => {
    setQuickMessages(next);
    saveQuickMessages(next);
  };

  const handleSaveAsQuick = () => {
    const raw = message.trim();
    if (!raw || quickMessages.includes(raw)) return;
    updateQuickMessages([...quickMessages, raw]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-xl border border-emerald-100 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300 pb-safe">
        {/* Grabber */}
        <div className="sm:hidden flex justify-center pt-2">
          <span className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>

        {/* Header - Pastel */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 border-b border-emerald-100 text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg font-display text-slate-800">
                ส่งข้อความหาลูกค้า
              </h3>
              <p className="text-xs text-slate-500">
                ถึง: <strong className="text-slate-800">{order.customerName}</strong> ({order.houseNumber})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
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
              <span>แจ้งเวลาถึงบ้าน (สร้างข้อความอัตโนมัติ):</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {ETA_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    // Tapping an ETA is an explicit "regenerate": clear so the effect fills in the new auto text
                    setEstimatedMinutes(opt.value);
                    setMessage(opt.value === estimatedMinutes && notificationData ? notificationData.text : '');
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all text-center ${
                    estimatedMinutes === opt.value
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Messages */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>ข้อความด่วน (แตะเพื่อใช้)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingQuick(v => !v)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded-lg"
              >
                {isEditingQuick ? 'เสร็จ' : 'แก้ไข'}
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
              {quickMessages.map((tpl, i) => (
                <div key={`${i}-${tpl}`} className="relative shrink-0 snap-start">
                  <button
                    type="button"
                    onClick={() => setMessage(fillMessageTemplate(tpl, order))}
                    className="max-w-[220px] text-left text-[11.5px] leading-snug px-3 py-2 rounded-2xl bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 line-clamp-2"
                  >
                    {fillMessageTemplate(tpl, order)}
                  </button>
                  {isEditingQuick && (
                    <button
                      type="button"
                      aria-label="ลบข้อความด่วน"
                      onClick={() => updateQuickMessages(quickMessages.filter((_, j) => j !== i))}
                      className="animate-in zoom-in-95 fade-in duration-200 absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center ring-2 ring-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {quickMessages.length === 0 && (
                <span className="text-[11px] text-slate-400 py-2">ยังไม่มีข้อความด่วน — พิมพ์ด้านล่างแล้วกด “บันทึกเป็นข้อความด่วน”</span>
              )}
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
            <span className="font-semibold">
              {order.paymentStatus === 'COD' ? '🟠 เก็บเงินปลายทาง (COD)' : '🟢 ชำระเงินเรียบร้อยแล้ว'}
            </span>
            <span className="text-base font-bold font-display tabular-nums">
              ฿{(order.totalAmount || 0).toLocaleString()}
            </span>
          </div>

          {/* Editable Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>ข้อความ (พิมพ์แก้ได้เลย):</span>
              </span>
              <button
                type="button"
                onClick={() => setMessage(notificationData.text)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-0.5 rounded-lg"
              >
                <RotateCcw className="w-3 h-3" />
                <span>ข้อความอัตโนมัติ</span>
              </button>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={7}
              className="w-full bg-slate-50 p-3.5 rounded-2xl text-[13px] text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-300 focus:bg-white transition-colors resize-none"
            />
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 bg-slate-50 rounded-xl px-2.5">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={driverName}
                  onChange={e => {
                    setDriverName(e.target.value);
                    saveDriverName(e.target.value);
                  }}
                  placeholder="ชื่อคนส่ง (ใส่ท้ายข้อความ)"
                  className="w-full bg-transparent py-1.5 text-xs focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveAsQuick}
                disabled={!message.trim() || quickMessages.includes(message.trim())}
                className="shrink-0 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl flex items-center gap-1 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>บันทึกเป็นข้อความด่วน</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleLineShare}
              className="py-3 px-2 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>LINE</span>
            </button>
            <button
              type="button"
              onClick={handleSendSms}
              disabled={!notificationData.phone}
              className="py-3 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 disabled:bg-slate-300"
            >
              <Send className="w-4 h-4" />
              <span>SMS</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="py-3 px-2 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-semibold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5"
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
            </button>
          </div>
          <p className="text-[10.5px] text-slate-400 text-center">
            ปุ่ม LINE จะเปิดแอป LINE ให้เลือกแชทลูกค้า แล้วกดส่ง 1 ครั้ง
          </p>
        </div>
      </div>
    </div>
  );
}
