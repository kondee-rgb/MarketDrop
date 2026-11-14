'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  CheckCircle2,
  Camera,
  Search,
  Filter,
  ArrowRight,
  X,
  Home,
  MapPin,
  Star,
  Building,
  User,
  Check,
  ChevronRight,
  Phone,
  Tag,
  Store
} from 'lucide-react';
import { Order, ShoppingItem } from '@/types/order';
import {
  CATEGORY_LABELS,
  HouseAllocationParams,
  groupShoppingItemsByShop,
  ShopStallGroup
} from '@/lib/shopping-aggregator';
import { REAL_LOCATIONS, getLocationById, LocationConfig } from '@/lib/locations';
import {
  FrequentContact,
  getFrequentContacts,
  saveFrequentContact,
  recordContactUsage
} from '@/lib/contacts';
import { lookupPriceBook, updateCostAndSellingPrice } from '@/lib/price-book';

interface ShoppingViewProps {
  items: ShoppingItem[];
  onToggleBought: (itemId: string) => void;
  onAddManualItem: (
    name: string,
    quantity: string,
    unit: string,
    category: ShoppingItem['category']
  ) => void;
  onRemoveManualItem: (itemId: string) => void;
  onOpenPhotoModal: () => void;
  onSwitchToDelivery: () => void;
  existingOrders?: Order[];
  onAllocateItem?: (
    itemName: string,
    unit: string,
    allocation: HouseAllocationParams,
    manualItemIdToRemove?: string
  ) => void;
  onRemoveAllocation?: (
    itemName: string,
    unit: string,
    orderIdOrHouseNumber: string
  ) => void;
}

export function ShoppingView({
  items,
  onToggleBought,
  onAddManualItem,
  onRemoveManualItem,
  onOpenPhotoModal,
  onSwitchToDelivery,
  existingOrders = [],
  onAllocateItem,
  onRemoveAllocation
}: ShoppingViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [shoppingLayout, setShoppingLayout] = useState<'stall' | 'list'>('stall');

  // Quick manual item input form
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('กก.');
  const [newItemCategory, setNewItemCategory] = useState<ShoppingItem['category']>('veg');

  // Allocation Modal State (Grab style item sheet: "ส่งให้ใคร ที่ไหน")
  const [allocatingItem, setAllocatingItem] = useState<ShoppingItem | null>(null);
  const [allocTargetMode, setAllocTargetMode] = useState<'existing' | 'frequent' | 'new'>('existing');
  const [allocQty, setAllocQty] = useState('1');
  const [allocUnit, setAllocUnit] = useState('กก.');
  const [allocPrice, setAllocPrice] = useState('');
  const [itemCostPrice, setItemCostPrice] = useState('');
  const [itemShopName, setItemShopName] = useState('');

  // For existing order selection
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  // For frequent contact selection
  const [contactsList, setContactsList] = useState<FrequentContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');

  // For new house manual entry
  const [allocLocationId, setAllocLocationId] = useState<string>('');
  const [allocBuilding, setAllocBuilding] = useState<string>('');
  const [allocHouseNumber, setAllocHouseNumber] = useState('');
  const [allocCustomerName, setAllocCustomerName] = useState('');
  const [allocSoi, setAllocSoi] = useState('');
  const [allocPhone, setAllocPhone] = useState('');
  const [allocSaveFrequent, setAllocSaveFrequent] = useState(false);

  useEffect(() => {
    setContactsList(getFrequentContacts('customer'));
  }, []);

  const totalItems = items.length;
  const boughtItems = items.filter(it => it.bought).length;
  const percentComplete = totalItems > 0 ? Math.round((boughtItems / totalItems) * 100) : 0;

  // Filter items
  const filteredItems = items.filter(it => {
    const matchesCategory = selectedCategory === 'all' || it.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() || it.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pendingItems = filteredItems.filter(it => !it.bought);
  const completedItems = filteredItems.filter(it => it.bought);
  const stallGroups = groupShoppingItemsByShop(filteredItems);

  const handleCreateManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddManualItem(
      newItemName.trim(),
      newItemQty.trim() || '1',
      newItemUnit.trim() || 'กก.',
      newItemCategory
    );
    setNewItemName('');
    setNewItemQty('1');
    setShowAddForm(false);
  };

  // Open item detail / allocation modal
  const handleOpenItemSheet = (item: ShoppingItem) => {
    setAllocatingItem(item);
    setAllocQty(String(item.totalQuantity || '1'));
    setAllocUnit(item.unit || 'กก.');
    setContactsList(getFrequentContacts('customer'));

    if (existingOrders.length > 0) {
      setAllocTargetMode('existing');
      setSelectedOrderId(existingOrders[0].id);
    } else {
      setAllocTargetMode('new');
      setSelectedOrderId('');
    }

    setSelectedContactId('');
    setAllocLocationId('');
    setAllocBuilding('');
    setAllocHouseNumber('');
    setAllocCustomerName('');
    setAllocSoi('');
    setAllocPhone('');
    setAllocSaveFrequent(false);

    // Look up price memory book (ต้นทุน & ร้านค้าที่จำไว้)
    const mem = lookupPriceBook(item.name);
    if (mem) {
      setItemCostPrice(mem.costPrice !== undefined ? String(mem.costPrice) : '');
      setItemShopName(mem.shopName || '');
      setAllocPrice(mem.sellingPrice !== undefined ? String(mem.sellingPrice) : '');
    } else {
      setItemCostPrice('');
      setItemShopName('');
      setAllocPrice('');
    }
  };

  // When location changes in modal
  const handleLocationChange = (locId: string) => {
    setAllocLocationId(locId);
    const loc = getLocationById(locId);
    if (!loc) {
      setAllocBuilding('');
      setAllocSoi('');
      setAllocHouseNumber('');
      return;
    }

    if (loc.subOptions && loc.subOptions.length > 0) {
      setAllocBuilding(loc.subOptions[0].name);
    } else {
      setAllocBuilding('');
    }

    if (loc.sois && loc.sois.length > 0) {
      setAllocSoi(loc.sois[0]);
    } else {
      setAllocSoi('');
    }

    if (loc.id === 'ivy-river') {
      setAllocHouseNumber('51/');
    } else if (loc.id === 'cher-suksawat') {
      setAllocHouseNumber('65/146');
    } else if (loc.id === 'thanasin') {
      setAllocHouseNumber('800/');
    } else if (loc.id === 'the-plant') {
      setAllocHouseNumber('79/');
    } else {
      setAllocHouseNumber('');
    }
  };

  // When tower/building changes for Ivy River
  const handleBuildingChange = (bld: string) => {
    setAllocBuilding(bld);
    if (allocLocationId === 'ivy-river') {
      if (bld.includes('A')) setAllocHouseNumber('51/');
      else if (bld.includes('D')) setAllocHouseNumber('57/');
      else if (bld.includes('C')) setAllocHouseNumber('53/');
    }
  };

  // When house type changes for The Plant
  const handlePlantTypeChange = (type: string) => {
    setAllocBuilding(type);
    if (type.includes('เดี่ยว')) {
      setAllocHouseNumber('81/');
    } else {
      setAllocHouseNumber('79/');
    }
  };

  // Submit allocation
  const handleConfirmAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingItem || !onAllocateItem) return;

    let allocationData: HouseAllocationParams | null = null;
    const priceNum = allocPrice ? parseFloat(allocPrice) : undefined;
    const costNum = itemCostPrice ? parseFloat(itemCostPrice) : undefined;
    const shopStr = itemShopName.trim() || undefined;

    // Save to price memory book automatically
    if (allocatingItem && (costNum !== undefined || priceNum !== undefined || shopStr)) {
      updateCostAndSellingPrice(
        allocatingItem.name,
        costNum,
        priceNum,
        allocUnit || allocatingItem.unit,
        shopStr
      );
    }

    if (allocTargetMode === 'existing' && selectedOrderId) {
      const targetOrder = existingOrders.find(o => o.id === selectedOrderId);
      if (targetOrder) {
        allocationData = {
          houseNumber: targetOrder.houseNumber,
          customerName: targetOrder.customerName,
          phone: targetOrder.phone,
          locationId: targetOrder.locationId,
          soi: targetOrder.soi,
          building: targetOrder.building,
          quantity: allocQty || '1',
          unit: allocUnit || allocatingItem.unit,
          price: priceNum,
          costPrice: costNum,
          shopName: shopStr
        };
      }
    } else if (allocTargetMode === 'frequent' && selectedContactId) {
      const c = contactsList.find(it => it.id === selectedContactId);
      if (c) {
        recordContactUsage(c.id);
        allocationData = {
          houseNumber: c.houseNumber || allocHouseNumber || 'ไม่ระบุ',
          customerName: c.name,
          phone: c.phone,
          locationId: c.locationId,
          building: c.building,
          soi: c.soi,
          quantity: allocQty || '1',
          unit: allocUnit || allocatingItem.unit,
          price: priceNum,
          costPrice: costNum,
          shopName: shopStr
        };
      }
    } else {
      // New house entry
      if (!allocHouseNumber.trim()) return;

      if (allocSaveFrequent && allocCustomerName.trim()) {
        const saved = saveFrequentContact({
          name: allocCustomerName.trim(),
          phone: allocPhone.trim(),
          locationId: allocLocationId || undefined,
          building: allocBuilding || undefined,
          soi: allocSoi.trim() || undefined,
          houseNumber: allocHouseNumber.trim() || undefined,
          type: 'customer'
        });
        if (saved) recordContactUsage(saved.id);
      }

      allocationData = {
        houseNumber: allocHouseNumber.trim(),
        customerName: allocCustomerName.trim() || `ลูกค้าบ้าน ${allocHouseNumber.trim()}`,
        phone: allocPhone.trim(),
        locationId: allocLocationId || undefined,
        building: allocBuilding || undefined,
        soi: allocSoi.trim() || undefined,
        quantity: allocQty || '1',
        unit: allocUnit || allocatingItem.unit,
        price: priceNum,
        costPrice: costNum,
        shopName: shopStr
      };
    }

    if (allocationData) {
      const isManual = allocatingItem.id.startsWith('manual_');
      onAllocateItem(
        allocatingItem.name,
        allocUnit || allocatingItem.unit,
        allocationData,
        isManual ? allocatingItem.id : undefined
      );
    }

    setAllocatingItem(null);
  };

  const currAllocLocConfig: LocationConfig | undefined = getLocationById(allocLocationId);

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-14">
      {/* Top Banner: Shopping Status Bar - Clean Modern */}
      <div className="bg-white text-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-slate-900 leading-tight">
                ของที่ต้องซื้อจากตลาด
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                รวมของสดจากทุกบ้านเพื่อเหมาซื้อในตลาดสด
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenPhotoModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs shadow-xs border border-emerald-200 active:scale-95 transition-all"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>ถ่ายโพยซื้อ</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 font-medium">ความคืบหน้าการซื้อ</span>
            <span className="font-bold text-emerald-800">
              ซื้อแล้ว {boughtItems}/{totalItems} ({percentComplete}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grab-style Search & Quick Add Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหาของสด เช่น หมูบด, ผักชี..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-2xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold shadow-xs transition-all whitespace-nowrap active:scale-95 ${
            showAddForm
              ? 'bg-slate-200 text-slate-800'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มของ</span>
        </button>
      </div>

      {/* Grab-style Horizontal Category Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-2xl font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
            selectedCategory === 'all'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🥗</span>
          <span>ทั้งหมด</span>
          <span className="text-[10px] opacity-80">({totalItems})</span>
        </button>

        {Object.entries(CATEGORY_LABELS).map(([catKey, catInfo]) => {
          const count = items.filter(it => it.category === catKey).length;
          if (count === 0 && selectedCategory !== catKey) return null;
          const isSel = selectedCategory === catKey;
          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-3 py-1.5 rounded-2xl font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                isSel
                  ? `${catInfo.bg} shadow-xs font-bold ring-1 ring-emerald-400`
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{catInfo.icon}</span>
              <span>{catInfo.label.split(' / ')[0]}</span>
              <span className="text-[10px] opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {/* View Layout Toggle: Stall View vs List View */}
      <div className="flex items-center justify-between bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setShoppingLayout('stall')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            shoppingLayout === 'stall'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Store className="w-3.5 h-3.5 text-emerald-600" />
          <span>🏪 จัดตามแผงค้า (Stall View)</span>
        </button>
        <button
          type="button"
          onClick={() => setShoppingLayout('list')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            shoppingLayout === 'list'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
          <span>📋 รายการรวมทั้งหมด (List View)</span>
        </button>
      </div>

      {/* Quick Add Form Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleCreateManualItem}
          className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-200 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-emerald-950 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-emerald-700" /> เพิ่มรายการของสดด่วน
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              required
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="ชื่อของสด เช่น ผักกาดหอม, หมูบด"
              className="flex-1 min-w-[140px] px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={newItemQty}
              onChange={e => setNewItemQty(e.target.value)}
              placeholder="จำนวน"
              className="w-16 px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-center font-bold"
            />
            <input
              type="text"
              value={newItemUnit}
              onChange={e => setNewItemUnit(e.target.value)}
              placeholder="หน่วย"
              className="w-16 px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-center"
            />
            <select
              value={newItemCategory}
              onChange={e => setNewItemCategory(e.target.value as ShoppingItem['category'])}
              className="px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
            >
              <option value="meat">🥩 เนื้อสัตว์</option>
              <option value="veg">🥬 ผักสด</option>
              <option value="egg_dairy">🥚 ไข่/นม</option>
              <option value="spice">🌶️ เครื่องเทศ</option>
              <option value="dry">🥫 ของแห้ง</option>
              <option value="other">📦 อื่นๆ</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-xs text-slate-600 rounded-lg hover:bg-slate-100 font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700"
            >
              เพิ่มเข้ารายการซื้อ
            </button>
          </div>
        </form>
      )}

      {/* Products List: Stall-by-Stall or Flat List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">ยังไม่มีรายการของที่ต้องซื้อ</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            เมื่อมีออเดอร์เข้ามาในระบบ หรือเมื่อคุณถ่ายรูปโพยตลาด รายการของสดจะถูกรวบรวมมาไว้ที่นี่อัตโนมัติ
          </p>
          <button
            type="button"
            onClick={onOpenPhotoModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs"
          >
            <Camera className="w-4 h-4" /> ถ่ายรูปโพยตลาดเลย
          </button>
        </div>
      ) : shoppingLayout === 'stall' ? (
        /* 🏪 Stall-by-Stall Grouped Shopping View */
        <div className="space-y-4">
          {stallGroups.map(stall => (
            <div
              key={stall.shopName}
              className={`rounded-2xl border transition-all overflow-hidden ${
                stall.isCompleted
                  ? 'bg-slate-50/70 border-slate-200/70 opacity-75'
                  : 'bg-white border-slate-200/80 shadow-xs'
              }`}
            >
              {/* Stall Card Header */}
              <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-sm sm:text-base text-slate-800 truncate font-display">
                    {stall.shopName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      stall.isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {stall.isCompleted
                      ? `✓ ครบ ${stall.totalItemsCount} รายการ`
                      : `ซื้อแล้ว ${stall.boughtItemsCount}/${stall.totalItemsCount}`}
                  </span>
                </div>
              </div>

              {/* Stall Items: Consolidated with NO customer names on outer card */}
              <div className="divide-y divide-slate-100">
                {stall.items.map(item => {
                  const catInfo = CATEGORY_LABELS[item.category];

                  return (
                    <div
                      key={item.id}
                      className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors ${
                        item.bought ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      {/* Left: Dedicated Checkbox */}
                      <button
                        type="button"
                        onClick={() => onToggleBought(item.id)}
                        className="p-1 rounded-xl transition-colors shrink-0"
                        title={item.bought ? 'ติ๊กยังไม่ได้ซื้อ' : 'ติ๊กซื้อแล้ว'}
                      >
                        {item.bought ? (
                          <CheckSquare className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-300 hover:text-emerald-600" />
                        )}
                      </button>

                      {/* Middle: Item details (Consolidated name & item count, NO customer names) */}
                      <div
                        onClick={() => handleOpenItemSheet(item)}
                        className="flex-1 min-w-0 cursor-pointer flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-base flex-shrink-0">
                          {catInfo.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4
                            className={`font-bold text-sm sm:text-base text-slate-900 truncate font-display ${
                              item.bought ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            แตะเพื่อดูการแบ่งส่ง {item.allocations?.length ? `(${item.allocations.length} บ้าน)` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Right: Consolidated Quantity Badge + Tap Chevron */}
                      <div
                        onClick={() => handleOpenItemSheet(item)}
                        className="flex items-center gap-2 cursor-pointer pl-1 shrink-0"
                      >
                        <div
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold text-center border ${
                            item.bought
                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200/90'
                          }`}
                        >
                          <span className="text-xs font-black">{item.totalQuantity}</span>{' '}
                          <span className="text-[10px]">{item.unit}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 📋 Flat List View */
        <div className="space-y-2.5">
          {pendingItems.map(item => {
            const catInfo = CATEGORY_LABELS[item.category];
            const allocatedCount = item.allocations?.length || 0;
            const housesSummary = item.allocations && item.allocations.length > 0
              ? item.allocations.map(a => a.houseNumber).slice(0, 3).join(', ') + (item.allocations.length > 3 ? '...' : '')
              : '';

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all overflow-hidden"
              >
                <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleBought(item.id)}
                    className="p-1 rounded-xl text-slate-300 hover:text-emerald-600 transition-colors"
                    title="ติ๊กซื้อแล้ว"
                  >
                    <Square className="w-6 h-6 text-slate-300 hover:text-emerald-600" />
                  </button>

                  <div
                    onClick={() => handleOpenItemSheet(item)}
                    className="flex-1 min-w-0 cursor-pointer flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg flex-shrink-0">
                      {catInfo.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 truncate font-display">
                          {item.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                        {allocatedCount > 0 ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1 font-medium">
                            <Home className="w-3 h-3 text-emerald-600" />
                            <span>ส่งให้ {allocatedCount} บ้าน: <strong>{housesSummary}</strong></span>
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1 font-medium">
                            <span>⚠️ ยังไม่ระบุบ้านส่ง • แตะเลือกบ้าน</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => handleOpenItemSheet(item)}
                    className="flex items-center gap-2 cursor-pointer pl-1"
                  >
                    <div className="bg-emerald-50 text-emerald-900 border border-emerald-200/90 px-2.5 py-1 rounded-xl text-xs font-bold text-center">
                      <span className="text-xs font-black">{item.totalQuantity}</span>{' '}
                      <span className="text-[10px] text-emerald-700">{item.unit}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </div>
            );
          })}

          {completedItems.length > 0 && (
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                <span>✓ ซื้อแล้ว ({completedItems.length} รายการ)</span>
              </div>

              {completedItems.map(item => {
                const catInfo = CATEGORY_LABELS[item.category];

                return (
                  <div
                    key={item.id}
                    className="bg-slate-50/80 rounded-2xl border border-slate-200/60 p-3 flex items-center justify-between gap-3 opacity-75"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleBought(item.id)}
                      className="p-1 rounded-xl text-emerald-600"
                      title="ติ๊กยังไม่ได้ซื้อ"
                    >
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                    </button>

                    <div
                      onClick={() => handleOpenItemSheet(item)}
                      className="flex-1 min-w-0 cursor-pointer flex items-center gap-2.5"
                    >
                      <span className="text-base opacity-60">{catInfo.icon}</span>
                      <span className="line-through text-slate-500 font-medium text-xs sm:text-sm truncate">
                        {item.name}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {item.totalQuantity} {item.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Switch to Delivery Mode Floating Bar */}
      {boughtItems > 0 && (
        <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-4 z-20">
          <button
            type="button"
            onClick={onSwitchToDelivery}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-600/30 font-bold text-xs sm:text-sm flex items-center justify-between active:scale-95 transition-all"
          >
            <span>ซื้อเสร็จแล้ว ➔ ไปโหมดส่งของ</span>
            <div className="flex items-center gap-1 text-xs bg-emerald-700 px-2.5 py-1 rounded-xl">
              <span>ที่ต้องส่ง</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* GRAB-STYLE ITEM BOTTOM SHEET MODAL: "ส่งให้ใคร ที่ไหน" */}
      {allocatingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 space-y-4 p-5 animate-in slide-in-from-bottom-6 duration-200">
            {/* Sheet Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl border border-emerald-100 flex-shrink-0">
                  {CATEGORY_LABELS[allocatingItem.category].icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 font-display">
                    {allocatingItem.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      รวมทั้งหมด: {allocatingItem.totalQuantity} {allocatingItem.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleBought(allocatingItem.id)}
                      className={`text-xs px-2 py-0.5 rounded-lg font-bold border ${
                        allocatingItem.bought
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {allocatingItem.bought ? '✓ ซื้อแล้ว' : 'ยังไม่ได้ซื้อ'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAllocatingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECTION 1: 🏠 รายการบ้านที่ต้องส่ง (ส่งให้ใคร ที่ไหน) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ส่งให้ใคร ที่ไหน (บ้านที่ได้รับสินค้านี้)</span>
                </h4>
                <span className="text-xs text-slate-400 font-medium">
                  {allocatingItem.allocations?.length || 0} บ้าน
                </span>
              </div>

              {allocatingItem.allocations && allocatingItem.allocations.length > 0 ? (
                <div className="space-y-2">
                  {allocatingItem.allocations.map(alloc => (
                    <div
                      key={alloc.orderId}
                      className="bg-slate-50 rounded-2xl border border-slate-200 p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 font-bold text-sm">
                            {alloc.houseNumber}
                          </strong>
                          {alloc.building && (
                            <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded font-medium">
                              {alloc.building}
                            </span>
                          )}
                          {alloc.soi && (
                            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                              {alloc.soi}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          ผู้รับ: <strong className="text-slate-800">{alloc.customerName}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs font-bold">
                          {alloc.quantity} {alloc.unit}
                        </span>

                        {onRemoveAllocation && (
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveAllocation(
                                allocatingItem.name,
                                allocatingItem.unit,
                                alloc.orderId || alloc.houseNumber
                              );
                              setAllocatingItem(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  allocations: prev.allocations.filter(a => a.orderId !== alloc.orderId)
                                };
                              });
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="ลบรายการนี้ออกจากบ้านนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900">
                  <p className="font-semibold">⚠️ สินค้านี้ยังไม่ได้ระบุบ้านส่ง</p>
                  <p className="text-amber-700 mt-0.5 text-[11px]">
                    คุณสามารถเลือกออเดอร์ หรือใส่บ้านเลขที่ด้านล่าง เพื่อจัดสรรของชิ้นนี้ให้บ้านลูกค้าได้ทันที
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 2: ➕ เลือกว่าจะส่งให้ใคร ที่ไหน (จัดสรรเพิ่ม) */}
            <form onSubmit={handleConfirmAllocation} className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>จัดสรรเพิ่มให้บ้านอื่น</span>
              </h4>

              {/* Mode Switcher */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAllocTargetMode('existing')}
                  className={`py-1.5 px-2 rounded-lg transition-all ${
                    allocTargetMode === 'existing'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ออเดอร์วันนี้ ({existingOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAllocTargetMode('frequent')}
                  className={`py-1.5 px-2 rounded-lg transition-all ${
                    allocTargetMode === 'frequent'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ลูกค้าประจำ ⭐
                </button>
                <button
                  type="button"
                  onClick={() => setAllocTargetMode('new')}
                  className={`py-1.5 px-2 rounded-lg transition-all ${
                    allocTargetMode === 'new'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + เพิ่มบ้านใหม่
                </button>
              </div>

              {/* MODE 1: เลือกจากออเดอร์ที่มีอยู่แล้ววันนี้ */}
              {allocTargetMode === 'existing' && (
                <div className="space-y-2">
                  {existingOrders.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                      ยังไม่มีออเดอร์ส่งของในระบบวันนี้ กรุณาเลือก "+ เพิ่มบ้านใหม่"
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        เลือกบ้านจากคิวส่งของวันนี้:
                      </label>
                      <select
                        value={selectedOrderId}
                        onChange={e => setSelectedOrderId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                      >
                        {existingOrders.map(order => (
                          <option key={order.id} value={order.id}>
                            Stop #{order.stopNumber}: {order.houseNumber} {order.building ? `(${order.building})` : ''} - {order.customerName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: เลือกจากลูกค้าประจำ ⭐ */}
              {allocTargetMode === 'frequent' && (
                <div className="space-y-2">
                  {contactsList.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                      ยังไม่มีรายชื่อลูกค้าประจำ สามารถพิมพ์บ้านใหม่และติ๊ก ⭐ เพื่อบันทึกได้
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        เลือกลูกค้าประจำ:
                      </label>
                      <select
                        value={selectedContactId}
                        onChange={e => {
                          setSelectedContactId(e.target.value);
                          const c = contactsList.find(it => it.id === e.target.value);
                          if (c) {
                            setAllocCustomerName(c.name);
                            setAllocHouseNumber(c.houseNumber || '');
                            setAllocSoi(c.soi || '');
                            setAllocBuilding(c.building || '');
                            setAllocPhone(c.phone || '');
                            setAllocLocationId(c.locationId || '');
                          }
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                      >
                        <option value="">-- แตะเพื่อเลือกลูกค้าประจำ --</option>
                        {contactsList.map(c => (
                          <option key={c.id} value={c.id}>
                            ⭐ {c.name} ({c.houseNumber || 'ไม่ระบุบ้าน'} {c.building || c.soi || ''})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 3: เพิ่มบ้านเลขที่ใหม่แบบเจาะจงสถานที่ */}
              {allocTargetMode === 'new' && (
                <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                  {/* Location Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      โครงการ / สถานที่ส่ง:
                    </label>
                    <select
                      value={allocLocationId}
                      onChange={e => handleLocationChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                    >
                      <option value="">-- เลือกสถานที่ส่ง (ไอวี่ริเวอร์, เฌอ, ธนศิลป์, เดอะแพลนท์...) --</option>
                      {REAL_LOCATIONS.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.type === 'condo' ? '🏢' : '🏡'} {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project specific inputs */}
                  {allocLocationId === 'ivy-river' && (
                    <div className="p-2.5 bg-white rounded-xl border border-teal-200 space-y-2">
                      <label className="block text-[11px] font-bold text-teal-900">
                        🏢 เลือกตึก (ไอวี่ริเวอร์):
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['ตึก A (51/)', 'ตึก D (57/)', 'ตึก C (53/)'].map(bld => (
                          <button
                            type="button"
                            key={bld}
                            onClick={() => handleBuildingChange(bld)}
                            className={`py-1.5 px-2 text-xs rounded-lg font-bold border transition-all ${
                              allocBuilding === bld
                                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {bld}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {allocLocationId === 'the-plant' && (
                    <div className="p-2.5 bg-white rounded-xl border border-teal-200 space-y-2">
                      <label className="block text-[11px] font-bold text-teal-900">
                        🏡 ประเภทบ้าน (เดอะแพลนท์):
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['บ้านเดี่ยว (81/)', 'ทาวน์โฮม (79/)'].map(t => (
                          <button
                            type="button"
                            key={t}
                            onClick={() => handlePlantTypeChange(t)}
                            className={`py-1.5 px-2 text-xs rounded-lg font-bold border transition-all ${
                              allocBuilding === t
                                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {allocLocationId === 'plum-condo' && (
                    <div className="p-2.5 bg-white rounded-xl border border-teal-200 space-y-2">
                      <label className="block text-[11px] font-bold text-teal-900">
                        🏢 เลือกตึก (พลัมคอนโด):
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['ตึก A', 'ตึก B', 'ตึก C'].map(bld => (
                          <button
                            type="button"
                            key={bld}
                            onClick={() => setAllocBuilding(bld)}
                            className={`py-1.5 px-2 text-xs rounded-lg font-bold border transition-all ${
                              allocBuilding === bld
                                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {bld}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {allocLocationId === 'thanasin' && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        เลือกซอย (ม.ธนศิลป์):
                      </label>
                      <select
                        value={allocSoi}
                        onChange={e => setAllocSoi(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                      >
                        {['ซอย 1/1', 'ซอย 1/2', 'ซอย 2/1', 'ซอย 2/2', 'ซอย 3/1', 'ซอย 3/2', 'ซอย 4/1', 'ซอย 4/2'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* House Number & Customer Name */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        บ้านเลขที่ / ห้อง: *
                      </label>
                      <input
                        type="text"
                        required
                        value={allocHouseNumber}
                        onChange={e => setAllocHouseNumber(e.target.value)}
                        placeholder="เช่น 51/104 หรือ 800/22"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        ชื่อลูกค้า / ผู้รับ:
                      </label>
                      <input
                        type="text"
                        value={allocCustomerName}
                        onChange={e => setAllocCustomerName(e.target.value)}
                        placeholder="เช่น พี่หนุ่ม, คุณนก"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        เบอร์โทร:
                      </label>
                      <input
                        type="tel"
                        value={allocPhone}
                        onChange={e => setAllocPhone(e.target.value)}
                        placeholder="08x-xxx-xxxx"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                    </div>

                    <div className="flex items-center pt-4">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={allocSaveFrequent}
                          onChange={e => setAllocSaveFrequent(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <span>⭐ บันทึกเป็นลูกค้าประจำ</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Shop Name & Cost Price (Price Memory) */}
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/90 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Store className="w-3.5 h-3.5 text-amber-700" />
                  <span>ร้านค้า & ต้นทุนที่ซื้อ (จดจำราคาอัตโนมัติ)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      ร้านค้าที่ซื้อ:
                    </label>
                    <input
                      type="text"
                      value={itemShopName}
                      onChange={e => setItemShopName(e.target.value)}
                      placeholder="เช่น ป้าณีผักสด, เขียงหมูนคร"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-amber-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      ต้นทุนที่ซื้อ (฿):
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={itemCostPrice}
                      onChange={e => setItemCostPrice(e.target.value)}
                      placeholder="เช่น 25"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-amber-300 bg-white font-bold text-amber-900"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-amber-700 leading-tight">
                  💡 บันทึกครั้งเดียว ระบบจะจำต้นทุนและร้านค้านี้ไว้คำนวณกำไร-ขาดทุนให้อัตโนมัติทุกครั้ง
                </p>
              </div>

              {/* Quantity to allocate */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    จำนวนที่ส่ง: *
                  </label>
                  <input
                    type="text"
                    required
                    value={allocQty}
                    onChange={e => setAllocQty(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    หน่วย:
                  </label>
                  <input
                    type="text"
                    value={allocUnit}
                    onChange={e => setAllocUnit(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    ราคาขาย (฿):
                  </label>
                  <input
                    type="number"
                    value={allocPrice}
                    onChange={e => setAllocPrice(e.target.value)}
                    placeholder="เว้นว่างได้"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-center"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกการส่งให้บ้านนี้ (เชื่อมกับแท็บส่งทันที)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
