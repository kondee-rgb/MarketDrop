# 🛵 MarketDrop: Last-Mile Fresh Delivery Management System

> ระบบจัดการออเดอร์และเส้นทางส่งของสดตามบ้านแบบเรียลไทม์ (จากตลาดสดสู่หน้าบ้านคุณ)  
> ออกแบบพิเศษสำหรับคนจัดของในตลาด (Admin View) และคนขับรถ/ไรเดอร์ส่งของ (Driver Manifest Mobile-First)

---

## 📌 จุดเด่นและฟังก์ชันหลักของระบบ

### 1. 📋 LINE Order Quick-Paste & Smart Heuristic Parser
- **ระบบสกัดข้อความสั่งซื้อจาก LINE**: วางข้อความที่ลูกค้าพิมพ์สั่งซื้อใน LINE ระบบจะใช้ Heuristic + Regular Expressions วิเคราะห์แยกส่วนประกอบทันที:
  - 🏠 **บ้านเลขที่ และ ซอย/หมู่บ้าน**: รองรับรูปแบบ `12/1`, `45/10`, `99/2 ก` และชื่อซอย/โครงการ
  - 👤 **ชื่อลูกค้า & 📞 เบอร์โทรศัพท์**: สกัดชื่อและเบอร์โทร `0xx-xxx-xxxx` เพื่อให้คนขับกดโทรออกได้ด้วยสัมผัสเดียว
  - 🧺 **รายการของสด & หน่วยชั่งตวง**: สกัดชื่อสินค้า จำนวน และหน่วยภาษาไทย เช่น กิโล, กก., โล, กำ, แผง, ถุง, ขวด, ขีด, กรัม ฯลฯ พร้อมคำนวณราคายอดรวมอัตโนมัติ
  - 💳 **สถานะการชำระเงิน**: ตรวจจับคำว่า *โอนแล้ว, แนบสลิป, มีสลิป, เก็บปลายทาง, COD, จ่ายสด*
  - 📝 **หมายเหตุการส่ง**: ตรวจจับคำสั่งพิเศษ เช่น *วางไว้หน้าบ้าน, แขวนไว้ที่รั้ว*
- **Bulk Multi-Order Paste**: รองรับการวางข้อความแชทยาวๆ ที่มีหลายออเดอร์ติดกัน ระบบจะตัดแบ่งและแสดงพรีวิวให้ตรวจทานก่อนกดยืนยันบันทึก

---

### 2. ⚡ Smart Natural House Number Sorting & Routing
- **Natural Numeric Sort**: เรียงลำดับบ้านเลขที่ที่มีเครื่องหมายทับอย่างถูกต้องตามธรรมชาติของตัวเลข:
  - `12/1` ➔ `12/2` ➔ `12/10` ➔ `13/1` ➔ `45/1` ➔ `45/2` ➔ `45/10` *(ไม่ใช่แบบ String ธรรมดาที่ 12/10 จะแซง 12/2)*
- **ตัวเลือกการจัดเส้นทาง**:
  - เรียงตามบ้านเลขที่โดยตรง (Natural House Number)
  - จัดกลุ่มตามซอย/โซน แล้วเรียงตามบ้านเลขที่ในแต่ละซอย (Soi ➔ House)
  - โหมดปรับด้วยมือ (Manual Mode): มีปุ่มเลื่อนขึ้น-ลง (Move Up/Down) เพื่อปรับเส้นทางตามสภาพการจราจรจริง
- **Route Summary Bar**: แสดงแถบความคืบหน้ารวม, จำนวนบ้านที่ส่งเสร็จ, ยอดเงิน COD รอเก็บสดวันนี้, ยอดเงินที่เก็บได้แล้ว และยอดรวมทั้งสาย

---

### 3. 🛵 Driver Manifest (Mobile-First Sunlight-Readable)
- ออกแบบหน้าจอให้เหมาะกับการติดสมาร์ทโฟนหน้ารถมอเตอร์ไซค์หรือกระบะส่งของ:
  - ตัวหนังสือขนาดใหญ่พิเศษ (Display Font) คอนทราสต์สูง อ่านสบายตาแม้อยู่กลางแดด
  - แสดงป้าย **STOP #1, STOP #2, STOP #3** ชัดเจน
  - ป้ายสถานะการเงินเด่นชัด:
    - 🟢 **โอนแล้ว (ไม่ต้องเก็บเงิน)**
    - 🟠 **เก็บปลายทาง (COD): ฿...**
  - ปุ่ม Action ด่วน:
    - 📞 **โทรออกหาลูกค้า** (`tel:...`) ได้ทันที
    - 🗺️ **เปิด Google Maps นำทาง** ไปยังบ้านเลขที่และซอย
  - **Packing Items Checklist**: ให้คนขับติ๊กของสดแต่ละถุง/แผงก่อนยื่นให้ลูกค้า พร้อมบอกสถานะ &ldquo;ตรวจของครบแล้ว&rdquo;

---

### 4. 💰 One-Tap Payment Confirmation System
- เมื่อส่งถึงหน้าบ้านลูกค้า กดปุ่ม **&ldquo;ยืนยันส่งสำเร็จ (One-Tap)&rdquo;**:
  - เลือกว่าได้รับเงินแบบใด:
    - 💵 [ ] ได้รับเงินสดครบตามจำนวน
    - 📱 [ ] ลูกค้าสแกนจ่าย QR หน้าบ้าน (PromptPay)
    - ⚠️ [ ] ค้างชำระ / จ่ายไม่ครบ (บันทึกยอดเงินจริง + เหตุผล)
  - ประทับเวลาส่งเสร็จ (Delivery Timestamp) อัตโนมัติ
  - เอฟเฟกต์ฉลอง Confetti และเปลี่ยนสถานะเป็นการ์ดส่งสำเร็จ

---

### 5. ☁️ Real-Time Google Sheets Sync
- รองรับการเชื่อมต่อกับ **Google Sheets** แบบ 2 ทิศทาง:
  - ซิงค์อัตโนมัติ (Auto-Sync) ทุกครั้งที่มีการเพิ่มออเดอร์ หรือกดส่งสำเร็จ
  - โครงสร้างตรงตามสเปก 14 คอลัมน์ (A ถึง N):
    - **A:** Timestamp
    - **B:** ลำดับส่ง (Stop No.)
    - **C:** บ้านเลขที่ (House No.)
    - **D:** ซอย/หมู่บ้าน/โซน (Soi/Zone)
    - **E:** ชื่อลูกค้า (Customer Name)
    - **F:** เบอร์โทร (Phone)
    - **G:** รายการสินค้า (Items)
    - **H:** ยอดเงินรวม (Total Amount)
    - **I:** สถานะการชำระเงิน (Payment Status)
    - **J:** ยอดเงินที่เก็บได้จริง (Collected Amount)
    - **K:** ช่องทางชำระ (Payment Method)
    - **L:** สถานะการจัดส่ง (Delivery Status)
    - **M:** เวลาที่ส่งเสร็จ (Delivered At)
    - **N:** หมายเหตุ (Notes)
  - มีปุ่ม **Push All** (ส่งข้อมูลทั้งหมดขึ้นชีต), **Pull** (ดึงข้อมูลล่าสุด) และ **ดาวน์โหลด CSV (UTF-8 BOM)** ที่เปิดใน Excel ภาษาไทยไม่เพี้ยน
  - มีโค้ด Google Apps Script สำเร็จรูปในปุ่มตั้งค่า พร้อมคัดลอกไปวางและใช้งานได้ภายใน 30 วินาที

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Modern Emerald & Slate Palette
- **Icons**: Lucide React
- **Local Storage**: Offline-First LocalStorage Caching
- **Effects**: Canvas Confetti

---

## 🚀 วิธีเริ่มต้นใช้งาน (Quick Start)

### 1. ติดตั้ง Dependencies
\`\`\`bash
bun install
# หรือ
npm install
\`\`\`

### 2. รันโหมด Development
\`\`\`bash
bun run dev
# หรือ
npm run dev
\`\`\`
เปิดเบราว์เซอร์ไปที่: [http://localhost:3000](http://localhost:3000)

### 3. รัน Unit Tests
\`\`\`bash
bun test
\`\`\`

### 4. รัน Production Build
\`\`\`bash
bun run build
bun run start
\`\`\`

---

## 📂 โครงสร้างโฟลเดอร์

\`\`\`
d:\MarketDrop\
├── src\
│   ├── app\
│   │   ├── api\sheets\sync\route.ts   # Google Sheets Cloud Sync API Route
│   │   ├── globals.css                # Tailwind styling & Thai font setup
│   │   ├── layout.tsx                 # App layout & Metadata
│   │   └── page.tsx                   # Main MarketDrop Single-Page App
│   ├── components\
│   │   ├── Header.tsx                 # Top navigation, Tab switcher, Sync indicator
│   │   ├── RouteSummary.tsx           # Route progress & COD balance summary bar
│   │   ├── OrderManager\              # จัดออเดอร์ & เพิ่มรายการ (Admin)
│   │   │   ├── OrderManagerView.tsx
│   │   │   ├── LinePasteModal.tsx     # LINE Smart Parser & Bulk Parser modal
│   │   │   ├── ManualOrderModal.tsx   # Manual Add/Edit modal
│   │   │   └── OrderCardAdmin.tsx     # Order card with move up/down
│   │   ├── DriverMode\                # เริ่มส่งของ (Driver Manifest)
│   │   │   ├── DriverView.tsx
│   │   │   ├── DriverStopCard.tsx     # Large sunlight-readable stop card
│   │   │   └── PaymentConfirmModal.tsx # One-Tap payment & timestamp confirmation
│   │   └── GoogleSheets\
│   │       └── SheetsSyncModal.tsx    # Sheets sync modal & Apps Script snippet
│   ├── lib\
│   │   ├── line-parser.ts             # Regex + Heuristic LINE Parser
│   │   ├── natural-sort.ts            # Natural House Sorting & Soi grouping
│   │   ├── sample-data.ts             # Realistic Thai fresh market sample data
│   │   ├── sheets.ts                  # Google Sheets A-N row formatting & CSV
│   │   └── storage.ts                 # LocalStorage persistence
│   └── types\
│       └── order.ts                   # TypeScript interfaces
├── test\
│   └── marketdrop.test.ts             # Automated unit tests
├── PROMPT.md                          # Master System Specification
├── README.md                          # เอกสารแนะนำระบบ
└── package.json
\`\`\`
