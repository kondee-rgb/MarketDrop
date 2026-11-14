'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, UserPlus, Edit3 } from 'lucide-react';
import { Order, OrderItem, PaymentStatus } from '@/types/order';

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveOrder: (order: Order) => void;
  initialOrder?: Order | null;
  existingOrdersCount: number;
}

export function ManualOrderModal({
  isOpen,
  onClose,
  onSaveOrder,
  initialOrder,
  existingOrdersCount
}: ManualOrderModalProps) {
  const [houseNumber, setHouseNumber] = useState('');
  const [soi, setSoi] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('COD');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { id: 'item_1', name: '', quantity: '1', unit: 'กก.', checked: false }
  ]);

  useEffect(() => {
    if (initialOrder) {
      setHouseNumber(initialOrder.houseNumber);
      setSoi(initialOrder.soi);
      setCustomerName(initialOrder.customerName);
      setPhone(initialOrder.phone);
      setTotalAmount(initialOrder.totalAmount);
      setPaymentStatus(initialOrder.paymentStatus);
      setNotes(initialOrder.notes);
      setItems(initialOrder.items && initialOrder.items.length > 0 ? initialOrder.items : [
        { id: 'item_1', name: '', quantity: '1', unit: 'กก.', checked: false }
      ]);
    } else {
      setHouseNumber('');
      setSoi('');
      setCustomerName('');
      setPhone('');
      setTotalAmount('');
      setPaymentStatus('COD');
      setNotes('');
      setItems([
        { id: `item_${Date.now()}`, name: '', quantity: '1', unit: 'กก.', checked: false }
      ]);
    }
  }, [initialOrder, isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        quantity: '1',
        unit: 'กก.',
        checked: false
      }
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItem = (idx: number, field: keyof OrderItem, val: string | number) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNumber.trim()) return;

    const now = new Date().toISOString();
    const cleanItems = items.filter(it => it.name.trim().length > 0);

    const savedOrder: Order = {
      id: initialOrder ? initialOrder.id : `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      stopNumber: initialOrder ? initialOrder.stopNumber : existingOrdersCount + 1,
      houseNumber: houseNumber.trim(),
      soi: soi.trim() || 'ไม่ระบุซอย',
      customerName: customerName.trim() || `ลูกค้าบ้าน ${houseNumber.trim()}`,
      phone: phone.trim(),
      items: cleanItems.length > 0 ? cleanItems : [{ id: 'item_1', name: 'สินค้าสดรวม', quantity: 1, unit: 'ชุด', checked: false }],
      totalAmount: typeof totalAmount === 'number' ? totalAmount : parseFloat(String(totalAmount)) || 0,
      paymentStatus,
      collectedAmount: initialOrder ? initialOrder.collectedAmount : (paymentStatus === 'PAID' ? (typeof totalAmount === 'number' ? totalAmount : 0) : 0),
      paymentMethod: initialOrder ? initialOrder.paymentMethod : (paymentStatus === 'PAID' ? 'TRANSFER' : null),
      deliveryStatus: initialOrder ? initialOrder.deliveryStatus : 'PENDING',
      deliveredAt: initialOrder ? initialOrder.deliveredAt : null,
      notes: notes.trim(),
      syncedToSheets: false,
      createdAt: initialOrder ? initialOrder.createdAt : now,
      updatedAt: now
    };

    onSaveOrder(savedOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              {initialOrder ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold font-display">
                {initialOrder ? 'แก้ไขข้อมูลออเดอร์' : 'เพิ่มออเดอร์ใหม่ (Manual Add)'}
              </h2>
              <p className="text-xs text-slate-400">กรอกข้อมูลที่อยู่ รายการของสด และยอดเงิน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700">🏠 บ้านเลขที่ *</label>
              <input
                type="text"
                required
                value={houseNumber}
                onChange={e => setHouseNumber(e.target.value)}
                placeholder="เช่น 12/1 หรือ 45/10"
                className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">📍 ซอย / หมู่บ้าน / โซน</label>
              <input
                type="text"
                value={soi}
                onChange={e => setSoi(e.target.value)}
                placeholder="เช่น ซอย 2, มบ.พฤกษา"
                className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">👤 ชื่อลูกค้า</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="เช่น คุณสมชาย"
                className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">📞 เบอร์โทรศัพท์</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="081-234-5678"
                className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">🧺 รายการสินค้าสด</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                    placeholder="ชื่อสินค้า เช่น ผักกาด, หมูบด"
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)}
                    placeholder="จำนวน"
                    className="w-16 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-center"
                  />
                  <input
                    type="text"
                    value={item.unit}
                    onChange={e => handleUpdateItem(idx, 'unit', e.target.value)}
                    placeholder="หน่วย"
                    className="w-16 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-center"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Money & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t">
            <div>
              <label className="text-xs font-bold text-slate-700">💰 ยอดเงินรวมทั้งบิล (บาท) *</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0"
                className="w-full mt-1 px-3 py-2 text-base font-black text-slate-900 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">💳 สถานะการชำระเงิน</label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('PAID')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  🟢 โอนแล้ว
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('COD')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    paymentStatus === 'COD'
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
            <label className="text-xs font-bold text-slate-700">📝 หมายเหตุการส่ง</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="เช่น วางไว้บนโต๊ะหน้าบ้าน, แขวนไว้ที่รั้ว"
              className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกออเดอร์</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
