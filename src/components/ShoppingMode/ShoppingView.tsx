'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  CheckSquare,
  Square,
  Plus,
  Camera,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Trash2,
  Search,
  Filter,
  ArrowRight,
  X
} from 'lucide-react';
import { ShoppingItem } from '@/types/order';
import { CATEGORY_LABELS } from '@/lib/shopping-aggregator';

interface ShoppingViewProps {
  items: ShoppingItem[];
  onToggleBought: (itemId: string) => void;
  onAddManualItem: (name: string, quantity: string, unit: string, category: ShoppingItem['category']) => void;
  onRemoveManualItem: (itemId: string) => void;
  onOpenPhotoModal: () => void;
  onSwitchToDelivery: () => void;
}

export function ShoppingView({
  items,
  onToggleBought,
  onAddManualItem,
  onRemoveManualItem,
  onOpenPhotoModal,
  onSwitchToDelivery
}: ShoppingViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('กก.');
  const [newItemCategory, setNewItemCategory] = useState<ShoppingItem['category']>('veg');

  const totalItems = items.length;
  const boughtItems = items.filter(it => it.bought).length;
  const percentComplete = totalItems > 0 ? Math.round((boughtItems / totalItems) * 100) : 0;

  // Filter items
  const filteredItems = items.filter(it => {
    const matchesCategory = selectedCategory === 'all' || it.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || it.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pendingItems = filteredItems.filter(it => !it.bought);
  const completedItems = filteredItems.filter(it => it.bought);

  const handleCreateManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddManualItem(newItemName.trim(), newItemQty.trim() || '1', newItemUnit.trim() || 'กก.', newItemCategory);
    setNewItemName('');
    setNewItemQty('1');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12">
      {/* Top Banner: Shopping Status Bar */}
      <div className="bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 text-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-100/90">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight text-slate-800">
                ของที่ต้องซื้อจากตลาด
              </h2>
              <p className="text-xs text-slate-500">
                รวมของสดจากทุกบ้านเพื่อเหมาซื้อในตลาดสด
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenPhotoModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-2xl font-bold text-xs shadow-xs border border-emerald-300 active:scale-95 transition-all"
          >
            <Camera className="w-4 h-4 text-emerald-700" />
            <span>📸 ถ่ายโพยซื้อของ</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-3 border-t border-emerald-100/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 font-medium">ความคืบหน้าการซื้อของ</span>
            <span className="font-bold text-emerald-800">
              ซื้อแล้ว {boughtItems}/{totalItems} รายการ ({percentComplete}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/80">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาของสด..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm flex-shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มของ</span>
          </button>
        </div>

        {/* Category Horizontal Scrolling Badges */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold flex-shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด ({items.length})
          </button>

          {Object.entries(CATEGORY_LABELS).map(([catKey, catInfo]) => {
            const count = items.filter(it => it.category === catKey).length;
            if (count === 0 && selectedCategory !== catKey) return null;

            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 flex-shrink-0 transition-all ${
                  selectedCategory === catKey
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{catInfo.icon}</span>
                <span>{catInfo.label.split('/')[0].trim()} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Add Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateManualItem} className="bg-white border-2 border-emerald-400 rounded-2xl p-3.5 shadow-md space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b pb-1.5">
            <span className="font-bold text-xs text-slate-800">➕ เพิ่มของที่ต้องซื้อในตลาด</span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              required
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="ชื่อสินค้าสด เช่น หมูสามชั้น"
              className="flex-1 min-w-[140px] px-3 py-1.5 text-xs rounded-xl border border-slate-300"
            />
            <input
              type="text"
              value={newItemQty}
              onChange={e => setNewItemQty(e.target.value)}
              placeholder="จำนวน"
              className="w-16 px-2 py-1.5 text-xs rounded-xl border border-slate-300 text-center font-bold"
            />
            <input
              type="text"
              value={newItemUnit}
              onChange={e => setNewItemUnit(e.target.value)}
              placeholder="หน่วย"
              className="w-16 px-2 py-1.5 text-xs rounded-xl border border-slate-300 text-center"
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
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              เพิ่มเข้ารายการซื้อ
            </button>
          </div>
        </form>
      )}

      {/* Items Section: Pending Shopping Items */}
      <div className="space-y-2">
        {pendingItems.length === 0 && completedItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
            >
              <Camera className="w-4 h-4" /> ถ่ายรูปโพยตลาดเลย
            </button>
          </div>
        ) : (
          pendingItems.map(item => {
            const isExpanded = expandedItemId === item.id;
            const catBadge = CATEGORY_LABELS[item.category];

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm hover:border-emerald-400 transition-all overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                  {/* Left: Tap to Buy Checkbox */}
                  <button
                    type="button"
                    onClick={() => onToggleBought(item.id)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Square className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-base sm:text-lg text-slate-900 truncate">
                          {item.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold ${catBadge.bg}`}>
                          {catBadge.icon}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.allocations.length > 0 ? (
                          <span>สำหรับส่ง {item.allocations.length} บ้าน</span>
                        ) : (
                          <span>{item.sourceNote || 'เพิ่มโดยตรง'}</span>
                        )}
                      </p>
                    </div>
                  </button>

                  {/* Right: Quantity Badge & Breakdown Accordion Toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-base sm:text-lg font-black text-emerald-950 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                      {item.totalQuantity} <span className="text-xs font-bold text-emerald-700">{item.unit}</span>
                    </span>

                    {item.allocations.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        title="ดูรายละเอียดการแบ่งส่งบ้าน"
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}

                    {item.allocations.length === 0 && (
                      <button
                        type="button"
                        onClick={() => onRemoveManualItem(item.id)}
                        title="ลบรายการ"
                        className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded House Breakdown */}
                {isExpanded && item.allocations.length > 0 && (
                  <div className="bg-slate-50 border-t border-slate-200/80 px-4 py-2.5 space-y-1.5 text-xs animate-in fade-in duration-150">
                    <p className="font-bold text-slate-600">🏠 ยอดนี้แบ่งส่งให้บ้าน:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {item.allocations.map((alloc, aIdx) => (
                        <div key={aIdx} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                          <span className="font-semibold text-slate-800">
                            บ้านเลขที่ <strong>{alloc.houseNumber}</strong> ({alloc.customerName})
                          </span>
                          <span className="font-black text-emerald-700">
                            {alloc.quantity} {alloc.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Completed Items Section */}
      {completedItems.length > 0 && (
        <div className="space-y-2 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>✅ ซื้อเรียบร้อยแล้ว ({completedItems.length} รายการ)</span>
          </div>

          {completedItems.map(item => (
            <div
              key={item.id}
              className="bg-slate-50 rounded-2xl border border-emerald-200/70 p-3 flex items-center justify-between gap-3 opacity-80"
            >
              <button
                type="button"
                onClick={() => onToggleBought(item.id)}
                className="flex items-center gap-3 text-left flex-1 min-w-0"
              >
                <CheckSquare className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-sm text-slate-500 line-through truncate">
                  {item.name} ({item.totalQuantity} {item.unit})
                </span>
              </button>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                ซื้อแล้ว
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Switch to Delivery Mode Action Button */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onSwitchToDelivery}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-base shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all font-display"
        >
          <span>ซื้อของครบแล้ว ➔ สลับไปแท็บส่งของ (ที่ต้องส่ง) 🛵</span>
          <ArrowRight className="w-5 h-5 text-emerald-400" />
        </button>
      </div>
    </div>
  );
}
