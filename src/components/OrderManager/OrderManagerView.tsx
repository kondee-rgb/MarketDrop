'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  Plus,
  ArrowUpDown,
  Layers,
  ListFilter,
  Search,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { Order, SortDirection, SortMode } from '@/types/order';
import { OrderCardAdmin } from './OrderCardAdmin';
import { LinePasteModal } from './LinePasteModal';
import { ManualOrderModal } from './ManualOrderModal';
import { groupOrdersBySoi, reorderOrders } from '@/lib/natural-sort';
import { exportOrdersToCsv } from '@/lib/sheets';

interface OrderManagerViewProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  sortDirection: SortDirection;
  setSortDirection: (dir: SortDirection) => void;
  onApplySorting: (mode: SortMode, dir?: SortDirection) => void;
  onOpenDriverMode: () => void;
  onOpenSheetsModal: () => void;
}

export function OrderManagerView({
  orders,
  setOrders,
  sortMode,
  setSortMode,
  sortDirection,
  setSortDirection,
  onApplySorting,
  onOpenDriverMode,
  onOpenSheetsModal
}: OrderManagerViewProps) {
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isGroupedView, setIsGroupedView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // กรองออเดอร์ตามคำค้นหา
  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.houseNumber.toLowerCase().includes(q) ||
      o.soi.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      o.items.some(i => i.name.toLowerCase().includes(q))
    );
  });

  const handleAddOrders = (newOrders: Order[]) => {
    setOrders(prev => {
      const combined = [...prev, ...newOrders];
      return combined.map((ord, idx) => ({ ...ord, stopNumber: idx + 1 }));
    });
    // Auto sort with current mode
    onApplySorting(sortMode, sortDirection);
  };

  const handleSaveManualOrder = (saved: Order) => {
    setOrders(prev => {
      const exists = prev.some(o => o.id === saved.id);
      if (exists) {
        return prev.map(o => (o.id === saved.id ? saved : o));
      } else {
        const next = [...prev, saved];
        return next.map((o, idx) => ({ ...o, stopNumber: idx + 1 }));
      }
    });
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm('คุณต้องการลบออเดอร์นี้ใช่หรือไม่?')) {
      setOrders(prev => {
        const filtered = prev.filter(o => o.id !== id);
        return filtered.map((ord, idx) => ({ ...ord, stopNumber: idx + 1 }));
      });
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setOrders(prev => reorderOrders(prev, index, index - 1));
    setSortMode('MANUAL');
  };

  const handleMoveDown = (index: number) => {
    if (index === orders.length - 1) return;
    setOrders(prev => reorderOrders(prev, index, index + 1));
    setSortMode('MANUAL');
  };

  const handleExportCsv = () => {
    const csvData = exportOrdersToCsv(orders);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `marketdrop-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAll = () => {
    if (confirm('คุณต้องการล้างรายการออเดอร์ทั้งหมดในหน้านี้ใช่หรือไม่?')) {
      setOrders([]);
    }
  };

  const grouped = groupOrdersBySoi(filteredOrders);

  return (
    <div className="space-y-4">
      {/* Action Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Main Action Buttons */}
          <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
            <button
              onClick={() => setIsPasteModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <ClipboardList className="w-4 h-4" />
              <span>วางแชท LINE</span>
            </button>

            <button
              onClick={() => {
                setEditingOrder(null);
                setIsManualModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มออเดอร์</span>
            </button>

            <button
              onClick={onOpenSheetsModal}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ซิงค์ชีต</span>
            </button>

            <button
              onClick={handleExportCsv}
              title="ดาวน์โหลดไฟล์ CSV สำหรับ Excel / Google Sheets"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              <Download className="w-4 h-4" />
              <span>โหลด CSV</span>
            </button>
          </div>

          {/* Quick Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาบ้านเลขที่, ซอย, ชื่อ, ของ..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Smart Sorting Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-500">เรียงตาม</span>

            {/* Sort 1: Natural House Number */}
            <button
              onClick={() => onApplySorting('NATURAL_HOUSE', sortDirection)}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                sortMode === 'NATURAL_HOUSE'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              เลขบ้าน
            </button>

            {/* Sort 2: Soi then House */}
            <button
              onClick={() => onApplySorting('SOI_THEN_HOUSE', sortDirection)}
              className={`px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                sortMode === 'SOI_THEN_HOUSE'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ซอย → เลขบ้าน
            </button>

            {/* Direction Toggle */}
            <button
              onClick={() => {
                const nextDir = sortDirection === 'ASC' ? 'DESC' : 'ASC';
                setSortDirection(nextDir);
                onApplySorting(sortMode, nextDir);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortDirection === 'ASC' ? 'น้อย ➔ มาก' : 'มาก ➔ น้อย'}</span>
            </button>
          </div>

          {/* Group View Toggle & Clear All */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGroupedView(!isGroupedView)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                isGroupedView
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isGroupedView ? 'มุมมองปกติ' : 'จัดกลุ่มตามซอย'}</span>
            </button>

            {orders.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="ล้างข้อมูลทั้งหมด"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List / Groups */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ListFilter className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-700">ไม่พบรายการออเดอร์</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            กดปุ่ม &ldquo;วางแชท LINE&rdquo; เพื่อดึงข้อมูลออเดอร์จากแชท หรือกดปุ่ม &ldquo;เพิ่มออเดอร์&rdquo;
          </p>
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
          >
            <ClipboardList className="w-4 h-4" /> วางข้อความจาก LINE เลย
          </button>
        </div>
      ) : isGroupedView ? (
        /* Grouped by Soi View */
        <div className="space-y-4">
          {grouped.map((group, groupIdx) => (
            <div key={groupIdx} className="bg-slate-50/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>{group.soi}</span>
                  <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {group.orders.length} หลัง
                  </span>
                </h3>
              </div>
              <div className="space-y-2.5">
                {group.orders.map((order, idx) => (
                  <OrderCardAdmin
                    key={order.id}
                    order={order}
                    index={orders.findIndex(o => o.id === order.id)}
                    totalOrders={orders.length}
                    onMoveUp={() => handleMoveUp(orders.findIndex(o => o.id === order.id))}
                    onMoveDown={() => handleMoveDown(orders.findIndex(o => o.id === order.id))}
                    onEdit={() => {
                      setEditingOrder(order);
                      setIsManualModalOpen(true);
                    }}
                    onDelete={() => handleDeleteOrder(order.id)}
                    onSelectForDriver={onOpenDriverMode}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat Ordered List */
        <div className="space-y-2.5">
          {filteredOrders.map((order, idx) => (
            <OrderCardAdmin
              key={order.id}
              order={order}
              index={idx}
              totalOrders={filteredOrders.length}
              onMoveUp={() => handleMoveUp(idx)}
              onMoveDown={() => handleMoveDown(idx)}
              onEdit={() => {
                setEditingOrder(order);
                setIsManualModalOpen(true);
              }}
              onDelete={() => handleDeleteOrder(order.id)}
              onSelectForDriver={onOpenDriverMode}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <LinePasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onAddOrders={handleAddOrders}
        existingOrdersCount={orders.length}
      />

      <ManualOrderModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingOrder(null);
        }}
        onSaveOrder={handleSaveManualOrder}
        initialOrder={editingOrder}
        existingOrdersCount={orders.length}
      />
    </div>
  );
}
