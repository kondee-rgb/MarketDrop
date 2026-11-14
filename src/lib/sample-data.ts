import { Order } from '@/types/order';

export const INITIAL_SAMPLE_ORDERS: Order[] = [
  {
    id: 'ord-101',
    stopNumber: 1,
    houseNumber: '12/1',
    soi: 'ซอย 2 (สายน้ำทิพย์)',
    customerName: 'คุณป้ามาลี',
    phone: '081-456-7890',
    items: [
      { id: 'i-1', name: 'ผักกวางตุ้ง', quantity: '2', unit: 'กำ', checked: false, price: 30 },
      { id: 'i-2', name: 'หมูบดอนามัย', quantity: '1', unit: 'กก.', checked: false, price: 140 },
      { id: 'i-3', name: 'ไข่ไก่สดเบอร์ 1', quantity: '1', unit: 'แผง', checked: false, price: 135 }
    ],
    totalAmount: 305,
    paymentStatus: 'PAID',
    collectedAmount: 305,
    paymentMethod: 'TRANSFER',
    deliveryStatus: 'PENDING',
    deliveredAt: null,
    notes: 'วางไว้บนโต๊ะหินอ่อนหน้าบ้านได้เลยค่ะ',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ord-102',
    stopNumber: 2,
    houseNumber: '12/2',
    soi: 'ซอย 2 (สายน้ำทิพย์)',
    customerName: 'พี่หนุ่ม ช่างแอร์',
    phone: '089-123-4567',
    items: [
      { id: 'i-4', name: 'สันคอหมูสไลด์', quantity: '1.5', unit: 'กก.', checked: false, price: 270 },
      { id: 'i-5', name: 'ต้นหอม+ผักชี', quantity: '1', unit: 'ชุด', checked: false, price: 25 },
      { id: 'i-6', name: 'มะนาวแป้น', quantity: '1', unit: 'ถุง', checked: false, price: 40 }
    ],
    totalAmount: 335,
    paymentStatus: 'COD',
    collectedAmount: 0,
    paymentMethod: null,
    deliveryStatus: 'PENDING',
    deliveredAt: null,
    notes: 'เก็บเงินสด เตรียมเงินทอน 65 บาทด้วยครับ',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ord-103',
    stopNumber: 3,
    houseNumber: '12/10',
    soi: 'ซอย 2 (สายน้ำทิพย์)',
    customerName: 'คุณก้อย ร้านกาแฟ',
    phone: '086-789-0123',
    items: [
      { id: 'i-7', name: 'นมสดพาสเจอร์ไรส์', quantity: '2', unit: 'แกลลอน', checked: false, price: 190 },
      { id: 'i-8', name: 'กล้วยน้ำว้า', quantity: '2', unit: 'หวี', checked: false, price: 70 },
      { id: 'i-9', name: 'แตงโมจินตรา', quantity: '1', unit: 'ลูก', checked: false, price: 80 }
    ],
    totalAmount: 340,
    paymentStatus: 'PAID',
    collectedAmount: 340,
    paymentMethod: 'TRANSFER',
    deliveryStatus: 'PENDING',
    deliveredAt: null,
    notes: 'ฝากร้านกาแฟข้างบ้านถ้าไม่อยู่',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ord-104',
    stopNumber: 4,
    houseNumber: '45/2',
    soi: 'ซอย 3 (มิตรประชา)',
    customerName: 'คุณวิภาวรรณ',
    phone: '082-345-6789',
    items: [
      { id: 'i-10', name: 'ปลากะพงหั่นชิ้น', quantity: '1', unit: 'แพ็ค', checked: false, price: 160 },
      { id: 'i-11', name: 'คะน้าฮ่องกง', quantity: '1', unit: 'กก.', checked: false, price: 50 },
      { id: 'i-12', name: 'กระเทียมไทยแกะกลีบ', quantity: '2', unit: 'ขีด', checked: false, price: 30 }
    ],
    totalAmount: 240,
    paymentStatus: 'COD',
    collectedAmount: 0,
    paymentMethod: null,
    deliveryStatus: 'PENDING',
    deliveredAt: null,
    notes: 'ลูกค้าขอสแกนจ่าย QR หน้าบ้าน',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ord-105',
    stopNumber: 5,
    houseNumber: '45/10',
    soi: 'ซอย 3 (มิตรประชา)',
    customerName: 'ลุงสมเกียรติ',
    phone: '085-678-9012',
    items: [
      { id: 'i-13', name: 'อกไก่สดไร้หนัง', quantity: '2', unit: 'กก.', checked: false, price: 180 },
      { id: 'i-14', name: 'แครอทส้ม', quantity: '1', unit: 'กก.', checked: false, price: 45 },
      { id: 'i-15', name: 'บล็อกโคลี่', quantity: '2', unit: 'หัว', checked: false, price: 60 }
    ],
    totalAmount: 285,
    paymentStatus: 'COD',
    collectedAmount: 0,
    paymentMethod: null,
    deliveryStatus: 'PENDING',
    deliveredAt: null,
    notes: 'แขวนไว้ที่รั้วสีเขียว กดกริ่ง 1 ครั้ง',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ord-106',
    stopNumber: 6,
    houseNumber: '99/1',
    soi: 'หมู่บ้านพฤกษาการ์เด้น',
    customerName: 'คุณเมย์ พยาบาล',
    phone: '089-999-8877',
    items: [
      { id: 'i-16', name: 'ปลาทูหน้างอคอหัก', quantity: '3', unit: 'เข่ง', checked: false, price: 105 },
      { id: 'i-17', name: 'ชะอมปลอดสาร', quantity: '2', unit: 'กำ', checked: false, price: 30 },
      { id: 'i-18', name: 'กะปิระยองแท้', quantity: '1', unit: 'กระปุก', checked: false, price: 50 },
      { id: 'i-19', name: 'พริกขี้หนูสวน', quantity: '1', unit: 'ขีด', checked: false, price: 25 }
    ],
    totalAmount: 210,
    paymentStatus: 'PAID',
    collectedAmount: 210,
    paymentMethod: 'TRANSFER',
    deliveryStatus: 'PENDING',
    deliveredAt: null,
    notes: 'วางไว้ในตู้รับพัสดุหน้าบ้านได้เลยค่ะ',
    syncedToSheets: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
