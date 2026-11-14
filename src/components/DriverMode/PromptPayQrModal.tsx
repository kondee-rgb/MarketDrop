'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Share2, Pencil, QrCode } from 'lucide-react';
import {
  buildPromptPayPayload,
  classifyPromptPayId,
  maskPromptPayId,
  loadPromptPayId,
  savePromptPayId
} from '@/lib/promptpay';

interface PromptPayQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number; // starting amount (the bill); editable in the sheet
  title?: string; // e.g. "51/3 · คุณวิภา"
}

export function PromptPayQrModal({ isOpen, onClose, amount, title }: PromptPayQrModalProps) {
  const [ppId, setPpId] = useState('');
  const [idDraft, setIdDraft] = useState('');
  const [editingId, setEditingId] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const saved = loadPromptPayId();
    setPpId(saved);
    setIdDraft(saved);
    setEditingId(!saved);
    setAmountText(amount > 0 ? String(amount) : '');
    setShareMsg(null);
  }, [isOpen, amount]);

  const amountNum = parseFloat(amountText.replace(/,/g, ''));
  const validAmount = Number.isFinite(amountNum) && amountNum > 0 ? Math.round(amountNum * 100) / 100 : 0;

  useEffect(() => {
    if (!isOpen || !ppId || editingId) {
      setQrUrl(null);
      return;
    }
    let alive = true;
    QRCode.toDataURL(buildPromptPayPayload(ppId, validAmount || undefined), {
      margin: 2,
      width: 560,
      errorCorrectionLevel: 'M'
    })
      .then(url => alive && setQrUrl(url))
      .catch(() => alive && setQrUrl(null));
    return () => {
      alive = false;
    };
  }, [isOpen, ppId, editingId, validAmount]);

  if (!isOpen) return null;

  const idValid = classifyPromptPayId(idDraft) !== null;

  const handleSaveId = () => {
    if (!idValid) return;
    const clean = idDraft.replace(/\D/g, '');
    savePromptPayId(clean);
    setPpId(clean);
    setEditingId(false);
  };

  const handleShare = async () => {
    if (!qrUrl) return;
    const blob = await (await fetch(qrUrl)).blob();
    const file = new File([blob], `promptpay-${validAmount || 'qr'}.png`, { type: 'image/png' });
    const text = validAmount ? `สแกนจ่ายพร้อมเพย์ ยอด ${validAmount.toLocaleString('th-TH')} บาท` : 'สแกนจ่ายพร้อมเพย์';
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch {
      return; // user cancelled the share sheet
    }
    // no file sharing (e.g. desktop): save the image instead
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = file.name;
    a.click();
    setShareMsg('บันทึกรูป QR แล้ว — ส่งต่อทาง LINE ได้');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="QR พร้อมเพย์"
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-xl w-full max-w-sm max-h-[94dvh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-300 pb-safe"
      >
        <div className="sm:hidden flex justify-center pt-2">
          <span className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-slate-500" aria-hidden="true" /> สแกนจ่ายพร้อมเพย์
            </h3>
            {title && <p className="text-xs text-slate-500">{title}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {editingId ? (
            <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
              <label htmlFor="pp-id" className="text-sm font-medium text-slate-800 block">
                เบอร์มือถือ หรือเลขบัตรประชาชน ที่ผูกพร้อมเพย์ของร้าน
              </label>
              <input
                id="pp-id"
                inputMode="numeric"
                autoComplete="off"
                value={idDraft}
                onChange={e => setIdDraft(e.target.value)}
                placeholder="เช่น 0812345678"
                className="w-full px-3 py-3 text-base rounded-xl bg-white ring-1 ring-slate-200 border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 tabular-nums"
              />
              {idDraft && !idValid && <p className="text-xs text-rose-600">ใส่เบอร์ 10 หลัก หรือเลข 13 หลัก</p>}
              <p className="text-[11px] text-slate-400">ตั้งครั้งเดียว จำไว้ในเครื่องนี้</p>
              <div className="flex justify-end gap-2">
                {ppId && (
                  <button type="button" onClick={() => setEditingId(false)} className="px-3 py-2 text-sm text-slate-500">
                    ยกเลิก
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveId}
                  disabled={!idValid}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl disabled:opacity-40"
                >
                  บันทึก
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Amount: starts at the bill total, can be changed */}
              <div>
                <label htmlFor="pp-amount" className="text-xs text-slate-500 block mb-1">ยอดเงิน (แก้ได้)</label>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 focus-within:ring-2 focus-within:ring-emerald-500/40">
                  <span className="text-2xl font-semibold text-slate-400">฿</span>
                  <input
                    id="pp-amount"
                    inputMode="decimal"
                    value={amountText}
                    onChange={e => setAmountText(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent py-3 text-3xl font-semibold text-slate-900 tabular-nums focus:outline-none"
                  />
                </div>
                {!validAmount && <p className="text-[11px] text-amber-700 mt-1">ไม่ใส่ยอด = ลูกค้าพิมพ์ยอดเองตอนสแกน</p>}
              </div>

              <div className="flex justify-center">
                {qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data: URL generated on device
                  <img src={qrUrl} alt={`QR พร้อมเพย์ ยอด ${validAmount} บาท`} className="w-64 h-64 rounded-2xl ring-1 ring-slate-200" />
                ) : (
                  <div className="w-64 h-64 rounded-2xl bg-slate-100 animate-pulse" />
                )}
              </div>

              <div className="text-center">
                <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                  {validAmount ? `฿${validAmount.toLocaleString('th-TH', { minimumFractionDigits: validAmount % 1 ? 2 : 0 })}` : 'ไม่ระบุยอด'}
                </p>
                <button
                  type="button"
                  onClick={() => setEditingId(true)}
                  className="text-xs text-slate-500 inline-flex items-center gap-1 mt-0.5 hover:text-slate-800"
                >
                  พร้อมเพย์ {maskPromptPayId(ppId)} <Pencil className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleShare}
                disabled={!qrUrl}
                className="w-full py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" /> ส่ง QR ให้ลูกค้า (LINE / บันทึกรูป)
              </button>
              {shareMsg && <p className="text-xs text-center text-emerald-700">{shareMsg}</p>}
              <p className="text-[11px] text-center text-slate-400">หลังลูกค้าโอน ตรวจสลิปได้ที่หน้า &ldquo;ยืนยันรับเงิน&rdquo;</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
