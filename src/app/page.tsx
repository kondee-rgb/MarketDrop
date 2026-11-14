'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { RouteSummary } from '@/components/RouteSummary';
import { OrderManagerView } from '@/components/OrderManager/OrderManagerView';
import { DriverView } from '@/components/DriverMode/DriverView';
import { ShoppingView } from '@/components/ShoppingMode/ShoppingView';
import { ProfitView } from '@/components/ProfitMode/ProfitView';
import { PhotoToOrderModal } from '@/components/PhotoUpload/PhotoToOrderModal';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SheetsSyncModal } from '@/components/GoogleSheets/SheetsSyncModal';
import { LinePasteModal } from '@/components/OrderManager/LinePasteModal';
import { ManualOrderModal } from '@/components/OrderManager/ManualOrderModal';
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
  clearStoredOrders,
  hardResetAllData,
  loadSheetsConfig,
  saveSheetsConfig,
  MOCK_ORDER_IDS,
  MOCK_CUSTOMER_NAMES
} from '@/lib/storage';
import { sortOrders } from '@/lib/natural-sort';
import { syncToGoogleSheets } from '@/lib/sheets';
import { INITIAL_SAMPLE_ORDERS } from '@/lib/sample-data';
import {
  aggregateShoppingList,
  loadShoppingState,
  saveShoppingState,
  detectCategory,
  allocateItemToHouse,
  removeAllocationFromHouse,
  HouseAllocationParams
} from '@/lib/shopping-aggregator';

export default function MarketDropApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<MainTabType>('shopping');
  const [sortMode, setSortMode] = useState<SortMode>('NATURAL_HOUSE');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(loadSheetsConfig());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Modals
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Shopping state
  const [boughtShoppingIds, setBoughtShoppingIds] = useState<string[]>([]);
  const [manualShoppingItems, setManualShoppingItems] = useState<ShoppingItem[]>([]);

  // Load orders and shopping state on mount
  useEffect(() => {
    const stored = loadStoredOrders();
    const cleanOrders = stored.filter(
      o =>
        !MOCK_ORDER_IDS.includes(o.id) &&
        !MOCK_CUSTOMER_NAMES.some(m => (o.customerName || '').includes(m))
    );
    const sorted = sortOrders(cleanOrders, 'NATURAL_HOUSE', 'ASC');
    setOrders(sorted);
    setSheetsConfig(loadSheetsConfig());

    const shopState = loadShoppingState();
    setBoughtShoppingIds(shopState.boughtItemIds || []);
    setManualShoppingItems(shopState.manualItems || []);

    // Sync default webhook URL from server if local is empty
    fetch('/api/sheets/sync')
      .then(res => res.json())
      .then(data => {
        if (data && data.webhookUrl) {
          setSheetsConfig(prev => {
            if (!prev.webhookUrl) {
              const updated = { ...prev, webhookUrl: data.webhookUrl };
              saveSheetsConfig(updated);
              return updated;
            }
            return prev;
          });
        }
      })
      .catch(() => {});

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

  // Sort, store and (optionally) sync the exact list we just built — avoids syncing stale state
  const commitOrders = (next: Order[], resort = true) => {
    const finalOrders = resort ? sortOrders(next, sortMode, sortDirection) : next;
    setOrders(finalOrders);
    if (sheetsConfig.autoSync) {
      performSync(finalOrders, true);
    }
  };

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
        return { ...o, items: updatedItems, updatedAt: new Date().toISOString() };
      })
    );
  };

  // Confirm delivery (One-Tap Confirmation)
  const handleConfirmDelivery = (
    orderId: string,
    collectedAmount: number,
    paymentMethod: PaymentMethod,
    deliveredAt: string,
    partialReason?: string,
    slipRef?: string
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
        slipRef: slipRef || o.slipRef,
        paymentStatus:
          collectedAmount >= o.totalAmount ? ('PAID' as const) : ('COD' as const),
        items: o.items.map(it => ({ ...it, checked: true })),
        updatedAt: new Date().toISOString()
      };
    });
    commitOrders(updated, false);
  };

  // Revert delivery to pending
  const handleRevertDelivery = (orderId: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          deliveryStatus: 'PENDING' as const,
          deliveredAt: null,
          collectedAmount: 0,
          paymentMethod: null,
          // prepaid (transfer) orders stay PAID; cash/QR collected at the door go back to COD
          paymentStatus: o.paymentMethod === 'TRANSFER' ? 'PAID' : 'COD',
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // Toggle bought item in shopping mode
  const handleToggleBoughtItem = (itemId: string) => {
    setBoughtShoppingIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  // Add manual shopping item
  const handleAddManualShoppingItem = (
    name: string,
    quantity: string,
    unit: string,
    category: ShoppingItem['category']
  ) => {
    const newItem: ShoppingItem = {
      id: `manual_${Date.now()}`,
      name,
      totalQuantity: quantity,
      unit,
      category,
      allocations: [],
      bought: false
    };
    setManualShoppingItems(prev => [...prev, newItem]);
  };

  // Remove manual shopping item
  const handleRemoveManualShoppingItem = (itemId: string) => {
    setManualShoppingItems(prev => prev.filter(it => it.id !== itemId));
    setBoughtShoppingIds(prev => prev.filter(id => id !== itemId));
  };

  // Allocate shopping item to a house stop in orders
  const handleAllocateItem = (
    itemName: string,
    unit: string,
    allocation: HouseAllocationParams,
    manualItemIdToRemove?: string
  ) => {
    commitOrders(allocateItemToHouse(orders, itemName, unit, allocation));
    if (manualItemIdToRemove) {
      setManualShoppingItems(prev => prev.filter(it => it.id !== manualItemIdToRemove));
    }
  };

  // Remove allocation from a house stop in orders
  const handleRemoveAllocation = (
    itemName: string,
    unit: string,
    orderIdOrHouseNumber: string
  ) => {
    setOrders(prev => {
      const updated = removeAllocationFromHouse(prev, itemName, unit, orderIdOrHouseNumber);
      return sortOrders(updated, sortMode, sortDirection);
    });
  };

  // Update cost price and shop for an item across all orders
  const handleUpdateItemCost = (itemName: string, costPrice: number, shopName?: string) => {
    setOrders(prev =>
      prev.map(order => ({
        ...order,
        items: order.items.map(it =>
          it.name.trim().toLowerCase() === itemName.trim().toLowerCase()
            ? { ...it, costPrice, shopName: shopName || it.shopName }
            : it
        )
      }))
    );
  };

  // Add new order from Photo Upload Modal
  const handleAddOrderFromPhoto = (newOrder: Order) => {
    commitOrders([...orders, newOrder]);
  };

  // Add orders from Line Paste Modal
  const handleAddOrdersFromPaste = (newOrders: Order[]) => {
    commitOrders([...orders, ...newOrders]);
  };

  // Save order from Manual Order Modal
  const handleSaveOrderManual = (orderToSave: Order) => {
    const exists = orders.some(o => o.id === orderToSave.id);
    commitOrders(
      exists ? orders.map(o => (o.id === orderToSave.id ? orderToSave : o)) : [...orders, orderToSave]
    );
  };

  // Add shopping item from Photo Upload Modal
  const handleAddShoppingItemFromPhoto = (item: ShoppingItem) => {
    setManualShoppingItems(prev => [...prev, item]);
  };

  // Reset sample data / Hard clear
  const handleResetSampleData = () => {
    if (confirm('คุณต้องการล้างออเดอร์ รายการซื้อของ และประวัติกำไรทั้งหมดใช่หรือไม่? (สมุดราคาต้นทุนและสถานที่ยังเก็บไว้)')) {
      hardResetAllData();
      setOrders([]);
      setBoughtShoppingIds([]);
      setManualShoppingItems([]);
      setSyncResultMsg('ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว');
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
    // Broadcast / Save to server so other devices get it too!
    if (cfg.webhookUrl) {
      fetch('/api/sheets/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: cfg.webhookUrl })
      }).catch(() => {});
    }
    if (cfg.autoSync) {
      performSync(orders, true);
    }
  };

  const pendingDeliveriesCount = orders.filter(o => o.deliveryStatus !== 'DELIVERED').length;
  const pendingShoppingCount = consolidatedShoppingItems.filter(it => !it.bought).length;

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-slate-800">
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
    <div className="min-h-screen flex flex-col bg-[#f4f5f7] text-slate-800 font-sans pb-20 md:pb-6">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        syncStatus={syncStatus}
        sheetsConfig={sheetsConfig}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onResetSampleData={handleResetSampleData}
        pendingDeliveriesCount={pendingDeliveriesCount}
        pendingShoppingCount={pendingShoppingCount}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6">
        {/* Route Summary Bar: แสดงเฉพาะในแท็บจัดการ (Admin) เท่านั้น ตามที่ผู้ใช้ระบุ */}
        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'admin' && <RouteSummary orders={orders} />}

        {/* TAB 1: ของที่ต้องซื้อ (Market Shopping List) */}
        {activeTab === 'shopping' && (
          <ShoppingView
            items={consolidatedShoppingItems}
            onToggleBought={handleToggleBoughtItem}
            onAddManualItem={handleAddManualShoppingItem}
            onRemoveManualItem={handleRemoveManualShoppingItem}
            onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
            onSwitchToDelivery={() => setActiveTab('delivery')}
            existingOrders={orders}
            onAllocateItem={handleAllocateItem}
            onRemoveAllocation={handleRemoveAllocation}
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
            onOpenPasteModal={() => setIsPasteModalOpen(true)}
            onOpenManualModal={() => setIsManualModalOpen(true)}
          />
        )}

        {/* TAB 3: สรุปกำไร-ขาดทุน (Profit & Loss Dashboard) */}
        {activeTab === 'profit' && (
          <ProfitView
            orders={orders}
            manualShoppingItems={manualShoppingItems}
            sheetsConfig={sheetsConfig}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
            onUpdateItemCost={handleUpdateItemCost}
          />
        )}

        {/* TAB 4: จัดการออเดอร์ (Admin Order Manager & Sheets Sync) */}
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
        </div>
      </main>

      {/* Mobile Sticky Bottom Navigation (Optimized for 1-hand thumb use) */}
      <div className="md:hidden">
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingShoppingCount={pendingShoppingCount}
          pendingDeliveryCount={pendingDeliveriesCount}
        />
      </div>

      {/* LINE Paste Modal */}
      <LinePasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onAddOrders={handleAddOrdersFromPaste}
        existingOrdersCount={orders.length}
      />

      {/* Manual Order Modal */}
      <ManualOrderModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSaveOrder={handleSaveOrderManual}
        existingOrdersCount={orders.length}
      />

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
