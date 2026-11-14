import { Order, ShoppingItem } from '@/types/order';
import { FuelConfig, calculateFuelExpense, FuelCalculationResult } from './fuel-calc';
import { lookupPriceBook } from './price-book';

export interface ItemProfitDetail {
  name: string;
  category: ShoppingItem['category'];
  shopName: string;
  quantity: number;
  unit: string;
  costPrice: number; // ต้นทุนต่อหน่วย
  sellingPrice: number; // ราคาขายต่อหน่วย
  totalRevenue: number; // รายได้รวม
  totalCost: number; // ต้นทุนรวม
  profit: number; // กำไร (Revenue - Cost)
  margin: number; // % กำไร
  marginPercent: number; // % กำไร (alias)
  orderCount: number; // จำนวนบ้านที่สั่ง
  isCostEstimated: boolean; // ดึงมาจาก Price Book อัตโนมัติหรือไม่
}

export interface DailyProfitSummary {
  totalRevenue: number; // ยอดขายรวม (บาท)
  totalProduceCost: number; // ต้นทุนของสดทั้งหมด (บาท)
  grossProfit: number; // กำไรขั้นต้นจากของสด (บาท)
  grossProduceProfit: number; // alias
  grossMarginPercent: number; // % กำไรขั้นต้น
  fuelResult: FuelCalculationResult; // รายละเอียดค่าน้ำมัน
  totalFuelCost: number; // ค่าน้ำมันรวม (บาท)
  totalOtherExpense: number; // ค่าใช้จ่ายอื่นๆ (บาท)
  totalTransportExpense: number; // ค่าน้ำมัน + ค่าเดินทางอื่นๆ (บาท)
  totalExpenses: number; // รายจ่ายรวมทั้งหมด (ต้นทุนของสด + เดินทาง)
  netProfit: number; // กำไรสุทธิหลังหักค่าน้ำมัน (บาท)
  profitMarginPercent: number; // % กำไรสุทธิ
  netMarginPercent: number; // % กำไรสุทธิ (alias)
  totalDeliveredOrders: number; // จำนวนออเดอร์ที่ส่งสำเร็จ
  totalOrders: number; // จำนวนออเดอร์ทั้งหมด
  orderCount: number; // alias
  itemsBreakdown: ItemProfitDetail[]; // สรุปกำไรรายสินค้า
}

/**
 * คำนวณสรุปกำไร-ขาดทุนประจำวันอย่างละเอียด
 */
export function calculateDailyProfit(
  orders: Order[],
  fuelConfig: FuelConfig,
  manualShoppingItems: ShoppingItem[] = []
): DailyProfitSummary {
  const fuelResult = calculateFuelExpense(fuelConfig);
  const totalFuelCost = fuelResult.fuelCost;
  const totalOtherExpense = fuelResult.otherExpenses;
  const totalTransportExpense = fuelResult.totalExpense;

  // 1. รวมยอดขายจากออเดอร์ทั้งหมด
  const activeOrders = orders.filter(o => o.deliveryStatus !== 'CANCELLED');
  const totalRevenue = activeOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);
  const deliveredOrders = activeOrders.filter(o => o.deliveryStatus === 'DELIVERED');

  // 2. รวบรวมรายการสินค้าและคำนวณต้นทุน/กำไรรายสินค้า
  const itemMap = new Map<string, {
    name: string;
    category: ShoppingItem['category'];
    shopName: string;
    quantity: number;
    unit: string;
    costPrice: number;
    totalRevenue: number;
    orderCount: number;
    isCostEstimated: boolean;
  }>();

  for (const order of activeOrders) {
    for (const item of order.items) {
      const cleanName = item.name.trim();
      const key = `${cleanName.toLowerCase()}_${(item.unit || '').trim().toLowerCase()}`;
      const qtyNum = parseFloat(String(item.quantity)) || 1;
      const remembered = lookupPriceBook(cleanName);

      // ต้นทุนต่อหน่วย: ให้ใช้จาก item.costPrice ก่อน ถ้าไม่มีให้ดึงจาก PriceBook
      const hasItemCost = typeof item.costPrice === 'number' && item.costPrice > 0;
      const unitCost = hasItemCost ? item.costPrice! : (remembered?.costPrice || 0);
      const isCostEstimated = !hasItemCost && !!remembered?.costPrice;

      // รายได้ของรายการนี้ (item.price คือราคารวมของแถวสินค้านั้นๆ ในบิล)
      let itemLineRevenue = 0;
      if (typeof item.price === 'number' && item.price > 0) {
        itemLineRevenue = item.price;
      } else if (remembered?.sellingPrice) {
        itemLineRevenue = remembered.sellingPrice * qtyNum;
      } else if (order.totalAmount && order.items.length === 1) {
        itemLineRevenue = order.totalAmount;
      }

      const shop = item.shopName || remembered?.shopName || 'ตลาดสด';
      const cat = item.category || remembered?.category || 'other';

      const existing = itemMap.get(key);
      if (existing) {
        existing.quantity += qtyNum;
        existing.totalRevenue += itemLineRevenue;
        existing.orderCount += 1;
        if (!existing.costPrice && unitCost) {
          existing.costPrice = unitCost;
          existing.isCostEstimated = isCostEstimated;
        }
        if (shop !== 'ตลาดสด' && existing.shopName === 'ตลาดสด') existing.shopName = shop;
      } else {
        itemMap.set(key, {
          name: cleanName,
          category: cat,
          shopName: shop,
          quantity: qtyNum,
          unit: item.unit || 'ชิ้น',
          costPrice: unitCost,
          totalRevenue: itemLineRevenue,
          orderCount: 1,
          isCostEstimated
        });
      }
    }
  }

  // 3. แปลงเป็น itemsBreakdown และคำนวณต้นทุนรวม
  const itemsBreakdown: ItemProfitDetail[] = [];
  let totalProduceCost = 0;

  for (const it of itemMap.values()) {
    const totalCost = Math.round(it.quantity * it.costPrice);
    totalProduceCost += totalCost;
    const profit = Math.round(it.totalRevenue - totalCost);
    const margin = it.totalRevenue > 0 ? Math.round((profit / it.totalRevenue) * 100) : 0;
    const unitSellingPrice = it.quantity > 0 ? Math.round((it.totalRevenue / it.quantity) * 100) / 100 : 0;

    itemsBreakdown.push({
      name: it.name,
      category: it.category,
      shopName: it.shopName,
      quantity: Math.round(it.quantity * 100) / 100,
      unit: it.unit,
      costPrice: it.costPrice,
      sellingPrice: unitSellingPrice,
      totalRevenue: it.totalRevenue,
      totalCost,
      profit,
      margin,
      marginPercent: margin,
      orderCount: it.orderCount,
      isCostEstimated: it.isCostEstimated
    });
  }

  // เรียงลำดับตามสินค้าที่ทำกำไรสูงสุด
  itemsBreakdown.sort((a, b) => b.profit - a.profit);

  // 4. คำนวณสรุปผลกำไรขั้นต้น และกำไรสุทธิ
  const grossProfit = totalRevenue - totalProduceCost;
  const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  const totalExpenses = totalProduceCost + totalTransportExpense;
  const netProfit = grossProfit - totalTransportExpense;
  const netMarginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  return {
    totalRevenue,
    totalProduceCost,
    grossProfit,
    grossProduceProfit: grossProfit,
    grossMarginPercent,
    fuelResult,
    totalFuelCost,
    totalOtherExpense,
    totalTransportExpense,
    totalExpenses,
    netProfit,
    profitMarginPercent: netMarginPercent,
    netMarginPercent,
    totalDeliveredOrders: deliveredOrders.length,
    totalOrders: activeOrders.length,
    orderCount: activeOrders.length,
    itemsBreakdown
  };
}

/* ---------------- Collection stats (สถานะการเก็บเงิน) ---------------- */

export interface CollectionStats {
  billed: number; // ยอดบิลรวม (ไม่รวมยกเลิก)
  collected: number; // เงินที่ได้รับแล้ว
  outstanding: number; // ยังค้างเก็บ
  avgOrderValue: number; // ยอดเฉลี่ยต่อบิล
  byMethod: { TRANSFER: number; CASH: number; QR_SCAN: number; PARTIAL: number };
}

export function calculateCollectionStats(orders: Order[]): CollectionStats {
  const active = orders.filter(o => o.deliveryStatus !== 'CANCELLED');
  const byMethod = { TRANSFER: 0, CASH: 0, QR_SCAN: 0, PARTIAL: 0 };

  for (const o of active) {
    if (o.deliveryStatus === 'DELIVERED') {
      const amt = o.collectedAmount || 0;
      if (o.paymentMethod === 'TRANSFER' || o.paymentMethod === 'CASH' || o.paymentMethod === 'QR_SCAN') {
        byMethod[o.paymentMethod] += amt;
      } else {
        byMethod.PARTIAL += amt;
      }
    } else if (o.paymentStatus === 'PAID') {
      // โอนล่วงหน้าแล้ว แต่ยังไม่ได้ส่ง
      byMethod.TRANSFER += o.totalAmount || 0;
    }
  }

  const billed = active.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const collected = byMethod.TRANSFER + byMethod.CASH + byMethod.QR_SCAN + byMethod.PARTIAL;

  return {
    billed,
    collected,
    outstanding: Math.max(0, billed - collected),
    avgOrderValue: active.length ? Math.round(billed / active.length) : 0,
    byMethod
  };
}
