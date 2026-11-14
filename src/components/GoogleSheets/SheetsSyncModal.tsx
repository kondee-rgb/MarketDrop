'use client';

import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { GoogleSheetsConfig, Order } from '@/types/order';
import { exportOrdersToCsv, SAMPLE_APPS_SCRIPT_CODE } from '@/lib/sheets';

interface SheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig;
  onSaveConfig: (config: GoogleSheetsConfig) => void;
  orders: Order[];
  onPushAll: () => Promise<void>;
  onPullFromSheet: () => Promise<void>;
  isSyncing: boolean;
  syncResultMsg?: string | null;
}

export function SheetsSyncModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  orders,
  onPushAll,
  onPullFromSheet,
  isSyncing,
  syncResultMsg
}: SheetsSyncModalProps) {
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || '');
  const [autoSync, setAutoSync] = useState(config.autoSync ?? true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...config,
      webhookUrl: webhookUrl.trim(),
      autoSync
    });
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(SAMPLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csvData = exportOrdersToCsv(orders);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `marketdrop-google-sheets-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header - Pastel */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 border-b border-emerald-100 text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-200 shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-slate-800">ซิงค์กับ Google Sheets แบบเรียลไทม์</h2>
              <p className="text-xs text-slate-500">
                อัปเดตสถานะการส่ง ยอดเงินสด และรายการสินค้าลงสเปรดชีตทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          {syncResultMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{syncResultMsg}</span>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleSave} className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Google Apps Script Webhook URL:
              </label>
              <button
                type="button"
                onClick={() => setShowScriptCode(!showScriptCode)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 underline"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showScriptCode ? 'ซ่อนโค้ดสคริปต์' : 'วิธีรับ Webhook URL ใน 30 วิ'}</span>
              </button>
            </div>

            <input
              type="url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white"
            />
            <p className="text-[11px] text-slate-500">
              * หากยังไม่ได้ใส่ Webhook URL ระบบจะบันทึกลง LocalStorage และเซิร์ฟเวอร์จำลองให้โดยอัตโนมัติ
            </p>

            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={e => setAutoSync(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>ซิงค์อัตโนมัติ (Auto-Sync) ทุกครั้งที่มีการเพิ่มออเดอร์ หรือกดส่งสำเร็จ</span>
              </label>

              <button
                type="submit"
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </form>

          {/* Quick Action Sync Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              disabled={isSyncing}
              onClick={onPushAll}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex flex-col items-center justify-center gap-1 font-bold shadow-md shadow-emerald-700/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <UploadCloud className="w-5 h-5" />
              <span className="text-xs">ส่งข้อมูลขึ้นชีต (Push All)</span>
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={onPullFromSheet}
              className="p-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center gap-1 font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-xs">ดึงข้อมูลล่าสุด (Pull)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold active:scale-95 transition-all"
            >
              <Download className="w-5 h-5 text-emerald-600" />
              <span className="text-xs">โหลดไฟล์ CSV ของชีต</span>
            </button>
          </div>

          {/* Structure Specification Table (Columns A-N) */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <span>📋 โครงสร้างคอลัมน์ A ถึง N ตามสเปก MarketDrop:</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl">
              <div><strong>A:</strong> Timestamp</div>
              <div><strong>B:</strong> ลำดับส่ง (Stop No.)</div>
              <div><strong>C:</strong> บ้านเลขที่ (House No.)</div>
              <div><strong>D:</strong> ซอย/โซน (Soi/Zone)</div>
              <div><strong>E:</strong> ชื่อลูกค้า</div>
              <div><strong>F:</strong> เบอร์โทรศัพท์</div>
              <div><strong>G:</strong> รายการสินค้า</div>
              <div><strong>H:</strong> ยอดเงินรวม</div>
              <div><strong>I:</strong> สถานะชำระเงิน</div>
              <div><strong>J:</strong> ยอดเก็บได้จริง</div>
              <div><strong>K:</strong> ช่องทางชำระเงิน</div>
              <div><strong>L:</strong> สถานะจัดส่ง</div>
              <div><strong>M:</strong> เวลาส่งเสร็จ</div>
              <div><strong>N:</strong> หมายเหตุ</div>
            </div>
          </div>

          {/* Expandable Apps Script Guide */}
          {showScriptCode && (
            <div className="border-2 border-emerald-500/40 rounded-2xl p-4 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs">
                    ⚡ โค้ด Google Apps Script สำเร็จรูป:
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    นำไปวางใน Extensions &gt; Apps Script ของ Google Sheet แล้ว Deploy เป็น Web App
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด'}</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-900 text-emerald-300 text-[11px] font-mono rounded-xl overflow-x-auto max-h-48">
                {SAMPLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
