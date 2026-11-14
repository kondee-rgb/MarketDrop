'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Truck,
  ShoppingCart,
  RotateCcw,
  ZoomIn
} from 'lucide-react';
import { Order, OrderItem, PaymentStatus, ShoppingItem } from '@/types/order';
import { detectCategory } from '@/lib/shopping-aggregator';

interface PhotoToOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDeliveryOrder: (order: Order) => void;
  onAddShoppingItem: (item: ShoppingItem) => void;
  existingOrdersCount: number;
}

export function PhotoToOrderModal({
  isOpen,
  onClose,
  onAddDeliveryOrder,
  onAddShoppingItem,
  existingOrdersCount
}: PhotoToOrderModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<'delivery' | 'shopping'>('delivery');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delivery Form State
  const [houseNumber, setHouseNumber] = useState('');
  const [soi, setSoi] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('COD');
  const [notes, setNotes] = useState('');
  const [deliveryItems, setDeliveryItems] = useState<OrderItem[]>([
    { id: 'item_1', name: '', quantity: '1', unit: 'กก.', checked: false }
  ]);

  // Shopping Form State
  const [shoppingItems, setShoppingItems] = useState<
    Array<{ id: string; name: string; quantity: string; unit: string; category: ShoppingItem['category'] }>
  >([
    { id: 's_1', name: '', quantity: '1', unit: 'กก.', category: 'veg' }
  ]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelected = async (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setSelectedImage(base64Data);

      // Trigger AI parsing automatically
      await parseImageWithAI(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const parseImageWithAI = async (base64: string, mimeType: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          targetMode: targetType
        })
      });

      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;

        // Auto-fill delivery fields
        if (d.houseNumber) setHouseNumber(d.houseNumber);
        if (d.soi) setSoi(d.soi);
        if (d.customerName) setCustomerName(d.customerName);
        if (d.phone) setPhone(d.phone);
        if (typeof d.totalAmount === 'number' && d.totalAmount > 0) setTotalAmount(d.totalAmount);
        if (d.paymentStatus === 'PAID' || d.paymentStatus === 'COD') setPaymentStatus(d.paymentStatus);
        if (d.notes) setNotes(d.notes);

        if (d.items && Array.isArray(d.items) && d.items.length > 0) {
          // Delivery items
          const mappedDelivery: OrderItem[] = d.items.map((it: any, idx: number) => ({
            id: `item_${Date.now()}_${idx}`,
            name: it.name || '',
            quantity: it.quantity || '1',
            unit: it.unit || 'กก.',
            price: it.price || 0,
            checked: false,
            category: it.category || detectCategory(it.name || '')
          }));
          setDeliveryItems(mappedDelivery);

          // Shopping items
          const mappedShopping = d.items.map((it: any, idx: number) => ({
            id: `s_${Date.now()}_${idx}`,
            name: it.name || '',
            quantity: String(it.quantity || '1'),
            unit: it.unit || 'กก.',
            category: (it.category as ShoppingItem['category']) || detectCategory(it.name || '')
          }));
          setShoppingItems(mappedShopping);
        }
      } else {
        setErrorMsg('วิเคราะห์ภาพไม่สำเร็จ คุณสามารถมองรูปแล้วพิมพ์แก้ไขในฟอร์มด้านล่างได้ทันที');
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ AI — สามารถมองภาพและพิมพ์ข้อมูลลงฟอร์มได้ตามปกติ');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddDeliveryItemRow = () => {
    setDeliveryItems(prev => [
      ...prev,
      { id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: '', quantity: '1', unit: 'กก.', checked: false }
    ]);
  };

  const handleAddShoppingItemRow = () => {
    setShoppingItems(prev => [
      ...prev,
      { id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: '', quantity: '1', unit: 'กก.', category: 'veg' }
    ]);
  };

  const handleSave = () => {
    const now = new Date().toISOString();

    if (targetType === 'delivery') {
      const validItems = deliveryItems.filter(i => i.name.trim().length > 0);
      const newOrder: Order = {
        id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        stopNumber: existingOrdersCount + 1,
        houseNumber: houseNumber.trim() || 'ไม่ระบุ',
        soi: soi.trim() || 'ไม่ระบุซอย',
        customerName: customerName.trim() || `ลูกค้าบ้าน ${houseNumber.trim()}`,
        phone: phone.trim(),
        items: validItems.length > 0 ? validItems : [{ id: 'i1', name: 'ของสดรวม', quantity: 1, unit: 'ชุด', checked: false }],
        totalAmount: typeof totalAmount === 'number' ? totalAmount : parseFloat(String(totalAmount)) || 0,
        paymentStatus,
        collectedAmount: paymentStatus === 'PAID' ? (typeof totalAmount === 'number' ? totalAmount : 0) : 0,
        paymentMethod: paymentStatus === 'PAID' ? 'TRANSFER' : null,
        deliveryStatus: 'PENDING',
        deliveredAt: null,
        notes: notes.trim(),
        slipImage: selectedImage,
        syncedToSheets: false,
        createdAt: now,
        updatedAt: now
      };
      onAddDeliveryOrder(newOrder);
    } else {
      // Add shopping items
      const validShopping = shoppingItems.filter(i => i.name.trim().length > 0);
      for (const it of validShopping) {
        onAddShoppingItem({
          id: `manual_shop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: it.name.trim(),
          category: it.category || detectCategory(it.name),
          totalQuantity: it.quantity || '1',
          unit: it.unit || 'กก.',
          bought: false,
          allocations: [],
          sourceNote: 'เพิ่มจากรูปถ่าย / โพยตลาด',
          imageUrl: selectedImage || undefined
        });
      }
    }

    handleClose();
  };

  const handleClose = () => {
    setSelectedImage(null);
    setHouseNumber('');
    setSoi('');
    setCustomerName('');
    setPhone('');
    setTotalAmount('');
    setNotes('');
    setDeliveryItems([{ id: 'item_1', name: '', quantity: '1', unit: 'กก.', checked: false }]);
    setShoppingItems([{ id: 's_1', name: '', quantity: '1', unit: 'กก.', category: 'veg' }]);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg font-display">
                ถ่ายรูป / อัปโหลดเพื่อคีย์ออเดอร์
              </h3>
              <p className="text-[11px] text-emerald-100">
                ถ่ายรูปโพยตลาด หรือสกรีนช็อตแชท LINE ระบบสกัดรายการให้อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Target Mode Switcher */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setTargetType('delivery')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                targetType === 'delivery'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>🛵 บันทึกเป็น &ldquo;บ้านที่ต้องส่ง&rdquo;</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetType('shopping')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                targetType === 'shopping'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>🛒 บันทึกเป็น &ldquo;ของที่ต้องซื้อ&rdquo;</span>
            </button>
          </div>

          {/* Photo Capture / Select Buttons */}
          {!selectedImage ? (
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-6 sm:p-8 text-center bg-slate-50 space-y-4 transition-colors">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-slate-800 font-display">
                  ถ่ายรูปโพยกระดาษ หรือเลือกรูปแชท LINE
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  ระบบจะใช้ AI อ่านข้อความ แยกบ้านเลขที่ รายการของสด และยอดเงินให้อัตโนมัติ
                </p>
              </div>

              {/* Hidden Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleImageSelected(e.target.files[0])}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleImageSelected(e.target.files[0])}
              />

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-700/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Camera className="w-5 h-5" />
                  <span>📷 ถ่ายรูปด้วยกล้องมือถือ</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <ImageIcon className="w-5 h-5 text-emerald-600" />
                  <span>🖼️ เลือกรูปจากอัลบั้ม / แคปหน้าจอ</span>
                </button>
              </div>
            </div>
          ) : (
            /* Split View: Image Preview on top/left, Editable Form on bottom/right */
            <div className="space-y-4">
              {/* Image Preview Banner */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-900 max-h-56 flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Uploaded order"
                  className="max-h-56 object-contain w-auto mx-auto"
                />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    title="ถ่ายรูปใหม่"
                    className="p-1.5 bg-slate-900/80 text-white hover:bg-slate-900 rounded-xl text-xs backdrop-blur flex items-center gap-1 font-semibold px-2.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> ถ่ายใหม่
                  </button>
                </div>
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
                    <Sparkles className="w-8 h-8 text-emerald-400 animate-spin" />
                    <p className="text-xs font-bold text-emerald-300">AI กำลังวิเคราะห์ข้อความและของสดในรูป...</p>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Mode 1: Delivery Order Fields */}
              {targetType === 'delivery' ? (
                <div className="space-y-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-sm text-slate-800">
                      📍 ข้อมูลบ้านที่ต้องส่ง (ตรวจทาน/แก้ไขได้)
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ดึงจากรูปถ่าย ✨
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">🏠 บ้านเลขที่</label>
                      <input
                        type="text"
                        value={houseNumber}
                        onChange={e => setHouseNumber(e.target.value)}
                        placeholder="เช่น 12/1 หรือ 45/10"
                        className="w-full mt-1 px-3 py-1.5 text-sm font-bold rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">📍 ซอย / หมู่บ้าน</label>
                      <input
                        type="text"
                        value={soi}
                        onChange={e => setSoi(e.target.value)}
                        placeholder="เช่น ซอย 2, มบ.พฤกษา"
                        className="w-full mt-1 px-3 py-1.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">👤 ชื่อลูกค้า</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="เช่น คุณวิภา"
                        className="w-full mt-1 px-3 py-1.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">📞 เบอร์โทรศัพท์</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="081-234-5678"
                        className="w-full mt-1 px-3 py-1.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Delivery Items */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">
                        🧺 รายการของสดที่ต้องส่ง ({deliveryItems.length} รายการ)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddDeliveryItemRow}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> เพิ่มแถว
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {deliveryItems.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
                          <input
                            type="text"
                            value={item.name}
                            onChange={e => {
                              const next = [...deliveryItems];
                              next[idx].name = e.target.value;
                              setDeliveryItems(next);
                            }}
                            placeholder="ชื่อของสด เช่น หมูบด"
                            className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300"
                          />
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={e => {
                              const next = [...deliveryItems];
                              next[idx].quantity = e.target.value;
                              setDeliveryItems(next);
                            }}
                            placeholder="จำนวน"
                            className="w-16 px-2 py-1 text-xs rounded-lg border border-slate-300 text-center font-bold"
                          />
                          <input
                            type="text"
                            value={item.unit}
                            onChange={e => {
                              const next = [...deliveryItems];
                              next[idx].unit = e.target.value;
                              setDeliveryItems(next);
                            }}
                            placeholder="หน่วย"
                            className="w-16 px-2 py-1 text-xs rounded-lg border border-slate-300 text-center"
                          />
                          {deliveryItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDeliveryItems(deliveryItems.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Amount & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">💰 ยอดเงินรวม (บาท)</label>
                      <input
                        type="number"
                        value={totalAmount}
                        onChange={e => setTotalAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="0"
                        className="w-full mt-1 px-3 py-1.5 text-base font-black rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">💳 การชำระเงิน</label>
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setPaymentStatus('PAID')}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            paymentStatus === 'PAID'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          🟢 โอนแล้ว
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentStatus('COD')}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            paymentStatus === 'COD'
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          🟠 เก็บปลายทาง (COD)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700">📝 หมายเหตุ</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="เช่น วางไว้บนโต๊ะหินอ่อน"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              ) : (
                /* Form Mode 2: Shopping List Items */
                <div className="space-y-3 bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-sm text-slate-800">
                      🛒 รายการของสดที่ต้องซื้อในตลาด ({shoppingItems.length} รายการ)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddShoppingItemRow}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
                    >
                      <Plus className="w-4 h-4" /> เพิ่มสินค้า
                    </button>
                  </div>

                  <div className="space-y-2">
                    {shoppingItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => {
                            const next = [...shoppingItems];
                            next[idx].name = e.target.value;
                            next[idx].category = detectCategory(e.target.value);
                            setShoppingItems(next);
                          }}
                          placeholder="ชื่อของสด เช่น หมูสามชั้น, ผักบุ้ง"
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                        />
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={e => {
                            const next = [...shoppingItems];
                            next[idx].quantity = e.target.value;
                            setShoppingItems(next);
                          }}
                          placeholder="จำนวน"
                          className="w-16 px-2 py-1.5 text-xs rounded-lg border border-slate-300 text-center font-bold"
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => {
                            const next = [...shoppingItems];
                            next[idx].unit = e.target.value;
                            setShoppingItems(next);
                          }}
                          placeholder="หน่วย"
                          className="w-16 px-2 py-1.5 text-xs rounded-lg border border-slate-300 text-center"
                        />
                        {shoppingItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setShoppingItems(shoppingItems.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            ยกเลิก
          </button>

          {selectedImage && (
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-sm shadow-md shadow-emerald-700/25 active:scale-95 transition-all font-display"
            >
              <Check className="w-4 h-4" />
              <span>
                {targetType === 'delivery'
                  ? 'บันทึกเข้าคิวส่ง (Delivery)'
                  : 'บันทึกเข้าของที่ต้องซื้อ (Shopping)'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
