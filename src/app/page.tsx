'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { RouteSummary } from '@/components/RouteSummary';
import { OrderManagerView } from '@/components/OrderManager/OrderManagerView';
import { DriverView } from '@/components/DriverMode/DriverView';
import { ShoppingView } from '@/components/ShoppingMode/ShoppingView';
import { PhotoToOrderModal } from '@/components/PhotoUpload/PhotoToOrderModal';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SheetsSyncModal } from '@/components/GoogleSheets/SheetsSyncModal';
import {
  GoogleSheetsConfig,
  MainTabType,
  Order,
  PaymentMethod,
  ShoppingItem,
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
import {
  aggregateShoppingList,
  loadShoppingState,
  saveShoppingState,
  detectCategory
} from '@/lib/shopping-aggregator';

export default function MarketDropApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<MainTabType>('shopping');
  const [sortMode, setSortMode] = useState<SortMode>('NATURAL_HOUSE');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(loadSheetsConfig());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Shopping state
  const [boughtShoppingIds, setBoughtShoppingIds] = useState<string[]>([]);
  const [manualShoppingItems, setManualShoppingItems] = useState<ShoppingItem[]>([]);

  // Load orders and shopping state on mount
  useEffect(() => {
    const stored = loadStoredOrders();
    const sorted = sortOrders(stored, 'NATURAL_HOUSE', 'ASC');
    setOrders(sorted);
    setSheetsConfig(loadSheetsConfig());

    const shopState = loadShoppingState();
    setBoughtShoppingIds(shopState.boughtItemIds || []);
    setManualShoppingItems(shopState.manualItems || []);

    setIsMounted(true);
  }, []);

  // Save orders to localStorage
  useEffect(() => {
    if (isMounted) {
      saveStoredOrders(orders);
    }
  }, [orders, isMounted]);

  // Save shopping state to localStorage
  useEffect(() => {
    if (isMounted) {
      saveShoppingState({
        boughtItemIds: boughtShoppingIds,
        manualItems: manualShoppingItems
      });
    }
  }, [boughtShoppingIds, manualShoppingItems, isMounted]);

  // Consolidated Shopping List (Aggregated from active orders + manual items)
  const consolidatedShoppingItems = useMemo(() => {
    return aggregateShoppingList(orders, manualShoppingItems, boughtShoppingIds);
  }, [orders, manualShoppingItems, boughtShoppingIds]);

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
          setOrders(prev => prev.map(o => ({ ...o, syncedToSheets: true })));
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

  // Toggle bought item in Shopping View
  const handleToggleBoughtItem = (itemId: string) => {
    setBoughtShoppingIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  // Add manual shopping item directly
  const handleAddManualShoppingItem = (
    name: string,
    quantity: string,
    unit: string,
    category: ShoppingItem['category']
  ) => {
    const newItem: ShoppingItem = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      totalQuantity: quantity,
      unit,
      category: category || detectCategory(name),
      bought: false,
      allocations: [],
      sourceNote: 'เพิ่มโดยตรงจากหน้าร้าน/ตลาด'
    };
    setManualShoppingItems(prev => [...prev, newItem]);
  };

  // Remove manual shopping item
  const handleRemoveManualShoppingItem = (itemId: string) => {
    setManualShoppingItems(prev => prev.filter(it => it.id !== itemId));
    setBoughtShoppingIds(prev => prev.filter(id => id !== itemId));
  };

  // Add new order from Photo Upload Modal
  const handleAddOrderFromPhoto = (newOrder: Order) => {
    setOrders(prev => {
      const combined = [...prev, newOrder];
      return sortOrders(combined, sortMode, sortDirection);
    });
    if (sheetsConfig.autoSync) {
      performSync([...orders, newOrder], true);
    }
  };

  // Add shopping item from Photo Upload Modal
  const handleAddShoppingItemFromPhoto = (item: ShoppingItem) => {
    setManualShoppingItems(prev => [...prev, item]);
  };

  // Reset sample data
  const handleResetSampleData = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลเป็นชุดตัวอย่างตั้งต้นใช่หรือไม่?')) {
      const sorted = sortOrders(INITIAL_SAMPLE_ORDERS, 'NATURAL_HOUSE', 'ASC');
      setOrders(sorted);
      setBoughtShoppingIds([]);
      setManualShoppingItems([]);
      saveStoredOrders(sorted);
      saveShoppingState({ boughtItemIds: [], manualItems: [] });
      performSync(sorted, true);
    }
  };

  // Pull from Google Sheets
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
  const pendingShoppingCount = consolidatedShoppingItems.filter(it => !it.bought).length;

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse flex items-center justify-center font-bold text-xl">
            🛵
          </div>
          <p className="text-sm font-bold text-slate-600">กำลังโหลด MarketDrop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9] text-slate-800 font-sans pb-20 md:pb-6">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        syncStatus={syncStatus}
        sheetsConfig={sheetsConfig}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
        onResetSampleData={handleResetSampleData}
        pendingDeliveriesCount={pendingDeliveriesCount}
        pendingShoppingCount={pendingShoppingCount}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6">
        {/* Route Summary Bar (visible on Delivery and Admin tabs) */}
        {activeTab !== 'shopping' && <RouteSummary orders={orders} />}

        {/* TAB 1: ของที่ต้องซื้อ (Market Shopping List) */}
        {activeTab === 'shopping' && (
          <ShoppingView
            items={consolidatedShoppingItems}
            onToggleBought={handleToggleBoughtItem}
            onAddManualItem={handleAddManualShoppingItem}
            onRemoveManualItem={handleRemoveManualShoppingItem}
            onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
            onSwitchToDelivery={() => setActiveTab('delivery')}
          />
        )}

        {/* TAB 2: ที่ต้องส่ง (Driver Manifest) */}
        {activeTab === 'delivery' && (
          <DriverView
            orders={orders}
            onToggleItemCheck={handleToggleItemCheck}
            onConfirmDelivery={handleConfirmDelivery}
            onRevertDelivery={handleRevertDelivery}
            onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
          />
        )}

        {/* TAB 3: จัดการออเดอร์ (Admin Order Manager & Sheets Sync) */}
        {activeTab === 'admin' && (
          <OrderManagerView
            orders={orders}
            setOrders={setOrders}
            sortMode={sortMode}
            setSortMode={setSortMode}
            sortDirection={sortDirection}
            setSortDirection={setSortDirection}
            onApplySorting={handleApplySorting}
            onOpenDriverMode={() => setActiveTab('delivery')}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          />
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation (Optimized for 1-hand thumb use) */}
      <div className="md:hidden">
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
          pendingShoppingCount={pendingShoppingCount}
          pendingDeliveryCount={pendingDeliveriesCount}
        />
      </div>

      {/* Photo to Order Modal */}
      <PhotoToOrderModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onAddDeliveryOrder={handleAddOrderFromPhoto}
        onAddShoppingItem={handleAddShoppingItemFromPhoto}
        existingOrdersCount={orders.length}
      />

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
