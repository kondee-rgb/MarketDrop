'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Star,
  MapPin,
  Building
} from 'lucide-react';
import { Order, OrderItem, PaymentStatus, ShoppingItem } from '@/types/order';
import { detectCategory } from '@/lib/shopping-aggregator';
import {
  REAL_LOCATIONS,
  getLocationById,
  detectLocationFromText,
  LocationConfig
} from '@/lib/locations';
import { compressImageFile } from '@/lib/image';
import {
  FrequentContact,
  getFrequentContacts,
  saveFrequentContact,
  recordContactUsage,
  findFrequentContact
} from '@/lib/contacts';

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
  const [locationId, setLocationId] = useState<string>('');
  const [building, setBuilding] = useState<string>('');
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

  // Frequent Contacts
  const [contactsList, setContactsList] = useState<FrequentContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [saveAsFrequent, setSaveAsFrequent] = useState(false);

  // Shopping Form State
  const [shoppingItems, setShoppingItems] = useState<
    Array<{ id: string; name: string; quantity: string; unit: string; category: ShoppingItem['category'] }>
  >([
    { id: 's_1', name: '', quantity: '1', unit: 'กก.', category: 'veg' }
  ]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContactsList(getFrequentContacts('customer'));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentLocationConfig: LocationConfig | undefined = getLocationById(locationId);

  // Handle selecting a frequent contact
  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    if (!contactId) return;

    const c = contactsList.find(item => item.id === contactId);
    if (c) {
      setCustomerName(c.name || '');
      setPhone(c.phone || '');
      if (c.locationId) {
        setLocationId(c.locationId);
      }
      if (c.building) {
        setBuilding(c.building);
      }
      if (c.houseNumber) {
        setHouseNumber(c.houseNumber);
      }
      if (c.soi) {
        setSoi(c.soi);
      } else if (c.locationId) {
        const loc = getLocationById(c.locationId);
        if (loc && loc.id !== 'custom') {
          setSoi(loc.shortName);
        }
      }
      if (c.defaultNotes && !notes) {
        setNotes(c.defaultNotes);
      }
    }
  };

  // Handle location selection
  const handleLocationChange = (newLocId: string) => {
    setLocationId(newLocId);
    const loc = getLocationById(newLocId);
    if (!loc || loc.id === 'custom') {
      setBuilding('');
      return;
    }

    setSoi(loc.shortName);

    if (loc.subOptions && loc.subOptions.length > 0) {
      const firstSub = loc.subOptions[0];
      setBuilding(firstSub.name);
      const prefix = firstSub.prefix !== undefined ? firstSub.prefix : loc.defaultPrefix;
      if (prefix) {
        setHouseNumber(prefix);
      }
    } else if (loc.defaultPrefix) {
      setBuilding('');
      setHouseNumber(loc.defaultPrefix);
    } else {
      setBuilding('');
    }

    if (loc.notesPrompt && !notes) {
      setNotes(loc.notesPrompt);
    }
  };

  // Handle sub-option (Tower / House type) selection
  const handleSubOptionChange = (subIdOrName: string) => {
    const loc = getLocationById(locationId);
    if (!loc) return;

    const sub = loc.subOptions?.find(
      opt => opt.id === subIdOrName || opt.name === subIdOrName
    );
    const subName = sub ? sub.name : subIdOrName;
    setBuilding(subName);

    const prefix = sub?.prefix !== undefined ? sub.prefix : loc.defaultPrefix;
    if (prefix !== undefined) {
      const slashIndex = houseNumber.indexOf('/');
      if (slashIndex >= 0 && prefix.endsWith('/')) {
        const roomPart = houseNumber.slice(slashIndex + 1);
        setHouseNumber(`${prefix}${roomPart}`);
      } else if (!houseNumber || houseNumber.endsWith('/')) {
        setHouseNumber(prefix);
      }
    }
  };

  const handleImageSelected = async (file: File) => {
    setErrorMsg(null);
    try {
      const { dataUrl, mimeType } = await compressImageFile(file);
      setSelectedImage(dataUrl);
      // Trigger AI parsing automatically
      await parseImageWithAI(dataUrl, mimeType);
    } catch {
      setErrorMsg('อ่านไฟล์รูปไม่สำเร็จ ลองเลือกรูปใหม่อีกครั้ง');
    }
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

        // Detect Location preset from parsed text
        const detectedLoc = detectLocationFromText(
          `${d.houseNumber || ''} ${d.soi || ''} ${d.notes || ''}`
        );
        if (detectedLoc.locationId) {
          setLocationId(detectedLoc.locationId);
          if (detectedLoc.building) setBuilding(detectedLoc.building);
          if (detectedLoc.soi && !d.soi) setSoi(detectedLoc.soi);
          if (detectedLoc.houseNumber && (!d.houseNumber || d.houseNumber === 'ไม่ระบุ')) {
            setHouseNumber(detectedLoc.houseNumber);
          }
        }

        // Match existing contact if recognized
        if (d.phone || d.customerName) {
          const matchContact = findFrequentContact({ phone: d.phone, name: d.customerName });
          if (matchContact) {
            setSelectedContactId(matchContact.id);
            if (!locationId && matchContact.locationId) setLocationId(matchContact.locationId);
            if (!building && matchContact.building) setBuilding(matchContact.building);
          }
        }

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
      {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        quantity: '1',
        unit: 'กก.',
        checked: false
      }
    ]);
  };

  const handleAddShoppingItemRow = () => {
    setShoppingItems(prev => [
      ...prev,
      {
        id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        quantity: '1',
        unit: 'กก.',
        category: 'veg'
      }
    ]);
  };

  const handleSave = () => {
    const now = new Date().toISOString();

    if (targetType === 'delivery') {
      const validItems = deliveryItems.filter(i => i.name.trim().length > 0);

      // Save as frequent contact if requested
      if (saveAsFrequent && customerName.trim()) {
        const saved = saveFrequentContact({
          name: customerName.trim(),
          phone: phone.trim(),
          locationId: locationId || undefined,
          building: building || undefined,
          soi: soi.trim() || undefined,
          houseNumber: houseNumber.trim() || undefined,
          defaultNotes: notes.trim() || undefined,
          type: 'customer'
        });
        if (saved) {
          recordContactUsage(saved.id);
        }
      } else if (selectedContactId) {
        recordContactUsage(selectedContactId);
      }

      const newOrder: Order = {
        id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        stopNumber: existingOrdersCount + 1,
        houseNumber: houseNumber.trim() || 'ไม่ระบุ',
        soi: soi.trim() || 'ไม่ระบุซอย',
        locationId: locationId || undefined,
        building: building || undefined,
        customerName: customerName.trim() || `ลูกค้าบ้าน ${houseNumber.trim()}`,
        phone: phone.trim(),
        items:
          validItems.length > 0
            ? validItems
            : [{ id: 'i1', name: 'ของสดรวม', quantity: 1, unit: 'ชุด', checked: false }],
        totalAmount:
          typeof totalAmount === 'number' ? totalAmount : parseFloat(String(totalAmount)) || 0,
        paymentStatus,
        collectedAmount:
          paymentStatus === 'PAID' ? (typeof totalAmount === 'number' ? totalAmount : 0) : 0,
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
    setLocationId('');
    setBuilding('');
    setHouseNumber('');
    setSoi('');
    setCustomerName('');
    setPhone('');
    setTotalAmount('');
    setNotes('');
    setSelectedContactId('');
    setSaveAsFrequent(false);
    setDeliveryItems([{ id: 'item_1', name: '', quantity: '1', unit: 'กก.', checked: false }]);
    setShoppingItems([{ id: 's_1', name: '', quantity: '1', unit: 'กก.', category: 'veg' }]);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-xl border border-emerald-100 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header - Pastel */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 text-slate-800 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-200 shadow-xs">
              <Camera className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg font-display text-slate-800">
                ถ่ายรูป / สแกนโพยออเดอร์
              </h3>
              <p className="text-[11px] text-slate-500">
                ถ่ายโพยตลาดสด หรือรูปแชท LINE ระบบสกัดรายการให้อัตโนมัติ
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Target Mode Switcher */}
          <div className="bg-slate-100/80 p-1.5 rounded-2xl flex gap-1.5 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setTargetType('delivery')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                targetType === 'delivery'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>🛵 บันทึกเป็น &ldquo;บ้านที่ต้องส่ง&rdquo;</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetType('shopping')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                targetType === 'shopping'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-teal-600" />
              <span>🛒 บันทึกเป็น &ldquo;ของที่ต้องซื้อ&rdquo;</span>
            </button>
          </div>

          {/* Photo Capture / Select Buttons */}
          {!selectedImage ? (
            <div className="border-2 border-dashed border-emerald-200/80 hover:border-emerald-400 rounded-3xl p-6 sm:p-8 text-center bg-emerald-50/20 space-y-4 transition-colors">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-slate-800 font-display">
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
                  className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Camera className="w-5 h-5" />
                  <span>📷 ถ่ายรูปด้วยกล้องมือถือ</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl font-bold text-sm shadow-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <ImageIcon className="w-5 h-5 text-emerald-600" />
                  <span>🖼️ เลือกรูปจากอัลบั้ม / แคปหน้าจอ</span>
                </button>
              </div>
            </div>
          ) : (
            /* Split View: Image Preview on top, Editable Form below */
            <div className="space-y-4">
              {/* Image Preview Banner */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-56 flex items-center justify-center">
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
                    className="p-1.5 bg-white/90 text-slate-800 hover:bg-white rounded-xl text-xs backdrop-blur-xs flex items-center gap-1 font-bold px-2.5 shadow-xs border border-slate-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> ถ่ายใหม่
                  </button>
                </div>
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center text-slate-800 gap-2">
                    <Sparkles className="w-8 h-8 text-emerald-600 animate-spin" />
                    <p className="text-xs font-bold text-emerald-800">
                      AI กำลังวิเคราะห์ข้อความและของสดในรูป...
                    </p>
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
                <div className="space-y-3.5 bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <span className="font-bold text-sm text-slate-800">
                      📍 ข้อมูลบ้านที่ต้องส่ง (ตรวจทาน/แก้ไขได้)
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      สแกนจากรูป ✨
                    </span>
                  </div>

                  {/* Frequent Contacts Dropdown */}
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span className="text-xs font-bold text-emerald-950">เลือกลูกค้าประจำ:</span>
                    </div>
                    <select
                      value={selectedContactId}
                      onChange={e => handleSelectContact(e.target.value)}
                      className="flex-1 max-w-full sm:max-w-xs px-2.5 py-1 text-xs font-medium rounded-xl border border-emerald-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- เลือกลูกค้าประจำ (1-Click) --</option>
                      {contactsList.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''} - {c.houseNumber || ''} {c.building || ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>เลือกโครงการ / สถานที่จัดส่ง</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {REAL_LOCATIONS.map(loc => {
                        const isSelected = locationId === loc.id;
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => handleLocationChange(loc.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left border transition-all truncate ${
                              isSelected
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="truncate">{loc.shortName}</div>
                            <div className="text-[10px] text-slate-400 font-normal truncate">
                              {loc.zoneLabel}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Sub-option Selector */}
                    {currentLocationConfig?.subOptions && currentLocationConfig.subOptions.length > 0 && (
                      <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200/60 space-y-1">
                        <label className="text-[10px] font-bold text-emerald-950 flex items-center gap-1">
                          <Building className="w-3 h-3 text-emerald-700" />
                          <span>{currentLocationConfig.subOptionLabel || 'เลือกตึก / แบบบ้าน'}:</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {currentLocationConfig.subOptions.map(opt => {
                            const isSubSelected = building === opt.name || building === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSubOptionChange(opt.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                  isSubSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/60'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">🏠 บ้านเลขที่ / ห้อง *</label>
                      <input
                        type="text"
                        value={houseNumber}
                        onChange={e => setHouseNumber(e.target.value)}
                        placeholder={
                          currentLocationConfig?.defaultPrefix
                            ? `เช่น ${currentLocationConfig.defaultPrefix}123`
                            : 'เช่น 12/1 หรือ 45/10'
                        }
                        className="w-full mt-1 px-3 py-1.5 text-sm font-bold rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">📍 ซอย / รายละเอียด</label>
                      <input
                        type="text"
                        value={soi}
                        onChange={e => setSoi(e.target.value)}
                        placeholder="เช่น ซอย 2, มบ.พฤกษา"
                        className="w-full mt-1 px-3 py-1.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">👤 ชื่อลูกค้า</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="เช่น คุณวิภา"
                        className="w-full mt-1 px-3 py-1.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">📞 เบอร์โทรศัพท์</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="081-234-5678"
                        className="w-full mt-1 px-3 py-1.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Save as Frequent Customer Toggle */}
                  <label className="flex items-center gap-2 text-xs font-bold text-emerald-950 bg-emerald-50/60 p-2 rounded-xl border border-emerald-200/70 cursor-pointer hover:bg-emerald-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={saveAsFrequent}
                      onChange={e => setSaveAsFrequent(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                    />
                    <span>⭐ บันทึกเป็นลูกค้าประจำ (ใช้ซ้ำได้ใน 1 คลิกครั้งหน้า)</span>
                  </label>

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
                        <div
                          key={item.id}
                          className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200"
                        >
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
                              onClick={() =>
                                setDeliveryItems(deliveryItems.filter((_, i) => i !== idx))
                              }
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">💰 ยอดเงินรวม (บาท)</label>
                      <input
                        type="number"
                        value={totalAmount}
                        onChange={e =>
                          setTotalAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                        }
                        placeholder="0"
                        className="w-full mt-1 px-3 py-1.5 text-base font-bold rounded-xl border border-slate-300 bg-white"
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
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          🟢 โอนแล้ว
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentStatus('COD')}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            paymentStatus === 'COD'
                              ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-300'
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
                      placeholder="เช่น วางไว้บนโต๊ะหินอ่อน, ฝากนิติคอนโด"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              ) : (
                /* Form Mode 2: Shopping List Items */
                <div className="space-y-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <span className="font-bold text-sm text-slate-800">
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
                      <div
                        key={item.id}
                        className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200"
                      >
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
                            onClick={() =>
                              setShoppingItems(shoppingItems.filter((_, i) => i !== idx))
                            }
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
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-xs active:scale-95 transition-all font-display"
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
