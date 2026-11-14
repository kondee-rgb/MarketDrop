'use client';

import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, Check, ClipboardList, CheckCircle2 } from 'lucide-react';
import { parseBulkOrderText } from '@/lib/line-parser';
import { Order, OrderItem, ParsedOrderDraft } from '@/types/order';

interface LinePasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrders: (newOrders: Order[]) => void;
  existingOrdersCount: number;
}

const SAMPLE_SINGLE_TEXT = `บ้าน 45/12 ซอย 3
คุณวิภา 081-9988776
- หมูบดอนามัย 1 กก.
- ผักบุ้งจีน 2 กำ
- ไข่ไก่เบอร์ 2 1 แผง
ยอด 245 บาท โอนแล้วครับ
แขวนไว้ที่รั้วบ้าน`;

const SAMPLE_BULK_TEXT = `ออเดอร์ 1
บ้าน 12/10 ซอย 2 คุณเอก 0841112233
กะเพรา 3 กำ
อกไก่ 1 กก.
รวม 160 บาท โอนแล้ว
แขวนไว้ที่รั้ว

ออเดอร์ 2
บ้าน 12/2 ซอย 2 น้าพร 0867778899
แตงกวา 1 โล
พริกขี้หนู 1 ขีด
หมูสามชั้น 1 โล
รวม 295 เก็บปลายทาง`;

export function LinePasteModal({
  isOpen,
  onClose,
  onAddOrders,
  existingOrdersCount
}: LinePasteModalProps) {
  const [inputText, setInputText] = useState('');
  const [parsedDrafts, setParsedDrafts] = useState<ParsedOrderDraft[]>([]);
  const [isParsed, setIsParsed] = useState(false);

  if (!isOpen) return null;

  const handleParse = () => {
    if (!inputText.trim()) return;
    const drafts = parseBulkOrderText(inputText);
    setParsedDrafts(drafts);
    setIsParsed(true);
  };

  const handleUpdateDraft = (index: number, updated: Partial<ParsedOrderDraft>) => {
    setParsedDrafts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updated };
      return next;
    });
  };

  const handleUpdateItem = (orderIdx: number, itemIdx: number, updated: Partial<OrderItem>) => {
    setParsedDrafts(prev => {
      const next = [...prev];
      const items = [...next[orderIdx].items];
      items[itemIdx] = { ...items[itemIdx], ...updated };
      next[orderIdx] = { ...next[orderIdx], items };
      return next;
    });
  };

  const handleAddItem = (orderIdx: number) => {
    setParsedDrafts(prev => {
      const next = [...prev];
      const items = [
        ...next[orderIdx].items,
        {
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: '',
          quantity: 1,
          unit: 'กก.',
          checked: false
        }
      ];
      next[orderIdx] = { ...next[orderIdx], items };
      return next;
    });
  };

  const handleRemoveItem = (orderIdx: number, itemIdx: number) => {
    setParsedDrafts(prev => {
      const next = [...prev];
      const items = next[orderIdx].items.filter((_, idx) => idx !== itemIdx);
      next[orderIdx] = { ...next[orderIdx], items };
      return next;
    });
  };

  const handleRemoveDraft = (index: number) => {
    setParsedDrafts(prev => prev.filter((_, idx) => idx !== index));
    if (parsedDrafts.length <= 1) {
      setIsParsed(false);
    }
  };

  const handleConfirmAll = () => {
    if (parsedDrafts.length === 0) return;

    const newOrders: Order[] = parsedDrafts.map((draft, idx) => {
      const now = new Date().toISOString();
      return {
        id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        stopNumber: existingOrdersCount + idx + 1,
        houseNumber: draft.houseNumber || 'ไม่ระบุ',
        soi: draft.soi || 'ไม่ระบุซอย',
        customerName: draft.customerName || 'ลูกค้า',
        phone: draft.phone || '',
        items: draft.items.length > 0 ? draft.items : [{ id: 'item_1', name: 'สินค้าสดรวม', quantity: 1, unit: 'ชุด', checked: false }],
        totalAmount: draft.totalAmount || 0,
        paymentStatus: draft.paymentStatus,
        collectedAmount: draft.paymentStatus === 'PAID' ? draft.totalAmount : 0,
        paymentMethod: draft.paymentStatus === 'PAID' ? 'TRANSFER' : null,
        deliveryStatus: 'PENDING',
        deliveredAt: null,
        notes: draft.notes || '',
        syncedToSheets: false,
        createdAt: now,
        updatedAt: now
      };
    });

    onAddOrders(newOrders);
    handleClose();
  };

  const handleClose = () => {
    setInputText('');
    setParsedDrafts([]);
    setIsParsed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 w-full max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Header - Pastel */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 border-b border-emerald-100 text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-200 shadow-xs">
              <ClipboardList className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-slate-800">วางข้อความสั่งซื้อจาก LINE (Quick-Paste)</h2>
              <p className="text-xs text-slate-500">
                ระบบ Heuristic + Regex อัจฉริยะ แกะบ้านเลขที่ รายการสินค้า และยอดเงินให้อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!isParsed ? (
            /* Input Step */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>วางข้อความแชทจาก LINE (รองรับทั้ง 1 ออเดอร์ หรือหลายออเดอร์พร้อมกัน)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInputText(SAMPLE_SINGLE_TEXT)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md font-medium transition-colors"
                  >
                    ใส่ตัวอย่าง 1 ออเดอร์
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputText(SAMPLE_BULK_TEXT)}
                    className="text-xs text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md font-medium transition-colors"
                  >
                    ใส่ตัวอย่างหลายออเดอร์
                  </button>
                </div>
              </div>

              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="วางข้อความสั่งซื้อ เช่น:&#10;บ้าน 45/12 ซอย 3&#10;คุณวิภา 081-9988776&#10;- หมูบด 1 กก.&#10;- ผักบุ้ง 2 กำ&#10;ยอด 245 บาท โอนแล้วครับ"
                rows={9}
                className="w-full p-3.5 text-sm font-sans rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 bg-slate-50/50"
              />

              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1">
                  💡 คำแนะนำการใช้งาน:
                </p>
                <p>• หากลูกค้าสั่งหลายออเดอร์ สามารถวางติดกันได้เลย ระบบจะแยกตามบรรทัดว่างหรือหัวข้อให้อัตโนมัติ</p>
                <p>• ตรวจจับคำว่า &ldquo;โอนแล้ว&rdquo;, &ldquo;แนบสลิป&rdquo; หรือ &ldquo;เก็บปลายทาง&rdquo; เพื่อกำหนดสถานะชำระเงิน</p>
              </div>
            </div>
          ) : (
            /* Parsed Preview Step */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm font-bold">
                    สกัดข้อมูลสำเร็จ {parsedDrafts.length} ออเดอร์
                  </span>
                  <span className="text-xs text-emerald-700">
                    (กรุณาตรวจทานและแก้ไขก่อนกดยืนยันบันทึก)
                  </span>
                </div>
                <button
                  onClick={() => setIsParsed(false)}
                  className="text-xs text-slate-600 hover:text-slate-900 underline font-medium"
                >
                  แก้ไขข้อความดิบ
                </button>
              </div>

              {/* List of Parsed Cards */}
              <div className="space-y-4">
                {parsedDrafts.map((draft, orderIdx) => (
                  <div
                    key={orderIdx}
                    className="border border-slate-300 rounded-xl p-4 bg-white shadow-sm space-y-3 relative hover:border-emerald-400 transition-colors"
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                          {orderIdx + 1}
                        </span>
                        <span>ออเดอร์ที่ {orderIdx + 1}</span>
                      </span>
                      {parsedDrafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDraft(orderIdx)}
                          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> ลบรายการนี้
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">🏠 บ้านเลขที่</label>
                        <input
                          type="text"
                          value={draft.houseNumber}
                          onChange={e => handleUpdateDraft(orderIdx, { houseNumber: e.target.value })}
                          placeholder="เช่น 12/1 หรือ 45/10"
                          className="w-full mt-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">📍 ซอย / หมู่บ้าน / โซน</label>
                        <input
                          type="text"
                          value={draft.soi}
                          onChange={e => handleUpdateDraft(orderIdx, { soi: e.target.value })}
                          placeholder="เช่น ซอย 3 หรือ มบ.พฤกษา"
                          className="w-full mt-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">👤 ชื่อลูกค้า</label>
                        <input
                          type="text"
                          value={draft.customerName}
                          onChange={e => handleUpdateDraft(orderIdx, { customerName: e.target.value })}
                          placeholder="เช่น คุณวิภา"
                          className="w-full mt-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">📞 เบอร์โทรศัพท์</label>
                        <input
                          type="text"
                          value={draft.phone}
                          onChange={e => handleUpdateDraft(orderIdx, { phone: e.target.value })}
                          placeholder="08x-xxx-xxxx"
                          className="w-full mt-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-600">
                          🧺 รายการสินค้า ({draft.items.length} อย่าง)
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddItem(orderIdx)}
                          className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> เพิ่มสินค้า
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {draft.items.map((item, itemIdx) => (
                          <div key={item.id || itemIdx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => handleUpdateItem(orderIdx, itemIdx, { name: e.target.value })}
                              placeholder="ชื่อสินค้า เช่น ผักกาด"
                              className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                            />
                            <input
                              type="text"
                              value={item.quantity}
                              onChange={e => handleUpdateItem(orderIdx, itemIdx, { quantity: e.target.value })}
                              placeholder="จำนวน"
                              className="w-16 px-2 py-1 text-xs rounded border border-slate-300 bg-white text-center"
                            />
                            <input
                              type="text"
                              value={item.unit}
                              onChange={e => handleUpdateItem(orderIdx, itemIdx, { unit: e.target.value })}
                              placeholder="หน่วย"
                              className="w-16 px-2 py-1 text-xs rounded border border-slate-300 bg-white text-center"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(orderIdx, itemIdx)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total & Payment status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">💰 ยอดเงินรวม (บาท)</label>
                        <input
                          type="number"
                          value={draft.totalAmount || ''}
                          onChange={e => handleUpdateDraft(orderIdx, { totalAmount: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-full mt-1 px-3 py-1.5 text-base font-bold text-slate-900 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">💳 สถานะการชำระเงิน</label>
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateDraft(orderIdx, { paymentStatus: 'PAID' })}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                              draft.paymentStatus === 'PAID'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            🟢 โอนแล้ว
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateDraft(orderIdx, { paymentStatus: 'COD' })}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                              draft.paymentStatus === 'COD'
                                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            🟠 เก็บปลายทาง (COD)
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">📝 หมายเหตุการส่ง</label>
                      <input
                        type="text"
                        value={draft.notes}
                        onChange={e => handleUpdateDraft(orderIdx, { notes: e.target.value })}
                        placeholder="เช่น วางไว้หน้าบ้าน, แขวนไว้ที่รั้ว"
                        className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            ยกเลิก
          </button>

          {!isParsed ? (
            <button
              type="button"
              disabled={!inputText.trim()}
              onClick={handleParse}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-700/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>วิเคราะห์ข้อความ (Parse)</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={parsedDrafts.length === 0}
              onClick={handleConfirmAll}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-700/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกเข้าคิวส่ง ({parsedDrafts.length} ออเดอร์)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
