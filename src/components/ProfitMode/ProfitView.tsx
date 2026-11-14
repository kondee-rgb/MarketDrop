'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TripPlanner } from './TripPlanner';
import { MoneySplitBar, ProfitTrendChart, TopItemBars } from './ProfitCharts';
import { DayOrders } from './DayOrders';
import {
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
  Calendar,
  BarChart3,
  Wallet,
  Trophy
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
  calculateCollectionStats,
  ItemProfitDetail
} from '@/lib/profit-aggregator';
import { CATEGORY_LABELS } from '@/lib/shopping-aggregator';
import {
  getProfitAnalyticsByPeriod,
  syncSnapshotsFromOrders,
  ordersOnDate,
  clearProfitHistory,
  deleteProfitRecord,
  toLocalDateStr,
  AnalyticsPeriod,
  PeriodProfitAnalytics
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
  const [isFuelCardOpen, setIsFuelCardOpen] = useState(false); // header already shows the total

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
  const [customDate, setCustomDate] = useState<string>(() => toLocalDateStr());

  useEffect(() => {
    setPriceBookEntries(getPriceBook());
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Total km comes from the trip planner
  const handleTripKm = useCallback((km: number) => {
    setFuelConfig(prev => {
      if (prev.distanceKm === km) return prev;
      const next = { ...prev, distanceKm: km };
      saveFuelConfig(next);
      return next;
    });
  }, []);

  // Fuel config handlers
  const handleUpdateFuel = (key: keyof FuelConfig, value: number | string) => {
    const updated: FuelConfig = {
      ...fuelConfig,
      [key]: typeof value === 'string' ? parseFloat(value) || 0 : value
    };
    setFuelConfig(updated);
    saveFuelConfig(updated);
  };

  // "Today" = orders created today only (yesterday's leftovers stay in yesterday)
  const todayOrders = useMemo(() => ordersOnDate(orders, toLocalDateStr()), [orders]);
  const profitSummary: DailyProfitSummary = useMemo(
    () => calculateDailyProfit(todayOrders, fuelConfig, manualShoppingItems),
    [todayOrders, fuelConfig, manualShoppingItems]
  );
  const collection = useMemo(() => calculateCollectionStats(todayOrders), [todayOrders]);
  const paymentSegments = [
    { key: 'TRANSFER', label: 'โอน', value: collection.byMethod.TRANSFER, color: 'bg-emerald-500' },
    { key: 'QR_SCAN', label: 'สแกน QR', value: collection.byMethod.QR_SCAN, color: 'bg-sky-500' },
    { key: 'CASH', label: 'เงินสด', value: collection.byMethod.CASH, color: 'bg-slate-300' },
    { key: 'PARTIAL', label: 'จ่ายบางส่วน', value: collection.byMethod.PARTIAL, color: 'bg-violet-300' },
    { key: 'OUT', label: 'ค้าง', value: collection.outstanding, color: 'bg-amber-300' }
  ].filter(seg => seg.value > 0);
  const topItems = useMemo(
    () => profitSummary.itemsBreakdown.filter(it => it.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, 3),
    [profitSummary]
  );

  // Keep each day's history record in step with that day's orders
  useEffect(() => {
    syncSnapshotsFromOrders(orders, fuelConfig, manualShoppingItems);
  }, [orders, fuelConfig, manualShoppingItems]);

  // Query analytics for selected period
  const periodAnalytics: PeriodProfitAnalytics = getProfitAnalyticsByPeriod(
    selectedPeriod,
    customDate,
    customDate
  );

  // "today" has a single day, so the chart shows the last week for context
  // Today's stored snapshot is written after render, so use the live numbers for today's bar
  const todayStr = toLocalDateStr();
  const trendData = (selectedPeriod === 'today' ? getProfitAnalyticsByPeriod('7days').dailyTrends : periodAnalytics.dailyTrends).map(d =>
    d.date === todayStr
      ? {
          ...d,
          revenue: profitSummary.totalRevenue,
          netProfit: profitSummary.netProfit,
          orders: profitSummary.totalOrders,
          marginPercent: profitSummary.netMarginPercent
        }
      : d
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
      <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-slate-200/60 text-xs" role="tablist" aria-label="ช่วงเวลา">
        {[
          { id: 'today', label: 'วันนี้' },
          { id: '7days', label: '7 วัน' },
          { id: 'this_month', label: 'เดือนนี้' },
          { id: 'all', label: 'ทั้งหมด' },
          { id: 'custom', label: 'เลือกวัน' }
        ].map(p => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={selectedPeriod === p.id}
            onClick={() => setSelectedPeriod(p.id as AnalyticsPeriod)}
            className={`py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedPeriod === p.id ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
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

      {/* Summary: net profit first, then where the money went */}
      {(() => {
        const isToday = selectedPeriod === 'today';
        const net = isToday ? profitSummary.netProfit : periodAnalytics.netProfit;
        const revenue = isToday ? profitSummary.totalRevenue : periodAnalytics.totalRevenue;
        const margin = isToday ? profitSummary.netMarginPercent : periodAnalytics.profitMarginPercent;
        const periodTitle =
          selectedPeriod === 'today' ? 'วันนี้'
          : selectedPeriod === '7days' ? '7 วันล่าสุด'
          : selectedPeriod === 'this_month' ? 'เดือนนี้'
          : selectedPeriod === 'all' ? 'ทั้งหมด'
          : `วันที่ ${customDate}`;
        return (
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xs text-slate-500">{periodTitle} · {net < 0 ? 'ขาดทุนสุทธิ' : 'กำไรสุทธิ'}</h2>
                <p className={`text-4xl font-semibold tabular-nums tracking-tight leading-tight ${net < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ฿{Math.abs(net).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                  ขาย ฿{revenue.toLocaleString()} · อัตรากำไร {margin}%
                  {' · '}
                  {isToday
                    ? `ส่งแล้ว ${profitSummary.totalDeliveredOrders}/${profitSummary.totalOrders} หลัง`
                    : `${periodAnalytics.totalOrders} ออเดอร์ ${periodAnalytics.daysRecorded} วัน`}
                </p>
                {!isToday && periodAnalytics.daysRecorded > 1 && (
                  <p className="text-xs text-slate-500 tabular-nums">
                    เฉลี่ยต่อวัน: ขาย ฿{periodAnalytics.averageDailyRevenue.toLocaleString()} · กำไร ฿{periodAnalytics.averageDailyNetProfit.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  aria-label="ส่งออกรายงาน CSV"
                  title="ส่งออกรายงาน CSV"
                  className="w-10 h-10 flex items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenSheetsModal}
                  aria-label="ตั้งค่า Google Sheets"
                  title="ตั้งค่า Google Sheets"
                  className="w-10 h-10 flex items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
              </div>
            </div>

            <MoneySplitBar
              revenue={revenue}
              cost={isToday ? profitSummary.totalProduceCost : periodAnalytics.totalProduceCost}
              travel={isToday ? profitSummary.totalTransportExpense : periodAnalytics.totalExpenses - periodAnalytics.totalProduceCost}
            />
          </div>
        );
      })()}

      {/* Collection & Insights Card (live, today) */}
      {selectedPeriod === 'today' && collection.billed > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h3 className="text-[15px] font-semibold text-slate-900 font-display flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-500" aria-hidden="true" />
            เก็บเงินวันนี้
          </h3>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-slate-50 p-2.5">
              <p className="text-[11px] text-slate-500">ได้รับแล้ว</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums">฿{collection.collected.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-amber-50/80 p-2.5">
              <p className="text-[11px] text-amber-800">ยังค้างเก็บ</p>
              <p className="text-sm font-bold text-amber-900 tabular-nums">฿{collection.outstanding.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-2.5">
              <p className="text-[11px] text-slate-500">เฉลี่ย/บิล</p>
              <p className="text-sm font-bold text-slate-800 tabular-nums">฿{collection.avgOrderValue.toLocaleString()}</p>
            </div>
          </div>

          {/* Stacked payment-mix bar */}
          <div className="space-y-2">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 gap-0.5">
              {paymentSegments.map(seg => (
                  <div
                    key={seg.key}
                    title={`${seg.label} ฿${seg.value.toLocaleString()}`}
                    className={`${seg.color} animate-grow`}
                    style={{ width: `${(seg.value / collection.billed) * 100}%` }}
                  />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
              {paymentSegments.map(seg => (
                  <span key={seg.key} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${seg.color}`} />
                    {seg.label} <strong className="tabular-nums text-slate-800">฿{seg.value.toLocaleString()}</strong>
                  </span>
                ))}
            </div>
          </div>

          {topItems.length > 0 && topItems[0].profit > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                สินค้าทำกำไรสูงสุด
              </p>
              <TopItemBars items={topItems} />
            </div>
          )}
        </div>
      )}

      {/* Daily Trends Visualization Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                กำไรรายวัน
              </h3>
              <p className="text-[11px] text-slate-500">
                {selectedPeriod === 'today' ? '7 วันล่าสุด · แตะแท่งเพื่อดูรายละเอียด' : 'แตะแท่งเพื่อดูรายละเอียดแต่ละวัน'}
              </p>
            </div>
          </div>
          {periodAnalytics.daysRecorded > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('ลบประวัติกำไรย้อนหลังทั้งหมด? (ออเดอร์วันนี้ไม่หาย)')) {
                  clearProfitHistory();
                  showToast('ลบประวัติกำไรแล้ว');
                }
              }}
              className="text-xs font-medium text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-lg"
            >
              ล้างประวัติ
            </button>
          )}
        </div>

        <ProfitTrendChart
          data={trendData}
          onDeleteDay={date => {
            if (confirm(`ลบประวัติกำไรของวันที่ ${date}? (ข้อมูลในชีตไม่หาย)`)) {
              deleteProfitRecord(date);
              showToast('ลบวันนั้นออกจากประวัติแล้ว');
            }
          }}
          renderDetail={date => <DayOrders date={date} localOrders={orders} />}
        />
      </div>

      {/* Trip & Fuel Card */}
      <div className="bg-white rounded-3xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 space-y-4">
        <button
          type="button"
          onClick={() => setIsFuelCardOpen(!isFuelCardOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900 font-display">ค่าเดินทางวันนี้</h3>
              <p className="text-xs text-slate-500 tabular-nums">
                {fuelConfig.distanceKm} กม. · น้ำมัน ฿{profitSummary.fuelResult.fuelCost}
                {fuelConfig.otherExpenses > 0 ? ` · อื่นๆ ฿${fuelConfig.otherExpenses}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-900 tabular-nums">
              ฿{profitSummary.totalTransportExpense.toLocaleString()}
            </span>
            {isFuelCardOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {/* kept mounted (hidden) so the route total still feeds the calculation when collapsed */}
        <div className={isFuelCardOpen ? 'space-y-4 pt-1 animate-in fade-in duration-200' : 'hidden'}>
          <TripPlanner onTotalKmChange={handleTripKm} />

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'consumptionKmPerLiter' as const, label: 'กม./ลิตร', step: '0.5' },
              { key: 'fuelPricePerLiter' as const, label: 'ราคาน้ำมัน ฿/ลิตร', step: '0.1' },
              { key: 'otherExpenses' as const, label: 'ทางด่วน/จอด ฿', step: '1' }
            ].map(f => (
              <label key={f.key} className="block">
                <span className="block text-[11px] text-slate-500 mb-1">{f.label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={f.step}
                  value={fuelConfig[f.key]}
                  onChange={e => handleUpdateFuel(f.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm font-medium tabular-nums rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </label>
            ))}
          </div>

          <p className="text-xs text-slate-500 tabular-nums">
            ใช้น้ำมันประมาณ {profitSummary.fuelResult.litersUsed} ลิตร
            {profitSummary.fuelResult.costPerKm > 0 ? ` · ฿${profitSummary.fuelResult.costPerKm}/กม.` : ''}
          </p>
        </div>
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
            className="flex items-center gap-1 text-xs text-emerald-700 font-bold hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl active:scale-95 transition-all"
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

              <div className="p-3 bg-emerald-50/70 rounded-2xl text-[11px] text-emerald-900">
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
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 shadow-2xl border border-slate-100 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
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
            <form onSubmit={handleCreatePriceBookEntry} className="bg-slate-50 p-3 rounded-2xl space-y-2 text-xs">
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
            <div className="space-y-2 max-h-[40dvh] overflow-y-auto">
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
