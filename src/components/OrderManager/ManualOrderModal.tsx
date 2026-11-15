'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, UserPlus, Edit3, Star, MapPin, Building } from 'lucide-react';
import { Order, OrderItem, PaymentStatus } from '@/types/order';
import {
  addAlias,
  getPriceBook,
  lookupExactProduct,
  rememberUnits,
  splitVariant,
  suggestCanonical,
  VARIANT_SEP
} from '@/lib/price-book';
import {
  REAL_LOCATIONS,
  getLocationById,
  LocationConfig,
  detectLocationFromHouseNumber
} from '@/lib/locations';
import {
  FrequentContact,
  getFrequentContacts,
  saveFrequentContact,
  recordContactUsage
} from '@/lib/contacts';

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
  const [locationId, setLocationId] = useState<string>('');
  const [building, setBuilding] = useState<string>('');
  const [houseNumber, setHouseNumber] = useState('');
  const [soi, setSoi] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [totalTouched, setTotalTouched] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('COD');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { id: 'item_1', name: '', quantity: '1', unit: '', checked: false }
  ]);

  // Frequent Contacts
  const [contactsList, setContactsList] = useState<FrequentContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [saveAsFrequent, setSaveAsFrequent] = useState(false);
  const [favLocation, setFavLocation] = useState<string | null>(null);
  const [menuNames, setMenuNames] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const contacts = getFrequentContacts('customer');
      setContactsList(contacts);
      setFavLocation(null);
      setMenuNames(getPriceBook().map(e => e.itemName));
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialOrder) {
      setLocationId(initialOrder.locationId || '');
      setBuilding(initialOrder.building || '');
      setHouseNumber(initialOrder.houseNumber);
      setSoi(initialOrder.soi);
      setCustomerName(initialOrder.customerName);
      setPhone(initialOrder.phone);
      setTotalAmount(initialOrder.totalAmount);
      setTotalTouched(true); // editing: keep the saved total
      setPaymentStatus(initialOrder.paymentStatus);
      setNotes(initialOrder.notes);
      setItems(
        initialOrder.items && initialOrder.items.length > 0
          ? initialOrder.items
          : [{ id: 'item_1', name: '', quantity: '1', unit: '', checked: false }]
      );
      setSaveAsFrequent(false);
      setSelectedContactId('');
    } else {
      setLocationId('');
      setBuilding('');
      setHouseNumber('');
      setSoi('');
      setCustomerName('');
      setPhone('');
      setTotalAmount('');
      setTotalTouched(false);
      setPaymentStatus('COD');
      setNotes('');
      setItems([
        { id: `item_${Date.now()}`, name: '', quantity: '1', unit: '', checked: false }
      ]);
      setSaveAsFrequent(false);
      setSelectedContactId('');
    }
  }, [initialOrder, isOpen]);

  // line price from the price book (location price first)
  const priceLine = (item: OrderItem, loc: string, fillUnit: boolean): OrderItem => {
    const known = lookupExactProduct(String(item.name), loc || undefined);
    if (!known) return item;
    let out = item;
    if (known.unit && (fillUnit || !item.unit)) out = { ...out, unit: known.unit };
    const qty = parseFloat(String(item.quantity)) || 1;
    if (known.sellingPrice) out = { ...out, price: Math.round(known.sellingPrice * qty * 100) / 100 };
    return out;
  };

  const withTotal = (next: OrderItem[]) => {
    // total follows the item prices until the user types a total themselves
    if (!totalTouched) {
      const sum = next.reduce((t, it) => t + (typeof it.price === 'number' ? it.price : 0), 0);
      if (sum > 0) setTotalAmount(sum);
    }
    return next;
  };

  // some menus sell at a different price in some places
  useEffect(() => {
    if (!isOpen || initialOrder) return; // editing a saved order: keep its prices
    setItems(prev => (prev.some(it => it.name.trim()) ? withTotal(prev.map(it => priceLine(it, locationId, false))) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

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

    // Set default soi
    setSoi(loc.shortName);

    // Auto-select first sub-option and populate prefix if available
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
      // If house number already contains a slash, intelligently swap the prefix
      const slashIndex = houseNumber.indexOf('/');
      if (slashIndex >= 0 && prefix.endsWith('/')) {
        const roomPart = houseNumber.slice(slashIndex + 1);
        setHouseNumber(`${prefix}${roomPart}`);
      } else if (!houseNumber || houseNumber.endsWith('/')) {
        setHouseNumber(prefix);
      }
    }
  };

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
      const item = { ...next[idx], [field]: val };
      next[idx] = field === 'name' || field === 'quantity' ? priceLine(item, locationId, field === 'name') : item;
      return withTotal(next);
    });
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseNumber.trim()) return;

    const now = new Date().toISOString();
    const cleanItems = items.filter(it => it.name.trim().length > 0);
    rememberUnits(cleanItems);

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

    const savedOrder: Order = {
      id: initialOrder
        ? initialOrder.id
        : `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      stopNumber: initialOrder ? initialOrder.stopNumber : existingOrdersCount + 1,
      houseNumber: houseNumber.trim(),
      soi: soi.trim() || 'ไม่ระบุซอย',
      locationId: locationId || undefined,
      building: building || undefined,
      customerName: customerName.trim() || `ลูกค้าบ้าน ${houseNumber.trim()}`,
      phone: phone.trim(),
      items:
        cleanItems.length > 0
          ? cleanItems
          : [{ id: 'item_1', name: 'สินค้าสดรวม', quantity: 1, unit: 'ชุด', checked: false }],
      totalAmount:
        typeof totalAmount === 'number' ? totalAmount : parseFloat(String(totalAmount)) || 0,
      paymentStatus,
      collectedAmount: initialOrder
        ? initialOrder.collectedAmount
        : paymentStatus === 'PAID'
        ? typeof totalAmount === 'number'
          ? totalAmount
          : 0
        : 0,
      paymentMethod: initialOrder
        ? initialOrder.paymentMethod
        : paymentStatus === 'PAID'
        ? 'TRANSFER'
        : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 w-full max-w-xl max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header - Pastel */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 border-b border-emerald-100 text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-200 shadow-xs">
              {initialOrder ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-slate-800">
                {initialOrder ? 'แก้ไขข้อมูลออเดอร์' : 'เพิ่มออเดอร์ใหม่'}
              </h2>
              <p className="text-xs text-slate-500">เลือกโครงการ ลูกค้าประจำ และรายการของสด</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Regular customers: pick the place first, then who */}
          {contactsList.length > 0 && (() => {
            const placeOf = (c: FrequentContact) => c.locationId || 'other';
            const places = Array.from(new Set(contactsList.map(placeOf)));
            const placeName = (id: string) => (id === 'other' ? 'อื่นๆ' : getLocationById(id)?.shortName || id);
            const shown = favLocation ? contactsList.filter(c => placeOf(c) === favLocation) : [];
            return (
              <div className="rounded-2xl bg-amber-50/60 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" aria-hidden="true" />
                  ลูกค้าประจำ · เลือกสถานที่ก่อน
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {places.map(id => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFavLocation(favLocation === id ? null : id)}
                      aria-pressed={favLocation === id}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                        favLocation === id ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-700'
                      }`}
                    >
                      {placeName(id)} ({contactsList.filter(c => placeOf(c) === id).length})
                    </button>
                  ))}
                </div>
                {shown.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                    {shown.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectContact(c.id)}
                        aria-pressed={selectedContactId === c.id}
                        className={`px-3 py-1.5 rounded-xl text-xs text-left ${
                          selectedContactId === c.id ? 'bg-emerald-600 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="font-semibold">{c.name}</span>
                        {c.houseNumber && <span className="opacity-70"> · {c.houseNumber}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Location Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>โครงการ / สถานที่จัดส่ง</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {REAL_LOCATIONS.map(loc => {
                const isSelected = locationId === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleLocationChange(loc.id)}
                    className={`px-3 py-2 rounded-2xl text-xs font-bold text-left border transition-all truncate ${
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

            {/* Sub-option Selector (Towers or House Types) */}
            {currentLocationConfig?.subOptions && currentLocationConfig.subOptions.length > 0 && (
              <div className="p-3 bg-emerald-50/50 rounded-2xl space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-emerald-700" />
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
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

            {/* Quick Soi tags for Thanasin */}
            {currentLocationConfig?.sois && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[10px] font-bold text-slate-500">ซอยด่วน:</span>
                {currentLocationConfig.sois.slice(0, 8).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSoi(s)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                      soi === s
                        ? 'bg-teal-100 text-teal-800 border-teal-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Address & Customer Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">🏠 บ้านเลขที่ / ห้อง *</label>
              <input
                type="text"
                required
                value={houseNumber}
                onChange={e => {
                  const value = e.target.value;
                  setHouseNumber(value);
                  // number starts like a known place (57/… = Ivy River ตึก D) → select it
                  const found = detectLocationFromHouseNumber(value);
                  if (found.locationId) {
                    if (found.locationId !== locationId) setLocationId(found.locationId);
                    if (found.building && found.building !== building) setBuilding(found.building);
                  }
                }}
                placeholder={
                  currentLocationConfig?.defaultPrefix
                    ? `เช่น ${currentLocationConfig.defaultPrefix}123`
                    : 'เช่น 12/1 หรือ 45/10'
                }
                className="w-full mt-1 px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">📍 ซอย / รายละเอียด</label>
              <input
                type="text"
                value={soi}
                onChange={e => setSoi(e.target.value)}
                placeholder="เช่น ซอย 2, ซอย 1/1"
                className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">👤 ชื่อลูกค้า</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="เช่น คุณสมชาย"
                className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">📞 เบอร์โทรศัพท์</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="081-234-5678"
                className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Save as Frequent Contact Toggle */}
          <label className="flex items-center gap-2 text-xs font-bold text-emerald-950 bg-emerald-50/60 p-2.5 rounded-2xl cursor-pointer hover:bg-emerald-50 transition-colors">
            <input
              type="checkbox"
              checked={saveAsFrequent}
              onChange={e => setSaveAsFrequent(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
            />
            <span>⭐ บันทึกเป็นลูกค้าประจำ (ใช้ซ้ำได้ใน 1 คลิกครั้งหน้า)</span>
          </label>

          {/* Items Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
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

            <datalist id="menu-names">
              {menuNames.map(n => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="bg-slate-50 p-2 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.name}
                    list="menu-names"
                    onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                    placeholder="ชื่อสินค้า เช่น ผักกาด, หมูบด"
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)}
                    placeholder="จำนวน"
                    className="w-16 px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={item.unit}
                    onChange={e => handleUpdateItem(idx, 'unit', e.target.value)}
                    placeholder="หน่วย"
                    aria-label="หน่วย (ไม่บังคับ)"
                    className="w-16 px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <ItemHints name={item.name} onName={name => handleUpdateItem(idx, 'name', name)} />
                </div>
              ))}
            </div>
          </div>

          {/* Money & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700">💰 ยอดเงินรวมทั้งบิล (บาท) *</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={totalAmount}
                onChange={e =>
                  { setTotalTouched(true); setTotalAmount(e.target.value === '' ? '' : parseFloat(e.target.value)); }
                }
                placeholder="0"
                className="w-full mt-1 px-3 py-2 text-base font-bold text-slate-900 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none"
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
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🟢 โอนแล้ว
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('COD')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    paymentStatus === 'COD'
                      ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
              placeholder="เช่น วางไว้บนโต๊ะหน้าบ้าน, ฝากนิติคอนโด"
              className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors"
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

/** Under an item: filling buttons for menus that have them, or "did you mean …?" for an unknown name. */
function ItemHints({ name, onName }: { name: string; onName: (name: string) => void }) {
  if (!name.trim()) return null;
  const { base, variant } = splitVariant(name);
  const known = lookupExactProduct(base);
  if (known?.variants) {
    return (
      <div className="flex flex-wrap gap-1">
        {known.variants.map(v => (
          <button
            key={v}
            type="button"
            aria-pressed={variant === v}
            onClick={() => onName(variant === v ? base : `${base}${VARIANT_SEP}${v}`)}
            className={`px-2.5 py-1 rounded-lg text-[11px] ${variant === v ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-700'}`}
          >
            {v}
          </button>
        ))}
      </div>
    );
  }
  const guess = known ? null : suggestCanonical(name);
  if (!guess) return null;
  return (
    <button
      type="button"
      onClick={() => {
        addAlias(guess, name); // remember: next time this name means the same menu
        onName(guess);
      }}
      className="text-[11px] text-emerald-700 underline"
    >
      ใช่ “{guess}” ไหม? แตะเพื่อใช้ชื่อนี้ (จำไว้ครั้งหน้า)
    </button>
  );
}
