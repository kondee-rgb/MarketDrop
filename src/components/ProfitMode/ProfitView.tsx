'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Fuel,
  ShoppingCart,
  Plus,
  Edit2,
  Trash2,
  Save,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Store,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
  X,
  HelpCircle,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Order, ShoppingItem, GoogleSheetsConfig } from '@/types/order';
import { FuelConfig, getFuelConfig, saveFuelConfig } from '@/lib/fuel-calc';
import {
  PriceBookEntry,
  getPriceBook,
  savePriceBookEntry,
  deletePriceBookEntry,
  updateCostAndSellingPrice
} from '@/lib/price-book';
import {
  DailyProfitSummary,
  calculateDailyProfit,
  ItemProfitDetail
} from '@/lib/profit-aggregator';
import { CATEGORY_LABELS } from '@/lib/shopping-aggregator';
import {
  getProfitAnalyticsByPeriod,
  saveDailyProfitSnapshot,
  AnalyticsPeriod,
  PeriodProfitAnalytics,
  DailyTrendPoint
} from '@/lib/historical-profit';

interface ProfitViewProps {
  orders: Order[];
  manualShoppingItems?: ShoppingItem[];
  sheetsConfig: GoogleSheetsConfig;
  onOpenSheetsModal: () => void;
  onUpdateItemCost?: (itemName: string, costPrice: number, shopName?: string) => void;
}

export function ProfitView({
  orders,
  manualShoppingItems = [],
  sheetsConfig,
  onOpenSheetsModal,
  onUpdateItemCost
}: ProfitViewProps) {
  // Fuel config state
  const [fuelConfig, setFuelConfig] = useState<FuelConfig>(getFuelConfig());
  const [isFuelCardOpen, setIsFuelCardOpen] = useState(true);

  // Price Book drawer state
  const [isPriceBookOpen, setIsPriceBookOpen] = useState(false);
  const [priceBookEntries, setPriceBookEntries] = useState<PriceBookEntry[]>([]);
  const [priceSearchQuery, setPriceSearchQuery] = useState('');

  // Editing single item modal/drawer
  const [editingItem, setEditingItem] = useState<ItemProfitDetail | null>(null);
  const [editCost, setEditCost] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editShop, setEditShop] = useState('');

  // New Price Book entry form state
  const [newEntryName, setNewEntryName] = useState('');
  const [newEntryShop, setNewEntryShop] = useState('');
  const [newEntryCost, setNewEntryCost] = useState('');
  const [newEntryPrice, setNewEntryPrice] = useState('');
  const [newEntryUnit, setNewEntryUnit] = useState('กก.');

  // Notification message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Historical Analytics state
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('today');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setPriceBookEntries(getPriceBook());
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fuel config handlers
  const handleUpdateFuel = (key: keyof FuelConfig, value: number | string) => {
    const updated: FuelConfig = {
      ...fuelConfig,
      [key]: typeof value === 'string' ? parseFloat(value) || 0 : value
    };
    setFuelConfig(updated);
    saveFuelConfig(updated);
  };

  // Recalculate P&L live
  const profitSummary: DailyProfitSummary = calculateDailyProfit(
    orders,
    fuelConfig,
    manualShoppingItems
  );

  // Auto-save today's snapshot on profit summary changes
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    saveDailyProfitSnapshot(todayStr, profitSummary);
  }, [profitSummary]);

  // Query analytics for selected period
  const periodAnalytics: PeriodProfitAnalytics = getProfitAnalyticsByPeriod(
    selectedPeriod,
    customDate,
    customDate
  );

  // Handle saving edited item cost/price
  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const costNum = parseFloat(editCost) || 0;
    const priceNum = parseFloat(editPrice) || editingItem.sellingPrice;
    const shopClean = editShop.trim() || editingItem.shopName || 'ตลาดสด';

    // 1. บันทึกลงใน Price Book เพื่อจดจำไว้ตลอดไป
    updateCostAndSellingPrice(editingItem.name, costNum, priceNum, shopClean, editingItem.unit);
    setPriceBookEntries(getPriceBook());

    // 2. อัปเดตใน state orders
    if (onUpdateItemCost) {
      onUpdateItemCost(editingItem.name, costNum, shopClean);
    }

    showToast(`บันทึกต้นทุน "${editingItem.name}" ฿${costNum} เรียบร้อย (ระบบจดจำแล้ว)`);
    setEditingItem(null);
  };

  // Add new price book entry
  const handleCreatePriceBookEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryName.trim()) return;

    savePriceBookEntry({
      itemName: newEntryName.trim(),
      shopName: newEntryShop.trim() || 'ตลาดสด',
      costPrice: parseFloat(newEntryCost) || 0,
      sellingPrice: parseFloat(newEntryPrice) || 0,
      unit: newEntryUnit.trim() || 'กก.',
      category: 'other'
    });

    setPriceBookEntries(getPriceBook());
    setNewEntryName('');
    setNewEntryShop('');
    setNewEntryCost('');
    setNewEntryPrice('');
    showToast(`เพิ่ม "${newEntryName.trim()}" ลงในสมุดราคาแล้ว`);
  };

  // Delete price book entry
  const handleDeletePriceBookEntry = (id: string) => {
    deletePriceBookEntry(id);
    setPriceBookEntries(getPriceBook());
    showToast('ลบรายการราคาเรียบร้อย');
  };

  // Filtered price book
  const filteredPriceBook = priceBookEntries.filter(it =>
    it.itemName.toLowerCase().includes(priceSearchQuery.toLowerCase()) ||
    it.shopName.toLowerCase().includes(priceSearchQuery.toLowerCase())
  );

  // Export CSV
  const handleExportCsv = () => {
    const headers = 'ชื่อสินค้า,หมวดหมู่,ร้านค้าที่ซื้อ,จำนวน,หน่วย,ต้นทุนต่อหน่วย(บาท),ราคาขายต่อหน่วย(บาท),ต้นทุนรวม(บาท),ยอดขายรวม(บาท),กำไร(บาท),มาร์จิ้น(%)';
    const rows = profitSummary.itemsBreakdown.map(it =>
      `"${it.name}","${CATEGORY_LABELS[it.category]?.label || it.category}","${it.shopName}",${it.quantity},"${it.unit}",${it.costPrice},${it.sellingPrice},${it.totalCost},${it.totalRevenue},${it.profit},${it.marginPercent}%`
    );

    const summaryRows = [
      '',
      `"ยอดขายรวม",,,,,,,,${profitSummary.totalRevenue}`,
      `"ต้นทุนของสดรวม",,,,,,,,${profitSummary.totalProduceCost}`,
      `"กำไรขั้นต้น",,,,,,,,${profitSummary.grossProfit} (${profitSummary.grossMarginPercent}%)`,
      `"ค่าน้ำมันและค่าเดินทาง",,,,,,,,${profitSummary.totalTransportExpense}`,
      `"กำไรสุทธิ",,,,,,,,${profitSummary.netProfit} (${profitSummary.netMarginPercent}%)`
    ];

    const csvContent = '\uFEFF' + [headers, ...rows, ...summaryRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MarketDrop_PnL_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ดาวน์โหลดรายงานกำไร CSV เรียบร้อย');
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Period Filter Tabs: วันนี้, 7 วัน, เดือนนี้, ทั้งหมด, เลือกวัน */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {[
          { id: 'today', label: '☀️ วันนี้' },
          { id: '7days', label: '📅 7 วันย้อนหลัง' },
          { id: 'this_month', label: '📊 เดือนนี้' },
          { id: 'all', label: '📈 ทั้งหมด' },
          { id: 'custom', label: '🗓️ เลือกวัน' },
        ].map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedPeriod(p.id as AnalyticsPeriod)}
            className={`px-3 py-1.5 rounded-2xl font-bold whitespace-nowrap transition-all border flex items-center gap-1 ${
              selectedPeriod === p.id
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date Picker for Custom Date Inspection */}
      {selectedPeriod === 'custom' && (
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">เลือกวันที่ต้องการดูย้อนหลัง:</span>
          </div>
          <input
            type="date"
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      )}

      {/* Hero P&L Card: Net Profit & Core Metrics */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                PROFIT & LOSS
              </span>
              <h2 className="text-lg sm:text-xl font-bold font-display text-slate-900 leading-tight">
                {selectedPeriod === 'today'
                  ? 'สรุปกำไร-ขาดทุนวันนี้'
                  : selectedPeriod === '7days'
                  ? 'สรุปกำไร-ขาดทุน (7 วันย้อนหลัง)'
                  : selectedPeriod === 'this_month'
                  ? 'สรุปกำไร-ขาดทุน (เดือนนี้)'
                  : selectedPeriod === 'all'
                  ? 'สรุปกำไร-ขาดทุน (ทั้งหมด)'
                  : `สรุปกำไร-ขาดทุน วันที่ ${customDate}`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportCsv}
              className="p-2 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-all"
              title="ส่งออกรายงาน CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenSheetsModal}
              className="p-2 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-all"
              title="ตั้งค่า Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </button>
          </div>
        </div>

        {/* Big Net Profit Display */}
        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 text-center space-y-1">
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            💎 กำไรสุทธิ (หักค่าน้ำมันแล้ว)
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-emerald-700 font-display tracking-tight leading-none py-0.5">
            ฿{(selectedPeriod === 'today' ? profitSummary.netProfit : periodAnalytics.netProfit).toLocaleString()}
          </h1>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800">
            <span>
              อัตรากำไร: <strong>{selectedPeriod === 'today' ? profitSummary.netMarginPercent : periodAnalytics.profitMarginPercent}%</strong>
            </span>
            <span>•</span>
            <span>
              {selectedPeriod === 'today'
                ? `ส่งสำเร็จ: ${profitSummary.totalDeliveredOrders}/${profitSummary.totalOrders} หลัง`
                : `รวม ${periodAnalytics.totalOrders} ออเดอร์ (${periodAnalytics.daysRecorded} วัน)`}
            </span>
          </div>
        </div>

        {/* 3 Metrics Grid: Revenue, Produce Cost, Transport Expense */}
        <div className="grid grid-cols-3 gap-2">
          {/* Revenue */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">💵 ยอดขายรวม</p>
            <p className="text-sm sm:text-base font-black text-slate-900 font-display mt-0.5">
              ฿{(selectedPeriod === 'today' ? profitSummary.totalRevenue : periodAnalytics.totalRevenue).toLocaleString()}
            </p>
          </div>

          {/* Produce Cost */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">🛒 ต้นทุนของสด</p>
            <p className="text-sm sm:text-base font-black text-rose-700 font-display mt-0.5">
              ฿{(selectedPeriod === 'today' ? profitSummary.totalProduceCost : periodAnalytics.totalProduceCost).toLocaleString()}
            </p>
          </div>

          {/* Fuel & Travel Expense */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">⛽ ค่าน้ำมัน</p>
            <p className="text-sm sm:text-base font-black text-amber-900 font-display mt-0.5">
              ฿{(selectedPeriod === 'today' ? profitSummary.totalTransportExpense : periodAnalytics.totalFuelCost).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Daily Averages if Viewing Period with History */}
        {selectedPeriod !== 'today' && periodAnalytics.daysRecorded > 1 && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-500 block">เฉลี่ยยอดขายต่อวัน</span>
              <strong className="text-xs text-slate-800 font-bold">
                ฿{periodAnalytics.averageDailyRevenue.toLocaleString()}
              </strong>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-emerald-700 block">เฉลี่ยกำไรสุทธิต่อวัน</span>
              <strong className="text-xs text-emerald-800 font-bold">
                ฿{periodAnalytics.averageDailyNetProfit.toLocaleString()}
              </strong>
            </div>
          </div>
        )}

        {/* Gross Profit Callout */}
        <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-200/60">
          <span>กำไรขั้นต้นจากของสด (ก่อนหักน้ำมัน):</span>
          <strong className="text-emerald-800 font-bold">
            ฿{(selectedPeriod === 'today' ? profitSummary.grossProfit : periodAnalytics.grossProfit).toLocaleString()} ({selectedPeriod === 'today' ? profitSummary.grossMarginPercent : periodAnalytics.grossMarginPercent}%)
          </strong>
        </div>
      </div>

      {/* Daily Trends Visualization Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                แนวโน้มกำไรรายวัน (Daily Profit Trends)
              </h3>
              <p className="text-[11px] text-slate-500">
                ประวัติยอดขายและกำไรสุทธิย้อนหลัง
              </p>
            </div>
          </div>
          {periodAnalytics.daysRecorded > 0 && (
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              เฉลี่ย ฿{periodAnalytics.averageDailyNetProfit.toLocaleString()}/วัน
            </span>
          )}
        </div>

        {periodAnalytics.dailyTrends.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            ยังไม่มีประวัติกำไรในช่วงเวลาที่เลือก ระบบจะบันทึกอัตโนมัติในแต่ละวัน
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {periodAnalytics.dailyTrends.map(day => (
              <div
                key={day.date}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3 text-xs"
              >
                <div className="w-24 font-bold text-slate-700 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{day.displayDate}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-normal pl-5">
                    {day.orders} ออเดอร์
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-500">ขาย: ฿{day.revenue.toLocaleString()}</span>
                    <span className="font-bold text-emerald-700">
                      กำไร: ฿{day.netProfit.toLocaleString()} ({day.marginPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(8, (day.netProfit / (day.revenue || 1)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fuel & Travel Calculator Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-3">
        <div
          onClick={() => setIsFuelCardOpen(!isFuelCardOpen)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <Fuel className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                เครื่องคำนวณค่าน้ำมัน (Fuel Expense)
              </h3>
              <p className="text-[11px] text-slate-500">
                ขับ {fuelConfig.distanceKm} กม. • น้ำมัน ฿{profitSummary.fuelResult.fuelCost} (฿{profitSummary.fuelResult.costPerKm}/กม.)
              </p>
            </div>
          </div>

          <div className="p-1 text-slate-400">
            {isFuelCardOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {isFuelCardOpen && (
          <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 gap-2.5">
              {/* Distance */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  📍 ระยะทางรวม (กิโลเมตร):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={fuelConfig.distanceKm}
                  onChange={e => handleUpdateFuel('distanceKm', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                  placeholder="เช่น 30"
                />
              </div>

              {/* Consumption: km/L */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  🚗 กี่กิโลเมตรต่อลิตร (km/L):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={fuelConfig.consumptionKmPerLiter}
                  onChange={e => handleUpdateFuel('consumptionKmPerLiter', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                  placeholder="เช่น 14"
                />
              </div>

              {/* Fuel Price per Liter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ⛽ ราคาน้ำมัน (บาท/ลิตร):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={fuelConfig.fuelPricePerLiter}
                  onChange={e => handleUpdateFuel('fuelPricePerLiter', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                  placeholder="เช่น 38.50"
                />
              </div>

              {/* Other Expenses */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  🏷️ ค่าทางด่วน/ค่าจอด (บาท):
                </label>
                <input
                  type="number"
                  value={fuelConfig.otherExpenses}
                  onChange={e => handleUpdateFuel('otherExpenses', e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                  placeholder="เช่น 50"
                />
              </div>
            </div>

            {/* Live calculation banner */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <p className="text-amber-900 font-bold">
                  ใช้น้ำมันประมาณ: <strong>{profitSummary.fuelResult.litersUsed} ลิตร</strong>
                </p>
                <p className="text-[11px] text-amber-700">
                  ค่าน้ำมัน ฿{profitSummary.fuelResult.fuelCost} {fuelConfig.otherExpenses > 0 ? `+ ค่าอื่นๆ ฿${fuelConfig.otherExpenses}` : ''}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-amber-800 uppercase font-bold">รวมค่าเดินทาง</span>
                <p className="text-base font-black text-amber-950 font-display">
                  ฿{profitSummary.totalTransportExpense.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Item-by-Item Profit Breakdown Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              จำแนกกำไรของสดรายชิ้น ({profitSummary.itemsBreakdown.length} รายการ)
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setIsPriceBookOpen(true)}
            className="flex items-center gap-1 text-xs text-emerald-700 font-bold hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 active:scale-95 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>สมุดราคา ({priceBookEntries.length})</span>
          </button>
        </div>

        {profitSummary.itemsBreakdown.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-2">
            <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">ยังไม่มีรายการของสดในวันนี้</p>
            <p className="text-[11px] text-slate-500">
              เมื่อมีออเดอร์เข้ามา ระบบจะนำรายการสินค้ามาคำนวณต้นทุนและกำไรให้ทันที
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {profitSummary.itemsBreakdown.map(item => {
              const hasCost = item.costPrice > 0;
              const hasPrice = item.sellingPrice > 0;

              return (
                <div
                  key={`${item.name}_${item.unit}`}
                  className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between gap-3"
                >
                  {/* Left: Product and shop details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {CATEGORY_LABELS[item.category]?.icon || '📦'}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate font-display">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="flex items-center gap-0.5">
                            <Store className="w-3 h-3 text-slate-400" />
                            <span>{item.shopName}</span>
                          </span>
                          <span>•</span>
                          <span>ขายรวม: <strong>{item.quantity} {item.unit}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Cost vs Selling badges */}
                    <div className="flex items-center gap-1.5 mt-2 text-xs">
                      {/* Cost Pill - Clickable to edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setEditCost(item.costPrice ? String(item.costPrice) : '');
                          setEditPrice(item.sellingPrice ? String(item.sellingPrice) : '');
                          setEditShop(item.shopName || '');
                        }}
                        className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 font-semibold transition-all ${
                          hasCost
                            ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            : 'bg-amber-50 text-amber-800 border-amber-300 font-bold hover:bg-amber-100'
                        }`}
                        title="แตะเพื่อแก้ไขต้นทุน"
                      >
                        <span>ทุน: {hasCost ? `฿${item.costPrice}` : 'ระบุต้นทุน'}</span>
                        <Edit2 className="w-2.5 h-2.5 text-slate-400" />
                      </button>

                      {/* Selling price */}
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 font-semibold">
                        ขาย: {hasPrice ? `฿${item.sellingPrice}` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Calculated Profit */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">กำไร</span>
                    <p className={`text-base font-black font-display leading-tight ${
                      item.profit > 0 ? 'text-emerald-700' : item.profit < 0 ? 'text-rose-600' : 'text-slate-500'
                    }`}>
                      {item.profit > 0 ? `+฿${item.profit.toLocaleString()}` : `฿${item.profit.toLocaleString()}`}
                    </p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      item.marginPercent >= 20 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.marginPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Edit Cost & Selling Price for a Product */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl border border-slate-100 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">{CATEGORY_LABELS[editingItem.category]?.icon || '📦'}</span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-display">
                    บันทึกต้นทุน & ร้านค้า
                  </h3>
                  <p className="text-xs text-slate-500">{editingItem.name} ({editingItem.unit})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🛒 ร้านค้า / แผงค้าในตลาด:
                </label>
                <input
                  type="text"
                  value={editShop}
                  onChange={e => setEditShop(e.target.value)}
                  placeholder="เช่น เขียงหมูเจ๊พร ตลาดสด"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ต้นทุนต่อหน่วย (บาท): *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editCost}
                    onChange={e => setEditCost(e.target.value)}
                    placeholder="เช่น 120"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ราคาขายต่อหน่วย (บาท):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    placeholder="เช่น 150"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900">
                💡 <strong>ระบบจำอัตโนมัติ:</strong> เมื่อบันทึกแล้ว ครั้งหน้าที่ลูกค้าสั่ง <strong>"{editingItem.name}"</strong> ระบบจะดึงต้นทุนและคำนวณกำไรให้ทันทีโดยไม่ต้องกรอกซ้ำ
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกและจดจำราคา</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Price Memory Book Drawer */}
      {isPriceBookOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 shadow-2xl border border-slate-100 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-display">
                    สมุดราคา & ร้านค้าประจำ (Price Book)
                  </h3>
                  <p className="text-xs text-slate-500">จดจำต้นทุนและราคาขายอัตโนมัติ ({priceBookEntries.length} รายการ)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPriceBookOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={priceSearchQuery}
                onChange={e => setPriceSearchQuery(e.target.value)}
                placeholder="ค้นหาสินค้าหรือชื่อร้านค้า..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </div>

            {/* Add New Item to Price Book Form */}
            <form onSubmit={handleCreatePriceBookEntry} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-emerald-600" /> เพิ่มราคาสินค้าใหม่เข้าระบบ
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={newEntryName}
                  onChange={e => setNewEntryName(e.target.value)}
                  placeholder="ชื่อของสด เช่น หมูสันนอก"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
                />
                <input
                  type="text"
                  value={newEntryShop}
                  onChange={e => setNewEntryShop(e.target.value)}
                  placeholder="ร้านค้า เช่น เขียงหมูเจ๊พร"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="0.5"
                  required
                  value={newEntryCost}
                  onChange={e => setNewEntryCost(e.target.value)}
                  placeholder="ต้นทุน (฿)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-rose-700 font-bold"
                />
                <input
                  type="number"
                  step="0.5"
                  value={newEntryPrice}
                  onChange={e => setNewEntryPrice(e.target.value)}
                  placeholder="ราคาขาย (฿)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
                />
                <input
                  type="text"
                  value={newEntryUnit}
                  onChange={e => setNewEntryUnit(e.target.value)}
                  placeholder="หน่วย เช่น กก."
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-center"
                />
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl font-bold shadow-xs hover:bg-emerald-700"
                >
                  บันทึกลงสมุด
                </button>
              </div>
            </form>

            {/* List of Entries */}
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {filteredPriceBook.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  ไม่พบรายการในสมุดราคา
                </div>
              ) : (
                filteredPriceBook.map(entry => (
                  <div
                    key={entry.id}
                    className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <strong className="text-sm font-bold text-slate-900">{entry.itemName}</strong>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>ร้าน: {entry.shopName}</span>
                        <span>•</span>
                        <span className="text-rose-700 font-bold">ทุน: ฿{entry.costPrice}/{entry.unit}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">ขาย: ฿{entry.sellingPrice}/{entry.unit}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePriceBookEntry(entry.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="ลบรายการ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
