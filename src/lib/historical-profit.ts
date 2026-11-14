/**
 * Historical Profit Analytics & Daily Snapshots
 * จัดเก็บประวัติกำไร-ขาดทุนย้อนหลังรายวัน ('marketdrop_daily_profit_history_v1')
 * พร้อมระบบคำนวณแนวโน้มกำไรและตัวกรองช่วงเวลา (วันนี้, 7 วัน, เดือนนี้)
 */

import { DailyProfitSummary } from './profit-aggregator';

export interface DailyProfitRecord {
  date: string; // 'YYYY-MM-DD'
  totalRevenue: number; // ยอดขายรวม (บาท)
  totalProduceCost: number; // ต้นทุนของสด (บาท)
  grossProfit: number; // กำไรขั้นต้น (บาท)
  grossMarginPercent: number; // % กำไรขั้นต้น
  totalFuelCost: number; // ค่าน้ำมัน (บาท)
  totalOtherExpense: number; // ค่าใช้จ่ายอื่นๆ (บาท)
  totalExpenses: number; // ค่าใช้จ่ายรวม (บาท)
  netProfit: number; // กำไรสุทธิ (บาท)
  profitMarginPercent: number; // % กำไรสุทธิ
  orderCount: number; // จำนวนออเดอร์
  topProfitableItem?: string; // สินค้าที่ทำกำไรสูงสุด
  updatedAt: string; // ISO String
}

export type AnalyticsPeriod = 'today' | '7days' | '30days' | 'this_month' | 'all' | 'custom';

export interface DailyTrendPoint {
  date: string;
  displayDate: string; // เช่น "14 พ.ย."
  revenue: number;
  netProfit: number;
  orders: number;
  marginPercent: number;
}

export interface PeriodProfitAnalytics {
  period: AnalyticsPeriod;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalProduceCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalFuelCost: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  averageDailyRevenue: number;
  averageDailyNetProfit: number;
  totalOrders: number;
  daysRecorded: number;
  dailyTrends: DailyTrendPoint[];
}

/** YYYY-MM-DD in the device's local time (toISOString is UTC: before 07:00 in Thailand it gives yesterday) */
export function toLocalDateStr(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const PROFIT_HISTORY_KEY = 'marketdrop_daily_profit_history_v1';

// In-memory cache for SSR / Node / Test environments
let memoryProfitHistory: DailyProfitRecord[] = [];

/**
 * ดึงรายการบันทึกประวัติกำไรย้อนหลังทั้งหมด
 */
export function getHistoricalProfitRecords(): DailyProfitRecord[] {
  if (typeof window === 'undefined') {
    return [...memoryProfitHistory];
  }

  try {
    const raw = localStorage.getItem(PROFIT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load historical profit records:', err);
    return [];
  }
}

/**
 * ดึงประวัติกำไรของวันที่กำหนด (YYYY-MM-DD)
 */
export function getProfitRecordByDate(date: string): DailyProfitRecord | null {
  const records = getHistoricalProfitRecords();
  return records.find(r => r.date === date) || null;
}

/**
 * บันทึก Snapshot กำไรประจำวัน
 */
export function saveDailyProfitSnapshot(
  date: string,
  summary: DailyProfitSummary
): DailyProfitRecord {
  const records = getHistoricalProfitRecords();
  const now = new Date().toISOString();
  const cleanDate = date.trim();

  const topItem = summary.itemsBreakdown && summary.itemsBreakdown.length > 0
    ? summary.itemsBreakdown[0].name
    : undefined;

  const newRecord: DailyProfitRecord = {
    date: cleanDate,
    totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
    totalProduceCost: Math.round(summary.totalProduceCost * 100) / 100,
    grossProfit: Math.round(summary.grossProfit * 100) / 100,
    grossMarginPercent: summary.grossMarginPercent,
    totalFuelCost: Math.round(summary.totalFuelCost * 100) / 100,
    totalOtherExpense: Math.round(summary.totalOtherExpense * 100) / 100,
    totalExpenses: Math.round(summary.totalExpenses * 100) / 100,
    netProfit: Math.round(summary.netProfit * 100) / 100,
    profitMarginPercent: summary.profitMarginPercent,
    orderCount: summary.orderCount || summary.totalOrders || 0,
    topProfitableItem: topItem,
    updatedAt: now
  };

  const existingIndex = records.findIndex(r => r.date === cleanDate);
  if (existingIndex >= 0) {
    records[existingIndex] = newRecord;
  } else {
    records.push(newRecord);
  }

  // เรียงลำดับจากวันที่ใหม่สุดไปเก่าสุด
  records.sort((a, b) => b.date.localeCompare(a.date));

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PROFIT_HISTORY_KEY, JSON.stringify(records));
    } catch (err) {
      console.error('Failed to save profit history record:', err);
    }
  } else {
    memoryProfitHistory = [...records];
  }

  return newRecord;
}

/**
 * ลบประวัติกำไรของวันที่กำหนด
 */
export function deleteProfitRecord(date: string): void {
  const records = getHistoricalProfitRecords();
  const updated = records.filter(r => r.date !== date);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PROFIT_HISTORY_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to delete profit record:', err);
    }
  } else {
    memoryProfitHistory = [...updated];
  }
}

/**
 * ล้างประวัติกำไรทั้งหมด
 */
export function clearProfitHistory(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(PROFIT_HISTORY_KEY);
    } catch {}
  } else {
    memoryProfitHistory = [];
  }
}

/**
 * แปลงวันที่เป็นตัวย่อภาษาไทย เช่น "14 พ.ย."
 */
function formatThaiShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  } catch {
    return dateStr;
  }
}

/**
 * วิเคราะห์กำไรย้อนหลังตามช่วงเวลา (วันนี้, 7 วัน, 30 วัน, เดือนนี้)
 */
export function getProfitAnalyticsByPeriod(
  period: AnalyticsPeriod,
  customStartDate?: string,
  customEndDate?: string
): PeriodProfitAnalytics {
  const records = getHistoricalProfitRecords();
  const now = new Date();
  const todayStr = toLocalDateStr(now);

  let startDate = todayStr;
  const endDate = period === 'custom' ? customEndDate || todayStr : todayStr;

  if (period === 'today') {
    startDate = todayStr;
  } else if (period === '7days') {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    startDate = toLocalDateStr(past7);
  } else if (period === '30days') {
    const past30 = new Date(now);
    past30.setDate(past30.getDate() - 29);
    startDate = toLocalDateStr(past30);
  } else if (period === 'this_month') {
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  } else if (period === 'all') {
    startDate = records.reduce((min, r) => (r.date < min ? r.date : min), todayStr);
  } else if (period === 'custom') {
    startDate = customStartDate || todayStr;
  }

  // กรองบันทึกที่อยู่ในช่วงเวลา
  const filtered = records
    .filter(r => r.date >= startDate && r.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date)); // เรียงเก่าไปใหม่สำหรับกราฟ

  const daysRecorded = filtered.length;
  const totalRevenue = filtered.reduce((s, r) => s + r.totalRevenue, 0);
  const totalProduceCost = filtered.reduce((s, r) => s + r.totalProduceCost, 0);
  const grossProfit = filtered.reduce((s, r) => s + r.grossProfit, 0);
  const totalFuelCost = filtered.reduce((s, r) => s + r.totalFuelCost, 0);
  const totalExpenses = filtered.reduce((s, r) => s + r.totalExpenses, 0);
  const netProfit = filtered.reduce((s, r) => s + r.netProfit, 0);
  const totalOrders = filtered.reduce((s, r) => s + r.orderCount, 0);

  const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;
  const profitMarginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;

  const averageDailyRevenue = daysRecorded > 0 ? Math.round((totalRevenue / daysRecorded) * 100) / 100 : 0;
  const averageDailyNetProfit = daysRecorded > 0 ? Math.round((netProfit / daysRecorded) * 100) / 100 : 0;

  const dailyTrends: DailyTrendPoint[] = filtered.map(r => ({
    date: r.date,
    displayDate: formatThaiShortDate(r.date),
    revenue: r.totalRevenue,
    netProfit: r.netProfit,
    orders: r.orderCount,
    marginPercent: r.profitMarginPercent
  }));

  return {
    period,
    startDate,
    endDate,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalProduceCost: Math.round(totalProduceCost * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginPercent,
    totalFuelCost: Math.round(totalFuelCost * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    profitMarginPercent,
    averageDailyRevenue,
    averageDailyNetProfit,
    totalOrders,
    daysRecorded,
    dailyTrends
  };
}
