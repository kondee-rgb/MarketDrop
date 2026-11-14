'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { RouteSummary } from '@/components/RouteSummary';
import { OrderManagerView } from '@/components/OrderManager/OrderManagerView';
import { DriverView } from '@/components/DriverMode/DriverView';
import { SheetsSyncModal } from '@/components/GoogleSheets/SheetsSyncModal';
import {
  GoogleSheetsConfig,
  Order,
  PaymentMethod,
  SortDirection,
  SortMode
} from '@/types/order';
import {
  loadStoredOrders,
  saveStoredOrders,
  loadSheetsConfig,
  saveSheetsConfig
} from '@/lib/storage';
import { sortOrders } from '@/lib/natural-sort';
import { syncToGoogleSheets } from '@/lib/sheets';
import { INITIAL_SAMPLE_ORDERS } from '@/lib/sample-data';

export default function MarketDropApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'admin' | 'driver'>('admin');
  const [sortMode, setSortMode] = useState<SortMode>('NATURAL_HOUSE');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(loadSheetsConfig());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load orders on initial mount
  useEffect(() => {
    const stored = loadStoredOrders();
    const sorted = sortOrders(stored, 'NATURAL_HOUSE', 'ASC');
    setOrders(sorted);
    setSheetsConfig(loadSheetsConfig());
    setIsMounted(true);
  }, []);

  // Save orders to localStorage whenever they change
  useEffect(() => {
    if (isMounted) {
      saveStoredOrders(orders);
    }
  }, [orders, isMounted]);

  // Cloud Sync Handler
  const performSync = useCallback(
    async (ordersToSync: Order[], silent = false) => {
      if (!silent) setIsSyncing(true);
      setSyncStatus('syncing');

      try {
        const result = await syncToGoogleSheets(ordersToSync, sheetsConfig.webhookUrl);
        if (result.success) {
          setSyncStatus('synced');
          setSyncResultMsg(result.message);
          // Mark orders as synced
          setOrders(prev =>
            prev.map(o => ({ ...o, syncedToSheets: true }))
          );
        } else {
          setSyncStatus('offline');
          setSyncResultMsg(result.message);
        }
      } catch {
        setSyncStatus('offline');
        setSyncResultMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets');
      } finally {
        if (!silent) setIsSyncing(false);
      }
    },
    [sheetsConfig.webhookUrl]
  );

  // Sorting Handler
  const handleApplySorting = (mode: SortMode, dir: SortDirection = sortDirection) => {
    setSortMode(mode);
    setSortDirection(dir);
    setOrders(prev => sortOrders(prev, mode, dir));
  };

  // Toggle item checked in Driver mode
  const handleToggleItemCheck = (orderId: string, itemId: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const updatedItems = o.items.map(it =>
          it.id === itemId ? { ...it, checked: !it.checked } : it
        );
        return { ...o, items: updatedItems };
      })
    );
  };

  // Confirm delivery (One-Tap Confirmation)
  const handleConfirmDelivery = (
    orderId: string,
    collectedAmount: number,
    paymentMethod: PaymentMethod,
    deliveredAt: string,
    partialReason?: string
  ) => {
    const updated = orders.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        deliveryStatus: 'DELIVERED' as const,
        collectedAmount,
        paymentMethod,
        deliveredAt,
        partialReason,
        updatedAt: new Date().toISOString()
      };
    });

    setOrders(updated);

    // Auto-sync with Google Sheets
    if (sheetsConfig.autoSync) {
      performSync(updated, true);
    }
  };

  // Revert delivery status
  const handleRevertDelivery = (orderId: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          deliveryStatus: 'PENDING' as const,
          collectedAmount: o.paymentStatus === 'PAID' ? o.totalAmount : 0,
          deliveredAt: null,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // Reset demo data
  const handleResetSampleData = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลเป็นชุดตัวอย่างตั้งต้นใช่หรือไม่?')) {
      const sorted = sortOrders(INITIAL_SAMPLE_ORDERS, 'NATURAL_HOUSE', 'ASC');
      setOrders(sorted);
      saveStoredOrders(sorted);
      performSync(sorted, true);
    }
  };

  // Pull from Google Sheets / Server API
  const handlePullFromSheet = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sheets/sync');
      if (res.ok) {
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
          setOrders(data.orders);
          setSyncResultMsg(`ดึงข้อมูลสำเร็จ ${data.orders.length} รายการ`);
          setSyncStatus('synced');
        } else {
          setSyncResultMsg('ไม่พบข้อมูลใหม่ในเซิร์ฟเวอร์');
        }
      }
    } catch {
      setSyncResultMsg('ไม่สามารถดึงข้อมูลจากชีตได้ในขณะนี้');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSheetsConfig = (cfg: GoogleSheetsConfig) => {
    setSheetsConfig(cfg);
    saveSheetsConfig(cfg);
    setSyncResultMsg('บันทึกการตั้งค่า Google Sheets เรียบร้อย');
    if (cfg.autoSync) {
      performSync(orders, true);
    }
  };

  const pendingDeliveriesCount = orders.filter(o => o.deliveryStatus !== 'DELIVERED').length;

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 animate-pulse flex items-center justify-center text-slate-950 font-black text-xl">
            🛵
          </div>
          <p className="text-sm font-bold text-slate-300">กำลังโหลด MarketDrop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/90 text-slate-900 font-sans">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        syncStatus={syncStatus}
        sheetsConfig={sheetsConfig}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onResetSampleData={handleResetSampleData}
        pendingDeliveriesCount={pendingDeliveriesCount}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6">
        {/* Route Summary Bar */}
        <RouteSummary orders={orders} />

        {/* Tab 1: Order Manager (Admin) */}
        {activeTab === 'admin' && (
          <OrderManagerView
            orders={orders}
            setOrders={setOrders}
            sortMode={sortMode}
            setSortMode={setSortMode}
            sortDirection={sortDirection}
            setSortDirection={setSortDirection}
            onApplySorting={handleApplySorting}
            onOpenDriverMode={() => setActiveTab('driver')}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          />
        )}

        {/* Tab 2: Driver Manifest (Driver Mode) */}
        {activeTab === 'driver' && (
          <DriverView
            orders={orders}
            onToggleItemCheck={handleToggleItemCheck}
            onConfirmDelivery={handleConfirmDelivery}
            onRevertDelivery={handleRevertDelivery}
          />
        )}
      </main>

      {/* Google Sheets Sync Modal */}
      <SheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        config={sheetsConfig}
        onSaveConfig={handleSaveSheetsConfig}
        orders={orders}
        onPushAll={() => performSync(orders, false)}
        onPullFromSheet={handlePullFromSheet}
        isSyncing={isSyncing}
        syncResultMsg={syncResultMsg}
      />
    </div>
  );
}
